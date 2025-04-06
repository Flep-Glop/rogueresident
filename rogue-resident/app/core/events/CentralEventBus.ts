// app/core/events/CentralEventBus.ts
/**
 * Central Event Bus - Unified event system for Rogue Resident
 * 
 * This system provides a single source of truth for all game events, enabling:
 * 1. Decoupled communication between components
 * 2. Centralized logging and debugging
 * 3. Easy correlation between UI actions and game state changes
 * 4. Telemetry hooks for analytics
 * 5. Event replay for testing and debugging
 */

import { create } from 'zustand';
import { 
  GameEventType,
  GameEvent,
  EventListener,
  UIEventPayload,
  SoundEffectPayload,
  ScreenFlashPayload,
  ScreenShakePayload,
  ParticleEffectPayload,
  StateChangePayload,
  KnowledgeGainPayload,
  ProgressionRepairPayload,
  JournalAcquisitionPayload,
  NodeCompletionPayload,
  DialogueCriticalPathPayload,
  DialogueProgressionRepairPayload
} from './EventTypes';
import { SoundEffect } from '../../types/audio';


// ======== Event Bus Store ========

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
  getEventHistory: (type?: GameEventType, limit?: number) => GameEvent[];
  clearEventLog: () => void;
  
  // Replay capability
  replayEvents: (events: GameEvent[], speed?: number) => void;
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
      source: source || 'unknown',
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    };
    
    // Log the event
    set(state => ({
      eventLog: [...state.eventLog.slice(-1000), event] // Keep last 1000 events
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
    if (process.env.NODE_ENV !== 'production') {
      const eventColor = 
        type.startsWith('progression:') ? '#8855ff' :
        type.startsWith('ui:') ? '#4488cc' :
        type.startsWith('effect:') ? '#44cc88' :
        type.startsWith('state:') ? '#cc8844' :
        type.startsWith('challenge:') ? '#cc4488' :
        type.startsWith('dialogue:') ? '#ff55aa' :
        '#8888aa';
      
      console.log(`%c[Event] ${type}`, `color: ${eventColor}`, payload);
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
  
  getEventHistory: (type?: GameEventType, limit: number = 100) => {
    const { eventLog } = get();
    const filteredLog = type 
      ? eventLog.filter(event => event.type === type)
      : eventLog;
    
    return filteredLog.slice(-limit);
  },
  
  clearEventLog: () => {
    set({ eventLog: [] });
  },
  
  replayEvents: (events: GameEvent[], speed: number = 1) => {
    // Reset listeners to avoid side effects during replay
    const originalListeners = get().listeners;
    set({ listeners: new Map() });
    
    // Clear existing log
    get().clearEventLog();
    
    // Replay events with timing
    let lastTimestamp: number | null = null;
    events.forEach((event, index) => {
      const delay = lastTimestamp === null
        ? 0
        : (event.timestamp - lastTimestamp) / speed;
        
      setTimeout(() => {
        set(state => ({
          eventLog: [...state.eventLog, event]
        }));
        
        // Log replay progress
        console.log(`%c[Replay] ${index+1}/${events.length}: ${event.type}`, 'color: #aa55cc', event.payload);
        
        // When complete, restore listeners
        if (index === events.length - 1) {
          set({ listeners: originalListeners });
          console.log('%c[Replay] Complete', 'color: #aa55cc, font-weight: bold');
        }
      }, delay);
      
      lastTimestamp = event.timestamp;
    });
  }
}));

// ======== UI Event Helpers ========

/**
 * Helper for UI components to dispatch standardized UI events
 * This provides a bridge between old UI handlers and the new event system
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
    case 'form-submit':
      eventType = GameEventType.UI_FORM_SUBMITTED;
      break;
    case 'dialogue-advance':
      eventType = GameEventType.UI_DIALOGUE_ADVANCED;
      break;
    case 'inventory-interaction':
      eventType = GameEventType.UI_INVENTORY_INTERACTION;
      break;
    case 'knowledge-interaction':
      eventType = GameEventType.UI_KNOWLEDGE_INTERACTION;
      break;
    case 'character-interaction':
      eventType = GameEventType.UI_CHARACTER_INTERACTION;
      break;
    default:
      eventType = GameEventType.UI_BUTTON_CLICKED;
  }
  
  // Dispatch the event
  useEventBus.getState().dispatch<UIEventPayload>(
    eventType, 
    { componentId, action, metadata, position }
  );
}

// ======== Effect Event Helpers ========

/**
 * Helper for dispatching sound effect events
 */
export function playSoundEffect(
  effect: SoundEffect,
  volume: number = 1.0,
  loop: boolean = false
) {
  useEventBus.getState().dispatch<SoundEffectPayload>(
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
  useEventBus.getState().dispatch<ScreenFlashPayload>(
    GameEventType.EFFECT_SCREEN_FLASH,
    { color, duration }
  );
}

/**
 * Helper for dispatching screen shake events
 */
export function shakeScreen(
  intensity: 'light' | 'medium' | 'heavy',
  duration: number = 500
) {
  useEventBus.getState().dispatch<ScreenShakePayload>(
    GameEventType.EFFECT_SCREEN_SHAKE,
    { intensity, duration }
  );
}

/**
 * Helper for dispatching particle effects
 */
export function showParticleEffect(
  type: 'reward' | 'damage' | 'heal' | 'completion' | 'knowledge',
  count: number,
  x: number,
  y: number,
  color?: string
) {
  useEventBus.getState().dispatch<ParticleEffectPayload>(
    GameEventType.EFFECT_PARTICLES,
    { type, count, x, y, color }
  );
}

// ======== Game State Event Helpers ========

/**
 * Helper for dispatching game state change events
 */
export function changeGameState(
  from: string,
  to: string,
  reason?: string
) {
  useEventBus.getState().dispatch<StateChangePayload>(
    GameEventType.GAME_STATE_CHANGED,
    { from, to, reason }
  );
}

/**
 * Helper for dispatching game phase change events
 */
export function changeGamePhase(
  from: string,
  to: string,
  reason?: string
) {
  useEventBus.getState().dispatch<StateChangePayload>(
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
  useEventBus.getState().dispatch<NodeCompletionPayload>(
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
  useEventBus.getState().dispatch<JournalAcquisitionPayload>(
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
  useEventBus.getState().dispatch<KnowledgeGainPayload>(
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
  useEventBus.getState().dispatch<DialogueCriticalPathPayload>(
    GameEventType.DIALOGUE_CRITICAL_PATH,
    { dialogueId, characterId, nodeId, criticalStateId, playerScore, wasRepaired }
  );
}

/**
 * Helper for dispatching dialogue progression repair events
 */
export function dialogueProgressionRepair(
  dialogueId: string,
  characterId: string,
  nodeId: string,
  fromStateId: string,
  toStateId: string,
  reason: string,
  loopDetected: boolean = false
) {
  useEventBus.getState().dispatch<DialogueProgressionRepairPayload>(
    GameEventType.DIALOGUE_PROGRESSION_REPAIR,
    { dialogueId, characterId, nodeId, fromStateId, toStateId, reason, loopDetected }
  );
}