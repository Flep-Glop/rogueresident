// app/components/challenges/EquipmentInteractiveChallenge.tsx
'use client';
import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useChallengeStore } from '../../store/challengeStore';
import { useJournalStore } from '../../store/journalStore';
import InteractiveFormat, { 
  InteractiveEquipment, 
  InteractiveStep,
  InteractiveResults
} from './formats/InteractiveFormat';
import { CharacterId, InteractiveEquipmentType } from '../../types/challenge';
import { SoundEffect } from '../../types/audio';

interface EquipmentInteractiveChallengeProps {
  character: CharacterId;
  equipmentType?: InteractiveEquipmentType; // Updated to use InteractiveEquipmentType
}

export default function EquipmentInteractiveChallenge({
  character = 'jesse',
  equipmentType = 'ionization_chamber'
}: EquipmentInteractiveChallengeProps) {
  const { currentNodeId } = useGameStore();
  const { completeChallenge } = useChallengeStore();
  const { addEntry, hasJournal } = useJournalStore();
  
  // Generate challenge content based on equipment type
  const getEquipmentData = (): { 
    equipment: InteractiveEquipment,
    steps: InteractiveStep[],
    conceptMap: Record<string, string>,
    domainMap: Record<string, string>,
    title: string,
    description: string
  } => {
    // Ionization Chamber Challenge
    if (equipmentType === 'ionization_chamber') {
      return {
        title: "Farmer Chamber Setup",
        description: "Set up the Farmer-type ionization chamber for reference dosimetry measurements. Follow the steps carefully to ensure accurate readings.",
        equipment: {
          id: "farmer_chamber",
          name: "Farmer Ionization Chamber",
          image: "/images/equipment/farmer-chamber-setup.png",
          interactiveAreas: [
            {
              id: "chamber_body",
              name: "Chamber Body",
              description: "The main sensitive volume of the chamber",
              x: 35,
              y: 45,
              width: 25,
              height: 10,
              requiredAction: "Select chamber body"
            },
            {
              id: "buildup_cap",
              name: "Buildup Cap",
              description: "PMMA cap for electron equilibrium",
              x: 65,
              y: 30,
              width: 15,
              height: 15,
              requiredAction: "Attach buildup cap"
            },
            {
              id: "triaxial_cable",
              name: "Triaxial Cable",
              description: "Low-noise triaxial connector cable",
              x: 20,
              y: 50,
              width: 12,
              height: 10,
              requiredAction: "Connect cable"
            },
            {
              id: "phantom_position",
              name: "Phantom Position",
              description: "Water-equivalent phantom for measurement",
              x: 40,
              y: 65,
              width: 25,
              height: 20,
              requiredAction: "Position in phantom"
            },
            {
              id: "electrometer",
              name: "Electrometer",
              description: "Device for reading chamber output",
              x: 10,
              y: 20,
              width: 20,
              height: 15,
              requiredAction: "Connect to electrometer"
            },
            {
              id: "laser_alignment",
              name: "Alignment Lasers",
              description: "Position verification using room lasers",
              x: 75,
              y: 55,
              width: 15,
              height: 15,
              requiredAction: "Verify alignment"
            }
          ]
        },
        steps: [
          {
            id: "zero_electrometer",
            instruction: "Zero the electrometer",
            detail: "Before connecting the chamber, ensure the electrometer is zeroed to establish baseline.",
            requiredAreaIds: ["electrometer"],
            completionMessage: "Electrometer successfully zeroed."
          },
          {
            id: "prepare_chamber",
            instruction: "Prepare the chamber for measurement",
            detail: "Inspect the chamber for any damage and ensure it's clean.",
            requiredAreaIds: ["chamber_body"],
            completionMessage: "Chamber inspected and ready."
          },
          {
            id: "connect_cable",
            instruction: "Connect the triaxial cable",
            detail: "Ensure a secure connection between chamber and cable, avoiding any tension or strain.",
            requiredAreaIds: ["triaxial_cable", "chamber_body"],
            completionMessage: "Cable properly connected to chamber."
          },
          {
            id: "connect_electrometer",
            instruction: "Connect chamber to electrometer",
            detail: "Connect the other end of the triaxial cable to the electrometer input.",
            requiredAreaIds: ["electrometer", "triaxial_cable"],
            completionMessage: "Chamber successfully connected to electrometer."
          },
          {
            id: "position_phantom",
            instruction: "Position the chamber in the phantom",
            detail: "Place the chamber in the phantom at the correct measurement depth.",
            requiredAreaIds: ["phantom_position", "chamber_body"],
            completionMessage: "Chamber correctly positioned in phantom."
          },
          {
            id: "attach_buildup",
            instruction: "Attach appropriate buildup cap",
            detail: "Select and attach the correct buildup cap for the measurement energy.",
            requiredAreaIds: ["buildup_cap", "chamber_body"],
            completionMessage: "Appropriate buildup cap attached."
          },
          {
            id: "verify_position",
            instruction: "Verify position with alignment lasers",
            detail: "Use the room lasers to confirm proper positioning at isocenter.",
            requiredAreaIds: ["laser_alignment", "phantom_position"],
            completionMessage: "Chamber position verified at isocenter."
          }
        ],
        conceptMap: {
          "zero_electrometer": "electrometer_operation",
          "prepare_chamber": "chamber_inspection",
          "connect_cable": "signal_integrity",
          "connect_electrometer": "measurement_setup",
          "position_phantom": "reference_dosimetry",
          "attach_buildup": "electron_equilibrium",
          "verify_position": "geometric_accuracy"
        },
        domainMap: {
          "electrometer_operation": "quality-assurance",
          "chamber_inspection": "quality-assurance",
          "signal_integrity": "technical",
          "measurement_setup": "quality-assurance",
          "reference_dosimetry": "radiation-physics",
          "electron_equilibrium": "radiation-physics",
          "geometric_accuracy": "quality-assurance"
        }
      };
    }
    
    // LINAC Console Challenge
    if (equipmentType === 'linac_console') {
      return {
        title: "LINAC Treatment Console Operation",
        description: "Set up and operate the LINAC treatment console for a standard treatment field. Follow the correct sequence to safely deliver the treatment.",
        equipment: {
          id: "linac_console",
          name: "LINAC Treatment Console",
          image: "/images/equipment/linac-console.png",
          interactiveAreas: [
            {
              id: "machine_select",
              name: "Machine Selection",
              description: "Select the appropriate treatment machine",
              x: 10,
              y: 10,
              width: 15,
              height: 10,
              requiredAction: "Select machine"
            },
            {
              id: "patient_id",
              name: "Patient ID Verification",
              description: "Verify patient identity in system",
              x: 30,
              y: 10,
              width: 25,
              height: 12,
              requiredAction: "Verify patient ID"
            },
            {
              id: "treatment_plan",
              name: "Treatment Plan Selection",
              description: "Load the prescribed treatment plan",
              x: 60,
              y: 10,
              width: 25,
              height: 12,
              requiredAction: "Load treatment plan"
            },
            {
              id: "imaging_setup",
              name: "Imaging Settings",
              description: "Configure imaging parameters",
              x: 15,
              y: 30,
              width: 20,
              height: 15,
              requiredAction: "Configure imaging"
            },
            {
              id: "couch_controls",
              name: "Couch Position Controls",
              description: "Controls for patient positioning",
              x: 40,
              y: 30,
              width: 20,
              height: 15,
              requiredAction: "Adjust couch position"
            },
            {
              id: "beam_parameters",
              name: "Beam Parameters",
              description: "Energy, dose rate, and field settings",
              x: 65,
              y: 30,
              width: 20,
              height: 15,
              requiredAction: "Set beam parameters"
            },
            {
              id: "imaging_review",
              name: "Image Review",
              description: "Review and approve positioning images",
              x: 20,
              y: 55,
              width: 25,
              height: 20,
              requiredAction: "Review images"
            },
            {
              id: "treatment_delivery",
              name: "Treatment Delivery",
              description: "Beam-on controls and monitoring",
              x: 55,
              y: 55,
              width: 25,
              height: 20,
              requiredAction: "Deliver treatment"
            },
            {
              id: "safety_controls",
              name: "Safety Interlocks",
              description: "System safety status indicators",
              x: 85,
              y: 20,
              width: 12,
              height: 25,
              requiredAction: "Verify safety status"
            }
          ]
        },
        steps: [
          {
            id: "select_machine",
            instruction: "Select the appropriate treatment machine",
            detail: "Choose the correct LINAC for the scheduled treatment.",
            requiredAreaIds: ["machine_select"],
            completionMessage: "Machine successfully selected."
          },
          {
            id: "verify_patient",
            instruction: "Verify patient identity",
            detail: "Confirm patient information matches the treatment record.",
            requiredAreaIds: ["patient_id"],
            completionMessage: "Patient identity verified."
          },
          {
            id: "load_plan",
            instruction: "Load the treatment plan",
            detail: "Select and load the approved treatment plan from the system.",
            requiredAreaIds: ["treatment_plan"],
            completionMessage: "Treatment plan loaded successfully."
          },
          {
            id: "check_safety",
            instruction: "Check safety interlocks",
            detail: "Verify all system safety indicators show ready status.",
            requiredAreaIds: ["safety_controls"],
            completionMessage: "All safety systems operational."
          },
          {
            id: "position_patient",
            instruction: "Position patient using couch controls",
            detail: "Adjust the treatment couch to initial setup position.",
            requiredAreaIds: ["couch_controls"],
            completionMessage: "Patient positioned at initial setup coordinates."
          },
          {
            id: "setup_imaging",
            instruction: "Configure imaging parameters",
            detail: "Set up the appropriate imaging protocol for position verification.",
            requiredAreaIds: ["imaging_setup"],
            completionMessage: "Imaging parameters configured."
          },
          {
            id: "acquire_review_images",
            instruction: "Acquire and review positioning images",
            detail: "Take positioning images and verify patient alignment.",
            requiredAreaIds: ["imaging_review"],
            completionMessage: "Position verification images acquired and reviewed."
          },
          {
            id: "adjust_position",
            instruction: "Make final position adjustments",
            detail: "Apply any needed shifts based on imaging review.",
            requiredAreaIds: ["couch_controls", "imaging_review"],
            completionMessage: "Final position adjustments applied."
          },
          {
            id: "configure_beam",
            instruction: "Configure treatment beam parameters",
            detail: "Set energy, dose rate, and field parameters as specified in the plan.",
            requiredAreaIds: ["beam_parameters"],
            completionMessage: "Beam parameters configured according to plan."
          },
          {
            id: "deliver_treatment",
            instruction: "Deliver the treatment",
            detail: "Initiate beam delivery and monitor throughout treatment.",
            requiredAreaIds: ["treatment_delivery"],
            completionMessage: "Treatment delivered successfully."
          }
        ],
        conceptMap: {
          "select_machine": "treatment_workflow",
          "verify_patient": "patient_safety",
          "load_plan": "treatment_workflow",
          "check_safety": "safety_systems",
          "position_patient": "patient_positioning",
          "setup_imaging": "imaging_protocols",
          "acquire_review_images": "image_guidance",
          "adjust_position": "patient_positioning",
          "configure_beam": "treatment_delivery",
          "deliver_treatment": "treatment_delivery"
        },
        domainMap: {
          "treatment_workflow": "clinical-practice",
          "patient_safety": "radiation-protection",
          "safety_systems": "radiation-protection",
          "patient_positioning": "clinical-practice",
          "imaging_protocols": "quality-assurance",
          "image_guidance": "clinical-practice",
          "treatment_delivery": "clinical-practice"
        }
      };
    }
    
    // Default to patient positioning
    return {
      title: "Patient Positioning Protocol",
      description: "Position a patient for a standard treatment, following proper protocol for safety and accuracy.",
      equipment: {
        id: "patient_positioning",
        name: "Treatment Room Setup",
        image: "/images/equipment/patient-positioning.png",
        interactiveAreas: [
          {
            id: "chart_review",
            name: "Patient Chart",
            description: "Patient treatment documentation",
            x: 10,
            y: 10,
            width: 15,
            height: 12,
            requiredAction: "Review chart"
          },
          {
            id: "patient_identification",
            name: "Patient ID",
            description: "Patient identification verification",
            x: 30,
            y: 10,
            width: 15,
            height: 12,
            requiredAction: "Verify ID"
          },
          {
            id: "immobilization",
            name: "Immobilization Devices",
            description: "Treatment-specific immobilization",
            x: 55,
            y: 25,
            width: 20,
            height: 15,
            requiredAction: "Set up immobilization"
          },
          {
            id: "couch_setup",
            name: "Treatment Couch",
            description: "Patient support system",
            x: 40,
            y: 45,
            width: 30,
            height: 20,
            requiredAction: "Adjust couch"
          },
          {
            id: "alignment_marks",
            name: "Alignment Marks",
            description: "Tattoos or other positioning guides",
            x: 45,
            y: 70,
            width: 15,
            height: 10,
            requiredAction: "Align to marks"
          },
          {
            id: "laser_system",
            name: "Room Lasers",
            description: "Positioning laser system",
            x: 75,
            y: 40,
            width: 15,
            height: 15,
            requiredAction: "Use lasers"
          },
          {
            id: "imaging_panel",
            name: "Imaging Panel",
            description: "Controls for verification imaging",
            x: 15,
            y: 40,
            width: 15,
            height: 15,
            requiredAction: "Perform imaging"
          }
        ]
      },
      steps: [
        {
          id: "review_documentation",
          instruction: "Review treatment chart and documentation",
          detail: "Verify treatment site, prescription, and positioning instructions.",
          requiredAreaIds: ["chart_review"],
          completionMessage: "Documentation review complete."
        },
        {
          id: "verify_identity",
          instruction: "Verify patient identity",
          detail: "Confirm patient identity using at least two identifiers.",
          requiredAreaIds: ["patient_identification"],
          completionMessage: "Patient identity verified."
        },
        {
          id: "prepare_immobilization",
          instruction: "Prepare immobilization devices",
          detail: "Set up the appropriate immobilization devices for this patient's treatment.",
          requiredAreaIds: ["immobilization"],
          completionMessage: "Immobilization devices prepared."
        },
        {
          id: "initial_positioning",
          instruction: "Position patient on treatment couch",
          detail: "Help patient onto couch and into approximate treatment position.",
          requiredAreaIds: ["couch_setup"],
          completionMessage: "Patient initially positioned on couch."
        },
        {
          id: "align_to_marks",
          instruction: "Align to reference marks",
          detail: "Align patient using tattoos or other reference marks.",
          requiredAreaIds: ["alignment_marks"],
          completionMessage: "Initial alignment to reference marks complete."
        },
        {
          id: "laser_alignment",
          instruction: "Fine-tune position using room lasers",
          detail: "Use room lasers to precisely align the patient to treatment isocenter.",
          requiredAreaIds: ["laser_system", "alignment_marks"],
          completionMessage: "Laser alignment complete."
        },
        {
          id: "verification_imaging",
          instruction: "Perform verification imaging",
          detail: "Acquire images to verify positioning accuracy.",
          requiredAreaIds: ["imaging_panel"],
          completionMessage: "Verification images acquired."
        },
        {
          id: "position_adjustment",
          instruction: "Make final position adjustments",
          detail: "Based on imaging results, make any necessary position corrections.",
          requiredAreaIds: ["couch_setup", "laser_system"],
          completionMessage: "Final position adjustments complete."
        }
      ],
      conceptMap: {
        "review_documentation": "treatment_workflow",
        "verify_identity": "patient_safety",
        "prepare_immobilization": "patient_positioning",
        "initial_positioning": "patient_positioning",
        "align_to_marks": "geometric_accuracy",
        "laser_alignment": "geometric_accuracy",
        "verification_imaging": "image_guidance",
        "position_adjustment": "patient_positioning"
      },
      domainMap: {
        "treatment_workflow": "clinical-practice",
        "patient_safety": "radiation-protection",
        "patient_positioning": "clinical-practice",
        "geometric_accuracy": "quality-assurance",
        "image_guidance": "clinical-practice"
      }
    };
  };
  
  // Get challenge data
  const { 
    equipment, 
    steps, 
    conceptMap, 
    domainMap, 
    title, 
    description 
  } = getEquipmentData();
  
  // Handle completion
  const handleCompletion = (results: InteractiveResults) => {
    // Determine grade based on results
    const grade = results.mistakesMade === 0 ? 'S' : 
                 results.mistakesMade <= 2 ? 'A' : 
                 results.mistakesMade <= 4 ? 'B' : 'C';
    
    // Add journal entry if journal exists
    if (hasJournal) {
      const conceptsLearned = Object.keys(results.knowledgeGained).map(concept => 
        `- ${concept.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`
      ).join('\n');
      
      addEntry({
        id: `interactive-${equipmentType}`,
        title: `${title} with ${character === 'jesse' ? 'Technician Jesse' : character === 'quinn' ? 'Dr. Quinn' : 'Dr. Kapoor'}`,
        date: new Date().toISOString(),
        content: `Completed interactive ${title} procedure.\n\n` +
                `Steps completed: ${results.completedSteps}/${results.totalSteps}\n` +
                `Mistakes made: ${results.mistakesMade}\n` +
                `Time spent: ${results.timeSpent} seconds\n\n` +
                `Key concepts reinforced:\n${conceptsLearned}\n\n` +
                `Total insight gained: ${results.insightGained}`,
        tags: ['interactive', 'equipment', equipmentType]
      });
    }
    
    // Complete the challenge
    completeChallenge(grade);
  };
  
  return (
    <InteractiveFormat
      character={character}
      title={title}
      description={description}
      equipment={equipment}
      steps={steps}
      conceptMap={conceptMap}
      domainMap={domainMap}
      onComplete={handleCompletion}
    />
  );
}