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
const TRANSITION_PAUSE_DURATION = 300;     // Brief pause at peak darkness (ms)
const TRANSITION_TOTAL_DURATION = 1500;    // Total visual transition time (ms)
const EMERGENCY_TIMEOUT_DURATION = 8000;   // Emergency recovery timeout (ms)

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
    isDay,
    isNight,
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
  
  // Refs for state tracking across render cycles
  const initRef = useRef(false);
  const componentMountedRef = useRef(true);
  const transitionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const emergencyTimerRef = useRef<NodeJS.Timeout | null>(null);
  const transitionStateRef = useRef<{
    inProgress: boolean;
    startTime: number;
    phase: string;
    targetPhase: string;
  }>({
    inProgress: false,
    startTime: 0,
    phase: '',
    targetPhase: ''
  });
  
  const eventBus = useEventBus.getState();
  
  // Diagnostic phase change logger - critical for debugging transition issues
  useEffect(() => {
    console.log(`%c[PHASE] ${gamePhase}`, 'color: orange; font-weight: bold');
    
    // Clear any stuck transitions after defined timeout as an absolute last resort
    if (gamePhase === 'transition_to_night' || gamePhase === 'transition_to_day') {
      // Clear any existing emergency timer
      if (emergencyTimerRef.current) {
        clearTimeout(emergencyTimerRef.current);
      }
      
      // Set up new emergency timer
      emergencyTimerRef.current = setTimeout(() => {
        if ((gamePhase === 'transition_to_night' || gamePhase === 'transition_to_day') && 
            componentMountedRef.current) {
          // Log emergency recovery
          console.error(`%c[EMERGENCY] Forcing phase completion after ${EMERGENCY_TIMEOUT_DURATION}ms`, 
                        'color: red; font-weight: bold');
          
          // Force appropriate phase
          const targetPhase = gamePhase === 'transition_to_night' ? 'night' : 'day';
          
          // Force transition and update UI
          setIsTransitioning(false);
          transitionToPhase(targetPhase, 'emergency_override');
          
          // Reset transition state
          transitionStateRef.current = {
            inProgress: false,
            startTime: 0,
            phase: '',
            targetPhase: ''
          };
        }
      }, EMERGENCY_TIMEOUT_DURATION);
      
      return () => {
        if (emergencyTimerRef.current) {
          clearTimeout(emergencyTimerRef.current);
          emergencyTimerRef.current = null;
        }
      };
    }
  }, [gamePhase, transitionToPhase]);
  
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
        if (transitionTimerRef.current) {
          clearTimeout(transitionTimerRef.current);
          transitionTimerRef.current = null;
        }
        
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
  
  // FIXED: Complete rewrite of the transition handler with "breath of anticipation" pattern
  useEffect(() => {
    // Only handle transition phases
    if (gamePhase !== 'transition_to_night' && gamePhase !== 'transition_to_day') {
      return;
    }
    
    // Define target phase based on current transition
    const targetPhase = gamePhase === 'transition_to_night' ? 'night' : 'day';
    
    // Log transition start
    console.log(`%c[TRANSITION] Starting ${gamePhase} → ${targetPhase}`, 
                'color: cyan; font-weight: bold');
    
    // Update transition state
    transitionStateRef.current = {
      inProgress: true,
      startTime: Date.now(),
      phase: gamePhase,
      targetPhase
    };
    
    // Begin visual transition
    setIsTransitioning(true);
    
    // Clear existing transition timer
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
    }
    
    // The "Breath of Anticipation" timing pattern:
    // 1. Fade to black (visual only)
    // 2. Brief pause at peak darkness for tension
    // 3. State change just before visual transition completes
    // 4. Visual completion slightly after state change
    
    // Stage 1: Fade in completed, now pause at peak darkness
    const pauseTimer = setTimeout(() => {
      if (!componentMountedRef.current) return;
      
      // Stage 2: At peak darkness, apply the state change
      console.log(`%c[TRANSITION] At peak darkness, changing phase to: ${targetPhase}`, 
                 'color: cyan; font-weight: bold');
      
      // This critical phase change needs to happen while visually dark
      transitionToPhase(targetPhase, 'animation_complete');
      
      // Stage 3: Complete visual transition shortly after state change
      const completeTimer = setTimeout(() => {
        if (!componentMountedRef.current) return;
        
        console.log(`%c[TRANSITION] Visual transition complete to: ${targetPhase}`, 
                   'color: cyan; font-weight: bold');
        
        // Complete visual transition
        setIsTransitioning(false);
        
        // Reset transition state
        transitionStateRef.current = {
          inProgress: false,
          startTime: 0,
          phase: '',
          targetPhase: ''
        };
      }, TRANSITION_PAUSE_DURATION);
      
      // Store the completion timer
      transitionTimerRef.current = completeTimer;
    }, TRANSITION_FADE_DURATION);
    
    // Store the pause timer
    transitionTimerRef.current = pauseTimer;
    
    // Cleanup function
    return () => {
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
        transitionTimerRef.current = null;
      }
    };
  }, [gamePhase, transitionToPhase]);
  
  // FIXED: Memoized callback for night phase completion to avoid recreation on each render
  const handleCompleteNight = useCallback(() => {
    try {
      // Check if we're already transitioning
      if (transitionStateRef.current.inProgress || 
          gamePhase === 'transition_to_day' || 
          gamePhase === 'day') {
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
  
  // Content router based on game phase
  const renderGameContent = () => {
    // Show loading/error states
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
    
    // Show transition animation
    if (isTransitioning) {
      return (
        <div className="h-full w-full flex items-center justify-center bg-black transition-opacity duration-700">
          <div className="text-center">
            <h2 className="text-xl mb-4 text-blue-300 animate-pulse">
              {gamePhase === 'transition_to_night' 
                ? 'Returning to hill home...' 
                : 'Heading to the hospital...'}
            </h2>
            <div className="w-48 h-2 bg-gray-900 rounded-full mx-auto overflow-hidden">
              <div className="h-full bg-blue-500 animate-pulse-flow"></div>
            </div>
          </div>
        </div>
      );
    }
    
    // Night phase (constellation visualization)
    if (isNight) {
      return (
        <HillHomeScene 
          onComplete={handleCompleteNight}
        />
      );
    }
    
    // Map view (day phase navigation)
    if (isDay && !currentNodeId) {
      return <SimplifiedKapoorMap />;
    }
    
    // Challenge view (conversation with Dr. Kapoor)
    if (isDay && currentNodeId) {
      return <ChallengeRouter />;
    }
    
    // FIXED: Improved fallback for unexpected states
    return (
      <div className="h-full w-full flex items-center justify-center bg-background">
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
      {/* Main content layout */}
      <div className="flex-grow flex overflow-hidden">
        {/* Left sidebar */}
        <div className="w-64 flex-shrink-0 border-r border-gray-800 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            <PlayerStats />
          </div>
        </div>
        
        {/* Main gameplay area */}
        <div className="flex-grow relative overflow-hidden">
          <div className="absolute inset-0 overflow-auto">
            {renderGameContent()}
          </div>
        </div>
      </div>
      
      {/* Debug panel for vertical slice mode */}
      <VerticalSliceDebugPanel />
      
      {/* FIXED: Add CSS for transition animations */}
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