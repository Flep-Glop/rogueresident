// app/core/progression/ProgressionService.ts
/**
 * Progression Service - Ensures critical progression paths are maintained
 * 
 * This service tracks key game progression states and provides repair mechanisms
 * to prevent players from entering unwinnable states.
 * 
 * Moved from CentralEventBus to maintain proper separation of concerns.
 */

import { create } from 'zustand';
import { 
  GameEventType,
  JournalAcquisitionPayload,
  NodeCompletionPayload,
  DialogueCriticalPathPayload,
  DialogueProgressionRepairPayload,
  ProgressionRepairPayload
} from '../events/EventTypes';
import { useEventBus } from '../events/CentralEventBus';

// ======== Progression State Interface ========

interface ProgressionState {
  // Journal acquisition tracking
  journalAcquired: boolean;
  journalAcquisitionTime: number | null;
  journalTier: 'base' | 'technical' | 'annotated' | null;
  journalSource: string | null;
  
  // Dialogue progression tracking
  kapoorCalibrationCompleted: boolean;
  kapoorJournalAcquisitionTriggered: boolean;
  
  // Dialogue repair tracking
  dialogueRepairAttempts: Record<string, number>;
  
  // Node completion tracking
  completedNodes: Set<string>;
}

interface ProgressionServiceState extends ProgressionState {
  // Core methods
  initialize: () => void;
  teardown: () => void;
  
  // Progression guarantee methods
  ensureCriticalProgression: () => boolean;
  ensureJournalAcquisition: (character?: string) => boolean;
  ensureDialogueProgression: (dialogueId: string, characterId: string, nodeId: string) => boolean;
}

