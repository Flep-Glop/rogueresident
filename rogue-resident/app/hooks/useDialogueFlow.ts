import { useState, useCallback } from 'react';

export interface DialogueOption {
  id: string;
  text: string;
  nextStageId: string;
  insightGain?: number;
  approach?: 'humble' | 'precision' | 'confidence';
  relationshipChange?: number;
  knowledgeGain?: {
    conceptId: string;
    domainId: string;
    amount: number;
  };
  responseText?: string;
  triggersBackstory?: boolean;
}

export interface DialogueStage {
  id: string;
  text: string;
  contextNote?: string;
  equipment?: {
    itemId: string;    // Changed from imageSrc to itemId
    alt: string;
    description: string;
  };
  options?: DialogueOption[];
  nextStageId?: string;
  isConclusion?: boolean;
}

interface DialogueFlowOptions {
  initialStageId?: string;
  stages: DialogueStage[];
  onStageChange?: (newStageId: string, prevStageId: string) => void;
  onOptionSelected?: (option: DialogueOption) => void;
}

/**
 * A hook that manages dialogue flow, stages, and responses
 * for narrative-driven game interactions
 */
export function useDialogueFlow({
  initialStageId = 'intro',
  stages,
  onStageChange,
  onOptionSelected
}: DialogueFlowOptions) {
  const [currentStageId, setCurrentStageId] = useState(initialStageId);
  const [selectedOption, setSelectedOption] = useState<DialogueOption | null>(null);
  const [showResponse, setShowResponse] = useState(false);
  const [showBackstory, setShowBackstory] = useState(false);
  const [backstoryText, setBackstoryText] = useState('');

  // Get the current stage object
  const getCurrentStage = useCallback(() => {
    return stages.find(stage => stage.id === currentStageId) || stages[0];
  }, [currentStageId, stages]);

  const currentStage = getCurrentStage();

  // Handle player selecting a dialogue option
  const handleOptionSelect = useCallback((option: DialogueOption) => {
    setSelectedOption(option);
    setShowResponse(true);
    
    if (onOptionSelected) {
      onOptionSelected(option);
    }
  }, [onOptionSelected]);

  // Progress dialogue after response
  const handleContinue = useCallback(() => {
    // If showing backstory, return to main dialogue
    if (showBackstory) {
      setShowBackstory(false);
      return;
    }
    
    // If showing response, transition to next dialogue stage
    if (showResponse) {
      setShowResponse(false);
      
      // Normal progression to next stage
      const prevStageId = currentStageId;
      const nextStageId = selectedOption?.nextStageId || currentStage.nextStageId || 'conclusion';
      
      setCurrentStageId(nextStageId);
      setSelectedOption(null);
      
      if (onStageChange) {
        onStageChange(nextStageId, prevStageId);
      }
      
      return true;
    }
    
    // If at end of typing, continue was pressed but no actual stage change
    return false;
  }, [
    showBackstory, 
    showResponse, 
    currentStage, 
    currentStageId, 
    selectedOption, 
    onStageChange
  ]);

  // Activate backstory display
  const showBackstorySegment = useCallback((text: string) => {
    setBackstoryText(text);
    setShowBackstory(true);
  }, []);

  return {
    currentStage,
    currentStageId,
    selectedOption,
    showResponse,
    showBackstory,
    backstoryText,
    handleOptionSelect,
    handleContinue,
    showBackstorySegment,
    setCurrentStageId
  };
}

export default useDialogueFlow;