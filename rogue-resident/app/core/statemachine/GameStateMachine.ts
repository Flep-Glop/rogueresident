// app/core/statemachine/GameStateMachine.ts
/**
 * Game State Machine - Formalized state transitions for Rogue Resident
 * 
 * This state machine provides reliable, controlled transitions between game states
 * and phases while ensuring appropriate side effects occur consistently. It ensures:
 * 
 * 1. Only valid state transitions are permitted
 * 2. Appropriate visual transitions occur between states
 * 3. Event dispatching for state changes is centralized
 * 4. Game progression flows predictably
 * 
 * Inspired by state management systems in roguelikes like Hades and Pyre where
 * state consistency is critical for preventing progression blockers.
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

// Top-level game states
export type GameState = 
  | 'not_started'  // Initial state, showing title screen
  | 'in_progress'  // Active gameplay
  | 'game_over'    // Player has lost
  | 'victory';     // Player has won

// Game phase within the in_progress state
export type GamePhase = 
  | 'day'                // Active gameplay at hospital
  | 'night'              // Knowledge constellation at home
  | 'transition_to_day'  // Visual transition animation 
  | 'transition_to_night'; // Visual transition animation

// ======== Valid Transition Definitions ========

// Define valid state transitions
const VALID_STATE_TRANSITIONS: Record<GameState, GameState[]> = {
  'not_started': ['in_progress'],
  'in_progress': ['game_over', 'victory'],
  'game_over': ['not_started', 'in_progress'],
  'victory': ['not_started', 'in_progress'],
};

// Define valid phase transitions
const VALID_PHASE_TRANSITIONS: Record<GamePhase, GamePhase[]> = {
  'day': ['transition_to_night', 'game_over', 'victory'],
  'night': ['transition_to_day'],
  'transition_to_night': ['night'],
  'transition_to_day': ['day'],
};

// ======== State Machine Store ========

interface GameStateMachineState {
  // Current states
  gameState: GameState;
  gamePhase: GamePhase;
  
  // Day tracking
  currentDay: number;
  
  // Transition flags
  isTransitioning: boolean;
  transitionData: {
    from: GamePhase;
    to: GamePhase;
    startTime: number;
    duration: number;
  } | null;
  
  // Progress tracking data
  completedNodeIds: string[];
  bossDefeated: boolean;
  
  // State transition methods with validation
  transitionToState: (newState: GameState, reason?: string) => boolean;
  transitionToPhase: (newPhase: GamePhase, reason?: string) => boolean;
  
  // Complex transitions with side effects
  completeDay: () => boolean;
  completeNight: () => boolean;
  completeBoss: () => boolean;
  
  // Helper methods
  isDayComplete: () => boolean;
  markNodeCompleted: (nodeId: string) => void;
  advanceDay: () => void;
  
  // Non-state related getters
  getCompletedNodeIds: () => string[];
  getCurrentDay: () => number;
}

export const useGameStateMachine = create<GameStateMachineState>((set, get) => ({
  // Initial state values
  gameState: 'not_started',
  gamePhase: 'day',
  currentDay: 1,
  isTransitioning: false,
  transitionData: null,
  completedNodeIds: [],
  bossDefeated: false,
  
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
      console.error(`Invalid state transition: ${currentState} -> ${newState}`);
      return false;
    }
    
    // If moving from not_started to in_progress, ensure phase is day
    if (currentState === 'not_started' && newState === 'in_progress') {
      set({ gamePhase: 'day' });
    }
    
    // Dispatch event before state change to allow systems to prepare
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
      console.error(`Invalid phase transition: ${currentPhase} -> ${newPhase}`);
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
          duration: 4000 // 4 seconds - match PhaseTransition.tsx animation
        }
      });
    } else {
      // Clear transition data when entering a non-transition phase
      set({
        isTransitioning: false,
        transitionData: null
      });
    }
    
    // Dispatch event before phase change to allow systems to prepare
    changeGamePhase(currentPhase, newPhase, reason);
    
    // Update phase
    set({ gamePhase: newPhase });
    
    // Log phase change
    console.log(`[StateMachine] Game phase: ${currentPhase} -> ${newPhase}${reason ? ` (${reason})` : ''}`);
    
    return true;
  },
  
  /**
   * Complete the day phase, transitioning to night if conditions are met
   * @returns true if transition was triggered, false otherwise
   */
  completeDay: (): boolean => {
    const { transitionToPhase, transitionToState, gameState, isDayComplete, bossDefeated } = get();
    
    // Cannot complete if not in day phase
    if (get().gamePhase !== 'day') {
      console.warn(`Cannot complete day: Not in day phase (current: ${get().gamePhase})`);
      return false;
    }
    
    // Check if boss is defeated
    if (bossDefeated) {
      // Boss defeated - transition to victory
      transitionToState('victory', 'boss_defeated');
      return true;
    }
    
    // Check if day is complete (enough nodes completed)
    if (isDayComplete()) {
      // Day complete - transition to night via transition animation
      transitionToPhase('transition_to_night', 'day_complete');
      
      // Notify listening systems
      useEventBus.getState().dispatch(
        GameEventType.DAY_STARTED, 
        {
          day: get().currentDay,
          completedNodeCount: get().completedNodeIds.length
        }
      );
      
      return true;
    } else {
      console.warn('Cannot complete day: Conditions not met');
      return false;
    }
  },
  
  /**
   * Complete the night phase, transitioning to the next day
   * @returns true if transition was triggered, false otherwise
   */
  completeNight: (): boolean => {
    const { transitionToPhase, advanceDay } = get();
    
    // Cannot complete if not in night phase
    if (get().gamePhase !== 'night') {
      console.warn(`Cannot complete night: Not in night phase (current: ${get().gamePhase})`);
      return false;
    }
    
    // Advance to next day
    advanceDay();
    
    // Transition to day via transition animation
    transitionToPhase('transition_to_day', 'night_complete');
    
    // Notify listening systems
    useEventBus.getState().dispatch(
      GameEventType.NIGHT_STARTED, 
      {
        day: get().currentDay,
        previousCompletedNodeCount: get().completedNodeIds.length
      }
    );
    
    // Reset completed nodes for new day
    set({ completedNodeIds: [] });
    
    return true;
  },
  
  /**
   * Mark the boss as defeated, triggering victory state
   * @returns true if successful, false otherwise
   */
  completeBoss: (): boolean => {
    // Mark boss as defeated
    set({ bossDefeated: true });
    
    // Notify systems
    useEventBus.getState().dispatch(
      GameEventType.BOSS_DEFEATED, 
      {
        day: get().currentDay
      }
    );
    
    return true;
  },
  
  /**
   * Check if the day phase should be considered complete
   * @returns true if conditions are met to end the day
   */
  isDayComplete: (): boolean => {
    const { completedNodeIds, bossDefeated } = get();
    
    // If boss is defeated, day is complete
    if (bossDefeated) return true;
    
    // For prototype: Day is complete if player has finished at least 3 nodes
    return completedNodeIds.length >= 3;
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
    
    // Check if this is a boss node
    if (nodeId.includes('boss') || nodeId.includes('ionix')) {
      get().completeBoss();
    }
  },
  
  /**
   * Advance to the next day
   */
  advanceDay: (): void => {
    set(state => ({
      currentDay: state.currentDay + 1
    }));
    
    console.log(`[StateMachine] Advanced to day ${get().currentDay}`);
  },
  
  // Getters
  getCompletedNodeIds: () => get().completedNodeIds,
  getCurrentDay: () => get().currentDay
}));

// ======== Integration with Event System ========

/**
 * Connect state machine to event bus to handle specific events
 * This creates the connections between UI actions and state transitions
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
  const currentDay = useGameStateMachine(state => state.currentDay);
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
    currentDay,
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
    isGameOver: gameState === 'game_over',
    isVictory: gameState === 'victory',
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
      // Any cleanup needed
    }
  };
}

// Export interfaces and utilities
export default {
  useGameStateMachine,
  useGameState,
  setupGameStateMachine,
  initializeStateMachine
};