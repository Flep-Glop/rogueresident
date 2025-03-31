// app/components/animation/AnimationSystem.tsx
'use client';
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

// Animation types
export type AnimationType = 
  | 'fade-in' 
  | 'fade-out' 
  | 'slide-in-right' 
  | 'slide-in-left' 
  | 'slide-in-up'
  | 'slide-in-down'
  | 'bounce'
  | 'pulse'
  | 'shake'
  | 'rotate'
  | 'scale-in'
  | 'scale-out'
  | 'jello'
  | 'rubberband'
  | 'flip-x'
  | 'flip-y'
  | 'none';

// Animation states for tracking
export interface AnimationState {
  isAnimating: boolean;
  animationType: AnimationType;
  duration: number;
  delay: number;
  isInfinite: boolean;
}

// Animation queue item
interface AnimationQueueItem {
  id: string;
  type: AnimationType;
  duration: number;
  delay: number;
  isInfinite: boolean;
  onComplete?: () => void;
}

// Animation context interface
interface AnimationContextType {
  registerAnimation: (elementId: string) => void;
  unregisterAnimation: (elementId: string) => void;
  playAnimation: (
    elementId: string, 
    type: AnimationType, 
    options?: { 
      duration?: number;
      delay?: number;
      isInfinite?: boolean;
      onComplete?: () => void;
    }
  ) => void;
  stopAnimation: (elementId: string) => void;
  getAnimationState: (elementId: string) => AnimationState | undefined;
  playSequence: (
    sequence: Array<{
      elementId: string;
      type: AnimationType;
      options?: { 
        duration?: number;
        delay?: number;
        isInfinite?: boolean;
      }
    }>,
    onComplete?: () => void
  ) => void;
  stopAllAnimations: () => void;
}

// Create animation context with default values
const AnimationContext = createContext<AnimationContextType>({
  registerAnimation: () => {},
  unregisterAnimation: () => {},
  playAnimation: () => {},
  stopAnimation: () => {},
  getAnimationState: () => undefined,
  playSequence: () => {},
  stopAllAnimations: () => {}
});

// Custom hook to use animation system
export const useAnimation = () => useContext(AnimationContext);

