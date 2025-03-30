import { create } from 'zustand';
import { Node, PlayerStats } from '../types/map';

interface GameState {
  player: PlayerStats;
  currentNodeId: string | null;
  completedNodeIds: string[];
  inventory: any[]; // We'll expand this later

  // Actions
  setCurrentNode: (nodeId: string) => void;
  completeNode: (nodeId: string) => void;
  updateHealth: (amount: number) => void;
  updateInsight: (amount: number) => void;
}

export const useGameStore = create<GameState>((set) => ({
  player: {
    health: 4, // Starting health
    insight: 100, // Starting insight
  },
  currentNodeId: null,
  completedNodeIds: [],
  inventory: [],
  
  setCurrentNode: (nodeId) => set({ currentNodeId: nodeId }),
  completeNode: (nodeId) => set((state) => ({ 
    completedNodeIds: [...state.completedNodeIds, nodeId] 
  })),
  updateHealth: (amount) => set((state) => ({
    player: {
      ...state.player,
      health: state.player.health + amount,
    }
  })),
  updateInsight: (amount) => set((state) => ({
    player: {
      ...state.player,
      insight: state.player.insight + amount,
    }
  })),
}));