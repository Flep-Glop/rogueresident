// app/core/progression/ProgressionGuarantee.ts
/**
 * Progression Guarantor System
 * 
 * This system provides multiple layers of protection for critical progression items
 * like the journal. It operates independently from the normal acquisition paths to
 * ensure that game-breaking progression issues cannot occur.
 * 
 * This pattern was developed for roguelikes like Hades to recover from state 
 * inconsistencies that can emerge in procedural systems.
 */

import React, { useEffect } from 'react';
import { gameEvents, GameEventType, useEventBus, ensureCriticalProgression } from '../events/GameEvents';
import { useJournalStore } from '../../store/journalStore';
import { useGameStore } from '../../store/gameStore';

// Define the node progress type for type safety
interface NodeProgress {
  id: string;
  completed: boolean;
  grade?: 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
  timestamp?: number;
}

// Configuration for critical progression points
interface ProgressionCheckpoint {
  id: string;
  condition: () => boolean;
  repair: () => void;
  description: string;
}

// Define critical progression checkpoints
const progressionCheckpoints: ProgressionCheckpoint[] = [
  {
    id: 'journal-acquisition',
    description: 'Journal must be acquired after completing Kapoor calibration',
    condition: () => {
      // Check if player has completed Kapoor node but doesn't have journal
      const gameState = useGameStore.getState();
      const { hasJournal } = useJournalStore.getState();
      
      // Check if the node exists and is completed
      // Replace this with your actual node progress check
      const completedNodes = gameState.completedNodes || [];
      const hasCompletedKapoorNode = completedNodes.some(
        (nodeId: string) => nodeId === 'kapoor-calibration-node'
      );
      
      // If kapoor-calibration node is completed and player doesn't have journal, repair needed
      return hasCompletedKapoorNode && !hasJournal;
    },
    repair: () => {
      // Force journal acquisition
      console.warn('[PROGRESSION_REPAIR] Critical journal acquisition missing - forcing repair');
      useJournalStore.getState().initializeJournal('base');
      
      // Log the repair
      gameEvents.dispatch(GameEventType.JOURNAL_ACQUIRED, {
        tier: 'base',
        character: 'kapoor',
        source: 'progression_repair',
        forced: true
      });
    }
  },
  
  // Add more critical progression checkpoints here as game expands
  // For example, boss key item acquisition, character unlocks, etc.
];

// Run all progression checks
export function runProgressionChecks() {
  let repairsPerformed = false;
  
  // Run built-in critical progression check from event system
  if (ensureCriticalProgression()) {
    repairsPerformed = true;
  }
  
  // Check all progression checkpoints
  progressionCheckpoints.forEach(checkpoint => {
    if (checkpoint.condition()) {
      checkpoint.repair();
      repairsPerformed = true;
      
      // Log repair for analytics
      console.warn(`[PROGRESSION_REPAIR] Applied fix for: ${checkpoint.description}`);
    }
  });
  
  return repairsPerformed;
}

// Set up event listeners for critical progression events
export function initializeProgressionGuarantor() {
  const unsubscribers: Array<() => void> = [];
  
  // Listen for node completion events
  unsubscribers.push(
    useEventBus.getState().subscribe(GameEventType.NODE_COMPLETED, (event) => {
      const payload = event.payload;
      
      // For critical nodes, run progression checks after completion
      if (typeof payload === 'object' && payload !== null) {
        const nodeId = (payload as { nodeId?: string }).nodeId;
        const character = (payload as { character?: string }).character;
        
        if (
          (nodeId && nodeId === 'kapoor-calibration-node') ||
          (character === 'kapoor' && nodeId && nodeId.includes('calibration'))
        ) {
          // Short delay to allow normal acquisition flow to complete
          setTimeout(() => {
            runProgressionChecks();
          }, 1000);
        }
      }
    })
  );
  
  // Listen for day/night transitions
  unsubscribers.push(
    useEventBus.getState().subscribe(
      GameEventType.NIGHT_STARTED,
      () => {
        // Day/night transitions are natural integrity check points
        runProgressionChecks();
      }
    )
  );
  
  // Return cleanup function
  return () => {
    unsubscribers.forEach(unsubscribe => unsubscribe());
  };
}

// Run progression checks at critical moments (app load, etc.)
export function setupProgressionSafety() {
  // Run initial check on app load
  if (typeof window !== 'undefined') {
    // After DOM is ready
    setTimeout(() => {
      runProgressionChecks();
    }, 1000);
  }
  
  // Set up automatic checks
  const cleanup = initializeProgressionGuarantor();
  
  // Return cleanup function
  return cleanup;
}

// Create a component wrapper that ensures progression integrity
export function withProgressionSafety<P extends object>(
  Component: React.ComponentType<P>
): React.FC<P> {
  return function ProgressionSafetyWrapper(props: P) {
    // Set up progression safety on component mount
    useEffect(() => {
      const cleanup = setupProgressionSafety();
      return cleanup;
    }, []);
    
    // Render the wrapped component
    return <Component {...props} />;
  };
}

export default {
  runProgressionChecks,
  initializeProgressionGuarantor,
  setupProgressionSafety,
  withProgressionSafety
};