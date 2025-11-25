
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { TaskData, UserStats, TaskResult } from '../types';
import { generateNextTask, updateStats, generateSessionId } from '../services/taskEngine';
import { TaskCard } from './TaskCard';
import { playSound } from '../services/audioService';
import { analyticsService } from '../services/analyticsService';
import { duelService, DUEL_TASK_COUNT } from '../services/duelService';
import { supabase } from '../services/supabaseClient';

interface Props {
  userStats: UserStats;
  setUserStats: React.Dispatch<React.SetStateAction<UserStats>>;
  isPaused?: boolean;
  // Duel Props
  isDuel?: boolean;
  duelTasks?: TaskData[];
  roomId?: string;
  onDuelFinish?: (score: number) => void;
}

// CONFIG
const BUFFER_SIZE = 3;
const ANIMATION_DURATION = 350; 
const SWIPE_THRESHOLD = 80; 
const VELOCITY_THRESHOLD = 0.3; 

export const Feed: React.FC<Props> = ({ 
    userStats, setUserStats, isPaused = false,
    isDuel = false, duelTasks = [], roomId, onDuelFinish 
}) => {
  // State
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(new Set());
  
  // Duel State
  const [opponentProgress, setOpponentProgress] = useState(0);
  
  // Animation & Gesture State
  const [isAnimating, setIsAnimating] = useState(false); 
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  
  // Refs for Logic
  const activeIndexRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const loadedRef = useRef(false);
  const loadingMoreRef = useRef(false);
  
  // Refs for Touch/Mouse Handling
  const startY = useRef<number | null>(null);
  const startTime = useRef<number>(0);
  const currentY = useRef<number | null>(null);

  // Session Tracking
  const [sessionId] = useState(generateSessionId());
  const [sessionStartTime] = useState(Date.now());
  const [taskStartTime, setTaskStartTime] = useState(Date.now());

  // --- INITIALIZATION ---
  useEffect(() => {
    // If Duel Mode, load provided tasks immediately
    if (isDuel) {
        setTasks(duelTasks);
        loadedRef.current = true;
        
        // Listen for opponent updates
        if (roomId) {
            const channel = supabase.channel(`room-progress-${roomId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'players', filter: `room_id=eq.${roomId}` }, (payload) => {
                const p = payload.new;
                if (p.user_id !== userStats.userId) {
                    setOpponentProgress(p.current_index);
                }
            })
            .subscribe();
            
            return () => { supabase.removeChannel(channel); };
        }
        return;
    }

    if (loadedRef.current) return;
    loadedRef.current = true;
    
    const initTasks = async () => {
      const promises = Array(BUFFER_SIZE).fill(null).map(() => generateNextTask(userStats));
      const newTasks = await Promise.all(promises);
      setTasks(newTasks);
    };
    initTasks();
  }, [isDuel, duelTasks, roomId]);

  // --- BUFFER MAINTENANCE (Disable in Duel Mode) ---
  useEffect(() => {
    if (isDuel || tasks.length === 0) return; 

    const remaining = tasks.length - (activeIndex + 1);
    
    if (remaining < BUFFER_SIZE && !loadingMoreRef.current) {
        loadingMoreRef.current = true;
        const countNeeded = BUFFER_SIZE - remaining;
        
        const fetchMore = async () => {
            try {
                const promises = Array(countNeeded).fill(null).map(() => generateNextTask(userStats));
                const newTasks = await Promise.all(promises);
                setTasks(prev => [...prev, ...newTasks]);
            } catch (e) {
                console.error("Error buffering tasks", e);
            } finally {
                loadingMoreRef.current = false;
            }
        };
        fetchMore();
    }
  }, [activeIndex, tasks.length, userStats, isDuel]);

  // --- ANALYTICS HANDLER ---
  const processTaskResult = useCallback((taskId: string, success: boolean, timeSpent: number, wasSkipped: boolean) => {
    // If Duel Mode, sync progress
    if (isDuel && roomId) {
        // Simple logic: Index = Score
        const newIndex = activeIndexRef.current + (wasSkipped ? 0 : 1); // Only advance visual index if we want
        // Actually, we are just advancing index.
        const actualProgress = activeIndexRef.current + 1; // 1-based
        duelService.updateProgress(roomId, userStats.userId, actualProgress, actualProgress);
    }

    setTasks(currentTasks => {
        const task = currentTasks.find(t => t.id === taskId);
        if (!task) return currentTasks;

        // In Duel mode, we don't update user stats/difficulty to keep it fair?
        // Or we update stats but don't change difficulty of *this* buffer?
        // Let's update stats silently.
        
        let outcome: 'success' | 'failed' | 'skipped' = 'skipped';
        if (success) outcome = 'success';
        else if (!wasSkipped) outcome = 'failed';

        const now = Date.now();
        const result: TaskResult = {
            taskId,
            type: task.type,
            success,
            outcome,
            timeSpentMs: timeSpent,
            timestamp: now,
            startTime: taskStartTime,
            difficultyLevel: task.difficultyLevel,
            wasSkipped,
            sessionId,
            sessionDurationMs: now - sessionStartTime
        };

        analyticsService.recordTaskResult(userStats.userId, result);
        const { newStats } = updateStats(userStats, result);
        
        if (!isDuel) {
             setUserStats(newStats);
        }
        
        return currentTasks;
    });
  }, [setUserStats, userStats, sessionId, sessionStartTime, taskStartTime, isDuel, roomId]);

  const handleTaskComplete = useCallback((taskId: string, success: boolean, timeSpent: number) => {
    if (success) {
        setCompletedTaskIds(prev => new Set(prev).add(taskId));
    }
    processTaskResult(taskId, success, timeSpent, false);
  }, [processTaskResult]);


  // --- NAVIGATION LOGIC ---

  const handleSwipeEnd = (targetOffset: number, indexChange: number) => {
      setIsAnimating(true);
      setDragOffset(targetOffset);

      if (indexChange !== 0) playSound('swipe');

      setTimeout(() => {
          if (indexChange !== 0) {
              const newIndex = activeIndex + indexChange;
              
              // Handle Duel Finish
              if (isDuel && newIndex >= tasks.length) {
                  if (onDuelFinish) onDuelFinish(newIndex);
                  return; // Stop
              }

              if (indexChange > 0) {
                  const currentTask = tasks[activeIndex];
                  if (currentTask && !completedTaskIds.has(currentTask.id)) {
                      const timeSpent = Date.now() - taskStartTime;
                      processTaskResult(currentTask.id, false, timeSpent, true);
                  }
              }

              setActiveIndex(newIndex);
              activeIndexRef.current = newIndex;
              setTaskStartTime(Date.now());
          }
          
          setDragOffset(0);
          setIsAnimating(false);
          
      }, ANIMATION_DURATION);
  };

  // --- KEYBOARD & INPUT HANDLERS (Same as before, omitted for brevity but preserved in logic) ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (isAnimating || isPaused) return;
        const containerHeight = containerRef.current?.clientHeight || window.innerHeight;
        if (e.key === 'ArrowDown') {
            if (activeIndex < tasks.length - 1) handleSwipeEnd(-containerHeight, 1);
        } else if (e.key === 'ArrowUp') {
            if (activeIndex > 0) handleSwipeEnd(containerHeight, -1);
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, tasks.length, isAnimating, isPaused]);

  const handleStart = (clientY: number) => {
      if (isAnimating || isPaused) return;
      startY.current = clientY;
      currentY.current = clientY;
      startTime.current = Date.now();
      setIsDragging(true);
      setDragOffset(0);
  };
  const handleMove = (clientY: number) => {
      if (!isDragging || startY.current === null) return;
      currentY.current = clientY;
      const diff = clientY - startY.current;
      if ((activeIndex === 0 && diff > 0) || (activeIndex === tasks.length - 1 && diff < 0)) {
          setDragOffset(diff * 0.3); 
      } else {
          setDragOffset(diff);
      }
  };
  const handleEnd = () => {
      if (!isDragging || startY.current === null || currentY.current === null) return;
      setIsDragging(false);
      const diff = dragOffset;
      const time = Date.now() - startTime.current;
      const velocity = Math.abs(diff) / time;
      const containerHeight = containerRef.current?.clientHeight || window.innerHeight;

      if (diff < 0 && (Math.abs(diff) > SWIPE_THRESHOLD || velocity > VELOCITY_THRESHOLD)) {
          if (activeIndex < tasks.length - 1) handleSwipeEnd(-containerHeight, 1);
          else handleSwipeEnd(0, 0);
      }
      else if (diff > 0 && (Math.abs(diff) > SWIPE_THRESHOLD || velocity > VELOCITY_THRESHOLD)) {
          if (activeIndex > 0) handleSwipeEnd(containerHeight, -1);
          else handleSwipeEnd(0, 0);
      }
      else handleSwipeEnd(0, 0);

      startY.current = null; currentY.current = null;
  };

  const onTouchStart = (e: React.TouchEvent) => handleStart(e.touches[0].clientY);
  const onTouchMove = (e: React.TouchEvent) => handleMove(e.touches[0].clientY);
  const onTouchEnd = () => handleEnd();
  const onMouseDown = (e: React.MouseEvent) => handleStart(e.clientY);
  const onMouseMove = (e: React.MouseEvent) => isDragging && handleMove(e.clientY);
  const onMouseUp = () => isDragging && handleEnd();
  const onMouseLeave = () => isDragging && handleEnd();

  const transformStyle = {
      transform: `translate3d(0, calc(-${activeIndex * 100}% + ${dragOffset}px), 0)`,
      transition: isDragging ? 'none' : `transform ${ANIMATION_DURATION}ms cubic-bezier(0.2, 0.8, 0.2, 1)`
  };

  return (
    <div 
        ref={containerRef}
        className="h-full w-full overflow-hidden relative bg-black touch-none select-none"
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseLeave}
    >
      
      {/* --- DUEL OVERLAY --- */}
      {isDuel && (
          <div className="absolute top-0 left-0 right-0 z-50 p-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] pointer-events-none">
              <div className="bg-black/40 backdrop-blur-md rounded-full border border-white/10 p-2 flex items-center justify-between gap-4 max-w-sm mx-auto shadow-xl">
                  {/* YOU */}
                  <div className="flex-1 flex flex-col gap-1">
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-cyan-400">
                          <span>Du</span>
                          <span>{activeIndex}/{DUEL_TASK_COUNT}</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-cyan-500 transition-all duration-300" style={{ width: `${(activeIndex / DUEL_TASK_COUNT) * 100}%` }} />
                      </div>
                  </div>
                  
                  <div className="text-white/20 font-black italic text-lg">VS</div>

                  {/* OPPONENT */}
                  <div className="flex-1 flex flex-col gap-1">
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-orange-400">
                          <span>{opponentProgress}/{DUEL_TASK_COUNT}</span>
                          <span>Gegner</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-orange-500 transition-all duration-300" style={{ width: `${(opponentProgress / DUEL_TASK_COUNT) * 100}%` }} />
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* SLIDER */}
      <div className="w-full h-full will-change-transform" style={transformStyle}>
        {tasks.map((task, index) => {
            if (Math.abs(index - activeIndex) > 1) return <div key={task.id} className="h-full w-full" />;
            return (
                <div key={task.id} className="h-full w-full relative">
                    <TaskCard 
                        task={task} 
                        isActive={index === activeIndex}
                        isPaused={isPaused}
                        onComplete={handleTaskComplete}
                    />
                </div>
            );
        })}
      </div>
      
      {tasks.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black text-white gap-4 z-50">
             <div className="animate-spin h-10 w-10 border-4 border-blue-500 rounded-full border-t-transparent"></div>
        </div>
      )}
    </div>
  );
};
