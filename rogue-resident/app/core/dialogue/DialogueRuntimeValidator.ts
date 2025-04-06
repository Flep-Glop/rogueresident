// app/core/dialogue/DialogueRuntimeValidator.ts
/**
 * Runtime Dialogue Validator
 * 
 * Ensures narrative coherence and integrity by actively monitoring dialogue
 * execution at runtime, catching potential issues before they impact player experience.
 * 
 * Inspired by Supergiant's real-time narrative validation systems that prevent
 * inconsistencies in branching stories during procedural content generation.
 */

import { useDialogueStateMachine, DialogueState, DialogueContext } from './DialogueStateMachine';
import { useGameStore } from '../../store/gameStore';
import { useCharacterMemory } from './CharacterMemorySystem';
import { useEventBus } from '../events/CentralEventBus';
import { GameEventType } from '../events/EventTypes';

// Types for validation system
export interface ValidationIssue {
  id: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  stateId?: string;
  optionId?: string;
  details?: string;
  reproduceSteps?: string[];
  possibleFixes?: string[];
  runtimeContext?: any;
}

export interface ValidationRule {
  id: string;
  description: string;
  validate: (context: ValidationContext) => ValidationIssue[];
  severity: 'critical' | 'major' | 'minor';
  category: 'consistency' | 'accessibility' | 'narrative' | 'progression' | 'technical';
}

export interface ValidationContext {
  state: DialogueState | null;
  context: DialogueContext | null;
  previousStateId?: string;
  selectedOption?: string;
  dialogue: {
    id: string;
    states: Record<string, DialogueState>;
    initialStateId: string;
    progressionCheckpoints: string[];
  };
  gameState: {
    currentDay: number;
    gamePhase: string;
    characterRelationship: number;
  };
  memory: {
    relationshipTier: string;
    recentMemories: any[];
    criticalChoices: any[];
  };
}

export interface ValidationReport {
  timestamp: number;
  dialogueId: string;
  characterId: string;
  nodeId: string;
  rulesChecked: number;
  currentState: string | null;
  issues: ValidationIssue[];
  passedRules: string[];
  metadata: {
    gameDay: number;
    gamePhase: string;
  };
}

// Telemetry flag to control validation detail level
let DETAILED_VALIDATION = false;

/**
 * Core validation rules for dialogue integrity
 */
