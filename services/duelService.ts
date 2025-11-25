import { supabase, isSupabaseConfigured } from './supabaseClient';
import { generateNextTask } from './taskEngine';
import { UserStats, TaskData, DuelPlayer } from '../types';

export const DUEL_TASK_COUNT = 20;

export const duelService = {
    // 1. Create Room & Generate Content
    async createRoom(userStats: UserStats): Promise<{ roomCode: string, roomId: string, tasks: TaskData[] } | null> {
        if (!isSupabaseConfigured()) {
            console.warn("Supabase not configured. Cannot create room.");
            return null;
        }

        // Generate 20 tasks
        const promises = Array(DUEL_TASK_COUNT).fill(null).map(() => generateNextTask(userStats));
        const tasks = await Promise.all(promises);
        
        // Generate simple 4 digit code
        const code = Math.floor(1000 + Math.random() * 9000).toString();

        const { data: room, error: roomError } = await supabase
            .from('rooms')
            .insert({ code, tasks, status: 'waiting' })
            .select()
            .single();

        if (roomError || !room) {
            console.error("Room creation failed", roomError);
            return null;
        }

        // Join as host
        await this.joinRoom(room.id, userStats.userId, true);

        return { roomCode: code, roomId: room.id, tasks };
    },

    // 2. Join Room
    async joinRoom(roomId: string, userId: string, isHost: boolean = false) {
        if (!isSupabaseConfigured()) return;

        // Remove old sessions for this room/user just in case
        await supabase.from('players').delete().match({ room_id: roomId, user_id: userId });

        const { error } = await supabase
            .from('players')
            .insert({ room_id: roomId, user_id: userId, is_host: isHost, score: 0, current_index: 0 });
            
        if (error) console.error("Join failed", error);
    },

    // 3. Find Room by Code
    async findRoomByCode(code: string): Promise<{ id: string, tasks: TaskData[] } | null> {
        if (!isSupabaseConfigured()) return null;

        const { data, error } = await supabase
            .from('rooms')
            .select('id, tasks')
            .eq('code', code)
            .single();
        
        if (error || !data) return null;
        return { id: data.id, tasks: data.tasks };
    },

    // 4. Update Progress
    async updateProgress(roomId: string, userId: string, index: number, scoreToAdd: number) {
        if (!isSupabaseConfigured()) return;

        // We increment score simply based on index for now, or use complex logic
        const { error } = await supabase
            .from('players')
            .update({ current_index: index, score: index }) // Simple score = tasks solved
            .match({ room_id: roomId, user_id: userId });
            
        if (error) console.error("Update failed", error);
    },

    // 5. Start Game (Host only)
    async startGame(roomId: string) {
        if (!isSupabaseConfigured()) return;
        await supabase.from('rooms').update({ status: 'playing' }).eq('id', roomId);
    },
    
    // 6. Subscribe to Room Changes
    subscribeToRoom(roomId: string, onUpdate: (payload: any) => void) {
        if (!isSupabaseConfigured()) {
            return { unsubscribe: () => {} };
        }

        return supabase
            .channel(`room:${roomId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${roomId}` }, (payload) => {
                onUpdate({ type: 'player_update', ...payload });
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, (payload) => {
                onUpdate({ type: 'room_update', ...payload });
            })
            .subscribe();
    }
};