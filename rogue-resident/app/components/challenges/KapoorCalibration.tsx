'use client';
import { useState, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useKnowledgeStore } from '../../store/knowledgeStore';
import { useJournalStore } from '../../store/journalStore';
import { useChallengeStore } from '../../store/challengeStore';
import { PixelText, PixelButton } from '../PixelThemeProvider';
import { useGameEffects } from '../GameEffects';
import KnowledgeUpdate from '../knowledge/KnowledgeUpdate';
import Image from 'next/image';
import { EquipmentDisplay } from '../ItemSprite';


// Import our new hooks
import { useTypewriter } from '../../hooks/useTypewriter';
import { useDialogueFlow, DialogueStage, DialogueOption } from '../../hooks/useDialogueFlow';
import { useCharacterInteraction } from '../../hooks/useCharacterInteraction';

// Define knowledge gain event type
interface KnowledgeGainEvent {
  conceptName: string;
  domainName: string;
  domainColor: string;
  amount: number;
}

export default function KapoorCalibration() {
  // Store access
  const { currentNodeId, completeNode, updateInsight } = useGameStore();
  const { completeChallenge } = useChallengeStore();
  const { 
    initializeJournal,
    addKapoorReferenceSheets, 
    addKapoorAnnotatedNotes,
    addEntry,
    hasJournal 
  } = useJournalStore();
  const { playSound, flashScreen, showRewardEffect } = useGameEffects();
  
  // Core state
  const [encounterComplete, setEncounterComplete] = useState(false);
  const [masteryConcepts, setMasteryConcepts] = useState<Record<string, boolean>>({
    'electron_equilibrium_understood': false,
    'ptp_correction_understood': false,
    'output_calibration_tolerance': false,
    'clinical_dose_significance': false
  });
  
  // Journal award state
  const [showJournalReward, setShowJournalReward] = useState(false);
  const [journalRewardTier, setJournalRewardTier] = useState<'base' | 'technical' | 'annotated'>('base');
  const [journalAnimationStage, setJournalAnimationStage] = useState<'enter' | 'display' | 'exit'>('enter');
  
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
  const dialogueStages: DialogueStage[] = [
    // Stage 0: Introduction
    {
      id: 'intro',
      text: "Good morning. I see you've arrived precisely on schedule. I'm conducting the monthly output measurements on LINAC 2. Since this is your first day, observing proper protocol will be instructive.",
      contextNote: "Kapoor adjusts the ionization chamber position with methodical precision, not looking up as you enter.",
      equipment: {
        itemId: "linac",
        alt: "Linear Accelerator",
        description: "LINAC 2, the Varian TrueBeam used primarily for head and neck treatments."
      },
      options: [
        { 
          id: "humble-intro",
          text: "I'm looking forward to learning the procedures.", 
          nextStageId: 'basics',
          approach: 'humble',
          insightGain: 5,
          relationshipChange: 1,
          responseText: "A positive attitude toward learning is the foundation of good practice. Let's begin with the fundamentals."
        },
        { 
          id: "confident-intro",
          text: "I've done calibrations before during my internship.", 
          nextStageId: 'basics',
          approach: 'confidence',
          insightGain: 0,
          relationshipChange: -1,
          responseText: "Previous experience is useful, but each facility has specific protocols. I'd advise against assuming familiarity prematurely."
        }
      ]
    },
    
    // Stage 1: Basic calibration setup
    {
      id: 'basics',
      text: "We'll start with the basics. I've set up our calibrated farmer chamber at isocenter with proper buildup. Can you recall why we use buildup material?",
      contextNote: "Kapoor gestures to the ionization chamber positioned in a water-equivalent phantom.",
      equipment: {
        itemId: 'farmer-chamber',
        alt: "Farmer Chamber",
        description: "A calibrated Farmer-type ionization chamber with PMMA buildup cap."
      },
      options: [
        { 
          id: "correct-buildup",
          text: "To ensure we're measuring in the region of electronic equilibrium.", 
          nextStageId: 'correction-factors',
          approach: 'precision',
          insightGain: 15,
          relationshipChange: 1,
          knowledgeGain: { 
            conceptId: 'electron_equilibrium_understood',
            domainId: 'radiation-physics',
            amount: 15
          },
          responseText: "Precisely. Electronic equilibrium is essential for accurate dosimetry. The buildup material ensures charged particle equilibrium at the measurement point."
        },
        { 
          id: "engaged-learner",
          text: "I understand the general concept, but could you elaborate on how it applies specifically to this setup?",
          nextStageId: 'correction-factors',
          approach: 'humble',
          insightGain: 10,
          relationshipChange: 1,
          knowledgeGain: { 
            conceptId: 'electron_equilibrium_understood',
            domainId: 'radiation-physics',
            amount: 10
          },
          responseText: "A fair question. In this specific setup, we're using a 6MV beam where the depth of dose maximum is approximately 1.5cm. The buildup cap ensures our measuring point is at equilibrium rather than in the buildup region."
        },
        { 
          id: "partial-buildup",
          text: "To filter out unwanted radiation scatter.", 
          nextStageId: 'correction-factors',
          approach: 'confidence',
          insightGain: 5,
          relationshipChange: 0,
          knowledgeGain: { 
            conceptId: 'electron_equilibrium_understood',
            domainId: 'radiation-physics',
            amount: 5
          },
          responseText: "Not quite. While buildup does affect scatter, its primary purpose is to establish electronic equilibrium. The scatter component is actually an integral part of what we need to measure."
        }
      ]
    },
    
    // Stage 2: Correction factors
    {
      id: 'correction-factors',
      text: "For our reference dosimetry, we're measuring at 10×10cm field size. What correction factor is most critical to apply in these measurements?",
      contextNote: "Kapoor enters parameters into the electrometer console.",
      equipment: {
        itemId: 'chamber-setup',
        alt: "Measurement Setup",
        description: "The ionization chamber setup at isocenter with field size indicators."
      },
      options: [
        { 
          id: "correct-ptp",
          text: "Temperature and pressure correction (PTP).", 
          nextStageId: 'measurement-analysis',
          approach: 'precision',
          insightGain: 15,
          relationshipChange: 1,
          knowledgeGain: { 
            conceptId: 'ptp_correction_understood',
            domainId: 'radiation-physics',
            amount: 20
          },
          responseText: "Correct. The PTP factor accounts for the difference between calibration conditions and measurement conditions. A 3% error in this correction directly impacts patient dose accuracy.",
          triggersBackstory: true
        },
        { 
          id: "partial-kq",
          text: "Beam quality correction (kQ).", 
          nextStageId: 'measurement-analysis',
          approach: 'precision',
          insightGain: 10,
          relationshipChange: 0,
          knowledgeGain: { 
            conceptId: 'ptp_correction_understood',
            domainId: 'radiation-physics',
            amount: 10
          },
          responseText: "While kQ is indeed important, for routine measurements where the beam quality is stable, temperature and pressure corrections are actually more critical as they change daily."
        },
        { 
          id: "wrong-kpol",
          text: "Polarity correction (kpol).", 
          nextStageId: 'measurement-analysis',
          approach: 'confidence',
          insightGain: 5,
          relationshipChange: -1,
          knowledgeGain: { 
            conceptId: 'ptp_correction_understood',
            domainId: 'radiation-physics',
            amount: 5
          },
          responseText: "The polarity effect is generally small for farmer chambers in photon beams. Temperature and pressure variations have a much more significant impact on our daily measurements."
        }
      ]
    },
    
    // Stage 3: Measurement analysis
    {
      id: 'measurement-analysis',
      text: "Our measurements are showing 1.01 compared to baseline. The tolerance is ±2%. How would you interpret this result?",
      contextNote: "Kapoor completes a measurement and displays the results on the monitor.",
      equipment: {
        itemId: 'electrometer',
        alt: "Electrometer Reading",
        description: "The electrometer showing collected charge measurements from the chamber."
      },
      options: [
        { 
          id: "correct-tolerance",
          text: "The output is within tolerance and acceptable for clinical use.", 
          nextStageId: 'documentation-followup',
          approach: 'precision',
          insightGain: 15,
          relationshipChange: 1,
          knowledgeGain: { 
            conceptId: 'output_calibration_tolerance',
            domainId: 'quality-assurance',
            amount: 15
          },
          responseText: "Correct. The measurement is within our action threshold."
        },
        { 
          id: "overcautious",
          text: "We should recalibrate to get closer to baseline.", 
          nextStageId: 'clinical-significance',
          approach: 'confidence',
          insightGain: 5,
          relationshipChange: -1,
          knowledgeGain: { 
            conceptId: 'output_calibration_tolerance',
            domainId: 'quality-assurance',
            amount: 5
          },
          responseText: "That would be unnecessarily disruptive to clinical operations. Our protocols specify recalibration only when measurements exceed the ±2% tolerance. Maintaining consistency is important, but over-adjustment introduces its own errors.",
          triggersBackstory: true
        }
      ]
    },
    
    // Branch: Follow-up question on documentation
    {
      id: 'documentation-followup',
      text: "Would you note anything specific in your documentation?",
      options: [
        { 
          id: "proactive-docs",
          text: "I'd document the slight upward trend to monitor for potential drift patterns.", 
          nextStageId: 'clinical-significance',
          approach: 'precision',
          insightGain: 5,
          relationshipChange: 1,
          responseText: "Excellent. Identifying trends before they become problems is the mark of a skilled physicist."
        },
        { 
          id: "minimal-docs",
          text: "Just the standard output value and that it meets tolerance.", 
          nextStageId: 'clinical-significance',
          approach: 'confidence',
          insightGain: 0,
          relationshipChange: -1,
          responseText: "Technically sufficient, but missing an opportunity for proactive quality management."
        }
      ]
    },
    
    // Stage 4: Clinical significance
    {
      id: 'clinical-significance',
      text: "Final question: A 1% error in output calibration for a typical 70 Gy head and neck treatment would result in a dose difference of how much?",
      contextNote: "Kapoor reviews the completed documentation of the calibration process.",
      options: [
        { 
          id: "correct-clinical",
          text: "0.7 Gy", 
          nextStageId: 'conclusion',
          approach: 'precision',
          insightGain: 15,
          relationshipChange: 1,
          knowledgeGain: { 
            conceptId: 'clinical_dose_significance',
            domainId: 'quality-assurance',
            amount: 15
          },
          responseText: "Exactly right. This illustrates why our tolerances matter. A 0.7 Gy difference could mean the difference between tumor control and recurrence, or between acceptable side effects and complications."
        },
        { 
          id: "excellent-clinical",
          text: "0.7 Gy, which could significantly impact tumor control probability or normal tissue complications.", 
          nextStageId: 'conclusion',
          approach: 'precision',
          insightGain: 20,
          relationshipChange: 2,
          knowledgeGain: { 
            conceptId: 'clinical_dose_significance',
            domainId: 'quality-assurance',
            amount: 25
          },
          responseText: "Exactly right. And that clinical perspective is why our work matters. Too many physicists see only numbers, not the patients affected by those numbers."
        },
        { 
          id: "incorrect-clinical",
          text: "7 Gy", 
          nextStageId: 'conclusion',
          approach: 'confidence',
          insightGain: 5,
          relationshipChange: -1,
          knowledgeGain: { 
            conceptId: 'clinical_dose_significance',
            domainId: 'quality-assurance',
            amount: 5
          },
          responseText: "Check your calculation. A 1% error on 70 Gy would be 0.7 Gy, not 7 Gy. This distinction is clinically significant and demonstrates why precision in our calculations is essential."
        }
      ]
    },
    
    // Stage 5: Conclusion (branches depending on performance)
    {
      id: 'conclusion',
      text: "You've demonstrated a satisfactory understanding of basic output measurement principles. This knowledge forms the foundation of everything we do in radiation oncology physics.",
      contextNote: "Dr. Kapoor completes the documentation with a methodical signature.",
      // No options - this will be dynamically set based on performance
      isConclusion: true
    },
    
    // Branch A: Excellence conclusion (hidden)
    {
      id: 'conclusion-excellence',
      text: "You've demonstrated an excellent understanding of output measurement principles. Your precision in terminology and calculations reflects the level of rigor required in our field.",
      contextNote: "Kapoor completes the final documentation with precise movements, then turns to address you directly.",
      isConclusion: true
    },
    
    // Branch C: Needs improvement conclusion (hidden)
    {
      id: 'conclusion-needs-improvement',
      text: "I'm concerned about some gaps in your understanding of essential calibration principles. These fundamentals are non-negotiable in our field.",
      contextNote: "Kapoor's movements become more deliberate as he completes the calibration himself.",
      isConclusion: true
    },
    
    // Final stage: Journal presentation (after conclusion)
    {
      id: 'journal-presentation',
      text: "Every medical physicist must maintain meticulous records. This journal will serve you throughout your residency. Use it to document observations, track your knowledge development, and maintain procedural notes.",
      contextNote: "Kapoor retrieves a leather-bound journal and opens to the first page.",
      // This stage transitions to completion screen
    },
    
    // Backstory branch: PTP incident
    {
      id: 'backstory-ptp',
      text: "I once investigated an incident where this correction was applied incorrectly. The consequences for the patient were... significant. It's why I emphasize these details so strongly.",
      // Return to previous stage after backstory
    },
    
    // Backstory branch: Overcalibration lesson
    {
      id: 'backstory-calibration',
      text: "Early in my career, I wasted considerable time recalibrating within tolerance. Dr. Chen, my director then, taught me that excessive adjustment introduces its own errors. A lesson worth learning sooner than I did.",
      // Return to previous stage after backstory
    }
  ];
  
  // Initialize the character interaction hook
  const {
    characterRespect: kapoorRespect,
    showKnowledgeGain,
    currentKnowledgeGain,
    totalInsightGained,
    processKnowledgeQueue,
    handleCharacterOptionSelected,
    completeKnowledgeGain
  } = useCharacterInteraction({
    onInsightGain: (amount) => {
      updateInsight(amount);
      if (amount >= 10 && showRewardEffect) {
        showRewardEffect(amount, window.innerWidth / 2, window.innerHeight / 2);
      }
    }
  });
  
  // Initialize the dialogue flow hook
  const {
    currentStage,
    currentStageId,
    selectedOption,
    showResponse,
    showBackstory,
    backstoryText,
    handleOptionSelect,
    handleContinue: progressDialogue,
    showBackstorySegment,
    setCurrentStageId
  } = useDialogueFlow({
    stages: dialogueStages,
    onOptionSelected: (option) => {
      // Play sound for selection
      if (playSound) playSound('click');
      
      // Process option with character interaction hook
      handleCharacterOptionSelected(option);
      
      // Track concept mastery
      if (option.knowledgeGain?.conceptId) {
        const { conceptId } = option.knowledgeGain;
        
        // Update mastery tracking for this concept
        if (masteryConcepts[conceptId] !== undefined) {
          setMasteryConcepts(prev => ({
            ...prev,
            [conceptId]: true
          }));
        }
      }
    },
    onStageChange: (newStageId, prevStageId) => {
      // Check if we need to trigger backstory
      if (selectedOption?.triggersBackstory && kapoorRespect >= 2) {
        const backstoryId = selectedOption.id === 'correct-ptp' 
          ? 'backstory-ptp'
          : 'backstory-calibration';
          
        const backstoryStage = dialogueStages.find(s => s.id === backstoryId);
        
        if (backstoryStage) {
          showBackstorySegment(backstoryStage.text);
          
          // Additional insight for witnessing backstory
          updateInsight(5);
          
          // Don't need to update kapoorRespect here since it's handled
          // in the character interaction hook
        }
      }
    }
  });
  
  // Initialize typewriter hook for main dialogue
  const textToShow = showResponse && selectedOption?.responseText 
    ? selectedOption.responseText
    : currentStage.text;
    
  const { 
    displayText: displayedText, 
    isTyping, 
    complete: skipTyping 
  } = useTypewriter(textToShow);
  
  // Initialize typewriter hook for backstory
  const { 
    displayText: displayedBackstoryText,
    isTyping: isTypingBackstory,
    complete: skipBackstoryTyping
  } = useTypewriter(backstoryText);
  
  // Process knowledge queue when needed
  useEffect(() => {
    processKnowledgeQueue();
  }, [showKnowledgeGain, processKnowledgeQueue]);
  
  // Set conclusion text based on performance when reaching conclusion stage
  useEffect(() => {
    if (currentStage.isConclusion) {
      // Determine performance tier
      if (kapoorRespect >= 3) {
        setCurrentStageId('conclusion-excellence');
        setJournalRewardTier('annotated');
      } else if (kapoorRespect < 0) {
        setCurrentStageId('conclusion-needs-improvement');
        setJournalRewardTier('base');
      } else {
        // Default/middle tier
        setJournalRewardTier('technical');
      }
    }
  }, [currentStage, kapoorRespect, setCurrentStageId]);
  
  // Handle continue button click
  const handleContinue = () => {
    // If actively typing, skip to the end
    if (showBackstory && isTypingBackstory) {
      skipBackstoryTyping();
      return;
    } else if (!showBackstory && isTyping) {
      skipTyping();
      return;
    }
    
    // If journal reward is active, handle that special case
    if (showJournalReward) {
      if (journalAnimationStage === 'display') {
        setJournalAnimationStage('exit');
        setTimeout(() => {
          setShowJournalReward(false);
          finalizeChallenge();
        }, 1000);
      }
      return;
    }
    
    // If at conclusion stage, proceed to journal presentation
    if (currentStage.isConclusion && !showResponse) {
      setCurrentStageId('journal-presentation');
      return;
    }
    
    // If at journal presentation, show journal reward
    if (currentStageId === 'journal-presentation' && !showResponse) {
      setShowJournalReward(true);
      setJournalAnimationStage('enter');
      setTimeout(() => {
        setJournalAnimationStage('display');
      }, 1000);
      
      // Initialize journal in store
      if (!hasJournal) {
        initializeJournal(journalRewardTier);
        
        // Add special items based on performance
        if (journalRewardTier === 'technical' || journalRewardTier === 'annotated') {
          addKapoorReferenceSheets();
        }
        
        if (journalRewardTier === 'annotated') {
          addKapoorAnnotatedNotes();
        }
        
        // Add first journal entry
        addEntry({
          id: 'kapoor-calibration',
          title: 'LINAC Calibration with Dr. Kapoor',
          date: new Date().toISOString(),
          content: `My first calibration session with Dr. Kapoor focused on output measurement. Key learnings:\n\n${
            masteryConcepts.electron_equilibrium_understood ? '- Electronic equilibrium principles for accurate dosimetry\n' : ''
          }${
            masteryConcepts.ptp_correction_understood ? '- Importance of PTP correction for daily measurements\n' : ''
          }${
            masteryConcepts.output_calibration_tolerance ? '- ±2% tolerance for clinical use\n' : ''
          }${
            masteryConcepts.clinical_dose_significance ? '- Clinical impact: 1% error on 70 Gy = 0.7 Gy difference\n' : ''
          }\nTotal insight gained: ${totalInsightGained}`,
          tags: ['kapoor', 'calibration', 'linac', 'qa']
        });
      }
      
      return;
    }
    
    // Normal dialogue progression
    progressDialogue();
  };
  
  // Handle player choice selection
  const handleChoiceSelect = (option: DialogueOption) => {
    handleOptionSelect(option);
  };
  
  // Handle completion of the challenge node
  const finalizeChallenge = () => {
    // Mark node as completed in game state
    if (currentNodeId) {
      completeNode(currentNodeId);
      
      // Apply completion effect
      if (playSound) playSound('challenge-complete');
      if (flashScreen) flashScreen('green');
    }
    
    // Set encounter completed flag
    setEncounterComplete(true);
    
    // Complete challenge in challenge store
    const grade = kapoorRespect >= 3 ? 'S' : 
                  kapoorRespect >= 1 ? 'A' : 
                  kapoorRespect >= 0 ? 'B' : 'C';
                  
    completeChallenge(grade);
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
            
            {journalRewardTier === 'annotated' && (
              <p className="font-medium text-educational-light font-pixel mb-2">
                Dr. Kapoor seems impressed by your technical precision and understanding.
              </p>
            )}
            
            {journalRewardTier === 'technical' && (
              <p className="font-medium text-clinical-light font-pixel mb-2">
                Dr. Kapoor acknowledges your satisfactory performance.
              </p>
            )}
            
            {journalRewardTier === 'base' && (
              <p className="font-medium text-warning font-pixel mb-2">
                Dr. Kapoor seems concerned about gaps in your understanding.
              </p>
            )}
            
            <p className="font-medium text-clinical-light font-pixel">
              You've received a journal to record your residency journey.
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
              <PixelText className="text-text-secondary mb-1">Relationship</PixelText>
              <PixelText className={`text-2xl ${
                kapoorRespect >= 3 ? 'text-educational-light' : 
                kapoorRespect >= 0 ? 'text-clinical-light' : 
                'text-warning'
              }`}>{
                kapoorRespect >= 3 ? 'Excellent' : 
                kapoorRespect >= 1 ? 'Good' : 
                kapoorRespect >= 0 ? 'Neutral' : 
                'Concerned'
              }</PixelText>
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

  // Knowledge gain notification overlay
  if (showKnowledgeGain && currentKnowledgeGain) {
    return (
      <KnowledgeUpdate
        conceptName={currentKnowledgeGain.conceptName}
        domainName={currentKnowledgeGain.domainName}
        domainColor={currentKnowledgeGain.domainColor}
        gainAmount={currentKnowledgeGain.amount}
        onComplete={completeKnowledgeGain}
      />
    );
  }
  
  // Journal reward screen
  if (showJournalReward) {
    return (
      <div className="p-6 max-w-4xl mx-auto flex items-center justify-center min-h-[80vh]">
        <div 
          className={`
            relative
            transition-all duration-1000
            ${journalAnimationStage === 'enter' ? 'opacity-0 scale-50' : 
              journalAnimationStage === 'display' ? 'opacity-100 scale-100' :
              'opacity-0 scale-125'}
          `}
        >
          <div className="text-center mb-6">
            <PixelText className="text-3xl text-educational-light font-pixel-heading">
              {journalRewardTier === 'annotated' ? 'Special Journal Received' : 
               journalRewardTier === 'technical' ? 'Technical Journal Received' :
               'Journal Received'}
            </PixelText>
          </div>
          
          <div
            className={`
              w-[300px] h-[400px] mx-auto mb-6
              pixel-borders
              ${journalRewardTier === 'annotated' ? 'bg-gradient-to-b from-clinical-dark to-clinical-light' : 
                journalRewardTier === 'technical' ? 'bg-gradient-to-b from-clinical-dark to-clinical' :
                'bg-gradient-to-b from-amber-800 to-amber-700'}
            `}
          >
            <div className="absolute inset-4 border border-amber-500/30"></div>
            <div className="flex items-center justify-center h-full text-white font-pixel text-4xl">J</div>
            
            {/* Particle effect for special journal */}
            {journalRewardTier === 'annotated' && (
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-white rounded-full animate-ping"></div>
                <div className="absolute top-1/3 left-1/4 w-1 h-1 bg-white rounded-full animate-ping" 
                     style={{ animationDelay: '300ms' }}></div>
                <div className="absolute bottom-1/4 right-1/3 w-1 h-1 bg-white rounded-full animate-ping"
                     style={{ animationDelay: '600ms' }}></div>
              </div>
            )}
          </div>
          
          <div className="max-w-xl mx-auto bg-surface-dark p-4 pixel-borders-thin">
            <PixelText className="mb-2">
              {journalRewardTier === 'annotated' ? 
                "Dr. Kapoor has provided you with his personal annotated journal. It contains not only standard references but his own notes from residency." : 
                journalRewardTier === 'technical' ? 
                "Dr. Kapoor has provided a technical journal with reference sheets for calibration procedures." :
                "Dr. Kapoor has provided a standard department journal for tracking your progress."
              }
            </PixelText>
            
            <PixelText className="text-sm text-text-secondary">
              {journalRewardTier === 'annotated' ? 
                "The journal will help connect concepts in your constellation and reveal special dialogue options." : 
                journalRewardTier === 'technical' ? 
                "The journal includes technical references that provide +15% efficiency in calibration challenges." :
                "Use this journal to record your observations and track your progress."
              }
            </PixelText>
          </div>
          
          <div className="text-center mt-6">
            <PixelButton 
              className="px-6 py-2 bg-clinical text-white"
              onClick={handleContinue}
            >
              Continue
            </PixelButton>
          </div>
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
          
          {/* Equipment visualization - REPLACE THIS SECTION */}
          {currentStage.equipment && (
            <EquipmentDisplay
              itemId={currentStage.equipment.itemId}
              description={currentStage.equipment.description}
            />
          )}
        </div>
        
        {/* Dialogue area - right side */}
        <div className="w-2/3">
          {/* Main dialogue text */}
          <div className="bg-surface-dark p-4 pixel-borders-thin mb-4 min-h-[120px]">
            {/* Show backstory if active */}
            {showBackstory ? (
              <div>
                <div className="border-l-4 border-clinical pl-2 py-1 mb-2">
                  <PixelText className={`italic ${kapoor.textClass}`}>
                    {displayedBackstoryText}{isTypingBackstory ? '|' : ''}
                  </PixelText>
                </div>
              </div>
            ) : (
              <div>
                <PixelText>{displayedText}{isTyping ? '|' : ''}</PixelText>
                
                {/* Context note below main dialogue */}
                {!isTyping && currentStage.contextNote && (
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
              className={`float-right ${kapoor.bgClass} text-white hover:opacity-90`}
              onClick={handleContinue}
            >
              {(isTyping || isTypingBackstory) ? "Skip" : "Continue"}
            </PixelButton>
          ) : (
            currentStage.options ? (
              <div className="space-y-2">
                {currentStage.options.map((option) => (
                  <button
                    key={option.id}
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
                {isTyping ? "Skip" : "Continue"}
              </PixelButton>
            )
          )}
        </div>
      </div>
    </div>
  );
}