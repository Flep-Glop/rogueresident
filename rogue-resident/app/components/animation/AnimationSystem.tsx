// app/components/animation/AnimationSystem.tsx
'use client';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Simplified animation types
export type AnimationType = 
  | 'fade-in' 
  | 'fade-out' 
  | 'slide-in'
  | 'slide-out'
  | 'bounce'
  | 'pulse'
  | 'shake'
  | 'none';

// Animation context interface 
interface AnimationContextType {
  playAnimation: (elementId: string, type: AnimationType, duration?: number) => void;
  stopAnimation: (elementId: string) => void;
}

// Create animation context
const AnimationContext = createContext<AnimationContextType>({
  playAnimation: () => {},
  stopAnimation: () => {}
});

// Custom hook to use animation system
export const useAnimation = () => useContext(AnimationContext);

// Provider component for animation system
export function AnimationProvider({ children }: { children: ReactNode }) {
  // Track active animations
  const [activeAnimations, setActiveAnimations] = useState<Record<string, {
    type: AnimationType;
    duration: number;
    timeoutId?: NodeJS.Timeout;
  }>>({});
  
  // Play an animation
  const playAnimation = (elementId: string, type: AnimationType, duration = 500) => {
    // Stop any existing animation on this element
    stopAnimation(elementId);
    
    // Set up new animation
    const timeoutId = setTimeout(() => {
      // Clear animation when done
      setActiveAnimations(prev => {
        const newAnimations = { ...prev };
        delete newAnimations[elementId];
        return newAnimations;
      });
    }, duration);
    
    // Add to active animations
    setActiveAnimations(prev => ({
      ...prev,
      [elementId]: {
        type,
        duration,
        timeoutId
      }
    }));
  };
  
  // Stop an animation
  const stopAnimation = (elementId: string) => {
    setActiveAnimations(prev => {
      const animation = prev[elementId];
      if (animation?.timeoutId) {
        clearTimeout(animation.timeoutId);
      }
      
      const newAnimations = { ...prev };
      delete newAnimations[elementId];
      return newAnimations;
    });
  };
  
  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(activeAnimations).forEach(animation => {
        if (animation.timeoutId) {
          clearTimeout(animation.timeoutId);
        }
      });
    };
  }, [activeAnimations]);
  
  return (
    <AnimationContext.Provider value={{ playAnimation, stopAnimation }}>
      {children}
    </AnimationContext.Provider>
  );
}

// Animated component wrapper
interface AnimatedProps {
  id: string;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function Animated({
  id,
  children,
  className = '',
  style = {},
}: AnimatedProps) {
  const { playAnimation, stopAnimation } = useAnimation();
  const [animationClass, setAnimationClass] = useState('');
  const [animationStyle, setAnimationStyle] = useState<React.CSSProperties>({});
  
  // Set up animation classes and styles
  useEffect(() => {
    // Set up listeners for animation events from context
    const handleAnimationStart = (event: CustomEvent) => {
      if (event.detail.id === id) {
        const { type, duration } = event.detail;
        
        // Map animation types to CSS classes
        switch (type) {
          case 'fade-in':
            setAnimationClass('animate-fade-in');
            break;
          case 'fade-out':
            setAnimationClass('animate-fade-out');
            break;
          case 'slide-in':
            setAnimationClass('animate-slide-in');
            break;
          case 'slide-out':
            setAnimationClass('animate-slide-out');
            break;
          case 'bounce':
            setAnimationClass('animate-bounce');
            break;
          case 'pulse':
            setAnimationClass('animate-pulse');
            break;
          case 'shake':
            setAnimationClass('animate-shake');
            break;
          default:
            setAnimationClass('');
        }
        
        // Set animation duration
        setAnimationStyle({ animationDuration: `${duration}ms` });
      }
    };
    
    const handleAnimationStop = (event: CustomEvent) => {
      if (event.detail.id === id) {
        setAnimationClass('');
        setAnimationStyle({});
      }
    };
    
    // Use a normal DOM event approach instead of a complex system
    window.addEventListener('animation-start', handleAnimationStart as EventListener);
    window.addEventListener('animation-stop', handleAnimationStop as EventListener);
    
    return () => {
      window.removeEventListener('animation-start', handleAnimationStart as EventListener);
      window.removeEventListener('animation-stop', handleAnimationStop as EventListener);
    };
  }, [id]);
  
  return (
    <div 
      className={`${className} ${animationClass}`}
      style={{ ...style, ...animationStyle }}
    >
      {children}
    </div>
  );
}

// Simple animation functions for common game events
export const playNodeCompletedAnimation = (nodeId: string) => {
  const element = document.getElementById(`node-${nodeId}`);
  if (element) {
    element.classList.add('animate-pulse');
    setTimeout(() => {
      element.classList.remove('animate-pulse');
    }, 500);
  }
};

export const playItemAcquiredAnimation = (itemId: string) => {
  const element = document.getElementById(`item-${itemId}`);
  if (element) {
    element.classList.add('animate-bounce');
    setTimeout(() => {
      element.classList.remove('animate-bounce');
    }, 1000);
  }
};

export const playButtonClickAnimation = (buttonId: string) => {
  const element = document.getElementById(buttonId);
  if (element) {
    element.classList.add('animate-click');
    setTimeout(() => {
      element.classList.remove('animate-click');
    }, 200);
  }
};

// Add the CSS classes to globals.css
/*
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fade-out {
  from { opacity: 1; }
  to { opacity: 0; }
}

@keyframes slide-in {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

@keyframes slide-out {
  from { transform: translateY(0); opacity: 1; }
  to { transform: translateY(20px); opacity: 0; }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-10px); }
  75% { transform: translateX(10px); }
}

@keyframes click {
  0% { transform: scale(1); }
  50% { transform: scale(0.95); }
  100% { transform: scale(1); }
}

.animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
.animate-fade-out { animation: fade-out 0.3s ease-in forwards; }
.animate-slide-in { animation: slide-in 0.3s ease-out forwards; }
.animate-slide-out { animation: slide-out 0.3s ease-in forwards; }
.animate-shake { animation: shake 0.3s ease-in-out; }
.animate-click { animation: click 0.2s ease-in-out; }
*/