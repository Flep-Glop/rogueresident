// app/core/dialogue/NarrativeBranchingSystem.ts
/**
 * Narrative Branching System
 * 
 * Manages persistent narrative choices across gameplay sessions,
 * creating meaningful consequences that echo throughout the experience.
 * 
 * Inspired by Supergiant's approach in Pyre where player choices create
 * rippling consequences that remain consistent across the narrative arc.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useEventBus } from '../events/CentralEventBus';
import { GameEventType } from '../events/EventTypes';
import { useGameStore } from '../../store/gameStore';
import { useDialogueStateMachine } from './DialogueStateMachine';
import { useCharacterMemory } from './CharacterMemorySystem';

// Types for branching system
export type BranchType = 
  | 'character'      // Character relationship direction
  | 'knowledge'      // Educational approach/stance
  | 'approach'       // Medical approach choice
  | 'protocol'       // Protocol adherence choice
  | 'equipment'      // Equipment preference
  | 'theory'         // Theoretical stance
  | 'boss-strategy'  // Boss approach strategy
  | 'meta';          // Meta-game progression choice

// Impact scales how much a decision affects narrative
export type BranchImpact = 
  | 'minor'          // Small flavor changes
  | 'moderate'       // Notable dialogue changes
  | 'major'          // Significant narrative shifts
  | 'critical';      // Game-changing consequences

// A narrative branch represents a player choice with consequences
export interface NarrativeBranch {
  id: string;
  type: BranchType;
  title: string;
  description: string;
  impact: BranchImpact;
  choices: {
    id: string;
    label: string;
    chosen: boolean;
    consequence?: string;
  }[];
  characterAffected?: string[];
  dayCreated: number;
  dayRevealed?: number;
  requiresPriority?: boolean;
  visible: boolean;
  timestamp: number;
  tags: string[];
}

// A consequence is a specific outcome of a branch choice
export interface BranchConsequence {
  id: string;
  branchId: string;
  choiceId: string;
  description: string;
  triggered: boolean;
  impactDescription?: string;
  permanence: 'temporary' | 'persistent' | 'permanent';
  hiddenUntilTriggered?: boolean;
}

// Branch visualization data for UI
export interface BranchVisualizationData {
  id: string;
  type: BranchType;
  title: string;
  choices: {
    id: string;
    label: string;
    selected: boolean;
  }[];
  impact: BranchImpact;
  // Coordinates for visualization
  x: number;
  y: number;
  color: string;
  size: number;
  connectedBranches: string[];
}

// Branch query options
export interface BranchQuery {
  type?: BranchType | BranchType[];
  visible?: boolean;
  impact?: BranchImpact | BranchImpact[];
  character?: string;
  tags?: string[];
  dayRange?: [number, number];
  limit?: number;
}

// Store interface for narrative branching
interface NarrativeBranchingState {
  // Core data
  branches: NarrativeBranch[];
  consequences: BranchConsequence[];
  
  // Branch tracking
  hasBranch: (branchId: string) => boolean;
  getSelectedChoice: (branchId: string) => string | null;
  getBranchesForCharacter: (characterId: string) => NarrativeBranch[];
  queryBranches: (query: BranchQuery) => NarrativeBranch[];
  
  // Branch visualization
  getVisualizationData: () => BranchVisualizationData[];
  getBranchConsequences: (branchId: string) => BranchConsequence[];
  getActiveConsequences: () => BranchConsequence[];
  
  // Branch manipulation
  createBranch: (branch: Omit<NarrativeBranch, 'id' | 'timestamp' | 'dayCreated' | 'visible'>) => string;
  selectChoice: (branchId: string, choiceId: string) => boolean;
  triggerConsequence: (consequenceId: string) => boolean;
  setConsequence: (
    branchId: string, 
    choiceId: string, 
    consequence: Omit<BranchConsequence, 'id' | 'branchId' | 'choiceId' | 'triggered'>
  ) => string;
  
  // Utility functions
  revealBranch: (branchId: string) => boolean;
  hideBranch: (branchId: string) => boolean;
  importantChoiceMade: (daysBetween?: number) => boolean;
  resetBranches: () => void;
}

// Create the branching store with persistence
export const useNarrativeBranching = create<NarrativeBranchingState>()(
  persist(
    (set, get) => ({
      branches: [],
      consequences: [],
      
      // Check if a branch exists
      hasBranch: (branchId) => {
        return get().branches.some(branch => branch.id === branchId);
      },
      
      // Get selected choice for a branch
      getSelectedChoice: (branchId) => {
        const branch = get().branches.find(b => b.id === branchId);
        if (!branch) return null;
        
        const selectedChoice = branch.choices.find(c => c.chosen);
        return selectedChoice ? selectedChoice.id : null;
      },
      
      // Get branches related to a character
      getBranchesForCharacter: (characterId) => {
        return get().branches.filter(branch => 
          branch.visible && 
          branch.characterAffected?.includes(characterId)
        );
      },
      
      // Query branches with filters
      queryBranches: (query) => {
        const { branches } = get();
        
        return branches.filter(branch => {
          // Type filter
          if (query.type) {
            if (Array.isArray(query.type)) {
              if (!query.type.includes(branch.type)) return false;
            } else {
              if (branch.type !== query.type) return false;
            }
          }
          
          // Visibility filter
          if (query.visible !== undefined && branch.visible !== query.visible) return false;
          
          // Impact filter
          if (query.impact) {
            if (Array.isArray(query.impact)) {
              if (!query.impact.includes(branch.impact)) return false;
            } else {
              if (branch.impact !== query.impact) return false;
            }
          }
          
          // Character filter
          if (query.character && !branch.characterAffected?.includes(query.character)) return false;
          
          // Tags filter
          if (query.tags && query.tags.length > 0) {
            if (!query.tags.some(tag => branch.tags.includes(tag))) return false;
          }
          
          // Day range filter
          if (query.dayRange) {
            const [minDay, maxDay] = query.dayRange;
            if (branch.dayCreated < minDay || branch.dayCreated > maxDay) return false;
          }
          
          return true;
        }).slice(0, query.limit);
      },
      
      // Get visualization data for branches
      getVisualizationData: () => {
        const { branches } = get();
        
        // Generate visualization data for each branch
        return branches
          .filter(branch => branch.visible)
          .map((branch, index) => {
            // Generate positions in a circular layout for visualization
            const radius = 150;
            const angle = (index / branches.length) * Math.PI * 2;
            const x = radius * Math.cos(angle);
            const y = radius * Math.sin(angle);
            
            // Determine color based on branch type
            const colors: Record<BranchType, string> = {
              'character': '#F87171', // Red
              'knowledge': '#60A5FA', // Blue
              'approach': '#34D399', // Green
              'protocol': '#FBBF24', // Yellow
              'equipment': '#A78BFA', // Purple
              'theory': '#EC4899', // Pink
              'boss-strategy': '#F472B6', // Hot pink
              'meta': '#9CA3AF' // Gray
            };
            
            // Determine size based on impact
            const sizes: Record<BranchImpact, number> = {
              'minor': 40,
              'moderate': 60,
              'major': 80,
              'critical': 100
            };
            
            // Map connected branches (would need more complex logic in a real implementation)
            const connectedBranches: string[] = [];
            
            return {
              id: branch.id,
              type: branch.type,
              title: branch.title,
              choices: branch.choices.map(choice => ({
                id: choice.id,
                label: choice.label,
                selected: choice.chosen
              })),
              impact: branch.impact,
              x,
              y,
              color: colors[branch.type],
              size: sizes[branch.impact],
              connectedBranches
            };
          });
      },
      
      // Get consequences for a branch
      getBranchConsequences: (branchId) => {
        return get().consequences.filter(c => c.branchId === branchId);
      },
      
      // Get all active consequences
      getActiveConsequences: () => {
        return get().consequences.filter(c => c.triggered);
      },
      
      // Create a new branch
      createBranch: (branch) => {
        const id = `branch-${branch.type}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const currentDay = useGameStore.getState().currentDay;
        
        set(state => ({
          branches: [
            ...state.branches,
            {
              ...branch,
              id,
              timestamp: Date.now(),
              dayCreated: currentDay,
              visible: false // Branches start hidden until revealed
            }
          ]
        }));
        
        return id;
      },
      
      // Select a choice for a branch
      selectChoice: (branchId, choiceId) => {
        let success = false;
        
        set(state => {
          const branchIndex = state.branches.findIndex(b => b.id === branchId);
          if (branchIndex === -1) return { branches: state.branches };
          
          success = true;
          
          // Create a copy of the branches array
          const branches = [...state.branches];
          
          // Create a copy of the branch to modify
          const branch = { ...branches[branchIndex] };
          
          // Update the choices
          branch.choices = branch.choices.map(choice => ({
            ...choice,
            chosen: choice.id === choiceId
          }));
          
          // Update the branches array
          branches[branchIndex] = branch;
          
          return { branches };
        });
        
        // If successful, record this choice in character memory
        if (success) {
          // Get the branch and choice description
          const branch = get().branches.find(b => b.id === branchId);
          const choice = branch?.choices.find(c => c.id === choiceId);
          
          if (branch && choice && branch.characterAffected) {
            // Record the choice for each affected character
            branch.characterAffected.forEach(characterId => {
              useCharacterMemory.getState().recordChoice(
                characterId,
                branchId,
                choice.label,
                getImpactValue(branch.impact)
              );
            });
            
            // Trigger any consequences for this choice
            const consequences = get().consequences.filter(
              c => c.branchId === branchId && c.choiceId === choiceId
            );
            
            consequences.forEach(consequence => {
              get().triggerConsequence(consequence.id);
            });
            
            // Emit choice selection event
            useEventBus.getState().dispatch(GameEventType.UI_BUTTON_CLICKED, {
              componentId: 'narrativeBranching',
              action: 'choiceSelected',
              metadata: {
                branchId,
                choiceId,
                branchType: branch.type,
                impact: branch.impact,
                characters: branch.characterAffected
              }
            });
          }
        }
        
        return success;
      },
      
      // Trigger a consequence
      triggerConsequence: (consequenceId) => {
        let success = false;
        
        set(state => {
          const consequenceIndex = state.consequences.findIndex(c => c.id === consequenceId);
          if (consequenceIndex === -1) return { consequences: state.consequences };
          
          success = true;
          
          // Create a copy of the consequences array
          const consequences = [...state.consequences];
          
          // Create a copy of the consequence to modify
          const consequence = { ...consequences[consequenceIndex], triggered: true };
          
          // Update the consequences array
          consequences[consequenceIndex] = consequence;
          
          return { consequences };
        });
        
        if (success) {
          // Get consequence details
          const consequence = get().consequences.find(c => c.id === consequenceId);
          
          if (consequence) {
            // Emit consequence triggered event
            useEventBus.getState().dispatch(GameEventType.UI_BUTTON_CLICKED, {
              componentId: 'narrativeBranching',
              action: 'consequenceTriggered',
              metadata: {
                consequenceId,
                branchId: consequence.branchId,
                choiceId: consequence.choiceId,
                description: consequence.description
              }
            });
          }
        }
        
        return success;
      },
      
      // Create a new consequence for a branch choice
      setConsequence: (branchId, choiceId, consequence) => {
        const id = `consequence-${branchId}-${choiceId}-${Date.now()}`;
        
        set(state => ({
          consequences: [
            ...state.consequences,
            {
              ...consequence,
              id,
              branchId,
              choiceId,
              triggered: false
            }
          ]
        }));
        
        return id;
      },
      
      // Make a branch visible
      revealBranch: (branchId) => {
        let success = false;
        
        set(state => {
          const branchIndex = state.branches.findIndex(b => b.id === branchId);
          if (branchIndex === -1) return { branches: state.branches };
          
          success = true;
          
          // Create a copy of the branches array
          const branches = [...state.branches];
          
          // Update the branch
          branches[branchIndex] = {
            ...branches[branchIndex],
            visible: true,
            dayRevealed: useGameStore.getState().currentDay
          };
          
          return { branches };
        });
        
        if (success) {
          // Emit branch revealed event
          const branch = get().branches.find(b => b.id === branchId);
          
          if (branch) {
            useEventBus.getState().dispatch(GameEventType.UI_BUTTON_CLICKED, {
              componentId: 'narrativeBranching',
              action: 'branchRevealed',
              metadata: {
                branchId,
                branchType: branch.type,
                title: branch.title,
                impact: branch.impact
              }
            });
          }
        }
        
        return success;
      },
      
      // Hide a branch
      hideBranch: (branchId) => {
        let success = false;
        
        set(state => {
          const branchIndex = state.branches.findIndex(b => b.id === branchId);
          if (branchIndex === -1) return { branches: state.branches };
          
          success = true;
          
          // Create a copy of the branches array
          const branches = [...state.branches];
          
          // Update the branch
          branches[branchIndex] = {
            ...branches[branchIndex],
            visible: false
          };
          
          return { branches };
        });
        
        return success;
      },
      
      // Check if an important choice was made recently
      importantChoiceMade: (daysBetween = 2) => {
        const currentDay = useGameStore.getState().currentDay;
        const recentDay = currentDay - daysBetween;
        
        return get().branches.some(branch => 
          branch.dayCreated >= recentDay &&
          branch.impact === 'major' || branch.impact === 'critical' &&
          branch.choices.some(choice => choice.chosen)
        );
      },
      
      // Reset branches (debug/testing function)
      resetBranches: () => {
        set({
          branches: [],
          consequences: []
        });
      }
    }),
    {
      name: 'rogue-resident-narrative-branches',
      // Only store essential data
      partialize: (state) => ({
        branches: state.branches,
        consequences: state.consequences
      })
    }
  )
);

/**
 * Convert impact level to numeric value
 */
