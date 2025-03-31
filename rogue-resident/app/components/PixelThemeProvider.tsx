'use client';
import React, { ReactNode, useState, useEffect } from 'react';

type PixelThemeProviderProps = {
  children: ReactNode;
  enableScanlines?: boolean;
  enableCrtFlicker?: boolean;
};

export default function PixelThemeProvider({
  children,
  enableScanlines = true,
  enableCrtFlicker = true,
}: PixelThemeProviderProps) {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  // Load pixel fonts
  useEffect(() => {
    // Create link elements for the pixel fonts
    const vtLink = document.createElement('link');
    vtLink.href = 'https://fonts.googleapis.com/css2?family=VT323&display=swap';
    vtLink.rel = 'stylesheet';

    const pressStartLink = document.createElement('link');
    pressStartLink.href = 'https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap';
    pressStartLink.rel = 'stylesheet';

    // Append links to head
    document.head.appendChild(vtLink);
    document.head.appendChild(pressStartLink);

    // Simple timeout to let fonts load
    const timer = setTimeout(() => {
      setFontsLoaded(true);
    }, 500);

    return () => {
      clearTimeout(timer);
      document.head.removeChild(vtLink);
      document.head.removeChild(pressStartLink);
    };
  }, []);

  return (
    <div
      className={`
        min-h-screen bg-background text-text-primary
        ${enableScanlines ? 'scanlines' : ''}
        ${enableCrtFlicker ? 'crt-flicker' : ''}
        ${fontsLoaded ? 'fonts-loaded' : 'opacity-95'}
        transition-opacity duration-300
      `}
    >
      {children}
    </div>
  );
}

// Utility function to create pixel-bordered elements
export const PixelBorder = ({
  children,
  className = '',
  thin = false,
}: {
  children: ReactNode;
  className?: string;
  thin?: boolean;
}) => {
  return (
    <div
      className={`${thin ? 'pixel-borders-thin' : 'pixel-borders'} ${className}`}
    >
      {children}
    </div>
  );
};

// Utility function for pixel button
export const PixelButton = ({
  children,
  onClick,
  className = '',
  disabled = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        pixel-button
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
    >
      {children}
    </button>
  );
};

// Utility function for pixel text
export const PixelText = ({
  children,
  className = '',
  heading = false,
}: {
  children: ReactNode;
  className?: string;
  heading?: boolean;
}) => {
  return (
    <div
      className={`
        ${heading ? 'pixel-heading' : 'pixel-text'}
        ${className}
      `}
    >
      {children}
    </div>
  );
};