// app/components/challenges/EquipmentQAChallenge.tsx
'use client';
import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useChallengeStore } from '../../store/challengeStore';
import { useJournalStore } from '../../store/journalStore';
import ConversationFormat, { InteractionResults } from './formats/ConversationFormat';
import { DialogueStage } from '../../hooks/useDialogueFlow';
import { CharacterId, BaseEquipmentType } from '../../types/challenge';

interface EquipmentQAChallengeProps {
  character: CharacterId;
  equipmentType?: BaseEquipmentType; // Updated to use BaseEquipmentType
}

// QA procedures by equipment type
const qaProceduces = {
  linac: {
    title: "LINAC Daily QA",
    intro: "Time for the daily checks on LINAC 3. This machine's been acting up lately, so we need to be extra thorough.",
    steps: [
      "Output constancy check",
      "Laser alignment verification",
      "MLC pattern test",
      "Imaging system calibration"
    ]
  },
  ct: {
    title: "CT Simulator QA",
    intro: "The CT sim needs its monthly checks. Last week we had some HU inconsistencies, so keep an eye out for that.",
    steps: [
      "HU calibration verification",
      "Geometric accuracy check",
      "Image noise analysis",
      "Laser alignment verification"
    ]
  },
  dosimetry: {
    title: "Dosimetry Equipment Check",
    intro: "Time to check the calibration on our dosimetry gear. Big treatment planning session tomorrow, so everything needs to be perfect.",
    steps: [
      "Electrometer baseline reading",
      "Chamber cross-calibration",
      "Temperature and pressure correction verification",
      "Cable integrity check"
    ]
  },
  brachytherapy: { // Adding the missing equipment type
    title: "Brachytherapy QA",
    intro: "We need to check the brachytherapy afterloader before tomorrow's treatments. Safety is absolutely critical here.",
    steps: [
      "Source position verification",
      "Timer accuracy check",
      "Emergency retraction test",
      "Transfer tube integrity verification"
    ]
  }
};

