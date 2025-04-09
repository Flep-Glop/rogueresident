import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import {
  GamePhase,
  GameState,
  Item,
  PlayerState,
  TimeState,
  DialogueState,
  MapState,
  GameStateMachine,
  ProgressionResolver,
  DialogueStateMachine,
  DialogueConfig,
  NarrativeChoice,
  NarrativeContext,
  NarrativeEvent,
} from '@/app/types/game';
import { useEventBus } from '@/app/core/events/CentralEventBus'; // Assuming this is the correct import for your event bus hook
import { useKnowledgeStore } from './knowledgeStore';
import { useJournalStore } from './journalStore';
import { useResourceStore } from './resourceStore';
import kapoorCalibration from '@/app/data/dialogues/calibrations/kapoor-calibration'; // Example dialogue import

// --- Initial State ---

const initialPlayerState: PlayerState = {
  health: 100,
  sanity: 100,
  location: 'start_node', // Replace with actual starting location ID
  statusEffects: [],
};

const initialTimeState: TimeState = {
  currentDay: 1,
  currentTime: 0, // 0-23 representing hours
  isDay: true,
};

const initialDialogueState: DialogueState = {
  isActive: false,
  currentDialogueId: null,
  currentNodeId: null,
  currentText: '',
  choices: [],
  speaker: null,
  characterMood: 'neutral',
  dialogueHistory: [],
};

const initialMapState: MapState = {
  nodes: {}, // Populated by game data
  currentNodeId: 'start_node', // Should match player's initial location
};

const initialGameState: GameState = {
  gamePhase: GamePhase.INITIALIZING,
  player: initialPlayerState,
  time: initialTimeState,
  inventory: [],
  dialogue: initialDialogueState,
  map: initialMapState, // Added map state
  completedNodeIds: [], // Track completed nodes/events
  currentDay: 1, // Redundant? Kept for compatibility if used elsewhere
  isTransitioning: false, // For day/night transitions
  activeSystem: 'map', // Default active system view
};

// --- Store Slice ---

export interface GameStoreActions {
  // Initialization & Phase Transitions
  initializeGame: (machine: GameStateMachine, resolver: ProgressionResolver) => void;
  setGamePhase: (phase: GamePhase) => void;
  startGame: () => void;
  startDay: () => void;
  startNight: () => void;
  endDay: () => void; // Trigger transition to night
  finalizeDayTransition: () => void; // Complete transition after effects/UI
  endNight: () => void; // Trigger transition to day
  finalizeNightTransition: () => void; // Complete transition after effects/UI

  // Player Actions
  updatePlayerHealth: (delta: number) => void;
  updatePlayerSanity: (delta: number) => void;
  movePlayer: (newNodeId: string) => void;
  addItemToInventory: (item: Item) => void;
  removeItemFromInventory: (itemId: string) => void;
  applyStatusEffect: (effect: string) => void;
  removeStatusEffect: (effect: string) => void;

  // Time Actions
  advanceTime: (hours: number) => void;

  // Dialogue Actions
  startDialogue: (dialogueId: string, config: DialogueConfig) => void;
  advanceDialogue: (choice?: NarrativeChoice) => void;
  endDialogue: () => void;

  // Map Actions
  markNodeCompleted: (nodeId: string) => void;
  setActiveSystem: (system: 'map' | 'journal' | 'knowledge' | 'dialogue') => void;

  // System References (Potentially set during init)
  gameStateMachine?: GameStateMachine;
  progressionResolver?: ProgressionResolver;
  dialogueStateMachine?: DialogueStateMachine;
}

