/**
 * Event-Effects Integration
 * 
 * Connects the event system with game effects system for enhanced feedback.
 * This module provides:
 * 1. Visual effects for interactions
 * 2. Screen effects for significant events
 * 3. State change visualizations
 */

import React from 'react';
import { 
  createHandler, 
  withSound,
  EventHandler
} from './baseHandlers';
import { useGameEffects } from '../../components/GameEffects';

// Effects intensity levels
export type EffectIntensity = 'subtle' | 'medium' | 'strong';

/**
 * Create a handler that applies screen shake when triggered
 * 
 * @param handler Base event handler
 * @param intensity Shake intensity
 * @returns Enhanced handler with screen shake
 */
export function withScreenShake<E extends React.SyntheticEvent>(
  handler: (event: E) => void,
  intensity: 'light' | 'medium' | 'heavy' = 'light'
): EventHandler<E> {
  return (event: E): void => {
    // Get the game effects
    const { shakeScreen } = useGameEffects();
    
    // Apply screen shake
    shakeScreen(intensity);
    
    // Execute the original handler
    handler(event);
  };
}

/**
 * Create a handler that applies screen flash when triggered
 * 
 * @param handler Base event handler
 * @param color Flash color
 * @returns Enhanced handler with screen flash
 */
export function withScreenFlash<E extends React.SyntheticEvent>(
  handler: (event: E) => void,
  color: 'white' | 'red' | 'green' | 'blue' | 'yellow' = 'white'
): EventHandler<E> {
  return (event: E): void => {
    // Get the game effects
    const { flashScreen } = useGameEffects();
    
    // Apply screen flash
    flashScreen(color);
    
    // Execute the original handler
    handler(event);
  };
}

/**
 * Create a handler that spawns particles at the event location
 * 
 * @param handler Base event handler
 * @param count Number of particles
 * @param color Particle color
 * @returns Enhanced handler with particle effects
 */
export function withParticles<E extends React.MouseEvent>(
  handler: (event: E) => void,
  count: number = 5,
  type: 'reward' | 'damage' | 'heal' | 'completion' = 'completion'
): EventHandler<E> {
  return (event: E): void => {
    // Get mouse position
    const x = event.clientX;
    const y = event.clientY;
    
    // Get the game effects
    const { showCompletionEffect, showRewardEffect, showDamageEffect, showHealEffect } = useGameEffects();
    
    // Apply appropriate effect based on type
    switch (type) {
      case 'reward':
        showRewardEffect(count, x, y);
        break;
      case 'damage':
        showDamageEffect(count, x, y);
        break;
      case 'heal':
        showHealEffect(count, x, y);
        break;
      case 'completion':
      default:
        showCompletionEffect(x, y);
        break;
    }
    
    // Execute the original handler
    handler(event);
  };
}

/**
 * Create a handler with comprehensive success feedback
 * (particles, sound, and flash)
 */
export function withSuccessFeedback<E extends React.MouseEvent>(
  handler: (event: E) => void,
  intensity: EffectIntensity = 'medium'
): EventHandler<E> {
  const intensityMap = {
    subtle: {
      particleCount: 3,
      flashColor: 'green' as const,
      sound: 'success'
    },
    medium: {
      particleCount: 5,
      flashColor: 'green' as const,
      sound: 'success'
    },
    strong: {
      particleCount: 10,
      flashColor: 'green' as const,
      sound: 'success'
    }
  };
  
  const settings = intensityMap[intensity];
  
  // Apply particles, flash, and sound
  return withParticles(
    withScreenFlash(
      withSound(handler, settings.sound),
      settings.flashColor
    ),
    settings.particleCount,
    'reward'
  );
}

/**
 * Create a handler with comprehensive failure feedback
 */
export function withFailureFeedback<E extends React.MouseEvent>(
  handler: (event: E) => void,
  intensity: EffectIntensity = 'medium'
): EventHandler<E> {
  const intensityMap = {
    subtle: {
      particleCount: 3,
      flashColor: 'red' as const,
      sound: 'failure'
    },
    medium: {
      particleCount: 5,
      flashColor: 'red' as const,
      sound: 'failure'
    },
    strong: {
      particleCount: 10,
      flashColor: 'red' as const,
      sound: 'damage'
    }
  };
  
  const settings = intensityMap[intensity];
  
  // Apply particles, flash, and sound
  return withParticles(
    withScreenFlash(
      withSound(handler, settings.sound),
      settings.flashColor
    ),
    settings.particleCount,
    'damage'
  );
}

/**
 * Create a handler with knowledge acquisition feedback
 */
export function withKnowledgeFeedback<E extends React.MouseEvent>(
  handler: (event: E) => void,
  conceptId: string,
  masteryGain: number
): EventHandler<E> {
  return (event: E): void => {
    // Execute the original handler first
    handler(event);
    
    // Get the game effects
    const { flashScreen, playSound } = useGameEffects();
    
    // Show knowledge acquisition effect
    flashScreen('blue');
    playSound('ui-click');
    
    // In a complete implementation, this would trigger a knowledge
    // gain visualization through the knowledge store
    const knowledgeEvent = new CustomEvent('knowledgeGained', {
      detail: {
        conceptId,
        masteryGain
      }
    });
    
    document.dispatchEvent(knowledgeEvent);
  };
}

/**
 * Journal-specific effects
 */
export const journalEffects = {
  /**
   * Create handler for journal entry creation with success effects
   */
  createEntry: (
    handler: (event: React.MouseEvent) => void
  ): EventHandler<React.MouseEvent> => {
    return withSuccessFeedback(handler, 'medium');
  },
  
  /**
   * Create handler for constellation connection with effects
   */
  connectConcepts: (
    handler: (event: React.MouseEvent) => void,
    sourceId: string,
    targetId: string
  ): EventHandler<React.MouseEvent> => {
    return (event: React.MouseEvent): void => {
      // Execute the handler
      handler(event);
      
      // Get the game effects
      const { playSound } = useGameEffects();
      playSound('success');
      
      // Dispatch a custom event for visualization
      const connectionEvent = new CustomEvent('conceptsConnected', {
        detail: {
          sourceId,
          targetId,
          x: event.clientX,
          y: event.clientY
        }
      });
      
      document.dispatchEvent(connectionEvent);
    };
  }
};

export default {
  withScreenShake,
  withScreenFlash,
  withParticles,
  withSuccessFeedback,
  withFailureFeedback,
  withKnowledgeFeedback,
  journalEffects
};