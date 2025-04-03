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
    startDelay = 150,
    onComplete
  } = options;
  
  // Initialize with first character already showing to avoid first-character flicker
  const [displayText, setDisplayText] = useState(() => text.length > 0 ? text.charAt(0) : '');
  const [isComplete, setIsComplete] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showContinueIndicator, setShowContinueIndicator] = useState(false);
  
  // Use refs to maintain persistence across renders
  const indexRef = useRef(text.length > 0 ? 1 : 0); // Start from second character
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const continueIndicatorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstRender = useRef(true);
  
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
    indexRef.current = text.length > 0 ? 1 : 0; // Start from second character on restart
    setDisplayText(text.length > 0 ? text.charAt(0) : ''); // Show first character immediately
    setIsComplete(false);
    setIsTyping(false);
    setShowContinueIndicator(false);
  }, [text]);
  
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
    
    // Special handling for first render to prevent missing initial character
    if (isFirstRender.current) {
      isFirstRender.current = false;
    }
    
    // Reset state - initialize with the first character already visible
    indexRef.current = text.length > 0 ? 1 : 0; // Start from second character
    setDisplayText(text.length > 0 ? text.charAt(0) : ''); // Show first character immediately
    setIsComplete(false);
    setShowContinueIndicator(false);
    
    // Don't start if text is empty
    if (!text) {
      setIsComplete(true);
      return;
    }
    
    // If there's only one character, complete immediately
    if (text.length === 1) {
      setIsComplete(true);
      setShowContinueIndicator(true);
      if (onComplete) onComplete();
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