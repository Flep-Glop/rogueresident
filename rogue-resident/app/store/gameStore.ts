// app/store/gameStore.ts
/**
 * Unified Game State Management
 * 
 * This store consolidates all core game systems into a cohesive state machine
 * with discrete, composable slices. The architecture follows the "composed stores"
 * pattern where each slice manages a specific domain while maintaining
 * cross-slice communication through a central event bus.
 * 
 * Implementation is inspired by Supergiant's state management architecture
 * used in Hades and Pyre, where transactional integrity and restart resilience
 * were key design goals.
 *  
 * Updated with Chamber Pattern optimizations for maximum rendering performance
 * using primitive extraction and stable references.
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { shallow } from 'zustand/shallow';
import CentralEventBus, { useEventBus, safeDispatch } from '@/app/core/events/CentralEventBus';
import { GameEventType } from '@/app/core/events/EventTypes';
import { GameStateMachine } from '@/app/core/statemachine/GameStateMachine';
import { progressionResolver } from '@/app/core/progression/ProgressionResolver';
import DialogueStateMachine, { useDialogueStateMachine } from '@/app/core/dialogue/DialogueStateMachine';

// Import related stores for cross-store actions
import { useKnowledgeStore } from './knowledgeStore';
import { useJournalStore } from './journalStore';
import { useResourceStore } from './resourceStore';

// Import player entity type
import { PlayerEntity, DEFAULT_PLAYER_ENTITY } from '@/app/types/player';

// Import Chamber pattern hooks
import { 
  usePrimitiveStoreValue, 
  useStableStoreValue, 
  createStableSelector,
  usePrimitiveValues
} from '@/app/core/utils/storeHooks';

// Type imports
import type {
  GameState,
  GameStateActions,
  DialogueState,
  DialogueActions,
  EventBusState,
  EventBusActions,
  KnowledgeState,
  KnowledgeActions,
  ResourceState,
  ResourceActions,
  JournalState,
  JournalActions,
  CombinedState,
  DialogueNode,
  NarrativeEvent,
  InsightNode,
  JournalEntry,
  DialogueSystemConfig,
  DialogueChoice,
  InsightConnection,
} from '@/app/types/game';

// =======================================================
// Player State Slice - Player Entity Management
// =======================================================

interface PlayerActions {
  updateInsight: (amount: number, source?: string) => void;
  setMomentum: (level: number) => void;
  incrementMomentum: () => void;
  resetMomentum: () => void;
  updateKnowledgeMastery: (conceptId: string, amount: number, domainId: string) => void;
  addToInventory: (itemId: string) => void;
  applyBuff: (buffId: string, duration?: number) => void;
  removeBuff: (buffId: string) => void;
}

const createPlayerSlice = (
  set: (fn: (state: CombinedState) => void) => void,
  get: () => CombinedState
): { player: PlayerEntity } & PlayerActions => ({
  // Default player state
  player: { ...DEFAULT_PLAYER_ENTITY },
  
  /**
   * Update player insight directly
   * Primary interface for resource management
   */
  updateInsight: (amount: number, source?: string) => {
    console.log(`[Player] Updating insight by ${amount} from ${source || 'unknown'}`);
    
    set(state => {
      // Calculate new insight with min/max bounds
      const current = state.player.insight;
      const newValue = Math.max(0, Math.min(state.player.insightMax, current + amount));
      const actualChange = newValue - current;
      
      // Only update if there's an actual change
      if (actualChange !== 0) {
        state.player.insight = newValue;
        
        // Emit the resource changed event using the event bus
        if (Math.abs(actualChange) >= 1) {
          get().emit(GameEventType.RESOURCE_CHANGED, {
            resourceType: 'insight',
            previousValue: current,
            newValue,
            change: actualChange,
            source
          });
        }
      }
    });
  },
  
  /**
   * Set player momentum level
   */
  setMomentum: (level: number) => {
    console.log(`[Player] Setting momentum to ${level}`);
    
    set(state => {
      // Ensure level is within bounds
      const newLevel = Math.max(0, Math.min(state.player.maxMomentum, level));
      const currentLevel = state.player.momentum;
      
      // Only update if there's a change
      if (newLevel !== currentLevel) {
        state.player.momentum = newLevel;
        
        // Emit the momentum changed event
        get().emit(GameEventType.RESOURCE_CHANGED, {
          resourceType: 'momentum',
          previousValue: currentLevel,
          newValue: newLevel,
          change: newLevel - currentLevel
        });
      }
    });
  },
  
  /**
   * Increment momentum (typically after correct answers)
   */
  incrementMomentum: () => {
    console.log('[Player] Incrementing momentum');
    
    set(state => {
      const currentMomentum = state.player.momentum;
      if (currentMomentum < state.player.maxMomentum) {
        state.player.momentum = currentMomentum + 1;
        
        // Emit the momentum increased event
        get().emit(GameEventType.MOMENTUM_INCREASED, { 
          newLevel: state.player.momentum 
        });
      }
    });
  },
  
  /**
   * Reset momentum (typically after incorrect answers or boast failures)
   */
  resetMomentum: () => {
    console.log('[Player] Resetting momentum');
    
    set(state => {
      if (state.player.momentum > 0) {
        state.player.momentum = 0;
        
        // Emit the momentum reset event
        get().emit(GameEventType.MOMENTUM_RESET, {});
      }
    });
  },
  
  /**
   * Update knowledge mastery (delegate to knowledge store)
   */
  updateKnowledgeMastery: (conceptId: string, amount: number, domainId: string) => {
    // Delegate to knowledge store
    const knowledgeStore = useKnowledgeStore.getState();
    if (knowledgeStore && knowledgeStore.updateMastery) {
      knowledgeStore.updateMastery(conceptId, amount);
      
      // Sync player's knowledge summary
      set(state => {
        // Add to recently mastered if significant gain
        if (amount >= 15) {
          state.player.knowledgeMastery.recentlyMastered = 
            [conceptId, ...state.player.knowledgeMastery.recentlyMastered].slice(0, 5);
        }
        
        // Sync with knowledge store values
        if (knowledgeStore.totalMastery !== undefined) {
          state.player.knowledgeMastery.overall = knowledgeStore.totalMastery;
        }
        
        // Sync domain mastery
        if (knowledgeStore.domainMastery && domainId) {
          state.player.knowledgeMastery.byDomain[domainId] = 
            knowledgeStore.domainMastery[domainId] || 0;
        }
      });
    }
  },
  
  /**
   * Add an item to player inventory (simplified for vertical slice)
   */
  addToInventory: (itemId: string) => {
    console.log(`[Player] Adding item to inventory: ${itemId}`);
    
    set(state => {
      if (!state.player.inventory.includes(itemId)) {
        state.player.inventory.push(itemId);
        
        // Emit item acquired event
        get().emit(GameEventType.ITEM_ACQUIRED, { 
          itemId 
        });
      }
    });
  },
  
  /**
   * Apply a temporary buff to the player
   */
  applyBuff: (buffId: string, duration?: number) => {
    console.log(`[Player] Applying buff: ${buffId}`);
    
    set(state => {
      if (!state.player.activeBuffs.includes(buffId)) {
        state.player.activeBuffs.push(buffId);
        
        // Emit buff applied event
        get().emit(GameEventType.BUFF_APPLIED, { 
          buffId, duration 
        });
        
        // If duration provided, schedule removal
        if (duration && typeof window !== 'undefined') {
          setTimeout(() => {
            get().removeBuff(buffId);
          }, duration);
        }
      }
    });
  },
  
  /**
   * Remove a buff from the player
   */
  removeBuff: (buffId: string) => {
    console.log(`[Player] Removing buff: ${buffId}`);
    
    set(state => {
      state.player.activeBuffs = state.player.activeBuffs.filter(id => id !== buffId);
      
      // Emit buff removed event
      get().emit(GameEventType.BUFF_REMOVED, { 
        buffId 
      });
    });
  }
});

