// app/components/challenges/formats/ConversationFormat.tsx
'use client';
import { useState, useEffect } from 'react';
import { useGameStore } from '../../../store/gameStore';
import { useDialogueFlow, DialogueStage, DialogueOption } from '../../../hooks/useDialogueFlow';
import { useCharacterInteraction } from '../../../hooks/useCharacterInteraction';
import { useTypewriter } from '../../../hooks/useTypewriter';
import { PixelButton, PixelText } from '../../PixelThemeProvider';
import { useGameEffects } from '../../GameEffects';
import KnowledgeUpdate from '../../knowledge/KnowledgeUpdate';
import { EquipmentDisplay } from '../../ItemSprite';
import { gameEvents, GameEventType } from '../../../core/events/GameEvents';
import Image from 'next/image';

// Results interface for challenge completion
export interface InteractionResults {
  insightGained: number;
  relationshipChange: number;
  knowledgeGained: Record<string, number>;
  journalTier?: 'base' | 'technical' | 'annotated';
}

interface ConversationFormatProps {
  character: string;
  dialogueStages: DialogueStage[];
  onComplete: (results: InteractionResults) => void;
}

export default function ConversationFormat({
  character,
  dialogueStages,
  onComplete
}: ConversationFormatProps) {
  const { currentNodeId, completeNode } = useGameStore();
  // Add direct access to navigation method
  const setCurrentNode = useGameStore(state => state.setCurrentNode);
  
  const { playSound, flashScreen, showRewardEffect } = useGameEffects();
  
  // Core state
  const [encounterComplete, setEncounterComplete] = useState(false);
  const [masteryConcepts, setMasteryConcepts] = useState<Record<string, boolean>>({
    'electron_equilibrium_understood': false,
    'ptp_correction_understood': false,
    'output_calibration_tolerance': false,
    'clinical_dose_significance': false
  });
  
  // Character data mapping
  const characterData = {
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
    }
  };
  
  // Initialize the character interaction hook
  const {
    characterRespect,
    showKnowledgeGain,
    currentKnowledgeGain,
    totalInsightGained,
    processKnowledgeQueue,
    handleCharacterOptionSelected,
    completeKnowledgeGain
  } = useCharacterInteraction({
    onInsightGain: (amount) => {
      useGameStore.getState().updateInsight(amount);
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
        
        // Emit knowledge gained event
        gameEvents.dispatch(GameEventType.KNOWLEDGE_GAINED, {
          conceptId: option.knowledgeGain.conceptId,
          amount: option.knowledgeGain.amount,
          domainId: option.knowledgeGain.domainId,
          character
        });
      }
    },
    onStageChange: (newStageId, prevStageId) => {
      console.log(`[DIALOGUE] Stage transition: ${prevStageId} → ${newStageId}`);
      
      // Check if we need to trigger backstory
      if (selectedOption?.triggersBackstory && characterRespect >= 2) {
        const backstoryId = selectedOption.id === 'correct-ptp' 
          ? 'backstory-ptp'
          : 'backstory-calibration';
          
        const backstoryStage = dialogueStages.find(s => s.id === backstoryId);
        
        if (backstoryStage) {
          showBackstorySegment(backstoryStage.text);
          
          // Additional insight for witnessing backstory
          useGameStore.getState().updateInsight(5);
        }
      }
      
      // Critical state change detection for journal acquisition
      if (newStageId === 'journal-presentation') {
        console.log(`[CRITICAL PATH] Journal presentation state reached`);
        
        // Dispatch journal acquisition event early to ensure it happens
        // This creates redundant protection for this critical progression moment
        if (character === 'kapoor') {
          const journalTier = characterRespect >= 3 ? 'annotated' : 
                            characterRespect >= 0 ? 'technical' : 'base';
                            
          gameEvents.dispatch(GameEventType.JOURNAL_ACQUIRED, {
            tier: journalTier,
            character,
            source: 'dialogue_state_machine'
          });
        }
      }
    }
  });
  
  // Set conclusion text based on performance when reaching conclusion stage
  useEffect(() => {
    if (currentStage.isConclusion && currentStageId === 'conclusion') {
      // Determine performance tier
      if (characterRespect >= 3) {
        setCurrentStageId('conclusion-excellence');
      } else if (characterRespect < 0) {
        setCurrentStageId('conclusion-needs-improvement');
      }
    }
  }, [currentStage, characterRespect, currentStageId, setCurrentStageId]);
  
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
  
  // Handle continue button click
  const handleContinue = () => {
    // Debug logging for state transition checks
    console.log(`[DIALOGUE] Transition check:
      - currentStageId: ${currentStageId}
      - character: ${character}
      - isConclusion: ${currentStage.isConclusion}
      - showResponse: ${showResponse}
    `);
    
    // If actively typing, skip to the end
    if (showBackstory && isTypingBackstory) {
      skipBackstoryTyping();
      return;
    } else if (!showBackstory && isTyping) {
      skipTyping();
      return;
    }
    
    // If at journal presentation or conclusion, finalize the encounter
    if (currentStageId === 'journal-presentation' || 
        (currentStage.isConclusion && !showResponse)) {
      finalizeChallenge();
      return;
    }
    
    // Special case for Kapoor - force journal transition from any conclusion
    if (character === 'kapoor' && currentStage.isConclusion) {
      console.log(`[DIALOGUE] Forcing Kapoor journal transition`);
      setCurrentStageId('journal-presentation');
      return;
    }
    
    // If at conclusion stage and showing response, proceed to journal presentation
    if (currentStage.isConclusion && showResponse) {
      console.log(`[DIALOGUE] Attempting journal transition`);
      setCurrentStageId('journal-presentation');
      // This won't show new value yet due to React's state update timing
      console.log(`[DIALOGUE] Stage set to: ${currentStageId}`); 
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
    // Debug logging
    console.log(`[DIALOGUE] Finalizing challenge:
      - character: ${character}
      - currentStageId: ${currentStageId}
      - currentNodeId: ${currentNodeId}
    `);
    
    // Mark node as completed in game state
    if (currentNodeId) {
      completeNode(currentNodeId);
      
      // Apply completion effect
      if (playSound) playSound('challenge-complete');
      if (flashScreen) flashScreen('green');
    }
    
    // Set encounter completed flag
    setEncounterComplete(true);
    
    // Special case for journal acquisition
    const isJournalAcquisition = 
      character === 'kapoor' && 
      currentStageId === 'journal-presentation';
    
    // Calculate journal tier based on performance
    const journalTier = characterRespect >= 3 ? 'annotated' : 
                      characterRespect >= 0 ? 'technical' : 'base';
    
    console.log(`[DIALOGUE] Journal acquisition check:
      - isJournalAcquisition: ${isJournalAcquisition}
      - journalTier: ${journalTier}
    `);
    
    // Final event for node completion that's picked up by progression guarantor
    if (currentNodeId) {
      gameEvents.dispatch(GameEventType.NODE_COMPLETED, {
        nodeId: currentNodeId,
        character,
        result: {
          relationshipChange: characterRespect,
          journalTier,
          isJournalAcquisition
        }
      });
    }
    
    // Call onComplete with results
    onComplete({
      insightGained: totalInsightGained,
      relationshipChange: characterRespect,
      knowledgeGained: Object.entries(masteryConcepts)
        .filter(([_, mastered]) => mastered)
        .reduce((acc, [conceptId]) => {
          acc[conceptId] = 1;
          return acc;
        }, {} as Record<string, number>),
      journalTier
    });
    
    // Narrative timing - give journal acquisition a more dramatic pause
    setTimeout(() => {
      setCurrentNode(currentNodeId); // Return to map view
    }, isJournalAcquisition ? 800 : 300);
  };
  
  // If knowledge gain is showing, render that UI
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
  
  // The current character data
  const charData = characterData[character as keyof typeof characterData] || characterData.kapoor;
  
  // Main encounter rendering
  return (
    <div className="p-6 max-w-4xl mx-auto bg-surface pixel-borders">
      {/* Character header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <div 
            className="w-12 h-12 mr-4 rounded-lg overflow-hidden"
            style={{ border: `2px solid ${charData.primaryColor}` }}
          >
            <Image 
              src={charData.sprite}
              alt={charData.name}
              width={48}
              height={48}
              className="object-cover w-full h-full"
            />
          </div>
          <div>
            <PixelText className={`text-lg ${charData.textClass}`}>{charData.name}</PixelText>
            <PixelText className="text-text-secondary text-sm">{charData.title}</PixelText>
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
              src={charData.sprite}
              alt={charData.name}
              fill
              className="object-cover"
            />
          </div>
          
          {/* Equipment visualization */}
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
                  <PixelText className={`italic ${charData.textClass}`}>
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
              className={`float-right ${charData.bgClass} text-white hover:opacity-90`}
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
                className={`float-right ${charData.bgClass} text-white hover:opacity-90`}
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