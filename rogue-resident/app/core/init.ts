// app/core/init.ts
/**
 * Core system initialization for Rogue Resident
 *
 * Streamlined version focused on the vertical slice experience.
 * Removed TransitionGuarantor initialization.
 */

import { useEventBus } from './events/CentralEventBus';
import { setupGameStateMachine } from './statemachine/GameStateMachine';
import { GameEventType } from './events/EventTypes';
// Removed TransitionGuarantor import

/**
 * Initialize essential core systems
 * Focused on the critical path for the prototype
 * @returns Cleanup function to call when unmounting
 */
export function initializeSystems() {
  console.log('🚀 Initializing core systems for vertical slice...');

  const cleanupFunctions: (() => void)[] = [];

  try {
    // 1. Initialize event bus first
    console.log('[Core] Initializing event system');
    const eventBus = useEventBus.getState(); // Ensure event bus is accessed

    // 2. Initialize game state machine (critical for day/night cycle)
    console.log('[Core] Initializing game state machine');
    const stateMachineCleanup = setupGameStateMachine();
    cleanupFunctions.push(() => {
      try {
        stateMachineCleanup.teardown(); // Use teardown if provided
      } catch (e) {
        console.warn('State machine cleanup failed, continuing:', e);
      }
    });

    // 3. Log initialization success
    console.log('✅ Core systems initialized for vertical slice');

    // 4. Dispatch system initialized event
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

      cleanupFunctions.forEach(cleanup => {
        try { cleanup(); } catch (error) { console.error('[Core] Error during cleanup:', error); }
      });
    };
  } catch (error) {
    console.error('❌ Fatal error during core initialization:', error);
    cleanupFunctions.forEach(cleanup => {
      try { cleanup(); } catch (cleanupError) { console.error('[Core] Error during cleanup after failed init:', cleanupError); }
    });
    throw error;
  }
}

// React hook for initialization
let initialized = false;
let cleanupFunction: (() => void) | null = null;

export function useCoreInitialization() {
  if (!initialized && typeof window !== 'undefined') {
    try {
      cleanupFunction = initializeSystems();
      initialized = true;

      // Setup HMR cleanup
      if (typeof module !== 'undefined' && module.hot) {
        module.hot.dispose(() => {
          if (cleanupFunction) {
            console.log('🔥 Hot module replacement detected, cleaning up core systems');
            cleanupFunction();
            cleanupFunction = null;
            initialized = false;
          }
        });
      }
    } catch (initError) {
       console.error("Initialization failed in hook:", initError);
       // Optionally set an error state here
    }
  }

  return {
    initialized,
    reinitialize: () => {
      if (cleanupFunction) { cleanupFunction(); }
      initialized = false; // Reset flag
      cleanupFunction = null;
      try {
          cleanupFunction = initializeSystems();
          initialized = true;
      } catch (reinitError) {
          console.error("Reinitialization failed:", reinitError);
      }
    }
  };
}