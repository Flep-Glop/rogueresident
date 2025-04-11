// app/core/init.ts
/**
 * Optimized Core Systems Initialization
 * 
 * Improvements:
 * 1. More reliable initialization sequence
 * 2. Reduced retry attempts with better error handling
 * 3. Cleaner HMR integration
 * 4. Proper cleanup on unmount
 * 5. Better dependency tracking for React hooks
 */
import { useEffect, useState, useRef, useCallback } from 'react';

// Core System Imports - using consistent pattern
import CentralEventBus, { useEventBus, safeDispatch } from './events/CentralEventBus';
import useGameStateMachine from './statemachine/GameStateMachine';
import { progressionResolver } from './progression/ProgressionResolver';
import DialogueStateMachine, { useDialogueStateMachine } from './dialogue/DialogueStateMachine';
import ActionIntegration from './dialogue/ActionIntegration';

// Chamber Pattern Debugging - only in development
import { createTrackedStores } from '@/app/core/utils/storeAnalyzer';

// Store Imports
import { useGameStore } from '@/app/store/gameStore';
import { useKnowledgeStore } from '@/app/store/knowledgeStore';
import { useJournalStore } from '@/app/store/journalStore';
import { useResourceStore } from '@/app/store/resourceStore';

// Type imports
import type { GameEventType } from './events/EventTypes';

// Development mode detection
const IS_DEV = process.env.NODE_ENV !== 'production';

// Type definition for module hot reloading
interface NodeModule {
  hot?: {
    accept(path?: string, callback?: () => void): void;
    dispose(callback: (data: any) => void): void;
  };
}

declare const module: NodeModule;

// ======== INITIALIZATION CONFIG ========

// Configuration settings
const INIT_CONFIG = {
  MAX_ATTEMPTS: 2,              // Reduced from 3 to 2
  RETRY_DELAY: 800,             // Reduced from 1000ms to 800ms
  CLEANUP_DELAY: 50,            // Small delay before reinitializing
  ERROR_REPORTING_THRESHOLD: 2  // Log first N errors only
};

// Module-level state tracking
let initializationState = {
  inProgress: false,
  completed: false,
  attempts: 0,
  errorCount: 0
};

/**
 * Log initialization message with appropriate styling
 */
function logInit(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
  if (!IS_DEV) return; // Only log in development
  
  const styles = {
    info: 'color: blue',
    success: 'color: green; font-weight: bold',
    warning: 'color: orange',
    error: 'color: red; font-weight: bold'
  };
  
  console.log(`%c${message}`, styles[type]);
}

/**
 * Main initialization hook with enhanced reliability
 */
