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
 * 
 * Inspired by event systems used in roguelikes like Hades where reliability
 * and recoverability are critical concerns.
 * 
 * ENHANCED: Now featuring improved dialogue progression guarantees and
 * more robust critical path handling based on state machine integration.
 */

import { create } from 'zustand';
import { SoundEffect } from '../../types/audio';

// ======== Event Type Definitions ========

// Core Game Events
export enum GameEventType {
  // Session lifecycle
  SESSION_STARTED = 'session:started',
  SESSION_ENDED = 'session:ended',
  
  // Map & navigation events
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
  DIALOGUE_CRITICAL_PATH = 'dialogue:critical:path',
  DIALOGUE_PROGRESSION_REPAIR = 'dialogue:progression:repair',
  
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
  
  // Journal UI events
  UI_JOURNAL_OPENED = 'ui:journal:opened',
  UI_JOURNAL_CLOSED = 'ui:journal:closed',
  UI_CONSTELLATION_VIEWED = 'ui:constellation:viewed',
  
  // State transition events
  GAME_STATE_CHANGED = 'state:game:changed',
  GAME_PHASE_CHANGED = 'state:phase:changed',
  
  // Progression repair events
  PROGRESSION_REPAIR = 'progression:repair',
  
  // UI interaction events
  UI_BUTTON_CLICKED = 'ui:button:clicked',
  UI_TOGGLE_CLICKED = 'ui:toggle:clicked',
  UI_CLOSE_CLICKED = 'ui:close:clicked',
  UI_OPTION_SELECTED = 'ui:option:selected',
  UI_NODE_HOVERED = 'ui:node:hovered',
  UI_NODE_CLICKED = 'ui:node:clicked',
  UI_FORM_SUBMITTED = 'ui:form:submitted',
  UI_DIALOGUE_ADVANCED = 'ui:dialogue:advanced',
  UI_INVENTORY_INTERACTION = 'ui:inventory:interaction',
  UI_KNOWLEDGE_INTERACTION = 'ui:knowledge:interaction',
  UI_CHARACTER_INTERACTION = 'ui:character:interaction',
  
  // Game effect events
  EFFECT_SOUND_PLAYED = 'effect:sound:played',
  EFFECT_SCREEN_FLASH = 'effect:screen:flash',
  EFFECT_SCREEN_SHAKE = 'effect:screen:shake',
  EFFECT_PARTICLES = 'effect:particles',
}

// ======== Event Payload Types ========

// Base event interface
export interface GameEvent<T = any> {
  type: GameEventType;
  payload: T;
  timestamp: number;
  source?: string;
  id?: string; // Unique event ID
}

// Sound effect payload
export interface SoundEffectPayload {
  effect: SoundEffect;
  volume?: number;
  loop?: boolean;
}

// Visual effect payloads
export interface ScreenFlashPayload {
  color: 'white' | 'red' | 'green' | 'blue' | 'yellow';
  duration?: number;
}

export interface ScreenShakePayload {
  intensity: 'light' | 'medium' | 'heavy';
  duration?: number;
}

export interface ParticleEffectPayload {
  type: 'reward' | 'damage' | 'heal' | 'completion' | 'knowledge';
  count: number;
  x: number;
  y: number;
  color?: string;
}

// UI event payloads
export interface UIEventPayload {
  componentId: string;
  action: string;
  metadata?: Record<string, any>;
  position?: { x: number, y: number };
  targetId?: string;
}

// State change payloads
export interface StateChangePayload {
  from: string;
  to: string;
  reason?: string;
}

// Knowledge event payload
export interface KnowledgeGainPayload {
  conceptId: string;
  amount: number;
  domainId: string;
  character?: string;
  source?: string;
}

// Progression repair payload
export interface ProgressionRepairPayload {
  checkpointId: string;
  description: string;
  forced: boolean;
  prevState?: Record<string, any>;
  newState?: Record<string, any>;
}

// Journal acquisition payload
export interface JournalAcquisitionPayload {
  tier: 'base' | 'technical' | 'annotated';
  character: string;
  source: string;
  forced?: boolean;
}

// Node completion payload
export interface NodeCompletionPayload {
  nodeId: string;
  character?: string;
  result?: {
    relationshipChange?: number;
    journalTier?: string;
    isJournalAcquisition?: boolean;
  };
}

// Dialogue critical path payload
export interface DialogueCriticalPathPayload {
  dialogueId: string;
  characterId: string;
  nodeId: string;
  criticalStateId: string;
  playerScore: number;
  wasRepaired: boolean;
}

// Dialogue progression repair payload
export interface DialogueProgressionRepairPayload {
  dialogueId: string;
  characterId: string;
  nodeId: string;
  fromStateId: string;
  toStateId: string;
  reason: string;
  loopDetected?: boolean;
}

// Event listener type
export type EventListener<T = any> = (event: GameEvent<T>) => void;

// ======== Critical Progression Tracking ========