function getImpactValue(impact: BranchImpact): number {
  switch (impact) {
    case 'minor': return 3;
    case 'moderate': return 5;
    case 'major': return 8;
    case 'critical': return 10;
    default: return 5;
  }
}

/**
 * Create predefined branch templates for common narrative situations
 */
export function createCharacterApproachBranch(
  characterId: string,
  title: string,
  description: string,
  options: { id: string, label: string, consequence?: string }[]
): string {
  return useNarrativeBranching.getState().createBranch({
    type: 'character',
    title,
    description,
    impact: 'moderate',
    choices: options.map(opt => ({
      id: opt.id,
      label: opt.label,
      chosen: false,
      consequence: opt.consequence
    })),
    characterAffected: [characterId],
    tags: ['character', 'relationship', characterId]
  });
}

/**
 * Create a protocol approach branch (how the player follows procedures)
 */
export function createProtocolBranch(
  title: string,
  description: string,
  options: { id: string, label: string, consequence?: string }[],
  affectedCharacters: string[]
): string {
  return useNarrativeBranching.getState().createBranch({
    type: 'protocol',
    title,
    description,
    impact: 'major',
    choices: options.map(opt => ({
      id: opt.id,
      label: opt.label,
      chosen: false,
      consequence: opt.consequence
    })),
    characterAffected: affectedCharacters,
    requiresPriority: true,
    tags: ['protocol', 'approach', 'practice']
  });
}

