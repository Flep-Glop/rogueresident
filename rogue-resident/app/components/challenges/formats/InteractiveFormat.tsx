// app/components/challenges/formats/InteractiveFormat.tsx
'use client';
import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../../../store/gameStore';
import { useGameEffects } from '../../GameEffects';
import { PixelButton, PixelText } from '../../../components/PixelThemeProvider';
import Image from 'next/image';
import { getSpriteData } from '../../../data/spriteMapping';

// Equipment type for interaction
export interface InteractiveEquipment {
  id: string;
  name: string;
  image: string;
  interactiveAreas?: InteractiveArea[];
  status?: string;
}

// Interactive area within equipment
export interface InteractiveArea {
  id: string;
  name: string;
  description?: string;
  x: number; // percentage position
  y: number; // percentage position 
  width: number; // percentage width
  height: number; // percentage height
  correctState?: string; // The state this should be in to be correct
  currentState?: string; // Current state
  states?: string[]; // Possible states
  requiredAction?: string; // What needs to be done with this area
}

// Step in an interactive sequence
export interface InteractiveStep {
  id: string;
  instruction: string;
  detail?: string;
  requiredAreaIds: string[]; // Which areas need to be interacted with
  completionMessage: string;
}

// Results of an interactive challenge
export interface InteractiveResults {
  completedSteps: number;
  totalSteps: number;
  mistakesMade: number;
  timeSpent: number; // seconds
  insightGained: number;
  knowledgeGained: Record<string, number>;
}

interface InteractiveFormatProps {
  character: string;
  title: string;
  description: string;
  equipment: InteractiveEquipment;
  steps: InteractiveStep[];
  conceptMap: Record<string, string>; // Maps steps to concepts
  domainMap: Record<string, string>; // Maps concepts to domains
  onComplete: (results: InteractiveResults) => void;
}

