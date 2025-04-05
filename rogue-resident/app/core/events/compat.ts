// app/core/events/compat.ts
/**
 * Compatibility Layer - Provides backward compatibility during migration
 * 
 * This module re-exports functions from both the event system and
 * the progression service to maintain the original API surface while
 * the codebase transitions to the new architecture.
 */

import { 
    GameEventType,
    GameEvent,
    EventListener,
    JournalAcquisitionPayload,
    NodeCompletionPayload,
    KnowledgeGainPayload,
    DialogueCriticalPathPayload,
    DialogueProgressionRepairPayload
  } from './EventTypes';
  
  import {
    useEventBus,
    nodeCompleted,
    journalAcquired,
    knowledgeGained,
    dialogueCriticalPath,
    dialogueProgressionRepair
  } from './CentralEventBus';
  
  import {
    ensureCriticalProgression,
    ensureJournalAcquisition,
    ensureDialogueProgression
  } from '../progression/ProgressionService';
  
  // Legacy event bus interface
  export const legacyEventBus = {
    getState: () => ({
      eventLog: useEventBus.getState().eventLog,
      
      dispatch: <T>(type: GameEventType, payload: T, source?: string) => {
        console.warn(`[MIGRATION] Using legacy event system: ${type}. Please update to CentralEventBus.`);
        useEventBus.getState().dispatch(type, payload, source || 'legacy_dispatch');
      },
      
      subscribe: <T>(type: GameEventType, listener: EventListener<T>) => {
        return useEventBus.getState().subscribe(type, listener);
      },
      
      subscribeMany: <T>(types: GameEventType[], listener: EventListener<T>) => {
        return useEventBus.getState().subscribeMany(types, listener);
      },
      
      getEventHistory: (type?: GameEventType) => {
        return useEventBus.getState().getEventHistory(type);
      },
      
      clearEventLog: () => useEventBus.getState().clearEventLog(),
      
      listeners: new Map()
    })
  };
  
  // Game events compatibility object
  export const gameEvents = {
    dispatch: <T>(type: GameEventType, payload: T, source?: string) => {
      console.warn(`[MIGRATION] Using legacy gameEvents.dispatch: ${type}. Please update to CentralEventBus.`);
      useEventBus.getState().dispatch(type, payload, source || 'legacy_gameEvents');
    },
    
    nodeCompleted,
    journalAcquired,
    knowledgeGained,
    dialogueCriticalPath,
    dialogueProgressionRepair,
    
    // Re-export progression guarantees to maintain API compatibility
    ensureCriticalProgression,
    ensureJournalAcquisition,
    ensureDialogueProgression
  };
  
  export default gameEvents;