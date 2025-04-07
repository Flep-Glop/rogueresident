// app/components/challenges/formats/ConversationFormat.tsx
'use client';
import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../../../store/gameStore';
import { useDialogueFlow, DialogueStage, DialogueOption } from '../../../hooks/useDialogueFlow';
import { useTypewriter } from '../../../hooks/useTypewriter';
import { PixelButton, PixelText } from '../../PixelThemeProvider';
import { useGameEffects } from '../../GameEffects';
import KnowledgeUpdate from '../../knowledge/KnowledgeUpdate';
import { EquipmentDisplay } from '../../ItemSprite';
import { 
  useEventBus,
  journalAcquired
} from '../../../core/events/CentralEventBus';
import { GameEventType } from '../../../core/events/EventTypes';
import { useJournalStore } from '../../../store/journalStore';
import { checkTransactionIntegrity } from '../../../core/dialogue/NarrativeTransaction';
import telemetryService from '../../../utils/telemetryService';
import Image from 'next/image';

// Results interface for challenge completion
export interface InteractionResults {
  insightGained: number;
  relationshipChange: number;
  knowledgeGained: Record<string, number>;
  journalTier?: 'base' | 'technical' | 'annotated';
}

// Character portrait data structure
interface CharacterData {
  name: string;
  title: string;
  sprite: string;
  primaryColor: string;
  textClass: string;
  bgClass: string;
}

interface ConversationFormatProps {
  character: string;
  dialogueStages: DialogueStage[];
  dialogueId?: string;
  onComplete: (results: InteractionResults) => void;
  onOptionSelected?: (option: DialogueOption, stageId: string) => void;
  onStageChange?: (newStageId: string, prevStageId: string) => void;
}

/**
 * Conversation Format - Dialogue-based challenge implementation
 * 
 * A streamlined implementation that separates UI concerns from dialogue flow logic,
 * making it easier to maintain and extend. Based on Hades' character dialogue patterns.
 * 
 * Now enhanced with telemetry tracking for better dialogue analytics.
 */
