// app/core/statemachine/GameStateMachine.ts
/**
 * Optimized Game State Machine
 *
 * Improvements:
 * 1. More reliable transition management
 * 2. Reduced event dispatching
 * 3. Better timeout handling
 * 4. Simplified logging
 * 5. Enhanced recovery mechanisms
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
  safeDispatch
} from '../events/CentralEventBus';

// ======== TYPE DEFINITIONS ========

export type GameState =
  | 'not_started'
  | 'in_progress';

export type GamePhase =
  | 'day'
  | 'night'
  | 'transition_to_day'
  | 'transition_to_night';

// ======== TRANSITION VALIDATORS ========

// Define valid state transitions
const VALID_STATE_TRANSITIONS: Record<GameState, GameState[]> = {
  'not_started': ['in_progress'],
  'in_progress': ['not_started']
};

// Define valid phase transitions (more restrictive, recovery handled separately)
const VALID_PHASE_TRANSITIONS: Record<GamePhase, GamePhase[]> = {
  'day': ['transition_to_night'],
  'night': ['transition_to_day'],
  'transition_to_night': ['night'], // Only allow completing the transition
  'transition_to_day': ['day'],     // Only allow completing the transition
};

// ======== CONFIGURATION ========

// Transition recovery settings
const TRANSITION_TIMEOUT_MS = 5000; // 5 seconds
const MAX_TRANSITION_HISTORY = 20; // Keep only last 20 transitions
const IS_DEV = process.env.NODE_ENV !== 'production';

// ======== TRANSITION TRACKING ========

interface TransitionRecord {
  from: GamePhase;
  to: GamePhase;
  timestamp: number;
  reason?: string;
  succeeded: boolean;
  emergency?: boolean;
}

// ======== STATE MACHINE INTERFACE ========

interface GameStateMachineState {
  // Core state properties
  gameState: GameState;
  gamePhase: GamePhase;
  isTransitioning: boolean;
  transitionHistory: TransitionRecord[];
  stuckTransitionChecks: number;
  completedNodeIds: string[];
  currentDay: number;
  
  // Time tracking for transitions
  transitionStartTime: number | null;
  
  // State transition methods
  transitionToState: (newState: GameState, reason?: string) => boolean;
  transitionToPhase: (newPhase: GamePhase, reason?: string) => boolean;
  
  // Phase transition methods
  beginDayCompletion: () => boolean;
  beginNightCompletion: () => boolean;
  finalizeDayTransition: () => void;
  finalizeNightTransition: () => void;
  
  // Node completion tracking
  markNodeCompleted: (nodeId: string) => void;
  
  // Recovery and utility methods
  checkForStuckTransitions: () => boolean;
  resetState: (preserveMeta?: boolean) => void;
  
  // Getters for external access
  getCompletedNodeIds: () => string[];
  getTransitionHistory: () => TransitionRecord[];
}

// ======== STATE MACHINE IMPLEMENTATION ========

export const useGameStateMachine = create<GameStateMachineState>((set, get) => {
  // Transition timeout reference (module-scoped for cleanup)
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
    transitionTimeout = null; // Clear reference after handling
  };
  
  // Helper to record transitions
  const recordTransition = (
    from: GamePhase, 
    to: GamePhase, 
    reason: string | undefined, 
    succeeded: boolean, 
    emergency = false
  ) => {
    set(state => ({
      transitionHistory: [
        ...state.transitionHistory.slice(-(MAX_TRANSITION_HISTORY - 1)), 
        { from, to, timestamp: Date.now(), reason, succeeded, emergency }
      ],
      // Record start time for transitions
      transitionStartTime: to.startsWith('transition_to_') ? Date.now() : null
    }));
  };
  
  // Helper to log transitions with reduced noise
  const logTransition = (type: 'state' | 'phase', from: string, to: string, reason?: string, emergency = false) => {
    // Only log in development or for emergency recovery
    if (IS_DEV || emergency) {
      const colorStyle = emergency ? 'color: #f87171; font-weight: bold' : 'color: #fbbf24; font-weight: bold';
      console.log(
        `%c[StateMachine] Game ${type}: ${from} -> ${to}${reason ? ` (${reason})` : ''}`,
        colorStyle
      );
    }
  };

  return {
    // Initial state values
    gameState: 'not_started',
    gamePhase: 'day',
    isTransitioning: false,
    transitionHistory: [],
    stuckTransitionChecks: 0,
    completedNodeIds: [],
    currentDay: 1,
    transitionStartTime: null,

    // =========================
    // STATE TRANSITION METHODS
    // =========================
    
    /**
     * Transition to a new game state with validation
     */
    transitionToState: (newState: GameState, reason?: string): boolean => {
      const currentState = get().gameState;
      if (currentState === newState) return true; // Already in this state
      
      // Check if transition is valid
      const isValid = VALID_STATE_TRANSITIONS[currentState]?.includes(newState);
      const isEmergency = reason?.includes('emergency') || reason?.includes('recovery');
      
      // Log warning and return if invalid (unless emergency)
      if (!isValid && !isEmergency) {
        console.error(`[StateMachine] Invalid state transition: ${currentState} -> ${newState}`);
        return false;
      }
      
      // Handle special case for game start
      if (currentState === 'not_started' && newState === 'in_progress') {
        set({ gamePhase: 'day' }); // Ensure starting in day phase
      }
      
      // Log transition
      logTransition('state', currentState, newState, reason, isEmergency);
      
      // Update state
      set({ gameState: newState });
      
      // Dispatch event (only once)
      safeDispatch(
        GameEventType.GAME_STATE_CHANGED, 
        { from: currentState, to: newState, reason }, 
        'gameStateMachine'
      );
      
      return true;
    },
    
    /**
     * Transition to a new game phase with validation
     */
    transitionToPhase: (newPhase: GamePhase, reason?: string): boolean => {
      const currentPhase = get().gamePhase;
      if (currentPhase === newPhase) return true; // Already in this phase
      
      // Check if transition is valid
      const isValid = VALID_PHASE_TRANSITIONS[currentPhase]?.includes(newPhase);
      const isEmergency = reason?.includes('emergency') || 
                          reason?.includes('recovery') || 
                          reason?.includes('timeout');
      
      // Log warning and return if invalid (unless emergency)
      if (!isValid && !isEmergency) {
        console.error(`[StateMachine] Invalid phase transition: ${currentPhase} -> ${newPhase}`);
        recordTransition(currentPhase, newPhase, reason, false);
        return false;
      }
      
      // Clear existing timeout
      clearTransitionTimeout();
      
      // Determine if starting or completing a transition
      const isStartingTransition = newPhase.startsWith('transition_to_');
      const isCompletingTransition = !isStartingTransition && currentPhase.startsWith('transition_to_');
      
      // Log transition
      logTransition('phase', currentPhase, newPhase, reason, isEmergency);
      
      // Update state
      set({ 
        gamePhase: newPhase, 
        isTransitioning: isStartingTransition 
      });
      
      // Record transition in history
      recordTransition(currentPhase, newPhase, reason, true, isEmergency);
      
      // Dispatch phase change event
      safeDispatch(
        GameEventType.GAME_PHASE_CHANGED,
        { from: currentPhase, to: newPhase, reason },
        'gameStateMachine'
      );
      
      // Set specific event for start/end of transitions
      if (isStartingTransition) {
        if (newPhase === 'transition_to_night') {
          safeDispatch(GameEventType.TRANSITION_TO_NIGHT_STARTED, {}, 'gameStateMachine');
        } else if (newPhase === 'transition_to_day') {
          safeDispatch(GameEventType.TRANSITION_TO_DAY_STARTED, {}, 'gameStateMachine');
        }
        
        // Set recovery timeout
        transitionTimeout = setTimeout(handleTransitionTimeout, TRANSITION_TIMEOUT_MS);
      } else if (isCompletingTransition) {
        if (newPhase === 'night') {
          safeDispatch(GameEventType.TRANSITION_TO_NIGHT_COMPLETED, {}, 'gameStateMachine');
        } else if (newPhase === 'day') {
          safeDispatch(GameEventType.TRANSITION_TO_DAY_COMPLETED, {}, 'gameStateMachine');
        }
      }
      
      return true;
    },
    
    // ===============================
    // PHASE TRANSITION IMPLEMENTATION
    // ===============================
    
    /**
     * Step 1: Begin day completion process
     * Initiates transition from day to night
     */
    beginDayCompletion: (): boolean => {
      const { gamePhase, isTransitioning } = get();
      
      // Validate current state
      if (gamePhase !== 'day') {
        console.warn(`[StateMachine] Cannot complete day from phase: ${gamePhase}`);
        return false;
      }
      
      // Block if already transitioning
      if (isTransitioning) {
        console.warn(`[StateMachine] Already in transition, cannot start another`);
        return false;
      }
      
      // Initiate the transition to night
      const success = get().transitionToPhase('transition_to_night', 'day_complete');
      
      // Only emit event if transition started successfully
      if (success) {
        safeDispatch(GameEventType.DAY_COMPLETED, { 
          completedNodeCount: get().completedNodeIds.length 
        }, 'gameStateMachine');
      }
      
      return success;
    },
    
    /**
     * Step 2: Finalize night transition
     * Called after animation/delay to complete the transition
     */
    finalizeNightTransition: (): void => {
      const { gamePhase, isTransitioning } = get();
      
      // Validate current state
      if (gamePhase !== 'transition_to_night') {
        console.warn(`[StateMachine] Cannot finalize night transition from phase: ${gamePhase}`);
        
        // Attempt recovery if stuck
        if (gamePhase !== 'night' && isTransitioning) {
          get().transitionToPhase('night', 'finalize_recovery');
        }
        return;
      }
      
      // Complete the transition to night
      get().transitionToPhase('night', 'transition_finalize');
      
      // No need to emit DAY_COMPLETED again - already emitted in beginDayCompletion
    },
    
    /**
     * Step 1: Begin night completion process
     * Initiates transition from night to day
     */
    beginNightCompletion: (): boolean => {
      const { gamePhase, isTransitioning, currentDay } = get();
      
      // Validate current state
      if (gamePhase !== 'night') {
        console.warn(`[StateMachine] Cannot complete night from phase: ${gamePhase}`);
        return false;
      }
      
      // Block if already transitioning
      if (isTransitioning) {
        console.warn(`[StateMachine] Already in transition, cannot start another`);
        return false;
      }
      
      // Reset completed nodes and increment day counter
      set({
        completedNodeIds: [],
        currentDay: currentDay + 1
      });
      
      // Initiate the transition to day
      const success = get().transitionToPhase('transition_to_day', 'night_complete');
      
      // Only emit event if transition started successfully
      if (success) {
        safeDispatch(GameEventType.NIGHT_COMPLETED, { 
          newDay: currentDay + 1 
        }, 'gameStateMachine');
      }
      
      return success;
    },
    
    /**
     * Step 2: Finalize day transition
     * Called after animation/delay to complete the transition
     */
    finalizeDayTransition: (): void => {
      const { gamePhase, isTransitioning } = get();
      
      // Validate current state
      if (gamePhase !== 'transition_to_day') {
        console.warn(`[StateMachine] Cannot finalize day transition from phase: ${gamePhase}`);
        
        // Attempt recovery if stuck
        if (gamePhase !== 'day' && isTransitioning) {
          get().transitionToPhase('day', 'finalize_recovery');
        }
        return;
      }
      
      // Complete the transition to day
      get().transitionToPhase('day', 'transition_finalize');
      
      // No need to emit NIGHT_COMPLETED again - already emitted in beginNightCompletion
    },
    
    // ============================
    // NODE TRACKING IMPLEMENTATION
    // ============================
    
    /**
     * Mark a node as completed
     */
    markNodeCompleted: (nodeId: string): void => {
      set(state => {
        // Check if already completed to prevent duplicates
        if (state.completedNodeIds.includes(nodeId)) {
          return state; // No change
        }
        
        // Add to completed nodes
        if (IS_DEV) {
          console.log(`[StateMachine] Node completed: ${nodeId}`);
        }
        
        return { 
          completedNodeIds: [...state.completedNodeIds, nodeId] 
        };
      });
    },
    
    // ============================
    // RECOVERY AND UTILITY METHODS
    // ============================
    
    /**
     * Check for and fix stuck transitions
     */
    checkForStuckTransitions: (): boolean => {
      const { gamePhase, isTransitioning, transitionStartTime } = get();
      
      // Increment check counter
      set(state => ({ 
        stuckTransitionChecks: state.stuckTransitionChecks + 1 
      }));
      
      // Case 1: We're marked as transitioning but not in a transition phase
      if (isTransitioning && !gamePhase.startsWith('transition_to_')) {
        console.warn(`[StateMachine] Inconsistency found: isTransitioning=true but phase=${gamePhase}`);
        set({ isTransitioning: false });
        clearTransitionTimeout();
        return true; // Recovery action taken
      }
      
      // Case 2: We have an active timeout but not in a transition state
      if (transitionTimeout && !isTransitioning) {
        console.warn(`[StateMachine] Active timeout found but not in transition`);
        clearTransitionTimeout();
        return true; // Recovery action taken
      }
      
      // Case 3: We've been in a transition state too long
      if (isTransitioning && transitionStartTime) {
        const transitionDuration = Date.now() - transitionStartTime;
        if (transitionDuration > TRANSITION_TIMEOUT_MS * 1.5) {
          console.warn(`[StateMachine] Transition stuck for ${transitionDuration}ms`);
          
          if (gamePhase === 'transition_to_night') {
            get().transitionToPhase('night', 'stuck_recovery');
            return true; // Recovery action taken
          } else if (gamePhase === 'transition_to_day') {
            get().transitionToPhase('day', 'stuck_recovery');
            return true; // Recovery action taken
          }
        }
      }
      
      return false; // No recovery needed
    },
    
    /**
     * Reset state, optionally preserving meta-progression like day count
     */
    resetState: (preserveMeta = false) => {
      if (IS_DEV) {
        console.log(`[StateMachine] Resetting state ${preserveMeta ? 'preserving meta' : ''}`);
      }
      
      // Clear any pending timeouts
      clearTransitionTimeout();
      
      // Preserve meta state if requested
      const metaState = preserveMeta ? { currentDay: get().currentDay } : { currentDay: 1 };
      
      // Reset to initial state
      set({
        gameState: 'not_started',
        gamePhase: 'day',
        isTransitioning: false,
        transitionHistory: [],
        stuckTransitionChecks: 0,
        completedNodeIds: [],
        transitionStartTime: null,
        ...metaState
      });
      
      // Emit reset event
      safeDispatch(
        GameEventType.GAME_STATE_CHANGED, 
        { from: get().gameState, to: 'not_started', reason: 'reset' }, 
        'gameStateMachine'
      );
    },
    
    // ===============
    // GETTER METHODS
    // ===============
    
    getCompletedNodeIds: () => get().completedNodeIds,
    getTransitionHistory: () => get().transitionHistory,
  };
});

