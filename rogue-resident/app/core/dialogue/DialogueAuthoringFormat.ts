// app/core/dialogue/DialogueAuthoringFormat.ts
/**
 * Dialogue Authoring Format
 * 
 * A specialized format to simplify narrative content creation, allowing
 * non-technical writers to author complex interactive dialogue. This system
 * draws inspiration from Inkle's Ink and Supergiant's custom narrative tools
 * that enable rich narratives with minimal technical overhead.
 * 
 * The Rogue Resident authoring format focuses on character-driven narrative
 * with specialized handling for medical physics concepts and educational content.
 */

import { DialogueState, DialogueOption, DialogueContext } from './DialogueStateMachine';
import { KnowledgeDomain } from '../../utils/CharacterTeachingStyles';

// Types for authored content

/**
 * Represents a single dialogue node authored in the simplified format
 */
export interface AuthoredDialogueNode {
  id: string;
  character: string;
  text: string;
  notes?: string;             // Writer notes that don't appear in game
  tags?: string[];            // Metadata tags for filtering and organization
  contextReferences?: string[]; // References to context variables to check
  requiredKnowledge?: string[]; // Knowledge prerequisites to access this node
  
  // Narrative markers
  isCriticalPath?: boolean;    // Must be visited for progression
  isMandatory?: boolean;       // Must be seen in this conversation
  isConclusion?: boolean;      // Ends the dialogue flow
  isBackstory?: boolean;       // Reveals character background
  
  // Options for player responses
  options?: AuthoredDialogueOption[];
  
  // Auto-advancement
  next?: string;               // Next node ID for automatic advancement
  
  // Educational content markers
  teachingPoints?: {
    conceptId: string;
    domain: KnowledgeDomain;
    importance: 'primary' | 'secondary' | 'reference';
  }[];
  
  // Conditional display requirements
  conditions?: AuthoredCondition[];
  
  // Character state
  emotion?: string;           // Character's emotional state
  
  // In-game references
  equipment?: {               // Equipment references
    id: string;
    description?: string;
  };
  
  // Alternative content variations
  variations?: {
    [key: string]: {
      text: string;
      condition: AuthoredCondition;
    }
  };
}

/**
 * Represents a dialogue option in the authored format
 */
export interface AuthoredDialogueOption {
  id: string;
  text: string;
  response?: string;          // Character's response to this option
  next?: string;              // Next node after selecting this option
  
  // Gameplay impacts
  insightGain?: number;
  relationshipChange?: number;
  triggersBackstory?: boolean;
  
  // Educational content
  knowledgeGain?: {
    conceptId: string;
    domain: KnowledgeDomain;
    amount: number;
  };
  
  // Player approach
  approach?: 'humble' | 'precision' | 'confidence';
  
  // Narrative markers
  isCriticalPath?: boolean;   // Option is required for progression
  
  // Conditional availability
  conditions?: AuthoredCondition[];
  requiredKnowledge?: {
    conceptId: string;
    minLevel?: number;
    domain?: string;
  };
}

/**
 * Conditional logic for dialogue content
 */
export interface AuthoredCondition {
  type: 'relationship' | 'knowledge' | 'item' | 'flags' | 'contextValue';
  
  // Different condition parameters based on type
  relationship?: {
    character: string;
    min?: number;
    max?: number;
  };
  
  knowledge?: {
    conceptId: string;
    minLevel?: number;
  };
  
  item?: {
    id: string;
    hasItem: boolean;
  };
  
  flag?: {
    id: string;
    value: boolean | string | number;
  };
  
  contextValue?: {
    key: string;
    value: any;
    operator?: '==' | '!=' | '>' | '<' | '>=' | '<=';
  };
  
  // For complex conditions
  and?: AuthoredCondition[];
  or?: AuthoredCondition[];
  not?: AuthoredCondition;
}

/**
 * A complete dialogue sequence with metadata
 */
export interface AuthoredDialogue {
  id: string;
  title: string;
  author?: string;
  version?: string;
  lastUpdated?: string;
  description?: string;
  type: 'challenge' | 'introduction' | 'story' | 'tutorial';
  character: string;
  initialNodeId: string;
  nodes: AuthoredDialogueNode[];
  
  // Critical progression sequences
  criticalPath?: string[];
  
