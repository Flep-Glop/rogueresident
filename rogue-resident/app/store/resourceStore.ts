// app/store/resourceStore.ts
/**
 * Optimized Resource Management System
 * 
 * Improvements:
 * 1. Reduced event dispatching with batching
 * 2. More efficient state updates
 * 3. Improved effect handling
 * 4. Pre-computed selectors for performance
 * 5. Better type safety
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { safeDispatch } from '../core/events/CentralEventBus';
import { GameEventType } from '../core/events/EventTypes';

// ======== CONSTANTS ========

export const RESOURCE_THRESHOLDS = {
  REFRAME: 25,
  EXTRAPOLATE: 50,
  SYNTHESIS: 75,
  MAX: 100
};

export const MAX_MOMENTUM_LEVEL = 3;

// Enable/disable debug logging
const DEBUG_LOGGING = process.env.NODE_ENV !== 'production';

// ======== TYPE DEFINITIONS ========

export type ResourceType = 'insight' | 'momentum';

export type StrategicActionType =
  | 'reframe'
  | 'extrapolate'
  | 'boast'
  | 'synthesis';

interface ActionHistoryRecord {
  actionType: StrategicActionType;
  timestamp: number;
  characterId: string;
  stageId: string;
  successful: boolean;
  insightCost?: number;
  momentumRequired?: number;
}

interface ResourceEffectState {
  active: boolean;
  intensity: 'low' | 'medium' | 'high';
  startTime: number;
  duration: number;
  triggeredBy?: StrategicActionType | 'dialogue_choice' | 'system';
}

interface ResourceThreshold {
  value: number;
  label: string;
  actionType: StrategicActionType;
  nearbyRange: number;
  isNearby: boolean;
}

// Complete resource state interface
interface ResourceState {
  // State properties
  insight: number;
  insightMax: number;
  momentum: number;
  consecutiveCorrect: number;
  activeAction: StrategicActionType | null;
  actionHistory: ActionHistoryRecord[];
  insightEffect: ResourceEffectState;
  momentumEffect: ResourceEffectState;
  insightThresholds: ResourceThreshold[];
  availableActions: Record<StrategicActionType, boolean>;
  pendingResourceUpdates: boolean;
  lastResourceChange: {
    type: ResourceType | null;
    amount: number;
    timestamp: number;
  };

  // Actions
  updateInsight: (amount: number, source?: string) => void;
  setMomentum: (level: number, consecutive?: number) => void;
  incrementMomentum: () => void;
  resetMomentum: () => void;
  activateAction: (actionType: StrategicActionType, context: any) => boolean;
  completeAction: (actionType: StrategicActionType, successful: boolean) => void;
  cancelAction: (actionType: StrategicActionType) => void;
  triggerEffect: (
    resourceType: ResourceType, 
    intensity: 'low' | 'medium' | 'high', 
    source?: string, 
    duration?: number
  ) => void;
  clearEffect: (resourceType: ResourceType) => void;
  getThresholdProximity: (actionType: StrategicActionType) => number;
  resetResources: () => void;
  
  // Interface alignment methods
  setResource: (resourceType: ResourceType, amount: number) => void;
  hasEnoughResource: (resourceType: ResourceType, amount: number) => boolean;
  
  // Batch processing
  processPendingUpdates: () => void;
}

// Define initial state separately for clarity
const initialState: Omit<ResourceState, 
  | 'updateInsight' | 'setMomentum' | 'incrementMomentum' | 'resetMomentum'
  | 'activateAction' | 'completeAction' | 'cancelAction' | 'triggerEffect'
  | 'clearEffect' | 'getThresholdProximity' | 'resetResources' 
  | 'setResource' | 'hasEnoughResource' | 'processPendingUpdates'
> = {
  insight: 0,
  insightMax: 100,
  momentum: 0,
  consecutiveCorrect: 0,
  activeAction: null,
  actionHistory: [],
  insightEffect: {
    active: false,
    intensity: 'low',
    startTime: 0,
    duration: 2000,
    triggeredBy: undefined
  },
  momentumEffect: {
    active: false,
    intensity: 'low',
    startTime: 0,
    duration: 2000,
    triggeredBy: undefined
  },
  insightThresholds: [
    { value: RESOURCE_THRESHOLDS.REFRAME, label: 'R', actionType: 'reframe', nearbyRange: 10, isNearby: false },
    { value: RESOURCE_THRESHOLDS.EXTRAPOLATE, label: 'E', actionType: 'extrapolate', nearbyRange: 15, isNearby: false },
    { value: RESOURCE_THRESHOLDS.SYNTHESIS, label: 'S', actionType: 'synthesis', nearbyRange: 20, isNearby: false }
  ],
  availableActions: {
    reframe: false,
    extrapolate: false,
    boast: false,
    synthesis: false
  },
  pendingResourceUpdates: false,
  lastResourceChange: {
    type: null,
    amount: 0,
    timestamp: 0
  }
};

// ======== STORE CREATION ========

export const useResourceStore = create<ResourceState>()(
  immer((set, get) => {
    // Batch update timer reference
    let batchUpdateTimer: NodeJS.Timeout | null = null;
    
    // Create store
    return {
      ...initialState,

      // ======== ACTION IMPLEMENTATIONS ========
      
      /**
       * Update insight value with batched event dispatching
       */
      updateInsight: (amount: number, source = 'dialogue_choice') => {
        if (amount === 0) return; // Skip no-op updates
        
        const { insight, insightMax } = get();
        const newValue = Math.max(0, Math.min(insightMax, insight + amount));
        const change = newValue - insight;
        
        if (change === 0) return; // Skip no-op changes
        
        // Update state atomically
        set((state: ResourceState) => {
          // Update insight value
          state.insight = newValue;
          
          // Set effect state if change is significant
          if (Math.abs(change) >= 2) {
            let intensity: 'low' | 'medium' | 'high' = 'low';
            if (Math.abs(change) >= 15) intensity = 'high';
            else if (Math.abs(change) >= 5) intensity = 'medium';
            
            state.insightEffect = {
              active: true, 
              intensity, 
              startTime: Date.now(),
              duration: Math.abs(change) >= 15 ? 3000 : 2000,
              triggeredBy: source as any
            };
          }
          
          // Mark updates as pending and store last change
          state.pendingResourceUpdates = true;
          state.lastResourceChange = {
            type: 'insight',
            amount: change,
            timestamp: Date.now()
          };
          
          // Update threshold proximity and available actions
          updateThresholdProximity(state);
          updateAvailableActions(state);
        });
        
        // Schedule batch update processing
        scheduleBatchUpdate();
      },
      
      /**
       * Set momentum level with batched event dispatching
       */
      setMomentum: (level: number, consecutive?: number) => {
        const newLevel = Math.max(0, Math.min(MAX_MOMENTUM_LEVEL, level));
        const currentLevel = get().momentum;
        const currentConsecutive = get().consecutiveCorrect;
        const newConsecutive = consecutive !== undefined ? consecutive : currentConsecutive;
        
        // Skip no-op updates
        if (newLevel === currentLevel && newConsecutive === currentConsecutive) return;
        
        // Update state atomically
        set((state: ResourceState) => {
          state.momentum = newLevel;
          state.consecutiveCorrect = newConsecutive;
          
          // Set effect if momentum level changed
          if (newLevel !== currentLevel) {
            state.momentumEffect = {
              active: true,
              intensity: newLevel > currentLevel ? 'medium' : 'high',
              startTime: Date.now(),
              duration: newLevel === MAX_MOMENTUM_LEVEL ? 3000 : 2000,
              triggeredBy: newLevel > currentLevel ? 'dialogue_choice' : 'system'
            };
          }
          
          // Mark updates as pending and store last change
          state.pendingResourceUpdates = true;
          state.lastResourceChange = {
            type: 'momentum',
            amount: newLevel - currentLevel,
            timestamp: Date.now()
          };
          
          // Update available actions
          updateAvailableActions(state);
        });
        
        // Schedule batch update processing
        scheduleBatchUpdate();
      },
      
      /**
       * Increment momentum (convenience method)
       */
      incrementMomentum: () => {
        const { consecutiveCorrect } = get();
        const newConsecutive = consecutiveCorrect + 1;
        const newMomentum = Math.min(MAX_MOMENTUM_LEVEL, Math.floor(newConsecutive / 2));
        get().setMomentum(newMomentum, newConsecutive);
      },
      
      /**
       * Reset momentum to 0
       */
      resetMomentum: () => {
        get().setMomentum(0, 0);
      },
      
      /**
       * Activate a strategic action
       */
      activateAction: (actionType: StrategicActionType, context: any) => {
        const { insight, momentum, activeAction, availableActions } = get();
        
        // Check if another action is already active
        if (activeAction !== null) {
          if (DEBUG_LOGGING) {
            console.warn(`Cannot activate ${actionType} while ${activeAction} is active`);
          }
          return false;
        }
        
        // Check if action is available
        const isAvailable = availableActions[actionType] ?? false;
        if (!isAvailable) {
          if (DEBUG_LOGGING) {
            console.warn(`Cannot activate ${actionType} - not available (Insight: ${insight}, Momentum: ${momentum})`);
          }
          return false;
        }
        
        // Calculate cost and check if affordable
        let cost = 0;
        let canAfford = false;
        
        switch (actionType) {
          case 'reframe':
            cost = RESOURCE_THRESHOLDS.REFRAME;
            canAfford = insight >= cost;
            break;
          case 'extrapolate':
            cost = RESOURCE_THRESHOLDS.EXTRAPOLATE;
            canAfford = insight >= cost && momentum >= 2;
            break;
          case 'synthesis':
            cost = RESOURCE_THRESHOLDS.SYNTHESIS;
            canAfford = insight >= cost;
            break;
          case 'boast':
            canAfford = momentum === MAX_MOMENTUM_LEVEL;
            break;
        }
        
        if (!canAfford) {
          if (DEBUG_LOGGING) {
            console.warn(`Cannot activate ${actionType} - cannot afford (Insight: ${insight}, Momentum: ${momentum})`);
          }
          return false;
        }
        
        // Spend cost if applicable
        if (cost > 0) {
          get().updateInsight(-cost, actionType);
        }
        
        // Update action state
        set((state: ResourceState) => {
          state.activeAction = actionType;
          state.actionHistory.push({
            actionType, 
            timestamp: Date.now(),
            characterId: context?.characterId || 'unknown',
            stageId: context?.stageId || 'unknown',
            successful: true,
            insightCost: cost > 0 ? cost : undefined,
            momentumRequired: getMomentumRequired(actionType) || undefined
          });
        });
        
        // Dispatch action event immediately (no batching for actions)
        safeDispatch(
          GameEventType.STRATEGIC_ACTION_ACTIVATED,
          { 
            actionType, 
            insightCost: cost > 0 ? cost : undefined, 
            momentumRequired: getMomentumRequired(actionType) || undefined, 
            context 
          },
          'resourceStore.activateAction'
        );
        
        return true;
      },
      
      /**
       * Complete an active strategic action
       */
      completeAction: (actionType: StrategicActionType, successful: boolean) => {
        const { activeAction } = get();
        
        // Verify action is active
        if (activeAction !== actionType) {
          if (DEBUG_LOGGING) {
            console.warn(`Cannot complete ${actionType} - not currently active`);
          }
          return;
        }
        
        // Update action state
        set((state: ResourceState) => {
          state.activeAction = null;
          
          // Update history record
          const lastIndex = state.actionHistory.length - 1;
          if (lastIndex >= 0 && state.actionHistory[lastIndex].actionType === actionType) {
            state.actionHistory[lastIndex].successful = successful;
          }
          
          // Handle failed boast (reset momentum)
          if (actionType === 'boast' && !successful) {
            state.momentum = 0;
            state.consecutiveCorrect = 0;
            state.momentumEffect = {
              active: true, 
              intensity: 'high', 
              startTime: Date.now(),
              duration: 2500, 
              triggeredBy: 'boast'
            };
            
            // Mark updates as pending
            state.pendingResourceUpdates = true;
            state.lastResourceChange = {
              type: 'momentum',
              amount: -state.momentum,
              timestamp: Date.now()
            };
          }
          
          // Update available actions
          updateAvailableActions(state);
        });
        
        // Dispatch completion event immediately (no batching for actions)
        safeDispatch(
          successful ? GameEventType.STRATEGIC_ACTION_COMPLETED : GameEventType.STRATEGIC_ACTION_FAILED,
          { actionType, successful, outcome: successful ? 'success' : 'failure' },
          'resourceStore.completeAction'
        );
      },
      
      /**
       * Cancel an active strategic action and refund resources
       */
      cancelAction: (actionType: StrategicActionType) => {
        const { activeAction } = get();
        
        // Verify action is active
        if (activeAction !== actionType) {
          if (DEBUG_LOGGING) {
            console.warn(`Cannot cancel ${actionType} - not currently active`);
          }
          return;
        }
        
        // Calculate refund amount
        const insightCost = getInsightCost(actionType);
        
        // Update state
        set((state: ResourceState) => {
          state.activeAction = null;
          
          // Refund insight if applicable
          if (insightCost > 0) {
            const currentInsight = state.insight;
            state.insight = Math.min(state.insightMax, currentInsight + insightCost);
            
            if (DEBUG_LOGGING) {
              console.log(`Refunded ${insightCost} insight for canceled ${actionType}. New insight: ${state.insight}`);
            }
            
            // Mark updates as pending
            state.pendingResourceUpdates = true;
            state.lastResourceChange = {
              type: 'insight',
              amount: insightCost,
              timestamp: Date.now()
            };
            
            // Update threshold proximity
            updateThresholdProximity(state);
          }
          
          // Update available actions
          updateAvailableActions(state);
        });
        
        // Dispatch cancel event immediately (no batching for actions)
        safeDispatch(
          GameEventType.STRATEGIC_ACTION_CANCELLED,
          { actionType, insightRefunded: insightCost > 0 ? insightCost : undefined },
          'resourceStore.cancelAction'
        );
      },
      
      /**
       * Trigger a visual effect for a resource
       */
      triggerEffect: (
        resourceType: ResourceType, 
        intensity: 'low' | 'medium' | 'high' = 'medium', 
        source: string = 'system', 
        duration: number = 2000 
      ) => {
        set((state: ResourceState) => {
          const effectProp = resourceType === 'insight' ? 'insightEffect' : 'momentumEffect';
          state[effectProp] = {
            active: true, 
            intensity, 
            startTime: Date.now(), 
            duration,
            triggeredBy: source as any
          };
        });
      },
      
      /**
       * Clear an active effect
       */
      clearEffect: (resourceType: ResourceType) => {
        set((state: ResourceState) => {
          const effectProp = resourceType === 'insight' ? 'insightEffect' : 'momentumEffect';
          if (state[effectProp].active) {
            state[effectProp].active = false;
          }
        });
      },
      
      /**
       * Calculate proximity to a threshold (0-1 value)
       */
      getThresholdProximity: (actionType: StrategicActionType): number => {
        const { insight } = get();
        const thresholdValue = getInsightCost(actionType);
        
        // Already at or above threshold
        if (thresholdValue <= 0 || insight >= thresholdValue) return 1;
        
        // Find threshold configuration
        const threshold = get().insightThresholds.find(t => t.actionType === actionType);
        if (!threshold) return 0;
        
        // Calculate proximity
        const proximityStart = thresholdValue - threshold.nearbyRange;
        if (insight < proximityStart) return 0;
        
        return (insight - proximityStart) / threshold.nearbyRange;
      },
      
      /**
       * Reset resources to initial state
       */
      resetResources: () => {
        if (DEBUG_LOGGING) {
          console.log("Resetting resource store state...");
        }
        
        // Reset to initial values
        set({
          ...initialState,
          pendingResourceUpdates: true,
          lastResourceChange: {
            type: null,
            amount: 0,
            timestamp: Date.now()
          }
        });
        
        // Process batch update immediately
        scheduleBatchUpdate(0);
      },
      
      /**
       * Set a resource to a specific value (interface alignment)
       */
      setResource: (resourceType: ResourceType, amount: number) => {
        if (resourceType === 'insight') {
          const { insight } = get();
          get().updateInsight(amount - insight, 'system');
        } else if (resourceType === 'momentum') {
          get().setMomentum(amount);
        }
      },
      
      /**
       * Check if there's enough of a resource (interface alignment)
       */
      hasEnoughResource: (resourceType: ResourceType, amount: number): boolean => {
        if (resourceType === 'insight') {
          return get().insight >= amount;
        } else if (resourceType === 'momentum') {
          return get().momentum >= amount;
        }
        return false;
      },
      
      /**
       * Process any pending resource updates and dispatch events
       */
      processPendingUpdates: () => {
        const state = get();
        
        // Skip if no updates pending
        if (!state.pendingResourceUpdates) return;
        
        // Clear batch timer
        if (batchUpdateTimer) {
          clearTimeout(batchUpdateTimer);
          batchUpdateTimer = null;
        }
        
        // Process insight changes
        if (state.lastResourceChange.type === 'insight') {
          // Only dispatch if the change is significant
          if (Math.abs(state.lastResourceChange.amount) >= 1) {
            safeDispatch(
              GameEventType.RESOURCE_CHANGED,
              {
                resourceType: 'insight', 
                previousValue: state.insight - state.lastResourceChange.amount, 
                newValue: state.insight,
                change: state.lastResourceChange.amount, 
                thresholdProximity: {
                  reframe: state.getThresholdProximity('reframe'),
                  extrapolate: state.getThresholdProximity('extrapolate'),
                  synthesis: state.getThresholdProximity('synthesis')
                }
              },
              'resourceStore.batchUpdate'
            );
          }
        }
        
        // Process momentum changes
        else if (state.lastResourceChange.type === 'momentum') {
          safeDispatch(
            GameEventType.RESOURCE_CHANGED,
            {
              resourceType: 'momentum', 
              previousValue: state.momentum - state.lastResourceChange.amount, 
              newValue: state.momentum,
              change: state.lastResourceChange.amount, 
              consecutive: state.consecutiveCorrect
            },
            'resourceStore.batchUpdate'
          );
        }
        
        // Reset pending updates flag
        set(state => {
          state.pendingResourceUpdates = false;
        });
      }
    };
    
    // ======== HELPER FUNCTIONS ========
    
    /**
     * Schedule a batch update with debouncing
     */
    function scheduleBatchUpdate(delay: number = 50) {
      // Clear existing timer
      if (batchUpdateTimer) {
        clearTimeout(batchUpdateTimer);
      }
      
      // Set new timer
      batchUpdateTimer = setTimeout(() => {
        get().processPendingUpdates();
      }, delay);
    }
  })
);

