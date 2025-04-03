/**
 * Base Event Handlers
 * 
 * Core utilities for creating consistent, type-safe event handlers throughout the game.
 * These foundational handlers provide predictable propagation control and event handling
 * patterns that ensure UI interactions remain consistent across the entire experience.
 */

import React from 'react';

// Core event types for type-safety
export type EventHandler<E extends React.SyntheticEvent = React.SyntheticEvent> = (event: E) => void;
export type KeyboardEventHandler = EventHandler<React.KeyboardEvent>;
export type MouseEventHandler = EventHandler<React.MouseEvent>;
export type FocusEventHandler = EventHandler<React.FocusEvent>;
export type ChangeEventHandler = EventHandler<React.ChangeEvent>;

// Common handler options
export interface HandlerOptions {
  stopPropagation?: boolean;
  preventDefault?: boolean;
  capturePhase?: boolean;
}

// Default options for consistent behavior
const defaultOptions: HandlerOptions = {
  stopPropagation: true,
  preventDefault: false,
  capturePhase: false
};

/**
 * Creates a type-safe event handler with consistent propagation control
 * 
 * @param callback The function to execute when the event triggers
 * @param options Control over event behavior (propagation, default actions)
 * @returns A properly typed event handler with predictable behavior
 */
export function createHandler<E extends React.SyntheticEvent>(
  callback: (event: E) => void,
  options: HandlerOptions = {}
): EventHandler<E> {
  // Merge with default options
  const mergedOptions = { ...defaultOptions, ...options };
  
  return (event: E): void => {
    // Apply propagation controls
    if (mergedOptions.stopPropagation) {
      event.stopPropagation();
    }
    
    if (mergedOptions.preventDefault) {
      event.preventDefault();
    }
    
    // Execute the callback
    callback(event);
  };
}

/**
 * Creates a keyboard event handler with optional key filtering
 * 
 * @param callback The function to execute when the key event triggers
 * @param keys Optional array of keys that should trigger the handler
 * @param options Control over event behavior
 * @returns A keyboard event handler that only triggers on specified keys
 */
export function createKeyHandler(
  callback: (event: React.KeyboardEvent) => void,
  keys?: string[],
  options: HandlerOptions = {}
): KeyboardEventHandler {
  return createHandler<React.KeyboardEvent>((event) => {
    // If keys are specified, only execute for matching keys
    if (keys && !keys.includes(event.key)) {
      return;
    }
    callback(event);
  }, options);
}

/**
 * Creates a mouse event handler with positioning data
 * 
 * @param callback The function to execute with normalized position data
 * @param options Control over event behavior
 * @returns A mouse event handler that provides normalized position data
 */
export function createMouseHandler(
  callback: (event: React.MouseEvent, position: { x: number, y: number }) => void,
  options: HandlerOptions = {}
): MouseEventHandler {
  return createHandler<React.MouseEvent>((event) => {
    // Calculate normalized position (0-1) relative to the target element
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const position = {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height
    };
    
    callback(event, position);
  }, options);
}

/**
 * Wraps an event handler to add sound effects
 * 
 * @param handler The base event handler
 * @param soundId Identifier for the sound to play
 * @returns A handler that plays a sound effect when triggered
 */
export function withSound<E extends React.SyntheticEvent>(
  handler: (event: E) => void,
  soundId: string
): EventHandler<E> {
  return (event: E): void => {
    // Play the sound effect (placeholder - would connect to your sound system)
    console.log(`Playing sound: ${soundId}`);
    // Would call actual sound system here: soundSystem.play(soundId);
    
    // Execute the original handler
    handler(event);
  };
}

/**
 * Controls propagation for an existing handler
 * 
 * @param handler The base event handler
 * @param shouldStop Whether to stop propagation
 * @returns An event handler with specified propagation behavior
 */
