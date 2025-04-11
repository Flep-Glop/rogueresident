// app/components/GameContainer.tsx
'use client';
/**
 * GameContainer - Optimized Core Gameplay Orchestration Component
 * 
 * Improvements:
 * 1. Fixed variable naming inconsistency (nodeId vs currentNodeId)
 * 2. Added more robust error handling
 * 3. Improved transition management
 * 4. Better logging for debugging
 * 5. Optimized primitive extraction
 */
import React, { useEffect, useCallback, useRef, useState, useMemo } from 'react';
import { useGameStore } from '@/app/store/gameStore';
import useGameStateMachine from '@/app/core/statemachine/GameStateMachine';
import { useEventBus } from '@/app/core/events/CentralEventBus';
import { GameEventType } from '@/app/core/events/EventTypes';
import { useCoreInitialization } from '@/app/core/init';
import SimplifiedKapoorMap from './map/SimplifiedKapoorMap';
import HillHomeScene from './HillHomeScene';
import PlayerStats from './PlayerStats';
import VerticalSliceDebugPanel from './debug/VerticalSliceDebugPanel';
import ChallengeRouter from './challenges/ChallengeRouter';
import DayNightTransition from './DayNightTransition';

// Import optimized store hooks
import { 
  usePrimitiveStoreValue, 
  useStableCallback,
  usePrimitiveValues
} from '@/app/core/utils/storeHooks';

// Transition timing constants
const TRANSITION_VISUAL_DURATION = 800; // Duration for the fade effect (ms)

/**
 * GameContainer with optimized Chamber Pattern implementation
 */
