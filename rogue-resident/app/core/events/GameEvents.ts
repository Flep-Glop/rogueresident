// app/core/events/GameEvents.ts
/**
 * Game Events System
 * 
 * A centralized event bus architecture for critical game state transitions.
 * This pattern was inspired by the state management systems in roguelikes like Hades
 * to ensure reliable progression regardless of UI interaction paths.
 * 
 * Key benefits:
 * - Decouples progression logic from UI components
 * - Provides guaranteed execution for critical progression
 * - Enables consistent monitoring and debugging of game state
 * - Allows multiple systems to react to the same event
 */

import { create } from 'zustand';

// Define all possible game events to ensure type safety
export enum GameEventType {
  // Session events
  SESSION_STARTED = 'session:started',
  SESSION_ENDED = 'session:ended',
  
  // Map and navigation events
  MAP_GENERATED = 'map:generated',
  NODE_SELECTED = 'node:selected',
  NODE_COMPLETED = 'node:completed',
  NODE_FAILED = 'node:failed',
  
  // Challenge events
  CHALLENGE_STARTED = 'challenge:started',
  CHALLENGE_COMPLETED = 'challenge:completed',
  CHALLENGE_FAILED = 'challenge:failed',
  
  // Dialogue events
  DIALOGUE_STARTED = 'dialogue:started',
  DIALOGUE_OPTION_SELECTED = 'dialogue:option:selected',
  DIALOGUE_COMPLETED = 'dialogue:completed',
  
  // Character events
  CHARACTER_INTRODUCED = 'character:introduced',
  RELATIONSHIP_CHANGED = 'character:relationship:changed',
  
  // Knowledge events
  KNOWLEDGE_GAINED = 'knowledge:gained',
  CONCEPT_MASTERED = 'knowledge:concept:mastered',
  CONCEPT_CONNECTED = 'knowledge:concept:connected',
  
  // Item events
  ITEM_ACQUIRED = 'item:acquired',
  ITEM_USED = 'item:used',
  
  // Critical progression events
  JOURNAL_ACQUIRED = 'progression:journal:acquired',
  BOSS_DEFEATED = 'progression:boss:defeated',
  FLOOR_COMPLETED = 'progression:floor:completed',
  
  // Day/night cycle events
  DAY_STARTED = 'cycle:day:started',
  NIGHT_STARTED = 'cycle:night:started',
  
  // UI events
  UI_JOURNAL_OPENED = 'ui:journal:opened',
  UI_JOURNAL_CLOSED = 'ui:journal:closed',
  UI_CONSTELLATION_VIEWED = 'ui:constellation:viewed'
}

// Event payload interface for type safety
export interface GameEvent<T = any> {
  type: GameEventType;
  payload: T;
  timestamp: number;
  source?: string;
}

// Event listener type
export type EventListener<T = any> = (event: GameEvent<T>) => void;

// Event bus store interface
interface EventBusState {
  // Event history for debugging and state recovery
  eventLog: GameEvent[];
  
  // Registered event listeners
  listeners: Map<GameEventType, Set<EventListener>>;
  
  // Event dispatch function
  dispatch: <T>(type: GameEventType, payload: T, source?: string) => void;
  
  // Event subscription functions
  subscribe: <T>(type: GameEventType, listener: EventListener<T>) => () => void;
  subscribeMany: <T>(types: GameEventType[], listener: EventListener<T>) => () => void;
  
  // Debug helpers
  getEventHistory: (type?: GameEventType) => GameEvent[];
  clearEventLog: () => void;
}

// Create the event bus store
export const useEventBus = create<EventBusState>((set, get) => ({
  eventLog: [],
  listeners: new Map(),
  
  dispatch: <T>(type: GameEventType, payload: T, source?: string) => {
    const event: GameEvent<T> = {
      type,
      payload,
      timestamp: Date.now(),
      source
    };
    
    // Log the event
    set(state => ({
      eventLog: [...state.eventLog, event]
    }));
    
    // Notify listeners
    const listeners = get().listeners.get(type);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error(`Error in event listener for ${type}:`, error);
        }
      });
    }
    
    // Debug log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`%c[GameEvent] ${type}`, 'color: #8855ff', payload);
    }
  },
  
  subscribe: <T>(type: GameEventType, listener: EventListener<T>) => {
    const { listeners } = get();
    
    // Create a set for this event type if it doesn't exist
    if (!listeners.has(type)) {
      listeners.set(type, new Set());
    }
    
    // Add the listener
    const eventListeners = listeners.get(type)!;
    eventListeners.add(listener as EventListener);
    
    // Return unsubscribe function
    return () => {
      const currentListeners = get().listeners.get(type);
      if (currentListeners) {
        currentListeners.delete(listener as EventListener);
      }
    };
  },
  
  subscribeMany: <T>(types: GameEventType[], listener: EventListener<T>) => {
    // Subscribe to multiple event types
    const unsubscribers = types.map(type => get().subscribe(type, listener));
    
    // Return unsubscribe function for all
    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  },
  
  getEventHistory: (type?: GameEventType) => {
    const { eventLog } = get();
    if (type) {
      return eventLog.filter(event => event.type === type);
    }
    return eventLog;
  },
  
  clearEventLog: () => {
    set({ eventLog: [] });
  }
}));

// Critical progression guarantee middleware
export const ensureCriticalProgression = () => {
  const events = useEventBus.getState().getEventHistory();
  const { dispatch } = useEventBus.getState();
  
  // Check if specific chains of events have occurred and repair if needed
  const checkAndRepair = () => {
    // Example: Ensure journal acquisition after first calibration
    const hasCompletedCalibration = events.some(
      e => e.type === GameEventType.NODE_COMPLETED && 
      e.payload.nodeId === 'kapoor-calibration-node'
    );
    
    const hasJournal = events.some(
      e => e.type === GameEventType.JOURNAL_ACQUIRED
    );
    
    if (hasCompletedCalibration && !hasJournal) {
      console.warn('Critical progression inconsistency detected: Missing journal after calibration');
      dispatch(GameEventType.JOURNAL_ACQUIRED, {
        tier: 'base',
        source: 'integrity_check'
      }, 'progression_repair');
      
      return true; // Repairs were made
    }
    
    return false; // No repairs needed
  };
  
  return checkAndRepair();
};

// Helper for dispatching events with proper typing
export const gameEvents = {
  dispatch: useEventBus.getState().dispatch,
  
  // Convenience methods for common events
  nodeCompleted: (nodeId: string, result: any) => {
    useEventBus.getState().dispatch(GameEventType.NODE_COMPLETED, { nodeId, result });
  },
  
  journalAcquired: (tier: 'base' | 'technical' | 'annotated', character: string = 'kapoor') => {
    useEventBus.getState().dispatch(GameEventType.JOURNAL_ACQUIRED, { tier, character });
  },
  
  knowledgeGained: (conceptId: string, amount: number, domain: string) => {
    useEventBus.getState().dispatch(GameEventType.KNOWLEDGE_GAINED, { 
      conceptId, amount, domain 
    });
  }
};

export default gameEvents;