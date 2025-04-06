// app/core/events/dialogueEventHandlers.ts
/**
 * Dialogue Event Handlers
 * 
 * Centralizes all side effects of dialogue-related events in the system.
 * This pattern separates event reactions from the event sources, allowing
 * for greater flexibility in how dialogue impacts other game systems.
 * 
 * This approach mirrors how we handled NPC interactions in Hades, where
 * dialogue could trigger weapon upgrades, relationship gains, and narrative
 * progression independent of the dialogue system itself.
 */

import { GameEventType } from './EventTypes';
import { useEventBus } from './CentralEventBus';
import { useGameStore } from '../../store/gameStore';
import { useKnowledgeStore } from '../../store/knowledgeStore';
import { useGameStateMachine } from '../statemachine/GameStateMachine';
import { useJournalStore } from '../../store/journalStore'; // Added import for journal store
import { playSoundEffect, flashScreen } from './CentralEventBus';

// Dialogue option selection payload
interface DialogueOptionPayload {
  optionId: string;
  stageId?: string;
  insightGain?: number;
  relationshipChange?: number;
  character?: string;
  knowledgeGain?: {
    conceptId: string;
    domainId: string;
    amount: number;
  };
  isCriticalPath?: boolean;
}

// Journal acquisition payload
interface JournalAcquisitionPayload {
  tier: 'base' | 'technical' | 'annotated';
  character: string;
  source: string;
  nodeId?: string;
}

/**
 * Initialize all dialogue event handlers
 * 
 * These handlers respond to dialogue events and perform appropriate side effects
 * like updating player stats, revealing knowledge, and progressing the narrative.
 */
