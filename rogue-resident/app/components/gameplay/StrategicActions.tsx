// app/components/gameplay/StrategicActions.tsx
'use client';
import React, { useReducer, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useResourceStore, StrategicActionType } from '../../store/resourceStore';

interface StrategicActionsProps {
  characterId: string;
  stageId: string;
  className?: string;
  onActionActivate?: (actionType: StrategicActionType) => void;
  onActionComplete?: (actionType: StrategicActionType, successful: boolean) => void;
  onActionCancel?: (actionType: StrategicActionType) => void;
}

// Action state management
type ActionState = {
  mode: 'whisper' | 'hover' | 'shout';
  expandedAction: StrategicActionType | null;
  actionOptions: string[];
};

type ActionStateAction = 
  | { type: 'HOVER_START'; action: StrategicActionType }
  | { type: 'HOVER_END' }
  | { type: 'ACTIVATE'; action: StrategicActionType; options: string[] }
  | { type: 'COMPLETE' }
  | { type: 'CANCEL' }
  | { type: 'RESET' };

// Reducer for managing action states
function actionStateReducer(state: ActionState, action: ActionStateAction): ActionState {
  switch (action.type) {
    case 'HOVER_START':
      return {
        ...state,
        mode: 'hover',
        expandedAction: action.action
      };
    case 'HOVER_END':
      return {
        ...state,
        mode: 'whisper',
        expandedAction: null
      };
    case 'ACTIVATE':
      return {
        ...state,
        mode: 'shout',
        expandedAction: action.action,
        actionOptions: action.options
      };
    case 'COMPLETE':
    case 'CANCEL':
      return {
        ...state,
        mode: 'whisper',
        expandedAction: null,
        actionOptions: []
      };
    case 'RESET':
      return {
        mode: 'whisper',
        expandedAction: null,
        actionOptions: []
      };
    default:
      return state;
  }
}

/**
 * Strategic Actions Panel
 * 
 * Implements the "whisper-to-shout" pattern from the design doc.
 * Actions start as small icons and expand on hover, then become
 * full-screen overlays when activated.
 */
