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
  // New state to track rendering errors
  const [mapRenderError, setMapRenderError] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const initTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const { 
    gamePhase, 
    currentNodeId, 
    map,
    completeNight,
    startGame,
    setCurrentNode
  } = useGameStore();
  
  const { currentChallenge, resetChallenge } = useChallengeStore();
  const { playSound } = useGameEffects();
  
  // Anti-duplication check - FIX FOR DUPLICATE RENDERING
  useEffect(() => {
    // Clean up duplicates if they exist
    const containers = document.querySelectorAll('[data-game-container]');
    if (containers.length > 1) {
      console.warn(`Found ${containers.length} duplicate game containers, cleaning up extras`);
      for (let i = 1; i < containers.length; i++) {
        containers[i].remove();
      }
    }
    
    return () => {
      // Cleanup any artifacts on unmount
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
      }
    };
  }, []);
  
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
  
  // FIX: Force transition to map helper function
  const forceTransitionToMap = () => {
    console.log("🔄 Forcing transition to map");
    
    // Step 1: Reset challenge state
    resetChallenge();
    
    // Step 2: Clear node selection with small delay
    setTimeout(() => {
      setCurrentNode("");
      // Step 3: Force rerender
      setForceRerender(prev => prev + 1);
    }, 50);
  };
  
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
    
    // MAJOR ENHANCEMENT: More robust map view rendering
    if (!currentNodeId || !map) {
      return (
        <div 
          ref={mapRef} 
          className="h-full w-full relative overflow-hidden bg-black" 
          style={{ 
            minHeight: '100vh', // Ensure full height
            zIndex: 5,
          }}
          data-rerender-key={forceRerender}
        >
          {/* Map wrapper with explicit dimensions - CRITICAL FOR VISIBILITY */}
          <div className="absolute inset-0 starfield-bg" 
               style={{ 
                 minHeight: '100vh', 
                 zIndex: 5,
                 /* Force visibility */
                 opacity: 1,
                 visibility: 'visible' 
               }}>
            {/* Render the map with a key to force fresh render */}
            <SimplifiedMap key={`map-${gamePhase}-${forceRerender}`} />
          </div>
          
          {process.env.NODE_ENV !== 'production' && (
            <div className="absolute top-2 right-2 bg-black/70 text-white text-xs p-1 z-50">
              Map render key: {`${gamePhase}-${forceRerender}`} | 
              NodeId: {currentNodeId || 'none'}
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
            className="bg-green-600 text-white text-xs px-2 py-1 rounded opacity-70 hover:opacity-100"
            onClick={forceTransitionToMap}
          >
            Show Map
          </button>
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
    <div 
      className="relative h-screen w-full overflow-hidden bg-background" 
      data-game-container="true" // For anti-duplication
    >
      {/* Player HUD - only show when initialized - RESTRICT HEIGHT AND LAYER */}
      <div className="relative h-full w-full">
        {isInitialized && (
          <div className="absolute top-0 left-0 right-0" style={{ zIndex: 20, height: '16rem' }}>
            <PlayerStats />
          </div>
        )}
        
        {/* Main gameplay area - EXPLICIT ZINDEX FOR LAYERING */}
        <div className="h-full w-full" style={{ zIndex: 25, position: 'relative' }}>
          {renderGameContent()}
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