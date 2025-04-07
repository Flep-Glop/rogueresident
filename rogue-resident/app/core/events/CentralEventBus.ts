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
import { GameEventType } from './EventTypes';

// Create a stable reference for event system state that persists across
// hot reloads and component remounts
const GLOBAL_EVENT_SYSTEM = {
  initialized: false,
  listenerCount: 0,
  resetCount: 0
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
}

// Create a fresh listeners map to avoid any listener corruption
const createFreshListeners = () => new Map<GameEventType, Set<EventCallback>>();

// WeakMap to track subscriber metadata without creating reference cycles
const subscriberMeta = new WeakMap<EventCallback, {
  id: string;
  types: GameEventType[];
  timestamp: number;
}>();

/**
 * Main event bus store - created with enhanced safeguards
 */
export const useEventBus = create<EventBusState>((set, get) => ({
  listeners: createFreshListeners(),
  eventLog: [],
  
  subscribe: <T>(eventType: GameEventType, callback: EventCallback<T>): (() => void) => {
    // Type guard to ensure callback is a function
    if (typeof callback !== 'function') {
      console.error(`[EventBus] Attempted to subscribe with a non-function listener for event: ${eventType}`);
      return () => {}; // Return no-op unsubscribe
    }
    
    const { listeners } = get();
    
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
    
    // Track listener metadata for debugging
    const subscriberId = `sub_${++GLOBAL_EVENT_SYSTEM.listenerCount}`;
    subscriberMeta.set(callback as EventCallback, {
      id: subscriberId,
      types: [eventType],
      timestamp: Date.now()
    });
    
    // Add to the listener set
    eventListeners.add(callback as EventCallback);
    
    console.log(`[EventBus] Subscribed to ${eventType} (${subscriberId}), current listeners: ${eventListeners.size}`);
    
    // Return unsubscribe function
    return () => {
      const currentListeners = get().listeners.get(eventType);
      if (currentListeners) {
        currentListeners.delete(callback as EventCallback);
        console.log(`[EventBus] Unsubscribed from ${eventType} (${subscriberId}), remaining listeners: ${currentListeners.size}`);
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
    
    // Track metadata for this multi-subscription
    const meta = subscriberMeta.get(listener as EventCallback);
    if (meta) {
      meta.types = [...types]; // Update with all event types
    }
    
    // Return unsubscribe function for all
    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  },
  
  dispatch: <T>(eventType: GameEventType, payload: T, source?: string): void => {
    // Create the event object
    const event: GameEvent<T> = {
      type: eventType,
      payload,
      timestamp: Date.now(),
      source: source || 'unknown',
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    };
    
    // First log the event - isolated from listener notification to prevent cascading failures
    try {
      // Safely update the event log
      set(state => ({
        eventLog: [...state.eventLog.slice(-1000), event] // Keep last 1000 events
      }));
    } catch (error) {
      console.error(`[EventBus] Error updating event log: ${error}`);
    }
    
    // Debug log with color coding based on event type
    if (process.env.NODE_ENV !== 'production') {
      const eventColor = 
        eventType.startsWith('progression:') ? '#8855ff' :
        eventType.startsWith('ui:') ? '#4488cc' :
        eventType.startsWith('effect:') ? '#44cc88' :
        eventType.startsWith('state:') ? '#cc8844' :
        eventType.startsWith('challenge:') ? '#cc4488' :
        eventType.startsWith('dialogue:') ? '#ff55aa' :
        '#8888aa';
      
      console.log(`%c[Event] ${eventType}`, `color: ${eventColor}`, payload);
    }
    
    // Get listeners for this event type
    const { listeners } = get();
    const eventListeners = listeners.get(eventType);
    
    // Notify all listeners with extra safety - done after logging to prevent cascading failures
    if (eventListeners && eventListeners.size > 0) {
      // Convert to array and filter out any non-functions for safer iteration
      const listenersArray = Array.from(eventListeners).filter(
        listener => typeof listener === 'function'
      );
      
      // Clean up any non-function listeners that might have crept in
      if (listenersArray.length !== eventListeners.size) {
        console.warn(`[EventBus] Removed ${eventListeners.size - listenersArray.length} invalid listeners for ${eventType}`);
        listeners.set(eventType, new Set(listenersArray));
      }
      
      // Now safely call only function listeners
      listenersArray.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error(`[EventBus] Error in listener for ${eventType}:`, error);
          
          // Optionally remove problematic listeners in development
          if (process.env.NODE_ENV !== 'production') {
            console.warn(`[EventBus] Removing problematic listener for ${eventType} due to error`);
            eventListeners.delete(listener);
          }
        }
      });
    }
  },
  
  getEventHistory: (eventType?: GameEventType, limit: number = 100): GameEvent[] => {
    const { eventLog } = get();
    const filteredEvents = eventType ? 
      eventLog.filter(event => event.type === eventType) : 
      eventLog;
    
    return filteredEvents.slice(-limit);
  },
  
  clearEventLog: () => {
    set({ eventLog: [] });
  }
}));

