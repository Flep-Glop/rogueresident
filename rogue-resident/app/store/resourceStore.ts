// app/store/resourceStore.ts
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { useEventBus } from '../core/events/CentralEventBus';
import { GameEventType } from '../core/events/EventTypes';

/**
 * Strategic resource thresholds for action availability
 */
export const RESOURCE_THRESHOLDS = {
  REFRAME: 25,
  EXTRAPOLATE: 50,
  SYNTHESIS: 75
};

/**
 * Maximum momentum level achievable
 */
export const MAX_MOMENTUM_LEVEL = 3;

/**
 * Types of resources in the game
 */
export type ResourceType = 'insight' | 'momentum';

/**
 * Types of strategic actions available to the player
 */
export type StrategicActionType = 
  | 'reframe'      // Change conversation direction (25% insight)
  | 'extrapolate'  // Form knowledge connections (50% insight)
  | 'boast'        // High-risk, high-reward option (max momentum)
  | 'synthesis';   // Discover new knowledge (75% insight)

/**
 * History record of action usage for meta-progression
 */
interface ActionHistoryRecord {
  actionType: StrategicActionType;
  timestamp: number;
  characterId: string;
  stageId: string;
  successful: boolean;
  insightCost?: number;
  momentumRequired?: number;
}

/**
 * Visual effect state for resource changes
 */
interface ResourceEffectState {
  active: boolean;
  intensity: 'low' | 'medium' | 'high';
  startTime: number;
  duration: number;
  triggeredBy?: StrategicActionType | 'dialogue_choice' | 'system';
}

/**
 * Threshold visualization for anticipation zones
 */
interface ResourceThreshold {
  value: number;
  label: string;
  actionType: StrategicActionType;
  nearbyRange: number;
  isNearby: boolean;
}

/**
 * State for the resource store
 */
interface ResourceState {
  // Core resources
  insight: number;
  insightMax: number;
  momentum: number;
  consecutiveCorrect: number;
  
  // Action states
  activeAction: StrategicActionType | null;
  actionHistory: ActionHistoryRecord[];
  
  // Visual effects
  insightEffect: ResourceEffectState;
  momentumEffect: ResourceEffectState;
  
  // Resource thresholds for visualization
  insightThresholds: ResourceThreshold[];
  
  // Derived availability (computed)
  availableActions: {
    reframe: boolean;
    extrapolate: boolean;
    boast: boolean;
    synthesis: boolean;
  };
  
  // Actions
  updateInsight: (amount: number, source?: string) => void;
  setMomentum: (level: number, consecutive?: number) => void;
  incrementMomentum: () => void;
  resetMomentum: () => void;
  
  // Strategic action management
  activateAction: (actionType: StrategicActionType, context: any) => boolean;
  completeAction: (actionType: StrategicActionType, successful: boolean) => void;
  cancelAction: (actionType: StrategicActionType) => void;
  
  // Visual effect management  
  triggerEffect: (resourceType: ResourceType, intensity: 'low' | 'medium' | 'high', source?: string, duration?: number) => void;
  clearEffect: (resourceType: ResourceType) => void;
  
  // Threshold management
  getThresholdProximity: (actionType: StrategicActionType) => number; // 0-1 value indicating proximity
}

/**
 * Central store for managing game resources and strategic actions
 * 
 * This uses the Zustand + Immer combination for immutable state updates
 * without the boilerplate. The store handles both the resources themselves
 * and the visual effects that accompany resource changes.
 */
