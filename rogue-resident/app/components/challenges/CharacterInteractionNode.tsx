// app/components/challenges/CharacterInteractionNode.tsx
'use client';
import { useState, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { PixelButton, PixelText } from '../PixelThemeProvider';
import { useGameEffects } from '../GameEffects';
import { DialogueNode, DialogueOption, Character } from '../dialogue/DialogueSystem';
// Add this type import if not already present
import type { ReactionType } from '../dialogue/DialogueSystem';

// Interaction stages
type InteractionStage = 'intro' | 'dialogue' | 'choice' | 'response' | 'conclusion';

// Character data with defined personalities and interaction patterns
const CHARACTER_DATA = {
  'kapoor': {
    name: 'Dr. Kapoor',
    title: 'Chief Medical Physicist',
    portrait: '👨‍⚕️',
    primaryColor: 'var(--clinical-color)',
    lightColor: 'var(--clinical-color-light)',
    darkColor: 'var(--clinical-color-dark)',
    textColor: 'text-clinical-light',
    bgColor: 'bg-clinical',
    dialogueStyle: 'Precise, professional, uses specific numbers and technical terminology.',
    introduction: "Good morning. I've been reviewing your recent clinical assessments. Your attention to procedural details is showing a 67% improvement since you started, but there's still room for optimization.",
    challengeType: 'clinical',
    insightMultiplier: 1.2 // Provides slightly more insight for successful interactions
  },
  'jesse': {
    name: 'Technician Jesse',
    title: 'Equipment Specialist',
    portrait: '👨‍🔧',
    primaryColor: 'var(--qa-color)',
    lightColor: 'var(--qa-color-light)',
    darkColor: 'var(--qa-color-dark)',
    textColor: 'text-qa-light',
    bgColor: 'bg-qa',
    dialogueStyle: 'Direct, uses shortened sentences and technical jargon with practical emphasis.',
    introduction: "Hey there. LINAC 2 acting up again. Output's high by 2.3%. Already recalibrated twice this week. Strange behavior.",
    challengeType: 'technical',
    insightMultiplier: 1.0
  },
  'quinn': {
    name: 'Dr. Zephyr Quinn',
    title: 'Experimental Researcher',
    portrait: '👩‍🔬',
    primaryColor: 'var(--educational-color)',
    lightColor: 'var(--educational-color-light)',
    darkColor: 'var(--educational-color-dark)',
    textColor: 'text-educational-light',
    bgColor: 'bg-educational',
    dialogueStyle: 'Excited, jumps between topics, uses unusual metaphors and creative language.',
    introduction: "Ah! Just the person I wanted to see! You're just in time to witness something extraordinary! I've been experimenting with quantum entanglement principles applied to radiation detector arrays!",
    challengeType: 'theoretical',
    insightMultiplier: 1.5 // Higher risk/reward for Quinn's experimental approaches
  }
};

// Sample dialogues for each character - these would typically be loaded from data files
const CHARACTER_DIALOGUES: Record<Character, DialogueNode[]> = {
  // Dr. Kapoor dialogue - clinical precision
  'kapoor': [
    {
      id: 'kapoor-intro',
      text: "Good morning. I've been reviewing your recent clinical assessments. Your attention to procedural details is showing a 67% improvement since you started, but there's still room for optimization. I have a case I'd like your opinion on.",
      character: 'kapoor',
      nextNodeId: 'kapoor-question'
    },
    {
      id: 'kapoor-question',
      text: "We have a patient with a complex head and neck case. The physician wants to spare the parotid glands while maintaining adequate coverage of the target volume. What approach would you recommend for the planning process?",
      character: 'kapoor',
      options: [
        {
          id: 'option1',
          text: "I'd recommend an IMRT plan with specific dose constraints for the parotids while ensuring the PTV receives at least 95% of the prescription dose.",
          responseText: "That's the standard approach, and generally effective. Your understanding of the clinical priorities is sound. I'm pleased to see you balancing target coverage with organ-at-risk sparing.",
          insightGain: 30,
          knowledgeGain: {
            domain: 'clinical',
            amount: 10
          }
        },
        {
          id: 'option2',
          text: "I'd use a simple 3D conformal plan since it's faster to implement and review.",
          responseText: "That approach lacks the necessary conformality for such a complex case. The parotid sparing would be suboptimal. I'd encourage you to consider the more sophisticated techniques available to us.",
          insightGain: 10,
          knowledgeGain: {
            domain: 'clinical',
            amount: 5
          }
        },
        {
          id: 'option3',
          text: "I'd prioritize target coverage completely, and worry about the parotids secondarily since tumor control is most important.",
          responseText: "While tumor control is indeed critical, we must balance it with quality of life considerations. A good plan achieves both objectives without compromise. Your approach requires more nuance.",
          insightGain: 15,
          knowledgeGain: {
            domain: 'clinical',
            amount: 5
          }
        }
      ]
    },
    {
      id: 'kapoor-conclusion',
      text: "Thank you for your input. I've scheduled you for a plan review session tomorrow at 9:00 AM sharp. Please review the QUANTEC guidelines for head and neck prior to our meeting. That will be all for now.",
      character: 'kapoor'
    }
  ],

  // Technician Jesse dialogue - practical approach
  'jesse': [
    {
      id: 'jesse-intro',
      text: "Hey there. LINAC 2 acting up again. Output's high by 2.3%. Already recalibrated twice this week. Strange behavior.",
      character: 'jesse',
      nextNodeId: 'jesse-question'
    },
    {
      id: 'jesse-question',
      text: "Think I found the issue. Temperature sensor giving bad readings. System thinks it's cooler than actual. Compensating wrong. Could replace sensor or add correction factor in software. What's your call?",
      character: 'jesse',
      options: [
        {
          id: 'option1',
          text: "Let's replace the sensor. Hardware fixes are more reliable than software workarounds.",
          responseText: "Smart call. Software patches just mask problems. Replaced three sensors last year. Same issue. Ordered the part already. Should arrive tomorrow. Good instinct.",
          insightGain: 30,
          knowledgeGain: {
            domain: 'technical',
            amount: 10
          }
        },
        {
          id: 'option2',
          text: "Let's implement the software correction factor. We can fix it properly during scheduled maintenance.",
          responseText: "Workable solution. Not ideal though. Temporary fix becomes permanent too often. But pragmatic. Can implement now. Just don't let Dr. Kapoor hear about it.",
          insightGain: 15,
          knowledgeGain: {
            domain: 'technical',
            amount: 5
          }
        },
        {
          id: 'option3',
          text: "We should consult the manufacturer's documentation first before deciding on an approach.",
          responseText: "By the book, huh? Manual's three inches thick. Checked already. Generic advice. 'Contact support.' Been there. Wasted two hours on hold last time. Sometimes gotta trust experience over manuals.",
          insightGain: 10,
          knowledgeGain: {
            domain: 'general',
            amount: 5
          }
        }
      ]
    },
    {
      id: 'jesse-conclusion',
      text: "Good talk. Gotta run. Got three QAs lined up. Swing by later if interested in seeing calibration trick. Works better than manual says. Later.",
      character: 'jesse'
    }
  ],

  // Dr. Quinn dialogue - creative theoretical approach
  'quinn': [
    {
      id: 'quinn-intro',
      text: "Ah! Just the person I wanted to see! You're just in time to witness something extraordinary! I've been experimenting with quantum entanglement principles applied to radiation detector arrays—oh, you should see the patterns we're getting! It's like the universe is sending us coded messages through dosimetry!",
      character: 'quinn',
      nextNodeId: 'quinn-question'
    },
    {
      id: 'quinn-question',
      text: "I've modifiedfluxified these old ion chambers and now they're picking up signal patterns that—well, they shouldn't be possible according to conventional wisdom! Take a look at these readings! What do you think might explain this phenomenon?",
      character: 'quinn',
      options: [
        {
          id: 'option1',
          text: "Could this be related to quantum tunneling effects at the microscopic level of the detector elements?",
          responseText: "YES! Precisely what I was thinking! The quantum probability fields are absolutely penetrating the conventional barriers! You have such an intuitive grasp of the bleeding edge! We must explore this further—perhaps after hours when Kapoor isn't watching?",
          insightGain: 45,
          knowledgeGain: {
            domain: 'theoretical',
            amount: 15
          }
        },
        {
          id: 'option2',
          text: "Have you checked for environmental interference or equipment malfunction?",
          responseText: "Ugh, you sound just like the safety committee. 'Dr. Quinn, verify your equipment.' 'Dr. Quinn, follow protocols.' Of course I checked! Triple-verified! Quadruple-confirmed! This isn't a malfunction—it's a breakthrough! Think bigger!",
          insightGain: 10,
          knowledgeGain: {
            domain: 'technical',
            amount: 5
          }
        },
        {
          id: 'option3',
          text: "The patterns look interesting, but I'd need to understand your methodology better before forming a conclusion.",
          responseText: "Ah, a cautious scientist! Commendable, if somewhat conventional. My methodology is... well, let's call it 'creatively rigorous'! I've documented everything in my system. Color-coded sticky notes all over my apartment. I'll bring you the blue ones tomorrow!",
          insightGain: 20,
          knowledgeGain: {
            domain: 'theoretical',
            amount: 5
          }
        }
      ]
    },
    {
      id: 'quinn-conclusion',
      text: "I knew you'd get it! This is why I wanted your perspective! Everyone else just sees noise in the data but YOU—you see the patterns! I've added you to my 3AM email list for experimental breakthrough updates. Don't worry about the timestamp—time is just another construct we can transcend!",
      character: 'quinn'
    }
  ],
  
  // Player doesn't initiate dialogues
  'player': []
};

// Component props with optional character specification
interface CharacterInteractionNodeProps {
  character?: keyof typeof CHARACTER_DATA;
}

export default function CharacterInteractionNode({ character: characterProp }: CharacterInteractionNodeProps) {
  const [stage, setStage] = useState<InteractionStage>('intro');
  const [currentCharacter, setCurrentCharacter] = useState<keyof typeof CHARACTER_DATA>('kapoor');
  const [dialogueIndex, setDialogueIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<DialogueOption | null>(null);
  const [relationshipChange, setRelationshipChange] = useState(0);
  const [insightGained, setInsightGained] = useState(0);
  const [knowledgeGained, setKnowledgeGained] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  // Add these state variables at the top of your component with other useState declarations
  const [currentReaction, setCurrentReaction] = useState<ReactionType | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  
  const { completeNode, currentNodeId, updateInsight } = useGameStore();
  const { playSound, flashScreen } = useGameEffects();
  
  // Select random character for the interaction if none provided
  useEffect(() => {
    // If a character prop is provided, use it
    if (characterProp && CHARACTER_DATA[characterProp]) {
      setCurrentCharacter(characterProp);
      console.log(`Using provided character: ${characterProp}`);
    } else {
      // Fallback to random selection
      const characters = Object.keys(CHARACTER_DATA) as Array<keyof typeof CHARACTER_DATA>;
      const randomCharacter = characters[Math.floor(Math.random() * characters.length)];
      setCurrentCharacter(randomCharacter);
      console.log(`No valid character provided, using random: ${randomCharacter}`);
    }
    
    // Play introduction sound
    if (playSound) playSound('challenge-start');
  }, [playSound, characterProp]);
  
  // Get character data and dialogue
  const characterData = CHARACTER_DATA[currentCharacter];
  const dialogue = CHARACTER_DIALOGUES[currentCharacter as Character];
  
  // Replace the entire existing handleChoiceSelect function
  const handleChoiceSelect = (option: DialogueOption) => {
    setSelectedOption(option);
    
    // Enhanced visual response handling
    // Calculate relationship change (simplified for prototype)
    const relChange = option.insightGain && option.insightGain >= 30 ? 1 : 
                    option.insightGain && option.insightGain <= 15 ? -1 : 0;
    
    setRelationshipChange(relChange);
    
    // Select appropriate reaction type based on relationship change and insight gain
    // Revised reaction mapping that uses your existing types
    const reactionType: ReactionType = 
      relChange > 0 ? 'positive' :
      relChange < 0 ? 'negative' :
      option.insightGain && option.insightGain > 20 ? 'approval' :
      option.insightGain && option.insightGain < 10 ? 'confusion' : 
      'approval'; // Default to a subtle approval rather than using 'neutral'
      
    // Explicitly set current reaction with debug logging
    console.log(`Setting ${characterData.name}'s reaction: ${reactionType}`);
    setCurrentReaction(reactionType);
    
    // Force animation refresh by clearing and resetting with timeout
    // This is critical for ensuring the animation triggers even when selecting the same reaction type
    setIsShaking(false);
    setTimeout(() => {
      setIsShaking(true);
      
      // Clear shake after animation completes
      setTimeout(() => setIsShaking(false), 500);
    }, 10);
    
    // Track insight and knowledge gains
    setInsightGained(option.insightGain || 0);
    
    if (option.knowledgeGain) {
      setKnowledgeGained(`${option.knowledgeGain.amount}% in ${option.knowledgeGain.domain}`);
    } else {
      setKnowledgeGained('');
    }
    
    // Set feedback message based on relationship change
    if (relChange > 0) {
      setFeedbackMessage(`${characterData.name} seems impressed by your insight.`);
    } else if (relChange < 0) {
      setFeedbackMessage(`${characterData.name} seems somewhat disappointed by your approach.`);
    } else {
      setFeedbackMessage(`${characterData.name} acknowledges your response.`);
    }
    
    setStage('response');
    
    // Play appropriate sound with enhanced error handling
    try {
      if (playSound) {
        if (relChange > 0) {
          playSound('success');
          if (flashScreen) flashScreen('green');
        } else if (relChange < 0) {
          playSound('failure');
          if (flashScreen) flashScreen('red');
        } else {
          playSound('click');
        }
      }
    } catch (error) {
      console.error("Error playing sound effect:", error);
    }
  };
  
  // Complete the interaction
  const completeInteraction = () => {
    if (currentNodeId) {
      // Apply character's insight multiplier to the base insight gain
      const adjustedInsight = Math.round(insightGained * characterData.insightMultiplier);
      
      // Update game state
      updateInsight(adjustedInsight);
      
      // In a full implementation, would also update knowledge domain mastery
      // updateKnowledge(selectedOption.knowledgeGain.domain, selectedOption.knowledgeGain.amount);
      
      // Mark node as completed
      completeNode(currentNodeId);
      
      // Play completion sound
      if (playSound) playSound('challenge-complete');
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
      } else if (currentDialogue.nextNodeId) {
        // If dialogue has next node, find and go to it
        const nextNodeIndex = dialogue.findIndex(d => d.id === currentDialogue.nextNodeId);
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
  
  // Render content based on current stage
  const renderContent = () => {
    const currentDialogue = dialogue[dialogueIndex];
    
    switch (stage) {
      case 'intro':
      case 'dialogue':
        return (
          <div 
            className="min-h-[200px] p-6 mb-6 pixel-borders-thin"
            style={{ 
              backgroundColor: 'var(--surface-dark)',
              borderColor: characterData.primaryColor 
            }}
          >
            <PixelText>{currentDialogue.text}</PixelText>
          </div>
        );
        
      case 'choice':
        return (
          <div className="mb-6">
            <div 
              className="min-h-[120px] p-6 mb-4 pixel-borders-thin"
              style={{ 
                backgroundColor: 'var(--surface-dark)',
                borderColor: characterData.primaryColor 
              }}
            >
              <PixelText>{currentDialogue.text}</PixelText>
            </div>
            
            <div className="space-y-3">
              {currentDialogue.options?.map(option => (
                <button
                  key={option.id}
                  className={`
                    w-full text-left p-3 pixel-borders-thin
                    bg-surface hover:bg-surface-dark
                    transition-colors
                  `}
                  onClick={() => handleChoiceSelect(option)}
                >
                  <div className="flex justify-between items-center">
                    <PixelText>{option.text}</PixelText>
                    
                    {/* Show insight preview if available */}
                    {option.insightGain && option.insightGain > 0 && (
                      <span className="ml-2 text-xs bg-clinical text-white px-2 py-1">
                        +{option.insightGain}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
        
      case 'response':
        return (
          <div className="mb-6">
            <div 
              className="min-h-[120px] p-6 mb-4 pixel-borders-thin"
              style={{ 
                backgroundColor: 'var(--surface-dark)',
                borderColor: characterData.primaryColor 
              }}
            >
              <PixelText>{selectedOption?.responseText}</PixelText>
            </div>
            
            {/* Relationship change indicator */}
            <div className="flex justify-between items-center mb-3 p-3 pixel-borders-thin bg-surface-dark">
              <PixelText>{feedbackMessage}</PixelText>
            </div>
            
            {/* Rewards display */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface p-3 pixel-borders-thin">
                <PixelText className="text-text-secondary text-sm">Insight Gained:</PixelText>
                <PixelText className={`text-lg ${characterData.textColor}`}>
                  +{Math.round(insightGained * characterData.insightMultiplier)} 
                  {characterData.insightMultiplier !== 1 && (
                    <span className="text-xs ml-1">
                      ({characterData.insightMultiplier > 1 ? `+${(characterData.insightMultiplier - 1) * 100}%` : `${(characterData.insightMultiplier - 1) * 100}%`})
                    </span>
                  )}
                </PixelText>
              </div>
              
              <div className="bg-surface p-3 pixel-borders-thin">
                <PixelText className="text-text-secondary text-sm">Knowledge Progress:</PixelText>
                <PixelText className={`text-lg ${characterData.textColor}`}>
                  {knowledgeGained || 'None'}
                </PixelText>
              </div>
            </div>
          </div>
        );
        
      case 'conclusion':
        return (
          <div className="mb-6">
            <div 
              className="min-h-[120px] p-6 mb-4 pixel-borders-thin"
              style={{ 
                backgroundColor: 'var(--surface-dark)',
                borderColor: characterData.primaryColor 
              }}
            >
              <PixelText>{dialogue[dialogue.length - 1].text}</PixelText>
            </div>
            
            <div className="bg-surface p-4 pixel-borders-thin">
              <PixelText className="text-xl mb-3">Interaction Summary</PixelText>
              
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-surface-dark p-2 pixel-borders-thin">
                  <PixelText className="text-text-secondary text-sm">Total Insight:</PixelText>
                  <PixelText className={`text-lg ${characterData.textColor}`}>
                    +{Math.round(insightGained * characterData.insightMultiplier)}
                  </PixelText>
                </div>
                
                <div className="bg-surface-dark p-2 pixel-borders-thin">
                  <PixelText className="text-text-secondary text-sm">Knowledge Gained:</PixelText>
                  <PixelText className={`text-lg ${characterData.textColor}`}>
                    {knowledgeGained || 'None'}
                  </PixelText>
                </div>
              </div>
              
              <PixelText className="text-text-secondary text-sm italic">
                In the full game, these insights would contribute to your knowledge constellation
                and relationship development with {characterData.name}.
              </PixelText>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };
  
  // If no character or dialogue, show loading state
  if (!characterData || !dialogue || dialogue.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <div className="p-6 bg-surface pixel-borders text-center">
          <PixelText className="text-lg text-text-secondary">
            Loading character interaction...
          </PixelText>
        </div>
      </div>
    );
  }
  
  return (
    <div 
      className="p-6 max-w-4xl mx-auto bg-surface pixel-borders"
      style={{ borderColor: characterData.primaryColor }}
    >
      {/* Character header */}
      <div className="flex items-center mb-6">
        <div 
          className="w-16 h-16 mr-4 flex items-center justify-center text-3xl"
          style={{ 
            backgroundColor: characterData.darkColor,
            border: `2px solid ${characterData.primaryColor}`
          }}
        >
          {characterData.portrait}
        </div>
        
        <div>
          <PixelText className={`text-2xl ${characterData.textColor}`}>{characterData.name}</PixelText>
          <PixelText className="text-text-secondary">{characterData.title}</PixelText>
        </div>
      </div>
      
      {/* Main content area - changes based on stage */}
      {renderContent()}
      
      {/* Continue button */}
      <div className="flex justify-end">
        <PixelButton
          className={`${characterData.bgColor} text-white hover:opacity-90`}
          onClick={handleContinue}
        >
          {stage === 'intro' ? 'Continue' : 
           stage === 'dialogue' ? 'Continue' :
           stage === 'choice' ? 'Choose a response' :
           stage === 'response' ? 'Continue' :
           stage === 'conclusion' ? 'Complete Interaction' : 'Continue'}
        </PixelButton>
      </div>
    </div>
  );
}