// Mark system as initialized globally
GLOBAL_EVENT_SYSTEM.initialized = true;

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
  
  // Dispatch the event
  useEventBus.getState().dispatch(
    eventType, 
    { componentId, action, metadata, position }
  );
}

// ======== Effect Event Helpers ========

/**
 * Helper for dispatching sound effect events
 */
export function playSoundEffect(effect: string, volume: number = 1.0, loop: boolean = false) {
  useEventBus.getState().dispatch(
    GameEventType.EFFECT_SOUND_PLAYED,
    { effect, volume, loop }
  );
}

/**
 * Helper for dispatching screen flash events
 */
export function flashScreen(
  color: 'white' | 'red' | 'green' | 'blue' | 'yellow',
  duration: number = 300
) {
  useEventBus.getState().dispatch(
    GameEventType.EFFECT_SCREEN_FLASH,
    { color, duration }
  );
}

// ======== Game State Event Helpers ========

/**
 * Helper for dispatching game state change events
 */
export function changeGameState(from: string, to: string, reason?: string) {
  useEventBus.getState().dispatch(
    GameEventType.GAME_STATE_CHANGED, 
    { from, to, reason }
  );
}

/**
 * Helper for dispatching game phase change events
 */
export function changeGamePhase(from: string, to: string, reason?: string) {
  useEventBus.getState().dispatch(
    GameEventType.GAME_PHASE_CHANGED, 
    { from, to, reason }
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
  useEventBus.getState().dispatch(
    GameEventType.NODE_COMPLETED,
    { nodeId, character, result }
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
  useEventBus.getState().dispatch(
    GameEventType.JOURNAL_ACQUIRED,
    { tier, character, source, forced }
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
  useEventBus.getState().dispatch(
    GameEventType.KNOWLEDGE_GAINED,
    { conceptId, amount, domainId, character, source }
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
  useEventBus.getState().dispatch(
    GameEventType.DIALOGUE_CRITICAL_PATH,
    { dialogueId, characterId, nodeId, criticalStateId, playerScore, wasRepaired }
  );
}

/**
 * Reset event system to clean state
 * Useful for recovering from corrupted state or for debugging
 */
export function resetEventSystem() {
  // Create fresh listeners map to clear any corrupted listeners
  GLOBAL_EVENT_SYSTEM.resetCount++;
  console.log(`[EventBus] Resetting event system (reset #${GLOBAL_EVENT_SYSTEM.resetCount})`);
  
  useEventBus.setState({ 
    listeners: createFreshListeners(),
    eventLog: []
  });
  
  console.log('[EventBus] System reset to clean state');
  
  // Dispatch system reset event to help with debugging
  try {
    useEventBus.getState().dispatch(
      GameEventType.UI_BUTTON_CLICKED,
      { 
        componentId: 'eventSystem', 
        action: 'reset',
        metadata: { 
          resetCount: GLOBAL_EVENT_SYSTEM.resetCount,
          timestamp: Date.now()
        }
      },
      'systemInternal'
    );
  } catch (e) {
    // Ignore errors during reset event
  }
}

// Add hot module reloading protection
if (typeof module !== 'undefined' && module.hot) {
  module.hot.dispose(() => {
    console.log('🔥 Hot module replacement detected, performing event system cleanup');
    resetEventSystem();
  });
}

export default useEventBus;