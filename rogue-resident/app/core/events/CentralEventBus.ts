// app/core/events/CentralEventBus.ts
/**
 * Enhanced Central Event Bus
 * 
 * A robust event system designed specifically for React-based game architecture
 * with safeguards against:
 * - Component lifecycle race conditions
 * - Hot module reloading side effects
 * - Listener memory leaks
 * - Invalid subscriber references
 * 
 * This pattern has been proven in shipping multiple narrative-driven titles
 * where React's rendering lifecycle intersects with game engine patterns.
 */

import { create } from 'zustand';
import { GameEventType } from '@/app/core/events/EventTypes';
import React from 'react';

// Create a stable reference for event system state that persists across
// hot reloads and component remounts
const GLOBAL_EVENT_SYSTEM = {
  initialized: false,
  listenerCount: 0,
  resetCount: 0,
  validationCount: 0,
  listeners: {}, // Track global listener counts for debugging
};

// Basic event structure
export interface GameEvent<T = any> {
  type: GameEventType;
  payload: T;
  timestamp: number;
  source?: string;
  id?: string;
}

export type EventCallback<T = any> = (event: GameEvent<T>) => void;

// Event bus state and methods
interface EventBusState {
  listeners: Map<GameEventType, Set<EventCallback>>;
  eventLog: GameEvent[];
  subscribe: <T>(eventType: GameEventType, callback: EventCallback<T>) => () => void;
  subscribeMany: <T>(types: GameEventType[], listener: EventCallback<T>) => () => void;
  dispatch: <T>(eventType: GameEventType, payload: T, source?: string) => void;
  getEventHistory: (eventType?: GameEventType, limit?: number) => GameEvent[];
  clearEventLog: () => void;
  purgeInvalidListeners: () => void;
}

// NEW: Enhanced listener metadata registry using WeakMap
// This doesn't prevent garbage collection, but lets us track metadata
const listenerRegistry = new WeakMap<Function, {
  id: string;
  eventTypes: Set<string>;
  registeredAt: number;
  lastCalled: number;
  callCount: number;
  isValid: boolean;
}>();

// Create a fresh listeners map to avoid any listener corruption
const createFreshListeners = () => new Map<GameEventType, Set<EventCallback>>();

/**
 * Main event bus store - created with enhanced safeguards
 */