// =======================================================
// Event Bus Slice - Core Communication Layer
// =======================================================

const createEventBusSlice = (
  set: (fn: (state: CombinedState) => void) => void,
  get: () => CombinedState
): EventBusState & EventBusActions => {
  // Get singleton instance from our hybrid implementation
  const busInstance = CentralEventBus.getInstance();
  
  return {
    instance: busInstance,
    
    /**
     * Emit an event to the bus
     * Abstraction layer that could include game-specific event processing
     */
    emit: <T = any>(eventType: GameEventType, payload?: T) => {
      console.log(`[GameStore] Emitting event: ${eventType}`);
      busInstance.dispatch(eventType, payload, 'gameStore');
    },
  };
};

// =======================================================
// Game State Machine Slice - Core Game Flow
// =======================================================

const createGameStateSlice = (
  set: (fn: (state: CombinedState) => void) => void,
  get: () => CombinedState
): GameState & GameStateActions => ({
  // Core state
  stateMachine: null,
  progressionResolver: null,
  currentMode: 'exploration',
  map: null,
  inventory: [],
  isLoading: true,
  error: null,
  
  /**
   * Change the current game mode
   */
  setGameMode: (mode: GameState['currentMode']) =>
    set((state) => {
      state.currentMode = mode;
      console.log(`[GameState] Mode set to: ${mode}`);
      get().emit(GameEventType.GAME_MODE_CHANGED, { mode });
    }),
  
  /**
   * Update loading state
   */
  setLoading: (isLoading: boolean) =>
    set((state) => {
      state.isLoading = isLoading;
    }),
  
  /**
   * Set error state
   */
  setError: (error: string | null) =>
    set((state) => {
      state.error = error;
      if (error) {
        console.error(`[GameState] Error: ${error}`);
        get().emit(GameEventType.ERROR_LOGGED, { message: error });
      }
    }),
  
  /**
   * Initialize the game state machine
   * A transaction that ensures all critical systems are bootstrapped
   * in the correct sequence and with proper error handling
   */
  initializeGame: (initialState: { startingMode?: GameState['currentMode'] }) =>
    set((state) => {
      console.log('[GameState] Beginning game initialization...');
      // Signal initialization started
      get().emit(GameEventType.SYSTEM_INITIALIZED, { component: 'gameState', phase: 'begin' });
      
      try {
        // 1. Create game state machine if not exists
        if (!state.stateMachine) {
          console.log('[GameState] Creating state machine...');
          state.stateMachine = new GameStateMachine(get().instance);
        }
        
        // 2. Assign progression resolver
        if (!state.progressionResolver) {
          console.log('[GameState] Setting up progression resolver...');
          state.progressionResolver = progressionResolver;
        }
        
        // 3. Set initial state values
        state.currentMode = initialState.startingMode ?? 'exploration';
        state.isLoading = false;
        state.error = null;
        
        // 4. Initialize map with placeholder for prototyping
        if (!state.map) {
          state.map = {
            seed: Math.floor(Math.random() * 1000000).toString(),
            nodes: [],
            connections: [],
            currentLocation: 'kapoor_lab',
            discoveredLocations: ['kapoor_lab', 'corridor_1', 'resident_office']
          };
        }
        
        // 5. Signal successful initialization
        console.log('[GameState] Game initialization complete');
        get().emit(GameEventType.GAME_INITIALIZED, { mode: state.currentMode });
        
      } catch (error: any) {
        // Handle initialization failures gracefully
        console.error('[GameState] Initialization failed:', error);
        state.error = error.message || 'Game initialization failed';
        state.isLoading = false;
        get().emit(GameEventType.ERROR_LOGGED, { 
          component: 'gameStateMachine',
          message: state.error,
          stack: error.stack
        });
      }
    }),
});

// =======================================================
// Dialogue System Slice - Conversation State & Flow
// =======================================================

