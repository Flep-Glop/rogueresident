// app/components/challenges/formats/ConversationFormat.tsx
'use client';
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../../store/gameStore';
import { useResourceStore, StrategicActionType } from '../../../store/resourceStore';
import { useDialogueFlow, DialogueStage, DialogueOptionView } from '../../../hooks/useDialogueFlow';
import { useTypewriter } from '../../../hooks/useTypewriter';
import { PixelButton, PixelText, PixelBox } from '../../PixelThemeProvider';
import { safeDispatch } from '../../../core/events/CentralEventBus';
import { GameEventType } from '../../../core/events/EventTypes';
import InsightMeter from '../../gameplay/InsightMeter';
import MomentumCounter from '../../gameplay/MomentumCounter';
import { StrategicActionsContainer } from '../../gameplay/StrategicActions';
import { applyStrategicAction, enhanceDialogueOptions } from '../../../core/dialogue/ActionIntegration';
import { usePrimitiveStoreValue, useStableStoreValue } from '../../../core/utils/storeHooks';

// ===== TYPES =====

// Result type for completion callback
export interface InteractionResults {
  insightGained: number;
  relationshipChange: number;
  knowledgeGained: Record<string, number>;
  journalTier?: 'base' | 'technical' | 'annotated';
  actionsUsed?: StrategicActionType[];
}

// Character metadata
interface CharacterData {
  name: string;
  title: string;
  sprite: string;
  primaryColor: string;
  textClass: string;
  bgClass: string;
}

// Component props
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
 * ConversationFormat - Optimized with Chamber Pattern
 * 
 * This component applies the Chamber Transition Pattern:
 * 1. Uses primitive values instead of objects for rendering
 * 2. Ensures stable function references
 * 3. Decouples animations from state updates
 * 4. Makes state updates atomically
 */
