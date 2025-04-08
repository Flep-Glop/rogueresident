// app/core/statemachine/GameStateMachine.ts
/**
 * Simplified Game State Machine for Vertical Slice
 * 
 * Focused exclusively on the day/night cycle for the vertical slice.
 * This version maintains reliable transitions and validation while
 * removing states and complexity not needed for the core experience.
 * 
 * Key improvements in this update:
 * - Enhanced resilience for phase transitions
 * - Added direct validation to prevent stuck states
 * - Improved logging for better debugging
 * - Added better recovery mechanisms for failed transitions
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
  changeGamePhase,
  safeDispatch
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

// ======== Transition Validators ========

// Define valid state transitions
const VALID_STATE_TRANSITIONS: Record<GameState, GameState[]> = {
  'not_started': ['in_progress'],
  'in_progress': ['not_started'] // Simplified to allow restart
};

// Define valid phase transitions - VERY PERMISSIVE for robust recovery
const VALID_PHASE_TRANSITIONS: Record<GamePhase, GamePhase[]> = {
  'day': ['transition_to_night', 'night'], // Allow direct transition for recovery
  'night': ['transition_to_day', 'day'], // Allow direct transition for recovery
  'transition_to_night': ['night', 'day', 'transition_to_day'], // Allow any transition for recovery
  'transition_to_day': ['day', 'night', 'transition_to_night'], // Allow any transition for recovery
};

// ======== Transition Tracking ========

// Track transitions for debugging and recovery
interface TransitionRecord {
  from: GamePhase;
  to: GamePhase;
  timestamp: number;
  reason?: string;
  succeeded: boolean;
  emergency?: boolean;
}

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
  
  // Debugging and recovery
  transitionHistory: TransitionRecord[];
  stuckTransitionChecks: number;
  
  // Progress tracking data for vertical slice
  completedNodeIds: string[];
  currentDay: number;
  
  // State transition methods with validation
  transitionToState: (newState: GameState, reason?: string) => boolean;
  transitionToPhase: (newPhase: GamePhase, reason?: string) => boolean;
  
  // Core phase transition methods
  completeDay: () => boolean;
  completeNight: () => boolean;
  
  // Node completion tracking
  markNodeCompleted: (nodeId: string) => void;
  
  // System checks
  checkForStuckTransitions: () => boolean;
  
  // Getters
  getCompletedNodeIds: () => string[];
  getTransitionHistory: () => TransitionRecord[];
}

export const useGameStateMachine = create<GameStateMachineState>((set, get) => ({
  // Initial state values
  gameState: 'not_started',
  gamePhase: 'day',
  isTransitioning: false,
  transitionData: null,
  transitionHistory: [],
  stuckTransitionChecks: 0,
  completedNodeIds: [],
  currentDay: 1,
  
  /**
   * Transition to a new game state with validation
   * @param newState The target game state
   * @param reason Optional reason for the transition (for events/logging)
   * @returns true if transition was successful, false if invalid
   */
  transitionToState: (newState: GameState, reason?: string): boolean => {
    const currentState = get().gameState;
    
    // Skip if already in this state
    if (currentState === newState) {
      console.log(`[StateMachine] Already in ${newState} state, skipping transition`);
      return true;
    }
    
    // Validate transition
    const isValidTransition = VALID_STATE_TRANSITIONS[currentState].includes(newState);
    const isEmergencyReason = reason && (
      reason.includes('emergency') || 
      reason.includes('recovery') || 
      reason.includes('override')
    );
    
    if (!isValidTransition && !isEmergencyReason) {
      console.error(`[StateMachine] Invalid state transition: ${currentState} -> ${newState}`);
      return false;
    }
    
    // If moving from not_started to in_progress, ensure phase is day
    if (currentState === 'not_started' && newState === 'in_progress') {
      set({ gamePhase: 'day' });
    }
    
    // Dispatch event before state change
    try {
      changeGameState(currentState, newState, reason);
    } catch (error) {
      console.warn(`[StateMachine] Failed to dispatch state change event: ${error}`);
    }
    
    // Update state
    set({ gameState: newState });
    
    // Log state change
    console.log(`%c[StateMachine] Game state: ${currentState} -> ${newState}${reason ? ` (${reason})` : ''}`,
               'color: #4ade80; font-weight: bold');
    
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
    
    // If already in this phase, don't transition again
    if (currentPhase === newPhase) {
      console.log(`[StateMachine] Already in ${newPhase} phase, skipping transition`);
      return true;
    }
    
    // Special handling for stuck transitions - ultra permissive
    if (currentPhase.startsWith('transition_to_') && 
        (reason?.includes('emergency') || reason?.includes('override') || reason?.includes('recovery'))) {
      console.warn(`[StateMachine] Emergency transition from ${currentPhase} to ${newPhase}`);
      
      // Update phase - do this first for emergency cases
      set({ 
        gamePhase: newPhase, 
        isTransitioning: false,
        transitionData: null 
      });
      
      // Record emergency transition
      set(state => ({
        transitionHistory: [
          ...state.transitionHistory.slice(-19), // Keep last 20 entries
          {
            from: currentPhase,
            to: newPhase,
            timestamp: Date.now(),
            reason,
            succeeded: true,
            emergency: true
          }
        ]
      }));
      
      // Log the emergency transition
      console.log(`%c[StateMachine] EMERGENCY PHASE CHANGE: ${currentPhase} -> ${newPhase} (${reason})`,
                 'background: #f87171; color: white; padding: 2px 5px; border-radius: 3px');
      
      // Still try to dispatch the event for monitoring systems
      try {
        changeGamePhase(currentPhase, newPhase, reason);
      } catch (error) {
        console.error(`[StateMachine] Error dispatching emergency phase change: ${error}`);
      }
      
      return true;
    }
    
    // Standard validation for non-emergency transitions
    const isValidTransition = VALID_PHASE_TRANSITIONS[currentPhase].includes(newPhase);
    const isEmergencyOverride = reason && (
      reason.includes('emergency') || 
      reason.includes('recovery') || 
      reason.includes('override')
    );
    
    if (!isValidTransition && !isEmergencyOverride) {
      console.error(`[StateMachine] Invalid phase transition: ${currentPhase} -> ${newPhase}`);
      set(state => ({
        transitionHistory: [
          ...state.transitionHistory,
          {
            from: currentPhase,
            to: newPhase,
            timestamp: Date.now(),
            reason,
            succeeded: false
          }
        ]
      }));
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
    
    // Record transition attempt
    set(state => ({
      transitionHistory: [
        ...state.transitionHistory.slice(-19), // Keep last 20 entries
        {
          from: currentPhase,
          to: newPhase,
          timestamp: Date.now(),
          reason,
          succeeded: true,
          emergency: isEmergencyOverride
        }
      ]
    }));
    
    // Extra safety - log more details about important transitions
    if (newPhase === 'night' || newPhase === 'day') {
      console.log(`%c[StateMachine] CRITICAL TRANSITION: ${currentPhase} -> ${newPhase}${reason ? ` (${reason})` : ''}`,
                  'background: #2a0; color: white; padding: 2px 5px; border-radius: 3px');
    }
    
    // Dispatch event before phase change
    try {
      changeGamePhase(currentPhase, newPhase, reason);
    } catch (error) {
      console.warn(`[StateMachine] Failed to dispatch phase change event: ${error}`);
    }
    
    // Update phase - do this after everything else to ensure state is changed
    set({ gamePhase: newPhase });
    
    return true;
  },
  
  /**
   * Complete the day phase, transitioning to night
   * @returns true if transition was triggered, false otherwise
   */
  completeDay: (): boolean => {
    const { transitionToPhase, gamePhase, completedNodeIds } = get();
    
    // FIXED: If already transitioning to night or in night phase, consider it a success
    if (gamePhase === 'transition_to_night' || gamePhase === 'night') {
      console.log(`[StateMachine] Already transitioning to or in night phase (current: ${gamePhase})`);
      return true;
    }
    
    // Validate we have at least one completed node
    if (completedNodeIds.length === 0) {
      console.warn('[StateMachine] Cannot complete day without completing at least one node');
      
      // Log event for analytics but don't block
      try {
        safeDispatch(
          GameEventType.UI_BUTTON_CLICKED,
          {
            componentId: 'dayCompleteButton',
            action: 'failed',
            metadata: { 
              reason: 'no_completed_nodes',
              timestamp: Date.now()
            }
          },
          'gameStateMachine:completeDay'
        );
      } catch (error) {
        console.warn('[StateMachine] Event dispatch error:', error);
      }
    }
    
    // Emergency handling for transition phases
    if (gamePhase === 'transition_to_day') {
      console.warn(`[StateMachine] Emergency direct transition from ${gamePhase} to night`);
      const success = transitionToPhase('night', 'emergency_recovery');
      
      if (success) {
        try {
          safeDispatch(
            GameEventType.DAY_COMPLETED,
            {
              completedNodeCount: get().completedNodeIds.length,
              wasEmergencyTransition: true
            },
            'gameStateMachine:emergencyCompleteDay'
          );
        } catch (error) {
          console.error('[StateMachine] Error dispatching emergency DAY_COMPLETED event:', error);
        }
      }
      
      return success;
    }
    
    // For vertical slice, allow day completion if in day phase
    const success = transitionToPhase('transition_to_night', 'day_complete');
    
    // Notify listening systems
    if (success) {
      try {
        safeDispatch(
          GameEventType.DAY_COMPLETED,
          {
            completedNodeCount: get().completedNodeIds.length
          },
          'gameStateMachine:completeDay'
        );
      } catch (error) {
        console.error('[StateMachine] Error dispatching DAY_COMPLETED event:', error);
      }
    }
    
    return success;
  },
  
  /**
   * Complete the night phase, transitioning to day
   * @returns true if transition was triggered, false otherwise
   */
  completeNight: (): boolean => {
    const { transitionToPhase, gamePhase, currentDay } = get();
    
    // FIXED: If already transitioning to day or in day phase, consider it a success
    if (gamePhase === 'transition_to_day' || gamePhase === 'day') {
      console.log(`[StateMachine] Already transitioning to or in day phase (current: ${gamePhase})`);
      return true;
    }
    
    // Emergency handling
    if (gamePhase === 'transition_to_night') {
      console.warn(`[StateMachine] Emergency direct transition from ${gamePhase} to day`);
      const success = transitionToPhase('day', 'emergency_recovery');
      
      if (success) {
        try {
          safeDispatch(
            GameEventType.NIGHT_COMPLETED,
            {
              previousCompletedNodeCount: get().completedNodeIds.length,
              wasEmergencyTransition: true
            },
            'gameStateMachine:emergencyCompleteNight'
          );
          
          // Reset completed nodes and increment day for new day
          set({ 
            completedNodeIds: [],
            currentDay: currentDay + 1
          });
        } catch (error) {
          console.error('[StateMachine] Error dispatching emergency NIGHT_COMPLETED event:', error);
        }
      }
      
      return success;
    }
    
    // Always allow night completion if in night phase
    const success = transitionToPhase('transition_to_day', 'night_complete');
    
    // Notify listening systems
    if (success) {
      try {
        safeDispatch(
          GameEventType.NIGHT_COMPLETED,
          {
            previousCompletedNodeCount: get().completedNodeIds.length
          },
          'gameStateMachine:completeNight'
        );
      }
      catch (error) {
        console.error('[StateMachine] Error dispatching NIGHT_COMPLETED event:', error);
      }
      
      // Reset completed nodes and increment day for new day
      set({ 
        completedNodeIds: [],
        currentDay: currentDay + 1
      });
    }
    
    return success;
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
  
  /**
   * Check for and recover from stuck transitions
   * @returns true if recovery was attempted, false otherwise
   */
  checkForStuckTransitions: (): boolean => {
    const { gamePhase, transitionToPhase, transitionData } = get();
    
    // Only check for transition phases
    if (!gamePhase.startsWith('transition_to_')) {
      return false;
    }
    
    // Check if we've been in transition too long
    if (transitionData && Date.now() - transitionData.startTime > transitionData.duration * 2) {
      console.warn(`[StateMachine] Detected stuck transition: ${gamePhase}`);
      
      // Force appropriate phase
      const targetPhase = gamePhase === 'transition_to_night' ? 'night' : 'day';
      const success = transitionToPhase(targetPhase, 'stuck_transition_recovery');
      
      // Increment stuck transition counter
      set(state => ({
        stuckTransitionChecks: state.stuckTransitionChecks + 1
      }));
      
      return success;
    }
    
    return false;
  },
  
  // Getters
  getCompletedNodeIds: () => get().completedNodeIds,
  getTransitionHistory: () => get().transitionHistory
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
  
  // Set up periodic transition state validation
  const checkIntervalId = setInterval(() => {
    stateMachine.checkForStuckTransitions();
  }, 3000); // Check every 3 seconds
  
  // Check for stuck transitions on startup
  setTimeout(() => {
    const { gamePhase, transitionToPhase } = stateMachine;
    
    // If we're in a transition phase on startup, we might be stuck
    if (gamePhase === 'transition_to_night' || gamePhase === 'transition_to_day') {
      console.warn('[StateMachine] Detected potential stuck transition on startup:', gamePhase);
      
      // Force direct transition to target phase
      const targetPhase = gamePhase === 'transition_to_night' ? 'night' : 'day';
      transitionToPhase(targetPhase, 'startup_recovery');
    }
  }, 1000);
  
  // Return cleanup function for the interval
  return {
    cleanupInterval: () => {
      clearInterval(checkIntervalId);
    }
  };
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
  const currentDay = useGameStateMachine(state => state.currentDay);
  
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
    currentDay,
    
    // Transition methods
    transitionToState,
    transitionToPhase,
    completeDay,
    completeNight,
    
    // Convenient derived properties
    isDay: gamePhase === 'day',
    isNight: gamePhase === 'night',
    isActive: gameState === 'in_progress',
  };
}

