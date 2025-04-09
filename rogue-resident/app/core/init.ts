import { useEffect, useState, useRef, useCallback } from 'react';

// --- Core System Imports ---
import useEventBus, { safeDispatch, type EventCallback } from './events/CentralEventBus';
// Import the actual class for type hinting the instance
import ActualCentralEventBus from './events/CentralEventBus';
import useGameStateMachine, { type GamePhase } from './statemachine/GameStateMachine'; // GameState type comes from types/game.ts
import { progressionResolver } from './progression/ProgressionResolver';
// ProgressionResolverState is internal, do not import
import useDialogueStateMachine from './dialogue/DialogueStateMachine';
// DialogueStateMachineState is internal, do not import
import ActionIntegration from './dialogue/ActionIntegration';
import type * as ActionIntegrationTypes from './dialogue/ActionIntegration';

// --- Store Imports ---
// Correct: Use named import for useGameStore
import { useGameStore } from '@/app/store/gameStore';
import { useKnowledgeStore } from '@/app/store/knowledgeStore';
import { useJournalStore } from '@/app/store/journalStore';
import { useResourceStore } from '@/app/store/resourceStore';

// --- Type Imports ---
// Import state slice types from the central types file
import type {
    CombinedState, // For typing selectors
    GameState,     // For state machine ref
    DialogueState, // For dialogue state machine ref
    EventBusState  // For event bus ref (contains the instance)
} from '@/app/types/game';
import type { GameEventType } from './events/EventTypes'; // Import event types if needed

// Type definition for the module object, including the optional 'hot' property for HMR
interface NodeModule {
  hot?: {
    accept(path?: string, callback?: () => void): void;
    dispose(callback: (data: any) => void): void;
  };
}

declare const module: NodeModule;

// Define types for refs using the state slice types
type ProgressionResolverInstanceType = typeof progressionResolver;
type ActionIntegrationModuleType = typeof ActionIntegration;

/**
 * Hook to initialize core game systems and handle HMR.
 */
export function useCoreInitialization() {
  const [initialized, setInitialized] = useState(false);
  // Correct: Add explicit type CombinedState for the selector state parameter
  const gameStoreReady = useGameStore((state: CombinedState) => !!state.initializeGame);

  // Refs to hold instances or state slices
  // Correct: Use EventBusState which contains the instance property
  const eventBusRef = useRef<EventBusState | null>(null);
  // Correct: Use GameState type from types/game.ts
  const stateMachineRef = useRef<GameState | null>(null);
  const progressionResolverRef = useRef<ProgressionResolverInstanceType | null>(null);
  // Correct: Use DialogueState type from types/game.ts
  const dialogueStateMachineRef = useRef<DialogueState | null>(null);
  const actionIntegrationRef = useRef<ActionIntegrationModuleType | null>(null);

  // Get necessary store actions using selectors for stability
  // Correct: Add explicit type CombinedState
  const initializeGameAction = useGameStore((state: CombinedState) => state.initializeGame);
  // Correct: Add explicit type for state (assuming KnowledgeState is defined in knowledgeStore internal types)
  const resetKnowledgeAction = useKnowledgeStore(state => state.resetKnowledge);
  // Correct: Remove selector for resetResourcesAction
  // const resetResourcesAction = useResourceStore(state => state.resetResources); // Incorrect

  // --- Initialization Logic ---
  const initializeSystems = useCallback(() => {
    if (initialized) {
      console.log("Core systems already initialized.");
      return;
    }
    console.log("Attempting core system initialization...");

    try {
      // 1. Get Event Bus state (which includes the instance)
      // Correct: Assign the state slice containing the instance
      eventBusRef.current = useEventBus.getState();
      console.log("Event Bus state referenced.", eventBusRef.current);
      // Can now access instance via eventBusRef.current.instance if needed

      // 2. Reference Action Integration module
      actionIntegrationRef.current = ActionIntegration;
      console.log("Action Integration module referenced.");

      // 3. Get Dialogue State Machine state slice
      // Correct: Assign the state slice
      dialogueStateMachineRef.current = useDialogueStateMachine.getState();
      console.log("Dialogue State Machine state referenced.");

      // 4. Get Game State Machine state slice
      // Correct: Assign the state slice
      stateMachineRef.current = useGameStateMachine.getState();
      console.log("Game State Machine state referenced.");

      // 5. Reference Progression Resolver instance
      progressionResolverRef.current = progressionResolver;
      console.log("Progression Resolver referenced.");

      // 6. Initialize Game Store Slice
      initializeGameAction({ startingMode: 'exploration' });
      console.log("Game Store slice initialized.");

      setInitialized(true);
      console.log("Core systems initialization complete.");

    } catch (error) {
      console.error("Error during core system initialization:", error);
      safeDispatch('SYSTEM_ERROR' as any, { component: 'useCoreInitialization', phase: 'initializeSystems', message: error instanceof Error ? error.message : String(error), error });
      setInitialized(false);
    }

  }, [initializeGameAction, initialized]);

  // --- Teardown Logic ---
  const teardownSystems = useCallback(() => {
    console.log("Tearing down core systems...");

    // Reset stores directly using getState()
    try {
      resetKnowledgeAction(); // This was already correct if resetKnowledge is an action
      console.log("Knowledge store reset.");
    } catch (e) { console.error("Error resetting knowledge store:", e); }

    try {
      // Correct: Call resetResources action via getState()
      useResourceStore.getState().resetResources();
      console.log("Resource store reset.");
    } catch (e) { console.error("Error resetting resource store:", e); }

    try {
        useJournalStore.persist.clearStorage();
        console.log("Journal store persistence cleared.");
    } catch (e) { console.error("Error clearing journal store persistence:", e); }

    // Clear refs
    eventBusRef.current = null;
    stateMachineRef.current = null;
    progressionResolverRef.current = null;
    dialogueStateMachineRef.current = null;
    actionIntegrationRef.current = null;

    setInitialized(false);
    console.log("Core systems teardown complete.");
  // Correct: Remove resetResourcesAction from dependencies as it's called via getState()
  }, [resetKnowledgeAction]);

  // --- Reinitialization Function ---
  const reinitialize = useCallback(() => {
    console.log("Reinitializing core systems...");
    teardownSystems();
    setTimeout(() => {
        initializeSystems();
    }, 50);
  }, [teardownSystems, initializeSystems]);

  // --- Effect for Initial Setup and HMR ---
  useEffect(() => {
    if (!initialized && gameStoreReady) {
       initializeSystems();
    }

    if (process.env.NODE_ENV === 'development' && module.hot) {
      console.log("Setting up HMR for core systems.");
      const coreModulePaths = [
          './events/CentralEventBus',
          './statemachine/GameStateMachine',
          './progression/ProgressionResolver',
          './dialogue/DialogueStateMachine',
          './dialogue/ActionIntegration',
          // Using relative paths from core/init.ts to stores
          '../store/gameStore',
          '../store/knowledgeStore',
          '../store/journalStore',
          '../store/resourceStore',
      ];

      coreModulePaths.forEach(path => {
          module.hot?.accept(path, () => {
              console.log(`HMR detected change in ${path}. Reinitializing core systems...`);
              reinitialize();
          });
      });

      module.hot.dispose((data: any) => {
         console.log("HMR disposing core systems.");
         teardownSystems();
      });
    }

  }, [initialized, gameStoreReady, initializeSystems, reinitialize, teardownSystems]);

  return { initialized, reinitialize };
}
