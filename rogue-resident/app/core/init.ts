// app/core/init.ts
import { useEffect, useState, useRef, useCallback } from 'react';

// --- Core System Imports ---
// Import both the singleton instance and store hook for the Event Bus
import CentralEventBus, { useEventBus, safeDispatch, type EventCallback } from './events/CentralEventBus';
import useGameStateMachine, { type GamePhase } from './statemachine/GameStateMachine';
import { progressionResolver } from './progression/ProgressionResolver';
// Import both the singleton instance and store hook for DialogueStateMachine
import DialogueStateMachine, { useDialogueStateMachine } from './dialogue/DialogueStateMachine';
import ActionIntegration from './dialogue/ActionIntegration';
import type * as ActionIntegrationTypes from './dialogue/ActionIntegration';

// --- Store Imports ---
import { useGameStore } from '@/app/store/gameStore';
import { useKnowledgeStore } from '@/app/store/knowledgeStore';
import { useJournalStore } from '@/app/store/journalStore';
import { useResourceStore } from '@/app/store/resourceStore';

// --- Type Imports ---
import type {
    CombinedState,
    GameState,
    DialogueState,
    EventBusState
} from '@/app/types/game';
import type { GameEventType } from './events/EventTypes';

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
type CentralEventBusInstanceType = typeof CentralEventBus;
type DialogueStateMachineInstanceType = typeof DialogueStateMachine;

// Initialization state tracking - prevent double initialization
let initializationInProgress = false;

/**
 * Hook to initialize core game systems and handle HMR.
 */
export function useCoreInitialization() {
  const [initialized, setInitialized] = useState(false);
  const gameStoreReady = useGameStore((state: CombinedState) => !!state.initializeGame);

  // Refs to hold instances
  const eventBusRef = useRef<CentralEventBusInstanceType | null>(null);
  const eventBusStoreRef = useRef<EventBusState | null>(null);
  const dialogueStateMachineRef = useRef<DialogueStateMachineInstanceType | null>(null);
  const dialogueStoreRef = useRef<DialogueState | null>(null);
  const stateMachineRef = useRef<GameState | null>(null);
  const progressionResolverRef = useRef<ProgressionResolverInstanceType | null>(null);
  const actionIntegrationRef = useRef<ActionIntegrationModuleType | null>(null);

  // Get necessary store actions
  const initializeGameAction = useGameStore((state: CombinedState) => state.initializeGame);
  const resetKnowledgeAction = useKnowledgeStore(state => state.resetKnowledge);

  // --- Initialization Logic ---
  const initializeSystems = useCallback(() => {
    // Prevent double initialization with enhanced logging
    if (initializationInProgress) {
      console.log("%cInitialization already in progress, skipping...", "color: orange");
      return;
    }
    
    if (initialized) {
      console.log("%cCore systems already initialized.", "color: green");
      return;
    }
    
    console.log("%cAttempting core system initialization...", "color: blue");
    initializationInProgress = true;

    try {
      // 1. Get Event Bus instance AND store state
      eventBusRef.current = CentralEventBus;
      eventBusStoreRef.current = useEventBus.getState();
      console.log("Event Bus referenced:", 
                  eventBusRef.current ? "Instance OK" : "Instance Missing",
                  eventBusStoreRef.current ? "Store OK" : "Store Missing");

      // 2. Get Dialogue State Machine instance AND store state
      dialogueStateMachineRef.current = DialogueStateMachine;
      dialogueStoreRef.current = useDialogueStateMachine.getState();
      console.log("Dialogue State Machine referenced:", 
                 dialogueStateMachineRef.current ? "Instance OK" : "Instance Missing",
                 dialogueStoreRef.current ? "Store OK" : "Store Missing");

      // 3. Reference Action Integration module
      actionIntegrationRef.current = ActionIntegration;
      console.log("Action Integration module referenced.");

      // 4. Get Game State Machine state slice
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
      safeDispatch('SYSTEM_ERROR' as any, { 
        component: 'useCoreInitialization', 
        phase: 'initializeSystems', 
        message: error instanceof Error ? error.message : String(error), 
        error 
      });
      setInitialized(false);
    } finally {
      // Always clear the initialization lock, even if there was an error
      initializationInProgress = false;
    }

  }, [initializeGameAction, initialized]);

  // --- Teardown Logic ---
  const teardownSystems = useCallback(() => {
    console.log("Tearing down core systems...");

    // Reset stores directly
    try {
      resetKnowledgeAction();
      console.log("Knowledge store reset.");
    } catch (e) { console.error("Error resetting knowledge store:", e); }

    try {
      useResourceStore.getState().resetResources();
      console.log("Resource store reset.");
    } catch (e) { console.error("Error resetting resource store:", e); }

    try {
      useJournalStore.persist.clearStorage();
      console.log("Journal store persistence cleared.");
    } catch (e) { console.error("Error clearing journal store persistence:", e); }

    // Clear refs
    eventBusRef.current = null;
    eventBusStoreRef.current = null;
    dialogueStateMachineRef.current = null;
    dialogueStoreRef.current = null;
    stateMachineRef.current = null;
    progressionResolverRef.current = null;
    actionIntegrationRef.current = null;

    setInitialized(false);
    console.log("Core systems teardown complete.");
  }, [resetKnowledgeAction]);

  // --- Reinitialization Function ---
  const reinitialize = useCallback(() => {
    if (initializationInProgress) {
      console.log("Initialization in progress, deferring reinitialization...");
      return;
    }
    
    console.log("Reinitializing core systems...");
    teardownSystems();
    
    // Small delay to ensure clean teardown before reinitializing
    setTimeout(() => {
      initializeSystems();
    }, 50);
  }, [teardownSystems, initializeSystems]);

  // --- Effect for Initial Setup and HMR ---
  useEffect(() => {
    if (!initialized && gameStoreReady && !initializationInProgress) {
      initializeSystems();
    }

    // Expose emergency reinitialize function to window
    if (typeof window !== 'undefined') {
      (window as any).__FORCE_REINITIALIZE__ = reinitialize;
      (window as any).__CORE_SYSTEMS_DEBUG__ = {
        isInitialized: initialized,
        isInitializing: initializationInProgress,
        reinitialize,
        refs: {
          hasEventBus: !!eventBusRef.current,
          hasDialogueStateMachine: !!dialogueStateMachineRef.current,
          hasStateMachine: !!stateMachineRef.current,
          hasProgressionResolver: !!progressionResolverRef.current,
          hasActionIntegration: !!actionIntegrationRef.current
        }
      };
    }

    // Simplified HMR approach for Next.js compatibility
    if (process.env.NODE_ENV === 'development') {
      console.log("Setting up simplified HMR for core systems.");
      
      if (module.hot) {
        // Accept all changes to this module
        module.hot.accept();
        
        // Optional: Add dispose handler for cleaner transitions
        module.hot.dispose(data => {
          console.log("HMR disposal - cleaning up before refresh");
          // Store critical state for recovery
          data.wasInitialized = initialized;
        });
      }
    }

    return () => {
      console.log("Cleaning up core systems on unmount");
      if (!initialized) return;
      
      try {
        teardownSystems();
      } catch (error) {
        console.error("Error during core systems cleanup:", error);
      }
    };
  }, [initialized, gameStoreReady, initializeSystems, reinitialize, teardownSystems]);

  return { initialized, reinitialize };
}