// ======== EVENT SYSTEM INTEGRATION ========

/**
 * Initialize the state machine and connect to event system
 */
export function initializeStateMachine() {
  const { subscribe } = useEventBus.getState();
  const stateMachine = useGameStateMachine.getState();
  
  // Connect node completion events to state machine
  subscribe<NodeCompletionPayload>(GameEventType.NODE_COMPLETED, (event) => {
    stateMachine.markNodeCompleted(event.payload.nodeId);
  });
  
  if (IS_DEV) {
    console.log('[StateMachine] Initialized and connected to event bus');
  }
  
  // Set up periodic stuck transition checks
  const checkIntervalId = setInterval(() => {
    stateMachine.checkForStuckTransitions();
  }, 5000); // Check every 5s
  
  return {
    cleanupInterval: () => clearInterval(checkIntervalId),
    teardown: () => clearInterval(checkIntervalId)
  };
}

// ======== REACT INTEGRATION ========

/**
 * React hook for accessing game state
 */
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
    finalizeDayTransition: s.finalizeDayTransition,
    finalizeNightTransition: s.finalizeNightTransition,
  }));
  
  // Add derived properties for convenience
  return {
    ...state,
    isDay: state.gamePhase === 'day',
    isNight: state.gamePhase === 'night',
    isActive: state.gameState === 'in_progress',
  };
}

