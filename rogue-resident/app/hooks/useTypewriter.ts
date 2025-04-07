import { useState, useEffect, useRef } from 'react';

interface TypewriterOptions {
  speed?: number;
  startDelay?: number;
  onComplete?: () => void;
}

/**
 * Production-quality typewriter effect that properly handles all character encoding,
 * including special characters and apostrophes.
 */
export function useTypewriter(text: string, options: TypewriterOptions = {}) {
  const { 
    speed = 25, 
    startDelay = 150,
    onComplete
  } = options;
  
  // Track current progress - crucial to use Array.from to handle multi-byte characters correctly
  const [progress, setProgress] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [showContinueIndicator, setShowContinueIndicator] = useState(false);
  
  // Store the full text in a ref to avoid dependencies
  const fullTextRef = useRef(text);
  
  // Store the text as an array of characters (including multi-byte) to handle properly
  const charactersRef = useRef(Array.from(text || ''));
  
  // Refs for timers
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const continueIndicatorTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Helper to clear all timers
  const clearAllTimers = () => {
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    
    if (continueIndicatorTimerRef.current) {
      clearTimeout(continueIndicatorTimerRef.current);
      continueIndicatorTimerRef.current = null;
    }
  };
  
  // Function to advance the typing animation
  const advanceTyping = () => {
    setProgress(prev => {
      const next = prev + 1;
      
      if (next >= charactersRef.current.length) {
        // Complete the animation
        setIsTyping(false);
        setIsComplete(true);
        
        continueIndicatorTimerRef.current = setTimeout(() => {
          setShowContinueIndicator(true);
        }, 500);
        
        if (onComplete) {
          onComplete();
        }
        
        return next;
      }
      
      // Schedule the next character
      typingTimerRef.current = setTimeout(advanceTyping, speed);
      return next;
    });
  };
  
  // Compute the display text based on current progress
  const displayText = charactersRef.current.slice(0, progress + 1).join('');
  
  // Function to skip to the end
  const complete = () => {
    clearAllTimers();
    setProgress(charactersRef.current.length - 1);
    setIsTyping(false);
    setIsComplete(true);
    setShowContinueIndicator(true);
    
    if (onComplete) {
      onComplete();
    }
  };
  
  // Restart typing from beginning
  const restart = () => {
    clearAllTimers();
    setProgress(0);
    setIsTyping(charactersRef.current.length > 1);
    setIsComplete(charactersRef.current.length <= 1);
    setShowContinueIndicator(charactersRef.current.length <= 1);
    
    if (charactersRef.current.length > 1) {
      typingTimerRef.current = setTimeout(advanceTyping, startDelay);
    }
  };
  
  // Effect to handle text changes
  useEffect(() => {
    // Update our refs with the new text
    fullTextRef.current = text;
    charactersRef.current = Array.from(text || '');
    
    // Clean up any existing timers
    clearAllTimers();
    
    // Don't start if text is empty or only one character
    if (!text || text.length <= 1) {
      setProgress(text ? 0 : -1);
      setIsTyping(false);
      setIsComplete(true);
      setShowContinueIndicator(true);
      if (onComplete) onComplete();
      return;
    }
    
    // Start at the first character
    setProgress(0);
    setIsTyping(true);
    setIsComplete(false);
    setShowContinueIndicator(false);
    
    // Start the typing sequence after the delay
    typingTimerRef.current = setTimeout(advanceTyping, startDelay);
    
    // Cleanup function
    return clearAllTimers;
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