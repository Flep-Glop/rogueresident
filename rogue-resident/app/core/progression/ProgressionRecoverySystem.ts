// app/core/progression/ProgressionRecoverySystem.ts
/**
 * Progression Recovery System
 * 
 * A robust recovery mechanism for dialogue and narrative progression.
 * This system ensures critical story beats are never lost, even when
 * dialogues are interrupted or state is corrupted.
 * 
 * Inspired by the narrative resilience of Hades, which could gracefully recover
 * from interrupted Shade or Olympian conversations while maintaining narrative continuity.
 */

import { useEventBus, GameEventType } from '../events/CentralEventBus';
import { useGameStore } from '../../store/gameStore';
import { useJournalStore } from '../../store/journalStore';
import { useNarrativeTransaction } from '../dialogue/NarrativeTransaction';
import { useKnowledgeStore } from '../../store/knowledgeStore';
import { useDialogueStateMachine } from '../dialogue/DialogueStateMachine';
import { validateNarrativeProgression, repairNarrativeProgression } from './NarrativeProgressionValidator';

// Progression interruption types
export type InterruptionType = 
  | 'dialogue_unmount'   // Component unmounted during dialogue
  | 'browser_refresh'    // Page refreshed mid-conversation
  | 'session_end'        // Game session ended abruptly
  | 'state_corruption'   // Game state became corrupted
  | 'critical_path_miss' // Critical path was skipped
  | 'sequence_violation' // Story beats happened in wrong order
  | 'save_corruption'    // Persisted state was corrupted/invalid
  | 'manual_request';    // User requested recovery

// Recovery action types
export type RecoveryAction =
  | 'restart_dialogue'         // Restart dialogue from beginning
  | 'resume_dialogue'          // Resume dialogue from last state
  | 'force_critical_path'      // Jump directly to critical path
  | 'grant_required_item'      // Grant a required item
  | 'grant_required_knowledge' // Grant required knowledge
  | 'mark_node_completed'      // Mark node as completed
  | 'repair_relationship'      // Repair character relationship
  | 'repair_transaction'       // Repair stalled transaction
  | 'reinsert_dialogue_node'   // Reinsert a missed dialogue node
  | 'force_journal_acquisition'; // Force journal acquisition

// Recovery transaction record
export interface RecoveryTransaction {
  id: string;
  timestamp: number;
  interruptionType: InterruptionType;
  recoveryActions: RecoveryAction[];
  characterId?: string;
  nodeId?: string;
  dialogueId?: string;
  stateBeforeRecovery?: any;
  stateAfterRecovery?: any;
  successful: boolean;
  gameDay: number;
  gamePhase: string;
}

// Recovery plan
export interface RecoveryPlan {
  requiredActions: RecoveryAction[];
  characterId?: string;
  nodeId?: string;
  dialogueId?: string;
  criticalPathId?: string;
  requiredKnowledge?: string[];
  requiredItems?: string[];
  priority: 'high' | 'medium' | 'low';
  reasoning: string;
}

// Track recovery history
let recoveryHistory: RecoveryTransaction[] = [];

// Define critical story beats that must not be skipped
const CRITICAL_STORY_BEATS = [
  {
    id: 'journal-acquisition',
    characterId: 'kapoor',
    nodeType: 'kapoorCalibration',
    fallbackState: 'journal-presentation'
  },
  {
    id: 'equipment-training',
    characterId: 'jesse',
    nodeType: 'jesseEquipment',
    fallbackState: 'equipment-safety'
  },
  {
    id: 'quantum-introduction',
    characterId: 'quinn',
    nodeType: 'quinnTheory',
    fallbackState: 'quantum-understanding'
  },
  {
    id: 'boss-preparation',
    characterId: 'any', // Will choose highest relationship character
    nodeType: 'bossPreparation',
    fallbackState: null // Dynamic decision
  },
  {
    id: 'ionix-introduction',
    characterId: 'quinn',
    nodeType: 'ionixTheory',
    fallbackState: 'ionix-anomaly-description'
  }
];

