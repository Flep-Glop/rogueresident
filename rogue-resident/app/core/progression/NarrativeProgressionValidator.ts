// app/core/progression/NarrativeProgressionValidator.ts
/**
 * Narrative Progression Validator
 * 
 * This system validates dialogue narrative progression across game cycles.
 * It ensures player narrative choices persist appropriately and verifies
 * that critical story beats remain accessible even after game state transitions.
 * 
 * Similar to how Hades maintained the Codex state across runs, this system
 * ensures narrative continuity while allowing for the procedural nature of gameplay.
 */

import { useGameStore } from '../../store/gameStore';
import { useJournalStore } from '../../store/journalStore';
import { useKnowledgeStore } from '../../store/knowledgeStore';
import { useEventBus, GameEventType } from '../events/CentralEventBus';
import { useNarrativeTransaction } from '../dialogue/NarrativeTransaction';
import { validateDialogueProgression, repairDialogueProgression } from '../dialogue/DialogueProgressionHelpers';

// Interfaces
export interface NarrativeCheckpoint {
  id: string;
  description: string;
  characterId: string;
  nodeType: string;
  requiredItems?: string[];
  requiredKnowledge?: string[];
  requiredRelationshipLevel?: number;
  verificationFunction: () => boolean;
}

export interface ValidationResult {
  isValid: boolean;
  failedCheckpoints: string[];
  missingRequirements: Record<string, string[]>;
  requiredRepairs: string[];
}

/**
 * Registry of critical narrative checkpoints
 * 
 * These represent points in the narrative that should be validated
 * to ensure the game's story progression remains coherent.
 */
const NARRATIVE_CHECKPOINTS: NarrativeCheckpoint[] = [
  // Journal acquisition checkpoint
  {
    id: 'journal-acquisition',
    description: 'Journal acquisition from Dr. Kapoor',
    characterId: 'kapoor',
    nodeType: 'kapoorCalibration',
    verificationFunction: () => {
      // Verify journal exists
      return useJournalStore.getState().hasJournal;
    }
  },
  
  // Equipment training checkpoint
  {
    id: 'equipment-safety-training',
    description: 'Equipment safety training from Technician Jesse',
    characterId: 'jesse',
    nodeType: 'jesseEquipment',
    requiredItems: ['journal'],
    verificationFunction: () => {
      // Verify equipment safety knowledge exists
      return useKnowledgeStore.getState().hasMasteredConcept('equipment_safety_protocol', 5);
    }
  },
  
  // Quantum theory introduction
  {
    id: 'quantum-theory-introduction',
    description: 'Quantum theory introduction from Dr. Quinn',
    characterId: 'quinn',
    nodeType: 'quinnTheory',
    requiredItems: ['journal'],
    verificationFunction: () => {
      // Verify quantum theory knowledge exists
      return useKnowledgeStore.getState().hasMasteredConcept('quantum_dosimetry_principles', 5);
    }
  },
  
  // Boss encounter preparation
  {
    id: 'boss-preparation',
    description: 'Pre-boss guidance from character with highest relationship',
    characterId: 'any',
    nodeType: 'bossPreparation',
    requiredItems: ['journal'],
    requiredKnowledge: ['radiation_dose_concepts', 'calibration_procedures'],
    verificationFunction: () => {
      // Verify boss preparation status
      return useGameStore.getState().hasCompletedNode('boss-preparation');
    }
  }
];

/**
 * Validates the current narrative progression state
 * 
 * This function checks that all critical narrative checkpoints that
 * should have been reached by this point in the game are valid.
 */
