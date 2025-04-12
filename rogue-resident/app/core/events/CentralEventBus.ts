// app/core/events/CentralEventBus.ts
/**
 * Optimized Event Bus Implementation
 * 
 * Improvements:
 * 1. Improved resilience with self-recovery
 * 2. Better error handling with detailed stack traces
 * 3. Explicit debugging with control flags
 * 4. Memory optimizations for large-scale applications
 * 5. Proper TypeScript typings for all event types
 * 6. Startup resilience testing
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

// ========= CONFIGURATION =========

// Event bus configuration
const EVENT_CONFIG = {
  // Maximum events to keep in history
  MAX_HISTORY_SIZE: 100,
  
  // Critical events that are high priority
  CRITICAL_EVENTS: [
    GameEventType.JOURNAL_ACQUIRED,
    GameEventType.KNOWLEDGE_TRANSFERRED,
    GameEventType.GAME_PHASE_CHANGED,
    GameEventType.TRANSITION_TO_DAY_COMPLETED,
    GameEventType.TRANSITION_TO_NIGHT_COMPLETED,
    GameEventType.ERROR_LOGGED,
    GameEventType.UI_NODE_CLICKED,       
    GameEventType.UI_NODE_SELECTED,
    GameEventType.SYSTEM_INITIALIZED
  ],
  
  // Events that can be batched for performance
  BATCHABLE_EVENTS: [
    GameEventType.RESOURCE_CHANGED,
    GameEventType.UI_BUTTON_CLICKED,
    // Removed UI_NODE_CLICKED from batching to ensure immediate processing
  ],
  
  // Events that need synchronous processing (never batched)
  SYNCHRONOUS_EVENTS: [
    GameEventType.UI_NODE_CLICKED,
    GameEventType.UI_NODE_SELECTED,
    GameEventType.KNOWLEDGE_CONNECTION_CREATED,
    GameEventType.SYSTEM_INITIALIZED
  ],
  
  // Development mode detection
  IS_DEV: process.env.NODE_ENV !== 'production',
  
  // Debug levels
  DEBUG_LEVEL: {
    NONE: 0,
    ERROR: 1,
    WARN: 2,
    INFO: 3,
    VERBOSE: 4
  },
  
  // Current debug level - adjust as needed
  CURRENT_DEBUG_LEVEL: process.env.NODE_ENV !== 'production' ? 2 : 1,
  
  // Self-test parameters
  SELF_TEST_ENABLED: true,
  SELF_TEST_TIMEOUT: 250, // ms
  SELF_TEST_RETRY_COUNT: 2,
  
  // Error recovery
  MAX_DISPATCH_ERRORS: 5,
  ERROR_RESET_INTERVAL: 30000 // 30 seconds
};

// ========= INTERNAL STATE TRACKING =========

// Track dispatch errors for resilience
let dispatchErrorCount = 0;
let lastErrorResetTime = Date.now();
let selfTestRetryCount = 0;
let eventBusReadyState = false;

// ========= BATCHING SYSTEM =========

// Simplified batching that prioritizes reliability
interface EventBatch {
  type: GameEventType;
  events: GameEvent[];
  timeoutId: NodeJS.Timeout | null;
  lastProcessed: number;
}

// Active event batches
const eventBatches: Record<string, EventBatch> = {};

// Helper functions for logging
const logEvent = (level: number, message: string, ...args: any[]) => {
  if (level <= EVENT_CONFIG.CURRENT_DEBUG_LEVEL) {
    const styles = [
      'color: gray',                    // NONE (never used)
      'color: red; font-weight: bold',  // ERROR
      'color: orange',                  // WARN
      'color: blue',                    // INFO
      'color: purple'                   // VERBOSE
    ];
    console.log(`%c[EventBus] ${message}`, styles[level], ...args);
  }
};

// Event bus state and methods
interface EventBusState {
  listeners: Map<GameEventType, Set<EventCallback>>;
  eventLog: GameEvent[];
  eventCounts: Record<string, number>;
  subscribe: <T>(eventType: GameEventType, callback: EventCallback<T>) => () => void;
  subscribeMany: <T>(types: GameEventType[], listener: EventCallback<T>) => () => void;
  dispatch: <T>(eventType: GameEventType, payload: T, source?: string) => void;
  getEventHistory: (eventType?: GameEventType, limit?: number) => GameEvent[];
  clearEventLog: () => void;
  isReady: () => boolean;
}

// ========= EVENT BUS IMPLEMENTATION =========

/**
 * Main event bus store using Zustand
 */
