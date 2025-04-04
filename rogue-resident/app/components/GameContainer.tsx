// app/components/GameContainer.tsx
'use client';
import { useEffect, useState, useRef } from 'react';
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
  const [renderCount, setRenderCount] = useState(0);
  const [forceRerender, setForceRerender] = useState(0);
  const [debugInfo, setDebugInfo] = useState<any>({});
  const mapRef = useRef<HTMLDivElement>(null);
  const initTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const { 
    gamePhase, 
    currentNodeId, 
    map,
    completeNight,
    startGame
  } = useGameStore();
  
  const { currentChallenge, resetChallenge } = useChallengeStore();
  const { playSound } = useGameEffects();
  
  // Increment render counter once on mount only for debugging
  useEffect(() => {
    setRenderCount(prev => prev + 1);
  }, []);
  
  // Stable logging helper that won't cause render loops
  const logGameState = () => {
    const state = {
      isInitialized,
      renderCount,
      gamePhase,
      currentNodeId,
      hasMap: !!map,
      mapNodeCount: map?.nodes?.length || 0,
      hasChallenge: !!currentChallenge
    };
    
    // Only log when important values change
    const stateKey = JSON.stringify(state);
    if (stateKey !== debugInfo.lastLogKey) {
      console.log(`🎮 GameContainer state:`, state);
      setDebugInfo(prev => ({ ...prev, lastLogKey: stateKey }));
    }
    
    return state;
  };
  
  // Enhanced game initialization - FIXED to avoid render loops
  useEffect(() => {
    let mounted = true;
    
    // Clear any existing timeout to prevent memory leaks
    if (initTimeoutRef.current) {
      clearTimeout(initTimeoutRef.current);
    }
    
    // Only initialize once and avoid re-triggering on hot reloads
    if (!isInitialized) {
      console.log("🎮 Component mounted, checking game state", {
        hasMap: !!map,
        renderCount,
        gamePhase,
        timestamp: new Date().toISOString()
      });
      
      // Force map generation if needed
      if (!map) {
        console.log("🗺️ No map detected, initializing game state");
        startGame();
        
        // Give time for state to propagate before continuing
        initTimeoutRef.current = setTimeout(() => {
          if (mounted) {
            console.log("✅ Initialization complete");
            setIsInitialized(true);
          }
        }, 500); // Increased timeout for stability
      } else {
        console.log("🗺️ Map already exists, proceeding to initialization");
        setIsInitialized(true);
      }
    }
    
    // Force initialization after several renders if not already initialized
    if (renderCount > 3 && !isInitialized && map) {
      console.log("⚠️ Forcing initialization after multiple renders");
      setIsInitialized(true);
    }
    
    return () => {
      mounted = false;
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
      }
    };
  }, [map, startGame, isInitialized, renderCount]); // Removed currentNodeId to avoid potential render loops
  
  // Separate effect for forcing rerender after delay
  useEffect(() => {
    if (isInitialized && !currentNodeId && map && renderCount < 5) {
      const forceTimer = setTimeout(() => {
        if (!mapRef.current || !mapRef.current.querySelector('.starfield-bg')) {
          console.log("🔄 Forcing rerender to help display map");
          setForceRerender(prev => prev + 1);
        }
      }, 2000);
      
      return () => clearTimeout(forceTimer);
    }
  }, [isInitialized, currentNodeId, map, renderCount]);
  
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
  
  // Safer diagnostic effect that won't cause render loops
  useEffect(() => {
    // Log render decision without state updates
    console.log(`🖥️ Render output decided: ${
      !isInitialized ? 'loading screen' :
      gamePhase === 'night' ? 'night scene' :
      !currentNodeId || !map ? 'map view' :
      'challenge view'
    }`);
    
    // Only run DOM checks once without setting state
    if (isInitialized && gamePhase === 'day' && (!currentNodeId || !map)) {
      const checkTimer = setTimeout(() => {
        const mapElement = document.querySelector('[class*="starfield-bg"]');
        console.log(`🔍 Map element check: ${mapElement ? 'Found in DOM' : 'Not found in DOM'}`);
      }, 500);
      
      return () => clearTimeout(checkTimer);
    }
  }, [isInitialized, gamePhase, currentNodeId, map]);
  
  // Content router with fallback states for stability
  const renderGameContent = () => {
    // Log the current state for debug purposes
    const state = logGameState();
    
    // Display a stable loading state while initializing
    if (!isInitialized) {
      return (
        <div className="h-full w-full flex items-center justify-center bg-background">
          <div className="text-center p-4">
            <h2 className="text-xl mb-2">Initializing Medical Physics Department...</h2>
            <div className="w-64 h-2 bg-gray-700 rounded-full mx-auto overflow-hidden">
              <div className="h-full bg-blue-500 animate-pulse-slow" style={{width: '60%'}}></div>
            </div>
            <p className="mt-2 text-sm text-gray-400">
              Render count: {renderCount} | Map nodes: {map?.nodes?.length || 0}
            </p>
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
      return (
        <div 
          ref={mapRef} 
          className="h-full w-full" 
          data-rerender-key={forceRerender}
        >
          <SimplifiedMap key={`map-${gamePhase}-${forceRerender}`} />
          {process.env.NODE_ENV !== 'production' && (
            <div className="absolute top-2 right-2 bg-black/70 text-white text-xs p-1 z-50">
              Map render key: {`${gamePhase}-${forceRerender}`}
            </div>
          )}
        </div>
      );
    }
    
    // Challenge view
    return <ChallengeRouter />;
  };
  
  // Render emergency help button during development
  const renderDebugHelpers = () => {
    if (process.env.NODE_ENV !== 'production') {
      return (
        <div className="fixed top-20 right-2 z-50 flex flex-col gap-1">
          <button 
            className="bg-red-600 text-white text-xs px-2 py-1 rounded opacity-70 hover:opacity-100"
            onClick={() => setForceRerender(prev => prev + 1)}
          >
            Force Rerender
          </button>
          <button 
            className="bg-blue-600 text-white text-xs px-2 py-1 rounded opacity-70 hover:opacity-100"
            onClick={() => {
              localStorage.removeItem('rogue-resident-game');
              window.location.reload();
            }}
          >
            Clear Storage & Reload
          </button>
        </div>
      );
    }
    return null;
  };
  
  return (
    <div className="relative h-screen w-full bg-background flex flex-col">
      {/* Top section - Game title bar, can be uncommented if needed */}
      {/* <div className="h-12 w-full bg-surface-dark flex items-center px-4 border-b border-gray-800">
        <h1 className="text-xl font-pixel-heading text-text-primary">Rogue Resident</h1>
      </div> */}
      
      {/* Main content area with modified layout pattern */}
      <div className="flex-grow flex overflow-hidden">
        {/* Left sidebar - Fixed width with internal scroll */}
        <div className="w-64 flex-shrink-0 border-r border-gray-800 overflow-hidden flex flex-col">
          {isInitialized && (
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              <PlayerStats />
            </div>
          )}
        </div>
        
        {/* Main gameplay area with perfect containment */}
        <div className="flex-grow relative overflow-hidden">
          <div className="absolute inset-0 overflow-auto">
            {renderGameContent()}
          </div>
        </div>

        {/* Right sidebar - reserved for future expansion */}
        <div className="w-64 flex-shrink-0 border-l border-gray-800 bg-surface-dark/50 overflow-hidden">
          {/* Right panel content */}
        </div>
      </div>
      
      {/* Debug helpers when needed */}
      {renderDebugHelpers()}
      
      {/* Enhanced debug panel for development */}
      {process.env.NODE_ENV !== 'production' && (
        <div className="fixed bottom-2 left-2 bg-black/70 text-white text-xs p-2 z-50 font-pixel">
          Init: {isInitialized ? '✓' : '...'} | 
          Phase: {gamePhase} | 
          Node: {currentNodeId || 'none'} | 
          Map: {map ? `${map.nodes.length} nodes` : 'none'} |
          Challenge: {currentChallenge ? 'active' : 'none'} |
          Renders: {renderCount}
        </div>
      )}
    </div>
  );
}