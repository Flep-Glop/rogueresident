// app/core/statemachine/GameStateMachine.ts
/**
 * Simplified Game State Machine for Vertical Slice
 * 
 * Focused exclusively on the day/night cycle for the vertical slice.
 * This version maintains reliable transitions and validation while
 * removing states and complexity not needed for the core experience.
 * 
 * Key differences from original:
 * - Removed game_over and victory states
 * - Simplified phase transitions
 * - Reduced tracking to only what's needed for vertical slice
 * - Maintained core validation for critical transitions
 */

import { create } from 'zustand';
import { 
  GameEventType, 
  NodeCompletionPayload,
  UIEventPayload,
  StateChangePayload
} from '../events/EventTypes';
import { 
  useEventBus, 
  changeGameState, 
  changeGamePhase 
} from '../events/CentralEventBus';

// ======== State & Phase Definitions ========

// Simplified game states for vertical slice
export type GameState = 
  | 'not_started'  // Initial state, showing title screen
  | 'in_progress'; // Active gameplay

// Game phases focused on day/night cycle
export type GamePhase = 
  | 'day'                // Active gameplay at hospital
  | 'night'              // Knowledge constellation at home
  | 'transition_to_day'  // Visual transition animation 
  | 'transition_to_night'; // Visual transition animation

// ======== Valid Transition Definitions ========

// Define valid state transitions
const VALID_STATE_TRANSITIONS: Record<GameState, GameState[]> = {
  'not_started': ['in_progress'],
  'in_progress': ['not_started'] // Simplified to allow restart
};

// Define valid phase transitions
const VALID_PHASE_TRANSITIONS: Record<GamePhase, GamePhase[]> = {
  'day': ['transition_to_night'],
  'night': ['transition_to_day'],
  'transition_to_night': ['night'],
  'transition_to_day': ['day'],
};

// ======== State Machine Store ========

interface GameStateMachineState {
  // Current states
  gameState: GameState;
  gamePhase: GamePhase;
  
  // Transition flags
  isTransitioning: boolean;
  transitionData: {
    from: GamePhase;
    to: GamePhase;
    startTime: number;
    duration: number;
  } | null;
  
  // Progress tracking data for vertical slice
  completedNodeIds: string[];
  
  // State transition methods with validation
  transitionToState: (newState: GameState, reason?: string) => boolean;
  transitionToPhase: (newPhase: GamePhase, reason?: string) => boolean;
  
  // Core phase transition methods
  completeDay: () => boolean;
  completeNight: () => boolean;
  
  // Node completion tracking
  markNodeCompleted: (nodeId: string) => void;
  
  // Getter
  getCompletedNodeIds: () => string[];
}

export const useGameStateMachine = create<GameStateMachineState>((set, get) => ({
  // Initial state values
  gameState: 'not_started',
  gamePhase: 'day',
  isTransitioning: false,
  transitionData: null,
  completedNodeIds: [],
  
  /**
   * Transition to a new game state with validation
   * @param newState The target game state
   * @param reason Optional reason for the transition (for events/logging)
   * @returns true if transition was successful, false if invalid
   */
  transitionToState: (newState: GameState, reason?: string): boolean => {
    const currentState = get().gameState;
    
    // Validate transition
    if (!VALID_STATE_TRANSITIONS[currentState].includes(newState)) {
      console.error(`[StateMachine] Invalid state transition: ${currentState} -> ${newState}`);
      return false;
    }
    
    // If moving from not_started to in_progress, ensure phase is day
    if (currentState === 'not_started' && newState === 'in_progress') {
      set({ gamePhase: 'day' });
    }
    
    // Dispatch event before state change
    changeGameState(currentState, newState, reason);
    
    // Update state
    set({ gameState: newState });
    
    // Log state change
    console.log(`[StateMachine] Game state: ${currentState} -> ${newState}${reason ? ` (${reason})` : ''}`);
    
    return true;
  },
  
  /**
   * Transition to a new game phase with validation
   * @param newPhase The target game phase
   * @param reason Optional reason for the transition (for events/logging)
   * @returns true if transition was successful, false if invalid
   */
  transitionToPhase: (newPhase: GamePhase, reason?: string): boolean => {
    const currentPhase = get().gamePhase;
    
    // Validate transition
    if (!VALID_PHASE_TRANSITIONS[currentPhase].includes(newPhase)) {
      console.error(`[StateMachine] Invalid phase transition: ${currentPhase} -> ${newPhase}`);
      return false;
    }
    
    // Special case: transitions need to be tracked
    if (newPhase === 'transition_to_day' || newPhase === 'transition_to_night') {
      // Set transition data
      set({
        isTransitioning: true,
        transitionData: {
          from: currentPhase,
          to: newPhase === 'transition_to_day' ? 'day' : 'night',
          startTime: Date.now(),
          duration: 3000 // 3 seconds for transition animation
        }
      });
    } else {
      // Clear transition data when entering a non-transition phase
      set({
        isTransitioning: false,
        transitionData: null
      });
    }
    
    // Dispatch event before phase change
    changeGamePhase(currentPhase, newPhase, reason);
    
    // Update phase
    set({ gamePhase: newPhase });
    
    // Log phase change
    console.log(`[StateMachine] Game phase: ${currentPhase} -> ${newPhase}${reason ? ` (${reason})` : ''}`);
    
    return true;
  },
  
  /**
   * Complete the day phase, transitioning to night
   * @returns true if transition was triggered, false otherwise
   */
  completeDay: (): boolean => {
    const { transitionToPhase, gamePhase } = get();
    
    // Cannot complete if not in day phase
    if (gamePhase !== 'day') {
      console.warn(`[StateMachine] Cannot complete day: Not in day phase (current: ${gamePhase})`);
      return false;
    }
    
    // For vertical slice, always allow day completion if in day phase
    transitionToPhase('transition_to_night', 'day_complete');
    
    // Notify listening systems
    useEventBus.getState().dispatch(
      GameEventType.DAY_STARTED, 
      {
        completedNodeCount: get().completedNodeIds.length
      }
    );
    
    return true;
  },
  
  /**
   * Complete the night phase, transitioning to day
   * @returns true if transition was triggered, false otherwise
   */
  completeNight: (): boolean => {
    const { transitionToPhase, gamePhase } = get();
    
    // Cannot complete if not in night phase
    if (gamePhase !== 'night') {
      console.warn(`[StateMachine] Cannot complete night: Not in night phase (current: ${gamePhase})`);
      return false;
    }
    
    // Always allow night completion if in night phase
    transitionToPhase('transition_to_day', 'night_complete');
    
    // Notify listening systems
    useEventBus.getState().dispatch(
      GameEventType.NIGHT_STARTED, 
      {
        previousCompletedNodeCount: get().completedNodeIds.length
      }
    );
    
    // Reset completed nodes for new day
    set({ completedNodeIds: [] });
    
    return true;
  },
  
  /**
   * Mark a node as completed
   * @param nodeId The ID of the completed node
   */
  markNodeCompleted: (nodeId: string): void => {
    // Only add if not already in the list
    set(state => {
      if (state.completedNodeIds.includes(nodeId)) {
        return state;
      }
      
      return {
        completedNodeIds: [...state.completedNodeIds, nodeId]
      };
    });
    
    console.log(`[StateMachine] Node completed: ${nodeId}`);
  },
  
  // Getter
  getCompletedNodeIds: () => get().completedNodeIds
}));

