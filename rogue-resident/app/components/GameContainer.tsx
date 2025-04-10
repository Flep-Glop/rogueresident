// app/components/GameContainer.tsx
// Refactored GameContainer to rely on state machine events/state
'use client';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useGameStore } from '@/app/store/gameStore';
import useGameStateMachine from '@/app/core/statemachine/GameStateMachine';
import { useEventBus, useEventSubscription } from '@/app/core/events/CentralEventBus';
import { GameEventType } from '@/app/core/events/EventTypes';
import { useCoreInitialization } from '@/app/core/init';
import SimplifiedKapoorMap from './map/SimplifiedKapoorMap';
import HillHomeScene from './HillHomeScene';
import PlayerStats from './PlayerStats';
import VerticalSliceDebugPanel from './debug/VerticalSliceDebugPanel';
import ChallengeRouter from './challenges/ChallengeRouter';
import DayNightTransition from './DayNightTransition';

// Import the optimized store hooks for stable subscriptions
import { 
  useStableStoreValue, 
  usePrimitiveStoreValue, 
  useGamePhaseObserver 
} from '@/app/core/utils/storeHooks';

// Constants for transition visual timing
const TRANSITION_VISUAL_DURATION = 800; // Duration for the fade effect (ms)

/**
 * GameContainer - Core gameplay orchestration component
 * 
 * Manages the day/night cycle and phase transitions that form the game's 
 * core loop, similar to the Chamber Manager in Hades. This component handles
 * transitioning between different gameplay contexts while maintaining state integrity.
 */
