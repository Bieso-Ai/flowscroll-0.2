
import React, { useState, useEffect } from 'react';
import { TaskData } from '../../types';
import { playSound } from '../../services/audioService';

interface Props {
  task: TaskData;
  onComplete: (success: boolean) => void;
  isActive: boolean;
}

export const MapTask: React.FC<Props> = ({ task, onComplete, isActive }) => {
  const [status, setStatus] = useState<'idle' | 'success' | 'fail'>('idle');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const { path, viewBox, options, correctIndex } = task.content;

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
        setTimeout(() => {
            if (isActive) onComplete(false);
        }, 1500);
    }
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center p-6">
        {/* Header */}
        <div className="mb-6 text-center">
            <h2 className="text-xl font-bold text-cyan-300 uppercase tracking-widest mb-2 bg-cyan-900/30 px-3 py-1 rounded-full">
                Grenzen
            </h2>
            <h3 className="text-white/60">Welches Land ist das?</h3>
        </div>

        {/* Map Visual (Holographic Style) */}
        <div className="relative w-64 h-64 mb-10 flex items-center justify-center">
            {/* Grid Background */}
            <div className="absolute inset-0 border border-white/5 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:20px_20px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)] rounded-full" />
            
            <svg 
                viewBox={viewBox} 
                className="w-full h-full drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]"
                style={{ overflow: 'visible' }}
            >
                <path 
                    d={path} 
                    fill="rgba(34, 211, 238, 0.1)" 
                    stroke="cyan" 
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="animate-[pulse_3s_ease-in-out_infinite]"
                />
            </svg>
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-1 gap-3 w-full max-w-sm">
            {options.map((country: string, idx: number) => {
                let stateStyle = "bg-white/10 border-white/5";
                let textStyle = "text-white";

                if (status === 'success' && idx === correctIndex) {
                    stateStyle = "bg-green-500 border-green-400 scale-105 shadow-[0_0_30px_rgba(34,197,94,0.5)]";
                    textStyle = "text-white font-black";
                } else if (status === 'fail' && idx === selectedIndex) {
                    stateStyle = "bg-red-500 border-red-400 animate-shake";
                } else if (status === 'fail' && idx === correctIndex) {
                    stateStyle = "bg-green-500/50 border-green-400/50 opacity-100 ring-2 ring-green-400";
                } else if (status !== 'idle') {
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
