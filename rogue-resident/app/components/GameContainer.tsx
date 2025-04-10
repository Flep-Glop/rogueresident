// app/components/GameContainer.tsx
'use client';
/**
 * GameContainer - Core gameplay orchestration component
 * 
 * Fully Chamber Pattern compliant implementation resolving:
 * 1. Infinite loop error from uncached snapshots
 * 2. Object reference rendering errors
 * 3. Initialization cycle issues
 * 4. Day/night transition coordination
 */
import React, { useEffect, useCallback, useRef } from 'react';
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
  usePrimitiveValues,
  useStableCallback,
  useStableStoreValue
} from '@/app/core/utils/storeHooks';

// Constants for transition visual timing
const TRANSITION_VISUAL_DURATION = 800; // Duration for the fade effect (ms)

export default function GameContainer() {
  // Track render count in development 
  const renderCount = useRenderTracker('GameContainer');
  
  // Track component mounted status for safe side effects
  const mountedRef = useRef(true);
  
  // Use core initialization hook
  const { initialized } = useCoreInitialization();
  
  // ======== PRIMITIVE VALUE EXTRACTION ========
  // Extract ONLY the primitive values we need, nothing else
  
  const gameValues = usePrimitiveValues(
    useGameStateMachine,
    {
      gamePhase: state => state.gamePhase,
      isTransitioning: state => state.isTransitioning,
      currentDay: state => state.currentDay
    },
    {
      gamePhase: 'day',
      isTransitioning: false,
      currentDay: 1
    }
  );
  
  const currentNodeId = usePrimitiveStoreValue(
    useGameStore,
    state => state.currentNodeId,
    null
  );
  
  // Error state managed locally, not in store
  const [hasError, setHasError] = React.useState<string | null>(null);
  
  // ======== STABLE FUNCTION EXTRACTION ========
  // Extract functions with stable references
  
  const stateMachineFunctions = useStableStoreValue(
    useGameStateMachine,
    state => ({
      beginDayCompletion: state.beginDayCompletion,
      beginNightCompletion: state.beginNightCompletion,
      finalizeDayTransition: state.finalizeDayTransition,
      finalizeNightTransition: state.finalizeNightTransition
    })
  );
  
  const resetGame = useStableStoreValue(
    useGameStore,
    state => state.resetGame
  );
  
  // ======== STABLE EVENT HANDLERS ========
  // Create stable event handlers that access fresh state
  
  const handleBeginNight = useStableCallback(() => {
    console.log("[GameContainer] handleBeginNight called");
    if (!stateMachineFunctions?.beginDayCompletion) {
      console.warn("[GameContainer] beginDayCompletion not available");
      return;
    }
    stateMachineFunctions.beginDayCompletion();
  }, []);
  
  const handleBeginDay = useStableCallback(() => {
    console.log("[GameContainer] handleBeginDay called");
    if (!stateMachineFunctions?.beginNightCompletion) {
      console.warn("[GameContainer] beginNightCompletion not available");
      return;
    }
    stateMachineFunctions.beginNightCompletion();
  }, []);
  
  const handleReset = useStableCallback(() => {
    console.log("[GameContainer] Resetting game state");
    if (!resetGame) {
      console.warn("[GameContainer] resetGame not available");
      return;
    }
    resetGame();
  }, []);
  
  // ======== LIFECYCLE MANAGEMENT ========
  
  // Mount/unmount tracking
  useEffect(() => {
    console.log('[GameContainer] Component mounted');
    mountedRef.current = true;
    return () => {
      console.log('[GameContainer] Component unmounted');
      mountedRef.current = false;
    };
  }, []);
  
  // Error handling for core system initialization
  useEffect(() => {
    if (!initialized && mountedRef.current) {
      // Only set error if we're still mounted
      setHasError("Core systems failed to initialize");
    }
  }, [initialized]);
  
  // Transition finalization with clear timer management
  useEffect(() => {
    let finalizeTimer: NodeJS.Timeout | null = null;
    
    // Only enter this block if we have the functions and are in transition
    if (!stateMachineFunctions) return;
    
    if (gameValues.gamePhase === 'transition_to_night') {
      console.log("[GameContainer] Scheduling night finalization");
      finalizeTimer = setTimeout(() => {
        if (mountedRef.current && stateMachineFunctions.finalizeNightTransition) {
          console.log("[GameContainer] Finalizing night transition");
          stateMachineFunctions.finalizeNightTransition();
        }
      }, TRANSITION_VISUAL_DURATION + 50); // Add buffer
    } 
    else if (gameValues.gamePhase === 'transition_to_day') {
      console.log("[GameContainer] Scheduling day finalization");
      finalizeTimer = setTimeout(() => {
        if (mountedRef.current && stateMachineFunctions.finalizeDayTransition) {
          console.log("[GameContainer] Finalizing day transition");
          stateMachineFunctions.finalizeDayTransition();
        }
      }, TRANSITION_VISUAL_DURATION + 50); // Add buffer
    }
    
    // Clean up timer on unmount or phase change
    return () => {
      if (finalizeTimer) {
        clearTimeout(finalizeTimer);
        finalizeTimer = null;
      }
    };
  }, [gameValues.gamePhase, stateMachineFunctions]);
  
  // Event subscription for critical errors
  useEffect(() => {
    // Subscribe to system errors
    let unsubscribe: (() => void) | undefined;
    
    try {
      unsubscribe = useEventBus.getState().subscribe(
        GameEventType.ERROR_LOGGED,
        (event: any) => {
          if (!mountedRef.current) return;
          
          if (
            event.payload?.component === 'statemachine' || 
            event.payload?.component === 'initialization'
          ) {
            console.error(`[GameContainer] System error: ${event.payload?.message}`);
            setHasError(`System error: ${event.payload?.message}`);
          }
        }
      );
    } catch (error) {
      console.error('[GameContainer] Error setting up event subscription:', error);
    }
    
    // Clean up subscription
    return () => {
      try {
        if (unsubscribe) unsubscribe();
      } catch (error) {
        console.warn('[GameContainer] Error cleaning up event subscription:', error);
      }
    };
  }, []);
  
  // ======== CONTENT RENDERING ========
  // Separate render logic based solely on primitives
  
  const renderGameContent = () => {
    // Handle initialization state
    if (!initialized) {
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
    if (hasError) {
      return (
        <div className="h-full w-full flex items-center justify-center text-red-500 bg-gray-900">
          <div className="text-center p-4 bg-gray-800 rounded-lg border border-red-500">
            <h2 className="text-xl font-bold">Error</h2>
            <p className="my-2">{hasError}</p>
            <button 
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              onClick={() => window.__FORCE_REINITIALIZE__ && window.__FORCE_REINITIALIZE__()}
            >
              Attempt Recovery
            </button>
          </div>
        </div>
      );
    }
    
    // Day phase content
    if (gameValues.gamePhase === 'day') {
      return currentNodeId ? <ChallengeRouter /> : <SimplifiedKapoorMap />;
    }
    
    // Night phase content
    if (gameValues.gamePhase === 'night') {
      return <HillHomeScene onComplete={handleBeginDay} />;
    }
    
    // Transition states - use CSS opacity instead of conditional rendering
    if (gameValues.gamePhase === 'transition_to_day' || gameValues.gamePhase === 'transition_to_night') {
      const isDayToNight = gameValues.gamePhase === 'transition_to_night';
      
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
    
    // Fallback for unexpected states
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center p-6 bg-gray-800 rounded-lg">
          <p className="text-lg">Unknown Game Phase: {gameValues.gamePhase || 'undefined'}</p>
          <button 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            onClick={handleReset}
          >
            Reset Game
          </button>
        </div>
      </div>
    );
  };
  
  // ======== COMPONENT RENDER ========
  
  return (
    <div 
      className="relative h-screen w-full bg-background flex flex-col" 
      data-game-container 
      data-phase={gameValues.gamePhase}
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
          Phase: {gameValues.gamePhase} | Node: {currentNodeId || 'none'} | 
          Transitioning: {gameValues.isTransitioning ? 'Yes' : 'No'} | 
          Render: {renderCount}
        </div>
      )}
    </div>
  );
}