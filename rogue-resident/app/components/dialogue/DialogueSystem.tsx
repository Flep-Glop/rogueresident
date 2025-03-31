// app/components/dialogue/DialogueSystem.tsx
'use client';
import { useState, useEffect, useCallback, createContext, useContext, ReactNode, useRef } from 'react';
import { PixelText, PixelButton } from '../PixelThemeProvider';
import { useGameStore } from '../../store/gameStore';
import { useSoundManager } from '../audio/SoundManager';
import { useAnimation, Animated } from '../animation/AnimationSystem';

// Dialogue text styling types
export type TextEmphasis = 'normal' | 'bold' | 'italic' | 'technical' | 'excited' | 'quiet';
export type TextColor = 'default' | 'positive' | 'negative' | 'warning' | 'info';

// Character IDs type
export type CharacterID = 'kapoor' | 'jesse' | 'quinn' | 'player' | 'narrator';

// Dialogue node options/choices
export interface DialogueOption {
  id: string;
  text: string;
  responseText?: string;
  nextNodeId?: string;
  effects?: {
    relationship?: number;
    insight?: number;
    health?: number;
    special?: string;
  };
  condition?: {
    type: 'item' | 'relationship' | 'stat';
    target: string;
    value: number;
    comparison: '>' | '<' | '==' | '>=' | '<=';
  };
}

// Individual dialogue node
export interface DialogueNode {
  id: string;
  character: CharacterID;
  text: string;
  options?: DialogueOption[];
  nextNodeId?: string; // For automatic progression
  textSpeed?: 'slow' | 'normal' | 'fast'; // For character-specific typing speeds
  portrait?: string; // URL or emoji
  animation?: 'none' | 'bounce' | 'shake' | 'nod';
  mood?: 'neutral' | 'happy' | 'sad' | 'angry' | 'surprised' | 'thoughtful';
  textStyle?: {
    emphasis?: TextEmphasis;
    color?: TextColor;
  };
  enterEffect?: 'fade' | 'slide' | 'zoom';
  exitEffect?: 'fade' | 'slide' | 'zoom';
  conditions?: {
    type: 'item' | 'relationship' | 'stat';
    target: string;
    value: number;
    comparison: '>' | '<' | '==' | '>=' | '<=';
  }[];
  onEnter?: () => void;
  onExit?: () => void;
}

// Complete dialogue sequence
export interface DialogueSequence {
  id: string;
  nodes: DialogueNode[];
  startNodeId: string;
  context?: string;
  metadata?: {
    location?: string;
    time?: string;
    importance?: 'critical' | 'important' | 'optional';
    requiredForProgression?: boolean;
  };
}

// Character data
export interface CharacterData {
  id: CharacterID;
  name: string;
  title?: string;
  defaultPortrait: string;
  portraits?: Record<string, string>;
  textSpeed: 'slow' | 'normal' | 'fast';
  textStyle: {
    emphasis: TextEmphasis;
    color: TextColor;
  };
  voice: string; // Sound effect ID
  themeColor: string;
  darkColor: string;
  lightColor: string;
  relationship: {
    level: number;
    maxLevel: number;
  };
}

