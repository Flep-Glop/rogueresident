// app/core/dialogue/CharacterMemorySystem.ts
/**
 * Character Memory System
 * 
 * A sophisticated system for preserving character narrative memory across gameplay sessions,
 * creating the illusion that characters remember past interactions and respond contextually.
 * 
 * This implements the "narrative memory" pattern used in Hades and Pyre where characters
 * maintain relationship context and recall specific player actions, creating an emergent
 * sense of persistent relationship even in a procedurally generated environment.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useGameStore } from '../../store/gameStore';
import { useDialogueStateMachine } from './DialogueStateMachine';
import { useEventBus } from '../events/CentralEventBus';
import { GameEventType } from '../events/EventTypes';

// Types for memory system
export type MemoryType = 
  | 'narrative'        // Story progression memories
  | 'relationship'     // Character relationship memories 
  | 'insight'          // Educational insights
  | 'experience'       // Gameplay experiences
  | 'choice'           // Major player choices
  | 'critical_path';   // Critical progression memories

export type MemoryEmotion = 
  | 'positive'        // Character feels positive about this memory
  | 'negative'        // Character feels negative about this memory
  | 'neutral'         // Character has no strong feelings
  | 'conflicted'      // Character has mixed feelings
  | 'impressed'       // Character is impressed 
  | 'disappointed';   // Character is disappointed

// Content variation based on relationship level
export type RelationshipLevel = 
  | 'stranger'        // Initial state (0)
  | 'acquaintance'    // Basic familiarity (1)
  | 'colleague'       // Working relationship (2-3)
  | 'mentor'          // Strong teaching relationship (4-5)
  | 'friend';         // Personal connection (6+)

// Character memory entry
export interface CharacterMemory {
  id: string;
  characterId: string;
  type: MemoryType;
  text: string;          // The actual memory content
  nodeId?: string;       // Where this memory was formed
  emotion?: MemoryEmotion;
  timestamp: number;     // When this memory was formed
  dayCreated: number;    // Game day when formed
  lastReferenced?: number; // Last time this was mentioned
  timesReferenced: number; // How many times referenced
  priority: number;      // 1-10, higher = more important
  tags: string[];        // For filtering and categorization
  active: boolean;       // Is this memory currently relevant
  relatedMemories?: string[]; // IDs of connected memories
  variations?: {         // Different ways to reference this memory
    [key in RelationshipLevel]?: string;
  };
}

// Major player choices that characters remember
export interface CharacterChoice {
  id: string;
  characterId: string;
  choiceId: string;
  outcome: string;
  timestamp: number;
  dayMade: number;
  active: boolean;       // Is this choice still relevant
  impactLevel: number;   // 1-10, how much this affects the character
}

// Memory query parameters
export interface MemoryQuery {
  characterId: string;
  type?: MemoryType | MemoryType[];
  tags?: string[];
  minPriority?: number;
  maxReferences?: number;
  active?: boolean;
  emotion?: MemoryEmotion | MemoryEmotion[];
  limit?: number;
}

// Character relationship data
export interface CharacterRelationship {
  characterId: string;
  level: number;         // Numeric relationship level
  tier: RelationshipLevel; // Relationship tier
  interactions: number;  // Total interactions count
  positiveInteractions: number;
  negativeInteractions: number;
  specialInteractions: Set<string>; // Unique interaction IDs
  qualities: Record<string, number>; // Character-perceived qualities
  firstMet: number;      // When first met (timestamp)
  lastInteraction: number; // Time of last interaction
}

// Context for dialogue content selection
export interface MemoryContext {
  characterId: string;
  relationshipLevel: RelationshipLevel;
  recentMemories: CharacterMemory[];
  criticalChoices: CharacterChoice[];
  currentNodeId?: string;
  dayCount: number;
  recentlyReferencedIds: Set<string>;
  preferredTopics?: string[];
}

// Character memory store interface
interface CharacterMemoryState {
  // Memory storage
  memories: CharacterMemory[];
  choices: CharacterChoice[];
  relationships: Record<string, CharacterRelationship>;
  
  // Memory management
  addMemory: (memory: Omit<CharacterMemory, 'id' | 'timestamp' | 'timesReferenced'>) => string;
  updateMemory: (id: string, updates: Partial<CharacterMemory>) => boolean;
  referenceMemory: (id: string) => boolean;
  deactivateMemory: (id: string) => boolean;
  
  // Choice tracking
  recordChoice: (characterId: string, choiceId: string, outcome: string, impactLevel?: number) => void;
  getChoiceOutcome: (characterId: string, choiceId: string) => string | null;
  
  // Memory queries
  getMemories: (query: MemoryQuery) => CharacterMemory[];
  getMostRelevantMemories: (characterId: string, count?: number) => CharacterMemory[];
  getCriticalChoices: (characterId: string) => CharacterChoice[];
  getRecentlyReferencedIds: (characterId: string, maxCount?: number) => Set<string>;
  
  // Content variation 
  getRelationshipTier: (characterId: string) => RelationshipLevel;
  getDialogueVariation: (memory: CharacterMemory) => string;
  
  // Memory context
  getMemoryContext: (characterId: string) => MemoryContext;
  
  // Utility functions
  syncRelationships: () => void;
  pruneOldMemories: (maxAge?: number) => number;
  
  // Testing and debugging
  clearAllMemories: () => void;
}

// Create the memory system store
export const useCharacterMemory = create<CharacterMemoryState>()(
  persist(
    (set, get) => ({
      // Initial state
      memories: [],
      choices: [],
      relationships: {},
      
      // Add a new memory
      addMemory: (memory) => {
        const newId = `memory-${memory.characterId}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        
        set(state => ({
          memories: [
            ...state.memories,
            {
              ...memory,
              id: newId,
              timestamp: Date.now(),
              timesReferenced: 0,
              active: true // New memories are active by default
            }
          ]
        }));
        
        return newId;
      },
      
      // Update an existing memory
      updateMemory: (id, updates) => {
        let success = false;
        
        set(state => {
          const index = state.memories.findIndex(m => m.id === id);
          
          if (index === -1) {
            return { memories: state.memories }; // No change
          }
          
          success = true;
          
          // Create updated array
          const updatedMemories = [...state.memories];
          updatedMemories[index] = {
            ...updatedMemories[index],
            ...updates
          };
          
          return { memories: updatedMemories };
        });
        
        return success;
      },
      
      // Record that a memory was referenced
      referenceMemory: (id) => {
        let success = false;
        
        set(state => {
          const index = state.memories.findIndex(m => m.id === id);
          
          if (index === -1) {
            return { memories: state.memories }; // No change
          }
          
          success = true;
          
          // Create updated array
          const updatedMemories = [...state.memories];
          updatedMemories[index] = {
            ...updatedMemories[index],
            timesReferenced: updatedMemories[index].timesReferenced + 1,
            lastReferenced: Date.now()
          };
          
          return { memories: updatedMemories };
        });
        
        return success;
      },
      
      // Deactivate a memory
      deactivateMemory: (id) => {
        return get().updateMemory(id, { active: false });
      },
      
      // Record a choice
      recordChoice: (characterId, choiceId, outcome, impactLevel = 5) => {
        // Check if this choice already exists
        const existingChoice = get().choices.find(c => 
          c.characterId === characterId && c.choiceId === choiceId
        );
        
        if (existingChoice) {
          // Update existing choice
          set(state => ({
            choices: state.choices.map(c => 
              (c.characterId === characterId && c.choiceId === choiceId)
                ? { ...c, outcome, impactLevel, timestamp: Date.now() }
                : c
            )
          }));
        } else {
          // Add new choice
          set(state => ({
            choices: [
              ...state.choices,
              {
                id: `choice-${characterId}-${choiceId}`,
                characterId,
                choiceId,
                outcome,
                impactLevel,
                timestamp: Date.now(),
                dayMade: useGameStore.getState().currentDay,
                active: true
              }
            ]
          }));
        }
        
        // Also create a memory about this choice
        get().addMemory({
          characterId,
          type: 'choice',
          text: `Made a choice about ${choiceId}: ${outcome}`,
          dayCreated: useGameStore.getState().currentDay,
          priority: impactLevel,
          tags: ['choice', choiceId],
          active: true
        });
      },
      
      // Get the outcome of a specific choice
      getChoiceOutcome: (characterId, choiceId) => {
        const choice = get().choices.find(c => 
          c.characterId === characterId && 
          c.choiceId === choiceId &&
          c.active
        );
        
        return choice ? choice.outcome : null;
      },
      
      // Get memories matching the query
      getMemories: (query) => {
        const { memories } = get();
        
        return memories.filter(memory => {
          // Must match character
          if (memory.characterId !== query.characterId) return false;
          
          // Type filter
          if (query.type) {
            if (Array.isArray(query.type)) {
              if (!query.type.includes(memory.type)) return false;
            } else {
              if (memory.type !== query.type) return false;
            }
          }
          
          // Tags filter
          if (query.tags && query.tags.length > 0) {
            if (!query.tags.some(tag => memory.tags.includes(tag))) return false;
          }
          
          // Priority filter
          if (query.minPriority !== undefined && memory.priority < query.minPriority) return false;
          
          // Reference count filter
          if (query.maxReferences !== undefined && memory.timesReferenced > query.maxReferences) return false;
          
          // Active filter
          if (query.active !== undefined && memory.active !== query.active) return false;
          
          // Emotion filter
          if (query.emotion) {
            if (!memory.emotion) return false;
            
            if (Array.isArray(query.emotion)) {
              if (!query.emotion.includes(memory.emotion)) return false;
            } else {
              if (memory.emotion !== query.emotion) return false;
            }
          }
          
          return true;
        }).slice(0, query.limit);
      },
      
      // Get most relevant memories for a character
      getMostRelevantMemories: (characterId, count = 5) => {
        const { memories } = get();
        
        // Get memories for this character that are active
        const relevantMemories = memories.filter(memory => 
          memory.characterId === characterId && memory.active
        );
        
        // Calculate relevance score
        // Based on: priority, recency, and low reference count
        const scoredMemories = relevantMemories.map(memory => {
          // Base score is the priority (1-10)
          let score = memory.priority;
          
          // Recent memories are more relevant
          const daysSinceCreation = (Date.now() - memory.timestamp) / (1000 * 60 * 60 * 24);
          score -= Math.min(daysSinceCreation, 10); // Max penalty of -10 for old memories
          
          // Less referenced memories are more interesting to bring up
          score -= Math.min(memory.timesReferenced * 0.5, 5); // Max penalty of -5 for over-referenced memories
          
          // Critical path memories get a boost
          if (memory.type === 'critical_path') {
            score += 3;
          }
          
          return { memory, score };
        });
        
        // Sort by score and take top N
        scoredMemories.sort((a, b) => b.score - a.score);
        
        return scoredMemories.slice(0, count).map(item => item.memory);
      },
      
      // Get critical choices for a character
      getCriticalChoices: (characterId) => {
        return get().choices.filter(choice => 
          choice.characterId === characterId && 
          choice.active && 
          choice.impactLevel >= 7
        );
      },
      
      // Get set of recently referenced memory IDs to avoid repetition
      getRecentlyReferencedIds: (characterId, maxCount = 10) => {
        const { memories } = get();
        
        // Get recently referenced memories
        const recentlyReferenced = memories
          .filter(memory => 
            memory.characterId === characterId && 
            memory.lastReferenced !== undefined
          )
          .sort((a, b) => 
            (b.lastReferenced || 0) - (a.lastReferenced || 0)
          )
          .slice(0, maxCount);
        
        // Create a set of IDs
        return new Set(recentlyReferenced.map(memory => memory.id));
      },
      
      // Map relationship level to tier
      getRelationshipTier: (characterId) => {
        const { relationships } = get();
        const relationship = relationships[characterId];
        
        if (!relationship) {
          return 'stranger';
        }
        
        const level = relationship.level;
        
        if (level <= 0) return 'stranger';
        if (level === 1) return 'acquaintance';
        if (level >= 2 && level <= 3) return 'colleague';
        if (level >= 4 && level <= 5) return 'mentor';
        return 'friend';
      },
      
      // Get appropriate dialogue variation based on relationship
      getDialogueVariation: (memory) => {
        const tier = get().getRelationshipTier(memory.characterId);
        
        // If there's a specific variation for this tier, use it
        if (memory.variations && memory.variations[tier]) {
          return memory.variations[tier]!;
        }
        
        // Otherwise use the default text
        return memory.text;
      },
      
      // Build a memory context for dialogue content selection
      getMemoryContext: (characterId) => {
        const recentMemories = get().getMostRelevantMemories(characterId, 5);
        const criticalChoices = get().getCriticalChoices(characterId);
        const relationshipLevel = get().getRelationshipTier(characterId);
        const recentlyReferencedIds = get().getRecentlyReferencedIds(characterId);
        
        return {
          characterId,
          relationshipLevel,
          recentMemories,
          criticalChoices,
          dayCount: useGameStore.getState().currentDay,
          recentlyReferencedIds,
          // Derive preferred topics - topics the character likes to talk about
          preferredTopics: derivePreferredTopics(characterId)
        };
      },
      
      // Sync relationship levels from game state
      syncRelationships: () => {
        const gameStore = useGameStore.getState();
        const now = Date.now();
        const currentDay = gameStore.currentDay;
        
        // Define our main characters
        const characters = ['kapoor', 'jesse', 'quinn'];
        
        set(state => {
          const updatedRelationships = { ...state.relationships };
          
          // Update each character relationship
          characters.forEach(characterId => {
            // Try to get relationship level from game store
            // Using type assertion to avoid TypeScript errors
            const level = typeof gameStore.getRelationshipLevel === 'function'
              ? gameStore.getRelationshipLevel(characterId)
              : 0;
            
            const existing = updatedRelationships[characterId];
            
            if (existing) {
              // Update existing relationship
              updatedRelationships[characterId] = {
                ...existing,
                level,
                tier: relationshipLevelToTier(level),
                lastInteraction: now
              };
            } else {
              // Create new relationship
              updatedRelationships[characterId] = {
                characterId,
                level,
                tier: relationshipLevelToTier(level),
                interactions: 0,
                positiveInteractions: 0,
                negativeInteractions: 0,
                specialInteractions: new Set<string>(),
                qualities: {},
                firstMet: now,
                lastInteraction: now
              };
              
              // Also create a "first meeting" memory
              get().addMemory({
                characterId,
                type: 'narrative',
                text: `First met the resident on day ${currentDay}`,
                dayCreated: currentDay,
                priority: 8,
                tags: ['first_meeting', 'introduction'],
                active: true
              });
            }
          });
          
          return { relationships: updatedRelationships };
        });
      },
      
      // Remove old memories to prevent storage bloat
      pruneOldMemories: (maxAge = 60) => { // Default 60 days
        const cutoffTime = Date.now() - (maxAge * 24 * 60 * 60 * 1000);
        let prunedCount = 0;
        
        set(state => {
          // Keep memories that are:
          // 1. Not too old OR
          // 2. Critical/high-priority regardless of age
          const prunedMemories = state.memories.filter(memory => {
            const isTooOld = memory.timestamp < cutoffTime;
            const isCritical = memory.type === 'critical_path' || memory.priority >= 8;
            
            const shouldKeep = !isTooOld || isCritical;
            
            if (!shouldKeep) {
              prunedCount++;
            }
            
            return shouldKeep;
          });
          
          return { memories: prunedMemories };
        });
        
        return prunedCount;
      },
      
      // Clear all memories (debugging/testing only)
      clearAllMemories: () => {
        set({
          memories: [],
          choices: [],
          relationships: {}
        });
      }
    }),
    {
      name: 'rogue-resident-character-memory',
      partialize: (state) => ({
        memories: state.memories,
        choices: state.choices,
        relationships: Object.fromEntries(
          Object.entries(state.relationships).map(([key, value]) => [
            key,
            {
              ...value,
              // Convert Set to Array for serialization
              specialInteractions: Array.from(value.specialInteractions)
            }
          ])
        )
      }),
      // Handle conversion of Arrays back to Sets during hydration
      merge: (persistedState, currentState) => {
        const typedState = persistedState as any;
        
        return {
          ...currentState,
          ...typedState,
          relationships: Object.fromEntries(
            Object.entries(typedState.relationships || {}).map(([key, value]) => [
              key,
              {
                ...value,
                // Convert Array back to Set
                specialInteractions: new Set(
                  Array.isArray((value as any).specialInteractions) 
                    ? (value as any).specialInteractions 
                    : []
                )
              }
            ])
          )
        };
      }
    }
  )
);

/**
 * Helper function to map numeric level to relationship tier
 */
