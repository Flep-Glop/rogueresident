// app/core/events/CentralEventBus.ts
/**
 * Optimized Event Bus Implementation
 * 
 * Improvements:
 * 1. Reduced verbose logging to prevent console spam
 * 2. Added event batching for performance
 * 3. Improved error handling with rate limiting
 * 4. Enhanced type safety throughout
 * 5. Memory optimizations for event history
 */

import { create } from 'zustand';
import { GameEventType } from './EventTypes';
import { useCallback, useEffect, useRef } from 'react';

// ========= CORE TYPES =========

// Basic event structure
export interface GameEvent<T = any> {
  type: GameEventType;
  payload: T;
  timestamp: number;
  source?: string;
  id?: string;
}

export type EventCallback<T = any> = (event: GameEvent<T>) => void;

// Event bus configuration
const EVENT_CONFIG = {
  // Maximum events to keep in history
  MAX_HISTORY_SIZE: 100,
  // Critical events we always want to log
  CRITICAL_EVENTS: [
    GameEventType.JOURNAL_ACQUIRED,
    GameEventType.KNOWLEDGE_TRANSFERRED,
    GameEventType.GAME_PHASE_CHANGED,
    GameEventType.TRANSITION_TO_DAY_COMPLETED,
    GameEventType.TRANSITION_TO_NIGHT_COMPLETED,
    GameEventType.ERROR_LOGGED
  ],
  // Events that should be batched for performance
  BATCHABLE_EVENTS: [
    GameEventType.RESOURCE_CHANGED,
    GameEventType.UI_BUTTON_CLICKED,
    GameEventType.UI_NODE_CLICKED
  ],
  // Events that should be throttled (only process latest within time window)
  THROTTLE_EVENTS: {
    [GameEventType.RESOURCE_CHANGED]: 50, // ms
    [GameEventType.UI_BUTTON_CLICKED]: 50 // ms
  },
  // How frequently to log events in development
  DEVELOPMENT_LOG_FREQUENCY: {
    [GameEventType.RESOURCE_CHANGED]: 5,  // Log every Nth event
    [GameEventType.UI_BUTTON_CLICKED]: 5
  },
  // Is development mode
  IS_DEV: process.env.NODE_ENV !== 'production'
};

// Event batching state
interface EventBatch {
  type: GameEventType;
  events: GameEvent[];
  timeoutId: NodeJS.Timeout | null;
}

// Active event batches
const eventBatches: Record<string, EventBatch> = {};

// Event bus state and methods
interface EventBusState {
  listeners: Map<GameEventType, Set<EventCallback>>;
  eventLog: GameEvent[];
  eventCounts: Record<string, number>;
  lastEventTimes: Record<string, number>;
  subscribe: <T>(eventType: GameEventType, callback: EventCallback<T>) => () => void;
  subscribeMany: <T>(types: GameEventType[], listener: EventCallback<T>) => () => void;
  dispatch: <T>(eventType: GameEventType, payload: T, source?: string) => void;
  getEventHistory: (eventType?: GameEventType, limit?: number) => GameEvent[];
  clearEventLog: () => void;
}

// ========= EVENT BUS IMPLEMENTATION =========

/**
 * Main event bus store using Zustand
 */