export default function GameContainer() {
  // FIXED: Direct access to primitive values from state machine
  const gamePhase = usePrimitiveStoreValue(
    useGameStateMachine,
    state => state.gamePhase,
    'day' // Default to day phase if we get a non-string value
  );
  
  const isTransitioning = usePrimitiveStoreValue(
    useGameStateMachine,
    state => state.isTransitioning,
    false
  );
  
  // FIXED: Function access with stable references
  const stateFunctions = useStableStoreValue(
    useGameStateMachine,
    state => ({
      beginDayCompletion: state.beginDayCompletion,
      beginNightCompletion: state.beginNightCompletion,
      finalizeDayTransition: state.finalizeDayTransition,
      finalizeNightTransition: state.finalizeNightTransition
    })
  );

  // Safely extract functions with fallbacks
  const { 
    beginDayCompletion = () => console.warn("beginDayCompletion not available"),
    beginNightCompletion = () => console.warn("beginNightCompletion not available"),
    finalizeDayTransition = () => console.warn("finalizeDayTransition not available"),
    finalizeNightTransition = () => console.warn("finalizeNightTransition not available")
  } = stateFunctions;

  // FIXED: Use direct primitive selectors for game store values
  const currentNodeId = usePrimitiveStoreValue(
    useGameStore,
    state => state.currentNodeId,
    null
  );
  
  const map = useStableStoreValue(
    useGameStore,
    state => state.map
  );
  
  const resetGame = useStableStoreValue(
    useGameStore,
    state => state.resetGame || (() => console.warn("resetGame not available"))
  );

  // Core systems initialization
  const { initialized } = useCoreInitialization();
  const [hasError, setHasError] = useState<string | null>(null);
  const componentMountedRef = useRef(true);

  // FIXED: Use the new game phase observer utility that's safe from recursion
  useGamePhaseObserver(
    useGameStateMachine,
    (newPhase, oldPhase) => {
      // Only log if values are different and valid strings
      if (newPhase !== oldPhase) {
        console.log(`[GameContainer] Phase transition: ${oldPhase || 'none'} -> ${newPhase || 'none'}`);
        
        // Perform side effects based on specific string values
        if (newPhase === 'transition_to_night') {
          // Prepare assets/state for night phase
          console.log('[GameContainer] Preparing night phase assets');
        } else if (newPhase === 'transition_to_day') {
          // Prepare assets/state for day phase
          console.log('[GameContainer] Preparing day phase assets');
        }
      }
    }
  );

  // Error handling for core system initialization
  useEffect(() => {
    if (!initialized && !componentMountedRef.current) {
       setHasError("Core systems failed to initialize.");
    }
  }, [initialized]);

  // Track component mount status
  useEffect(() => {
    componentMountedRef.current = true;
    return () => { componentMountedRef.current = false; };
  }, []);

  // Callbacks to trigger phase transitions initiated from child components
  const handleBeginNight = useCallback(() => {
      console.log("[GameContainer] handleBeginNight called");
      beginDayCompletion(); // Initiate the day completion process
  }, [beginDayCompletion]);

  const handleBeginDay = useCallback(() => {
      console.log("[GameContainer] handleBeginDay called");
      beginNightCompletion(); // Initiate the night completion process
  }, [beginNightCompletion]);

  // Effect to finalize transitions after visual duration
  // This replaces the complex timeout logic previously in GameStateMachine
  useEffect(() => {
    let finalizeTimer: NodeJS.Timeout | null = null;

    if (gamePhase === 'transition_to_night') {
      console.log("[GameContainer] Scheduling night finalization");
      finalizeTimer = setTimeout(() => {
        if (componentMountedRef.current) {
            console.log("[GameContainer] Finalizing night transition");
            finalizeNightTransition();
        }
      }, TRANSITION_VISUAL_DURATION);
    } else if (gamePhase === 'transition_to_day') {
      console.log("[GameContainer] Scheduling day finalization");
       finalizeTimer = setTimeout(() => {
         if (componentMountedRef.current) {
            console.log("[GameContainer] Finalizing day transition");
            finalizeDayTransition();
         }
      }, TRANSITION_VISUAL_DURATION);
    }

    // Cleanup timer on unmount or phase change
    return () => {
      if (finalizeTimer) {
        clearTimeout(finalizeTimer);
      }
    };
  }, [gamePhase, finalizeDayTransition, finalizeNightTransition]);

  // Subscribe to critical system errors
  useEventSubscription(
    GameEventType.ERROR_LOGGED,
    useCallback((event: any) => {
      if (event.payload?.component === 'statemachine' || event.payload?.component === 'initialization') {
        console.error(`[GameContainer] System error: ${event.payload?.message}`);
        setHasError(`System error: ${event.payload?.message}`);
      }
    }, [])
  );

  // Render logic based solely on gamePhase from useGameState
  const renderGameContent = () => {
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
    if (gamePhase === 'day') {
      return currentNodeId ? <ChallengeRouter /> : <SimplifiedKapoorMap />;
    }

    // Night phase content
    if (gamePhase === 'night') {
      // Pass handleBeginDay to trigger the start of the night completion process
      return <HillHomeScene onComplete={handleBeginDay} />;
    }

    // Transition states
    if (gamePhase === 'transition_to_day' || gamePhase === 'transition_to_night') {
      // Show dimmed versions of the previous scenes during transitions
      if (gamePhase === 'transition_to_night') {
        return <div style={{ opacity: 0.5 }}><SimplifiedKapoorMap /></div>;
      }
      if (gamePhase === 'transition_to_day') {
        return <div style={{ opacity: 0.5 }}><HillHomeScene onComplete={() => {}} /></div>;
      }
    }

    // Fallback for unexpected states
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center p-6 bg-gray-800 rounded-lg">
          <p className="text-lg">Unknown Game Phase: {gamePhase || 'undefined'}</p>
          <button 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            onClick={() => resetGame()}
          >
            Reset Game
          </button>
        </div>
      </div>
    );
  };

  return (
    <div 
      className="relative h-screen w-full bg-background flex flex-col" 
      data-game-container 
      data-phase={gamePhase}
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
          Phase: {gamePhase} | Node: {currentNodeId || 'none'} | Transitioning: {isTransitioning ? 'Yes' : 'No'}
        </div>
      )}
    </div>
  );
}