export default function GameContainer() {
  // ======== REFS (Always first to maintain hook order stability) ========
  const mountedRef = useRef(true);
  const finalizeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const errorSubscriptionRef = useRef<(() => void) | null>(null);
  const componentMountedRef = useRef(true);
  const transitionInProgressRef = useRef(false);
  const lastNodeIdRef = useRef<string | null>(null);
  
  // Create stable selectors that won't change between renders
  const gameStateMachineSelectors = useMemo(() => ({
    gamePhase: (state: any) => state.gamePhase,
    isTransitioning: (state: any) => state.isTransitioning,
    currentDay: (state: any) => state.currentDay
  }), []);

  const gameStoreSelectors = useMemo(() => ({
    currentNodeId: (state: any) => state.currentNodeId
  }), []);
  
  // ======== STATE (Second for hook order stability) ========
  // Error state managed locally, not in store
  const [hasError, setHasError] = useState<string | null>(null);
  const [renderPhase, setRenderPhase] = useState<string>('init');
  const [lastErrorTime, setLastErrorTime] = useState<number>(0);
  
  // ======== INITIALIZATION (Third for hook order stability) ========
  // Use core initialization hook to set up systems
  const { initialized } = useCoreInitialization();
  
  // ======== PRIMITIVE VALUE EXTRACTION (Always in consistent order) ========
  // Extract all primitive values in a single hook call for efficiency
  const { 
    gamePhase, 
    isTransitioning, 
    currentDay
  } = usePrimitiveValues(
    useGameStateMachine,
    gameStateMachineSelectors,
    {
      gamePhase: 'day',
      isTransitioning: false,
      currentDay: 1
    }
  );
  
  // Extract currentNodeId separately for proper dependency tracking
  const currentNodeId = usePrimitiveStoreValue(
    useGameStore,
    gameStoreSelectors.currentNodeId,
    null
  );
  
  // ======== ERROR HANDLING ========
  const logError = useCallback((source: string, error: any) => {
    console.error(`[GameContainer] Error in ${source}:`, error);
    
    // Rate limit error displays to prevent spam
    const now = Date.now();
    if (now - lastErrorTime > 5000) { // Only show errors every 5 seconds
      setHasError(`Error in ${source}: ${error.message || 'Unknown error'}`);
      setLastErrorTime(now);
    }
  }, [lastErrorTime]);
  
  // ======== STABLE EVENT HANDLERS ========
  // Create stable event handlers that access fresh state
  const handleBeginNight = useStableCallback(() => {
    if (transitionInProgressRef.current) {
      console.log("[GameContainer] Transition already in progress, ignoring request");
      return;
    }
    
    transitionInProgressRef.current = true;
    console.log("[GameContainer] Starting transition to night");
    
    try {
      const stateMachine = useGameStateMachine.getState();
      if (stateMachine && stateMachine.beginDayCompletion) {
        if (stateMachine.beginDayCompletion()) {
          console.log("[GameContainer] Day completion initiated successfully");
        } else {
          console.warn("[GameContainer] Failed to initiate day completion");
          transitionInProgressRef.current = false;
        }
      } else {
        console.warn("[GameContainer] beginDayCompletion not available");
        transitionInProgressRef.current = false;
      }
    } catch (error) {
      logError("handleBeginNight", error);
      transitionInProgressRef.current = false;
    }
  }, [logError]);
  
  const handleBeginDay = useStableCallback(() => {
    if (transitionInProgressRef.current) {
      console.log("[GameContainer] Transition already in progress, ignoring request");
      return;
    }
    
    transitionInProgressRef.current = true;
    console.log("[GameContainer] Starting transition to day");
    
    try {
      const stateMachine = useGameStateMachine.getState();
      if (stateMachine && stateMachine.beginNightCompletion) {
        if (stateMachine.beginNightCompletion()) {
          console.log("[GameContainer] Night completion initiated successfully");
        } else {
          console.warn("[GameContainer] Failed to initiate night completion");
          transitionInProgressRef.current = false;
        }
      } else {
        console.warn("[GameContainer] beginNightCompletion not available");
        transitionInProgressRef.current = false;
      }
    } catch (error) {
      logError("handleBeginDay", error);
      transitionInProgressRef.current = false;
    }
  }, [logError]);
  
  const handleReset = useStableCallback(() => {
    try {
      console.log("[GameContainer] Attempting to reset game");
      const gameStore = useGameStore.getState();
      if (gameStore && gameStore.resetGame) {
        gameStore.resetGame();
      } else {
        console.warn("[GameContainer] resetGame not available");
        // Fallback: Try to use window-level reset
        if (typeof window !== 'undefined' && window.__FORCE_REINITIALIZE__) {
          window.__FORCE_REINITIALIZE__();
        }
      }
    } catch (error) {
      logError("handleReset", error);
    }
  }, [logError]);
  
  // ======== LIFECYCLE EFFECTS (In consistent order) ========
  
  // Mount/unmount tracking - FIRST EFFECT
  useEffect(() => {
    console.log('[GameContainer] Component mounted');
    mountedRef.current = true;
    componentMountedRef.current = true;
    
    return () => {
      console.log('[GameContainer] Component unmounted');
      mountedRef.current = false;
      componentMountedRef.current = false;
      
      // Clean up any pending timers
      if (finalizeTimerRef.current) {
        clearTimeout(finalizeTimerRef.current);
        finalizeTimerRef.current = null;
      }
      
      // Clean up any event subscriptions
      if (errorSubscriptionRef.current) {
        errorSubscriptionRef.current();
        errorSubscriptionRef.current = null;
      }
    };
  }, []);
  
  // Initialization tracking - SECOND EFFECT
  useEffect(() => {
    // Update render phase based on initialization status
    if (initialized) {
      setRenderPhase('ready');
    } else {
      setRenderPhase('initializing');
      
      // If initialization fails after a reasonable timeout, set error
      const initTimeout = setTimeout(() => {
        if (!initialized && mountedRef.current && renderPhase !== 'error') {
          console.error("[GameContainer] Initialization timeout exceeded");
          setRenderPhase('error');
          setHasError("Core systems failed to initialize (timeout)");
        }
      }, 5000); // 5 second timeout
      
      return () => clearTimeout(initTimeout);
    }
  }, [initialized, renderPhase]);
  
  // Transition finalization - THIRD EFFECT
  useEffect(() => {
    if (!initialized) return; // Skip if not initialized
    
    // Clear any existing timer first to prevent duplicates
    if (finalizeTimerRef.current) {
      clearTimeout(finalizeTimerRef.current);
      finalizeTimerRef.current = null;
    }
    
    if (gamePhase === 'transition_to_night') {
      console.log("[GameContainer] Setting up night transition finalization timer");
      finalizeTimerRef.current = setTimeout(() => {
        if (!componentMountedRef.current) return;
        
        try {
          const stateMachine = useGameStateMachine.getState();
          if (stateMachine && stateMachine.finalizeNightTransition) {
            stateMachine.finalizeNightTransition();
            console.log("[GameContainer] Night transition finalized");
            // Reset the transition flag after completion
            transitionInProgressRef.current = false;
          } else {
            console.warn("[GameContainer] finalizeNightTransition not available");
          }
        } catch (error) {
          logError("night transition finalization", error);
          transitionInProgressRef.current = false;
        }
      }, TRANSITION_VISUAL_DURATION + 50); // Add buffer
    } 
    else if (gamePhase === 'transition_to_day') {
      console.log("[GameContainer] Setting up day transition finalization timer");
      finalizeTimerRef.current = setTimeout(() => {
        if (!componentMountedRef.current) return;
        
        try {
          const stateMachine = useGameStateMachine.getState();
          if (stateMachine && stateMachine.finalizeDayTransition) {
            stateMachine.finalizeDayTransition();
            console.log("[GameContainer] Day transition finalized");
            // Reset the transition flag after completion
            transitionInProgressRef.current = false;
          } else {
            console.warn("[GameContainer] finalizeDayTransition not available");
          }
        } catch (error) {
          logError("day transition finalization", error);
          transitionInProgressRef.current = false;
        }
      }, TRANSITION_VISUAL_DURATION + 50); // Add buffer
    }
    // If not in a transition phase, reset the flag
    else {
      transitionInProgressRef.current = false;
    }
    
    // Cleanup timer on unmount or phase change
    return () => {
      if (finalizeTimerRef.current) {
        clearTimeout(finalizeTimerRef.current);
        finalizeTimerRef.current = null;
      }
    };
  }, [gamePhase, initialized, logError]);
  
  // Error subscription - FOURTH EFFECT
  useEffect(() => {
    if (!initialized) return; // Skip if not initialized
    
    // Subscribe to system errors
    try {
      const eventBus = useEventBus.getState();
      
      if (eventBus && eventBus.subscribe) {
        errorSubscriptionRef.current = eventBus.subscribe(
          GameEventType.ERROR_LOGGED,
          (event: any) => {
            if (!mountedRef.current) return;
            
            if (
              event.payload?.component === 'statemachine' || 
              event.payload?.component === 'initialization'
            ) {
              console.error(`[GameContainer] System error: ${event.payload?.message}`);
              setHasError(`System error: ${event.payload?.message}`);
              setRenderPhase('error');
            }
          }
        );
      }
    } catch (error) {
      console.error('[GameContainer] Error setting up event subscription:', error);
    }
    
    // Clean up subscription
    return () => {
      try {
        if (errorSubscriptionRef.current) {
          errorSubscriptionRef.current();
          errorSubscriptionRef.current = null;
        }
      } catch (error) {
        console.warn('[GameContainer] Error cleaning up event subscription:', error);
      }
    };
  }, [initialized]);
  
  // Track node ID changes - FIFTH EFFECT
  useEffect(() => {
    if (currentNodeId !== lastNodeIdRef.current) {
      console.log(`[GameContainer] Node ID changed: ${lastNodeIdRef.current} -> ${currentNodeId}`);
      lastNodeIdRef.current = currentNodeId;
    }
  }, [currentNodeId]);
  
  // ======== MEMOIZED CONTENT RENDERING ========
  // Separate render logic based on initialization phase and memoize it
  const renderGameContent = useCallback(() => {
    // Handle initialization state
    if (renderPhase === 'initializing' || !initialized) {
      return (
        <div className="h-full w-full flex items-center justify-center bg-gray-900 text-white">
          <div className="text-center">
            <h1 className="text-2xl mb-4">Initializing Rogue Resident...</h1>
            <div className="w-48 h-2 bg-gray-800 rounded-full mx-auto overflow-hidden">
              <div className="h-full bg-blue-500 animate-pulse" style={{ width: '60%' }}></div>
            </div>
          </div>
        </div>
      );
    }
    
    // Handle error state
    if (hasError || renderPhase === 'error') {
      return (
        <div className="h-full w-full flex items-center justify-center text-red-500 bg-gray-900">
          <div className="text-center p-4 bg-gray-800 rounded-lg border border-red-500">
            <h2 className="text-xl font-bold">Error</h2>
            <p className="my-2">{hasError || "Unknown error during initialization"}</p>
            <button 
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              onClick={() => {
                if (typeof window !== 'undefined' && window.__FORCE_REINITIALIZE__) {
                  window.__FORCE_REINITIALIZE__();
                } else {
                  handleReset();
                }
              }}
            >
              Attempt Recovery
            </button>
          </div>
        </div>
      );
    }
    
    // Ready state - show game content by phase
    if (renderPhase === 'ready') {
      // Day phase content - CRITICAL FIX: Use currentNodeId consistently
      if (gamePhase === 'day') {
        console.log(`[GameContainer] Rendering day phase, currentNodeId: ${currentNodeId}`);
        return currentNodeId ? <ChallengeRouter /> : <SimplifiedKapoorMap />;
      }
      
      // Night phase content
      if (gamePhase === 'night') {
        return <HillHomeScene onComplete={handleBeginDay} />;
      }
      
      // Transition phase content with fade effect
      if (gamePhase === 'transition_to_day' || gamePhase === 'transition_to_night') {
        const isDayToNight = gamePhase === 'transition_to_night';
        
        return (
          <div className="opacity-50 transition-opacity duration-300">
            {isDayToNight ? (
              <SimplifiedKapoorMap />
            ) : (
              <HillHomeScene onComplete={() => {}} />
            )}
          </div>
        );
      }
    }
    
    // Fallback for unexpected states
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center p-6 bg-gray-800 rounded-lg">
          <p className="text-lg">Unknown Game Phase: {gamePhase || 'undefined'}</p>
          <p className="text-sm mt-2">Render Phase: {renderPhase}</p>
          <button 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            onClick={handleReset}
          >
            Reset Game
          </button>
        </div>
      </div>
    );
  }, [
    renderPhase, 
    initialized, 
    hasError, 
    gamePhase, 
    currentNodeId,  // CRITICAL FIX: Made this a dependency
    handleBeginDay, 
    handleReset
  ]);
  
  // ======== COMPONENT RENDER ========
  return (
    <div 
      className="relative h-screen w-full bg-background flex flex-col"
      data-game-container 
      data-phase={gamePhase}
      data-render-phase={renderPhase}
      data-node-id={currentNodeId || 'none'}  // Add this for debugging
    >
      <div className="flex-grow flex overflow-hidden">
        <div className="flex-grow relative overflow-hidden">
          <div className="absolute inset-0 overflow-auto">
            {renderGameContent()}
          </div>
        </div>
        <div className="w-64 flex-shrink-0 border-l border-gray-800 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            <PlayerStats />
          </div>
        </div>
      </div>

      {/* Purely presentational transition overlay */}
      <DayNightTransition />

      {/* Debug Panel - Only in development */}
      {process.env.NODE_ENV !== 'production' && <VerticalSliceDebugPanel />}

      {/* Enhanced Debug Info - Only in development */}
      {process.env.NODE_ENV !== 'production' && (
        <div className="fixed bottom-0 left-0 bg-black/80 text-white p-2 text-xs z-50">
          Phase: <span className="text-green-400">{gamePhase}</span> | 
          Node: <span className="text-blue-400">{currentNodeId || 'none'}</span> | 
          Transitioning: {isTransitioning ? 'Yes' : 'No'} | 
          Day: {currentDay} | 
          Init: {initialized ? 'Yes' : 'No'} |
          R-Phase: {renderPhase}
        </div>
      )}
    </div>
  );
}