const createDialogueSlice = (
  set: (fn: (state: CombinedState) => void) => void,
  get: () => CombinedState
): DialogueState & DialogueActions => ({
  // Core state
  dialogueStateMachine: null,
  currentDialogueId: null,
  currentNodeId: null,
  currentSpeaker: null,
  currentText: '',
  currentMood: null,
  currentChoices: [],
  isDialogueActive: false,
  isDialogueLoading: false,
  dialogueError: null,

  /**
   * Initialize the dialogue system
   * Creates the dialogue state machine with provided configuration
   */
  initializeDialogueSystem: (config: DialogueSystemConfig) =>
    set((state) => {
      if (!state.dialogueStateMachine) {
        try {
          console.log('[Dialogue] Initializing dialogue system...');
          // Use our hybrid implementation to get dialogue state machine
          state.dialogueStateMachine = DialogueStateMachine;
          get().emit(GameEventType.DIALOGUE_SYSTEM_INITIALIZED, { config });
        } catch (error: any) {
          console.error('[Dialogue] Failed to initialize dialogue system:', error);
          state.dialogueError = error.message || 'Failed to initialize dialogue system';
          get().emit(GameEventType.ERROR_LOGGED, { 
            component: 'dialogueSystem',
            message: state.dialogueError
          });
        }
      } else {
        console.warn('[Dialogue] Dialogue system already initialized');
      }
    }),

  /**
   * Start a dialogue sequence
   * Activates a specific dialogue tree by ID and loads the initial node
   */
  startDialogue: (dialogueId: string) => {
    console.log(`[Dialogue] Starting dialogue: ${dialogueId}`);
    const dialogueStateMachine = get().dialogueStateMachine;
    
    // Validate dialogue system is ready
    if (!dialogueStateMachine) {
      console.error('[Dialogue] Dialogue state machine not initialized');
      set((state) => {
        state.dialogueError = 'Dialogue system not ready';
        state.isDialogueActive = false;
      });
      get().emit(GameEventType.DIALOGUE_ERROR, { error: 'Dialogue system not ready' });
      return;
    }

    // Begin dialogue transaction
    set((state) => {
      state.isDialogueLoading = true;
      state.dialogueError = null;
    });

    try {
      // Start the dialogue in the state machine
      dialogueStateMachine.start(dialogueId);
      const currentNode = dialogueStateMachine.getCurrentNode();
      
      // Validate node was retrieved
      if (!currentNode) {
        throw new Error(`Dialogue "${dialogueId}" or its start node not found`);
      }
      
      // Update store with dialogue node details
      console.log(`[Dialogue] ${dialogueId} started. Current node: ${currentNode.id}`);
      set((state) => {
        state.isDialogueActive = true;
        state.currentDialogueId = dialogueId;
        state.currentNodeId = currentNode.id;
        state.currentSpeaker = currentNode.speaker;
        state.currentText = currentNode.text;
        state.currentMood = currentNode.mood ?? null;
        state.currentChoices = currentNode.choices ?? [];
        state.isDialogueLoading = false;
      });
      
      // Emit events
      get().emit(GameEventType.DIALOGUE_STARTED, { dialogueId });
      get().emit(GameEventType.DIALOGUE_NODE_CHANGED, { node: currentNode });

    } catch (error: any) {
      // Handle startup failure gracefully
      console.error(`[Dialogue] Error starting dialogue ${dialogueId}:`, error);
      set((state) => {
        state.dialogueError = error.message || 'Failed to start dialogue';
        state.isDialogueActive = false;
        state.isDialogueLoading = false;
      });
      get().emit(GameEventType.DIALOGUE_ERROR, { 
        error: error.message || 'Failed to start dialogue'
      });
    }
  },

  /**
   * Advance dialogue to next node
   * Progresses conversation based on player choice (if applicable)
   */
  advanceDialogue: (choiceIndex?: number) => {
    console.log(`[Dialogue] Advancing dialogue with choice: ${choiceIndex !== undefined ? choiceIndex : 'auto'}`);
    const dialogueStateMachine = get().dialogueStateMachine;
    const isDialogueActive = get().isDialogueActive;

    // Validate dialogue is active and system ready
    if (!dialogueStateMachine || !isDialogueActive) {
      console.warn('[Dialogue] Cannot advance dialogue: Not active or not initialized');
      return;
    }

    // Begin advance transaction
    set((state) => { state.isDialogueLoading = true; });

    try {
      // Advance the state machine
      dialogueStateMachine.advance(choiceIndex);
      const currentNode = dialogueStateMachine.getCurrentNode();

      // Check for dialogue end
      if (!currentNode || currentNode.isEndingNode) {
        console.log('[Dialogue] Reached ending node - concluding dialogue');
        get().endDialogue();
        return;
      }

      // Update store with new node details
      console.log(`[Dialogue] Advanced to node: ${currentNode.id}`);
      set((state) => {
        state.currentNodeId = currentNode.id;
        state.currentSpeaker = currentNode.speaker;
        state.currentText = currentNode.text;
        state.currentMood = currentNode.mood ?? null;
        state.currentChoices = currentNode.choices ?? [];
        state.isDialogueLoading = false;
      });

      // Handle special node types and events
      const isPause = currentNode && 'isPauseNode' in currentNode && !!currentNode.isPauseNode;
      
      // Emit appropriate events
      if (isPause) {
        console.log("[Dialogue] Pause node encountered");
        get().emit(GameEventType.DIALOGUE_PAUSED, { nodeId: currentNode.id });
      } else {
        get().emit(GameEventType.DIALOGUE_NODE_CHANGED, { node: currentNode });
      }

      // Process node-specific events if any
      if (currentNode.events && currentNode.events.length > 0) {
        console.log(`[Dialogue] Processing ${currentNode.events.length} events for node ${currentNode.id}`);
        currentNode.events.forEach((event: NarrativeEvent) => {
          get().handleNarrativeEvent(event);
        });
      }

    } catch (error: any) {
      // Handle advancement failure gracefully
      console.error('[Dialogue] Error advancing dialogue:', error);
      set((state) => {
        state.dialogueError = error.message || 'Failed to advance dialogue';
        state.isDialogueLoading = false;
      });
      get().emit(GameEventType.DIALOGUE_ERROR, { error: state.dialogueError });
    }
  },

  /**
   * End the current dialogue sequence
   * Cleans up dialogue state and emits appropriate events
   */
  endDialogue: () => {
    const currentDialogueId = get().currentDialogueId;
    console.log(`[Dialogue] Ending dialogue: ${currentDialogueId}`);
    
    set((state) => {
      if (state.isDialogueActive) {
        // Reset all dialogue state
        state.isDialogueActive = false;
        state.currentDialogueId = null;
        state.currentNodeId = null;
        state.currentSpeaker = null;
        state.currentText = '';
        state.currentMood = null;
        state.currentChoices = [];
        state.dialogueError = null;
        state.isDialogueLoading = false;
      } else {
        console.warn("[Dialogue] Attempted to end dialogue that wasn't active");
      }
    });
    
    // Emit completion event
    get().emit(GameEventType.DIALOGUE_ENDED, { dialogueId: currentDialogueId });
  },

  /**
   * Update current dialogue ID
   * Utility method for dialogue management
   */
  setCurrentDialogueId: (id: string | null) => {
    set((state) => { state.currentDialogueId = id; });
  },
});