// Heuristic scores for different recovery approaches
const RECOVERY_APPROACH_SCORES = {
  // Provide continuity by preserving player's progress
  CONTINUITY: {
    restart_dialogue: -10,       // Major continuity break
    resume_dialogue: 10,         // Best for continuity
    force_critical_path: 0,      // Mixed impact on continuity
    grant_required_item: 5,      // Moderate continuity preservation
    grant_required_knowledge: 5, // Moderate continuity preservation 
    mark_node_completed: 0,      // Neutral for continuity
    repair_relationship: 5,      // Moderate continuity preservation
    repair_transaction: 8,       // Good for continuity
    reinsert_dialogue_node: -5,  // Minor continuity break
    force_journal_acquisition: 0 // Neutral for continuity
  },
  
  // Minimize disruption to player's experience
  DISRUPTION: {
    restart_dialogue: -10,       // Major disruption
    resume_dialogue: 5,          // Minor disruption
    force_critical_path: -5,     // Moderate disruption
    grant_required_item: 10,     // Minimal disruption
    grant_required_knowledge: 10,// Minimal disruption
    mark_node_completed: 8,      // Little disruption
    repair_relationship: 10,     // Minimal disruption
    repair_transaction: 10,      // Minimal disruption
    reinsert_dialogue_node: -8,  // Significant disruption
    force_journal_acquisition: 5 // Some disruption
  },
  
  // Preserve story coherence and progression
  COHERENCE: {
    restart_dialogue: 5,         // Good for coherence
    resume_dialogue: -5,         // May create incoherence
    force_critical_path: 10,     // Best for ensuring coherence
    grant_required_item: 8,      // Good for progression coherence
    grant_required_knowledge: 8, // Good for progression coherence
    mark_node_completed: 5,      // Moderate coherence improvement
    repair_relationship: 7,      // Good for character coherence
    repair_transaction: 8,       // Good for narrative coherence
    reinsert_dialogue_node: 10,  // Excellent for story coherence
    force_journal_acquisition: 10// Critical for progression coherence
  }
};

/**
 * Detects if the current game state needs progression recovery
 */
export function detectProgressionIssues(): boolean {
  // First, check narrative validation
  const validationResult = validateNarrativeProgression();
  if (!validationResult.isValid) {
    return true;
  }
  
  // Check for stalled transactions
  const transactions = useNarrativeTransaction.getState().getAllTransactions();
  const stalledTransactions = transactions.filter(tx => 
    tx.state === 'active' && (Date.now() - tx.startTime > 60000) // Stalled for over a minute
  );
  
  if (stalledTransactions.length > 0) {
    return true;
  }
  
  // Check for critical progression issues
  const { hasJournal } = useJournalStore.getState();
  const { currentDay } = useGameStore.getState();
  
  // If we're beyond day 1 and don't have a journal, that's a critical progression issue
  if (currentDay > 1 && !hasJournal) {
    return true;
  }
  
  // If dialogue state machine has an active flow but UI isn't showing it
  // (would need to be detected via a UI presence flag)
  const hasActiveDialogue = useDialogueStateMachine.getState().activeFlow !== null;
  const dialogueIsVisible = useGameStore.getState().isInDialogue; // Assuming this state exists
  
  if (hasActiveDialogue && !dialogueIsVisible) {
    return true;
  }
  
  // Check for dialogue loops
  const dialogueContext = useDialogueStateMachine.getState().context;
  if (dialogueContext) {
    // Count state visit frequencies
    const stateVisits: Record<string, number> = {};
    dialogueContext.visitedStateIds.forEach(id => {
      stateVisits[id] = (stateVisits[id] || 0) + 1;
    });
    
    // Check for any state visited more than 5 times, which likely indicates a loop
    const excessiveVisits = Object.entries(stateVisits).filter(([_, count]) => count > 5);
    if (excessiveVisits.length > 0) {
      return true;
    }
  }
  
  // Check for sequence violations in narrative progression
  const sequenceViolation = checkForSequenceViolations();
  if (sequenceViolation) {
    return true;
  }
  
  return false;
}

/**
 * Checks if narrative events have occurred out of sequence
 */
function checkForSequenceViolations(): boolean {
  // Get completed nodes
  const completedNodes = useGameStore.getState().completedNodeIds;
  
  // Define critical sequences
  const requiredSequences = [
    {
      prerequisite: 'kapoor-calibration',
      dependent: 'boss-node'
    },
    {
      prerequisite: 'journal-acquisition',
      dependent: 'quinn-theory'
    }
  ];
  
  // Check each sequence
  for (const sequence of requiredSequences) {
    // If the dependent is completed without the prerequisite, we have a violation
    if (completedNodes.includes(sequence.dependent) && !completedNodes.includes(sequence.prerequisite)) {
      console.warn(`[ProgressionRecovery] Sequence violation detected: ${sequence.dependent} completed before ${sequence.prerequisite}`);
      return true;
    }
  }
  
  return false;
}

/**
 * Creates a recovery plan based on detected issues
 */
