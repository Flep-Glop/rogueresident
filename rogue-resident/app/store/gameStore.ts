// app/store/gameStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Simple type definitions to replace the complex map/node system
export type GamePhase = 'day' | 'night' | 'game_over' | 'victory';
export type TutorialStep = number;

// Simplified Item type
interface Item {
  id: string;
  name: string;
  description: string;
  rarity: string;
  effects: Array<{type: string, value: number}>;
}

// Simplified Node type - hardcoded with bare minimum implementation 
interface Node {
  id: string;
  title: string;
  type: string;
  character?: string;
  connections: string[];
}

// Simplified map structure
interface GameMap {
  nodes: Node[];
  startNodeId: string;
  bossNodeId: string;
  seed?: number;
  seedName?: string;
}

// Simplified run data 
interface RunData {
  seed?: number;
  seedName?: string;
  timestamp: string;
  dayCount: number;
  completed: boolean;
  score?: number;
}

type GameState = {
  gameState: 'not_started' | 'in_progress' | 'game_over' | 'victory';
  gamePhase: GamePhase;
  player: {
    health: number;
    insight: number;
    momentum: number; // New field
    maxHealth: number;
    maxMomentum: number; // New field
  };
  currentNodeId: string | null;
  completedNodeIds: string[];
  inventory: Item[];
  
  // Simplified map
  map: GameMap | null;
  
  // Day tracking
  currentDay: number;
  
  // Tutorial & progression state
  hasPlayedBefore: boolean;
  tutorialStep: TutorialStep;
  showHints: boolean;
  
  // Run tracking 
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
  startGame: () => void;
  setCurrentNode: (nodeId: string) => void;
  completeNode: (nodeId: string) => void;
  updateHealth: (amount: number) => void;
  updateInsight: (amount: number) => void;
  updateMomentum: (amount: number) => void;
  resetMomentum: () => void;
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
  
  // Node access helper
  isNodeAccessible: (nodeId: string) => boolean;
  getNodeState: (nodeId: string) => 'locked' | 'accessible' | 'active' | 'completed' | 'future';
};

// Initial state for reuse in resetGame
const initialState = {
  gameState: 'not_started' as const,
  gamePhase: 'day' as GamePhase,
  player: {
    health: 4, // Starting health
    maxHealth: 4, // Maximum health
    insight: 100, // Starting insight
    momentum: 0, // Initialize momentum
    maxMomentum: 3, // Max momentum level
  },
  currentNodeId: null,
  completedNodeIds: [],
  inventory: [],
  map: null,
  
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
  _storeVersion: '1.1.0',
  _lastUpdated: new Date().toISOString(),
};

// Helper to manage persistence in development
const STORAGE_KEY = 'rogue-resident-game';

// OPTION 1: Hardcoded map
function generateHardcodedMap(): GameMap {
  return {
    nodes: [
      {
        id: 'start_node',
        title: 'Hospital Entrance',
        type: 'entrance',
        character: 'kapoor',
        connections: ['calibration_node', 'storage_node']
      },
      {
        id: 'calibration_node',
        title: 'Calibration Lab',
        type: 'kapoorCalibration',
        character: 'kapoor',
        connections: ['qa_node', 'educational_node']
      },
      {
        id: 'qa_node',
        title: 'Quality Assurance',
        type: 'qaChallenge',
        character: 'jesse',
        connections: ['educational_node', 'boss_node']
      },
      {
        id: 'educational_node',
        title: 'Medical Physics Theory',
        type: 'educationalNode',
        character: 'quinn',
        connections: ['boss_node']
      },
      {
        id: 'storage_node',
        title: 'Storage Closet',
        type: 'storage',
        connections: ['qa_node']
      },
      {
        id: 'boss_node',
        title: 'Ionix Chamber Mystery',
        type: 'boss',
        character: 'quinn',
        connections: []
      }
    ],
    startNodeId: 'start_node',
    bossNodeId: 'boss_node',
    seed: 12345,
    seedName: 'Tutorial Map'
  };
}

