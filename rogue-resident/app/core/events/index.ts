// app/core/events/index.ts
/**
 * Events System Barrel Export
 * 
 * This file provides a unified entry point to the event system, making imports
 * simpler and preventing import errors during the migration from the legacy system.
 * 
 * USAGE:
 * import { GameEventType, useEventBus, playSoundEffect } from '../core/events';
 * 
 * ARCHITECTURAL NOTE:
 * Barrel files like this serve as a controlled interface between systems,
 * allowing implementation details to evolve without breaking dependent components.
 * This is especially critical for systems like event buses that may have many consumers.
 */

// Re-export everything from CentralEventBus
export {
  useEventBus,
  dispatchUIEvent,
  playSoundEffect,
  flashScreen,
  shakeScreen,
  showParticleEffect,
  changeGameState,
  changeGamePhase,
  nodeCompleted,
  journalAcquired,
  knowledgeGained,
  dialogueCriticalPath,
  dialogueProgressionRepair,
  safeDispatch,  // Added for resilient event dispatching
  resetEventSystem  // Added for recovery from corrupted state
} from './CentralEventBus';

// Re-export everything from EventTypes
export {
  GameEventType,
  type GameEvent,
  type EventListener,
  type UIEventPayload,
  type SoundEffectPayload,
  type ScreenFlashPayload,
  type ScreenShakePayload,
  type ParticleEffectPayload,
  type StateChangePayload,
  type KnowledgeGainPayload,
  type ProgressionRepairPayload,
  type JournalAcquisitionPayload,
  type NodeCompletionPayload,
  type DialogueCriticalPathPayload,
  type DialogueProgressionRepairPayload
} from './EventTypes';

// Re-export the compatibility layer from GameEvents
export {
  legacyEventBus,
  ensureCriticalProgression,
  gameEvents
} from './GameEvents';

// Re-export event handlers
export {
  default as baseHandlers,
  createHandler,
  createKeyHandler,
  createMouseHandler,
  createChangeHandler,
  withSound,
  withPropagation,
  withCondition,
  withTargetId,
  withDebounce,
  withVisualFeedback
} from './baseHandlers';