export function createRecoveryPlan(): RecoveryPlan | null {
  // Detect issues
  const validationResult = validateNarrativeProgression();
  
  // If everything is valid, check for other issues
  let shouldCreatePlan = !validationResult.isValid;
  
  // Check for stalled transactions
  const transactions = useNarrativeTransaction.getState().getAllTransactions();
  const stalledTransactions = transactions.filter(tx => 
    tx.state === 'active' && (Date.now() - tx.startTime > 60000) // Stalled for over a minute
  );
  
  if (stalledTransactions.length > 0) {
    shouldCreatePlan = true;
  }
  
  // Check for dialogue state/UI mismatch
  const hasActiveDialogue = useDialogueStateMachine.getState().activeFlow !== null;
  const dialogueIsVisible = useGameStore.getState().isInDialogue;
  
  if (hasActiveDialogue && !dialogueIsVisible) {
    shouldCreatePlan = true;
  }
  
  // If no issues detected, no plan needed
  if (!shouldCreatePlan) {
    return null;
  }
  
  // Start building recovery plan
  const plan: RecoveryPlan = {
    requiredActions: [],
    priority: 'medium',
    reasoning: 'General state inconsistency detected'
  };
  
  // Check for journal issues - highest priority
  const { hasJournal } = useJournalStore.getState();
  const { currentDay } = useGameStore.getState();
  
  // Journal is a prerequisite for progression
  if (currentDay >= 1 && !hasJournal) {
    plan.requiredActions.push('force_journal_acquisition');
    plan.characterId = 'kapoor'; // Journal always comes from Kapoor
    plan.priority = 'high';
    plan.reasoning = 'Journal is missing but required for progression';
  }
  
  // Check for specific failed checkpoints from validation
  if (validationResult.failedCheckpoints.length > 0) {
    validationResult.failedCheckpoints.forEach(checkpointId => {
      switch (checkpointId) {
        case 'journal-acquisition':
          if (!plan.requiredActions.includes('force_journal_acquisition')) {
            plan.requiredActions.push('force_journal_acquisition');
            plan.characterId = 'kapoor';
            plan.priority = 'high';
            plan.reasoning = 'Journal acquisition checkpoint failed';
          }
          break;
          
        case 'equipment-safety-training':
          plan.requiredActions.push('grant_required_knowledge');
          plan.characterId = 'jesse';
          plan.requiredKnowledge = ['equipment_safety_protocol'];
          plan.nodeId = 'equipment-training';
          plan.priority = 'medium';
          plan.reasoning = 'Equipment safety training checkpoint failed';
          break;
          
        case 'quantum-theory-introduction':
          plan.requiredActions.push('grant_required_knowledge');
          plan.characterId = 'quinn';
          plan.requiredKnowledge = ['quantum_dosimetry_principles'];
          plan.nodeId = 'quantum-theory';
          plan.priority = 'medium';
          plan.reasoning = 'Quantum theory introduction checkpoint failed';
          break;
          
        case 'boss-preparation':
          plan.requiredActions.push('mark_node_completed');
          plan.nodeId = 'boss-preparation';
          plan.priority = 'high';
          plan.reasoning = 'Boss preparation checkpoint failed';
          
          // Use character with highest relationship
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
          
          plan.characterId = highestRelationship || 'kapoor';
          break;
          
        // Other checkpoint types can be added here
      }
    });
  }
  
  // Check for stalled dialogue transactions
  if (stalledTransactions.length > 0) {
    // Adding repair_transaction as our primary action
    plan.requiredActions.push('repair_transaction');
    
    // Use info from the most recent stalled transaction
    const latestTransaction = stalledTransactions.reduce((latest, current) => 
      latest.startTime > current.startTime ? latest : current
    );
    
    plan.characterId = latestTransaction.character;
    plan.nodeId = latestTransaction.nodeId;
    plan.dialogueId = latestTransaction.id;
    plan.reasoning = `Stalled transaction detected: ${latestTransaction.id} for ${latestTransaction.type}`;
    
    // Always complete stalled transactions
    stalledTransactions.forEach(tx => {
      useNarrativeTransaction.getState().completeTransaction(tx.id);
    });
  }
  
  // If dialogue state machine has an active flow but UI isn't showing it
  if (hasActiveDialogue && !dialogueIsVisible) {
    if (plan.requiredActions.length === 0) {
      // Only force resuming if no more important actions
      plan.requiredActions.push('resume_dialogue');
      
      // Get info from active flow
      const activeFlow = useDialogueStateMachine.getState().activeFlow;
      if (activeFlow) {
        plan.characterId = activeFlow.context?.characterId;
        plan.nodeId = activeFlow.context?.nodeId;
        plan.dialogueId = activeFlow.id;
        plan.reasoning = 'Active dialogue detected but UI not showing it';
      }
    } else {
      // If we're doing other recovery, make sure to clean up the active dialogue
      useDialogueStateMachine.getState().completeFlow();
    }
  }
  
  // Check for narrative discontinuity caused by missed story beats
  const isNarrativeDiscontinuity = checkForNarrativeDiscontinuity();
  if (isNarrativeDiscontinuity) {
    plan.requiredActions.push('reinsert_dialogue_node');
    plan.priority = 'high';
    plan.reasoning = 'Critical narrative discontinuity detected';
    
    // Find the missing beat
    const { missingBeat, character } = findMissingStoryBeat();
    if (missingBeat) {
      plan.criticalPathId = missingBeat;
      plan.characterId = character;
    }
  }
  
  // Apply heuristics to determine priority and optimal approach
  return optimizeRecoveryPlan(plan);
}