// ======== HELPER FUNCTIONS ========

/**
 * Update threshold proximity flags
 */
function updateThresholdProximity(state: ResourceState) {
  const { insight, insightThresholds } = state;
  for (const threshold of insightThresholds) {
    threshold.isNearby = insight < threshold.value && 
                        insight >= threshold.value - threshold.nearbyRange;
  }
}

/**
 * Update available actions based on resources
 */
function updateAvailableActions(state: ResourceState) {
  const { insight, momentum, activeAction } = state;
  
  // If an action is already active, no other actions are available
  if (activeAction !== null) {
    state.availableActions = {
      reframe: false,
      extrapolate: false,
      boast: false,
      synthesis: false
    };
    return;
  }
  
  // Update availability based on current resources
  state.availableActions = {
    reframe: insight >= RESOURCE_THRESHOLDS.REFRAME,
    extrapolate: insight >= RESOURCE_THRESHOLDS.EXTRAPOLATE && momentum >= 2,
    boast: momentum === MAX_MOMENTUM_LEVEL,
    synthesis: insight >= RESOURCE_THRESHOLDS.SYNTHESIS
  };
}

/**
 * Get insight cost for an action
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
 * Get momentum required for an action
 */
function getMomentumRequired(actionType: StrategicActionType): number {
  switch (actionType) {
    case 'boast': return MAX_MOMENTUM_LEVEL;
    case 'extrapolate': return 2;
    default: return 0;
  }
}

