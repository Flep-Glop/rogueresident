// app/core/dialogue/ActionIntegration.ts
import { StrategicActionType } from "../../store/resourceStore";
import { useDialogueStateMachine, DialogueState, DialogueOption } from "./DialogueStateMachine";

/**
 * Strategic action handler context
 */
export interface ActionContext {
  characterId: string;
  stageId: string;
  actionType: StrategicActionType;
  currentOptions: DialogueOption[];
}

/**
 * Handler function type for strategic actions
 */
export type ActionHandlerFn = (context: ActionContext) => 
  Promise<{ stateUpdate?: Partial<DialogueState>, newOptions?: DialogueOption[] }>;

/**
 * Option enhancement type
 */
type OptionEnhancementFn = (options: DialogueOption[], actionType: StrategicActionType) => DialogueOption[];

/**
 * Registry of action handlers for different action types
 */
const actionHandlers: Record<StrategicActionType, ActionHandlerFn> = {
  /**
   * Reframe - Shift the conversation to more approachable topics
   */
  reframe: async (context: ActionContext) => {
    const { currentOptions, characterId } = context;
    
    // Filter options to favor "humble" and "precision" approaches
    // We're assuming these tags exist in the dialogue options
    const reframedOptions = currentOptions.filter(option => {
      if ('approach' in option) {
        const approach = (option as any).approach;
        return approach === 'humble' || approach === 'precision';
      }
      return false;
    });
    
    // If we don't have enough options, add some fallbacks based on character
    if (reframedOptions.length < 2) {
      let fallbackOptions: DialogueOption[] = [];
      
      switch (characterId) {
        case 'kapoor':
          fallbackOptions = [
            {
              id: "reframe-kapoor-basic",
              text: "Could we revisit the fundamental principles involved?",
              responseText: "Yes, that's a sensible approach. Let's examine the core concepts.",
              relationshipChange: 1,
              insightGain: 5,
              approach: 'humble'
            },
            {
              id: "reframe-kapoor-protocol",
              text: "How is this documented in our protocol manuals?",
              responseText: "Turning to established protocols is always prudent. The documentation states...",
              relationshipChange: 1,
              insightGain: 5,
              approach: 'precision'
            }
          ];
          break;
          
        case 'jesse':
          fallbackOptions = [
            {
              id: "reframe-jesse-practical",
              text: "How would this work in an everyday clinical scenario?",
              responseText: "Great question! In the real world, we'd handle it like this...",
              relationshipChange: 1,
              insightGain: 5,
              approach: 'humble'
            },
            {
              id: "reframe-jesse-experience",
              text: "Have you encountered similar situations before?",
              responseText: "Oh yeah, plenty of times. Let me tell you about one case...",
              relationshipChange: 1,
              insightGain: 5,
              approach: 'humble'
            }
          ];
          break;
          
        case 'quinn':
          fallbackOptions = [
            {
              id: "reframe-quinn-concept",
              text: "Could you explain this with a conceptual model?",
              responseText: "I love conceptual thinking! Let's visualize it this way...",
              relationshipChange: 1,
              insightGain: 5,
              approach: 'precision'
            },
            {
              id: "reframe-quinn-innovative",
              text: "Is there an alternative approach to this problem?",
              responseText: "There's always another angle! Consider this perspective...",
              relationshipChange: 1,
              insightGain: 5,
              approach: 'humble'
            }
          ];
          break;
          
        default:
          fallbackOptions = [
            {
              id: "reframe-basic",
              text: "Could we revisit the fundamental concepts first?",
              responseText: "Yes, let's go back to basics.",
              relationshipChange: 1,
              insightGain: 5,
              approach: 'humble'
            },
            {
              id: "reframe-practical",
              text: "How is this applied in everyday clinical practice?",
              responseText: "That's a good practical perspective.",
              relationshipChange: 1,
              insightGain: 5,
              approach: 'humble'
            }
          ];
      }
      
      return { 
        stateUpdate: {
          text: "I need to refocus this conversation on more familiar ground."
        },
        newOptions: fallbackOptions
      };
    }
    
    return { newOptions: reframedOptions };
  },
  
  /**
   * Extrapolate - Form connections between knowledge concepts
   */
  extrapolate: async (context: ActionContext) => {
    const { characterId } = context;
    
    // Customize connections based on character
    let connectionOptions: DialogueOption[] = [];
    
    switch (characterId) {
      case 'kapoor':
        connectionOptions = [
          {
            id: "extrapolate-kapoor-qa",
            text: "This calibration process relates to our quality assurance framework.",
            responseText: "Excellent connection. Our QA systems do indeed share the same foundational principles.",
            relationshipChange: 2,
            insightGain: 15,
            knowledgeGain: {
              conceptId: "qa-principles",
              domainId: "quality-assurance",
              amount: 10
            },
            approach: 'precision'
          },
          {
            id: "extrapolate-kapoor-regulatory",
            text: "I see parallels with regulatory compliance requirements.",
            responseText: "An astute observation. The regulatory framework influences many of our procedures.",
            relationshipChange: 2,
            insightGain: 15,
            knowledgeGain: {
              conceptId: "regulatory-compliance",
              domainId: "administration",
              amount: 10
            },
            approach: 'precision'
          }
        ];
        break;
        
      case 'jesse':
        connectionOptions = [
          {
            id: "extrapolate-jesse-maintenance",
            text: "This reminds me of the preventive maintenance schedule.",
            responseText: "You're catching on! The same principles of proactive error detection apply to both.",
            relationshipChange: 2,
            insightGain: 15,
            knowledgeGain: {
              conceptId: "preventive-maintenance",
              domainId: "equipment",
              amount: 10
            },
            approach: 'precision'
          },
          {
            id: "extrapolate-jesse-troubleshooting",
            text: "The diagnostic process here is similar to system troubleshooting.",
            responseText: "Exactly right! Both require systematic elimination of variables.",
            relationshipChange: 2,
            insightGain: 15,
            knowledgeGain: {
              conceptId: "diagnostics",
              domainId: "equipment",
              amount: 10
            },
            approach: 'precision'
          }
        ];
        break;
        
      case 'quinn':
        connectionOptions = [
          {
            id: "extrapolate-quinn-research",
            text: "This principle appears in experimental design as well.",
            responseText: "Brilliant observation! The scientific method transcends specific applications.",
            relationshipChange: 2,
            insightGain: 15,
            knowledgeGain: {
              conceptId: "experimental-design",
              domainId: "research",
              amount: 10
            },
            approach: 'precision'
          },
          {
            id: "extrapolate-quinn-innovation",
            text: "This could have applications in emerging treatment modalities.",
            responseText: "You're thinking ahead! That's exactly the kind of cross-domain insight we need.",
            relationshipChange: 2,
            insightGain: 15,
            knowledgeGain: {
              conceptId: "treatment-innovation",
              domainId: "emerging-tech",
              amount: 10
            },
            approach: 'confidence'
          }
        ];
        break;
        
      default:
        connectionOptions = [
          {
            id: "extrapolate-connection-1",
            text: "This relates to quality assurance principles we discussed earlier.",
            responseText: "Excellent connection. The same principles apply across domains.",
            relationshipChange: 2,
            insightGain: 15,
            knowledgeGain: {
              conceptId: "qa-principles",
              domainId: "quality-assurance",
              amount: 10
            },
            approach: 'precision'
          },
          {
            id: "extrapolate-connection-2",
            text: "The inverse square law applies here, just like in radiation safety.",
            responseText: "Very astute observation. Physical principles transcend specific applications.",
            relationshipChange: 2,
            insightGain: 15,
            knowledgeGain: {
              conceptId: "inverse-square-law",
              domainId: "radiation-physics",
              amount: 10
            },
            approach: 'precision'
          }
        ];
    }
    
    return {
      stateUpdate: {
        text: "I see a connection between this concept and others we've discussed..."
      },
      newOptions: connectionOptions
    };
  },
  
  /**
   * Boast - Challenge mode with higher difficulty and rewards
   */
  boast: async (context: ActionContext) => {
    const { characterId } = context;
    
    // Character-specific challenge text
    let challengeText = "Let me demonstrate my expertise on this topic...";
    
    switch (characterId) {
      case 'kapoor':
        challengeText = "I believe I can address this at a more advanced technical level.";
        break;
      case 'jesse':
        challengeText = "I have hands-on experience with this - let me show you.";
        break;
      case 'quinn':
        challengeText = "This connects to some cutting-edge research I've been following.";
        break;
    }
    
    // Boast doesn't change options, just makes them more difficult
    return {
      stateUpdate: {
        text: challengeText
      }
    };
  },
  
  /**
   * Synthesis - Discover new knowledge domains
   */
  synthesis: async (context: ActionContext) => {
    const { characterId } = context;
    
    // Customize synthesis options based on character
    let synthesisOptions: DialogueOption[] = [];
    
    switch (characterId) {
      case 'kapoor':
        synthesisOptions = [
          {
            id: "synthesis-kapoor-protocols",
            text: "Let's explore clinical protocol optimization.",
            responseText: "An excellent area to investigate. Protocol refinement is critical to clinical efficacy.",
            relationshipChange: 1,
            insightGain: 25,
            knowledgeGain: {
              conceptId: "protocol-optimization",
              domainId: "clinical-practice",
              amount: 20
            }
          },
          {
            id: "synthesis-kapoor-accreditation",
            text: "I'd like to understand the accreditation requirements better.",
            responseText: "A prudent topic. Accreditation standards provide an important framework for our practice.",
            relationshipChange: 1,
            insightGain: 25,
            knowledgeGain: {
              conceptId: "accreditation-standards",
              domainId: "administration",
              amount: 20
            }
          },
          {
            id: "synthesis-kapoor-dosimetry",
            text: "Advanced dosimetry techniques seem relevant here.",
            responseText: "Indeed they are. Precision in dosimetry directly impacts treatment outcomes.",
            relationshipChange: 1,
            insightGain: 25,
            knowledgeGain: {
              conceptId: "advanced-dosimetry",
              domainId: "dosimetry",
              amount: 20
            }
          }
        ];
        break;
        
      case 'jesse':
        synthesisOptions = [
          {
            id: "synthesis-jesse-calibration",
            text: "What about alternative calibration methodologies?",
            responseText: "Great question! There are several approaches we could explore.",
            relationshipChange: 1,
            insightGain: 25,
            knowledgeGain: {
              conceptId: "calibration-methods",
              domainId: "equipment",
              amount: 20
            }
          },
          {
            id: "synthesis-jesse-troubleshooting",
            text: "Can we discuss advanced troubleshooting techniques?",
            responseText: "Now you're talking my language! Let me show you some tricks I've learned.",
            relationshipChange: 1,
            insightGain: 25,
            knowledgeGain: {
              conceptId: "advanced-troubleshooting",
              domainId: "equipment",
              amount: 20
            }
          },
          {
            id: "synthesis-jesse-maintenance",
            text: "I'm interested in predictive maintenance strategies.",
            responseText: "That's cutting-edge thinking! Predicting failures before they happen is the gold standard.",
            relationshipChange: 1,
            insightGain: 25,
            knowledgeGain: {
              conceptId: "predictive-maintenance",
              domainId: "equipment",
              amount: 20
            }
          }
        ];
        break;
        
      case 'quinn':
        synthesisOptions = [
          {
            id: "synthesis-quinn-research",
            text: "What emerging research directions seem most promising?",
            responseText: "Oh, fantastic question! There are several fascinating frontiers right now.",
            relationshipChange: 1,
            insightGain: 25,
            knowledgeGain: {
              conceptId: "research-frontiers",
              domainId: "research",
              amount: 20
            }
          },
          {
            id: "synthesis-quinn-computation",
            text: "How are computational methods changing the field?",
            responseText: "That's where the real revolution is happening! Computational approaches are transforming everything.",
            relationshipChange: 1,
            insightGain: 25,
            knowledgeGain: {
              conceptId: "computational-methods",
              domainId: "emerging-tech",
              amount: 20
            }
          },
          {
            id: "synthesis-quinn-ionix",
            text: "Tell me more about your work with the Ionix chamber.",
            responseText: "I was hoping you'd ask about that! The Ionix research is my true passion.",
            relationshipChange: 1,
            insightGain: 25,
            knowledgeGain: {
              conceptId: "ionix-technology",
              domainId: "emerging-tech",
              amount: 20
            }
          }
        ];
        break;
        
      default:
        synthesisOptions = [
          {
            id: "synthesis-domain-1",
            text: "Let's explore advanced dosimetry techniques.",
            responseText: "That's a fascinating area to explore. Let me share what I know.",
            relationshipChange: 1,
            insightGain: 25,
            knowledgeGain: {
              conceptId: "advanced-dosimetry",
              domainId: "dosimetry",
              amount: 20
            }
          },
          {
            id: "synthesis-domain-2",
            text: "I'd like to understand adaptive planning better.",
            responseText: "Adaptive planning is indeed a cutting-edge domain. Let's discuss it.",
            relationshipChange: 1,
            insightGain: 25,
            knowledgeGain: {
              conceptId: "adaptive-planning",
              domainId: "treatment-planning",
              amount: 20
            }
          },
          {
            id: "synthesis-domain-3",
            text: "How are AI systems changing medical physics?",
            responseText: "That's a forward-looking question. AI is transforming our field in several ways.",
            relationshipChange: 1,
            insightGain: 25,
            knowledgeGain: {
              conceptId: "ai-applications",
              domainId: "emerging-tech",
              amount: 20
            }
          }
        ];
    }
    
    return {
      stateUpdate: {
        text: "I'd like to explore a new aspect of this field we haven't covered yet."
      },
      newOptions: synthesisOptions
    };
  }
};

