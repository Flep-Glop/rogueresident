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

// Define legacy store state types for proper type safety
type LegacyGameState = 'not_started' | 'in_progress' | 'game_over' | 'victory';
type LegacyGamePhase = 'day' | 'night';

// Type for state mapping functions with proper enforcement
type StateMapper<From, To> = (state: From) => To;

/**
 * Initialize unidirectional state synchronization from state machine to store
 */
export function initializeStateBridge(): () => void {
  // Get direct store references with proper typing
  const gameStore = useGameStore.getState();
  const stateMachine = useGameStateMachine.getState();
  const eventBus = useEventBus.getState();
  
  // 1. Subscribe to state machine's game state changes with proper typing
  const unsubGameState = useGameStateMachine.subscribe<GameState>(
    state => state.gameState,
    (gameState: GameState) => {
      // Only update store if different (prevents loops)
      if (gameState !== gameStore.gameState) {
        console.log(`[StateBridge] Updating store gameState: ${gameState}`);
        useGameStore.setState({ gameState: mapToLegacyState(gameState) });
      }
    }
  );
  
  // 2. Subscribe to state machine's phase changes with proper typing
  const unsubGamePhase = useGameStateMachine.subscribe<GamePhase>(
    state => state.gamePhase,
    (gamePhase: GamePhase) => {
      // Only update store if different (prevents loops)
      if (gamePhase !== gameStore.gamePhase) {
        console.log(`[StateBridge] Updating store gamePhase: ${gamePhase}`);
        useGameStore.setState({ gamePhase: mapToLegacyPhase(gamePhase) });
      }
    }
  );
  
  // 3. Listen for state change events to handle side effects with proper typing
  const unsubStateChanges = eventBus.subscribe<StateChangePayload>(
    GameEventType.GAME_STATE_CHANGED,
    (event) => {
      const { from, to } = event.payload;
      
      // Cast strings to proper GameState types for type safety
      const fromState = from as GameState;
      const toState = to as GameState;
      
      // Handle special actions on state transitions
      if (fromState === 'in_progress' && toState === 'game_over') {
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
      else if (fromState === 'in_progress' && toState === 'victory') {
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
  
  // 4. Listen for phase change events to handle side effects with proper typing
  const unsubPhaseChanges = eventBus.subscribe<StateChangePayload>(
    GameEventType.GAME_PHASE_CHANGED,
    (event) => {
      const { from, to } = event.payload;
      
      // Cast strings to proper GamePhase types for type safety
      const fromPhase = from as GamePhase;
      const toPhase = to as GamePhase;
      
      // Handle special actions on phase transitions
      if (fromPhase === 'night' && toPhase === 'transition_to_day') {
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
 * @param machineState The state machine state to convert
 * @returns The equivalent legacy store state
 */
const mapToLegacyState: StateMapper<GameState, LegacyGameState> = (machineState) => {
  switch (machineState) {
    case 'not_started': return 'not_started';
    case 'in_progress': return 'in_progress';
    case 'game_over': return 'game_over';
    case 'victory': return 'victory';
    default: {
      // Type guard to ensure all cases are handled
      const exhaustiveCheck: never = machineState;
      // This will never execute due to the type guard, but provides a fallback
      console.error(`Unhandled state mapping: ${exhaustiveCheck}`);
      return 'not_started';
    }
  }
};

/**
 * Map state machine phases to legacy store phases
 * This maintains compatibility with existing code
 * @param machinePhase The state machine phase to convert
 * @returns The equivalent legacy store phase
 */
const mapToLegacyPhase: StateMapper<GamePhase, LegacyGamePhase> = (machinePhase) => {
  switch (machinePhase) {
    case 'day': return 'day';
    case 'night': return 'night';
    case 'transition_to_day': return 'day'; // Store doesn't track transitions
    case 'transition_to_night': return 'night'; // Store doesn't track transitions
    default: {
      // Type guard to ensure all cases are handled
      const exhaustiveCheck: never = machinePhase;
      // This will never execute due to the type guard, but provides a fallback
      console.error(`Unhandled phase mapping: ${exhaustiveCheck}`);
      return 'day';
    }
  }
};

/**
 * Initialize the bridge in the app root component
 */
export function setupStateBridge(): () => void {
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