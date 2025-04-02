// app/components/dialogue/DialogueSystem.tsx
'use client';
import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useKnowledgeStore } from '../../store/knowledgeStore';
import { PixelText, PixelButton } from '../PixelThemeProvider';
import { useGameEffects } from '../GameEffects';
import { meetsRequirement, getMissingKnowledgeInfo } from '../../utils/knowledgeRequirements';
import { KnowledgeRequirement } from '../../utils/knowledgeRequirements';
import { KNOWLEDGE_DOMAINS } from '../knowledge/ConstellationView';

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
  insightGain?: number; // Insight points gained for this option
  knowledgeGain?: {
    domain: KnowledgeDomain;
    conceptId?: string;
    amount: number; // Percentage progress toward mastery
  };
  nextNodeId?: string; // ID of next dialogue node if this option is selected
  requiresKnowledge?: KnowledgeRequirement; // Knowledge requirement to unlock this option
  reaction?: ReactionType; // Character's reaction to this option
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

// Character Reaction Component 
const CharacterReaction = ({ type, isActive, character }: { type: ReactionType, isActive: boolean, character: Character }) => {
  const [visible, setVisible] = useState(isActive);
  
  useEffect(() => {
    if (isActive) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [isActive]);
  
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
    <div className={`absolute top-2 right-2 animate-bounce text-2xl font-pixel z-10 ${colors[character]}`}>
      {symbols[type]}
    </div>
  );
};

// Provider component
export function DialogueProvider({ children }: { children: ReactNode }) {
  const { updateInsight } = useGameStore();
  const { updateMastery } = useKnowledgeStore();
  const { playSound, flashScreen } = useGameEffects();
  
  const [dialogueNodes, setDialogueNodes] = useState<DialogueNode[]>([]);
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [selectedOption, setSelectedOption] = useState<DialogueOption | null>(null);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [onDialogueComplete, setOnDialogueComplete] = useState<(() => void) | null>(null);
  const [currentReaction, setCurrentReaction] = useState<ReactionType | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  
  // Get current node
  const currentNode = currentNodeId 
    ? dialogueNodes.find(node => node.id === currentNodeId) || null
    : null;
  
  // Start dialogue
  const startDialogue = (nodes: DialogueNode[], startNodeId: string, onComplete?: () => void) => {
    setDialogueNodes(nodes);
    setCurrentNodeId(startNodeId);
    setIsActive(true);
    setSelectedOption(null);
    setCurrentReaction(null);
    
    if (onComplete) {
      setOnDialogueComplete(() => onComplete);
    }
    
    // Play dialogue start sound
    if (playSound) playSound('ui-click');
  };
  
  // End dialogue
  const endDialogue = () => {
    setIsActive(false);
    setDialogueNodes([]);
    setCurrentNodeId(null);
    setSelectedOption(null);
    setCurrentReaction(null);
    
    // Call completion callback if exists
    if (onDialogueComplete) {
      onDialogueComplete();
      setOnDialogueComplete(null);
    }
  };
  
  // Handle option selection
  const selectOption = (option: DialogueOption) => {
    setSelectedOption(option);
    
    // Process knowledge and insight gains
    if (option.insightGain && option.insightGain > 0) {
      updateInsight(option.insightGain);
      
      // Update knowledge constellation
      if (option.knowledgeGain && option.knowledgeGain.conceptId) {
        updateMastery(option.knowledgeGain.conceptId, option.knowledgeGain.amount);
        
        // Log knowledge gain for debugging
        console.log(`Knowledge gained: ${option.knowledgeGain.amount}% in ${option.knowledgeGain.domain} domain, concept: ${option.knowledgeGain.conceptId}`);
      }
    }
    
    // Set reaction if any
    if (option.reaction) {
      setCurrentReaction(option.reaction);
      
      // Trigger portrait shake
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 400);
    } else if (option.insightGain && option.insightGain >= 15) {
      // Default positive reaction for high insight
      setCurrentReaction('positive');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 400);
    } else if (option.insightGain && option.insightGain <= 0) {
      // Default negative reaction for no insight
      setCurrentReaction('negative');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 400);
    }
    
    // Play selection sound based on insight gain
    if (playSound) {
      if (option.insightGain && option.insightGain >= 15) {
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
    
    // Clear reaction when moving to next node
    setCurrentReaction(null);
    
    if (selectedOption) {
      // If we have a selected option
      if (currentNode.options && selectedOption) {
        setSelectedOption(null);
        
        // Find a matching option and get its next node if specified
        const matchingOption = currentNode.options.find(opt => opt.id === selectedOption.id);
        if (matchingOption && matchingOption.nextNodeId) {
          setCurrentNodeId(matchingOption.nextNodeId);
          return;
        }
      }
    }
    
    // Otherwise use the current node's next node
    if (currentNode.nextNodeId) {
      setCurrentNodeId(currentNode.nextNodeId);
    } else {
      // No next node, end dialogue
      endDialogue();
    }
  };
  
  // Typewriter effect
  useEffect(() => {
    if (!currentNode) return;
    
    // Text to display - either node text or selected option response
    const textToShow = selectedOption ? selectedOption.responseText : currentNode.text;
    let index = 0;
    setDisplayedText('');
    setIsTyping(true);
    
    const interval = setInterval(() => {
      if (index < textToShow.length) {
        setDisplayedText(prev => prev + textToShow.charAt(index));
        index++;
      } else {
        clearInterval(interval);
        setIsTyping(false);
      }
    }, 30);
    
    return () => clearInterval(interval);
  }, [currentNode, selectedOption]);
  
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
      
      if (knowledge.domain) {
        return {
          borderColor: KNOWLEDGE_DOMAINS[knowledge.domain].color,
          textClass: KNOWLEDGE_DOMAINS[knowledge.domain].textClass,
          bgClass: isMet ? KNOWLEDGE_DOMAINS[knowledge.domain].bgClass : ''
        };
      }
      
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
      {isActive && currentNode && (
        <div className="fixed bottom-0 left-0 right-0 p-4 z-50">
          <div 
            className="pixel-borders bg-surface max-w-4xl mx-auto relative"
            style={{ borderColor: characterData[currentNode.character].color }}
          >
            {/* Character portrait area with reaction */}
            <div className={`absolute -top-16 -left-2 w-16 h-16 ${isShaking ? 'character-shake' : ''}`}>
              <div className="character-portrait-mini bg-surface-dark relative">
                {/* Character portrait would go here */}
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
                    isActive={!!currentReaction}
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
              className="p-4 min-h-[100px]" 
              onClick={() => {
                if (isTyping) {
                  // Skip typing and show full text immediately
                  setIsTyping(false);
                  setDisplayedText(selectedOption ? selectedOption.responseText : currentNode.text);
                }
              }}
            >
              <PixelText>{displayedText}{isTyping ? '|' : ''}</PixelText>
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