/**
 * Journal Event Handlers
 * 
 * Specialized event utilities for Journal component interactions.
 * Extends the base uiHandlers with Journal-specific functionality.
 */

import React from 'react';
import { 
  createHandler, 
  EventHandler,
  withSound,
  withVisualFeedback
} from './baseHandlers';
import { ui, form, stop } from './uiHandlers';
import { JournalPageType } from '../../components/journal/Journal';
import { useGameEffects } from '../../components/GameEffects';

// Re-export the stop handlers for convenience
export { stop };

/**
 * Journal tab selection with enhanced transition feedback
 */
export const tabSelect = (
  tabId: JournalPageType,
  currentTabId: JournalPageType,
  onChange: (tabId: JournalPageType) => void,
  tabHighlightColor?: string
): EventHandler<React.MouseEvent> => {
  return withSound(
    withVisualFeedback(
      createHandler((_) => {
        if (tabId !== currentTabId) {
          onChange(tabId);
          
          // Add subtle visual effect to show active tab
          const tabElements = document.querySelectorAll('.journal-tab');
          tabElements.forEach(el => {
            if ((el as HTMLElement).dataset.tabId === tabId) {
              el.classList.add('active-tab');
              if (tabHighlightColor) {
                (el as HTMLElement).style.borderColor = tabHighlightColor;
              }
            } else {
              el.classList.remove('active-tab');
              (el as HTMLElement).style.borderColor = '';
            }
          });
        }
      }),
      'highlight'
    ),
    'ui-click'
  );
};

/**
 * Enhanced journal entry toggle with animation
 */
export const toggleEntry = (
  entryId: string,
  isExpanded: boolean,
  onToggle: (expanded: boolean) => void
): EventHandler<React.MouseEvent> => {
  return withSound(
    createHandler((_) => {
      // Handle expansion state
      onToggle(!isExpanded);
      
      // Enhanced animation
      setTimeout(() => {
        const contentElement = document.querySelector(`#entry-content-${entryId}`);
        if (contentElement) {
          if (!isExpanded) {
            contentElement.classList.add('entry-expanded');
            contentElement.classList.remove('entry-collapsed');
          } else {
            contentElement.classList.add('entry-collapsed');
            contentElement.classList.remove('entry-expanded');
          }
        }
      }, 10);
    }),
    isExpanded ? 'ui-close' : 'ui-open'
  );
};

/**
 * Create a new journal entry with enhanced feedback
 */
export const createEntry = (
  onCreateEntry: () => void,
  validation: () => boolean = () => true
): EventHandler<React.MouseEvent> => {
  return withSound(
    withVisualFeedback(
      createHandler((_) => {
        // Validate entry
        if (!validation()) {
          return;
        }
        
        // Create entry
        onCreateEntry();
        
        // Enhanced visual feedback
        const journalContainer = document.querySelector('.journal-container');
        if (journalContainer) {
          journalContainer.classList.add('flash-success');
          setTimeout(() => {
            journalContainer.classList.remove('flash-success');
          }, 500);
        }
      }),
      'ripple'
    ),
    'success'
  );
};

/**
 * Knowledge section specific handlers
 */
export const knowledge = {
  /**
   * Toggle domain expansion with proper animation
   */
  toggleDomain: (
    domainId: string,
    isExpanded: boolean,
    onToggle: (expanded: boolean) => void,
    domainColor: string
  ): EventHandler<React.MouseEvent> => {
    return withSound(
      createHandler((_) => {
        onToggle(!isExpanded);
        
        // Apply domain-specific color flash
        const domainElement = document.querySelector(`#domain-${domainId}`);
        if (domainElement) {
          domainElement.classList.add('domain-highlight');
          (domainElement as HTMLElement).style.boxShadow = `0 0 8px ${domainColor}`;
          
          setTimeout(() => {
            domainElement.classList.remove('domain-highlight');
            (domainElement as HTMLElement).style.boxShadow = '';
          }, 500);
        }
      }),
      isExpanded ? 'ui-close' : 'ui-open'
    );
  },
  
  /**
   * Concept focus with specialized highlight
   */
  focusConcept: (
    conceptId: string,
    onFocus: (conceptId: string) => void
  ): EventHandler<React.MouseEvent> => {
    return withSound(
      createHandler((_) => {
        onFocus(conceptId);
        
        // Highlight concept in knowledge visualization
        // This would connect to the ConstellationView component
        const event = new CustomEvent('highlightConcept', { detail: { conceptId } });
        document.dispatchEvent(event);
      }),
      'knowledge-select'
    );
  }
};

/**
 * Character journal specific handlers
 */
export const character = {
  /**
   * Edit character notes with animation and sound
   */
  editNotes: (
    characterId: string,
    currentNotes: string,
    onEdit: (characterId: string, notes: string) => void
  ): EventHandler<React.MouseEvent> => {
    return withSound(
      createHandler((_) => {
        onEdit(characterId, currentNotes);
        
        // Animate transition to edit mode
        const notesElement = document.querySelector(`#character-notes-${characterId}`);
        if (notesElement) {
          notesElement.classList.add('notes-edit-transition');
          setTimeout(() => {
            notesElement.classList.remove('notes-edit-transition');
          }, 300);
        }
      }),
      'ui-click'
    );
  },
  
  /**
   * Save character notes with validation and feedback
   */
  saveNotes: (
    characterId: string,
    notes: string,
    onSave: (characterId: string, notes: string) => void
  ): EventHandler<React.MouseEvent> => {
    return withSound(
      createHandler((_) => {
        // Save the notes
        onSave(characterId, notes);
        
        // Show success effect
        const characterElement = document.querySelector(`#character-${characterId}`);
        if (characterElement) {
          characterElement.classList.add('save-success');
          setTimeout(() => {
            characterElement.classList.remove('save-success');
          }, 500);
        }
      }),
      'success'
    );
  }
};

/**
 * References page specific handlers
 */
export const references = {
  /**
   * Toggle reference section with enhanced animation
   */
  toggleSection: (
    sectionId: string,
    isExpanded: boolean,
    onToggle: (expanded: boolean) => void,
    specialSection: boolean = false
  ): EventHandler<React.MouseEvent> => {
    return withSound(
      createHandler((_) => {
        onToggle(!isExpanded);
        
        // Add fancy scroll effect for special sections
        if (specialSection && !isExpanded) {
          setTimeout(() => {
            const sectionElement = document.querySelector(`#section-${sectionId}`);
            if (sectionElement) {
              sectionElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 100);
        }
      }),
      specialSection 
        ? (isExpanded ? 'ui-close' : 'phase-transition') 
        : (isExpanded ? 'ui-close' : 'ui-open')
    );
  },
  
  /**
   * Highlight reference content with pulsing effect
   */
  highlightContent: (
    sectionId: string,
    textId: string
  ): EventHandler<React.MouseEvent> => {
    return withSound(
      createHandler((_) => {
        const textElement = document.querySelector(`#${sectionId}-${textId}`);
        if (textElement) {
          textElement.classList.add('text-highlight-pulse');
          setTimeout(() => {
            textElement.classList.remove('text-highlight-pulse');
          }, 1000);
        }
      }),
      'ui-click'
    );
  }
};

// Export all specialized journal handlers
export const journalHandlers = {
  tabSelect,
  toggleEntry,
  createEntry,
  knowledge,
  character,
  references,
  stop
};

export default journalHandlers;