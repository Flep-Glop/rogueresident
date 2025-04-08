// app/components/challenges/formats/EnhancedConversationFormat.tsx
'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../../store/gameStore';
import { useResourceStore, StrategicActionType } from '../../../store/resourceStore';
import { useDialogueFlow, DialogueStage, DialogueOptionView } from '../../../hooks/useDialogueFlow';
import { useTypewriter } from '../../../hooks/useTypewriter';
import { PixelButton, PixelText } from '../../PixelThemeProvider';
import { useEventBus } from '../../../core/events/CentralEventBus';
import { GameEventType } from '../../../core/events/EventTypes';
import InsightMeter from '../../gameplay/InsightMeter';
import MomentumCounter from '../../gameplay/MomentumCounter';
import { StrategicActionsContainer } from '../../gameplay/StrategicActions';
import { applyStrategicAction, enhanceDialogueOptions } from '../../../core/dialogue/ActionIntegration';

// Results interface for completion
export interface InteractionResults {
  insightGained: number;
  relationshipChange: number;
  knowledgeGained: Record<string, number>;
  journalTier?: 'base' | 'technical' | 'annotated';
  actionsUsed?: StrategicActionType[];
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
 * Enhanced conversation format with Strategic Actions integration
 * 
 * This builds on the existing ConversationFormat with improved:
 * - Strategic action integration via the "whisper-to-shout" pattern
 * - Resource visualization with improved animations
 * - Option enhancement for active strategic actions
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
  const { 
    insight,
    momentum,
    activeAction,
    activateAction,
    completeAction,
    cancelAction,
    incrementMomentum,
    resetMomentum,
    updateInsight
  } = useResourceStore();
  
  // Local state
  const [playerScore, setPlayerScore] = useState(0);
  const [insightGained, setInsightGained] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [usedActions, setUsedActions] = useState<StrategicActionType[]>([]);
  const [consecutiveCorrect, setConsecutiveCorrect] = useState(0);
  