/**
 * Checks for critical narrative discontinuity
 * This occurs when later story beats exist without prerequisites
 */
function checkForNarrativeDiscontinuity(): boolean {
  const { currentDay } = useGameStore.getState();
  const completedNodes = useGameStore.getState().completedNodeIds;
  
  // Define story beat dependencies
  const storyBeatDependencies = [
    { beat: 'ionix-boss', requires: ['quantum-theory', 'equipment-safety'] },
    { beat: 'quinn-theory', requires: ['journal-acquisition'] },
    { beat: 'jesse-equipment', requires: ['journal-acquisition'] }
  ];
  
  // Only check dependencies relevant to current day
  const relevantDependencies = storyBeatDependencies.filter(dep => {
    // Simple day-based filtering
    if (dep.beat.includes('boss') && currentDay < 3) return false;
    if (dep.beat.includes('theory') && currentDay < 2) return false;
    return true;
  });
  
  // Check if any beat exists without its prerequisites
  for (const dependency of relevantDependencies) {
    const beatCompleted = completedNodes.some(node => node.includes(dependency.beat));
    
    if (beatCompleted) {
      // Check if all prerequisites are met
      const missingPrerequisites = dependency.requires.filter(req => 
        !completedNodes.some(node => node.includes(req))
      );
      
      if (missingPrerequisites.length > 0) {
        console.warn(`[ProgressionRecovery] Narrative discontinuity detected: ${dependency.beat} completed without prerequisites: ${missingPrerequisites.join(', ')}`);
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Finds the most critical missing story beat
 */
function findMissingStoryBeat(): { missingBeat: string | null, character: string | null } {
  const { currentDay } = useGameStore.getState();
  const hasJournal = useJournalStore.getState().hasJournal;
  
  // Check for journal first as it's the most critical
  if (!hasJournal && currentDay >= 1) {
    return { missingBeat: 'journal-presentation', character: 'kapoor' };
  }
  
  // Check for knowledge prerequisites for ionix
  if (currentDay >= 3) {
    const knowledge = useKnowledgeStore.getState();
    
    if (!knowledge.hasMasteredConcept('quantum_dosimetry_principles', 5)) {
      return { missingBeat: 'quantum-understanding', character: 'quinn' };
    }
    
    if (!knowledge.hasMasteredConcept('equipment_safety_protocol', 5)) {
      return { missingBeat: 'equipment-safety', character: 'jesse' };
    }
  }
  
  return { missingBeat: null, character: null };
}

/**
 * Apply heuristics to optimize the recovery plan
 */
function optimizeRecoveryPlan(plan: RecoveryPlan): RecoveryPlan {
  // Nothing to optimize if there are no actions
  if (plan.requiredActions.length === 0) {
    return plan;
  }
  
  // Score each action across our heuristics
  const actionScores: Record<string, number> = {};
  
  plan.requiredActions.forEach(action => {
    // Combine scores from each approach, weighted by importance
    actionScores[action] = 
      RECOVERY_APPROACH_SCORES.CONTINUITY[action] * 1.0 +
      RECOVERY_APPROACH_SCORES.DISRUPTION[action] * 1.5 +
      RECOVERY_APPROACH_SCORES.COHERENCE[action] * 2.0;
  });
  
  // Sort actions by score, highest first
  const sortedActions = [...plan.requiredActions].sort((a, b) => 
    (actionScores[b] || 0) - (actionScores[a] || 0)
  );
  
  // Critical progression fixes always come first, regardless of score
  if (sortedActions.includes('force_journal_acquisition')) {
    sortedActions.splice(sortedActions.indexOf('force_journal_acquisition'), 1);
    sortedActions.unshift('force_journal_acquisition');
  }
  
  // Replace with optimized actions
  plan.requiredActions = sortedActions;
  
  return plan;
}

/**
 * Executes a recovery plan to fix progression issues
 */
export function executeRecoveryPlan(plan: RecoveryPlan, interruptionType: InterruptionType = 'state_corruption'): boolean {
  if (!plan || plan.requiredActions.length === 0) {
    return false;
  }
  
  const eventBus = useEventBus.getState();
  
  // Create a transaction record
  const transactionId = `recovery-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const transaction: RecoveryTransaction = {
    id: transactionId,
    timestamp: Date.now(),
    interruptionType,
    recoveryActions: [...plan.requiredActions],
    characterId: plan.characterId,
    nodeId: plan.nodeId,
    dialogueId: plan.dialogueId,
    stateBeforeRecovery: {
      hasJournal: useJournalStore.getState().hasJournal,
      currentDay: useGameStore.getState().currentDay,
      completedNodes: useGameStore.getState().completedNodeIds.length,
      hasActiveDialogue: useDialogueStateMachine.getState().activeFlow !== null,
      knowledge: summarizeKnowledgeState()
    },
    successful: false,
    gameDay: useGameStore.getState().currentDay,
    gamePhase: useGameStore.getState().gamePhase
  };
  
  // Log recovery attempt
  console.log(`[ProgressionRecovery] Executing recovery plan with ${plan.requiredActions.length} actions - ${plan.reasoning}`, plan);
  
  // Track for analytics
  eventBus.dispatch(GameEventType.UI_BUTTON_CLICKED, {
    componentId: 'progressionRecovery',
    action: 'recoveryAttempted',
    metadata: {
      actions: plan.requiredActions,
      characterId: plan.characterId,
      nodeId: plan.nodeId,
      interruptionType,
      priority: plan.priority,
      reasoning: plan.reasoning
    }
  });
  
  try {
    // Execute each required action
    for (const action of plan.requiredActions) {
      switch (action) {
        case 'force_journal_acquisition':
          if (!useJournalStore.getState().hasJournal) {
            console.log('[ProgressionRecovery] Forcing journal acquisition');
            
            // Determine appropriate journal tier
            const relationshipLevel = useGameStore.getState().getRelationshipLevel('kapoor');
            const journalTier = relationshipLevel >= 3 ? 'annotated' : 
                               relationshipLevel >= 1 ? 'technical' : 'base';
            
            // Initialize journal
            useJournalStore.getState().initializeJournal(journalTier);
            
            // Create transaction for tracking
            useNarrativeTransaction.getState().startTransaction(
              'journal_acquisition',
              { 
                source: 'progression_recovery',
                tier: journalTier,
                forced: true
              },
              'kapoor'
            );
            
            // Notify system
            eventBus.dispatch(GameEventType.JOURNAL_ACQUIRED, {
              tier: journalTier,
              character: 'kapoor',
              source: 'progression_recovery',
              forced: true
            });
          }
          break;
          
        case 'grant_required_knowledge':
          if (plan.requiredKnowledge && plan.characterId) {
            console.log(`[ProgressionRecovery] Granting required knowledge: ${plan.requiredKnowledge.join(', ')}`);
            
            // Grant each required knowledge concept
            plan.requiredKnowledge.forEach(conceptId => {
              useKnowledgeStore.getState().updateMastery(conceptId, 10);
              
              // Determine domain based on character or concept
              let domainId = 'general';
              switch (plan.characterId) {
                case 'kapoor': domainId = 'clinical'; break;
                case 'jesse': domainId = 'quality-assurance'; break;
                case 'quinn': domainId = 'theoretical'; break;
              }
              
              // Create transaction for tracking
              useNarrativeTransaction.getState().startTransaction(
                'knowledge_revelation',
                {
                  concept: conceptId,
                  domain: domainId,
                  source: 'progression_recovery'
                },
                plan.characterId,
                plan.nodeId
              );
              
              // Notify knowledge system
              eventBus.dispatch(GameEventType.KNOWLEDGE_GAINED, {
                conceptId,
                amount: 10,
                domainId,
                character: plan.characterId,
                source: 'progression_recovery'
              });
            });
          }
          break;
          
        case 'mark_node_completed':
          if (plan.nodeId) {
            console.log(`[ProgressionRecovery] Marking node as completed: ${plan.nodeId}`);
            
            // Mark node as completed
            useGameStore.getState().completeNode(plan.nodeId, {
              relationshipChange: 1,
              forced: true
            });
            
            // Also mark in GameStateMachine
            if (useGameStore.getState().markNodeCompleted) {
              useGameStore.getState().markNodeCompleted(plan.nodeId);
            }
          }
          break;
          
        case 'resume_dialogue':
          if (plan.dialogueId && plan.characterId) {
            console.log(`[ProgressionRecovery] Resuming dialogue: ${plan.dialogueId}`);
            
            // First ensure any active dialogue is properly closed
            if (useDialogueStateMachine.getState().activeFlow) {
              useDialogueStateMachine.getState().completeFlow();
            }
            
            // Signal game to restart dialogue
            eventBus.dispatch(GameEventType.UI_BUTTON_CLICKED, {
              componentId: 'progressionRecovery',
              action: 'restartDialogue',
              metadata: {
                characterId: plan.characterId,
                nodeId: plan.nodeId,
                dialogueId: plan.dialogueId,
                source: 'progression_recovery'
              }
            });
          }
          break;
          
        case 'restart_dialogue':
          if (plan.characterId && plan.nodeId) {
            console.log(`[ProgressionRecovery] Restarting dialogue for ${plan.characterId} at ${plan.nodeId}`);
            
            // First ensure any active dialogue is properly closed
            if (useDialogueStateMachine.getState().activeFlow) {
              useDialogueStateMachine.getState().completeFlow();
            }
            
            // Signal game to restart dialogue from beginning
            eventBus.dispatch(GameEventType.UI_BUTTON_CLICKED, {
              componentId: 'progressionRecovery',
              action: 'startDialogue',
              metadata: {
                characterId: plan.characterId,
                nodeId: plan.nodeId,
                source: 'progression_recovery',
                restartFromBeginning: true
              }
            });
          }
          break;
          
        case 'force_critical_path':
          if (plan.characterId && plan.criticalPathId) {
            console.log(`[ProgressionRecovery] Forcing critical path: ${plan.criticalPathId}`);
            
            // Determine if this is a journal critical path
            if (plan.criticalPathId === 'journal-presentation') {
              // Only force if journal doesn't exist
              if (!useJournalStore.getState().hasJournal) {
                // Determine journal tier
                const relationshipLevel = useGameStore.getState().getRelationshipLevel('kapoor');
                const journalTier = relationshipLevel >= 3 ? 'annotated' : 
                                   relationshipLevel >= 1 ? 'technical' : 'base';
                
                // Initialize journal
                useJournalStore.getState().initializeJournal(journalTier);
                
                // Notify system
                eventBus.dispatch(GameEventType.JOURNAL_ACQUIRED, {
                  tier: journalTier,
                  character: 'kapoor',
                  source: 'progression_recovery',
                  forced: true
                });
              }
            }
            
            // Signal that critical path has been forced
            eventBus.dispatch(GameEventType.DIALOGUE_CRITICAL_PATH, {
              dialogueId: plan.dialogueId || `recovery-${Date.now()}`,
              characterId: plan.characterId,
              nodeId: plan.nodeId || 'unknown',
              criticalStateId: plan.criticalPathId,
              playerScore: 0, // Minimal score for forced progression
              wasRepaired: true
            });
          }
          break;
          
        case 'repair_relationship':
          if (plan.characterId) {
            console.log(`[ProgressionRecovery] Repairing relationship with: ${plan.characterId}`);
            
            // Add minimal relationship if none exists
            const currentRelationship = useGameStore.getState().getRelationshipLevel(plan.characterId);
            if (currentRelationship <= 0) {
              useGameStore.getState().updateRelationship(plan.characterId, 1);
            }
          }
          break;
          
        case 'repair_transaction':
          // Already handled when detecting stalled transactions
          console.log('[ProgressionRecovery] Transactions already repaired in detection phase');
          break;
          
        case 'reinsert_dialogue_node':
          if (plan.characterId && plan.criticalPathId) {
            console.log(`[ProgressionRecovery] Reinserting critical dialogue node: ${plan.criticalPathId}`);
            
            // First identify the specific story beat to reinsert
            const storyBeat = CRITICAL_STORY_BEATS.find(beat => 
              beat.fallbackState === plan.criticalPathId || beat.id === plan.criticalPathId
            );
            
            if (storyBeat) {
              // Signal game to insert this dialogue node
              eventBus.dispatch(GameEventType.UI_BUTTON_CLICKED, {
                componentId: 'progressionRecovery',
                action: 'insertCriticalNode',
                metadata: {
                  characterId: plan.characterId,
                  nodeType: storyBeat.nodeType,
                  stateId: storyBeat.fallbackState,
                  source: 'progression_recovery',
                  priority: 'critical'
                }
              });
              
              // Also add a transaction record for this insertion
              useNarrativeTransaction.getState().startTransaction(
                'character_introduction',
                {
                  nodeType: storyBeat.nodeType,
                  stateId: storyBeat.fallbackState,
                  source: 'progression_recovery',
                  wasReinserted: true
                },
                plan.characterId
              );
            }
          }
          break;
          
        case 'grant_required_item':
          if (plan.requiredItems && plan.requiredItems.length > 0) {
            console.log(`[ProgressionRecovery] Granting required items: ${plan.requiredItems.join(', ')}`);
            
            // Add each required item to inventory
            plan.requiredItems.forEach(itemId => {
              // Add item to inventory if not already present
              const hasItem = useGameStore.getState().inventory.some(item => item.id === itemId);
              
              if (!hasItem) {
                // This is a simplified version - in reality, you'd need to retrieve the full item data
                // before adding it to inventory
                useGameStore.getState().addToInventory({
                  id: itemId,
                  name: getItemName(itemId),
                  description: `Recovery system provided ${getItemName(itemId)}`,
                  effects: []
                });
                
                // Notify system
                eventBus.dispatch(GameEventType.ITEM_ACQUIRED, {
                  itemId,
                  source: 'progression_recovery',
                  forced: true
                });
              }
            });
          }
          break;
          
        default:
          console.warn(`[ProgressionRecovery] Unhandled recovery action: ${action}`);
      }
    }
    
    // Update transaction with final state
    transaction.stateAfterRecovery = {
      hasJournal: useJournalStore.getState().hasJournal,
      currentDay: useGameStore.getState().currentDay,
      completedNodes: useGameStore.getState().completedNodeIds.length,
      hasActiveDialogue: useDialogueStateMachine.getState().activeFlow !== null,
      knowledge: summarizeKnowledgeState()
    };
    transaction.successful = true;
    
    // Add to history
    recoveryHistory.push(transaction);
    
    // Log success
    console.log('[ProgressionRecovery] Recovery plan executed successfully');
    
    // Track for analytics
    eventBus.dispatch(GameEventType.UI_BUTTON_CLICKED, {
      componentId: 'progressionRecovery',
      action: 'recoverySucceeded',
      metadata: {
        transactionId,
        actions: plan.requiredActions,
        characterId: plan.characterId,
        nodeId: plan.nodeId,
        stateChange: compareStates(
          transaction.stateBeforeRecovery, 
          transaction.stateAfterRecovery
        )
      }
    });
    
    return true;
  } catch (error) {
    // Update transaction with error
    transaction.successful = false;
    transaction.stateAfterRecovery = { error: String(error) };
    
    // Add to history
    recoveryHistory.push(transaction);
    
    // Log error
    console.error('[ProgressionRecovery] Error executing recovery plan:', error);
    
    // Track for analytics
    eventBus.dispatch(GameEventType.UI_BUTTON_CLICKED, {
      componentId: 'progressionRecovery',
      action: 'recoveryFailed',
      metadata: {
        transactionId,
        error: String(error),
        actions: plan.requiredActions,
        characterId: plan.characterId,
        nodeId: plan.nodeId
      }
    });
    
    return false;
  }
}

/**
 * Compare before and after states for telemetry
 */
function compareStates(before: any, after: any): Record<string, any> {
  if (!before || !after) return { incomplete: true };
  
  const changes: Record<string, any> = {};
  
  // Compare journal state
  if (before.hasJournal !== after.hasJournal) {
    changes.journal = { before: before.hasJournal, after: after.hasJournal };
  }
  
  // Compare completed nodes count
  if (before.completedNodes !== after.completedNodes) {
    changes.completedNodes = { before: before.completedNodes, after: after.completedNodes };
  }
  
  // Compare active dialogue state
  if (before.hasActiveDialogue !== after.hasActiveDialogue) {
    changes.activeDialogue = { before: before.hasActiveDialogue, after: after.hasActiveDialogue };
  }
  
  return changes;
}

/**
 * Helper function to get item name from ID
 */
function getItemName(itemId: string): string {
  switch (itemId) {
    case 'journal': return 'Resident Journal';
    case 'dosimeter': return 'Personal Dosimeter';
    case 'calibration_tool': return 'Calibration Tool';
    default: return itemId.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }
}

/**
 * Create a summary of knowledge state for telemetry
 */
function summarizeKnowledgeState(): Record<string, any> {
  const knowledge = useKnowledgeStore.getState();
  
  return {
    totalMastery: knowledge.totalMastery,
    domainCount: Object.keys(knowledge.domainMastery).length,
    discoveredConcepts: knowledge.nodes.filter(n => n.discovered).length,
    totalConcepts: knowledge.nodes.length
  };
}

/**
 * Check for progression issues and automatically execute recovery if needed
 */
export function checkAndRepairProgression(): boolean {
  // First check if recovery is needed
  if (!detectProgressionIssues()) {
    return true; // No issues detected
  }
  
  // Create recovery plan
  const plan = createRecoveryPlan();
  
  // Execute plan if needed
  if (plan) {
    return executeRecoveryPlan(plan);
  }
  
  return true;
}

/**
 * Setup automatic progression checking
 */
export function setupProgressionRecovery(): () => void {
  const eventBus = useEventBus.getState();
  
  // Array to track subscription cleanup functions
  const cleanupFns: (() => void)[] = [];
  
  // Check at game load
  cleanupFns.push(
    eventBus.subscribe(
      GameEventType.SESSION_STARTED,
      () => {
        console.log('[ProgressionRecovery] Checking progression on game load');
        setTimeout(() => checkAndRepairProgression(), 1000);
      }
    )
  );
  
  // Check at day/night transitions
  cleanupFns.push(
    eventBus.subscribe(
      GameEventType.GAME_PHASE_CHANGED,
      (event) => {
        const { from, to } = event.payload;
        
        // When transitioning between day and night
        if ((from === 'day' && to === 'night') || (from === 'night' && to === 'day')) {
          console.log(`[ProgressionRecovery] Checking progression on ${from} → ${to} transition`);
          setTimeout(() => checkAndRepairProgression(), 1000);
        }
      }
    )
  );
  
  // Check for dialogue interruptions
  cleanupFns.push(
    eventBus.subscribe(
      GameEventType.DIALOGUE_COMPLETED,
      (event) => {
        const { completed, reason } = event.payload;
        
        // If dialogue was interrupted
        if (!completed) {
          console.log(`[ProgressionRecovery] Dialogue interrupted: ${reason}`);
          
          // Map reason to interruption type
          let interruptionType: InterruptionType = 'dialogue_unmount';
          if (reason === 'component_unmounted') interruptionType = 'dialogue_unmount';
          if (reason === 'browser_refresh') interruptionType = 'browser_refresh';
          if (reason === 'session_end') interruptionType = 'session_end';
          
          // Create recovery plan with specific information
          const plan = createRecoveryPlan();
          
          // Execute plan if needed
          if (plan) {
            executeRecoveryPlan(plan, interruptionType);
          }
        }
      }
    )
  );
  
  // Check periodically for stalled transactions
  const intervalId = setInterval(() => {
    // Check for stalled transactions
    const transactions = useNarrativeTransaction.getState().getAllTransactions();
    const stalledTransactions = transactions.filter(tx => 
      tx.state === 'active' && (Date.now() - tx.startTime > 300000) // Stalled for over 5 minutes
    );
    
    if (stalledTransactions.length > 0) {
      console.log(`[ProgressionRecovery] Found ${stalledTransactions.length} stalled transactions`);
      checkAndRepairProgression();
    }
  }, 60000); // Check every minute
  
  // Check after node completion for sequence violations
  cleanupFns.push(
    eventBus.subscribe(
      GameEventType.NODE_COMPLETED,
      () => {
        // Short delay to let state update
        setTimeout(() => {
          const sequenceViolation = checkForSequenceViolations();
          if (sequenceViolation) {
            console.log('[ProgressionRecovery] Sequence violation detected after node completion');
            checkAndRepairProgression();
          }
        }, 500);
      }
    )
  );
  
  // Return cleanup function
  return () => {
    cleanupFns.forEach(cleanup => cleanup());
    clearInterval(intervalId);
  };
}

/**
 * Manual check for specific narrative inconsistencies
 * This can be exposed to debug systems or triggered by player reporting issues
 */
export function performDeepProgressionValidation(): Record<string, any> {
  // Begin by running standard validation
  const validationResult = validateNarrativeProgression();
  
  // Additional checks beyond standard validation
  const results: Record<string, any> = {
    standardValidation: validationResult.isValid,
    failedCheckpoints: validationResult.failedCheckpoints,
    additionalChecks: {}
  };
  
  // Check for inconsistencies between knowledge and node completion
  const knowledgeState = useKnowledgeStore.getState();
  const gameState = useGameStore.getState();
  
  // Characters should have introduced core concepts related to their expertise
  results.additionalChecks.characterKnowledgeConsistency = {
    kapoor: gameState.hasCompletedNode('kapoor-calibration') && 
            knowledgeState.hasMasteredConcept('electron_equilibrium_understood', 1),
            
    jesse: gameState.hasCompletedNode('jesse-equipment') &&
            knowledgeState.hasMasteredConcept('equipment_safety_protocol', 1),
            
    quinn: gameState.hasCompletedNode('quinn-theory') &&
            knowledgeState.hasMasteredConcept('quantum_dosimetry_principles', 1)
  };
  
  // Journal state should be consistent with progression
  results.additionalChecks.journalConsistency = 
    gameState.hasCompletedNode('kapoor-calibration') === useJournalStore.getState().hasJournal;
  
  // Narrative transactions should be properly completed
  const transactions = useNarrativeTransaction.getState().getAllTransactions();
  results.additionalChecks.transactionHealth = {
    totalTransactions: transactions.length,
    activeTransactions: transactions.filter(t => t.state === 'active').length,
    completedTransactions: transactions.filter(t => t.state === 'completed').length,
    stalledTransactions: transactions.filter(t => 
      t.state === 'active' && (Date.now() - t.startTime > 60000)
    ).length
  };
  
  // Overall health assessment
  results.needsRepair = !validationResult.isValid || 
                       !results.additionalChecks.journalConsistency ||
                       results.additionalChecks.transactionHealth.stalledTransactions > 0 ||
                       Object.values(results.additionalChecks.characterKnowledgeConsistency).includes(false);
  
  // If repairs needed, trigger them
  if (results.needsRepair) {
    const plan = createRecoveryPlan();
    if (plan) {
      results.recoveryPlanCreated = true;
      results.recoveryPlan = {
        actions: plan.requiredActions,
        priority: plan.priority,
        reasoning: plan.reasoning
      };
      
      // Execute recovery (uncomment to auto-execute)
      // results.recoveryExecuted = executeRecoveryPlan(plan, 'manual_request');
    }
  }
  
  return results;
}

export default {
  detectProgressionIssues,
  createRecoveryPlan,
  executeRecoveryPlan,
  checkAndRepairProgression,
  setupProgressionRecovery,
  performDeepProgressionValidation,
  getRecoveryHistory: () => recoveryHistory,
};