function relationshipLevelToTier(level: number): RelationshipLevel {
  if (level <= 0) return 'stranger';
  if (level === 1) return 'acquaintance';
  if (level >= 2 && level <= 3) return 'colleague';
  if (level >= 4 && level <= 5) return 'mentor';
  return 'friend';
}

/**
 * Helper function to derive preferred topics for a character
 */
function derivePreferredTopics(characterId: string): string[] {
  // Character-specific topic preferences
  switch (characterId) {
    case 'kapoor':
      return ['protocol', 'calibration', 'precision', 'documentation'];
    case 'jesse':
      return ['equipment', 'practical', 'technical', 'hands-on'];
    case 'quinn':
      return ['theory', 'innovation', 'research', 'experimentation'];
    default:
      return [];
  }
}

/**
 * Initialize memory tracking for dialogue and narrative events
 * 
 * This creates event listeners to automatically record key story moments
 * without needing to explicitly call memory functions throughout the codebase.
 */
export function initializeMemorySystem(): () => void {
  const eventBus = useEventBus.getState();
  
  // Ensure relationships are synced on startup
  useCharacterMemory.getState().syncRelationships();
  
  // Array to track all cleanup functions
  const cleanupFunctions: (() => void)[] = [];
  
  // Track dialogue option selections
  cleanupFunctions.push(
    eventBus.subscribe(
      GameEventType.DIALOGUE_OPTION_SELECTED,
      (event) => {
        const { optionId, character, insightGain, relationshipChange } = event.payload;
        
        // Skip if no character
        if (!character) return;
        
        // Determine emotion based on relationship change
        let emotion: MemoryEmotion = 'neutral';
        if (relationshipChange) {
          emotion = relationshipChange > 0 ? 'positive' : 
                   relationshipChange < 0 ? 'negative' : 'neutral';
        }
        
        // Record meaningful dialogue options (with impact)
        if (relationshipChange || insightGain) {
          useCharacterMemory.getState().addMemory({
            characterId: character,
            type: 'relationship',
            text: `Selected dialogue option: ${optionId}`,
            dayCreated: useGameStore.getState().currentDay,
            emotion,
            priority: Math.abs(relationshipChange || 0) * 2,
            tags: ['dialogue', 'conversation'],
            active: true
          });
        }
      }
    )
  );
  
  // Track critical path events
  cleanupFunctions.push(
    eventBus.subscribe(
      GameEventType.DIALOGUE_CRITICAL_PATH,
      (event) => {
        const { characterId, criticalStateId, playerScore } = event.payload;
        
        // Skip if no character
        if (!characterId) return;
        
        // Determine emotion based on player score
        let emotion: MemoryEmotion = 'neutral';
        if (playerScore !== undefined) {
          emotion = playerScore >= 3 ? 'impressed' : 
                   playerScore < 0 ? 'disappointed' : 'neutral';
        }
        
        // Record a critical path memory
        useCharacterMemory.getState().addMemory({
          characterId,
          type: 'critical_path',
          text: `Experienced critical dialogue state: ${criticalStateId}`,
          dayCreated: useGameStore.getState().currentDay,
          emotion,
          priority: 9, // High priority
          tags: ['critical_path', criticalStateId],
          active: true
        });
      }
    )
  );
  
  // Track knowledge gains
  cleanupFunctions.push(
    eventBus.subscribe(
      GameEventType.KNOWLEDGE_GAINED,
      (event) => {
        const { conceptId, amount, character, domainId } = event.payload;
        
        // Skip if no associated character
        if (!character) return;
        
        // Only record significant knowledge gains
        if (amount >= 10) {
          useCharacterMemory.getState().addMemory({
            characterId: character,
            type: 'insight',
            text: `Taught about ${conceptId} (${domainId})`,
            dayCreated: useGameStore.getState().currentDay,
            emotion: 'positive',
            priority: Math.min(7, Math.floor(amount / 5)), // Scale priority by amount
            tags: ['knowledge', 'teaching', domainId],
            active: true
          });
        }
      }
    )
  );
  
  // Track game phase changes to update relationship data
  cleanupFunctions.push(
    eventBus.subscribe(
      GameEventType.GAME_PHASE_CHANGED,
      (event) => {
        // Sync relationships on phase transitions
        if (event.payload.to === 'night' || event.payload.to === 'day') {
          useCharacterMemory.getState().syncRelationships();
        }
      }
    )
  );
  
  // Return cleanup function
  return () => {
    cleanupFunctions.forEach(cleanup => cleanup());
  };
}

