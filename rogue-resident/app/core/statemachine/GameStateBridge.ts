// app/core/statemachine/GameStateBridge.ts
/**
 * Game State Bridge - Connects state machine with data store
 * 
 * This module ensures unidirectional data flow between the authoritative 
 * state machine and the Zustand store that persists game data.
 * 
 * Rather than allowing bidirectional synchronization (which creates circular
 * dependencies and race conditions), this bridge establishes the state machine
 * as the true source of state transitions while the store serves as the
 * persistent data layer.
 */

import { useGameStore } from '../../store/gameStore';
import { useGameStateMachine, GameState, GamePhase } from './GameStateMachine';
import { GameEventType, StateChangePayload } from '../events/EventTypes';
import { useEventBus } from '../events/CentralEventBus';

/**
 * Initialize unidirectional state synchronization from state machine to store
 */
export function initializeStateBridge() {
  // Get direct store references
  const gameStore = useGameStore.getState();
  const stateMachine = useGameStateMachine.getState();
  const eventBus = useEventBus.getState();
  
  // 1. Subscribe to state machine's game state changes
  const unsubGameState = useGameStateMachine.subscribe(
    state => state.gameState,
    (gameState) => {
      // Only update store if different (prevents loops)
      if (gameState !== gameStore.gameState) {
        console.log(`[StateBridge] Updating store gameState: ${gameState}`);
        useGameStore.setState({ gameState: mapToLegacyState(gameState) });
      }
    }
  );
  
  // 2. Subscribe to state machine's phase changes
  const unsubGamePhase = useGameStateMachine.subscribe(
    state => state.gamePhase,
    (gamePhase) => {
      // Only update store if different (prevents loops)
      if (gamePhase !== gameStore.gamePhase) {
        console.log(`[StateBridge] Updating store gamePhase: ${gamePhase}`);
        useGameStore.setState({ gamePhase: mapToLegacyPhase(gamePhase) });
      }
    }
  );
  
  // 3. Listen for state change events to handle side effects
  const unsubStateChanges = eventBus.subscribe<StateChangePayload>(
    GameEventType.GAME_STATE_CHANGED,
    (event) => {
      const { from, to } = event.payload;
      
      // Handle special actions on state transitions
      if (from === 'in_progress' && to === 'game_over') {
        // Mark current run as completed (but not successful)
        if (gameStore.currentRun) {
          // Update run data - without calling direct update methods
          // This avoids circular dependencies
          useGameStore.setState((state) => {
            if (!state.currentRun) return {};
            
            return {
              currentRun: {
                ...state.currentRun,
                completed: true
              }
            };
          });
        }
      }
      else if (from === 'in_progress' && to === 'victory') {
        // Mark current run as completed and successful
        if (gameStore.currentRun) {
          useGameStore.setState((state) => {
            if (!state.currentRun) return {};
            
            return {
              currentRun: {
                ...state.currentRun,
                completed: true,
                successful: true,
                score: state.player.insight
              }
            };
          });
        }
      }
    }
  );
  
  // 4. Listen for phase change events to handle side effects
  const unsubPhaseChanges = eventBus.subscribe<StateChangePayload>(
    GameEventType.GAME_PHASE_CHANGED,
    (event) => {
      const { from, to } = event.payload;
      
      // Handle special actions on phase transitions
      if (from === 'night' && to === 'transition_to_day') {
        // Increment day counter in store
        useGameStore.setState((state) => ({
          currentDay: state.currentDay + 1
        }));
        
        // Update run data
        if (gameStore.currentRun) {
          useGameStore.setState((state) => {
            if (!state.currentRun) return {};
            
            return {
              currentRun: {
                ...state.currentRun,
                dayCount: state.currentDay
              }
            };
          });
        }
      }
    }
  );
  
  // Set up initial one-way sync (state machine → store)
  // This ensures the store reflects the state machine's initial state
  if (stateMachine.gameState !== gameStore.gameState) {
    useGameStore.setState({ 
      gameState: mapToLegacyState(stateMachine.gameState)
    });
  }
  
  if (stateMachine.gamePhase !== gameStore.gamePhase) {
    useGameStore.setState({ 
      gamePhase: mapToLegacyPhase(stateMachine.gamePhase)
    });
  }
  
  console.log('[StateBridge] One-way state synchronization initialized');
  
  // Return cleanup function to remove subscriptions
  return () => {
    unsubGameState();
    unsubGamePhase();
    unsubStateChanges();
    unsubPhaseChanges();
    console.log('[StateBridge] State synchronization removed');
  };
}

/**
 * Map state machine states to legacy store states
 * This maintains compatibility with existing code
 */
function mapToLegacyState(machineState: GameState): string {
  switch (machineState) {
    case 'not_started': return 'not_started';
    case 'in_progress': return 'in_progress';
    case 'game_over': return 'game_over';
    case 'victory': return 'victory';
    default: return 'not_started'; // Fallback
  }
}

/**
 * Map state machine phases to legacy store phases
 * This maintains compatibility with existing code
 */
function mapToLegacyPhase(machinePhase: GamePhase): string {
  switch (machinePhase) {
    case 'day': return 'day';
    case 'night': return 'night';
    case 'transition_to_day': return 'day'; // Store doesn't track transitions
    case 'transition_to_night': return 'night'; // Store doesn't track transitions
    default: return 'day'; // Fallback
  }
}

/**
 * Initialize the bridge in the app root component
 */
export function setupStateBridge() {
  const cleanupFn = initializeStateBridge();
  
  // Subscribe to session end to clean up
  const unsubscribe = useEventBus.getState().subscribe(
    GameEventType.SESSION_ENDED,
    () => {
      cleanupFn();
      unsubscribe();
    }
  );
  
  return cleanupFn;
}

export default {
  initializeStateBridge,
  setupStateBridge
};