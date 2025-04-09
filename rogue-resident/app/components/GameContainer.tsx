// app/components/GameContainer.tsx
// Refactored GameContainer to rely on state machine events/state
'use client';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useGameStore } from '@/app/store/gameStore';
import { useGameState } from '@/app/core/statemachine/GameStateMachine';
import { useEventBus, useEventSubscription } from '@/app/core/events/CentralEventBus'; // Import hook
import { GameEventType } from '@/app/core/events/EventTypes';
import { useCoreInitialization } from '@/app/core/init'; // Corrected path
import SimplifiedKapoorMap from './map/SimplifiedKapoorMap';
import HillHomeScene from './HillHomeScene';
import PlayerStats from './PlayerStats';
import VerticalSliceDebugPanel from './debug/VerticalSliceDebugPanel';
import ChallengeRouter from './challenges/ChallengeRouter';
import DayNightTransition from './DayNightTransition'; // Import the presentation component

// Constants for transition visual timing
const TRANSITION_VISUAL_DURATION = 800; // Duration for the fade effect (ms)

export default function GameContainer() {
  const {
    gamePhase,
    isTransitioning, // Get transition status directly
    beginDayCompletion, // Use new methods to start transitions
    beginNightCompletion, // Use new methods to start transitions
    finalizeDayTransition, // New methods to complete transitions
    finalizeNightTransition, // New methods to complete transitions
  } = useGameState();

  const { currentNodeId, map, resetGame } = useGameStore();
  const { initialized } = useCoreInitialization(); // Only need initialized status
  const [hasError, setHasError] = useState<string | null>(null);
  const componentMountedRef = useRef(true);

  // Simplified error handling
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
      // The state machine now handles setting the transition phase
  }, [beginDayCompletion]);

  const handleBeginDay = useCallback(() => {
      console.log("[GameContainer] handleBeginDay called");
      beginNightCompletion(); // Initiate the night completion process
      // The state machine now handles setting the transition phase
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


  // Render logic based solely on gamePhase from useGameState
  const renderGameContent = () => {
    if (!initialized) {
      return <div className="h-full w-full flex items-center justify-center">Initializing...</div>;
    }
    if (hasError) {
      return <div className="h-full w-full flex items-center justify-center text-red-500">Error: {hasError}</div>;
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

    // Fallback for unexpected states (or keep transition visuals here if DayNightTransition is simple overlay)
    // If DayNightTransition handles visuals, this might just return null or the previous scene briefly.
    if (gamePhase === 'transition_to_day' || gamePhase === 'transition_to_night') {
       // Optionally show the previous scene dimmed or just rely on the overlay
        if (gamePhase === 'transition_to_night') {
             // Show map dimmed during transition to night
             return <div style={{ opacity: 0.5 }}><SimplifiedKapoorMap /></div>;
        }
         if (gamePhase === 'transition_to_day') {
             // Show hill home dimmed during transition to day
             return <div style={{ opacity: 0.5 }}><HillHomeScene onComplete={() => {}} /></div>; // Dummy onComplete
         }
    }


    return <div className="h-full w-full flex items-center justify-center">Unknown State</div>;
  };

  return (
    <div className="relative h-screen w-full bg-background flex flex-col" data-game-container data-phase={gamePhase}>
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

      <VerticalSliceDebugPanel />

      {/* Simplified Debug Info */}
      {process.env.NODE_ENV !== 'production' && (
        <div className="fixed bottom-0 left-0 bg-black/80 text-white p-2 text-xs z-50">
          Phase: {gamePhase} | Node: {currentNodeId || 'none'} | Transitioning: {isTransitioning ? 'Yes' : 'No'}
        </div>
      )}
    </div>
  );
}