// ======== SETUP FUNCTION ========

/**
 * Set up the game state machine
 */
export function setupGameStateMachine() {
  return initializeStateMachine();
}

// ======== DEBUG INTEGRATION ========

// Add debugging tools to window object in development
if (typeof window !== 'undefined' && IS_DEV) {
  window.__GAME_STATE_MACHINE_DEBUG__ = {
    getCurrentState: () => useGameStateMachine.getState(),
    getTransitionHistory: () => useGameStateMachine.getState().transitionHistory,
    forcePhase: (phase: GamePhase, reason = 'debug_override') => {
      return useGameStateMachine.getState().transitionToPhase(phase, reason);
    },
    forceState: (state: GameState, reason = 'debug_override') => {
      return useGameStateMachine.getState().transitionToState(state, reason);
    },
    checkStuck: () => useGameStateMachine.getState().checkForStuckTransitions(),
    reset: (preserveMeta = false) => useGameStateMachine.getState().resetState(preserveMeta),
    triggerRecovery: () => {
      const state = useGameStateMachine.getState();
      if (state.isTransitioning) {
        if (state.gamePhase === 'transition_to_night') {
          state.finalizeNightTransition();
          return 'Forced night transition completion';
        } else if (state.gamePhase === 'transition_to_day') {
          state.finalizeDayTransition();
          return 'Forced day transition completion';
        }
      }
      return 'No active transition to recover';
    }
  };
}

