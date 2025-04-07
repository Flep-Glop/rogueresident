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

import { useEventBus } from './CentralEventBus';
import { 
  GameEventType,
  type JournalAcquisitionPayload,
  type NodeCompletionPayload,
  type KnowledgeGainPayload,
  type GameEvent,
  type EventListener
} from './EventTypes';
  
// Re-export the GameEventType from EventTypes for backward compatibility
export { GameEventType };

// Legacy event bus interface to match old API
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
      
      // No need to transform types anymore since we're using the same enum
      useEventBus.getState().dispatch(type, payload, source || 'legacy_dispatch');
    },
    
    // Subscribe mapping for backward compatibility
    subscribe: <T>(type: GameEventType, listener: EventListener<T>) => {
      return useEventBus.getState().subscribe(type, (event) => {
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
        return history
          .filter(event => event.type === type)
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
  return useEventBus.getState().ensureCriticalProgression?.() || false;
};
  
// Convenience methods for common events with migration notices
export const gameEvents = {
  dispatch: <T>(type: GameEventType, payload: T, source?: string) => {
    console.warn(`[MIGRATION] Using legacy gameEvents.dispatch: ${type}. Please update to CentralEventBus.`);
    useEventBus.getState().dispatch(type, payload, source || 'legacy_gameEvents');
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