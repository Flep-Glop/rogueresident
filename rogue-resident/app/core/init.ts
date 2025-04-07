// app/core/init.ts
/**
 * Core System Initialization with Singleton Pattern
 * 
 * A robust initialization system that:
 * - Prevents multiple initialization calls (critical for React's mount/unmount cycles)
 * - Uses a singleton pattern to maintain system integrity
 * - Provides clean error boundaries and recovery
 * - Supports safe hot module reloading
 * 
 * This pattern has been proved effective in shipped narrative games where React's
 * component architecture meets traditional game system initialization patterns.
 */

import { GameEventType } from './events/EventTypes';
import { useEventBus, resetEventSystem } from './events/CentralEventBus';
import { setupGameStateMachine } from './statemachine/GameStateMachine';
import { setupStateBridge } from './statemachine/GameStateBridge';
import { setupProgressionService } from './progression/ProgressionService';
import { setupDialogueController } from './dialogue/DialogueController';

// Singleton tracking state - preserved across hot reloads
interface InitializationState {
  isInitialized: boolean;
  initCount: number;
  lastInitTime: number;
  cleanupFn: (() => void) | null;
  systems: Record<string, boolean>;
  errors: Array<{system: string, error: string}>;
}

// Create a stable reference that persists across React's lifecycle
// This is stored on the window in development for debugging
const INIT_STATE: InitializationState = {
  isInitialized: false,
  initCount: 0,
  lastInitTime: 0,
  cleanupFn: null,
  systems: {},
  errors: []
};

// Global reference for emergency debugging/recovery
if (typeof window !== 'undefined') {
  (window as any).__GAME_INIT_STATE__ = INIT_STATE;
}

/**
 * Safely resets the event system with error handling
 */
function safeEventSystemReset() {
  try {
    resetEventSystem();
    console.log('🧹 Event system reset to clean state');
    return true;
  } catch (error) {
    console.error('⚠️ Failed to reset event system:', error);
    return false;
  }
}

/**
 * Initialize core systems with singleton pattern to prevent duplicate initialization
 * Returns a cleanup function that should be called on unmount
 */
