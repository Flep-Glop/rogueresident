// app/hooks/useGameplayEffects.ts
import { useCallback, useRef, useEffect } from 'react';
import { useEventBus } from '../core/events/CentralEventBus';
import { GameEventType } from '../core/events/EventTypes';
import { useResourceStore } from '../store/resourceStore';
import { usePrimitiveStoreValue, useStableStoreValue } from '../core/utils/storeHooks';

/**
 * Maximum momentum level that can be achieved
 */
export const MAX_MOMENTUM_LEVEL = 3;

/**
 * Types of gameplay effects that can be triggered based on player actions
 */
export type GameplayEffectType = 
  | 'momentum_gain'     // Correct answer increases momentum
  | 'momentum_break'    // Incorrect answer resets momentum
  | 'momentum_peak'     // Reached maximum momentum level
  | 'insight_boost'     // Bonus insight gain (e.g. from high momentum)
  | 'special_unlock';   // Unlocked special option (e.g. Reframe, Extrapolate)

/**
 * Custom hook that manages gameplay effects like Momentum and Insight,
 * integrating with the game's event system and stores.
 * 
 * Implements the Chamber Transition Pattern:
 * 1. Uses DOM refs for direct manipulation instead of React state
 * 2. Extracts only primitive values from stores
 * 3. Provides stable function references with minimal dependencies
 * 4. Uses atomic state operations for performance
 * 
 * Inspired by Hades' Heat and Darkness systems which create
 * intersecting decision planes for strategic depth.
 */