export function validateNarrativeProgression(): ValidationResult {
  const gameStore = useGameStore.getState();
  const result: ValidationResult = {
    isValid: true,
    failedCheckpoints: [],
    missingRequirements: {},
    requiredRepairs: []
  };
  
  // Get current game state
  const { currentDay, gamePhase, gameState } = gameStore;
  
  // Only validate in specific game states
  if (gameState !== 'in_progress') {
    return result;
  }
  
  // Determine which checkpoints should be validated based on game progress
  const checkpointsToValidate = NARRATIVE_CHECKPOINTS.filter(checkpoint => {
    // Journal should be acquired by day 1 night
    if (checkpoint.id === 'journal-acquisition') {
      return currentDay >= 1 && (gamePhase === 'night' || currentDay >= 2);
    }
    
    // Equipment training by day 2
    if (checkpoint.id === 'equipment-safety-training') {
      return currentDay >= 2;
    }
    
    // Quantum theory by day 2
    if (checkpoint.id === 'quantum-theory-introduction') {
      return currentDay >= 2;
    }
    
    // Boss preparation by day 3
    if (checkpoint.id === 'boss-preparation') {
      return currentDay >= 3;
    }
    
    return false;
  });
  
  // Validate each applicable checkpoint
  checkpointsToValidate.forEach(checkpoint => {
    try {
      const isValid = checkpoint.verificationFunction();
      
      if (!isValid) {
        result.isValid = false;
        result.failedCheckpoints.push(checkpoint.id);
        
        // Check which requirements might be missing
        const missingRequirements: string[] = [];
        
        if (checkpoint.requiredItems) {
          const inventory = gameStore.inventory.map(item => item.id);
          const missingItems = checkpoint.requiredItems.filter(
            itemId => !inventory.includes(itemId)
          );
          if (missingItems.length > 0) {
            missingRequirements.push(`items: ${missingItems.join(', ')}`);
          }
        }
        
        if (checkpoint.requiredKnowledge) {
          const knowledge = useKnowledgeStore.getState();
          const missingKnowledge = checkpoint.requiredKnowledge.filter(
            conceptId => !knowledge.hasMasteredConcept(conceptId, 5)
          );
          if (missingKnowledge.length > 0) {
            missingRequirements.push(`knowledge: ${missingKnowledge.join(', ')}`);
          }
        }
        
        if (checkpoint.requiredRelationshipLevel !== undefined) {
          const characterRelationship = gameStore.getRelationshipLevel(checkpoint.characterId);
          if (characterRelationship < checkpoint.requiredRelationshipLevel) {
            missingRequirements.push(
              `relationship: ${checkpoint.characterId} (${characterRelationship}/${checkpoint.requiredRelationshipLevel})`
            );
          }
        }
        
        if (missingRequirements.length > 0) {
          result.missingRequirements[checkpoint.id] = missingRequirements;
        }
        
        // Add to required repairs
        result.requiredRepairs.push(checkpoint.id);
      }
    } catch (error) {
      console.error(`Error validating checkpoint ${checkpoint.id}:`, error);
      result.isValid = false;
      result.failedCheckpoints.push(`${checkpoint.id} (error)`);
      result.requiredRepairs.push(checkpoint.id);
    }
  });
  
  // Log validation results
  console.log(`[NarrativeProgressionValidator] Day ${currentDay}, Phase ${gamePhase}`);
  console.log(`Validated ${checkpointsToValidate.length} checkpoints, ${result.failedCheckpoints.length} failed`);
  
  if (result.failedCheckpoints.length > 0) {
    console.warn(`Failed checkpoints: ${result.failedCheckpoints.join(', ')}`);
  }
  
  return result;
}

/**
 * Repairs narrative progression state
 * 
 * This repairs the narrative state when validation has failed,
 * ensuring critical progression elements are not permanently missed.
 */
