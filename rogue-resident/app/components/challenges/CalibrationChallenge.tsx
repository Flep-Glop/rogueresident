'use client';
import { useState, useCallback } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useChallengeStore } from '../../store/challengeStore';
import ConversationFormat, { InteractionResults } from './formats/ConversationFormat';
import { CharacterId } from '../../types/challenge';
import { useEventBus, journalAcquired } from '../../core/events/CentralEventBus';
import { GameEventType } from '../../core/events/EventTypes';
import { loadDialogueContent } from '../../utils/dialogueLoader';

interface CalibrationChallengeProps {
  character: CharacterId;
}

/**
 * Simplified Calibration Challenge
 * 
 * Reduced to minimal implementation to establish state machine architecture
 * without triggering React rendering loops
 */
export default function CalibrationChallenge({ character }: CalibrationChallengeProps) {
  const { currentNodeId } = useGameStore();
  const { completeChallenge } = useChallengeStore();
  const eventBus = useEventBus.getState();
  
  // Simple loading state
  const [loading, setLoading] = useState(true);
  const [dialogueStages, setDialogueStages] = useState([]);
  const [error, setError] = useState(null);
  
  // Use callback to prevent recreation on every render
  const handleChallengeCompletion = useCallback((results: InteractionResults) => {
    console.log(`[CalibrationChallenge] Challenge completed:`, {
      character,
      relationshipChange: results.relationshipChange,
      journalTier: results.journalTier
    });
    
    // Determine grade based on results
    const grade = results.relationshipChange >= 3 ? 'S' : 
                results.relationshipChange >= 1 ? 'A' : 
                results.relationshipChange >= 0 ? 'B' : 'C';
    
    // For Kapoor, ensure journal acquisition
    if (character === 'kapoor') {
      // Use centralized journal acquisition
      journalAcquired(
        results.journalTier || 'base',
        character,
        'challenge_completion'
      );
    }
    
    // Complete the challenge
    completeChallenge(grade);
    
    // Dispatch completion event
    if (currentNodeId) {
      eventBus.dispatch(GameEventType.CHALLENGE_COMPLETED, {
        nodeId: currentNodeId,
        character,
        relationshipScore: results.relationshipChange,
        journalTier: results.journalTier,
        insightGained: results.insightGained,
        grade
      });
    }
  }, [character, completeChallenge, currentNodeId, eventBus]);
  
  // Load dialogue content once
  useState(() => {
    const loadContent = async () => {
      try {
        setLoading(true);
        const { data, error } = loadDialogueContent(character, 'calibration');
        
        if (error || !data) {
          setError(error || 'Failed to load dialogue content');
        } else {
          setDialogueStages(data);
        }
      } catch (err) {
        setError('Unexpected error loading dialogue');
      } finally {
        setLoading(false);
      }
    };
    
    loadContent();
  });
  
  // Show loading state
  if (loading) {
    return <div className="p-6 bg-surface pixel-borders">Loading calibration challenge...</div>;
  }
  
  // Show error state
  if (error) {
    return <div className="p-6 bg-surface pixel-borders text-warning">Error: {error}</div>;
  }
  
  // Render conversation
  return (
    <ConversationFormat
      character={character}
      dialogueStages={dialogueStages}
      onComplete={handleChallengeCompletion}
      dialogueId={`${character}-calibration`}
      stateMachineEnabled={true}
    />
  );
}