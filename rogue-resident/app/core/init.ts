import { useEffect, useState, useRef, useCallback } from 'react';
// FIX: Adjust imports based on actual exports (assuming default/renamed exports based on errors)
import EventBusState, { useEventBus } from './events/CentralEventBus'; // Assuming EventBusState is default export
import { useGameStateMachine } from './statemachine/GameStateMachine'; // FIX: Assuming named export is useGameStateMachine
import { progressionResolver as ProgressionResolver } from './progression/ProgressionResolver'; // FIX: Assuming named export is progressionResolver
import { useGameStore } from '@/app/store/gameStore';
import { useKnowledgeStore, KnowledgeState, KnowledgeStoreActions } from '@/app/store/knowledgeStore'; // Import state/actions for type safety
import { useJournalStore, JournalState, JournalStoreActions } from '@/app/store/journalStore'; // Import state/actions for type safety
import { useResourceStore, ResourceState, ResourceStoreActions } from '@/app/store/resourceStore'; // Import state/actions for type safety
import { useDialogueStateMachine } from './dialogue/DialogueStateMachine'; // FIX: Assuming named export is useDialogueStateMachine
import ActionIntegration from './dialogue/ActionIntegration'; // FIX: Assuming ActionIntegration is default export
// POTENTIAL ISSUE: Verify these types are correctly exported from game.ts and path alias resolves
import { GameState, GameStoreActions } from '@/app/types/game';

// Type definition for the module object, including the optional 'hot' property for HMR
interface NodeModule {
  hot?: {
    accept(path?: string, callback?: () => void): void;
    dispose(callback: (data: any) => void): void;
  };
}

declare const module: NodeModule;

// Define combined store types for clarity (if not already defined elsewhere)
type FullKnowledgeStore = KnowledgeState & KnowledgeStoreActions;
type FullJournalStore = JournalState & JournalStoreActions;
type FullResourceStore = ResourceState & ResourceStoreActions;


/**
 * Hook to initialize core game systems.
 */
