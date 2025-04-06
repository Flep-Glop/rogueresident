// app/components/dialogue/DialogueSystem.tsx
'use client';
import { useState, useEffect, createContext, useContext, ReactNode, useRef } from 'react';
import { PixelText, PixelButton } from '../PixelThemeProvider';
import { useGameEffects } from '../GameEffects';
import { useTypewriter } from '../../hooks/useTypewriter';
import { meetsRequirement, getMissingKnowledgeInfo } from '../../utils/knowledgeRequirements';
import { KnowledgeRequirement } from '../../utils/knowledgeRequirements';
import { KNOWLEDGE_DOMAINS } from '../knowledge/ConstellationView';
import { useEventBus } from '../../core/events/CentralEventBus';
import { GameEventType } from '../../core/events/EventTypes';
import { useDialogueStateMachine } from '../../core/dialogue/DialogueStateMachine';
import { shallow } from 'zustand/shallow';

// Prototype character types - limited to 3 key characters
export type Character = 'kapoor' | 'jesse' | 'quinn' | 'player';

// Knowledge acquisition types
export type KnowledgeDomain = 'clinical' | 'technical' | 'theoretical' | 'general';

// Reaction types for character portraits
export type ReactionType = 'positive' | 'negative' | 'surprise' | 'confusion' | 'approval' | 'annoyance';

export interface DialogueOption {
  id: string;
  text: string;
  responseText: string;
  insightGain?: number; 
  knowledgeGain?: {
    domain: KnowledgeDomain;
    conceptId?: string;
    amount: number;
  };
  nextNodeId?: string;
  requiresKnowledge?: KnowledgeRequirement;
  reaction?: ReactionType;
}

// Dialogue node interface
export interface DialogueNode {
  id: string;
  text: string;
  character: Character;
  options?: DialogueOption[];
  nextNodeId?: string;
}

// Dialogue context interface
interface DialogueContextType {
  startDialogue: (nodes: DialogueNode[], startNodeId: string, onComplete?: () => void) => void;
  endDialogue: () => void;
  isActive: boolean;
}

// Create context
const DialogueContext = createContext<DialogueContextType>({
  startDialogue: () => {},
  endDialogue: () => {},
  isActive: false
});

// Custom hook
export const useDialogue = () => useContext(DialogueContext);

// Character Reaction Component with enhanced visibility
const CharacterReaction = ({ type, isActive, character }: { type: ReactionType, isActive: boolean, character: Character }) => {
  const [visible, setVisible] = useState(false);
  const [animationClass, setAnimationClass] = useState('');
  
  useEffect(() => {
    if (isActive) {
      setVisible(true);
      setAnimationClass('reaction-enter');
      
      // First remove enter animation after it completes
      const enterTimer = setTimeout(() => {
        setAnimationClass('reaction-active');
      }, 300);
      
      // Then remove the emote after display period
      const exitTimer = setTimeout(() => {
        setAnimationClass('reaction-exit');
        setTimeout(() => setVisible(false), 300); // After exit animation
      }, 2000);
      
      return () => {
        clearTimeout(enterTimer);
        clearTimeout(exitTimer);
      };
    }
  }, [isActive, type, character]);
  
  if (!visible) return null;
  
  const symbols: Record<ReactionType, string> = {
    positive: "!",
    negative: "...",
    surprise: "?!",
    confusion: "?",
    approval: "✓",
    annoyance: "#@$!"
  };

  const colors: Record<Character, string> = {
    'kapoor': 'text-clinical-light',
    'jesse': 'text-qa-light',
    'quinn': 'text-educational-light',
    'player': 'text-text-primary'
  };
  
  return (
    <div 
      className={`absolute top-0 right-0 ${animationClass} ${colors[character]} z-50`}
      style={{
        fontSize: '28px',
        fontFamily: 'var(--font-pixel)',
        padding: '6px 10px',
        background: 'rgba(0,0,0,0.4)',
        borderRadius: '8px',
        boxShadow: '0 0 8px rgba(0,0,0,0.5), 0 0 3px rgba(255,255,255,0.3) inset',
        textShadow: '2px 2px 0 rgba(0,0,0,0.8)',
        transform: 'translateY(-50%)',
        pointerEvents: 'none'
      }}
    >
      {symbols[type]}
    </div>
  );
};

