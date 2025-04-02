// components/GameSprite.tsx
'use client';
import React from 'react';
import { SpriteFromSheet } from './SpriteFromSheet';
import { getSpriteData, getSpriteSheetSrc } from '../data/spriteMapping';

interface GameSpriteProps {
  id: string; // The sprite identifier (like 'linac' or 'farmer-chamber')
  scale?: number;
  className?: string;
  onClick?: () => void;
}

export function GameSprite({ id, scale = 1, className = "", onClick }: GameSpriteProps) {
  const spriteData = getSpriteData(id);
  
  if (!spriteData) {
    // Fallback for missing sprites - important for debugging
    return <div className={`bg-danger w-8 h-8 ${className}`}>?</div>;
  }
  
  return (
    <SpriteFromSheet
      sheet={getSpriteSheetSrc(spriteData.source)}
      position={spriteData.position}
      scale={scale}
      className={className}
      onClick={onClick}
    />
  );
}