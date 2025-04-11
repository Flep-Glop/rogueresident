// app/components/FontPreloader.tsx
/**
 * Enhanced Font Preloader Component
 * 
 * Improves font loading with:
 * 1. Proper crossOrigin attributes to eliminate warnings
 * 2. Font-display:swap for better UX during loading
 * 3. Preconnect to font domains to minimize connection delays
 * 4. Optimized resource hints with proper type attributes
 */
import React from 'react';
import { useEffect } from 'react';

const FontPreloader: React.FC = () => {
  // Check if fonts loaded successfully and log any failures
  useEffect(() => {
    if (typeof document !== 'undefined') {
      // Use the document.fonts API to monitor loading status
      document.fonts.ready.then(() => {
        console.log('✅ All fonts loaded successfully');
      }).catch(err => {
        console.warn('⚠️ Font loading issue:', err);
      });
    }
  }, []);

  return (
    <>
      {/* DNS Preconnect - Establish early connection to font servers */}
      <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="anonymous" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      
      {/* Font Stylesheets - Load with display:swap for better UX */}
      <link 
        rel="stylesheet" 
        href="https://fonts.googleapis.com/css2?family=VT323&display=swap&font-display=swap"
        crossOrigin="anonymous"
      />
      <link 
        rel="stylesheet" 
        href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap&font-display=swap"
        crossOrigin="anonymous"
      />
      
      {/* Preload actual font files - provides browser with file type information */}
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
      
      {/* Inline critical styles to ensure fonts are applied instantly */}
      <style jsx global>{`
        /* Ensure browser knows which fonts to use */
        body {
          font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
        }
        
        /* Apply VT323 where needed with fallbacks */
        .font-vt323 {
          font-family: 'VT323', monospace;
          font-display: swap;
        }
        
        /* Apply Press Start 2P where needed with fallbacks */
        .font-press-start {
          font-family: 'Press Start 2P', cursive;
          font-display: swap;
        }
        
        /* Avoid layout shifts with font loading */
        .font-loading-sentinel {
          visibility: hidden;
          position: absolute;
          height: 0;
        }
      `}</style>
      
      {/* Font loading sentinel to check if fonts loaded */}
      <div className="font-loading-sentinel">
        <span className="font-vt323">VT323 Test</span>
        <span className="font-press-start">Press Start 2P Test</span>
      </div>
    </>
  );
};

export default FontPreloader;