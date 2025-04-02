// app/components/ItemSprite.tsx
'use client';
import React from 'react';
import { SpriteFromSheet } from './SpriteFromSheet';
import { getSpriteData, getSpriteSheetSrc, SpriteData } from '../data/spriteMapping';

interface ItemSpriteProps {
  itemId: string;
  scale?: number;
  className?: string;
  onClick?: () => void;
  fallbackSize?: { width: number; height: number };
}

/**
 * A specialized component for rendering item sprites from sprite sheets
 * using the central sprite mapping system.
 */
export function ItemSprite({
  itemId,
  scale = 2, // Default to scale 2 for better visibility of 16px sprites
  className = "",
  onClick,
  fallbackSize = { width: 32, height: 32 },
}: ItemSpriteProps) {
  // Look up sprite data from our mapping system
  const spriteData = getSpriteData(itemId);
  
  if (!spriteData) {
    console.warn(`No sprite data found for item: ${itemId}`);
    return (
      <div 
        className={`inline-block bg-surface-dark ${className}`}
        style={{
          width: fallbackSize.width,
          height: fallbackSize.height,
        }}
      />
    );
  }
  
  // Get the full path to the sprite sheet
  const sheetSrc = getSpriteSheetSrc(spriteData.source);
  
  return (
    <SpriteFromSheet
      sheet={sheetSrc}
      position={spriteData.position}
      scale={scale}
      className={className}
      onClick={onClick}
    />
  );
}

/**
 * A component specifically for equipment displays in dialogue scenes
 */
export function EquipmentDisplay({ itemId, description }: { itemId: string, description?: string }) {
    const spriteData = getSpriteData(itemId);

    return (
    <div className="bg-surface-dark p-3 pixel-borders-thin">
        <div className="flex justify-center mb-2">
        {/* Updated sprite implementation */}
        {spriteData && (
            <SpriteFromSheet
            sheet={getSpriteSheetSrc(spriteData.source)}
            position={spriteData.position}
            scale={2}
            className="pixel-art-sprite"
            />
        )}
        {!spriteData && (
            <div className="w-32 h-32 bg-danger flex items-center justify-center">?</div>
        )}
        </div>
        
        {spriteData?.name && (
        <div className="text-center text-sm mb-1 font-pixel">{spriteData.name}</div>
        )}
        
        {description && (
        <p className="text-text-secondary text-xs text-center">
            {description}
        </p>
        )}
    </div>
    );
    }