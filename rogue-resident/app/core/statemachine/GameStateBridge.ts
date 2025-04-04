// app/core/stateMachine/GameStateBridge.ts
/**
 * Game State Bridge - Connects legacy zustand store with new state machine
 * 
 * During migration, this module ensures that state changes in either system
 * properly propagate to the other, maintaining a consistent game state.
 */

import { useGameStore } from '../../store/gameStore';
import { useGameStateMachine, GameState, GamePhase } from './GameStateMachine';
import { GameEventType, changeGameState, changeGamePhase } from '../events/CentralEventBus';

/**
 * Initialize bidirectional state synchronization between systems
 */
export function initializeStateBridge() {
  // Get direct store references
  const gameStore = useGameStore.getState();
  const stateMachine = useGameStateMachine.getState();
  
  // 1. Subscribe to legacy store changes and propagate to state machine
  const unsubLegacy = useGameStore.subscribe(
    (state) => [state.gameState, state.gamePhase],
    ([gameState, gamePhase]) => {
      console.log(`[StateBridge] Legacy store changed: ${gameState}, ${gamePhase}`);
      
      // Map legacy states to new state machine states
      const mappedState = mapLegacyState(gameState as string);
      const mappedPhase = mapLegacyPhase(gamePhase as string);
      
      // Update state machine if different (prevents loops)
      if (mappedState && mappedState !== stateMachine.gameState) {
        stateMachine.transitionToState(mappedState, 'legacy_store_change');
      }
      
      if (mappedPhase && mappedPhase !== stateMachine.gamePhase) {
        stateMachine.transitionToPhase(mappedPhase, 'legacy_store_change');
      }
    }
  );
  
  // 2. Subscribe to state machine changes and propagate to legacy store
  const unsubMachine = useGameStateMachine.subscribe(
    (state) => [state.gameState, state.gamePhase],
    ([gameState, gamePhase]) => {
      console.log(`[StateBridge] State machine changed: ${gameState}, ${gamePhase}`);
      
      // Map state machine states to legacy states
      const mappedState = mapToLegacyState(gameState as GameState);
      const mappedPhase = mapToLegacyPhase(gamePhase as GamePhase);
      
      // Batch updates to legacy store to prevent circular updates
      const batchedUpdates = {};
      
      if (mappedState && mappedState !== gameStore.gameState) {
        batchedUpdates['gameState'] = mappedState;
      }
      
      if (mappedPhase && mappedPhase !== gameStore.gamePhase) {
        batchedUpdates['gamePhase'] = mappedPhase;
      }
      
      // Apply batched updates if any
      if (Object.keys(batchedUpdates).length > 0) {
        useGameStore.setState(batchedUpdates);
      }
    }
  );
  
  // Set up initial state sync (legacy to state machine)
  const initialState = useGameStore.getState();
  stateMachine.gameState = mapLegacyState(initialState.gameState) || 'not_started';
  stateMachine.gamePhase = mapLegacyPhase(initialState.gamePhase) || 'day';
  
  console.log('[StateBridge] State synchronization initialized');
  
  // Return cleanup function
  return () => {
    unsubLegacy();
    unsubMachine();
    console.log('[StateBridge] State synchronization removed');
  };
}

/**
 * Map legacy game states to state machine states
 */
function mapLegacyState(legacyState: string): GameState | null {
  switch (legacyState) {
    case 'not_started': return 'not_started';
    case 'in_progress': return 'in_progress';
    case 'game_over': return 'game_over';
    case 'victory': return 'victory';
    default: return null;
  }
}

/**
 * Map legacy game phases to state machine phases
 */
function mapLegacyPhase(legacyPhase: string): GamePhase | null {
  switch (legacyPhase) {
    case 'day': return 'day';
    case 'night': return 'night';
    case 'game_over': return 'day'; // Fallback
    case 'victory': return 'day'; // Fallback
    default: return null;
  }
}

/**
 * Map state machine states to legacy states
 */
function mapToLegacyState(machineState: GameState): string | null {
  switch (machineState) {
    case 'not_started': return 'not_started';
    case 'in_progress': return 'in_progress';
    case 'game_over': return 'game_over';
    case 'victory': return 'victory';
    default: return null;
  }
}

/**
 * Map state machine phases to legacy phases
 */
function mapToLegacyPhase(machinePhase: GamePhase): string | null {
  switch (machinePhase) {
    case 'day': return 'day';
    case 'night': return 'night';
    case 'transition_to_day': return 'day';
    case 'transition_to_night': return 'night';
    default: return null;
  }
}

/**
 * Initialize the bridge in the app root component
 */
export function setupStateBridge() {
  return initializeStateBridge();
}

export default {
  initializeStateBridge,
  setupStateBridge
};