// app/utils/CharacterTeachingStyles.ts
/**
 * Character Teaching Styles
 * 
 * This module defines the distinct teaching approaches for each mentor character,
 * influencing dialogue generation, challenge framing, and knowledge acquisition.
 * These styles provide gameplay variety while reinforcing character personalities.
 */

import { CharacterId } from "../types/challenge";

// Types of response approaches available to player
export type ResponseApproach = 'humble' | 'precision' | 'confidence';

// Knowledge domains for concept mapping
export type KnowledgeDomain = 'radiation-physics' | 'quality-assurance' | 'clinical-practice' | 'radiation-protection' | 'technical' | 'theoretical' | 'general';

// Defines the teaching style for a character
export interface TeachingStyle {
  id: CharacterId;
  name: string;
  title: string;
  specialty: KnowledgeDomain[];
  description: string;
  preferredApproach: ResponseApproach;
  dislikedApproach: ResponseApproach;
  feedbackStyle: string;
  questionStyle: string;
  strengthModifier: number; // Modifier for knowledge gain in specialty
  weaknessModifier: number; // Modifier for knowledge gain outside specialty
  relationshipImpact: {
    // How much relationship changes based on approach
    [key in ResponseApproach]: number;
  };
  dialoguePatterns: {
    greeting: string[];
    approval: string[];
    correction: string[];
    conclusion: string[];
  };
}

/**
 * Main teaching style definitions for each character
 */
export const TEACHING_STYLES: Record<CharacterId, TeachingStyle> = {
  'kapoor': {
    id: 'kapoor',
    name: 'Dr. Kapoor',
    title: 'Chief Medical Physicist',
    specialty: ['radiation-physics', 'clinical-practice', 'radiation-protection'],
    description: 'Methodical, protocol-driven, and rigorous. Dr. Kapoor teaches through structured procedures and emphasizes precision and thoroughness.',
    preferredApproach: 'precision',
    dislikedApproach: 'confidence',
    feedbackStyle: 'Direct and thorough, focusing on technical accuracy',
    questionStyle: 'Challenging questions that test deep understanding of principles',
    strengthModifier: 1.25, // 25% bonus for specialty knowledge
    weaknessModifier: 0.9, // 10% penalty outside specialty
    relationshipImpact: {
      'precision': 1.5,  // Strongly prefers precise answers
      'humble': 0.75,    // Accepts humble approach
      'confidence': -0.5 // Dislikes overconfidence
    },
    dialoguePatterns: {
      greeting: [
        "Let's approach this systematically.",
        "The protocol for this situation is quite clear.",
        "We'll begin with the fundamentals."
      ],
      approval: [
        "Your precision is commendable.",
        "That's correct. Your attention to detail is noted.",
        "Precisely. That level of accuracy is what this field demands."
      ],
      correction: [
        "That's not quite right. Consider the established protocol.",
        "Your approach lacks precision. The standard procedure is...",
        "Incorrect. Let me clarify the proper methodology."
      ],
      conclusion: [
        "Your understanding of the protocols is developing appropriately.",
        "Continue to focus on procedural accuracy in your practice.",
        "Remember that in medical physics, precision is non-negotiable."
      ]
    }
  },
  
  'jesse': {
    id: 'jesse',
    name: 'Technician Jesse',
    title: 'Equipment Specialist',
    specialty: ['technical', 'quality-assurance'],
    description: 'Hands-on, practical, and experience-driven. Jesse teaches through demonstration and practical application, valuing real-world solutions over theory.',
    preferredApproach: 'humble',
    dislikedApproach: 'precision',
    feedbackStyle: 'Casual and direct, focusing on practical outcomes',
    questionStyle: 'Scenario-based questions that test practical problem-solving',
    strengthModifier: 1.3, // 30% bonus for specialty knowledge
    weaknessModifier: 0.8, // 20% penalty outside specialty
    relationshipImpact: {
      'humble': 1.5,     // Strongly prefers willingness to learn
      'confidence': 0.5, // Accepts confidence if backed by skill
      'precision': -0.25 // Slightly dislikes over-theoretical approaches
    },
    dialoguePatterns: {
      greeting: [
        "Let's get our hands dirty and figure this out.",
        "I'll show you how this actually works in the real world.",
        "Forget the textbook for a minute, here's how we actually do this."
      ],
      approval: [
        "Now you're getting it! That's the practical approach we need.",
        "See? Much easier when you just dive in and try it.",
        "Good instinct! That's exactly how it works in the field."
      ],
      correction: [
        "Nah, that won't work in practice. Try this instead...",
        "I see what you're thinking, but here's a trick I've learned...",
        "That's the textbook answer, but in reality we need to..."
      ],
      conclusion: [
        "You're developing good instincts. Keep practicing and it'll become second nature.",
        "Not bad for a rookie. Next time it'll be even smoother.",
        "You're starting to think like someone who fixes things, not just studies them."
      ]
    }
  },
  
  'quinn': {
    id: 'quinn',
    name: 'Dr. Zephyr Quinn',
    title: 'Experimental Researcher',
    specialty: ['theoretical', 'radiation-physics'],
    description: 'Creative, innovative, and conceptual. Dr. Quinn teaches through exploration and conceptual frameworks, encouraging questions and experimentation.',
    preferredApproach: 'confidence',
    dislikedApproach: 'humble',
    feedbackStyle: 'Enthusiastic and conceptual, focusing on underlying principles',
    questionStyle: 'Open-ended questions that encourage creative thinking',
    strengthModifier: 1.35, // 35% bonus for specialty knowledge
    weaknessModifier: 0.85, // 15% penalty outside specialty
    relationshipImpact: {
      'confidence': 1.25,  // Prefers confident exploration
      'precision': 0.5,    // Accepts precision if insightful
      'humble': -0.1       // Slightly dislikes excessive caution
    },
    dialoguePatterns: {
      greeting: [
        "I've been experimenting with a fascinating new approach!",
        "Let's explore this concept from first principles.",
        "The conventional understanding is merely our starting point."
      ],
      approval: [
        "Yes! You're seeing the deeper patterns!",
        "Brilliant insight! You're thinking beyond the standard framework.",
        "That's the kind of innovative thinking we need in this field!"
      ],
      correction: [
        "Interesting thought, but let's reconsider from a different angle...",
        "You're approaching this conventionally. What if we instead...",
        "That's how it's typically understood, but have you considered..."
      ],
      conclusion: [
        "You're developing a wonderfully creative approach to these problems.",
        "Continue questioning assumptions and exploring new possibilities.",
        "The boundaries of our field are pushed by minds willing to experiment."
      ]
    }
  },
  
  'garcia': {
    id: 'garcia',
    name: 'Dr. Garcia',
    title: 'Radiation Oncologist & Education Coordinator',
    specialty: ['clinical-practice', 'general'],
    description: 'Holistic, patient-focused, and integrative. Dr. Garcia teaches through clinical context and narrative, emphasizing the human impact of technical decisions.',
    preferredApproach: 'humble',
    dislikedApproach: 'confidence',
    feedbackStyle: 'Contextual and patient-centered, connecting technical decisions to outcomes',
    questionStyle: 'Case-based questions that emphasize clinical impact',
    strengthModifier: 1.2, // 20% bonus for specialty knowledge
    weaknessModifier: 0.95, // 5% penalty outside specialty
    relationshipImpact: {
      'humble': 1.25,     // Prefers thoughtful, patient-centered approach
      'precision': 0.75,  // Appreciates precision when clinically relevant
      'confidence': -0.25 // Dislikes overconfidence in clinical scenarios
    },
    dialoguePatterns: {
      greeting: [
        "Let's consider the patient's full clinical picture.",
        "This case illustrates an important principle in patient care.",
        "Before we dive into the technical details, remember who we're treating."
      ],
      approval: [
        "Excellent. That approach prioritizes the patient's wellbeing.",
        "Correct, and that decision would significantly improve the therapeutic ratio.",
        "Yes, and understanding that helps us communicate effectively with the clinical team."
      ],
      correction: [
        "Consider the clinical implications of that approach.",
        "That's technically correct, but how would it affect the patient's quality of life?",
        "We need to balance that technical solution with practical clinical realities."
      ],
      conclusion: [
        "Your growing ability to connect physics to patient care is commendable.",
        "Remember that every number in our calculations represents a real person.",
        "The best medical physicists never lose sight of the clinical context."
      ]
    }
  }
};