// =======================================================
// Knowledge System Slice - Player Understanding Tracking
// =======================================================

const createKnowledgeSlice = (
  set: (fn: (state: CombinedState) => void) => void,
  get: () => CombinedState
): KnowledgeState & KnowledgeActions => ({
  // Core knowledge state
  knownInsights: {},
  insightConnections: [],
  unlockedTopics: new Set(),
  isConstellationVisible: false,
  activeInsightId: null,
  
  /**
   * Add a new insight to player knowledge
   * @deprecated Use unlockKnowledge instead
   */
  addInsight: (insightId: string) => {
    console.log(`[Knowledge] Adding insight: ${insightId}`);
    
    // Delegate to knowledge store
    const knowledgeStore = useKnowledgeStore.getState();
    if (knowledgeStore && knowledgeStore.addInsight) {
      knowledgeStore.addInsight(insightId);
    } else {
      console.warn(`[Knowledge] Knowledge store not available for addInsight`);
    }
  },
  
  /**
   * Unlock knowledge node (new interface-aligned method)
   */
  unlockKnowledge: (knowledgeId: string) => {
    console.log(`[Knowledge] Unlocking knowledge: ${knowledgeId}`);
    
    // Delegate to knowledge store
    const knowledgeStore = useKnowledgeStore.getState();
    if (knowledgeStore && knowledgeStore.addInsight) {
      // Call the implementation method
      knowledgeStore.addInsight(knowledgeId);
    } else {
      console.warn(`[Knowledge] Knowledge store not available for unlockKnowledge`);
    }
    
    // Emit consistent event
    get().emit(GameEventType.INSIGHT_REVEALED, { 
      insightId: knowledgeId,
      isNewDiscovery: true
    });
  },
  
  /**
   * Create a connection between insights
   */
  addConnection: (fromId: string, toId: string) => {
    console.log(`[Knowledge] Adding connection: ${fromId} → ${toId}`);
    
    // Delegate to knowledge store
    const knowledgeStore = useKnowledgeStore.getState();
    if (knowledgeStore && knowledgeStore.addConnection) {
      knowledgeStore.addConnection(fromId, toId);
      
      // Emit connection event
      get().emit(GameEventType.INSIGHT_CONNECTED, { 
        connection: {
          from: fromId,
          to: toId
        }
      });
    } else {
      console.warn(`[Knowledge] Knowledge store not available for addConnection`);
    }
  },
  
  /**
   * Unlock a topic in the knowledge system
   */
  unlockTopic: (topicId: string) => {
    console.log(`[Knowledge] Unlocking topic: ${topicId}`);
    
    // Delegate to knowledge store
    const knowledgeStore = useKnowledgeStore.getState();
    if (knowledgeStore && knowledgeStore.unlockTopic) {
      knowledgeStore.unlockTopic(topicId);
      
      // Update local state for quick access
      set(state => {
        state.unlockedTopics.add(topicId);
      });
      
      // Emit domain unlocked event
      get().emit(GameEventType.DOMAIN_UNLOCKED, { 
        domainId: topicId 
      });
    } else {
      console.warn(`[Knowledge] Knowledge store not available for unlockTopic`);
    }
  },
  
  /**
   * Toggle constellation visibility
   */
  setConstellationVisibility: (isVisible: boolean) => {
    console.log(`[Knowledge] Setting constellation visibility: ${isVisible}`);
    
    // Delegate to knowledge store
    const knowledgeStore = useKnowledgeStore.getState();
    if (knowledgeStore && knowledgeStore.setConstellationVisibility) {
      knowledgeStore.setConstellationVisibility(isVisible);
      
      // Update local state for quick access
      set(state => {
        state.isConstellationVisible = isVisible;
      });
      
      // Emit constellation updated event when visibility changes
      get().emit(GameEventType.CONSTELLATION_UPDATED, { 
        visibilityChanged: true,
        isVisible
      });
    } else {
      console.warn(`[Knowledge] Knowledge store not available for setConstellationVisibility`);
    }
  },
  
  /**
   * Set active insight node for focused interaction
   */
  setActiveInsight: (insightId: string | null) => {
    console.log(`[Knowledge] Setting active insight: ${insightId}`);
    
    // Delegate to knowledge store
    const knowledgeStore = useKnowledgeStore.getState();
    if (knowledgeStore && knowledgeStore.setActiveInsight) {
      knowledgeStore.setActiveInsight(insightId);
      
      // Update local state for quick access
      set(state => {
        state.activeInsightId = insightId;
      });
      
      // Emit insight selection event
      if (insightId) {
        get().emit(GameEventType.UI_NODE_CLICKED, { 
          nodeId: insightId,
          type: 'insight'
        });
      }
    } else {
      console.warn(`[Knowledge] Knowledge store not available for setActiveInsight`);
    }
  },
});

// =======================================================
// Resource System Slice - Player Resources & Actions
// =======================================================

