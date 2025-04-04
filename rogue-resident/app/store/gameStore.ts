// app/store/gameStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Item } from '../data/items';
import { Node, NodeState, GameMap, mapUtils, RunConfig } from '../types/map';
import { generateMap } from '../utils/mapGenerator';
import { 
  createSeedUrl, 
  DEV_SEEDS, 
  generateSeedName, 
  getRandomSeed, 
  RunData, 
  saveRun,
  updateCurrentRun
} from '../utils/seedUtils';

// Game phase types
export type GamePhase = 'day' | 'night' | 'game_over' | 'victory';
export type TutorialStep = number;

type GameState = {
  gameState: 'not_started' | 'in_progress' | 'game_over' | 'victory';
  gamePhase: GamePhase;
  player: {
    health: number;
    insight: number;
    maxHealth: number;
  };
  currentNodeId: string | null;
  completedNodeIds: string[];
  inventory: Item[];
  
  // Use 'map' for consistency - this is the same as the old 'map' property
  map: GameMap | null;
  
  // Map navigation state
  mapViewState?: {
    offsetX: number;
    offsetY: number;
    zoom: number;
  };
  
  // Day tracking
  currentDay: number;
  
  // Tutorial & progression state
  hasPlayedBefore: boolean;
  tutorialStep: TutorialStep;
  showHints: boolean;
  
  // Run tracking and seeded generation
  currentRun: RunData | null;
  recentRuns: RunData[];
  
  // Permanent upgrades
  bonuses: {
    clinical: number;
    qa: number;
    educational: number;
  };
  
  // Session metadata for persistence
  _storeVersion: string;
  _lastUpdated: string;
  
  // Actions
  startGame: (config?: RunConfig) => void;
  setCurrentNode: (nodeId: string) => void;
  completeNode: (nodeId: string) => void;
  updateHealth: (amount: number) => void;
  updateInsight: (amount: number) => void;
  addToInventory: (item: Item) => void;
  removeFromInventory: (itemId: string) => void;
  resetGame: () => void;
  resetCurrentRun: () => void;
  
  // Tutorial actions
  showTutorial: (step: TutorialStep) => void;
  dismissTutorial: () => void;
  markAsPlayed: () => void;
  toggleHints: (show?: boolean) => void;
  
  // Bonus management
  updateBonus: (type: 'clinical' | 'qa' | 'educational', amount: number) => void;
  
  // Game phase management
  setGamePhase: (phase: GamePhase) => void;
  completeDay: () => void;
  completeNight: () => void;
  
  // Enhanced seed & run management
  replaySeed: (seed: number) => void;
  useDailyChallenge: () => void;
  useRandomSeed: () => void;
  
  // Enhanced map functionality
  isNodeAccessible: (nodeId: string) => boolean;
  getNodeState: (nodeId: string) => NodeState;
};

// Initial state for reuse in resetGame
const initialState = {
  gameState: 'not_started' as const,
  gamePhase: 'day' as GamePhase,
  player: {
    health: 4, // Starting health
    maxHealth: 4, // Maximum health
    insight: 100, // Starting insight
  },
  currentNodeId: null,
  completedNodeIds: [],
  inventory: [],
  map: null,
  
  // Map viewport state
  mapViewState: {
    offsetX: 0,
    offsetY: 0,
    zoom: 1,
  },
  
  // Day tracking
  currentDay: 1,
  
  // Tutorial state
  hasPlayedBefore: false,
  tutorialStep: 0,
  showHints: true,
  
  // Run tracking
  currentRun: null,
  recentRuns: [],
  
  // Bonuses
  bonuses: {
    clinical: 0,
    qa: 0,
    educational: 0,
  },
  
  // Store metadata
  _storeVersion: '1.1.0', // Updated for seed support
  _lastUpdated: new Date().toISOString(),
};

// Helper to manage persistence in development
const STORAGE_KEY = 'rogue-resident-game';