// ======== OPTIMIZED SELECTORS ========

/**
 * Selectors for primitive values and derived state
 * These provide performance optimized access to store values
 */
export const selectors = {
  // Simple primitive values
  getInsight: (state: ResourceState) => state.insight,
  getInsightMax: (state: ResourceState) => state.insightMax,
  getMomentum: (state: ResourceState) => state.momentum,
  getConsecutiveCorrect: (state: ResourceState) => state.consecutiveCorrect,
  getActiveAction: (state: ResourceState) => state.activeAction,
  
  // Resource availability
  getCanUseReframe: (state: ResourceState) => state.availableActions.reframe,
  getCanUseExtrapolate: (state: ResourceState) => state.availableActions.extrapolate,
  getCanUseBoast: (state: ResourceState) => state.availableActions.boast,
  getCanUseSynthesis: (state: ResourceState) => state.availableActions.synthesis,
  
  // Effect states
  getInsightEffectActive: (state: ResourceState) => state.insightEffect.active,
  getInsightEffectIntensity: (state: ResourceState) => state.insightEffect.intensity,
  getMomentumEffectActive: (state: ResourceState) => state.momentumEffect.active,
  getMomentumEffectIntensity: (state: ResourceState) => state.momentumEffect.intensity,
  
  // Calculated values
  getActionIsActive: (state: ResourceState) => state.activeAction !== null,
  getInsightPercentage: (state: ResourceState) => (state.insight / state.insightMax) * 100,
  getMomentumPercentage: (state: ResourceState) => (state.momentum / MAX_MOMENTUM_LEVEL) * 100,
  
  // Threshold proximity values - implemented directly for performance
  getReframeProximity: (state: ResourceState) => {
    const threshold = RESOURCE_THRESHOLDS.REFRAME;
    if (state.insight >= threshold) return 1;
    const thr = state.insightThresholds.find(t => t.actionType === 'reframe');
    if (!thr) return 0;
    const start = threshold - thr.nearbyRange;
    return state.insight < start ? 0 : (state.insight - start) / thr.nearbyRange;
  },
  
  getExtrapolateProximity: (state: ResourceState) => {
    const threshold = RESOURCE_THRESHOLDS.EXTRAPOLATE;
    if (state.insight >= threshold) return 1;
    const thr = state.insightThresholds.find(t => t.actionType === 'extrapolate');
    if (!thr) return 0;
    const start = threshold - thr.nearbyRange;
    return state.insight < start ? 0 : (state.insight - start) / thr.nearbyRange;
  },
  
  getSynthesisProximity: (state: ResourceState) => {
    const threshold = RESOURCE_THRESHOLDS.SYNTHESIS;
    if (state.insight >= threshold) return 1;
    const thr = state.insightThresholds.find(t => t.actionType === 'synthesis');
    if (!thr) return 0;
    const start = threshold - thr.nearbyRange;
    return state.insight < start ? 0 : (state.insight - start) / thr.nearbyRange;
  },
  
  // Action history selectors
  getLastAction: (state: ResourceState) => 
    state.actionHistory.length > 0 ? state.actionHistory[state.actionHistory.length - 1] : null,
  
  getActionSuccessRate: (state: ResourceState) => {
    if (state.actionHistory.length === 0) return 0;
    const successfulActions = state.actionHistory.filter(a => a.successful).length;
    return successfulActions / state.actionHistory.length;
  },
  
  // Combined selectors for UI components - these help reduce re-renders
  getResourceSummary: (state: ResourceState) => ({
    insight: state.insight,
    insightMax: state.insightMax,
    momentum: state.momentum,
    momentumMax: MAX_MOMENTUM_LEVEL,
    insightPercentage: (state.insight / state.insightMax) * 100,
    momentumPercentage: (state.momentum / MAX_MOMENTUM_LEVEL) * 100
  }),
  
  getActionAvailability: (state: ResourceState) => ({
    reframe: state.availableActions.reframe,
    extrapolate: state.availableActions.extrapolate,
    boast: state.availableActions.boast,
    synthesis: state.availableActions.synthesis,
    anyAvailable: Object.values(state.availableActions).some(v => v)
  }),
  
  getResourceEffects: (state: ResourceState) => {
    const now = Date.now();
    return {
      insight: {
        active: state.insightEffect.active,
        intensity: state.insightEffect.intensity,
        triggeredBy: state.insightEffect.triggeredBy,
        remaining: Math.max(0, state.insightEffect.duration - (now - state.insightEffect.startTime))
      },
      momentum: {
        active: state.momentumEffect.active,
        intensity: state.momentumEffect.intensity,
        triggeredBy: state.momentumEffect.triggeredBy,
        remaining: Math.max(0, state.momentumEffect.duration - (now - state.momentumEffect.startTime))
      }
    };
  }
};

// ======== DEBUG UTILITIES ========

// Add debug access to window in development
if (typeof window !== 'undefined' && DEBUG_LOGGING) {
  window.__RESOURCE_STORE_DEBUG__ = {
    getState: () => useResourceStore.getState(),
    resetResources: () => useResourceStore.getState().resetResources(),
    simulateInsightGain: (amount: number) => {
      useResourceStore.getState().updateInsight(amount, 'debug');
    },
    simulateMomentumChange: (level: number) => {
      useResourceStore.getState().setMomentum(level);
    },
    forceProcessUpdates: () => {
      useResourceStore.getState().processPendingUpdates();
    },
    triggerEffect: (resourceType: ResourceType, intensity: 'low' | 'medium' | 'high') => {
      useResourceStore.getState().triggerEffect(resourceType, intensity, 'debug', 3000);
    }
  };
}

export default useResourceStore;