const createResourceSlice = (
  set: (fn: (state: CombinedState) => void) => void,
  get: () => CombinedState
): ResourceState & ResourceActions => ({
  // Core resource state
  resources: {},
  
  /**
   * Add to a resource value
   */
  addResource: (resourceId: string, amount: number) => {
    console.log(`[Resources] Adding ${amount} to ${resourceId}`);
    
    // Delegate to resource store
    const resourceStore = useResourceStore.getState();
    if (resourceStore && resourceStore.addResource) {
      resourceStore.addResource(resourceId, amount);
      
      // Emit resource changed event
      get().emit(GameEventType.RESOURCE_CHANGED, {
        resourceId,
        amount,
        reason: 'add'
      });
      
      // Emit specific resource events based on resource type
      if (resourceId === 'insight' && amount > 0) {
        get().emit(GameEventType.INSIGHT_GAINED, { amount });
      } else if (resourceId === 'insight' && amount < 0) {
        get().emit(GameEventType.INSIGHT_SPENT, { amount: Math.abs(amount) });
      } else if (resourceId === 'momentum' && amount > 0) {
        get().emit(GameEventType.MOMENTUM_INCREASED, { amount });
      } else if (resourceId === 'momentum' && amount < 0) {
        get().emit(GameEventType.MOMENTUM_RESET, {});
      }
    } else {
      console.warn(`[Resources] Resource store not available for addResource`);
    }
  },
  
  /**
   * Set a resource to specific value
   */
  setResource: (resourceId: string, amount: number) => {
    console.log(`[Resources] Setting ${resourceId} to ${amount}`);
    
    // Delegate to resource store
    const resourceStore = useResourceStore.getState();
    if (resourceStore && resourceStore.setResource) {
      // Get previous value for change calculation
      const previousValue = resourceStore.resources[resourceId] || 0;
      
      // Set the new value
      resourceStore.setResource(resourceId, amount);
      
      // Emit resource changed event
      get().emit(GameEventType.RESOURCE_CHANGED, {
        resourceId,
        amount,
        previousValue,
        reason: 'set'
      });
    } else {
      console.warn(`[Resources] Resource store not available for setResource`);
    }
  },
  
  /**
   * Check if player has enough of a resource
   */
  hasEnoughResource: (resourceId: string, amount: number): boolean => {
    // Delegate to resource store
    const resourceStore = useResourceStore.getState();
    if (resourceStore && resourceStore.hasEnoughResource) {
      return resourceStore.hasEnoughResource(resourceId, amount);
    } else {
      console.warn(`[Resources] Resource store not available for hasEnoughResource`);
      return false;
    }
  },
  
  /**
   * Reset resources to initial values
   * Implements the missing method from the interface
   */
  resetResources: () => {
    console.log(`[Resources] Resetting all resources to initial values`);
    
    // Delegate to resource store
    const resourceStore = useResourceStore.getState();
    if (resourceStore) {
      // Reset insight to 0
      if (resourceStore.setResource) {
        resourceStore.setResource('insight', 0);
      }
      
      // Reset momentum to 0
      if (resourceStore.setResource) {
        resourceStore.setResource('momentum', 0);
      }
      
      // Reset any other resources to their defaults
      // Add more resources here as needed
      
      // Emit resource reset event
      get().emit(GameEventType.RESOURCE_CHANGED, {
        reason: 'reset',
        affectedResources: ['insight', 'momentum']
      });
    } else {
      console.warn(`[Resources] Resource store not available for resetResources`);
    }
  },
});

// =======================================================
// Journal System Slice - Player Notes & Discoveries
// =======================================================

const createJournalSlice = (
  set: (fn: (state: CombinedState) => void) => void,
  get: () => CombinedState
): JournalState & JournalActions => ({
  // Core journal state
  entries: [],
  lastEntryTimestamp: null,
  isJournalOpen: false,
  
  /**
   * Add a new journal entry (original method)
   */
  addJournalEntry: (entryData: Omit<JournalEntry, 'timestamp' | 'id'>) => {
    console.log(`[Journal] Adding entry via addJournalEntry: ${entryData.title || 'Untitled'}`);
    
    // Forward to the unified implementation
    get().addEntry(entryData);
  },
  
  /**
   * Add a new journal entry (interface-aligned method)
   */
  addEntry: (entryData: Omit<JournalEntry, 'timestamp' | 'id'>) => {
    console.log(`[Journal] Adding entry via addEntry: ${entryData.title || 'Untitled'}`);
    
    // Delegate to journal store
    const journalStore = useJournalStore.getState();
    if (journalStore && journalStore.addEntry) {
      // Call implementation method
      journalStore.addEntry(entryData);
      
      // Update local timestamp for quick access
      set(state => {
        state.lastEntryTimestamp = new Date();
      });
      
      // Emit journal entry added event
      get().emit(GameEventType.JOURNAL_ENTRY_ADDED, { 
        title: entryData.title,
        category: entryData.category,
        timestamp: new Date().toISOString()
      });
    } else {
      console.warn(`[Journal] Journal store not available for addEntry`);
    }
  },
  
  /**
   * Toggle journal UI visibility
   */
  setJournalOpen: (isOpen: boolean) => {
    console.log(`[Journal] Setting journal open: ${isOpen}`);
    
    // Delegate to journal store
    const journalStore = useJournalStore.getState();
    if (journalStore && journalStore.setJournalOpen) {
      journalStore.setJournalOpen(isOpen);
      
      // Update local state for quick access
      set(state => {
        state.isJournalOpen = isOpen;
      });
      
      // Emit appropriate event
      if (isOpen) {
        get().emit(GameEventType.JOURNAL_OPENED, {});
      } else {
        get().emit(GameEventType.JOURNAL_CLOSED, {});
      }
    } else {
      console.warn(`[Journal] Journal store not available for setJournalOpen`);
    }
  },
});

// =======================================================
// Combined Game Store - Unified State Management
// =======================================================

/**
 * Main game store combining all slices
 * Uses immer for immutable updates with mutable syntax
 */