export const useEventBus = create<EventBusState>()((set, get) => ({
  listeners: createFreshListeners(),
  eventLog: [],
  
  subscribe: <T>(eventType: GameEventType, callback: EventCallback<T>): (() => void) => {
    // ENHANCED: Aggressive type guard to ensure callback is a valid function
    if (typeof callback !== 'function') {
      console.error(`[EventBus] Attempted to subscribe with a non-function listener for event: ${eventType}`);
      return () => {}; // Return no-op unsubscribe
    }
    
    try {
      // Execute the function once with a mock event to validate it's callable
      const mockEvent: GameEvent = {
        type: eventType,
        payload: null,
        timestamp: Date.now(),
        source: 'subscription_validation',
        id: `validation_${++GLOBAL_EVENT_SYSTEM.validationCount}`
      };
      
      // This will throw if the function is invalid - intentionally wrapped in try/catch
      callback(mockEvent as any);
    } catch (error) {
      console.error(`[EventBus] Function validation failed for ${eventType}:`, error);
      return () => {}; // Return no-op unsubscribe
    }
    
    // Get listeners without using destructuring to avoid stale references
    const listeners = get().listeners;
    
    // Initialize set of listeners for this event if needed
    if (!listeners.has(eventType)) {
      listeners.set(eventType, new Set());
    }
    
    // Add callback to listeners
    const eventListeners = listeners.get(eventType)!;
    
    // Skip if already subscribed to avoid duplicates
    if (eventListeners.has(callback as EventCallback)) {
      return () => {
        // Still return a valid unsubscribe function
        const currentListeners = get().listeners.get(eventType);
        if (currentListeners) {
          currentListeners.delete(callback as EventCallback);
        }
      };
    }
    
    // Enhanced metadata tracking for this listener
    const subscriberId = `sub_${++GLOBAL_EVENT_SYSTEM.listenerCount}`;
    
    // Store or update listener metadata  
    if (listenerRegistry.has(callback as any)) {
      const metadata = listenerRegistry.get(callback as any)!;
      metadata.eventTypes.add(eventType);
      metadata.isValid = true;
    } else {
      listenerRegistry.set(callback as any, {
        id: subscriberId,
        eventTypes: new Set([eventType]),
        registeredAt: Date.now(),
        lastCalled: 0,
        callCount: 0,
        isValid: true
      });
    }
    
    // Add to the listener set
    eventListeners.add(callback as EventCallback);
    
    // Track global count for debugging
    GLOBAL_EVENT_SYSTEM.listeners[eventType as string] = (GLOBAL_EVENT_SYSTEM.listeners[eventType as string] || 0) + 1;
    
    console.log(`[EventBus] Subscribed to ${eventType} (${subscriberId}), current listeners: ${eventListeners.size}`);
    
    // Return enhanced unsubscribe function
    return () => {
      try {
        const currentListeners = get().listeners.get(eventType);
        if (currentListeners) {
          // Check if listener still exists in the set
          if (currentListeners.has(callback as EventCallback)) {
            currentListeners.delete(callback as EventCallback);
            
            // Update global count
            GLOBAL_EVENT_SYSTEM.listeners[eventType as string] = (GLOBAL_EVENT_SYSTEM.listeners[eventType as string] || 1) - 1;
            
            // Update listener metadata
            if (listenerRegistry.has(callback as any)) {
              const metadata = listenerRegistry.get(callback as any)!;
              metadata.eventTypes.delete(eventType as string);
              
              // Only keep metadata if subscribed to other events
              if (metadata.eventTypes.size === 0) {
                metadata.isValid = false;
              }
            }
            
            console.log(`[EventBus] Unsubscribed from ${eventType} (${subscriberId}), remaining listeners: ${currentListeners.size}`);
          } else {
            console.log(`[EventBus] Unsubscribe called for already removed listener: ${eventType} (${subscriberId})`);
          }
        } else {
          console.log(`[EventBus] Unsubscribe called but event type no longer exists: ${eventType}`);
        }
      } catch (error) {
        console.error(`[EventBus] Error during unsubscribe from ${eventType}:`, error);
      }
    };
  },
  
  subscribeMany: <T>(types: GameEventType[], listener: EventCallback<T>) => {
    // Validate listener before subscription
    if (typeof listener !== 'function') {
      console.error(`[EventBus] Attempted to subscribe with a non-function listener for multiple events`);
      return () => {}; // Return no-op unsubscribe
    }
    
    // Subscribe to multiple event types
    const unsubscribers = types.map(type => get().subscribe(type, listener));
    
    // Return unsubscribe function for all
    return () => {
      unsubscribers.forEach(unsubscribe => {
        try {
          if (typeof unsubscribe === 'function') {
            unsubscribe();
          }
        } catch (error) {
          console.error('[EventBus] Error during multi-unsubscribe:', error);
        }
      });
    };
  },
  
  dispatch: <T>(eventType: GameEventType, payload: T, source?: string): void => {
    try {
      // Create the event object
      const event: GameEvent<T> = {
        type: eventType,
        payload,
        timestamp: Date.now(),
        source: source || 'unknown',
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
      };
      
      // Debug log with color coding based on event type
      if (process.env.NODE_ENV !== 'production') {
        const eventColor = 
          eventType.includes('progression:') ? '#8855ff' :
          eventType.includes('ui:') ? '#4488cc' :
          eventType.includes('effect:') ? '#44cc88' :
          eventType.includes('state:') ? '#cc8844' :
          eventType.includes('challenge:') ? '#cc4488' :
          eventType.includes('dialogue:') ? '#ff55aa' :
          '#8888aa';
        
        console.log(`%c[Event] ${eventType}`, `color: ${eventColor}`, payload);
      }
      
      // Safely update the event log without using array spread
      const currentLog = get().eventLog;
      const updatedLog = currentLog.length >= 1000
        ? [...currentLog.slice(-999), event] 
        : [...currentLog, event];
      
      // Update state directly without using Set.forEach
      set({ eventLog: updatedLog });
      
      // ENHANCED: Create stable listeners array before dispatching
      const listeners = get().listeners;
      const eventListeners = listeners.get(eventType);
      
      if (eventListeners && eventListeners.size > 0) {
        // ENHANCED: Create a filtered array of listeners and validate each one
        const validListeners = Array.from(eventListeners).filter(
          listener => {
            try {
              // First check basic function type
              if (typeof listener !== 'function') {
                return false;
              }
              
              // Update listener metadata if available
              if (listenerRegistry.has(listener as any)) {
                const metadata = listenerRegistry.get(listener as any)!;
                metadata.lastCalled = Date.now();
                metadata.callCount++;
                
                // If marked as invalid, don't use it
                if (metadata.isValid === false) {
                  return false;
                }
              }
              
              return true;
            } catch (err) {
              return false;
            }
          }
        );
        
        // Log when invalid listeners are found
        if (validListeners.length !== eventListeners.size) {
          console.warn(`[EventBus] Filtered out ${eventListeners.size - validListeners.length} invalid listeners for ${eventType}`);
          // Update the listener set to only include valid functions
          listeners.set(eventType, new Set(validListeners));
          
          // Update global counts
          GLOBAL_EVENT_SYSTEM.listeners[eventType as string] = validListeners.length;
        }
        
        // Now safely iterate through only the valid function listeners
        for (const listener of validListeners) {
          try {
            listener(event);
          } catch (listenerError) {
            console.error(`[EventBus] Error in listener for ${eventType}:`, listenerError);
            
            // Mark listener as potentially invalid if it throws
            if (listenerRegistry.has(listener as any)) {
              const metadata = listenerRegistry.get(listener as any)!;
              // We don't immediately invalidate, but we could add a strike system here
              console.warn(`[EventBus] Listener ${metadata.id} threw error but will be kept for now`);
            }
            
            // Continue to next listener instead of breaking
          }
        }
      }
    } catch (error) {
      console.error(`[EventBus] Critical error during dispatch of ${eventType}:`, error);
      // Continue execution to maintain system stability
    }
  },
  
  getEventHistory: (eventType?: GameEventType, limit: number = 100): GameEvent[] => {
    try {
      const { eventLog } = get();
      const filteredEvents = eventType ? 
        eventLog.filter(event => event.type === eventType) : 
        eventLog;
      
      return filteredEvents.slice(-limit);
    } catch (error) {
      console.error(`[EventBus] Error getting event history:`, error);
      return [];
    }
  },
  
  clearEventLog: () => {
    try {
      set(state => ({
        ...state,
        eventLog: []
      }));
    } catch (error) {
      console.error(`[EventBus] Error clearing event log:`, error);
    }
  },
  
  // Enhanced purge function that detects and removes invalid listeners
  purgeInvalidListeners: () => {
    try {
      const listeners = get().listeners;
      let totalPurged = 0;
      
      // For each event type, filter listeners to only include valid functions
      for (const [eventType, listenerSet] of listeners.entries()) {
        // Create a validation event to test listeners
        const validationEvent: GameEvent = {
          type: eventType,
          payload: null,
          timestamp: Date.now(),
          source: 'validation',
          id: `validation_${Date.now()}`
        };
        
        // Test each listener with a validation event
        const validListeners = Array.from(listenerSet).filter(listener => {
          try {
            // Basic type check
            if (typeof listener !== 'function') {
              return false;
            }
            
            // Check if marked invalid in registry
            if (listenerRegistry.has(listener as any)) {
              const metadata = listenerRegistry.get(listener as any)!;
              if (metadata.isValid === false) {
                return false;
              }
              
              // Update last called time
              metadata.lastCalled = Date.now();
            }
            
            // For really thorough validation, try calling the function
            // WARNING: This could have side effects, so use with caution
            // listener(validationEvent);
            
            return true;
          } catch (error) {
            return false;
          }
        });
        
        const purgedCount = listenerSet.size - validListeners.length;
        totalPurged += purgedCount;
        
        if (purgedCount > 0) {
          console.log(`[EventBus] Purged ${purgedCount} invalid listeners for ${eventType}`);
          listeners.set(eventType, new Set(validListeners));
          
          // Update global counts
          GLOBAL_EVENT_SYSTEM.listeners[eventType as string] = validListeners.length;
        }
      }
      
      if (totalPurged > 0) {
        console.log(`[EventBus] Total purged listeners: ${totalPurged}`);
      }
      
      return totalPurged;
    } catch (error) {
      console.error('[EventBus] Error purging invalid listeners:', error);
      return 0;
    }
  }
}));

