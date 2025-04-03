'use client';
import { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { useChallengeStore } from '../store/challengeStore';
import SimplifiedMap from './SimplifiedMap';
import { PixelText } from './PixelThemeProvider';
import { useGameEffects } from './GameEffects';
import ChallengeRouter from './challenges/ChallengeRouter';
import HillHomeScene from './HillHomeScene';
import PlayerStats from './PlayerStats';

interface GameContainerProps {
  useSimplifiedMap?: boolean;
}

export default function GameContainer({ useSimplifiedMap = false }: GameContainerProps) {
  const { 
    gamePhase, 
    currentNodeId, 
    map
  } = useGameStore();
  
  const { currentChallenge, resetChallenge } = useChallengeStore();
  const { playSound } = useGameEffects();
  
  // Handle sounds for phase changes
  useEffect(() => {
    if (playSound) {
      if (gamePhase === 'day') {
        playSound('day-start');
      } else if (gamePhase === 'night') {
        playSound('night-start');
      }
    }
  }, [gamePhase, playSound]);
  
  // When returning to map, clear any active challenge
  useEffect(() => {
    if (!currentNodeId && currentChallenge) {
      resetChallenge();
    }
  }, [currentNodeId, currentChallenge, resetChallenge]);
  
  // Determine what to render based on game phase and selected node
  const renderGameContent = () => {
    // Handle day/night cycle
    if (gamePhase === 'night') {
      return <HillHomeScene />;
    }
    
    // If no node is selected, or if map is missing, show the map
    if (!currentNodeId || !map) {
      return <SimplifiedMap />;
    }
    
    // If a node is selected, render the appropriate challenge content via our router
    return <ChallengeRouter />;
  };
  
  return (
    <div className="relative h-screen w-full overflow-hidden bg-background">
      {/* Main game container with adjusted padding for UI elements */}
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
      
      {/* Debugging in development mode */}
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