export const useGameStore = create<CombinedState>()(
  immer((set, get) => ({
    // Combine all slices
    ...createEventBusSlice(set, get),
    ...createGameStateSlice(set, get),
    ...createDialogueSlice(set, get),
    ...createKnowledgeSlice(set, get),
    ...createResourceSlice(set, get),
    ...createJournalSlice(set, get),
    ...createPlayerSlice(set, get),

    /**
     * Global narrative event handler
     * Processes events from dialogue system and other narrative triggers
     */
    handleNarrativeEvent: (event: NarrativeEvent) => {
      console.log(`[NarrativeEvent] Handling: ${event.type}`, event.payload);
      
      // Access other stores for cross-store operations
      const knowledgeStore = useKnowledgeStore.getState();
      const journalStore = useJournalStore.getState();
      const resourceStore = useResourceStore.getState();
      
      // Handle different event types
      switch (event.type) {
        // === Knowledge events ===
        case GameEventType.INSIGHT_REVEALED:
          const insightPayload = event.payload as { 
            insightId: string; 
            connection?: { from: string; to: string } 
          };
          
          // Add the insight to knowledge using interface-aligned method
          if (insightPayload?.insightId && knowledgeStore) {
            // Use unlockKnowledge (via delegation to the aligned method)
            get().unlockKnowledge(insightPayload.insightId);
            
            // Emit a mastery increased event
            get().emit(GameEventType.MASTERY_INCREASED, {
              conceptId: insightPayload.insightId,
              amount: 25 // Default mastery gain
            });
          }
          
          // Add connection if specified
          if (insightPayload?.connection && knowledgeStore) {
            get().addConnection(
              insightPayload.connection.from, 
              insightPayload.connection.to
            );
            console.log("Connection added via INSIGHT_REVEALED event");
          }
          break;

        // === Journal events ===
        case GameEventType.JOURNAL_ENTRY_TRIGGERED:
          const journalPayload = event.payload as Omit<JournalEntry, 'id' | 'timestamp'>;
          
          // Add the journal entry using interface-aligned method
          if (journalPayload) {
            // Use addEntry (the aligned interface method)
            get().addEntry(journalPayload);
            
            // Auto-open journal when important entries are added
            if (journalPayload.isNew) {
              get().setJournalOpen(true);
            }
          }
          break;
          
        // === Resource events ===
        case GameEventType.RESOURCE_CHANGED:
          const resourcePayload = event.payload as {
            resourceId: string;
            amount: number;
            reason?: string;
          };
          
          // Update resources
          if (resourcePayload && resourceStore) {
            if (resourcePayload.amount > 0) {
              get().addResource(
                resourcePayload.resourceId, 
                resourcePayload.amount
              );
            } else {
              get().setResource(
                resourcePayload.resourceId, 
                resourcePayload.amount
              );
            }
          }
          break;
          
        // === Strategic action events ===
        case GameEventType.STRATEGIC_ACTION_ACTIVATED:
          const actionPayload = event.payload as {
            actionType: string;
            insightCost: number;
          };
          
          // Apply resource cost
          if (actionPayload && resourceStore && actionPayload.insightCost > 0) {
            get().addResource('insight', -actionPayload.insightCost);
          }
          break;

        // === Add cases for other event types ===
        default:
          console.warn(`[NarrativeEvent] Unhandled event type: ${event.type}`);
          break;
      }
    },

    /**
     * Reset game state to initial values
     * Used for testing and debugging
     */
    resetGame: () => {
      console.log('[GameStore] Resetting game state...');
      set(state => {
        // Reset player
        state.player = { ...DEFAULT_PLAYER_ENTITY };
        
        // Reset game state
        if (state.stateMachine) {
          try {
            state.stateMachine.resetState(false);
          } catch (e) {
            console.warn('[GameStore] Error resetting state machine:', e);
          }
        }
        
        // Reset other core state
        state.currentMode = 'exploration';
        state.isLoading = false;
        state.error = null;
        
        // Reset resources via dedicated method
        get().resetResources();
        
        // Emit reset event
        get().emit(GameEventType.GAME_RESET, {
          timestamp: Date.now()
        });
      });
      
      // Reset other stores
      try {
        if (useKnowledgeStore.getState().resetState) {
          useKnowledgeStore.getState().resetState();
        }
        
        if (useJournalStore.getState().clearJournal) {
          useJournalStore.getState().clearJournal();
        }
      } catch (e) {
        console.warn('[GameStore] Error resetting related stores:', e);
      }
      
      return true;
    }
  }))
);

/**
 * Initialize game store
 * Helper function to bootstrap the game on app start
 */
export function initializeGameStore(config?: { startingMode?: GameState['currentMode'] }) {
  const gameStore = useGameStore.getState();
  
  // Initialize game systems
  console.log('[GameStore] Initializing game store...');
  gameStore.initializeGame({
    startingMode: config?.startingMode || 'exploration'
  });
  
  return gameStore;
}

// ======== CHAMBER PATTERN SELECTORS & BRIDGE ========

/**
 * ================================================================
 * CHAMBER PATTERN SELECTORS AND BRIDGE
 * ================================================================
 * 
 * This section implements the Chamber Pattern for the game store,
 * providing a comprehensive set of primitive value selectors and
 * bridge functions to optimize rendering performance.
 */

// ======== PRIMITIVE SELECTORS ========
// Export these for use with usePrimitiveStoreValue

export const selectors = {
  // Game state selectors
  getGamePhase: (state: any) => state.gamePhase || state.stateMachine?.getCurrentState().gamePhase || 'day',
  getCurrentNodeId: (state: any) => state.currentNodeId,
  getIsLoading: (state: any) => state.isLoading || false,
  getCurrentDay: (state: any) => state.currentDay || state.stateMachine?.getCurrentState().currentDay || 1,
  getCompletedNodeCount: (state: any) => state.completedNodeIds?.length || state.stateMachine?.getCompletedNodeIds()?.length || 0,
  getIsTransitioning: (state: any) => !!state.isTransitioning || (state.stateMachine?.getCurrentState().isTransitioning) || false,
  getGameState: (state: any) => state.gameState || state.stateMachine?.getCurrentState().gameState || 'not_started',
  getErrorMessage: (state: any) => state.error,
  getGameMode: (state: any) => state.currentMode || 'exploration',

  // Player selectors
  getPlayerInsight: (state: any) => state.player?.insight || 0,
  getPlayerMomentum: (state: any) => state.player?.momentum || 0,
  getPlayerHealth: (state: any) => state.player?.health || 100,
  getPlayerMaxHealth: (state: any) => state.player?.maxHealth || 100,
  getPlayerInventorySize: (state: any) => state.player?.inventory?.length || 0,
  getPlayerHasActiveBuffs: (state: any) => (state.player?.activeBuffs?.length || 0) > 0,
  getPlayerActiveBuffCount: (state: any) => state.player?.activeBuffs?.length || 0,
  getPlayerActiveBuffs: (state: any) => state.player?.activeBuffs || [],
  getPlayerMasteryPercent: (state: any) => state.player?.knowledgeMastery?.overall || 0,
  
  // Map selectors
  getMapNodeCount: (state: any) => state.map?.nodes?.length || 0,
  getMapLocation: (state: any) => state.map?.currentLocation,
  getMapSeed: (state: any) => state.map?.seed || '0',
  getDiscoveredLocationCount: (state: any) => state.map?.discoveredLocations?.length || 0,
  
  // Knowledge selectors
  getKnownInsightCount: (state: any) => Object.keys(state.knownInsights || {}).length,
  getNewlyDiscoveredCount: (state: any) => state.newlyDiscovered?.length || 0,
  getTotalMastery: (state: any) => state.totalMastery || 0,
  getIsConstellationVisible: (state: any) => !!state.isConstellationVisible,
  getActiveInsightId: (state: any) => state.activeInsightId,
  getUnlockedTopicCount: (state: any) => state.unlockedTopics?.size || 0,
  
  // Dialogue selectors
  getIsDialogueActive: (state: any) => !!state.isDialogueActive,
  getCurrentDialogueId: (state: any) => state.currentDialogueId,
  getCurrentSpeaker: (state: any) => state.currentSpeaker,
  getCurrentMood: (state: any) => state.currentMood,
  getDialogueChoiceCount: (state: any) => state.currentChoices?.length || 0,
  getIsDialogueLoading: (state: any) => !!state.isDialogueLoading,
  getHasDialogueError: (state: any) => !!state.dialogueError,
  getDialogueErrorMessage: (state: any) => state.dialogueError,
  
  // Resource selectors
  getResource: (resourceId: string) => (state: any) => 
    state.resources?.[resourceId] || 0,
  getInsightResource: (state: any) => 
    state.resources?.insight || state.player?.insight || 0,
  getMomentumResource: (state: any) => 
    state.resources?.momentum || state.player?.momentum || 0,
  
  // Journal selectors
  getLastEntryTimestamp: (state: any) => state.lastEntryTimestamp,
  getIsJournalOpen: (state: any) => !!state.isJournalOpen,
  
  // Combined selectors (still return primitives)
  getGameSummary: (state: any) => ({
    phase: state.gamePhase || 'day',
    day: state.currentDay || 1,
    location: state.map?.currentLocation || 'unknown'
  }),
  
  getPlayerHealthStatus: (state: any) => {
    const health = state.player?.health || 0;
    const maxHealth = state.player?.maxHealth || 100;
    const percent = Math.floor((health / maxHealth) * 100);
    return {
      current: health,
      max: maxHealth,
      percent
    };
  },
  
  getResourceSummary: (state: any) => {
    const insight = state.resources?.insight || state.player?.insight || 0;
    const momentum = state.resources?.momentum || state.player?.momentum || 0;
    return { insight, momentum };
  }
};

