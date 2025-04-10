// app/components/GameContainer.tsx
'use client';
/**
 * GameContainer - Core gameplay orchestration component
 * 
 * Chamber Pattern compliant with fixed hook ordering that resolves:
 * 1. Hook ordering stability issues
 * 2. Initialization sequence dependencies 
 * 3. Safe primitive extraction during bootstrap
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
import { useRenderTracker } from '@/app/core/utils/chamberDebug';

// Import the improved store hooks
import { 
  usePrimitiveStoreValue, 
  useStableCallback
} from '@/app/core/utils/storeHooks';

// Constants for transition visual timing
const TRANSITION_VISUAL_DURATION = 800; // Duration for the fade effect (ms)

/**
 * Fixed GameContainer with stable hook ordering
 */
export default function GameContainer() {
  // ======== REFS (Always first to maintain hook order stability) ========
  const mountedRef = useRef(true);
  const finalizeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const errorSubscriptionRef = useRef<(() => void) | null>(null);
  const componentMountedRef = useRef(true);
  const initialRenderRef = useRef(true);
  const selectorCacheRef = useRef({
    gamePhase: (state: any) => state.gamePhase,
    isTransitioning: (state: any) => state.isTransitioning,
    currentDay: (state: any) => state.currentDay,
    currentNodeId: (state: any) => state.currentNodeId
  });
  
  // ======== STATE (Second for hook order stability) ========
  // Error state managed locally, not in store
  const [hasError, setHasError] = useState<string | null>(null);
  const [renderPhase, setRenderPhase] = useState<string>('init');
  
  // ======== INITIALIZATION (Third for hook order stability) ========
  // Track render count in development
  const renderCount = useRenderTracker('GameContainer');
  
  // Use core initialization hook
  const { initialized } = useCoreInitialization();
  
  // ======== PRIMITIVE VALUE EXTRACTION (Always in consistent order - no conditionals!) ========
  // CRITICAL: Must use the SAME selectors with the SAME hooks in the SAME order on every render
  
  // Safely extract primitive values with fallbacks for uninitialized state
  const gamePhase = usePrimitiveStoreValue(
    useGameStateMachine,
    selectorCacheRef.current.gamePhase,
    'day'
  );
  
  const isTransitioning = usePrimitiveStoreValue(
    useGameStateMachine,
    selectorCacheRef.current.isTransitioning,
    false
  );
  
  const currentDay = usePrimitiveStoreValue(
    useGameStateMachine,
    selectorCacheRef.current.currentDay,
    1
  );
  
  const currentNodeId = usePrimitiveStoreValue(
    useGameStore,
    selectorCacheRef.current.currentNodeId,
    null
  );
  
  // ======== STABLE EVENT HANDLERS (No conditional hook execution) ========
  // Create stable event handlers that access fresh state
  const handleBeginNight = useStableCallback(() => {
    console.log("[GameContainer] handleBeginNight called");
    try {
      const stateMachine = useGameStateMachine.getState();
      if (stateMachine && stateMachine.beginDayCompletion) {
        stateMachine.beginDayCompletion();
      } else {
        console.warn("[GameContainer] beginDayCompletion not available");
      }
    } catch (error) {
      console.error("[GameContainer] Error in handleBeginNight:", error);
    }
  }, []);
  
  const handleBeginDay = useStableCallback(() => {
    console.log("[GameContainer] handleBeginDay called");
    try {
      const stateMachine = useGameStateMachine.getState();
      if (stateMachine && stateMachine.beginNightCompletion) {
        stateMachine.beginNightCompletion();
      } else {
        console.warn("[GameContainer] beginNightCompletion not available");
      }
    } catch (error) {
      console.error("[GameContainer] Error in handleBeginDay:", error);
    }
  }, []);
  
  const handleReset = useStableCallback(() => {
    console.log("[GameContainer] Resetting game state");
    try {
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
      console.error("[GameContainer] Error in handleReset:", error);
    }
  }, []);
  
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
    
    // Clear any existing timer first
    if (finalizeTimerRef.current) {
      clearTimeout(finalizeTimerRef.current);
      finalizeTimerRef.current = null;
    }
    
    // Handle transitions with defensive programming
    try {
      // Only enter this block if we're in transition
      if (gamePhase === 'transition_to_night') {
        console.log("[GameContainer] Scheduling night finalization");
        
        finalizeTimerRef.current = setTimeout(() => {
          if (!componentMountedRef.current) return;
          
          console.log("[GameContainer] Finalizing night transition");
          try {
            const stateMachine = useGameStateMachine.getState();
            if (stateMachine && stateMachine.finalizeNightTransition) {
              stateMachine.finalizeNightTransition();
            } else {
              console.warn("[GameContainer] finalizeNightTransition not available");
            }
          } catch (error) {
            console.error("[GameContainer] Error finalizing night transition:", error);
          }
        }, TRANSITION_VISUAL_DURATION + 50); // Add buffer
      } 
      else if (gamePhase === 'transition_to_day') {
        console.log("[GameContainer] Scheduling day finalization");
        
        finalizeTimerRef.current = setTimeout(() => {
          if (!componentMountedRef.current) return;
          
          console.log("[GameContainer] Finalizing day transition");
          try {
            const stateMachine = useGameStateMachine.getState();
            if (stateMachine && stateMachine.finalizeDayTransition) {
              stateMachine.finalizeDayTransition();
            } else {
              console.warn("[GameContainer] finalizeDayTransition not available");
            }
          } catch (error) {
            console.error("[GameContainer] Error finalizing day transition:", error);
          }
        }, TRANSITION_VISUAL_DURATION + 50); // Add buffer
      }
    } catch (error) {
      console.error("[GameContainer] Error in transition effect:", error);
    }
    
    return () => {
      if (finalizeTimerRef.current) {
        clearTimeout(finalizeTimerRef.current);
        finalizeTimerRef.current = null;
      }
    };
  }, [gamePhase, initialized]);
  
  // Event subscription for critical errors - FOURTH EFFECT
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
  
  // Mark after initial render - FIFTH EFFECT
  useEffect(() => {
    initialRenderRef.current = false;
  }, []);
  
  // ======== CONTENT RENDERING ========
  // Separate render logic based on initialization phase
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
      // Day phase content
      if (gamePhase === 'day') {
        return currentNodeId ? <ChallengeRouter /> : <SimplifiedKapoorMap />;
      }
      
      // Night phase content
      if (gamePhase === 'night') {
        return <HillHomeScene onComplete={handleBeginDay} />;
      }
      
      // Transition states - use CSS opacity instead of conditional rendering
      if (gamePhase === 'transition_to_day' || gamePhase === 'transition_to_night') {
        const isDayToNight = gamePhase === 'transition_to_night';
        
        return (
          <div style={{ opacity: 0.5 }}>
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
  }, [initialized, hasError, gamePhase, currentNodeId, renderPhase, handleBeginDay, handleReset]);
  
  // ======== COMPONENT RENDER ========
  return (
    <div 
      className="relative h-screen w-full bg-background flex flex-col" 
      data-game-container 
      data-phase={gamePhase}
      data-render-phase={renderPhase}
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

      {/* Debug panel - only visible in development */}
      {process.env.NODE_ENV !== 'production' && (
        <VerticalSliceDebugPanel />
      )}

      {/* Simplified Debug Info */}
      {process.env.NODE_ENV !== 'production' && (
        <div className="fixed bottom-0 left-0 bg-black/80 text-white p-2 text-xs z-50">
          Phase: {gamePhase} | Node: {currentNodeId || 'none'} | 
          Transitioning: {isTransitioning ? 'Yes' : 'No'} | 
          Render: {renderCount} | 
          Init: {initialized ? 'Yes' : 'No'} |
          R-Phase: {renderPhase}
        </div>
      )}
    </div>
  );
}