// app/components/challenges/ChallengeRouter.tsx
'use client';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useGameStore } from '@/app/store/gameStore';
import { useJournalStore } from '@/app/store/journalStore';
import { useKnowledgeStore } from '@/app/store/knowledgeStore';
import { useEventBus } from '@/app/core/events/CentralEventBus';
import { GameEventType } from '@/app/core/events/EventTypes';
import ConversationFormat from './formats/ConversationFormat';
import { createKapoorCalibrationFlow } from '@/app/core/dialogue/DialogueStateMachine';
import kapoorCalibrationDialogue from '@/app/data/dialogues/calibrations/kapoor-calibration';
import { 
  usePrimitiveStoreValue, 
  useStableStoreValue,
  useStableMemo 
} from '@/app/core/utils/storeHooks';

/**
 * Challenge Router - Refactored for Chamber Transition Pattern
 * 
 * Implements Chamber Pattern principles:
 * 1. Extract primitive values only from stores
 * 2. Use stable function references
 * 3. Optimize rendering lifecycle
 * 4. Provide graceful recovery paths
 */
export default function ChallengeRouter() {
  // Component mount ref to prevent state updates after unmount
  const isMountedRef = useRef(true);
  
  // ===== PRIMITIVE VALUE EXTRACTION =====
  // Direct primitive values from game store
  const currentNodeId = usePrimitiveStoreValue(
    useGameStore,
    state => state.currentNodeId,
    null
  );
  
  // ===== STABLE FUNCTION REFERENCES =====
  // Extract actions with stable references
  const gameActions = useStableStoreValue(
    useGameStore,
    state => ({
      completeNode: state.completeNode,
      updateInsight: state.updateInsight,
      setCurrentNode: state.setCurrentNode
    })
  );
  
  const journalActions = useStableStoreValue(
    useJournalStore,
    state => ({
      initializeJournal: state.initializeJournal,
      hasJournal: state.hasJournal
    })
  );
  
  const knowledgeActions = useStableStoreValue(
    useKnowledgeStore,
    state => ({
      updateMastery: state.updateMastery,
      discoverConcept: state.discoverConcept
    })
  );
  
  const eventBusDispatch = useStableStoreValue(
    useEventBus,
    state => state.dispatch
  );
  
  // Safely extract functions with fallbacks
  const { 
    completeNode = (id) => console.warn(`completeNode not available for ${id}`),
    updateInsight = (val) => console.warn(`updateInsight not available for ${val}`),
    setCurrentNode = (id) => console.warn(`setCurrentNode not available for ${id}`)
  } = gameActions;
  
  const {
    initializeJournal = (tier) => console.warn(`initializeJournal not available for ${tier}`),
    hasJournal = false
  } = journalActions;
  
  const {
    updateMastery = (id, val) => console.warn(`updateMastery not available for ${id}, ${val}`),
    discoverConcept = (id) => console.warn(`discoverConcept not available for ${id}`)
  } = knowledgeActions;
  
  // ===== LOCAL STATE =====
  // Use atomic state model
  const [localState, setLocalState] = useState({
    challengeComplete: false,
    error: null,
    journalAcquired: false,
    recoveryAttempted: false
  });
  
  // Safe state updater
  const updateLocalState = useCallback((updates) => {
    if (isMountedRef.current) {
      setLocalState(prev => ({ ...prev, ...updates }));
    }
  }, []);
  
  // ===== STABLE DIALOGUE DATA =====
  // Prepare dialogue content with fallback mechanisms
  const dialogueStages = useStableMemo(() => {
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
      const errorMessage = err instanceof Error ? err.message : String(err);
      
      // Use error callback instead of directly setting state
      updateLocalState({ error: errorMessage });
      
      // Return minimal content to avoid breaking the UI
      return [{
        id: 'error-recovery',
        text: "System initializing... please stand by.",
        isConclusion: true
      }];
    }
  }, [currentNodeId, updateLocalState]);
  
  // ===== LIFECYCLE EFFECTS =====
  // Reset challenge state when node changes
  useEffect(() => {
    updateLocalState({
      challengeComplete: false,
      error: null
    });
  }, [currentNodeId, updateLocalState]);
  
  // Mount/unmount tracking
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  // ===== EVENT HANDLERS =====
  // Handle conversation completion - CRITICAL PATH
  const handleConversationComplete = useCallback((results) => {
    try {
      if (!isMountedRef.current) return;
      
      console.log("✅ Conversation complete with results:", results);
      
      // Mark knowledge gain - radiation dosimetry concept for the vertical slice
      updateMastery('radiation-dosimetry', 25);
      discoverConcept('radiation-dosimetry');
      
      // CRITICAL PATH: Journal acquisition
      if (!hasJournal) {
        try {
          console.log("📓 Initializing journal with tier:", results.journalTier);
          initializeJournal(results.journalTier || 'technical');
          
          // Update local tracking only after successful action
          updateLocalState({ journalAcquired: true });
          
          // Log journal acquisition
          if (eventBusDispatch) {
            eventBusDispatch(
              GameEventType.JOURNAL_ACQUIRED,
              {
                tier: results.journalTier || 'technical',
                character: 'kapoor',
                source: 'conversation_completion'
              },
              'challengeRouter'
            );
          }
        } catch (journalError) {
          console.error("⚠️ Journal initialization failed:", journalError);
          
          // RESILIENCE: Force journal acquisition as fallback
          if (!localState.recoveryAttempted) {
            setTimeout(() => {
              try {
                if (isMountedRef.current && !hasJournal) {
                  console.warn("⚠️ Emergency journal acquisition fallback");
                  initializeJournal('technical');
                  updateLocalState({ 
                    journalAcquired: true,
                    recoveryAttempted: true
                  });
                }
              } catch (e) {
                console.error("💥 Critical failure in journal acquisition:", e);
              }
            }, 100);
          }
        }
      }
      
      // Award insight points
      updateInsight(results.insightGained || 10);
      
      // Mark node as completed - important for progression
      completeNode(currentNodeId || 'kapoor-calibration');
      updateLocalState({ challengeComplete: true });
      
      // Return to map after a short delay
      setTimeout(() => {
        if (isMountedRef.current) {
          setCurrentNode(null);
        }
      }, 1500);
    } catch (error) {
      console.error("Error handling conversation completion:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      updateLocalState({ error: errorMessage });
      
      // RESILIENCE: Still mark node as complete even if something fails
      try {
        completeNode(currentNodeId || 'kapoor-calibration');
        
        // Force journal acquisition as ultimate fallback
        if (!hasJournal && !localState.journalAcquired) {
          initializeJournal('technical');
          updateLocalState({ journalAcquired: true });
        }
        
        // Return to map
        setTimeout(() => {
          if (isMountedRef.current) {
            setCurrentNode(null);
          }
        }, 1500);
      } catch (e) {
        console.error("Critical failure in completion handling:", e);
      }
    }
  }, [
    currentNodeId, 
    completeNode, 
    updateInsight, 
    setCurrentNode, 
    updateMastery, 
    discoverConcept, 
    initializeJournal, 
    hasJournal, 
    eventBusDispatch, 
    localState.recoveryAttempted, 
    localState.journalAcquired,
    updateLocalState
  ]);
  
  // Handle dialogue option selection - Stable callback
  const handleOptionSelected = useCallback((option, stageId) => {
    // Log for analytics
    try {
      if (eventBusDispatch) {
        eventBusDispatch(
          GameEventType.DIALOGUE_OPTION_SELECTED,
          {
            optionId: option.id,
            stageId,
            character: 'kapoor'
          },
          'challengeRouter'
        );
      }
    } catch (e) {
      // Non-critical, continue even if logging fails
      console.debug("Event logging failed:", e);
    }
  }, [eventBusDispatch]);
  
  // Handle error recovery
  const handleErrorRetry = useCallback(() => {
    updateLocalState({
      error: null,
      recoveryAttempted: true
    });
    
    // Return to map on retry failure
    setTimeout(() => {
      if (isMountedRef.current && localState.error) {
        setCurrentNode(null);
      }
    }, 2000);
  }, [localState.error, setCurrentNode, updateLocalState]);
  
  // ===== RENDER LOGIC =====
  // Handle error state
  if (localState.error) {
    return (
      <div className="p-8 bg-red-900/20 max-w-2xl mx-auto my-12 rounded">
        <h2 className="text-2xl mb-4">Challenge Error</h2>
        <div className="bg-black/30 p-4 rounded mb-4">{localState.error}</div>
        <div className="flex gap-4">
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded"
            onClick={handleErrorRetry}
          >
            Retry
          </button>
          <button
            className="px-4 py-2 bg-gray-600 text-white rounded"
            onClick={() => setCurrentNode(null)}
          >
            Return to Map
          </button>
        </div>
      </div>
    );
  }
  
  // Handle completed state
  if (localState.challengeComplete) {
    return (
      <div className="p-8 max-w-2xl mx-auto my-12 text-center">
        <h2 className="text-2xl mb-4">Challenge Complete!</h2>
        <div className="animate-pulse text-6xl mb-6">✨</div>
        <p className="mb-6">Returning to map...</p>
      </div>
    );
  }
  
  // Render conversation component
  return (
    <div className="p-4 flex justify-center items-center min-h-full bg-background">
      <div className="max-w-3xl w-full">
        <ConversationFormat
          character="kapoor"
          dialogueStages={dialogueStages} // Using stableMemo dialogue stages
          dialogueId={currentNodeId || 'kapoor-calibration'}
          onComplete={handleConversationComplete}
          onOptionSelected={handleOptionSelected}
          stateMachineEnabled={true}
        />
      </div>
    </div>
  );
}