export default function InteractiveFormat({
  character,
  title,
  description,
  equipment,
  steps,
  conceptMap,
  domainMap,
  onComplete
}: InteractiveFormatProps) {
  const { currentNodeId, completeNode, updateInsight } = useGameStore();
  const { playSound, flashScreen } = useGameEffects();
  
  // State management
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedAreaIds, setCompletedAreaIds] = useState<string[]>([]);
  const [mistakesMade, setMistakesMade] = useState(0);
  const [startTime] = useState<number>(Date.now());
  const [showCompletion, setShowCompletion] = useState(false);
  const [totalInsightGained, setTotalInsightGained] = useState(0);
  const [knowledgeGained, setKnowledgeGained] = useState<Record<string, number>>({});
  
  // Ref for equipment container
  const equipmentRef = useRef<HTMLDivElement>(null);
  
  // Current step
  const currentStep = steps[currentStepIndex];
  
  const characterData: Record<string, {name: string, color: string, bgClass: string, textClass: string}> = {
    'kapoor': { 
      name: 'Dr. Kapoor', 
      color: 'var(--clinical-color)',
      bgClass: 'bg-clinical',
      textClass: 'text-clinical-light'
    },
    'jesse': { 
      name: 'Technician Jesse', 
      color: 'var(--qa-color)',
      bgClass: 'bg-qa',
      textClass: 'text-qa-light'
    },
    'quinn': { 
      name: 'Dr. Zephyr Quinn', 
      color: 'var(--educational-color)',
      bgClass: 'bg-educational',
      textClass: 'text-educational-light'
    }
  };
  
  const charData = characterData[character as keyof typeof characterData] || characterData.kapoor;
  
  // Calculate progress
  const stepProgress = ((currentStepIndex) / steps.length) * 100;
  
  // Check if current step is complete
  const isStepComplete = currentStep.requiredAreaIds.every(areaId => 
    completedAreaIds.includes(areaId)
  );
  
  // Handle interaction with an area
  const handleAreaInteraction = (area: InteractiveArea) => {
    // Skip if this area is already completed
    if (completedAreaIds.includes(area.id)) {
      if (playSound) playSound('ui-disabled');
      return;
    }
    
    // Check if this area is part of the current step's requirements
    if (currentStep.requiredAreaIds.includes(area.id)) {
      // Play interaction sound
      if (playSound) playSound('click');
      
      // Mark area as completed
      setCompletedAreaIds(prev => [...prev, area.id]);
      
      // Add slight insight
      const insightGain = 5;
      updateInsight(insightGain);
      setTotalInsightGained(prev => prev + insightGain);
      
      // Track knowledge gained
      if (conceptMap[currentStep.id]) {
        const conceptId = conceptMap[currentStep.id];
        setKnowledgeGained(prev => ({
          ...prev,
          [conceptId]: (prev[conceptId] || 0) + 10
        }));
      }
    } else {
      // Wrong interaction
      if (playSound) playSound('error');
      if (flashScreen) flashScreen('red');
      
      setMistakesMade(prev => prev + 1);
    }
  };
  
  // Handle advancing to next step
  const handleNextStep = () => {
    if (isStepComplete) {
      // Play success sound
      if (playSound) playSound('success');
      
      // Add insight for completing step
      const insightGain = 10;
      updateInsight(insightGain);
      setTotalInsightGained(prev => prev + insightGain);
      
      // Move to next step if available
      if (currentStepIndex < steps.length - 1) {
        setCurrentStepIndex(prev => prev + 1);
      } else {
        // Complete the procedure
        completeChallenge();
      }
    }
  };
  
  // Complete the challenge
  const completeChallenge = () => {
    // Calculate time spent
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    
    // Mark node as completed in game store
    if (currentNodeId) {
      completeNode(currentNodeId);
    }
    
    // Show completion screen
    setShowCompletion(true);
    
    // Final completion effects
    if (playSound) playSound('challenge-complete');
    if (flashScreen) flashScreen('green');
    
    // Calculate final results
    const results: InteractiveResults = {
      completedSteps: steps.length,
      totalSteps: steps.length,
      mistakesMade,
      timeSpent,
      insightGained: totalInsightGained,
      knowledgeGained
    };
    
    // Call completion callback
    onComplete(results);
  };
  
  // Render an interactive area
  const renderInteractiveArea = (area: InteractiveArea) => {
    const isCompleted = completedAreaIds.includes(area.id);
    
    return (
      <div
        key={area.id}
        className={`absolute rounded-sm border-2 transition-all cursor-pointer hover:shadow-pixel
          ${isCompleted ? 'border-success bg-success/20' : 'border-white/40 bg-white/10 hover:bg-white/20'}
        `}
        style={{
          left: `${area.x}%`,
          top: `${area.y}%`,
          width: `${area.width}%`,
          height: `${area.height}%`,
          zIndex: 10
        }}
        onClick={() => handleAreaInteraction(area)}
      >
        {/* Optional label */}
        {area.name && (
          <div className="absolute bottom-100 left-0 text-xs px-1 py-0.5 bg-surface-dark/80 whitespace-nowrap font-pixel">
            {area.name}
          </div>
        )}
        
        {/* Completion checkmark */}
        {isCompleted && (
          <div className="absolute inset-0 flex items-center justify-center text-success">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>
    );
  };
  
  // Render completion screen
  if (showCompletion) {
    const grade = mistakesMade === 0 ? 'S' : 
                 mistakesMade <= 2 ? 'A' :
                 mistakesMade <= 4 ? 'B' : 'C';
    
    return (
      <div className="p-6 max-w-4xl mx-auto bg-surface pixel-borders">
        <PixelText className={`text-2xl ${charData.textClass} font-pixel-heading mb-4`}>Procedure Complete!</PixelText>
        
        <div className="mb-6 bg-surface-dark p-4 pixel-borders-thin">
          <PixelText className="mb-2">You've successfully completed the {title}.</PixelText>
          <PixelText className="text-text-secondary">{currentStep.completionMessage}</PixelText>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-surface-dark p-3 pixel-borders-thin">
            <PixelText className="text-sm text-text-secondary mb-1">Completed Steps</PixelText>
            <PixelText className="text-lg">{steps.length} / {steps.length}</PixelText>
          </div>
          
          <div className="bg-surface-dark p-3 pixel-borders-thin">
            <PixelText className="text-sm text-text-secondary mb-1">Mistakes Made</PixelText>
            <PixelText className="text-lg">{mistakesMade}</PixelText>
          </div>
          
          <div className="bg-surface-dark p-3 pixel-borders-thin">
            <PixelText className="text-sm text-text-secondary mb-1">Time Taken</PixelText>
            <PixelText className="text-lg">{Math.floor((Date.now() - startTime) / 1000)}s</PixelText>
          </div>
          
          <div className="bg-surface-dark p-3 pixel-borders-thin">
            <PixelText className="text-sm text-text-secondary mb-1">Final Grade</PixelText>
            <PixelText className={`text-lg ${grade === 'S' || grade === 'A' ? 'text-success' : grade === 'C' ? 'text-warning' : 'text-text-primary'}`}>
              {grade}
            </PixelText>
          </div>
        </div>
        
        <div className="flex justify-center">
          <PixelButton
            className={`${charData.bgClass} text-white hover:opacity-90 px-8`}
            onClick={() => setShowCompletion(false)}
          >
            Review Procedure
          </PixelButton>
        </div>
      </div>
    );
  }
  
  // Main interaction UI
  return (
    <div className="p-6 max-w-4xl mx-auto bg-surface pixel-borders">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <PixelText className={`text-2xl ${charData.textClass} font-pixel-heading`}>{title}</PixelText>
        
        <div className="flex items-center">
          <div className="w-24 h-2 bg-surface-dark rounded-full mr-2">
            <div 
              className={`h-full rounded-full ${charData.bgClass}`}
              style={{ width: `${stepProgress}%` }}
            ></div>
          </div>
          <PixelText className="text-sm text-text-secondary">
            Step {currentStepIndex + 1}/{steps.length}
          </PixelText>
        </div>
      </div>
      
      {/* Instructions */}
      <div className="bg-surface-dark p-3 pixel-borders-thin mb-4">
        <PixelText className="text-lg mb-1">{currentStep.instruction}</PixelText>
        {currentStep.detail && (
          <PixelText className="text-sm text-text-secondary">{currentStep.detail}</PixelText>
        )}
      </div>
      
      {/* Interactive equipment visualization */}
      <div className="mb-4 flex justify-center">
        <div 
          ref={equipmentRef}
          className="relative aspect-video w-full max-w-2xl pixel-borders-thin bg-black/50 overflow-hidden"
        >
          {/* Equipment image */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Image
              src={equipment.image}
              alt={equipment.name}
              width={800}
              height={450}
              className="max-w-full max-h-full object-contain"
            />
          </div>
          
          {/* Interactive areas */}
          {equipment.interactiveAreas?.map(area => renderInteractiveArea(area))}
        </div>
      </div>
      
      {/* Step progression */}
      <div className="flex justify-between items-center">
        <div>
          {/* Show mistakes if any */}
          {mistakesMade > 0 && (
            <PixelText className="text-sm text-warning">
              Mistakes: {mistakesMade}
            </PixelText>
          )}
        </div>
        
        <PixelButton
          className={`
            ${isStepComplete 
              ? `${charData.bgClass} text-white hover:opacity-90` 
              : 'bg-surface-dark text-text-secondary cursor-not-allowed'}
          `}
          onClick={handleNextStep}
          disabled={!isStepComplete}
        >
          {currentStepIndex < steps.length - 1 ? 'Next Step' : 'Complete Procedure'}
        </PixelButton>
      </div>
    </div>
  );
}