// Provider component for animation system
export function AnimationProvider({ children }: { children: ReactNode }) {
  // Track registered elements and their animation states
  const [animationStates, setAnimationStates] = useState<Record<string, AnimationState>>({});
  
  // Queue for sequential animations
  const [animationQueue, setAnimationQueue] = useState<AnimationQueueItem[]>([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  
  // Register an element for animation
  const registerAnimation = useCallback((elementId: string) => {
    setAnimationStates(prev => ({
      ...prev,
      [elementId]: {
        isAnimating: false,
        animationType: 'none',
        duration: 0,
        delay: 0,
        isInfinite: false
      }
    }));
  }, []);
  
  // Unregister an element
  const unregisterAnimation = useCallback((elementId: string) => {
    setAnimationStates(prev => {
      const newStates = { ...prev };
      delete newStates[elementId];
      return newStates;
    });
  }, []);
  
  // Play an animation on an element
  const playAnimation = useCallback((
    elementId: string, 
    type: AnimationType, 
    options: { 
      duration?: number;
      delay?: number;
      isInfinite?: boolean;
      onComplete?: () => void;
    } = {}
  ) => {
    const { 
      duration = 500, 
      delay = 0, 
      isInfinite = false,
      onComplete
    } = options;
    
    // Update animation state
    setAnimationStates(prev => ({
      ...prev,
      [elementId]: {
        isAnimating: true,
        animationType: type,
        duration,
        delay,
        isInfinite
      }
    }));
    
    // Set up completion handler if not infinite
    if (!isInfinite) {
      setTimeout(() => {
        setAnimationStates(prev => ({
          ...prev,
          [elementId]: {
            ...prev[elementId],
            isAnimating: false,
            animationType: 'none'
          }
        }));
        
        // Call the completion callback if provided
        if (onComplete) onComplete();
      }, duration + delay);
    }
  }, []);
  
  // Stop an animation
  const stopAnimation = useCallback((elementId: string) => {
    setAnimationStates(prev => ({
      ...prev,
      [elementId]: {
        ...prev[elementId],
        isAnimating: false,
        animationType: 'none'
      }
    }));
  }, []);
  
  // Get current animation state for an element
  const getAnimationState = useCallback((elementId: string) => {
    return animationStates[elementId];
  }, [animationStates]);
  
  // Play a sequence of animations
  const playSequence = useCallback((
    sequence: Array<{
      elementId: string;
      type: AnimationType;
      options?: { 
        duration?: number;
        delay?: number;
        isInfinite?: boolean;
      }
    }>,
    onComplete?: () => void
  ) => {
    // Add all animations to the queue
    const queueItems = sequence.map((seq, index) => ({
      id: `${seq.elementId}-${index}`,
      type: seq.type,
      duration: seq.options?.duration ?? 500,
      delay: seq.options?.delay ?? 0,
      isInfinite: seq.options?.isInfinite ?? false,
      elementId: seq.elementId,
      onComplete: index === sequence.length - 1 ? onComplete : undefined
    }));
    
    setAnimationQueue(prev => [...prev, ...queueItems]);
  }, []);
  
  // Stop all animations
  const stopAllAnimations = useCallback(() => {
    // Clear the queue
    setAnimationQueue([]);
    
    // Reset all animation states
    setAnimationStates(prev => {
      const newStates = { ...prev };
      Object.keys(newStates).forEach(key => {
        newStates[key] = {
          ...newStates[key],
          isAnimating: false,
          animationType: 'none'
        };
      });
      return newStates;
    });
  }, []);
  
  // Process animation queue
  useEffect(() => {
    if (animationQueue.length === 0 || isProcessingQueue) return;
    
    // Start processing the queue
    setIsProcessingQueue(true);
    
    // Get the first item in the queue
    const item = animationQueue[0];
    
    // Play the animation
    playAnimation(item.elementId, item.type, {
      duration: item.duration,
      delay: item.delay,
      isInfinite: item.isInfinite,
      onComplete: () => {
        // Call the completion callback if provided
        if (item.onComplete) item.onComplete();
        
        // Remove this item from the queue
        setAnimationQueue(prev => prev.slice(1));
        
        // Continue processing the queue
        setIsProcessingQueue(false);
      }
    });
  }, [animationQueue, isProcessingQueue, playAnimation]);
  
  // Provide context value
  const value: AnimationContextType = {
    registerAnimation,
    unregisterAnimation,
    playAnimation,
    stopAnimation,
    getAnimationState,
    playSequence,
    stopAllAnimations
  };
  
  return (
    <AnimationContext.Provider value={value}>
      {children}
    </AnimationContext.Provider>
  );
}

// Animated component wrapper
interface AnimatedProps {
  id: string;
  children: ReactNode;
  initialAnimation?: AnimationType;
  className?: string;
  style?: React.CSSProperties;
  duration?: number;
  delay?: number;
  isInfinite?: boolean;
}

export function Animated({
  id,
  children,
  initialAnimation = 'none',
  className = '',
  style = {},
  duration = 500,
  delay = 0,
  isInfinite = false
}: AnimatedProps) {
  const { registerAnimation, unregisterAnimation, playAnimation, getAnimationState } = useAnimation();
  
  // Register this element on mount
  useEffect(() => {
    registerAnimation(id);
    
    // Play initial animation if specified
    if (initialAnimation !== 'none') {
      playAnimation(id, initialAnimation, { duration, delay, isInfinite });
    }
    
    // Cleanup on unmount
    return () => unregisterAnimation(id);
  }, [id, registerAnimation, unregisterAnimation, initialAnimation, playAnimation, duration, delay, isInfinite]);
  
  // Get current animation state
  const animationState = getAnimationState(id);
  
  // Generate animation CSS classes based on current state
  const getAnimationClasses = (): string => {
    if (!animationState || !animationState.isAnimating) return '';
    
    const { animationType, isInfinite } = animationState;
    
    // Map animation types to actual CSS classes
    const animationClassMap: Record<AnimationType, string> = {
      'none': '',
      'fade-in': 'animate-fade-in',
      'fade-out': 'animate-fade-out',
      'slide-in-right': 'animate-slide-in-right',
      'slide-in-left': 'animate-slide-in-left',
      'slide-in-up': 'animate-slide-in-up',
      'slide-in-down': 'animate-slide-in-down',
      'bounce': 'animate-bounce',
      'pulse': 'animate-pulse',
      'shake': 'animate-shake',
      'rotate': 'animate-rotate',
      'scale-in': 'animate-scale-in',
      'scale-out': 'animate-scale-out',
      'jello': 'animate-jello',
      'rubberband': 'animate-rubberband',
      'flip-x': 'animate-flip-x',
      'flip-y': 'animate-flip-y'
    };
    
    const animationClass = animationClassMap[animationType] || '';
    
    return `${animationClass} ${isInfinite ? 'animate-infinite' : ''}`;
  };
  
  // Calculate animation styles based on duration and delay
  const getAnimationStyles = (): React.CSSProperties => {
    if (!animationState || !animationState.isAnimating) return {};
    
    return {
      animationDuration: `${animationState.duration}ms`,
      animationDelay: `${animationState.delay}ms`,
    };
  };
  
  return (
    <div 
      className={`${className} ${getAnimationClasses()}`}
      style={{ ...style, ...getAnimationStyles() }}
    >
      {children}
    </div>
  );
}

// Animation sequences for common game events
export const AnimationSequences = {
  nodeCompleted: (nodeId: string, onComplete?: () => void) => [
    {
      elementId: `node-${nodeId}`,
      type: 'pulse' as AnimationType,
      options: { duration: 300 }
    },
    {
      elementId: `node-${nodeId}`,
      type: 'scale-in' as AnimationType,
      options: { duration: 300, delay: 100 }
    }
  ],
  
  // Boss defeated sequence
  bossDefeated: (bossId: string, onComplete?: () => void) => [
    {
      elementId: `boss-${bossId}`,
      type: 'shake' as AnimationType,
      options: { duration: 500 }
    },
    {
      elementId: `boss-${bossId}`,
      type: 'pulse' as AnimationType,
      options: { duration: 300, delay: 200 }
    },
    {
      elementId: `boss-${bossId}`,
      type: 'fade-out' as AnimationType,
      options: { duration: 800, delay: 300 }
    }
  ],
  
  // Reward earned sequence
  rewardEarned: (elementId: string, onComplete?: () => void) => [
    {
      elementId,
      type: 'scale-in' as AnimationType,
      options: { duration: 300 }
    },
    {
      elementId,
      type: 'bounce' as AnimationType,
      options: { duration: 500, delay: 300 }
    }
  ],
  
  // Dialog appearance sequence
  dialogAppear: (dialogId: string, onComplete?: () => void) => [
    {
      elementId: dialogId,
      type: 'fade-in' as AnimationType,
      options: { duration: 300 }
    },
    {
      elementId: `${dialogId}-content`,
      type: 'slide-in-up' as AnimationType,
      options: { duration: 400, delay: 100 }
    }
  ],
  
  // Character entrance sequence
  characterEntrance: (characterId: string, onComplete?: () => void) => [
    {
      elementId: `${characterId}-shadow`,
      type: 'fade-in' as AnimationType,
      options: { duration: 300 }
    },
    {
      elementId: characterId,
      type: 'slide-in-right' as AnimationType,
      options: { duration: 500, delay: 100 }
    },
    {
      elementId: `${characterId}-name`,
      type: 'fade-in' as AnimationType,
      options: { duration: 300, delay: 400 }
    }
  ]
};

// Keyframe animations to add to global.css
/*
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fade-out {
  from { opacity: 1; }
  to { opacity: 0; }
}

@keyframes slide-in-right {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

@keyframes slide-in-left {
  from { transform: translateX(-100%); }
  to { transform: translateX(0); }
}

@keyframes slide-in-up {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

@keyframes slide-in-down {
  from { transform: translateY(-100%); }
  to { transform: translateY(0); }
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-30px); }
  60% { transform: translateY(-15px); }
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
  20%, 40%, 60%, 80% { transform: translateX(10px); }
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes scale-in {
  from { transform: scale(0); }
  to { transform: scale(1); }
}

@keyframes scale-out {
  from { transform: scale(1); }
  to { transform: scale(0); }
}

@keyframes jello {
  0%, 11.1%, 100% { transform: none; }
  22.2% { transform: skewX(-12.5deg) skewY(-12.5deg); }
  33.3% { transform: skewX(6.25deg) skewY(6.25deg); }
  44.4% { transform: skewX(-3.125deg) skewY(-3.125deg); }
  55.5% { transform: skewX(1.5625deg) skewY(1.5625deg); }
  66.6% { transform: skewX(-0.78125deg) skewY(-0.78125deg); }
  77.7% { transform: skewX(0.390625deg) skewY(0.390625deg); }
  88.8% { transform: skewX(-0.1953125deg) skewY(-0.1953125deg); }
}

@keyframes rubberband {
  0% { transform: scale(1, 1); }
  30% { transform: scale(1.25, 0.75); }
  40% { transform: scale(0.75, 1.25); }
  50% { transform: scale(1.15, 0.85); }
  65% { transform: scale(0.95, 1.05); }
  75% { transform: scale(1.05, 0.95); }
  100% { transform: scale(1, 1); }
}

@keyframes flip-x {
  0% { transform: perspective(400px) rotateX(0); }
  100% { transform: perspective(400px) rotateX(360deg); }
}

@keyframes flip-y {
  0% { transform: perspective(400px) rotateY(0); }
  100% { transform: perspective(400px) rotateY(360deg); }
}

.animate-fade-in { animation: fade-in; }
.animate-fade-out { animation: fade-out; }
.animate-slide-in-right { animation: slide-in-right; }
.animate-slide-in-left { animation: slide-in-left; }
.animate-slide-in-up { animation: slide-in-up; }
.animate-slide-in-down { animation: slide-in-down; }
.animate-bounce { animation: bounce; }
.animate-pulse { animation: pulse; }
.animate-shake { animation: shake; }
.animate-rotate { animation: rotate; }
.animate-scale-in { animation: scale-in; }
.animate-scale-out { animation: scale-out; }
.animate-jello { animation: jello; }
.animate-rubberband { animation: rubberband; }
.animate-flip-x { animation: flip-x; }
.animate-flip-y { animation: flip-y; }
.animate-infinite { animation-iteration-count: infinite; }
*/