/**
 * UI Event Handlers
 * 
 * Game-specific event handlers that implement common Rogue Resident UI interactions.
 * These handlers build on the base event utilities to provide consistent behavior
 * across different components while integrating game-specific features like sound
 * effects, visual feedback, and game state changes.
 */

import React from 'react';
import baseHandlers, { 
  createHandler, 
  withSound, 
  withDebounce, 
  withVisualFeedback,
  EventHandler
} from './baseHandlers';

// Optional: Import game effects system for actual sound playback
// import { useGameEffects } from '@/components/GameEffects';

/**
 * Generic UI element handlers
 */
export const ui = {
  /**
   * General button click handler
   */
  buttonClick: (
    callback: () => void, 
    soundId: string = 'ui-click'
  ): EventHandler<React.MouseEvent> => {
    return withSound(
      withVisualFeedback(
        createHandler((_) => callback()),
        'ripple'
      ),
      soundId
    );
  },
  
  /**
   * Toggle button click handler
   */
  toggleClick: (
    isActive: boolean,
    onToggle: (newState: boolean) => void, 
    soundId: string = 'ui-toggle'
  ): EventHandler<React.MouseEvent> => {
    return withSound(
      withVisualFeedback(
        createHandler((_) => onToggle(!isActive)),
        'highlight'
      ),
      soundId
    );
  },
  
  /**
   * Close/dismiss button handler
   */
  closeClick: (
    onClose: () => void,
    soundId: string = 'ui-close'
  ): EventHandler<React.MouseEvent> => {
    return withSound(
      createHandler((_) => onClose()),
      soundId
    );
  }
};

/**
 * Navigation-related event handlers
 */
export const navigation = {
  /**
   * Tab selection handler
   */
  tabSelect: (
    tabId: string,
    currentTabId: string,
    onChange: (tabId: string) => void
  ): EventHandler<React.MouseEvent> => {
    return withSound(
      withVisualFeedback(
        createHandler((_) => {
          if (tabId !== currentTabId) {
            onChange(tabId);
          }
        }),
        'highlight'
      ),
      'ui-click'
    );
  },
  
  /**
   * Node selection in game map
   */
  nodeSelect: (
    nodeId: string,
    onSelect: (nodeId: string) => void,
    isAccessible: boolean = true
  ): EventHandler<React.MouseEvent> => {
    return withSound(
      withVisualFeedback(
        createHandler((_) => {
          if (isAccessible) {
            onSelect(nodeId);
          }
        }),
        'ripple'
      ),
      isAccessible ? 'node-select' : 'error'
    );
  },
  
  /**
   * Node hover effect
   */
  nodeHover: (
    nodeId: string,
    onHover: (nodeId: string | null) => void
  ): {
    onMouseEnter: EventHandler<React.MouseEvent>;
    onMouseLeave: EventHandler<React.MouseEvent>;
  } => {
    return {
      onMouseEnter: withSound(
        createHandler((_) => onHover(nodeId)),
        'node-hover'
      ),
      onMouseLeave: createHandler((_) => onHover(null))
    };
  }
};

/**
 * Accordion UI element handlers
 */
export const accordion = {
  /**
   * Toggle accordion expanded state
   */
  toggle: (
    isExpanded: boolean,
    onToggle: (isExpanded: boolean) => void
  ): EventHandler<React.MouseEvent> => {
    return withSound(
      createHandler((_) => onToggle(!isExpanded)),
      isExpanded ? 'ui-close' : 'ui-open'
    );
  }
};

/**
 * Form input handlers
 */
export const form = {
  /**
   * Text input change handler
   */
  fieldChange: (
    onChange: (value: string) => void
  ): EventHandler<React.ChangeEvent<HTMLInputElement>> => {
    return createHandler((event) => {
      onChange(event.target.value);
    });
  },
  
  /**
   * Textarea input with auto-resize
   */
  textareaChange: (
    onChange: (value: string) => void
  ): EventHandler<React.ChangeEvent<HTMLTextAreaElement>> => {
    return createHandler((event) => {
      // Auto-resize logic
      const textarea = event.target;
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
      
      // Call the provided change handler
      onChange(textarea.value);
    });
  },
  
  /**
   * Form submission handler
   */
  submit: (
    onSubmit: () => void
  ): EventHandler<React.FormEvent> => {
    return withSound(
      createHandler((event) => {
        event.preventDefault();
        onSubmit();
      }, { preventDefault: true }),
      'success'
    );
  }
};

/**
 * Handlers specifically for the Journal component
 */
