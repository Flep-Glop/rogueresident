'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useGameStore } from '../../../store/gameStore';
import { useDialogueFlow, DialogueStage, DialogueOptionView } from '../../../hooks/useDialogueFlow';
import { useTypewriter } from '../../../hooks/useTypewriter';
import { PixelButton, PixelText } from '../../PixelThemeProvider';
import { useEventBus } from '../../../core/events/CentralEventBus';

// Results interface for completion
export interface InteractionResults {
  insightGained: number;
  relationshipChange: number;
  knowledgeGained: Record<string, number>;
  journalTier?: 'base' | 'technical' | 'annotated';
}

// Character portrait data
interface CharacterData {
  name: string;
  title: string;
  sprite: string;
  primaryColor: string;
  textClass: string;
  bgClass: string;
}

interface ConversationFormatProps {
  character: string;
  dialogueStages?: DialogueStage[];
  dialogueId?: string;
  onComplete: (results: InteractionResults) => void;
  onOptionSelected?: (option: DialogueOptionView, stageId: string) => void;
  onStageChange?: (newStageId: string, prevStageId: string) => void;
  stateMachineEnabled?: boolean;
}

/**
 * Streamlined Conversation Format
 * 
 * Reduced to core functionality to establish the state machine architecture
 */
export default function ConversationFormat({
  character,
  dialogueStages,
  dialogueId = `${character}-dialogue`,
  onComplete,
  onOptionSelected,
  onStageChange,
  stateMachineEnabled = false
}: ConversationFormatProps) {
  // Core game systems
  const { currentNodeId } = useGameStore();
  
  // Local state
  const [playerScore, setPlayerScore] = useState(0);
  const [insightGained, setInsightGained] = useState(0);
  
  // Character data (memoized to prevent recreation)
  const charData = useMemo(() => getCharacterData(character), [character]);
  
  // Use dialogue flow hook 
  // We're adapting to its actual return shape while maintaining compatibility
  const dialogueState = useDialogueFlow({
    characterId: character,
    nodeId: currentNodeId || undefined,
    dialogueId,
    stages: dialogueStages,
    onOptionSelected,
    onStageChange
  });

  // Extract values from the dialogue state with safe fallbacks
  // This handles both old and new hook API formats
  const currentStage = 'currentStage' in dialogueState ? dialogueState.currentStage : {
    id: dialogueState.instanceId || 'loading',
    text: dialogueState.currentText || '',
    options: dialogueState.options || [],
    isConclusion: false,
    contextNote: ''
  };
  
  const currentStageId = 'currentStageId' in dialogueState ? 
    dialogueState.currentStageId : 
    (dialogueState.instanceId || currentStage.id || 'loading');
  
  const showResponse = dialogueState.showResponse || false;
  const showBackstory = dialogueState.showBackstory || false;
  const backstoryText = dialogueState.backstoryText || '';
  
  // Safe function references
  const handleOptionSelect = 'handleOptionSelect' in dialogueState ? 
    dialogueState.handleOptionSelect : 
    ((option: DialogueOptionView) => console.warn('handleOptionSelect not available'));
  
  const handleContinue = 'handleContinue' in dialogueState ? 
    dialogueState.handleContinue : 
    (() => console.warn('handleContinue not available'));
  
  const completeDialogue = 'completeDialogue' in dialogueState ? 
    dialogueState.completeDialogue : 
    (() => console.warn('completeDialogue not available'));
  
  // Handle option selection with local state updates
  const handleOptionSelectWrapper = (option: DialogueOptionView & { 
    relationshipChange?: number;
    insightGain?: number;
  }) => {
    // Update local state
    if (option.relationshipChange) {
      setPlayerScore(prev => prev + option.relationshipChange);
    }
    
    if (option.insightGain) {
      setInsightGained(prev => prev + option.insightGain);
      // Update global insight
      useGameStore.getState().updateInsight(option.insightGain);
    }
    
    // Forward to dialogue handler
    handleOptionSelect(option);
  };
  
  // Handle continue button
  const handleContinueWrapper = () => {
    // Check if at conclusion
    if ((currentStage.isConclusion && !showResponse) || 
        currentStageId === 'journal-presentation') {
      
      // Complete the dialogue and challenge
      finalizeChallenge();
      return;
    }
    
    // Forward to dialogue handler
    handleContinue();
  };
  
  // Finalize the challenge
  const finalizeChallenge = () => {
    // Determine journal tier
    const journalTier = playerScore >= 3 ? 'annotated' : 
                     playerScore >= 0 ? 'technical' : 'base';
                     
    // Call completion callback
    onComplete({
      insightGained,
      relationshipChange: playerScore,
      knowledgeGained: {},
      journalTier
    });
    
    // Complete state machine flow
    if (stateMachineEnabled) {
      completeDialogue();
    }
  };
  
  // Initialize typewriter for main text (with fallback)
  const { 
    displayText: displayedText, 
    isTyping, 
    complete: skipTyping 
  } = useTypewriter(currentStage.text || '');
  
  // Initialize typewriter for backstory (with fallback)
  const { 
    displayText: displayedBackstoryText,
    isTyping: isTypingBackstory,
    complete: skipBackstoryTyping
  } = useTypewriter(backstoryText || '');
  
  // Main conversation UI
  return (
    <div className="p-6 max-w-4xl mx-auto bg-surface pixel-borders">
      {/* Character header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <div className="w-12 h-12 mr-4 rounded-lg overflow-hidden">
            <div className={`w-full h-full ${charData.bgClass}`}></div>
          </div>
          <div>
            <PixelText className={`text-lg ${charData.textClass}`}>{charData.name}</PixelText>
            <PixelText className="text-text-secondary text-sm">{charData.title}</PixelText>
          </div>
        </div>
        
        <div className="bg-surface-dark px-3 py-1 text-sm font-pixel">
          <PixelText className="text-text-secondary">
            {currentStageId || 'Dialogue'}
          </PixelText>
        </div>
      </div>
      
      {/* Dialogue area */}
      <div className="bg-surface-dark p-4 pixel-borders-thin mb-4 min-h-[120px]">
        {/* Show backstory or main content */}
        {showBackstory ? (
          <PixelText className="italic">{displayedBackstoryText}{isTypingBackstory ? '|' : ''}</PixelText>
        ) : (
          <div>
            <PixelText>{displayedText}{isTyping ? '|' : ''}</PixelText>
            
            {/* Context note */}
            {!isTyping && currentStage.contextNote && (
              <div className="mt-3 pt-2 border-t border-border">
                <PixelText className="text-text-secondary text-sm italic">
                  {currentStage.contextNote}
                </PixelText>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Options or continue button */}
      {showResponse || showBackstory ? (
        <PixelButton
          className={`float-right ${charData.bgClass} text-white hover:opacity-90`}
          onClick={handleContinueWrapper}
        >
          {(isTyping || isTypingBackstory) ? "Skip" : "Continue"}
        </PixelButton>
      ) : (
        currentStage.options && currentStage.options.length > 0 ? (
          <div className="space-y-2">
            {currentStage.options.map((option: any) => (
              <button
                key={option.id}
                className="w-full text-left p-3 bg-surface hover:bg-surface-dark pixel-borders-thin"
                onClick={() => handleOptionSelectWrapper(option)}
                disabled={isTyping}
              >
                <div className="flex justify-between">
                  <PixelText>{option.text}</PixelText>
                  
                  {/* Show insight preview */}
                  {option.insightGain && option.insightGain > 0 && (
                    <span className="ml-2 text-xs bg-clinical text-white px-2 py-1 rounded-sm">
                      +{option.insightGain}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <PixelButton
            className={`float-right ${charData.bgClass} text-white hover:opacity-90`}
            onClick={handleContinueWrapper}
          >
            {isTyping ? "Skip" : "Continue"}
          </PixelButton>
        )
      )}
      
      {/* Debug info */}
      {process.env.NODE_ENV !== 'production' && (
        <div className="mt-8 pt-4 border-t border-gray-700 text-xs opacity-50">
          <div>State Machine: {stateMachineEnabled ? 'Yes' : 'No'}</div>
          <div>Current Stage: {currentStageId}</div>
          <div>Player Score: {playerScore}</div>
          <div>Hook Return Structure: {Object.keys(dialogueState).join(', ')}</div>
        </div>
      )}
    </div>
  );
}

// Helper function for character data
function getCharacterData(characterId: string): CharacterData {
  const characterData: Record<string, CharacterData> = {
    'kapoor': {
      name: "Dr. Kapoor",
      title: "Chief Medical Physicist",
      sprite: "/characters/kapoor.png", 
      primaryColor: "var(--clinical-color)",
      textClass: "text-clinical-light",
      bgClass: "bg-clinical"
    },
    'jesse': {
      name: "Technician Jesse",
      title: "Equipment Specialist",
      sprite: "/characters/jesse.png", 
      primaryColor: "var(--qa-color)",
      textClass: "text-qa-light",
      bgClass: "bg-qa"
    },
    'quinn': {
      name: "Dr. Zephyr Quinn",
      title: "Experimental Researcher",
      sprite: "/characters/quinn.png", 
      primaryColor: "var(--educational-color)",
      textClass: "text-educational-light",
      bgClass: "bg-educational"
    },
    'garcia': {
      name: "Dr. Garcia",
      title: "Radiation Oncologist",
      sprite: "/characters/garcia.png", 
      primaryColor: "var(--clinical-alt-color)",
      textClass: "text-clinical-light",
      bgClass: "bg-clinical"
    }
  };
  
  return characterData[characterId] || characterData.kapoor;
}