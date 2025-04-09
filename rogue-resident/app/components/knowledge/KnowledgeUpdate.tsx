// app/components/knowledge/KnowledgeUpdate.tsx
'use client';
import { useState, useEffect } from 'react';
import { PixelText } from '../PixelThemeProvider'; // *** ADDED IMPORT ***

// *** REMOVED LOCAL PIXELTEXT DEFINITION *** [source: 347, 1573]

interface KnowledgeUpdateProps { // [source: 348, 1577]
  conceptName: string;
  domainName: string;
  domainColor: string;
  gainAmount: number;
  onComplete?: () => void; // [source: 348, 1577]
}

/**
 * Knowledge Update - Notification component for knowledge gains
 * Simplified version without sound effects
 */
export default function KnowledgeUpdate({
  conceptName,
  domainName,
  domainColor,
  gainAmount,
  onComplete
}: KnowledgeUpdateProps) {
  const [visible, setVisible] = useState(true);
  const [animationStage, setAnimationStage] = useState<'enter' | 'active' | 'exit'>('enter'); // [source: 350, 1579]

  // Animation sequence
  useEffect(() => {
    // Animation sequence
    const enterTimer = setTimeout(() => {
      setAnimationStage('active');
    }, 500);

    const activeTimer = setTimeout(() => {
      setAnimationStage('exit');
    }, 2500);

    const exitTimer = setTimeout(() => {
      setVisible(false);
      if (onComplete) onComplete();
    }, 3000);

    return () => { // [source: 351, 1580]
      clearTimeout(enterTimer);
      clearTimeout(activeTimer);
      clearTimeout(exitTimer);
    };
  }, [gainAmount, onComplete]); // [source: 351, 1580]

  if (!visible) return null; // [source: 352, 1581]

  // Style based on gain amount
  const getGainStyle = () => {
    if (gainAmount >= 20) {
      return 'text-2xl font-bold'; // [source: 352, 1581]
    } else if (gainAmount >= 10) { // [source: 353, 1582]
      return 'text-xl'; // [source: 353, 1582]
    } else {
      return 'text-lg'; // [source: 354, 1583]
    }
  };

  // Get animation classes based on stage
  const getAnimationClass = () => { // [source: 355, 1584]
    switch (animationStage) {
      case 'enter':
        return 'opacity-0 scale-95 translate-y-4'; // [source: 355, 1584]
      case 'active': // [source: 356, 1585]
        return 'opacity-100 scale-100 translate-y-0'; // [source: 356, 1585]
      case 'exit': // [source: 357, 1586]
        return 'opacity-0 scale-105 -translate-y-4'; // [source: 357, 1586]
    }
  };

  return ( // [source: 358, 1587]
    <div
      className={`
        fixed top-1/4 left-1/2 transform -translate-x-1/2
        z-50 pointer-events-none
        transition-all duration-500 ease-in-out
        ${getAnimationClass()}
      `}
    >
      <div
        className="bg-surface/90 backdrop-blur-sm pixel-borders p-4 min-w-[300px] max-w-[400px]"
        style={{ borderColor: domainColor }}
      >
        <div className="text-center mb-2"> {/* [source: 359, 1588] */}
          <PixelText className="text-educational-light">Knowledge Updated</PixelText>
        </div>

        <div className="flex items-center justify-between mb-3">
          <div>
            <PixelText className="text-md font-medium">{conceptName}</PixelText>
            <PixelText className="text-sm text-text-secondary">{domainName}</PixelText>
          </div>

          <div // [source: 360, 1589]
            className={`${getGainStyle()} font-pixel`}
            style={{ color: domainColor }}
          >
            +{gainAmount}%
          </div>
        </div>

        {/* Progress visualization */} {/* [source: 361, 1590] */}
        <div className="w-full h-2 bg-surface-dark">
          <div
            className="h-full"
            style={{
              width: `${gainAmount}%`,
              backgroundColor: domainColor,
              transition: 'width 1s ease-in-out' // [source: 361, 1590]
            }} // [source: 362, 1591]
          ></div>
        </div>

        {/* Insight bonus for significant gains */}
        {gainAmount >= 15 && (
          <div className="mt-2 text-center">
            <PixelText className="text-sm text-clinical-light">+{Math.floor(gainAmount / 5)} Insight Bonus</PixelText>
          </div> // [source: 363, 1592]
        )}

        {/* Special indicator for major knowledge updates */}
        {gainAmount >= 25 && (
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-educational rounded-full flex items-center justify-center text-white text-xs">
            ⭐
          </div>
        )}
      </div> {/* [source: 364, 1593] */}
    </div>
  );
}