  // Knowledge concepts involved
  knowledgeDomains?: KnowledgeDomain[];
  primaryConcepts?: string[];
  
  // Editorial metadata
  status?: 'draft' | 'review' | 'final';
  notes?: string;
}

/**
 * Convert authored dialogue format to state machine format
 */
export function convertAuthoredDialogue(authored: AuthoredDialogue): {
  states: Record<string, DialogueState>;
  initialStateId: string;
  progressionCheckpoints: string[];
} {
  const states: Record<string, DialogueState> = {};
  
  // Create states from nodes
  authored.nodes.forEach(node => {
    // Map dialogue state type based on node properties
    let stateType: 'intro' | 'question' | 'response' | 'backstory' | 'conclusion' | 'critical-moment' | 'transition' = 
      node.isBackstory ? 'backstory' :
      node.isConclusion ? 'conclusion' :
      node.isCriticalPath ? 'critical-moment' :
      node.options && node.options.length > 0 ? 'question' :
      node.id === authored.initialNodeId ? 'intro' : 'transition';
    
    // Map options to state machine format
    const options: DialogueOption[] | undefined = node.options?.map(option => ({
      id: option.id,
      text: option.text,
      responseText: option.response,
      nextStateId: option.next,
      insightGain: option.insightGain,
      relationshipChange: option.relationshipChange,
      knowledgeGain: option.knowledgeGain,
      triggersBackstory: option.triggersBackstory,
      isCriticalPath: option.isCriticalPath,
      // Convert authored conditions to function
      condition: option.conditions ? createConditionFunction(option.conditions) : undefined
    }));
    
    // Create state
    states[node.id] = {
      id: node.id,
      type: stateType,
      text: node.text,
      options,
      nextStateId: node.next,
      isConclusion: node.isConclusion,
      isCriticalPath: node.isCriticalPath,
      isMandatory: node.isMandatory,
      // Convert entry/exit events if needed
      onEnter: createNodeEntryHandler(node),
      onExit: createNodeExitHandler(node)
    };
  });
  
  // Extract progression checkpoints
  const progressionCheckpoints = authored.criticalPath || 
    authored.nodes
      .filter(node => node.isCriticalPath)
      .map(node => node.id);
  
  return {
    states,
    initialStateId: authored.initialNodeId,
    progressionCheckpoints
  };
}

/**
 * Create a condition function from authored conditions
 */
function createConditionFunction(conditions: AuthoredCondition[]): (context: DialogueContext) => boolean {
  return (context: DialogueContext) => {
    // Check every condition
    return conditions.every(condition => evaluateCondition(condition, context));
  };
}

/**
 * Recursively evaluate a condition against the current context
 */
function evaluateCondition(condition: AuthoredCondition, context: DialogueContext): boolean {
  switch (condition.type) {
    case 'relationship':
      if (!condition.relationship) return true;
      
      const relationshipValue = context[`relationship_${condition.relationship.character}`] || 0;
      const minCheck = condition.relationship.min === undefined || relationshipValue >= condition.relationship.min;
      const maxCheck = condition.relationship.max === undefined || relationshipValue <= condition.relationship.max;
      return minCheck && maxCheck;
      
    case 'knowledge':
      if (!condition.knowledge) return true;
      
      const knowledgeValue = context.knowledgeGained[condition.knowledge.conceptId] || 0;
      return condition.knowledge.minLevel === undefined || knowledgeValue >= condition.knowledge.minLevel;
      
    case 'item':
      if (!condition.item) return true;
      
      const hasItem = (context.inventory || []).includes(condition.item.id);
      return condition.item.hasItem === hasItem;
      
    case 'flags':
      if (!condition.flag) return true;
      
      const flagValue = context[condition.flag.id];
      return flagValue === condition.flag.value;
      
    case 'contextValue':
      if (!condition.contextValue) return true;
      
      const value = context[condition.contextValue.key];
      
      // Handle different operators
      if (!condition.contextValue.operator || condition.contextValue.operator === '==') {
        return value === condition.contextValue.value;
      } else if (condition.contextValue.operator === '!=') {
        return value !== condition.contextValue.value;
      } else if (condition.contextValue.operator === '>') {
        return value > condition.contextValue.value;
      } else if (condition.contextValue.operator === '<') {
        return value < condition.contextValue.value;
      } else if (condition.contextValue.operator === '>=') {
        return value >= condition.contextValue.value;
      } else if (condition.contextValue.operator === '<=') {
        return value <= condition.contextValue.value;
      }
      
      return false;
      
    // Compound conditions
    case 'and':
      if (!condition.and) return true;
      return condition.and.every(c => evaluateCondition(c, context));
      
    case 'or':
      if (!condition.or) return true;
      return condition.or.some(c => evaluateCondition(c, context));
      
    default:
      return true;
  }
}

