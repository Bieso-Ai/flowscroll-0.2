
import React, { useState, useEffect } from 'react';
import { TaskData } from '../../types';
import { playSound } from '../../services/audioService';

interface Props {
  task: TaskData;
  onComplete: (success: boolean) => void;
  isActive: boolean;
}

export const FlagTask: React.FC<Props> = ({ task, onComplete, isActive }) => {
  const [status, setStatus] = useState<'idle' | 'success' | 'fail'>('idle');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const { flag, options, correctIndex } = task.content;

  useEffect(() => {
    if (!isActive) {
        setStatus('idle');
        setSelectedIndex(null);
    }
  }, [isActive]);

  const handleOptionTap = (index: number) => {
    if (status !== 'idle') return;
    setSelectedIndex(index);

    if (index === correctIndex) {
        setStatus('success');
        playSound('correct');
        setTimeout(() => {
            if (isActive) onComplete(true);
        }, 800);
    } else {
        setStatus('fail');
        playSound('wrong');
        // Delay complete to show the correct answer
        setTimeout(() => {
            if (isActive) onComplete(false);
        }, 1500);
    }
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center p-6">
        {/* Header */}
        <div className="mb-8 text-center">
            <h2 className="text-xl font-bold text-cyan-300 uppercase tracking-widest mb-4 bg-cyan-900/30 px-3 py-1 rounded-full">
                Geografie
            </h2>
            <h3 className="text-white/60 mb-6">Welches Land ist das?</h3>
            
            {/* The Flag */}
            <div className="text-[8rem] leading-none drop-shadow-2xl animate-[float_4s_ease-in-out_infinite]">
                {flag}
            </div>
             <style>{`
                @keyframes float {
                    0% { transform: translateY(0px); }
                    50% { transform: translateY(-10px); }
                    100% { transform: translateY(0px); }
                }
            `}</style>
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-1 gap-3 w-full max-w-sm">
            {options.map((country: string, idx: number) => {
                let stateStyle = "bg-white/10 border-white/5";
                let textStyle = "text-white";

                if (status === 'success' && idx === correctIndex) {
                    // Correct!
                    stateStyle = "bg-green-500 border-green-400 scale-105 shadow-[0_0_30px_rgba(34,197,94,0.5)]";
                    textStyle = "text-white font-black";
                } else if (status === 'fail' && idx === selectedIndex) {
                    // Wrong Selection
                    stateStyle = "bg-red-500 border-red-400 animate-shake";
                } else if (status === 'fail' && idx === correctIndex) {
                    // Reveal Correct Answer
                    stateStyle = "bg-green-500/50 border-green-400/50 opacity-100 ring-2 ring-green-400";
                } else if (status !== 'idle') {
                    // Fade out others
                    stateStyle = "bg-white/5 border-white/5 opacity-30";
                }

                return (
                    <button
                        key={idx}
                        onClick={() => handleOptionTap(idx)}
                        disabled={status !== 'idle'}
                        className={`
                            w-full py-4 px-6 rounded-2xl border-2 text-lg font-bold transition-all duration-200
                            ${stateStyle} ${textStyle}
                            ${status === 'idle' ? 'hover:bg-white/20 active:scale-95' : ''}
                        `}
                    >
                        {country}
                    </button>
                );
            })}
        </div>
    </div>
  );
};