export default function ConversationFormat({
  character,
  dialogueStages,
  dialogueId = `${character}-dialogue`,
  onComplete,
  onOptionSelected,
  onStageChange
}: ConversationFormatProps) {
  const { currentNodeId } = useGameStore();
  const { hasJournal } = useJournalStore();
  const { playSound, flashScreen, showRewardEffect } = useGameEffects();
  
  // Timing refs for telemetry
  const stageStartTime = useRef<number>(Date.now());
  const responseStartTime = useRef<number>(Date.now());
  const backstoryStartTime = useRef<number>(Date.now());
  
  // State for knowledge visualization
  const [showKnowledgeGain, setShowKnowledgeGain] = useState(false);
  const [currentKnowledgeGain, setCurrentKnowledgeGain] = useState<{
    conceptName: string;
    domainName: string;
    domainColor: string;
    amount: number;
    conceptId?: string;
  } | null>(null);
  const [knowledgeQueue, setKnowledgeQueue] = useState<Array<{
    conceptName: string;
    domainName: string;
    domainColor: string;
    amount: number;
    conceptId?: string;
  }>>([]);
  
  // Core challenge metrics
  const [playerScore, setPlayerScore] = useState(0);
  const [totalInsightGained, setTotalInsightGained] = useState(0);
  const [conceptsMastered, setConceptsMastered] = useState<Record<string, boolean>>({});
  
  // Character data mapping - simplified from original
  const characterData: Record<string, CharacterData> = {
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
    },
    'garcia': {
      name: "Dr. Garcia",
      title: "Radiation Oncologist",
      sprite: "/characters/garcia.png", 
      primaryColor: "var(--clinical-alt-color)",
      textClass: "text-clinical-light",
      bgClass: "bg-clinical"
    }
  };
  
  // Track approach usage for telemetry
  const [approachCounts, setApproachCounts] = useState({
    humble: 0,
    precision: 0,
    confidence: 0
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
    handleContinue,
    isProgressionValid,
    dialogueStateMachine
  } = useDialogueFlow({
    stages: dialogueStages,
    onOptionSelected: (option) => {
      // Set the stage start time for telemetry
      stageStartTime.current = Date.now();
      
      // Play sound for selection
      if (playSound) playSound('click');
      
      // Update player metrics
      if (option.relationshipChange) {
        setPlayerScore(prev => prev + option.relationshipChange);
      }
      
      if (option.insightGain) {
        const gain = option.insightGain;
        setTotalInsightGained(prev => prev + gain);
        
        // Update global insight
        useGameStore.getState().updateInsight(gain);
        
        // Visual effect for significant insight
        if (gain >= 10 && showRewardEffect) {
          showRewardEffect(gain, window.innerWidth / 2, window.innerHeight / 2);
        }
      }
      
      // Track approach usage for telemetry
      if (option.approach) {
        setApproachCounts(prev => ({
          ...prev,
          [option.approach!]: prev[option.approach!] + 1
        }));
      }
      
      // Handle knowledge gain
      if (option.knowledgeGain) {
        const { conceptId, domainId, amount } = option.knowledgeGain;
        
        // Record mastered concept
        if (conceptId) {
          setConceptsMastered(prev => ({
            ...prev,
            [conceptId]: true
          }));
        }
        
        // Queue knowledge visualization
        queueKnowledgeGain({
          conceptId,
          conceptName: getConceptName(conceptId),
          domainName: getDomainName(domainId),
          domainColor: getDomainColor(domainId),
          amount
        });
        
        // Emit knowledge gain event
        useEventBus.getState().dispatch(GameEventType.KNOWLEDGE_GAINED, {
          conceptId,
          amount,
          domainId,
          character
        });
      }
      
      // Call the onOptionSelected callback prop if provided
      if (onOptionSelected) {
        onOptionSelected(option, currentStageId);
      }
      
      // Track option selection in telemetry
      if (currentNodeId) {
        telemetryService.trackDialogueOptionSelected(
          dialogueId,
          currentStageId,
          option,
          currentStage?.options || [],
          playerScore,
          character as any,
          currentNodeId
        );
      }
      
      // Track response start time for telemetry
      if (option.responseText) {
        responseStartTime.current = Date.now();
      }
      
      // Track backstory start time for telemetry
      if (option.triggersBackstory) {
        backstoryStartTime.current = Date.now();
      }
    },
    onStageChange: (newStageId, prevStageId) => {
      // Calculate time spent on previous stage
      const timeSpent = Date.now() - stageStartTime.current;
      stageStartTime.current = Date.now(); // Reset for new stage
      
      // Handle critical stage transitions
      if (newStageId === 'journal-presentation' && character === 'kapoor') {
        console.log(`[CRITICAL PATH] Journal presentation stage reached`);
        
        // Determine journal tier based on performance
        const journalTier = playerScore >= 3 ? 'annotated' : 
                           playerScore >= 0 ? 'technical' : 'base';
        
        // Ensure journal is acquired
        if (!hasJournal) {
          // Use the centralized journal acquisition system
          journalAcquired(
            journalTier,
            character,
            'stage_transition'
          );
        }
      }
      
      // If reaching conclusion, validate progression - this is the last safety check
      if (dialogueStages.find(s => s.id === newStageId)?.isConclusion) {
        checkTransactionIntegrity();
      }
      
      // Call the onStageChange callback prop if provided
      if (onStageChange) {
        onStageChange(newStageId, prevStageId);
      }
      
      // Track stage change in telemetry if nodeId is available
      if (currentNodeId) {
        telemetryService.trackDialogueStageChange(
          dialogueId,
          prevStageId,
          newStageId,
          timeSpent,
          character as any,
          currentNodeId
        );
      }
    },
    characterId: character as any,
    nodeId: currentNodeId || undefined
  });
  
  // Track time spent reading dialogue for telemetry
  useEffect(() => {
    // Reset stage timer when stage changes
    stageStartTime.current = Date.now();
    
    // Set up interval to track reading time
    const intervalId = setInterval(() => {
      const currentTime = Date.now();
      const timeSpent = currentTime - stageStartTime.current;
      
      // Track reading time at regular intervals if significant time has passed
      if (timeSpent > 5000 && currentNodeId) {
        telemetryService.trackDialogueReadingTime(
          dialogueId,
          currentStageId,
          timeSpent,
          character as any,
          showResponse
        );
      }
    }, 10000); // Check every 10 seconds
    
    return () => clearInterval(intervalId);
  }, [currentStageId, character, dialogueId, currentNodeId, showResponse]);
  
  // Track backstory engagement
  useEffect(() => {
    if (showBackstory) {
      // Reset backstory timer when backstory is shown
      backstoryStartTime.current = Date.now();
    } else if (backstoryStartTime.current > 0) {
      // Calculate time spent on backstory when it's closed
      const timeSpent = Date.now() - backstoryStartTime.current;
      
      // Only track significant engagement (>2 seconds)
      if (timeSpent > 2000 && currentNodeId) {
        telemetryService.trackBackstoryEngagement(
          dialogueId,
          `backstory-${currentStageId}`,
          character as any,
          timeSpent
        );
      }
      
      // Reset timer
      backstoryStartTime.current = 0;
    }
  }, [showBackstory, currentStageId, character, dialogueId, currentNodeId]);
  
  // Initialize typewriter effect for main dialogue
  const textToShow = showResponse && selectedOption?.responseText 
    ? selectedOption.responseText
    : currentStage.text;
    
  const { 
    displayText: displayedText, 
    isTyping, 
    complete: skipTyping 
  } = useTypewriter(textToShow);
  
  // Initialize typewriter for backstory
  const { 
    displayText: displayedBackstoryText,
    isTyping: isTypingBackstory,
    complete: skipBackstoryTyping
  } = useTypewriter(backstoryText);
  
  // Process knowledge queue
  useEffect(() => {
    if (knowledgeQueue.length > 0 && !showKnowledgeGain) {
      const nextKnowledge = knowledgeQueue[0];
      setCurrentKnowledgeGain(nextKnowledge);
      setShowKnowledgeGain(true);
      setKnowledgeQueue(prev => prev.slice(1));
    }
  }, [knowledgeQueue, showKnowledgeGain]);
  
  // Helper to queue knowledge visualizations
  const queueKnowledgeGain = (gain: {
    conceptName: string;
    domainName: string;
    domainColor: string;
    amount: number;
    conceptId?: string;
  }) => {
    setKnowledgeQueue(prev => [...prev, gain]);
  };
  
  // Complete knowledge visualization
  const completeKnowledgeGain = () => {
    setShowKnowledgeGain(false);
  };
  
  // Handle continue button click with streamlined flow
  const onContinue = () => {
    // Track response time for telemetry
    if (showResponse) {
      const timeSpent = Date.now() - responseStartTime.current;
      if (timeSpent > 2000 && currentNodeId) {
        telemetryService.trackDialogueReadingTime(
          dialogueId,
          currentStageId,
          timeSpent,
          character as any,
          true
        );
      }
    }
    
    // If actively typing, skip to the end
    if (showBackstory && isTypingBackstory) {
      skipBackstoryTyping();
      return;
    } else if (!showBackstory && isTyping) {
      skipTyping();
      return;
    }
    
    // If at conclusion or journal presentation, finalize the challenge
    if ((currentStage.isConclusion && !showResponse) || 
        currentStage.id === 'journal-presentation') {
      
      finalizeChallenge();
      return;
    }
    
    // Normal dialogue progression
    handleContinue();
  };
  
  // Handle completion of the challenge
  const finalizeChallenge = () => {
    // Determine journal tier based on performance
    const journalTier = playerScore >= 3 ? 'annotated' : 
                        playerScore >= 0 ? 'technical' : 'base';
    
    // For Kapoor, ensure journal acquisition happened
    if (character === 'kapoor' && !hasJournal) {
      journalAcquired(
        journalTier,
        character,
        'challenge_completion'
      );
    }
    
    // Apply completion effects
    if (playSound) playSound('challenge-complete');
    if (flashScreen) flashScreen('green');
    
    // Call onComplete with results
    onComplete({
      insightGained: totalInsightGained,
      relationshipChange: playerScore,
      knowledgeGained: Object.entries(conceptsMastered)
        .filter(([_, mastered]) => mastered)
        .reduce((acc, [conceptId]) => {
          acc[conceptId] = 1;
          return acc;
        }, {} as Record<string, number>),
      journalTier
    });
    
    // Mark node as completed if available
    if (currentNodeId) {
      useGameStore.getState().completeNode(currentNodeId);
      
      // Notify node completion event
      useEventBus.getState().dispatch(GameEventType.NODE_COMPLETED, {
        nodeId: currentNodeId,
        character,
        result: {
          relationshipChange: playerScore,
          journalTier,
          isJournalAcquisition: character === 'kapoor'
        }
      });
    }
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
  const charData = characterData[character] || characterData.kapoor;
  
  // Main conversation UI
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
            
            {/* Debug indicator for progression status */}
            {process.env.NODE_ENV !== 'production' && (
              <div className={`absolute top-0 right-0 w-3 h-3 rounded-full ${isProgressionValid ? 'bg-green-500' : 'bg-red-500'}`}></div>
            )}
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
              onClick={onContinue}
            >
              {(isTyping || isTypingBackstory) ? "Skip" : "Continue"}
            </PixelButton>
          ) : (
            currentStage.options ? (
              <div className="space-y-2">
                {currentStage.options.map((option) => (
                  <button
                    key={option.id}
                    className={`w-full text-left p-3 ${option.isCriticalPath ? 'bg-surface border-l-2 border-educational' : 'bg-surface'} hover:bg-surface-dark pixel-borders-thin`}
                    onClick={() => handleOptionSelect(option)}
                    disabled={isTyping}
                    data-approach={option.approach || 'none'}
                    data-critical-path={option.isCriticalPath ? 'true' : 'false'}
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
                onClick={onContinue}
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

// Helper functions for concept display
function getConceptName(conceptId: string): string {
  switch(conceptId) {
    case 'electron_equilibrium_understood': return 'Electron Equilibrium';
    case 'ptp_correction_understood': return 'PTP Correction';
    case 'output_calibration_tolerance': return 'Output Calibration Tolerance';
    case 'clinical_dose_significance': return 'Clinical Dose Significance';
    case 'equipment_safety_protocol': return 'Equipment Safety Protocol';
    case 'quantum_dosimetry_principles': return 'Quantum Dosimetry Principles';
    default: return conceptId.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }
}

function getDomainName(domainId: string): string {
  switch(domainId) {
    case 'radiation-physics': return 'Radiation Physics';
    case 'quality-assurance': return 'Quality Assurance';
    case 'patient-care': return 'Patient Care';
    case 'equipment': return 'Equipment Knowledge';
    case 'regulatory': return 'Regulatory Compliance';
    case 'theoretical': return 'Theoretical Foundations';
    default: return domainId.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }
}

function getDomainColor(domainId: string): string {
  switch(domainId) {
    case 'radiation-physics': return 'var(--clinical-color)';
    case 'quality-assurance': return 'var(--qa-color)';
    case 'patient-care': return 'var(--clinical-alt-color)';
    case 'equipment': return 'var(--qa-color)';
    case 'regulatory': return 'var(--educational-color)';
    case 'theoretical': return 'var(--educational-color)';
    default: return 'var(--clinical-color)';
  }
}