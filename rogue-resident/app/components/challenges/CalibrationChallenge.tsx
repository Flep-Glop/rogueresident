// app/components/challenges/CalibrationChallenge.tsx
'use client';
import { useGameStore } from '../../store/gameStore';
import { useChallengeStore } from '../../store/challengeStore';
import { useJournalStore } from '../../store/journalStore';
import ConversationFormat, { InteractionResults } from './formats/ConversationFormat';
import { DialogueStage } from '../../hooks/useDialogueFlow';
import { CharacterId } from '../../types/challenge';

interface CalibrationChallengeProps {
  character: CharacterId;
}

export default function CalibrationChallenge({ character }: CalibrationChallengeProps) {
  const { currentNodeId } = useGameStore();
  const { completeChallenge } = useChallengeStore();
  const { 
    initializeJournal, 
    addKapoorReferenceSheets, 
    addKapoorAnnotatedNotes,
    addEntry,
    hasJournal 
  } = useJournalStore();
  
  // Handle completion of the challenge
  const handleCompletion = (results: InteractionResults) => {
    // Determine challenge grade based on results
    const grade = results.relationshipChange >= 3 ? 'S' : 
                  results.relationshipChange >= 1 ? 'A' : 
                  results.relationshipChange >= 0 ? 'B' : 'C';
                  
    // For the Kapoor challenge specifically, initialize journal
    if (character === 'kapoor' && !hasJournal) {
      // Initialize journal with the appropriate tier
      initializeJournal(results.journalTier);
      
      // Add special items based on journal tier
      if (results.journalTier === 'technical' || results.journalTier === 'annotated') {
        addKapoorReferenceSheets();
      }
      
      if (results.journalTier === 'annotated') {
        addKapoorAnnotatedNotes();
      }
      
      // Add first journal entry
      addEntry({
        id: 'kapoor-calibration',
        title: 'LINAC Calibration with Dr. Kapoor',
        date: new Date().toISOString(),
        content: `My first calibration session with Dr. Kapoor focused on output measurement. Key learnings:\n\n${
          results.knowledgeGained['electron_equilibrium_understood'] ? '- Electronic equilibrium principles for accurate dosimetry\n' : ''
        }${
          results.knowledgeGained['ptp_correction_understood'] ? '- Importance of PTP correction for daily measurements\n' : ''
        }${
          results.knowledgeGained['output_calibration_tolerance'] ? '- ±2% tolerance for clinical use\n' : ''
        }${
          results.knowledgeGained['clinical_dose_significance'] ? '- Clinical impact: 1% error on 70 Gy = 0.7 Gy difference\n' : ''
        }\nTotal insight gained: ${results.insightGained}`,
        tags: ['kapoor', 'calibration', 'linac', 'qa']
      });
    }
    
    // Complete the challenge in the challenge store
    completeChallenge(grade);
  };
  
  // Character-specific dialogue data
  const dialogueData: Record<CharacterId, DialogueStage[]> = {
    'kapoor': [
      // Core Dialogue Stages (directly from KapoorCalibration.tsx)
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
        isConclusion: true
      },
      
      // Branch A: Excellence conclusion (hidden until dynamically selected)
      {
        id: 'conclusion-excellence',
        text: "You've demonstrated an excellent understanding of output measurement principles. Your precision in terminology and calculations reflects the level of rigor required in our field.",
        contextNote: "Kapoor completes the final documentation with precise movements, then turns to address you directly.",
        isConclusion: true
      },
      
      // Branch C: Needs improvement conclusion (hidden until dynamically selected)
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
        isConclusion: true
      },
      
      // Backstory branch: PTP incident
      {
        id: 'backstory-ptp',
        text: "I once investigated an incident where this correction was applied incorrectly. The consequences for the patient were... significant. It's why I emphasize these details so strongly."
      },
      
      // Backstory branch: Overcalibration lesson
      {
        id: 'backstory-calibration',
        text: "Early in my career, I wasted considerable time recalibrating within tolerance. Dr. Chen, my director then, taught me that excessive adjustment introduces its own errors. A lesson worth learning sooner than I did."
      }
    ],
    'jesse': [
      // Placeholder for Jesse's dialogue (simplified for prototype)
      {
        id: 'intro',
        text: "Hey, glad you stopped by. Got a calibration run to do on LINAC 2. Not what you'd call thrilling stuff, but critical. Want to tag along?",
        options: [
          {
            id: 'accept',
            text: "I'd love to see your approach to calibration.",
            nextStageId: 'basics',
            insightGain: 5,
            relationshipChange: 1,
            responseText: "Cool. I've got a system. Not always by the book, but reliable. Kapoor would have a fit if he saw some of my shortcuts."
          }
        ]
      },
      {
        id: 'basics',
        text: "So, we need to check if this machine is spitting out exactly what we tell it to. Got our chamber ready with the buildup cap. Why do we need this cap again?",
        isConclusion: true
      }
    ],
    'quinn': [
      // Placeholder for Quinn's dialogue (simplified for prototype)
      {
        id: 'intro',
        text: "Oh! You're just in time! I've been modifying this standard calibration setup to test my quantum interference theory. Want to see if it works?",
        isConclusion: true
      }
    ],
    'garcia': [] // Placeholder
  };
  
  return (
    <ConversationFormat
      character={character}
      dialogueStages={dialogueData[character] || dialogueData.kapoor}
      onComplete={handleCompletion}
    />
  );
}