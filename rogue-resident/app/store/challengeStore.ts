import { create } from 'zustand';
import { useGameStore } from './gameStore';

export type ChallengeStage = 'intro' | 'challenge' | 'outcome';
export type ChallengeType = 'clinical' | 'qa' | 'educational';
export type ChallengeGrade = 'C' | 'B' | 'A' | 'S';

interface ChallengeState {
  currentChallenge: {
    id: string;
    type: ChallengeType;
    stage: ChallengeStage;
    content: any;
    grade?: ChallengeGrade;
  } | null;
  
  // Actions
  startChallenge: (challenge: any) => void;
  setStage: (stage: ChallengeStage) => void;
  completeChallenge: (grade: ChallengeGrade) => void;
  resetChallenge: () => void;
}

export const useChallengeStore = create<ChallengeState>((set, get) => ({
  currentChallenge: null,
  
  startChallenge: (challenge) => set({
    currentChallenge: {
      ...challenge,
      stage: 'intro',
    }
  }),
  
  setStage: (stage) => set((state) => ({
    currentChallenge: state.currentChallenge
      ? { ...state.currentChallenge, stage }
      : null
  })),
  
  completeChallenge: (grade) => {
    console.log("Challenge completed with grade:", grade);
    
    // Calculate rewards based on grade
    const rewards = {
      'C': 25,
      'B': 50,
      'A': 75,
      'S': 100
    };
    
    // Get the current node ID, checking if it exists
    const currentNodeId = useGameStore.getState().currentNodeId;
    console.log("Current node ID when completing challenge:", currentNodeId);
    
    if (!currentNodeId) {
      console.warn("No current node ID found when completing challenge!");
      // Still proceed to outcome stage
      set((state) => ({
        currentChallenge: state.currentChallenge
          ? { ...state.currentChallenge, stage: 'outcome', grade }
          : null
      }));
      return;
    }
    
    // First, check if node is already completed to avoid duplicate operations
    const gameStore = useGameStore.getState();
    if (gameStore.completedNodeIds.includes(currentNodeId)) {
      console.log("Node already marked as completed:", currentNodeId);
      
      // Still update insight if not already done
      gameStore.updateInsight(rewards[grade]);
      
      // Move to outcome stage
      set((state) => ({
        currentChallenge: state.currentChallenge
          ? { ...state.currentChallenge, stage: 'outcome', grade }
          : null
      }));
      return;
    }
    
    // Update insight first (this is a separate operation that doesn't depend on node completion)
    gameStore.updateInsight(rewards[grade]);
    console.log(`Added ${rewards[grade]} insight points`);
    
    // Then attempt to mark the node as completed
    try {
      gameStore.completeNode(currentNodeId);
      console.log("Node marked as completed:", currentNodeId);
    } catch (error) {
      console.warn("Error completing node, will retry once:", error);
      
      // Retry node completion once after a delay
      setTimeout(() => {
        try {
          // Get fresh state
          const freshGameStore = useGameStore.getState();
          
          // Check if it's already completed now
          if (!freshGameStore.completedNodeIds.includes(currentNodeId)) {
            freshGameStore.completeNode(currentNodeId);
            console.log("Node completion retry successful");
          }
        } catch (retryError) {
          // Just log a warning, don't throw an error - let the game continue
          console.warn("Node completion retry failed, continuing anyway");
        }
      }, 300);
    }
    
    // Always move to outcome stage, regardless of completion success
    // This ensures the game flow continues even if there's an issue
    set((state) => ({
      currentChallenge: state.currentChallenge
        ? { ...state.currentChallenge, stage: 'outcome', grade }
        : null
    }));
  },
  
  resetChallenge: () => {
    console.log("Resetting challenge. Current state:", get().currentChallenge);
    console.log("Current completed nodes:", 
      useGameStore.getState().completedNodeIds);
    
    set({ currentChallenge: null });
  },
}));