export const useResourceStore = create<ResourceState>()(
  immer((set, get) => ({
    // Initial resource values
    insight: 0,
    insightMax: 100,
    momentum: 0,
    consecutiveCorrect: 0,
    
    // Action tracking
    activeAction: null,
    actionHistory: [],
    
    // Visual effect states
    insightEffect: { 
      active: false, 
      intensity: 'low',
      startTime: 0,
      duration: 2000
    },
    momentumEffect: { 
      active: false, 
      intensity: 'low',
      startTime: 0,
      duration: 2000
    },
    
    // Threshold visualization
    insightThresholds: [
      { 
        value: RESOURCE_THRESHOLDS.REFRAME, 
        label: 'R', 
        actionType: 'reframe',
        nearbyRange: 10,
        isNearby: false
      },
      { 
        value: RESOURCE_THRESHOLDS.EXTRAPOLATE, 
        label: 'E', 
        actionType: 'extrapolate',
        nearbyRange: 15,
        isNearby: false
      },
      { 
        value: RESOURCE_THRESHOLDS.SYNTHESIS, 
        label: 'S', 
        actionType: 'synthesis',
        nearbyRange: 20,
        isNearby: false
      }
    ],
    
    // Computed availability (will be derived in the getter)
    availableActions: {
      reframe: false,
      extrapolate: false,
      boast: false,
      synthesis: false
    },
    
    /**
     * Updates the player's insight resource
     * @param amount Amount to change (positive or negative)
     * @param source Source of the change for tracking
     */
    updateInsight: (amount: number, source = 'dialogue_choice') => {
      // Get current state
      const { insight, insightMax } = get();
      
      // Calculate new value with bounds
      const newValue = Math.max(0, Math.min(insightMax, insight + amount));
      
      // Set new value and trigger appropriate effects
      set(state => {
        // Update value
        state.insight = newValue;
        
        // Determine effect intensity based on amount
        let intensity: 'low' | 'medium' | 'high' = 'low';
        if (Math.abs(amount) >= 15) intensity = 'high';
        else if (Math.abs(amount) >= 5) intensity = 'medium';
        
        // Only trigger effect for significant changes
        if (Math.abs(amount) >= 2) {
          state.insightEffect = {
            active: true,
            intensity,
            startTime: Date.now(),
            duration: amount >= 15 ? 3000 : 2000, // Longer duration for major changes
            triggeredBy: source as any
          };
        }
        
        // Update threshold proximity indicators
        updateThresholdProximity(state);
        
        // Recalculate available actions
        updateAvailableActions(state);
        
        return state;
      });
      
      // Log significant insight changes
      if (Math.abs(amount) >= 5) {
        try {
          useEventBus.getState().dispatch(
            GameEventType.RESOURCE_CHANGED,
            {
              resourceType: 'insight',
              previousValue: insight,
              newValue,
              change: amount,
              source,
              thresholdProximity: {
                reframe: get().getThresholdProximity('reframe'),
                extrapolate: get().getThresholdProximity('extrapolate'),
                synthesis: get().getThresholdProximity('synthesis')
              }
            },
            'resourceStore'
          );
        } catch (error) {
          console.error('Failed to dispatch insight change event:', error);
        }
      }
    },
    
    /**
     * Sets momentum to a specific level
     * @param level New momentum level (0-3)
     * @param consecutive Optional consecutive correct answer count
     */
    setMomentum: (level: number, consecutive?: number) => {
      // Bound level to valid range
      const newLevel = Math.max(0, Math.min(MAX_MOMENTUM_LEVEL, level));
      const currentLevel = get().momentum;
      
      // Set new values
      set(state => {
        // Update momentum
        state.momentum = newLevel;
        
        // Update consecutive if provided
        if (consecutive !== undefined) {
          state.consecutiveCorrect = consecutive;
        }
        
        // Set effect based on level change
        if (newLevel !== currentLevel) {
          state.momentumEffect = {
            active: true,
            intensity: newLevel > currentLevel ? 'medium' : 'high',
            startTime: Date.now(),
            duration: newLevel === MAX_MOMENTUM_LEVEL ? 3000 : 2000, // Longer duration for max momentum
            triggeredBy: newLevel > currentLevel ? 'dialogue_choice' : 'system'
          };
        }
        
        // Recalculate available actions
        updateAvailableActions(state);
        
        return state;
      });
      
      // Log momentum level changes
      if (newLevel !== currentLevel) {
        try {
          useEventBus.getState().dispatch(
            GameEventType.RESOURCE_CHANGED,
            {
              resourceType: 'momentum',
              previousValue: currentLevel,
              newValue: newLevel,
              change: newLevel - currentLevel,
              consecutive: consecutive || get().consecutiveCorrect
            },
            'resourceStore'
          );
        } catch (error) {
          console.error('Failed to dispatch momentum change event:', error);
        }
      }
    },
    
    /**
     * Increment momentum by one level and consecutive count by one
     */
    incrementMomentum: () => {
      const { momentum, consecutiveCorrect } = get();
      
      // Calculate new values
      const newConsecutive = consecutiveCorrect + 1;
      // Every 2 correct answers = 1 momentum level, max 3
      const newMomentum = Math.min(MAX_MOMENTUM_LEVEL, Math.floor(newConsecutive / 2));
      
      // Set new state
      get().setMomentum(newMomentum, newConsecutive);
    },
    
    /**
     * Reset momentum to zero
     */
    resetMomentum: () => {
      get().setMomentum(0, 0);
    },
    
    /**
     * Activate a strategic action
     * @param actionType Type of action to activate
     * @param context Additional context about where the action was activated
     * @returns True if action was successfully activated
     */
    activateAction: (actionType: StrategicActionType, context: any) => {
      // Get current state
      const { insight, momentum, activeAction, availableActions } = get();
      
      // Check if another action is already active
      if (activeAction !== null) {
        console.warn(`Cannot activate ${actionType} while ${activeAction} is active`);
        return false;
      }
      
      // Check if the requested action is available
      const isAvailable = availableActions[actionType] ?? false;
      if (!isAvailable) {
        console.warn(`Cannot activate ${actionType} - not available`);
        return false;
      }
      
      // Check resource requirements and spend them
      let successful = false;
      switch (actionType) {
        case 'reframe':
          if (insight >= RESOURCE_THRESHOLDS.REFRAME) {
            get().updateInsight(-RESOURCE_THRESHOLDS.REFRAME, 'reframe');
            successful = true;
          }
          break;
          
        case 'extrapolate':
          if (insight >= RESOURCE_THRESHOLDS.EXTRAPOLATE && momentum >= 2) {
            get().updateInsight(-RESOURCE_THRESHOLDS.EXTRAPOLATE, 'extrapolate');
            successful = true;
          }
          break;
          
        case 'synthesis':
          if (insight >= RESOURCE_THRESHOLDS.SYNTHESIS) {
            get().updateInsight(-RESOURCE_THRESHOLDS.SYNTHESIS, 'synthesis');
            successful = true;
          }
          break;
          
        case 'boast':
          // Boast doesn't cost insight, just requires max momentum
          if (momentum === MAX_MOMENTUM_LEVEL) {
            successful = true;
          }
          break;
      }
      
      // If successful, set active action
      if (successful) {
        set(state => {
          state.activeAction = actionType;
          
          // Add to history
          state.actionHistory.push({
            actionType,
            timestamp: Date.now(),
            characterId: context?.characterId || 'unknown',
            stageId: context?.stageId || 'unknown',
            successful: true,
            insightCost: getInsightCost(actionType),
            momentumRequired: getMomentumRequired(actionType)
          });
          
          return state;
        });
        
        // Log action activation
        try {
          useEventBus.getState().dispatch(
            GameEventType.STRATEGIC_ACTION,
            {
              actionType,
              state: 'activated',
              insightCost: getInsightCost(actionType),
              momentumRequired: getMomentumRequired(actionType),
              context
            },
            'resourceStore'
          );
        } catch (error) {
          console.error(`Failed to dispatch ${actionType} activation event:`, error);
        }
      }
      
      return successful;
    },
    
    /**
     * Complete an active strategic action
     * @param actionType Type of action being completed
     * @param successful Whether the action was successful
     */
    completeAction: (actionType: StrategicActionType, successful: boolean) => {
      // Get current state
      const { activeAction } = get();
      
      // Check if this action is actually active
      if (activeAction !== actionType) {
        console.warn(`Cannot complete ${actionType} - not currently active`);
        return;
      }
      
      // Update action history with completion status
      set(state => {
        // Clear active action
        state.activeAction = null;
        
        // Update last history entry
        const lastIndex = state.actionHistory.length - 1;
        if (lastIndex >= 0 && state.actionHistory[lastIndex].actionType === actionType) {
          state.actionHistory[lastIndex].successful = successful;
        }
        
        // Handle boast completion specifically - reset momentum if failed
        if (actionType === 'boast' && !successful) {
          state.momentum = 0;
          state.consecutiveCorrect = 0;
          
          // Set momentum effect
          state.momentumEffect = {
            active: true,
            intensity: 'high',
            startTime: Date.now(),
            duration: 2500,
            triggeredBy: 'boast'
          };
        }
        
        // Recalculate available actions
        updateAvailableActions(state);
        
        return state;
      });
      
      // Log action completion
      try {
        useEventBus.getState().dispatch(
          GameEventType.STRATEGIC_ACTION,
          {
            actionType,
            state: 'completed',
            successful,
            outcome: successful ? 'success' : 'failure'
          },
          'resourceStore'
        );
      } catch (error) {
        console.error(`Failed to dispatch ${actionType} completion event:`, error);
      }
    },
    
    /**
     * Cancel an active strategic action
     * @param actionType Type of action to cancel
     */
    cancelAction: (actionType: StrategicActionType) => {
      // Get current state
      const { activeAction } = get();
      
      // Check if this action is actually active
      if (activeAction !== actionType) {
        console.warn(`Cannot cancel ${actionType} - not currently active`);
        return;
      }
      
      // Cancel the action
      set(state => {
        state.activeAction = null;
        
        // Refund insight cost for canceled actions
        const insightCost = getInsightCost(actionType);
        if (insightCost > 0) {
          state.insight = Math.min(state.insightMax, state.insight + insightCost);
          
          // Update threshold proximity
          updateThresholdProximity(state);
        }
        
        // Recalculate available actions
        updateAvailableActions(state);
        
        return state;
      });
      
      // Log action cancellation
      try {
        useEventBus.getState().dispatch(
          GameEventType.STRATEGIC_ACTION,
          {
            actionType,
            state: 'canceled',
            insightRefunded: getInsightCost(actionType)
          },
          'resourceStore'
        );
      } catch (error) {
        console.error(`Failed to dispatch ${actionType} cancellation event:`, error);
      }
    },
    
    /**
     * Trigger a visual effect for a resource change
     * @param resourceType Type of resource being changed
     * @param intensity How strong the effect should be
     * @param source What triggered the effect
     * @param duration How long the effect should last (ms)
     */
    triggerEffect: (
      resourceType: ResourceType, 
      intensity: 'low' | 'medium' | 'high' = 'medium',
      source: string = 'system',
      duration: number = 2000
    ) => {
      set(state => {
        if (resourceType === 'insight') {
          state.insightEffect = {
            active: true,
            intensity,
            startTime: Date.now(),
            duration,
            triggeredBy: source as any
          };
        } else if (resourceType === 'momentum') {
          state.momentumEffect = {
            active: true,
            intensity,
            startTime: Date.now(),
            duration,
            triggeredBy: source as any
          };
        }
        
        return state;
      });
    },
    
    /**
     * Clear any active effect for a resource
     * @param resourceType Type of resource to clear effect for
     */
    clearEffect: (resourceType: ResourceType) => {
      set(state => {
        if (resourceType === 'insight') {
          state.insightEffect.active = false;
        } else if (resourceType === 'momentum') {
          state.momentumEffect.active = false;
        }
        
        return state;
      });
    },
    
    /**
     * Get proximity to a threshold for a given action (0-1 value)
     * 0 = far away, 1 = at or past threshold
     */
    getThresholdProximity: (actionType: StrategicActionType): number => {
      const { insight } = get();
      
      // Get threshold for this action
      const thresholdValue = getInsightCost(actionType);
      if (thresholdValue <= 0) return 0;
      
      // Calculate proximity
      if (insight >= thresholdValue) return 1;
      
      // Get the threshold object to check proximity range
      const threshold = get().insightThresholds.find(t => t.actionType === actionType);
      if (!threshold) return 0;
      
      // Calculate relative proximity when within range
      if (insight >= thresholdValue - threshold.nearbyRange) {
        return (insight - (thresholdValue - threshold.nearbyRange)) / threshold.nearbyRange;
      }
      
      return 0;
    }
  }))
);