export const useEventBus = create<EventBusState>()((set, get) => ({
  listeners: new Map<GameEventType, Set<EventCallback>>(),
  eventLog: [],
  eventCounts: {},
  
  /**
   * Subscribe to an event type
   * @param eventType The event type to subscribe to
   * @param callback Function to call when event occurs
   * @returns Unsubscribe function
   */
  subscribe: <T>(eventType: GameEventType, callback: EventCallback<T>): (() => void) => {
    // Validate inputs
    if (typeof callback !== 'function') {
      logEvent(EVENT_CONFIG.DEBUG_LEVEL.ERROR, `Invalid callback for: ${eventType}`);
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
    
    logEvent(EVENT_CONFIG.DEBUG_LEVEL.INFO, `Subscribed to ${eventType}, count: ${eventListeners.size}`);
    
    // Return unsubscribe function
    return () => {
      try {
        const currentListeners = get().listeners.get(eventType);
        if (currentListeners) {
          currentListeners.delete(callback as EventCallback);
          
          logEvent(EVENT_CONFIG.DEBUG_LEVEL.INFO, `Unsubscribed from ${eventType}, remaining: ${currentListeners.size}`);
        }
      } catch (error) {
        logEvent(EVENT_CONFIG.DEBUG_LEVEL.ERROR, `Error unsubscribing from ${eventType}:`, error);
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
          logEvent(EVENT_CONFIG.DEBUG_LEVEL.ERROR, `Error during multi-unsubscribe:`, error);
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
      // Check for error recovery
      const now = Date.now();
      if (now - lastErrorResetTime > EVENT_CONFIG.ERROR_RESET_INTERVAL) {
        dispatchErrorCount = 0;
        lastErrorResetTime = now;
      }
      
      // Check if we've had too many errors
      if (dispatchErrorCount > EVENT_CONFIG.MAX_DISPATCH_ERRORS) {
        // Don't log since this would create more errors
        return;
      }
      
      // Generate unique event ID
      const eventId = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      
      // Update event counts
      const currentCount = (get().eventCounts[eventType] || 0) + 1;
      set(state => ({
        eventCounts: {
          ...state.eventCounts,
          [eventType]: currentCount
        }
      }));
      
      // Create the event object
      const event: GameEvent<T> = {
        type: eventType,
        payload,
        timestamp: Date.now(),
        source: source || 'unknown',
        id: eventId
      };
      
      // Determine if this is a synchronous event that should never be batched
      const isSynchronous = EVENT_CONFIG.SYNCHRONOUS_EVENTS.includes(eventType);
      const isCritical = EVENT_CONFIG.CRITICAL_EVENTS.includes(eventType);
      const isBatchable = EVENT_CONFIG.BATCHABLE_EVENTS.includes(eventType) && !isSynchronous;
      
      // Log based on event importance - reduced logging in normal operation
      if ((isCritical || isSynchronous) && EVENT_CONFIG.CURRENT_DEBUG_LEVEL >= EVENT_CONFIG.DEBUG_LEVEL.INFO) {
        logEvent(EVENT_CONFIG.DEBUG_LEVEL.INFO, `🚨 ${eventType}`, payload);
      } else if (EVENT_CONFIG.CURRENT_DEBUG_LEVEL >= EVENT_CONFIG.DEBUG_LEVEL.VERBOSE) {
        logEvent(EVENT_CONFIG.DEBUG_LEVEL.VERBOSE, `📣 ${eventType}`, payload);
      }
      
      // Mark event bus as ready once we receive system initialized
      if (eventType === GameEventType.SYSTEM_INITIALIZED) {
        eventBusReadyState = true;
      }
      
      // Update event log (keeping only the most recent entries)
      set(state => ({
        eventLog: state.eventLog.length >= EVENT_CONFIG.MAX_HISTORY_SIZE 
          ? [...state.eventLog.slice(-(EVENT_CONFIG.MAX_HISTORY_SIZE - 1)), event]
          : [...state.eventLog, event]
      }));
      
      // Process immediately or batch
      if (isSynchronous) {
        // Process synchronous events immediately
        processEvent(event);
      } else if (isBatchable) {
        // Add to batch
        addToBatch(eventType, event);
      } else {
        // Standard async processing
        Promise.resolve().then(() => processEvent(event));
      }
    } catch (error) {
      dispatchErrorCount++;
      
      logEvent(
        EVENT_CONFIG.DEBUG_LEVEL.ERROR, 
        `Critical error during dispatch of ${eventType}:`,
        error
      );
      
      // Capture stack trace
      const stack = error instanceof Error ? error.stack : 'No stack trace';
      
      // Try to notify system about the error
      try {
        const errorEvent: GameEvent = {
          type: GameEventType.ERROR_LOGGED,
          payload: { 
            error, 
            stack,
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
        
        // Process error immediately - but don't try too hard if we're already having issues
        if (dispatchErrorCount < 3) {
          processEvent(errorEvent);
        }
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
      logEvent(EVENT_CONFIG.DEBUG_LEVEL.ERROR, `Error getting event history:`, error);
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
      logEvent(EVENT_CONFIG.DEBUG_LEVEL.ERROR, `Error clearing event log:`, error);
    }
  },
  
  /**
   * Check if event bus is ready
   */
  isReady: () => {
    return eventBusReadyState;
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
      timeoutId: null,
      lastProcessed: 0
    };
  }
  
  const batch = eventBatches[eventType];
  
  // Add event to batch
  batch.events.push(event);
  
  // Set timeout to process batch if not already set
  if (!batch.timeoutId) {
    batch.timeoutId = setTimeout(() => {
      processBatch(eventType);
    }, 50); // Process batch after 50ms of inactivity
  }
  
  // Safety check - if batch is getting too large, process immediately
  if (batch.events.length > 25) {
    if (batch.timeoutId) {
      clearTimeout(batch.timeoutId);
      batch.timeoutId = null;
    }
    processBatch(eventType);
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
  
  logEvent(EVENT_CONFIG.DEBUG_LEVEL.VERBOSE, `Processing batch of ${batch.events.length} ${eventType} events`);
  
  // Process only the latest event by default
  const eventsToProcess = [batch.events[batch.events.length - 1]];
  
  // Process the events
  eventsToProcess.forEach(event => {
    try {
      processEvent(event);
    } catch (error) {
      logEvent(EVENT_CONFIG.DEBUG_LEVEL.ERROR, `Error processing batched event ${event.type}:`, error);
    }
  });
  
  // Update last processed time
  batch.lastProcessed = Date.now();
  
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
          logEvent(
            EVENT_CONFIG.DEBUG_LEVEL.ERROR, 
            `Error in listener for ${event.type}:`, 
            error
          );
          // Continue to next listener
        }
      });
    } else if (EVENT_CONFIG.CRITICAL_EVENTS.includes(event.type)) {
      // Log warning for critical events with no listeners
      logEvent(
        EVENT_CONFIG.DEBUG_LEVEL.WARN, 
        `Critical event ${event.type} has no listeners!`,
        event.payload
      );
    }
  } catch (error) {
    logEvent(EVENT_CONFIG.DEBUG_LEVEL.ERROR, `Error processing event ${event.type}:`, error);
  }
}

/**
 * Run self-test to verify event bus is working properly
 */
function runSelfTest(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!EVENT_CONFIG.SELF_TEST_ENABLED) {
      resolve(true);
      return;
    }
    
    let selfTestComplete = false;
    let timeoutId: NodeJS.Timeout | null = null;
    
    logEvent(EVENT_CONFIG.DEBUG_LEVEL.INFO, 'Running EventBus self-test...');
    
    // Set up test listener
    const unsubscribe = useEventBus.getState().subscribe(
      GameEventType.SYSTEM_INITIALIZED,
      () => {
        if (selfTestComplete) return;
        
        selfTestComplete = true;
        if (timeoutId) clearTimeout(timeoutId);
        unsubscribe();
        
        logEvent(EVENT_CONFIG.DEBUG_LEVEL.INFO, 'EventBus self-test succeeded');
        resolve(true);
      }
    );
    
    // Set timeout for test failure
    timeoutId = setTimeout(() => {
      if (selfTestComplete) return;
      
      selfTestComplete = true;
      unsubscribe();
      
      // If we still have retry attempts, try again
      if (selfTestRetryCount < EVENT_CONFIG.SELF_TEST_RETRY_COUNT) {
        selfTestRetryCount++;
        logEvent(EVENT_CONFIG.DEBUG_LEVEL.WARN, `EventBus self-test failed, retrying (${selfTestRetryCount}/${EVENT_CONFIG.SELF_TEST_RETRY_COUNT})`);
        
        // Force reset event bus state before retry
        useEventBus.setState({ 
          listeners: new Map<GameEventType, Set<EventCallback>>(),
          eventLog: [],
          eventCounts: {}
        });
        
        // Try again
        runSelfTest().then(resolve);
      } else {
        logEvent(EVENT_CONFIG.DEBUG_LEVEL.ERROR, 'EventBus self-test failed after retries');
        resolve(false);
      }
    }, EVENT_CONFIG.SELF_TEST_TIMEOUT);
    
    // Dispatch test event
    try {
      useEventBus.getState().dispatch(
        GameEventType.SYSTEM_INITIALIZED,
        { component: 'eventBus', phase: 'self-test' },
        'self-test'
      );
    } catch (error) {
      logEvent(EVENT_CONFIG.DEBUG_LEVEL.ERROR, 'Error dispatching self-test event:', error);
      
      if (timeoutId) clearTimeout(timeoutId);
      selfTestComplete = true;
      unsubscribe();
      
      resolve(false);
    }
  });
}

