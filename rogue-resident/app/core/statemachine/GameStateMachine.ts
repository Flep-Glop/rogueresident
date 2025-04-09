// app/core/statemachine/GameStateMachine.ts
/**
 * Refactored Game State Machine for Vertical Slice
 *
 * Centralizes game state (gameState, gamePhase) and transition logic.
 * Removes direct setTimeout for transitions, relying on events.
 * Integrates basic recovery for stuck transitions.
 */

import { create } from 'zustand';
import {
  GameEventType,
  NodeCompletionPayload,
  StateChangePayload,
  RecoveryEventPayload
} from '../events/EventTypes';
import {
  useEventBus,
  changeGameState,
  changeGamePhase,
  safeDispatch
} from '../events/CentralEventBus';

// ======== State & Phase Definitions ========

export type GameState =
  | 'not_started'
  | 'in_progress';

export type GamePhase =
  | 'day'
  | 'night'
  | 'transition_to_day'
  | 'transition_to_night';

// ======== Transition Validators ========

const VALID_STATE_TRANSITIONS: Record<GameState, GameState[]> = {
  'not_started': ['in_progress'],
  'in_progress': ['not_started']
};

// More restrictive phase transitions, recovery handled separately
const VALID_PHASE_TRANSITIONS: Record<GamePhase, GamePhase[]> = {
  'day': ['transition_to_night'],
  'night': ['transition_to_day'],
  'transition_to_night': ['night'], // Only allow completing the transition
  'transition_to_day': ['day'],     // Only allow completing the transition
};

// ======== Transition Tracking ========

interface TransitionRecord {
  from: GamePhase;
  to: GamePhase;
  timestamp: number;
  reason?: string;
  succeeded: boolean;
  emergency?: boolean;
}

// Timeout duration for transition recovery
const TRANSITION_TIMEOUT_MS = 5000; // 5 seconds

// ======== State Machine Store ========

interface GameStateMachineState {
  gameState: GameState;
  gamePhase: GamePhase;
  isTransitioning: boolean; // True during transition_to_* phases
  transitionHistory: TransitionRecord[];
  stuckTransitionChecks: number;
  completedNodeIds: string[]; // Moved from gameStore
  currentDay: number;       // Moved from gameStore

  // Methods
  transitionToState: (newState: GameState, reason?: string) => boolean;
  transitionToPhase: (newPhase: GamePhase, reason?: string) => boolean;
  beginDayCompletion: () => boolean;
  beginNightCompletion: () => boolean;
  finalizeDayTransition: () => void; // Called by animation/timer completion
  finalizeNightTransition: () => void; // Called by animation/timer completion
  markNodeCompleted: (nodeId: string) => void;
  checkForStuckTransitions: () => boolean;
  resetState: (preserveMeta?: boolean) => void; // Added for resetting

  // Getters
  getCompletedNodeIds: () => string[];
  getTransitionHistory: () => TransitionRecord[];
}

