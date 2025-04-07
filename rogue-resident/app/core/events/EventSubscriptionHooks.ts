// app/core/events/EventSubscriptionHooks.ts
/**
 * Event Subscription Hooks
 * 
 * React integration hooks for the event system with lifecycle safety guarantees.
 * These hooks follow the pattern established in narrative-rich games to ensure
 * proper cleanup and prevent event subscription memory leaks.
 */

import { useEffect, useCallback, useRef } from 'react';
import { GameEventType } from '@/app/core/events/EventTypes';
import { useEventBus, GameEvent } from '@/app/core/events/CentralEventBus';

/**
 * Safely subscribe to an event with proper cleanup
 * 
 * @param eventType - The event type to subscribe to
 * @param handler - The event handler function
 * @param dependencies - Optional dependencies array for the handler
 */
export function useEventSubscription<T = any>(
  eventType: GameEventType,
  handler: (event: GameEvent<T>) => void,
  dependencies: any[] = []
) {
  // Create a stable reference to track when component is mounted
  const isMountedRef = useRef(true);
  
  // Create a stable callback that checks if component is still mounted
  const safeHandler = useCallback((event: GameEvent<T>) => {
    if (isMountedRef.current) {
      handler(event);
    }
  }, [handler, ...dependencies]);
  
  // Set up subscription with cleanup
  useEffect(() => {
    // Reset mounted state on every effect run
    isMountedRef.current = true;
    
    // Get current event bus instance
    const eventBus = useEventBus.getState();
    
    // Subscribe with the safe handler
    let unsubscribe: (() => void) | null = null;
    try {
      unsubscribe = eventBus.subscribe(eventType, safeHandler);
    } catch (error) {
      console.error(`[useEventSubscription] Failed to subscribe to ${eventType}:`, error);
    }
    
    // Cleanup function
    return () => {
      // Mark as unmounted first
      isMountedRef.current = false;
      
      // Then unsubscribe
      try {
        if (unsubscribe && typeof unsubscribe === 'function') {
          unsubscribe();
        }
      } catch (error) {
        console.error(`[useEventSubscription] Cleanup error for ${eventType}:`, error);
      }
    };
  }, [eventType, safeHandler]); // Re-subscribe if event type or handler changes
}

/**
 * Subscribe to multiple events with a single handler
 * 
 * @param eventTypes - Array of event types to subscribe to
 * @param handler - The event handler function
 * @param dependencies - Optional dependencies array for the handler
 */
export function useMultiEventSubscription<T = any>(
  eventTypes: GameEventType[],
  handler: (event: GameEvent<T>) => void,
  dependencies: any[] = []
) {
  // Create a stable reference to track when component is mounted
  const isMountedRef = useRef(true);
  
  // Create a stable callback that checks if component is still mounted
  const safeHandler = useCallback((event: GameEvent<T>) => {
    if (isMountedRef.current) {
      handler(event);
    }
  }, [handler, ...dependencies]);
  
  // Set up subscription with cleanup
  useEffect(() => {
    // Reset mounted state on every effect run
    isMountedRef.current = true;
    
    // Get current event bus instance
    const eventBus = useEventBus.getState();
    
    // Subscribe with the safe handler
    let unsubscribe: (() => void) | null = null;
    try {
      unsubscribe = eventBus.subscribeMany(eventTypes, safeHandler);
    } catch (error) {
      console.error(`[useMultiEventSubscription] Failed to subscribe to ${eventTypes.join(', ')}:`, error);
    }
    
    // Cleanup function
    return () => {
      // Mark as unmounted first
      isMountedRef.current = false;
      
      // Then unsubscribe
      try {
        if (unsubscribe && typeof unsubscribe === 'function') {
          unsubscribe();
        }
      } catch (error) {
        console.error(`[useMultiEventSubscription] Cleanup error for ${eventTypes.join(', ')}:`, error);
      }
    };
  }, [eventTypes, safeHandler]); // Re-subscribe if event types or handler changes
}

