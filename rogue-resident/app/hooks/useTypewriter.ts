import { useState, useEffect, useRef, useCallback } from 'react';

interface TypewriterOptions {
  speed?: number;
  startDelay?: number;
  onComplete?: () => void;
}

/**
 * Production-quality typewriter effect that properly handles all character encoding,
 * including special characters and apostrophes.
 * 
 * Enhanced with proper render loop protection and performance optimizations.
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
  
  // Ref to track if we're currently advancing (prevents reentrancy issues)
  const isAdvancingRef = useRef(false);
  
  // Helper to clear all timers
  const clearAllTimers = useCallback(() => {
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    
    if (continueIndicatorTimerRef.current) {
      clearTimeout(continueIndicatorTimerRef.current);
      continueIndicatorTimerRef.current = null;
    }
  }, []);
  
  // Function to advance the typing animation - WITH RECURSION PROTECTION
  const advanceTyping = useCallback(() => {
    // Prevent reentrancy - critical for avoiding render loops
    if (isAdvancingRef.current) return;
    
    // Set flag to indicate we're processing an advance
    isAdvancingRef.current = true;
    
    setProgress(prev => {
      const next = prev + 1;
      
      // Check if we're done
      if (next >= charactersRef.current.length) {
        // Complete the animation
        setIsTyping(false);
        setIsComplete(true);
        
        // Schedule showing the continue indicator
        continueIndicatorTimerRef.current = setTimeout(() => {
          setShowContinueIndicator(true);
        }, 500);
        
        // Call completion callback if provided
        if (onComplete) {
          setTimeout(() => onComplete(), 0);
        }
        
        // Clear advancing flag AFTER state updates
        setTimeout(() => {
          isAdvancingRef.current = false;
        }, 0);
        
        return next;
      }
      
      // Schedule the next character with a safe delay
      typingTimerRef.current = setTimeout(() => {
        // Clear flag only when we start the next character
        isAdvancingRef.current = false;
        advanceTyping();
      }, speed);
      
      return next;
    });
  }, [onComplete, speed]);
  
  // Compute the display text based on current progress - safely handle empty arrays
  const displayText = progress < 0 || !charactersRef.current.length 
    ? '' 
    : charactersRef.current.slice(0, Math.min(progress + 1, charactersRef.current.length)).join('');
  
  // Function to skip to the end
  const complete = useCallback(() => {
    // Don't do anything if already complete
    if (isComplete) return;
    
    clearAllTimers();
    setProgress(Math.max(0, charactersRef.current.length - 1));
    setIsTyping(false);
    setIsComplete(true);
    setShowContinueIndicator(true);
    
    if (onComplete) {
      setTimeout(() => onComplete(), 0);
    }
  }, [clearAllTimers, isComplete, onComplete]);
  
  // Restart typing from beginning
  const restart = useCallback(() => {
    clearAllTimers();
    setProgress(0);
    setIsTyping(charactersRef.current.length > 1);
    setIsComplete(charactersRef.current.length <= 1);
    setShowContinueIndicator(charactersRef.current.length <= 1);
    
    // Reset the advancing flag
    isAdvancingRef.current = false;
    
    if (charactersRef.current.length > 1) {
      typingTimerRef.current = setTimeout(() => {
        advanceTyping();
      }, startDelay);
    }
  }, [advanceTyping, clearAllTimers, startDelay]);
  
  // Effect to handle text changes
  useEffect(() => {
    // Update our refs with the new text
    fullTextRef.current = text;
    charactersRef.current = Array.from(text || '');
    
    // Clean up any existing timers
    clearAllTimers();
    
    // Reset the advancing flag
    isAdvancingRef.current = false;
    
    // Don't start if text is empty or only one character
    if (!text || text.length <= 1) {
      setProgress(text ? 0 : -1);
      setIsTyping(false);
      setIsComplete(true);
      setShowContinueIndicator(true);
      if (onComplete) setTimeout(() => onComplete(), 0);
      return;
    }
    
    // Start at the first character
    setProgress(0);
    setIsTyping(true);
    setIsComplete(false);
    setShowContinueIndicator(false);
    
    // Start the typing sequence after the delay
    typingTimerRef.current = setTimeout(() => {
      advanceTyping();
    }, startDelay);
    
    // Cleanup function
    return clearAllTimers;
  }, [text, advanceTyping, clearAllTimers, onComplete, startDelay]);
  
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