export function useCoreInitialization() {
  const [initialized, setInitialized] = useState(false);
  // Use a selector that returns a primitive boolean for stability
  const gameStoreInitialized = useGameStore(state => state.gamePhase !== 'INITIALIZING');

  // Refs to hold instances of core systems - Use the actual class types if available
  // Using 'any' temporarily if exact class types cause issues during init refactoring
  const eventBusRef = useRef<EventBusState | null>(null);
  const stateMachineRef = useRef<any | null>(null); // Replace 'any' with actual GameStateMachine class type if possible
  const progressionResolverRef = useRef<ProgressionResolver | null>(null); // Assuming ProgressionResolver is the class type
  const dialogueStateMachineRef = useRef<any | null>(null); // Replace 'any' with actual DialogueStateMachine class type
  const actionIntegrationRef = useRef<ActionIntegration | null>(null); // Assuming ActionIntegration is the class type

  // Get store actions - Select actions individually for stability
  const initializeGameAction = useGameStore(state => state.initializeGame);
  // POTENTIAL ISSUE: Verify 'reset' actions exist and are correctly typed in stores
  const resetKnowledgeAction = useKnowledgeStore(state => state.reset);
  const resetJournalAction = useJournalStore(state => state.reset);
  const resetResourceAction = useResourceStore(state => state.reset);


  // --- Initialization Logic ---
  const initializeSystems = useCallback(() => {
    console.log("Attempting core system initialization...");

    // 1. Get Event Bus state/instance
    eventBusRef.current = useEventBus.getState();
    const emitEvent = eventBusRef.current.emit; // Get emit function
    console.log("Event Bus referenced.");

    // 2. Initialize Action Integration
    // Ensure ActionIntegration constructor matches these arguments
    actionIntegrationRef.current = new ActionIntegration(
      useGameStore, // Pass the hook itself or necessary state/actions
      useKnowledgeStore,
      useJournalStore,
      useResourceStore,
      emitEvent // Pass the emit function
    );
     console.log("Action Integration initialized.");

    // 3. Initialize Dialogue State Machine (if needed globally)
    // dialogueStateMachineRef.current = new useDialogueStateMachine(); // Or however it's instantiated
    // console.log("Dialogue State Machine initialized.");

    // 4. Initialize Game State Machine
    // stateMachineRef.current = new useGameStateMachine(emitEvent); // Or however it's instantiated
     stateMachineRef.current = {}; // Placeholder if instantiation is complex/deferred
    console.log("Game State Machine initialized (placeholder).");

    // 5. Initialize Progression Resolver
    progressionResolverRef.current = new ProgressionResolver(emitEvent); // Assuming constructor takes emit
    console.log("Progression Resolver initialized.");

    // 6. Initialize Game Store Slice
    // Pass valid instances or identifiers as needed by initializeGameAction
    initializeGameAction(stateMachineRef.current, progressionResolverRef.current);
    console.log("Game Store slice initialized.");

    // 7. Set initialized flag
    setInitialized(true);
    console.log("Core systems initialization complete.");

  // Ensure dependency array is correct - add `emitEvent` if used directly
  }, [initializeGameAction]);

  // --- Teardown Logic ---
  const teardownSystems = useCallback(() => {
    console.log("Tearing down core systems...");

    // Clean up systems (add cleanup methods if they exist)
    // stateMachineRef.current?.cleanup();
    progressionResolverRef.current?.cleanup();
    // dialogueStateMachineRef.current?.cleanup();
    actionIntegrationRef.current?.cleanup(); // Add cleanup if needed

    // Reset stores
    // POTENTIAL ISSUE: Verify these reset actions work correctly.
    resetKnowledgeAction();
    resetJournalAction();
    resetResourceAction();

    // Clear refs
    eventBusRef.current = null;
    stateMachineRef.current = null;
    progressionResolverRef.current = null;
    dialogueStateMachineRef.current = null;
    actionIntegrationRef.current = null;

    setInitialized(false);
    console.log("Core systems teardown complete.");
  }, [resetKnowledgeAction, resetJournalAction, resetResourceAction]); // Dependencies for teardown

  // --- Reinitialization Function ---
  const reinitialize = useCallback(() => {
    teardownSystems();
    initializeSystems();
  }, [teardownSystems, initializeSystems]);

  // --- Effect for Initial Setup and HMR ---
  useEffect(() => {
    if (!initialized && !gameStoreInitialized) {
       initializeSystems();
    }

    // Handle Hot Module Replacement (HMR)
    if (process.env.NODE_ENV === 'development' && module.hot) {
      console.log("Setting up HMR for core systems.");
      // FIX: Call accept for each path individually or use a more specific API
      const coreModules = [
          './events/CentralEventBus',
          './statemachine/GameStateMachine',
          './progression/ProgressionResolver',
          './dialogue/ActionIntegration',
          // Add other core modules that should trigger reinitialization
      ];
      coreModules.forEach(path => {
          module.hot?.accept(path, () => {
              console.log(`HMR detected change in ${path}. Reinitializing...`);
              reinitialize();
          });
      });


      // Dispose handler
      module.hot.dispose(() => {
         console.log("HMR disposing core systems.");
         teardownSystems();
      });
    }

  }, [initialized, gameStoreInitialized, initializeSystems, reinitialize, teardownSystems]);


  return { initialized, reinitialize };
}
```

**2. Fixing `gameStore.ts` Implicit Anys, Emit Calls, and Other Errors:**

* Add explicit types for all function parameters.
* Use the `const emit = useEventBus.getState().emit;` pattern.
* Fix the `addEntry` call arguments.
* Remove the invalid `isPauseNode` access from the placeholder.
* Add comments about potential unresolved issues (type imports, `addInsight`).

Here's the updated `app/store/gameStore.ts`:


```typescript
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
// POTENTIAL ISSUE: Verify these types are correctly exported from game.ts and path alias resolves
import {
  GamePhase,
  GameState,
  Item,
  PlayerState,
  TimeState,
  DialogueState,
  MapState,
  GameStateMachine, // Assuming this is the TYPE/Interface, not the class/hook
  ProgressionResolver, // Assuming this is the TYPE/Interface
  DialogueStateMachine, // Assuming this is the TYPE/Interface
  DialogueConfig,
  NarrativeChoice,
  NarrativeContext,
  NarrativeEvent,
  JournalEntry // Import JournalEntry type
} from '@/app/types/game';
import { useEventBus } from '@/app/core/events/CentralEventBus';
import { useKnowledgeStore, KnowledgeState, KnowledgeStoreActions } from './knowledgeStore'; // Import actions type
import { useJournalStore, JournalState, JournalStoreActions } from './journalStore'; // Import actions type
import { useResourceStore } from './resourceStore';
import kapoorCalibration from '@/app/data/dialogues/calibrations/kapoor-calibration'; // Example dialogue import