export function initializeSystems() {
  // Detect attempts to initialize again and prevent them
  if (INIT_STATE.isInitialized) {
    console.log(`🔄 Systems already initialized (call #${++INIT_STATE.initCount}), reusing existing initialization`);
    
    // Emergency check - if it's been a long time since initialization, we might be in a stale state
    const timeSinceInit = Date.now() - INIT_STATE.lastInitTime;
    if (timeSinceInit > 60000) { // 1 minute
      console.warn(`⚠️ It's been ${Math.round(timeSinceInit/1000)}s since last initialization. This might indicate a stale state.`);
    }
    
    // Return the existing cleanup function
    return INIT_STATE.cleanupFn || (() => {});
  }
  
  console.log('🚀 Initializing core systems...');
  INIT_STATE.initCount++;
  INIT_STATE.lastInitTime = Date.now();
  
  // Reset event system first to ensure clean state
  safeEventSystemReset();
  
  // System initialization functions with dependencies
  const systems = [
    {
      name: 'eventBus',
      fn: () => {
        console.log('📡 Initializing event system...');
        // Just mark it as initialized since we've already reset it
        return true;
      },
      dependencies: []
    },
    {
      name: 'stateMachine',
      fn: () => {
        console.log('🔄 Initializing state machine...');
        return setupGameStateMachine();
      },
      dependencies: ['eventBus']
    },
    {
      name: 'stateBridge',
      fn: () => {
        console.log('🌉 Initializing state bridge...');
        return setupStateBridge();
      },
      dependencies: ['eventBus', 'stateMachine']
    },
    {
      name: 'dialogueController',
      fn: () => {
        console.log('💬 Initializing dialogue controller...');
        return setupDialogueController();
      },
      dependencies: ['eventBus', 'stateMachine']
    },
    {
      name: 'progressionService',
      fn: () => {
        console.log('📈 Initializing progression service...');
        return setupProgressionService();
      },
      dependencies: ['eventBus', 'dialogueController']
    }
  ];
  
  // Cleanup functions to return
  const cleanupFunctions: Array<() => void> = [];
  
  // Initialize systems in dependency order
  for (const system of systems) {
    // Skip if already initialized (can happen in development with fast refresh)
    if (INIT_STATE.systems[system.name]) {
      console.log(`⏩ System ${system.name} already initialized, skipping`);
      continue;
    }
    
    // Check dependencies
    const missingDeps = system.dependencies.filter(dep => !INIT_STATE.systems[dep]);
    if (missingDeps.length > 0) {
      const error = `Cannot initialize ${system.name} - missing dependencies: ${missingDeps.join(', ')}`;
      console.error(`❌ ${error}`);
      INIT_STATE.errors.push({system: system.name, error});
      continue;
    }
    
    // Initialize the system
    try {
      console.log(`🔧 Initializing ${system.name}...`);
      const cleanup = system.fn();
      
      if (cleanup && typeof cleanup === 'function') {
        cleanupFunctions.push(cleanup);
      }
      
      // Mark system as initialized
      INIT_STATE.systems[system.name] = true;
      console.log(`✅ ${system.name} initialized successfully`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ Failed to initialize ${system.name}:`, error);
      INIT_STATE.errors.push({system: system.name, error: errorMsg});
      
      if (['eventBus', 'stateMachine'].includes(system.name)) {
        throw new Error(`Critical system ${system.name} failed to initialize: ${errorMsg}`);
      }
    }
  }
  
  // Check if all critical systems are initialized
  const criticalSystems = ['eventBus', 'stateMachine'];
  const missingCritical = criticalSystems.filter(sys => !INIT_STATE.systems[sys]);
  
  if (missingCritical.length > 0) {
    INIT_STATE.isInitialized = false;
    throw new Error(`Failed to initialize critical systems: ${missingCritical.join(', ')}`);
  }
  
  // Create master cleanup function that runs in reverse initialization order
  const masterCleanup = () => {
    // If already not initialized, just log and return
    if (!INIT_STATE.isInitialized) {
      console.log('🧹 Cleanup called, but systems were not initialized');
      return;
    }
    
    console.log('🧹 Running system cleanup...');
    
    // Signal session end - inside a try/catch to prevent cascading errors
    try {
      const eventBus = useEventBus.getState();
      if (eventBus && typeof eventBus.dispatch === 'function') {
        eventBus.dispatch(
          GameEventType.SESSION_ENDED,
          { timestamp: Date.now() },
          'init:sessionEnd'
        );
      }
    } catch (e) {
      console.error('Failed to dispatch session end event:', e);
    }
    
    // Run cleanups in reverse order with error isolation
    for (let i = cleanupFunctions.length - 1; i >= 0; i--) {
      try {
        if (typeof cleanupFunctions[i] === 'function') {
          cleanupFunctions[i]();
        } else {
          console.warn(`Cleanup function at index ${i} is not a function`);
        }
      } catch (error) {
        console.error(`Error during cleanup of index ${i}:`, error);
        // Continue with next cleanup despite errors
      }
    }
    
    // Reset global state
    INIT_STATE.isInitialized = false;
    INIT_STATE.cleanupFn = null;
    
    // Final event system cleanup - do this last and with isolated error handling
    try {
      safeEventSystemReset();
    } catch (e) {
      console.error('Failed final event system reset:', e);
    }
  };
  
  // Store cleanup function for reuse and mark initialization as complete
  INIT_STATE.cleanupFn = masterCleanup;
  INIT_STATE.isInitialized = true;
  
  // Signal session start - inside try/catch to prevent initialization errors
  try {
    const eventBus = useEventBus.getState();
    if (eventBus && typeof eventBus.dispatch === 'function') {
      eventBus.dispatch(
        GameEventType.SESSION_STARTED,
        { 
          timestamp: Date.now(),
          systems: Object.keys(INIT_STATE.systems).filter(k => INIT_STATE.systems[k])
        },
        'init:sessionStart'
      );
    }
  } catch (e) {
    console.error('Failed to dispatch session start event:', e);
    // Continue initialization despite event error
  }
  
  // Add emergency reset function to window for recovery during development
  if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
    (window as any).__RESET_EVENT_SYSTEM__ = () => {
      return safeEventSystemReset();
    };
    
    (window as any).__FORCE_REINITIALIZE__ = () => {
      try {
        // Force cleanup and reset state
        if (INIT_STATE.cleanupFn) {
          INIT_STATE.cleanupFn();
        }
        INIT_STATE.isInitialized = false;
        INIT_STATE.systems = {};
        INIT_STATE.errors = [];
        
        // Reinitialize
        console.log('🔄 Forcing reinitialization of all systems');
        const cleanup = initializeSystems();
        console.log('✅ Force reinitialization complete');
        return true;
      } catch (e) {
        console.error('Force reinitialization failed:', e);
        return false;
      }
    };
  }
  
  console.log('✅ Core systems initialized successfully');
  return masterCleanup;
}

// Add window global for debugging in dev mode
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
  (window as any).__STATE_MACHINE_STORE__ = {};
}

// Add hot module reloading protection
if (typeof module !== 'undefined' && module.hot) {
  module.hot.dispose(() => {
    console.log('🔥 Hot module replacement detected for init.ts, preserving state');
    // We intentionally don't reset here - instead rely on the singleton pattern to handle it
  });
}

export default { initializeSystems };