// Create the store with persistence
export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      startGame: () => {
        console.log("🎮 Starting new game");
        
        // OPTION 1: Use hardcoded map instead of generator
        const newMap = generateHardcodedMap();
        
        console.log(`🗺️ Using hardcoded map with ${newMap.nodes.length} nodes`);
        
        // Create run data
        const runData: RunData = {
          seed: 12345,
          seedName: 'Tutorial Run',
          timestamp: new Date().toISOString(),
          completed: false,
          dayCount: 1
        };
        
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
        
        // Ensure we don't add the same node twice
        if (completedNodeIds.includes(nodeId)) {
          console.log("⚠️ Node already completed, skipping:", nodeId);
          return;
        }
        
        console.log("✅ Completing node:", nodeId);
        set((state) => {
          const newCompletedNodeIds = [...state.completedNodeIds, nodeId];
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
      
      updateMomentum: (amount) => set((state) => {
        const newMomentum = Math.min(state.player.maxMomentum, Math.max(0, state.player.momentum + amount));
        console.log(`🔄 Updating momentum by ${amount} to ${newMomentum}`);
        return {
          player: {
            ...state.player,
            momentum: newMomentum,
          },
          _lastUpdated: new Date().toISOString()
        };
      }),
      
      resetMomentum: () => set((state) => {
        console.log(`🔄 Resetting momentum to 0`);
        return {
          player: {
            ...state.player,
            momentum: 0,
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
        const { map, completedNodeIds, player } = get();
        
        // Can't complete if no map
        if (!map) {
          console.error("❌ Cannot complete day: No map available");
          return;
        }
        
        // Check if player has run out of health
        if (player.health <= 0) {
          console.log("💀 Player has run out of health, transitioning to game over");
          
          set({ 
            gameState: 'game_over',
            gamePhase: 'game_over',
            _lastUpdated: new Date().toISOString()
          });
          return;
        }
        
        // Check if boss is defeated
        const isBossDefeated = completedNodeIds.includes(map.bossNodeId);
        
        // Check if player has enough completed nodes to progress
        // (Allow progress even if not everything is complete)
        const hasMinimumProgress = completedNodeIds.length >= 1; // OPTION 1: Lower the bar for testing
        
        if (isBossDefeated) {
          console.log("🏆 Boss defeated, transitioning to victory");
          
          set({ 
            gameState: 'victory',
            gamePhase: 'victory',
            _lastUpdated: new Date().toISOString()
          });
          return;
        }
        
        // If we have enough progress, transition to night phase
        if (hasMinimumProgress || completedNodeIds.length > 0) {
          console.log("🌙 Day complete, transitioning to night phase");
          set({ 
            gamePhase: 'night',
            _lastUpdated: new Date().toISOString() 
          });
          return;
        }
        
        console.log("⚠️ Cannot complete day: Not enough progress");
      },
      
      completeNight: () => {
        console.log("☀️ Night phase complete, starting new day");
        
        // Increment day counter
        set((state) => ({ 
          currentDay: state.currentDay + 1,
          gamePhase: 'day',
          _lastUpdated: new Date().toISOString()
        }));
        
        // OPTION 1: Use same map for next day for simplicity
        // Update the current run
        const currentRun = get().currentRun;
        if (currentRun) {
          set((state) => ({
            currentRun: {
              ...currentRun,
              dayCount: state.currentDay
            }
          }));
        }
        
        // In a full implementation, this would apply upgrades and 
        // possibly restore some health, and generate a new map
        set({
          // Don't change map in OPTION 1 implementation
          currentNodeId: null, // Don't auto-select anymore
          // Reset completedNodeIds for the new day
          completedNodeIds: [],
          // Basic health restoration
          player: {
            ...get().player,
            health: Math.min(get().player.maxHealth, get().player.health + 1), // Restore 1 health
            momentum: 0 // Reset momentum for new day
          },
          _lastUpdated: new Date().toISOString()
        });
      },
      
      isNodeAccessible: (nodeId) => {
        const { map, completedNodeIds } = get();
        if (!map) return false;
        
        // Find the node
        const node = map.nodes.find(n => n.id === nodeId);
        if (!node) return false;
        
        // Start node is always accessible
        if (map.startNodeId === nodeId) return true;
        
        // Special case for easy entry points
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
      merge: (persistedState: any, currentState) => {
        console.log("🔄 Hydrating store from persisted state");
        
        return {
          ...currentState,  // Start with current state
          ...persistedState, // Apply persisted values (properly typed by TS)
          
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

// Helper function to calculate bonuses from inventory
export const calculateItemBonuses = (inventory: Item[], challengeType: 'clinical' | 'qa' | 'educational' | 'general') => {
  return inventory.reduce((total, item) => {
    const effect = item.effects.find(e => e.type === challengeType);
    return total + (effect?.value || 0);
  }, 0);
};