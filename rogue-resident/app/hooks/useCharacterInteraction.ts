// app/hooks/useCharacterInteraction.ts
import { useState, useCallback, useRef, useEffect } from 'react';
import { DialogueOption } from './useDialogueFlow';
import { useEventBus } from '../core/events/CentralEventBus';
import { GameEventType } from '../core/events/EventTypes';

interface KnowledgeGainEvent {
  conceptName: string;
  domainName: string;
  domainColor: string;
  amount: number;
  conceptId?: string; // Added to track original ID for telemetry
}

interface CharacterInteractionOptions {
  initialRespect?: number;
  onKnowledgeGain?: (gain: KnowledgeGainEvent) => void;
  onInsightGain?: (amount: number) => void;
  onRelationshipChange?: (amount: number) => void;
  characterId?: string; // Added to track character for events
  nodeId?: string; // Added to track node for events
}

/**
 * A hook that manages character interactions, relationship values,
 * and knowledge/insight tracking with integrated event system
 */
export function useCharacterInteraction({
  initialRespect = 0,
  onKnowledgeGain,
  onInsightGain,
  onRelationshipChange,
  characterId = 'unknown',
  nodeId = 'unknown'
}: CharacterInteractionOptions = {}) {
  const [characterRespect, setCharacterRespect] = useState(initialRespect);
  const [approachCount, setApproachCount] = useState({
    humble: 0,
    precision: 0,
    confidence: 0
  });
  
  // Knowledge tracking
  const [showKnowledgeGain, setShowKnowledgeGain] = useState(false);
  const [currentKnowledgeGain, setCurrentKnowledgeGain] = useState<KnowledgeGainEvent | null>(null);
  const [knowledgeQueue, setKnowledgeQueue] = useState<KnowledgeGainEvent[]>([]);
  const [totalInsightGained, setTotalInsightGained] = useState(0);
  
  // Track interaction history for resilience
  const interactionHistoryRef = useRef<{
    options: string[];
    knowledgeGained: Record<string, number>;
    insightGained: number;
    characterRespect: number;
  }>({
    options: [],
    knowledgeGained: {},
    insightGained: 0,
    characterRespect: initialRespect
  });
  
  // Update history whenever core values change
  useEffect(() => {
    interactionHistoryRef.current.characterRespect = characterRespect;
    interactionHistoryRef.current.insightGained = totalInsightGained;
  }, [characterRespect, totalInsightGained]);
  
  // Process knowledge queue
  const processKnowledgeQueue = useCallback(() => {
    if (knowledgeQueue.length > 0 && !showKnowledgeGain) {
      // Get the first item from queue
      const nextKnowledge = knowledgeQueue[0];
      setCurrentKnowledgeGain(nextKnowledge);
      setShowKnowledgeGain(true);
      
      // Remove this item from queue
      setKnowledgeQueue(prev => prev.slice(1));
      
      if (onKnowledgeGain) {
        onKnowledgeGain(nextKnowledge);
      }
      
      // Log knowledge processing through the event system
      if (nextKnowledge.conceptId) {
        useEventBus.getState().dispatch(GameEventType.UI_BUTTON_CLICKED, {
          componentId: 'characterInteraction',
          action: 'knowledgeVisualized',
          metadata: {
            conceptId: nextKnowledge.conceptId,
            conceptName: nextKnowledge.conceptName,
            amount: nextKnowledge.amount,
            domainName: nextKnowledge.domainName,
            characterId,
            nodeId
          }
        });
      }
    }
  }, [knowledgeQueue, showKnowledgeGain, onKnowledgeGain, characterId, nodeId]);
  
  // Handle option selection
  const handleCharacterOptionSelected = useCallback((option: DialogueOption) => {
    // Track option in history for resilience
    interactionHistoryRef.current.options.push(option.id);
    
    // Update approach counts
    if (option.approach) {
      setApproachCount(prev => ({
        ...prev,
        [option.approach!]: prev[option.approach!] + 1
      }));
    }
    
    // Update relationship with character
    if (option.relationshipChange) {
      setCharacterRespect(prev => prev + option.relationshipChange);
      
      if (onRelationshipChange) {
        onRelationshipChange(option.relationshipChange);
      }
      
      // Log relationship change through the event system
      useEventBus.getState().dispatch(GameEventType.RELATIONSHIP_CHANGED, {
        characterId,
        amount: option.relationshipChange,
        newTotal: characterRespect + option.relationshipChange,
        source: 'dialogue_option',
        metadata: {
          optionId: option.id,
          approach: option.approach,
          nodeId
        }
      });
    }
    
    // Apply insight gain
    if (option.insightGain) {
      const gain = option.insightGain;
      setTotalInsightGained(prev => prev + gain);
      interactionHistoryRef.current.insightGained += gain;
      
      if (onInsightGain) {
        onInsightGain(gain);
      }
      
      // Log insight gain through the event system
      if (gain > 0) {
        useEventBus.getState().dispatch(GameEventType.UI_BUTTON_CLICKED, {
          componentId: 'characterInteraction',
          action: 'insightGained',
          metadata: {
            amount: gain,
            optionId: option.id,
            characterId,
            nodeId,
            totalGained: interactionHistoryRef.current.insightGained
          }
        });
      }
    }
    
    // Handle knowledge gain
    if (option.knowledgeGain) {
      const { conceptId, domainId, amount } = option.knowledgeGain;
      
      // Track knowledge in history
      interactionHistoryRef.current.knowledgeGained[conceptId] = 
        (interactionHistoryRef.current.knowledgeGained[conceptId] || 0) + amount;
      
      // Queue knowledge update visualization
      queueKnowledgeGain({
        conceptId, // Store original ID for later reference
        conceptName: getConceptName(conceptId),
        domainName: getDomainName(domainId),
        domainColor: getDomainColor(domainId),
        amount
      });
      
      // Log knowledge gain through the event system
      useEventBus.getState().dispatch(GameEventType.KNOWLEDGE_GAINED, {
        conceptId,
        amount,
        domainId,
        character: characterId,
        source: 'dialogue_option',
        metadata: {
          optionId: option.id,
          nodeId
        }
      });
    }
  }, [onRelationshipChange, onInsightGain, characterRespect, characterId, nodeId]);
  
  // Queue up a knowledge gain event
  const queueKnowledgeGain = useCallback((gainEvent: KnowledgeGainEvent) => {
    setKnowledgeQueue(prev => [...prev, gainEvent]);
  }, []);
  
  // Complete a knowledge gain event
  const completeKnowledgeGain = useCallback(() => {
    setShowKnowledgeGain(false);
    
    // Log knowledge completion through the event system
    if (currentKnowledgeGain?.conceptId) {
      useEventBus.getState().dispatch(GameEventType.UI_BUTTON_CLICKED, {
        componentId: 'characterInteraction',
        action: 'knowledgeVisualizationCompleted',
        metadata: {
          conceptId: currentKnowledgeGain.conceptId,
          conceptName: currentKnowledgeGain.conceptName,
          characterId,
          queueRemaining: knowledgeQueue.length
        }
      });
    }
  }, [currentKnowledgeGain, characterId, knowledgeQueue.length]);
  
  // Expose method to get interaction history for state recovery
  const getInteractionHistory = useCallback(() => {
    return { ...interactionHistoryRef.current };
  }, []);
  
  // Helper functions for concept display
  const getConceptName = (conceptId: string): string => {
    switch(conceptId) {
      case 'electron_equilibrium_understood': return 'Electron Equilibrium';
      case 'ptp_correction_understood': return 'PTP Correction';
      case 'output_calibration_tolerance': return 'Output Calibration Tolerance';
      case 'clinical_dose_significance': return 'Clinical Dose Significance';
      default: return conceptId.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
    }
  };
  
  const getDomainName = (domainId: string): string => {
    switch(domainId) {
      case 'radiation-physics': return 'Radiation Physics';
      case 'quality-assurance': return 'Quality Assurance';
      case 'patient-care': return 'Patient Care';
      case 'equipment': return 'Equipment Knowledge';
      case 'regulatory': return 'Regulatory Compliance';
      default: return domainId.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
    }
  };
  
  const getDomainColor = (domainId: string): string => {
    switch(domainId) {
      case 'radiation-physics': return 'var(--clinical-color)';
      case 'quality-assurance': return 'var(--qa-color)';
      case 'patient-care': return 'var(--clinical-alt-color)';
      case 'equipment': return 'var(--qa-color)';
      case 'regulatory': return 'var(--educational-color)';
      default: return 'var(--clinical-color)';
    }
  };
  
  return {
    characterRespect,
    approachCount,
    totalInsightGained,
    showKnowledgeGain,
    currentKnowledgeGain,
    knowledgeQueue,
    processKnowledgeQueue,
    handleCharacterOptionSelected,
    queueKnowledgeGain,
    completeKnowledgeGain,
    setCharacterRespect,
    // New methods
    getInteractionHistory
  };
}

export default useCharacterInteraction;