const VALIDATION_RULES: ValidationRule[] = [
  // Critical Path Completion Rule
  {
    id: 'critical-path-completion',
    description: 'Ensures the dialogue flow visits all critical path stages before completion',
    validate: (context) => {
      const issues: ValidationIssue[] = [];
      
      // Skip if not a conclusion state
      if (!context.state?.isConclusion) {
        return issues;
      }
      
      // Check if all critical path checkpoints have been visited
      const visitedStateIds = context.context?.visitedStateIds || [];
      const missingCheckpoints = context.dialogue.progressionCheckpoints
        .filter(checkpoint => !visitedStateIds.includes(checkpoint));
      
      if (missingCheckpoints.length > 0) {
        issues.push({
          id: `critical-path-incomplete-${context.dialogue.id}`,
          type: 'error',
          message: `Dialogue is completing without visiting all critical path stages`,
          stateId: context.state.id,
          details: `Missing checkpoints: ${missingCheckpoints.join(', ')}`,
          possibleFixes: [
            'Use forceProgressionRepair() to ensure critical path is visited',
            'Add conditional logic to prevent conclusion before critical path completion'
          ],
          runtimeContext: {
            visitedStates: visitedStateIds,
            criticalPath: context.dialogue.progressionCheckpoints
          }
        });
      }
      
      return issues;
    },
    severity: 'critical',
    category: 'progression'
  },
  
  // Dialogue Loop Detection
  {
    id: 'dialogue-loop-detection',
    description: 'Detects potential infinite loops in dialogue flow',
    validate: (context) => {
      const issues: ValidationIssue[] = [];
      const visitedStateIds = context.context?.visitedStateIds || [];
      
      // Count visits per state
      const visitCounts: Record<string, number> = {};
      visitedStateIds.forEach(id => {
        visitCounts[id] = (visitCounts[id] || 0) + 1;
      });
      
      // Check for states visited too many times
      const excessiveVisits = Object.entries(visitCounts)
        .filter(([id, count]) => {
          const state = context.dialogue.states[id];
          // Allow more visits for question states that naturally might be revisited
          const maxAllowed = state?.type === 'question' ? 5 : 3;
          return count > maxAllowed;
        });
      
      if (excessiveVisits.length > 0) {
        issues.push({
          id: `dialogue-loop-${context.dialogue.id}`,
          type: 'warning',
          message: `Potential dialogue loop detected`,
          stateId: context.state?.id,
          details: `States with excessive visits: ${excessiveVisits.map(([id, count]) => `${id} (${count} visits)`).join(', ')}`,
          possibleFixes: [
            'Add progression flags to prevent excessive looping',
            'Implement loop escape logic in DialogueStateMachine',
            'Review node linking to ensure forward progression'
          ]
        });
      }
      
      return issues;
    },
    severity: 'major',
    category: 'technical'
  },
  
  // Emotional Consistency
  {
    id: 'emotional-consistency',
    description: 'Validates that dialogue emotional tone is consistent with character relationship',
    validate: (context) => {
      const issues: ValidationIssue[] = [];
      
      // Skip if no active state or not detailed validation
      if (!context.state || !DETAILED_VALIDATION) {
        return issues;
      }
      
      // Get relationship level
      const relationshipTier = context.memory.relationshipTier;
      
      // Define emotional markers for different relationship tiers
      const tierMarkers: Record<string, { positive: string[], negative: string[] }> = {
        'stranger': {
          positive: ['professional', 'formal', 'proper'],
          negative: ['intimate', 'casual', 'friendly']
        },
        'acquaintance': {
          positive: ['respectful', 'appropriate', 'courteous'],
          negative: ['overly familiar', 'excessively formal']
        },
        'colleague': {
          positive: ['collaborative', 'supportive', 'constructive'],
          negative: ['condescending', 'dismissive']
        },
        'mentor': {
          positive: ['instructive', 'patient', 'encouraging'],
          negative: ['indifferent', 'harsh', 'overly critical']
        },
        'friend': {
          positive: ['warm', 'understanding', 'considerate'],
          negative: ['cold', 'distant', 'formal']
        }
      };
      
      // Check text for emotional consistency
      const text = context.state.text || '';
      const markers = tierMarkers[relationshipTier];
      
      if (markers) {
        // Check for negative markers that shouldn't be present
        const foundNegativeMarkers = markers.negative.filter(marker => 
          text.toLowerCase().includes(marker.toLowerCase())
        );
        
        if (foundNegativeMarkers.length > 0) {
          issues.push({
            id: `emotional-mismatch-${context.state.id}`,
            type: 'warning',
            message: `Dialogue tone may not match relationship level (${relationshipTier})`,
            stateId: context.state.id,
            details: `Found inappropriate markers: ${foundNegativeMarkers.join(', ')}`,
            possibleFixes: [
              'Create relationship-specific dialogue variations',
              'Update text to better match relationship context',
              'Use CharacterMemorySystem for contextual dialogue generation'
            ]
          });
        }
      }
      
      return issues;
    },
    severity: 'minor',
    category: 'narrative'
  },
  
  // Knowledge Reference Integrity
  {
    id: 'knowledge-reference-integrity',
    description: 'Ensures knowledge references are consistent with player progression',
    validate: (context) => {
      const issues: ValidationIssue[] = [];
      
      // Skip if no active state
      if (!context.state) {
        return issues;
      }
      
      // Check options for knowledge requirements
      const options = context.state.options || [];
      options.forEach(option => {
        // Skip options without knowledge gain
        if (!option.knowledgeGain) return;
        
        const { conceptId, domainId } = option.knowledgeGain;
        
        // Check if conceptId exists (would need knowledge store integration)
        // For now, just do basic format validation
        if (!conceptId || conceptId.length < 3) {
          issues.push({
            id: `invalid-knowledge-concept-${option.id}`,
            type: 'error',
            message: `Invalid knowledge concept reference in option`,
            stateId: context.state?.id,
            optionId: option.id,
            details: `Concept ID "${conceptId}" appears invalid or too short`,
            possibleFixes: [
              'Update to a valid concept ID from the knowledge system',
              'Remove knowledge gain if not applicable'
            ]
          });
        }
        
        // Check if domainId is valid
        const validDomains = [
          'radiation-physics', 'quality-assurance', 'clinical-practice', 
          'radiation-protection', 'technical', 'theoretical', 'general'
        ];
        
        if (!domainId || !validDomains.includes(domainId)) {
          issues.push({
            id: `invalid-knowledge-domain-${option.id}`,
            type: 'warning',
            message: `Invalid knowledge domain in option`,
            stateId: context.state?.id,
            optionId: option.id,
            details: `Domain "${domainId}" is not a recognized knowledge domain`,
            possibleFixes: [
              `Update to a valid domain: ${validDomains.join(', ')}`
            ]
          });
        }
      });
      
      return issues;
    },
    severity: 'major',
    category: 'consistency'
  },
  
  // Dead End Prevention
  {
    id: 'dead-end-prevention',
    description: 'Ensures dialogue states have valid transitions to prevent stuck players',
    validate: (context) => {
      const issues: ValidationIssue[] = [];
      
      // Skip if no active state or if it's a conclusion (which should be an end)
      if (!context.state || context.state.isConclusion) {
        return issues;
      }
      
      // Check for valid next state or options
      const hasNextState = !!context.state.nextStateId;
      const hasOptions = context.state.options && context.state.options.length > 0;
      
      if (!hasNextState && !hasOptions) {
        issues.push({
          id: `dead-end-${context.state.id}`,
          type: 'error',
          message: `Dialogue state has no valid transitions`,
          stateId: context.state.id,
          details: `State "${context.state.id}" has no nextStateId and no options`,
          possibleFixes: [
            'Add a nextStateId to the state',
            'Add dialogue options',
            'Mark the state as a conclusion if intended to end dialogue'
          ]
        });
      }
      
      return issues;
    },
    severity: 'critical',
    category: 'progression'
  },
  
  // Critical Path Sequence Validation
  {
    id: 'critical-path-sequence',
    description: 'Validates that critical path nodes are visited in the correct order',
    validate: (context) => {
      const issues: ValidationIssue[] = [];
      const visitedStateIds = context.context?.visitedStateIds || [];
      
      // Define expected sequences for critical paths
      // Format: [prerequisite, dependent]
      const requiredSequences: [string, string][] = [
        // Example sequences - would be defined based on narrative needs
        ['intro', 'critical-explanation'],
        ['critical-explanation', 'critical-question'],
        ['critical-question', 'critical-resolution']
      ];
      
      // Filter to sequences relevant to current dialogue
      const applicableSequences = requiredSequences.filter(([pre, dep]) => 
        context.dialogue.states[pre] && context.dialogue.states[dep]
      );
      
      // Check each sequence
      applicableSequences.forEach(([prerequisite, dependent]) => {
        const dependentVisited = visitedStateIds.includes(dependent);
        const prerequisiteVisited = visitedStateIds.includes(prerequisite);
        
        if (dependentVisited && !prerequisiteVisited) {
          issues.push({
            id: `sequence-violation-${prerequisite}-${dependent}`,
            type: 'error',
            message: `Critical path sequence violation`,
            stateId: context.state?.id,
            details: `State "${dependent}" was visited without prerequisite "${prerequisite}"`,
            possibleFixes: [
              'Add sequence validation logic to prevent invalid transitions',
              'Fix dialogue flow to ensure proper sequence',
              'Use DialogueProgressionHelpers.validateDialogueProgression to check sequences'
            ],
            runtimeContext: {
              visitedStates: visitedStateIds
            }
          });
        }
      });
      
      return issues;
    },
    severity: 'major',
    category: 'narrative'
  },
  
  // Character Voice Consistency
  {
    id: 'character-voice-consistency',
    description: 'Validates that dialogue maintains consistent character voice patterns',
    validate: (context) => {
      const issues: ValidationIssue[] = [];
      
      // Skip if no active state or not detailed validation
      if (!context.state || !DETAILED_VALIDATION) {
        return issues;
      }
      
      // Character-specific linguistic patterns to check for
      const characterPatterns: Record<string, { expected: RegExp[], forbidden: RegExp[] }> = {
        'kapoor': {
          expected: [/protocol/i, /standard/i, /procedure/i, /precisely/i],
          forbidden: [/guess/i, /maybe/i, /whatever/i, /dunno/i]
        },
        'jesse': {
          expected: [/practical/i, /hands-on/i, /tool/i, /equipment/i],
          forbidden: [/theoretical/i, /philosophy/i, /abstract/i]
        },
        'quinn': {
          expected: [/theory/i, /experiment/i, /discover/i, /fascinating/i],
          forbidden: [/boring/i, /routine/i, /mundane/i]
        }
      };
      
      // Get character ID
      const characterId = context.context?.characterId;
      
      if (characterId && characterPatterns[characterId]) {
        const patterns = characterPatterns[characterId];
        const text = context.state.text || '';
        
        // Check for missing expected patterns
        const missingExpected = patterns.expected.filter(pattern => 
          !pattern.test(text) && text.length > 100 // Only check longer texts
        );
        
        // Check for forbidden patterns
        const foundForbidden = patterns.forbidden.filter(pattern => 
          pattern.test(text)
        );
        
        if (missingExpected.length > 0 && text.length > 100) {
          issues.push({
            id: `voice-pattern-missing-${context.state.id}`,
            type: 'info',
            message: `Dialogue may lack character voice patterns for ${characterId}`,
            stateId: context.state.id,
            details: `Long dialogue lacks characteristic patterns for ${characterId}`,
            possibleFixes: [
              'Add character-specific linguistic markers',
              'Review dialogue to better match character voice'
            ]
          });
        }
        
        if (foundForbidden.length > 0) {
          issues.push({
            id: `voice-pattern-violation-${context.state.id}`,
            type: 'warning',
            message: `Dialogue contains patterns inconsistent with ${characterId}'s voice`,
            stateId: context.state.id,
            details: `Found speech patterns that don't match character voice`,
            possibleFixes: [
              'Remove expressions that contradict character personality',
              'Rephrase to better match character speech patterns'
            ]
          });
        }
      }
      
      return issues;
    },
    severity: 'minor',
    category: 'narrative'
  }
];