// ======== CHAMBER ADAPTER HOOKS ========
// These provide a transition path for components migrating to the pattern

/**
 * Chamber Adapter for game state
 * Extracts common game state values with proper primitive handling
 */
export function useGameState() {
  // Extract primitive values with the new pattern
  const state = usePrimitiveValues(
    useGameStore,
    {
      phase: selectors.getGamePhase,
      currentNodeId: selectors.getCurrentNodeId,
      currentDay: selectors.getCurrentDay,
      isLoading: selectors.getIsLoading,
      gameState: selectors.getGameState,
      isTransitioning: selectors.getIsTransitioning,
      error: selectors.getErrorMessage,
      gameMode: selectors.getGameMode
    },
    {
      phase: 'day',
      currentNodeId: null,
      currentDay: 1,
      isLoading: false,
      gameState: 'not_started',
      isTransitioning: false,
      error: null,
      gameMode: 'exploration'
    }
  );
  
  // Extract key functions with stable references
  const actions = useStableStoreValue(
    useGameStore,
    state => ({
      setGameMode: state.setGameMode,
      initializeGame: state.initializeGame,
      setError: state.setError
    })
  );
  
  return {
    // Primitives
    ...state,
    
    // Computed values
    isDay: state.phase === 'day',
    isNight: state.phase === 'night',
    isDayTransition: state.phase === 'transition_to_day',
    isNightTransition: state.phase === 'transition_to_night',
    
    // Actions (safely extracted)
    setGameMode: actions?.setGameMode || ((mode) => console.warn('setGameMode not available')),
    initializeGame: actions?.initializeGame || (() => console.warn('initializeGame not available')),
    setError: actions?.setError || ((error) => console.warn('setError not available'))
  };
}

/**
 * Chamber Adapter for player state
 * Extracts common player values with proper primitive handling
 */
export function usePlayerState() {
  // Extract primitive values
  const playerState = usePrimitiveValues(
    useGameStore,
    {
      insight: selectors.getPlayerInsight,
      momentum: selectors.getPlayerMomentum,
      health: selectors.getPlayerHealth,
      maxHealth: selectors.getPlayerMaxHealth,
      inventorySize: selectors.getPlayerInventorySize,
      masteryPercent: selectors.getPlayerMasteryPercent,
      activeBuffCount: selectors.getPlayerActiveBuffCount
    },
    {
      insight: 0,
      momentum: 0,
      health: 100,
      maxHealth: 100,
      inventorySize: 0,
      masteryPercent: 0,
      activeBuffCount: 0
    }
  );
  
  // Extract player actions
  const actions = useStableStoreValue(
    useGameStore,
    state => ({
      updateInsight: state.updateInsight,
      incrementMomentum: state.incrementMomentum,
      resetMomentum: state.resetMomentum,
      updateKnowledgeMastery: state.updateKnowledgeMastery,
      addToInventory: state.addToInventory,
      applyBuff: state.applyBuff,
      removeBuff: state.removeBuff
    })
  );
  
  return {
    // Primitives
    ...playerState,
    
    // Computed values
    healthPercent: playerState.health / playerState.maxHealth * 100,
    healthStatus: playerState.health < 30 ? 'critical' : playerState.health < 60 ? 'warning' : 'good',
    hasBuffs: playerState.activeBuffCount > 0,
    
    // Actions (safely extracted)
    updateInsight: actions?.updateInsight || ((amount) => console.warn('updateInsight not available')),
    incrementMomentum: actions?.incrementMomentum || (() => console.warn('incrementMomentum not available')),
    resetMomentum: actions?.resetMomentum || (() => console.warn('resetMomentum not available')),
    updateKnowledgeMastery: actions?.updateKnowledgeMastery || 
      ((conceptId, amount, domainId) => console.warn('updateKnowledgeMastery not available')),
    addToInventory: actions?.addToInventory || ((itemId) => console.warn('addToInventory not available')),
    applyBuff: actions?.applyBuff || ((buffId, duration) => console.warn('applyBuff not available')),
    removeBuff: actions?.removeBuff || ((buffId) => console.warn('removeBuff not available'))
  };
}

/**
 * Chamber Adapter for knowledge state
 * Extracts common knowledge values with proper primitive handling
 */
