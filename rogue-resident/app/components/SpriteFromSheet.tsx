// components/SpriteFromSheet.tsx
'use client';
import React from 'react';

interface SpritePosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SpriteFromSheetProps {
  sheet: string; // The path to the spritesheet
  position: SpritePosition;
  scale?: number; // Integer scaling
  className?: string;
  onClick?: () => void;
}

export function SpriteFromSheet({
  sheet,
  position,
  scale = 1,
  className = "",
  onClick,
}: SpriteFromSheetProps) {
  const { x, y, width, height } = position;
  
  return (
    <div 
      className={`inline-block pixel-art-sprite ${className}`}
      style={{
        width: width * scale,
        height: height * scale,
        backgroundImage: `url(${sheet})`,
        // The key fix is here - we position the background at the negative of our sprite coordinates
        backgroundPosition: `-${x}px -${y}px`,
        // This is crucial - we're not scaling the background to fit our div
        // Instead, we keep it at original size and just shift it to the right position
        backgroundSize: 'auto',
        imageRendering: 'pixelated',
      }}
      onClick={onClick}
    />
  );
}