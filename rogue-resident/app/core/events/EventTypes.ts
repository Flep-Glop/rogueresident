// app/core/events/EventTypes.ts
/**
 * Event Types - Single source of truth for all event definitions
 * 
 * This file defines all event types and their payload structures,
 * providing a central registry for the entire event system.
 */

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
  
  // ======== Payload Type Definitions ========
  
  import { SoundEffect } from '../../types/audio';
  
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