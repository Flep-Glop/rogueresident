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
  timeStamp: number;
  gameDay: number;
  gamePhase: string;
  narrativeState?: Record<string, any>;
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
  },
  
  // Ionix encounter introduction
  {
    id: 'ionix-introduction',
    description: 'Introduction to the Ionix anomaly',
    characterId: 'quinn',
    nodeType: 'ionixTheory',
    requiredItems: ['journal'],
    requiredKnowledge: ['quantum_dosimetry_principles'],
    verificationFunction: () => {
      // Check if player has discovered the Ionix concept
      return useKnowledgeStore.getState().hasMasteredConcept('ionix_anomaly', 1);
    }
  },
  
  // Character relationship milestones
  {
    id: 'character-relationship-kapoor',
    description: 'Building relationship with Dr. Kapoor',
    characterId: 'kapoor',
    nodeType: 'characterDevelopment',
    verificationFunction: () => {
      // Check if relationship has reached minimum level
      return useGameStore.getState().getRelationshipLevel('kapoor') >= 1;
    }
  },
  
  // Critical narrative branch point
  {
    id: 'calibration-approach-decision',
    description: 'Critical decision on calibration approach',
    characterId: 'kapoor',
    nodeType: 'criticalChoice',
    requiredKnowledge: ['electron_equilibrium_understood'],
    verificationFunction: () => {
      // Check if the critical choice transaction exists
      const transactions = useNarrativeTransaction.getState().getAllTransactions();
      return transactions.some(t => 
        t.type === 'character_introduction' && 
        t.metadata.nodeType === 'criticalChoice' &&
        t.state === 'completed'
      );
    }
  }
];

/**
 * Registry of character relationships necessary for progression
 * This helps the system understand which character interactions are critical
 */
const CRITICAL_CHARACTER_RELATIONSHIPS = [
  {
    characterId: 'kapoor',
    minimumLevel: 1,
    day: 1, 
    nodeType: 'kapoorCalibration'
  },
  {
    characterId: 'jesse',
    minimumLevel: 1,
    day: 2,
    nodeType: 'jesseEquipment'
  },
  {
    characterId: 'quinn',
    minimumLevel: 1,
    day: 3,
    nodeType: 'quinnTheory'
  }
];

/**
 * Narrative graph defining proper narrative progression sequences
 * This helps catch sequence errors (things happening out of order)
 */
const NARRATIVE_SEQUENCE_GRAPH = {
  'journal-acquisition': ['equipment-safety-training', 'quantum-theory-introduction'],
  'equipment-safety-training': ['boss-preparation'],
  'quantum-theory-introduction': ['ionix-introduction', 'boss-preparation'],
  'ionix-introduction': ['boss-defeated'],
  'boss-preparation': ['boss-defeated']
};

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
    requiredRepairs: [],
    timeStamp: Date.now(),
    gameDay: gameStore.currentDay,
    gamePhase: gameStore.gamePhase
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
    
    // Character relationship milestones - based on day
    if (checkpoint.id.startsWith('character-relationship-')) {
      const characterId = checkpoint.id.split('-').pop();
      const relationshipInfo = CRITICAL_CHARACTER_RELATIONSHIPS.find(r => r.characterId === characterId);
      return relationshipInfo ? currentDay >= relationshipInfo.day : false;
    }
    
    // Ionix introduction by day 3
    if (checkpoint.id === 'ionix-introduction') {
      return currentDay >= 3;
    }
    
    // Critical narrative branch points - depend on other checkpoints
    if (checkpoint.id === 'calibration-approach-decision') {
      // Only validate if journal has been acquired
      const journalAcquired = NARRATIVE_CHECKPOINTS.find(cp => cp.id === 'journal-acquisition')?.verificationFunction() || false;
      return journalAcquired && currentDay >= 2;
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
  
  // Also validate sequence correctness
  validateSequenceCorrectness(result);
  
  // Add current narrative state for debugging/telemetry
  result.narrativeState = {
    hasJournal: useJournalStore.getState().hasJournal,
    completedNodes: gameStore.completedNodeIds,
    relationships: {
      kapoor: gameStore.getRelationshipLevel('kapoor'),
      jesse: gameStore.getRelationshipLevel('jesse'),
      quinn: gameStore.getRelationshipLevel('quinn')
    },
    knowledge: summarizeKnowledgeState()
  };
  
  // Log validation results
  console.log(`[NarrativeProgressionValidator] Day ${currentDay}, Phase ${gamePhase}`);
  console.log(`Validated ${checkpointsToValidate.length} checkpoints, ${result.failedCheckpoints.length} failed`);
  
  if (result.failedCheckpoints.length > 0) {
    console.warn(`Failed checkpoints: ${result.failedCheckpoints.join(', ')}`);
  }
  
  // Send telemetry about validation results
  sendValidationTelemetry(result);
  
  return result;
}