export function useKnowledgeState() {
  // Extract primitive values
  const state = usePrimitiveValues(
    useKnowledgeStore,
    {
      totalMastery: selectors.getTotalMastery,
      newlyDiscoveredCount: selectors.getNewlyDiscoveredCount,
      knownInsightCount: selectors.getKnownInsightCount,
      isConstellationVisible: selectors.getIsConstellationVisible,
      activeInsightId: selectors.getActiveInsightId,
      unlockedTopicCount: selectors.getUnlockedTopicCount
    },
    {
      totalMastery: 0,
      newlyDiscoveredCount: 0,
      knownInsightCount: 0,
      isConstellationVisible: false,
      activeInsightId: null,
      unlockedTopicCount: 0
    }
  );
  
  // Extract knowledge actions
  const actions = useStableStoreValue(
    useKnowledgeStore,
    state => ({
      transferInsights: state.transferInsights,
      resetNewlyDiscovered: state.resetNewlyDiscovered,
      addInsight: state.addInsight,
      addConnection: state.addConnection,
      unlockTopic: state.unlockTopic,
      setConstellationVisibility: state.setConstellationVisibility,
      setActiveInsight: state.setActiveInsight
    })
  );
  
  return {
    // Primitives
    ...state,
    
    // Computed values
    hasNewConcepts: state.newlyDiscoveredCount > 0,
    masteryLevel: state.totalMastery < 25 ? 'novice' : 
                 state.totalMastery < 50 ? 'apprentice' : 
                 state.totalMastery < 75 ? 'practitioner' : 'expert',
    
    // Actions (safely extracted)
    transferInsights: actions?.transferInsights || (() => console.warn('transferInsights not available')),
    resetNewlyDiscovered: actions?.resetNewlyDiscovered || (() => console.warn('resetNewlyDiscovered not available')),
    addInsight: actions?.addInsight || ((insightId) => console.warn('addInsight not available')),
    addConnection: actions?.addConnection || ((fromId, toId) => console.warn('addConnection not available')),
    unlockTopic: actions?.unlockTopic || ((topicId) => console.warn('unlockTopic not available')),
    setConstellationVisibility: actions?.setConstellationVisibility || 
      ((isVisible) => console.warn('setConstellationVisibility not available')),
    setActiveInsight: actions?.setActiveInsight || ((insightId) => console.warn('setActiveInsight not available'))
  };
}

/**
 * Chamber Adapter for dialogue state
 * Extracts dialogue-related primitives and actions
 */
export function useDialogueState() {
  // Extract primitive values
  const state = usePrimitiveValues(
    useGameStore,
    {
      isActive: selectors.getIsDialogueActive,
      currentDialogueId: selectors.getCurrentDialogueId,
      currentSpeaker: selectors.getCurrentSpeaker,
      currentMood: selectors.getCurrentMood,
      choiceCount: selectors.getDialogueChoiceCount,
      isLoading: selectors.getIsDialogueLoading,
      hasError: selectors.getHasDialogueError,
      errorMessage: selectors.getDialogueErrorMessage
    },
    {
      isActive: false,
      currentDialogueId: null,
      currentSpeaker: null,
      currentMood: null,
      choiceCount: 0,
      isLoading: false,
      hasError: false,
      errorMessage: null
    }
  );
  
  // Extract dialogue actions
  const actions = useStableStoreValue(
    useGameStore,
    state => ({
      startDialogue: state.startDialogue,
      advanceDialogue: state.advanceDialogue,
      endDialogue: state.endDialogue
    })
  );
  
  return {
    // Primitives
    ...state,
    
    // Computed values
    hasChoices: state.choiceCount > 0,
    
    // Actions (safely extracted)
    startDialogue: actions?.startDialogue || ((dialogueId) => console.warn('startDialogue not available')),
    advanceDialogue: actions?.advanceDialogue || ((choiceIndex) => console.warn('advanceDialogue not available')),
    endDialogue: actions?.endDialogue || (() => console.warn('endDialogue not available'))
  };
}

/**
 * Map state adapter for Chamber Pattern
 * Extracts map-related primitives and actions
 */
export function useMapState() {
  // Extract primitive values
  const mapState = usePrimitiveValues(
    useGameStore,
    {
      currentLocation: selectors.getMapLocation,
      nodeCount: selectors.getMapNodeCount,
      seed: selectors.getMapSeed,
      discoveredCount: selectors.getDiscoveredLocationCount
    },
    {
      currentLocation: 'unknown',
      nodeCount: 0,
      seed: '0',
      discoveredCount: 0
    }
  );
  
  // Extract map from store (this is an object, but we need it)
  const mapObject = useGameStore(state => state.map);
  
  return {
    // Primitives
    ...mapState,
    
    // Needed objects (use carefully)
    nodes: mapObject?.nodes || [],
    connections: mapObject?.connections || [],
    discoveredLocations: mapObject?.discoveredLocations || [],
    
    // Computed values
    hasNodes: mapState.nodeCount > 0,
    explorationPercent: mapObject ? 
      Math.floor((mapObject.discoveredLocations.length / Math.max(mapObject.nodes.length, 1)) * 100) : 0
  };
}

/**
 * Transitional store hook for gradual migration
 * Provides an escape hatch to choose between patterns
 * 
 * Usage:
 * // Works with either pattern
 * const gamePhase = useTransitionalStore(
 *   useGameStore,
 *   state => state.gamePhase,
 *   'day',
 *   true // use Chamber pattern
 * );
 */
export function useTransitionalStore<T, V>(
  store: any, 
  selector: (state: T) => V,
  defaultValue: V,
  usePrimitives = false
): V {
  try {
    if (usePrimitives) {
      return usePrimitiveStoreValue<T, V extends string | number | boolean | undefined ? V : never>(
        store, 
        selector as any, 
        defaultValue as any
      ) as any;
    } else {
      // Direct store access for backwards compatibility
      return (store(selector) ?? defaultValue);
    }
  } catch (e) {
    console.warn('[storeHooks] Store access error:', e);
    return defaultValue;
  }
}

// Add debug window access in development mode
if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
  (window as any).__GAME_STORE_DEBUG__ = {
    getState: () => useGameStore.getState(),
    getSelectors: () => selectors,
    resetGame: () => useGameStore.getState().resetGame(),
    inspectBridges: () => ({
      gameState: useGameState(),
      playerState: usePlayerState(),
      knowledgeState: useKnowledgeState(),
      dialogueState: useDialogueState(),
      mapState: useMapState()
    })
  };
}

export default useGameStore;