export const useGameStateMachine = create<GameStateMachineState>((set, get) => {
  let transitionTimeout: NodeJS.Timeout | null = null;

  // Helper to clear the transition timeout
  const clearTransitionTimeout = () => {
    if (transitionTimeout) {
      clearTimeout(transitionTimeout);
      transitionTimeout = null;
    }
  };

  // Helper to handle transition timeout recovery
  const handleTransitionTimeout = () => {
    const { gamePhase, transitionToPhase } = get();
    console.warn(`[StateMachine] Transition timeout detected! Current phase: ${gamePhase}`);
    
    if (gamePhase === 'transition_to_night') {
      transitionToPhase('night', 'timeout_recovery');
    } else if (gamePhase === 'transition_to_day') {
      transitionToPhase('day', 'timeout_recovery');
    }
    transitionTimeout = null; // Clear ref after handling
  };

  // Helper to record transitions
  const recordTransition = (from: GamePhase, to: GamePhase, reason: string | undefined, succeeded: boolean, emergency = false) => {
     set(state => ({
        transitionHistory: [
          ...state.transitionHistory.slice(-19), // Keep last 20 entries
          { from, to, timestamp: Date.now(), reason, succeeded, emergency }
        ]
      }));
  };

  return {
    // Initial state values
    gameState: 'not_started',
    gamePhase: 'day',
    isTransitioning: false,
    transitionHistory: [],
    stuckTransitionChecks: 0,
    completedNodeIds: [], // Centralized state
    currentDay: 1,       // Centralized state

    transitionToState: (newState: GameState, reason?: string): boolean => {
      const currentState = get().gameState;
      if (currentState === newState) return true;

      const isValid = VALID_STATE_TRANSITIONS[currentState]?.includes(newState);
      const isEmergency = reason?.includes('emergency') || reason?.includes('recovery');

      if (!isValid && !isEmergency) {
        console.error(`[StateMachine] Invalid state transition: ${currentState} -> ${newState}`);
        return false;
      }

      if (currentState === 'not_started' && newState === 'in_progress') {
        set({ gamePhase: 'day' }); // Ensure starting in day phase
      }

      try { changeGameState(currentState, newState, reason); } catch (e) { console.warn(e); }
      set({ gameState: newState });
      console.log(`%c[StateMachine] Game state: ${currentState} -> ${newState}${reason ? ` (${reason})` : ''}`, 'color: #4ade80; font-weight: bold');
      return true;
    },

    transitionToPhase: (newPhase: GamePhase, reason?: string): boolean => {
      const currentPhase = get().gamePhase;
      if (currentPhase === newPhase) return true;

      const isValid = VALID_PHASE_TRANSITIONS[currentPhase]?.includes(newPhase);
      const isEmergency = reason?.includes('emergency') || reason?.includes('recovery') || reason?.includes('timeout');

      if (!isValid && !isEmergency) {
        console.error(`[StateMachine] Invalid phase transition: ${currentPhase} -> ${newPhase}`);
        recordTransition(currentPhase, newPhase, reason, false);
        return false;
      }

      // Clear any existing timeout when a transition starts or completes
      clearTransitionTimeout();

      const isStartingTransition = newPhase.startsWith('transition_to_');
      const isCompletingTransition = !isStartingTransition && currentPhase.startsWith('transition_to_');

      set({ gamePhase: newPhase, isTransitioning: isStartingTransition });
      recordTransition(currentPhase, newPhase, reason, true, isEmergency);
      try { changeGamePhase(currentPhase, newPhase, reason); } catch (e) { console.warn(e); }

      console.log(`%c[StateMachine] Game phase: ${currentPhase} -> ${newPhase}${reason ? ` (${reason})` : ''}`,
                 `color: ${isEmergency ? '#f87171' : '#fbbf24'}; font-weight: bold`);

      // If starting a transition, set a recovery timeout
      if (isStartingTransition) {
        transitionTimeout = setTimeout(handleTransitionTimeout, TRANSITION_TIMEOUT_MS);
      }

      return true;
    },

    // Step 1: Begin the day completion process
    beginDayCompletion: (): boolean => {
      const { gamePhase } = get();
      if (gamePhase !== 'day') {
        console.warn(`[StateMachine] Cannot complete day from phase: ${gamePhase}`);
        return false;
      }
      // TODO: Add validation logic here if needed (e.g., check required nodes completed)
      
      // Initiate the transition to night
      return get().transitionToPhase('transition_to_night', 'day_complete');
      // The UI should react to 'transition_to_night' phase to show animation
    },
    
    // Step 2: Finalize the transition to night (called after animation/delay)
    finalizeNightTransition: (): void => {
        const { gamePhase } = get();
        if (gamePhase !== 'transition_to_night') {
            console.warn(`[StateMachine] Cannot finalize night transition from phase: ${gamePhase}`);
            // Attempt recovery if stuck
            if (gamePhase !== 'night') {
                get().transitionToPhase('night', 'finalize_recovery');
            }
            return;
        }
        get().transitionToPhase('night', 'transition_finalize');
        try {
           safeDispatch(GameEventType.DAY_COMPLETED, { completedNodeCount: get().completedNodeIds.length }, 'gameStateMachine');
        } catch (e) { console.error(e); }
    },

    // Step 1: Begin the night completion process
    beginNightCompletion: (): boolean => {
      const { gamePhase } = get();
      if (gamePhase !== 'night') {
        console.warn(`[StateMachine] Cannot complete night from phase: ${gamePhase}`);
        return false;
      }
      // TODO: Add validation logic here if needed (e.g., knowledge transfer)

      // Reset completed nodes for the new day & increment day counter
      set(state => ({
        completedNodeIds: [],
        currentDay: state.currentDay + 1
      }));

      // Initiate the transition to day
      return get().transitionToPhase('transition_to_day', 'night_complete');
      // The UI should react to 'transition_to_day' phase to show animation
    },
    
    // Step 2: Finalize the transition to day (called after animation/delay)
    finalizeDayTransition: (): void => {
        const { gamePhase } = get();
        if (gamePhase !== 'transition_to_day') {
            console.warn(`[StateMachine] Cannot finalize day transition from phase: ${gamePhase}`);
            // Attempt recovery if stuck
            if (gamePhase !== 'day') {
                get().transitionToPhase('day', 'finalize_recovery');
            }
            return;
        }
        get().transitionToPhase('day', 'transition_finalize');
         try {
           safeDispatch(GameEventType.NIGHT_COMPLETED, { }, 'gameStateMachine');
        } catch (e) { console.error(e); }
    },

    markNodeCompleted: (nodeId: string): void => {
      set(state => {
        if (state.completedNodeIds.includes(nodeId)) {
          return state; // Already completed
        }
        console.log(`[StateMachine] Node completed: ${nodeId}`);
        return { completedNodeIds: [...state.completedNodeIds, nodeId] };
      });
    },

    checkForStuckTransitions: (): boolean => {
      const { gamePhase, isTransitioning } = get();
      set(state => ({ stuckTransitionChecks: state.stuckTransitionChecks + 1 }));

      if (isTransitioning && !gamePhase.startsWith('transition_to_')) {
         console.warn(`[StateMachine] Stuck Check: Inconsistency found! isTransitioning is true but phase is ${gamePhase}. Resetting isTransitioning.`);
         set({ isTransitioning: false });
         clearTransitionTimeout(); // Clear timeout as we are no longer transitioning
         return true; // Recovery action taken
      }
      // If a timeout is active but we are NOT in a transition phase, clear it.
      if (transitionTimeout && !isTransitioning) {
        console.warn(`[StateMachine] Stuck Check: Active timeout found but not in transition phase. Clearing timeout.`);
        clearTransitionTimeout();
      }

      return false; // No recovery needed based on this check
    },

    // Reset state, optionally preserving meta-progression like day count
    resetState: (preserveMeta = false) => {
      console.log(`[StateMachine] Resetting state ${preserveMeta ? 'preserving meta' : ''}`);
      clearTransitionTimeout(); // Clear any pending timeouts
      const metaState = preserveMeta ? { currentDay: get().currentDay } : { currentDay: 1 };
      set({
        gameState: 'not_started',
        gamePhase: 'day',
        isTransitioning: false,
        transitionHistory: [],
        stuckTransitionChecks: 0,
        completedNodeIds: [],
        ...metaState
      });
       // Optionally trigger a state reset event
       safeDispatch(GameEventType.GAME_STATE_CHANGED, { from: get().gameState, to: 'not_started', reason: 'reset' }, 'gameStateMachine');
    },

    // Getters
    getCompletedNodeIds: () => get().completedNodeIds,
    getTransitionHistory: () => get().transitionHistory,
  };
});

