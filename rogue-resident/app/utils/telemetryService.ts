// app/utils/telemetryService.ts
/**
 * Enhanced Telemetry Service
 * 
 * A comprehensive telemetry system for tracking player interactions
 * with a special focus on narrative engagement and progression.
 * 
 * Inspired by Supergiant's approach to telemetry in Hades, this system
 * collects rich data that can be used to better understand player behavior
 * and optimize the narrative experience.
 */

import { 
    useEventBus, 
    GameEventType,
    dialogueCriticalPath
  } from '../core/events/CentralEventBus';
  import { CharacterId } from '../types/challenge';
  import { DialogueOption } from '../hooks/useDialogueFlow';
  import { loadCriticalPathStages, isStageOnCriticalPath } from './dialogueLoader';
  
  // Enhanced payload types for detailed dialogue telemetry
  export interface DialogueOptionsAnalytics {
    options: {
      id: string;
      text: string;
      selected: boolean;
      approach?: 'humble' | 'precision' | 'confidence';
      insightGain?: number;
      relationshipChange?: number;
      knowledgeGains?: {
        conceptId: string;
        domainId: string;
        amount: number;
      }[];
      isCriticalPath?: boolean;
    }[];
    timestamp: number;
    timeSpent?: number; // Time spent on this dialogue step
    playerScore?: number;
  }
  
  export interface DialogueProgressionAnalytics {
    dialogueId: string;
    characterId: CharacterId;
    nodeId: string;
    stagesVisited: {
      id: string;
      timestamp: number;
      timeSpent: number;
      isCompletionStep: boolean;
      isCriticalPath: boolean;
    }[];
    criticalPathCompletion: {
      requiredStages: string[];
      visitedStages: string[];
      completionPercentage: number;
      completedAll: boolean;
    };
    knowledgeGained: {
      conceptId: string;
      domainId: string;
      amount: number;
      timestamp: number;
    }[];
    sessionStatistics: {
      totalSessionTime: number;
      totalOptions: number;
      totalOptionsSelected: number;
      finalPlayerScore: number;
      approachCounts: Record<string, number>;
      insightGained: number;
    };
  }
  
  // Helper functions for telemetry collection
  
  /**
   * Track a dialogue option selection with enhanced analytics
   * 
   * @param dialogueId Unique identifier for the dialogue
   * @param stageId Current dialogue stage ID
   * @param option The selected dialogue option
   * @param allOptions All available options at this stage
   * @param playerScore Current player score/relationship value
   * @param characterId The character being interacted with
   * @param nodeId The current node ID
   */
  export function trackDialogueOptionSelected(
    dialogueId: string,
    stageId: string,
    option: DialogueOption,
    allOptions: DialogueOption[],
    playerScore: number,
    characterId: CharacterId,
    nodeId: string
  ): void {
    // Create analytics payload with rich data about all options
    const optionsData = allOptions.map(opt => ({
      id: opt.id,
      text: opt.text,
      selected: opt.id === option.id,
      approach: opt.approach,
      insightGain: opt.insightGain,
      relationshipChange: opt.relationshipChange,
      knowledgeGains: opt.knowledgeGain ? [opt.knowledgeGain] : undefined,
      isCriticalPath: opt.isCriticalPath
    }));
    
    // Calculate critical path progress
    const criticalPathStages = loadCriticalPathStages(dialogueId);
    const isOptionCriticalPath = option.isCriticalPath || false;
    
    // Dispatch detailed analytics event
    useEventBus.getState().dispatch(GameEventType.DIALOGUE_OPTION_SELECTED, {
      optionId: option.id,
      stageId,
      dialogueId,
      character: characterId,
      nodeId,
      optionsData,
      playerScore,
      timestamp: Date.now(),
      isOptionCriticalPath,
      criticalPathContext: {
        totalCriticalPathStages: criticalPathStages.length,
        currentStageIsCriticalPath: isStageOnCriticalPath(dialogueId, stageId)
      },
      insightGain: option.insightGain || 0,
      relationshipChange: option.relationshipChange || 0,
      knowledgeGain: option.knowledgeGain
    });
    
    // If this is a critical path option, track it separately for progression analysis
    if (isOptionCriticalPath) {
      dialogueCriticalPath(
        dialogueId,
        characterId,
        nodeId,
        stageId,
        playerScore,
        false // Not a repair
      );
    }
  }
  
  /**
   * Track a dialogue stage transition with timing data
   * 
   * @param dialogueId Unique identifier for the dialogue
   * @param fromStageId Previous stage ID
   * @param toStageId New stage ID
   * @param timeSpent Time spent on previous stage (ms)
   * @param characterId The character being interacted with
   * @param nodeId The current node ID
   */
  export function trackDialogueStageChange(
    dialogueId: string,
    fromStageId: string,
    toStageId: string,
    timeSpent: number,
    characterId: CharacterId,
    nodeId: string
  ): void {
    // Calculate critical path information
    const criticalPathStages = loadCriticalPathStages(dialogueId);
    const fromStageIsCritical = isStageOnCriticalPath(dialogueId, fromStageId);
    const toStageIsCritical = isStageOnCriticalPath(dialogueId, toStageId);
    
    // Dispatch stage change event with enhanced data
    useEventBus.getState().dispatch(GameEventType.UI_BUTTON_CLICKED, {
      componentId: 'dialogueFlow',
      action: 'stageTransition',
      metadata: {
        dialogueId,
        fromStageId,
        toStageId,
        timeSpent,
        characterId,
        nodeId,
        timestamp: Date.now(),
        criticalPathData: {
          fromStageIsCritical,
          toStageIsCritical,
          allCriticalPathStages: criticalPathStages
        }
      }
    });
  }
  
  /**
   * Track full dialogue completion with comprehensive analytics
   * 
   * @param dialogueId Unique identifier for the dialogue
   * @param characterId The character being interacted with
   * @param nodeId The current node ID
   * @param visitedStages Array of all visited stage IDs with timestamps
   * @param knowledgeGained Knowledge gained during this dialogue
   * @param finalPlayerScore Final relationship/player score
   * @param approachCounts Count of different dialogue approaches used
   * @param totalInsightGained Total insight gained in this dialogue
   * @param totalSessionTime Total time spent in this dialogue session
   */
  export function trackDialogueCompletion(
    dialogueId: string,
    characterId: CharacterId,
    nodeId: string,
    visitedStages: Array<{id: string, timestamp: number, timeSpent: number}>,
    knowledgeGained: Array<{conceptId: string, domainId: string, amount: number, timestamp: number}>,
    finalPlayerScore: number,
    approachCounts: Record<string, number>,
    totalInsightGained: number,
    totalSessionTime: number
  ): void {
    // Get critical path information
    const criticalPathStages = loadCriticalPathStages(dialogueId);
    const visitedCriticalStages = visitedStages
      .filter(stage => isStageOnCriticalPath(dialogueId, stage.id))
      .map(stage => stage.id);
    
    // Calculate completion percentage
    const criticalPathCompletion = criticalPathStages.length > 0
      ? (visitedCriticalStages.length / criticalPathStages.length) * 100
      : 100;
    
    // Create comprehensive analytics payload
    const progressionAnalytics: DialogueProgressionAnalytics = {
      dialogueId,
      characterId,
      nodeId,
      stagesVisited: visitedStages.map(stage => ({
        ...stage,
        isCompletionStep: stage.id.includes('conclusion') || stage.id.includes('presentation'),
        isCriticalPath: isStageOnCriticalPath(dialogueId, stage.id)
      })),
      criticalPathCompletion: {
        requiredStages: criticalPathStages,
        visitedStages: visitedCriticalStages,
        completionPercentage: criticalPathCompletion,
        completedAll: visitedCriticalStages.length >= criticalPathStages.length
      },
      knowledgeGained,
      sessionStatistics: {
        totalSessionTime,
        totalOptions: visitedStages.length, // Approximate
        totalOptionsSelected: visitedStages.length - 1, // Approximate
        finalPlayerScore,
        approachCounts,
        insightGained: totalInsightGained
      }
    };
    
    // Dispatch detailed completion event
    useEventBus.getState().dispatch(GameEventType.DIALOGUE_COMPLETED, {
      dialogueId,
      characterId,
      nodeId,
      progressionAnalytics,
      timestamp: Date.now(),
      result: {
        playerScore: finalPlayerScore,
        criticalPathCompletion,
        visitedStages: visitedStages.map(stage => stage.id),
        knowledgeGained: knowledgeGained.reduce((acc, curr) => {
          acc[curr.conceptId] = curr.amount;
          return acc;
        }, {} as Record<string, number>),
        totalInsightGained,
        journalTier: finalPlayerScore >= 3 ? 'annotated' : 
                     finalPlayerScore >= 0 ? 'technical' : 'base'
      }
    });
  }
  
  /**
   * Track user time spent reading or considering dialogue
   * 
   * @param dialogueId Unique identifier for the dialogue
   * @param stageId Current dialogue stage ID
   * @param timeSpentMs Time spent on current stage in milliseconds
   * @param characterId The character being interacted with
   * @param isResponsePhase Whether this is the response phase of dialogue
   */
  export function trackDialogueReadingTime(
    dialogueId: string,
    stageId: string,
    timeSpentMs: number,
    characterId: CharacterId,
    isResponsePhase: boolean = false
  ): void {
    // Only track significant time periods (>2 seconds)
    if (timeSpentMs < 2000) return;
    
    useEventBus.getState().dispatch(GameEventType.UI_BUTTON_CLICKED, {
      componentId: 'dialogueFlow',
      action: 'readingTimeTracked',
      metadata: {
        dialogueId,
        stageId,
        timeSpentMs,
        characterId,
        isResponsePhase,
        timestamp: Date.now()
      }
    });
  }
  
  /**
   * Track when a player engages with a narrative backstory segment
   * 
   * @param dialogueId Unique identifier for the dialogue
   * @param backstoryId ID of the backstory segment
   * @param characterId The character whose backstory is being revealed
   * @param timeSpentMs Time spent viewing the backstory
   */
  export function trackBackstoryEngagement(
    dialogueId: string,
    backstoryId: string,
    characterId: CharacterId,
    timeSpentMs: number
  ): void {
    useEventBus.getState().dispatch(GameEventType.UI_BUTTON_CLICKED, {
      componentId: 'dialogueFlow',
      action: 'backstoryViewed',
      metadata: {
        dialogueId,
        backstoryId,
        characterId,
        timeSpentMs,
        timestamp: Date.now()
      }
    });
  }
  
  /**
   * Track dialogue flow validation issues
   * 
   * @param dialogueId Unique identifier for the dialogue
   * @param characterId The character being interacted with
   * @param nodeId The current node ID
   * @param issues Array of identified issues
   * @param wasFatalError Whether the issue prevented progression
   */
  export function trackDialogueValidationIssue(
    dialogueId: string,
    characterId: CharacterId,
    nodeId: string,
    issues: string[],
    wasFatalError: boolean
  ): void {
    useEventBus.getState().dispatch(GameEventType.UI_BUTTON_CLICKED, {
      componentId: 'dialogueFlow',
      action: 'validationIssueDetected',
      metadata: {
        dialogueId,
        characterId,
        nodeId,
        issues,
        wasFatalError,
        timestamp: Date.now()
      }
    });
  }
  
  // Export convenience functions
  export default {
    trackDialogueOptionSelected,
    trackDialogueStageChange,
    trackDialogueCompletion,
    trackDialogueReadingTime,
    trackBackstoryEngagement,
    trackDialogueValidationIssue
  };