// app/components/challenges/ChallengeRouter.tsx
'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useGameStore } from '@/app/store/gameStore';
import { useJournalStore } from '@/app/store/journalStore';
import { useKnowledgeStore } from '@/app/store/knowledgeStore';
import { useEventSubscription } from '@/app/core/events/CentralEventBus';
import { GameEventType } from '@/app/core/events/EventTypes';
import ConversationFormat from './formats/ConversationFormat';
import { createKapoorCalibrationFlow } from '@/app/core/dialogue/DialogueStateMachine';
import kapoorCalibrationDialogue from '@/app/data/dialogues/calibrations/kapoor-calibration';
import { 
  usePrimitiveStoreValue, 
  useStableCallback
} from '@/app/core/utils/storeHooks';

/**
 * Challenge Router - Fully Chamber Pattern Compliant
 * 
 * This component routes the player to the appropriate challenge type
 * based on the selected node. It handles loading dialogue content,
 * tracking challenge completion, and managing journal acquisition.
 */
export default function ChallengeRouter() {
  // Component mount ref to prevent state updates after unmount
  const isMountedRef = useRef(true);
  const initTimeRef = useRef(Date.now());
  
  // ===== PRIMITIVE VALUE EXTRACTION =====
  // Direct primitive value from game store - critical for node selection
  const currentNodeId = usePrimitiveStoreValue(
    useGameStore,
    state => state.currentNodeId,
    null
  );
  
  // Check if journal exists
  const hasJournal = usePrimitiveStoreValue(
    useJournalStore,
    state => state.hasJournal,
    false
  );
  
  // ===== LOCAL STATE =====
  // Use atomic state model for better rendering optimization
  const [localState, setLocalState] = useState({
    challengeComplete: false,
    error: null,
    journalAcquired: false,
    recoveryAttempted: false,
    nodeDetailsFetched: false,
    debugInfo: {
      lastEvent: null,
      eventCount: 0,
      lastAttemptTime: null
    }
  });
  
  // Log component render for debugging
  console.log(`[ChallengeRouter] Rendering with nodeId: ${currentNodeId}, complete: ${localState.challengeComplete}`);
  
  // Safe state updater with mount check
  const updateLocalState = useStableCallback((updates) => {
    if (isMountedRef.current) {
      console.log('[ChallengeRouter] Updating local state:', updates);
      setLocalState(prev => ({ ...prev, ...updates }));
    }
  }, []);
  
  // ===== EVENT SUBSCRIPTION =====
  // Listen for node click events - this is critical for challenge activation
  useEventSubscription(
    [GameEventType.UI_NODE_CLICKED, GameEventType.NODE_CLICKED],
    (event) => {
      if (!isMountedRef.current) return;
      
      const payload = event.payload;
      const nodeId = payload?.nodeId;
      
      // Update debug info
      updateLocalState({
        debugInfo: {
          lastEvent: event.type,
          eventCount: localState.debugInfo.eventCount + 1,
          lastAttemptTime: new Date().toISOString()
        }
      });
      
      console.log(`[ChallengeRouter] Received node event: ${event.type} for node ${nodeId}, current node: ${currentNodeId}`);
      
      if (nodeId) {
        // Reset challenge state for new node
        updateLocalState({
          challengeComplete: false,
          error: null,
          nodeDetailsFetched: true
        });
      }
    }
  );
  
  // ===== STABLE DIALOGUE DATA =====
  // Prepare dialogue content with fallback mechanisms
  const dialogueStages = useMemo(() => {
    if (!currentNodeId) {
      console.log("[ChallengeRouter] No currentNodeId, returning empty dialogueStages");
      return [];
    }
    
    console.log(`[ChallengeRouter] Preparing dialogue for node ${currentNodeId}`);
    
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
    if (currentNodeId) {
      console.log(`[ChallengeRouter] Node changed to: ${currentNodeId}`);
      updateLocalState({
        challengeComplete: false,
        error: null,
        nodeDetailsFetched: true
      });
      
      // Get direct access to game store for debug event
      try {
        const gameStore = useGameStore.getState();
        if (gameStore && gameStore.emit) {
          gameStore.emit(GameEventType.DEBUG_COMMAND, {
            command: 'challenge:started',
            nodeId: currentNodeId
          });
        }
      } catch (e) {
        console.warn('[ChallengeRouter] Failed to emit debug event:', e);
      }
    } else {
      // Node cleared, reset state
      updateLocalState({
        nodeDetailsFetched: false
      });
    }
  }, [currentNodeId, updateLocalState]);
  
  // Mount/unmount tracking
  useEffect(() => {
    isMountedRef.current = true;
    console.log('[ChallengeRouter] Mounted');
    
    return () => {
      isMountedRef.current = false;
      console.log('[ChallengeRouter] Unmounted');
    };
  }, []);
  
  // Debug logging for empty dialogue
  useEffect(() => {
    if (currentNodeId && dialogueStages && dialogueStages.length === 0) {
      console.warn(`[ChallengeRouter] Empty dialogueStages for node ${currentNodeId}`);
    }
  }, [currentNodeId, dialogueStages]);
  
  // ===== EVENT HANDLERS =====
  // Handle conversation completion - CRITICAL PATH
  const handleConversationComplete = useStableCallback((results) => {
    try {
      if (!isMountedRef.current) return;
      
      console.log("✅ Conversation complete with results:", results);
      
      // Get direct access to stores
      const knowledgeStore = useKnowledgeStore.getState();
      const journalStore = useJournalStore.getState();
      const gameStore = useGameStore.getState();
      
      // Mark knowledge gain - radiation dosimetry concept for the vertical slice
      if (knowledgeStore && knowledgeStore.updateMastery && knowledgeStore.discoverConcept) {
        knowledgeStore.updateMastery('radiation-dosimetry', 25);
        knowledgeStore.discoverConcept('radiation-dosimetry');
        console.log('✅ Knowledge updated for radiation-dosimetry');
      } else {
        console.warn('⚠️ Knowledge store methods not available');
      }
      
      // CRITICAL PATH: Journal acquisition
      if (!hasJournal && journalStore && journalStore.initializeJournal) {
        try {
          console.log("📓 Initializing journal with tier:", results.journalTier);
          journalStore.initializeJournal(results.journalTier || 'technical');
          
          // Update local tracking only after successful action
          updateLocalState({ journalAcquired: true });
          
          // Log journal acquisition
          if (gameStore && gameStore.emit) {
            gameStore.emit(
              GameEventType.JOURNAL_ACQUIRED,
              {
                tier: results.journalTier || 'technical',
                character: 'kapoor',
                source: 'conversation_completion'
              }
            );
            console.log('✅ Journal acquisition event emitted');
          }
        } catch (journalError) {
          console.error("⚠️ Journal initialization failed:", journalError);
          
          // RESILIENCE: Force journal acquisition as fallback
          if (!localState.recoveryAttempted) {
            setTimeout(() => {
              try {
                if (isMountedRef.current && !hasJournal && journalStore.initializeJournal) {
                  console.warn("⚠️ Emergency journal acquisition fallback");
                  journalStore.initializeJournal('technical');
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
      if (gameStore && gameStore.updateInsight) {
        gameStore.updateInsight(results.insightGained || 10);
        console.log(`✅ Awarded ${results.insightGained || 10} insight points`);
      }
      
      // Mark node as completed - important for progression
      if (currentNodeId && gameStore && gameStore.completeNode) {
        gameStore.completeNode(currentNodeId);
        console.log(`✅ Marked node ${currentNodeId} as completed`);
      }
      
      updateLocalState({ challengeComplete: true });
      
      // Emit completion event to ensure other systems know
      if (gameStore && gameStore.emit) {
        gameStore.emit(GameEventType.CHALLENGE_COMPLETED, {
          nodeId: currentNodeId,
          result: results
        });
        console.log('✅ Challenge completion event emitted');
      }
      
      // Return to map after a short delay
      setTimeout(() => {
        if (isMountedRef.current && gameStore && gameStore.setCurrentNode) {
          gameStore.setCurrentNode(null);
          console.log('✅ Returning to map');
        }
      }, 1500);
    } catch (error) {
      console.error("Error handling conversation completion:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      updateLocalState({ error: errorMessage });
      
      // RESILIENCE: Still mark node as complete even if something fails
      try {
        const gameStore = useGameStore.getState();
        if (currentNodeId && gameStore && gameStore.completeNode) {
          gameStore.completeNode(currentNodeId);
          console.log(`⚠️ Emergency node completion for ${currentNodeId}`);
        }
        
        // Force journal acquisition as ultimate fallback
        const journalStore = useJournalStore.getState();
        if (!hasJournal && !localState.journalAcquired && journalStore && journalStore.initializeJournal) {
          journalStore.initializeJournal('technical');
          updateLocalState({ journalAcquired: true });
          console.log('⚠️ Emergency journal acquisition');
        }
        
        // Return to map
        setTimeout(() => {
          if (isMountedRef.current && gameStore && gameStore.setCurrentNode) {
            gameStore.setCurrentNode(null);
            console.log('⚠️ Emergency return to map');
          }
        }, 1500);
      } catch (e) {
        console.error("Critical failure in completion handling:", e);
      }
    }
  }, [
    currentNodeId, 
    hasJournal, 
    localState.journalAcquired,
    localState.recoveryAttempted,
    updateLocalState
  ]);
  
  // Handle dialogue option selection - Stable callback
  const handleOptionSelected = useStableCallback((option, stageId) => {
    // Log for analytics
    try {
      const gameStore = useGameStore.getState();
      if (gameStore && gameStore.emit) {
        gameStore.emit(
          GameEventType.DIALOGUE_OPTION_SELECTED,
          {
            optionId: option.id,
            stageId,
            character: 'kapoor'
          }
        );
        console.log(`✅ Option selected: ${option.id} at stage ${stageId}`);
      }
    } catch (e) {
      // Non-critical, continue even if logging fails
      console.debug("Event logging failed:", e);
    }
  }, []);
  
  // Handle error recovery
  const handleErrorRetry = useStableCallback(() => {
    updateLocalState({
      error: null,
      recoveryAttempted: true
    });
    
    // Return to map on retry failure
    setTimeout(() => {
      if (isMountedRef.current && localState.error) {
        const gameStore = useGameStore.getState();
        if (gameStore && gameStore.setCurrentNode) {
          gameStore.setCurrentNode(null);
        }
      }
    }, 2000);
  }, [localState.error, updateLocalState]);
  
  // ===== RENDER LOGIC =====
  // Log render decision factors
  console.log(`[ChallengeRouter] Render decision - nodeId: ${currentNodeId}, complete: ${localState.challengeComplete}, error: ${localState.error}, nodeDetailsFetched: ${localState.nodeDetailsFetched}, dialogueStages length: ${dialogueStages?.length || 0}`);
  
  // No current node selected - don't render anything
  if (!currentNodeId) {
    console.log('[ChallengeRouter] No currentNodeId - rendering null');
    return null;
  }
  
  // Handle error state
  if (localState.error) {
    console.log(`[ChallengeRouter] Showing error: ${localState.error}`);
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
            onClick={() => {
              const gameStore = useGameStore.getState();
              if (gameStore && gameStore.setCurrentNode) {
                gameStore.setCurrentNode(null);
              }
            }}
          >
            Return to Map
          </button>
        </div>
        
        {/* Debug Info */}
        <div className="mt-4 pt-4 border-t border-red-500/30 text-xs">
          <div>Running since: {new Date(initTimeRef.current).toLocaleTimeString()}</div>
          <div>Last event: {localState.debugInfo.lastEvent || 'none'}</div>
          <div>Event count: {localState.debugInfo.eventCount}</div>
          <div>Last attempt: {localState.debugInfo.lastAttemptTime || 'none'}</div>
        </div>
      </div>
    );
  }
  
  // Handle completed state
  if (localState.challengeComplete) {
    console.log('[ChallengeRouter] Showing completion screen');
    return (
      <div className="p-8 max-w-2xl mx-auto my-12 text-center">
        <h2 className="text-2xl mb-4">Challenge Complete!</h2>
        <div className="animate-pulse text-6xl mb-6">✨</div>
        <p className="mb-6">Returning to map...</p>
      </div>
    );
  }
  
  // Node details not fetched yet - show loading
  if (!localState.nodeDetailsFetched) {
    console.log('[ChallengeRouter] Showing loading screen - waiting for node details');
    return (
      <div className="p-8 max-w-2xl mx-auto my-12 text-center">
        <h2 className="text-2xl mb-4">Loading Challenge...</h2>
        <div className="animate-spin text-4xl inline-block mb-6">⚙️</div>
      </div>
    );
  }
  
  // No dialogue stages - show error
  if (!dialogueStages || dialogueStages.length === 0) {
    console.warn('[ChallengeRouter] No dialogue stages available');
    return (
      <div className="p-8 bg-red-900/20 max-w-2xl mx-auto my-12 rounded">
        <h2 className="text-2xl mb-4">No Dialogue Content</h2>
        <p className="mb-4">Could not load dialogue for this challenge.</p>
        <button
          className="px-4 py-2 bg-gray-600 text-white rounded"
          onClick={() => {
            const gameStore = useGameStore.getState();
            if (gameStore && gameStore.setCurrentNode) {
              gameStore.setCurrentNode(null);
            }
          }}
        >
          Return to Map
        </button>
        
        {/* Debug Info */}
        <div className="mt-4 pt-4 border-t border-red-500/30 text-xs">
          <div>Node ID: {currentNodeId}</div>
          <div>Dialogue Stages: {dialogueStages?.length || 0}</div>
          <div>Running since: {new Date(initTimeRef.current).toLocaleTimeString()}</div>
          <div>Last event: {localState.debugInfo.lastEvent || 'none'}</div>
          <div>Event count: {localState.debugInfo.eventCount}</div>
        </div>
      </div>
    );
  }
  
  // Render conversation component - fully Chamber Pattern compatible
  console.log('[ChallengeRouter] Rendering conversation with dialogueStages:', dialogueStages.length);
  return (
    <div className="p-4 flex justify-center items-center min-h-full bg-background">
      <div className="max-w-3xl w-full">
        <ConversationFormat
          character="kapoor"
          dialogueStages={dialogueStages}
          dialogueId={currentNodeId || 'kapoor-calibration'}
          onComplete={handleConversationComplete}
          onOptionSelected={handleOptionSelected}
          stateMachineEnabled={true}
        />
      </div>
    </div>
  );
}