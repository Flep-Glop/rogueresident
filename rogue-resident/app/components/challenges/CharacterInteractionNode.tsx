// app/components/challenges/CharacterInteractionNode.tsx
'use client';
import { useState, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { PixelText, PixelButton } from '../PixelThemeProvider';

// Types for character dialogue
interface DialogueOption {
  id: string;
  text: string;
  responseText: string;
  relationshipEffect: number; // Positive or negative impact on relationship
  insightEffect: number; // Insight reward (if any)
  isCorrectChoice?: boolean; // For learning opportunities
}

interface DialogueNode {
  id: string;
  text: string;
  character: string;
  options?: DialogueOption[];
  nextNode?: string; // For linear dialogue without choices
}

// Character interaction state
type InteractionStage = 'intro' | 'dialogue' | 'choice' | 'response' | 'conclusion';

// Character data with portraits, colors, and dialogue styles
const CHARACTER_DATA = {
  'dr-kapoor': {
    name: 'Dr. Kapoor',
    title: 'Chief Medical Physicist',
    portrait: '👨‍⚕️',
    primaryColor: 'var(--clinical-color)',
    lightColor: 'var(--clinical-color-light)',
    darkColor: 'var(--clinical-color-dark)',
    textColor: 'text-clinical-light',
    bgColor: 'bg-clinical',
    dialogueStyle: 'Precise, professional, uses specific numbers and technical terminology.',
    relationshipLevel: 2,
    maxRelationshipLevel: 5
  },
  'technician-jesse': {
    name: 'Technician Jesse',
    title: 'Equipment Specialist',
    portrait: '👨‍🔧',
    primaryColor: 'var(--qa-color)',
    lightColor: 'var(--qa-color-light)',
    darkColor: 'var(--qa-color-dark)',
    textColor: 'text-qa-light',
    bgColor: 'bg-qa',
    dialogueStyle: 'Direct, uses shortened sentences and technical jargon with practical emphasis.',
    relationshipLevel: 1,
    maxRelationshipLevel: 5
  },
  'dr-quinn': {
    name: 'Dr. Zephyr Quinn',
    title: 'Experimental Researcher',
    portrait: '👩‍🔬',
    primaryColor: 'var(--educational-color)',
    lightColor: 'var(--educational-color-light)',
    darkColor: 'var(--educational-color-dark)',
    textColor: 'text-educational-light',
    bgColor: 'bg-educational',
    dialogueStyle: 'Excited, jumps between topics, uses unusual metaphors and creative language.',
    relationshipLevel: 3,
    maxRelationshipLevel: 5
  }
};

// Sample dialogues for each character
const SAMPLE_DIALOGUES = {
  'dr-kapoor': [
    {
      id: 'kapoor-intro',
      text: "Good morning. I've been reviewing your recent clinical assessments. Your attention to procedural details is showing a 67% improvement since you started, but there's still room for optimization. I have a case I'd like your opinion on.",
      character: 'dr-kapoor',
      nextNode: 'kapoor-question'
    },
    {
      id: 'kapoor-question',
      text: "We have a patient with a complex head and neck case. The physician wants to spare the parotid glands while maintaining adequate coverage of the target volume. What approach would you recommend for the planning process?",
      character: 'dr-kapoor',
      options: [
        {
          id: 'option1',
          text: "I'd recommend an IMRT plan with specific dose constraints for the parotids while ensuring the PTV receives at least 95% of the prescription dose.",
          responseText: "That's the standard approach, and generally effective. Your understanding of the clinical priorities is sound. I'm pleased to see you balancing target coverage with organ-at-risk sparing.",
          relationshipEffect: 1,
          insightEffect: 30,
          isCorrectChoice: true
        },
        {
          id: 'option2',
          text: "I'd use a simple 3D conformal plan since it's faster to implement and review.",
          responseText: "That approach lacks the necessary conformality for such a complex case. The parotid sparing would be suboptimal. I'd encourage you to consider the more sophisticated techniques available to us.",
          relationshipEffect: -1,
          insightEffect: 10
        },
        {
          id: 'option3',
          text: "I'd prioritize target coverage completely, and worry about the parotids secondarily since tumor control is most important.",
          responseText: "While tumor control is indeed critical, we must balance it with quality of life considerations. A good plan achieves both objectives without compromise. Your approach requires more nuance.",
          relationshipEffect: 0,
          insightEffect: 15
        }
      ]
    }
  ],
  'technician-jesse': [
    {
      id: 'jesse-intro',
      text: "Hey there. LINAC 2 acting up again. Output's high by 2.3%. Already recalibrated twice this week. Strange behavior.",
      character: 'technician-jesse',
      nextNode: 'jesse-question'
    },
    {
      id: 'jesse-question',
      text: "Think I found the issue. Temperature sensor giving bad readings. System thinks it's cooler than actual. Compensating wrong. Could replace sensor or add correction factor in software. What's your call?",
      character: 'technician-jesse',
      options: [
        {
          id: 'option1',
          text: "Let's replace the sensor. Hardware fixes are more reliable than software workarounds.",
          responseText: "Smart call. Software patches just mask problems. Replaced three sensors last year. Same issue. Ordered the part already. Should arrive tomorrow. Good instinct.",
          relationshipEffect: 1,
          insightEffect: 30,
          isCorrectChoice: true
        },
        {
          id: 'option2',
          text: "Let's implement the software correction factor. We can fix it properly during scheduled maintenance.",
          responseText: "Workable solution. Not ideal though. Temporary fix becomes permanent too often. But pragmatic. Can implement now. Just don't let Dr. Kapoor hear about it.",
          relationshipEffect: 0,
          insightEffect: 15
        },
        {
          id: 'option3',
          text: "We should consult the manufacturer's documentation first before deciding on an approach.",
          responseText: "By the book, huh? Manual's three inches thick. Checked already. Generic advice. 'Contact support.' Been there. Wasted two hours on hold last time. Sometimes gotta trust experience over manuals.",
          relationshipEffect: -1,
          insightEffect: 10
        }
      ]
    }
  ],
  'dr-quinn': [
    {
      id: 'quinn-intro',
      text: "Ah! Just the person I wanted to see! You're just in time to witness something extraordinary! I've been experimenting with quantum entanglement principles applied to radiation detector arrays and—oh, you should see the patterns we're getting! It's like the universe is sending us coded messages through dosimetry!",
      character: 'dr-quinn',
      nextNode: 'quinn-question'
    },
    {
      id: 'quinn-question',
      text: "I've modifiedfluxified these old ion chambers and now they're picking up signal patterns that—well, they shouldn't be possible according to conventional wisdom! Take a look at these readings! What do you think might explain this phenomenon?",
      character: 'dr-quinn',
      options: [
        {
          id: 'option1',
          text: "Could this be related to quantum tunneling effects at the microscopic level of the detector elements?",
          responseText: "YES! Precisely what I was thinking! The quantum probability fields are absolutely penetrating the conventional barriers! You have such an intuitive grasp of the bleeding edge! We must explore this further—perhaps after hours when Kapoor isn't watching?",
          relationshipEffect: 1,
          insightEffect: 30,
          isCorrectChoice: true
        },
        {
          id: 'option2',
          text: "Have you checked for environmental interference or equipment malfunction?",
          responseText: "Ugh, you sound just like the safety committee. 'Dr. Quinn, verify your equipment.' 'Dr. Quinn, follow protocols.' Of course I checked! Triple-verified! Quadruple-confirmed! This isn't a malfunction—it's a breakthrough! Think bigger!",
          relationshipEffect: -1,
          insightEffect: 10
        },
        {
          id: 'option3',
          text: "The patterns look interesting, but I'd need to understand your methodology better before forming a conclusion.",
          responseText: "Ah, a cautious scientist! Commendable, if somewhat conventional. My methodology is... well, let's call it 'creatively rigorous'! I've documented everything in my system. Color-coded sticky notes all over my apartment. I'll bring you the blue ones tomorrow!",
          relationshipEffect: 0,
          insightEffect: 20
        }
      ]
    }
  ]
};

export default function CharacterInteractionNode() {
  const [stage, setStage] = useState<InteractionStage>('intro');
  const [currentCharacter, setCurrentCharacter] = useState<string>('dr-kapoor');
  const [dialogueIndex, setDialogueIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<DialogueOption | null>(null);
  const [relationshipChange, setRelationshipChange] = useState(0);
  const [insightGained, setInsightGained] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [typewriterText, setTypewriterText] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  
  const { completeNode, currentNodeId, updateInsight } = useGameStore();
  
  // Select random character for the interaction if none provided
  useEffect(() => {
    const characters = Object.keys(CHARACTER_DATA);
    const randomCharacter = characters[Math.floor(Math.random() * characters.length)];
    setCurrentCharacter(randomCharacter);
  }, []);
  
  // Get character data and dialogue
  const character = CHARACTER_DATA[currentCharacter as keyof typeof CHARACTER_DATA];
  const dialogue = SAMPLE_DIALOGUES[currentCharacter as keyof typeof SAMPLE_DIALOGUES];
  
  // Typewriter effect for dialogue
  useEffect(() => {
    if (stage === 'intro' || stage === 'dialogue' || stage === 'response') {
      const currentDialogue = dialogue[dialogueIndex];
      let text = currentDialogue.text;
      
      // If in response stage, show the selected option's response
      if (stage === 'response' && selectedOption) {
        text = selectedOption.responseText;
      }
      
      let index = 0;
      setTypewriterText('');
      setIsTyping(true);
      
      // Set up typewriter effect
      const typingInterval = setInterval(() => {
        if (index < text.length) {
          setTypewriterText((prev) => prev + text.charAt(index));
          index++;
        } else {
          clearInterval(typingInterval);
          setIsTyping(false);
        }
      }, 20); // Adjust speed as needed
      
      // Cleanup
      return () => clearInterval(typingInterval);
    }
  }, [stage, dialogueIndex, dialogue, selectedOption]);
  
  // Blinking cursor effect
  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 530);
    
    return () => clearInterval(cursorInterval);
  }, []);
  
  // Handle choice selection
  const handleChoiceSelect = (option: DialogueOption) => {
    setSelectedOption(option);
    setRelationshipChange(option.relationshipEffect);
    setInsightGained(option.insightEffect);
    setStage('response');
  };
  
  // Complete the interaction
  const completeInteraction = () => {
    if (currentNodeId) {
      // Update game state
      updateInsight(insightGained);
      
      // In a full implementation, would also update relationship with character
      
      // Mark node as completed
      completeNode(currentNodeId);
    }
  };
  
  // Handle continue button click
  const handleContinue = () => {
    if (stage === 'intro') {
      // Move to main dialogue
      setStage('dialogue');
    } else if (stage === 'dialogue') {
      const currentDialogue = dialogue[dialogueIndex];
      
      if (currentDialogue.options) {
        // If dialogue has choices, move to choice stage
        setStage('choice');
      } else if (currentDialogue.nextNode) {
        // If dialogue has next node, find and go to it
        const nextNodeIndex = dialogue.findIndex(d => d.id === currentDialogue.nextNode);
        if (nextNodeIndex !== -1) {
          setDialogueIndex(nextNodeIndex);
          setStage('dialogue');
        } else {
          // No next node found, end interaction
          setStage('conclusion');
        }
      } else {
        // No options or next node, end interaction
        setStage('conclusion');
      }
    } else if (stage === 'response') {
      // After showing response, move to conclusion
      setStage('conclusion');
    } else if (stage === 'conclusion') {
      // Complete the interaction and return to map
      completeInteraction();
    }
  };
  
  // Skip typewriter effect if clicked
  const skipTypewriter = () => {
    if (isTyping) {
      const currentDialogue = dialogue[dialogueIndex];
      let fullText = currentDialogue.text;
      
      if (stage === 'response' && selectedOption) {
        fullText = selectedOption.responseText;
      }
      
      setTypewriterText(fullText);
      setIsTyping(false);
    }
  };
  
  // Render content based on current stage
  return (
    <div 
      className="p-6 max-w-4xl mx-auto bg-surface pixel-borders"
      style={{ borderColor: character.primaryColor }}
    >
      {/* Character header */}
      <div className="flex items-center mb-6">
        <div 
          className="w-16 h-16 mr-4 flex items-center justify-center text-3xl"
          style={{ 
            backgroundColor: character.darkColor,
            border: `2px solid ${character.primaryColor}`
          }}
        >
          {character.portrait}
        </div>
        
        <div>
          <PixelText className={`text-2xl ${character.textColor}`}>{character.name}</PixelText>
          <PixelText className="text-text-secondary">{character.title}</PixelText>
        </div>
      </div>
      
      {/* Dialogue display */}
      <div 
        className="min-h-[200px] p-4 mb-6 pixel-borders-thin"
        style={{ 
          backgroundColor: 'var(--surface-dark)',
          borderColor: character.primaryColor 
        }}
        onClick={skipTypewriter}
      >
        <PixelText>
          {typewriterText}
          {isTyping && showCursor && <span className="animate-pulse">|</span>}
        </PixelText>
      </div>
      
      {/* Choices or continue button */}
      {stage === 'choice' && dialogue[dialogueIndex].options && (
        <div className="space-y-3 mb-6">
          {dialogue[dialogueIndex].options?.map(option => (
            <button
              key={option.id}
              className={`
                w-full text-left p-3 pixel-borders-thin
                bg-surface hover:bg-surface-dark
                transition-colors
              `}
              onClick={() => handleChoiceSelect(option)}
            >
              <PixelText>{option.text}</PixelText>
            </button>
          ))}
        </div>
      )}
      
      {/* Relationship change indicator (shown in response stage) */}
      {stage === 'response' && (
        <div className="flex justify-between items-center mb-6 p-3 pixel-borders-thin bg-surface-dark">
          <div className="flex items-center">
            <PixelText className="mr-2">Relationship with {character.name}:</PixelText>
            <span className={`
              px-2 py-1 text-white
              ${relationshipChange > 0 ? 'bg-success' : relationshipChange < 0 ? 'bg-danger' : 'bg-medium-gray'}
            `}>
              {relationshipChange > 0 ? '+1' : relationshipChange < 0 ? '-1' : '0'}
            </span>
          </div>
          
          <div className="flex items-center">
            <PixelText className="mr-2">Insight gained:</PixelText>
            <span className="px-2 py-1 bg-clinical text-white">
              +{insightGained}
            </span>
          </div>
        </div>
      )}
      
      {/* Conclusion messaging */}
      {stage === 'conclusion' && (
        <div className="p-4 pixel-borders-thin bg-surface-dark mb-6">
          <PixelText className="text-xl mb-2">Interaction Complete</PixelText>
          <PixelText className="mb-2">
            You've completed your interaction with {character.name}.
          </PixelText>
          
          <div className="flex justify-between">
            <div>
              <PixelText className="text-text-secondary">
                Relationship: Level {character.relationshipLevel}/{character.maxRelationshipLevel}
              </PixelText>
              {relationshipChange !== 0 && (
                <PixelText className={relationshipChange > 0 ? 'text-success' : 'text-danger'}>
                  {relationshipChange > 0 ? '+' : ''}{relationshipChange} from this interaction
                </PixelText>
              )}
            </div>
            
            <div>
              <PixelText className="text-text-secondary">
                Insight Gained:
              </PixelText>
              <PixelText className="text-clinical-light">
                +{insightGained}
              </PixelText>
            </div>
          </div>
        </div>
      )}
      
      {/* Continue button (not shown during choice stage) */}
      {stage !== 'choice' && (
        <PixelButton
          className={`
            ${character.bgColor} text-white hover:opacity-90
            ${!isTyping || stage === 'conclusion' ? '' : 'opacity-50 cursor-wait'}
          `}
          onClick={handleContinue}
          disabled={isTyping && stage !== 'conclusion'}
        >
          {stage === 'conclusion' ? 'Complete Interaction' : isTyping ? 'Skip' : 'Continue'}
        </PixelButton>
      )}
    </div>
  );
}