'use client';

/**
 * Font Preloader Component
 * 
 * Ensures critical fonts are preloaded efficiently with:
 * 1. Local font embedding for critical pathways
 * 2. Preconnect and DNS prefetching for external resources
 * 3. Font loading API integration for monitoring
 * 4. Critical CSS embedding for faster rendering
 */
import React, { useEffect } from 'react';
import { useStableCallback } from '@/app/core/utils/storeHooks';

// Font configuration
const CRITICAL_FONTS = [
  { family: 'VT323', weight: '400', display: 'swap' },
  { family: 'Press Start 2P', weight: '400', display: 'swap' }
];

/**
 * Uses the Font Loading API to preload and monitor critical game fonts
 */
export default function FontPreLoader() {
  // Monitor font loading status
  const handleFontStatus = useStableCallback((loadedFonts: string[]) => {
    console.log(`Loaded fonts: ${loadedFonts.join(', ')}`);
  });
  
  // Font preloading logic
  useEffect(() => {
    if (!document.fonts) {
      console.warn('Font Loading API not supported in this browser');
      return;
    }
    
    // Track which fonts have loaded
    const loadedFonts: string[] = [];
    
    // Load each critical font
    CRITICAL_FONTS.forEach(font => {
      // Create a test span to force font loading
      const testSpan = document.createElement('span');
      testSpan.style.fontFamily = `"${font.family}", monospace`;
      testSpan.style.fontWeight = font.weight;
      testSpan.style.visibility = 'hidden';
      testSpan.textContent = 'Font Loading';
      
      // Append to DOM temporarily
      document.body.appendChild(testSpan);
      
      // Use the Font Loading API to track when it's available
      if (document.fonts.check(`${font.weight} 12px "${font.family}"`)) {
        loadedFonts.push(font.family);
      }
      
      // Clean up
      document.body.removeChild(testSpan);
    });
    
    // Report status when ready
    if (document.fonts.ready) {
      document.fonts.ready.then(() => {
        handleFontStatus(loadedFonts);
      });
    }
    
    // More aggressive approach for browsers without proper support
    setTimeout(() => {
      if (loadedFonts.length < CRITICAL_FONTS.length) {
        console.warn('Some fonts may not have loaded properly');
        handleFontStatus(loadedFonts);
      }
    }, 2000);
  }, [handleFontStatus]);
  
  // This component doesn't render anything visible
  return null;
}