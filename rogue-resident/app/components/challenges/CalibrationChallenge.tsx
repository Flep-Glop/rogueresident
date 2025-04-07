// app/components/challenges/CalibrationChallenge.tsx
'use client';
import { useEffect, useState, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useChallengeStore } from '../../store/challengeStore';
import { useJournalStore } from '../../store/journalStore';
import ConversationFormat, { InteractionResults } from './formats/ConversationFormat';
import { DialogueStage } from '../../hooks/useDialogueFlow';
import { CharacterId } from '../../types/challenge';
import { 
  useEventBus, 
  journalAcquired, 
  knowledgeGained
} from '../../core/events/CentralEventBus';
import { GameEventType } from '../../core/events/EventTypes';
// Import the dialogue loader to access centralized dialogue content
import { loadDialogueContent } from '../../utils/dialogueLoader';
import telemetryService from '../../utils/telemetryService';

// Import the createKapoorCalibrationFlow to use the formal dialogue state machine
import { createKapoorCalibrationFlow } from '../../core/dialogue/DialogueStateMachine';

interface CalibrationChallengeProps {
  character: CharacterId;
}

export default function CalibrationChallenge({ character }: CalibrationChallengeProps) {
  const { currentNodeId } = useGameStore();
  const { completeChallenge } = useChallengeStore();
  const { hasJournal } = useJournalStore();
  const [initializationComplete, setInitializationComplete] = useState(false);
  const prevNodeIdRef = useRef(currentNodeId);

  
  // Track session start time for telemetry
  const sessionStartTime = useRef(Date.now());
  const [dialogueStages, setDialogueStages] = useState<DialogueStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Track crucial metrics for telemetry
  const visitedStages = useRef<Array<{id: string, timestamp: number, timeSpent: number}>>([]);
  const knowledgeGained = useRef<Array<{conceptId: string, domainId: string, amount: number, timestamp: number}>>([]);
  const approachCounts = useRef<Record<string, number>>({});
  const totalInsightGained = useRef(0);
  const playerScore = useRef(0);
  
  // Load dialogue content from centralized repository
  useEffect(() => {
    if (prevNodeIdRef.current === currentNodeId && dialogueStages.length > 0) {
      setLoading(false);
      return;
    }
    
    prevNodeIdRef.current = currentNodeId;
    // Get dialogue type based on character
    const dialogueType = 'calibration';
    
    // Load dialogue content
    const { stages, loadingState, error } = loadDialogueContent(character, dialogueType);
    
    if (loadingState === 'error') {
      console.error('Failed to load dialogue content:', error);
      setError(error);
      setLoading(false);
      return;
    }
    
    if (stages.length === 0) {
      console.warn(`No dialogue stages found for ${character}, type: ${dialogueType}`);
      setError(`No dialogue content available for ${character}.`);
      setLoading(false);
      return;
    }
    
    // Set dialogue stages
    setDialogueStages(stages);
    setLoading(false);
    
    // Log successful dialogue content loading
    useEventBus.getState().dispatch(GameEventType.UI_BUTTON_CLICKED, {
      componentId: 'calibrationChallenge',
      action: 'dialogueContentLoaded',
      metadata: {
        character,
        nodeId: currentNodeId,
        dialogueType,
        stageCount: stages.length
      }
    });
    
    // Record session start in telemetry
    sessionStartTime.current = Date.now();
  }, [character, currentNodeId]);
  
  // Use the robust dialogue flow for critical progressions
  useEffect(() => {
    if (character === 'kapoor' && currentNodeId && !initializationComplete && dialogueStages.length > 0) {
      // Initialize the Kapoor dialogue flow with proper progression path
      const kapoorFlow = createKapoorCalibrationFlow(currentNodeId);
      
      // Log initialization
      console.log(`[CalibrationChallenge] Initialized Kapoor dialogue flow: ${kapoorFlow.id}`);
      
      // Mark initialization complete
      setInitializationComplete(true);
      
      // Log event for monitoring
      useEventBus.getState().dispatch(GameEventType.UI_BUTTON_CLICKED, {
        componentId: 'calibrationChallenge',
        action: 'flowInitialized',
        metadata: {
          character,
          nodeId: currentNodeId,
          flowId: kapoorFlow.id,
          hasJournal,
          dialogueStageCount: dialogueStages.length
        }
      });
    }
  }, [character, currentNodeId, initializationComplete, hasJournal, dialogueStages]);
  
  // Subscribe to journal acquisition events to monitor progression
  useEffect(() => {
    // Set up listener for journal acquisition events
    const unsubscribe = useEventBus.getState().subscribe(
      GameEventType.JOURNAL_ACQUIRED,
      (event) => {
        const { tier, character: sourceCharacter, source } = event.payload;
        
        console.log(`[JOURNAL] Acquisition event received: ${tier} from ${sourceCharacter} (source: ${source})`);
        
        // Log acquisition through the event system to help with telemetry
        if (hasJournal) {
          useEventBus.getState().dispatch(
            GameEventType.UI_JOURNAL_OPENED,
            {
              initial: false,
              tier,
              characterSource: sourceCharacter,
              status: 'already_acquired'
            }
          );
        }
      }
    );
    
    // Cleanup subscription
    return () => unsubscribe();
  }, [hasJournal]);
  
  // Track option selection for telemetry
  const trackOptionSelection = (option: any, stageId: string) => {
    // Update approach counts
    if (option.approach) {
      approachCounts.current[option.approach] = (approachCounts.current[option.approach] || 0) + 1;
    }
    
    // Update player score
    if (option.relationshipChange) {
      playerScore.current += option.relationshipChange;
    }
    
    // Update total insight gained
    if (option.insightGain) {
      totalInsightGained.current += option.insightGain;
    }
    
    // Track knowledge gains
    if (option.knowledgeGain) {
      knowledgeGained.current.push({
        ...option.knowledgeGain,
        timestamp: Date.now()
      });
    }
  };
  
  // Track stage changes for telemetry
  const trackStageChange = (newStageId: string, prevStageId: string) => {
    const timestamp = Date.now();
    const lastStageVisit = visitedStages.current.find(visit => visit.id === prevStageId);
    const timeSpent = lastStageVisit 
      ? timestamp - lastStageVisit.timestamp
      : 0;
    
    // Track stage visit
    visitedStages.current.push({
      id: newStageId,
      timestamp,
      timeSpent
    });
    
    // Use telemetry service to track stage change
    if (currentNodeId) {
      telemetryService.trackDialogueStageChange(
        `${character}-calibration`,
        prevStageId,
        newStageId,
        timeSpent,
        character,
        currentNodeId
      );
    }
  };
  
  // Handle completion of the challenge
  const handleCompletion = (results: InteractionResults) => {
    // Log that we're in the completion handler
    console.log(`[CalibrationChallenge] handleCompletion called with results:`, {
      character,
      relationshipChange: results.relationshipChange,
      journalTier: results.journalTier,
      knowledgeGained: Object.keys(results.knowledgeGained).length
    });
    
    // Determine challenge grade based on results
    const grade = results.relationshipChange >= 3 ? 'S' : 
                  results.relationshipChange >= 1 ? 'A' : 
                  results.relationshipChange >= 0 ? 'B' : 'C';
    
    // For the Kapoor challenge, trigger journal acquisition through central event system
    if (character === 'kapoor') {
      // The progression guarantor will handle ensuring the journal is acquired
      journalAcquired(
        results.journalTier || 'base',
        character,
        'challenge_completion'
      );
      
      // Log that we're triggering journal acquisition
      console.log(`[CalibrationChallenge] Triggering journal acquisition: ${results.journalTier || 'base'}`);
    }
    
    // Log concept mastery data
    if (currentNodeId) {
      // Use event system for knowledge gain
      Object.entries(results.knowledgeGained).forEach(([conceptId, amount]) => {
        knowledgeGained(
          conceptId,
          amount,
          'radiation-physics',
          character
        );
      });
    }
    
    // Complete the challenge in the challenge store
    completeChallenge(grade);
    
    // Calculate total session time
    const totalSessionTime = Date.now() - sessionStartTime.current;
    
    // Log comprehensive completion analytics
    if (currentNodeId) {
      telemetryService.trackDialogueCompletion(
        `${character}-calibration`,
        character,
        currentNodeId,
        visitedStages.current,
        knowledgeGained.current,
        playerScore.current,
        approachCounts.current,
        totalInsightGained.current,
        totalSessionTime
      );
    }
    
    // Log more basic completion event for backward compatibility
    useEventBus.getState().dispatch(GameEventType.CHALLENGE_COMPLETED, {
      nodeId: currentNodeId,
      character,
      relationshipScore: results.relationshipChange,
      journalTier: results.journalTier,
      insightGained: results.insightGained,
      grade,
      sessionDuration: totalSessionTime
    });
  };
  
  // Show loading state
  if (loading) {
    return <div className="p-6 bg-surface pixel-borders">Loading calibration challenge...</div>;
  }
  
  // Show error state
  if (error) {
    return <div className="p-6 bg-surface pixel-borders text-warning">Error: {error}</div>;
  }
  
  return (
    <ConversationFormat
      character={character}
      dialogueStages={dialogueStages}
      onComplete={handleCompletion}
      onOptionSelected={trackOptionSelection}
      onStageChange={trackStageChange}
      dialogueId={`${character}-calibration`}
    />
  );
}