// Create the store with persistence
export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      startGame: (config: RunConfig = {}) => {
        console.log("🎮 Starting new game with config:", config);
        
        // Determine which seed to use
        const seed = config.seed || getRandomSeed();
        
        // Generate a new map with the seed
        const newMap = generateMap({
          ...config,
          seed,
          mapType: 'tutorial'
        });
        
        console.log(`🗺️ Generated new map for game start with seed ${seed}:`, {
          nodeCount: newMap.nodes.length, 
          startNode: newMap.startNodeId,
          seedName: newMap.seedName
        });
        
        // Create run data
        const runData: RunData = {
          seed,
          seedName: generateSeedName(seed),
          timestamp: new Date().toISOString(),
          completed: false,
          dayCount: 1
        };
        
        // Save run to history
        saveRun(runData);
        
        // Validate the map has at least one node
        if (!newMap.nodes || newMap.nodes.length === 0) {
          console.error("🚨 Map generation failed - no nodes available");
          // Generate a fallback single-node map for stability
          const fallbackMap = {
            nodes: [{
              id: 'emergency_node',
              title: 'Emergency Calibration',
              description: 'Emergency fallback node',
              type: 'kapoorCalibration',
              position: { x: 50, y: 50 },
              connections: [],
              isLocked: false,
              insightReward: 50,
              character: 'kapoor'
            }],
            startNodeId: 'emergency_node',
            bossNodeId: 'emergency_node',
            seed,
            seedName: generateSeedName(seed),
            dimensions: { width: 100, height: 100 }
          };
          
          set({ 
            gameState: 'in_progress',
            gamePhase: 'day',
            map: fallbackMap,
            currentNodeId: null,
            currentRun: runData,
            _lastUpdated: new Date().toISOString()
          });
          
          return;
        }
        
        // Set the game state with the new map
        set({ 
          gameState: 'in_progress',
          gamePhase: 'day',
          map: newMap,
          currentNodeId: null,
          currentRun: runData,
          _lastUpdated: new Date().toISOString()
        });
      },
      
      setCurrentNode: (nodeId) => {
        console.log("🎯 Setting current node:", nodeId);
        set({ 
          currentNodeId: nodeId,
          _lastUpdated: new Date().toISOString() 
        });
      },
      
      completeNode: (nodeId) => {
        const completedNodeIds = get().completedNodeIds;
        console.log("🏆 Before completion, completedNodeIds:", completedNodeIds);
        
        // Ensure we don't add the same node twice
        if (completedNodeIds.includes(nodeId)) {
          console.log("⚠️ Node already completed, skipping:", nodeId);
          return;
        }
        
        console.log("✅ Completing node:", nodeId);
        set((state) => {
          const newCompletedNodeIds = [...state.completedNodeIds, nodeId];
          console.log("🔄 New completedNodeIds:", newCompletedNodeIds);
          return { 
            completedNodeIds: newCompletedNodeIds,
            _lastUpdated: new Date().toISOString()
          };
        });
      },
      
      updateHealth: (amount) => set((state) => {
        const newHealth = Math.min(state.player.maxHealth, Math.max(0, state.player.health + amount));
        console.log(`🩹 Updating health by ${amount} to ${newHealth}`);
        
        // If health reaches 0, update gameState
        if (newHealth <= 0) {
          // Mark current run as completed (but not successful)
          if (state.currentRun) {
            updateCurrentRun({ completed: true });
          }
          
          return {
            player: {
              ...state.player,
              health: newHealth,
            },
            gameState: 'game_over',
            gamePhase: 'game_over',
            _lastUpdated: new Date().toISOString()
          };
        }
        
        return {
          player: {
            ...state.player,
            health: newHealth,
          },
          _lastUpdated: new Date().toISOString()
        };
      }),
      
      updateInsight: (amount) => set((state) => {
        const newInsight = Math.max(0, state.player.insight + amount);
        console.log(`💡 Updating insight by ${amount} to ${newInsight}`);
        return {
          player: {
            ...state.player,
            insight: newInsight,
          },
          _lastUpdated: new Date().toISOString()
        };
      }),
      
      addToInventory: (item) => {
        console.log("🎒 Adding item to inventory:", item.name);
        set((state) => ({
          inventory: [...state.inventory, item],
          _lastUpdated: new Date().toISOString()
        }));
      },
      
      removeFromInventory: (itemId) => {
        console.log("🗑️ Removing item from inventory:", itemId);
        set((state) => ({
          inventory: state.inventory.filter(item => item.id !== itemId),
          _lastUpdated: new Date().toISOString()
        }));
      },
      
      resetGame: () => {
        console.log("🔄 Resetting game to initial state");
        
        // Add this development guard to prevent accidental resets
        if (process.env.NODE_ENV !== 'production') {
          console.trace("🔍 Reset game called from:");
        }
        
        // Only reset if not already in initial state to prevent loops
        const currentState = get();
        if (currentState.gameState !== 'not_started') {
          set({ 
            ...initialState,
            hasPlayedBefore: currentState.hasPlayedBefore, // Preserve tutorial state
            recentRuns: currentState.recentRuns, // Preserve run history
            _lastUpdated: new Date().toISOString() 
          });
        } else {
          console.warn("⚠️ Prevented duplicate reset - game already in initial state");
        }
      },
      
      // Add a new action to reset current run but keep meta-progress
      resetCurrentRun: () => {
        console.log("🔄 Resetting current run while preserving meta-progress");
        
        const { hasPlayedBefore, bonuses, recentRuns } = get();
        
        set({
          ...initialState,
          hasPlayedBefore, // Preserve tutorial state
          bonuses, // Preserve permanent upgrades
          recentRuns, // Preserve run history
          _lastUpdated: new Date().toISOString()
        });
        
        // Start a new game immediately
        setTimeout(() => get().startGame(), 10);
      },
      
      // Tutorial system
      showTutorial: (step: TutorialStep) => {
        console.log(`📚 Showing tutorial step: ${step}`);
        set({ 
          tutorialStep: step,
          _lastUpdated: new Date().toISOString() 
        });
      },
      
      dismissTutorial: () => {
        console.log("❌ Dismissing tutorial");
        set({ 
          tutorialStep: -1,
          _lastUpdated: new Date().toISOString() 
        });
      },
      
      markAsPlayed: () => {
        console.log("👤 Marking game as played before");
        set({ 
          hasPlayedBefore: true,
          _lastUpdated: new Date().toISOString() 
        });
      },
      
      toggleHints: (show?: boolean) => {
        console.log(`💬 Toggling hints: ${show !== undefined ? show : 'toggle'}`);
        set((state) => ({ 
          showHints: show !== undefined ? show : !state.showHints,
          _lastUpdated: new Date().toISOString() 
        }));
      },
      
      // Bonus management
      updateBonus: (type, amount) => {
        console.log(`🔼 Updating ${type} bonus by ${amount}`);
        set((state) => ({
          bonuses: {
            ...state.bonuses,
            [type]: state.bonuses[type] + amount
          },
          _lastUpdated: new Date().toISOString()
        }));
      },
      
      // Game phase management
      setGamePhase: (phase: GamePhase) => {
        console.log(`🔄 Setting game phase to: ${phase}`);
        set({ 
          gamePhase: phase,
          _lastUpdated: new Date().toISOString() 
        });
      },
      
      completeDay: () => {
        const { map, completedNodeIds, player, currentRun } = get();
        
        // Can't complete if no map
        if (!map) {
          console.error("❌ Cannot complete day: No map available");
          return;
        }
        
        // Check if player has run out of health
        if (player.health <= 0) {
          console.log("💀 Player has run out of health, transitioning to game over");
          
          // Update run data
          if (currentRun) {
            updateCurrentRun({ completed: true });
          }
          
          set({ 
            gameState: 'game_over',
            gamePhase: 'game_over',
            _lastUpdated: new Date().toISOString()
          });
          return;
        }
        
        // Check if boss is defeated
        const isBossDefeated = completedNodeIds.includes(map.bossNodeId);
        
        // Check if all non-boss nodes are completed
        const allNodesCompleted = map.nodes
          .filter(node => node.type !== 'boss' && node.type !== 'boss-ionix')
          .every(node => completedNodeIds.includes(node.id));
          
        // Check if player has enough completed nodes to progress
        // (Allow progress even if not everything is complete)
        const hasMinimumProgress = completedNodeIds.length >= 3;
        
        if (isBossDefeated) {
          console.log("🏆 Boss defeated, transitioning to victory");
          
          // Update run data
          if (currentRun) {
            updateCurrentRun({ 
              completed: true,
              score: player.insight
            });
          }
          
          set({ 
            gameState: 'victory',
            gamePhase: 'victory',
            _lastUpdated: new Date().toISOString()
          });
          return;
        }
        
        // If we have enough progress, transition to night phase
        if (allNodesCompleted || hasMinimumProgress || completedNodeIds.length > 0) {
          console.log("🌙 Day complete, transitioning to night phase");
          set({ 
            gamePhase: 'night',
            _lastUpdated: new Date().toISOString() 
          });
          return;
        }
        
        console.log("⚠️ Cannot complete day: Not enough progress");
        // Maybe show a message to the player that they need to complete more nodes
      },
      
      completeNight: () => {
        console.log("☀️ Night phase complete, starting new day");
        const { currentRun, currentDay } = get();
        
        // Increment day counter
        set((state) => ({ 
          currentDay: state.currentDay + 1,
          gamePhase: 'day',
          _lastUpdated: new Date().toISOString()
        }));
        
        // Update run data
        if (currentRun) {
          updateCurrentRun({ 
            dayCount: currentDay + 1
          });
        }
        
        // Generate a new map with more nodes/complexity based on current day
        // Use the same seed for consistent generation
        const seed = currentRun?.seed || get().map?.seed || getRandomSeed();
        
        const newMap = generateMap({
          seed,
          difficultyLevel: currentDay,
          mapType: 'tutorial'
        });
        
        console.log(`🗺️ Generated new map for day ${get().currentDay + 1} with seed ${seed}`);
        
        // In a full implementation, this would apply upgrades and 
        // possibly restore some health
        set({
          map: newMap,
          currentNodeId: null, // Don't auto-select anymore
          // Reset completedNodeIds for the new day
          completedNodeIds: [],
          // In a real implementation, would apply more sophisticated health restoration
          player: {
            ...get().player,
            health: Math.min(get().player.maxHealth, get().player.health + 1) // Restore 1 health
          },
          _lastUpdated: new Date().toISOString()
        });
      },
      
      // Enhanced seed management
      replaySeed: (seed: number) => {
        console.log(`🎲 Replaying seed: ${seed}`);
        
        // Reset game state while preserving meta-progress
        const { hasPlayedBefore, bonuses, recentRuns } = get();
        
        set({
          ...initialState,
          hasPlayedBefore,
          bonuses,
          recentRuns,
          _lastUpdated: new Date().toISOString()
        });
        
        // Start new game with specified seed
        setTimeout(() => get().startGame({ seed }), 10);
      },
      
      useDailyChallenge: () => {
        console.log(`📅 Starting daily challenge run`);
        
        // Reset game state while preserving meta-progress
        const { hasPlayedBefore, bonuses, recentRuns } = get();
        
        set({
          ...initialState,
          hasPlayedBefore,
          bonuses,
          recentRuns,
          _lastUpdated: new Date().toISOString()
        });
        
        // Start new game with daily challenge config
        setTimeout(() => get().startGame({ useDailyChallenge: true }), 10);
      },
      
      useRandomSeed: () => {
        console.log(`🎲 Starting random seed run`);
        
        // Reset game state while preserving meta-progress
        const { hasPlayedBefore, bonuses, recentRuns } = get();
        
        set({
          ...initialState,
          hasPlayedBefore,
          bonuses,
          recentRuns,
          _lastUpdated: new Date().toISOString()
        });
        
        // Start new game with random seed
        setTimeout(() => get().startGame(), 10);
      },
      
      isNodeAccessible: (nodeId) => {
        const { map, completedNodeIds } = get();
        if (!map) return false;
        
        // Find the node
        const node = map.nodes.find(n => n.id === nodeId);
        if (!node) return false;
        
        // Start node is always accessible
        if (map.startNodeId === nodeId) return true;
        
        // Content-based accessibility (rather than type-based)
        // Any calibration node with Kapoor should be an entry point
        if (node.challengeContent === 'calibration' && node.character === 'kapoor') return true;
        
        // Special cases from the old system - keep for backward compatibility
        if (node.type === 'entrance' || node.type === 'kapoorCalibration') return true;
        
        // Normal connection logic - if connected to a completed node
        return map.nodes.some(n => 
          n.connections.includes(nodeId) && completedNodeIds.includes(n.id)
        );
      },
      
      getNodeState: (nodeId) => {
        const { currentNodeId, completedNodeIds, map } = get();
        
        if (!map) return 'locked'; 
        
        // Start node is always accessible
        const node = map.nodes.find(n => n.id === nodeId);
        
        if (!node) return 'locked';
        if (currentNodeId === nodeId) return 'active';
        if (completedNodeIds.includes(nodeId)) return 'completed';
        if (get().isNodeAccessible(nodeId)) return 'accessible';
        
        // Check if this node is connected to an accessible node
        const isConnectedToAccessible = map.nodes.some(n => 
          get().isNodeAccessible(n.id) && n.connections.includes(nodeId)
        );
        
        return isConnectedToAccessible ? 'future' : 'locked';
      }
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist these key parts of game state
        gameState: state.gameState,
        gamePhase: state.gamePhase,
        player: state.player,
        currentDay: state.currentDay,
        hasPlayedBefore: state.hasPlayedBefore,
        bonuses: state.bonuses,
        inventory: state.inventory,
        completedNodeIds: state.completedNodeIds,
        recentRuns: state.recentRuns,
        currentRun: state.currentRun,
        _storeVersion: state._storeVersion,
        _lastUpdated: new Date().toISOString(),
        
        // Explicitly exclude large objects from persistence
        map: undefined,
        currentNodeId: undefined,
      }),
      // Only merge whitelisted keys on hydration
      merge: (persistedState, currentState) => {
        console.log("🔄 Hydrating store from persisted state");
        
        // Check for version mismatch
        if (persistedState._storeVersion !== currentState._storeVersion) {
          console.warn(`⚠️ Store version mismatch: ${persistedState._storeVersion} vs ${currentState._storeVersion}`);
          return {
            ...currentState,
            hasPlayedBefore: persistedState.hasPlayedBefore || false,
            recentRuns: persistedState.recentRuns || [],
          };
        }
        
        return {
          ...currentState,  // Start with current state
          ...persistedState,  // Override with persisted values
          
          // Safety: Always regenerate map, never restore from persistence
          map: currentState.map, 
          
          // Ensure meta properties are retained
          _storeVersion: currentState._storeVersion,
          _lastUpdated: new Date().toISOString(),
        };
      },
    }
  )
);