export function repairNarrativeProgression(result: ValidationResult): boolean {
  if (result.isValid) {
    return true; // Nothing to repair
  }
  
  const eventBus = useEventBus.getState();
  let repairsSuccessful = true;
  
  // Log repair attempt
  console.log(`[NarrativeProgressionValidator] Attempting to repair ${result.requiredRepairs.length} checkpoints`);
  
  // Process repairs for each failed checkpoint
  result.requiredRepairs.forEach(checkpointId => {
    const checkpoint = NARRATIVE_CHECKPOINTS.find(cp => cp.id === checkpointId);
    
    if (!checkpoint) {
      console.error(`Unknown checkpoint ID: ${checkpointId}`);
      repairsSuccessful = false;
      return;
    }
    
    // Log repair attempt
    console.log(`[NarrativeProgressionValidator] Repairing: ${checkpoint.description}`);
    
    // Dispatch repair event for telemetry
    eventBus.dispatch(GameEventType.PROGRESSION_REPAIR, {
      checkpointId,
      description: checkpoint.description,
      forced: true,
      prevState: { valid: false },
      newState: { valid: true, repaired: true }
    });
    
    try {
      // Specific repair strategies based on checkpoint type
      switch (checkpointId) {
        case 'journal-acquisition':
          // Ensure journal exists
          if (!useJournalStore.getState().hasJournal) {
            console.log('[NarrativeProgressionValidator] Forcing journal acquisition');
            
            // Create appropriate journal tier based on relationship
            const relationshipLevel = useGameStore.getState().getRelationshipLevel('kapoor');
            const journalTier = relationshipLevel >= 3 ? 'annotated' : 
                               relationshipLevel >= 1 ? 'technical' : 'base';
            
            // Initialize journal
            useJournalStore.getState().initializeJournal(journalTier);
            
            // Add transaction record to track this repair
            useNarrativeTransaction.getState().startTransaction(
              'journal_acquisition',
              { 
                source: 'progression_repair', 
                tier: journalTier 
              },
              'kapoor'
            );
            
            // Notify system of acquisition
            eventBus.dispatch(GameEventType.JOURNAL_ACQUIRED, {
              tier: journalTier,
              character: 'kapoor',
              source: 'progression_repair',
              forced: true
            });
          }
          break;
          
        case 'equipment-safety-training':
          // Ensure equipment safety knowledge exists
          if (!useKnowledgeStore.getState().hasMasteredConcept('equipment_safety_protocol', 5)) {
            console.log('[NarrativeProgressionValidator] Forcing equipment safety knowledge');
            
            // Grant minimal knowledge level
            useKnowledgeStore.getState().updateMastery('equipment_safety_protocol', 10);
            
            // Create transaction record
            useNarrativeTransaction.getState().startTransaction(
              'knowledge_revelation',
              { 
                concept: 'equipment_safety_protocol',
                domain: 'quality-assurance',
                source: 'progression_repair' 
              },
              'jesse'
            );
            
            // Notify knowledge system
            eventBus.dispatch(GameEventType.KNOWLEDGE_GAINED, {
              conceptId: 'equipment_safety_protocol',
              amount: 10,
              domainId: 'quality-assurance',
              character: 'jesse',
              source: 'progression_repair'
            });
          }
          break;
          
        case 'quantum-theory-introduction':
          // Ensure quantum theory knowledge exists
          if (!useKnowledgeStore.getState().hasMasteredConcept('quantum_dosimetry_principles', 5)) {
            console.log('[NarrativeProgressionValidator] Forcing quantum theory knowledge');
            
            // Grant minimal knowledge level
            useKnowledgeStore.getState().updateMastery('quantum_dosimetry_principles', 10);
            
            // Create transaction record
            useNarrativeTransaction.getState().startTransaction(
              'knowledge_revelation',
              { 
                concept: 'quantum_dosimetry_principles',
                domain: 'theoretical',
                source: 'progression_repair' 
              },
              'quinn'
            );
            
            // Notify knowledge system
            eventBus.dispatch(GameEventType.KNOWLEDGE_GAINED, {
              conceptId: 'quantum_dosimetry_principles',
              amount: 10,
              domainId: 'theoretical',
              character: 'quinn',
              source: 'progression_repair'
            });
          }
          break;
          
        case 'boss-preparation':
          // Ensure boss preparation has been done
          if (!useGameStore.getState().hasCompletedNode('boss-preparation')) {
            console.log('[NarrativeProgressionValidator] Forcing boss preparation completion');
            
            // Find character with highest relationship
            const characters = ['kapoor', 'jesse', 'quinn'];
            let highestRelationship = '';
            let maxLevel = -1;
            
            characters.forEach(character => {
              const level = useGameStore.getState().getRelationshipLevel(character);
              if (level > maxLevel) {
                maxLevel = level;
                highestRelationship = character;
              }
            });
            
            // If no character has relationship, default to Kapoor
            const characterId = highestRelationship || 'kapoor';
            
            // Mark node as completed
            useGameStore.getState().completeNode('boss-preparation', {
              character: characterId,
              relationshipChange: 1,
              forced: true
            });
            
            // Create transaction record
            useNarrativeTransaction.getState().startTransaction(
              'character_introduction',
              { 
                nodeType: 'bossPreparation',
                source: 'progression_repair' 
              },
              characterId
            );
          }
          break;
          
        default:
          console.warn(`[NarrativeProgressionValidator] No repair strategy for ${checkpointId}`);
          repairsSuccessful = false;
      }
      
      // Verify the repair was successful
      if (!checkpoint.verificationFunction()) {
        console.error(`[NarrativeProgressionValidator] Repair failed for ${checkpointId}`);
        repairsSuccessful = false;
      } else {
        console.log(`[NarrativeProgressionValidator] Successfully repaired ${checkpointId}`);
      }
      
    } catch (error) {
      console.error(`[NarrativeProgressionValidator] Error repairing ${checkpointId}:`, error);
      repairsSuccessful = false;
    }
  });
  
  // Return overall success status
  return repairsSuccessful;
}