// --- Initial State ---

const initialPlayerState: PlayerState = {
  health: 100,
  sanity: 100,
  location: 'start_node',
  statusEffects: [],
};

const initialTimeState: TimeState = {
  currentDay: 1,
  currentTime: 0,
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
  nodes: {},
  currentNodeId: 'start_node',
};

const initialGameState: GameState = {
  gamePhase: GamePhase.INITIALIZING,
  player: initialPlayerState,
  time: initialTimeState,
  inventory: [],
  dialogue: initialDialogueState,
  map: initialMapState,
  completedNodeIds: [],
  currentDay: 1, // Consider removing if redundant with time.currentDay
  isTransitioning: false,
  activeSystem: 'map',
};

// --- Store Slice Definition ---

// Combine state and actions for internal use within the creator function
type GameStoreSlice = GameState & GameStoreActions;

export interface GameStoreActions {
  // Initialization & Phase Transitions
  // FIX: Add types for parameters
  initializeGame: (machine: any, resolver: ProgressionResolver | null) => void; // Use actual machine type if available
  setGamePhase: (phase: GamePhase) => void;
  startGame: () => void;
  startDay: () => void;
  startNight: () => void;
  endDay: () => void;
  finalizeDayTransition: () => void;
  endNight: () => void;
  finalizeNightTransition: () => void;

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

  // System References (Removed - avoid storing complex instances directly)
  // gameStateMachine?: GameStateMachine;
  // progressionResolver?: ProgressionResolver;
  // dialogueStateMachine?: DialogueStateMachine;
}

// --- Store Creator ---