// Character data lookup
const CHARACTERS: Record<CharacterID, CharacterData> = {
  'kapoor': {
    id: 'kapoor',
    name: 'Dr. Kapoor',
    title: 'Chief Medical Physicist',
    defaultPortrait: '👨‍⚕️',
    textSpeed: 'normal',
    textStyle: {
      emphasis: 'technical',
      color: 'default'
    },
    voice: 'kapoor-speak',
    themeColor: 'var(--clinical-color)',
    darkColor: 'var(--clinical-color-dark)',
    lightColor: 'var(--clinical-color-light)',
    relationship: {
      level: 2,
      maxLevel: 5
    }
  },
  'jesse': {
    id: 'jesse',
    name: 'Technician Jesse',
    title: 'Equipment Specialist',
    defaultPortrait: '👨‍🔧',
    textSpeed: 'fast',
    textStyle: {
      emphasis: 'normal',
      color: 'default'
    },
    voice: 'jesse-speak',
    themeColor: 'var(--qa-color)',
    darkColor: 'var(--qa-color-dark)',
    lightColor: 'var(--qa-color-light)',
    relationship: {
      level: 1,
      maxLevel: 5
    }
  },
  'quinn': {
    id: 'quinn',
    name: 'Dr. Zephyr Quinn',
    title: 'Experimental Researcher',
    defaultPortrait: '👩‍🔬',
    textSpeed: 'fast',
    textStyle: {
      emphasis: 'excited',
      color: 'default'
    },
    voice: 'quinn-speak',
    themeColor: 'var(--educational-color)',
    darkColor: 'var(--educational-color-dark)',
    lightColor: 'var(--educational-color-light)',
    relationship: {
      level: 3,
      maxLevel: 5
    }
  },
  'player': {
    id: 'player',
    name: 'Resident',
    defaultPortrait: '👨‍🎓',
    textSpeed: 'normal',
    textStyle: {
      emphasis: 'normal',
      color: 'default'
    },
    voice: 'ui-click',
    themeColor: '#53a8d4',
    darkColor: '#2a7db7',
    lightColor: '#7ebfe9',
    relationship: {
      level: 0,
      maxLevel: 0
    }
  },
  'narrator': {
    id: 'narrator',
    name: 'Narrator',
    defaultPortrait: '📝',
    textSpeed: 'slow',
    textStyle: {
      emphasis: 'italic',
      color: 'info'
    },
    voice: 'ui-click',
    themeColor: '#888888',
    darkColor: '#666666',
    lightColor: '#aaaaaa',
    relationship: {
      level: 0,
      maxLevel: 0
    }
  }
};

// Context for dialogue system
interface DialogueContextType {
  // Start/stop dialogue
  startDialogue: (sequence: DialogueSequence, onComplete?: () => void) => void;
  stopDialogue: () => void;
  
  // Dialogue state
  currentSequence: DialogueSequence | null;
  currentNode: DialogueNode | null;
  isDialogueActive: boolean;
  isProcessingChoice: boolean;
  lastSelectedOption: DialogueOption | null;
  dialogueHistory: Array<{
    node: DialogueNode;
    selectedOption?: DialogueOption;
  }>;
  
  // Dialogue navigation
  goToNextNode: () => void;
  selectOption: (option: DialogueOption) => void;
  
  // Relationship management
  getRelationshipLevel: (characterId: CharacterID) => number;
  updateRelationship: (characterId: CharacterID, change: number) => void;
  
  // Typewriter effect control
  isTyping: boolean;
  skipTyping: () => void;
  
  // Animation and effects
  shakeText: () => void;
  pulsePortrait: () => void;
}

// Create the context
const DialogueContext = createContext<DialogueContextType>({
  startDialogue: () => {},
  stopDialogue: () => {},
  currentSequence: null,
  currentNode: null,
  isDialogueActive: false,
  isProcessingChoice: false,
  lastSelectedOption: null,
  dialogueHistory: [],
  goToNextNode: () => {},
  selectOption: () => {},
  getRelationshipLevel: () => 0,
  updateRelationship: () => {},
  isTyping: false,
  skipTyping: () => {},
  shakeText: () => {},
  pulsePortrait: () => {}
});

// Custom hook for using dialogue system
export const useDialogue = () => useContext(DialogueContext);