/**
 * Subscribe to UI button click events for a specific component
 * 
 * @param componentId - The component ID to filter events for
 * @param handler - The event handler function
 * @param dependencies - Optional dependencies array for the handler
 */
export function useButtonClickSubscription(
  componentId: string,
  handler: (metadata?: any) => void,
  dependencies: any[] = []
) {
  // Create a stable callback that filters for the specific component
  const componentHandler = useCallback((event: GameEvent) => {
    if (event.payload?.componentId === componentId) {
      handler(event.payload?.metadata);
    }
  }, [componentId, handler, ...dependencies]);
  
  // Use the standard event subscription hook
  useEventSubscription(
    GameEventType.UI_BUTTON_CLICKED,
    componentHandler,
    [componentId, handler, ...dependencies]
  );
}

/**
 * Listen for critical path events with automatic recovery options
 * 
 * @param nodeId - The node ID to listen for events on 
 * @param handler - The event handler function
 * @param autoRepairIfNeeded - Whether to attempt auto-repair
 * @param dependencies - Optional dependencies array for the handler
 */
export function useCriticalPathMonitor(
  nodeId: string,
  handler: (event: GameEvent) => void,
  autoRepairIfNeeded: boolean = true,
  dependencies: any[] = []
) {
  // Ref to track if we've seen a critical path event
  const criticalPathSeenRef = useRef(false);
  
  // Enhanced handler for critical path events
  const criticalPathHandler = useCallback((event: GameEvent) => {
    // Mark that we've seen a critical path event
    criticalPathSeenRef.current = true;
    
    // Call the user's handler
    handler(event);
  }, [handler, ...dependencies]);
  
  // Subscribe to critical path events
  useEventSubscription(
    GameEventType.DIALOGUE_CRITICAL_PATH,
    criticalPathHandler,
    [handler, ...dependencies]
  );
  
  // Check for completion of node without critical path events
  useEventSubscription(
    GameEventType.NODE_COMPLETED,
    useCallback((event: GameEvent) => {
      if (event.payload?.nodeId === nodeId && !criticalPathSeenRef.current && autoRepairIfNeeded) {
        console.warn('[useCriticalPathMonitor] Node completed without critical path events!');
        
        // Could add auto-repair logic here
        if (typeof window !== 'undefined' && (window as any).__REPAIR_DIALOGUE_FLOW__) {
          try {
            (window as any).__REPAIR_DIALOGUE_FLOW__();
          } catch (error) {
            console.error('[useCriticalPathMonitor] Auto-repair failed:', error);
          }
        }
      }
    }, [nodeId, autoRepairIfNeeded]),
    [nodeId, autoRepairIfNeeded]
  );
}

/**
 * Creates a declarative event subscriber that automatically cleans up
 * 
 * This component-like pattern is useful for high-performance
 * combat events that need to maintain state outside the React tree.
 */
export function createEventSubscriber(
  eventType: GameEventType,
  handler: (event: GameEvent) => void
) {
  // Keep internal state
  let isActive = false;
  let unsubscribe: (() => void) | null = null;
  
  // Create an object with lifecycle methods
  return {
    // Start subscribing
    subscribe: () => {
      if (isActive) return;
      
      try {
        unsubscribe = useEventBus.getState().subscribe(eventType, handler);
        isActive = true;
      } catch (error) {
        console.error(`[EventSubscriber] Failed to subscribe to ${eventType}:`, error);
      }
    },
    
    // Stop subscribing
    unsubscribe: () => {
      if (!isActive) return;
      
      try {
        if (unsubscribe && typeof unsubscribe === 'function') {
          unsubscribe();
        }
        isActive = false;
        unsubscribe = null;
      } catch (error) {
        console.error(`[EventSubscriber] Failed to unsubscribe from ${eventType}:`, error);
      }
    },
    
    // Check if currently subscribed
    isSubscribed: () => isActive
  };
}

// Default export with all hooks for convenient importing
export default {
  useEventSubscription,
  useMultiEventSubscription,
  useButtonClickSubscription,
  useCriticalPathMonitor,
  createEventSubscriber
};