export const useGameStore = create<GameState & GameStoreActions>()(
  immer((set, get) => ({
    ...initialGameState,

    // --- Initialization & Phase Transitions ---
    initializeGame: (machine, resolver) => {
      set((state) => {
        state.gamePhase = GamePhase.INITIALIZED;
        // Store references if needed, but avoid storing complex non-serializable objects if possible
        // state.gameStateMachine = machine;
        // state.progressionResolver = resolver;
        console.log('Game Initialized');
         // FIX: Access emit via getState()
        useEventBus.getState().emit('gameInitialized', undefined);
      });
    },

    setGamePhase: (phase) => {
      set((state) => {
        console.log(`Game phase changing from ${state.gamePhase} to ${phase}`);
        state.gamePhase = phase;
        // FIX: Access emit via getState()
        useEventBus.getState().emit('gamePhaseChanged', { phase });
      });
    },

    startGame: () => {
      if (get().gamePhase === GamePhase.INITIALIZED) {
        console.log('Starting game, transitioning to DAY_START');
        get().setGamePhase(GamePhase.DAY_START);
        // Potentially trigger the first day start sequence
        get().startDay();
      } else {
        console.warn('Attempted to start game when not in INITIALIZED phase.');
      }
    },

    startDay: () => {
      set((state) => {
        state.gamePhase = GamePhase.DAY_EXPLORATION;
        state.time.isDay = true;
        state.time.currentTime = 8; // Example: Start day at 8 AM
        state.isTransitioning = false;
         // FIX: Access emit via getState()
        useEventBus.getState().emit('dayStarted', { day: state.time.currentDay });
        // FIX: Access emit via getState()
        useEventBus.getState().emit('timeChanged', { ...state.time });
        console.log(`Day ${state.time.currentDay} started.`);
      });
      // Trigger day-specific events or dialogues
      // get().progressionResolver?.resolveDayStart(get().time.currentDay);
    },

    startNight: () => {
      set((state) => {
        state.gamePhase = GamePhase.NIGHT_EXPLORATION; // Or a specific night phase
        state.time.isDay = false;
        state.time.currentTime = 19; // Example: Start night at 7 PM
        state.isTransitioning = false;
        // FIX: Access emit via getState()
        useEventBus.getState().emit('nightStarted', { day: state.time.currentDay });
        // FIX: Access emit via getState()
        useEventBus.getState().emit('timeChanged', { ...state.time });
        console.log(`Night ${state.time.currentDay} started.`);
      });
      // Trigger night-specific events
      // get().progressionResolver?.resolveNightStart(get().time.currentDay);
    },

    endDay: () => {
      if (get().gamePhase === GamePhase.DAY_EXPLORATION) {
        set(state => {
          state.isTransitioning = true;
          state.gamePhase = GamePhase.NIGHT_TRANSITION; // Indicate transition
        });
        // FIX: Access emit via getState()
        useEventBus.getState().emit('dayEnded', { day: get().time.currentDay });
        console.log(`Day ${get().time.currentDay} ending, transitioning to night.`);
        // Allow time for UI effects before finalizeNightTransition is called
      }
    },
    finalizeNightTransition: () => {
       if (get().gamePhase === GamePhase.NIGHT_TRANSITION) {
         get().startNight();
       }
    },


    endNight: () => {
      if (get().gamePhase === GamePhase.NIGHT_EXPLORATION) {
         set(state => {
           state.isTransitioning = true;
           state.gamePhase = GamePhase.DAY_TRANSITION; // Indicate transition
         });
         // FIX: Access emit via getState()
         useEventBus.getState().emit('nightEnded', { day: get().time.currentDay });
         console.log(`Night ${get().time.currentDay} ending, transitioning to day.`);
         // Allow time for UI effects before finalizeDayTransition is called
      }
    },
    finalizeDayTransition: () => {
      if (get().gamePhase === GamePhase.DAY_TRANSITION) {
        set(state => {
          state.time.currentDay += 1; // Increment day
        });
        // FIX: Access emit via getState()
        useEventBus.getState().emit('newDayCycle', { day: get().time.currentDay });
        get().startDay(); // Start the new day
      }
    },

    // --- Player Actions ---
    updatePlayerHealth: (delta) => {
      set((state) => {
        state.player.health = Math.max(0, Math.min(100, state.player.health + delta));
         // FIX: Access emit via getState()
        useEventBus.getState().emit('playerHealthChanged', { current: state.player.health, delta });
        if (state.player.health <= 0) {
          // FIX: Access emit via getState()
          useEventBus.getState().emit('playerDefeated', { reason: 'health' });
          get().setGamePhase(GamePhase.GAME_OVER);
        }
      });
    },
    updatePlayerSanity: (delta) => {
      set((state) => {
        state.player.sanity = Math.max(0, Math.min(100, state.player.sanity + delta));
        // FIX: Access emit via getState()
        useEventBus.getState().emit('playerSanityChanged', { current: state.player.sanity, delta });
         if (state.player.sanity <= 0) {
          // FIX: Access emit via getState()
          useEventBus.getState().emit('playerDefeated', { reason: 'sanity' });
          get().setGamePhase(GamePhase.GAME_OVER);
        }
      });
    },
    movePlayer: (newNodeId) => {
      set((state) => {
        const previousNodeId = state.player.location;
        state.player.location = newNodeId;
        state.map.currentNodeId = newNodeId; // Keep map state consistent
        // FIX: Access emit via getState()
        useEventBus.getState().emit('playerMoved', { previousNodeId, newNodeId });
        console.log(`Player moved from ${previousNodeId} to ${newNodeId}`);
        // Optionally advance time on move
        // get().advanceTime(1);
      });
    },
    addItemToInventory: (item) => {
      set((state) => {
        state.inventory.push(item);
        // FIX: Access emit via getState()
        useEventBus.getState().emit('inventoryChanged', { action: 'add', item });
      });
    },
    removeItemFromInventory: (itemId) => {
      set((state) => {
        const itemIndex = state.inventory.findIndex(i => i.id === itemId);
        if (itemIndex > -1) {
          const removedItem = state.inventory[itemIndex];
          state.inventory.splice(itemIndex, 1);
           // FIX: Access emit via getState()
          useEventBus.getState().emit('inventoryChanged', { action: 'remove', item: removedItem });
        }
      });
    },
    applyStatusEffect: (effect) => set((state) => {
      if (!state.player.statusEffects.includes(effect)) {
        state.player.statusEffects.push(effect);
        // FIX: Access emit via getState()
        useEventBus.getState().emit('statusEffectApplied', { effect });
      }
    }),
    removeStatusEffect: (effect) => set((state) => {
      const index = state.player.statusEffects.indexOf(effect);
      if (index > -1) {
        state.player.statusEffects.splice(index, 1);
        // FIX: Access emit via getState()
        useEventBus.getState().emit('statusEffectRemoved', { effect });
      }
    }),


    // --- Time Actions ---
    advanceTime: (hours) => {
      set((state) => {
        const oldTime = state.time.currentTime;
        const newTime = (state.time.currentTime + hours); // Calculate new time potentially across days

        // Check if day/night boundary crossed
        const wasDay = state.time.isDay;
        const isNowDay = newTime % 24 >= 8 && newTime % 24 < 19; // Example: 8 AM to 7 PM is day

        state.time.currentTime = newTime % 24; // Update time within 0-23 range
        state.time.isDay = isNowDay;

        console.log(`Time advanced by ${hours} hours. Current time: ${state.time.currentTime}:00`);
        // FIX: Access emit via getState()
        useEventBus.getState().emit('timeChanged', { ...state.time });

        // Handle transitions if the boundary was crossed
        if (wasDay && !isNowDay) {
          console.log("Day ended due to time advancement.");
          get().endDay(); // Trigger the day end sequence
        } else if (!wasDay && isNowDay) {
           console.log("Night ended due to time advancement.");
           // Note: Ending the night typically increments the day counter
           get().endNight(); // Trigger the night end sequence
        }

        // Check for time-based events (simplified example)
        // get().progressionResolver?.resolveTimeEvents(state.time.currentDay, state.time.currentTime);
      });
    },

    // --- Dialogue Actions ---
     startDialogue: (dialogueId, config) => {
      set((state) => {
        // Reset dialogue state
        state.dialogue.isActive = true;
        state.dialogue.currentDialogueId = dialogueId;
        state.dialogue.currentNodeId = config.startNodeId;
        state.dialogue.currentText = '';
        state.dialogue.choices = [];
        state.dialogue.speaker = config.initialSpeaker;
        state.dialogue.characterMood = config.initialMood || 'neutral';
        state.dialogue.dialogueHistory = []; // Clear history for new dialogue

        // TODO: Instantiate or reset DialogueStateMachine here if it's managed within the store
        // state.dialogueStateMachine = new DialogueStateMachine(config, get()); // Pass necessary state/actions

        console.log(`Starting dialogue: ${dialogueId}`);
        // FIX: Access emit via getState()
        useEventBus.getState().emit('dialogueStarted', { dialogueId });

        // Immediately advance to the first node
         get().advanceDialogue();
         get().setActiveSystem('dialogue'); // Switch UI focus
      });
    },

    advanceDialogue: (choice?: NarrativeChoice) => {
       // TODO: Integrate with DialogueStateMachine instance
       // This is a placeholder - replace with actual state machine logic
       set(state => {
         // 1. Determine next node based on current node and choice (if any)
         // const nextNodeId = state.dialogueStateMachine?.determineNextNode(state.dialogue.currentNodeId, choice);
         const nextNodeId = 'placeholder_next_node'; // Replace with actual logic

         if (!nextNodeId) {
           console.log("Dialogue ended: No next node.");
           get().endDialogue();
           return;
         }

         // 2. Get content for the next node (text, choices, speaker, etc.)
         // const nodeContent = state.dialogueStateMachine?.getNodeContent(nextNodeId);
         const nodeContent = { // Replace with actual logic
              id: nextNodeId,
              text: `This is text for ${nextNodeId}.`,
              speaker: state.dialogue.speaker || 'Narrator',
              mood: 'neutral',
              choices: [{ text: "Continue...", nextNodeId: 'placeholder_end' }],
              events: [] as NarrativeEvent[],
         };


         if (!nodeContent) {
            console.error(`Dialogue error: Could not find content for node ${nextNodeId}`);
            get().endDialogue();
            return;
         }

         // 3. Update state
         state.dialogue.currentNodeId = nextNodeId;
         state.dialogue.currentText = nodeContent.text;
         state.dialogue.choices = nodeContent.choices || [];
         state.dialogue.speaker = nodeContent.speaker || state.dialogue.speaker;
         state.dialogue.characterMood = nodeContent.mood || 'neutral';
         state.dialogue.dialogueHistory.push({ // Add previous node to history
            nodeId: state.dialogue.currentNodeId, // This should be the *previous* node before update
            text: state.dialogue.currentText,
            speaker: state.dialogue.speaker,
            choiceMade: choice?.text
         });


         // 4. Process events/actions associated with the new node
         nodeContent.events?.forEach(event => {
            // FIX: Access emit via getState()
            useEventBus.getState().emit(event.type, event.payload);
            // Or directly call store actions if appropriate
            // handleNarrativeEvent(event, get, set);
         });

         // FIX: Access emit via getState()
         useEventBus.getState().emit('dialogueAdvanced', { nodeId: nextNodeId, text: nodeContent.text });

         // Check if this node ends the dialogue
         if (nodeContent.choices.length === 0 && !nodeContent.isPauseNode) { // Assuming an 'isPauseNode' concept
            console.log(`Dialogue node ${nextNodeId} has no choices, ending dialogue.`);
            get().endDialogue();
         }
       });
    },

    endDialogue: () => {
      set((state) => {
        if (!state.dialogue.isActive) return; // Avoid ending multiple times

        const endedDialogueId = state.dialogue.currentDialogueId;
        console.log(`Ending dialogue: ${endedDialogueId}`);

        state.dialogue.isActive = false;
        state.dialogue.currentDialogueId = null;
        state.dialogue.currentNodeId = null;
        state.dialogue.currentText = '';
        state.dialogue.choices = [];
        state.dialogue.speaker = null;
        // state.dialogueStateMachine = undefined; // Clean up state machine instance

        // FIX: Access emit via getState()
        useEventBus.getState().emit('dialogueEnded', { dialogueId: endedDialogueId });
        get().setActiveSystem('map'); // Switch back to map view (or previous)
      });
    },


    // --- Map Actions ---
    markNodeCompleted: (nodeId) => {
      set((state) => {
        if (!state.completedNodeIds.includes(nodeId)) {
          state.completedNodeIds.push(nodeId);
           // FIX: Access emit via getState()
          useEventBus.getState().emit('nodeCompleted', { nodeId });
        }
      });
    },

    // --- UI/System Actions ---
     setActiveSystem: (system) => {
        set((state) => {
            if (state.activeSystem !== system) {
                console.log(`Setting active system to: ${system}`);
                state.activeSystem = system;
                 // FIX: Access emit via getState()
                useEventBus.getState().emit('activeSystemChanged', { system });
            }
        });
     },

  })),
);

