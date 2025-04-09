// app/components/GameContainer.tsx
'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useGameStore } from '@/app/store/gameStore';
import { useGameState } from '@/app/core/statemachine/GameStateMachine';
import { useEventBus } from '@/app/core/events/CentralEventBus';
import { GameEventType } from '@/app/core/events/EventTypes';
import { initializeSystems } from '@/app/core/init';
import SimplifiedKapoorMap from './vs/SimplifiedKapoorMap';
import HillHomeScene from './HillHomeScene';
import PlayerStats from './PlayerStats';
import VerticalSliceDebugPanel from './debug/VerticalSliceDebugPanel';
import ChallengeRouter from './challenges/ChallengeRouter';

// Constants for transition timing - these create the rhythm of the experience
const TRANSITION_FADE_DURATION = 700;      // Time to fade to black (ms)
const TRANSITION_TOTAL_DURATION = 1500;    // Total visual transition time (ms)
const EMERGENCY_TIMEOUT_DURATION = 5000;   // Emergency recovery timeout (ms)

/**
 * GameContainer - Core scene router and system initializer
 * 
 * Acts as the primary orchestrator for the game's day/night rhythm, maintaining
 * the critical narrative flow between challenge (day) and reflection (night).
 */
export default function GameContainer() {
  // Game phase state with proper derivation
  const { 
    gamePhase, 
    completeNight,
    completeDay,
    transitionToPhase
  } = useGameState();
  
  // Game store access for node tracking
  const { 
    currentNodeId, 
    map,
    startGame,
    resetGame
  } = useGameStore();
  
  // Component state
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasError, setHasError] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [fadeState, setFadeState] = useState<'none' | 'fading-in' | 'fading-out'>('none');
  
  // Refs for state tracking across render cycles
  const initRef = useRef(false);
  const componentMountedRef = useRef(true);
  const emergencyTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const eventBus = useEventBus.getState();
  
  // Initialize systems only once
  useEffect(() => {
    // Skip if already initialized
    if (initRef.current) return;
    initRef.current = true;
    
    console.log("🎮 Initializing Vertical Slice systems...");
    
    try {
      // Initialize core systems
      const cleanup = initializeSystems();
      
      // Start game with vertical slice configuration
      if (!map) {
        startGame({ 
          seed: 42, 
          mapType: 'tutorial',
          forceVerticalSlice: true
        });
      }
      
      // Mark as initialized
      setIsInitialized(true);
      
      // Log initialization
      try {
        eventBus.dispatch(
          GameEventType.SESSION_STARTED, 
          { mode: 'vertical_slice', timestamp: Date.now() },
          'gameContainer'
        );
      } catch (error) {
        console.warn("Event dispatch error, continuing anyway:", error);
      }
      
      // Return cleanup function
      return () => {
        componentMountedRef.current = false;
        
        // Clear any active timers
        if (emergencyTimerRef.current) {
          clearTimeout(emergencyTimerRef.current);
          emergencyTimerRef.current = null;
        }
        
        if (cleanup) cleanup();
      };
    } catch (error) {
      console.error("Initialization failed:", error);
      setHasError(error instanceof Error ? error.message : String(error));
    }
  }, [map, startGame, eventBus]);
  
  // Emergency timer safety mechanism
  useEffect(() => {
    console.log(`%c[PHASE] ${gamePhase}`, 'color: orange; font-weight: bold');
    
    // Clear any stuck transitions after defined timeout as an absolute last resort
    if (gamePhase === 'transition_to_night' || gamePhase === 'transition_to_day') {
      // Set up new emergency timer 
      emergencyTimerRef.current = setTimeout(() => {
        if ((gamePhase === 'transition_to_night' || gamePhase === 'transition_to_day') && 
            componentMountedRef.current) {
          // Log emergency recovery
          console.error(`%c[EMERGENCY] Forcing phase completion after ${EMERGENCY_TIMEOUT_DURATION}ms`, 
                        'color: red; font-weight: bold');
          
          // Force appropriate phase
          const targetPhase = gamePhase === 'transition_to_night' ? 'night' : 'day';
          
          // Direct phase change with specific emergency reason
          transitionToPhase(targetPhase, 'emergency_recovery_timeout');
          
          // Log for diagnostics
          try {
            eventBus.dispatch(
              GameEventType.TRANSITION_RECOVERY,
              {
                type: 'transition',
                source: 'emergency_timer',
                previousState: gamePhase,
                targetState: targetPhase,
                metadata: {
                  timeoutDuration: EMERGENCY_TIMEOUT_DURATION
                },
                successful: true,
                timestamp: Date.now()
              },
              'gameContainer:emergencyTimeout'
            );
          } catch (error) {
            console.error('[GameContainer] Failed to dispatch recovery event:', error);
          }
        }
      }, EMERGENCY_TIMEOUT_DURATION);
      
      return () => {
        if (emergencyTimerRef.current) {
          clearTimeout(emergencyTimerRef.current);
          emergencyTimerRef.current = null;
        }
      };
    }
  }, [gamePhase, transitionToPhase, eventBus]);
  
  // Memoized callback for night phase completion
  const handleCompleteNight = useCallback(() => {
    try {
      // Check if we're already transitioning
      if (gamePhase === 'transition_to_day' || gamePhase === 'day') {
        console.log('[GameContainer] Already transitioning to day, ignoring duplicate completion request');
        return;
      }
      
      console.log('%c[GameContainer] Completing night phase', 'color: purple; font-weight: bold');
      
      // Dispatch event first
      try {
        eventBus.dispatch(
          GameEventType.UI_BUTTON_CLICKED,
          {
            componentId: 'nightCompleteButton',
            action: 'click',
            metadata: { timestamp: Date.now() }
          },
          'gameContainer'
        );
      } catch (error) {
        console.warn('[GameContainer] Event dispatch error, continuing with night completion:', error);
      }
      
      // Then complete the night phase
      completeNight();
    } catch (error) {
      console.error("[GameContainer] Error transitioning from night:", error);
      // Force transition as fallback
      try {
        transitionToPhase('transition_to_day', 'error_recovery');
      } catch (fallbackError) {
        console.error("[GameContainer] Critical error in fallback transition:", fallbackError);
      }
    }
  }, [gamePhase, completeNight, transitionToPhase, eventBus]);

  /**
   * SIMPLIFIED RENDER GAME CONTENT
   */
  const renderGameContent = () => {
    console.log(`[RENDERING] Current phase: ${gamePhase}, Node: ${currentNodeId}, Transitioning: ${isTransitioning}`);
    
    // 1. Handle loading/error states first
    if (!isInitialized) {
      return (
        <div className="h-full w-full flex items-center justify-center bg-background">
          <div className="text-center p-4">
            <h2 className="text-xl mb-2">Initializing Medical Physics Department...</h2>
            <div className="w-64 h-2 bg-gray-700 rounded-full mx-auto overflow-hidden">
              <div className="h-full bg-blue-500 animate-pulse" style={{width: '60%'}}></div>
            </div>
          </div>
        </div>
      );
    }
    
    if (hasError) {
      return (
        <div className="h-full w-full flex items-center justify-center bg-background">
          <div className="text-center p-4 max-w-md">
            <h2 className="text-xl mb-2 text-red-500">Initialization Error</h2>
            <div className="bg-red-900/20 p-4 rounded mb-4 text-sm">
              {hasError}
            </div>
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded"
              onClick={() => {
                resetGame();
                window.location.reload();
              }}
            >
              Reset & Reload
            </button>
          </div>
        </div>
      );
    }
    
    // 2. DIRECT PHASE RENDERING
    
    // Night phase - direct render
    if (gamePhase === 'night') {
      return (
        <div className="w-full h-full">
          <HillHomeScene onComplete={handleCompleteNight} />
        </div>
      );
    }
    
    // Day phase - map view
    if (gamePhase === 'day' && !currentNodeId) {
      return <SimplifiedKapoorMap />;
    }
    
    // Challenge view
    if (gamePhase === 'day' && currentNodeId) {
      return <ChallengeRouter />;
    }
    
    // 3. Transition state
    if (gamePhase === 'transition_to_night' || gamePhase === 'transition_to_day' || isTransitioning) {
      return (
        <div className="h-full w-full flex items-center justify-center bg-black">
          <div className="text-center">
            <h2 className="text-xl mb-4 text-blue-300 animate-pulse">
              {gamePhase === 'transition_to_night' 
                ? 'Returning to hill home...' 
                : 'Heading to the hospital...'}
            </h2>
            <div className="w-48 h-2 bg-gray-900 rounded-full mx-auto overflow-hidden">
              <div className="h-full bg-blue-500 animate-pulse-flow"></div>
            </div>
            
            {/* Emergency manual transition button - appears after 2 seconds */}
            {(Date.now() - (gamePhase.startsWith('transition_to_') ? Date.now() - 3000 : 0) > 2000) && (
              <button 
                className="mt-6 px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm rounded"
                onClick={() => {
                  const targetPhase = gamePhase === 'transition_to_night' ? 'night' : 'day';
                  console.warn(`[GameContainer] Manual transition override to ${targetPhase}`);
                  
                  // Force phase change
                  transitionToPhase(targetPhase, 'manual_override');
                }}
              >
                Force Complete Transition
              </button>
            )}
          </div>
        </div>
      );
    }
    
    // 4. Fallback - should never reach this
    return (
      <div className="h-full w-full flex items-center justify-center bg-red-900/20">
        <div className="text-center p-4">
          <h2 className="text-xl mb-2 text-yellow-500">Unexpected Game State</h2>
          <div className="bg-gray-900/50 p-4 rounded mb-4">
            <p>Current phase: <span className="font-bold">{gamePhase}</span></p>
            <p>Current node: <span className="font-bold">{currentNodeId || 'none'}</span></p>
            <p className="text-gray-400 text-sm mt-2">The game has encountered an unusual state.</p>
          </div>
          <div className="flex space-x-4 justify-center">
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded"
              onClick={() => {
                // Force day phase as recovery
                transitionToPhase('day', 'user_recovery');
              }}
            >
              Return to Day Phase
            </button>
            <button
              className="px-4 py-2 bg-purple-600 text-white rounded"
              onClick={() => {
                // Force night phase as recovery
                transitionToPhase('night', 'user_recovery');
              }}
            >
              Return to Night Phase
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  // Track component mounted state
  useEffect(() => {
    componentMountedRef.current = true;
    return () => {
      componentMountedRef.current = false;
    };
  }, []);
  
  // Main render
  return (
    <div 
      className="relative h-screen w-full bg-background flex flex-col" 
      data-game-container
      data-phase={gamePhase}
    >
      {/* Main content layout with RIGHT sidebar (modified from original) */}
      <div className="flex-grow flex overflow-hidden">
        {/* Main gameplay area */}
        <div className="flex-grow relative overflow-hidden">
          <div className="absolute inset-0 overflow-auto">
            {renderGameContent()}
          </div>
        </div>
        
        {/* Right sidebar - moved from left to right */}
        <div className="w-64 flex-shrink-0 border-l border-gray-800 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            <PlayerStats />
          </div>
        </div>
      </div>
      
      {/* Transition overlay */}
      {(fadeState !== 'none' || isTransitioning) && (
        <div 
          className={`fixed inset-0 z-[9999] bg-black pointer-events-none transition-opacity duration-700
            ${fadeState === 'fading-in' ? 'opacity-100' : 
              fadeState === 'fading-out' ? 'opacity-0' : 
              isTransitioning ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
      
      {/* Debug panel for vertical slice mode */}
      <VerticalSliceDebugPanel />
      
      {/* Debug overlay - essential for diagnosing transition issues */}
      {process.env.NODE_ENV !== 'production' && (
        <div className="fixed bottom-0 left-0 bg-black/80 text-white p-2 text-xs z-50">
          Phase: {gamePhase} | Node: {currentNodeId || 'none'}
        </div>
      )}
      
      {/* CSS for transition animations */}
      <style jsx>{`
        @keyframes pulseFlow {
          0% { width: 0%; }
          50% { width: 100%; }
          100% { width: 0%; }
        }
        
        .animate-pulse-flow {
          animation: pulseFlow 2s ease-in-out infinite;
        }
        
        .transition-opacity {
          transition: opacity 700ms ease-in-out;
        }
      `}</style>
    </div>
  );
}