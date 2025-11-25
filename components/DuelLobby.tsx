import React, { useState, useEffect } from 'react';
import { UserStats, TaskData, DuelPlayer } from '../types';
import { duelService, DUEL_TASK_COUNT } from '../services/duelService';
import { playSound } from '../services/audioService';

interface Props {
    userStats: UserStats;
    onStartGame: (tasks: TaskData[], roomId: string, opponentId?: string) => void;
    onBack: () => void;
}

export const DuelLobby: React.FC<Props> = ({ userStats, onStartGame, onBack }) => {
    const [mode, setMode] = useState<'menu' | 'host' | 'join'>('menu');
    const [roomCode, setRoomCode] = useState('');
    const [roomId, setRoomId] = useState('');
    const [joinCode, setJoinCode] = useState('');
    const [tasks, setTasks] = useState<TaskData[]>([]);
    const [players, setPlayers] = useState<DuelPlayer[]>([]);
    const [status, setStatus] = useState('waiting'); // waiting, playing
    const [error, setError] = useState('');

    // --- HOST LOGIC ---
    const handleHost = async () => {
        setMode('host');
        setError('');
        const result = await duelService.createRoom(userStats);
        if (result) {
            setRoomCode(result.roomCode);
            setRoomId(result.roomId);
            setTasks(result.tasks);
            listenToRoom(result.roomId);
        } else {
            setError('Fehler beim Erstellen.');
            setMode('menu');
        }
    };

    // --- JOIN LOGIC ---
    const handleJoin = async () => {
        if (joinCode.length !== 4) return;
        setError('');
        const room = await duelService.findRoomByCode(joinCode);
        if (room) {
            setRoomId(room.id);
            setTasks(room.tasks);
            await duelService.joinRoom(room.id, userStats.userId, false);
            setMode('join'); // Show waiting screen
            listenToRoom(room.id);
        } else {
            setError('Raum nicht gefunden.');
        }
    };

    // --- REALTIME LISTENER ---
    const listenToRoom = (id: string) => {
        duelService.subscribeToRoom(id, (payload) => {
            if (payload.type === 'player_update') {
                // Fetch players (simplification: usually we'd upsert local state)
                // For now, let's just assume we get a signal to start if we are joiner
            }
            if (payload.type === 'room_update') {
                if (payload.new.status === 'playing') {
                    // Game Started!
                    onStartGame(tasks, id); // Start!
                }
            }
        });
    };

    const handleStartMatch = async () => {
        if (!roomId) return;
        await duelService.startGame(roomId);
        onStartGame(tasks, roomId);
    };

    return (
        <div className="h-full w-full flex flex-col items-center justify-center p-6 bg-black text-white relative">
            <button onClick={onBack} className="absolute top-10 left-6 text-white/50 hover:text-white">
                ← Zurück
            </button>

            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-orange-500 mb-2">
                VS DUEL
            </h1>
            <p className="text-white/50 mb-10">Wer löst {DUEL_TASK_COUNT} Tasks schneller?</p>

            {mode === 'menu' && (
                <div className="flex flex-col gap-4 w-full max-w-xs">
                    <button 
                        onClick={handleHost}
                        className="py-4 bg-white text-black font-bold rounded-xl hover:scale-105 transition-transform"
                    >
                        Raum erstellen
                    </button>
                    
                    <div className="flex gap-2">
                        <input 
                            type="tel" 
                            maxLength={4}
                            placeholder="Code" 
                            value={joinCode}
                            onChange={e => setJoinCode(e.target.value)}
                            className="w-24 text-center bg-white/10 rounded-xl border border-white/20 font-mono text-xl focus:border-cyan-500 outline-none"
                        />
                        <button 
                            onClick={handleJoin}
                            className="flex-1 py-4 bg-white/10 border border-white/20 font-bold rounded-xl hover:bg-white/20"
                        >
                            Beitreten
                        </button>
                    </div>
                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                </div>
            )}

            {mode === 'host' && (
                <div className="flex flex-col items-center animate-fade-in">
                    <div className="text-sm text-white/50 uppercase tracking-widest mb-2">Raum Code</div>
                    <div className="text-6xl font-mono font-black text-white mb-8 tracking-widest border-2 border-white/20 px-8 py-4 rounded-2xl bg-white/5">
                        {roomCode}
                    </div>
                    
                    <div className="animate-pulse text-cyan-400 mb-8">Warte auf Gegner...</div>

                    <button 
                        onClick={handleStartMatch}
                        className="px-12 py-4 bg-green-500 text-black font-bold rounded-full text-xl shadow-[0_0_30px_rgba(34,197,94,0.4)] hover:scale-105 transition-transform"
                    >
                        Starten
                    </button>
                </div>
            )}

            {mode === 'join' && (
                <div className="flex flex-col items-center animate-fade-in">
                    <div className="w-20 h-20 border-4 border-t-cyan-500 border-white/10 rounded-full animate-spin mb-8" />
                    <h2 className="text-2xl font-bold mb-2">Warte auf Host...</h2>
                    <p className="text-white/50">Tasks werden geladen</p>
                </div>
            )}
        </div>
    );
};