function ConversationFormat({
  character,
  dialogueStages,
  dialogueId = `${character}-dialogue`,
  onComplete,
  onOptionSelected,
  onStageChange,
  stateMachineEnabled = false
}: ConversationFormatProps) {
  // ===== REFS =====
  // Track component mount state
  const isMountedRef = useRef(true);
  // Animation container refs
  const characterRef = useRef<HTMLDivElement>(null);
  const dialogueContainerRef = useRef<HTMLDivElement>(null);
  const optionsContainerRef = useRef<HTMLDivElement>(null);
  
  // ===== PRIMITIVE STORE VALUES =====
  // Extract only primitives from game store
  const currentNodeId = usePrimitiveStoreValue(
    useGameStore,
    state => state.currentNodeId,
    null
  );
  
  // Extract resource primitives
  const resourceValues = useStableStoreValue(
    useResourceStore,
    state => ({
      insight: state.insight,
      momentum: state.momentum,
      activeAction: state.activeAction
    })
  );
  
  // Extract stable functions
  const resourceActions = useStableStoreValue(
    useResourceStore,
    state => ({
      activateAction: state.activateAction,
      completeAction: state.completeAction,
      cancelAction: state.cancelAction,
      incrementMomentum: state.incrementMomentum,
      resetMomentum: state.resetMomentum,
      updateInsight: state.updateInsight
    })
  );
  
  // Safely extract values and functions with fallbacks
  const { 
    insight = 0, 
    momentum = 0, 
    activeAction = null 
  } = resourceValues;
  
  const {
    activateAction = () => console.warn("activateAction not available"),
    completeAction = () => console.warn("completeAction not available"),
    cancelAction = () => console.warn("cancelAction not available"),
    incrementMomentum = () => console.warn("incrementMomentum not available"),
    resetMomentum = () => console.warn("resetMomentum not available"),
    updateInsight = () => console.warn("updateInsight not available")
  } = resourceActions;
  
  // ===== LOCAL STATE =====
  // Group related state to minimize rerenders
  const [interactionState, setInteractionState] = useState({
    playerScore: 0,
    insightGained: 0,
    usedActions: [] as StrategicActionType[],
    consecutiveCorrect: 0,
    lastInsightGain: 0,
    isInitialized: false
  });
  
  // UI animation states
  const [uiState, setUiState] = useState({
    showOptionFeedback: null as 'correct' | 'incorrect' | null,
    feedbackMessage: '',
    showInsightGain: false,
    characterReaction: 'idle' as 'idle' | 'positive' | 'negative' | 'thinking',
    applyScreenShake: false
  });
  
  // ===== DIALOGUE HOOK =====
  // Use refactored dialogue flow hook
  const {
    // State as primitives
    isLoading,
    error,
    currentStageId,
    showResponse,
    showBackstory,
    backstoryText,
    
    // Data access functions
    getCurrentStage,
    getSelectedOption,
    
    // Actions
    handleOptionSelect: dialogueHandleOptionSelect,
    handleContinue: dialogueHandleContinue,
    completeDialogue,
    
    // Status
    status
  } = useDialogueFlow({
    characterId: character,
    nodeId: currentNodeId || undefined,
    dialogueId,
    stages: dialogueStages,
    onOptionSelected,
    onStageChange
  });
  
  // ===== MEMOIZED VALUES =====
  // Character data
  const charData = useMemo(() => getCharacterData(character), [character]);
  
  // Current stage from accessor function
  const currentStage = useMemo(() => getCurrentStage(), [getCurrentStage]);
  
  // Selected option from accessor function
  const selectedOption = useMemo(() => getSelectedOption(), [getSelectedOption]);
  
  // Enhanced dialogue options based on active strategic action
  const enhancedOptions = useMemo(() => {
    if (!currentStage?.options) return [];
    
    return enhanceDialogueOptions(currentStage.options, activeAction);
  }, [currentStage, activeAction]);
  
  // ===== INITIALIZATION EFFECT =====
  // Set initialization flag when dialogue is ready
  useEffect(() => {
    if (currentStage && !interactionState.isInitialized) {
      setInteractionState(prev => ({
        ...prev,
        isInitialized: true
      }));
    }
  }, [currentStage, interactionState.isInitialized]);
  
  // Track mounted state
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  // ===== ANIMATION EFFECTS =====
  // Character reaction effect
  useEffect(() => {
    if (!characterRef.current) return;
    
    // Apply CSS class based on reaction state
    const element = characterRef.current;
    element.classList.remove(
      'character-idle', 
      'character-positive', 
      'character-negative', 
      'character-thinking'
    );
    element.classList.add(`character-${uiState.characterReaction}`);
    
    // Reset after animation completes
    if (uiState.characterReaction !== 'idle') {
      const timer = setTimeout(() => {
        if (isMountedRef.current) {
          setUiState(prev => ({
            ...prev,
            characterReaction: 'idle'
          }));
        }
      }, 800);
      
      return () => clearTimeout(timer);
    }
  }, [uiState.characterReaction]);
  
  // Screen shake effect
  useEffect(() => {
    if (!dialogueContainerRef.current || !uiState.applyScreenShake) return;
    
    // Apply CSS animation
    const element = dialogueContainerRef.current;
    element.classList.add('animate-shake-subtle');
    
    // Remove after animation completes
    const timer = setTimeout(() => {
      if (element) {
        element.classList.remove('animate-shake-subtle');
      }
      
      if (isMountedRef.current) {
        setUiState(prev => ({
          ...prev,
          applyScreenShake: false
        }));
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [uiState.applyScreenShake]);
  
  // Insight gain effect
  useEffect(() => {
    if (!uiState.showInsightGain) return;
    
    // Hide after animation duration
    const timer = setTimeout(() => {
      if (isMountedRef.current) {
        setUiState(prev => ({
          ...prev,
          showInsightGain: false
        }));
      }
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [uiState.showInsightGain]);
  
  // Feedback effect
  useEffect(() => {
    if (!uiState.showOptionFeedback) return;
    
    // Hide after animation duration
    const timer = setTimeout(() => {
      if (isMountedRef.current) {
        setUiState(prev => ({
          ...prev,
          showOptionFeedback: null
        }));
      }
    }, 1200);
    
    return () => clearTimeout(timer);
  }, [uiState.showOptionFeedback]);
  
  // ===== STABLE EVENT HANDLERS =====
  // Determine if an option is "correct"
  const isOptionCorrect = useCallback((option: DialogueOptionView & {
    relationshipChange?: number;
    approach?: string;
  }): boolean => {
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
  }, []);
  
  // Get appropriate feedback message
  const getFeedbackMessage = useCallback((type: 'correct' | 'incorrect', approach?: string): string => {
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
  }, []);
  
  // Handle option selection with resource integration
  const handleOptionSelect = useCallback((option: DialogueOptionView & {
    relationshipChange?: number;
    insightGain?: number;
    approach?: string;
  }) => {
    if (!isMountedRef.current || !currentStage) return;
    
    // Determine if option was "correct" for momentum
    const correct = isOptionCorrect(option);
    
    // Calculate base insight gain
    let baseInsightGain = option.insightGain || 0;
    
    // Get any relationship change
    const relationshipChange = option.relationshipChange || 0;
    
    // UI state updates first (decouple from data mutation)
    // Set character reaction based on relationship change
    let characterReaction: 'idle' | 'positive' | 'negative' | 'thinking' = 'idle';
    if (relationshipChange > 0) {
      characterReaction = 'positive';
    } else if (relationshipChange < 0) {
      characterReaction = 'negative';
    }
    
    // Prepare feedback
    const feedbackType = correct ? 'correct' : 'incorrect';
    const feedbackMessage = getFeedbackMessage(feedbackType, option.approach);
    
    // Update UI state atomically
    setUiState({
      showOptionFeedback: feedbackType,
      feedbackMessage,
      showInsightGain: baseInsightGain > 0,
      characterReaction,
      applyScreenShake: !correct
    });
    
    // Handle momentum changes
    if (correct) {
      // Update consecutive counter
      setInteractionState(prev => ({
        ...prev,
        consecutiveCorrect: prev.consecutiveCorrect + 1
      }));
      
      // Apply to global momentum
      incrementMomentum();
    } else {
      // Reset momentum
      setInteractionState(prev => ({
        ...prev,
        consecutiveCorrect: 0
      }));
      resetMomentum();
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
      setInteractionState(prev => ({
        ...prev,
        insightGained: prev.insightGained + totalInsight,
        lastInsightGain: totalInsight
      }));
    }
    
    // Update player score for relationship
    if (relationshipChange) {
      setInteractionState(prev => ({
        ...prev,
        playerScore: prev.playerScore + relationshipChange
      }));
    }
    
    // If an action is active, complete it
    if (activeAction) {
      completeAction(activeAction, correct);
    }
    
    // Forward to dialogue handler
    dialogueHandleOptionSelect(option);
  }, [
    currentStage,
    momentum,
    activeAction,
    isOptionCorrect,
    getFeedbackMessage,
    incrementMomentum,
    resetMomentum,
    updateInsight,
    completeAction,
    dialogueHandleOptionSelect
  ]);
  
  // Handle continue button
  const handleContinue = useCallback(() => {
    if (!isMountedRef.current) return;
    
    // Check if at conclusion
    if (currentStage?.isConclusion && !showResponse) {
      finalizeChallenge();
      return;
    }
    
    // Forward to dialogue handler
    dialogueHandleContinue();
  }, [currentStage, showResponse, dialogueHandleContinue, finalizeChallenge]);
  
  // Handle strategic action activation
  const handleActionActivate = useCallback((actionType: StrategicActionType) => {
    if (!isMountedRef.current) return;
    
    // Add to used actions list
    setInteractionState(prev => ({
      ...prev,
      usedActions: prev.usedActions.includes(actionType) ? 
        prev.usedActions : 
        [...prev.usedActions, actionType]
    }));
    
    // Apply action to dialogue
    applyStrategicAction(actionType, character, currentStageId);
    
    // Show thinking animation
    setUiState(prev => ({
      ...prev,
      characterReaction: 'thinking'
    }));
  }, [character, currentStageId]);
  
  // Handle strategic action completion
  const handleActionComplete = useCallback((actionType: StrategicActionType, successful: boolean) => {
    // Additional logic could be added if needed
  }, []);
  
  // Handle strategic action cancellation
  const handleActionCancel = useCallback((actionType: StrategicActionType) => {
    // Additional logic could be added if needed
  }, []);
  
  // Finalize the challenge
  const finalizeChallenge = useCallback(() => {
    if (!isMountedRef.current) return;
    
    // Determine journal tier
    const journalTier = interactionState.playerScore >= 3 ? 
      'annotated' : 
      interactionState.playerScore >= 0 ? 
        'technical' : 
        'base';
    
    // Call completion callback
    onComplete({
      insightGained: interactionState.insightGained,
      relationshipChange: interactionState.playerScore,
      knowledgeGained: {},
      journalTier,
      actionsUsed: interactionState.usedActions
    });
    
    // Complete state machine flow
    if (stateMachineEnabled) {
      completeDialogue();
    }
  }, [
    interactionState.playerScore,
    interactionState.insightGained,
    interactionState.usedActions,
    onComplete,
    stateMachineEnabled,
    completeDialogue
  ]);
  
  // ===== TYPEWRITER HOOKS =====
  // Typewriter for main text
  const {
    displayText: displayedText,
    isTyping,
    complete: skipTyping
  } = useTypewriter(currentStage?.text || '', { speed: 20 });
  
  // Typewriter for backstory
  const {
    displayText: displayedBackstoryText,
    isTyping: isTypingBackstory,
    complete: skipBackstoryTyping
  } = useTypewriter(backstoryText || '', { speed: 20 });
  
  // ===== RENDER HELPERS =====
  // Render boast option badge
  const renderBoastOption = useCallback((option: DialogueOptionView & {
    approach?: string;
    insightGain?: number;
  }) => {
    // Check if option has the 'confidence' approach and momentum is maxed
    if (momentum === 3 && option.approach === 'confidence' && option.insightGain) {
      return (
        <div className="absolute -left-4 top-1/2 transform -translate-y-1/2 bg-orange-600 text-white px-2 py-1 rounded-l text-xs font-pixel">
          CHALLENGE
        </div>
      );
    }
    
    return null;
  }, [momentum]);
  
  // ===== CONDITIONAL RENDERS =====
  // Loading state
  if (isLoading || !interactionState.isInitialized) {
    return (
      <div className="p-6 max-w-4xl mx-auto bg-surface pixel-borders">
        <div className="bg-surface-dark p-4 pixel-borders-thin mb-4 min-h-[120px] flex items-center justify-center">
          <PixelText>Initializing dialogue...</PixelText>
        </div>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="p-6 max-w-4xl mx-auto bg-surface pixel-borders">
        <div className="bg-surface-dark p-4 pixel-borders-thin mb-4 min-h-[120px]">
          <PixelText className="text-red-500">Error: {error}</PixelText>
        </div>
        <PixelButton
          className="mt-4 bg-blue-600 text-white"
          onClick={() => window.location.reload()}
        >
          Retry
        </PixelButton>
      </div>
    );
  }
  
  // ===== MAIN RENDER =====
  return (
    <div 
      ref={dialogueContainerRef}
      className="p-6 max-w-4xl mx-auto bg-surface pixel-borders relative transition-transform duration-300"
      data-testid="conversation-format"
    >
      {/* Character header - Enhanced with more space */}
      <div className="flex justify-between items-start mb-8">
        <div className="flex items-start">
          {/* Character portrait with dedicated space & reaction animation */}
          <div
            ref={characterRef}
            className="w-70 h-70 mr-6 relative pixel-borders character-idle"
            data-character={character}
            data-reaction={uiState.characterReaction}
          >
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `url(${charData.sprite})`,
                imageRendering: 'pixelated'
              }}
            ></div>
            <div className={`absolute inset-0 ${charData.bgClass} opacity-20 mix-blend-overlay`}></div>
          </div>

          {/* Character info - now with more space */}
          <div className="mt-4">
            <PixelText className={`text-2xl ${charData.textClass} pixel-glow mb-1`}>
              {charData.name}
            </PixelText>
            <PixelText className="text-lg text-text-secondary">
              {charData.title}
            </PixelText>
          </div>
        </div>

        {/* Empty spacer div to push things to sides */}
        <div className="flex-grow"></div>

        {/* Resource meters - now in header with more space and 200% larger */}
        <div className="flex flex-col gap-5 w-80">
          <InsightMeter size="lg" showValue={true} />
          <div className="flex items-center gap-4">
            <MomentumCounter
              level={momentum}
              consecutiveCorrect={interactionState.consecutiveCorrect}
              showLabel={true}
            />

            {/* Conditional boast button when momentum is maxed */}
            {momentum === 3 && (
              <motion.div
                className="bg-orange-700 border-orange-800 border-2 w-12 h-12 flex items-center justify-center pixel-borders"
                whileHover={{ y: -2 }}
                whileTap={{ y: 1 }}
                animate={{
                  scale: [1, 1.05, 1],
                  transition: { repeat: Infinity, duration: 1.5 }
                }}
              >
                <PixelText className="text-xs text-white">CHAL</PixelText>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Strategic actions panel - moved to below the character header */}
      <div className="flex justify-center mb-6">
        <StrategicActionsContainer
          characterId={character}
          stageId={currentStageId}
          onActionActivate={handleActionActivate}
          onActionComplete={handleActionComplete}
          onActionCancel={handleActionCancel}
        />
      </div>

      {/* Dialogue area */}
      <div className="bg-surface-dark p-5 pixel-borders mb-5 min-h-[150px] relative">
        {/* Feedback overlay for correct/incorrect answers */}
        <AnimatePresence>
          {uiState.showOptionFeedback && (
            <motion.div
              className={`absolute inset-0 pointer-events-none z-10 ${
                uiState.showOptionFeedback === 'correct'
                  ? 'bg-green-500/10 border border-green-500/30 feedback-correct-border' 
                  : 'bg-red-500/10 border border-red-500/30 feedback-incorrect-border'
              }`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className={`absolute top-2 right-2 px-2 py-1 text-xs font-pixel ${
                  uiState.showOptionFeedback === 'correct' ?
                    'bg-green-700 text-green-100' : 'bg-red-700 text-red-100'
                }`}
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 20, opacity: 0 }}
              >
                {uiState.showOptionFeedback === 'correct' ?
                  'Effective Approach' : 'Suboptimal Approach'}
              </motion.div>

              {/* Feedback message */}
              {uiState.feedbackMessage && (
                <motion.div
                  className={`absolute bottom-2 left-2 right-2 px-3 py-2 text-sm font-pixel ${
                    uiState.showOptionFeedback === 'correct' ? 
                      'bg-green-900/70 text-green-100' : 'bg-red-900/70 text-red-100'
                  }`}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1, transition: { delay: 0.2 } }}
                  exit={{ y: 20, opacity: 0 }}
                >
                  {uiState.feedbackMessage}
                </motion.div>
              )}

              {/* Particle burst effect on correct */}
              {uiState.showOptionFeedback === 'correct' && <div className="particle-burst-correct"></div>}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Insight gain animation */}
        <AnimatePresence>
          {uiState.showInsightGain && interactionState.lastInsightGain > 0 && (
            <motion.div
              className="absolute top-0 right-0 mt-2 mr-2 z-20 pointer-events-none"
              initial={{ y: -20, opacity: 0, scale: 0.5 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0, scale: 0.5 }}
            >
              <div className="flex items-center bg-blue-900/80 px-3 py-1 rounded shadow-lg">
                <span className="text-blue-300 font-pixel text-sm mr-1 animate-pulse-fast">+</span>
                <span className="text-blue-200 font-pixel text-sm">{interactionState.lastInsightGain}</span>
                <span className="text-blue-300 font-pixel text-sm ml-1">Insight</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Show backstory or main content */}
        {showBackstory ? (
          <PixelText className="italic text-xl leading-relaxed">
            {displayedBackstoryText}{isTypingBackstory ? '|' : ''}
          </PixelText>
        ) : (
          <div>
            <PixelText className="text-xl leading-relaxed">
              {displayedText}{isTyping ? '|' : ''}
            </PixelText>

            {/* Context note */}
            {!isTyping && currentStage?.contextNote && (
              <div className="mt-4 pt-2 border-t border-border">
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
          onClick={() => { 
            skipTyping(); 
            skipBackstoryTyping(); 
            handleContinue(); 
          }}
        >
          {(isTyping || isTypingBackstory) ? "Skip »" : "Continue →"}
        </PixelButton>
      ) : (
        enhancedOptions && enhancedOptions.length > 0 ? (
          <div 
            ref={optionsContainerRef}
            className="space-y-3"
          >
            {enhancedOptions.map((option: any, index: number) => (
              <motion.button
                key={option.id}
                className={`w-full text-left p-4 bg-surface hover:bg-surface-dark pixel-borders relative
                  ${activeAction === 'boast' ? 'border-orange-500/50' : ''}
                  ${activeAction === 'reframe' ? 'border-blue-500/50' : ''}
                `}
                onClick={() => handleOptionSelect(option)}
                disabled={isTyping}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0, transition: { delay: index * 0.05 } }}
                whileHover={{ x: 3 }}
                whileTap={{ scale: 0.99 }}
              >
                {/* Render boast badge if applicable */}
                {renderBoastOption(option)}

                <div className="flex justify-between">
                  <PixelText className="text-base">{option.text}</PixelText>

                  {/* Show insight preview */}
                  {option.insightGain && option.insightGain > 0 && (
                    <motion.span
                      className={`ml-2 text-xs ${
                        activeAction === 'boast'
                          ? 'bg-orange-600 text-white'
                          : 'bg-blue-600 text-white'
                      } px-2 py-1 rounded-sm`}
                      animate={activeAction === 'boast' ?
                        { scale: [1, 1.1, 1], transition: { repeat: Infinity, duration: 1.5 } } : {}}
                    >
                      {activeAction === 'boast' ?
                        `+${option.insightGain * 2}` : `+${option.insightGain}`}
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
                  <div className="mt-2 text-sm">
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
            onClick={handleContinue}
          >
            {isTyping ? "Skip »" : "Continue →"}
          </PixelButton>
        )
      )}

      {/* Debug info */}
      {process.env.NODE_ENV !== 'production' && (
        <div className="mt-12 pt-4 border-t border-gray-700 text-xs opacity-50">
          <div>State Machine: {stateMachineEnabled ? 'Yes' : 'No'}</div>
          <div>Current Stage: {currentStageId}</div>
          <div>Player Score: {interactionState.playerScore}</div>
          <div>Insight: {insight} (Gained: {interactionState.insightGained})</div>
          <div>Momentum: {momentum} (Consecutive: {interactionState.consecutiveCorrect})</div>
          <div>Active Action: {activeAction || 'None'}</div>
          <div>Used Actions: {interactionState.usedActions.join(', ')}</div>
        </div>
      )}
    </div>
  );
}

// ===== HELPER FUNCTIONS =====
// Character data
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

// Export with memo to prevent unnecessary rerenders
export default React.memo(ConversationFormat);