/**
 * Runtime dialogue validator
 * 
 * This system runs validation checks during dialogue execution to catch
 * narrative inconsistencies and technical issues before they affect gameplay.
 */
export function validateDialogueState(): ValidationReport {
  // Get current state from dialogue state machine
  const stateMachine = useDialogueStateMachine.getState();
  const gameStore = useGameStore.getState();
  const memorySystem = useCharacterMemory.getState();
  
  // Current state
  const currentState = stateMachine.currentState;
  const context = stateMachine.context;
  const activeFlow = stateMachine.activeFlow;
  
  // If no active flow, return empty report
  if (!activeFlow || !context) {
    return {
      timestamp: Date.now(),
      dialogueId: 'none',
      characterId: 'none',
      nodeId: 'none',
      rulesChecked: 0,
      currentState: null,
      issues: [],
      passedRules: [],
      metadata: {
        gameDay: gameStore.currentDay,
        gamePhase: gameStore.gamePhase
      }
    };
  }
  
  // Build validation context
  const validationContext: ValidationContext = {
    state: currentState,
    context,
    dialogue: {
      id: activeFlow.id,
      states: activeFlow.states,
      initialStateId: activeFlow.initialStateId,
      progressionCheckpoints: activeFlow.progressionCheckpoints
    },
    gameState: {
      currentDay: gameStore.currentDay,
      gamePhase: gameStore.gamePhase,
      characterRelationship: 0 // Will be filled below
    },
    memory: {
      relationshipTier: 'stranger', // Default
      recentMemories: [],
      criticalChoices: []
    }
  };
  
  // Add character relationship if available
  if (context.characterId && typeof gameStore.getRelationshipLevel === 'function') {
    validationContext.gameState.characterRelationship = 
      gameStore.getRelationshipLevel(context.characterId);
  }
  
  // Add memory context if available
  if (context.characterId) {
    validationContext.memory.relationshipTier = 
      memorySystem.getRelationshipTier(context.characterId);
    validationContext.memory.recentMemories = 
      memorySystem.getMostRelevantMemories(context.characterId, 3);
    validationContext.memory.criticalChoices = 
      memorySystem.getCriticalChoices(context.characterId);
  }
  
  // Run validation rules
  const allIssues: ValidationIssue[] = [];
  const passedRules: string[] = [];
  
  VALIDATION_RULES.forEach(rule => {
    try {
      const issues = rule.validate(validationContext);
      
      if (issues.length > 0) {
        allIssues.push(...issues);
      } else {
        passedRules.push(rule.id);
      }
    } catch (error) {
      // If a rule throws an exception, record it as an issue
      allIssues.push({
        id: `rule-exception-${rule.id}`,
        type: 'error',
        message: `Validation rule "${rule.id}" failed with an exception`,
        details: `${error instanceof Error ? error.message : String(error)}`,
        reproduceSteps: ['The exception occurred during normal validation']
      });
    }
  });
  
  // Create the validation report
  const report: ValidationReport = {
    timestamp: Date.now(),
    dialogueId: activeFlow.id,
    characterId: context.characterId || 'unknown',
    nodeId: context.nodeId || 'unknown',
    rulesChecked: VALIDATION_RULES.length,
    currentState: currentState?.id || null,
    issues: allIssues,
    passedRules,
    metadata: {
      gameDay: gameStore.currentDay,
      gamePhase: gameStore.gamePhase
    }
  };
  
  // Report critical issues
  if (allIssues.some(issue => issue.type === 'error')) {
    console.warn(`[DialogueValidator] Found ${allIssues.length} issues in dialogue ${activeFlow.id}`);
    allIssues.filter(issue => issue.type === 'error').forEach(issue => {
      console.error(`  - ${issue.message}: ${issue.details}`);
    });
  }
  
  return report;
}