export const useGameStore = create<GameStoreSlice>()(
  immer((set, get) => ({
    ...initialGameState,

    // --- Initialization & Phase Transitions ---
    // FIX: Add explicit types
    initializeGame: (machine: any, resolver: ProgressionResolver | null) => {
      set((state: GameStoreSlice) => {
        state.gamePhase = GamePhase.INITIALIZED;
        console.log('Game Initialized');
        // FIX: Get emit function once
        const emit = useEventBus.getState().emit;
        emit('gameInitialized', undefined);
      });
    },

    // FIX: Add explicit types
    setGamePhase: (phase: GamePhase) => {
      set((state: GameStoreSlice) => {
        console.log(`Game phase changing from ${state.gamePhase} to ${phase}`);
        state.gamePhase = phase;
        const emit = useEventBus.getState().emit;
        emit('gamePhaseChanged', { phase });
      });
    },

    startGame: () => {
      if (get().gamePhase === GamePhase.INITIALIZED) {
        console.log('Starting game, transitioning to DAY_START');
        get().setGamePhase(GamePhase.DAY_START);
        get().startDay();
      } else {
        console.warn('Attempted to start game when not in INITIALIZED phase.');
      }
    },

    startDay: () => {
      set((state: GameStoreSlice) => {
        state.gamePhase = GamePhase.DAY_EXPLORATION;
        state.time.isDay = true;
        state.time.currentTime = 8;
        state.isTransitioning = false;
        const emit = useEventBus.getState().emit;
        emit('dayStarted', { day: state.time.currentDay });
        emit('timeChanged', { ...state.time });
        console.log(`Day ${state.time.currentDay} started.`);
      });
    },

    startNight: () => {
      set((state: GameStoreSlice) => {
        state.gamePhase = GamePhase.NIGHT_EXPLORATION;
        state.time.isDay = false;
        state.time.currentTime = 19;
        state.isTransitioning = false;
        const emit = useEventBus.getState().emit;
        emit('nightStarted', { day: state.time.currentDay });
        emit('timeChanged', { ...state.time });
        console.log(`Night ${state.time.currentDay} started.`);
      });
    },

    endDay: () => {
      if (get().gamePhase === GamePhase.DAY_EXPLORATION) {
        set((state: GameStoreSlice) => {
          state.isTransitioning = true;
          state.gamePhase = GamePhase.NIGHT_TRANSITION;
        });
        const emit = useEventBus.getState().emit;
        emit('dayEnded', { day: get().time.currentDay });
        console.log(`Day ${get().time.currentDay} ending, transitioning to night.`);
      }
    },
    finalizeNightTransition: () => {
       if (get().gamePhase === GamePhase.NIGHT_TRANSITION) {
         get().startNight();
       }
    },

    endNight: () => {
      if (get().gamePhase === GamePhase.NIGHT_EXPLORATION) {
         set((state: GameStoreSlice) => {
           state.isTransitioning = true;
           state.gamePhase = GamePhase.DAY_TRANSITION;
         });
         const emit = useEventBus.getState().emit;
         emit('nightEnded', { day: get().time.currentDay });
         console.log(`Night ${get().time.currentDay} ending, transitioning to day.`);
      }
    },
    finalizeDayTransition: () => {
      if (get().gamePhase === GamePhase.DAY_TRANSITION) {
        set((state: GameStoreSlice) => {
          state.time.currentDay += 1;
        });
        const emit = useEventBus.getState().emit;
        emit('newDayCycle', { day: get().time.currentDay });
        get().startDay();
      }
    },

    // --- Player Actions ---
    // FIX: Add explicit types
    updatePlayerHealth: (delta: number) => {
      set((state: GameStoreSlice) => {
        state.player.health = Math.max(0, Math.min(100, state.player.health + delta));
        const emit = useEventBus.getState().emit;
        emit('playerHealthChanged', { current: state.player.health, delta });
        if (state.player.health <= 0) {
          emit('playerDefeated', { reason: 'health' });
          get().setGamePhase(GamePhase.GAME_OVER);
        }
      });
    },
    // FIX: Add explicit types
    updatePlayerSanity: (delta: number) => {
      set((state: GameStoreSlice) => {
        state.player.sanity = Math.max(0, Math.min(100, state.player.sanity + delta));
        const emit = useEventBus.getState().emit;
        emit('playerSanityChanged', { current: state.player.sanity, delta });
         if (state.player.sanity <= 0) {
          emit('playerDefeated', { reason: 'sanity' });
          get().setGamePhase(GamePhase.GAME_OVER);
        }
      });
    },
    // FIX: Add explicit types
    movePlayer: (newNodeId: string) => {
      set((state: GameStoreSlice) => {
        const previousNodeId = state.player.location;
        state.player.location = newNodeId;
        state.map.currentNodeId = newNodeId;
        const emit = useEventBus.getState().emit;
        emit('playerMoved', { previousNodeId, newNodeId });
        console.log(`Player moved from ${previousNodeId} to ${newNodeId}`);
      });
    },
    // FIX: Add explicit types
    addItemToInventory: (item: Item) => {
      set((state: GameStoreSlice) => {
        state.inventory.push(item);
        const emit = useEventBus.getState().emit;
        emit('inventoryChanged', { action: 'add', item });
      });
    },
    // FIX: Add explicit types
    removeItemFromInventory: (itemId: string) => {
      set((state: GameStoreSlice) => {
        // FIX: Add explicit type for findIndex callback parameter
        const itemIndex = state.inventory.findIndex((i: Item) => i.id === itemId);
        if (itemIndex > -1) {
          const removedItem = state.inventory[itemIndex];
          state.inventory.splice(itemIndex, 1);
          const emit = useEventBus.getState().emit;
          emit('inventoryChanged', { action: 'remove', item: removedItem });
        }
      });
    },
    // FIX: Add explicit types
    applyStatusEffect: (effect: string) => set((state: GameStoreSlice) => {
      if (!state.player.statusEffects.includes(effect)) {
        state.player.statusEffects.push(effect);
        const emit = useEventBus.getState().emit;
        emit('statusEffectApplied', { effect });
      }
    }),
    // FIX: Add explicit types
    removeStatusEffect: (effect: string) => set((state: GameStoreSlice) => {
      const index = state.player.statusEffects.indexOf(effect);
      if (index > -1) {
        state.player.statusEffects.splice(index, 1);
        const emit = useEventBus.getState().emit;
        emit('statusEffectRemoved', { effect });
      }
    }),

    // --- Time Actions ---
    // FIX: Add explicit types
    advanceTime: (hours: number) => {
      set((state: GameStoreSlice) => {
        const oldTime = state.time.currentTime;
        const newTime = (state.time.currentTime + hours);

        const wasDay = state.time.isDay;
        const isNowDay = newTime % 24 >= 8 && newTime % 24 < 19;

        state.time.currentTime = newTime % 24;
        state.time.isDay = isNowDay;

        console.log(`Time advanced by ${hours} hours. Current time: ${state.time.currentTime}:00`);
        const emit = useEventBus.getState().emit;
        emit('timeChanged', { ...state.time });

        if (wasDay && !isNowDay) {
          console.log("Day ended due to time advancement.");
          get().endDay();
        } else if (!wasDay && isNowDay) {
           console.log("Night ended due to time advancement.");
           get().endNight();
        }
      });
    },

    // --- Dialogue Actions ---
    // FIX: Add explicit types
     startDialogue: (dialogueId: string, config: DialogueConfig) => {
      set((state: GameStoreSlice) => {
        state.dialogue.isActive = true;
        state.dialogue.currentDialogueId = dialogueId;
        state.dialogue.currentNodeId = config.startNodeId;
        state.dialogue.currentText = '';
        state.dialogue.choices = [];
        state.dialogue.speaker = config.initialSpeaker;
        state.dialogue.characterMood = config.initialMood || 'neutral';
        state.dialogue.dialogueHistory = [];

        console.log(`Starting dialogue: ${dialogueId}`);
        const emit = useEventBus.getState().emit;
        emit('dialogueStarted', { dialogueId });

        get().advanceDialogue(); // Advance to first node
        get().setActiveSystem('dialogue');
      });
    },

    // FIX: Add explicit types (NarrativeChoice is already imported)
    advanceDialogue: (choice?: NarrativeChoice) => {
       // Placeholder logic - needs actual DialogueStateMachine integration
       set((state: GameStoreSlice) => {
         const nextNodeId = 'placeholder_next_node'; // Replace with actual logic

         if (!nextNodeId) {
           console.log("Dialogue ended: No next node.");
           get().endDialogue();
           return;
         }

         // Replace with actual logic using DialogueStateMachine
         const nodeContent = {
              id: nextNodeId,
              text: `This is text for ${nextNodeId}.`,
              speaker: state.dialogue.speaker || 'Narrator',
              mood: 'neutral',
              choices: [{ text: "Continue...", nextNodeId: 'placeholder_end' }] as NarrativeChoice[], // Ensure choices match type
              events: [] as NarrativeEvent[],
              // isPauseNode: false, // Assuming this property might exist on real nodes
         };

         if (!nodeContent) {
            console.error(`Dialogue error: Could not find content for node ${nextNodeId}`);
            get().endDialogue();
            return;
         }

         // Update state
         const previousNodeId = state.dialogue.currentNodeId; // Store previous node ID
         const previousText = state.dialogue.currentText;     // Store previous text
         const previousSpeaker = state.dialogue.speaker;   // Store previous speaker

         state.dialogue.currentNodeId = nextNodeId;
         state.dialogue.currentText = nodeContent.text;
         state.dialogue.choices = nodeContent.choices || [];
         state.dialogue.speaker = nodeContent.speaker || state.dialogue.speaker;
         state.dialogue.characterMood = nodeContent.mood || 'neutral';

         // Add *previous* node info to history
         if (previousNodeId) { // Only add if not the very first node
            state.dialogue.dialogueHistory.push({
                nodeId: previousNodeId,
                text: previousText,
                speaker: previousSpeaker,
                choiceMade: choice?.text
            });
         }

         const emit = useEventBus.getState().emit;

         // Process events
         nodeContent.events?.forEach((event: NarrativeEvent) => { // Add type to event
            emit(event.type, event.payload);
            // handleNarrativeEvent(event, get, set); // Consider moving this logic elsewhere
         });

         emit('dialogueAdvanced', { nodeId: nextNodeId, text: nodeContent.text });

         // FIX: Remove access to isPauseNode if not part of nodeContent structure
         if (nodeContent.choices.length === 0 /* && !nodeContent.isPauseNode */) {
            console.log(`Dialogue node ${nextNodeId} has no choices, ending dialogue.`);
            // Delay endDialogue slightly to allow UI to render the final text?
            // setTimeout(() => get().endDialogue(), 100); // Optional delay
             get().endDialogue();
         }
       });
    },

    endDialogue: () => {
      set((state: GameStoreSlice) => {
        if (!state.dialogue.isActive) return;

        const endedDialogueId = state.dialogue.currentDialogueId;
        console.log(`Ending dialogue: ${endedDialogueId}`);

        state.dialogue.isActive = false;
        state.dialogue.currentDialogueId = null;
        state.dialogue.currentNodeId = null;
        state.dialogue.currentText = '';
        state.dialogue.choices = [];
        state.dialogue.speaker = null;

        const emit = useEventBus.getState().emit;
        emit('dialogueEnded', { dialogueId: endedDialogueId });
        get().setActiveSystem('map');
      });
    },

    // --- Map Actions ---
    // FIX: Add explicit types
    markNodeCompleted: (nodeId: string) => {
      set((state: GameStoreSlice) => {
        if (!state.completedNodeIds.includes(nodeId)) {
          state.completedNodeIds.push(nodeId);
          const emit = useEventBus.getState().emit;
          emit('nodeCompleted', { nodeId });
        }
      });
    },

    // --- UI/System Actions ---
    // FIX: Add explicit types
     setActiveSystem: (system: 'map' | 'journal' | 'knowledge' | 'dialogue') => {
        set((state: GameStoreSlice) => {
            if (state.activeSystem !== system) {
                console.log(`Setting active system to: ${system}`);
                state.activeSystem = system;
                const emit = useEventBus.getState().emit;
                emit('activeSystemChanged', { system });
            }
        });
     },

  })),
);