export default function EquipmentQAChallenge({ character, equipmentType = 'linac' }: EquipmentQAChallengeProps) {
  const { currentNodeId } = useGameStore();
  const { completeChallenge } = useChallengeStore();
  const { addEntry, hasJournal } = useJournalStore();
  
  // Track the QA concepts that were mastered during this challenge
  const [masteredConcepts, setMasteredConcepts] = useState({
    'qa_procedure_understanding': false,
    'equipment_troubleshooting': false,
    'measurement_accuracy': false,
    'tolerance_limits': false
  });
  
  // Get procedure data based on equipment type, with fallback
  const procedure = qaProceduces[equipmentType] || qaProceduces.linac;
  
  // Handle completion of the challenge
  const handleCompletion = (results: InteractionResults) => {
    // Determine grade based on results
    const grade = results.relationshipChange >= 3 ? 'S' : 
                 results.relationshipChange >= 1 ? 'A' : 
                 results.relationshipChange >= 0 ? 'B' : 'C';
    
    // Add journal entry if journal exists
    if (hasJournal) {
      addEntry({
        id: `qa-${equipmentType}`,
        title: `${procedure.title} with Technician Jesse`,
        date: new Date().toISOString(),
        content: `QA session focusing on ${procedure.title}.\n\nProcedure followed:\n${
          procedure.steps.map(step => `- ${step}\n`).join('')
        }\nKey insights:\n${
          results.knowledgeGained['qa_procedure_understanding'] ? '- Optimized QA workflow sequence\n' : ''
        }${
          results.knowledgeGained['equipment_troubleshooting'] ? '- Practical troubleshooting approaches\n' : ''
        }${
          results.knowledgeGained['measurement_accuracy'] ? '- Techniques for measurement precision\n' : ''
        }${
          results.knowledgeGained['tolerance_limits'] ? '- Acceptable tolerance ranges\n' : ''
        }\nTotal insight gained: ${results.insightGained}`,
        tags: ['qa', 'equipment', equipmentType]
      });
    }
    
    // Complete the challenge in the challenge store
    completeChallenge(grade);
  };
  
  // Generate dialogue stages based on equipment type
  const generateDialogueStages = (): DialogueStage[] => {
    const stages: DialogueStage[] = [
      // Introduction stage with Jesse's practical approach
      {
        id: 'intro',
        text: procedure.intro,
        contextNote: "Jesse is already setting up the equipment as you arrive.",
        equipment: {
          itemId: equipmentType === 'linac' ? 'linac' : equipmentType === 'ct' ? 'ct-scanner' : 'dosimeter',
          alt: procedure.title,
          description: `Equipment for ${procedure.title}`
        },
        options: [
          { 
            id: "practical-intro",
            text: "Let me help you set up. What specific issues should we watch for?", 
            nextStageId: 'step1',
            approach: 'humble',
            insightGain: 10,
            relationshipChange: 2,
            responseText: "I like your hands-on approach! Yeah, grab that phantom while I fire up the system. The trick with this unit is to let it warm up properly before the first measurement."
          },
          { 
            id: "protocol-intro",
            text: "I've reviewed the protocol. Let's follow the standard procedure.", 
            nextStageId: 'step1',
            approach: 'precision',
            insightGain: 5,
            relationshipChange: 0,
            responseText: "Protocols are good starting points, sure, but with equipment this temperamental you've gotta develop a feel for it. Let me show you some tricks they don't teach in the manuals."
          }
        ]
      }
    ];
    
    // Generate steps for the QA procedure
    procedure.steps.forEach((step, index) => {
      const stepStage: DialogueStage = {
        id: `step${index + 1}`,
        text: `Now we need to perform the ${step}. ${getStepQuestion(step)}`,
        contextNote: `Jesse efficiently manipulates the equipment.`,
        options: getStepOptions(step, index, procedure.steps.length)
      };
      
      stages.push(stepStage);
    });
    
    // Add troubleshooting scenario
    stages.push({
      id: 'troubleshooting',
      text: `Huh, that's odd. We're seeing a 2.5% deviation here. Based on what you've observed so far, what's your first move?`,
      contextNote: `Jesse frowns at the reading, tapping the display.`,
      options: [
        { 
          id: "practical-solution",
          text: "Let's check the connections and reset the equipment before retesting.", 
          nextStageId: 'conclusion',
          approach: 'humble',
          insightGain: 15,
          relationshipChange: 1,
          knowledgeGain: { 
            conceptId: 'equipment_troubleshooting',
            domainId: 'quality-assurance',
            amount: 20
          },
          responseText: "Good call! Simple fixes first, always. *Jesse reconnects a cable* Look at that - back within tolerance. You'd be surprised how often it's just a loose connection."
        },
        { 
          id: "theoretical-solution",
          text: "Let's analyze the error pattern to identify the systematic source.", 
          nextStageId: 'conclusion',
          approach: 'precision',
          insightGain: 10,
          relationshipChange: 0,
          knowledgeGain: { 
            conceptId: 'equipment_troubleshooting',
            domainId: 'quality-assurance',
            amount: 10
          },
          responseText: "That's the physicist approach! Not wrong, but sometimes overthinking it. *Jesse jostles a cable* See? Fixed it. When you've been doing this long enough, you develop an intuition for these machines."
        },
        { 
          id: "procedure-solution",
          text: "We should document this deviation and consult the equipment manual.", 
          nextStageId: 'conclusion',
          approach: 'confidence',
          insightGain: 5,
          relationshipChange: -1,
          responseText: "Technically correct but inefficient. Let me show you a faster approach. *Jesse quickly checks connections* Fixed! When you've got patients waiting, you need to balance thoroughness with practicality."
        }
      ]
    });
    
    // Add conclusion stage
    stages.push({
      id: 'conclusion',
      text: `And we're done! That's how you run a proper QA check - part science, part art, all about developing a feel for the equipment. Keep working with me and you'll learn all the shortcuts that actually work.`,
      contextNote: `Jesse makes a few quick notes in the logbook.`,
      isConclusion: true
    });
    
    // Add excellent conclusion branch
    stages.push({
      id: 'conclusion-excellence',
      text: `You've got good instincts! Most residents are all theory and no practice, but you seem to understand that these machines have personalities. You'll make a solid physicist - one who can actually fix things instead of just calling for service.`,
      contextNote: `Jesse looks impressed as he completes the documentation.`,
      isConclusion: true
    });
    
    // Add needs improvement conclusion
    stages.push({
      id: 'conclusion-needs-improvement',
      text: `Look, the theory stuff is important, but out here in the real world, you've gotta get your hands dirty. Maybe spend some more time in the equipment room before our next session. Reading manuals only gets you so far.`,
      contextNote: `Jesse finishes the procedure himself with practiced efficiency.`,
      isConclusion: true
    });
    
    return stages;
  };
  
  // Helper to generate step-specific questions
  const getStepQuestion = (step: string): string => {
    if (step.includes("Output")) {
      return "What tolerance limit should we apply for this check?";
    } else if (step.includes("Laser")) {
      return "How would you verify the accuracy of the alignment?";
    } else if (step.includes("MLC")) {
      return "What pattern is most effective for detecting MLC positioning errors?";
    } else if (step.includes("calibration")) {
      return "What baseline should we use for comparison?";
    } else if (step.includes("HU")) {
      return "What materials should we include in our calibration check?";
    } else if (step.includes("noise")) {
      return "How do we quantify acceptable noise levels?";
    } else if (step.includes("Electrometer")) {
      return "What's the proper zero adjustment procedure?";
    } else {
      return "What's the best approach for this step?";
    }
  };
  
  // Helper to generate step-specific options
  const getStepOptions = (step: string, index: number, totalSteps: number): any[] => {
    const nextStageId = index < totalSteps - 1 ? `step${index + 2}` : 'troubleshooting';
    
    // Base options that change based on the step
    const options = [
      { 
        id: `correct-${index}`,
        text: getCorrectAnswer(step), 
        nextStageId,
        approach: 'precision',
        insightGain: 15,
        relationshipChange: 1,
        knowledgeGain: { 
          conceptId: index % 2 === 0 ? 'qa_procedure_understanding' : 'measurement_accuracy',
          domainId: 'quality-assurance',
          amount: 15
        },
        responseText: `That's right! ${getPositiveFeedback(step)}`
      },
      { 
        id: `practical-${index}`,
        text: getPracticalAnswer(step), 
        nextStageId,
        approach: 'humble',
        insightGain: 10,
        relationshipChange: 1,
        responseText: `Good thinking. ${getPracticalFeedback(step)}`
      },
      { 
        id: `incorrect-${index}`,
        text: getIncorrectAnswer(step), 
        nextStageId,
        approach: 'confidence',
        insightGain: 5,
        relationshipChange: -1,
        responseText: `Not quite. ${getNegativeFeedback(step)}`
      }
    ];
    
    return options;
  };
  
  // Step-specific correct answers
  const getCorrectAnswer = (step: string): string => {
    if (step.includes("Output")) {
      return "±2% for daily checks, with investigation required above 1.5%.";
    } else if (step.includes("Laser")) {
      return "Check against the room's calibrated crosshairs at multiple points.";
    } else if (step.includes("MLC")) {
      return "The interdigitated picket fence pattern will reveal subtle positioning errors.";
    } else if (step.includes("Imaging")) {
      return "Compare against the gold standard phantom with known geometric markers.";
    } else if (step.includes("HU")) {
      return "We need water, bone, lung, and soft tissue equivalent materials.";
    } else if (step.includes("noise")) {
      return "Calculate the standard deviation in the uniform water region.";
    } else if (step.includes("Electrometer")) {
      return "Allow 15-minute warmup, then zero in open circuit mode before connecting.";
    } else {
      return "Follow the established protocol while watching for equipment-specific issues.";
    }
  };
  
  // Step-specific practical answers
  const getPracticalAnswer = (step: string): string => {
    if (step.includes("Output")) {
      return "Let me check our historical values to get a feel for this machine's typical range.";
    } else if (step.includes("Laser")) {
      return "I'll use the wall markers we've verified previously as a quick check.";
    } else {
      return "Let me try a few quick tests to get a baseline before we do the full procedure.";
    }
  };
  
  // Step-specific incorrect answers
  const getIncorrectAnswer = (step: string): string => {
    if (step.includes("Output")) {
      return "±5% is the standard clinical tolerance.";
    } else if (step.includes("Laser")) {
      return "Visual inspection should be sufficient for daily QA.";
    } else if (step.includes("MLC")) {
      return "We should use a simple open field test to verify MLC function.";
    } else {
      return "We should strictly follow the manufacturer's guidelines without deviation.";
    }
  };
  
  // Feedback responses
  const getPositiveFeedback = (step: string): string => {
    if (step.includes("Output")) {
      return "Those tight tolerances are critical - a small daily drift can become a major clinical issue if unchecked.";
    } else if (step.includes("Laser")) {
      return "Multiple checkpoints catch rotational errors that a single point might miss.";
    } else if (step.includes("MLC")) {
      return "That pattern really does show the subtle errors that matter clinically, especially for IMRT.";
    } else {
      return "You've got a solid grasp on the technical requirements here.";
    }
  };
  
  const getPracticalFeedback = (step: string): string => {
    return "That's the kind of practical thinking that helps in the real world. Now let's make sure we also meet the protocol requirements.";
  };
  
  const getNegativeFeedback = (step: string): string => {
    if (step.includes("Output")) {
      return "That's way too loose for clinical work. We'd miss significant output drift at ±5%.";
    } else if (step.includes("Laser")) {
      return "Visual inspection alone isn't quantitative enough for proper QA.";
    } else {
      return "That approach would miss the specific issues we need to catch during QA.";
    }
  };
  
  // Generate the dialogue stages
  const dialogueStages = generateDialogueStages();
  
  return (
    <ConversationFormat
      character="jesse"
      dialogueStages={dialogueStages}
      onComplete={handleCompletion}
    />
  );
}