/**
 * Set validation detail level
 */
export function setDetailedValidation(enabled: boolean): void {
  DETAILED_VALIDATION = enabled;
}

/**
 * Initialize runtime validation with event monitoring
 */
export function initializeRuntimeValidation(): () => void {
  const eventBus = useEventBus.getState();
  
  // Listen for state changes to validate
  const unsubscribe = useDialogueStateMachine.subscribe(
    state => state.currentState?.id,
    (stateId) => {
      if (!stateId) return;
      
      // Run validation on state change
      const report = validateDialogueState();
      
      // Send telemetry for serious issues
      const criticalIssues = report.issues.filter(issue => issue.type === 'error');
      if (criticalIssues.length > 0) {
        // Log validation failure event
        eventBus.dispatch(GameEventType.UI_BUTTON_CLICKED, {
          componentId: 'dialogueValidator',
          action: 'validationFailed',
          metadata: {
            dialogueId: report.dialogueId,
            stateId,
            issueCount: criticalIssues.length,
            issues: criticalIssues.map(issue => ({
              id: issue.id,
              message: issue.message
            }))
          }
        });
      }
    }
  );
  
  // Return cleanup function
  return unsubscribe;
}

/**
 * Setup runtime dialogue validation for the application
 * Call this once during app initialization
 */
export function setupRuntimeValidation(): () => void {
  const cleanupFn = initializeRuntimeValidation();
  
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
  validateDialogueState,
  setDetailedValidation,
  setupRuntimeValidation,
  VALIDATION_RULES
};