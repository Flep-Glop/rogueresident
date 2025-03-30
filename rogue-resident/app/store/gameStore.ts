// app/store/gameStore.ts
import { create } from 'zustand';
import { Item } from '../data/items';

type GameState = {
  player: {
    health: number;
    insight: number;
  };
  currentNodeId: string | null;
  completedNodeIds: string[];
  inventory: Item[];
  
  // Actions
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
  player: {
    health: 4, // Starting health
    insight: 100, // Starting insight
  },
  currentNodeId: null,
  completedNodeIds: [],
  inventory: [],
};

export const useGameStore = create<GameState>((set) => ({
  ...initialState,
  
  setCurrentNode: (nodeId) => set({ currentNodeId: nodeId }),
  
  completeNode: (nodeId) => set((state) => ({ 
    completedNodeIds: [...state.completedNodeIds, nodeId] 
  })),
  
  updateHealth: (amount) => set((state) => ({
    player: {
      ...state.player,
      health: Math.max(0, state.player.health + amount),
    }
  })),
  
  updateInsight: (amount) => set((state) => ({
    player: {
      ...state.player,
      insight: Math.max(0, state.player.insight + amount),
    }
  })),
  
  addToInventory: (item) => set((state) => ({
    inventory: [...state.inventory, item]
  })),
  
  removeFromInventory: (itemId) => set((state) => ({
    inventory: state.inventory.filter(item => item.id !== itemId)
  })),
  
  resetGame: () => set({ ...initialState }),
}));

// Helper function to calculate bonuses from inventory
export const calculateItemBonuses = (inventory: Item[], challengeType: 'clinical' | 'qa' | 'educational' | 'general') => {
  return inventory.reduce((total, item) => {
    const effect = item.effects.find((e: any) => e.type === challengeType);
    return total + (effect?.value || 0);
  }, 0);
};