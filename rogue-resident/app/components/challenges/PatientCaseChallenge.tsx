// app/components/challenges/PatientCaseChallenge.tsx
'use client';
import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useChallengeStore } from '../../store/challengeStore';
import { useJournalStore } from '../../store/journalStore';
import ConversationFormat, { InteractionResults } from './formats/ConversationFormat';
import { DialogueStage } from '../../hooks/useDialogueFlow';
import { CharacterId } from '../../types/challenge';
import { clinicalChallenges } from '../../data/clinicalChallenges';

interface PatientCaseProps {
  character: CharacterId;
  caseId?: string; // Optional specific case ID
}

export default function PatientCaseChallenge({ character, caseId }: PatientCaseProps) {
  const { currentNodeId } = useGameStore();
  const { completeChallenge } = useChallengeStore();
  const { addEntry, hasJournal } = useJournalStore();
  
  // Track which clinical concepts were understood
  const [masteredConcepts, setMasteredConcepts] = useState({
    'treatment_planning': false,
    'dose_prescription': false,
    'target_volumes': false,
    'organs_at_risk': false
  });
  
  // Select a clinical case
  const selectedCase = caseId 
    ? clinicalChallenges.find(c => c.id === caseId) 
    : clinicalChallenges[Math.floor(Math.random() * clinicalChallenges.length)];
  
  if (!selectedCase) {
    return <div>Error: No clinical case available</div>;
  }
  
  // Handle completion of the challenge
  const handleCompletion = (results: InteractionResults) => {
    // Determine grade based on results
    const grade = results.relationshipChange >= 3 ? 'S' : 
                 results.relationshipChange >= 1 ? 'A' : 
                 results.relationshipChange >= 0 ? 'B' : 'C';
    
    // Add journal entry if journal exists
    if (hasJournal) {
      addEntry({
        id: `case-${selectedCase.id}`,
        title: `Patient Case: ${selectedCase.title}`,
        date: new Date().toISOString(),
        content: `Case review with ${character === 'kapoor' ? 'Dr. Kapoor' : 
                 character === 'garcia' ? 'Dr. Garcia' : 'Dr. Quinn'} for 
                 ${selectedCase.patientInfo}.\n\nKey learnings:\n${
                   results.knowledgeGained['treatment_planning'] ? '- Appropriate treatment planning approach\n' : ''
                 }${
                   results.knowledgeGained['dose_prescription'] ? '- Dose prescription considerations\n' : ''
                 }${
                   results.knowledgeGained['target_volumes'] ? '- Target volume delineation guidelines\n' : ''
                 }${
                   results.knowledgeGained['organs_at_risk'] ? '- Critical organ constraints\n' : ''
                 }\nTotal insight gained: ${results.insightGained}`,
        tags: ['clinical', 'case', selectedCase.id]
      });
    }
    
    // Complete the challenge in the challenge store
    completeChallenge(grade);
  };
  
  // Generate dialogue stages from clinical case data
  const generateDialogueStages = (): DialogueStage[] => {
    const stages: DialogueStage[] = [
      // Introduction stage
      {
        id: 'intro',
        text: `I'd like to review a ${selectedCase.difficulty} case with you: ${selectedCase.patientInfo}. Let's discuss the appropriate approach.`,
        contextNote: `${character === 'kapoor' ? 'Dr. Kapoor' : 'Dr. Garcia'} reviews the patient chart thoughtfully.`,
        equipment: {
          itemId: 'patient-chart',
          alt: "Patient Chart",
          description: selectedCase.patientInfo
        },
        options: [
          { 
            id: "professional-intro",
            text: "I've reviewed the basics. What aspects should we focus on?", 
            nextStageId: 'question1',
            approach: 'precision',
            insightGain: 5,
            relationshipChange: 1,
            responseText: "Good, let's start with the fundamentals and work through the key decision points systematically."
          },
          { 
            id: "empathetic-intro",
            text: "This patient's condition must be challenging for them. How does that affect our approach?", 
            nextStageId: 'question1',
            approach: 'humble',
            insightGain: 5,
            relationshipChange: 1,
            responseText: "I appreciate your patient-centric perspective. That empathy can improve clinical decisions when properly balanced with technical precision."
          }
        ]
      }
    ];
    
    // Generate question stages from clinical challenge data
    selectedCase.questions.forEach((question, index) => {
      const questionStage: DialogueStage = {
        id: `question${index + 1}`,
        text: question.text,
        contextNote: `Patient's ${selectedCase.title} planning phase.`,
        options: question.options.map(option => {
          // Determine which concept this applies to based on question index
          const conceptMap = ['treatment_planning', 'dose_prescription', 'target_volumes', 'organs_at_risk'];
          const conceptId = conceptMap[index % conceptMap.length];
          
          return {
            id: option.id,
            text: option.text,
            // Move to next question or conclusion
            nextStageId: index < selectedCase.questions.length - 1 ? `question${index + 2}` : 'conclusion',
            approach: option.isCorrect ? 'precision' : 'confidence',
            insightGain: option.isCorrect ? 15 : 5,
            relationshipChange: option.isCorrect ? 1 : -1,
            // Only add knowledge gain for correct answers
            knowledgeGain: option.isCorrect ? { 
              conceptId: conceptId,
              domainId: 'clinical-practice',
              amount: 15
            } : undefined,
            responseText: option.isCorrect 
              ? `Correct. ${option.text} is indeed the optimal approach in this case.`
              : `Not quite. This approach could lead to suboptimal outcomes because it doesn't fully account for the patient's specific presentation.`
          };
        })
      };
      
      stages.push(questionStage);
    });
    
    // Add conclusion stage
    stages.push({
      id: 'conclusion',
      text: `You've demonstrated a solid understanding of this case. Remember that each patient is unique, but the principles we've discussed provide a framework for approaching similar cases.`,
      contextNote: `${character === 'kapoor' ? 'Dr. Kapoor' : 'Dr. Garcia'} finalizes notes in the patient chart.`,
      isConclusion: true
    });
    
    // Add excellent conclusion branch
    stages.push({
      id: 'conclusion-excellence',
      text: `Excellent work. Your grasp of both the technical elements and clinical considerations shows real promise. This is exactly the kind of integrated thinking medical physics demands.`,
      contextNote: `${character === 'kapoor' ? 'Dr. Kapoor' : 'Dr. Garcia'} appears genuinely impressed.`,
      isConclusion: true
    });
    
    // Add needs improvement conclusion
    stages.push({
      id: 'conclusion-needs-improvement',
      text: `I'd recommend reviewing the fundamentals before our next case discussion. These clinical decisions have real consequences for patient outcomes.`,
      contextNote: `${character === 'kapoor' ? 'Dr. Kapoor' : 'Dr. Garcia'} makes additional notes with a concerned expression.`,
      isConclusion: true
    });
    
    return stages;
  };
  
  // Generate dialogue stages from case data
  const dialogueStages = generateDialogueStages();
  
  return (
    <ConversationFormat
      character={character}
      dialogueStages={dialogueStages}
      onComplete={handleCompletion}
    />
  );
}