/**
 * Generate context-aware dialogue variations based on memory and relationship
 * 
 * This enables Hades-style contextual NPC lines where characters reference
 * past interactions and adapt dialogue based on relationship history.
 * 
 * @param characterId The speaking character's ID
 * @param baseText The default dialogue text
 * @param context Additional context tags to guide variation selection
 * @returns Context-appropriate dialogue variation
 */
export function generateContextualDialogue(
  characterId: string,
  baseText: string,
  context: {
    tags?: string[];
    nodeId?: string;
    mustIncludeMemory?: boolean;
    allowRepetition?: boolean;
  } = {}
): string {
  // Get memory context
  const memorySystem = useCharacterMemory.getState();
  const memoryContext = memorySystem.getMemoryContext(characterId);
  
  // Check if we need to include a memory reference
  if (context.mustIncludeMemory && memoryContext.recentMemories.length > 0) {
    // Filter memories to avoid recent repetition unless explicitly allowed
    const eligibleMemories = context.allowRepetition 
      ? memoryContext.recentMemories
      : memoryContext.recentMemories.filter(memory => 
          !memoryContext.recentlyReferencedIds.has(memory.id)
        );
    
    // If no eligible memories after filtering, revert to base text
    if (eligibleMemories.length === 0) {
      return baseText;
    }
    
    // Select a memory to reference
    const memory = eligibleMemories[0];
    
    // Mark this memory as referenced
    memorySystem.referenceMemory(memory.id);
    
    // Get the appropriate variation based on relationship level
    const memoryText = memorySystem.getDialogueVariation(memory);
    
    // Create opening reference to the memory
    const memoryReference = createMemoryReference(memory, memoryContext.relationshipLevel);
    
    // Combine with base text 
    return `${memoryReference} ${baseText}`;
  }
  
  // If no memory reference needed, return base text
  return baseText;
}