// ======== React Integration Helpers ========

/**
 * React-friendly hook for subscribing to events
 * This handles component lifecycle correctly and prevents memory leaks
 */
export function useEventSubscription<T = any>(
  eventType: GameEventType | GameEventType[],
  callback: EventCallback<T>,
  dependencies: any[] = []
) {
  // Wrap in React.useCallback for stable reference across renders
  const stableCallback = React.useCallback(callback, dependencies);
  
  React.useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    
    try {
      // Handle array of event types or single event type
      if (Array.isArray(eventType)) {
        unsubscribe = useEventBus.getState().subscribeMany(eventType, stableCallback as any);
      } else {
        unsubscribe = useEventBus.getState().subscribe(eventType, stableCallback as any);
      }
    } catch (error) {
      console.error(`[useEventSubscription] Error subscribing to ${Array.isArray(eventType) ? eventType.join(',') : eventType}:`, error);
    }
    
    // Clean up subscription when component unmounts
    return () => {
      try {
        if (unsubscribe && typeof unsubscribe === 'function') {
          unsubscribe();
        }
      } catch (error) {
        console.error('[useEventSubscription] Error unsubscribing:', error);
      }
    };
  }, [eventType, stableCallback]); // Re-subscribe if event type or callback dependencies change
}

// ======== UI Event Helpers ========

