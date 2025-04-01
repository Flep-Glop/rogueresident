// app/components/dialogue/DialogueSystem.tsx
'use client';
import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useGameStore } from '../../store/gameStore';
import { PixelText, PixelButton } from '../PixelThemeProvider';
import { useGameEffects } from '../GameEffects';

// Prototype character types - limited to 3 key characters
export type Character = 'kapoor' | 'jesse' | 'quinn' | 'player';

// Knowledge acquisition types
export type KnowledgeDomain = 'clinical' | 'technical' | 'theoretical' | 'general';

export interface DialogueOption {
  id: string;
  text: string;
  responseText: string;
  insightGain?: number; // Insight points gained for this option
  knowledgeGain?: {
    domain: KnowledgeDomain;
    amount: number; // Percentage progress toward mastery
  };
  nextNodeId?: string; // ID of next dialogue node if this option is selected
  requiresKnowledge?: {
    domain: KnowledgeDomain;
    level: number; // Minimum mastery percentage required
  };
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

// Provider component
export function DialogueProvider({ children }: { children: ReactNode }) {
  const { updateInsight } = useGameStore();
  const { playSound } = useGameEffects();
  
  const [dialogueNodes, setDialogueNodes] = useState<DialogueNode[]>([]);
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [selectedOption, setSelectedOption] = useState<DialogueOption | null>(null);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [onDialogueComplete, setOnDialogueComplete] = useState<(() => void) | null>(null);
  
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
      
      // In a full implementation, would also update knowledge constellation
      if (option.knowledgeGain) {
        console.log(`Knowledge gained: ${option.knowledgeGain.amount}% in ${option.knowledgeGain.domain} domain`);
        // Would call a function like: updateKnowledgeDomain(option.knowledgeGain.domain, option.knowledgeGain.amount)
      }
    }
    
    // Play selection sound
    if (playSound) playSound('click');
  };
  
  // Move to next node
  const goToNextNode = () => {
    if (!currentNode) return;
    
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
            className="pixel-borders bg-surface max-w-4xl mx-auto"
            style={{ borderColor: characterData[currentNode.character].color }}
          >
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
                  {currentNode.options.map(option => {
                    // Check if option requires knowledge
                    const isLocked = option.requiresKnowledge !== undefined;
                    const lockMessage = isLocked ? 
                      `Requires ${option.requiresKnowledge!.level}% mastery in ${option.requiresKnowledge!.domain}` : '';
                    
                    return (
                      <button
                        key={option.id}
                        className={`
                          w-full text-left p-2 
                          ${isLocked ? 'bg-surface-dark opacity-50 cursor-not-allowed' : 'pixel-borders-thin bg-surface hover:bg-surface-dark'}
                        `}
                        onClick={() => !isLocked && selectOption(option)}
                        disabled={isLocked}
                        title={lockMessage}
                      >
                        <div className="flex justify-between items-center">
                          <PixelText>{option.text}</PixelText>
                          
                          {/* Show insight gain if applicable */}
                          {option.insightGain && option.insightGain > 0 && (
                            <span className="ml-2 text-xs bg-clinical text-white px-2 py-1">
                              +{option.insightGain} insight
                            </span>
                          )}
                          
                          {/* Show lock icon if required */}
                          {isLocked && (
                            <span className="ml-2 text-text-secondary">🔒</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
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