// ======== Integration with Event System ========

export function initializeStateMachine() {
  const { subscribe } = useEventBus.getState();
  const stateMachine = useGameStateMachine.getState();

  subscribe<NodeCompletionPayload>(GameEventType.NODE_COMPLETED, (event) => {
    stateMachine.markNodeCompleted(event.payload.nodeId);
  });

  // Remove listeners for UI events that finalize transitions - logic moved to GameContainer

  console.log('[StateMachine] Initialized and connected to event bus');

  const checkIntervalId = setInterval(stateMachine.checkForStuckTransitions, 5000); // Check every 5s

  return {
    cleanupInterval: () => clearInterval(checkIntervalId),
    teardown: () => clearInterval(checkIntervalId) // Ensure cleanup on full teardown
  };
}

// ======== React Hook ========

export function useGameState() {
  const state = useGameStateMachine(s => ({
    gameState: s.gameState,
    gamePhase: s.gamePhase,
    isTransitioning: s.isTransitioning,
    completedNodeIds: s.completedNodeIds,
    currentDay: s.currentDay,
    transitionToState: s.transitionToState,
    beginDayCompletion: s.beginDayCompletion,
    beginNightCompletion: s.beginNightCompletion,
    finalizeDayTransition: s.finalizeDayTransition, // Expose finalizers
    finalizeNightTransition: s.finalizeNightTransition, // Expose finalizers
  }));

  return {
    ...state,
    isDay: state.gamePhase === 'day',
    isNight: state.gamePhase === 'night',
    isActive: state.gameState === 'in_progress',
  };
}

// ======== Setup Function ========

export function setupGameStateMachine() {
  return initializeStateMachine();
}

// ======== Debug Exposure ========
if (typeof window !== 'undefined') {
  (window as any).__GAME_STATE_MACHINE_DEBUG__ = {
    getCurrentState: () => useGameStateMachine.getState(),
    getTransitionHistory: () => useGameStateMachine.getState().transitionHistory,
    forcePhase: (phase: GamePhase, reason = 'debug_override') => {
      return useGameStateMachine.getState().transitionToPhase(phase, reason);
    },
    forceState: (state: GameState, reason = 'debug_override') => {
       return useGameStateMachine.getState().transitionToState(state, reason);
    },
    checkStuck: () => useGameStateMachine.getState().checkForStuckTransitions(),
    reset: (preserveMeta = false) => useGameStateMachine.getState().resetState(preserveMeta)
  };
}

export default useGameStateMachine;