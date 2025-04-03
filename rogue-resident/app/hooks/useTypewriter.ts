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
    startDelay = 150, // Added default delay to prevent first letter cutoff
    onComplete
  } = options;
  
  const [displayText, setDisplayText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showContinueIndicator, setShowContinueIndicator] = useState(false);
  
  // Use refs to maintain persistence across renders
  const indexRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const continueIndicatorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
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
    
    if (continueIndicatorTimeoutRef.current) {
      clearTimeout(continueIndicatorTimeoutRef.current);
      continueIndicatorTimeoutRef.current = null;
    }
    
    setDisplayText(text);
    setIsTyping(false);
    setIsComplete(true);
    setShowContinueIndicator(true);
    
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
    setShowContinueIndicator(false);
    
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
    
    if (continueIndicatorTimeoutRef.current) {
      clearTimeout(continueIndicatorTimeoutRef.current);
      continueIndicatorTimeoutRef.current = null;
    }
    
    // Reset state
    indexRef.current = 0;
    setDisplayText('');
    setIsComplete(false);
    setShowContinueIndicator(false);
    
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
          
          // Show continue indicator after typing is complete with a slight delay
          continueIndicatorTimeoutRef.current = setTimeout(() => {
            setShowContinueIndicator(true);
          }, 500);
          
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
      if (continueIndicatorTimeoutRef.current) {
        clearTimeout(continueIndicatorTimeoutRef.current);
      }
    };
  }, [text, speed, startDelay, onComplete]);
  
  return { 
    displayText, 
    isComplete, 
    isTyping, 
    complete,
    restart,
    showContinueIndicator
  };
}

export default useTypewriter;