/**
 * Create an entry handler for node-specific logic
 */
function createNodeEntryHandler(node: AuthoredDialogueNode): ((context: DialogueContext) => void) | undefined {
  // Only create handler if needed
  if (!node.teachingPoints && !node.equipment) {
    return undefined;
  }
  
  return (context: DialogueContext) => {
    // Track teaching points in context
    if (node.teachingPoints) {
      node.teachingPoints.forEach(point => {
        if (!context.teachingPoints) {
          context.teachingPoints = [];
        }
        context.teachingPoints.push({
          conceptId: point.conceptId,
          domain: point.domain,
          importance: point.importance
        });
      });
    }
    
    // Track equipment references
    if (node.equipment) {
      if (!context.equipment) {
        context.equipment = [];
      }
      context.equipment.push(node.equipment.id);
    }
  };
}

/**
 * Create an exit handler for node-specific cleanup
 */
function createNodeExitHandler(node: AuthoredDialogueNode): ((context: DialogueContext) => void) | undefined {
  // Only create handler if needed for specific node types
  if (!node.isCriticalPath) {
    return undefined;
  }
  
  return (context: DialogueContext) => {
    // Mark critical path progress
    if (node.isCriticalPath) {
      context.criticalPathProgress[`node-${node.id}`] = true;
    }
  };
}

/**
 * Example of the authoring format using JSON
 */
export const EXAMPLE_AUTHORED_DIALOGUE: AuthoredDialogue = {
  id: "kapoor-calibration-101",
  title: "Dr. Kapoor's Initial Calibration",
  author: "Medical Physics Writers Team",
  version: "1.0.2",
  lastUpdated: "2025-03-15",
  description: "Initial calibration dialogue with Dr. Kapoor that introduces core concepts and grants the journal",
  type: "introduction",
  character: "kapoor",
  initialNodeId: "intro",
  
  // Critical path markers
  criticalPath: ["calibration-explanation", "journal-presentation"],
  
  // Knowledge domains involved
  knowledgeDomains: ["radiation-physics", "clinical-practice"],
  primaryConcepts: ["electron_equilibrium_understood", "output_calibration_tolerance"],
  
  nodes: [
    {
      id: "intro",
      character: "kapoor",
      text: "Good morning. I see you've arrived precisely on schedule. I'm conducting the monthly output measurements on LINAC 2. Since this is your first day, observing proper protocol will be instructive.",
      tags: ["introduction", "tutorial", "day1"],
      equipment: {
        id: "linac",
        description: "LINAC 2, the Varian TrueBeam used primarily for head and neck treatments."
      },
      emotion: "professional",
      options: [
        {
          id: "humble-intro",
          text: "I'm looking forward to learning the procedures.",
          response: "A positive attitude toward learning is the foundation of good practice. Let's begin with the fundamentals.",
          next: "basics",
          approach: "humble",
          insightGain: 5,
          relationshipChange: 1
        },
        {
          id: "confident-intro",
          text: "I've done calibrations before during my internship.",
          response: "Previous experience is useful, but each facility has specific protocols. I'd advise against assuming familiarity prematurely.",
          next: "basics",
          approach: "confidence",
          relationshipChange: -1
        }
      ]
    },
    
    // More nodes would be defined here...
    
    {
      id: "journal-presentation",
      character: "kapoor",
      text: "Every medical physicist must maintain meticulous records. This journal will serve you throughout your residency. Use it to document observations, track your knowledge development, and maintain procedural notes.",
      equipment: {
        id: "journal",
        description: "A high-quality leather journal with the hospital's medical physics department emblem."
      },
      isCriticalPath: true,
      isConclusion: true,
      teachingPoints: [
        {
          conceptId: "documentation_practice",
          domain: "clinical-practice",
          importance: "primary"
        }
      ]
    }
  ],
  
  status: "final"
};