// Process any pending batches when window unloads
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
  private static initComplete = false;
  private static initPromise: Promise<boolean> | null = null;
  
  private constructor() {
    // Private constructor for singleton pattern
    if (EVENT_CONFIG.IS_DEV) {
      console.log('[EventBus] Created singleton instance');
    }
    
    // Run self-test if not already complete
    if (!CentralEventBus.initComplete && !CentralEventBus.initPromise) {
      CentralEventBus.initPromise = runSelfTest().then(success => {
        CentralEventBus.initComplete = success;
        return success;
      });
    }
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): CentralEventBus {
    if (!this.instance) {
      this.instance = new CentralEventBus();
      
      // Schedule deferred self-test (if not already run)
      if (!this.initComplete && !this.initPromise) {
        setTimeout(() => {
          this.initPromise = runSelfTest().then(success => {
            this.initComplete = success;
            return success;
          });
        }, 50);
      }
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
  
  /**
   * Check if event bus is fully initialized and ready
   */
  public isReady(): boolean {
    return CentralEventBus.initComplete && useEventBus.getState().isReady();
  }
  
  /**
   * Wait for event bus to be fully initialized
   */
  public async waitForReady(timeout: number = 5000): Promise<boolean> {
    if (this.isReady()) return true;
    
    // If initialization is in progress, wait for it
    if (CentralEventBus.initPromise) {
      try {
        const timeoutPromise = new Promise<boolean>(resolve => {
          setTimeout(() => resolve(false), timeout);
        });
        
        return Promise.race([CentralEventBus.initPromise, timeoutPromise]);
      } catch (error) {
        logEvent(EVENT_CONFIG.DEBUG_LEVEL.ERROR, 'Error waiting for EventBus initialization:', error);
        return false;
      }
    }
    
    // Otherwise, start initialization
    CentralEventBus.initPromise = runSelfTest().then(success => {
      CentralEventBus.initComplete = success;
      return success;
    });
    
    return CentralEventBus.initPromise;
  }
  
  /**
   * Force a reset of the event bus state
   */
  public reset(): void {
    try {
      useEventBus.setState({ 
        listeners: new Map<GameEventType, Set<EventCallback>>(),
        eventLog: [],
        eventCounts: {}
      });
      
      CentralEventBus.initComplete = false;
      CentralEventBus.initPromise = null;
      selfTestRetryCount = 0;
      dispatchErrorCount = 0;
      lastErrorResetTime = Date.now();
      eventBusReadyState = false;
      
      // Run self-test
      CentralEventBus.initPromise = runSelfTest().then(success => {
        CentralEventBus.initComplete = success;
        return success;
      });
      
      logEvent(EVENT_CONFIG.DEBUG_LEVEL.INFO, 'EventBus reset complete');
    } catch (error) {
      logEvent(EVENT_CONFIG.DEBUG_LEVEL.ERROR, 'Error resetting EventBus:', error);
    }
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
    try {
      callbackRef.current(event);
    } catch (error) {
      logEvent(
        EVENT_CONFIG.DEBUG_LEVEL.ERROR,
        `Error in event subscription callback:`,
        error
      );
    }
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
      logEvent(EVENT_CONFIG.DEBUG_LEVEL.ERROR, `Error subscribing to event:`, error);
    }
    
    // Clean up subscription when component unmounts or dependencies change
    return () => {
      try {
        if (unsubscribe) {
          unsubscribe();
        }
      } catch (error) {
        logEvent(EVENT_CONFIG.DEBUG_LEVEL.ERROR, `Error unsubscribing from event:`, error);
      }
    };
  }, [eventType, stableCallback, ...dependencies]); // Include dependencies
}

