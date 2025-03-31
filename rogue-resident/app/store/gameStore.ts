// app/store/gameStore.ts
import { create } from 'zustand';
import { Item } from '../data/items';
import { generateMap, GameMap, Node } from '../utils/mapGenerator';

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
  map: GameMap | null;
  
  // Day tracking
  currentDay: number;
  
  // Tutorial & progression state
  hasPlayedBefore: boolean;
  tutorialStep: TutorialStep;
  showHints: boolean;
  
  // Permanent upgrades
  bonuses: {
    clinical: number;
    qa: number;
    educational: number;
  };
  
  // Actions
  startGame: () => void;
  setCurrentNode: (nodeId: string) => void;
  completeNode: (nodeId: string) => void;
  updateHealth: (amount: number) => void;
  updateInsight: (amount: number) => void;
  addToInventory: (item: Item) => void;
  removeFromInventory: (itemId: string) => void;
  resetGame: () => void;
  
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
  
  // Day tracking
  currentDay: 1,
  
  // Tutorial state
  hasPlayedBefore: false,
  tutorialStep: 0,
  showHints: true,
  
  // Bonuses
  bonuses: {
    clinical: 0,
    qa: 0,
    educational: 0,
  },
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
      gamePhase: 'day',
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
    const newHealth = Math.min(state.player.maxHealth, Math.max(0, state.player.health + amount));
    console.log(`Updating health by ${amount} to ${newHealth}`);
    
    // If health reaches 0, update gameState
    if (newHealth <= 0) {
      return {
        player: {
          ...state.player,
          health: newHealth,
        },
        gameState: 'game_over',
        gamePhase: 'game_over'
      };
    }
    
    return {
      player: {
        ...state.player,
        health: newHealth,
      }
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
  
  // Tutorial system
  showTutorial: (step: TutorialStep) => {
    console.log(`Showing tutorial step: ${step}`);
    set({ tutorialStep: step });
  },
  
  dismissTutorial: () => {
    console.log("Dismissing tutorial");
    set({ tutorialStep: -1 });
  },
  
  markAsPlayed: () => {
    console.log("Marking game as played before");
    set({ hasPlayedBefore: true });
  },
  
  toggleHints: (show?: boolean) => {
    console.log(`Toggling hints: ${show !== undefined ? show : 'toggle'}`);
    set((state) => ({ 
      showHints: show !== undefined ? show : !state.showHints 
    }));
  },
  
  // Bonus management
  updateBonus: (type, amount) => {
    console.log(`Updating ${type} bonus by ${amount}`);
    set((state) => ({
      bonuses: {
        ...state.bonuses,
        [type]: state.bonuses[type] + amount
      }
    }));
  },
  
  // Game phase management
  setGamePhase: (phase: GamePhase) => {
    console.log(`Setting game phase to: ${phase}`);
    set({ gamePhase: phase });
  },
  
  completeDay: () => {
    const { map, completedNodeIds, player } = get();
    
    // Can't complete if no map
    if (!map) {
      console.error("Cannot complete day: No map available");
      return;
    }
    
    // Check if player has run out of health
    if (player.health <= 0) {
      console.log("Player has run out of health, transitioning to game over");
      set({ 
        gameState: 'game_over',
        gamePhase: 'game_over'
      });
      return;
    }
    
    // Check if boss is defeated
    const isBossDefeated = completedNodeIds.includes(map.bossNodeId);
    
    // Check if all non-boss nodes are completed
    const allNodesCompleted = map.nodes
      .filter(node => node.type !== 'boss')
      .every(node => completedNodeIds.includes(node.id));
      
    // Check if player has enough completed nodes to progress
    // (Allow progress even if not everything is complete)
    const hasMinimumProgress = completedNodeIds.length >= 3;
    
    if (isBossDefeated) {
      console.log("Boss defeated, transitioning to victory");
      set({ 
        gameState: 'victory',
        gamePhase: 'victory'
      });
      return;
    }
    
    // If we have enough progress, transition to night phase
    if (allNodesCompleted || hasMinimumProgress || completedNodeIds.length > 0) {
      console.log("Day complete, transitioning to night phase");
      set({ gamePhase: 'night' });
      return;
    }
    
    console.log("Cannot complete day: Not enough progress");
    // Maybe show a message to the player that they need to complete more nodes
  },
  
  completeNight: () => {
    console.log("Night phase complete, starting new day");
    
    // Increment day counter
    set((state) => ({ 
      currentDay: state.currentDay + 1,
      gamePhase: 'day'
    }));
    
    // Generate a new map with more nodes/complexity based on current day
    const newMap = generateMap();
    console.log("Generated new map for day", get().currentDay + 1);
    
    // In a full implementation, this would apply upgrades and 
    // possibly restore some health
    set((state) => ({
      map: newMap,
      currentNodeId: newMap.startNodeId,
      // Reset completedNodeIds for the new day
      completedNodeIds: [],
      // In a real implementation, would apply more sophisticated health restoration
      player: {
        ...state.player,
        health: Math.min(state.player.maxHealth, state.player.health + 1) // Restore 1 health
      }
    }));
  },
}));

// Helper function to calculate bonuses from inventory
export const calculateItemBonuses = (inventory: Item[], challengeType: 'clinical' | 'qa' | 'educational' | 'general') => {
  return inventory.reduce((total, item) => {
    const effect = item.effects.find((e: any) => e.type === challengeType);
    return total + (effect?.value || 0);
  }, 0);
};