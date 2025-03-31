'use client';
import React, { ReactNode } from 'react';
import { PixelBorder, PixelText } from './PixelThemeProvider';

// Pixel Card component for consistent styling
export function PixelCard({
  children,
  className = '',
  title,
  noBorder = false,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  noBorder?: boolean;
}) {
  const content = (
    <div className={`bg-surface ${className}`}>
      {title && (
        <div className="bg-surface-dark px-3 py-2 border-b border-border">
          <PixelText className="font-pixel text-lg">{title}</PixelText>
        </div>
      )}
      <div className="p-3">{children}</div>
    </div>
  );

  if (noBorder) return content;

  return <PixelBorder>{content}</PixelBorder>;
}

// Pixel Node component for map nodes
export function PixelNode({
  type,
  isCompleted,
  isAvailable,
  isSelected,
  onClick,
  size = 'md',
  icon,
}: {
  type: 'clinical' | 'qa' | 'educational' | 'storage' | 'vendor' | 'boss';
  isCompleted?: boolean;
  isAvailable?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
}) {
  // Get node style info based on type
  const getNodeColors = () => {
    if (isCompleted) {
      return {
        bg: 'bg-success',
        bgDark: 'bg-success-dark',
        ring: 'ring-success-light',
      };
    }

    const colors: Record<string, { bg: string; bgDark: string; ring: string }> = {
      clinical: {
        bg: 'bg-clinical',
        bgDark: 'bg-clinical-dark',
        ring: 'ring-clinical-light',
      },
      qa: {
        bg: 'bg-qa',
        bgDark: 'bg-qa-dark',
        ring: 'ring-qa-light',
      },
      educational: {
        bg: 'bg-educational',
        bgDark: 'bg-educational-dark',
        ring: 'ring-educational-light',
      },
      storage: {
        bg: 'bg-storage',
        bgDark: 'bg-storage-dark',
        ring: 'ring-storage-light',
      },
      vendor: {
        bg: 'bg-vendor',
        bgDark: 'bg-vendor-dark',
        ring: 'ring-vendor-light',
      },
      boss: {
        bg: 'bg-boss',
        bgDark: 'bg-boss-dark',
        ring: 'ring-boss-light',
      },
    };

    return colors[type];
  };

  const nodeColors = getNodeColors();
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
  };

  // Node icons if not provided
  const defaultIcons: Record<string, string> = {
    clinical: '🏥',
    qa: '🔍',
    educational: '📚',
    storage: '📦',
    vendor: '🛒',
    boss: '⚠️',
  };

  const nodeIcon = icon || defaultIcons[type];

  return (
    <div
      className={`
        ${sizeClasses[size]} 
        ${nodeColors.bg} 
        relative 
        ${isAvailable ? 'cursor-pointer' : 'cursor-default opacity-60'}
        ${isSelected ? 'ring-2 ring-white' : ''}
        shadow-pixel
        transition-all duration-200
        ${isAvailable && !isSelected ? 'hover:shadow-pixel-md' : ''}
      `}
      onClick={isAvailable ? onClick : undefined}
    >
      {/* Inner node with shadow for 3D effect */}
      <div className={`absolute inset-1 ${nodeColors.bgDark}`}></div>
      
      {/* Content */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="text-2xl">{nodeIcon}</div>
          {size === 'lg' && (
            <PixelText className="text-white text-xs mt-1">
              {isCompleted ? 'DONE' : type.toUpperCase()}
            </PixelText>
          )}
        </div>
      </div>
      
      {/* Pixel overlay for retro effect */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="w-full h-full opacity-10" 
          style={{ 
            backgroundImage: 'linear-gradient(45deg, #000 25%, transparent 25%), linear-gradient(-45deg, #000 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #000 75%), linear-gradient(-45deg, transparent 75%, #000 75%)',
            backgroundSize: '4px 4px',
            backgroundPosition: '0 0, 0 2px, 2px -2px, -2px 0px'
          }}>
        </div>
      </div>
      
      {/* Completion indicator */}
      {isCompleted && (
        <div className="absolute -top-1 -right-1 bg-success w-5 h-5 flex items-center justify-center shadow-pixel">
          ✓
        </div>
      )}
    </div>
  );
}

// Pixel Item Card
export function PixelItemCard({
  name,
  description,
  rarity,
  effects,
  isSelected,
  onClick,
}: {
  name: string;
  description: string;
  rarity: 'common' | 'uncommon' | 'rare';
  effects: Array<{ type: string; value: number }>;
  isSelected?: boolean;
  onClick?: () => void;
}) {
  const rarityColors: Record<string, string> = {
    common: 'from-gray-700 to-gray-600',
    uncommon: 'from-blue-700 to-blue-600',
    rare: 'from-purple-700 to-purple-600',
  };
  
  const rarityBorders: Record<string, string> = {
    common: 'border-gray-500',
    uncommon: 'border-blue-500',
    rare: 'border-purple-500',
  };

  return (
    <div
      className={`
        bg-surface border-2 ${rarityBorders[rarity]}
        p-3 cursor-pointer transition-all duration-200
        ${isSelected ? 'shadow-pixel-md' : 'shadow-pixel hover:shadow-pixel-md'}
      `}
      onClick={onClick}
    >
      {/* Item header */}
      <div className={`
        -m-3 mb-2 p-2 px-3
        bg-gradient-to-r ${rarityColors[rarity]}
        flex justify-between items-center border-b-2 ${rarityBorders[rarity]}
      `}>
        <PixelText className="font-pixel text-white">{name}</PixelText>
        <span className="text-xs font-pixel text-white opacity-80 px-2 py-0.5 bg-black/30 rounded">
          {rarity.charAt(0).toUpperCase() + rarity.slice(1)}
        </span>
      </div>
      
      {/* Item description */}
      <p className="mb-3 text-sm text-text-secondary">{description}</p>
      
      {/* Item effects */}
      <div className="border-t border-border pt-2">
        <PixelText className="text-xs mb-1">Effects:</PixelText>
        <div className="grid grid-cols-2 gap-1">
          {effects.map((effect, index) => (
            <div
              key={index}
              className="flex items-center bg-surface-dark p-1 text-xs"
            >
              <span className="capitalize mr-1">{effect.type}:</span>
              <span className="text-success">+{effect.value}%</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Selector indicator */}
      {isSelected && (
        <div className="absolute top-1 right-1 w-3 h-3 bg-success"></div>
      )}
    </div>
  );
}

// Pixel Dialog
export function PixelDialog({
  isOpen,
  onClose,
  title,
  children,
  width = 'max-w-md',
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: string;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-black/70">
      <div className={`${width} w-full`}>
        <PixelBorder className="bg-surface">
          <div className="bg-surface-dark px-4 py-2 border-b border-border flex justify-between items-center">
            <PixelText className="font-pixel">{title}</PixelText>
            <button
              onClick={onClose}
              className="text-text-secondary hover:text-text-primary"
            >
              X
            </button>
          </div>
          <div className="p-4">{children}</div>
        </PixelBorder>
      </div>
    </div>
  );
}

// Pixel Tooltip
export function PixelTooltip({
  children,
  content,
  position = 'top',
  isVisible = true,
}: {
  children: ReactNode;
  content: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  isVisible?: boolean;
}) {
  return (
    <div className="relative group">
      {children}
      {isVisible && (
        <div
          className={`
            absolute z-50 w-max max-w-xs
            bg-dark-gray border border-border
            p-2 shadow-pixel
            ${position === 'top' ? 'bottom-full left-1/2 transform -translate-x-1/2 mb-2' : ''}
            ${position === 'bottom' ? 'top-full left-1/2 transform -translate-x-1/2 mt-2' : ''}
            ${position === 'left' ? 'right-full top-1/2 transform -translate-y-1/2 mr-2' : ''}
            ${position === 'right' ? 'left-full top-1/2 transform -translate-y-1/2 ml-2' : ''}
            transition-opacity duration-200
            opacity-0 group-hover:opacity-100 invisible group-hover:visible
            pointer-events-none
            text-text-primary text-xs
          `}
        >
          {content}
        </div>
      )}
    </div>
  );
}