export function initializeDialogueEventHandlers() {
  const eventBus = useEventBus.getState();
  
  // Track subscriptions for cleanup
  const subscriptions: (() => void)[] = [];
  
  // ======== Handle Dialogue Option Selection ========
  subscriptions.push(
    eventBus.subscribe<DialogueOptionPayload>(
      GameEventType.DIALOGUE_OPTION_SELECTED, 
      (event) => {
        const { optionId, insightGain, relationshipChange, knowledgeGain, character } = event.payload;
        
        // Apply insight gain to player
        if (insightGain && insightGain > 0) {
          useGameStore.getState().updateInsight(insightGain);
          
          // Visual feedback for significant gains
          if (insightGain >= 10) {
            playSoundEffect('success', 0.8);
            flashScreen('green', 300);
          } else if (insightGain > 0) {
            playSoundEffect('click', 0.5);
          }
        }
        
        // Apply character relationship changes
        if (relationshipChange && character) {
          useGameStore.getState().updateRelationship(character, relationshipChange);
          
          // Visual feedback for relationship changes
          if (relationshipChange > 0) {
            playSoundEffect('relationship-up', 0.6);
          } else if (relationshipChange < 0) {
            playSoundEffect('relationship-down', 0.6);
          }
        }
        
        // Apply knowledge gain
        if (knowledgeGain && knowledgeGain.conceptId) {
          useKnowledgeStore.getState().updateMastery(
            knowledgeGain.conceptId,
            knowledgeGain.amount
          );
          
          // Add to pending insights for night phase
          if (knowledgeGain.amount > 0) {
            // We should log the knowledge gain event here
            eventBus.dispatch(GameEventType.KNOWLEDGE_GAINED, {
              conceptId: knowledgeGain.conceptId,
              amount: knowledgeGain.amount,
              domainId: knowledgeGain.domainId,
              source: `dialogue_option:${optionId}`,
              character
            });
          }
        }
        
        console.log(`[DialogueEventHandlers] Processed option selection: ${optionId}`);
      }
    )
  );
  
  // ======== Handle Journal Acquisition ========
  subscriptions.push(
    eventBus.subscribe<JournalAcquisitionPayload>(
      GameEventType.JOURNAL_ACQUIRED,
      (event) => {
        const { tier, character, source, nodeId } = event.payload;
        
        // Initialize journal using the proper method from journalStore
        // FIXED: Use proper method from journalStore instead of non-existent addJournal
        useJournalStore.getState().initializeJournal(tier);
        
        // Mark node as a journal acquisition if node ID provided
        if (nodeId) {
          useGameStore.getState().completeNode(nodeId, {
            relationshipChange: 1, // Slight bonus
            journalTier: tier,
            isJournalAcquisition: true
          });
        }
        
        // Play effects based on journal tier
        switch (tier) {
          case 'annotated':
            playSoundEffect('rare-item', 1.0);
            flashScreen('blue', 500);
            break;
          case 'technical':
            playSoundEffect('uncommon-item', 0.8);
            flashScreen('green', 400);
            break;
          case 'base':
            playSoundEffect('common-item', 0.6);
            break;
        }
        
        console.log(`[DialogueEventHandlers] Journal acquired: ${tier} from ${character}`);
        
        // Check if this is a critical progression event
        if (character === 'kapoor' && source.includes('dialogue')) {
          // This is a major progression point - might trigger a state change
          const gameState = useGameStateMachine.getState();
          
          // Check if we're in day phase and this completes a required step
          if (gameState.gamePhase === 'day' && !gameState.isDayComplete()) {
            // Mark a special node as completed for progression
            gameState.markNodeCompleted('journal-acquisition');
          }
        }
      }
    )
  );
  
  // ======== Handle Dialogue Completion ========
  subscriptions.push(
    eventBus.subscribe(
      GameEventType.DIALOGUE_COMPLETED,
      (event) => {
        const { flowId, completed, character, nodeId } = event.payload;
        
        // Only handle successful completions
        if (!completed) return;
        
        // Check if this completes an important node
        if (nodeId) {
          const nodeResult = {
            dialogueCompleted: true
          };
          
          // Mark node as completed
          useGameStore.getState().completeNode(nodeId, nodeResult);
          
          // Also notify state machine directly
          useGameStateMachine.getState().markNodeCompleted(nodeId);
        }
        
        console.log(`[DialogueEventHandlers] Dialogue completed: ${flowId}`);
      }
    )
  );
  
  // ======== Handle Critical Path Events ========
  subscriptions.push(
    eventBus.subscribe(
      GameEventType.DIALOGUE_CRITICAL_PATH,
      (event) => {
        const { dialogueId, characterId, criticalStateId, playerScore } = event.payload;
        
        // Process specific critical path events
        if (criticalStateId === 'journal-presentation' && characterId === 'kapoor') {
          // Determine journal tier based on player performance
          const journalTier = playerScore >= 3 ? 'annotated' : 
                             playerScore >= 0 ? 'technical' : 'base';
          
          // Dispatch journal acquisition event
          eventBus.dispatch(GameEventType.JOURNAL_ACQUIRED, {
            tier: journalTier,
            character: characterId,
            source: `dialogue:${dialogueId}:${criticalStateId}`
          });
          
          console.log(`[DialogueEventHandlers] Critical dialogue path: journal presentation (${journalTier})`);
        }
        
        // Add other critical path handling here as needed
      }
    )
  );
  
  console.log('[DialogueEventHandlers] Initialized dialogue event handlers');
  
  // Return cleanup function
  return () => {
    // Remove all subscriptions
    subscriptions.forEach(unsubscribe => unsubscribe());
    console.log('[DialogueEventHandlers] Teardown complete');
  };
}

/**
 * Setup dialogue event handlers for the application
 * Call this once during app initialization
 */
export function setupDialogueEventHandlers() {
  const cleanupFn = initializeDialogueEventHandlers();
  
  // Subscribe to session end to clean up
  const unsubscribe = useEventBus.getState().subscribe(
    GameEventType.SESSION_ENDED,
    () => {
      cleanupFn();
      unsubscribe();
    }
  );
  
  return {
    teardown: () => {
      cleanupFn();
      unsubscribe();
    }
  };
}

export default {
  initializeDialogueEventHandlers,
  setupDialogueEventHandlers
};