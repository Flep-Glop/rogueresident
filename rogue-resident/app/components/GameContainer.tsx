// app/components/GameContainer.tsx
'use client';
import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { useChallengeStore } from '../store/challengeStore';
import SimplifiedMap from './SimplifiedMap';
import { useGameEffects } from './GameEffects';
import ChallengeRouter from './challenges/ChallengeRouter';
import HillHomeScene from './HillHomeScene';
import PlayerStats from './PlayerStats';
import { SoundEffect } from '../types/audio';

export default function GameContainer() {
  const { 
    gamePhase, 
    currentNodeId, 
    map,
    completeNight
  } = useGameStore();
  
  const { currentChallenge, resetChallenge } = useChallengeStore();
  const { playSound } = useGameEffects();
  
  // Handle phase transition sounds
  useEffect(() => {
    if (playSound) {
      if (gamePhase === 'day') {
        playSound('day-start' as SoundEffect);
      } else if (gamePhase === 'night') {
        playSound('night-start' as SoundEffect);
      }
    }
  }, [gamePhase, playSound]);
  
  // Clear challenge when returning to map
  useEffect(() => {
    if (!currentNodeId && currentChallenge) {
      resetChallenge();
    }
  }, [currentNodeId, currentChallenge, resetChallenge]);
  
  // Core content routing
  const renderGameContent = () => {
    // Handle day/night cycle
    if (gamePhase === 'night') {
      return <HillHomeScene onComplete={() => completeNight()} />;
    }
    
    // If no node is selected, show the map
    if (!currentNodeId || !map) {
      return <SimplifiedMap />;
    }
    
    // Otherwise, route to appropriate challenge via ChallengeRouter
    return <ChallengeRouter />;
  };
  
  return (
    <div className="relative h-screen w-full overflow-hidden bg-background">
      <div className="relative h-full w-full pt-16 pb-0">
        {/* Player stats - always visible */}
        <div className="absolute top-0 left-0 right-0 z-40">
          <PlayerStats />
        </div>
        
        {/* Main content area */}
        <div className="h-full w-full">
          {renderGameContent()}
        </div>
      </div>
      
      {/* Development debug info */}
      {process.env.NODE_ENV !== 'production' && (
        <div className="fixed bottom-2 left-2 bg-black/70 text-white text-xs p-2 z-50 font-pixel">
          Phase: {gamePhase} | 
          Node: {currentNodeId || 'none'} |
          Challenge: {currentChallenge ? 'active' : 'none'}
        </div>
      )}
    </div>
  );
}