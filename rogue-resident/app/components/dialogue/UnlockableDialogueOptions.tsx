// app/components/dialogue/UnlockableDialogueOption.tsx
'use client';
import { useState, useEffect } from 'react';
import { KnowledgeRequirement, meetsRequirement, getMissingKnowledgeInfo } from '../../utils/knowledgeRequirements';
import { KNOWLEDGE_DOMAINS } from '../knowledge/ConstellationView';
import { PixelText } from '../PixelThemeProvider';
import { useGameEffects } from '../GameEffects';

interface UnlockableDialogueOptionProps {
  text: string;
  onClick: () => void;
  insightGain?: number;
  knowledgeRequirement?: KnowledgeRequirement;
  disabled?: boolean;
  isSelected?: boolean;
}

export default function UnlockableDialogueOption({
  text,
  onClick,
  insightGain,
  knowledgeRequirement,
  disabled = false,
  isSelected = false
}: UnlockableDialogueOptionProps) {
  const [isUnlocked, setIsUnlocked] = useState(true);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const { playSound } = useGameEffects();
  
  useEffect(() => {
    // Check if the option should be locked based on knowledge requirement
    if (knowledgeRequirement) {
      const unlocked = meetsRequirement(knowledgeRequirement);
      setIsUnlocked(unlocked);
    } else {
      setIsUnlocked(true);
    }
  }, [knowledgeRequirement]);
  
  const handleClick = () => {
    if (isUnlocked && !disabled) {
      if (playSound) playSound('click');
      onClick();
    } else if (!isUnlocked && playSound) {
      playSound('ui-error');
    }
  };
  
  // Get domain color for knowledge requirement
  const getRequirementColor = (): string => {
    if (!knowledgeRequirement) return 'text-text-secondary';
    
    if (knowledgeRequirement.domain) {
      return KNOWLEDGE_DOMAINS[knowledgeRequirement.domain].textClass;
    }
    
    if (knowledgeRequirement.conceptId) {
      // This would need to look up the concept's domain to get the right color
      // For simplicity, using a default color here
      return 'text-educational-light';
    }
    
    return 'text-text-secondary';
  };
  
  return (
    <div 
      className="relative"
      onMouseEnter={() => !isUnlocked && setTooltipVisible(true)}
      onMouseLeave={() => setTooltipVisible(false)}
    >
      <button
        className={`
          w-full text-left p-3 transition-all duration-200
          ${isSelected ? 'bg-clinical/30 pixel-borders' : 'pixel-borders-thin'}
          ${isUnlocked 
            ? (disabled ? 'bg-surface-dark opacity-50 cursor-not-allowed' : 'bg-surface hover:bg-surface-dark cursor-pointer') 
            : 'bg-surface-dark opacity-70 cursor-not-allowed'}
        `}
        onClick={handleClick}
        disabled={!isUnlocked || disabled}
      >
        <div className="flex justify-between items-center">
          <PixelText>{text}</PixelText>
          
          <div className="flex items-center">
            {/* Knowledge indicator - shows glow for unlocked knowledge options */}
            {knowledgeRequirement && (
              <div 
                className={`
                  w-4 h-4 rounded-full mr-2
                  ${isUnlocked 
                    ? `${getRequirementColor()} animate-pulse` 
                    : 'bg-dark-gray'}
                `}
                style={{
                  boxShadow: isUnlocked 
                    ? '0 0 5px var(--educational-color)' 
                    : 'none'
                }}
              ></div>
            )}
            
            {/* Insight gain indicator */}
            {insightGain && insightGain > 0 && (
              <span className="ml-2 text-xs bg-clinical text-white px-2 py-1">
                +{insightGain}
              </span>
            )}
            
            {/* Lock indicator */}
            {!isUnlocked && (
              <span className="ml-2 text-text-secondary">🔒</span>
            )}
          </div>
        </div>
      </button>
      
      {/* Tooltip for locked options */}
      {tooltipVisible && !isUnlocked && knowledgeRequirement && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-surface-dark p-2 pixel-borders-thin">
          <PixelText className={`text-sm ${getRequirementColor()}`}>
            {getMissingKnowledgeInfo(knowledgeRequirement)}
          </PixelText>
        </div>
      )}
    </div>
  );
}