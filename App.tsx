
import React, { useState, useEffect } from 'react';
import { Feed } from './components/Feed';
import { Analytics } from './components/Analytics';
import { DuelLobby } from './components/DuelLobby';
import { UserStats, TaskData } from './types';
import { INITIAL_STATS, generateUUID, migrateUserStats } from './services/taskEngine';
import { playSound, resumeAudioContext } from './services/audioService';

function App() {
  const [view, setView] = useState<'feed' | 'analytics' | 'duel'>('feed');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showUpdateInfo, setShowUpdateInfo] = useState(false);
  
  // Duel State
  const [duelData, setDuelData] = useState<{ tasks: TaskData[], roomId: string } | null>(null);

  const [userStats, setUserStats] = useState<UserStats>(() => {
    const saved = localStorage.getItem('flowScrollStats');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            return migrateUserStats(parsed);
        } catch (e) {
            return INITIAL_STATS;
        }
    }
    return INITIAL_STATS;
  });

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('flowScrollOnboarding');
    const hasSeenUpdate = localStorage.getItem('flowScroll_v2_seen');
    
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    } else if (!hasSeenUpdate) {
        setShowUpdateInfo(true);
        setTimeout(() => playSound('correct'), 500);
    }
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) resumeAudioContext();
    };
    const handleInteraction = () => resumeAudioContext();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('touchstart', handleInteraction);
    document.addEventListener('click', handleInteraction);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('touchstart', handleInteraction);
      document.removeEventListener('click', handleInteraction);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('flowScrollStats', JSON.stringify(userStats));
  }, [userStats]);

  const handleDismissOnboarding = () => {
    playSound('tap');
    resumeAudioContext();
    localStorage.setItem('flowScrollOnboarding', 'true');
    setShowOnboarding(false);
    if (!localStorage.getItem('flowScroll_v2_seen')) {
        setShowUpdateInfo(true);
    }
  };

  const handleDismissUpdate = () => {
      playSound('tap');
      localStorage.setItem('flowScroll_v2_seen', 'true');
      setShowUpdateInfo(false);
  };

  // Duel Handlers
  const startDuel = (tasks: TaskData[], roomId: string) => {
      setDuelData({ tasks, roomId });
      setView('feed'); // We reuse the feed view but with duel props
  };

  const quitDuel = () => {
      setDuelData(null);
      setView('duel'); // Back to lobby
  };

  return (
    <div 
        className="h-full w-full relative bg-black font-sans"
        style={{ '--footer-height': 'calc(60px + env(safe-area-inset-bottom))' } as React.CSSProperties}
    >
      
      <main className="h-full w-full pb-0 relative overflow-hidden"> 
        {/* Feed is either Standard OR Duel Mode */}
        <div className={`h-full w-full ${view === 'feed' ? 'block' : 'hidden'}`}>
             <Feed 
               userStats={userStats}
               setUserStats={setUserStats}
               isPaused={view !== 'feed' || showOnboarding || showUpdateInfo}
               // Duel Props
               isDuel={!!duelData}
               duelTasks={duelData?.tasks}
               roomId={duelData?.roomId}
               onDuelFinish={(score) => {
                   alert(`Finished! Score: ${score}`);
                   quitDuel();
               }}
             />
        </div>

        {view === 'analytics' && (
             <div className="h-full w-full animate-fade-in pt-[calc(env(safe-area-inset-top)+1rem)]">
                <Analytics userStats={userStats} />
             </div>
        )}

        {view === 'duel' && (
             <div className="h-full w-full animate-fade-in pt-[calc(env(safe-area-inset-top)+1rem)]">
                <DuelLobby 
                    userStats={userStats} 
                    onStartGame={startDuel}
                    onBack={() => setView('feed')}
                />
             </div>
        )}
      </main>

      {showOnboarding && (
        <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center animate-fade-in">
             {/* Onboarding content ... */}
             <button onClick={handleDismissOnboarding} className="px-8 py-4 bg-white text-black font-bold rounded-full">Start</button>
        </div>
      )}

      {showUpdateInfo && !showOnboarding && (
          <div className="absolute inset-0 z-[60] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in">
             <button onClick={handleDismissUpdate} className="w-full max-w-xs py-4 bg-white text-black font-bold rounded-2xl">Los geht's 🚀</button>
          </div>
      )}

      {/* Navigation - Hidden during Duel Gameplay */}
      {!duelData && (
          <nav className="absolute bottom-0 left-0 right-0 bg-black/85 backdrop-blur-xl border-t border-white/10 flex justify-around items-center z-50 pb-[env(safe-area-inset-bottom)] pt-2">
            <button 
                onClick={() => { playSound('tap'); setView('feed'); }}
                className={`flex flex-col items-center justify-center w-20 py-2 transition-all active:scale-95 ${view === 'feed' ? 'text-cyan-400' : 'text-white/30'}`}
            >
                <span className="text-xl">∞</span>
                <span className="text-[9px] font-bold uppercase">Flow</span>
            </button>

            <button 
                onClick={() => { playSound('tap'); setView('duel'); }}
                className={`flex flex-col items-center justify-center w-20 py-2 transition-all active:scale-95 ${view === 'duel' ? 'text-orange-400' : 'text-white/30'}`}
            >
                <span className="text-xl">⚔️</span>
                <span className="text-[9px] font-bold uppercase">Duell</span>
            </button>

            <button 
                onClick={() => { playSound('tap'); setView('analytics'); }}
                className={`flex flex-col items-center justify-center w-20 py-2 transition-all active:scale-95 ${view === 'analytics' ? 'text-purple-400' : 'text-white/30'}`}
            >
                <span className="text-xl">👤</span>
                <span className="text-[9px] font-bold uppercase">Profil</span>
            </button>
          </nav>
      )}

    </div>
  );
}

export default App;