/**
 * Validates that narrative events have occurred in the correct sequence
 * Adds sequence-related issues to the validation result
 */
function validateSequenceCorrectness(result: ValidationResult): void {
  // Get the set of completed checkpoints
  const completedCheckpointIds = NARRATIVE_CHECKPOINTS
    .filter(checkpoint => checkpoint.verificationFunction())
    .map(checkpoint => checkpoint.id);
  
  // Check for sequence violations
  Object.entries(NARRATIVE_SEQUENCE_GRAPH).forEach(([prerequisiteId, dependentIds]) => {
    // If we've completed any dependent checkpoint
    const completedDependents = dependentIds.filter(id => completedCheckpointIds.includes(id));
    
    if (completedDependents.length > 0 && !completedCheckpointIds.includes(prerequisiteId)) {
      // We have a sequence violation - completed a dependent without its prerequisite
      result.isValid = false;
      
      // Only add the prerequisite if not already in failed checkpoints
      if (!result.failedCheckpoints.includes(prerequisiteId)) {
        result.failedCheckpoints.push(prerequisiteId);
      }
      
      // Add repair with high priority
      if (!result.requiredRepairs.includes(prerequisiteId)) {
        result.requiredRepairs.unshift(prerequisiteId); // Add at the beginning for priority
      }
      
      // Add sequence issue to missing requirements
      if (!result.missingRequirements[prerequisiteId]) {
        result.missingRequirements[prerequisiteId] = [];
      }
      result.missingRequirements[prerequisiteId].push(
        `sequence_violation: ${completedDependents.join(', ')} completed before ${prerequisiteId}`
      );
    }
  });
}

/**
 * Creates a summary of the player's knowledge state for telemetry
 */
function summarizeKnowledgeState(): Record<string, any> {
  const knowledge = useKnowledgeStore.getState();
  
  // Get core concepts for each domain
  const domains = Object.keys(knowledge.domainMastery);
  
  // Create a simplified view of domains and key concepts
  const knowledgeSummary: Record<string, any> = {
    totalMastery: knowledge.totalMastery,
    domains: {}
  };
  
  // Summarize each domain
  domains.forEach(domain => {
    knowledgeSummary.domains[domain] = {
      mastery: knowledge.domainMastery[domain as any],
      // Get top 5 concepts in this domain
      keyConcepts: knowledge.nodes
        .filter(node => node.domain === domain && node.discovered)
        .sort((a, b) => b.mastery - a.mastery)
        .slice(0, 5)
        .map(node => ({
          id: node.id,
          name: node.name,
          mastery: node.mastery
        }))
    };
  });
  
  return knowledgeSummary;
}

/**
 * Sends telemetry data about validation results
 */
