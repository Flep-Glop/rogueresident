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
import { initializeSystems } from '../core/init';

// Component props to support the vertical slice mode
interface GameContainerProps {
  mapSlotContent?: React.ReactNode;
}

/**
 * GameContainer - Main game experience container
 * 
 * This component uses a React-safe initialization pattern that:
 * 1. Uses refs to track initialization across renders/remounts
 * 2. Prevents duplicate initializations in Strict Mode or during development
 * 3. Properly handles cleanup when the component unmounts
 * 4. Provides clear state transitions with error boundaries
 */
export default function GameContainer({ mapSlotContent }: GameContainerProps = {}) {
  // Game state references
  const { 
    gamePhase, 
    isDay,
    isNight,
    completeNight
  } = useGameState();
  
  // Store access
  const { 
    currentNodeId, 
    map,
    startGame
  } = useGameStore();
  
  const { currentChallenge, resetChallenge } = useChallengeStore();
  const { playSound } = useGameEffects();
  
  // React state with simplified FSM approach for container state
  const [containerState, setContainerState] = useState<{
    status: 'initializing' | 'ready' | 'error' | 'unmounting';
    error: string | null;
    renderCount: number;
  }>({
    status: 'initializing',
    error: null,
    renderCount: 0
  });
  
  // Refs to handle React's lifecycle safely
  const initRef = useRef<boolean>(false);
  const cleanupRef = useRef<(() => void) | null>(null);
  const componentMountedRef = useRef<boolean>(true);
  
  // Track render count for development diagnostics 
  useEffect(() => {
    // Only update counter, no other side effects
    if (componentMountedRef.current) {
      setContainerState(prev => ({
        ...prev,
        renderCount: prev.renderCount + 1
      }));
    }
  }, []);
  
  // Core initialization - uses refs to ensure it only runs once
  // even through React's development remounts/strict mode
  useEffect(() => {
    // Skip if already initialized (prevents strict mode double-init)
    if (initRef.current) {
      console.log("⏩ GameContainer already initialized, skipping");
      return;
    }
    
    console.log("🎮 GameContainer mounted, initializing core systems...");
    initRef.current = true;
    
    try {
      // Initialize core systems with singleton pattern
      const cleanup = initializeSystems();
      cleanupRef.current = cleanup;
      
      // Logging through event system to test connectivity
      useEventBus.getState().dispatch(
        GameEventType.UI_BUTTON_CLICKED,
        {
          componentId: 'gameContainer',
          action: 'mounted',
          metadata: { 
            timestamp: Date.now(),
            renderCount: containerState.renderCount 
          }
        },
        'gameContainer:mount'
      );
      
      // Generate map if needed
      if (!map) {
        console.log("🗺️ No map detected, initializing game state");
        startGame();
      }
      
      // Update container state safely
      if (componentMountedRef.current) {
        setContainerState(prev => ({
          ...prev,
          status: 'ready'
        }));
      }
    } catch (error) {
      // Handle initialization errors
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("🚨 GameContainer initialization error:", error);
      
      if (componentMountedRef.current) {
        setContainerState(prev => ({
          ...prev,
          status: 'error',
          error: errorMsg
        }));
      }
    }
    
    // Cleanup function ensures we don't have memory leaks or stale state
    return () => {
      console.log("🧹 GameContainer unmounting...");
      componentMountedRef.current = false;
      
      // Update state before removing
      setContainerState(prev => ({
        ...prev,
        status: 'unmounting'
      }));
      
      // Run cleanup if we initialized
      if (cleanupRef.current) {
        try {
          cleanupRef.current();
          console.log("✅ GameContainer cleanup complete");
        } catch (error) {
          console.error("❌ Error during GameContainer cleanup:", error);
        }
      }
    };
  }, [containerState.renderCount, map, startGame]);
  
  // Handle sound effects on phase transitions
  useEffect(() => {
    // Only play sounds when ready
    if (containerState.status !== 'ready') return;
    
    const playPhaseSound = () => {
      try {
        // Use both systems for compatibility during transition
        if (isDay) {
          playSoundEffect('click', 0.8, false);
          playSound?.('day-start' as SoundEffect);
        } else if (isNight) {
          playSoundEffect('success', 0.8, false);
          playSound?.('night-start' as SoundEffect);
        }
      } catch (error) {
        console.warn("Sound effect failed, continuing without audio");
      }
    };
    
    // Slight delay to avoid race conditions
    const timer = setTimeout(playPhaseSound, 50);
    return () => clearTimeout(timer);
  }, [isDay, isNight, playSound, containerState.status]);
  
  // Clean up challenge state when returning to map
  useEffect(() => {
    if (containerState.status !== 'ready') return;
    
    if (!currentNodeId && currentChallenge) {
      resetChallenge();
    }
  }, [currentNodeId, currentChallenge, resetChallenge, containerState.status]);
  
  // Error boundary fallback component
  const ErrorFallback = ({ error, resetFn }: { error: string, resetFn: () => void }) => (
    <div className="p-4 bg-red-900/20 rounded m-4">
      <h3 className="text-xl mb-2">Component Error</h3>
      <p className="mb-2">{error}</p>
      <button 
        className="mt-4 px-3 py-1 bg-blue-700 text-white rounded"
        onClick={resetFn}
      >
        Try to Recover
      </button>
    </div>
  );
  
  // Content router with enhanced error boundaries
  const renderGameContent = () => {
    // Show loading/error states as needed
    if (containerState.status === 'initializing') {
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
    
    if (containerState.status === 'error') {
      return (
        <div className="h-full w-full flex items-center justify-center bg-red-900/10">
          <div className="text-center p-4 max-w-md">
            <h2 className="text-xl mb-2 text-red-500">System Initialization Error</h2>
            <div className="bg-red-900/20 p-4 rounded mb-4 text-sm">
              {containerState.error || 'Unknown error during initialization'}
            </div>
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded"
              onClick={() => {
                // Try emergency reset
                try {
                  if (window.__FORCE_REINITIALIZE__) {
                    window.__FORCE_REINITIALIZE__();
                  }
                  window.location.reload();
                } catch (e) {
                  window.location.reload();
                }
              }}
            >
              Reset & Reload
            </button>
          </div>
        </div>
      );
    }
    
    // Night phase (reflective mode)
    if (isNight) {
      return (
        <HillHomeScene 
          onComplete={() => {
            try {
              // Event first, then state transition
              useEventBus.getState().dispatch(
                GameEventType.UI_BUTTON_CLICKED,
                {
                  componentId: 'nightCompleteButton',
                  action: 'click',
                  metadata: { timestamp: Date.now() }
                },
                'hillHomeScene:complete'
              );
              completeNight();
            } catch (error) {
              console.error("Error completing night phase:", error);
              // Force transition as fallback
              completeNight();
            }
          }} 
        />
      );
    }
    
    // Map view (main navigation)
    if (!currentNodeId) {
      // Support vertical slice custom map
      if (mapSlotContent) {
        return mapSlotContent;
      }
      
      // Regular map view
      return (
        <div className="h-full w-full">
          <EnhancedMap />
        </div>
      );
    }
    
    // Challenge view
    try {
      return <ChallengeRouter />;
    } catch (error) {
      return (
        <ErrorFallback 
          error={error instanceof Error ? error.message : String(error)}
          resetFn={() => {
            resetChallenge();
            // Force return to map
            useGameStore.getState().selectNode(null);
          }}
        />
      );
    }
  };
  
  // Main render with simplified layout
  return (
    <div 
      className="relative h-screen w-full bg-background flex flex-col" 
      data-game-container
      data-phase={gamePhase}
      data-status={containerState.status}
    >
      {/* Main content layout */}
      <div className="flex-grow flex overflow-hidden">
        {/* Left sidebar */}
        <div className="w-64 flex-shrink-0 border-r border-gray-800 overflow-hidden flex flex-col">
          {containerState.status === 'ready' && (
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              <PlayerStats />
            </div>
          )}
        </div>
        
        {/* Main gameplay area */}
        <div className="flex-grow relative overflow-hidden">
          <div className="absolute inset-0 overflow-auto">
            {renderGameContent()}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="w-64 flex-shrink-0 border-l border-gray-800 bg-surface-dark/50 overflow-hidden">
          {/* Reserved for future expansion */}
        </div>
      </div>
      
      {/* Debug helpers in development */}
      {process.env.NODE_ENV !== 'production' && (
        <>
          <div className="fixed top-20 right-2 z-50 flex flex-col gap-1">
            <button 
              className="bg-red-600 text-white text-xs px-2 py-1 rounded opacity-70 hover:opacity-100"
              onClick={() => {
                // Force a refresh of the container state
                setContainerState(prev => ({
                  ...prev,
                  renderCount: prev.renderCount + 1
                }));
                
                useEventBus.getState().dispatch(
                  GameEventType.UI_BUTTON_CLICKED,
                  {
                    componentId: 'debugForceRerenderButton',
                    action: 'click',
                    metadata: { 
                      renderCount: containerState.renderCount + 1,
                      timestamp: Date.now() 
                    }
                  },
                  'debug:forceRerender'
                );
              }}
            >
              Force Rerender
            </button>
            
            <button 
              className="bg-blue-600 text-white text-xs px-2 py-1 rounded opacity-70 hover:opacity-100"
              onClick={() => {
                useEventBus.getState().dispatch(
                  GameEventType.UI_BUTTON_CLICKED,
                  {
                    componentId: 'debugClearStorageButton',
                    action: 'click',
                    metadata: { timestamp: Date.now() }
                  },
                  'debug:clearStorage'
                );
                
                localStorage.removeItem('rogue-resident-game');
                window.location.reload();
              }}
            >
              Clear Storage & Reload
            </button>
            
            <button 
              className="bg-purple-600 text-white text-xs px-2 py-1 rounded opacity-70 hover:opacity-100"
              onClick={() => {
                if (window.__RESET_EVENT_SYSTEM__) {
                  window.__RESET_EVENT_SYSTEM__();
                }
              }}
            >
              Reset Event System
            </button>
          </div>
          
          <div className="fixed bottom-2 left-2 bg-black/70 text-white text-xs p-2 z-50 font-pixel">
            Status: {containerState.status} | 
            Phase: {gamePhase} | 
            Node: {currentNodeId || 'none'} | 
            Map: {map ? `${map.nodes.length} nodes` : 'none'} |
            Challenge: {currentChallenge ? 'active' : 'none'} |
            Renders: {containerState.renderCount}
          </div>
        </>
      )}
    </div>
  );
}