export const useEventBus = create<EventBusState>()((set, get) => ({
  listeners: new Map<GameEventType, Set<EventCallback>>(),
  eventLog: [],
  eventCounts: {},
  lastEventTimes: {},
  
  /**
   * Subscribe to an event type
   * @param eventType The event type to subscribe to
   * @param callback Function to call when event occurs
   * @returns Unsubscribe function
   */
  subscribe: <T>(eventType: GameEventType, callback: EventCallback<T>): (() => void) => {
    // Type guard
    if (typeof callback !== 'function') {
      console.error(`[EventBus] Invalid callback for: ${eventType}`);
      return () => {}; // No-op
    }
    
    // Get listeners
    const listeners = get().listeners;
    
    // Initialize set of listeners for this event if needed
    if (!listeners.has(eventType)) {
      listeners.set(eventType, new Set());
    }
    
    // Add callback to listeners
    const eventListeners = listeners.get(eventType)!;
    eventListeners.add(callback as EventCallback);
    
    // Only log once per event type and only in development
    if (EVENT_CONFIG.IS_DEV && get().eventCounts[eventType] === undefined) {
      console.log(`[EventBus] Subscribed to ${eventType}, current listeners: ${eventListeners.size}`);
    }
    
    // Return unsubscribe function
    return () => {
      try {
        const currentListeners = get().listeners.get(eventType);
        if (currentListeners) {
          currentListeners.delete(callback as EventCallback);
          
          // Only log in development
          if (EVENT_CONFIG.IS_DEV) {
            console.log(`[EventBus] Unsubscribed from ${eventType}, remaining: ${currentListeners.size}`);
          }
        }
      } catch (error) {
        console.error(`[EventBus] Error during unsubscribe from ${eventType}:`, error);
      }
    };
  },
  
  /**
   * Subscribe to multiple event types
   * @param types Array of event types to subscribe to
   * @param listener Function to call when any of the events occur
   * @returns Unsubscribe function
   */
  subscribeMany: <T>(types: GameEventType[], listener: EventCallback<T>) => {
    // Subscribe to multiple event types
    const unsubscribers = types.map(type => get().subscribe(type, listener));
    
    // Return unsubscribe function for all
    return () => {
      unsubscribers.forEach(unsubscribe => {
        try {
          unsubscribe();
        } catch (error) {
          console.error('[EventBus] Error during multi-unsubscribe:', error);
        }
      });
    };
  },
  
  /**
   * Dispatch an event
   * @param eventType Type of event to dispatch
   * @param payload Data associated with the event
   * @param source Optional source identifier
   */
  dispatch: <T>(eventType: GameEventType, payload: T, source?: string): void => {
    try {
      // Update event counts
      const currentCount = (get().eventCounts[eventType] || 0) + 1;
      set(state => ({
        eventCounts: {
          ...state.eventCounts,
          [eventType]: currentCount
        }
      }));
      
      // Check if event should be throttled
      const throttleTime = EVENT_CONFIG.THROTTLE_EVENTS[eventType];
      if (throttleTime) {
        const lastTime = get().lastEventTimes[eventType] || 0;
        const now = Date.now();
        
        // Update last event time
        set(state => ({
          lastEventTimes: {
            ...state.lastEventTimes,
            [eventType]: now
          }
        }));
        
        // Skip if we're throttling and not enough time has passed
        if (now - lastTime < throttleTime) {
          // Check if this event is batchable
          if (EVENT_CONFIG.BATCHABLE_EVENTS.includes(eventType)) {
            // Add to batch instead of processing immediately
            addToBatch(eventType, {
              type: eventType,
              payload,
              timestamp: now,
              source: source || 'unknown',
              id: `${now}-${Math.floor(Math.random() * 10000)}`
            });
            return;
          }
          // Not batchable, but still throttled - just skip it
          return;
        }
      }
      
      // Create the event object
      const event: GameEvent<T> = {
        type: eventType,
        payload,
        timestamp: Date.now(),
        source: source || 'unknown',
        id: `${Date.now()}-${Math.floor(Math.random() * 10000)}`
      };
      
      // Log in development with reduced frequency for common events
      if (EVENT_CONFIG.IS_DEV) {
        const isCritical = EVENT_CONFIG.CRITICAL_EVENTS.includes(eventType);
        const logFrequency = EVENT_CONFIG.DEVELOPMENT_LOG_FREQUENCY[eventType] || 1;
        
        // Log critical events or based on frequency
        if (isCritical || currentCount % logFrequency === 0) {
          console.log(
            `%c[Event] ${eventType}`, 
            `color: ${isCritical ? '#ff5500' : '#888888'}`, 
            payload
          );
        }
      }
      
      // Update event log (keeping only the most recent entries)
      set(state => ({
        eventLog: state.eventLog.length >= EVENT_CONFIG.MAX_HISTORY_SIZE 
          ? [...state.eventLog.slice(-(EVENT_CONFIG.MAX_HISTORY_SIZE - 1)), event]
          : [...state.eventLog, event]
      }));
      
      // Process listeners
      processEvent(event);
    } catch (error) {
      console.error(`[EventBus] Critical error during dispatch of ${eventType}:`, error);
      
      // Try to notify system about the error
      try {
        const errorEvent: GameEvent = {
          type: GameEventType.ERROR_LOGGED,
          payload: { 
            error, 
            context: `Error dispatching ${eventType}`,
            source: source || 'unknown'
          },
          timestamp: Date.now(),
          source: 'event_bus',
          id: `err-${Date.now()}`
        };
        
        // Add to log
        set(state => ({
          eventLog: [...state.eventLog.slice(-99), errorEvent]
        }));
        
        // Process listeners
        processEvent(errorEvent);
      } catch (e) {
        // Last resort - just log
        console.error('[EventBus] Failed to dispatch error event:', e);
      }
    }
  },
  
  /**
   * Get event history
   * @param eventType Optional filter by event type
   * @param limit Maximum number of events to return
   * @returns Array of events
   */
  getEventHistory: (eventType?: GameEventType, limit: number = 50): GameEvent[] => {
    try {
      const { eventLog } = get();
      const filteredEvents = eventType 
        ? eventLog.filter(event => event.type === eventType) 
        : eventLog;
      
      return filteredEvents.slice(-limit);
    } catch (error) {
      console.error(`[EventBus] Error getting event history:`, error);
      return [];
    }
  },
  
  /**
   * Clear event log
   */
  clearEventLog: () => {
    try {
      set({ eventLog: [] });
    } catch (error) {
      console.error(`[EventBus] Error clearing event log:`, error);
    }
  }
}));