// Provider component for dialogue system
export function DialogueProvider({ children }: { children: ReactNode }) {
  // Dialogue state
  const [currentSequence, setCurrentSequence] = useState<DialogueSequence | null>(null);
  const [currentNode, setCurrentNode] = useState<DialogueNode | null>(null);
  const [isDialogueActive, setIsDialogueActive] = useState(false);
  const [isProcessingChoice, setIsProcessingChoice] = useState(false);
  const [lastSelectedOption, setLastSelectedOption] = useState<DialogueOption | null>(null);
  const [dialogueHistory, setDialogueHistory] = useState<Array<{
    node: DialogueNode;
    selectedOption?: DialogueOption;
  }>>([]);
  
  // Typewriter effect
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingSpeed, setTypingSpeed] = useState(30); // ms per character
  
  // Animation states
  const [isTextShaking, setIsTextShaking] = useState(false);
  const [isPortraitPulsing, setIsPortraitPulsing] = useState(false);
  
  // Refs for callbacks
  const onDialogueCompleteRef = useRef<(() => void) | null>(null);
  
  // Import hooks for game state and effects
  const { updateInsight, updateHealth } = useGameStore();
  const { play } = useSoundManager();
  const { playAnimation } = useAnimation();
  
  // Start a dialogue sequence
  const startDialogue = useCallback((sequence: DialogueSequence, onComplete?: () => void) => {
    // Set the sequence
    setCurrentSequence(sequence);
    
    // Find the start node
    const startNode = sequence.nodes.find(node => node.id === sequence.startNodeId);
    if (!startNode) {
      console.error(`Start node ${sequence.startNodeId} not found in sequence ${sequence.id}`);
      return;
    }
    
    // Set the starting node
    setCurrentNode(startNode);
    
    // Reset state
    setIsDialogueActive(true);
    setIsProcessingChoice(false);
    setLastSelectedOption(null);
    setDialogueHistory([]);
    setDisplayedText('');
    
    // Store completion callback
    if (onComplete) {
      onDialogueCompleteRef.current = onComplete;
    } else {
      onDialogueCompleteRef.current = null;
    }
    
    // Trigger onEnter callback if present
    if (startNode.onEnter) {
      startNode.onEnter();
    }
    
    // Start typewriter effect
    startTypewriterEffect(startNode);
    
    // Play character sound
    playCharacterSound(startNode.character);
  }, []);
  
  // Stop the current dialogue
  const stopDialogue = useCallback(() => {
    // Trigger onExit callback if present
    if (currentNode?.onExit) {
      currentNode.onExit();
    }
    
    // Reset state
    setIsDialogueActive(false);
    setCurrentSequence(null);
    setCurrentNode(null);
    setIsProcessingChoice(false);
    setLastSelectedOption(null);
    setDisplayedText('');
    setIsTyping(false);
    
    // Run completion callback if set
    if (onDialogueCompleteRef.current) {
      onDialogueCompleteRef.current();
      onDialogueCompleteRef.current = null;
    }
  }, [currentNode]);
  
  // Start typewriter effect for a node
  const startTypewriterEffect = useCallback((node: DialogueNode) => {
    // Set typing speed based on character
    const character = CHARACTERS[node.character];
    const speed = node.textSpeed || character.textSpeed;
    
    // Map speed names to milliseconds
    const speedMap = {
      'slow': 50,
      'normal': 30,
      'fast': 15
    };
    
    setTypingSpeed(speedMap[speed]);
    setDisplayedText('');
    setIsTyping(true);
    
    // Get the text to display
    const text = node.text;
    
    // Animate typing
    let index = 0;
    const typingInterval = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.substring(0, index + 1));
        index++;
        
        // Play sound effect occasionally for typing
        if (index % 3 === 0) {
          playCharacterSound(node.character, { volume: 0.3 });
        }
      } else {
        clearInterval(typingInterval);
        setIsTyping(false);
      }
    }, typingSpeed);
    
    // Clean up interval on unmount or if typing is skipped
    return () => clearInterval(typingInterval);
  }, []);
  
  // Skip the typewriter effect and show full text
  const skipTyping = useCallback(() => {
    if (!isTyping || !currentNode) return;
    
    setDisplayedText(currentNode.text);
    setIsTyping(false);
  }, [isTyping, currentNode]);
  
  // Go to the next node in the sequence
  const goToNextNode = useCallback(() => {
    if (!currentSequence || !currentNode) return;
    
    // If we're still typing, just skip to the end of current text
    if (isTyping) {
      skipTyping();
      return;
    }
    
    // If we're waiting for a choice, we can't continue automatically
    if (currentNode.options && currentNode.options.length > 0 && !lastSelectedOption) {
      return;
    }
    
    // Determine the next node ID
    let nextNodeId: string | undefined;
    
    if (lastSelectedOption && lastSelectedOption.nextNodeId) {
      // Use the selected option's next node
      nextNodeId = lastSelectedOption.nextNodeId;
    } else if (currentNode.nextNodeId) {
      // Use the current node's next node
      nextNodeId = currentNode.nextNodeId;
    }
    
    // Can't continue if there's no next node
    if (!nextNodeId) {
      // End of dialogue
      stopDialogue();
      return;
    }
    
    // Find the next node
    const nextNode = currentSequence.nodes.find(node => node.id === nextNodeId);
    if (!nextNode) {
      console.error(`Next node ${nextNodeId} not found in sequence ${currentSequence.id}`);
      stopDialogue();
      return;
    }
    
    // Trigger onExit callback if present
    if (currentNode.onExit) {
      currentNode.onExit();
    }
    
    // Add current node to history
    setDialogueHistory(prev => [
      ...prev, 
      { 
        node: currentNode, 
        selectedOption: lastSelectedOption || undefined 
      }
    ]);
    
    // Reset choice state
    setLastSelectedOption(null);
    setIsProcessingChoice(false);
    
    // Set the new node
    setCurrentNode(nextNode);
    
    // Trigger onEnter callback if present
    if (nextNode.onEnter) {
      nextNode.onEnter();
    }
    
    // Start typewriter effect for new node
    startTypewriterEffect(nextNode);
    
    // Play character sound
    playCharacterSound(nextNode.character);
  }, [currentSequence, currentNode, isTyping, lastSelectedOption, skipTyping, stopDialogue, startTypewriterEffect]);
  
  // Select a dialogue option
  const selectOption = useCallback((option: DialogueOption) => {
    if (!currentNode || isProcessingChoice) return;
    
    // Set processing state
    setIsProcessingChoice(true);
    
    // Store selected option
    setLastSelectedOption(option);
    
    // Apply option effects if any
    if (option.effects) {
      // Apply relationship changes
      if (option.effects.relationship && currentNode.character !== 'player' && currentNode.character !== 'narrator') {
        updateRelationship(currentNode.character, option.effects.relationship);
      }
      
      // Apply insight changes
      if (option.effects.insight) {
        updateInsight(option.effects.insight);
      }
      
      // Apply health changes
      if (option.effects.health) {
        updateHealth(option.effects.health);
      }
      
      // Handle special effects (to be implemented)
      if (option.effects.special) {
        console.log(`Special effect: ${option.effects.special}`);
        // Would implement game-specific effects here
      }
    }
    
    // If there's a response text, show it before moving on
    if (option.responseText) {
      // Create temporary response node
      const responseNode: DialogueNode = {
        id: `response-${Date.now()}`,
        character: currentNode.character,
        text: option.responseText,
        nextNodeId: option.nextNodeId || currentNode.nextNodeId
      };
      
      // Set it as current node
      setCurrentNode(responseNode);
      
      // Start typewriter effect
      startTypewriterEffect(responseNode);
      
      // Play character sound
      playCharacterSound(responseNode.character);
    } else {
      // No response text, just continue to next node
      setIsProcessingChoice(false);
      goToNextNode();
    }
  }, [currentNode, isProcessingChoice, goToNextNode, startTypewriterEffect, updateInsight, updateHealth, updateRelationship]);
  
  // Play character voice sound
  const playCharacterSound = useCallback((characterId: CharacterID, options = {}) => {
    const character = CHARACTERS[characterId];
    play(character.voice as any, { volume: 0.5, ...options });
  }, [play]);
  
  // Get relationship level for a character
  const getRelationshipLevel = useCallback((characterId: CharacterID): number => {
    // In a full implementation, this would be stored in game state
    // For this prototype, we'll use the default values from the character data
    return CHARACTERS[characterId].relationship.level;
  }, []);
  
  // Update relationship with a character
  const updateRelationship = useCallback((characterId: CharacterID, change: number) => {
    // In a full implementation, this would update the game state
    console.log(`Relationship with ${characterId} changed by ${change}`);
    
    // For prototype, just log the change
    const character = CHARACTERS[characterId];
    const currentLevel = character.relationship.level;
    const newLevel = Math.max(0, Math.min(character.relationship.maxLevel, currentLevel + change));
    
    // In full implementation, would update state
    console.log(`${character.name} relationship: ${currentLevel} -> ${newLevel}`);
    
    // Show character-specific animation for relationship change
    if (change > 0) {
      // Positive change
      playAnimation(`character-${characterId}`, 'pulse');
    } else if (change < 0) {
      // Negative change
      playAnimation(`character-${characterId}`, 'shake');
    }
  }, [playAnimation]);
  
  // Text animation effects
  const shakeText = useCallback(() => {
    setIsTextShaking(true);
    setTimeout(() => setIsTextShaking(false), 500);
  }, []);
  
  // Portrait animation effects
  const pulsePortrait = useCallback(() => {
    setIsPortraitPulsing(true);
    setTimeout(() => setIsPortraitPulsing(false), 500);
  }, []);
  
  // Provide context value
  const value: DialogueContextType = {
    startDialogue,
    stopDialogue,
    currentSequence,
    currentNode,
    isDialogueActive,
    isProcessingChoice,
    lastSelectedOption,
    dialogueHistory,
    goToNextNode,
    selectOption,
    getRelationshipLevel,
    updateRelationship,
    isTyping,
    skipTyping,
    shakeText,
    pulsePortrait
  };
  
  return (
    <DialogueContext.Provider value={value}>
      {children}
      
      {/* Dialogue UI - shown when dialogue is active */}
      {isDialogueActive && currentNode && (
        <DialogueUI
          currentNode={currentNode}
          displayedText={displayedText}
          isTyping={isTyping}
          skipTyping={skipTyping}
          goToNextNode={goToNextNode}
          selectOption={selectOption}
          isProcessingChoice={isProcessingChoice}
          lastSelectedOption={lastSelectedOption}
          isTextShaking={isTextShaking}
          isPortraitPulsing={isPortraitPulsing}
        />
      )}
    </DialogueContext.Provider>
  );
}