// Key state for tracking critical progression guarantees
interface ProgressionState {
  // Journal acquisition tracking
  journalAcquired: boolean;
  journalAcquisitionTime: number | null;
  journalTier: 'base' | 'technical' | 'annotated' | null;
  journalSource: string | null;
  
  // Dialogue progression tracking
  kapoorCalibrationCompleted: boolean;
  kapoorJournalAcquisitionTriggered: boolean;
  
  // Dialogue repair tracking
  dialogueRepairAttempts: Record<string, number>;
  
  // Node completion tracking
  completedNodes: Set<string>;
}

// ======== Event Bus Store ========

interface EventBusState {
  // Event history for debugging and state recovery
  eventLog: GameEvent[];
  
  // Registered event listeners
  listeners: Map<GameEventType, Set<EventListener>>;
  
  // Critical progression tracking
  progressionState: ProgressionState;
  
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
  
  // Progression guarantees
  ensureCriticalProgression: () => boolean;
  ensureJournalAcquisition: (character?: string) => boolean;
  ensureDialogueProgression: (dialogueId: string, characterId: string, nodeId: string) => boolean;
}

// Create the event bus store
export const useEventBus = create<EventBusState>((set, get) => ({
  eventLog: [],
  listeners: new Map(),
  
  progressionState: {
    journalAcquired: false,
    journalAcquisitionTime: null,
    journalTier: null,
    journalSource: null,
    kapoorCalibrationCompleted: false,
    kapoorJournalAcquisitionTriggered: false,
    dialogueRepairAttempts: {},
    completedNodes: new Set()
  },
  
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
    
    // Special handling for critical progression events
    if (type === GameEventType.JOURNAL_ACQUIRED) {
      const journalPayload = payload as unknown as JournalAcquisitionPayload;
      
      // Update progression state
      set(state => ({
        progressionState: {
          ...state.progressionState,
          journalAcquired: true,
          journalAcquisitionTime: Date.now(),
          journalTier: journalPayload.tier,
          journalSource: journalPayload.source
        }
      }));
    }
    else if (type === GameEventType.NODE_COMPLETED) {
      const nodePayload = payload as unknown as NodeCompletionPayload;
      
      // Track completed nodes
      set(state => {
        const updatedCompletedNodes = new Set(state.progressionState.completedNodes);
        if (nodePayload.nodeId) {
          updatedCompletedNodes.add(nodePayload.nodeId);
        }
        
        // Special logic for Kapoor calibration node
        let kapoorCalibrationCompleted = state.progressionState.kapoorCalibrationCompleted;
        if (nodePayload.character === 'kapoor' && 
            nodePayload.nodeId?.includes('calibration')) {
          kapoorCalibrationCompleted = true;
        }
        
        return {
          progressionState: {
            ...state.progressionState,
            completedNodes: updatedCompletedNodes,
            kapoorCalibrationCompleted
          }
        };
      });
      
      // Check if this is a journal acquisition
      if (nodePayload.result?.isJournalAcquisition && !get().progressionState.journalAcquired) {
        // Auto-trigger journal acquisition if not already done
        const tier = nodePayload.result.journalTier as 'base' | 'technical' | 'annotated' || 'base';
        get().dispatch<JournalAcquisitionPayload>(
          GameEventType.JOURNAL_ACQUIRED,
          {
            tier,
            character: nodePayload.character || 'kapoor',
            source: 'node_completion_auto_trigger'
          }
        );
      }
    }
    else if (type === GameEventType.DIALOGUE_CRITICAL_PATH) {
      const criticalPathPayload = payload as unknown as DialogueCriticalPathPayload;
      
      // For Kapoor journal presentation
      if (criticalPathPayload.criticalStateId === 'journal-presentation' &&
          criticalPathPayload.characterId === 'kapoor') {
        
        set(state => ({
          progressionState: {
            ...state.progressionState,
            kapoorJournalAcquisitionTriggered: true
          }
        }));
        
        // If journal hasn't been acquired yet, trigger it
        if (!get().progressionState.journalAcquired) {
          // Determine journal tier based on player score
          const tier = criticalPathPayload.playerScore >= 3 ? 'annotated' :
                       criticalPathPayload.playerScore >= 0 ? 'technical' : 'base';
                       
          get().dispatch<JournalAcquisitionPayload>(
            GameEventType.JOURNAL_ACQUIRED,
            {
              tier,
              character: criticalPathPayload.characterId,
              source: 'dialogue_critical_path'
            }
          );
        }
      }
    }
    else if (type === GameEventType.DIALOGUE_PROGRESSION_REPAIR) {
      const repairPayload = payload as unknown as DialogueProgressionRepairPayload;
      
      // Track repair attempts
      set(state => {
        const dialogueKey = `${repairPayload.dialogueId}-${repairPayload.characterId}`;
        const currentAttempts = state.progressionState.dialogueRepairAttempts[dialogueKey] || 0;
        
        return {
          progressionState: {
            ...state.progressionState,
            dialogueRepairAttempts: {
              ...state.progressionState.dialogueRepairAttempts,
              [dialogueKey]: currentAttempts + 1
            }
          }
        };
      });
      
      // If this is Kapoor dialogue and repairing to journal-presentation,
      // and we haven't triggered journal acquisition yet, do it now
      if (repairPayload.characterId === 'kapoor' && 
          repairPayload.toStateId === 'journal-presentation' &&
          !get().progressionState.journalAcquired) {
        
        get().dispatch<JournalAcquisitionPayload>(
          GameEventType.JOURNAL_ACQUIRED,
          {
            tier: 'base', // Default to base tier during repair
            character: 'kapoor',
            source: 'dialogue_repair_auto_trigger',
            forced: true
          }
        );
      }
    }
    
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
  },
  
  // Enhanced critical progression guarantees
  ensureCriticalProgression: () => {
    const { progressionState } = get();
    let repairsPerformed = false;
    
    // Check for critical progression inconsistencies
    
    // 1. Journal acquisition after Kapoor calibration
    if (progressionState.kapoorCalibrationCompleted && 
        !progressionState.journalAcquired) {
      
      console.warn('[ProgressionGuarantor] Critical inconsistency: Missing journal after Kapoor calibration');
      
      // Dispatch repair event
      get().dispatch<ProgressionRepairPayload>(
        GameEventType.PROGRESSION_REPAIR,
        {
          checkpointId: 'journal-acquisition',
          description: 'Journal not acquired after calibration completion',
          forced: true
        }
      );
      
      // Force journal acquisition
      get().dispatch<JournalAcquisitionPayload>(
        GameEventType.JOURNAL_ACQUIRED,
        {
          tier: 'base',
          character: 'kapoor',
          source: 'progression_repair_auto_trigger',
          forced: true
        }
      );
      
      repairsPerformed = true;
    }
    
    // 2. Dialogue progression verification
    // This is now handled by the DialogueStateMachine
    
    return repairsPerformed;
  },
  
  // Journal acquisition guarantee
  ensureJournalAcquisition: (character: string = 'kapoor') => {
    const { progressionState } = get();
    
    if (!progressionState.journalAcquired) {
      console.warn(`[ProgressionGuarantor] Journal not acquired, forcing acquisition from ${character}`);
      
      // Force journal acquisition
      get().dispatch<JournalAcquisitionPayload>(
        GameEventType.JOURNAL_ACQUIRED,
        {
          tier: 'base',
          character,
          source: 'ensure_journal_acquisition_call',
          forced: true
        }
      );
      
      return true; // Repairs were performed
    }
    
    return false; // No repairs needed
  },
  
  // Dialogue progression guarantee
  ensureDialogueProgression: (dialogueId: string, characterId: string, nodeId: string) => {
    const { progressionState } = get();
    
    // Track if repairs were performed
    let repairsPerformed = false;
    
    // Kapoor journal acquisition verification
    if (characterId === 'kapoor' && 
        !progressionState.kapoorJournalAcquisitionTriggered) {
      
      console.warn(`[ProgressionGuarantor] Kapoor journal dialogue progression not triggered for ${dialogueId}`);
      
      // Dispatch critical path event
      get().dispatch<DialogueCriticalPathPayload>(
        GameEventType.DIALOGUE_CRITICAL_PATH,
        {
          dialogueId,
          characterId,
          nodeId,
          criticalStateId: 'journal-presentation',
          playerScore: 0, // Default to neutral score
          wasRepaired: true
        }
      );
      
      // Trigger journal acquisition
      get().dispatch<JournalAcquisitionPayload>(
        GameEventType.JOURNAL_ACQUIRED,
        {
          tier: 'base',
          character: characterId,
          source: 'ensure_dialogue_progression_call',
          forced: true
        }
      );
      
      repairsPerformed = true;
    }
    
    return repairsPerformed;
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

// ======== Migration Helpers ========

/**
 * Wrapper for old event bus compatibility
 * This helps with the transition from old events to new centralized system
 */
export const gameEvents = {
  dispatch: useEventBus.getState().dispatch,
  nodeCompleted,
  journalAcquired,
  knowledgeGained,
  dialogueCriticalPath,
  dialogueProgressionRepair
};

// ======== Critical Progression Guarantee Middleware ========

/**
 * Ensures critical progression chains have occurred and repairs if needed
 * Enhanced with better dialogue flow integration
 */
export function ensureCriticalProgression() {
  return useEventBus.getState().ensureCriticalProgression();
}

/**
 * Ensures the journal has been acquired
 */
export function ensureJournalAcquisition(character: string = 'kapoor') {
  return useEventBus.getState().ensureJournalAcquisition(character);
}

/**
 * Ensures proper dialogue progression for critical characters
 */
export function ensureDialogueProgression(
  dialogueId: string,
  characterId: string,
  nodeId: string
) {
  return useEventBus.getState().ensureDialogueProgression(dialogueId, characterId, nodeId);
}

// Export all helpers and types
export default {
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
  ensureCriticalProgression,
  ensureJournalAcquisition,
  ensureDialogueProgression,
  gameEvents
};