export function useGameplayEffects(characterId: string, challengeType?: string) {
  // PATTERN: Use refs instead of state for non-rendered values
  const stateRef = useRef({
    momentumLevel: 0,
    consecutiveCorrect: 0,
    lastMomentumChange: 0,
    actionUnlockHistory: {
      reframe: false,
      extrapolate: false,
      boast: false
    }
  });
  
  // PATTERN: Component mounted ref for cleanup
  const isMountedRef = useRef(true);
  
  // PATTERN: DOM element refs for direct manipulation
  const elementRefs = useRef({
    momentumElement: null as HTMLElement | null,
    insightElement: null as HTMLElement | null,
    timeouts: {} as Record<string, NodeJS.Timeout>
  });
  
  // PATTERN: Extract primitive values from store
  const insight = usePrimitiveStoreValue(
    useResourceStore,
    state => state.insight,
    0
  );
  
  // PATTERN: Extract stable function references
  const updateInsight = useStableStoreValue(
    useResourceStore,
    state => state.updateInsight
  );
  
  // PATTERN: Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      // Clear any active timeouts
      Object.values(elementRefs.current.timeouts).forEach(timeout => {
        clearTimeout(timeout);
      });
    };
  }, []);
  
  // PATTERN: Set element refs via stable callbacks
  const setMomentumElement = useCallback((el: HTMLElement | null) => {
    elementRefs.current.momentumElement = el;
  }, []);
  
  const setInsightElement = useCallback((el: HTMLElement | null) => {
    elementRefs.current.insightElement = el;
  }, []);
  
  // PATTERN: Stable event dispatch with minimal dependencies
  const triggerEffect = useCallback((
    effectType: GameplayEffectType, 
    payload: Record<string, any> = {}
  ) => {
    try {
      // Use ref value instead of state
      const { momentumLevel } = stateRef.current;
      
      // Dispatch gameplay effect event
      useEventBus.getState().dispatch(
        GameEventType.UI_BUTTON_CLICKED,
        {
          componentId: 'gameplayEffects',
          action: effectType,
          metadata: {
            characterId,
            challengeType,
            momentumLevel,
            insightLevel: insight,
            timestamp: Date.now(),
            ...payload
          }
        },
        'useGameplayEffects'
      );
      
      // PATTERN: DOM-based animation instead of React state
      const { momentumElement, insightElement, timeouts } = elementRefs.current;
      
      if (effectType === 'momentum_gain' && momentumElement) {
        // Clear previous classes
        momentumElement.classList.remove('momentum-break-effect');
        // Add new effect
        momentumElement.classList.add('momentum-gain-effect');
        
        // Cleanup after animation completes
        if (timeouts.momentumEffect) clearTimeout(timeouts.momentumEffect);
        timeouts.momentumEffect = setTimeout(() => {
          if (isMountedRef.current && momentumElement) {
            momentumElement.classList.remove('momentum-gain-effect');
          }
        }, 2000);
      }
      else if (effectType === 'momentum_break' && momentumElement) {
        // Clear previous classes
        momentumElement.classList.remove('momentum-gain-effect');
        // Add new effect
        momentumElement.classList.add('momentum-break-effect');
        
        // Cleanup after animation completes
        if (timeouts.momentumEffect) clearTimeout(timeouts.momentumEffect);
        timeouts.momentumEffect = setTimeout(() => {
          if (isMountedRef.current && momentumElement) {
            momentumElement.classList.remove('momentum-break-effect');
          }
        }, 2000);
      }
      else if (effectType === 'insight_boost' && insightElement) {
        // Add insight effect
        insightElement.classList.add('insight-boost-effect');
        // Show gain amount if provided
        if (payload.amount) {
          insightElement.setAttribute('data-amount', `+${payload.amount}`);
        }
        
        // Cleanup after animation completes
        if (timeouts.insightEffect) clearTimeout(timeouts.insightEffect);
        timeouts.insightEffect = setTimeout(() => {
          if (isMountedRef.current && insightElement) {
            insightElement.classList.remove('insight-boost-effect');
          }
        }, 2000);
      }
    } catch (error) {
      console.error(`Error triggering gameplay effect ${effectType}:`, error);
    }
  }, [characterId, challengeType, insight]);
  
  // PATTERN: Calculate available actions once per render
  const getAvailableActions = useCallback(() => {
    const { momentumLevel, actionUnlockHistory } = stateRef.current;
    
    const newAvailableActions = {
      canReframe: insight >= 25,
      canExtrapolate: insight >= 50 && momentumLevel >= 2,
      canBoast: momentumLevel === MAX_MOMENTUM_LEVEL
    };
    
    // Trigger effects for newly available actions
    if (newAvailableActions.canReframe && !actionUnlockHistory.reframe) {
      triggerEffect('special_unlock', { actionType: 'reframe' });
      actionUnlockHistory.reframe = true;
    }
    
    if (newAvailableActions.canExtrapolate && !actionUnlockHistory.extrapolate) {
      triggerEffect('special_unlock', { actionType: 'extrapolate' });
      actionUnlockHistory.extrapolate = true;
    }
    
    if (newAvailableActions.canBoast && !actionUnlockHistory.boast) {
      triggerEffect('special_unlock', { actionType: 'boast' });
      actionUnlockHistory.boast = true;
    }
    
    return newAvailableActions;
  }, [insight, triggerEffect]);
  
  // PATTERN: Core gameplay mechanics with stable references
  const increaseMomentum = useCallback(() => {
    const state = stateRef.current;
    const prevMomentumLevel = state.momentumLevel;
    const prevConsecutiveCorrect = state.consecutiveCorrect;
    
    // PATTERN: Atomic ref updates
    state.consecutiveCorrect = prevConsecutiveCorrect + 1;
    state.lastMomentumChange = Date.now();
    
    // Calculate new level
    const newLevel = Math.min(
      Math.floor((state.consecutiveCorrect) / 2), 
      MAX_MOMENTUM_LEVEL
    );
    
    // Only trigger effects if momentum changed
    if (newLevel > prevMomentumLevel) {
      state.momentumLevel = newLevel;
      
      triggerEffect('momentum_gain', { 
        newLevel, 
        prevLevel: prevMomentumLevel,
        consecutiveCorrect: state.consecutiveCorrect
      });
      
      // Check if reaching maximum momentum
      if (newLevel === MAX_MOMENTUM_LEVEL) {
        triggerEffect('momentum_peak', { 
          consecutiveCorrect: state.consecutiveCorrect 
        });
      }
    }
    
    return {
      momentumLevel: state.momentumLevel,
      consecutiveCorrect: state.consecutiveCorrect
    };
  }, [triggerEffect]);
  
  const breakMomentum = useCallback(() => {
    const state = stateRef.current;
    const oldLevel = state.momentumLevel;
    
    if (oldLevel > 0) {
      triggerEffect('momentum_break', { oldLevel });
    }
    
    // PATTERN: Atomic ref updates
    state.momentumLevel = 0;
    state.consecutiveCorrect = 0;
    state.lastMomentumChange = Date.now();
    
    return {
      momentumLevel: 0,
      consecutiveCorrect: 0
    };
  }, [triggerEffect]);
  
  const awardInsightWithMomentum = useCallback((amount: number): number => {
    const momentumLevel = stateRef.current.momentumLevel;
    
    // Calculate bonus based on momentum
    const momentumMultiplier = 1 + (momentumLevel * 0.25); // 1.0 to 1.75
    const totalInsight = Math.floor(amount * momentumMultiplier);
    
    // Update insight via store function
    if (typeof updateInsight === 'function') {
      updateInsight(totalInsight);
    }
    
    // Trigger effect for significant gains
    if (totalInsight >= 10) {
      triggerEffect('insight_boost', { 
        amount: totalInsight, 
        base: amount, 
        momentumBonus: totalInsight - amount 
      });
    }
    
    return totalInsight;
  }, [triggerEffect, updateInsight]);
  
  const handleOptionSelected = useCallback((
    option: any, 
    isCorrect: boolean = true, 
    insightGain: number = 0
  ) => {
    // Process momentum changes
    if (isCorrect) {
      increaseMomentum();
    } else {
      breakMomentum();
    }
    
    // Award insight if any
    if (insightGain > 0) {
      awardInsightWithMomentum(insightGain);
    }
    
    // Return current values for component rendering
    return {
      momentumLevel: stateRef.current.momentumLevel,
      consecutiveCorrect: stateRef.current.consecutiveCorrect
    };
  }, [increaseMomentum, breakMomentum, awardInsightWithMomentum]);
  
  const resetMomentum = useCallback(() => {
    // Reset state
    stateRef.current.momentumLevel = 0;
    stateRef.current.consecutiveCorrect = 0;
    
    // Reset visual effects via DOM
    const { momentumElement } = elementRefs.current;
    if (momentumElement) {
      momentumElement.classList.remove('momentum-gain-effect');
      momentumElement.classList.remove('momentum-break-effect');
    }
    
    return {
      momentumLevel: 0,
      consecutiveCorrect: 0
    };
  }, []);
  
  // Return consistent interface with stable references
  return {
    // Accessors for current values
    getMomentumLevel: useCallback(() => stateRef.current.momentumLevel, []),
    getConsecutiveCorrect: useCallback(() => stateRef.current.consecutiveCorrect, []),
    
    // Element refs for DOM-based effects
    momentumElementRef: setMomentumElement,
    insightElementRef: setInsightElement,
    
    // Action methods
    increaseMomentum,
    breakMomentum,
    awardInsightWithMomentum,
    handleOptionSelected,
    resetMomentum,
    
    // Current calculated values
    availableActions: getAvailableActions()
  };
}

export default useGameplayEffects;