// Add development utilities for managing persistent state
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
  // @ts-ignore - Dev utility
  window.rogueUtils = {
    // Clear persisted state (keeps in-memory state)
    clearStorage: () => {
      console.log("🧹 Clearing persisted game state from localStorage");
      localStorage.removeItem(STORAGE_KEY);
      return "Storage cleared. Refresh the page to start fresh.";
    },
    
    // Full reset (clears storage AND resets in-memory state)
    hardReset: () => {
      console.log("💥 Performing hard reset (storage + state)");
      localStorage.removeItem(STORAGE_KEY);
      useGameStore.getState().resetGame();
      
      setTimeout(() => {
        console.log("⚡ Starting a fresh game");
        useGameStore.getState().startGame();
      }, 100);
      
      return "Hard reset complete. Game state is fresh.";
    },
    
    // Get diagnostic info
    debugState: () => {
      const store = useGameStore.getState();
      const persistedJson = localStorage.getItem(STORAGE_KEY);
      const persistedState = persistedJson ? JSON.parse(persistedJson) : null;
      
      console.log("🔍 Current store state:", store);
      console.log("💾 Persisted state:", persistedState);
      
      return {
        inMemory: {
          gameState: store.gameState,
          gamePhase: store.gamePhase,
          health: store.player.health,
          insight: store.player.insight,
          completedNodes: store.completedNodeIds.length,
          hasMap: !!store.map,
          nodeCount: store.map?.nodes.length || 0,
          day: store.currentDay,
          seed: store.map?.seed || 'none',
          currentRun: store.currentRun
        },
        persisted: persistedState ? "Available" : "None",
        persistedKeys: persistedState ? Object.keys(persistedState.state) : [],
      };
    },
    
    // Function to help with debugging persistence issues
    checkPersistence: () => {
      const hasPersistedState = !!localStorage.getItem(STORAGE_KEY);
      console.log(`💾 Persistence check: ${hasPersistedState ? "State found in localStorage" : "No state in localStorage"}`);
      return hasPersistedState ? "Persistence active" : "No persisted state";
    },
    
    // Run specific seed
    runSeed: (seed: number) => {
      useGameStore.getState().replaySeed(seed);
      return `Starting game with seed: ${seed}`;
    },
    
    // Run daily challenge
    runDailyChallenge: () => {
      useGameStore.getState().useDailyChallenge();
      return "Starting daily challenge";
    },
    
    // Get seed URL
    getSeedUrl: () => {
      const seed = useGameStore.getState().map?.seed;
      if (!seed) return "No active seed";
      return createSeedUrl(seed);
    },
    
    // List dev seeds
    listDevSeeds: () => {
      console.table(DEV_SEEDS);
      return "See console for dev seed list";
    }
  };
  
  console.log("🛠️ Development utilities available at window.rogueUtils");
}

// Helper function to calculate bonuses from inventory
export const calculateItemBonuses = (inventory: Item[], challengeType: 'clinical' | 'qa' | 'educational' | 'general') => {
  return inventory.reduce((total, item) => {
    const effect = item.effects.find((e: any) => e.type === challengeType);
    return total + (effect?.value || 0);
  }, 0);
};