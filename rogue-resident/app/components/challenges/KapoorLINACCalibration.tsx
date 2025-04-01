// app/components/challenges/KapoorLINACCalibration.tsx
'use client';
import { useState, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useKnowledgeStore } from '../../store/knowledgeStore';
import { PixelText, PixelButton } from '../PixelThemeProvider';
import { useGameEffects } from '../GameEffects';
import Image from 'next/image';

// Dialogue stage representation
interface DialogueStage {
  text: string;
  contextNote?: string;
  equipment?: {
    imageSrc: string;
    alt: string;
    description: string;
  };
  options?: DialogueOption[];
}

// Option for player responses
interface DialogueOption {
  text: string;
  nextStage: number;
  insightGain?: number;
  knowledgeGain?: {
    domain: 'clinical' | 'technical' | 'theoretical' | 'general';
    conceptId?: string;
    amount: number;
  };
  responseText?: string;
}

export default function KapoorLINACCalibration() {
  // Store access
  const { currentNodeId, completeNode, updateInsight } = useGameStore();
  const { updateMastery } = useKnowledgeStore();
  const { playSound, flashScreen, showRewardEffect } = useGameEffects();
  
  // Core state
  const [dialogueStage, setDialogueStage] = useState(0);
  const [selectedOption, setSelectedOption] = useState<DialogueOption | null>(null);
  const [showResponse, setShowResponse] = useState(false);
  const [totalInsightGained, setTotalInsightGained] = useState(0);
  const [encounterComplete, setEncounterComplete] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [displayedText, setDisplayedText] = useState('');
  
  // Dr. Kapoor character data
  const kapoor = {
    name: "Dr. Kapoor",
    title: "Chief Medical Physicist",
    sprite: "/characters/kapoor.png", 
    primaryColor: "var(--clinical-color)",
    textClass: "text-clinical-light",
    bgClass: "bg-clinical"
  };
  
  // Full dialogue sequence - this defines the entire encounter flow
  const dialogue: DialogueStage[] = [
    // Stage 0: Introduction
    {
      text: "Good morning. I see you've arrived precisely on schedule. I'm conducting the monthly output measurements on LINAC 2. Since this is your first day, observing proper protocol will be instructive.",
      equipment: {
        imageSrc: "/items/linac.png",
        alt: "Linear Accelerator",
        description: "LINAC 2, the Varian TrueBeam used primarily for head and neck treatments."
      },
      options: [
        { 
          text: "I'm looking forward to learning the procedures.", 
          nextStage: 1, 
          insightGain: 5,
          responseText: "A positive attitude toward learning is the foundation of good practice. Let's begin with the fundamentals."
        },
        { 
          text: "I've done calibrations before during my internship.", 
          nextStage: 1, 
          insightGain: 0,
          responseText: "Previous experience is useful, but each facility has specific protocols. I'd advise against assuming familiarity prematurely."
        }
      ]
    },
    
    // Stage 1: Basic calibration setup
    {
      text: "We'll start with the basics. I've set up our calibrated farmer chamber at isocenter with proper buildup. Can you recall why we use buildup material?",
      contextNote: "Dr. Kapoor adjusts the ionization chamber positioned in a water-equivalent phantom.",
      equipment: {
        imageSrc: "/items/farmer-chamber.png",
        alt: "Farmer Chamber",
        description: "A calibrated Farmer-type ionization chamber with PMMA buildup cap."
      },
      options: [
        { 
          text: "To ensure we're measuring in the region of electronic equilibrium.", 
          nextStage: 2, 
          insightGain: 15,
          knowledgeGain: { 
            domain: 'technical', 
            conceptId: 'dosimetry-principles',
            amount: 10 
          },
          responseText: "Precisely. Electronic equilibrium is essential for accurate dosimetry. The buildup material ensures charged particle equilibrium at the measurement point."
        },
        { 
          text: "To filter out unwanted radiation scatter.", 
          nextStage: 2, 
          insightGain: 5,
          responseText: "Not quite. While buildup does affect scatter, its primary purpose is to establish electronic equilibrium. The scatter component is actually an integral part of what we need to measure."
        }
      ]
    },
    
    // Stage 2: Measurement considerations
    {
      text: "For our reference dosimetry, we're measuring at 10×10cm field size. What correction factor is most critical to apply in these measurements?",
      contextNote: "The LINAC console shows beam parameters: 6MV photons, 100 MU, 10×10cm field.",
      equipment: {
        imageSrc: "/items/chamber-setup.png",
        alt: "Measurement Setup",
        description: "The ionization chamber setup at isocenter with field size indicators."
      },
      options: [
        { 
          text: "Temperature and pressure correction (PTP).", 
          nextStage: 3, 
          insightGain: 15,
          knowledgeGain: { 
            domain: 'technical', 
            conceptId: 'radiation-detectors',
            amount: 8 
          },
          responseText: "Correct. The PTP factor accounts for the difference between calibration conditions and measurement conditions. A 3% error in this correction directly impacts patient dose accuracy."
        },
        { 
          text: "Beam quality correction (kQ).", 
          nextStage: 3, 
          insightGain: 10,
          knowledgeGain: { 
            domain: 'technical', 
            amount: 5 
          },
          responseText: "While kQ is indeed important, for routine measurements where the beam quality is stable, temperature and pressure corrections are actually more critical as they change daily."
        },
        { 
          text: "Polarity correction (kpol).", 
          nextStage: 3, 
          insightGain: 5,
          responseText: "The polarity effect is generally small for farmer chambers in photon beams. Temperature and pressure variations have a much more significant impact on our daily measurements."
        }
      ]
    },
    
    // Stage 3: Output measurement analysis
    {
      text: "Our measurements are showing 1.01 compared to baseline. The tolerance is ±2%. How would you interpret this result?",
      contextNote: "Dr. Kapoor displays the electrometer readings and calculation spreadsheet.",
      equipment: {
        imageSrc: "/items/electrometer.png",
        alt: "Electrometer Reading",
        description: "The electrometer showing collected charge measurements from the chamber."
      },
      options: [
        { 
          text: "The output is within tolerance and acceptable for clinical use.", 
          nextStage: 4, 
          insightGain: 15,
          knowledgeGain: { 
            domain: 'clinical', 
            amount: 10 
          },
          responseText: "Correct. The measurement is within our action threshold. However, we should note the trend for future reference. Consistent drift in one direction may indicate a developing issue."
        },
        { 
          text: "We should recalibrate to get closer to baseline.", 
          nextStage: 4, 
          insightGain: 5,
          responseText: "That would be unnecessarily disruptive to clinical operations. Our protocols specify recalibration only when measurements exceed the ±2% tolerance. Maintaining consistency is important, but over-adjustment introduces its own errors."
        }
      ]
    },
    
    // Stage 4: Clinical significance
    {
      text: "Final question: A 1% error in output calibration for a typical 70 Gy head and neck treatment would result in a dose difference of how much?",
      contextNote: "Dr. Kapoor is documenting the results in the QA log.",
      options: [
        { 
          text: "0.7 Gy", 
          nextStage: 5, 
          insightGain: 15,
          knowledgeGain: { 
            domain: 'clinical', 
            conceptId: 'radiation-safety',
            amount: 10 
          },
          responseText: "Exactly right. This illustrates why our tolerances matter. A 0.7 Gy difference could mean the difference between tumor control and recurrence, or between acceptable side effects and complications."
        },
        { 
          text: "7 Gy", 
          nextStage: 5, 
          insightGain: 5,
          responseText: "Check your calculation. A 1% error on 70 Gy would be 0.7 Gy, not 7 Gy. This distinction is clinically significant and demonstrates why precision in our calculations is essential."
        }
      ]
    },
    
    // Stage 5: Conclusion
    {
      text: "You've demonstrated a satisfactory understanding of basic output measurement principles. This knowledge forms the foundation of everything we do in radiation oncology physics. Small errors here propagate throughout the entire treatment chain.",
      contextNote: "Dr. Kapoor completes the documentation with a methodical signature.",
      options: [
        { 
          text: "Thank you for the guidance. I'll apply these principles in my future work.", 
          nextStage: 6, 
          insightGain: 10,
          responseText: "Good. Remember that in medical physics, theoretical knowledge must always translate to practical application. Lives depend on our precision."
        }
      ]
    },
    
    // Stage 6: Completion - No more options, just end text
    {
      text: "I've scheduled you to observe the monthly IMRT QA session tomorrow. Be punctual. I expect you to build on what you've learned today. You're dismissed.",
      contextNote: "Dr. Kapoor returns to his calculations, already focused on the next task."
    }
  ];

  // Get current dialogue stage
  const currentDialogue = dialogue[dialogueStage];
  
  // Text typing effect
  useEffect(() => {
    if (!currentDialogue) return;
    
    // Text to display - either response from previous choice or new dialogue
    const textToShow = showResponse && selectedOption?.responseText 
      ? selectedOption.responseText
      : currentDialogue.text;
      
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
    }, 25); // Text speed - lower is faster
    
    return () => clearInterval(interval);
  }, [dialogueStage, showResponse, selectedOption]);

  // Handle player choice selection
  const handleChoiceSelect = (option: DialogueOption) => {
    setSelectedOption(option);
    setShowResponse(true);
    
    // Play sound for selection
    if (playSound) playSound('click');
    
    // Apply insight gain
    if (option.insightGain) {
      const gain = option.insightGain;
      updateInsight(gain);
      setTotalInsightGained(prev => prev + gain);
      
      // Show visual effect for substantial insight gains
      if (gain >= 10 && showRewardEffect) {
        showRewardEffect(gain, window.innerWidth / 2, window.innerHeight / 2);
      }
    }
    
    // Apply knowledge domain gain
    if (option.knowledgeGain) {
      if (option.knowledgeGain.conceptId) {
        updateMastery(option.knowledgeGain.conceptId, option.knowledgeGain.amount);
      }
      // Note: If you need to update domain-wide knowledge instead of concept-specific,
      // you would use a different function here
    }
  };
  
  // Handle continue after response
  const handleContinue = () => {
    // If showing response, transition to next dialogue
    if (showResponse) {
      setShowResponse(false);
      setDialogueStage(selectedOption?.nextStage || dialogueStage + 1);
      setSelectedOption(null);
    } 
    // If at final stage with no options, complete encounter
    else if (dialogueStage >= dialogue.length - 1 || !currentDialogue.options) {
      if (!encounterComplete) {
        setEncounterComplete(true);
        
        // Mark node as completed in game state
        if (currentNodeId) {
          completeNode(currentNodeId);
          
          // Apply completion effect
          if (playSound) playSound('challenge-complete');
          if (flashScreen) flashScreen('green');
        }
      }
    }
    // Otherwise just advance text
    else if (isTyping) {
      // Skip to end of text if still typing
      setIsTyping(false);
      setDisplayedText(showResponse && selectedOption?.responseText 
        ? selectedOption.responseText 
        : currentDialogue.text);
    }
  };

  // If encounter is complete, show summary screen
  if (encounterComplete) {
    return (
      <div className="p-6 max-w-4xl mx-auto bg-surface pixel-borders">
        <div className="text-center mb-8">
          <PixelText className="text-3xl text-clinical-light font-pixel-heading mb-4">
            Calibration Complete
          </PixelText>
          <div className="p-6 bg-surface-dark pixel-borders-thin max-w-2xl mx-auto">
            <p className="mb-4 font-pixel text-text-primary">
              You've completed your first calibration session with Dr. Kapoor. 
              His methodical approach to measurement has given you insight into 
              the precision required in medical physics practice.
            </p>
            <p className="font-medium text-clinical-light font-pixel">
              These fundamentals will serve as a foundation for more complex challenges ahead.
            </p>
          </div>
        </div>
        
        <div className="mb-6">
          <PixelText className="text-lg text-text-primary mb-2">Session Results</PixelText>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface-dark p-4 pixel-borders-thin text-center">
              <PixelText className="text-text-secondary mb-1">Insight Gained</PixelText>
              <PixelText className="text-2xl text-clinical-light">{totalInsightGained}</PixelText>
            </div>
            <div className="bg-surface-dark p-4 pixel-borders-thin text-center">
              <PixelText className="text-text-secondary mb-1">Knowledge Progress</PixelText>
              <PixelText className="text-2xl text-clinical-light">Dosimetry +</PixelText>
            </div>
          </div>
        </div>
        
        <div className="text-center">
          <PixelButton
            className="px-6 py-3 bg-clinical text-white hover:bg-clinical-light"
            onClick={() => window.location.reload()} // Simple way to restart for prototype
          >
            Continue to Map
          </PixelButton>
        </div>
      </div>
    );
  }

  // Main encounter rendering
  return (
    <div className="p-6 max-w-4xl mx-auto bg-surface pixel-borders">
      {/* Character header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <div 
            className="w-12 h-12 mr-4 rounded-lg overflow-hidden"
            style={{ border: `2px solid ${kapoor.primaryColor}` }}
          >
            <Image 
              src={kapoor.sprite}
              alt={kapoor.name}
              width={48}
              height={48}
              className="object-cover w-full h-full"
            />
          </div>
          <div>
            <PixelText className={`text-lg ${kapoor.textClass}`}>{kapoor.name}</PixelText>
            <PixelText className="text-text-secondary text-sm">{kapoor.title}</PixelText>
          </div>
        </div>
        
        <div className="bg-surface-dark px-3 py-1 text-sm font-pixel">
          <PixelText className="text-text-secondary">Output Measurement - LINAC 2</PixelText>
        </div>
      </div>
      
      {/* Main interaction area */}
      <div className="flex mb-6">
        {/* Character portrait - left side */}
        <div className="w-1/3 pr-4">
          <div className="aspect-square relative mb-3 rounded-lg overflow-hidden pixel-borders-thin">
            <Image 
              src={kapoor.sprite}
              alt={kapoor.name}
              fill
              className="object-cover"
            />
          </div>
          
          {/* Equipment visualization */}
          {currentDialogue.equipment && (
            <div className="bg-surface-dark p-2 pixel-borders-thin">
              <div className="relative h-24 mb-2">
                <Image 
                  src={currentDialogue.equipment.imageSrc}
                  alt={currentDialogue.equipment.alt}
                  fill
                  className="object-contain"
                />
              </div>
              <PixelText className="text-xs text-text-secondary">
                {currentDialogue.equipment.description}
              </PixelText>
            </div>
          )}
        </div>
        
        {/* Dialogue area - right side */}
        <div className="w-2/3">
          {/* Main dialogue text */}
          <div className="bg-surface-dark p-4 pixel-borders-thin mb-4 min-h-[120px]">
            <PixelText>{displayedText}{isTyping ? '|' : ''}</PixelText>
            
            {/* Context note below main dialogue */}
            {!isTyping && currentDialogue.contextNote && (
              <div className="mt-3 pt-2 border-t border-border">
                <PixelText className="text-text-secondary text-sm italic">
                  {currentDialogue.contextNote}
                </PixelText>
              </div>
            )}
          </div>
          
          {/* Options or continue button */}
          {showResponse ? (
            <PixelButton
              className={`float-right ${kapoor.bgClass} text-white hover:opacity-90`}
              onClick={handleContinue}
            >
              {isTyping ? "Skip" : "Continue"}
            </PixelButton>
          ) : (
            currentDialogue.options ? (
              <div className="space-y-2">
                {currentDialogue.options.map((option, index) => (
                  <button
                    key={index}
                    className="w-full text-left p-3 bg-surface hover:bg-surface-dark pixel-borders-thin"
                    onClick={() => handleChoiceSelect(option)}
                    disabled={isTyping}
                  >
                    <div className="flex justify-between">
                      <PixelText>{option.text}</PixelText>
                      
                      {/* Show insight preview if applicable */}
                      {option.insightGain && option.insightGain > 0 && (
                        <span className="ml-2 text-xs bg-clinical text-white px-2 py-1">
                          +{option.insightGain}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <PixelButton
                className={`float-right ${kapoor.bgClass} text-white hover:opacity-90`}
                onClick={handleContinue}
              >
                {isTyping ? "Skip" : "Complete Calibration"}
              </PixelButton>
            )
          )}
        </div>
      </div>
    </div>
  );
}