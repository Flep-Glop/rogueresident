// app/core/init.ts
/**
 * Core system initialization for Rogue Resident
 * 
 * Streamlined version focused on the vertical slice experience.
 * Critical systems only, with non-essential systems commented out.
 */

import { useEventBus } from './events/CentralEventBus';
import { setupGameStateMachine } from './statemachine/GameStateMachine';
import { GameEventType } from './events/EventTypes';

/**
 * Initialize essential core systems
 * Focused on the critical path for the prototype
 * @returns Cleanup function to call when unmounting
 */
export function initializeSystems() {
  console.log('🚀 Initializing core systems for vertical slice...');
  
  // Track cleanup functions for initialized systems
  const cleanupFunctions: (() => void)[] = [];
  
  try {
    // 1. Initialize event bus first
    console.log('[Core] Initializing event system');
    const eventBus = useEventBus.getState();
    
    // 2. Initialize game state machine (critical for day/night cycle)
    console.log('[Core] Initializing game state machine');
    const stateMachineCleanup = setupGameStateMachine();
    cleanupFunctions.push(() => {
      try {
        stateMachineCleanup.teardown();
      } catch (e) {
        console.warn('State machine cleanup failed, continuing:', e);
      }
    });
    
    // Note: Progression resolver removed for prototype simplicity
    // Will be re-added when needed for multiple day progression
    
    // 3. Log initialization success
    console.log('✅ Core systems initialized for vertical slice');
    
    // 4. Dispatch session started event
    try {
      eventBus.dispatch(
        GameEventType.SYSTEM_INITIALIZED,
        {
          timestamp: Date.now(),
          systems: ['eventBus', 'gameState'],
          mode: 'vertical_slice'
        },
        'core.init'
      );
    } catch (e) {
      console.warn('Event dispatch failed, continuing:', e);
    }
    
    // Return unified cleanup function
    return () => {
      console.log('[Core] Cleaning up core systems');
      
      try {
        // Dispatch shutdown event
        eventBus.dispatch(
          GameEventType.SYSTEM_SHUTDOWN,
          {
            timestamp: Date.now(),
            systems: ['eventBus', 'gameState'],
            mode: 'vertical_slice'
          },
          'core.init'
        );
      } catch (e) {
        console.warn('Shutdown event dispatch failed:', e);
      }
      
      // Run all cleanup functions
      cleanupFunctions.forEach(cleanup => {
        try {
          cleanup();
        } catch (error) {
          console.error('[Core] Error during cleanup:', error);
        }
      });
    };
  } catch (error) {
    console.error('❌ Fatal error during core initialization:', error);
    
    // Run any cleanup functions that were registered before the error
    cleanupFunctions.forEach(cleanup => {
      try {
        cleanup();
      } catch (cleanupError) {
        console.error('[Core] Error during cleanup after failed init:', cleanupError);
      }
    });
    
    // Rethrow for component error handling
    throw error;
  }
}

/**
 * Entry point for React components to initialize core systems
 * This ensures initialization happens only once even with HMR
 */
let initialized = false;
let cleanupFunction: (() => void) | null = null;

export function useCoreInitialization() {
  if (!initialized && typeof window !== 'undefined') {
    cleanupFunction = initializeSystems();
    initialized = true;
    
    // Set up hot module reloading cleanup
    if (module.hot) {
      module.hot.dispose(() => {
        if (cleanupFunction) {
          console.log('🔥 Hot module replacement detected, cleaning up core systems');
          cleanupFunction();
          cleanupFunction = null;
          initialized = false;
        }
      });
    }
  }
  
  return {
    initialized,
    reinitialize: () => {
      if (cleanupFunction) {
        cleanupFunction();
        cleanupFunction = null;
        initialized = false;
      }
      cleanupFunction = initializeSystems();
      initialized = true;
    }
  };
}