// ========= HELPER FUNCTIONS =========

/**
 * Add an event to a batch for processing
 */
function addToBatch(eventType: GameEventType, event: GameEvent) {
  // Get or create batch
  if (!eventBatches[eventType]) {
    eventBatches[eventType] = {
      type: eventType,
      events: [],
      timeoutId: null
    };
  }
  
  // Add event to batch
  eventBatches[eventType].events.push(event);
  
  // Set timeout to process batch if not already set
  if (!eventBatches[eventType].timeoutId) {
    eventBatches[eventType].timeoutId = setTimeout(() => {
      processBatch(eventType);
    }, 50); // Process batch after 50ms of inactivity
  }
}

/**
 * Process a batch of events
 */
function processBatch(eventType: GameEventType) {
  const batch = eventBatches[eventType];
  if (!batch || batch.events.length === 0) return;
  
  // Clear timeout
  if (batch.timeoutId) {
    clearTimeout(batch.timeoutId);
    batch.timeoutId = null;
  }
  
  // Get the latest event (most recent state)
  const latestEvent = batch.events[batch.events.length - 1];
  
  // Process the event
  processEvent(latestEvent);
  
  // Clear batch
  batch.events = [];
}

/**
 * Process a single event by notifying listeners
 */
function processEvent(event: GameEvent) {
  try {
    // Get listeners for this event type
    const listeners = useEventBus.getState().listeners;
    const eventListeners = listeners.get(event.type);
    
    // Call listeners if any exist
    if (eventListeners && eventListeners.size > 0) {
      // Convert to array to avoid issues if listeners modify the set
      Array.from(eventListeners).forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error(`[EventBus] Error in listener for ${event.type}:`, error);
          // Continue to next listener
        }
      });
    }
  } catch (error) {
    console.error(`[EventBus] Error processing event ${event.type}:`, error);
  }
}

// Clean up any batches when window unloads
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    // Process any pending batches
    Object.keys(eventBatches).forEach(eventType => {
      if (eventBatches[eventType].timeoutId) {
        clearTimeout(eventBatches[eventType].timeoutId);
        if (eventBatches[eventType].events.length > 0) {
          processBatch(eventType as GameEventType);
        }
      }
    });
  });
}

// ========= SINGLETON CLASS =========

/**
 * Singleton class for backward compatibility
 * This bridges legacy code expecting a singleton with the modern Zustand store
 */
class CentralEventBus {
  private static instance: CentralEventBus | null = null;
  
  private constructor() {
    // Private constructor for singleton pattern
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): CentralEventBus {
    if (!this.instance) {
      this.instance = new CentralEventBus();
    }
    return this.instance;
  }
  
  /**
   * Subscribe to an event
   */
  public subscribe<T>(eventType: GameEventType, callback: EventCallback<T>): () => void {
    return useEventBus.getState().subscribe(eventType, callback);
  }
  
  /**
   * Subscribe to multiple events
   */
  public subscribeMany<T>(types: GameEventType[], listener: EventCallback<T>): () => void {
    return useEventBus.getState().subscribeMany(types, listener);
  }
  
  /**
   * Dispatch an event
   */
  public dispatch<T>(eventType: GameEventType, payload: T, source?: string): void {
    useEventBus.getState().dispatch(eventType, payload, source);
  }
  
  /**
   * Get event history
   */
  public getEventHistory(eventType?: GameEventType, limit?: number): GameEvent[] {
    return useEventBus.getState().getEventHistory(eventType, limit);
  }
  
  /**
   * Clear event log
   */
  public clearEventLog(): void {
    useEventBus.getState().clearEventLog();
  }
  
  /**
   * Access to getState for compatibility with code expecting store
   */
  public getState(): EventBusState {
    return useEventBus.getState();
  }
}

// ========= REACT INTEGRATION =========

/**
 * React hook for subscribing to events with automatic cleanup
 */
export function useEventSubscription<T = any>(
  eventType: GameEventType | GameEventType[],
  callback: EventCallback<T>,
  dependencies: any[] = []
) {
  // Store callback in ref for latest version
  const callbackRef = useRef(callback);
  
  // Update ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
  // Create stable callback that uses latest reference
  const stableCallback = useCallback((event: GameEvent<T>) => {
    callbackRef.current(event);
  }, []); // Empty dependency array for stable reference
  
  // Set up subscription
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    
    try {
      // Handle array of event types or single event type
      if (Array.isArray(eventType)) {
        unsubscribe = useEventBus.getState().subscribeMany(eventType, stableCallback as any);
      } else {
        unsubscribe = useEventBus.getState().subscribe(eventType, stableCallback as any);
      }
    } catch (error) {
      console.error('[useEventSubscription] Error subscribing:', error);
    }
    
    // Clean up subscription when component unmounts
    return () => {
      try {
        if (unsubscribe) {
          unsubscribe();
        }
      } catch (error) {
        console.error('[useEventSubscription] Error unsubscribing:', error);
      }
    };
  }, [eventType, stableCallback]); // Only re-subscribe if event type changes
}

