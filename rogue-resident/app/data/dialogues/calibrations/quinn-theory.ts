// app/content/dialogues/calibrations/quinn-theory.ts
/**
 * Quinn Theory Dialogue
 * 
 * Theoretical discussion with Dr. Quinn that introduces
 * advanced physics concepts and research perspectives.
 */

import { DialogueStage } from '../../../hooks/useDialogueFlow';

const quinnTheoryDialogue: DialogueStage[] = [
  {
    id: 'intro',
    text: "Ah, our new resident! Perfect timing. I've been exploring some fascinating quantum effects in dosimetry that challenge our conventional understanding. Care to dive into the theoretical underpinnings with me?",
    contextNote: "Quinn is surrounded by papers covered in complex equations, with several 3D visualizations on nearby screens.",
    equipment: {
      itemId: "quantum-vis",
      alt: "Quantum Visualization",
      description: "A complex 3D visualization of quantum interactions in ionization chambers."
    },
    options: [
      { 
        id: "eager-theorist",
        text: "I'd love to. Quantum effects have always fascinated me.", 
        nextStageId: 'quantum-foundations',
        approach: 'confidence',
        insightGain: 10,
        relationshipChange: 1,
        responseText: "Excellent! It's refreshing to find someone who appreciates the deeper theoretical aspects. Let's start with how quantum tunneling affects charge collection in nanodosimetry."
      },
      { 
        id: "practical-question",
        text: "How do these quantum effects impact clinical practice?", 
        nextStageId: 'quantum-foundations',
        approach: 'precision',
        insightGain: 5,
        relationshipChange: 0,
        responseText: "Always thinking of the clinical applications—admirable, though sometimes we need to understand the theory before we can appreciate its practical implications. Let me show you how these quantum phenomena manifest in ways that could eventually impact treatment precision."
      }
    ]
  },
  
  // Additional dialogue stages would go here...
  {
    id: 'quantum-foundations',
    text: "Consider this: at the quantum scale, the interaction between radiation and matter becomes probabilistic rather than deterministic. How might this fundamentally challenge our dosimetry models?",
    contextNote: "Quinn points to an equation showing quantum probability functions.",
    options: [
      {
        id: "quantum-understanding",
        text: "It suggests our deterministic dose calculations have an inherent uncertainty limit that can't be overcome with more precise measuring equipment.",
        nextStageId: 'conclusion',
        approach: 'precision',
        insightGain: 15,
        relationshipChange: 1,
        knowledgeGain: {
          conceptId: 'quantum_dosimetry_principles',
          domainId: 'theoretical',
          amount: 15
        },
        isCriticalPath: true,
        responseText: "Brilliant insight! Yes, there's a fundamental limit to certainty that no technology can overcome. This has profound implications for how we approach uncertainty in treatment planning. Most physicists treat uncertainty as a technological limitation, but it's actually woven into the fabric of reality."
      },
      {
        id: "partial-understanding",
        text: "It means we need more advanced quantum-based detection methods.",
        nextStageId: 'conclusion',
        approach: 'confidence',
        insightGain: 5,
        relationshipChange: 0,
        responseText: "That's thinking along conventional lines. While better detection helps, the uncertainty isn't just about measurement precision—it's inherent to the quantum nature of radiation. No detection method, no matter how advanced, can eliminate this fundamental uncertainty."
      }
    ]
  },
  
  {
    id: 'conclusion',
    type: 'conclusion',
    text: "You show promising theoretical aptitude. Remember, the most significant advances in medical physics haven't come from incremental improvements but from paradigm shifts in how we understand the fundamental physics. Keep questioning the foundations—that's where the breakthrough insights hide. I look forward to more of these discussions as your residency progresses.",
    isConclusion: true
  }
];

export default quinnTheoryDialogue;