/**
 * Get appropriate feedback based on character and response approach
 * @param character Character ID
 * @param wasCorrect Whether the response was correct
 * @param approachUsed Approach used in response
 * @returns Appropriate feedback text
 */
export function getCharacterFeedback(
  character: CharacterId,
  wasCorrect: boolean,
  approachUsed: ResponseApproach
): string {
  const style = TEACHING_STYLES[character];
  
  // Determine if the approach matched the character's preference
  const approachAlignment = approachUsed === style.preferredApproach ? 
    'preferred' : approachUsed === style.dislikedApproach ? 
    'disliked' : 'neutral';
  
  // Select appropriate feedback pattern
  const feedbackCategory = wasCorrect ? 'approval' : 'correction';
  const possibleResponses = style.dialoguePatterns[feedbackCategory];
  
  // Choose a random response from the appropriate category
  const randomIndex = Math.floor(Math.random() * possibleResponses.length);
  return possibleResponses[randomIndex];
}

/**
 * Calculate relationship change based on character preference and approach
 * @param character Character ID
 * @param wasCorrect Whether the response was correct
 * @param approachUsed Approach used in response
 * @returns Relationship change value
 */
export function calculateRelationshipChange(
  character: CharacterId,
  wasCorrect: boolean,
  approachUsed: ResponseApproach
): number {
  const style = TEACHING_STYLES[character];
  
  // Base relationship change
  let change = style.relationshipImpact[approachUsed];
  
  // Correctness multiplier
  change *= wasCorrect ? 1 : 0.5;
  
  return change;
}

/**
 * Calculate knowledge gain modifier based on character specialty
 * @param character Character ID
 * @param domain Knowledge domain
 * @returns Knowledge gain modifier (multiplier)
 */
export function getKnowledgeGainModifier(
  character: CharacterId,
  domain: KnowledgeDomain
): number {
  const style = TEACHING_STYLES[character];
  
  // Check if domain is in character's specialty
  const isSpecialty = style.specialty.includes(domain);
  
  return isSpecialty ? style.strengthModifier : style.weaknessModifier;
}

export default TEACHING_STYLES;