// Create the progression service store
export const useProgressionService = create<ProgressionServiceState>((set, get) => ({
  // Initial state
  journalAcquired: false,
  journalAcquisitionTime: null,
  journalTier: null,
  journalSource: null,
  kapoorCalibrationCompleted: false,
  kapoorJournalAcquisitionTriggered: false,
  dialogueRepairAttempts: {},
  completedNodes: new Set(),
  
  // Initialize service by connecting to event bus
  initialize: () => {
    const eventBus = useEventBus.getState();
    
    // Listen for journal acquisition
    const unsubJournal = eventBus.subscribe<JournalAcquisitionPayload>(
      GameEventType.JOURNAL_ACQUIRED,
      (event) => {
        const { tier, character, source } = event.payload;
        
        // Update progression state
        set({
          journalAcquired: true,
          journalAcquisitionTime: Date.now(),
          journalTier: tier,
          journalSource: source
        });
        
        console.log(`[ProgressionService] Journal acquired: ${tier} from ${character}`);
      }
    );
    
    // Listen for node completion
    const unsubNode = eventBus.subscribe<NodeCompletionPayload>(
      GameEventType.NODE_COMPLETED,
      (event) => {
        const { nodeId, character, result } = event.payload;
        
        set(state => {
          // Track completed node
          const updatedCompletedNodes = new Set(state.completedNodes);
          if (nodeId) {
            updatedCompletedNodes.add(nodeId);
          }
          
          // Detect Kapoor calibration completion
          let kapoorCalibrationCompleted = state.kapoorCalibrationCompleted;
          if (character === 'kapoor' && nodeId?.includes('calibration')) {
            kapoorCalibrationCompleted = true;
          }
          
          return {
            completedNodes: updatedCompletedNodes,
            kapoorCalibrationCompleted
          };
        });
        
        // Check for journal acquisition
        if (result?.isJournalAcquisition && !get().journalAcquired) {
          // Auto-trigger journal acquisition if not already done
          const tier = result.journalTier as 'base' | 'technical' | 'annotated' || 'base';
          eventBus.dispatch<JournalAcquisitionPayload>(
            GameEventType.JOURNAL_ACQUIRED,
            {
              tier,
              character: character || 'kapoor',
              source: 'node_completion_auto_trigger'
            }
          );
        }
      }
    );
    
    // Listen for dialogue critical path events
    const unsubDialogue = eventBus.subscribe<DialogueCriticalPathPayload>(
      GameEventType.DIALOGUE_CRITICAL_PATH,
      (event) => {
        const { criticalStateId, characterId, playerScore } = event.payload;
        
        // For Kapoor journal presentation
        if (criticalStateId === 'journal-presentation' && characterId === 'kapoor') {
          set({ kapoorJournalAcquisitionTriggered: true });
          
          // If journal hasn't been acquired yet, trigger it
          if (!get().journalAcquired) {
            // Determine journal tier based on player score
            const tier = playerScore >= 3 ? 'annotated' :
                         playerScore >= 0 ? 'technical' : 'base';
                         
            eventBus.dispatch<JournalAcquisitionPayload>(
              GameEventType.JOURNAL_ACQUIRED,
              {
                tier,
                character: characterId,
                source: 'dialogue_critical_path'
              }
            );
          }
        }
      }
    );
    
    // Listen for dialogue progression repair events
    const unsubRepair = eventBus.subscribe<DialogueProgressionRepairPayload>(
      GameEventType.DIALOGUE_PROGRESSION_REPAIR,
      (event) => {
        const { dialogueId, characterId, toStateId } = event.payload;
        
        // Track repair attempts
        set(state => {
          const dialogueKey = `${dialogueId}-${characterId}`;
          const currentAttempts = state.dialogueRepairAttempts[dialogueKey] || 0;
          
          return {
            dialogueRepairAttempts: {
              ...state.dialogueRepairAttempts,
              [dialogueKey]: currentAttempts + 1
            }
          };
        });
        
        // If this is Kapoor dialogue and repairing to journal-presentation,
        // and we haven't triggered journal acquisition yet, do it now
        if (characterId === 'kapoor' && 
            toStateId === 'journal-presentation' &&
            !get().journalAcquired) {
          
          eventBus.dispatch<JournalAcquisitionPayload>(
            GameEventType.JOURNAL_ACQUIRED,
            {
              tier: 'base', // Default to base tier during repair
              character: 'kapoor',
              source: 'dialogue_repair_auto_trigger',
              forced: true
            }
          );
        }
      }
    );
    
    // Return unsubscribe function
    return () => {
      unsubJournal();
      unsubNode();
      unsubDialogue();
      unsubRepair();
    };
  },
  
  // Teardown event listeners
  teardown: () => {
    // This will be implemented when we have subscription refs
    console.log('[ProgressionService] Teardown called');
  },
  
  // Enhanced critical progression guarantees
  ensureCriticalProgression: () => {
    const state = get();
    let repairsPerformed = false;
    
    // Check for critical progression inconsistencies
    
    // 1. Journal acquisition after Kapoor calibration
    if (state.kapoorCalibrationCompleted && !state.journalAcquired) {
      console.warn('[ProgressionService] Critical inconsistency: Missing journal after Kapoor calibration');
      
      // Dispatch repair event
      useEventBus.getState().dispatch<ProgressionRepairPayload>(
        GameEventType.PROGRESSION_REPAIR,
        {
          checkpointId: 'journal-acquisition',
          description: 'Journal not acquired after calibration completion',
          forced: true
        }
      );
      
      // Force journal acquisition
      useEventBus.getState().dispatch<JournalAcquisitionPayload>(
        GameEventType.JOURNAL_ACQUIRED,
        {
          tier: 'base',
          character: 'kapoor',
          source: 'progression_repair_auto_trigger',
          forced: true
        }
      );
      
      repairsPerformed = true;
    }
    
    return repairsPerformed;
  },
  
  // Journal acquisition guarantee
  ensureJournalAcquisition: (character: string = 'kapoor') => {
    if (!get().journalAcquired) {
      console.warn(`[ProgressionService] Journal not acquired, forcing acquisition from ${character}`);
      
      // Force journal acquisition
      useEventBus.getState().dispatch<JournalAcquisitionPayload>(
        GameEventType.JOURNAL_ACQUIRED,
        {
          tier: 'base',
          character,
          source: 'ensure_journal_acquisition_call',
          forced: true
        }
      );
      
      return true; // Repairs were performed
    }
    
    return false; // No repairs needed
  },
  
  // Dialogue progression guarantee
  ensureDialogueProgression: (dialogueId: string, characterId: string, nodeId: string) => {
    // Track if repairs were performed
    let repairsPerformed = false;
    
    // Kapoor journal acquisition verification
    if (characterId === 'kapoor' && !get().kapoorJournalAcquisitionTriggered) {
      console.warn(`[ProgressionService] Kapoor journal dialogue progression not triggered for ${dialogueId}`);
      
      // Dispatch critical path event
      useEventBus.getState().dispatch<DialogueCriticalPathPayload>(
        GameEventType.DIALOGUE_CRITICAL_PATH,
        {
          dialogueId,
          characterId,
          nodeId,
          criticalStateId: 'journal-presentation',
          playerScore: 0, // Default to neutral score
          wasRepaired: true
        }
      );
      
      // Trigger journal acquisition
      useEventBus.getState().dispatch<JournalAcquisitionPayload>(
        GameEventType.JOURNAL_ACQUIRED,
        {
          tier: 'base',
          character: characterId,
          source: 'ensure_dialogue_progression_call',
          forced: true
        }
      );
      
      repairsPerformed = true;
    }
    
    return repairsPerformed;
  }
}));

// Initialize the progression service
export function setupProgressionService() {
  // Initialize progression service when game starts
  const unsubscribe = useEventBus.getState().subscribe(
    GameEventType.SESSION_STARTED,
    () => {
      useProgressionService.getState().initialize();
    }
  );
  
  // Listen for session end to clean up
  useEventBus.getState().subscribe(
    GameEventType.SESSION_ENDED,
    () => {
      useProgressionService.getState().teardown();
      unsubscribe();
    }
  );
  
  return useProgressionService.getState().initialize;
}

// Export public progression guarantee methods
export function ensureCriticalProgression() {
  return useProgressionService.getState().ensureCriticalProgression();
}

export function ensureJournalAcquisition(character: string = 'kapoor') {
  return useProgressionService.getState().ensureJournalAcquisition(character);
}

export function ensureDialogueProgression(
  dialogueId: string,
  characterId: string,
  nodeId: string
) {
  return useProgressionService.getState().ensureDialogueProgression(dialogueId, characterId, nodeId);
}

export default {
  useProgressionService,
  setupProgressionService,
  ensureCriticalProgression,
  ensureJournalAcquisition,
  ensureDialogueProgression
};