/**
 * Create a natural-sounding opening reference to a memory
 * 
 * This generates Hades-style memory callbacks like "I remember when you..."
 * or "Last time we spoke about..." to create narrative continuity.
 */
function createMemoryReference(memory: CharacterMemory, relationshipLevel: RelationshipLevel): string {
  // Different reference styles based on memory type and relationship
  switch (memory.type) {
    case 'narrative':
      return `I recall when ${memory.text}.`;
      
    case 'relationship':
      if (relationshipLevel === 'mentor' || relationshipLevel === 'friend') {
        return `I appreciated when you ${memory.text}.`;
      } else {
        return `I remember when you ${memory.text}.`;
      }
      
    case 'insight':
      if (relationshipLevel === 'mentor') {
        return `You showed good understanding when we discussed ${memory.text}.`;
      } else {
        return `When we last discussed ${memory.text}...`;
      }
      
    case 'choice':
      return `You chose ${memory.text}, which was interesting.`;
      
    case 'critical_path':
      return `Our work on ${memory.text} was significant.`;
      
    default:
      return `I remember ${memory.text}.`;
  }
}

/**
 * Setup memory system for the application
 * Call this once during app initialization
 */
export function setupCharacterMemorySystem(): () => void {
  const cleanupFn = initializeMemorySystem();
  
  // Subscribe to session end to clean up
  const unsubscribe = useEventBus.getState().subscribe(
    GameEventType.SESSION_ENDED,
    () => {
      cleanupFn();
      unsubscribe();
    }
  );
  
  return () => {
    cleanupFn();
    unsubscribe();
  };
}

export default {
  useCharacterMemory,
  initializeMemorySystem,
  setupCharacterMemorySystem,
  generateContextualDialogue
};