// Provider component
export function DialogueProvider({ children }: { children: ReactNode }) {
  const { playSound, flashScreen } = useGameEffects();
  const eventBus = useEventBus();
  
  // Ref to track if component is mounted
  const isMounted = useRef(true);
  const dialogueIdRef = useRef<string>('');
  const onDialogueCompleteRef = useRef<(() => void) | null>(null);
  
  // Fix the state destructuring with proper typing
  const {
    isActive,
    dialogueNodes,
    currentNodeId, 
    selectedOption,
    currentReaction,
    isShaking
  } = useDialogueStateMachine(state => ({
    isActive: state.isActive || false,
    dialogueNodes: state.dialogueNodes || [],
    currentNodeId: state.currentNodeId || null,
    selectedOption: state.selectedOption || null,
    currentReaction: state.currentReaction || null,
    isShaking: state.isShaking || false
  }), shallow);
  
  // Component ready state
  const [isReady, setIsReady] = useState(false);
  
  // Get current node
  const currentNode = currentNodeId 
    ? dialogueNodes.find(node => node.id === currentNodeId) || null
    : null;
    
  // Text to display - either node text or selected option response
  const textToShow = selectedOption ? selectedOption.responseText : (currentNode?.text || '');
  
  // Use enhanced typewriter hook
  const { 
    displayText, 
    isTyping, 
    complete: skipTyping,
    showContinueIndicator
  } = useTypewriter(textToShow, {
    startDelay: 150,
    speed: 25
  });
  
  // Effect to handle component mount/unmount
  useEffect(() => {
    // Mark component as mounted after a short delay to ensure DOM is ready
    const timer = setTimeout(() => {
      if (isMounted.current) {
        setIsReady(true);
      }
    }, 100);
    
    // Dispatch initialization event
    eventBus.dispatch(GameEventType.UI_DIALOGUE_ADVANCED, {
      componentId: 'dialogueSystem',
      action: 'initialize',
      metadata: {}
    });
    
    // Cleanup on unmount
    return () => {
      isMounted.current = false;
      clearTimeout(timer);
      
      // Only dispatch completion on unmount if active
      if (isActive && dialogueIdRef.current) {
        eventBus.dispatch(GameEventType.DIALOGUE_COMPLETED, {
          flowId: dialogueIdRef.current,
          completed: false,
          reason: 'component_unmounted',
          character: currentNode?.character || 'unknown'
        });
      }
    };
  }, [eventBus, isActive, currentNode]);
  
  // Start dialogue
  const startDialogue = (nodes: DialogueNode[], startNodeId: string, onComplete?: () => void) => {
    // Generate a unique ID for this dialogue flow
    const newDialogueId = `dialogue-${Date.now()}-${startNodeId}`;
    dialogueIdRef.current = newDialogueId;
    
    // Store callback in ref to avoid it changing
    if (onComplete) {
      onDialogueCompleteRef.current = onComplete;
    }
    
    // Dispatch dialogue start event
    eventBus.dispatch(GameEventType.DIALOGUE_STARTED, {
      flowId: newDialogueId,
      initialStageId: startNodeId, 
      stages: nodes.map(node => ({
        id: node.id,
        text: node.text,
        options: node.options,
        nextStageId: node.nextNodeId,
        type: 'question' // Default type
      })),
      characterId: nodes[0]?.character || 'unknown',
      nodeId: startNodeId
    });
    
    // Play dialogue start sound
    if (playSound) playSound('ui-click');
  };
  
  // End dialogue
  const endDialogue = () => {
    // Dispatch dialogue completion event before clearing state
    if (isActive && dialogueIdRef.current) {
      eventBus.dispatch(GameEventType.DIALOGUE_COMPLETED, {
        flowId: dialogueIdRef.current,
        completed: true,
        reason: 'normal_completion',
        character: currentNode?.character || 'unknown'
      });
    }
    
    // Reset ref values
    dialogueIdRef.current = '';
    
    // Call completion callback if exists
    if (onDialogueCompleteRef.current) {
      onDialogueCompleteRef.current();
      onDialogueCompleteRef.current = null;
    }
  };
  
  // Handle option selection
  const selectOption = (option: DialogueOption) => {
    // Dispatch option selection event
    eventBus.dispatch(GameEventType.UI_DIALOGUE_ADVANCED, {
      componentId: 'dialogueSystem',
      action: 'option-selected',
      metadata: {
        optionId: option.id,
        stageId: currentNodeId,
        insightGain: option.insightGain,
        knowledgeGain: option.knowledgeGain,
        character: currentNode?.character,
        reaction: option.reaction
      }
    });
    
    // Dispatch detailed event with full context
    eventBus.dispatch(GameEventType.DIALOGUE_OPTION_SELECTED, {
      optionId: option.id,
      stageId: currentNodeId || 'unknown',
      character: currentNode?.character || 'unknown',
      flowId: dialogueIdRef.current,
      insightGain: option.insightGain,
      knowledgeGain: option.knowledgeGain,
    });
    
    // Visual and audio feedback based on insight gain
    if (option.insightGain && playSound) {
      if (option.insightGain >= 15) {
        playSound('success');
        if (flashScreen) flashScreen('green');
      } else if (option.insightGain && option.insightGain <= 5) {
        playSound('failure');
      } else {
        playSound('click');
      }
    }
  };
  
  // Move to next node
  const goToNextNode = () => {
    if (!currentNode) return;
    
    // If still typing, skip to the end instead of advancing
    if (isTyping) {
      skipTyping();
      
      // Dispatch skip event
      eventBus.dispatch(GameEventType.UI_DIALOGUE_ADVANCED, {
        componentId: 'dialogueSystem',
        action: selectedOption ? 'skip-response' : 'skip-text',
        metadata: {
          nodeId: currentNodeId,
          character: currentNode.character
        }
      });
      return;
    }
    
    // Dispatch continue event
    eventBus.dispatch(GameEventType.UI_DIALOGUE_ADVANCED, {
      componentId: 'dialogueSystem',
      action: 'continue',
      metadata: {
        nodeId: currentNodeId,
        selectedOptionId: selectedOption?.id,
        character: currentNode.character
      }
    });
  };
  
  // Character data for styling dialogue based on character
  const characterData: Record<Character, {name: string, color: string, bg: string}> = {
    'kapoor': { 
      name: 'Dr. Kapoor', 
      color: 'var(--clinical-color)',
      bg: 'bg-clinical'
    },
    'jesse': { 
      name: 'Technician Jesse', 
      color: 'var(--qa-color)',
      bg: 'bg-qa'
    },
    'quinn': { 
      name: 'Dr. Quinn', 
      color: 'var(--educational-color)',
      bg: 'bg-educational'
    },
    'player': { 
      name: 'Resident', 
      color: '#333333',
      bg: 'bg-surface-dark'
    }
  };
  
  // Render dialogue option with knowledge requirements
  const renderDialogueOption = (option: DialogueOption) => {
    // Check if option requires knowledge
    const knowledge = option.requiresKnowledge;
    const isMet = knowledge ? meetsRequirement(knowledge) : true;
    
    // Get domain style if there's a knowledge requirement
    const getDomainStyle = () => {
      if (!knowledge) return {};
      
      // Check if 'domain' property exists in the knowledge object
      if ('domain' in knowledge && knowledge.domain) {
        // Need to validate knowledge.domain is a key in KNOWLEDGE_DOMAINS
        const domainKey = knowledge.domain as keyof typeof KNOWLEDGE_DOMAINS;
        if (KNOWLEDGE_DOMAINS[domainKey]) {
          return {
            borderColor: KNOWLEDGE_DOMAINS[domainKey].color,
            textClass: KNOWLEDGE_DOMAINS[domainKey].textClass,
            bgClass: isMet ? KNOWLEDGE_DOMAINS[domainKey].bgClass : ''
          };
        }
      }
      
      // Default fallback values
      return {
        borderColor: 'var(--educational-color)',
        textClass: 'text-educational-light',
        bgClass: isMet ? 'bg-educational/20' : ''
      };
    };
    
    const domainStyle = getDomainStyle();
    
    return (
      <button
        key={option.id}
        className={`
          w-full text-left p-3 
          ${isMet 
            ? `${domainStyle.bgClass} hover:bg-surface-dark pixel-borders-thin` 
            : 'bg-surface-dark opacity-70 cursor-not-allowed'}
          ${isMet && knowledge 
            ? 'border-l-4' 
            : 'pixel-borders-thin'}
          transition-all duration-200
        `}
        style={knowledge ? {
          borderLeftColor: isMet ? domainStyle.borderColor : 'transparent' 
        } : {}}
        onClick={() => isMet && selectOption(option)}
        disabled={!isMet}
        title={!isMet && knowledge ? getMissingKnowledgeInfo(knowledge) : ''}
      >
        <div className="flex justify-between items-center">
          <PixelText>{option.text}</PixelText>
          
          <div className="flex items-center space-x-2">
            {/* Show knowledge indicator if option requires knowledge */}
            {knowledge && isMet && (
              <span className={`w-3 h-3 rounded-full ${domainStyle.bgClass} animate-pulse`}></span>
            )}
            
            {/* Show insight preview if available */}
            {option.insightGain && option.insightGain > 0 && (
              <span className="text-xs bg-clinical text-white px-2 py-1">
                +{option.insightGain}
              </span>
            )}
            
            {/* Show lock icon if required */}
            {!isMet && (
              <span className="text-text-secondary">🔒</span>
            )}
          </div>
        </div>
      </button>
    );
  };
  
  // Provide context value
  const value = {
    startDialogue,
    endDialogue,
    isActive
  };
  
  return (
    <DialogueContext.Provider value={value}>
      {children}
      
      {/* Dialogue UI */}
      {isActive && currentNode && isReady && (
        <div className="fixed bottom-0 left-0 right-0 p-4 z-50">
          <div 
            className="pixel-borders bg-surface max-w-4xl mx-auto relative"
            style={{ borderColor: characterData[currentNode.character].color }}
          >
            {/* Character portrait - Enhanced with reaction handling */}
            <div className={`absolute -top-16 -left-2 w-16 h-16 ${isShaking ? 'character-shake' : ''}`}>
              <div className="character-portrait-mini bg-surface-dark relative">
                {/* Character portrait */}
                <div className="w-full h-full flex items-center justify-center text-3xl">
                  {currentNode.character === 'kapoor' && '👨🏽‍⚕️'}
                  {currentNode.character === 'jesse' && '👨‍🔧'}
                  {currentNode.character === 'quinn' && '👩‍🔬'}
                  {currentNode.character === 'player' && '🧑‍🔬'}
                </div>
                
                {/* Character reaction */}
                {currentReaction && (
                  <CharacterReaction 
                    type={currentReaction} 
                    isActive={currentReaction !== null}
                    character={currentNode.character}
                  />
                )}
              </div>
            </div>
            
            {/* Character name */}
            <div 
              className={`p-2 ${characterData[currentNode.character].bg}`}
            >
              <PixelText className="text-white">{characterData[currentNode.character].name}</PixelText>
            </div>
            
            {/* Dialogue text */}
            <div 
              className="p-4 min-h-[100px] relative" 
              onClick={() => {
                if (isTyping) {
                  // Skip typing and show full text immediately
                  skipTyping();
                  
                  // Dispatch skip event
                  eventBus.dispatch(GameEventType.UI_DIALOGUE_ADVANCED, {
                    componentId: 'dialogueSystem',
                    action: 'skip-text',
                    metadata: {
                      nodeId: currentNodeId,
                      character: currentNode.character
                    }
                  });
                }
              }}
            >
              <PixelText>{displayText}{isTyping ? '|' : ''}</PixelText>
              
              {/* Click to continue indicator */}
              {!isTyping && showContinueIndicator && !selectedOption && !currentNode.options && (
                <div 
                  className="absolute bottom-2 right-2 text-text-secondary text-sm animate-pulse"
                  style={{ opacity: 0.7 }}
                >
                  <PixelText>Click to continue ▶</PixelText>
                </div>
              )}
            </div>
            
            {/* Options or continue button */}
            <div className="p-4 bg-surface-dark">
              {!isTyping && !selectedOption && currentNode.options ? (
                <div className="space-y-2">
                  {currentNode.options.map(option => renderDialogueOption(option))}
                </div>
              ) : (
                <PixelButton
                  className="bg-surface text-text-primary hover:bg-surface-dark"
                  onClick={goToNextNode}
                >
                  {isTyping ? 'Skip' : selectedOption ? 'Continue' : 'Next'}
                </PixelButton>
              )}
            </div>
          </div>
        </div>
      )}
    </DialogueContext.Provider>
  );
}