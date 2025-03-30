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
    
    // Update player stats if we have a current node
    if (currentNodeId) {
      console.log("Updating insight and completing node:", currentNodeId);
      const gameStore = useGameStore.getState();
      
      // First update insight
      gameStore.updateInsight(rewards[grade]);
      
      // Then mark the node as completed
      gameStore.completeNode(currentNodeId);
      
      console.log("After completion, completed nodes:", 
        useGameStore.getState().completedNodeIds);
    } else {
      console.warn("No current node ID found when completing challenge!");
    }
    
    // Move to outcome stage
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