// ========= EVENT HELPER FUNCTIONS =========

/**
 * Safe dispatch function with error handling
 */
export function safeDispatch<T>(eventType: GameEventType, payload: T, source?: string) {
  try {
    useEventBus.getState().dispatch(eventType, payload, source);
    return true;
  } catch (error) {
    logEvent(EVENT_CONFIG.DEBUG_LEVEL.ERROR, `Error in safeDispatch ${eventType}:`, error);
    return false;
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
  return safeDispatch(
    GameEventType.UI_BUTTON_CLICKED, 
    { componentId, action, metadata, position },
    'ui_helper'
  );
}

/**
 * Helper for dispatching node interaction events
 */
export function dispatchNodeEvent(
  eventType: GameEventType.UI_NODE_CLICKED | GameEventType.UI_NODE_SELECTED | GameEventType.UI_NODE_HOVERED,
  nodeId: string,
  metadata?: Record<string, any>
) {
  return safeDispatch(
    eventType,
    { nodeId, metadata },
    'node_helper'
  );
}

/**
 * Helper for dispatching knowledge system events
 */
export function dispatchKnowledgeEvent(
  eventType: GameEventType,
  data: any,
  source: string = 'knowledge_helper'
) {
  return safeDispatch(eventType, data, source);
}

// ========= DEBUGGING TOOLS =========

// Add diagnostics to window for debugging
if (typeof window !== 'undefined' && EVENT_CONFIG.IS_DEV) {
  // Enhanced diagnostics function
  window.__EVENT_SYSTEM_DIAGNOSTICS__ = () => {
    const eventBus = useEventBus.getState();
    
    // Get listener counts by event type
    const listenerCounts: Record<string, number> = {};
    eventBus.listeners.forEach((listeners, type) => {
      listenerCounts[type.toString()] = listeners.size;
    });
    
    // Get events counts
    const eventCounts = eventBus.eventCounts;
    
    // Get top events by frequency
    const topEvents = Object.entries(eventCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    // Get critical events only
    const criticalEvents = eventBus.getEventHistory()
      .filter(event => EVENT_CONFIG.CRITICAL_EVENTS.includes(event.type))
      .slice(-10);
      
    // Get recent node events
    const nodeEvents = eventBus.getEventHistory()
      .filter(event => 
        event.type === GameEventType.UI_NODE_CLICKED || 
        event.type === GameEventType.UI_NODE_SELECTED ||
        event.type === GameEventType.UI_NODE_HOVERED
      )
      .slice(-10);
      
    // Format timestamps
    const formatEvents = (events: GameEvent[]) => {
      return events.map(e => ({
        type: e.type,
        payload: e.payload,
        time: new Date(e.timestamp).toLocaleTimeString(),
        source: e.source
      }));
    };
    
    // Get active batches
    const activeBatches = Object.keys(eventBatches)
      .map(type => ({
        type,
        events: eventBatches[type].events.length,
        lastProcessed: eventBatches[type].lastProcessed 
          ? new Date(eventBatches[type].lastProcessed).toLocaleTimeString()
          : 'never'
      }))
      .filter(b => b.events > 0);
    
    // Create diagnostic report
    return {
      eventBusReady: CentralEventBus.getInstance().isReady(),
      errorCounts: {
        dispatchErrors: dispatchErrorCount,
        selfTestRetries: selfTestRetryCount
      },
      activeListeners: Object.entries(listenerCounts)
        .filter(([, count]) => count > 0)
        .sort((a, b) => b[1] - a[1]), // Sort by count descending
      topEventTypes: topEvents,
      recentCriticalEvents: formatEvents(criticalEvents),
      recentNodeEvents: formatEvents(nodeEvents),
      activeBatches,
      configuration: {
        criticalEvents: EVENT_CONFIG.CRITICAL_EVENTS,
        batchableEvents: EVENT_CONFIG.BATCHABLE_EVENTS,
        synchronousEvents: EVENT_CONFIG.SYNCHRONOUS_EVENTS,
        debugLevel: EVENT_CONFIG.CURRENT_DEBUG_LEVEL
      },
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
        },
        setDebugLevel: (level: number) => {
          if (level >= 0 && level <= 4) {
            EVENT_CONFIG.CURRENT_DEBUG_LEVEL = level;
            return `Debug level set to ${level}`;
          }
          return `Invalid debug level: ${level}. Must be between 0-4.`;
        },
        testNodeClickEvent: (nodeId = 'test-node') => {
          safeDispatch(
            GameEventType.UI_NODE_CLICKED,
            { nodeId },
            'diagnostic_test'
          );
          return `Test node click event dispatched for ${nodeId}`;
        },
        resetEventBus: () => {
          CentralEventBus.getInstance().reset();
          return 'EventBus reset complete';
        },
        runSelfTest: async () => {
          const result = await runSelfTest();
          return `Self-test ${result ? 'succeeded' : 'failed'}`;
        }
      }
    };
  };
  
  // Add global debug control
  window.__EVENT_BUS_DEBUG__ = {
    setDebugLevel: (level: number) => {
      if (level >= 0 && level <= 4) {
        EVENT_CONFIG.CURRENT_DEBUG_LEVEL = level;
        console.log(`[EventBus] Debug level set to ${level}`);
        return true;
      }
      console.error(`[EventBus] Invalid debug level: ${level}. Must be between 0-4.`);
      return false;
    },
    getConfig: () => ({ ...EVENT_CONFIG }),
    toggleDebug: () => {
      EVENT_CONFIG.CURRENT_DEBUG_LEVEL = 
        EVENT_CONFIG.CURRENT_DEBUG_LEVEL > 0 ? 0 : 3;
      console.log(`[EventBus] Debug ${EVENT_CONFIG.CURRENT_DEBUG_LEVEL > 0 ? 'enabled' : 'disabled'}`);
      return EVENT_CONFIG.CURRENT_DEBUG_LEVEL > 0;
    },
    resetEventBus: () => {
      CentralEventBus.getInstance().reset();
      return 'EventBus reset complete';
    },
    isReady: () => CentralEventBus.getInstance().isReady()
  };
}

// Run self-test automatically if in browser
if (typeof window !== 'undefined' && EVENT_CONFIG.SELF_TEST_ENABLED) {
  // Delay self-test slightly to ensure everything is loaded
  setTimeout(() => {
    runSelfTest().then(success => {
      if (success) {
        logEvent(EVENT_CONFIG.DEBUG_LEVEL.INFO, 'EventBus self-test succeeded on startup');
      } else {
        logEvent(EVENT_CONFIG.DEBUG_LEVEL.ERROR, 'EventBus self-test failed on startup');
      }
    });
  }, 100);
}

// Export the class itself for backwards compatibility
export default CentralEventBus;