/**
 * Create a branch for boss approach strategy
 */
export function createBossStrategyBranch(
  bossId: string,
  title: string,
  description: string,
  options: { id: string, label: string, consequence?: string }[]
): string {
  return useNarrativeBranching.getState().createBranch({
    type: 'boss-strategy',
    title,
    description,
    impact: 'critical',
    choices: options.map(opt => ({
      id: opt.id,
      label: opt.label,
      chosen: false,
      consequence: opt.consequence
    })),
    characterAffected: ['kapoor', 'jesse', 'quinn'], // All main mentors affected
    requiresPriority: true,
    tags: ['boss', bossId, 'strategy', 'critical']
  });
}

/**
 * Initialize branching system with event tracking
 */
export function initializeBranchingSystem(): () => void {
  const eventBus = useEventBus.getState();
  
  // Subscribe to critical dialogue events to create branches
  const unsubCriticalPath = eventBus.subscribe(
    GameEventType.DIALOGUE_CRITICAL_PATH,
    (event) => {
      const { characterId, criticalStateId, nodeId } = event.payload;
      
      // Check if this critical path should create a branch
      if (criticalStateId === 'calibration-approach' && characterId === 'kapoor') {
        // Create a branch for calibration approach
        const branchId = createProtocolBranch(
          'Calibration Methodology',
          'Your approach to calibration protocols will affect how characters perceive your work.',
          [
            { 
              id: 'strict', 
              label: 'Follow protocols strictly',
              consequence: 'Gain respect from Dr. Kapoor, but may limit experimentation'
            },
            { 
              id: 'adaptive', 
              label: 'Adapt protocols to the situation',
              consequence: 'Balance flexibility with precision'
            },
            { 
              id: 'innovative', 
              label: 'Innovate beyond standard protocols',
              consequence: 'Impress Dr. Quinn but risk Dr. Kapoor\'s disapproval'
            }
          ],
          ['kapoor', 'quinn']
        );
        
        // Reveal the branch immediately
        useNarrativeBranching.getState().revealBranch(branchId);
      }
      
      // More critical path branch creation could be added here
    }
  );
  
  // Subscribe to dialogue completion to check for branch opportunities
  const unsubDialogueCompleted = eventBus.subscribe(
    GameEventType.DIALOGUE_COMPLETED,
    (event) => {
      const { character, nodeId, completed } = event.payload;
      
      // Only process successful completions
      if (!completed || !character) return;
      
      // Check if this dialogue completion should trigger branch reveal
      const currentDay = useGameStore.getState().currentDay;
      
      // Example: Reveal theoretical approach branch after completing Quinn's dialogue
      if (character === 'quinn' && nodeId?.includes('theory') && currentDay >= 2) {
        const branches = useNarrativeBranching.getState().queryBranches({
          type: 'theory',
          visible: false,
          character: 'quinn'
        });
        
        // If no theory branch exists yet, create one
        if (branches.length === 0) {
          const branchId = useNarrativeBranching.getState().createBranch({
            type: 'theory',
            title: 'Theoretical Perspective',
            description: 'Your stance on theoretical physics will influence your approach to medical physics challenges.',
            impact: 'moderate',
            choices: [
              {
                id: 'conventional',
                label: 'Conventional application of established theories',
                chosen: false,
                consequence: 'Safe approach with predictable outcomes'
              },
              {
                id: 'explorative',
                label: 'Exploration of theoretical edge cases',
                chosen: false,
                consequence: 'May lead to novel solutions or unexpected problems'
              }
            ],
            characterAffected: ['quinn'],
            tags: ['theory', 'approach', 'quinn']
          });
          
          // Reveal the branch
          useNarrativeBranching.getState().revealBranch(branchId);
        } else {
          // Reveal existing branch if it exists
          useNarrativeBranching.getState().revealBranch(branches[0].id);
        }
      }
    }
  );
  
  // Return cleanup function
  return () => {
    unsubCriticalPath();
    unsubDialogueCompleted();
  };
}