// --- Selectors ---
export const selectPlayerLocation = (state: GameStoreSlice) => state.player.location;
export const selectCurrentDay = (state: GameStoreSlice) => state.time.currentDay;
export const selectIsDay = (state: GameStoreSlice) => state.time.isDay;
export const selectInventory = (state: GameStoreSlice) => state.inventory;
export const selectDialogueState = (state: GameStoreSlice) => state.dialogue;
export const selectGamePhase = (state: GameStoreSlice) => state.gamePhase;
export const selectCompletedNodes = (state: GameStoreSlice) => state.completedNodeIds;
export const selectIsTransitioning = (state: GameStoreSlice) => state.isTransitioning;
export const selectActiveSystem = (state: GameStoreSlice) => state.activeSystem;


// --- Helper for handling narrative events ---
// Consider moving this logic to a dedicated system or hook
// FIX: Add explicit types
function handleNarrativeEvent(event: NarrativeEvent, get: () => GameStoreSlice, set: (fn: (state: GameStoreSlice) => void) => void) {
    switch (event.type) {
        case 'updatePlayerHealth':
            // Ensure payload matches expected type for updatePlayerHealth if it's more specific than { delta: number }
            if (typeof event.payload?.delta === 'number') {
                get().updatePlayerHealth(event.payload.delta);
            }
            break;
        case 'addItem':
             // Assuming payload has item details or an itemId to look up
             // const item = findItemById(event.payload.itemId); // Need item lookup logic
             // if(item) get().addItemToInventory(item);
             console.warn("addItem narrative event needs implementation (item lookup)");
            break;
        case 'updateKnowledge':
            // POTENTIAL ISSUE: Verify 'addInsight' exists and is correctly typed in KnowledgeStore
            // Ensure payload matches expected type for addInsight
             if (event.payload?.insightId && event.payload?.data) {
                // Type assertion as a potential workaround if TS inference fails
                (useKnowledgeStore.getState() as KnowledgeStoreActions).addInsight(event.payload.insightId, event.payload.data);
             }
            break;
        case 'updateJournal':
             // Ensure payload matches expected type for addEntry
             if (event.payload?.entryId && event.payload?.content) {
                // FIX: Pass a single JournalEntry object
                const newEntry: JournalEntry = {
                    id: event.payload.entryId,
                    title: event.payload.title || `Entry ${event.payload.entryId}`, // Provide default title
                    content: event.payload.content,
                    timestamp: Date.now(),
                    read: false,
                };
                // Type assertion as a potential workaround if TS inference fails
                (useJournalStore.getState() as JournalStoreActions).addEntry(newEntry);
             }
            break;
        default:
            // Use a type assertion for exhaustiveness checking (optional)
            const _exhaustiveCheck: never = event.type;
            console.warn(`Unhandled narrative event type: ${event.type}`);
    }
}