/**
 * Validates an authored dialogue for common issues
 */
export function validateAuthoredDialogue(dialogue: AuthoredDialogue): { 
  valid: boolean; 
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check for required fields
  if (!dialogue.id) errors.push("Missing dialogue ID");
  if (!dialogue.character) errors.push("Missing character ID");
  if (!dialogue.initialNodeId) errors.push("Missing initial node ID");
  if (!dialogue.nodes || dialogue.nodes.length === 0) errors.push("No dialogue nodes defined");
  
  // Check for existence of initial node
  const initialNodeExists = dialogue.nodes.some(node => node.id === dialogue.initialNodeId);
  if (!initialNodeExists) errors.push(`Initial node '${dialogue.initialNodeId}' not found in nodes list`);
  
  // Check for critical path nodes existence
  if (dialogue.criticalPath) {
    dialogue.criticalPath.forEach(nodeId => {
      const nodeExists = dialogue.nodes.some(node => node.id === nodeId);
      if (!nodeExists) errors.push(`Critical path node '${nodeId}' not found in nodes list`);
    });
  }
  
  // Check for unresolved next references
  dialogue.nodes.forEach(node => {
    if (node.next) {
      const nextNodeExists = dialogue.nodes.some(n => n.id === node.next);
      if (!nextNodeExists) errors.push(`Node '${node.id}' references nonexistent next node '${node.next}'`);
    }
    
    // Check options for unresolved next references
    node.options?.forEach(option => {
      if (option.next) {
        const nextNodeExists = dialogue.nodes.some(n => n.id === option.next);
        if (!nextNodeExists) errors.push(`Option '${option.id}' in node '${node.id}' references nonexistent next node '${option.next}'`);
      }
    });
  });
  
  // Check for nodes that can't be reached
  const reachableNodes = new Set<string>();
  
  // Start with initial node
  reachableNodes.add(dialogue.initialNodeId);
  
  // Keep adding nodes until no new nodes are found
  let prevSize = 0;
  while (prevSize !== reachableNodes.size) {
    prevSize = reachableNodes.size;
    
    // Find nodes reachable from current set
    reachableNodes.forEach(nodeId => {
      const node = dialogue.nodes.find(n => n.id === nodeId);
      if (!node) return;
      
      // Add next node if exists
      if (node.next) reachableNodes.add(node.next);
      
      // Add option destinations
      node.options?.forEach(option => {
        if (option.next) reachableNodes.add(option.next);
      });
    });
  }
  
  // Check for unreachable nodes
  dialogue.nodes.forEach(node => {
    if (!reachableNodes.has(node.id)) {
      warnings.push(`Node '${node.id}' is unreachable from the initial node`);
    }
  });
  
  // Check for terminal nodes (no way to continue)
  dialogue.nodes.forEach(node => {
    const isTerminal = !node.next && (!node.options || node.options.length === 0);
    if (isTerminal && !node.isConclusion) {
      warnings.push(`Node '${node.id}' is a dead end (no next node or options) but not marked as conclusion`);
    }
  });
  
  // Basic validation complete
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Simple string serialization of the authored format (for export/editor use)
 */
export function serializeDialogue(dialogue: AuthoredDialogue): string {
  // For now, just stringify the JSON with good formatting
  return JSON.stringify(dialogue, null, 2);
}

/**
 * Parse authored dialogue from string
 */
export function parseDialogue(text: string): { dialogue?: AuthoredDialogue; errors: string[] } {
  try {
    const dialogue = JSON.parse(text) as AuthoredDialogue;
    const validation = validateAuthoredDialogue(dialogue);
    
    return {
      dialogue: validation.valid ? dialogue : undefined,
      errors: [...validation.errors, ...validation.warnings]
    };
  } catch (e) {
    return {
      errors: [`Failed to parse dialogue: ${e instanceof Error ? e.message : String(e)}`]
    };
  }
}

// Export everything needed to use the authoring format
export default {
  convertAuthoredDialogue,
  validateAuthoredDialogue,
  serializeDialogue,
  parseDialogue,
  EXAMPLE_AUTHORED_DIALOGUE
};