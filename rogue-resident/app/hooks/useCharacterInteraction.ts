import { useState, useCallback } from 'react';
import { DialogueOption } from './useDialogueFlow';

interface KnowledgeGainEvent {
  conceptName: string;
  domainName: string;
  domainColor: string;
  amount: number;
}

interface CharacterInteractionOptions {
  initialRespect?: number;
  onKnowledgeGain?: (gain: KnowledgeGainEvent) => void;
  onInsightGain?: (amount: number) => void;
  onRelationshipChange?: (amount: number) => void;
}

/**
 * A hook that manages character interactions, relationship values,
 * and knowledge/insight tracking
 */
export function useCharacterInteraction({
  initialRespect = 0,
  onKnowledgeGain,
  onInsightGain,
  onRelationshipChange
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
    }
  }, [knowledgeQueue, showKnowledgeGain, onKnowledgeGain]);
  
  // Handle option selection
  const handleCharacterOptionSelected = useCallback((option: DialogueOption) => {
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
    }
    
    // Apply insight gain
    if (option.insightGain) {
      const gain = option.insightGain;
      setTotalInsightGained(prev => prev + gain);
      
      if (onInsightGain) {
        onInsightGain(gain);
      }
    }
    
    // Handle knowledge gain
    if (option.knowledgeGain) {
      const { conceptId, domainId, amount } = option.knowledgeGain;
      
      // Queue knowledge update visualization
      queueKnowledgeGain({
        conceptName: getConceptName(conceptId),
        domainName: getDomainName(domainId),
        domainColor: getDomainColor(domainId),
        amount
      });
    }
  }, [onRelationshipChange, onInsightGain]);
  
  // Queue up a knowledge gain event
  const queueKnowledgeGain = useCallback((gainEvent: KnowledgeGainEvent) => {
    setKnowledgeQueue(prev => [...prev, gainEvent]);
  }, []);
  
  // Complete a knowledge gain event
  const completeKnowledgeGain = useCallback(() => {
    setShowKnowledgeGain(false);
  }, []);
  
  // Helper functions for concept display
  const getConceptName = (conceptId: string): string => {
    switch(conceptId) {
      case 'electron_equilibrium_understood': return 'Electron Equilibrium';
      case 'ptp_correction_understood': return 'PTP Correction';
      case 'output_calibration_tolerance': return 'Output Calibration Tolerance';
      case 'clinical_dose_significance': return 'Clinical Dose Significance';
      default: return conceptId;
    }
  };
  
  const getDomainName = (domainId: string): string => {
    switch(domainId) {
      case 'radiation-physics': return 'Radiation Physics';
      case 'quality-assurance': return 'Quality Assurance';
      default: return domainId;
    }
  };
  
  const getDomainColor = (domainId: string): string => {
    switch(domainId) {
      case 'radiation-physics': return 'var(--clinical-color)';
      case 'quality-assurance': return 'var(--qa-color)';
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
    setCharacterRespect
  };
}

export default useCharacterInteraction;