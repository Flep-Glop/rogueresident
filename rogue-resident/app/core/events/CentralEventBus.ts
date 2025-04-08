// app/core/events/CentralEventBus.ts
/**
 * Simplified Central Event Bus for Vertical Slice
 * 
 * This streamlined implementation maintains essential robustness
 * while removing unnecessary complexity. It provides:
 * 
 * 1. Reliable event subscription and dispatch
 * 2. Error handling for critical events
 * 3. Event history for debugging
 * 4. Clean React integration
 * 
 * Compared to the previous implementation (~300 lines), this version
 * focuses on core functionality (~150 lines) while maintaining
 * the essential safety features.
 */

import { create } from 'zustand';
import { GameEventType } from './EventTypes';
import React from 'react';

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
}

/**
 * Main event bus store
 */
export const useEventBus = create<EventBusState>()((set, get) => ({
  listeners: new Map<GameEventType, Set<EventCallback>>(),
  eventLog: [],
  
  /**
   * Subscribe to an event type
   * @param eventType The event type to subscribe to
   * @param callback Function to call when event occurs
   * @returns Unsubscribe function
   */
  subscribe: <T>(eventType: GameEventType, callback: EventCallback<T>): (() => void) => {
    // Type guard
    if (typeof callback !== 'function') {
      console.error(`[EventBus] Attempted to subscribe with invalid callback for: ${eventType}`);
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
    
    console.log(`[EventBus] Subscribed to ${eventType}, current listeners: ${eventListeners.size}`);
    
    // Return unsubscribe function
    return () => {
      try {
        const currentListeners = get().listeners.get(eventType);
        if (currentListeners) {
          currentListeners.delete(callback as EventCallback);
          console.log(`[EventBus] Unsubscribed from ${eventType}, remaining: ${currentListeners.size}`);
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
      // Create the event object
      const event: GameEvent<T> = {
        type: eventType,
        payload,
        timestamp: Date.now(),
        source: source || 'unknown',
        id: `${Date.now()}-${Math.floor(Math.random() * 10000)}`
      };
      
      // Debug log with color coding for critical events
      const criticalEvent = 
        eventType === GameEventType.JOURNAL_ACQUIRED || 
        eventType === GameEventType.KNOWLEDGE_TRANSFERRED ||
        eventType === GameEventType.KNOWLEDGE_GAINED ||
        eventType === GameEventType.GAME_PHASE_CHANGED;
        
      console.log(
        `%c[Event] ${eventType}`, 
        `color: ${criticalEvent ? '#ff5500' : '#888888'}`, 
        payload
      );
      
      // Update event log
      set(state => ({
        eventLog: state.eventLog.length >= 100 
          ? [...state.eventLog.slice(-99), event]
          : [...state.eventLog, event]
      }));
      
      // Get listeners for this event type
      const listeners = get().listeners;
      const eventListeners = listeners.get(eventType);
      
      // Call listeners if any exist
      if (eventListeners && eventListeners.size > 0) {
        // Convert to array to avoid issues if listeners modify the set
        Array.from(eventListeners).forEach(listener => {
          try {
            listener(event);
          } catch (error) {
            console.error(`[EventBus] Error in listener for ${eventType}:`, error);
            // Continue to next listener
          }
        });
      }
    } catch (error) {
      console.error(`[EventBus] Critical error during dispatch of ${eventType}:`, error);
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

// ======== React Integration ========

/**
 * React hook for subscribing to events
 * @param eventType Event type or array of event types
 * @param callback Function to call when event occurs
 * @param dependencies Dependencies for useCallback
 */
export function useEventSubscription<T = any>(
  eventType: GameEventType | GameEventType[],
  callback: EventCallback<T>,
  dependencies: any[] = []
) {
  // Wrap in useCallback for stable reference
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
  }, [eventType, stableCallback]); // Re-subscribe if event type or callback dependencies change
}

// ======== Helper Functions ========

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

// Make event bus diagnostics available in window for debugging
if (typeof window !== 'undefined') {
  (window as any).__EVENT_SYSTEM_DIAGNOSTICS__ = () => {
    const eventBus = useEventBus.getState();
    const listenerCounts = new Map<string, number>();
    
    eventBus.listeners.forEach((listeners, type) => {
      listenerCounts.set(type.toString(), listeners.size);
    });
    
    return {
      listenerCounts: Object.fromEntries(listenerCounts),
      recentEvents: eventBus.getEventHistory(undefined, 10),
      criticalEvents: {
        journalAcquisitions: eventBus.getEventHistory(GameEventType.JOURNAL_ACQUIRED),
        knowledgeTransfers: eventBus.getEventHistory(GameEventType.KNOWLEDGE_TRANSFERRED),
        phaseChanges: eventBus.getEventHistory(GameEventType.GAME_PHASE_CHANGED)
      }
    };
  };
}

export default useEventBus;