function sendValidationTelemetry(result: ValidationResult): void {
  useEventBus.getState().dispatch(GameEventType.UI_BUTTON_CLICKED, {
    componentId: 'narrativeProgressionValidator',
    action: result.isValid ? 'validationPassed' : 'validationFailed',
    metadata: {
      day: result.gameDay,
      phase: result.gamePhase,
      failedCheckpoints: result.failedCheckpoints,
      requiredRepairs: result.requiredRepairs
    }
  });
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
          
        case 'ionix-introduction':
          // Ensure ionix anomaly concept is introduced
          if (!useKnowledgeStore.getState().hasMasteredConcept('ionix_anomaly', 1)) {
            console.log('[NarrativeProgressionValidator] Forcing ionix anomaly introduction');
            
            // Grant minimal knowledge level
            useKnowledgeStore.getState().updateMastery('ionix_anomaly', 5);
            useKnowledgeStore.getState().discoverConcept('ionix_anomaly');
            
            // Create transaction record
            useNarrativeTransaction.getState().startTransaction(
              'knowledge_revelation',
              { 
                concept: 'ionix_anomaly',
                domain: 'theoretical',
                source: 'progression_repair' 
              },
              'quinn'
            );
          }
          break;
          
        case 'character-relationship-kapoor':
        case 'character-relationship-jesse':
        case 'character-relationship-quinn':
          // Extract character ID from checkpoint ID
          const characterId = checkpointId.split('-').pop() || '';
          
          // Ensure minimal relationship level
          if (useGameStore.getState().getRelationshipLevel(characterId) < 1) {
            console.log(`[NarrativeProgressionValidator] Forcing minimal relationship with ${characterId}`);
            
            // Set relationship to minimal level
            useGameStore.getState().setRelationship(characterId, 1);
            
            // Create transaction record
            useNarrativeTransaction.getState().startTransaction(
              'character_introduction',
              { 
                relationshipLevel: 1,
                source: 'progression_repair' 
              },
              characterId
            );
          }
          break;
          
        case 'calibration-approach-decision':
          // Ensure the critical choice exists in transaction history
          const transactions = useNarrativeTransaction.getState().getAllTransactions();
          const hasCriticalChoice = transactions.some(t => 
            t.type === 'character_introduction' && 
            t.metadata.nodeType === 'criticalChoice'
          );
          
          if (!hasCriticalChoice) {
            console.log('[NarrativeProgressionValidator] Forcing calibration approach decision');
            
            // Create transaction record with default choice
            useNarrativeTransaction.getState().startTransaction(
              'character_introduction',
              { 
                nodeType: 'criticalChoice',
                choice: 'standard_approach', // Default fallback choice
                source: 'progression_repair' 
              },
              'kapoor'
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
    
    // Send telemetry about dialogue validation
    useEventBus.getState().dispatch(GameEventType.UI_BUTTON_CLICKED, {
      componentId: 'narrativeProgressionValidator',
      action: 'dialogueValidationFailed',
      metadata: {
        character: characterId,
        nodeId,
        missingPaths: progressionStatus.missingPaths,
        potentialIssues: progressionStatus.potentialIssues
      }
    });
    
    // Attempt repair
    const repaired = repairDialogueProgression(characterId, nodeId);
    
    // Log repair result
    if (repaired) {
      console.log(`[NarrativeProgressionValidator] Successfully repaired dialogue for ${characterId}`);
      
      // Send telemetry about successful repair
      useEventBus.getState().dispatch(GameEventType.UI_BUTTON_CLICKED, {
        componentId: 'narrativeProgressionValidator',
        action: 'dialogueRepairSucceeded',
        metadata: {
          character: characterId,
          nodeId
        }
      });
    } else {
      console.error(`[NarrativeProgressionValidator] Failed to repair dialogue for ${characterId}`);
      
      // Send telemetry about failed repair
      useEventBus.getState().dispatch(GameEventType.UI_BUTTON_CLICKED, {
        componentId: 'narrativeProgressionValidator',
        action: 'dialogueRepairFailed',
        metadata: {
          character: characterId,
          nodeId
        }
      });
    }
    
    return repaired;
  } catch (error) {
    console.error(`[NarrativeProgressionValidator] Error validating dialogue:`, error);
    return false;
  }
}

/**
 * Validates character relationship progression
 * Ensures relationships are developing appropriately for game progress
 */
export function validateCharacterRelationships(): boolean {
  const gameStore = useGameStore.getState();
  const { currentDay } = gameStore;
  let isValid = true;
  
  // Check required relationships based on day
  CRITICAL_CHARACTER_RELATIONSHIPS.forEach(relationship => {
    // Only validate relationships required by current day
    if (currentDay >= relationship.day) {
      const level = gameStore.getRelationshipLevel(relationship.characterId);
      if (level < relationship.minimumLevel) {
        console.warn(`[NarrativeProgressionValidator] Character relationship issue: ${relationship.characterId} should be at least level ${relationship.minimumLevel} by day ${relationship.day}`);
        isValid = false;
        
        // Send telemetry
        useEventBus.getState().dispatch(GameEventType.UI_BUTTON_CLICKED, {
          componentId: 'narrativeProgressionValidator',
          action: 'relationshipValidationFailed',
          metadata: {
            character: relationship.characterId,
            currentLevel: level,
            requiredLevel: relationship.minimumLevel,
            day: currentDay
          }
        });
      }
    }
  });
  
  return isValid;
}

/**
 * Validates overall narrative pacing
 * Ensures progression milestones are appropriately distributed
 */
export function validateNarrativePacing(): Record<string, any> {
  const gameStore = useGameStore.getState();
  const { currentDay } = gameStore;
  
  // Track critical narrative moments completed by day
  const narrativeMoments = NARRATIVE_CHECKPOINTS.filter(cp => cp.verificationFunction());
  
  // Group by character to detect character availability issues
  const characterMoments: Record<string, number> = {};
  
  narrativeMoments.forEach(moment => {
    if (moment.characterId !== 'any') {
      characterMoments[moment.characterId] = (characterMoments[moment.characterId] || 0) + 1;
    }
  });
  
  // Check for character availability issues
  const characters = ['kapoor', 'jesse', 'quinn'];
  const missingCharacters = characters.filter(c => !characterMoments[c]);
  
  // Calculate pacing statistics
  const result = {
    day: currentDay,
    totalMomentsCompleted: narrativeMoments.length,
    characterMoments,
    missingCharacters,
    pacingStatus: 'on_track',
    recommendations: []
  };
  
  // Add pacing recommendations
  if (currentDay >= 3 && narrativeMoments.length < 3) {
    result.pacingStatus = 'behind';
    result.recommendations.push('Player is behind on critical story beats - consider providing more narrative moments');
  }
  
  if (missingCharacters.length > 0) {
    result.recommendations.push(`Player hasn't engaged with: ${missingCharacters.join(', ')} - consider emphasizing these character nodes`);
  }
  
  // Send telemetry
  useEventBus.getState().dispatch(GameEventType.UI_BUTTON_CLICKED, {
    componentId: 'narrativeProgressionValidator',
    action: 'pacingValidation',
    metadata: {
      day: currentDay,
      status: result.pacingStatus,
      momentsCompleted: narrativeMoments.length,
      characterCoverage: Object.keys(characterMoments).length / characters.length
    }
  });
  
  return result;
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
        
        // Also check character relationships
        validateCharacterRelationships();
      }
      
      // Validate when starting a new day
      if (from === 'night' && to === 'day') {
        console.log('[NarrativeProgressionValidator] Night → Day transition, validating progression');
        const result = validateNarrativeProgression();
        
        if (!result.isValid) {
          console.warn('[NarrativeProgressionValidator] Issues detected, attempting repair');
          repairNarrativeProgression(result);
        }
        
        // Check narrative pacing at day start
        const pacingResult = validateNarrativePacing();
        if (pacingResult.pacingStatus !== 'on_track') {
          console.warn('[NarrativeProgressionValidator] Narrative pacing issues detected');
          console.warn(pacingResult.recommendations.join('\n'));
        }
      }
    }
  );
  
  // Also validate on item acquisition, which might fulfill requirements
  const unsubItemAcquired = eventBus.subscribe(
    GameEventType.ITEM_ACQUIRED,
    (event) => {
      // Check if the acquired item might affect narrative progression
      const journalItems = ['journal', 'annotated_journal', 'technical_journal'];
      if (journalItems.includes(event.payload.itemId)) {
        console.log('[NarrativeProgressionValidator] Journal acquired, validating progression');
        validateNarrativeProgression();
      }
    }
  );
  
  // Validate when knowledge is gained, which might fulfill requirements
  const unsubKnowledgeGained = eventBus.subscribe(
    GameEventType.KNOWLEDGE_GAINED,
    (event) => {
      // Only validate for significant knowledge gains
      if (event.payload.amount >= 10) {
        console.log('[NarrativeProgressionValidator] Significant knowledge gained, validating progression');
        validateNarrativeProgression();
      }
    }
  );
  
  // Return cleanup function
  return () => {
    unsubPhase();
    unsubItemAcquired();
    unsubKnowledgeGained();
  };
}

export default {
  validateNarrativeProgression,
  repairNarrativeProgression,
  validateAndRepairDialogue,
  validateCharacterRelationships,
  validateNarrativePacing,
  setupNarrativeValidation
};