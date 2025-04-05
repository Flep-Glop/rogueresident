// app/content/dialogues/calibrations/jesse-equipment.ts
/**
 * Jesse Equipment Dialogue
 * 
 * Equipment tutorial with Technician Jesse focusing on
 * practical hands-on knowledge and QA procedures.
 */

import { DialogueStage } from '../../../hooks/useDialogueFlow';

const jesseEquipmentDialogue: DialogueStage[] = [
  {
    id: 'intro',
    text: "Hey there, doc-in-training! Welcome to the equipment room - or as I like to call it, 'where the real work happens.' Ready to get your hands dirty with some practical knowledge?",
    contextNote: "Jesse is elbow-deep in an open panel of a linear accelerator, various tools spread around.",
    equipment: {
      itemId: "linac-panel",
      alt: "Linear Accelerator Panel",
      description: "An open access panel showing the intricate mechanical components of the linear accelerator."
    },
    options: [
      { 
        id: "enthusiastic-start",
        text: "Absolutely. I could use more hands-on experience.", 
        nextStageId: 'equipment-basics',
        approach: 'humble',
        insightGain: 10,
        relationshipChange: 1,
        responseText: "That's what I like to hear! You'd be surprised how many residents are all theory and no practice. Let's start with the basics of what makes this machine tick."
      },
      { 
        id: "technical-start",
        text: "I've studied the theoretical components extensively.", 
        nextStageId: 'equipment-basics',
        approach: 'precision',
        insightGain: 5,
        relationshipChange: 0,
        responseText: "Theory's good and all, but there's a big difference between the textbook and real life. Let me show you what these machines are like when they're not behaving perfectly."
      }
    ]
  },
  
  // Additional dialogue stages would go here...
  {
    id: 'equipment-basics',
    text: "First rule of equipment: safety protocols exist for a reason. What's the first thing you should do before performing any maintenance procedure on a linear accelerator?",
    equipment: {
      itemId: 'qa-tools',
      alt: "QA Tools",
      description: "A set of specialized tools for linear accelerator quality assurance."
    },
    options: [
      {
        id: "equipment-safety",
        text: "Verify the machine is powered down and follow proper lockout/tagout procedures.",
        nextStageId: 'conclusion',
        approach: 'precision',
        insightGain: 15,
        relationshipChange: 1,
        knowledgeGain: {
          conceptId: 'equipment_safety_protocol',
          domainId: 'quality-assurance',
          amount: 15
        },
        isCriticalPath: true,
        responseText: "Exactly! Safety first, always. You'd be surprised how many accidents happen because someone skipped this step. Lockout/tagout isn't just bureaucratic red tape - it's what keeps us alive when working with equipment that can literally cook you from the inside out if mishandled."
      },
      {
        id: "incomplete-safety",
        text: "Consult the service manual for the specific procedure.",
        nextStageId: 'conclusion',
        approach: 'humble',
        insightGain: 5,
        relationshipChange: 0,
        responseText: "Well, that's part of it, but you're putting the cart before the horse. Before you even touch that manual, you need to power down and follow lockout/tagout procedures. Safety first, then documentation."
      }
    ]
  },
  
  {
    id: 'conclusion',
    type: 'conclusion',
    text: "Not bad for your first day. Remember, all the fancy calculations in the world don't mean anything if the machine isn't working right. As a physicist, you're the bridge between the clinical and technical sides. Don't be afraid to get your hands dirty - that's where the real learning happens.",
    isConclusion: true
  }
];

export default jesseEquipmentDialogue;