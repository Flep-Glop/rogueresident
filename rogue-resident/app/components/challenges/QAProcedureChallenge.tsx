// app/components/challenges/QAProcedureChallenge.tsx
'use client';
import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useChallengeStore } from '../../store/challengeStore';
import { useJournalStore } from '../../store/journalStore';
import ProceduralFormat, { ProcedureStep, ProcedureResults } from './formats/ProceduralFormat';
import { CharacterId } from '../../types/challenge';

interface QAProcedureChallengeProps {
  character: CharacterId;
  procedureType?: 'daily' | 'monthly' | 'annual' | 'commissioning';
  equipmentType?: 'linac' | 'ct' | 'brachytherapy' | 'dosimetry';
}

export default function QAProcedureChallenge({
  character = 'jesse',
  procedureType = 'daily',
  equipmentType = 'linac'
}: QAProcedureChallengeProps) {
  const { currentNodeId } = useGameStore();
  const { completeChallenge } = useChallengeStore();
  const { addEntry, hasJournal } = useJournalStore();
  
  // Get the appropriate procedure steps based on type and equipment
  const getProcedureSteps = (): ProcedureStep[] => {
    // Daily LINAC QA
    if (procedureType === 'daily' && equipmentType === 'linac') {
      return [
        {
          id: 'power_on',
          title: 'Power on and warm-up procedure',
          description: 'Allow system to complete full initialization sequence (approx. 10 minutes).',
          correctPosition: 1,
          knowledgeConcept: 'equipment_startup',
          knowledgeDomain: 'quality-assurance'
        },
        {
          id: 'safety_checks',
          title: 'Safety interlock verification',
          description: 'Test door interlocks, emergency stops, and audio/visual monitoring systems.',
          correctPosition: 2,
          knowledgeConcept: 'safety_systems',
          knowledgeDomain: 'radiation-protection'
        },
        {
          id: 'pretreatment_preparation',
          title: 'Room preparation and equipment setup',
          description: 'Ensure room is clear, position QA phantom and align lasers.',
          correctPosition: 3,
          knowledgeConcept: 'qa_workflow',
          knowledgeDomain: 'quality-assurance'
        },
        {
          id: 'machine_log_review',
          title: 'Review previous service records',
          description: 'Check machine logs for recent issues or service notes.',
          correctPosition: 4,
          isOptional: true,
          knowledgeConcept: 'qa_workflow',
          knowledgeDomain: 'quality-assurance'
        },
        {
          id: 'mechanical_checks',
          title: 'Mechanical checks and collision avoidance',
          description: 'Test gantry, collimator, and couch rotations for smooth operation.',
          correctPosition: 5,
          knowledgeConcept: 'mechanical_qa',
          knowledgeDomain: 'quality-assurance'
        },
        {
          id: 'laser_alignment',
          title: 'Laser alignment verification',
          description: 'Verify all positioning lasers agree at isocenter within 2mm.',
          correctPosition: 6,
          knowledgeConcept: 'geometric_accuracy',
          knowledgeDomain: 'quality-assurance'
        },
        {
          id: 'radiation_output',
          title: 'Radiation output constancy check',
          description: 'Measure reference field output and compare to baseline (tolerance: ±3%).',
          correctPosition: 7,
          knowledgeConcept: 'output_calibration',
          knowledgeDomain: 'quality-assurance'
        },
        {
          id: 'field_flatness',
          title: 'Field symmetry and flatness',
          description: 'Verify beam profile characteristics using array detector (tolerance: ±3%).',
          correctPosition: 8,
          isOptional: true,
          knowledgeConcept: 'beam_characteristics',
          knowledgeDomain: 'quality-assurance'
        },
        {
          id: 'mlc_test',
          title: 'MLC position accuracy test',
          description: 'Perform picket fence or leaf-specific position check (tolerance: ±1mm).',
          correctPosition: 9,
          knowledgeConcept: 'mlc_qa',
          knowledgeDomain: 'quality-assurance'
        },
        {
          id: 'imaging_system',
          title: 'Imaging system verification',
          description: 'Test kV/MV imaging systems using appropriate phantoms.',
          correctPosition: 10,
          knowledgeConcept: 'imaging_qa',
          knowledgeDomain: 'quality-assurance'
        },
        {
          id: 'documentation',
          title: 'Documentation and reporting',
          description: 'Record all results, note any deviations, and sign off on QA completion.',
          correctPosition: 11,
          knowledgeConcept: 'qa_documentation',
          knowledgeDomain: 'quality-assurance'
        },
        {
          id: 'notification',
          title: 'Notify appropriate staff if issues found',
          description: 'Contact service engineer and clinical team if any parameters exceed tolerance.',
          correctPosition: 12,
          isOptional: true,
          reasonIfSkipped: 'Only required if issues are found.',
          knowledgeConcept: 'qa_workflow',
          knowledgeDomain: 'quality-assurance'
        },
      ];
    }
    
    // Monthly CT Simulator QA
    if (procedureType === 'monthly' && equipmentType === 'ct') {
      return [
        {
          id: 'system_warmup',
          title: 'System warm-up and calibration',
          description: 'Complete manufacturer-recommended warm-up sequence and air calibration.',
          correctPosition: 1,
          knowledgeConcept: 'equipment_startup',
          knowledgeDomain: 'quality-assurance'
        },
        {
          id: 'review_daily_qa',
          title: 'Review daily QA records',
          description: 'Check daily QA results from previous month for trends or issues.',
          correctPosition: 2,
          isOptional: true,
          knowledgeConcept: 'qa_documentation',
          knowledgeDomain: 'quality-assurance'
        },
        {
          id: 'phantom_setup',
          title: 'Position QA phantom and alignment',
          description: 'Place CT performance phantom on table and align with positioning lasers.',
          correctPosition: 3,
          knowledgeConcept: 'qa_workflow',
          knowledgeDomain: 'quality-assurance'
        },
        {
          id: 'scout_scan',
          title: 'Perform scout scan',
          description: 'Acquire scout image to verify phantom position and setup.',
          correctPosition: 4,
          knowledgeConcept: 'imaging_qa',
          knowledgeDomain: 'quality-assurance'
        },
        {
          id: 'hounsfield_check',
          title: 'Hounsfield unit calibration check',
          description: 'Scan phantom and measure HU values for water, air, and density inserts.',
          correctPosition: 5,
          knowledgeConcept: 'imaging_qa',
          knowledgeDomain: 'quality-assurance'
        },
        {
          id: 'noise_measurement',
          title: 'Image noise and uniformity assessment',
          description: 'Measure standard deviation in uniform regions of the phantom.',
          correctPosition: 6,
          knowledgeConcept: 'imaging_qa',
          knowledgeDomain: 'quality-assurance'
        },
        {
          id: 'spatial_resolution',
          title: 'Spatial resolution test',
          description: 'Evaluate high-contrast resolution using line pair sections of phantom.',
          correctPosition: 7,
          knowledgeConcept: 'imaging_qa',
          knowledgeDomain: 'quality-assurance'
        },
        {
          id: 'geometric_accuracy',
          title: 'Geometric accuracy verification',
          description: 'Measure known dimensions in phantom to verify spatial accuracy.',
          correctPosition: 8,
          knowledgeConcept: 'geometric_accuracy',
          knowledgeDomain: 'quality-assurance'
        },
        {
          id: 'laser_alignment',
          title: 'Laser alignment check',
          description: 'Verify alignment of all positioning lasers with phantom markers.',
          correctPosition: 9,
          knowledgeConcept: 'geometric_accuracy',
          knowledgeDomain: 'quality-assurance'
        },
        {
          id: 'documentation',
          title: 'Documentation and analysis',
          description: 'Record all measurements, compare to baselines, and note any deviations.',
          correctPosition: 10,
          knowledgeConcept: 'qa_documentation',
          knowledgeDomain: 'quality-assurance'
        },
        {
          id: 'corrective_action',
          title: 'Implement corrective actions if needed',
          description: 'Recalibrate or contact service based on results.',
          correctPosition: 11,
          isOptional: true,
          reasonIfSkipped: 'Only needed if issues are found.',
          knowledgeConcept: 'qa_workflow',
          knowledgeDomain: 'quality-assurance'
        },
      ];
    }
    
    // Default to a simplified generic QA procedure
    return [
      {
        id: 'startup',
        title: 'Equipment startup and calibration',
        description: 'Power on system and complete initialization sequence.',
        correctPosition: 1,
        knowledgeConcept: 'equipment_startup',
        knowledgeDomain: 'quality-assurance'
      },
      {
        id: 'safety',
        title: 'Safety checks and system interlocks',
        description: 'Verify all safety systems are functional.',
        correctPosition: 2,
        knowledgeConcept: 'safety_systems',
        knowledgeDomain: 'radiation-protection'
      },
      {
        id: 'mechanical',
        title: 'Mechanical checks',
        description: 'Verify all mechanical operations function correctly.',
        correctPosition: 3,
        knowledgeConcept: 'mechanical_qa',
        knowledgeDomain: 'quality-assurance'
      },
      {
        id: 'measurement',
        title: 'Core parameter measurements',
        description: 'Measure primary operating parameters against baseline.',
        correctPosition: 4,
        knowledgeConcept: 'output_calibration',
        knowledgeDomain: 'quality-assurance'
      },
      {
        id: 'documentation',
        title: 'Documentation and reporting',
        description: 'Record all results and complete QA documentation.',
        correctPosition: 5,
        knowledgeConcept: 'qa_documentation',
        knowledgeDomain: 'quality-assurance'
      }
    ];
  };
  
  // Get procedures based on type/equipment
  const procedureSteps = getProcedureSteps();
  
  // Generate title and description based on procedure/equipment type
  const getTitle = () => {
    return `${procedureType.charAt(0).toUpperCase() + procedureType.slice(1)} ${equipmentType.toUpperCase()} QA Procedure`;
  };
  
  const getDescription = () => {
    return `Establish the correct sequence for the ${procedureType} quality assurance procedure for the ${equipmentType.toUpperCase()} equipment. Include all required steps in the proper order.`;
  };
  
  // Handle completion of the challenge
  const handleCompletion = (results: ProcedureResults) => {
    // Determine grade based on results
    const grade = results.correctSequence && results.stepsMissed === 0 ? 'S' : 
                 results.correctSequence || results.stepsMissed <= 1 ? 'A' : 
                 results.stepsMissed <= 2 ? 'B' : 'C';
    
    // Add journal entry if journal exists
    if (hasJournal) {
      const conceptsLearned = Object.keys(results.knowledgeGained).map(concept => 
        `- ${concept.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`
      ).join('\n');
      
      addEntry({
        id: `qa-${procedureType}-${equipmentType}`,
        title: `${getTitle()} with ${character === 'jesse' ? 'Technician Jesse' : 'Dr. Kapoor'}`,
        date: new Date().toISOString(),
        content: `Completed ${getTitle()} QA sequence.\n\n` +
                `Order accuracy: ${results.correctSequence ? 'Correct' : 'Incorrect'}\n` +
                `Required steps missed: ${results.stepsMissed}\n` +
                `Optional steps completed: ${results.optionalStepsCompleted}\n\n` +
                `Key concepts reinforced:\n${conceptsLearned}\n\n` +
                `Total insight gained: ${results.insightGained}`,
        tags: ['qa', 'procedure', procedureType, equipmentType]
      });
    }
    
    // Complete the challenge in the challenge store
    completeChallenge(grade);
  };
  
  // Get appropriate procedure image
  const getProcedureImage = () => {
    if (equipmentType === 'linac') {
      return '/images/qa/linac-qa.png';
    } else if (equipmentType === 'ct') {
      return '/images/qa/ct-qa.png';
    }
    return undefined;
  };
  
  return (
    <ProceduralFormat
      character={character}
      title={getTitle()}
      description={getDescription()}
      procedureImage={getProcedureImage()}
      allSteps={procedureSteps}
      onComplete={handleCompletion}
    />
  );
}