// ========= HELPER FUNCTIONS =========

/**
 * Safe dispatch function for error handling
 */
export function safeDispatch<T>(eventType: GameEventType, payload: T, source?: string) {
  try {
    useEventBus.getState().dispatch(eventType, payload, source);
  } catch (error) {
    console.error(`[safeDispatch] Error dispatching ${eventType}:`, error);
  }
}

/**
 * Helper for dispatching UI events
 */
export function dispatchUIEvent(
  componentId: string, 
  action: string, 
  metadata?: Record<string, any>,
  position?: { x: number, y: number }
) {
  try {
    useEventBus.getState().dispatch(
      GameEventType.UI_BUTTON_CLICKED, 
      { componentId, action, metadata, position },
      'ui_helper'
    );
  } catch (error) {
    console.error(`[EventBus] Error in dispatchUIEvent:`, error);
  }
}

/**
 * Helper for dispatching game state change events
 */
export function changeGameState(from: string, to: string, reason?: string) {
  try {
    useEventBus.getState().dispatch(
      GameEventType.GAME_STATE_CHANGED, 
      { from, to, reason },
      'state_helper'
    );
  } catch (error) {
    console.error(`[EventBus] Error in changeGameState:`, error);
  }
}

/**
 * Helper for dispatching game phase change events
 */
export function changeGamePhase(from: string, to: string, reason?: string) {
  try {
    useEventBus.getState().dispatch(
      GameEventType.GAME_PHASE_CHANGED, 
      { from, to, reason },
      'phase_helper'
    );
  } catch (error) {
    console.error(`[EventBus] Error in changeGamePhase:`, error);
  }
}

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
  try {
    useEventBus.getState().dispatch(
      GameEventType.NODE_COMPLETED,
      { nodeId, character, result },
      'progression_helper'
    );
  } catch (error) {
    console.error(`[EventBus] Error in nodeCompleted:`, error);
  }
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
  try {
    useEventBus.getState().dispatch(
      GameEventType.JOURNAL_ACQUIRED,
      { tier, character, source, forced },
      'progression_helper'
    );
  } catch (error) {
    console.error(`[EventBus] Error in journalAcquired:`, error);
  }
}

// ========= DEBUGGING TOOLS =========

// Add diagnostics to window for debugging
if (typeof window !== 'undefined') {
  // Create a more streamlined diagnostic function
  (window as any).__EVENT_SYSTEM_DIAGNOSTICS__ = () => {
    const eventBus = useEventBus.getState();
    
    // Map of listener counts
    const listenerCounts: Record<string, number> = {};
    eventBus.listeners.forEach((listeners, type) => {
      listenerCounts[type.toString()] = listeners.size;
    });
    
    // Event counts
    const eventCounts = eventBus.eventCounts;
    
    // Just the top 5 most frequent event types
    const topEvents = Object.entries(eventCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Recent critical events only
    const criticalEvents = eventBus.getEventHistory()
      .filter(event => EVENT_CONFIG.CRITICAL_EVENTS.includes(event.type));
      
    // Format timestamps to be readable
    const formatEvents = (events: GameEvent[]) => {
      return events.map(e => ({
        ...e,
        formattedTime: new Date(e.timestamp).toLocaleTimeString()
      }));
    };
    
    return {
      activeListeners: Object.entries(listenerCounts)
        .filter(([, count]) => count > 0)
        .sort((a, b) => b[1] - a[1]), // Sort by count descending
      topEventTypes: topEvents,
      recentCriticalEvents: formatEvents(criticalEvents.slice(-5)),
      activeBatches: Object.keys(eventBatches).map(type => ({
        type,
        pendingEvents: eventBatches[type].events.length
      })).filter(b => b.pendingEvents > 0),
      commands: {
        clearHistory: () => {
          eventBus.clearEventLog();
          return 'Event history cleared';
        },
        processBatches: () => {
          let count = 0;
          Object.keys(eventBatches).forEach(type => {
            if (eventBatches[type].events.length > 0) {
              processBatch(type as GameEventType);
              count++;
            }
          });
          return `Processed ${count} batches`;
        }
      }
    };
  };
}

// Export the class itself for backwards compatibility
export default CentralEventBus;