  // UI animation states
  const [showOptionFeedback, setShowOptionFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [showInsightGain, setShowInsightGain] = useState(false);
  const [lastInsightGain, setLastInsightGain] = useState(0);
  
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
  
  // Handle option selection with resource integration
  const handleOptionSelectWrapper = (option: DialogueOptionView & { 
    relationshipChange?: number;
    insightGain?: number;
    approach?: string;
  }) => {
    // Determine if option was "correct" for momentum
    const correct = isOptionCorrect(option);
    
    // Calculate base insight gain
    let baseInsightGain = option.insightGain || 0;
    
    // Get any relationship change
    const relationshipChange = option.relationshipChange || 0;
    
    // Handle momentum changes
    if (correct) {
      // Increment consecutive counter
      setConsecutiveCorrect(prev => prev + 1);
      
      // Apply to global momentum
      incrementMomentum();
      
      // Prepare positive feedback
      setShowOptionFeedback('correct');
      setFeedbackMessage(getFeedbackMessage('correct', option.approach));
    } else {
      // Reset momentum
      setConsecutiveCorrect(0);
      resetMomentum();
      
      // Prepare negative feedback
      setShowOptionFeedback('incorrect');
      setFeedbackMessage(getFeedbackMessage('incorrect', option.approach));
    }
    
    // Apply insight gain with momentum bonus if any
    if (baseInsightGain > 0) {
      // Double insight if boast is active
      if (activeAction === 'boast') {
        baseInsightGain *= 2;
      }
      
      // Calculate momentum multiplier
      const momentumMultiplier = 1 + (momentum * 0.25); // 1.0, 1.25, 1.5, 1.75
      const totalInsight = Math.floor(baseInsightGain * momentumMultiplier);
      
      // Update global insight
      updateInsight(totalInsight);
      
      // Update local tracking
      setInsightGained(prev => prev + totalInsight);
      setLastInsightGain(totalInsight);
      setShowInsightGain(true);
      
      // Clear gain effect after animation
      setTimeout(() => setShowInsightGain(false), 2000);
    }
    
    // Update player score for relationship
    if (relationshipChange) {
      setPlayerScore(prev => prev + relationshipChange);
    }
    
    // If an action is active, complete it
    if (activeAction) {
      completeAction(activeAction, correct);
    }
    
    // Show feedback animation
    setTimeout(() => setShowOptionFeedback(null), 2000);
    
    // Forward to dialogue handler
    handleOptionSelect(option);
  };
  
  // Handle strategic action activation
  const handleActionActivate = (actionType: StrategicActionType) => {
    // Add to used actions list
    if (!usedActions.includes(actionType)) {
      setUsedActions(prev => [...prev, actionType]);
    }
    
    // Apply action to dialogue
    applyStrategicAction(actionType, character, currentStageId);
  };
  
  // Handle strategic action completion
  const handleActionComplete = (actionType: StrategicActionType, successful: boolean) => {
    // Could add more logic here if needed
  };
  
  // Handle strategic action cancellation
  const handleActionCancel = (actionType: StrategicActionType) => {
    // Could add more logic here if needed
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
      journalTier,
      actionsUsed: usedActions
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
  
  // Enhance options based on active action
  const enhancedOptions = useMemo(() => {
    if (!currentStage?.options) return [];
    
    // Apply strategic action enhancements
    return enhanceDialogueOptions(currentStage.options, activeAction);
  }, [currentStage?.options, activeAction]);
  
  // Get a feedback message based on response type
  const getFeedbackMessage = (type: 'correct' | 'incorrect', approach?: string): string => {
    if (type === 'correct') {
      if (approach === 'precision') {
        return 'Your precise approach shows strong technical understanding.';
      } else if (approach === 'humble') {
        return 'Your thoughtful consideration demonstrates professional maturity.';
      } else if (approach === 'confidence') {
        return 'Your confident analysis is well-founded.';
      }
      return 'Good approach to the situation.';
    } else {
      if (approach === 'overconfidence') {
        return 'A more measured approach would be advisable in this context.';
      } else if (approach === 'imprecision') {
        return 'Greater attention to technical details would strengthen your response.';
      }
      return 'Consider a different perspective on this issue.';
    }
  };
  
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
    <div className="p-6 max-w-4xl mx-auto bg-surface pixel-borders relative">
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
        
        {/* Resource meters */}
        <div className="flex flex-col gap-2">
          <InsightMeter />
          <MomentumCounter 
            level={momentum}
            consecutiveCorrect={consecutiveCorrect}
          />
        </div>
      </div>
      
      {/* Strategic actions panel */}
      <div className="absolute top-4 right-4 z-10">
        <StrategicActionsContainer 
          characterId={character}
          stageId={currentStageId}
          onActionActivate={handleActionActivate}
          onActionComplete={handleActionComplete}
          onActionCancel={handleActionCancel}
        />
      </div>
      
      {/* Dialogue area */}
      <div className="bg-surface-dark p-4 pixel-borders-thin mb-4 min-h-[120px] relative">
        {/* Feedback overlay for correct/incorrect answers */}
        <AnimatePresence>
          {showOptionFeedback && (
            <motion.div 
              className={`absolute inset-0 pointer-events-none z-10 ${
                showOptionFeedback === 'correct' 
                  ? 'bg-green-500/10 border border-green-500/30' 
                  : 'bg-red-500/10 border border-red-500/30'
              }`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div 
                className={`absolute top-2 right-2 px-2 py-1 text-xs font-pixel ${
                  showOptionFeedback === 'correct' ? 'bg-green-700 text-green-100' : 'bg-red-700 text-red-100'
                }`}
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 20, opacity: 0 }}
              >
                {showOptionFeedback === 'correct' ? 'Effective Approach' : 'Suboptimal Approach'}
              </motion.div>
              
              {/* Feedback message */}
              {feedbackMessage && (
                <motion.div
                  className={`absolute bottom-2 left-2 right-2 px-3 py-2 text-sm font-pixel ${
                    showOptionFeedback === 'correct' ? 'bg-green-900/70 text-green-100' : 'bg-red-900/70 text-red-100'
                  }`}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1, transition: { delay: 0.2 } }}
                  exit={{ y: 20, opacity: 0 }}
                >
                  {feedbackMessage}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Insight gain animation */}
        <AnimatePresence>
          {showInsightGain && lastInsightGain > 0 && (
            <motion.div
              className="absolute top-0 right-0 mt-2 mr-2 z-20 pointer-events-none"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
            >
              <div className="flex items-center bg-blue-900/80 px-3 py-1 rounded shadow-lg">
                <span className="text-blue-300 font-pixel text-sm mr-1">+</span>
                <span className="text-blue-200 font-pixel text-sm">{lastInsightGain}</span>
                <span className="text-blue-300 font-pixel text-sm ml-1">Insight</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
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
        enhancedOptions && enhancedOptions.length > 0 ? (
          <div className="space-y-2">
            {enhancedOptions.map((option: any) => (
              <motion.button
                key={option.id}
                className={`w-full text-left p-3 bg-surface hover:bg-surface-dark pixel-borders-thin relative
                  ${activeAction === 'boast' ? 'border-orange-500/50' : ''}
                  ${activeAction === 'reframe' ? 'border-blue-500/50' : ''}
                `}
                onClick={() => handleOptionSelectWrapper(option)}
                disabled={isTyping}
                whileHover={{ x: 3 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className="flex justify-between">
                  <PixelText>{option.text}</PixelText>
                  
                  {/* Show insight preview */}
                  {option.insightGain && option.insightGain > 0 && (
                    <motion.span 
                      className={`ml-2 text-xs ${
                        activeAction === 'boast' 
                          ? 'bg-orange-600 text-white' 
                          : 'bg-blue-600 text-white'
                      } px-2 py-1 rounded-sm`}
                      animate={activeAction === 'boast' ? { scale: [1, 1.1, 1], transition: { repeat: Infinity, duration: 1.5 } } : {}}
                    >
                      {activeAction === 'boast' ? `+${option.insightGain * 2}` : `+${option.insightGain}`}
                    </motion.span>
                  )}
                  
                  {/* Special indicators for strategic options */}
                  {activeAction === 'reframe' && (option.approach === 'humble' || option.approach === 'precision') && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full"></span>
                  )}
                  
                  {activeAction === 'boast' && (option.approach === 'confidence' || option.approach === 'precision') && (
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
              </motion.button>
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
        <div className="mt-12 pt-4 border-t border-gray-700 text-xs opacity-50">
          <div>State Machine: {stateMachineEnabled ? 'Yes' : 'No'}</div>
          <div>Current Stage: {currentStageId}</div>
          <div>Player Score: {playerScore}</div>
          <div>Insight: {insight} (Gained: {insightGained})</div>
          <div>Momentum: {momentum} (Consecutive: {consecutiveCorrect})</div>
          <div>Active Action: {activeAction || 'None'}</div>
          <div>Used Actions: {usedActions.join(', ')}</div>
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