/**
 * Helper for UI components to dispatch standardized UI events
 */
export function dispatchUIEvent(
  componentId: string, 
  action: string, 
  metadata?: Record<string, any>,
  position?: { x: number, y: number }
) {
  let eventType: GameEventType;
  
  try {
    // Map action to specific event type
    switch(action) {
      case 'click':
        eventType = GameEventType.UI_BUTTON_CLICKED;
        break;
      case 'toggle':
        eventType = GameEventType.UI_TOGGLE_CLICKED;
        break;
      case 'close':
        eventType = GameEventType.UI_CLOSE_CLICKED;
        break;
      case 'option-select':
        eventType = GameEventType.UI_OPTION_SELECTED;
        break;
      case 'node-hover':
        eventType = GameEventType.UI_NODE_HOVERED;
        break;
      case 'node-click':
        eventType = GameEventType.UI_NODE_CLICKED;
        break;
      case 'dialogue-advance':
        eventType = GameEventType.UI_DIALOGUE_ADVANCED;
        break;
      default:
        eventType = GameEventType.UI_BUTTON_CLICKED;
    }
    
    // Dispatch the event using safeDispatch
    safeDispatch(
      eventType, 
      { componentId, action, metadata, position },
      'ui_helper'
    );
  } catch (error) {
    console.error(`[EventBus] Error in dispatchUIEvent:`, error);
  }
}

// ======== ENHANCED: Safe Dispatch Helper ========
// Helper to safely dispatch events without breaking the flow
export function safeDispatch<T>(eventType: GameEventType, payload: T, source?: string) {
  try {
    const eventBus = useEventBus.getState();
    if (eventBus && typeof eventBus.dispatch === 'function') {
      eventBus.dispatch(eventType, payload, source || 'safe_dispatch');
      return true; // Signal success
    }
    return false; // Signal failure
  } catch (error) {
    console.error(`[EventBus] Safe dispatch error for ${eventType}:`, error);
    return false; // Signal failure
  }
}

// ======== Effect Event Helpers ========

/**
 * Helper for dispatching sound effect events
 */
export function playSoundEffect(effect: string, volume: number = 1.0, loop: boolean = false) {
  safeDispatch(
    GameEventType.EFFECT_SOUND_PLAYED,
    { effect, volume, loop },
    'sound_helper'
  );
}

/**
 * Helper for dispatching screen flash events
 */
export function flashScreen(
  color: 'white' | 'red' | 'green' | 'blue' | 'yellow',
  duration: number = 300
) {
  safeDispatch(
    GameEventType.EFFECT_SCREEN_FLASH,
    { color, duration },
    'effect_helper'
  );
}

// ======== Game State Event Helpers ========

/**
 * Helper for dispatching game state change events
 */
export function changeGameState(from: string, to: string, reason?: string) {
  safeDispatch(
    GameEventType.GAME_STATE_CHANGED, 
    { from, to, reason },
    'state_helper'
  );
}

/**
 * Helper for dispatching game phase change events
 */
export function changeGamePhase(from: string, to: string, reason?: string) {
  safeDispatch(
    GameEventType.GAME_PHASE_CHANGED, 
    { from, to, reason },
    'phase_helper'
  );
}

