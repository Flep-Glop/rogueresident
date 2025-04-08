// app/components/challenges/ChallengeRouter.tsx
'use client';
import { useState, useEffect, useMemo } from 'react';
import { useGameStore } from '@/app/store/gameStore';
import { useJournalStore } from '@/app/store/journalStore';
import { useKnowledgeStore } from '@/app/store/knowledgeStore';
import { useEventBus } from '@/app/core/events/CentralEventBus';
import { GameEventType } from '@/app/core/events/EventTypes';
import ConversationFormat from './formats/ConversationFormat';
import { createKapoorCalibrationFlow } from '@/app/core/dialogue/DialogueStateMachine';
import kapoorCalibrationDialogue from '@/app/data/dialogues/calibrations/kapoor-calibration';

/**
 * Challenge Router - Simplified for Vertical Slice
 * 
 * This version focuses exclusively on the critical path of Dr. Kapoor's
 * calibration conversation and journal acquisition. All other challenge
 * types have been stripped out.
 */
export default function ChallengeRouter() {
  const { currentNodeId, completeNode, updateInsight, setCurrentNode } = useGameStore();
  const { initializeJournal } = useJournalStore();
  const { updateMastery, discoverConcept } = useKnowledgeStore();
  
  // Local state
  const [challengeComplete, setChallengeComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Prepare dialogue content with fallback mechanisms
  const dialogueStages = useMemo(() => {
    try {
      // First attempt: Try to create a flow via the factory
      const flow = createKapoorCalibrationFlow(currentNodeId || 'kapoor-calibration');
      
      // Validate flow structure
      if (flow && flow.stages && Array.isArray(flow.stages) && flow.stages.length > 0) {
        console.log("✅ Generated flow stages successfully:", flow.stages.length);
        return flow.stages;
      }
      
      console.warn("⚠️ Flow factory returned invalid structure, falling back to direct import");
      
      // Fallback: Use directly imported dialogue content
      if (kapoorCalibrationDialogue && Array.isArray(kapoorCalibrationDialogue) && 
          kapoorCalibrationDialogue.length > 0) {
        console.log("✅ Using direct dialogue import:", kapoorCalibrationDialogue.length);
        return kapoorCalibrationDialogue;
      }
      
      // Last resort: Create a minimal dialogue to ensure critical path progression
      console.error("🚨 All dialogue sources failed, using emergency minimal dialogue");
      return [
        {
          id: 'emergency-intro',
          text: "Good morning. I see you've arrived for your first day. Let's get started with the basics of medical physics.",
          contextNote: "Dr. Kapoor adjusts some equipment as you enter.",
          options: [
            { 
              id: "continue",
              text: "I'm ready to learn.", 
              nextStageId: 'emergency-journal',
              insightGain: 10,
              relationshipChange: 1
            }
          ]
        },
        {
          id: 'emergency-journal',
          type: 'critical-moment',
          text: "You'll need this journal to document your observations and track your progress through the residency.",
          contextNote: "Dr. Kapoor hands you a leather-bound journal.",
          isConclusion: true
        }
      ];
    } catch (err) {
      // Capture any unexpected errors
      console.error("Error preparing dialogue content:", err);
      setError(`Failed to prepare dialogue: ${err instanceof Error ? err.message : String(err)}`);
      
      // Return minimal content to avoid breaking the UI
      return [{
        id: 'error-recovery',
        text: "System initializing... please stand by.",
        isConclusion: true
      }];
    }
  }, [currentNodeId]);
  
  // Reset challenge state when node changes
  useEffect(() => {
    setChallengeComplete(false);
    setError(null);
  }, [currentNodeId]);
  
  // Handle conversation completion - CRITICAL PATH
  const handleConversationComplete = (results: any) => {
    try {
      console.log("✅ Conversation complete with results:", results);
      
      // Mark knowledge gain - radiation dosimetry concept for the vertical slice
      updateMastery('radiation-dosimetry', 25);
      discoverConcept('radiation-dosimetry');
      
      // CRITICAL PATH: Journal acquisition
      if (!useJournalStore.getState().hasJournal) {
        try {
          console.log("📓 Initializing journal with tier:", results.journalTier);
          initializeJournal(results.journalTier || 'technical');
          
          // Log journal acquisition
          useEventBus.getState().dispatch(
            GameEventType.JOURNAL_ACQUIRED,
            {
              tier: results.journalTier || 'technical',
              character: 'kapoor',
              source: 'conversation_completion'
            },
            'challengeRouter'
          );
        } catch (journalError) {
          console.error("⚠️ Journal initialization failed:", journalError);
          
          // RESILIENCE: Force journal acquisition as fallback
          setTimeout(() => {
            try {
              if (!useJournalStore.getState().hasJournal) {
                console.warn("⚠️ Emergency journal acquisition fallback");
                initializeJournal('technical');
              }
            } catch (e) {
              console.error("💥 Critical failure in journal acquisition:", e);
            }
          }, 100);
        }
      }
      
      // Award insight points
      updateInsight(results.insightGained || 10);
      
      // Mark node as completed - important for progression
      completeNode(currentNodeId || 'kapoor-calibration');
      setChallengeComplete(true);
      
      // Return to map after a short delay
      setTimeout(() => {
        setCurrentNode(null);
      }, 1500);
    } catch (error) {
      console.error("Error handling conversation completion:", error);
      setError(error instanceof Error ? error.message : String(error));
      
      // RESILIENCE: Still mark node as complete even if something fails
      try {
        completeNode(currentNodeId || 'kapoor-calibration');
        
        // Force journal acquisition as ultimate fallback
        if (!useJournalStore.getState().hasJournal) {
          initializeJournal('technical');
        }
        
        // Return to map
        setTimeout(() => {
          setCurrentNode(null);
        }, 1500);
      } catch (e) {
        console.error("Critical failure in completion handling:", e);
      }
    }
  };
  
  // Handle error state
  if (error) {
    return (
      <div className="p-8 bg-red-900/20 max-w-2xl mx-auto my-12 rounded">
        <h2 className="text-2xl mb-4">Challenge Error</h2>
        <div className="bg-black/30 p-4 rounded mb-4">{error}</div>
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded"
          onClick={() => setCurrentNode(null)}
        >
          Return to Map
        </button>
      </div>
    );
  }
  
  // Handle completed state
  if (challengeComplete) {
    return (
      <div className="p-8 max-w-2xl mx-auto my-12 text-center">
        <h2 className="text-2xl mb-4">Challenge Complete!</h2>
        <div className="animate-pulse text-6xl mb-6">✨</div>
        <p className="mb-6">Returning to map...</p>
      </div>
    );
  }
  
  // For vertical slice, we're hardcoding to a conversation with Dr. Kapoor
  return (
    <div className="p-4 flex justify-center items-center min-h-full bg-background">
      <div className="max-w-3xl w-full">
        <ConversationFormat
          character="kapoor"
          dialogueStages={dialogueStages} // Using our hardened dialogue stages
          dialogueId={currentNodeId || 'kapoor-calibration'}
          onComplete={handleConversationComplete}
          onOptionSelected={(option, stageId) => {
            // Log for analytics
            try {
              useEventBus.getState().dispatch(
                GameEventType.DIALOGUE_OPTION_SELECTED,
                {
                  optionId: option.id,
                  stageId,
                  character: 'kapoor'
                },
                'challengeRouter'
              );
            } catch (e) {
              // Non-critical, continue even if logging fails
              console.debug("Event logging failed:", e);
            }
          }}
          stateMachineEnabled={true}
        />
      </div>
    </div>
  );
}