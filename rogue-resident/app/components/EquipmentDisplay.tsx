// components/EquipmentDisplay.tsx
'use client';
import React from 'react';
import { GameSprite } from './GameSprite';
import { getSpriteData } from '../data/spriteMapping';
import { PixelText } from './PixelThemeProvider';

interface EquipmentDisplayProps {
  itemId: string;
  description?: string;
}

export function EquipmentDisplay({ itemId, description }: EquipmentDisplayProps) {
  const spriteData = getSpriteData(itemId);
  
  return (
    <div className="bg-surface-dark p-3 pixel-borders-thin">
      <div className="flex justify-center mb-2">
        <GameSprite id={itemId} scale={2} />
      </div>
      
      {spriteData?.name && (
        <PixelText className="text-center text-sm mb-1">{spriteData.name}</PixelText>
      )}
      
      {description && (
        <p className="text-text-secondary text-xs text-center">
          {description}
        </p>
      )}
    </div>
  );
}