// app/core/events/GameEvents.ts
/**
 * Game Events - Legacy Bridge
 * 
 * This file serves as a migration bridge between the old event system and the new
 * CentralEventBus architecture. It maintains the same API surface for backward 
 * compatibility while forwarding all events to the new centralized system.
 * 
 * MIGRATION PLAN:
 * 1. Update all dispatches to use the new system directly
 * 2. Monitor usage of legacy dispatches via console warnings
 * 3. Once all components have migrated, this file can be deprecated
 */

import { 
    useEventBus, 
    GameEventType, 
    JournalAcquisitionPayload,
    NodeCompletionPayload,
    KnowledgeGainPayload,
  } from './CentralEventBus';
  
  // Original GameEventType enum - maintained for backward compatibility
  // In the migration phase, we map these to the new CentralEventBus types
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
  
  // Map legacy event types to new CentralEventBus types
  function mapEventType(legacyType: GameEventType): GameEventType {
    // The enum values happen to match, but we're explicit for type safety
    switch(legacyType) {
      case GameEventType.SESSION_STARTED:
        return GameEventType.SESSION_STARTED;
      case GameEventType.SESSION_ENDED:
        return GameEventType.SESSION_ENDED;
      case GameEventType.MAP_GENERATED:
        return GameEventType.MAP_GENERATED;
      case GameEventType.NODE_SELECTED:
        return GameEventType.NODE_SELECTED;
      case GameEventType.NODE_COMPLETED:
        return GameEventType.NODE_COMPLETED;
      case GameEventType.NODE_FAILED:
        return GameEventType.NODE_FAILED;
      case GameEventType.CHALLENGE_STARTED:
        return GameEventType.CHALLENGE_STARTED;
      case GameEventType.CHALLENGE_COMPLETED:
        return GameEventType.CHALLENGE_COMPLETED;
      case GameEventType.CHALLENGE_FAILED:
        return GameEventType.CHALLENGE_FAILED;
      case GameEventType.DIALOGUE_STARTED:
        return GameEventType.DIALOGUE_STARTED;
      case GameEventType.DIALOGUE_OPTION_SELECTED:
        return GameEventType.DIALOGUE_OPTION_SELECTED;
      case GameEventType.DIALOGUE_COMPLETED:
        return GameEventType.DIALOGUE_COMPLETED;
      case GameEventType.CHARACTER_INTRODUCED:
        return GameEventType.CHARACTER_INTRODUCED;
      case GameEventType.RELATIONSHIP_CHANGED:
        return GameEventType.RELATIONSHIP_CHANGED;
      case GameEventType.KNOWLEDGE_GAINED:
        return GameEventType.KNOWLEDGE_GAINED;
      case GameEventType.CONCEPT_MASTERED:
        return GameEventType.CONCEPT_MASTERED;
      case GameEventType.CONCEPT_CONNECTED:
        return GameEventType.CONCEPT_CONNECTED;
      case GameEventType.ITEM_ACQUIRED:
        return GameEventType.ITEM_ACQUIRED;
      case GameEventType.ITEM_USED:
        return GameEventType.ITEM_USED;
      case GameEventType.JOURNAL_ACQUIRED:
        return GameEventType.JOURNAL_ACQUIRED;
      case GameEventType.BOSS_DEFEATED:
        return GameEventType.BOSS_DEFEATED;
      case GameEventType.FLOOR_COMPLETED:
        return GameEventType.FLOOR_COMPLETED;
      case GameEventType.DAY_STARTED:
        return GameEventType.DAY_STARTED;
      case GameEventType.NIGHT_STARTED:
        return GameEventType.NIGHT_STARTED;
      case GameEventType.UI_JOURNAL_OPENED:
        return GameEventType.UI_JOURNAL_OPENED;
      case GameEventType.UI_JOURNAL_CLOSED:
        return GameEventType.UI_JOURNAL_CLOSED;
      case GameEventType.UI_CONSTELLATION_VIEWED:
        return GameEventType.UI_CONSTELLATION_VIEWED;
      default:
        console.warn(`Unknown legacy event type: ${legacyType}`);
        return GameEventType.UI_BUTTON_CLICKED; // Default fallback
    }
  }
  
  // Event payload interface for backward compatibility
  export interface GameEvent<T = any> {
    type: GameEventType;
    payload: T;
    timestamp: number;
    source?: string;
  }
  
  // Legacy event listener type
  export type EventListener<T = any> = (event: GameEvent<T>) => void;
  
  // Event bus interface to match old API
  interface EventBusState {
    eventLog: GameEvent[];
    listeners: Map<GameEventType, Set<EventListener>>;
    dispatch: <T>(type: GameEventType, payload: T, source?: string) => void;
    subscribe: <T>(type: GameEventType, listener: EventListener<T>) => () => void;
    subscribeMany: <T>(types: GameEventType[], listener: EventListener<T>) => () => void;
    getEventHistory: (type?: GameEventType) => GameEvent[];
    clearEventLog: () => void;
  }
  
  // Forward legacy event bus operations to the new CentralEventBus
  export const legacyEventBus = {
    getState: () => ({
      eventLog: [] as GameEvent[],
      
      // Forward dispatch to new system but with migration warning
      dispatch: <T>(type: GameEventType, payload: T, source?: string) => {
        console.warn(`[MIGRATION] Using legacy event system: ${type}. Please update to CentralEventBus.`);
        
        // Transform and forward to new system
        const newType = mapEventType(type);
        useEventBus.getState().dispatch(newType, payload, source || 'legacy_dispatch');
      },
      
      // Subscribe mapping for backward compatibility
      subscribe: <T>(type: GameEventType, listener: EventListener<T>) => {
        const newType = mapEventType(type);
        return useEventBus.getState().subscribe(newType, (event) => {
          // Transform event back to legacy format before passing to listener
          const legacyEvent: GameEvent = {
            type: type,
            payload: event.payload,
            timestamp: event.timestamp,
            source: event.source
          };
          listener(legacyEvent);
        });
      },
      
      // Multisub forwarding
      subscribeMany: <T>(types: GameEventType[], listener: EventListener<T>) => {
        const unsubscribers = types.map(type => 
          useEventBus.getState().subscribe(type, listener)
        );
        return () => unsubscribers.forEach(unsub => unsub());
      },
      
      // Simple pass-through for other methods
      getEventHistory: (type?: GameEventType) => {
        const history = useEventBus.getState().getEventHistory();
        // Filter and transform to legacy format if type is specified
        if (type) {
          const newType = mapEventType(type);
          return history
            .filter(event => event.type === newType)
            .map(event => ({
              type,
              payload: event.payload,
              timestamp: event.timestamp,
              source: event.source
            }));
        }
        return [];
      },
      
      clearEventLog: () => useEventBus.getState().clearEventLog(),
      
      // For backward compatibility with direct property access
      listeners: new Map()
    })
  };
  
  // Legacy helper method forwarding
  export const ensureCriticalProgression = () => {
    // Forward to the new system, with migration notice
    console.warn('[MIGRATION] Using legacy ensureCriticalProgression. Please update to CentralEventBus.');
    return useEventBus.getState().ensureCriticalProgression();
  };
  
  // Convenience methods for common events with migration notices
  export const gameEvents = {
    dispatch: <T>(type: GameEventType, payload: T, source?: string) => {
      console.warn(`[MIGRATION] Using legacy gameEvents.dispatch: ${type}. Please update to CentralEventBus.`);
      const newType = mapEventType(type);
      useEventBus.getState().dispatch(newType, payload, source || 'legacy_gameEvents');
    },
    
    nodeCompleted: (nodeId: string, result: any) => {
      console.warn('[MIGRATION] Using legacy gameEvents.nodeCompleted. Please update to CentralEventBus.nodeCompleted');
      useEventBus.getState().dispatch<NodeCompletionPayload>(
        GameEventType.NODE_COMPLETED, 
        { nodeId, result }
      );
    },
    
    journalAcquired: (tier: 'base' | 'technical' | 'annotated', character: string = 'kapoor') => {
      console.warn('[MIGRATION] Using legacy gameEvents.journalAcquired. Please update to CentralEventBus.journalAcquired');
      useEventBus.getState().dispatch<JournalAcquisitionPayload>(
        GameEventType.JOURNAL_ACQUIRED,
        { tier, character, source: 'legacy_journal_acquired' }
      );
    },
    
    knowledgeGained: (conceptId: string, amount: number, domain: string) => {
      console.warn('[MIGRATION] Using legacy gameEvents.knowledgeGained. Please update to CentralEventBus.knowledgeGained');
      useEventBus.getState().dispatch<KnowledgeGainPayload>(
        GameEventType.KNOWLEDGE_GAINED, 
        { conceptId, amount, domainId: domain }
      );
    }
  };
  
  export default gameEvents;