/**
 * Initialize the game state machine
 * Call this once at application startup to connect event systems
 */
export function setupGameStateMachine() {
  // Initialize connections between state machine and event bus
  const { cleanupInterval } = initializeStateMachine();
  
  return {
    // Expose teardown if needed
    teardown: () => {
      console.log('[StateMachine] Teardown initiated');
      cleanupInterval();
    }
  };
}

// Expose debug methods to window when in development
if (typeof window !== 'undefined') {
  (window as any).__GAME_STATE_MACHINE_DEBUG__ = {
    getCurrentState: () => useGameStateMachine.getState(),
    getTransitionHistory: () => useGameStateMachine.getState().transitionHistory,
    forceTransition: (phase: GamePhase, reason = 'debug_override') => {
      return useGameStateMachine.getState().transitionToPhase(phase, reason);
    },
    checkForStuckTransitions: () => useGameStateMachine.getState().checkForStuckTransitions(),
    repairAllSystems: () => {
      const stateMachine = useGameStateMachine.getState();
      const { gamePhase } = stateMachine;
      
      // Force appropriate phase if in transition
      if (gamePhase.startsWith('transition_to_')) {
        const targetPhase = gamePhase === 'transition_to_night' ? 'night' : 'day';
        return stateMachine.transitionToPhase(targetPhase, 'manual_debug_repair');
      }
      return false;
    }
  };
}

export default {
  useGameStateMachine,
  useGameState,
  setupGameStateMachine,
  initializeStateMachine
};