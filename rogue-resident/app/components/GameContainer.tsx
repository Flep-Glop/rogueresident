// app/components/GameContainer.tsx
'use client';
import { useEffect, useState, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { useChallengeStore } from '../store/challengeStore';
import SimplifiedMap from './SimplifiedMap';
import EnhancedMap from './EnhancedMap';
import { useGameEffects } from './GameEffects';
import ChallengeRouter from './challenges/ChallengeRouter';
import HillHomeScene from './HillHomeScene';
import PlayerStats from './PlayerStats';
import { SoundEffect } from '../types/audio';
import { useGameState } from '../core/statemachine/GameStateMachine';
import { useEventBus, playSoundEffect } from '../core/events/CentralEventBus';
import { GameEventType } from '../core/events/EventTypes';

export default function GameContainer() {
  // Use the new state machine for game phase management
  const { 
    gamePhase, 
    isDay,
    isNight,
    completeNight
  } = useGameState();
  
  // Track component initialization state
  const [isInitialized, setIsInitialized] = useState(false);
  const [renderCount, setRenderCount] = useState(0);
  const [forceRerender, setForceRerender] = useState(0);
  const [debugInfo, setDebugInfo] = useState<any>({});
  const mapRef = useRef<HTMLDivElement>(null);
  const initTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Maintain compatibility with the old store during migration
  const { 
    currentNodeId, 
    map,
    startGame
  } = useGameStore();
  
  const { currentChallenge, resetChallenge } = useChallengeStore();
  
  // Keep compatibility with sound system during migration
  const { playSound } = useGameEffects();
  
  // Increment render counter once on mount only for debugging
  useEffect(() => {
    setRenderCount(prev => prev + 1);
    
    // Log component mount through the event system
    useEventBus.getState().dispatch(
      GameEventType.UI_BUTTON_CLICKED,
      {
        componentId: 'gameContainer',
        action: 'mounted',
        metadata: {
          renderCount: renderCount + 1,
          timestamp: Date.now()
        }
      }
    );
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
        
        // Dispatch the event through CentralEventBus
        useEventBus.getState().dispatch(
          GameEventType.UI_BUTTON_CLICKED,
          {
            componentId: 'gameContainer',
            action: 'initializeGame',
            metadata: {
              reason: 'map_missing',
              timestamp: Date.now()
            }
          }
        );
        
        startGame();
        
        // Give time for state to propagate before continuing
        initTimeoutRef.current = setTimeout(() => {
          if (mounted) {
            console.log("✅ Initialization complete");
            setIsInitialized(true);
            
            // Log initialization completion through the event system
            useEventBus.getState().dispatch(
              GameEventType.UI_BUTTON_CLICKED,
              {
                componentId: 'gameContainer',
                action: 'initializationComplete',
                metadata: {
                  mapNodeCount: useGameStore.getState().map?.nodes?.length || 0,
                  timestamp: Date.now()
                }
              }
            );
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
      
      // Log forced initialization through the event system
      useEventBus.getState().dispatch(
        GameEventType.UI_BUTTON_CLICKED,
        {
          componentId: 'gameContainer',
          action: 'forcedInitialization',
          metadata: {
            renderCount,
            timestamp: Date.now()
          }
        }
      );
    }
    
    return () => {
      mounted = false;
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
      }
    };
  }, [map, startGame, isInitialized, renderCount, gamePhase]); 
  
  // Separate effect for forcing rerender after delay
  useEffect(() => {
    if (isInitialized && !currentNodeId && map && renderCount < 5) {
      const forceTimer = setTimeout(() => {
        if (!mapRef.current || !mapRef.current.querySelector('.starfield-bg')) {
          console.log("🔄 Forcing rerender to help display map");
          setForceRerender(prev => prev + 1);
          
          // Log forced rerender through the event system
          useEventBus.getState().dispatch(
            GameEventType.UI_BUTTON_CLICKED,
            {
              componentId: 'gameContainer',
              action: 'forcedRerender',
              metadata: {
                renderCount,
                forceRerender: forceRerender + 1,
                timestamp: Date.now()
              }
            }
          );
        }
      }, 2000);
      
      return () => clearTimeout(forceTimer);
    }
  }, [isInitialized, currentNodeId, map, renderCount]);
  
  // Handle phase transition sounds with error catching
  useEffect(() => {
    if (isInitialized) {
      try {
        // Use new sound system
        if (isDay) {
          playSoundEffect('click', 1.0, false);
        } else if (isNight) {
          playSoundEffect('success', 1.0, false);
        }
        
        // Fallback to old system
        if (playSound) {
          if (isDay) {
            playSound('day-start' as SoundEffect);
          } else if (isNight) {
            playSound('night-start' as SoundEffect);
          }
        }
      } catch (error) {
        console.warn("Sound effect failed to play, continuing without audio");
      }
    }
  }, [isDay, isNight, playSound, isInitialized]);
  
  // Clean up challenge state when returning to map
  useEffect(() => {
    if (!currentNodeId && currentChallenge) {
      resetChallenge();
      
      // Log challenge reset through the event system
      useEventBus.getState().dispatch(
        GameEventType.UI_BUTTON_CLICKED,
        {
          componentId: 'gameContainer',
          action: 'resetChallenge',
          metadata: {
            previousChallengeId: currentChallenge.id,
            timestamp: Date.now()
          }
        }
      );
    }
  }, [currentNodeId, currentChallenge, resetChallenge]);
  
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
    if (isNight) {
      return (
        <HillHomeScene 
          onComplete={() => {
            // Dispatch night completion through the event system
            useEventBus.getState().dispatch(
              GameEventType.UI_BUTTON_CLICKED,
              {
                componentId: 'nightCompleteButton',
                action: 'click',
                metadata: {
                  timestamp: Date.now()
                }
              }
            );
            
            // Also call the state machine action directly for migration
            completeNight();
          }} 
        />
      );
    }
    
    // Map view (main navigation hub)
    if (!currentNodeId || !map) {
      return (
        <div 
          ref={mapRef} 
          className="h-full w-full" 
          data-rerender-key={forceRerender}
        >
          {!currentNodeId && (
          <div className="h-full w-full">
            <EnhancedMap />
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
            onClick={() => {
              setForceRerender(prev => prev + 1);
              
              // Log debug action through the event system
              useEventBus.getState().dispatch(
                GameEventType.UI_BUTTON_CLICKED,
                {
                  componentId: 'debugForceRerenderButton',
                  action: 'click',
                  metadata: {
                    renderCount,
                    timestamp: Date.now()
                  }
                }
              );
            }}
          >
            Force Rerender
          </button>
          <button 
            className="bg-blue-600 text-white text-xs px-2 py-1 rounded opacity-70 hover:opacity-100"
            onClick={() => {
              // Log action through the event system before clearing storage
              useEventBus.getState().dispatch(
                GameEventType.UI_BUTTON_CLICKED,
                {
                  componentId: 'debugClearStorageButton',
                  action: 'click',
                  metadata: {
                    timestamp: Date.now()
                  }
                }
              );
              
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
      className="relative h-screen w-full bg-background flex flex-col" 
      data-game-container
      data-phase={gamePhase}
      data-initialized={isInitialized}
    >
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