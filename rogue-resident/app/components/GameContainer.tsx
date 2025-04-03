// app/components/GameContainer.tsx
'use client';
import { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { useChallengeStore } from '../store/challengeStore';
import SimplifiedMap from './SimplifiedMap';
import { useGameEffects } from './GameEffects';
import ChallengeRouter from './challenges/ChallengeRouter';
import HillHomeScene from './HillHomeScene';
import PlayerStats from './PlayerStats';
import { SoundEffect } from '../types/audio';

export default function GameContainer() {
  // Track component initialization state
  const [isInitialized, setIsInitialized] = useState(false);
  
  const { 
    gamePhase, 
    currentNodeId, 
    map,
    completeNight,
    startGame
  } = useGameStore();
  
  const { currentChallenge, resetChallenge } = useChallengeStore();
  const { playSound } = useGameEffects();
  
  // One-time game initialization with safeguards
  useEffect(() => {
    let mounted = true;
    
    // Only initialize once and avoid re-triggering on hot reloads
    if (!isInitialized) {
      console.log("🎮 Component mounted, checking game state");
      
      // Force map generation if needed
      if (!map) {
        console.log("🗺️ No map detected, initializing game state");
        startGame();
        
        // Give time for state to propagate before continuing
        setTimeout(() => {
          if (mounted) {
            console.log("✅ Initialization complete");
            setIsInitialized(true);
          }
        }, 100);
      } else {
        console.log("🗺️ Map already exists, skipping initialization");
        setIsInitialized(true);
      }
    }
    
    return () => {
      mounted = false;
    };
  }, [map, startGame, isInitialized]);
  
  // Handle phase transition sounds with error catching
  useEffect(() => {
    if (playSound && isInitialized) {
      try {
        if (gamePhase === 'day') {
          playSound('day-start' as SoundEffect);
        } else if (gamePhase === 'night') {
          playSound('night-start' as SoundEffect);
        }
      } catch (error) {
        console.warn("Sound effect failed to play, continuing without audio");
      }
    }
  }, [gamePhase, playSound, isInitialized]);
  
  // Clean up challenge state when returning to map
  useEffect(() => {
    if (!currentNodeId && currentChallenge) {
      resetChallenge();
    }
  }, [currentNodeId, currentChallenge, resetChallenge]);
  
  // Content router with fallback states for stability
  const renderGameContent = () => {
    // Display a stable loading state while initializing
    if (!isInitialized) {
      return (
        <div className="h-full w-full flex items-center justify-center bg-background">
          <div className="text-center p-4">
            <h2 className="text-xl mb-2">Initializing Medical Physics Department...</h2>
            <div className="w-64 h-2 bg-gray-700 rounded-full mx-auto overflow-hidden">
              <div className="h-full bg-blue-500 animate-pulse-slow" style={{width: '60%'}}></div>
            </div>
          </div>
        </div>
      );
    }
    
    // Night phase takes precedence
    if (gamePhase === 'night') {
      return <HillHomeScene onComplete={completeNight} />;
    }
    
    // Map view (main navigation hub)
    if (!currentNodeId || !map) {
      return <SimplifiedMap key={`map-${gamePhase}`} />;
    }
    
    // Challenge view
    return <ChallengeRouter />;
  };
  
  return (
    <div className="relative h-screen w-full overflow-hidden bg-background">
      {/* Player HUD - only show when initialized */}
      <div className="relative h-full w-full pt-16 pb-0">
        {isInitialized && (
          <div className="absolute top-0 left-0 right-0 z-40">
            <PlayerStats />
          </div>
        )}
        
        {/* Main gameplay area */}
        <div className="h-full w-full">
          {renderGameContent()}
        </div>
      </div>
      
      {/* Enhanced debug panel for development */}
      {process.env.NODE_ENV !== 'production' && (
        <div className="fixed bottom-2 left-2 bg-black/70 text-white text-xs p-2 z-50 font-pixel">
          Init: {isInitialized ? '✓' : '...'} | 
          Phase: {gamePhase} | 
          Node: {currentNodeId || 'none'} | 
          Map: {map ? `${map.nodes.length} nodes` : 'none'} |
          Challenge: {currentChallenge ? 'active' : 'none'}
        </div>
      )}
    </div>
  );
}