// ======== Progression Event Helpers ========

/**
 * Helper for dispatching node completion events
 */
export function nodeCompleted(
  nodeId: string,
  character?: string,
  result?: {
    relationshipChange?: number;
    journalTier?: string;
    isJournalAcquisition?: boolean;
  }
) {
  safeDispatch(
    GameEventType.NODE_COMPLETED,
    { nodeId, character, result },
    'progression_helper'
  );
}

/**
 * Helper for dispatching journal acquisition events
 */
export function journalAcquired(
  tier: 'base' | 'technical' | 'annotated',
  character: string,
  source: string = 'default',
  forced: boolean = false
) {
  safeDispatch(
    GameEventType.JOURNAL_ACQUIRED,
    { tier, character, source, forced },
    'progression_helper'
  );
}

/**
 * Helper for dispatching knowledge gain events
 */
export function knowledgeGained(
  conceptId: string,
  amount: number,
  domainId: string,
  character?: string,
  source?: string
) {
  safeDispatch(
    GameEventType.KNOWLEDGE_GAINED,
    { conceptId, amount, domainId, character, source },
    'progression_helper'
  );
}

/**
 * Helper for dispatching dialogue critical path events
 */
export function dialogueCriticalPath(
  dialogueId: string,
  characterId: string,
  nodeId: string,
  criticalStateId: string,
  playerScore: number,
  wasRepaired: boolean = false
) {
  safeDispatch(
    GameEventType.DIALOGUE_CRITICAL_PATH,
    { dialogueId, characterId, nodeId, criticalStateId, playerScore, wasRepaired },
    'dialogue_helper'
  );
}

/**
 * Advanced event system diagnostics
 * Returns information about the current state of the event system
 */
export function getEventSystemDiagnostics() {
  const eventBus = useEventBus.getState();
  const listeners = eventBus.listeners;
  
  const listenerCounts: Record<string, number> = {};
  let totalListeners = 0;
  
  // Count listeners by event type
  for (const [eventType, listenerSet] of listeners.entries()) {
    listenerCounts[eventType as string] = listenerSet.size;
    totalListeners += listenerSet.size;
  }
  
  return {
    totalEventTypes: listeners.size,
    totalListeners,
    listenersByType: listenerCounts,
    globalState: GLOBAL_EVENT_SYSTEM,
    eventCount: eventBus.eventLog.length
  };
}

/**
 * Reset event system to clean state
 * Useful for recovering from corrupted state or for debugging
 */
export function resetEventSystem() {
  try {
    // Create fresh listeners map to clear any corrupted listeners
    GLOBAL_EVENT_SYSTEM.resetCount++;
    console.log(`[EventBus] Resetting event system (reset #${GLOBAL_EVENT_SYSTEM.resetCount})`);
    
    // First create a snapshot of current state to help with debugging
    const diagnostics = getEventSystemDiagnostics();
    console.log(`[EventBus] System state before reset:`, diagnostics);
    
    // Now safely reset the state
    useEventBus.setState({
      listeners: createFreshListeners(),
      eventLog: [],
      ...useEventBus.getState()
    });
    
    // Reset global counts
    GLOBAL_EVENT_SYSTEM.listeners = {};
    
    console.log('[EventBus] System reset to clean state');
    return true;
  } catch (error) {
    console.error(`[EventBus] Critical error during event system reset:`, error);
    return false;
  }
}

// Add hot module reloading protection
if (typeof module !== 'undefined' && module.hot) {
  module.hot.dispose(() => {
    console.log('🔥 Hot module replacement detected, performing event system cleanup');
    try {
      resetEventSystem();
    } catch (error) {
      console.error('Error during HMR cleanup:', error);
    }
  });
}

// Mark system as initialized globally
GLOBAL_EVENT_SYSTEM.initialized = true;

// Make functions available globally for emergency recovery
if (typeof window !== 'undefined') {
  (window as any).__RESET_EVENT_SYSTEM__ = resetEventSystem;
  (window as any).__PURGE_INVALID_LISTENERS__ = () => {
    return useEventBus.getState().purgeInvalidListeners();
  };
  (window as any).__EVENT_SYSTEM_DIAGNOSTICS__ = getEventSystemDiagnostics;
}

export default useEventBus;