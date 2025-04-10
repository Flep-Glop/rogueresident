// app/components/FontPreloader.tsx
/**
 * Font Preloader Component
 * 
 * This component handles preloading the game's pixel fonts with proper crossOrigin attributes
 * to prevent the "credentials mode does not match" warnings.
 */
import React from 'react';

const FontPreloader: React.FC = () => {
  return (
    <>
      {/* Font Preloading - Fixed with proper crossOrigin attributes */}
      <link 
        rel="preload" 
        href="https://fonts.googleapis.com/css2?family=VT323&display=swap" 
        as="style"
        crossOrigin="anonymous"
      />
      <link 
        rel="preload" 
        href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" 
        as="style"
        crossOrigin="anonymous"
      />
      
      {/* Preload the actual font files */}
      <link 
        rel="preload" 
        href="https://fonts.gstatic.com/s/vt323/v17/pxiKyp0ihIEF2isfFJU.woff2" 
        as="font"
        type="font/woff2"
        crossOrigin="anonymous"
      />
      <link 
        rel="preload" 
        href="https://fonts.gstatic.com/s/pressstart2p/v15/e3t4euO8T-267oIAQAu6jDQyK3nVivM.woff2" 
        as="font"
        type="font/woff2"
        crossOrigin="anonymous"
      />
      
      {/* Add stylesheet links */}
      <link 
        rel="stylesheet" 
        href="https://fonts.googleapis.com/css2?family=VT323&display=swap"
        crossOrigin="anonymous"
      />
      <link 
        rel="stylesheet" 
        href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap"
        crossOrigin="anonymous"
      />
    </>
  );
};

export default FontPreloader;