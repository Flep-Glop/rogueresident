// app/hooks/useGameplayEffects.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { useEventBus } from '../core/events/CentralEventBus';
import { GameEventType } from '../core/events/EventTypes';
import { useGameStore } from '../store/gameStore';

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

interface GameplayEffectsState {
  // Momentum system
  momentumLevel: number;
  consecutiveCorrect: number;
  lastMomentumChange: number;
  
  // Insight & special actions
  insightMeter: number;
  availableActions: {
    canReframe: boolean;
    canExtrapolate: boolean;
    canBoast: boolean;
  };
  
  // Visual effects
  showMomentumEffect: boolean;
  showInsightEffect: boolean;
}

/**
 * Custom hook that manages gameplay effects like Momentum and Insight,
 * integrating with the game's event system and stores.
 * 
 * Inspired by Hades' Heat and Darkness systems which create
 * intersecting decision planes for strategic depth.
 */
export function useGameplayEffects(characterId: string, challengeType?: string) {
  // Refs for tracking state across rerenders safely
  const effectTimeoutsRef = useRef<Record<string, NodeJS.Timeout>>({});
  const componentMountedRef = useRef(true);

  // Core gameplay effect state
  const [momentumLevel, setMomentumLevel] = useState(0);
  const [consecutiveCorrect, setConsecutiveCorrect] = useState(0);
  const [lastMomentumChange, setLastMomentumChange] = useState(0);
  
  // Special action availability trackers
  const [availableActions, setAvailableActions] = useState({
    canReframe: false,
    canExtrapolate: false,
    canBoast: false
  });
  
  // Visual effect trackers
  const [showMomentumEffect, setShowMomentumEffect] = useState(false);
  const [showInsightEffect, setShowInsightEffect] = useState(false);
  
  // Access global stores
  const { insight: globalInsight, updateInsight } = useGameStore();
  
  /**
   * Safely clear any timeouts when component unmounts
   */
  useEffect(() => {
    componentMountedRef.current = true;
    
    return () => {
      componentMountedRef.current = false;
      // Clean up any active timeouts
      Object.values(effectTimeoutsRef.current).forEach(timeoutId => {
        clearTimeout(timeoutId);
      });
    };
  }, []);
  
  /**
   * Update special action availability based on momentum and insight levels
   */
  useEffect(() => {
    // Only update if component is still mounted
    if (!componentMountedRef.current) return;
    
    const newAvailableActions = {
      // Reframe becomes available at 25% insight
      canReframe: globalInsight >= 25,
      
      // Extrapolate requires 50% insight AND momentum level 2+
      canExtrapolate: globalInsight >= 50 && momentumLevel >= 2,
      
      // Boast only available at max momentum
      canBoast: momentumLevel === MAX_MOMENTUM_LEVEL
    };
    
    setAvailableActions(newAvailableActions);
    
    // Dispatch event when new actions become available
    if (!availableActions.canReframe && newAvailableActions.canReframe) {
      triggerEffect('special_unlock', { actionType: 'reframe' });
    }
    
    if (!availableActions.canExtrapolate && newAvailableActions.canExtrapolate) {
      triggerEffect('special_unlock', { actionType: 'extrapolate' });
    }
    
    if (!availableActions.canBoast && newAvailableActions.canBoast) {
      triggerEffect('special_unlock', { actionType: 'boast' });
    }
  }, [globalInsight, momentumLevel, availableActions]);
  
  /**
   * Increases the momentum counter based on correct answers
   */
  const increaseMomentum = useCallback(() => {
    setConsecutiveCorrect(prev => prev + 1);
    
    // Calculate new momentum level based on consecutive correct answers
    setMomentumLevel(prev => {
      // Use formula: Every 2 correct answers increases momentum (max 3)
      const newLevel = Math.min(Math.floor((consecutiveCorrect + 1) / 2), MAX_MOMENTUM_LEVEL);
      
      // If level increased, trigger effect
      if (newLevel > prev) {
        triggerEffect('momentum_gain', { newLevel, prevLevel: prev });
        return newLevel;
      }
      
      return prev;
    });
    
    setLastMomentumChange(Date.now());
    setShowMomentumEffect(true);
    
    // Clear effect after animation
    effectTimeoutsRef.current.momentum = setTimeout(() => {
      if (componentMountedRef.current) {
        setShowMomentumEffect(false);
      }
    }, 2000);
  }, [consecutiveCorrect]);
  
  /**
   * Resets momentum when a streak is broken
   */
  const breakMomentum = useCallback(() => {
    if (momentumLevel > 0) {
      // Trigger effect before resetting
      triggerEffect('momentum_break', { oldLevel: momentumLevel });
    }
    
    setMomentumLevel(0);
    setConsecutiveCorrect(0);
    setLastMomentumChange(Date.now());
    
    setShowMomentumEffect(true);
    
    // Clear effect after animation
    effectTimeoutsRef.current.momentum = setTimeout(() => {
      if (componentMountedRef.current) {
        setShowMomentumEffect(false);
      }
    }, 2000);
  }, [momentumLevel]);
  
  /**
   * Award bonus insight based on current momentum
   * @param amount Base amount of insight to award
   * @returns Total insight awarded including momentum bonus
   */
  const awardInsightWithMomentum = useCallback((amount: number): number => {
    // Calculate bonus based on momentum (higher momentum = bigger multiplier)
    const momentumMultiplier = 1 + (momentumLevel * 0.25); // 1.0, 1.25, 1.5, 1.75
    const totalInsight = Math.floor(amount * momentumMultiplier);
    
    // Update global insight
    updateInsight(totalInsight);
    
    // Show insight gain effect
    setShowInsightEffect(true);
    
    // Trigger effect for big insight gains
    if (totalInsight >= 10) {
      triggerEffect('insight_boost', { 
        amount: totalInsight, 
        base: amount, 
        momentumBonus: totalInsight - amount 
      });
    }
    
    // Clear effect after animation
    effectTimeoutsRef.current.insight = setTimeout(() => {
      if (componentMountedRef.current) {
        setShowInsightEffect(false);
      }
    }, 2000);
    
    return totalInsight;
  }, [momentumLevel, updateInsight]);
  
  /**
   * Handles dialogue option selection with proper gameplay effects
   * @param option The selected dialogue option
   * @param isCorrect Whether the option was "correct" (increases momentum)
   * @param insightGain Base insight gain from the option
   */
  const handleOptionSelected = useCallback((
    option: any, 
    isCorrect: boolean = true, 
    insightGain: number = 0
  ) => {
    // Handle momentum changes
    if (isCorrect) {
      increaseMomentum();
      
      // Check if we've hit maximum momentum
      if (momentumLevel === MAX_MOMENTUM_LEVEL - 1 && Math.floor((consecutiveCorrect + 1) / 2) === MAX_MOMENTUM_LEVEL) {
        triggerEffect('momentum_peak', { consecutiveCorrect: consecutiveCorrect + 1 });
      }
    } else {
      breakMomentum();
    }
    
    // Award insight if option provides it
    if (insightGain > 0) {
      awardInsightWithMomentum(insightGain);
    }
  }, [
    increaseMomentum, 
    breakMomentum, 
    awardInsightWithMomentum, 
    momentumLevel, 
    consecutiveCorrect
  ]);
  
  /**
   * Triggers gameplay effect events for other systems to respond to
   */
  const triggerEffect = useCallback((
    effectType: GameplayEffectType, 
    payload: Record<string, any> = {}
  ) => {
    try {
      // Dispatch gameplay effect event
      useEventBus.getState().dispatch(
        GameEventType.UI_BUTTON_CLICKED, // Using existing event type for compatibility
        {
          componentId: 'gameplayEffects',
          action: effectType,
          metadata: {
            characterId,
            challengeType,
            momentumLevel,
            insightLevel: globalInsight,
            timestamp: Date.now(),
            ...payload
          }
        },
        'useGameplayEffects'
      );
    } catch (error) {
      console.error(`Error triggering gameplay effect ${effectType}:`, error);
    }
  }, [characterId, challengeType, momentumLevel, globalInsight]);
  
  return {
    // State
    momentumLevel,
    consecutiveCorrect,
    lastMomentumChange,
    showMomentumEffect,
    showInsightEffect,
    
    // Action availability
    availableActions,
    
    // Actions
    increaseMomentum,
    breakMomentum,
    awardInsightWithMomentum,
    handleOptionSelected,
    
    // Reset for new challenges
    resetMomentum: useCallback(() => {
      setMomentumLevel(0);
      setConsecutiveCorrect(0);
      setShowMomentumEffect(false);
    }, [])
  };
}

export default useGameplayEffects;