/**
 * Validates dialogue progression for a specific character node
 * and repairs if necessary
 */
export function validateAndRepairDialogue(characterId: string, nodeId: string): boolean {
  try {
    // Validate dialogue progression
    const progressionStatus = validateDialogueProgression(characterId, nodeId);
    
    // If valid, nothing to do
    if (!progressionStatus.requiresRepair) {
      return true;
    }
    
    // Log issues
    console.warn(`[NarrativeProgressionValidator] Dialogue issues detected for ${characterId} at node ${nodeId}`);
    console.warn(`- Missing paths: ${progressionStatus.missingPaths.join(', ')}`);
    console.warn(`- Potential issues: ${progressionStatus.potentialIssues.join(', ')}`);
    
    // Attempt repair
    const repaired = repairDialogueProgression(characterId, nodeId);
    
    // Log repair result
    if (repaired) {
      console.log(`[NarrativeProgressionValidator] Successfully repaired dialogue for ${characterId}`);
    } else {
      console.error(`[NarrativeProgressionValidator] Failed to repair dialogue for ${characterId}`);
    }
    
    return repaired;
  } catch (error) {
    console.error(`[NarrativeProgressionValidator] Error validating dialogue:`, error);
    return false;
  }
}

/**
 * Sets up validation to run at key game state transitions
 */
export function setupNarrativeValidation(): () => void {
  const eventBus = useEventBus.getState();
  
  // Subscribe to game phase changes to validate at critical moments
  const unsubPhase = eventBus.subscribe(
    GameEventType.GAME_PHASE_CHANGED,
    (event) => {
      const { from, to } = event.payload;
      
      // Validate when transitioning from day to night
      if (from === 'day' && to === 'night') {
        console.log('[NarrativeProgressionValidator] Day → Night transition, validating progression');
        const result = validateNarrativeProgression();
        
        if (!result.isValid) {
          console.warn('[NarrativeProgressionValidator] Issues detected, attempting repair');
          repairNarrativeProgression(result);
        }
      }
      
      // Validate when starting a new day
      if (from === 'night' && to === 'day') {
        console.log('[NarrativeProgressionValidator] Night → Day transition, validating progression');
        const result = validateNarrativeProgression();
        
        if (!result.isValid) {
          console.warn('[NarrativeProgressionValidator] Issues detected, attempting repair');
          repairNarrativeProgression(result);
        }
      }
    }
  );
  
  // Return cleanup function
  return () => {
    unsubPhase();
  };
}

export default {
  validateNarrativeProgression,
  repairNarrativeProgression,
  validateAndRepairDialogue,
  setupNarrativeValidation
};