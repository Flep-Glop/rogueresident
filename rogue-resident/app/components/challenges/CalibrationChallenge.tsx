// app/components/challenges/CalibrationChallenge.tsx
'use client';
import { useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useChallengeStore } from '../../store/challengeStore';
import { useJournalStore } from '../../store/journalStore';
import ConversationFormat, { InteractionResults } from './formats/ConversationFormat';
import { DialogueStage } from '../../hooks/useDialogueFlow';
import { CharacterId } from '../../types/challenge';
import { 
  useEventBus, 
  GameEventType, 
  journalAcquired, 
  knowledgeGained, 
  nodeCompleted 
} from '../../core/events/CentralEventBus';

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
  
  // Track if journal acquisition was triggered
  const journalAcquisitionAttempted = useRef(false);
  
  // Subscribe to journal acquisition events
  useEffect(() => {
    // Set up listener for journal acquisition events
    const unsubscribe = useEventBus.getState().subscribe<GameEventType.JOURNAL_ACQUIRED>(
      GameEventType.JOURNAL_ACQUIRED,
      (event) => {
        const { tier, character: sourceCharacter, source } = event.payload;
        
        console.log(`[JOURNAL] Acquisition event received: ${tier} from ${sourceCharacter} (source: ${source})`);
        
        // Track that we attempted journal acquisition
        journalAcquisitionAttempted.current = true;
        
        // Only process if this is the journal-giving character (Kapoor) and we don't have a journal yet
        if (sourceCharacter === 'kapoor' && !hasJournal) {
          // Initialize journal with the appropriate tier
          initializeJournal(tier);
          
          // Add special items based on journal tier
          if (tier === 'technical' || tier === 'annotated') {
            addKapoorReferenceSheets();
          }
          
          if (tier === 'annotated') {
            addKapoorAnnotatedNotes();
          }
          
          // Add first journal entry
          addEntry({
            id: 'kapoor-calibration',
            title: 'LINAC Calibration with Dr. Kapoor',
            date: new Date().toISOString(),
            content: `My first calibration session with Dr. Kapoor focused on output measurement. Key learnings include understanding electronic equilibrium principles, the importance of PTP correction, and maintaining proper tolerance during calibration.`,
            tags: ['kapoor', 'calibration', 'linac', 'qa']
          });
          
          console.log(`[JOURNAL] Journal initialized with tier: ${tier}`);
          
          // Log successful acquisition through the event system
          useEventBus.getState().dispatch(
            GameEventType.UI_JOURNAL_OPENED,
            {
              initial: true,
              tier,
              characterSource: sourceCharacter
            }
          );
        }
      }
    );
    
    // Cleanup subscription
    return () => unsubscribe();
  }, [
    initializeJournal, addKapoorReferenceSheets, 
    addKapoorAnnotatedNotes, addEntry, hasJournal
  ]);
  
  // Additional safety check on unmount - ensure journal was acquired for Kapoor
  useEffect(() => {
    return () => {
      // If this was Kapoor, check one last time for journal acquisition
      if (character === 'kapoor' && journalAcquisitionAttempted.current && !hasJournal) {
        console.warn('[PROGRESSION] Critical item missing: Journal not acquired after Kapoor challenge unmount');
        
        // Force journal acquisition as a last resort
        journalAcquired(
          'base',
          character,
          'progression_unmount_repair',
          true
        );
        
        // Attempt direct journal initialization
        setTimeout(() => {
          if (!useJournalStore.getState().hasJournal) {
            console.error('[PROGRESSION] Emergency journal repair via direct initialization');
            useJournalStore.getState().initializeJournal('base');
          }
        }, 500);
      }
    };
  }, [character, hasJournal]);
  
  // Handle completion of the challenge
  const handleCompletion = (results: InteractionResults) => {
    // Determine challenge grade based on results
    const grade = results.relationshipChange >= 3 ? 'S' : 
                  results.relationshipChange >= 1 ? 'A' : 
                  results.relationshipChange >= 0 ? 'B' : 'C';
                  
    // For the Kapoor challenge specifically, trigger journal acquisition event
    if (character === 'kapoor') {
      // Track that we attempted journal acquisition
      journalAcquisitionAttempted.current = true;
      
      // Use new event system for journal acquisition
      journalAcquired(
        results.journalTier || 'base',
        character,
        'challenge_completion'
      );
      
      // Run critical progression safety check
      setTimeout(() => {
        if (!hasJournal) {
          console.warn('[PROGRESSION] Critical item missing: Journal not acquired after Kapoor challenge');
          
          // Force journal acquisition as a last resort
          journalAcquired(
            'base',
            character,
            'progression_repair',
            true
          );
          
          // Attempt direct journal initialization
          setTimeout(() => {
            if (!useJournalStore.getState().hasJournal) {
              console.error('[PROGRESSION] Emergency journal repair via direct initialization');
              useJournalStore.getState().initializeJournal('base');
            }
          }, 300);
        }
      }, 500);
    }
    
    // Log critical concept mastery data
    if (currentNodeId) {
      // Use new event system for knowledge gain
      Object.entries(results.knowledgeGained).forEach(([conceptId, amount]) => {
        knowledgeGained(
          conceptId,
          amount,
          'radiation-physics', // Default domain
          character
        );
      });
    }
    
    // Complete the challenge in the challenge store
    completeChallenge(grade);
    
    // Use new event system to mark node as completed
    if (currentNodeId) {
      nodeCompleted(
        currentNodeId,
        character,
        {
          relationshipChange: results.relationshipChange,
          journalTier: results.journalTier,
          isJournalAcquisition: character === 'kapoor'
        }
      );
      
      // Log final completion analytics
      useEventBus.getState().dispatch(GameEventType.UI_BUTTON_CLICKED, {
        componentId: 'calibrationChallenge',
        action: 'challengeCompleted',
        metadata: {
          nodeId: currentNodeId,
          character,
          relationshipScore: results.relationshipChange,
          journalTier: results.journalTier,
          insightGained: results.insightGained,
          knowledgeGained: Object.keys(results.knowledgeGained).length,
          grade
        }
      });
    }
  };
  
  // Character-specific dialogue data with enhanced critical path markings
  const dialogueData: Record<CharacterId, DialogueStage[]> = {
    'kapoor': [
      // Core Dialogue Stages 
      {
        id: 'intro',
        text: "Good morning. I see you've arrived precisely on schedule. I'm conducting the monthly output measurements on LINAC 2. Since this is your first day, observing proper protocol will be instructive.",
        contextNote: "Kapoor adjusts the ionization chamber position with methodical precision, not looking up as you enter.",
        equipment: {
          itemId: "linac",
          alt: "Linear Accelerator",
          description: "LINAC 2, the Varian TrueBeam used primarily for head and neck treatments."
        },
        isMandatory: true, // Must be visited for proper progression
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
        isMandatory: true, // Must be visited for proper progression
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
            isCriticalPath: true, // Mark as critical path option
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
        text: "Now, for accurate output measurement, we need to apply correction factors. Which factor accounts for air density variations and is particularly important for precise calibration?",
        contextNote: "Kapoor gestures to the barometer and thermometer mounted on the wall of the treatment room.",
        isMandatory: true, // Must be visited for proper progression
        options: [
          { 
            id: "ptp-correction",
            text: "The PTP correction factor, which accounts for temperature and pressure differences from reference conditions.", 
            nextStageId: 'calibration-tolerance',
            approach: 'precision',
            insightGain: 15,
            relationshipChange: 1,
            knowledgeGain: { 
              conceptId: 'ptp_correction_understood',
              domainId: 'radiation-physics',
              amount: 15
            },
            isCriticalPath: true, // Mark as critical path option
            triggersBackstory: true,
            responseText: "Excellent. The PTP correction is indeed crucial for accurate measurements. Air density affects ionization chamber readings significantly, and failure to account for it is a common source of error."
          },
          { 
            id: "polarity-correction",
            text: "The polarity correction factor.", 
            nextStageId: 'calibration-tolerance',
            approach: 'confidence',
            insightGain: 5,
            relationshipChange: 0,
            knowledgeGain: { 
              conceptId: 'ptp_correction_understood',
              domainId: 'radiation-physics',
              amount: 5
            },
            responseText: "While polarity correction is important for some measurements, particularly with non-standard beams, it's not the primary factor for air density variations. That would be the PTP correction for temperature and pressure."
          },
          { 
            id: "ask-for-explanation",
            text: "I'd like to hear more about the different correction factors before answering.", 
            nextStageId: 'explain-factors',
            approach: 'humble',
            insightGain: 5,
            relationshipChange: 0,
            responseText: "A reasonable approach. Let me explain the key correction factors we apply in this context."
          }
        ]
      },
      
      // Optional explanation stage
      {
        id: 'explain-factors',
        text: "The main correction factors include: PTP for temperature and pressure, Pion for ion recombination, Ppol for polarity effects, and Pelec for electrometer calibration. For air density specifically, PTP is most important as it corrects for the difference between measurement and calibration conditions.",
        contextNote: "Kapoor points to a reference chart on the wall showing the formulas for each correction factor.",
        nextStageId: 'calibration-tolerance'
      },
      
      // Stage 3: Calibration tolerance
      {
        id: 'calibration-tolerance',
        text: "What is an acceptable tolerance for monthly output checks according to TG-142?",
        contextNote: "Kapoor watches you carefully, evaluating your understanding of clinical standards.",
        isMandatory: true, // Must be visited for proper progression
        options: [
          { 
            id: "tolerance-2-percent",
            text: "±2%", 
            nextStageId: 'clinical-significance',
            approach: 'precision',
            insightGain: 10,
            relationshipChange: 1,
            knowledgeGain: { 
              conceptId: 'output_calibration_tolerance',
              domainId: 'radiation-physics',
              amount: 15
            },
            isCriticalPath: true, // Mark as critical path option
            responseText: "Correct. TG-142 recommends ±2% as the tolerance for monthly output checks, with ±1% as the action level. This balances clinical needs with practical measurement uncertainty."
          },
          { 
            id: "tolerance-5-percent",
            text: "±5%", 
            nextStageId: 'clinical-significance',
            approach: 'confidence',
            insightGain: 0,
            relationshipChange: -1,
            knowledgeGain: { 
              conceptId: 'output_calibration_tolerance',
              domainId: 'radiation-physics',
              amount: 5
            },
            responseText: "No, that's not correct. ±5% would be far too loose for clinical dosimetry. TG-142 recommends ±2% as the tolerance for monthly output checks. A 5% error could lead to significant clinical consequences."
          },
          { 
            id: "tolerance-1-percent",
            text: "±1%", 
            nextStageId: 'clinical-significance',
            approach: 'precision',
            insightGain: 5,
            relationshipChange: 0,
            knowledgeGain: { 
              conceptId: 'output_calibration_tolerance',
              domainId: 'radiation-physics',
              amount: 10
            },
            responseText: "Not quite. While ±1% is the action level at which investigation should begin, the actual tolerance according to TG-142 is ±2% for monthly output checks. Your precision is commendable, but accuracy matters most."
          }
        ]
      },
      
      // Stage 4: Clinical significance
      {
        id: 'clinical-significance',
        text: "Final question: Why is maintaining accurate beam output clinically significant?",
        contextNote: "Kapoor observes your response carefully, gauging your understanding of how physics affects patient care.",
        isMandatory: true, // Must be visited for proper progression
        options: [
          { 
            id: "comprehensive-significance",
            text: "Accurate dose delivery is fundamental to treatment efficacy. Underdosing tumors reduces control probability, while overdosing increases normal tissue complications.", 
            nextStageId: 'conclusion-excellence',
            approach: 'precision',
            insightGain: 15,
            relationshipChange: 1,
            knowledgeGain: { 
              conceptId: 'clinical_dose_significance',
              domainId: 'radiation-physics',
              amount: 15
            },
            isCriticalPath: true, // Mark as critical path option
            responseText: "Excellent answer. You've clearly grasped the fundamental connection between our technical work and patient outcomes. The balance between tumor control and normal tissue complications is indeed the core of what we aim to achieve."
          },
          { 
            id: "technical-significance",
            text: "Maintaining calibration ensures consistent beam output across treatments and accurate dose delivery.", 
            nextStageId: 'conclusion',
            approach: 'confidence',
            insightGain: 5,
            relationshipChange: 0,
            knowledgeGain: { 
              conceptId: 'clinical_dose_significance',
              domainId: 'radiation-physics',
              amount: 10
            },
            responseText: "That's correct as far as it goes, but I would encourage you to think more about the clinical impact. Technical accuracy isn't an end in itself, but serves the goal of optimal patient treatment."
          },
          { 
            id: "regulatory-significance",
            text: "It's required by regulatory agencies and accreditation bodies to maintain compliance.", 
            nextStageId: 'conclusion-needs-improvement',
            approach: 'confidence',
            insightGain: 0,
            relationshipChange: -1,
            knowledgeGain: { 
              conceptId: 'clinical_dose_significance',
              domainId: 'radiation-physics',
              amount: 5
            },
            responseText: "While regulatory compliance is necessary, it should not be our primary motivation. I'm concerned that you're missing the fundamental purpose of our work - the accurate and safe treatment of patients. I would encourage you to reflect more deeply on the clinical significance of what we do."
          }
        ]
      },
      
      // Backstory segments
      {
        id: 'backstory-ptp',
        text: "I once witnessed a critical incident early in my career where pressure correction was neglected during commissioning at high altitude. The facility had relocated equipment from sea level and failed to properly account for the pressure difference. It resulted in a systematic 4% overdose until identified during an independent audit. That experience taught me to be meticulous about environmental corrections."
      },
      
      {
        id: 'backstory-calibration',
        text: "I spent six months at the National Metrology Institute working on primary standards as a postdoc. It gave me profound respect for the traceability chain that connects our clinical measurements to fundamental physical constants. Every time I perform these checks, I'm aware that I'm one link in that unbroken chain of calibrations stretching back to primary standards."
      },
      
      // Conclusion stages - multiple options based on performance
      {
        id: 'conclusion-excellence',
        text: "I'm impressed with your understanding. You demonstrate a solid grasp of both the technical aspects and their clinical significance. That's precisely the mindset a medical physicist should cultivate.",
        contextNote: "Kapoor's typically stern expression softens slightly, indicating genuine approval.",
        isConclusion: true,
        isCriticalPath: true, // Mark as critical path state
      },
      
      {
        id: 'conclusion',
        text: "You have a reasonable foundation, though there's room for improvement. Focus on connecting technical procedures to their clinical impact. That's what separates a technician from a medical physicist.",
        contextNote: "Kapoor nods slightly, his expression neutral as he makes notes in his tablet.",
        isConclusion: true,
        isCriticalPath: true, // Mark as critical path state
      },
      
      {
        id: 'conclusion-needs-improvement',
        text: "I recommend reviewing the fundamentals more thoroughly. Understanding procedures mechanically isn't sufficient - you must grasp why we perform each step and how it impacts patient care. This is essential for your development.",
        contextNote: "Kapoor's expression remains impassive, but his tone has a slight edge of concern.",
        isConclusion: true,
        isCriticalPath: true, // Mark as critical path state
      },
      
      // Journal presentation - critical progression state
      {
        id: 'journal-presentation',
        text: "Every medical physicist must maintain meticulous records. This journal will serve you throughout your residency. Use it to document observations, track your knowledge development, and maintain procedural notes.",
        contextNote: "Kapoor retrieves a leather-bound journal and opens to the first page.",
        isCriticalPath: true, // Mark as critical path state
        isConclusion: true
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
    
    'garcia': [
      // Placeholder for Garcia's dialogue
      {
        id: 'intro',
        text: "Welcome to the team. I understand you're working with Dr. Kapoor on calibration procedures today. How's that going?",
        isConclusion: true
      }
    ]
  };
  
  return (
    <ConversationFormat
      character={character}
      dialogueStages={dialogueData[character] || dialogueData.kapoor}
      onComplete={handleCompletion}
    />
  );
}