// ======== Integration with Event System ========

/**
 * Connect state machine to event bus to handle specific events
 */
export function initializeStateMachine() {
  const { subscribe } = useEventBus.getState();
  const stateMachine = useGameStateMachine.getState();
  
  // Listen for node completions
  subscribe<NodeCompletionPayload>(GameEventType.NODE_COMPLETED, (event) => {
    const { nodeId } = event.payload;
    stateMachine.markNodeCompleted(nodeId);
  });
  
  // Listen for animation completions
  subscribe<UIEventPayload>(GameEventType.UI_BUTTON_CLICKED, (event) => {
    const { action, componentId } = event.payload;
    
    // Handle phase transition completion
    if (componentId === 'phaseTransition' && action === 'complete') {
      const { gamePhase, transitionToPhase } = stateMachine;
      
      // When transition_to_night animation completes, move to actual night phase
      if (gamePhase === 'transition_to_night') {
        transitionToPhase('night', 'transition_complete');
      }
      
      // When transition_to_day animation completes, move to actual day phase
      else if (gamePhase === 'transition_to_day') {
        transitionToPhase('day', 'transition_complete');
      }
    }
  });
  
  // Listen for completion requests
  subscribe<UIEventPayload>(GameEventType.UI_BUTTON_CLICKED, (event) => {
    const { action, componentId } = event.payload;
    
    // Handle day completion request
    if (componentId === 'dayCompleteButton' && action === 'click') {
      stateMachine.completeDay();
    }
    
    // Handle night completion request
    else if (componentId === 'nightCompleteButton' && action === 'click') {
      stateMachine.completeNight();
    }
  });
  
  console.log('[StateMachine] Initialized and connected to event bus');
}

// ======== React Hook for Components ========

/**
 * Custom hook for using state machine in React components
 * @returns Object containing current state, phase, and transition methods
 */
export function useGameState() {
  const gameState = useGameStateMachine(state => state.gameState);
  const gamePhase = useGameStateMachine(state => state.gamePhase);
  const isTransitioning = useGameStateMachine(state => state.isTransitioning);
  const transitionData = useGameStateMachine(state => state.transitionData);
  const completedNodeIds = useGameStateMachine(state => state.completedNodeIds);
  
  const transitionToState = useGameStateMachine(state => state.transitionToState);
  const transitionToPhase = useGameStateMachine(state => state.transitionToPhase);
  const completeDay = useGameStateMachine(state => state.completeDay);
  const completeNight = useGameStateMachine(state => state.completeNight);
  
  return {
    // Current state
    gameState,
    gamePhase,
    isTransitioning,
    transitionData,
    completedNodeIds,
    
    // Transition methods
    transitionToState,
    transitionToPhase,
    completeDay,
    completeNight,
    
    // Convenient derived properties
    isDay: gamePhase === 'day',
    isNight: gamePhase === 'night',
    isActive: gameState === 'in_progress'
  };
}

/**
 * Initialize the game state machine
 * Call this once at application startup to connect event systems
 */
export function setupGameStateMachine() {
  // Initialize connections between state machine and event bus
  initializeStateMachine();
  
  return {
    // Expose teardown if needed
    teardown: () => {
      console.log('[StateMachine] Teardown initiated');
    }
  };
}

export default {
  useGameStateMachine,
  useGameState,
  setupGameStateMachine,
  initializeStateMachine
};