export const journal = {
  /**
   * Tab selection handler specifically for journal
   */
  tabSelect: (
    tabId: 'knowledge' | 'characters' | 'notes' | 'references',
    currentTabId: string,
    onChange: (tabId: 'knowledge' | 'characters' | 'notes' | 'references') => void
  ): EventHandler<React.MouseEvent> => {
    return withSound(
      withVisualFeedback(
        createHandler((_) => {
          if (tabId !== currentTabId) {
            onChange(tabId);
          }
        }),
        'highlight'
      ),
      'ui-click'
    );
  },
  
  /**
   * Close journal
   */
  close: (
    onClose: () => void
  ): EventHandler<React.MouseEvent> => {
    return withSound(
      createHandler((_) => onClose()),
      'ui-close'
    );
  },
  
  /**
   * Background click (outside content) to close
   */
  backgroundClick: (
    onClose: () => void
  ): EventHandler<React.MouseEvent> => {
    return createHandler((event) => {
      // Only close if clicked directly on the background
      if (event.target === event.currentTarget) {
        onClose();
      }
    }, { stopPropagation: false });
  },
  
  /**
   * Create new journal entry
   */
  createEntry: (
    onCreateEntry: () => void
  ): EventHandler<React.MouseEvent> => {
    return withSound(
      withVisualFeedback(
        createHandler((_) => onCreateEntry()),
        'highlight'
      ),
      'success'
    );
  },
  
  /**
   * Save journal entry
   */
  saveEntry: (
    onSave: () => void
  ): EventHandler<React.MouseEvent> => {
    return withSound(
      createHandler((_) => onSave()),
      'success'
    );
  },
  
  /**
   * Cancel entry editing
   */
  cancelEdit: (
    onCancel: () => void
  ): EventHandler<React.MouseEvent> => {
    return withSound(
      createHandler((_) => onCancel()),
      'ui-close'
    );
  }
};

/**
 * Handlers for dialogue system
 */
export const dialogue = {
  /**
   * Select dialogue option
   */
  selectOption: (
    optionId: string,
    onSelect: (optionId: string) => void,
    isUnlocked: boolean = true
  ): EventHandler<React.MouseEvent> => {
    return withSound(
      withVisualFeedback(
        createHandler((_) => {
          if (isUnlocked) {
            onSelect(optionId);
          }
        }),
        'highlight'
      ),
      isUnlocked ? 'dialogue-select' : 'error'
    );
  },
  
  /**
   * Continue dialogue
   */
  continue: (
    onContinue: () => void
  ): EventHandler<React.MouseEvent | React.KeyboardEvent> => {
    return withSound(
      createHandler((_) => onContinue()),
      'ui-click'
    );
  }
};

/**
 * Handlers for character interactions
 */
export const character = {
  /**
   * Interact with character
   */
  interact: (
    characterId: string,
    onInteract: (characterId: string) => void
  ): EventHandler<React.MouseEvent> => {
    return withSound(
      withVisualFeedback(
        createHandler((_) => onInteract(characterId)),
        'highlight'
      ),
      'character-interact'
    );
  }
};

/**
 * Handlers for inventory and item interactions
 */
export const inventory = {
  /**
   * Select item from inventory
   */
  selectItem: (
    itemId: string,
    onSelect: (itemId: string) => void
  ): EventHandler<React.MouseEvent> => {
    return withSound(
      withVisualFeedback(
        createHandler((_) => onSelect(itemId)),
        'highlight'
      ),
      'item-select'
    );
  },
  
  /**
   * Use item from inventory
   */
  useItem: (
    itemId: string,
    onUse: (itemId: string) => void
  ): EventHandler<React.MouseEvent> => {
    return withSound(
      withVisualFeedback(
        createHandler((_) => onUse(itemId)),
        'ripple'
      ),
      'item-use'
    );
  }
};

/**
 * Handlers for knowledge constellation interactions
 */
export const knowledge = {
  /**
   * Select concept node
   */
  selectConcept: (
    conceptId: string,
    onSelect: (conceptId: string) => void
  ): EventHandler<React.MouseEvent> => {
    return withSound(
      withVisualFeedback(
        createHandler((_) => onSelect(conceptId)),
        'highlight'
      ),
      'knowledge-select'
    );
  },
  
  /**
   * Create connection between concepts
   */
  createConnection: (
    sourceId: string,
    targetId: string,
    onConnect: (sourceId: string, targetId: string) => void
  ): EventHandler<React.MouseEvent> => {
    return withSound(
      withVisualFeedback(
        createHandler((_) => onConnect(sourceId, targetId)),
        'ripple'
      ),
      'knowledge-connect'
    );
  }
};

/**
 * Add event stop handlers that prevent propagation
 */
export const stop = {
  /**
   * Stop event propagation
   */
  propagation: createHandler((_) => {}, { stopPropagation: true }),
  
  /**
   * Prevent default behavior and stop propagation
   */
  default: createHandler((_) => {}, { preventDefault: true, stopPropagation: true })
};

// Export all handler categories
export const uiHandlers = {
  ui,
  navigation,
  accordion,
  form,
  journal,
  dialogue,
  character,
  inventory,
  knowledge,
  stop
};

export default uiHandlers;
