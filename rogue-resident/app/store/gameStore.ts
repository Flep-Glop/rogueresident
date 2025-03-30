// app/store/gameStore.ts
import { create } from 'zustand';
import { Item } from '../data/items';
import { generateMap, GameMap, Node } from '../utils/mapGenerator';

type GameState = {
  gameState: 'not_started' | 'in_progress' | 'game_over' | 'victory';
  player: {
    health: number;
    insight: number;
  };
  currentNodeId: string | null;
  completedNodeIds: string[];
  inventory: Item[];
  map: GameMap | null;
  
  // Actions
  startGame: () => void;
  setCurrentNode: (nodeId: string) => void;
  completeNode: (nodeId: string) => void;
  updateHealth: (amount: number) => void;
  updateInsight: (amount: number) => void;
  addToInventory: (item: Item) => void;
  removeFromInventory: (itemId: string) => void;
  // For easy reset/new game
  resetGame: () => void;
};

// Initial state for reuse in resetGame
const initialState = {
  gameState: 'not_started' as const,
  player: {
    health: 4, // Starting health
    insight: 100, // Starting insight
  },
  currentNodeId: null,
  completedNodeIds: [],
  inventory: [],
  map: null,
};

export const useGameStore = create<GameState>((set, get) => ({
  ...initialState,
  
  startGame: () => {
    // Generate a new map when starting the game
    const newMap = generateMap();
    console.log("Generated new map for game start:", newMap);
    
    set(state => ({ 
      ...state, 
      gameState: 'in_progress',
      map: newMap,
      // Set the current node to the start node
      currentNodeId: newMap.startNodeId
    }));
  },
  
  setCurrentNode: (nodeId) => {
    console.log("Setting current node:", nodeId);
    set({ currentNodeId: nodeId });
  },
  
  completeNode: (nodeId) => {
    console.log("Before completion, completedNodeIds:", get().completedNodeIds);
    
    // Ensure we don't add the same node twice
    if (get().completedNodeIds.includes(nodeId)) {
      console.log("Node already completed, skipping:", nodeId);
      return;
    }
    
    console.log("Completing node:", nodeId);
    set((state) => {
      const newCompletedNodeIds = [...state.completedNodeIds, nodeId];
      console.log("New completedNodeIds:", newCompletedNodeIds);
      return { completedNodeIds: newCompletedNodeIds };
    });
    
    console.log("After set, completedNodeIds:", get().completedNodeIds);
  },
  
  updateHealth: (amount) => set((state) => {
    const newHealth = Math.max(0, state.player.health + amount);
    console.log(`Updating health by ${amount} to ${newHealth}`);
    return {
      player: {
        ...state.player,
        health: newHealth,
      },
      // If health reaches 0, update gameState
      ...(newHealth <= 0 ? { gameState: 'game_over' } : {})
    };
  }),
  
  updateInsight: (amount) => set((state) => {
    const newInsight = Math.max(0, state.player.insight + amount);
    console.log(`Updating insight by ${amount} to ${newInsight}`);
    return {
      player: {
        ...state.player,
        insight: newInsight,
      }
    };
  }),
  
  addToInventory: (item) => {
    console.log("Adding item to inventory:", item.name);
    set((state) => ({
      inventory: [...state.inventory, item]
    }));
  },
  
  removeFromInventory: (itemId) => {
    console.log("Removing item from inventory:", itemId);
    set((state) => ({
      inventory: state.inventory.filter(item => item.id !== itemId)
    }));
  },
  
  resetGame: () => {
    console.log("Resetting game to initial state");
    set({ ...initialState });
  },
}));

// Helper function to calculate bonuses from inventory
export const calculateItemBonuses = (inventory: Item[], challengeType: 'clinical' | 'qa' | 'educational' | 'general') => {
  return inventory.reduce((total, item) => {
    const effect = item.effects.find((e: any) => e.type === challengeType);
    return total + (effect?.value || 0);
  }, 0);
};