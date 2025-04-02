import { useState, useEffect, useRef, useCallback } from 'react';

interface TypewriterOptions {
  speed?: number;
  startDelay?: number;
  onComplete?: () => void;
}

/**
 * A hook that provides typewriter-style text animation
 * 
 * @param text The text to animate
 * @param options Configuration options for the typewriter effect
 * @returns Object containing the current display text, typing status, and control functions
 */
export function useTypewriter(text: string, options: TypewriterOptions = {}) {
  const { 
    speed = 25, 
    startDelay = 0,
    onComplete
  } = options;
  
  const [displayText, setDisplayText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  
  // Use refs to maintain persistence across renders
  const indexRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Function to skip to the end
  const complete = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    setDisplayText(text);
    setIsTyping(false);
    setIsComplete(true);
    
    if (onComplete) {
      onComplete();
    }
  }, [text, onComplete]);
  
  // Restart typing from beginning
  const restart = useCallback(() => {
    indexRef.current = 0;
    setDisplayText('');
    setIsComplete(false);
    setIsTyping(false);
    
    // This will trigger the effect to start typing again
  }, []);
  
  // Reset effect when text changes
  useEffect(() => {
    // Clean up any existing intervals/timeouts
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    // Reset state
    indexRef.current = 0;
    setDisplayText('');
    setIsComplete(false);
    
    // Don't start if text is empty
    if (!text) {
      setIsComplete(true);
      return;
    }
    
    // Start typing after delay
    setIsTyping(true);
    
    const startTyping = () => {
      intervalRef.current = setInterval(() => {
        if (indexRef.current < text.length) {
          setDisplayText(prev => prev + text.charAt(indexRef.current));
          indexRef.current++;
        } else {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          setIsTyping(false);
          setIsComplete(true);
          
          if (onComplete) {
            onComplete();
          }
        }
      }, speed);
    };
    
    if (startDelay > 0) {
      timeoutRef.current = setTimeout(startTyping, startDelay);
    } else {
      startTyping();
    }
    
    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [text, speed, startDelay, onComplete]);
  
  return { 
    displayText, 
    isComplete, 
    isTyping, 
    complete,
    restart 
  };
}

export default useTypewriter;