/**
 * Registry of option enhancement functions for different action types
 */
const optionEnhancers: Record<StrategicActionType, OptionEnhancementFn> = {
  reframe: (options, _) => {
    // No special enhancement needed for reframe
    return options;
  },
  
  extrapolate: (options, _) => {
    // No special enhancement needed for extrapolate
    return options;
  },
  
  boast: (options, _) => {
    // Double insight gain and mark as expert level for boast
    return options.map(option => ({
      ...option,
      insightGain: option.insightGain ? option.insightGain * 2 : 0,
      text: `[Expert] ${option.text}`
    }));
  },
  
  synthesis: (options, _) => {
    // No special enhancement needed for synthesis
    return options;
  }
};

/**
 * Apply a strategic action to the dialogue system in a non-invasive way
 * 
 * This function uses a try-catch pattern to gracefully handle errors and
 * falls back to simpler methods if more sophisticated ones aren't available.
 * 
 * @param actionType Type of strategic action to apply
 * @param characterId Current character ID
 * @param stageId Current dialogue stage ID
 * @returns Promise resolving to success/failure of action application
 */
export async function applyStrategicAction(
  actionType: StrategicActionType,
  characterId: string,
  stageId: string
): Promise<boolean> {
  try {
    // Get current dialogue state
    const dialogueState = useDialogueStateMachine.getState();
    
    // Ensure we have an active dialogue
    if (!dialogueState.currentState || !dialogueState.context) {
      console.error('Cannot apply action - no active dialogue');
      return false;
    }
    
    // Get current options with graceful fallback
    let currentOptions: DialogueOption[] = [];
    try {
      // Try the preferred method first
      currentOptions = dialogueState.getAvailableOptions();
    } catch (optionsError) {
      // Fall back to the current state's options if available
      console.warn('Failed to get options via getAvailableOptions, falling back to current state options');
      currentOptions = dialogueState.currentState.options || [];
    }
    
    // Create context for handler
    const context: ActionContext = {
      characterId,
      stageId,
      actionType,
      currentOptions
    };
    
    // Get handler for this action type
    const handler = actionHandlers[actionType];
    if (!handler) {
      console.error(`No handler for action type: ${actionType}`);
      return false;
    }
    
    // Call handler to get state updates
    const { stateUpdate, newOptions } = await handler(context);
    
    // Apply updates using the most appropriate method available
    let updateSuccessful = false;
    
    // Try multiple update methods in order of preference
    if (stateUpdate || newOptions) {
      // Method 1: Use UPDATE_CONTEXT action if dispatch is available
      if (typeof dialogueState.dispatch === 'function') {
        try {
          dialogueState.dispatch({
            type: 'UPDATE_CONTEXT',
            update: {
              customText: stateUpdate?.text,
              customOptions: newOptions
            }
          });
          updateSuccessful = true;
        } catch (dispatchError) {
          console.warn('Failed to update via dispatch method:', dispatchError);
        }
      }
      
      // Method 2: If dispatch failed or isn't available, try direct state update
      if (!updateSuccessful && stateUpdate) {
        try {
          // Create updated state by merging current state with updates
          const updatedState = {
            ...dialogueState.currentState,
            ...(stateUpdate.text ? { text: stateUpdate.text } : {})
          };
          
          // Apply via set state if available
          if ('currentState' in dialogueState && typeof (dialogueState as any).set === 'function') {
            (dialogueState as any).set((state: any) => {
              state.currentState = updatedState;
              return state;
            });
            updateSuccessful = true;
          }
        } catch (directUpdateError) {
          console.warn('Failed to update state directly:', directUpdateError);
        }
      }
      
      // Method 3: Last resort - create a custom event to signal the change
      if (!updateSuccessful) {
        try {
          // Dispatch a custom event that components can listen for
          const event = new CustomEvent('strategic-action-applied', {
            detail: {
              actionType,
              stateUpdate,
              newOptions,
              stageId,
              characterId
            }
          });
          window.dispatchEvent(event);
          updateSuccessful = true;
        } catch (eventError) {
          console.error('All update methods failed:', eventError);
        }
      }
    } else {
      // No updates needed, consider it successful
      updateSuccessful = true;
    }
    
    // Log action application
    console.log(`Applied ${actionType} action to dialogue`);
    
    return updateSuccessful;
  } catch (error) {
    console.error(`Error applying action ${actionType}:`, error);
    return false;
  }
}