/**
 * Helper function to get the insight cost of an action
 */
function getInsightCost(actionType: StrategicActionType): number {
  switch (actionType) {
    case 'reframe': return RESOURCE_THRESHOLDS.REFRAME;
    case 'extrapolate': return RESOURCE_THRESHOLDS.EXTRAPOLATE;
    case 'synthesis': return RESOURCE_THRESHOLDS.SYNTHESIS;
    default: return 0;
  }
}

/**
 * Helper function to get the momentum requirement of an action
 */
function getMomentumRequired(actionType: StrategicActionType): number {
  switch (actionType) {
    case 'boast': return MAX_MOMENTUM_LEVEL;
    case 'extrapolate': return 2;
    default: return 0;
  }
}

/**
 * Helper function to update threshold proximity indicators
 */
function updateThresholdProximity(state: any) {
  const { insight, insightThresholds } = state;
  
  // Update each threshold's proximity state
  for (const threshold of insightThresholds) {
    // Already past threshold
    if (insight >= threshold.value) {
      threshold.isNearby = false;
      continue;
    }
    
    // Check if we're within range of the threshold
    threshold.isNearby = insight >= threshold.value - threshold.nearbyRange;
  }
}

/**
 * Helper function to update the available actions based on current resources
 */
function updateAvailableActions(state: any) {
  const { insight, momentum, activeAction } = state;
  
  // If an action is active, no other actions are available
  if (activeAction !== null) {
    state.availableActions = {
      reframe: false,
      extrapolate: false,
      boast: false,
      synthesis: false
    };
    return;
  }
  
  // Otherwise check each action's requirements
  state.availableActions = {
    reframe: insight >= RESOURCE_THRESHOLDS.REFRAME,
    extrapolate: insight >= RESOURCE_THRESHOLDS.EXTRAPOLATE && momentum >= 2,
    boast: momentum === MAX_MOMENTUM_LEVEL,
    synthesis: insight >= RESOURCE_THRESHOLDS.SYNTHESIS
  };
}

export default useResourceStore;