export function withPropagation<E extends React.SyntheticEvent>(
  handler: (event: E) => void,
  shouldStop: boolean = true
): EventHandler<E> {
  return (event: E): void => {
    if (shouldStop) {
      event.stopPropagation();
    }
    handler(event);
  };
}

/**
 * Creates a form input change handler with value extraction
 * 
 * @param callback Function receiving the input's value
 * @param options Control over event behavior
 * @returns A change event handler that provides the input value
 */
export function createChangeHandler(
  callback: (value: string, event: React.ChangeEvent<HTMLInputElement>) => void,
  options: HandlerOptions = {}
): ChangeEventHandler {
  return createHandler<React.ChangeEvent<HTMLInputElement>>((event) => {
    callback(event.target.value, event);
  }, options);
}

/**
 * Creates a handler that executes only if a condition is met
 * 
 * @param handler The base event handler
 * @param condition Function that determines if handler should execute
 * @returns A conditional event handler
 */
export function withCondition<E extends React.SyntheticEvent>(
  handler: (event: E) => void,
  condition: (event: E) => boolean
): EventHandler<E> {
  return (event: E): void => {
    if (condition(event)) {
      handler(event);
    }
  };
}

/**
 * Creates an event handler bound to a specific target
 * 
 * @param handler The base event handler
 * @param targetId ID of the element that should trigger the handler
 * @returns An event handler that only executes when the event target matches
 */
export function withTargetId<E extends React.SyntheticEvent>(
  handler: (event: E) => void,
  targetId: string
): EventHandler<E> {
  return (event: E): void => {
    const targetElement = event.target as HTMLElement;
    if (targetElement.id === targetId) {
      handler(event);
    }
  };
}

/**
 * Debounces an event handler to prevent rapid repeated executions
 * 
 * @param handler The base event handler
 * @param delay Time in milliseconds to wait before executing
 * @returns A debounced event handler
 */
export function withDebounce<E extends React.SyntheticEvent>(
  handler: (event: E) => void,
  delay: number = 300
): EventHandler<E> {
  let timeoutId: NodeJS.Timeout | null = null;
  
  return (event: E): void => {
    // Store a copy of the event to use after the delay
    // This is needed because React's synthetic events are pooled
    event.persist();
    
    // Clear any existing timeout
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    
    // Set a new timeout
    timeoutId = setTimeout(() => {
      handler(event);
      timeoutId = null;
    }, delay);
  };
}

/**
 * Creates an event handler that visually indicates interaction
 * 
 * @param handler The base event handler
 * @param feedbackType The type of visual feedback to provide
 * @returns An event handler that adds visual feedback
 */
export function withVisualFeedback<E extends React.SyntheticEvent>(
  handler: (event: E) => void,
  feedbackType: 'ripple' | 'highlight' | 'flash' = 'highlight'
): EventHandler<E> {
  return (event: E): void => {
    // Apply visual feedback
    const target = event.currentTarget as HTMLElement;
    
    // Different feedback types
    switch (feedbackType) {
      case 'ripple':
        applyRippleEffect(target);
        break;
      case 'highlight':
        applyHighlightEffect(target);
        break;
      case 'flash':
        applyFlashEffect(target);
        break;
    }
    
    // Execute the original handler
    handler(event);
  };
}

// Visual feedback helper functions
function applyRippleEffect(element: HTMLElement): void {
  // Implementation would create a ripple element and animate it
  console.log('Applying ripple effect to', element);
}

function applyHighlightEffect(element: HTMLElement): void {
  // Implementation would add a highlight class and remove it after animation
  console.log('Applying highlight effect to', element);
}

function applyFlashEffect(element: HTMLElement): void {
  // Implementation would add a flash animation
  console.log('Applying flash effect to', element);
}

// Export all utility functions
export default {
  createHandler,
  createKeyHandler,
  createMouseHandler,
  createChangeHandler,
  withSound,
  withPropagation,
  withCondition,
  withTargetId,
  withDebounce,
  withVisualFeedback
};