/**
 * Enhance dialogue options based on active actions
 * 
 * This is a pure function that takes options and returns enhanced versions
 * based on the active strategic action.
 * 
 * @param options Original dialogue options
 * @param activeAction Currently active strategic action
 * @returns Enhanced dialogue options
 */
export function enhanceDialogueOptions(
  options: DialogueOption[],
  activeAction: StrategicActionType | null
): DialogueOption[] {
  if (!activeAction) return options;
  
  // Get the enhancer for this action type
  const enhancer = optionEnhancers[activeAction];
  if (!enhancer) return options;
  
  // Apply the enhancement
  return enhancer(options, activeAction);
}

/**
 * Hook to integrate strategic actions with dialogue flow
 * 
 * This provides a clean API for components to use strategic actions
 * without worrying about the underlying implementation details.
 */
export function useStrategicDialogue(characterId: string, stageId: string) {
  // Apply an action to the current dialogue
  const applyAction = async (actionType: StrategicActionType): Promise<boolean> => {
    return applyStrategicAction(actionType, characterId, stageId);
  };
  
  // Get enhanced options based on active action
  const getEnhancedOptions = (options: DialogueOption[], activeAction: StrategicActionType | null): DialogueOption[] => {
    return enhanceDialogueOptions(options, activeAction);
  };
  
  return {
    applyAction,
    getEnhancedOptions
  };
}

export default {
  applyStrategicAction,
  enhanceDialogueOptions,
  useStrategicDialogue
};