export default function StrategicActions({
  characterId,
  stageId,
  className = '',
  onActionActivate,
  onActionComplete,
  onActionCancel
}: StrategicActionsProps) {
  // Access resource store
  const { 
    insight, 
    momentum, 
    availableActions, 
    activeAction, 
    activateAction, 
    completeAction, 
    cancelAction 
  } = useResourceStore();
  
  // State management with reducer
  const [state, dispatch] = useReducer(actionStateReducer, {
    mode: 'whisper',
    expandedAction: null,
    actionOptions: []
  });
  
  // Ref for handling hover timeouts
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Reset expanded action when active action changes
  useEffect(() => {
    if (activeAction !== null) {
      dispatch({ type: 'ACTIVATE', action: activeAction, options: state.actionOptions });
    } else {
      dispatch({ type: 'RESET' });
    }
    
    // Clean up any hover timers on unmount
    return () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }
    };
  }, [activeAction, state.actionOptions]);
  
  // Handle mouse enter on an action button
  const handleActionHover = (actionType: StrategicActionType) => {
    if (activeAction !== null) return;
    
    // Clear any existing timer
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
    }
    
    // Set a small delay before expanding to prevent flicker
    hoverTimerRef.current = setTimeout(() => {
      dispatch({ type: 'HOVER_START', action: actionType });
    }, 150);
  };
  
  // Handle mouse leave on an action button
  const handleActionLeave = () => {
    if (activeAction !== null) return;
    
    // Clear any existing timer
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
    }
    
    // Set a small delay before collapsing to prevent flicker
    hoverTimerRef.current = setTimeout(() => {
      dispatch({ type: 'HOVER_END' });
    }, 150);
  };
  
  // Handle action button click
  const handleActionClick = (actionType: StrategicActionType) => {
    // Don't allow clicks if another action is active
    if (activeAction !== null) return;
    
    // Don't allow clicks on unavailable actions
    if (!availableActions[actionType]) return;
    
    // Prepare action-specific options
    let options: string[] = [];
    
    switch (actionType) {
      case 'reframe':
        options = [
          'Ask a simpler question',
          'Focus on practical applications',
          'Relate to basic principles'
        ];
        break;
      case 'extrapolate':
        options = [
          'Connect to quality assurance',
          'Relate to patient safety',
          'Link to regulatory requirements'
        ];
        break;
      case 'synthesis':
        options = [
          'Explore new knowledge domain',
          'Discover related concept',
          'Unlock advanced topic'
        ];
        break;
      case 'boast':
        // Boast doesn't have options, it modifies existing dialogue
        break;
    }
    
    // Try to activate the action
    const success = activateAction(actionType, { characterId, stageId });
    
    if (success) {
      // Notify parent component
      if (onActionActivate) {
        onActionActivate(actionType);
      }
      
      // Update state to reflect the activated action
      dispatch({ type: 'ACTIVATE', action: actionType, options });
    }
  };
  
  // Handle option selection in shout state
  const handleOptionSelect = (option: string) => {
    if (activeAction === null) return;
    
    // Complete the action
    completeAction(activeAction, true);
    
    // Notify parent component
    if (onActionComplete) {
      onActionComplete(activeAction, true);
    }
    
    // Update state
    dispatch({ type: 'COMPLETE' });
  };
  
  // Handle cancel button click
  const handleCancel = () => {
    if (activeAction === null) return;
    
    // Cancel the action
    cancelAction(activeAction);
    
    // Notify parent component
    if (onActionCancel) {
      onActionCancel(activeAction);
    }
    
    // Update state
    dispatch({ type: 'CANCEL' });
  };
  
  // Get color classes for an action
  const getActionColors = (actionType: StrategicActionType): {
    bgClass: string;
    hoverBgClass: string;
    textClass: string;
    borderClass: string;
    glowClass: string;
  } => {
    switch (actionType) {
      case 'reframe':
        return {
          bgClass: 'bg-blue-900/80',
          hoverBgClass: 'hover:bg-blue-800',
          textClass: 'text-blue-300',
          borderClass: 'border-blue-700',
          glowClass: 'shadow-blue-500/20'
        };
      case 'extrapolate':
        return {
          bgClass: 'bg-purple-900/80',
          hoverBgClass: 'hover:bg-purple-800',
          textClass: 'text-purple-300',
          borderClass: 'border-purple-700',
          glowClass: 'shadow-purple-500/20'
        };
      case 'boast':
        return {
          bgClass: 'bg-orange-900/80',
          hoverBgClass: 'hover:bg-orange-800',
          textClass: 'text-orange-300',
          borderClass: 'border-orange-700',
          glowClass: 'shadow-orange-500/20'
        };
      case 'synthesis':
        return {
          bgClass: 'bg-green-900/80',
          hoverBgClass: 'hover:bg-green-800',
          textClass: 'text-green-300',
          borderClass: 'border-green-700',
          glowClass: 'shadow-green-500/20'
        };
    }
  };
  
  // No actions available, don't render anything
  if (!availableActions.reframe && 
      !availableActions.extrapolate && 
      !availableActions.boast && 
      !availableActions.synthesis && 
      activeAction === null) {
    return null;
  }
  
  // Render based on current state mode
  return (
    <>
      {/* Whisper State - Small icons */}
      {state.mode === 'whisper' ? (
        <div className={`flex space-x-2 items-center ${className}`}>
          {/* Reframe action */}
          {availableActions.reframe && (
            <motion.button
              className={`w-8 h-8 rounded flex items-center justify-center ${getActionColors('reframe').bgClass} ${getActionColors('reframe').hoverBgClass} shadow-lg ${getActionColors('reframe').glowClass}`}
              onMouseEnter={() => handleActionHover('reframe')}
              onMouseLeave={handleActionLeave}
              onClick={() => handleActionClick('reframe')}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="text-sm font-bold">R</span>
            </motion.button>
          )}
          
          {/* Extrapolate action */}
          {availableActions.extrapolate && (
            <motion.button
              className={`w-8 h-8 rounded flex items-center justify-center ${getActionColors('extrapolate').bgClass} ${getActionColors('extrapolate').hoverBgClass} shadow-lg ${getActionColors('extrapolate').glowClass}`}
              onMouseEnter={() => handleActionHover('extrapolate')}
              onMouseLeave={handleActionLeave}
              onClick={() => handleActionClick('extrapolate')}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="text-sm font-bold">E</span>
            </motion.button>
          )}
          
          {/* Boast action */}
          {availableActions.boast && (
            <motion.button
              className={`w-8 h-8 rounded flex items-center justify-center ${getActionColors('boast').bgClass} ${getActionColors('boast').hoverBgClass} shadow-lg ${getActionColors('boast').glowClass} animate-pulse`}
              onMouseEnter={() => handleActionHover('boast')}
              onMouseLeave={handleActionLeave}
              onClick={() => handleActionClick('boast')}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="text-sm font-bold">B</span>
            </motion.button>
          )}
          
          {/* Synthesis action */}
          {availableActions.synthesis && (
            <motion.button
              className={`w-8 h-8 rounded flex items-center justify-center ${getActionColors('synthesis').bgClass} ${getActionColors('synthesis').hoverBgClass} shadow-lg ${getActionColors('synthesis').glowClass}`}
              onMouseEnter={() => handleActionHover('synthesis')}
              onMouseLeave={handleActionLeave}
              onClick={() => handleActionClick('synthesis')}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="text-sm font-bold">S</span>
            </motion.button>
          )}
        </div>
      ) : null}
      
      {/* Hover State - Expanded tooltips */}
      {state.mode === 'hover' && state.expandedAction ? (
        <AnimatePresence>
          <motion.div 
            className="absolute top-full mt-2 right-0 z-10"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            onMouseEnter={() => handleActionHover(state.expandedAction!)}
            onMouseLeave={handleActionLeave}
          >
            <div 
              className={`${getActionColors(state.expandedAction).bgClass} ${getActionColors(state.expandedAction).textClass} p-3 rounded shadow-lg border ${getActionColors(state.expandedAction).borderClass} max-w-xs`}
            >
              <div className="font-pixel text-sm mb-1 flex justify-between items-center">
                <span>
                  {state.expandedAction === 'reframe' && 'Reframe'}
                  {state.expandedAction === 'extrapolate' && 'Extrapolate'}
                  {state.expandedAction === 'boast' && 'Boast/Expand'}
                  {state.expandedAction === 'synthesis' && 'Synthesis'}
                </span>
                
                <span className="font-bold">
                  {state.expandedAction === 'reframe' && `${25} Insight`}
                  {state.expandedAction === 'extrapolate' && `${50} Insight`}
                  {state.expandedAction === 'boast' && 'Max Momentum'}
                  {state.expandedAction === 'synthesis' && `${75} Insight`}
                </span>
              </div>
              
              <p className="text-xs mb-2">
                {state.expandedAction === 'reframe' && 
                  'Shift the conversation toward topics you're more comfortable with.'}
                {state.expandedAction === 'extrapolate' && 
                  'Form connections between related concepts in your knowledge network.'}
                {state.expandedAction === 'boast' && 
                  'Take a bold approach with higher difficulty but greater rewards.'}
                {state.expandedAction === 'synthesis' && 
                  'Discover new knowledge domains by synthesizing existing concepts.'}
              </p>
              
              <motion.button
                className={`w-full py-1 px-2 rounded text-center ${getActionColors(state.expandedAction).hoverBgClass} text-white text-sm font-pixel`}
                onClick={() => handleActionClick(state.expandedAction!)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Activate
              </motion.button>
            </div>
          </motion.div>
        </AnimatePresence>
      ) : null}
      
      {/* Shout State - Fullscreen overlay */}
      {state.mode === 'shout' && activeAction ? (
        <motion.div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div 
            className={`max-w-2xl w-full m-4 p-6 rounded-lg border-2 ${getActionColors(activeAction).borderClass} ${getActionColors(activeAction).bgClass} shadow-2xl`}
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-6 border-b border-white/20 pb-3">
              <h2 className={`text-xl font-pixel ${getActionColors(activeAction).textClass}`}>
                {activeAction === 'reframe' && 'Reframing the Conversation'}
                {activeAction === 'extrapolate' && 'Extrapolating Connections'}
                {activeAction === 'boast' && 'Expert Challenge Activated'}
                {activeAction === 'synthesis' && 'Knowledge Synthesis'}
              </h2>
              
              <div className="flex items-center space-x-2">
                {activeAction === 'reframe' && (
                  <span className="text-blue-300 font-pixel text-sm">-25 Insight</span>
                )}
                {activeAction === 'extrapolate' && (
                  <span className="text-purple-300 font-pixel text-sm">-50 Insight</span>
                )}
                {activeAction === 'boast' && (
                  <span className="text-orange-300 font-pixel text-sm">Max Momentum</span>
                )}
                {activeAction === 'synthesis' && (
                  <span className="text-green-300 font-pixel text-sm">-75 Insight</span>
                )}
              </div>
            </div>
            
            {/* Description */}
            <p className="text-white/80 mb-6 font-pixel text-sm">
              {activeAction === 'reframe' && 
                'Choose an alternative direction for the conversation that leverages your strengths.'}
              {activeAction === 'extrapolate' && 
                'Connect two concepts in your knowledge network to gain deeper understanding.'}
              {activeAction === 'boast' && 
                'You've activated the expert mode challenge. The next question will be more difficult but offer greater rewards.'}
              {activeAction === 'synthesis' && 
                'Select a new knowledge domain to explore based on your current understanding.'}
            </p>
            
            {/* Options (except for Boast which doesn't have options) */}
            {activeAction !== 'boast' && state.actionOptions.length > 0 ? (
              <div className="grid gap-4">
                {state.actionOptions.map((option, index) => (
                  <motion.button
                    key={`option-${index}`}
                    className={`p-4 rounded border ${getActionColors(activeAction).borderClass} bg-black/30 text-left text-white hover:bg-black/50 transition-colors`}
                    onClick={() => handleOptionSelect(option)}
                    whileHover={{ scale: 1.02, x: 5 }}
                    whileTap={{ scale: 0.98 }}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ 
                      opacity: 1, 
                      x: 0,
                      transition: { delay: 0.1 + index * 0.1 }
                    }}
                  >
                    <span className="font-pixel">{option}</span>
                  </motion.button>
                ))}
              </div>
            ) : null}
            
            {/* Boast mode special instructions */}
            {activeAction === 'boast' && (
              <div className="bg-orange-950/50 border border-orange-700/50 p-4 rounded mb-6">
                <p className="text-orange-300 font-pixel text-sm">
                  You're now in expert mode. The next question will test deeper knowledge, but answering correctly will yield double the normal insight. Be prepared for a more challenging question!
                </p>
              </div>
            )}
            
            {/* Action buttons */}
            <div className="flex justify-end mt-6 space-x-4">
              {/* Cancel button for all except Boast */}
              {activeAction !== 'boast' && (
                <motion.button
                  className="px-4 py-2 bg-gray-800 text-gray-300 rounded font-pixel text-sm hover:bg-gray-700"
                  onClick={handleCancel}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Cancel
                </motion.button>
              )}
              
              {/* Continue button for Boast */}
              {activeAction === 'boast' && (
                <motion.button
                  className="px-4 py-2 bg-orange-800 text-white rounded font-pixel text-sm hover:bg-orange-700"
                  onClick={() => {
                    completeAction('boast', true);
                    if (onActionComplete) {
                      onActionComplete('boast', true);
                    }
                    dispatch({ type: 'COMPLETE' });
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Continue
                </motion.button>
              )}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </>
  );
}

// Container-based version that uses static positioning
export function StrategicActionsContainer(props: StrategicActionsProps) {
  return (
    <div className="relative">
      <StrategicActions {...props} />
    </div>
  );
}