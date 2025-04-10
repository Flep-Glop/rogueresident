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

// --- Chamber Pattern Debugging ---
import { createTrackedStores } from '@/app/core/utils/storeAnalyzer';

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

// Initialization state tracking at module level for better coordination
let initializationInProgress = false;
let initializationCompleted = false;
let initializationAttempts = 0;
const MAX_INIT_ATTEMPTS = 3;
const INIT_RETRY_DELAY = 1000; // ms

/**
 * Enhanced initialization with retry logic and better error handling
 */
export function useCoreInitialization() {
  const [initialized, setInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const gameStoreReady = useGameStore((state: CombinedState) => !!state.initializeGame);

  // Refs to hold instances
  const eventBusRef = useRef<CentralEventBusInstanceType | null>(null);
  const eventBusStoreRef = useRef<EventBusState | null>(null);
  const dialogueStateMachineRef = useRef<DialogueStateMachineInstanceType | null>(null);
  const dialogueStoreRef = useRef<DialogueState | null>(null);
  const stateMachineRef = useRef<GameState | null>(null);
  const progressionResolverRef = useRef<ProgressionResolverInstanceType | null>(null);
  const actionIntegrationRef = useRef<ActionIntegrationModuleType | null>(null);
  const initTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const componentMountedRef = useRef(true);

  // Get necessary store actions
  const initializeGameAction = useGameStore((state: CombinedState) => state.initializeGame);
  const resetKnowledgeAction = useKnowledgeStore(state => state.resetKnowledge);

  // --- Enhanced Initialization Logic ---
  const initializeSystems = useCallback(() => {
    // Don't attempt to initialize if already successful at module level
    if (initializationCompleted) {
      console.log("%cCore systems already fully initialized.", "color: green");
      setInitialized(true);
      return;
    }
    
    // Prevent concurrent initialization
    if (initializationInProgress) {
      console.log("%cInitialization already in progress, waiting...", "color: orange");
      return;
    }
    
    // Track attempts to avoid infinite loops
    initializationAttempts++;
    if (initializationAttempts > MAX_INIT_ATTEMPTS) {
      const errorMsg = `Max initialization attempts (${MAX_INIT_ATTEMPTS}) exceeded`;
      console.error(errorMsg);
      setInitError(errorMsg);
      setInitialized(false);
      initializationInProgress = false;
      return;
    }
    
    console.log(`%cAttempting core system initialization (attempt ${initializationAttempts}/${MAX_INIT_ATTEMPTS})...`, "color: blue");
    initializationInProgress = true;

    try {
      // 1. Get Event Bus instance AND store state - with error checking
      try {
        eventBusRef.current = CentralEventBus;
        eventBusStoreRef.current = useEventBus.getState();
        if (!eventBusRef.current || !eventBusStoreRef.current) {
          throw new Error("Event Bus initialization failed");
        }
        console.log("✅ Event Bus referenced:", 
                  eventBusRef.current ? "Instance OK" : "Instance Missing",
                  eventBusStoreRef.current ? "Store OK" : "Store Missing");
      } catch (e) {
        throw new Error(`Event Bus initialization error: ${e.message}`);
      }

      // 2. Get Dialogue State Machine instance AND store state - with error checking
      try {
        dialogueStateMachineRef.current = DialogueStateMachine;
        dialogueStoreRef.current = useDialogueStateMachine.getState();
        if (!dialogueStateMachineRef.current || !dialogueStoreRef.current) {
          throw new Error("Dialogue State Machine initialization failed");
        }
        console.log("✅ Dialogue State Machine referenced:", 
                  dialogueStateMachineRef.current ? "Instance OK" : "Instance Missing",
                  dialogueStoreRef.current ? "Store OK" : "Store Missing");
      } catch (e) {
        throw new Error(`Dialogue State Machine initialization error: ${e.message}`);
      }

      // 3. Reference Action Integration module
      try {
        actionIntegrationRef.current = ActionIntegration;
        if (!actionIntegrationRef.current) {
          throw new Error("Action Integration module reference failed");
        }
        console.log("✅ Action Integration module referenced.");
      } catch (e) {
        throw new Error(`Action Integration error: ${e.message}`);
      }

      // 4. Get Game State Machine state slice
      try {
        stateMachineRef.current = useGameStateMachine.getState();
        if (!stateMachineRef.current) {
          throw new Error("Game State Machine reference failed");
        }
        console.log("✅ Game State Machine state referenced.");
      } catch (e) {
        throw new Error(`Game State Machine error: ${e.message}`);
      }

      // 5. Reference Progression Resolver instance
      try {
        progressionResolverRef.current = progressionResolver;
        if (!progressionResolverRef.current) {
          throw new Error("Progression Resolver reference failed");
        }
        console.log("✅ Progression Resolver referenced.");
      } catch (e) {
        throw new Error(`Progression Resolver error: ${e.message}`);
      }

      // 6. Initialize Game Store Slice - with better error handling
      try {
        if (!initializeGameAction) {
          throw new Error("Game Store initialization action missing");
        }
        initializeGameAction({ startingMode: 'exploration' });
        console.log("✅ Game Store slice initialized.");
      } catch (e) {
        throw new Error(`Game Store initialization error: ${e.message}`);
      }
      
      // 7. Initialize Chamber Pattern diagnostics and tracking
      if (process.env.NODE_ENV !== 'production') {
        try {
          console.log("📊 Initializing Chamber Pattern diagnostics...");
          createTrackedStores();
        } catch (e) {
          console.warn("⚠️ Chamber Pattern diagnostics initialization failed:", e);
          // Non-critical, so we continue
        }
      }

      // If we made it here, initialization was successful
      initializationCompleted = true;
      initializationInProgress = false;
      setInitialized(true);
      setInitError(null);
      console.log("%c✅ Core systems initialization complete!", "color: green; font-weight: bold");

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("%c❌ Error during core system initialization:", "color: red; font-weight: bold", error);
      
      // Set error state but don't set initialized to false yet - give retries a chance
      setInitError(errorMsg);
      
      // Try to report the error to the event system if possible
      try {
        safeDispatch('SYSTEM_ERROR' as any, { 
          component: 'useCoreInitialization', 
          phase: 'initializeSystems', 
          message: errorMsg, 
          error 
        });
      } catch (e) {
        // If event system is unavailable, log to console as fallback
        console.error("Could not dispatch error event:", e);
      }
      
      // Schedule retry with delay if not too many attempts
      if (initializationAttempts < MAX_INIT_ATTEMPTS && componentMountedRef.current) {
        console.log(`%c⏱️ Scheduling initialization retry in ${INIT_RETRY_DELAY}ms...`, "color: orange");
        
        // Clear any existing timeout
        if (initTimeoutRef.current) {
          clearTimeout(initTimeoutRef.current);
        }
        
        // Schedule retry
        initTimeoutRef.current = setTimeout(() => {
          if (componentMountedRef.current) {
            console.log("%c🔄 Retrying initialization...", "color: blue");
            initializationInProgress = false; // Reset flag to allow retry
            initializeSystems();
          }
        }, INIT_RETRY_DELAY);
      } else {
        // If max attempts reached, set initialized to false
        initializationInProgress = false;
        setInitialized(false);
      }
    }
  }, [initializeGameAction]);

  // --- Enhanced Teardown Logic ---
  const teardownSystems = useCallback(() => {
    console.log("%c🧹 Tearing down core systems...", "color: blue");

    // Cancel any pending initialization retries
    if (initTimeoutRef.current) {
      clearTimeout(initTimeoutRef.current);
      initTimeoutRef.current = null;
    }

    // Reset module-level state to allow fresh initialization after teardown
    initializationInProgress = false;
    initializationCompleted = false;
    initializationAttempts = 0;

    // Reset stores directly
    try {
      if (resetKnowledgeAction) {
        resetKnowledgeAction();
        console.log("✅ Knowledge store reset.");
      }
    } catch (e) { console.error("❌ Error resetting knowledge store:", e); }

    try {
      const resourceStore = useResourceStore.getState();
      if (resourceStore && resourceStore.resetResources) {
        resourceStore.resetResources();
        console.log("✅ Resource store reset.");
      }
    } catch (e) { console.error("❌ Error resetting resource store:", e); }

    try {
      const journalStore = useJournalStore;
      if (journalStore && journalStore.persist && journalStore.persist.clearStorage) {
        journalStore.persist.clearStorage();
        console.log("✅ Journal store persistence cleared.");
      }
    } catch (e) { console.error("❌ Error clearing journal store persistence:", e); }
    
    // Reset Chamber Pattern diagnostics if available
    if (typeof window !== 'undefined') {
      try {
        if ((window as any).__CHAMBER_DEBUG__?.resetStats) {
          (window as any).__CHAMBER_DEBUG__.resetStats();
        }
        if ((window as any).__STORE_ANALYZER__?.reset) {
          (window as any).__STORE_ANALYZER__.reset();
        }
      } catch (e) { console.warn("⚠️ Error resetting Chamber Pattern diagnostics:", e); }
    }

    // Clear refs
    eventBusRef.current = null;
    eventBusStoreRef.current = null;
    dialogueStateMachineRef.current = null;
    dialogueStoreRef.current = null;
    stateMachineRef.current = null;
    progressionResolverRef.current = null;
    actionIntegrationRef.current = null;

    setInitialized(false);
    console.log("%c✅ Core systems teardown complete.", "color: green");
  }, [resetKnowledgeAction]);

  // --- Enhanced Reinitialization Function ---
  const reinitialize = useCallback(() => {
    console.log("%c🔄 Reinitializing core systems...", "color: blue; font-weight: bold");
    
    // Skip if initialization is already in progress
    if (initializationInProgress) {
      console.log("⚠️ Initialization in progress, deferring reinitialization...");
      return;
    }
    
    // Perform full teardown first
    teardownSystems();
    
    // Reset error state
    setInitError(null);
    
    // Small delay to ensure clean teardown before reinitializing
    setTimeout(() => {
      if (componentMountedRef.current) {
        initializeSystems();
      }
    }, 100);
  }, [teardownSystems, initializeSystems]);

  // --- Improved Effect for Initial Setup and HMR ---
  useEffect(() => {
    componentMountedRef.current = true;
    
    // Check if we need to initialize
    if (!initialized && !initializationInProgress && gameStoreReady) {
      // Give the system a moment to stabilize before initialization
      setTimeout(() => {
        if (componentMountedRef.current && !initialized && !initializationInProgress) {
          initializeSystems();
        }
      }, 50);
    }

    // Expose emergency reinitialize function to window with better debugging
    if (typeof window !== 'undefined') {
      (window as any).__FORCE_REINITIALIZE__ = reinitialize;
      (window as any).__CORE_SYSTEMS_DEBUG__ = {
        isInitialized: initialized,
        isInitializing: initializationInProgress,
        initAttempts: initializationAttempts,
        maxAttempts: MAX_INIT_ATTEMPTS,
        initError,
        reinitialize,
        forceInitialize: () => {
          // Reset module state to force a fresh initialization
          initializationInProgress = false;
          initializationCompleted = false;
          initializationAttempts = 0;
          initializeSystems();
        },
        refs: {
          hasEventBus: !!eventBusRef.current,
          hasDialogueStateMachine: !!dialogueStateMachineRef.current,
          hasStateMachine: !!stateMachineRef.current,
          hasProgressionResolver: !!progressionResolverRef.current,
          hasActionIntegration: !!actionIntegrationRef.current
        },
        chamberPatternEnabled: true,
        diagnosticsAvailable: !!(
          typeof window !== 'undefined' && 
          ((window as any).__CHAMBER_DEBUG__ || (window as any).__STORE_ANALYZER__)
        ),
        runDiagnostics: () => {
          console.group('Chamber Pattern Diagnostics');
          
          try {
            if ((window as any).__CHAMBER_DEBUG__?.getSuspiciousComponents) {
              const suspicious = (window as any).__CHAMBER_DEBUG__.getSuspiciousComponents();
              console.log('Suspicious components:', suspicious);
            } else {
              console.warn('Chamber Debug API not available');
            }
            
            if ((window as any).__STORE_ANALYZER__?.getIssues) {
              const issues = (window as any).__STORE_ANALYZER__.getIssues();
              console.log('Store access issues:', issues);
            } else {
              console.warn('Store Analyzer API not available');
            }
          } catch (e) {
            console.error('Error running diagnostics:', e);
          }
          
          console.groupEnd();
        }
      };
    }

    // Simplified HMR approach for Next.js compatibility
    if (process.env.NODE_ENV === 'development') {
      console.log("🔄 Setting up simplified HMR for core systems.");
      
      if (module.hot) {
        // Accept all changes to this module
        module.hot.accept();
        
        // Optional: Add dispose handler for cleaner transitions
        module.hot.dispose(data => {
          console.log("♻️ HMR disposal - cleaning up before refresh");
          // Store critical state for recovery
          data.wasInitialized = initialized;
          data.initAttempts = initializationAttempts;
          
          // Clear any pending timeouts
          if (initTimeoutRef.current) {
            clearTimeout(initTimeoutRef.current);
          }
        });
      }
    }

    return () => {
      console.log("🧹 Cleaning up core systems on unmount");
      componentMountedRef.current = false;
      
      // Clear any pending timeouts
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
        initTimeoutRef.current = null;
      }
      
      if (initialized) {
        try {
          teardownSystems();
        } catch (error) {
          console.error("❌ Error during core systems cleanup:", error);
        }
      }
    };
  }, [initialized, gameStoreReady, initializeSystems, reinitialize, teardownSystems]);

  return { initialized, reinitialize, initError };
}