// --- Selectors ---
// Optional: Define selectors for common state access patterns
export const selectPlayerLocation = (state: GameState & GameStoreActions) => state.player.location;
export const selectCurrentDay = (state: GameState & GameStoreActions) => state.time.currentDay;
export const selectIsDay = (state: GameState & GameStoreActions) => state.time.isDay;
export const selectInventory = (state: GameState & GameStoreActions) => state.inventory;
export const selectDialogueState = (state: GameState & GameStoreActions) => state.dialogue;
export const selectGamePhase = (state: GameState & GameStoreActions) => state.gamePhase;
export const selectCompletedNodes = (state: GameState & GameStoreActions) => state.completedNodeIds;
export const selectIsTransitioning = (state: GameState & GameStoreActions) => state.isTransitioning;
export const selectActiveSystem = (state: GameState & GameStoreActions) => state.activeSystem;

// --- Hooks for convenience ---
// export const usePlayerLocation = () => useGameStore(selectPlayerLocation);
// export const useCurrentDay = () => useGameStore(selectCurrentDay);
// export const useIsDay = () => useGameStore(selectIsDay);
// etc.


// --- Helper for handling narrative events ---
// Example of how you might handle events triggered by dialogue
function handleNarrativeEvent(event: NarrativeEvent, get: () => GameState & GameStoreActions, set: (fn: (state: GameState & GameStoreActions) => void) => void) {
    switch (event.type) {
        case 'updatePlayerHealth':
            get().updatePlayerHealth(event.payload.delta);
            break;
        case 'addItem':
             // Assuming payload has item details or an itemId to look up
             // const item = findItemById(event.payload.itemId);
             // if(item) get().addItemToInventory(item);
            break;
        case 'updateKnowledge':
            // Use knowledge store actions
            useKnowledgeStore.getState().addInsight(event.payload.insightId, event.payload.data);
            break;
        case 'updateJournal':
            // Use journal store actions
            useJournalStore.getState().addEntry(event.payload.entryId, event.payload.content);
            break;
        // Add more event types as needed
        default:
            console.warn(`Unhandled narrative event type: ${event.type}`);
    }
}