export function useCoreInitialization() {
  // Component state
  const [initialized, setInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  
  // Critical references to prevent re-renders
  const gameStoreReady = useGameStore(state => !!state.initializeGame);
  
  // Refs for cleanup and tracking
  const initTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const componentMountedRef = useRef(true);
  const errorReportedRef = useRef(0);
  
  // Get necessary store actions
  const initializeGameAction = useGameStore(state => state.initializeGame);
  const resetKnowledgeAction = useKnowledgeStore(state => state.resetKnowledge);

  // ======== CORE INITIALIZATION LOGIC ========
  
  const initializeSystems = useCallback(() => {
    // Skip if already fully initialized at module level
    if (initializationState.completed) {
      logInit("Core systems already fully initialized.", "success");
      setInitialized(true);
      return;
    }
    
    // Prevent concurrent initialization
    if (initializationState.inProgress) {
      logInit("Initialization already in progress, waiting...", "warning");
      return;
    }
    
    // Track attempts to avoid infinite loops
    initializationState.attempts++;
    initializationState.inProgress = true;
    
    // Check if we've exceeded max attempts
    if (initializationState.attempts > INIT_CONFIG.MAX_ATTEMPTS) {
      const errorMsg = `Max initialization attempts (${INIT_CONFIG.MAX_ATTEMPTS}) exceeded`;
      logInit(errorMsg, "error");
      setInitError(errorMsg);
      setInitialized(false);
      initializationState.inProgress = false;
      return;
    }
    
    logInit(`Attempting core system initialization (attempt ${initializationState.attempts}/${INIT_CONFIG.MAX_ATTEMPTS})...`, "info");

    try {
      // ======== SEQUENTIAL INITIALIZATION ========
      
      // 1. Initialize Event Bus
      const eventBus = CentralEventBus;
      const eventBusStore = useEventBus.getState();
      
      if (!eventBus || !eventBusStore) {
        throw new Error("Event Bus initialization failed");
      }
      
      logInit("✅ Event Bus initialized");

      // 2. Initialize Dialogue State Machine
      const dialogueStateMachine = DialogueStateMachine;
      const dialogueStore = useDialogueStateMachine.getState();
      
      if (!dialogueStateMachine || !dialogueStore) {
        throw new Error("Dialogue State Machine initialization failed");
      }
      
      logInit("✅ Dialogue State Machine initialized");

      // 3. Reference Action Integration module
      const actionIntegration = ActionIntegration;
      
      if (!actionIntegration) {
        throw new Error("Action Integration module reference failed");
      }
      
      logInit("✅ Action Integration module referenced");

      // 4. Initialize Game State Machine
      const stateMachine = useGameStateMachine.getState();
      
      if (!stateMachine) {
        throw new Error("Game State Machine reference failed");
      }
      
      logInit("✅ Game State Machine initialized");

      // 5. Reference Progression Resolver
      if (!progressionResolver) {
        throw new Error("Progression Resolver reference failed");
      }
      
      logInit("✅ Progression Resolver referenced");

      // 6. Initialize Resource Store
      const resourceStore = useResourceStore.getState();
      if (!resourceStore) {
        throw new Error("Resource Store initialization failed");
      }
      
      logInit("✅ Resource Store initialized");

      // 7. Initialize Game Store
      if (!initializeGameAction) {
        throw new Error("Game Store initialization action missing");
      }
      
      // Initialize game with exploration mode
      initializeGameAction({ startingMode: 'exploration' });
      logInit("✅ Game Store initialized");
      
      // 8. Initialize Chamber Pattern diagnostics in development
      if (IS_DEV) {
        try {
          logInit("📊 Initializing Chamber Pattern diagnostics...");
          createTrackedStores();
        } catch (e) {
          // Non-critical, just log warning
          console.warn("⚠️ Chamber Pattern diagnostics initialization failed:", e);
        }
      }

      // Success! Mark initialization complete
      initializationState.completed = true;
      initializationState.inProgress = false;
      setInitialized(true);
      setInitError(null);
      logInit("✅ Core systems initialization complete!", "success");

    } catch (error) {
      // Get error message
      const errorMsg = error instanceof Error ? error.message : String(error);
      
      // Only log errors up to threshold to avoid spam
      if (errorReportedRef.current < INIT_CONFIG.ERROR_REPORTING_THRESHOLD) {
        logInit(`❌ Error during core system initialization: ${errorMsg}`, "error");
        errorReportedRef.current++;
      }
      
      // Set error state for UI
      setInitError(errorMsg);
      
      // Report error to event system if available
      try {
        safeDispatch('SYSTEM_ERROR' as any, { 
          component: 'initialization', 
          phase: 'initializeSystems', 
          message: errorMsg, 
          error 
        });
      } catch (e) {
        // Fallback to console if event system unavailable
        if (errorReportedRef.current < INIT_CONFIG.ERROR_REPORTING_THRESHOLD) {
          console.error("Could not dispatch error event:", e);
        }
      }
      
      // Schedule retry if not too many attempts
      if (initializationState.attempts < INIT_CONFIG.MAX_ATTEMPTS && componentMountedRef.current) {
        logInit(`⏱️ Scheduling initialization retry in ${INIT_CONFIG.RETRY_DELAY}ms...`, "warning");
        
        // Clear any existing timeout
        if (initTimeoutRef.current) {
          clearTimeout(initTimeoutRef.current);
        }
        
        // Schedule retry
        initTimeoutRef.current = setTimeout(() => {
          if (componentMountedRef.current) {
            logInit("🔄 Retrying initialization...", "info");
            initializationState.inProgress = false; // Reset flag to allow retry
            initializeSystems();
          }
        }, INIT_CONFIG.RETRY_DELAY);
      } else {
        // Max attempts reached, mark as not in progress
        initializationState.inProgress = false;
        setInitialized(false);
      }
    }
  }, [initializeGameAction]);

  // ======== TEARDOWN LOGIC ========
  
  const teardownSystems = useCallback(() => {
    logInit("🧹 Tearing down core systems...", "info");

    // Cancel any pending initialization retries
    if (initTimeoutRef.current) {
      clearTimeout(initTimeoutRef.current);
      initTimeoutRef.current = null;
    }

    // Reset module-level state for fresh initialization after teardown
    initializationState = {
      inProgress: false,
      completed: false,
      attempts: 0,
      errorCount: 0
    };

    // Reset stores directly - silently handle errors
    try {
      if (resetKnowledgeAction) {
        resetKnowledgeAction();
        logInit("✅ Knowledge store reset");
      }
    } catch (e) { console.error("❌ Error resetting knowledge store:", e); }

    try {
      const resourceStore = useResourceStore.getState();
      if (resourceStore && resourceStore.resetResources) {
        resourceStore.resetResources();
        logInit("✅ Resource store reset");
      }
    } catch (e) { console.error("❌ Error resetting resource store:", e); }

    try {
      const journalStore = useJournalStore;
      if (journalStore && journalStore.persist && journalStore.persist.clearStorage) {
        journalStore.persist.clearStorage();
        logInit("✅ Journal store persistence cleared");
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

    // Reset component state
    setInitialized(false);
    logInit("✅ Core systems teardown complete", "success");
  }, [resetKnowledgeAction]);

  // ======== REINITIALIZATION LOGIC ========
  
  const reinitialize = useCallback(() => {
    logInit("🔄 Reinitializing core systems...", "info");
    
    // Skip if initialization is already in progress
    if (initializationState.inProgress) {
      logInit("⚠️ Initialization in progress, deferring reinitialization...", "warning");
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
    }, INIT_CONFIG.CLEANUP_DELAY);
  }, [teardownSystems, initializeSystems]);

  // ======== EFFECT FOR LIFECYCLE MANAGEMENT ========
  
  useEffect(() => {
    // Track component mount state
    componentMountedRef.current = true;
    
    // Initialize if not already done
    if (!initialized && !initializationState.inProgress && gameStoreReady) {
      // Small delay to allow store hooks to stabilize
      setTimeout(() => {
        if (componentMountedRef.current && !initialized && !initializationState.inProgress) {
          initializeSystems();
        }
      }, 50);
    }

    // Expose emergency reinitialize function
    if (typeof window !== 'undefined') {
      (window as any).__FORCE_REINITIALIZE__ = reinitialize;
      
      // Add more comprehensive debug interface
      (window as any).__CORE_SYSTEMS_DEBUG__ = {
        isInitialized: initialized,
        initState: { ...initializationState },
        initError,
        reinitialize,
        forceInitialize: () => {
          // Reset module state to force fresh initialization
          initializationState = {
            inProgress: false,
            completed: false,
            attempts: 0,
            errorCount: 0
          };
          initializeSystems();
        },
        diagnostic: {
          hasEventBus: !!CentralEventBus,
          hasDialogueStateMachine: !!DialogueStateMachine,
          hasStateMachine: !!useGameStateMachine,
          hasProgressionResolver: !!progressionResolver,
          hasActionIntegration: !!ActionIntegration,
          hasResourceStore: !!useResourceStore
        }
      };
    }

    // Handle HMR for Next.js - simplified approach
    if (IS_DEV && module.hot) {
      logInit("🔄 Setting up HMR for core systems");
      
      module.hot.accept();
      
      // Store state for HMR recovery
      module.hot.dispose(data => {
        logInit("♻️ HMR disposal - preserving state for refresh");
        data.wasInitialized = initialized;
        data.initState = { ...initializationState };
        
        // Clear pending timeouts
        if (initTimeoutRef.current) {
          clearTimeout(initTimeoutRef.current);
        }
      });
    }

    // Cleanup function
    return () => {
      logInit("🧹 Cleaning up core systems on unmount");
      componentMountedRef.current = false;
      
      // Clear pending timeouts
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
        initTimeoutRef.current = null;
      }
      
      // Only teardown if we were initialized
      if (initialized) {
        try {
          teardownSystems();
        } catch (error) {
          console.error("❌ Error during core systems cleanup:", error);
        }
      }
    };
  }, [initialized, gameStoreReady, initializeSystems, reinitialize, teardownSystems]);

  // Return initialization state and control methods
  return { 
    initialized, 
    reinitialize, 
    initError 
  };
}