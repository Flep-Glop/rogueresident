// app/content/dialogues/calibrations/kapoor-calibration.ts
/**
 * Kapoor Calibration Dialogue
 * 
 * Initial calibration session with Dr. Kapoor that serves as the player's
 * introduction to medical physics concepts and leads to journal acquisition.
 * 
 * This critical path dialogue establishes core gameplay mechanics and provides
 * the player with their first progression tool (the journal).
 */

import { DialogueStage } from '../../../hooks/useDialogueFlow';

const kapoorCalibrationDialogue: DialogueStage[] = [
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
  
  // Stage 2: PTP Correction Factors
  {
    id: 'correction-factors',
    text: "Now, when taking our readings, we need to apply several correction factors. Which of these is most critical for today's measurements given the current atmospheric conditions?",
    contextNote: "Kapoor points to the barometer on the wall showing a pressure drop of 15 hPa since yesterday.",
    equipment: {
      itemId: 'electrometer',
      alt: "Electrometer",
      description: "Standard Therapy Electrometer with digital readout displaying charge collection."
    },
    options: [
      { 
        id: "correct-ptp",
        text: "The pressure-temperature-polarization (PTP) correction, since barometric pressure has changed significantly today.", 
        nextStageId: 'measurement-tolerance',
        approach: 'precision',
        insightGain: 15,
        relationshipChange: 1,
        knowledgeGain: { 
          conceptId: 'ptp_correction_understood',
          domainId: 'radiation-physics',
          amount: 15
        },
        triggersBackstory: true,
        isCriticalPath: true, // Mark as critical path option
        responseText: "Excellent. PTP correction accounts for the deviation of air density from calibration reference conditions. Today's pressure drop of 15 hPa would significantly impact our results without proper correction."
      },
      { 
        id: "incorrect-kq",
        text: "The beam quality correction factor (kQ), since we're measuring a clinical beam.", 
        nextStageId: 'measurement-tolerance',
        approach: 'precision',
        insightGain: 5,
        relationshipChange: 0,
        knowledgeGain: { 
          conceptId: 'ptp_correction_understood',
          domainId: 'radiation-physics',
          amount: 5
        },
        responseText: "While kQ is indeed important, it's a constant for our specific chamber-beam combination. The significant pressure change today means the PTP correction is most critical for today's measurements."
      },
      { 
        id: "incorrect-polarity",
        text: "The polarity correction, since we're using a new electrometer.", 
        nextStageId: 'measurement-tolerance',
        approach: 'confidence',
        insightGain: 0,
        relationshipChange: -1,
        responseText: "The polarity effect is minimal for our Farmer chamber in photon beams. While it's applied as standard procedure, the atmospheric pressure change today means the PTP correction is the most critical factor."
      }
    ]
  },
  
  // Backstory Stage
  {
    id: 'backstory-ptp',
    type: 'backstory',
    text: "During my early career at Memorial Hospital, I once failed to apply the PTP correction properly when recalibrating after maintenance. The output was off by nearly 3%. I discovered this by cross-checking with a separate chamber. Since then, I've developed a verification protocol that has been adopted by several facilities in the region. Small details can have significant clinical impact.",
    nextStageId: 'measurement-tolerance'
  },
  
  // Stage 3: Tolerance Questions
  {
    id: 'measurement-tolerance',
    text: "Our monthly output measurements show the machine is delivering 101.2% of expected dose. What action should we take?",
    contextNote: "Kapoor shows you the measurement log with three consistent readings between 101.1% and 101.3%.",
    equipment: {
      itemId: 'measurement-log',
      alt: "Measurement Log",
      description: "Digital measurement log showing consistent 101.2% output readings."
    },
    options: [
      { 
        id: "correct-tolerance",
        text: "Document the finding but no immediate action needed as it's within the ±2% tolerance.", 
        nextStageId: 'clinical-significance',
        approach: 'precision',
        insightGain: 15,
        relationshipChange: 1,
        knowledgeGain: { 
          conceptId: 'output_calibration_tolerance',
          domainId: 'radiation-physics',
          amount: 15
        },
        isCriticalPath: true, // Mark as critical path option
        responseText: "Correct. TG-142 specifies a ±2% tolerance for photon output constancy. While we always aim for perfect calibration, variations within tolerance are acceptable and expected."
      },
      { 
        id: "overly-cautious",
        text: "Recalibrate the machine to get closer to 100%.", 
        nextStageId: 'clinical-significance',
        approach: 'confidence',
        insightGain: 0,
        relationshipChange: -1,
        responseText: "That would be unnecessary. Our protocols follow TG-142 guidelines which specify a ±2% tolerance. Frequent recalibration can introduce more variability over time."
      },
      { 
        id: "incorrect-uncertainty",
        text: "Repeat the measurement to reduce uncertainty.", 
        nextStageId: 'clinical-significance',
        approach: 'humble',
        insightGain: 5,
        relationshipChange: 0,
        knowledgeGain: { 
          conceptId: 'output_calibration_tolerance',
          domainId: 'radiation-physics',
          amount: 5
        },
        responseText: "We already performed three measurements with excellent reproducibility. At 101.2%, we're well within the ±2% tolerance specified by TG-142. Additional measurements would not change our action plan."
      }
    ]
  },
  
  // Stage 4: Clinical Significance
  {
    id: 'clinical-significance',
    text: "Final question: A radiation oncologist asks if the 1.2% output deviation we measured could affect patient treatments. How would you respond?",
    contextNote: "Kapoor looks at you expectantly, testing your understanding of the clinical context.",
    options: [
      { 
        id: "correct-clinical",
        text: "The deviation is clinically insignificant, as it falls well below the 5% uncertainty threshold considered impactful for treatment outcomes.", 
        nextStageId: 'conclusion',
        approach: 'precision',
        insightGain: 15,
        relationshipChange: 1,
        knowledgeGain: { 
          conceptId: 'clinical_dose_significance',
          domainId: 'radiation-physics',
          amount: 15
        },
        isCriticalPath: true, // Mark as critical path option
        responseText: "Your response demonstrates an understanding of both the technical and clinical aspects. A 1.2% deviation has negligible impact on treatment efficacy or side effects, while staying well within our quality parameters."
      },
      { 
        id: "partially-correct",
        text: "It's within tolerance but we should monitor it closely on the specific machines used for their patients.", 
        nextStageId: 'conclusion',
        approach: 'humble',
        insightGain: 5,
        relationshipChange: 0,
        knowledgeGain: { 
          conceptId: 'clinical_dose_significance',
          domainId: 'radiation-physics',
          amount: 5
        },
        responseText: "Your caution is noted, though perhaps excessive. We always monitor all machines consistently according to protocol. The 1.2% deviation is well below the threshold for clinical significance, which is typically considered to be around 5%."
      },
      { 
        id: "incorrect-clinical",
        text: "Any deviation could potentially impact sensitive treatments, so we should inform treatment planning.", 
        nextStageId: 'conclusion',
        approach: 'confidence',
        insightGain: 0,
        relationshipChange: -1,
        responseText: "That response would unnecessarily alarm our clinical colleagues. Our QA program accounts for these acceptable variations. Treatment planning systems use beam data that already incorporates these expected minor fluctuations."
      }
    ]
  },
  
  // Standard Conclusion
  {
    id: 'conclusion',
    type: 'conclusion',
    text: "Your understanding of calibration procedures is satisfactory. Regular output measurements are a fundamental responsibility of medical physics. Consistency and attention to detail are essential. Continue to develop your technical knowledge alongside clinical awareness.",
    isConclusion: true,
    nextStageId: 'journal-presentation'
  },
  
  // Excellence Conclusion (high score)
  {
    id: 'conclusion-excellence',
    type: 'conclusion',
    text: "Your grasp of calibration principles and their clinical context is impressive for a first-day resident. You demonstrate the careful balance of technical precision and clinical judgment that defines excellent medical physics practice. I look forward to your contributions to our department.",
    isConclusion: true,
    nextStageId: 'journal-presentation'
  },
  
  // Needs Improvement Conclusion (low score)
  {
    id: 'conclusion-needs-improvement',
    type: 'conclusion',
    text: "Your understanding of calibration procedures requires significant improvement. These are foundational concepts in medical physics that impact patient safety. I recommend reviewing TG-51 and TG-142 protocols tonight. This profession demands precision and thorough understanding of both technical and clinical implications.",
    isConclusion: true,
    nextStageId: 'journal-presentation'
  },
  
  // Journal Presentation (Critical Progression Point)
  {
    id: 'journal-presentation',
    type: 'critical-moment',
    text: "Every medical physicist must maintain meticulous records. This journal will serve you throughout your residency. Use it to document observations, track your knowledge development, and maintain procedural notes.",
    contextNote: "Kapoor hands you a leather-bound journal with the department logo embossed on the cover.",
    equipment: {
      itemId: 'journal',
      alt: "Journal",
      description: "A high-quality leather journal with the hospital's medical physics department emblem."
    },
    isCriticalPath: true, // Critical for progression
    isConclusion: true
  }
];

export default kapoorCalibrationDialogue;