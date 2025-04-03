// app/components/challenges/formats/ProceduralFormat.tsx
'use client';
import { useState, useEffect } from 'react';
import { useGameStore } from '../../../store/gameStore';
import { useGameEffects } from '../../../GameEffects';
import { PixelButton, PixelText } from '../../../components/PixelThemeProvider';
import Image from 'next/image';

// Procedure step with sequence requirements
export interface ProcedureStep {
  id: string;
  title: string;
  description: string;
  image?: string;
  correctPosition: number; // The correct order in the sequence
  isOptional?: boolean;
  reasonIfSkipped?: string;
  knowledgeConcept?: string; // Associated knowledge concept
  knowledgeDomain?: string; // Knowledge domain for this step
}

// Results from completing a procedure
export interface ProcedureResults {
  correctSequence: boolean;
  stepsMissed: number;
  optionalStepsCompleted: number;
  tooManySteps: boolean;
  timeSpent: number; // seconds
  insightGained: number;
  knowledgeGained: Record<string, number>;
}

interface ProceduralFormatProps {
  character: string;
  title: string;
  description: string;
  procedureImage?: string;
  allSteps: ProcedureStep[];
  onComplete: (results: ProcedureResults) => void;
}

export default function ProceduralFormat({
  character,
  title,
  description,
  procedureImage,
  allSteps,
  onComplete
}: ProceduralFormatProps) {
  const { currentNodeId, completeNode, updateInsight } = useGameStore();
  const { playSound, flashScreen } = useGameEffects();
  
  // State management
  const [availableSteps, setAvailableSteps] = useState<ProcedureStep[]>([]);
  const [selectedSteps, setSelectedSteps] = useState<ProcedureStep[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stepFeedback, setStepFeedback] = useState<string | null>(null);
  const [startTime] = useState<number>(Date.now());
  const [showCompletion, setShowCompletion] = useState(false);
  const [completionResults, setCompletionResults] = useState<ProcedureResults | null>(null);
  
  // Character data for styling
  const characterData: Record<string, {name: string, color: string, bgClass: string}> = {
    'kapoor': { 
      name: 'Dr. Kapoor', 
      color: 'var(--clinical-color)',
      bgClass: 'bg-clinical'
    },
    'jesse': { 
      name: 'Technician Jesse', 
      color: 'var(--qa-color)',
      bgClass: 'bg-qa'
    },
    'quinn': { 
      name: 'Dr. Quinn', 
      color: 'var(--educational-color)',
      bgClass: 'bg-educational'
    }
  };
  
  const charData = characterData[character as keyof typeof characterData] || characterData.kapoor;
  
  // Initialize with randomized steps
  useEffect(() => {
    // Create a shuffled copy of steps for selection
    const shuffled = [...allSteps].sort(() => 0.5 - Math.random());
    setAvailableSteps(shuffled);
  }, [allSteps]);
  
  // Select a step to add to the sequence
  const addStep = (step: ProcedureStep) => {
    // Play selection sound
    if (playSound) playSound('click');
    
    // Move step from available to selected
    setAvailableSteps(prev => prev.filter(s => s.id !== step.id));
    setSelectedSteps(prev => [...prev, step]);
    
    // Clear any feedback
    setStepFeedback(null);
  };
  
  // Remove a step from the sequence
  const removeStep = (step: ProcedureStep) => {
    // Play removal sound
    if (playSound) playSound('ui-close');
    
    // Move step from selected back to available
    setSelectedSteps(prev => prev.filter(s => s.id !== step.id));
    setAvailableSteps(prev => [...prev, step]);
    
    // Clear any feedback
    setStepFeedback(null);
  };
  
  // Move a selected step up in the sequence
  const moveStepUp = (index: number) => {
    if (index <= 0) return;
    
    // Play move sound
    if (playSound) playSound('ui-move');
    
    // Swap with previous step
    const updatedSteps = [...selectedSteps];
    [updatedSteps[index], updatedSteps[index - 1]] = [updatedSteps[index - 1], updatedSteps[index]];
    setSelectedSteps(updatedSteps);
    
    // Clear any feedback
    setStepFeedback(null);
  };
  
  // Move a selected step down in the sequence
  const moveStepDown = (index: number) => {
    if (index >= selectedSteps.length - 1) return;
    
    // Play move sound
    if (playSound) playSound('ui-move');
    
    // Swap with next step
    const updatedSteps = [...selectedSteps];
    [updatedSteps[index], updatedSteps[index + 1]] = [updatedSteps[index + 1], updatedSteps[index]];
    setSelectedSteps(updatedSteps);
    
    // Clear any feedback
    setStepFeedback(null);
  };
  
  // Submit the procedure sequence for evaluation
  const submitSequence = () => {
    setIsSubmitting(true);
    
    // A brief delay for dramatic effect
    setTimeout(() => {
      evaluateSequence();
    }, 1000);
  };
  
  // Evaluate the submitted sequence
  const evaluateSequence = () => {
    const requiredSteps = allSteps.filter(step => !step.isOptional);
    const optionalSteps = allSteps.filter(step => step.isOptional);
    
    // Check if all required steps are included
    const allRequiredIncluded = requiredSteps.every(
      reqStep => selectedSteps.some(selStep => selStep.id === reqStep.id)
    );
    
    // Count how many required steps were missed
    const missingRequiredCount = requiredSteps.filter(
      reqStep => !selectedSteps.some(selStep => selStep.id === reqStep.id)
    ).length;
    
    // Count optional steps completed
    const optionalCompleted = optionalSteps.filter(
      optStep => selectedSteps.some(selStep => selStep.id === optStep.id)
    ).length;
    
    // Check if sequence is in the correct order
    let sequenceCorrect = true;
    let lastPosition = 0;
    
    // Check order of non-optional steps
    for (const step of selectedSteps) {
      const originalStep = allSteps.find(s => s.id === step.id);
      if (originalStep && !originalStep.isOptional) {
        if (originalStep.correctPosition < lastPosition) {
          sequenceCorrect = false;
          break;
        }
        lastPosition = originalStep.correctPosition;
      }
    }
    
    // Calculate total insight gain
    let insightGain = 0;
    
    // Base insight for completion
    insightGain += 20;
    
    // Bonus for correct sequence
    if (sequenceCorrect) insightGain += 20;
    
    // Bonus for including all required steps
    if (allRequiredIncluded) insightGain += 20;
    
    // Bonus for each optional step
    insightGain += optionalCompleted * 10;
    
    // Penalty for wrong sequence
    if (!sequenceCorrect) insightGain -= 10;
    
    // Penalty for missing required steps
    insightGain -= missingRequiredCount * 15;
    
    // Ensure minimum insight gain
    insightGain = Math.max(10, insightGain);
    
    // Update insight in game store
    updateInsight(insightGain);
    
    // Track knowledge gained
    const knowledgeGained: Record<string, number> = {};
    
    // Knowledge gain for each correct step
    selectedSteps.forEach(step => {
      const originalStep = allSteps.find(s => s.id === step.id);
      if (originalStep?.knowledgeConcept) {
        // Give full knowledge value for correct position, partial otherwise
        const positionCorrect = selectedSteps.indexOf(step) + 1 === originalStep.correctPosition;
        const knowledgeValue = positionCorrect ? 15 : 5;
        
        knowledgeGained[originalStep.knowledgeConcept] = 
          (knowledgeGained[originalStep.knowledgeConcept] || 0) + knowledgeValue;
      }
    });
    
    // Prepare results
    const results: ProcedureResults = {
      correctSequence: sequenceCorrect,
      stepsMissed: missingRequiredCount,
      optionalStepsCompleted: optionalCompleted,
      tooManySteps: selectedSteps.length > allSteps.length,
      timeSpent: Math.floor((Date.now() - startTime) / 1000),
      insightGained: insightGain,
      knowledgeGained
    };
    
    // Store results for display
    setCompletionResults(results);
    
    // Play completion sound based on performance
    if (sequenceCorrect && allRequiredIncluded) {
      if (playSound) playSound('success');
      if (flashScreen) flashScreen('green');
    } else if (!sequenceCorrect && !allRequiredIncluded) {
      if (playSound) playSound('failure');
      if (flashScreen) flashScreen('red');
    } else {
      if (playSound) playSound('partial-success');
      if (flashScreen) flashScreen('yellow');
    }
    
    // Complete the node in game state
    if (currentNodeId) {
      completeNode(currentNodeId);
    }
    
    // Show completion screen
    setShowCompletion(true);
    
    // Call the completion callback
    onComplete(results);
  };
  
  // Get display grade based on results
  const getGradeFromResults = (results: ProcedureResults): string => {
    if (results.correctSequence && results.stepsMissed === 0 && results.optionalStepsCompleted > 0) {
      return 'S';
    } else if (results.correctSequence && results.stepsMissed === 0) {
      return 'A';
    } else if (results.correctSequence || results.stepsMissed <= 1) {
      return 'B';
    } else {
      return 'C';
    }
  };
  
  // Render completion screen
  if (showCompletion && completionResults) {
    const grade = getGradeFromResults(completionResults);
    
    return (
      <div className="p-6 max-w-4xl mx-auto bg-surface pixel-borders">
        <PixelText className={`text-2xl ${charData.textClass} font-pixel-heading mb-4`}>Procedure Evaluation</PixelText>
        
        <div className="mb-6 bg-surface-dark p-4 pixel-borders-thin">
          <PixelText className="mb-2">
            {completionResults.correctSequence && completionResults.stepsMissed === 0
              ? "You've completed the procedure correctly!"
              : completionResults.correctSequence
                ? "Your sequence was correct, but you missed some steps."
                : completionResults.stepsMissed === 0
                  ? "You included all required steps, but the sequence was incorrect."
                  : "Your procedure had issues with both sequence and missing steps."
            }
          </PixelText>
          
          <PixelText className="text-text-secondary">
            {grade === 'S' 
              ? "Outstanding work! This level of procedural precision is exactly what we need in medical physics."
              : grade === 'A'
                ? "Excellent work! Your attention to procedure is commendable."
                : grade === 'B'
                  ? "Good job. With a bit more practice, you'll master this procedure."
                  : "This procedure needs improvement. Focus on understanding the correct sequence and required steps."
            }
          </PixelText>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-surface-dark p-3 pixel-borders-thin">
            <PixelText className="text-sm text-text-secondary mb-1">Sequence Order</PixelText>
            <PixelText className={`text-lg ${completionResults.correctSequence ? 'text-success' : 'text-danger'}`}>
              {completionResults.correctSequence ? "Correct" : "Incorrect"}
            </PixelText>
          </div>
          
          <div className="bg-surface-dark p-3 pixel-borders-thin">
            <PixelText className="text-sm text-text-secondary mb-1">Required Steps Missed</PixelText>
            <PixelText className={`text-lg ${completionResults.stepsMissed === 0 ? 'text-success' : 'text-danger'}`}>
              {completionResults.stepsMissed}
            </PixelText>
          </div>
          
          <div className="bg-surface-dark p-3 pixel-borders-thin">
            <PixelText className="text-sm text-text-secondary mb-1">Optional Steps Completed</PixelText>
            <PixelText className="text-lg">
              {completionResults.optionalStepsCompleted}
            </PixelText>
          </div>
          
          <div className="bg-surface-dark p-3 pixel-borders-thin">
            <PixelText className="text-sm text-text-secondary mb-1">Final Grade</PixelText>
            <PixelText className={`text-lg ${grade === 'S' || grade === 'A' ? 'text-success' : grade === 'C' ? 'text-warning' : 'text-text-primary'}`}>
              {grade}
            </PixelText>
          </div>
        </div>
        
        {/* Show correct sequence for learning */}
        <div className="mb-6">
          <PixelText className="mb-2">Correct Procedure:</PixelText>
          <div className="bg-surface-dark p-3 pixel-borders-thin">
            <ol className="list-decimal pl-5">
              {allSteps
                .sort((a, b) => a.correctPosition - b.correctPosition)
                .map(step => (
                  <li key={step.id} className="mb-1">
                    <PixelText className={step.isOptional ? 'text-text-secondary' : 'text-text-primary'}>
                      {step.title} {step.isOptional ? '(Optional)' : ''}
                    </PixelText>
                  </li>
                ))
              }
            </ol>
          </div>
        </div>
        
        <div className="flex justify-center">
          <PixelButton
            className={`${charData.bgClass} text-white hover:opacity-90 px-8`}
            onClick={() => setShowCompletion(false)}
          >
            Return to Map
          </PixelButton>
        </div>
      </div>
    );
  }
  
  // Main procedure UI
  return (
    <div className="p-6 max-w-4xl mx-auto bg-surface pixel-borders">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <PixelText className={`text-2xl ${charData.textClass} font-pixel-heading`}>{title}</PixelText>
      </div>
      
      {/* Instructions */}
      <div className="bg-surface-dark p-3 pixel-borders-thin mb-4">
        <PixelText className="mb-2">{description}</PixelText>
        <PixelText className="text-sm text-text-secondary">
          Create the correct procedure by placing steps in the proper sequence. Required and optional steps are both included.
        </PixelText>
      </div>
      
      {/* Main procedure area */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        {/* Step selection panel */}
        <div className="w-full md:w-1/3">
          <PixelText className="text-sm text-text-secondary mb-2">Available Steps:</PixelText>
          <div className="bg-surface-dark pixel-borders-thin max-h-[400px] overflow-y-auto">
            {availableSteps.length === 0 ? (
              <div className="p-3 text-text-secondary font-pixel italic">
                All steps have been used
              </div>
            ) : (
              availableSteps.map(step => (
                <div 
                  key={step.id}
                  className="p-3 border-b border-border hover:bg-surface-light hover:bg-opacity-10 cursor-pointer transition-colors duration-150"
                  onClick={() => addStep(step)}
                >
                  <PixelText>{step.title}</PixelText>
                </div>
              ))
            )}
          </div>
        </div>
        
        {/* Selected sequence panel */}
        <div className="w-full md:w-2/3">
          <PixelText className="text-sm text-text-secondary mb-2">Your Procedure (in sequence):</PixelText>
          <div className="bg-surface-dark pixel-borders-thin min-h-[300px]">
            {selectedSteps.length === 0 ? (
              <div className="p-3 text-text-secondary font-pixel italic">
                Select steps from the left panel to build your procedure
              </div>
            ) : (
              <div className="divide-y divide-border">
                {selectedSteps.map((step, index) => (
                  <div 
                    key={step.id}
                    className="p-3 flex justify-between items-start hover:bg-surface-light hover:bg-opacity-10 transition-colors duration-150"
                  >
                    <div className="mr-2">
                      <PixelText className="font-medium">{index + 1}. {step.title}</PixelText>
                      <PixelText className="text-sm text-text-secondary mt-1">{step.description}</PixelText>
                    </div>
                    
                    <div className="flex space-x-1">
                      <button 
                        className="p-1 hover:bg-surface rounded" 
                        onClick={() => moveStepUp(index)}
                        disabled={index === 0}
                      >
                        <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      
                      <button 
                        className="p-1 hover:bg-surface rounded"
                        onClick={() => moveStepDown(index)}
                        disabled={index === selectedSteps.length - 1}
                      >
                        <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      
                      <button 
                        className="p-1 hover:bg-surface rounded"
                        onClick={() => removeStep(step)}
                      >
                        <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Procedure image if available */}
      {procedureImage && (
        <div className="mb-6">
          <div className="bg-surface-dark pixel-borders-thin p-2 flex justify-center">
            <Image
              src={procedureImage}
              alt={title}
              width={600}
              height={300}
              className="max-w-full max-h-[300px] object-contain"
            />
          </div>
        </div>
      )}
      
      {/* Feedback area */}
      {stepFeedback && (
        <div className="bg-warning/20 border border-warning p-3 mb-4 pixel-borders-thin">
          <PixelText className="text-warning">{stepFeedback}</PixelText>
        </div>
      )}
      
      {/* Submit button */}
      <div className="flex justify-end">
        <PixelButton
          className={`
            ${selectedSteps.length > 0 
              ? `${charData.bgClass} text-white hover:opacity-90` 
              : 'bg-surface-dark text-text-secondary cursor-not-allowed'}
            ${isSubmitting ? 'animate-pulse' : ''}
          `}
          onClick={submitSequence}
          disabled={selectedSteps.length === 0 || isSubmitting}
        >
          {isSubmitting ? 'Evaluating...' : 'Submit Procedure'}
        </PixelButton>
      </div>
    </div>
  );
}