// ======== ADAPTER CLASS ========

/**
 * Class adapter for legacy code compatibility
 */
export class GameStateMachine {
  private _eventBus: any;
  
  constructor(eventBusInstance: any) {
    this._eventBus = eventBusInstance;
    
    // Initialize the state machine if needed
    const stateMachine = useGameStateMachine.getState();
    if (stateMachine.gameState === 'not_started') {
      // Start with default state
      stateMachine.transitionToState('in_progress', 'initialization');
    }
    
    if (IS_DEV) {
      console.log('[GameStateMachine] Class adapter initialized');
    }
  }
  
  // Proxy methods to the store
  beginDayCompletion(): boolean {
    return useGameStateMachine.getState().beginDayCompletion();
  }
  
  beginNightCompletion(): boolean {
    return useGameStateMachine.getState().beginNightCompletion();
  }
  
  finalizeDayTransition(): void {
    useGameStateMachine.getState().finalizeDayTransition();
  }
  
  finalizeNightTransition(): void {
    useGameStateMachine.getState().finalizeNightTransition();
  }
  
  transitionToState(state: GameState, reason?: string): boolean {
    return useGameStateMachine.getState().transitionToState(state, reason);
  }
  
  transitionToPhase(phase: GamePhase, reason?: string): boolean {
    return useGameStateMachine.getState().transitionToPhase(phase, reason);
  }
  
  getCurrentState(): {gameState: GameState, gamePhase: GamePhase} {
    const state = useGameStateMachine.getState();
    return {
      gameState: state.gameState,
      gamePhase: state.gamePhase
    };
  }
  
  getCompletedNodeIds(): string[] {
    return useGameStateMachine.getState().getCompletedNodeIds();
  }
  
  markNodeCompleted(nodeId: string): void {
    useGameStateMachine.getState().markNodeCompleted(nodeId);
  }
  
  resetState(preserveMeta: boolean = false): void {
    useGameStateMachine.getState().resetState(preserveMeta);
  }
}

export default useGameStateMachine;