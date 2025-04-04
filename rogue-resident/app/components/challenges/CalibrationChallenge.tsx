// app/components/challenges/CalibrationChallenge.tsx
'use client';
import { useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useChallengeStore } from '../../store/challengeStore';
import { useJournalStore } from '../../store/journalStore';
import ConversationFormat, { InteractionResults } from './formats/ConversationFormat';
import { DialogueStage } from '../../hooks/useDialogueFlow';
import { CharacterId } from '../../types/challenge';
import { 
  useEventBus, 
  GameEventType, 
  journalAcquired, 
  knowledgeGained
} from '../../core/events/CentralEventBus';

interface CalibrationChallengeProps {
  character: CharacterId;
}

export default function CalibrationChallenge({ character }: CalibrationChallengeProps) {
  const { currentNodeId } = useGameStore();
  const { completeChallenge } = useChallengeStore();
  const { hasJournal } = useJournalStore();
  
  // Subscribe to journal acquisition events to monitor progression
  useEffect(() => {
    // Set up listener for journal acquisition events
    const unsubscribe = useEventBus.getState().subscribe<GameEventType.JOURNAL_ACQUIRED>(
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
  
  // Handle completion of the challenge
  const handleCompletion = (results: InteractionResults) => {
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
    
    // Log final completion analytics
    useEventBus.getState().dispatch(GameEventType.UI_BUTTON_CLICKED, {
      componentId: 'calibrationChallenge',
      action: 'challengeCompleted',
      metadata: {
        nodeId: currentNodeId,
        character,
        relationshipScore: results.relationshipChange,
        journalTier: results.journalTier,
        insightGained: results.insightGained,
        knowledgeGained: Object.keys(results.knowledgeGained).length,
        grade
      }
    });
  };
  
  // Character-specific dialogue data with critical path markings
  const dialogueData: Record<CharacterId, DialogueStage[]> = {
    'kapoor': [
      // Core Dialogue Stages 
      {
        id: 'intro',
        text: "Good morning. I see you've arrived precisely on schedule. I'm conducting the monthly output measurements on LINAC 2. Since this is your first day, observing proper protocol will be instructive.",
        contextNote: "Kapoor adjusts the ionization chamber position with methodical precision, not looking up as you enter.",
        equipment: {
          itemId: "linac",
          alt: "Linear Accelerator",
          description: "LINAC 2, the Varian TrueBeam used primarily for head and neck treatments."
        },
        isMandatory: true, // Must be visited for proper progression
        options: [
          { 
            id: "humble-intro",
            text: "I'm looking forward to learning the procedures.", 
            nextStageId: 'basics',
            approach: 'humble',
            insightGain: 5,
            relationshipChange: 1,
            responseText: "A positive attitude toward learning is the foundation of good practice. Let's begin with the fundamentals."
          },
          { 
            id: "confident-intro",
            text: "I've done calibrations before during my internship.", 
            nextStageId: 'basics',
            approach: 'confidence',
            insightGain: 0,
            relationshipChange: -1,
            responseText: "Previous experience is useful, but each facility has specific protocols. I'd advise against assuming familiarity prematurely."
          }
        ]
      },
      
      // Stage 1: Basic calibration setup
      {
        id: 'basics',
        text: "We'll start with the basics. I've set up our calibrated farmer chamber at isocenter with proper buildup. Can you recall why we use buildup material?",
        contextNote: "Kapoor gestures to the ionization chamber positioned in a water-equivalent phantom.",
        equipment: {
          itemId: 'farmer-chamber',
          alt: "Farmer Chamber",
          description: "A calibrated Farmer-type ionization chamber with PMMA buildup cap."
        },
        isMandatory: true, // Must be visited for proper progression
        options: [
          { 
            id: "correct-buildup",
            text: "To ensure we're measuring in the region of electronic equilibrium.", 
            nextStageId: 'correction-factors',
            approach: 'precision',
            insightGain: 15,
            relationshipChange: 1,
            knowledgeGain: { 
              conceptId: 'electron_equilibrium_understood',
              domainId: 'radiation-physics',
              amount: 15
            },
            isCriticalPath: true, // Mark as critical path option
            responseText: "Precisely. Electronic equilibrium is essential for accurate dosimetry. The buildup material ensures charged particle equilibrium at the measurement point."
          },
          { 
            id: "engaged-learner",
            text: "I understand the general concept, but could you elaborate on how it applies specifically to this setup?",
            nextStageId: 'correction-factors',
            approach: 'humble',
            insightGain: 10,
            relationshipChange: 1,
            knowledgeGain: { 
              conceptId: 'electron_equilibrium_understood',
              domainId: 'radiation-physics',
              amount: 10
            },
            responseText: "A fair question. In this specific setup, we're using a 6MV beam where the depth of dose maximum is approximately 1.5cm. The buildup cap ensures our measuring point is at equilibrium rather than in the buildup region."
          },
          { 
            id: "partial-buildup",
            text: "To filter out unwanted radiation scatter.", 
            nextStageId: 'correction-factors',
            approach: 'confidence',
            insightGain: 5,
            relationshipChange: 0,
            knowledgeGain: { 
              conceptId: 'electron_equilibrium_understood',
              domainId: 'radiation-physics',
              amount: 5
            },
            responseText: "Not quite. While buildup does affect scatter, its primary purpose is to establish electronic equilibrium. The scatter component is actually an integral part of what we need to measure."
          }
        ]
      },
      
      // Only including a small portion of the dialogue stages for brevity
      // Additional stages would be defined here...
      
      // Journal presentation - critical progression state
      {
        id: 'journal-presentation',
        text: "Every medical physicist must maintain meticulous records. This journal will serve you throughout your residency. Use it to document observations, track your knowledge development, and maintain procedural notes.",
        contextNote: "Kapoor retrieves a leather-bound journal and opens to the first page.",
        isCriticalPath: true, // Mark as critical path state
        isConclusion: true
      }
    ],
    
    // Other character dialogue trees would be here...
    'jesse': [],
    'quinn': [],
    'garcia': []
  };
  
  return (
    <ConversationFormat
      character={character}
      dialogueStages={dialogueData[character] || dialogueData.kapoor}
      onComplete={handleCompletion}
    />
  );
}