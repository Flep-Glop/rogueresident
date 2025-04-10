// app/hooks/useTypewriter.ts
import { useState, useEffect, useRef, useCallback } from 'react';

interface TypewriterOptions {
  speed?: number;
  startDelay?: number;
  onComplete?: () => void;
  targetRef?: React.RefObject<HTMLElement>; // DOM element ref for direct manipulation
}

/**
 * Chamber Pattern implementation of typewriter effect
 * 
 * Optimized with:
 * 1. DOM-based animation when targetRef is provided
 * 2. Combined atomic state updates
 * 3. Stable function references
 * 4. Ref-based non-render state tracking
 */
export function useTypewriter(text: string, options: TypewriterOptions = {}) {
  const { 
    speed = 25, 
    startDelay = 150,
    onComplete,
    targetRef
  } = options;
  
  // PATTERN: Single state object for atomic updates
  const [state, setState] = useState({
    displayText: '',
    isComplete: false,
    isTyping: false,
    showContinueIndicator: false
  });
  
  // PATTERN: Use refs for non-rendered tracking state
  const internalState = useRef({
    progress: 0,
    isMounted: true,
    useDomManipulation: Boolean(targetRef?.current),
    characters: Array.from(text || ''),
    fullText: text
  });
  
  // PATTERN: Clean ref handling for timers
  const timers = useRef<{
    typing: NodeJS.Timeout | null;
    continue: NodeJS.Timeout | null;
  }>({
    typing: null,
    continue: null
  });
  
  // PATTERN: Helper to clear all timers
  const clearAllTimers = useCallback(() => {
    Object.entries(timers.current).forEach(([_, timer]) => {
      if (timer) clearTimeout(timer);
    });
    timers.current.typing = null;
    timers.current.continue = null;
  }, []);
  
  // PATTERN: DOM-based animation when a target element is provided
  const animateTextInDom = useCallback((newText: string, cursorVisible: boolean = true) => {
    if (!targetRef?.current) return;
    
    const element = targetRef.current;
    
    // Set the text content
    if (element.dataset.originalHtml === undefined) {
      element.dataset.originalHtml = element.innerHTML;
    }
    
    // Add blinking cursor via CSS class
    if (cursorVisible) {
      element.classList.add('typewriter-cursor');
    } else {
      element.classList.remove('typewriter-cursor');
    }
    
    // Set content with HTML safety considerations
    if (element.dataset.isHtmlContent === 'true') {
      element.innerHTML = newText;
    } else {
      element.textContent = newText;
    }
  }, [targetRef]);
  
  // PATTERN: Function to advance the typing animation
  const advanceTyping = useCallback(() => {
    const internal = internalState.current;
    
    // Increment progress
    internal.progress += 1;
    
    // Check if we've reached the end
    const isFinished = internal.progress >= internal.characters.length;
    
    // Create the current display text
    const displayText = internal.characters.slice(0, internal.progress).join('');
    
    // Update DOM directly if using that mode
    if (internal.useDomManipulation) {
      animateTextInDom(displayText, !isFinished);
    }
    
    if (isFinished) {
      // Animation complete
      if (internal.isMounted) {
        setState(prev => ({
          ...prev,
          displayText,
          isComplete: true,
          isTyping: false
        }));
      }
      
      // Show continue indicator after delay
      timers.current.continue = setTimeout(() => {
        if (internal.isMounted) {
          setState(prev => ({
            ...prev,
            showContinueIndicator: true
          }));
          
          // If using DOM manipulation, update cursor
          if (internal.useDomManipulation && targetRef?.current) {
            targetRef.current.classList.add('typewriter-complete');
          }
        }
      }, 500);
      
      // Call onComplete callback
      if (onComplete) {
        onComplete();
      }
    } else {
      // Continue typing
      if (internal.isMounted && !internal.useDomManipulation) {
        setState(prev => ({
          ...prev,
          displayText,
        }));
      }
      
      // Schedule next character
      timers.current.typing = setTimeout(advanceTyping, speed);
    }
  }, [speed, onComplete, animateTextInDom, targetRef]);
  
  // PATTERN: Skip to the end with stable reference
  const complete = useCallback(() => {
    const internal = internalState.current;
    
    clearAllTimers();
    
    // Show full text
    internal.progress = internal.characters.length;
    const fullText = internal.characters.join('');
    
    // Update DOM if using direct manipulation
    if (internal.useDomManipulation) {
      animateTextInDom(fullText, false);
      if (targetRef?.current) {
        targetRef.current.classList.add('typewriter-complete');
      }
    }
    
    // Update state atomically
    if (internal.isMounted) {
      setState({
        displayText: fullText,
        isTyping: false,
        isComplete: true,
        showContinueIndicator: true
      });
    }
    
    // Call onComplete callback
    if (onComplete) {
      onComplete();
    }
  }, [clearAllTimers, onComplete, animateTextInDom, targetRef]);
  
  // PATTERN: Restart typing with stable reference
  const restart = useCallback(() => {
    const internal = internalState.current;
    
    clearAllTimers();
    
    // Reset progress
    internal.progress = 0;
    
    // Handle empty or single character text
    const isMinimalText = !internal.characters.length || internal.characters.length <= 1;
    const initialText = isMinimalText ? internal.characters.join('') : '';
    
    // Update DOM if using direct manipulation
    if (internal.useDomManipulation) {
      animateTextInDom(initialText, !isMinimalText);
      if (targetRef?.current) {
        targetRef.current.classList.remove('typewriter-complete');
      }
    }
    
    // Atomic state update
    if (internal.isMounted) {
      setState({
        displayText: initialText,
        isTyping: !isMinimalText,
        isComplete: isMinimalText,
        showContinueIndicator: isMinimalText
      });
    }
    
    // Start typing for non-minimal text
    if (!isMinimalText) {
      timers.current.typing = setTimeout(advanceTyping, startDelay);
    } else if (onComplete) {
      onComplete();
    }
  }, [clearAllTimers, startDelay, advanceTyping, onComplete, animateTextInDom, targetRef]);
  
  // PATTERN: Effect to handle text changes
  useEffect(() => {
    const internal = internalState.current;
    
    // Update our refs with the new text
    internal.fullText = text;
    internal.characters = Array.from(text || '');
    internal.useDomManipulation = Boolean(targetRef?.current);
    
    // Clean up any existing timers
    clearAllTimers();
    
    // Don't start if text is empty or only one character
    const isMinimalText = !text || text.length <= 1;
    const initialText = isMinimalText ? text : '';
    
    // If using DOM, set initial text
    if (internal.useDomManipulation) {
      animateTextInDom(initialText, !isMinimalText);
    }
    
    // Atomic state update
    if (internal.isMounted) {
      setState({
        displayText: initialText,
        isTyping: !isMinimalText,
        isComplete: isMinimalText,
        showContinueIndicator: isMinimalText
      });
    }
    
    // For minimal text, complete immediately
    if (isMinimalText) {
      if (onComplete) onComplete();
    } else {
      // Start typing after delay
      timers.current.typing = setTimeout(advanceTyping, startDelay);
    }
    
    // Cleanup function
    return clearAllTimers;
  }, [text, speed, startDelay, onComplete, clearAllTimers, advanceTyping, animateTextInDom, targetRef]);
  
  // PATTERN: Cleanup on unmount
  useEffect(() => {
    return () => {
      // Update mounted state
      internalState.current.isMounted = false;
      
      // Clear timers
      clearAllTimers();
      
      // Restore original content if using DOM
      if (targetRef?.current && targetRef.current.dataset.originalHtml) {
        targetRef.current.innerHTML = targetRef.current.dataset.originalHtml;
        delete targetRef.current.dataset.originalHtml;
        targetRef.current.classList.remove('typewriter-cursor', 'typewriter-complete');
      }
    };
  }, [clearAllTimers, targetRef]);
  
  // PATTERN: Add CSS for DOM-based animations when using targetRef
  useEffect(() => {
    if (!targetRef?.current) return;
    
    // Add global style for cursor animation if not already present
    const styleId = 'typewriter-style';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.innerHTML = `
        @keyframes typewriter-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        
        .typewriter-cursor::after {
          content: '|';
          display: inline-block;
          margin-left: 2px;
          animation: typewriter-blink 0.7s infinite;
        }
        
        .typewriter-complete::after {
          content: '▼';
          display: inline-block;
          margin-left: 4px;
          animation: typewriter-blink 1.5s infinite;
          font-size: 0.8em;
          vertical-align: middle;
        }
      `;
      document.head.appendChild(style);
    }
    
    // Cleanup function
    return () => {
      // Only remove style if this was the last instance
      if (document.querySelectorAll('[data-original-html]').length <= 1) {
        const style = document.getElementById(styleId);
        if (style) style.remove();
      }
    };
  }, [targetRef]);
  
  // Return consistent interface with stable references
  return { 
    displayText: state.displayText, 
    isComplete: state.isComplete, 
    isTyping: state.isTyping,
    showContinueIndicator: state.showContinueIndicator,
    complete,
    restart
  };
}

export default useTypewriter;