/**
 * Apply branch context to dialogue
 * 
 * This is used to modify dialogue based on player's narrative branches,
 * similar to how gods in Hades react differently based on boon choices.
 */
export function applyBranchContext(
  characterId: string,
  baseText: string,
  contextTags: string[] = []
): string {
  // Get relevant branches for this character
  const branchingSystem = useNarrativeBranching.getState();
  const relevantBranches = branchingSystem.getBranchesForCharacter(characterId)
    .filter(branch => branch.choices.some(choice => choice.chosen));
  
  // If no relevant branches, return base text
  if (relevantBranches.length === 0) {
    return baseText;
  }
  
  // Filter branches by contextTags if provided
  const contextBranches = contextTags.length > 0
    ? relevantBranches.filter(branch => 
        contextTags.some(tag => branch.tags.includes(tag))
      )
    : relevantBranches;
  
  // If no context-relevant branches, return base text
  if (contextBranches.length === 0) {
    return baseText;
  }
  
  // Get the most impactful branch for modification
  const branchImpactOrder: BranchImpact[] = ['critical', 'major', 'moderate', 'minor'];
  contextBranches.sort((a, b) => 
    branchImpactOrder.indexOf(a.impact) - branchImpactOrder.indexOf(b.impact)
  );
  
  const primaryBranch = contextBranches[0];
  const selectedChoice = primaryBranch.choices.find(choice => choice.chosen);
  
  if (!selectedChoice) {
    return baseText;
  }
  
  // Get consequences for this branch choice
  const consequences = branchingSystem.getBranchConsequences(primaryBranch.id)
    .filter(c => c.choiceId === selectedChoice.id);
  
  // Apply modifications based on branch type
  switch (primaryBranch.type) {
    case 'character':
      // Modify text with character-specific reaction
      return `${baseText} I notice you tend to ${selectedChoice.label.toLowerCase()}.`;
      
    case 'protocol':
      // Add protocol approach context
      return `${baseText} Your approach to protocols - ${selectedChoice.label.toLowerCase()} - is something I've observed.`;
      
    case 'theory':
      // Add theoretical perspective
      return `${baseText} Your ${selectedChoice.label.toLowerCase()} shows in how you approach problems.`;
      
    case 'boss-strategy':
      // Reference boss strategy
      return `${baseText} Your strategy against challenges - ${selectedChoice.label} - is interesting.`;
      
    default:
      // Default to subtle reference
      return `${baseText} I've noticed your preference for ${selectedChoice.label.toLowerCase()}.`;
  }
}

/**
 * Setup branching system for the application
 * Call this once during app initialization
 */
export function setupBranchingSystem(): () => void {
  const cleanupFn = initializeBranchingSystem();
  
  // Subscribe to session end to clean up
  const unsubscribe = useEventBus.getState().subscribe(
    GameEventType.SESSION_ENDED,
    () => {
      cleanupFn();
      unsubscribe();
    }
  );
  
  return () => {
    cleanupFn();
    unsubscribe();
  };
}

export default {
  useNarrativeBranching,
  createCharacterApproachBranch,
  createProtocolBranch,
  createBossStrategyBranch,
  applyBranchContext,
  setupBranchingSystem
};