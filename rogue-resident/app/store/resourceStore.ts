// app/store/resourceStore.ts
/**
 * Resource Management System - Chamber Pattern Compliant
 * 
 * This store manages player resources that power strategic gameplay mechanics:
 * - Insight: Primary resource for knowledge-based actions
 * - Momentum: Combo-based resource that unlocks advanced strategies
 * 
 * The Chamber Pattern implementation provides:
 * - Primitive selectors for performance-optimized component binding
 * - Stable function references for callback consistency
 * - Atomic state updates for predictable state transitions
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
// Critical fix: Import both the singleton and the store hook
import CentralEventBus, { useEventBus, safeDispatch } from '../core/events/CentralEventBus';
import { GameEventType } from '../core/events/EventTypes';

// Constants
export const RESOURCE_THRESHOLDS = {
  REFRAME: 25,
  EXTRAPOLATE: 50,
  SYNTHESIS: 75
};
export const MAX_MOMENTUM_LEVEL = 3;

// Types
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

// Resource state interface with full type definitions
interface ResourceState {
  // State Properties
  insight: number;
  insightMax: number;
  momentum: number;
  consecutiveCorrect: number;
  activeAction: StrategicActionType | null;
  actionHistory: ActionHistoryRecord[];
  insightEffect: ResourceEffectState;
  momentumEffect: ResourceEffectState;
  insightThresholds: ResourceThreshold[];
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
  activateAction: (actionType: StrategicActionType, context: any) => boolean;
  completeAction: (actionType: StrategicActionType, successful: boolean) => void;
  cancelAction: (actionType: StrategicActionType) => void;
  triggerEffect: (resourceType: ResourceType, intensity: 'low' | 'medium' | 'high', source?: string, duration?: number) => void;
  clearEffect: (resourceType: ResourceType) => void;
  getThresholdProximity: (actionType: StrategicActionType) => number;
  resetResources: () => void;
  
  // Interface alignment methods
  setResource: (resourceType: ResourceType, amount: number) => void;
  hasEnoughResource: (resourceType: ResourceType, amount: number) => boolean;
}

// Define initial state separately for clarity
const initialState: Omit<ResourceState, 
  'updateInsight' | 'setMomentum' | 'incrementMomentum' | 'resetMomentum' |
  'activateAction' | 'completeAction' | 'cancelAction' | 'triggerEffect' |
  'clearEffect' | 'getThresholdProximity' | 'resetResources' | 
  'setResource' | 'hasEnoughResource'
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
    }
};

export const useResourceStore = create<ResourceState>()(
  immer((set, get) => ({
    ...initialState,

    // --- Action Implementations ---
    updateInsight: (amount: number, source = 'dialogue_choice') => {
      const { insight, insightMax } = get();
      const newValue = Math.max(0, Math.min(insightMax, insight + amount));
      const change = newValue - insight;

      if (change === 0) return;

      set((state: ResourceState) => {
        state.insight = newValue;
        let intensity: 'low' | 'medium' | 'high' = 'low';
        if (Math.abs(change) >= 15) intensity = 'high';
        else if (Math.abs(change) >= 5) intensity = 'medium';

        if (Math.abs(change) >= 2) {
          state.insightEffect = {
            active: true, intensity, startTime: Date.now(),
            duration: Math.abs(change) >= 15 ? 3000 : 2000,
            triggeredBy: source as any
          };
        }
        updateThresholdProximity(state);
        updateAvailableActions(state);
      });

       if (Math.abs(change) >= 1) {
          safeDispatch(
            GameEventType.RESOURCE_CHANGED,
            {
              resourceType: 'insight', previousValue: insight, newValue,
              change: change, source,
              thresholdProximity: {
                reframe: get().getThresholdProximity('reframe'),
                extrapolate: get().getThresholdProximity('extrapolate'),
                synthesis: get().getThresholdProximity('synthesis')
              }
            },
            'resourceStore.updateInsight'
          );
       }
    },

    setMomentum: (level: number, consecutive?: number) => {
      const newLevel = Math.max(0, Math.min(MAX_MOMENTUM_LEVEL, level));
      const currentLevel = get().momentum;
      const currentConsecutive = get().consecutiveCorrect;
      const newConsecutive = consecutive !== undefined ? consecutive : currentConsecutive;

      if (newLevel === currentLevel && newConsecutive === currentConsecutive) return;

      set((state: ResourceState) => {
        state.momentum = newLevel;
        state.consecutiveCorrect = newConsecutive;

        if (newLevel !== currentLevel) {
          state.momentumEffect = {
            active: true,
            intensity: newLevel > currentLevel ? 'medium' : 'high',
            startTime: Date.now(),
            duration: newLevel === MAX_MOMENTUM_LEVEL ? 3000 : 2000,
            triggeredBy: newLevel > currentLevel ? 'dialogue_choice' : 'system'
          };
        }
        updateAvailableActions(state);
      });

      if (newLevel !== currentLevel) {
          safeDispatch(
            GameEventType.RESOURCE_CHANGED,
            {
              resourceType: 'momentum', previousValue: currentLevel, newValue: newLevel,
              change: newLevel - currentLevel, consecutive: newConsecutive
            },
            'resourceStore.setMomentum'
          );
      }
    },

    incrementMomentum: () => {
      const { consecutiveCorrect } = get();
      const newConsecutive = consecutiveCorrect + 1;
      const newMomentum = Math.min(MAX_MOMENTUM_LEVEL, Math.floor(newConsecutive / 2));
      get().setMomentum(newMomentum, newConsecutive);
    },

    resetMomentum: () => {
      get().setMomentum(0, 0);
    },

    activateAction: (actionType: StrategicActionType, context: any) => {
      const { insight, momentum, activeAction, availableActions } = get();

      if (activeAction !== null) {
        console.warn(`Cannot activate ${actionType} while ${activeAction} is active`);
        return false;
      }

      const isAvailable = availableActions[actionType] ?? false;
      if (!isAvailable) {
        console.warn(`Cannot activate ${actionType} - not available (Insight: ${insight}, Momentum: ${momentum})`);
        return false;
      }

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
         console.warn(`Cannot activate ${actionType} - cannot afford (Insight: ${insight}, Momentum: ${momentum})`);
         return false;
      }

      if (cost > 0) {
        get().updateInsight(-cost, actionType);
      }

      set((state: ResourceState) => {
        state.activeAction = actionType;
        state.actionHistory.push({
          actionType, timestamp: Date.now(),
          characterId: context?.characterId || 'unknown',
          stageId: context?.stageId || 'unknown',
          successful: true,
          insightCost: cost > 0 ? cost : undefined,
          momentumRequired: getMomentumRequired(actionType) || undefined
        });
      });

      safeDispatch(
          GameEventType.STRATEGIC_ACTION,
          { actionType, state: 'activated', insightCost: cost > 0 ? cost : undefined, momentumRequired: getMomentumRequired(actionType) || undefined, context },
          'resourceStore.activateAction'
      );

      return true;
    },

    completeAction: (actionType: StrategicActionType, successful: boolean) => {
      const { activeAction } = get();
      if (activeAction !== actionType) {
        console.warn(`Cannot complete ${actionType} - not currently active`);
        return;
      }

      set((state: ResourceState) => {
        state.activeAction = null;

        const lastIndex = state.actionHistory.length - 1;
        if (lastIndex >= 0 && state.actionHistory[lastIndex].actionType === actionType) {
          state.actionHistory[lastIndex].successful = successful;
        }

        if (actionType === 'boast' && !successful) {
          state.momentum = 0;
          state.consecutiveCorrect = 0;
          state.momentumEffect = {
            active: true, intensity: 'high', startTime: Date.now(),
            duration: 2500, triggeredBy: 'boast'
          };
        }
        updateAvailableActions(state);
      });

      safeDispatch(
          GameEventType.STRATEGIC_ACTION,
          { actionType, state: 'completed', successful, outcome: successful ? 'success' : 'failure' },
          'resourceStore.completeAction'
      );
    },

    cancelAction: (actionType: StrategicActionType) => {
      const { activeAction } = get();
      if (activeAction !== actionType) {
        console.warn(`Cannot cancel ${actionType} - not currently active`);
        return;
      }

      const insightCost = getInsightCost(actionType);

      set((state: ResourceState) => {
        state.activeAction = null;

        if (insightCost > 0) {
          const currentInsight = state.insight;
          state.insight = Math.min(state.insightMax, currentInsight + insightCost);
          console.log(`Refunded ${insightCost} insight for canceled ${actionType}. New insight: ${state.insight}`);
          updateThresholdProximity(state);
        }
        updateAvailableActions(state);
      });

      safeDispatch(
          GameEventType.STRATEGIC_ACTION,
          { actionType, state: 'canceled', insightRefunded: insightCost > 0 ? insightCost : undefined },
          'resourceStore.cancelAction'
      );
    },

    triggerEffect: (
      resourceType: ResourceType, 
      intensity: 'low' | 'medium' | 'high' = 'medium', 
      source: string = 'system', 
      duration: number = 2000 
    ) => {
      set((state: ResourceState) => {
        const effectProp = resourceType === 'insight' ? 'insightEffect' : 'momentumEffect';
        state[effectProp] = {
          active: true, intensity, startTime: Date.now(), duration,
          triggeredBy: source as any
        };
      });
    },

    clearEffect: (resourceType: ResourceType) => {
      set((state: ResourceState) => {
        const effectProp = resourceType === 'insight' ? 'insightEffect' : 'momentumEffect';
        if (state[effectProp].active) {
            state[effectProp].active = false;
        }
      });
    },

    getThresholdProximity: (actionType: StrategicActionType): number => {
      const { insight } = get();
      const thresholdValue = getInsightCost(actionType);
      if (thresholdValue <= 0) return 0;
      if (insight >= thresholdValue) return 1;

      const threshold = get().insightThresholds.find((t: ResourceThreshold) => t.actionType === actionType);
      if (!threshold) return 0;

      const proximityStart = thresholdValue - threshold.nearbyRange;
      if (insight < proximityStart) return 0;

      return (insight - proximityStart) / threshold.nearbyRange;
    },

    resetResources: () => {
      console.log("Resetting resource store state...");
      set(initialState);
      safeDispatch(GameEventType.RESOURCE_CHANGED, { resourceType: 'all', action: 'reset' }, 'resourceStore.resetResources');
    },

    // New interface alignment methods
    setResource: (resourceType: ResourceType, amount: number) => {
      if (resourceType === 'insight') {
        const { insight } = get();
        get().updateInsight(amount - insight, 'system');
      } else if (resourceType === 'momentum') {
        get().setMomentum(amount);
      }
    },

    hasEnoughResource: (resourceType: ResourceType, amount: number): boolean => {
      if (resourceType === 'insight') {
        return get().insight >= amount;
      } else if (resourceType === 'momentum') {
        return get().momentum >= amount;
      }
      return false;
    }
  }))
);

// ======== SELECTORS ========
// Chamber Pattern compliant primitive value selectors

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
  
  // Threshold proximity values
  getReframeProximity: (state: ResourceState) => {
    const threshold = RESOURCE_THRESHOLDS.REFRAME;
    if (state.insight >= threshold) return 1;
    const thr = state.insightThresholds.find(t => t.actionType === 'reframe');
    if (!thr) return 0;
    const start = threshold - thr.nearbyRange;
    if (state.insight < start) return 0;
    return (state.insight - start) / thr.nearbyRange;
  },
  
  getExtrapolateProximity: (state: ResourceState) => {
    const threshold = RESOURCE_THRESHOLDS.EXTRAPOLATE;
    if (state.insight >= threshold) return 1;
    const thr = state.insightThresholds.find(t => t.actionType === 'extrapolate');
    if (!thr) return 0;
    const start = threshold - thr.nearbyRange;
    if (state.insight < start) return 0;
    return (state.insight - start) / thr.nearbyRange;
  },
  
  getSynthesisProximity: (state: ResourceState) => {
    const threshold = RESOURCE_THRESHOLDS.SYNTHESIS;
    if (state.insight >= threshold) return 1;
    const thr = state.insightThresholds.find(t => t.actionType === 'synthesis');
    if (!thr) return 0;
    const start = threshold - thr.nearbyRange;
    if (state.insight < start) return 0;
    return (state.insight - start) / thr.nearbyRange;
  },
  
  // Action history selectors
  getLastAction: (state: ResourceState) => 
    state.actionHistory.length > 0 ? state.actionHistory[state.actionHistory.length - 1] : null,
  
  getActionSuccessRate: (state: ResourceState) => {
    if (state.actionHistory.length === 0) return 0;
    const successfulActions = state.actionHistory.filter(a => a.successful).length;
    return successfulActions / state.actionHistory.length;
  },
  
  // Combined selectors for UI components
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
  
  getResourceEffects: (state: ResourceState) => ({
    insight: {
      active: state.insightEffect.active,
      intensity: state.insightEffect.intensity,
      triggeredBy: state.insightEffect.triggeredBy,
      remaining: Math.max(0, state.insightEffect.duration - (Date.now() - state.insightEffect.startTime))
    },
    momentum: {
      active: state.momentumEffect.active,
      intensity: state.momentumEffect.intensity,
      triggeredBy: state.momentumEffect.triggeredBy,
      remaining: Math.max(0, state.momentumEffect.duration - (Date.now() - state.momentumEffect.startTime))
    }
  })
};

// ======== HELPER FUNCTIONS ========

function updateThresholdProximity(state: ResourceState) {
  const { insight, insightThresholds } = state;
  for (const threshold of insightThresholds) {
    if (insight >= threshold.value) {
      threshold.isNearby = false;
    } else {
      threshold.isNearby = insight >= threshold.value - threshold.nearbyRange;
    }
  }
}

function updateAvailableActions(state: ResourceState) {
  const { insight, momentum, activeAction } = state;
  if (activeAction !== null) {
    state.availableActions = { reframe: false, extrapolate: false, boast: false, synthesis: false };
    return;
  }
  state.availableActions = {
    reframe: insight >= RESOURCE_THRESHOLDS.REFRAME,
    extrapolate: insight >= RESOURCE_THRESHOLDS.EXTRAPOLATE && momentum >= 2,
    boast: momentum === MAX_MOMENTUM_LEVEL,
    synthesis: insight >= RESOURCE_THRESHOLDS.SYNTHESIS
  };
}

function getInsightCost(actionType: StrategicActionType): number {
  switch (actionType) {
    case 'reframe': return RESOURCE_THRESHOLDS.REFRAME;
    case 'extrapolate': return RESOURCE_THRESHOLDS.EXTRAPOLATE;
    case 'synthesis': return RESOURCE_THRESHOLDS.SYNTHESIS;
    default: return 0;
  }
}

function getMomentumRequired(actionType: StrategicActionType): number {
  switch (actionType) {
    case 'boast': return MAX_MOMENTUM_LEVEL;
    case 'extrapolate': return 2;
    default: return 0;
  }
}

export default useResourceStore;