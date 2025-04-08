// app/components/gameplay/StrategicActions.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useResourceStore } from '../../store/resourceStore';

// Type definitions
type StrategicActionType = 'reframe' | 'extrapolate' | 'boast' | 'synthesis';

interface StrategicActionsProps {
  characterId: string;
  stageId: string;
  className?: string;
  onActionActivate?: (actionType: StrategicActionType) => void;
  onActionComplete?: (actionType: StrategicActionType, successful: boolean) => void;
  onActionCancel?: (actionType: StrategicActionType) => void;
}

// Simple component to start with
export default function StrategicActions({
  characterId,
  stageId,
  className = '',
  onActionActivate,
  onActionComplete,
  onActionCancel
}: StrategicActionsProps) {
  // Just use simple state to start
  const [mode, setMode] = useState('whisper');
  const [expandedAction, setExpandedAction] = useState<StrategicActionType | null>(null);
  
  // Get available actions from store
  const { availableActions, activeAction } = useResourceStore();
  
  // Update state based on active action
  useEffect(() => {
    if (activeAction) {
      setMode('shout');
      setExpandedAction(activeAction);
    } else {
      setMode('whisper');
      setExpandedAction(null);
    }
  }, [activeAction]);
  
  // Only render the whisper state initially to ensure parsing works
  return (
    <div className={`flex space-x-2 items-center ${className}`}>
      {availableActions.reframe && (
        <button
          className="w-8 h-8 rounded flex items-center justify-center bg-blue-900"
          onClick={() => onActionActivate && onActionActivate('reframe')}
        >
          <span className="text-sm font-bold">R</span>
        </button>
      )}
      
      {availableActions.extrapolate && (
        <button
          className="w-8 h-8 rounded flex items-center justify-center bg-purple-900"
          onClick={() => onActionActivate && onActionActivate('extrapolate')}
        >
          <span className="text-sm font-bold">E</span>
        </button>
      )}
      
      {availableActions.boast && (
        <button
          className="w-8 h-8 rounded flex items-center justify-center bg-orange-900"
          onClick={() => onActionActivate && onActionActivate('boast')}
        >
          <span className="text-sm font-bold">B</span>
        </button>
      )}
      
      {availableActions.synthesis && (
        <button
          className="w-8 h-8 rounded flex items-center justify-center bg-green-900"
          onClick={() => onActionActivate && onActionActivate('synthesis')}
        >
          <span className="text-sm font-bold">S</span>
        </button>
      )}
    </div>
  );
}

// Container version
export function StrategicActionsContainer(props: StrategicActionsProps) {
  return (
    <div className="relative">
      <StrategicActions {...props} />
    </div>
  );
}