// components/PixelSprite.tsx
'use client';
import React from 'react';

interface PixelSpriteProps {
  src: string;
  alt?: string;
  width?: number;
  height?: number;
  className?: string;
  onClick?: () => void;
  scale?: number; // Integer scaling factor
}

export function PixelSprite({
  src,
  alt = "",
  width,
  height,
  className = "",
  onClick,
  scale = 1,
}: PixelSpriteProps) {
  // Force integer scaling
  const effectiveWidth = width ? width * scale : undefined;
  const effectiveHeight = height ? height * scale : undefined;
  
  return (
    <img
      src={src}
      alt={alt}
      width={effectiveWidth}
      height={effectiveHeight}
      className={`pixel-art-sprite ${className}`}
      onClick={onClick}
      style={{
        imageRendering: 'pixelated', // Inline fallback
      }}
    />
  );
}