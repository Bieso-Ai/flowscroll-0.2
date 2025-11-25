
import React, { useState, useEffect } from 'react';
import { TaskData } from '../../types';
import { playSound } from '../../services/audioService';

interface Props {
  task: TaskData;
  onComplete: (success: boolean) => void;
  isActive: boolean;
}

export const SudokuTask: React.FC<Props> = ({ task, onComplete, isActive }) => {
  const initialPuzzle = task.content.puzzle as number[][];
  const solution = task.solution as number[][];
  
  // State for the mutable grid (user input)
  const [grid, setGrid] = useState<number[][]>([]);
  // State to track which cells were initially empty (editable)
  const [editableMask, setEditableMask] = useState<boolean[][]>([]);
  
  const [selected, setSelected] = useState<{r: number, c: number} | null>(null);
  const [status, setStatus] = useState<'idle' | 'success' | 'fail'>('idle');

  useEffect(() => {
    if (!isActive) {
        setStatus('idle');
        setSelected(null);
        return;
    }
    
    // Deep copy for grid state
    const newGrid = initialPuzzle.map(row => [...row]);
    setGrid(newGrid);
    
    // Create mask: true if cell is 0 (empty) initially
    const mask = initialPuzzle.map(row => row.map(val => val === 0));
    setEditableMask(mask);
    
  }, [isActive, task]);

  const handleCellClick = (r: number, c: number) => {
      if (status !== 'idle') return;
      if (editableMask[r][c]) {
          setSelected({ r, c });
          playSound('tap');
      } else {
          // Feedback for locked cell?
      }
  };

  const handleInput = (num: number) => {
      if (!selected || status !== 'idle') return;
      
      const newGrid = grid.map(row => [...row]);
      newGrid[selected.r][selected.c] = num;
      setGrid(newGrid);
      playSound('tap');

      // Check if grid is full
      let isFull = true;
      for(let r=0; r<4; r++) {
          for(let c=0; c<4; c++) {
              if (newGrid[r][c] === 0) isFull = false;
          }
      }

      if (isFull) {
          validate(newGrid);
      }
  };

  const validate = (currentGrid: number[][]) => {
      let isCorrect = true;
      for(let r=0; r<4; r++) {
          for(let c=0; c<4; c++) {
              if (currentGrid[r][c] !== solution[r][c]) {
                  isCorrect = false;
              }
          }
      }

      if (isCorrect) {
          setStatus('success');
          playSound('correct');
          setTimeout(() => {
              if (isActive) onComplete(true);
          }, 1000);
      } else {
          setStatus('fail');
          playSound('wrong');
          // Allow retry by resetting status after animation
          setTimeout(() => {
              if (isActive) setStatus('idle');
          }, 1000);
      }
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center p-4" style={{ paddingBottom: 'calc(var(--footer-height, 80px) + 2rem)' }}>
        
        <div className="mb-4 text-center">
            <h2 className="text-xl font-bold text-cyan-300 uppercase tracking-widest mb-1">Logik</h2>
            <h3 className="text-white/60 text-sm">Fülle das Gitter</h3>
        </div>

        {/* 4x4 GRID */}
        <div className="relative p-2 bg-white/5 rounded-xl border border-white/10 shadow-2xl">
            {/* Main Grid Layout: 2x2 blocks of 2x2 cells */}
            <div className="grid grid-cols-2 gap-1 bg-white/20 border-2 border-white/20">
                 {[0, 1].map(blockRow => (
                     [0, 1].map(blockCol => (
                         <div key={`${blockRow}-${blockCol}`} className="grid grid-cols-2 gap-0.5 bg-black/50 border border-white/10">
                             {[0, 1].map(subRow => (
                                 [0, 1].map(subCol => {
                                     const r = blockRow * 2 + subRow;
                                     const c = blockCol * 2 + subCol;
                                     const val = grid[r]?.[c];
                                     const isEditable = editableMask[r]?.[c];
                                     const isSelected = selected?.r === r && selected?.c === c;
                                     
                                     return (
                                        <button
                                            key={`${r}-${c}`}
                                            onClick={() => handleCellClick(r, c)}
                                            className={`
                                                w-14 h-14 md:w-16 md:h-16 flex items-center justify-center text-2xl md:text-3xl font-bold transition-all duration-100
                                                ${isEditable ? 'text-cyan-300 bg-white/5' : 'text-white/40 bg-white/5 cursor-default'}
                                                ${isSelected ? 'bg-cyan-500/30 ring-2 ring-cyan-400 z-10' : ''}
                                                ${status === 'success' && isEditable ? 'text-green-400' : ''}
                                                ${status === 'fail' && isEditable ? 'text-red-400' : ''}
                                            `}
                                        >
                                            {val !== 0 ? val : ''}
                                        </button>
                                     );
                                 })
                             ))}
                         </div>
                     ))
                 ))}
            </div>
            
            {/* Status Overlay */}
            {status === 'success' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-20">
                    <div className="text-green-400 text-6xl">✓</div>
                </div>
            )}
        </div>

        {/* NUMPAD */}
        <div className="mt-8 grid grid-cols-4 gap-4 w-full max-w-xs">
            {[1, 2, 3, 4].map(num => (
                <button
                    key={num}
                    onClick={() => handleInput(num)}
                    className="h-16 rounded-xl bg-white/10 border border-white/10 text-2xl font-bold text-white active:bg-white/30 active:scale-95 transition-all"
                >
                    {num}
                </button>
            ))}
        </div>
        <div className="mt-4 text-xs text-white/30 text-center">
             Tippe ein leeres Feld, dann eine Zahl.
        </div>
    </div>
  );
};