// Dialogue UI component
interface DialogueUIProps {
  currentNode: DialogueNode;
  displayedText: string;
  isTyping: boolean;
  skipTyping: () => void;
  goToNextNode: () => void;
  selectOption: (option: DialogueOption) => void;
  isProcessingChoice: boolean;
  lastSelectedOption: DialogueOption | null;
  isTextShaking: boolean;
  isPortraitPulsing: boolean;
}

function DialogueUI({
  currentNode,
  displayedText,
  isTyping,
  skipTyping,
  goToNextNode,
  selectOption,
  isProcessingChoice,
  lastSelectedOption,
  isTextShaking,
  isPortraitPulsing
}: DialogueUIProps) {
  // Get character data
  const character = CHARACTERS[currentNode.character];
  
  // Apply text styling
  const getTextStyle = () => {
    const emphasis = currentNode.textStyle?.emphasis || character.textStyle.emphasis;
    const color = currentNode.textStyle?.color || character.textStyle.color;
    
    let textClasses = '';
    
    // Apply emphasis
    switch (emphasis) {
      case 'bold':
        textClasses += 'font-bold ';
        break;
      case 'italic':
        textClasses += 'italic ';
        break;
      case 'technical':
        textClasses += 'font-mono ';
        break;
      case 'excited':
        // No specific class, handled via animation
        break;
      case 'quiet':
        textClasses += 'opacity-80 ';
        break;
    }
    
    // Apply color
    switch (color) {
      case 'positive':
        textClasses += 'text-green-400 ';
        break;
      case 'negative':
        textClasses += 'text-red-400 ';
        break;
      case 'warning':
        textClasses += 'text-yellow-400 ';
        break;
      case 'info':
        textClasses += 'text-blue-400 ';
        break;
      case 'default':
      default:
        textClasses += 'text-text-primary ';
    }
    
    return textClasses;
  };
  
  const textStyle = getTextStyle();
  
  // Apply text animation
  const getTextAnimation = () => {
    if (isTextShaking) return 'animate-shake';
    
    const emphasis = currentNode.textStyle?.emphasis || character.textStyle.emphasis;
    if (emphasis === 'excited') return 'animate-pulse';
    
    return '';
  };
  
  const textAnimation = getTextAnimation();
  
  // Apply portrait animation
  const getPortraitAnimation = () => {
    if (isPortraitPulsing) return 'animate-pulse';
    
    if (currentNode.animation === 'bounce') return 'animate-bounce';
    if (currentNode.animation === 'shake') return 'animate-shake';
    if (currentNode.animation === 'nod') return 'animate-pulse';
    
    return '';
  };
  
  const portraitAnimation = getPortraitAnimation();
  
  // Get portrait based on mood
  const getPortrait = () => {
    // Use node-specific portrait if provided
    if (currentNode.portrait) return currentNode.portrait;
    
    // Use mood-specific portrait if available
    if (currentNode.mood && character.portraits && character.portraits[currentNode.mood]) {
      return character.portraits[currentNode.mood];
    }
    
    // Fall back to default portrait
    return character.defaultPortrait;
  };
  
  const portrait = getPortrait();
  
  // Handle click on dialogue box
  const handleDialogueClick = () => {
    if (isTyping) {
      // Skip typing if in progress
      skipTyping();
    } else if (!currentNode.options || lastSelectedOption) {
      // Advance to next node if no choices or choice already made
      goToNextNode();
    }
  };
  
  // Text typing cursor
  const getTypingCursor = () => {
    if (!isTyping) return null;
    
    return (
      <span className="animate-pulse inline-block">▌</span>
    );
  };
  
  return (
    <Animated
      id="dialogue-box"
      initialAnimation="fade-in"
      className="fixed bottom-0 left-0 right-0 z-50 p-4"
    >
      <div className="max-w-4xl mx-auto">
        <div 
          className="pixel-borders bg-surface"
          style={{ borderColor: character.themeColor }}
        >
          {/* Character info bar */}
          <div 
            className="px-4 py-2 flex items-center"
            style={{ backgroundColor: character.darkColor }}
          >
            <div className={`mr-2 text-2xl ${portraitAnimation}`}>
              {portrait}
            </div>
            <div>
              <PixelText className="text-white text-lg">{character.name}</PixelText>
              {character.title && (
                <PixelText className="text-white opacity-80 text-sm">{character.title}</PixelText>
              )}
            </div>
          </div>
          
          {/* Dialogue text */}
          <div 
            className="p-4 min-h-[120px] cursor-pointer"
            onClick={handleDialogueClick}
          >
            <Animated
              id="dialogue-text"
              className={`font-pixel ${textStyle} ${textAnimation}`}
            >
              {displayedText}
              {getTypingCursor()}
            </Animated>
            
            {/* Continue indicator (when text is complete and no choices) */}
            {!isTyping && (!currentNode.options || lastSelectedOption) && (
              <div className="mt-4 flex justify-end">
                <div className="animate-bounce text-white opacity-70">
                  ▼
                </div>
              </div>
            )}
          </div>
          
          {/* Dialogue choices */}
          {!isTyping && currentNode.options && !lastSelectedOption && (
            <div className="p-4 bg-surface-dark">
              <div className="space-y-2">
                {currentNode.options.map(option => (
                  <PixelButton
                    key={option.id}
                    className={`
                      w-full text-left px-4 py-2 
                      bg-surface hover:bg-opacity-80
                      ${isProcessingChoice ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                    onClick={() => !isProcessingChoice && selectOption(option)}
                    disabled={isProcessingChoice}
                  >
                    {option.text}
                  </PixelButton>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Animated>
  );
}

// Sample dialogue creation helper
export function createDialogue(id: string, startNodeId: string, nodes: DialogueNode[]): DialogueSequence {
  return {
    id,
    startNodeId,
    nodes
  };
}

// Sample dialogue for testing
export const sampleDialogues = {
  kapoorIntroduction: createDialogue(
    'kapoor-introduction',
    'intro-1',
    [
      {
        id: 'intro-1',
        character: 'kapoor',
        text: "Good morning. I'm Dr. Kapoor, Chief Medical Physicist. I'll be overseeing your residency program. Our standards here are exacting - 92.6% of residents complete the program successfully within established parameters.",
        nextNodeId: 'intro-2'
      },
      {
        id: 'intro-2',
        character: 'kapoor',
        text: "Today you'll begin with fundamental calibration procedures. I recommend reviewing Protocol K-17 in your Competency Binder before proceeding to the clinical areas.",
        options: [
          {
            id: 'option-1',
            text: "I'll study the protocol thoroughly before starting.",
            responseText: "An appropriate approach. Methodical preparation tends to yield 23% fewer errors in initial procedures. I appreciate your commitment to process.",
            nextNodeId: 'intro-3',
            effects: {
              relationship: 1
            }
          },
          {
            id: 'option-2',
            text: "I'd prefer to get hands-on experience first, then consult the protocol as needed.",
            responseText: "Hmm. While practical application has merit, established protocols exist for valid reasons. Do ensure you familiarize yourself with them promptly.",
            nextNodeId: 'intro-3',
            effects: {
              relationship: -1
            }
          },
          {
            id: 'option-3',
            text: "Could you clarify which aspects of the protocol are most critical for today's tasks?",
            responseText: "A reasonable inquiry. Focus on sections 3.2 through 3.7, covering dosimetric calibration standards. The remainder provides context but is less immediately relevant.",
            nextNodeId: 'intro-3',
            effects: {
              relationship: 1,
              insight: 10
            }
          }
        ]
      },
      {
        id: 'intro-3',
        character: 'kapoor',
        text: "Once you're prepared, proceed to the clinical node on your map. The senior resident completed the same procedure in approximately 47 minutes. I'll be monitoring your progress.",
        nextNodeId: 'intro-4'
      },
      {
        id: 'intro-4',
        character: 'kapoor',
        text: "Remember, precision is non-negotiable in medical physics. Even a 2% error in calibration can lead to significant clinical consequences. You may proceed.",
        nextNodeId: 'intro-end'
      },
      {
        id: 'intro-end',
        character: 'narrator',
        text: "Dr. Kapoor returns to his meticulous work, occasionally glancing in your direction. It seems your residency has officially begun...",
      }
    ]
  ),
  
  jesseIntroduction: createDialogue(
    'jesse-introduction',
    'intro-1',
    [
      {
        id: 'intro-1',
        character: 'jesse',
        text: "Hey there. Jesse. Equipment specialist. Been here twelve years. Longer than most doctors.",
        nextNodeId: 'intro-2',
        textSpeed: 'fast'
      },
      {
        id: 'intro-2',
        character: 'jesse',
        text: "Need something fixed? I'm your guy. LINAC acting up? Dosimeter giving weird readings? Just ask.",
        options: [
          {
            id: 'option-1',
            text: "Nice to meet you. I'm guessing you know all the equipment inside out?",
            responseText: "Every screw. Every circuit. Things break. I fix them. Manuals help sometimes. Experience helps more.",
            nextNodeId: 'intro-3',
            effects: {
              relationship: 1
            }
          },
          {
            id: 'option-2',
            text: "Dr. Kapoor told me to follow all the protocols exactly.",
            responseText: "Kapoor. Good physicist. By-the-book guy. Protocols matter, yeah. But machines? Real-world messy. Sometimes need workarounds. Don't tell him I said that.",
            nextNodeId: 'intro-3',
            effects: {
              relationship: 0
            }
          },
          {
            id: 'option-3',
            text: "This place seems pretty high-tech. What's the most challenging equipment to maintain?",
            responseText: "TrueBeam LINAC. Finicky beast. Electron gun calibration drifts weekly. Manufacturer says annual check sufficient. Not here. Check it monthly myself. Saved us three shutdowns last year.",
            nextNodeId: 'intro-3',
            effects: {
              relationship: 2,
              insight: 15
            }
          }
        ]
      },
      {
        id: 'intro-3',
        character: 'jesse',
        text: "Storage closet down hall. Got spare parts, tools. Some old equipment too. Nobody checks inventory. Help yourself if needed. Just return what you borrow.",
        nextNodeId: 'intro-4'
      },
      {
        id: 'intro-4',
        character: 'jesse',
        text: "Lab coat pocket ripped? Got sewing kit in drawer. Coffee machine temperamental. Tap twice on left side. Anything else?",
        options: [
          {
            id: 'option-1',
            text: "I'm all set, thanks for the tips.",
            responseText: "No problem. Questions later? Find me in basement workshop. Good luck.",
            nextNodeId: 'intro-end'
          },
          {
            id: 'option-2',
            text: "Any advice for dealing with Dr. Kapoor?",
            responseText: "Kapoor? Show up prepared. Double-check calculations. Don't improvise without data. Did PhD together at Berkeley. Good guy under all that precision. Respects competence over confidence.",
            nextNodeId: 'intro-end',
            effects: {
              relationship: 1,
              insight: 10
            }
          }
        ]
      },
      {
        id: 'intro-end',
        character: 'jesse',
        text: "Gotta go. LINAC 2 calibration due. Stop by workshop sometime. Show you real medical physics. Not just textbook stuff.",
      }
    ]
  ),
  
  quinnIntroduction: createDialogue(
    'quinn-introduction',
    'intro-1',
    [
      {
        id: 'intro-1',
        character: 'quinn',
        text: "Oh! Hello there! You must be the new resident! I'm Dr. Zephyr Quinn, but please, just Quinn is fine! I'm working on something absolutely FASCINATING at the moment!",
        nextNodeId: 'intro-2',
        textSpeed: 'fast',
        animation: 'bounce'
      },
      {
        id: 'intro-2',
        character: 'quinn',
        text: "I've been reconfiguring these ion chambers to detect quantum fluctuations in the background radiation field—completely off-protocol, of course, but that's where all the interesting discoveries happen! Between you and me, Kapoor nearly had a conniption when he saw my setup!",
        options: [
          {
            id: 'option-1',
            text: "That sounds fascinating. Could you tell me more about these quantum fluctuations?",
            responseText: "YES! Someone who GETS IT! So imagine the universe is constantly bubbling with these tiny probability waves—like a quantum cappuccino! My theory is that these chambers can detect microscopic variations that correlate with treatment outcomes! It's either brilliant or completely delusional—possibly both!",
            nextNodeId: 'intro-3',
            effects: {
              relationship: 2,
              insight: 15
            }
          },
          {
            id: 'option-2',
            text: "Is that... safe? Shouldn't we follow established protocols?",
            responseText: "Oh dear, you sound just like Kapoor! Of COURSE it's safe... mostly! Protocols are just crystallized discoveries that were once radical ideas themselves! Though perhaps stay behind this lead shield just in case...",
            nextNodeId: 'intro-3',
            effects: {
              relationship: -1
            }
          },
          {
            id: 'option-3',
            text: "I'm supposed to be starting my residency tasks. Am I in the right place?",
            responseText: "Tasks? Schedules? Oh right, the PROGRAM! Sorry, I get carried away! You probably need to see Kapoor for the official orientation. Though if you want to learn things they don't teach in textbooks, come find me after hours!",
            nextNodeId: 'intro-3',
            effects: {
              relationship: 0
            }
          }
        ]
      },
      {
        id: 'intro-3',
        character: 'quinn',
        text: "You know, I've been thinking we should really explore the connections between quantum mechanics and radiation therapy more deeply. Imagine treatment planning algorithms that account for probability fields at the subatomic level!",
        nextNodeId: 'intro-4',
        animation: 'bounce'
      },
      {
        id: 'intro-4',
        character: 'quinn',
        text: "Oh! And I'm working on something special in the lab—a completely experimental project. If you're interested in the bleeding edge of medical physics, come find me when you have some free time! It involves an ion chamber that's behaving... peculiarly!",
        options: [
          {
            id: 'option-1',
            text: "I'll definitely take you up on that offer.",
            responseText: "WONDERFUL! It's refreshing to find someone open to exploration! Stop by Lab 7 whenever—I'm usually there until the security guard kicks me out around midnight!",
            nextNodeId: 'intro-end',
            effects: {
              relationship: 1
            }
          },
          {
            id: 'option-2',
            text: "I should probably focus on the standard curriculum first.",
            responseText: "Hmm, yes, I suppose there is value in building a conventional foundation. But remember—the greatest discoveries happen at the boundaries of what we think we know! The invitation remains open!",
            nextNodeId: 'intro-end',
            effects: {
              relationship: 0
            }
          }
        ]
      },
      {
        id: 'intro-end',
        character: 'quinn',
        text: "Oh! I've just had another idea about quantum entanglement in particle interactions! Must write this down before it vanishes! Lovely meeting you—the universe is FULL of surprises!",
        animation: 'bounce'
      }
    ]
  )
};