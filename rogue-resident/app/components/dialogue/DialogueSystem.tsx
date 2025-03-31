// app/components/dialogue/DialogueSystem.tsx
'use client';
import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { PixelText, PixelButton } from '../PixelThemeProvider';

// Character types
export type Character = 'kapoor' | 'jesse' | 'quinn' | 'player';

export interface DialogueOption {
  id: string;
  text: string;
  responseText: string;
  effect?: number; // Relationship change
  nextNodeId?: string; // ID of next dialogue node if this option is selected
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
  startDialogue: (nodes: DialogueNode[], startNodeId: string) => void;
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
  const [dialogueNodes, setDialogueNodes] = useState<DialogueNode[]>([]);
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [selectedOption, setSelectedOption] = useState<DialogueOption | null>(null);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  // Get current node
  const currentNode = currentNodeId 
    ? dialogueNodes.find(node => node.id === currentNodeId) || null
    : null;
  
  // Start dialogue
  const startDialogue = (nodes: DialogueNode[], startNodeId: string) => {
    setDialogueNodes(nodes);
    setCurrentNodeId(startNodeId);
    setIsActive(true);
    setSelectedOption(null);
  };
  
  // End dialogue
  const endDialogue = () => {
    setIsActive(false);
    setDialogueNodes([]);
    setCurrentNodeId(null);
    setSelectedOption(null);
  };
  
  // Handle option selection
  const selectOption = (option: DialogueOption) => {
    setSelectedOption(option);
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
  const characterData: Record<Character, {name: string, color: string}> = {
    'kapoor': { name: 'Dr. Kapoor', color: '#4e83bd' },
    'jesse': { name: 'Technician Jesse', color: '#5a6978' },
    'quinn': { name: 'Dr. Quinn', color: '#2c9287' },
    'player': { name: 'Resident', color: '#333333' }
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
              className="p-2"
              style={{ backgroundColor: characterData[currentNode.character].color }}
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
                  {currentNode.options.map(option => (
                    <button
                      key={option.id}
                      className="w-full text-left p-2 pixel-borders-thin bg-surface hover:bg-surface-dark"
                      onClick={() => selectOption(option)}
                    >
                      <PixelText>{option.text}</PixelText>
                    </button>
                  ))}
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