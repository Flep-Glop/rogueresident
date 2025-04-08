// Modified app/components/challenges/formats/ConversationFormat.tsx
'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useGameStore } from '../../../store/gameStore';
import { useDialogueFlow, DialogueStage, DialogueOptionView } from '../../../hooks/useDialogueFlow';
import { useTypewriter } from '../../../hooks/useTypewriter';
import { PixelButton, PixelText } from '../../PixelThemeProvider';
import { useEventBus } from '../../../core/events/CentralEventBus';
import { GameEventType } from '../../../core/events/EventTypes';
import MomentumCounter from '../../gameplay/MomentumCounter';
import useGameplayEffects from '../../../hooks/useGameplayEffects';

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
 * Enhanced conversation format with Momentum system integration
 * 
 * This component builds on the existing dialogue system, adding:
 * - Momentum counter for consecutive correct answers
 * - Option validation to determine correctness
 * - Special actions unlocked at different momentum thresholds
 * - Visual feedback for momentum changes
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
  const [isInitialized, setIsInitialized] = useState(false);
  const [reframingActive, setReframingActive] = useState(false);
  const [boastActive, setBoastActive] = useState(false);
  
  // UI animation states
  const [showOptionFeedback, setShowOptionFeedback] = useState<'correct' | 'incorrect' | null>(null);
  
  // Character data (memoized to prevent recreation)
  const charData = useMemo(() => getCharacterData(character), [character]);
  
  // Use dialogue flow hook 
  const dialogueState = useDialogueFlow({
    characterId: character,
    nodeId: currentNodeId || undefined,
    dialogueId,
    stages: dialogueStages,
    onOptionSelected,
    onStageChange
  });

  // Extract values from the dialogue state with safe fallbacks
  const currentStage = 'currentStage' in dialogueState ? dialogueState.currentStage : {
    id: dialogueState.instanceId || 'loading',
    text: dialogueState.currentText || '',
    options: dialogueState.options || [],
    isConclusion: false,
    contextNote: ''
  };
  
  const currentStageId = 'currentStageId' in dialogueState ? 
    dialogueState.currentStageId : 
    (dialogueState.instanceId || currentStage?.id || 'loading');
  
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
  
  // Use new gameplay effects system
  const {
    momentumLevel,
    consecutiveCorrect,
    showMomentumEffect,
    availableActions,
    handleOptionSelected: handleGameplayOptionSelected
  } = useGameplayEffects(character, currentStageId);
  
  // Set initialization flag when dialogue state is ready
  useEffect(() => {
    if (currentStage && 'text' in currentStage && !isInitialized) {
      setIsInitialized(true);
    }
  }, [currentStage, isInitialized]);
  
  // Function to determine if an option is "correct"
  const isOptionCorrect = (option: DialogueOptionView & { 
    relationshipChange?: number;
    approach?: string;
  }) => {
    // Options that improve relationship are considered "correct"
    if (option.relationshipChange && option.relationshipChange > 0) {
      return true;
    }
    
    // "precision" and "humble" approaches are generally correct
    if (option.approach === 'precision' || option.approach === 'humble') {
      return true;
    }
    
    // Options with critical path are correct
    if (option.isCriticalPath) {
      return true;
    }
    
    // Default to neutral (not breaking momentum)
    return true;
  };
  
  // Handle option selection with enhanced gameplay effects
  const handleOptionSelectWrapper = (option: DialogueOptionView & { 
    relationshipChange?: number;
    insightGain?: number;
  }) => {
    // Determine if option was "correct" for momentum
    const correct = isOptionCorrect(option);
    
    // Apply appropriate gameplay effects
    handleGameplayOptionSelected(
      option,
      correct,
      option.insightGain || 0
    );
    
    // Update local state
    if (option.relationshipChange) {
      setPlayerScore(prev => prev + option.relationshipChange);
    }
    
    if (option.insightGain) {
      setInsightGained(prev => prev + option.insightGain);
    }
    
    // Show feedback animation
    setShowOptionFeedback(correct ? 'correct' : 'incorrect');
    setTimeout(() => setShowOptionFeedback(null), 1500);
    
    // Forward to dialogue handler
    handleOptionSelect(option);
    
    // Reset special states
    setReframingActive(false);
    setBoastActive(false);
  };
  
  // Handle special actions
  const handleReframe = () => {
    // Toggle reframing mode
    setReframingActive(!reframingActive);
    
    // Log reframe usage
    try {
      useEventBus.getState().dispatch(
        GameEventType.UI_BUTTON_CLICKED,
        {
          componentId: 'conversationSpecialAction',
          action: 'reframe',
          metadata: { 
            character,
            stageId: currentStageId,
            momentumLevel,
            timestamp: Date.now() 
          }
        },
        'ConversationFormat'
      );
    } catch (error) {
      console.warn('Error dispatching reframe event:', error);
    }
  };
  
  const handleBoast = () => {
    // Toggle boast mode
    setBoastActive(!boastActive);
    
    // Log boast usage
    try {
      useEventBus.getState().dispatch(
        GameEventType.UI_BUTTON_CLICKED,
        {
          componentId: 'conversationSpecialAction',
          action: 'boast',
          metadata: { 
            character,
            stageId: currentStageId,
            momentumLevel,
            timestamp: Date.now() 
          }
        },
        'ConversationFormat'
      );
    } catch (error) {
      console.warn('Error dispatching boast event:', error);
    }
  };
  
  // Handle continue button
  const handleContinueWrapper = () => {
    // Check if at conclusion
    if ((currentStage?.isConclusion && !showResponse) || 
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
  
  // Initialize typewriter for main text (with safe fallbacks)
  const { 
    displayText: displayedText, 
    isTyping, 
    complete: skipTyping 
  } = useTypewriter(currentStage?.text || '');
  
  // Initialize typewriter for backstory (with safe fallbacks) 
  const { 
    displayText: displayedBackstoryText,
    isTyping: isTypingBackstory,
    complete: skipBackstoryTyping
  } = useTypewriter(backstoryText || '');
  
  // Loading state while dialogue initializes
  if (!isInitialized) {
    return (
      <div className="p-6 max-w-4xl mx-auto bg-surface pixel-borders">
        <div className="bg-surface-dark p-4 pixel-borders-thin mb-4 min-h-[120px] flex items-center justify-center">
          <PixelText>Initializing dialogue...</PixelText>
        </div>
      </div>
    );
  }
  
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
        
        {/* Momentum counter */}
        <div className="relative">
          <MomentumCounter 
            level={momentumLevel}
            consecutiveCorrect={consecutiveCorrect}
            showEffect={showMomentumEffect}
          />
        </div>
      </div>
      
      {/* Special actions panel (appears when actions are available) */}
      {(availableActions.canReframe || availableActions.canExtrapolate || availableActions.canBoast) && (
        <div className="flex space-x-2 mb-4">
          {availableActions.canReframe && (
            <button
              className={`px-3 py-1 text-sm font-pixel ${reframingActive ? 'bg-blue-600 text-white' : 'bg-blue-900/50 text-blue-300 hover:bg-blue-800/70'} rounded transition-colors`}
              onClick={handleReframe}
            >
              Reframe (25% Insight)
            </button>
          )}
          
          {availableActions.canExtrapolate && (
            <button
              className="px-3 py-1 text-sm font-pixel bg-purple-900/50 text-purple-300 hover:bg-purple-800/70 rounded transition-colors"
              onClick={() => {
                // Extrapolate implementation would go here
              }}
            >
              Extrapolate (50% Insight)
            </button>
          )}
          
          {availableActions.canBoast && (
            <button
              className={`px-3 py-1 text-sm font-pixel ${boastActive ? 'bg-orange-600 text-white' : 'bg-orange-900/50 text-orange-300 hover:bg-orange-800/70'} rounded transition-colors animate-pulse`}
              onClick={handleBoast}
            >
              Boast/Expand
            </button>
          )}
        </div>
      )}
      
      {/* Dialogue area */}
      <div className="bg-surface-dark p-4 pixel-borders-thin mb-4 min-h-[120px] relative">
        {/* Feedback overlay for correct/incorrect answers */}
        {showOptionFeedback && (
          <div 
            className={`absolute inset-0 pointer-events-none z-10 ${
              showOptionFeedback === 'correct' 
                ? 'bg-green-500/10 border border-green-500/30' 
                : 'bg-red-500/10 border border-red-500/30'
            }`}
          >
            <div 
              className={`absolute top-2 right-2 px-2 py-1 text-xs font-pixel ${
                showOptionFeedback === 'correct' ? 'bg-green-700 text-green-100' : 'bg-red-700 text-red-100'
              }`}
            >
              {showOptionFeedback === 'correct' ? 'Correct Approach' : 'Suboptimal Approach'}
            </div>
          </div>
        )}
        
        {/* Show backstory or main content */}
        {showBackstory ? (
          <PixelText className="italic">{displayedBackstoryText}{isTypingBackstory ? '|' : ''}</PixelText>
        ) : (
          <div>
            <PixelText>{displayedText}{isTyping ? '|' : ''}</PixelText>
            
            {/* Context note */}
            {!isTyping && currentStage?.contextNote && (
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
        currentStage?.options && currentStage.options.length > 0 ? (
          <div className="space-y-2">
            {/* Filter options based on reframing if active */}
            {currentStage.options
              .filter(option => {
                // When reframing, only show options with "humble" or "precision" approaches
                if (reframingActive) {
                  return option.approach === 'humble' || option.approach === 'precision';
                }
                
                // When boasting, prioritize more challenging options
                if (boastActive) {
                  // A more challenging option might have specific traits
                  return option.approach === 'confidence' || option.approach === 'precision';
                }
                
                // Show all options by default
                return true;
              })
              .map((option: any) => (
                <button
                  key={option.id}
                  className={`w-full text-left p-3 bg-surface hover:bg-surface-dark pixel-borders-thin relative
                    ${reframingActive && (option.approach === 'humble' || option.approach === 'precision') ? 'border-blue-500/50' : ''}
                    ${boastActive && (option.approach === 'confidence' || option.approach === 'precision') ? 'border-orange-500/50' : ''}
                  `}
                  onClick={() => handleOptionSelectWrapper(option)}
                  disabled={isTyping}
                >
                  <div className="flex justify-between">
                    <PixelText>{option.text}</PixelText>
                    
                    {/* Show insight preview */}
                    {option.insightGain && option.insightGain > 0 && (
                      <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-1 rounded-sm">
                        +{option.insightGain}
                      </span>
                    )}
                    
                    {/* Special indicators for reframed or boast options */}
                    {reframingActive && (option.approach === 'humble' || option.approach === 'precision') && (
                      <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full"></span>
                    )}
                    
                    {boastActive && (option.approach === 'confidence' || option.approach === 'precision') && (
                      <span className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full"></span>
                    )}
                  </div>
                  
                  {/* Approach indicator - visually show player what type of response this is */}
                  {option.approach && (
                    <div className="mt-1 text-xs">
                      {option.approach === 'humble' && (
                        <span className="text-blue-400">Humble approach</span>
                      )}
                      {option.approach === 'precision' && (
                        <span className="text-green-400">Precise approach</span>
                      )}
                      {option.approach === 'confidence' && (
                        <span className="text-orange-400">Confident approach</span>
                      )}
                    </div>
                  )}
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
          <div>Momentum: {momentumLevel} (Consecutive: {consecutiveCorrect})</div>
          <div>Reframing: {reframingActive ? 'Active' : 'Inactive'}</div>
          <div>Boast: {boastActive ? 'Active' : 'Inactive'}</div>
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