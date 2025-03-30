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

export const useChallengeStore = create<ChallengeState>((set) => ({
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
    // Calculate rewards based on grade
    const rewards = {
      'C': 25,
      'B': 50,
      'A': 75,
      'S': 100
    };
    
    // Get the current node ID, checking if it exists
    const currentNodeId = useGameStore.getState().currentNodeId;
    
    // Update player stats if we have a current node
    if (currentNodeId) {
      useGameStore.getState().updateInsight(rewards[grade]);
      useGameStore.getState().completeNode(currentNodeId);
    }
    
    // Move to outcome stage
    set((state) => ({
      currentChallenge: state.currentChallenge
        ? { ...state.currentChallenge, stage: 'outcome', grade }
        : null
    }));
  },
  
  resetChallenge: () => set({ currentChallenge: null }),
}));