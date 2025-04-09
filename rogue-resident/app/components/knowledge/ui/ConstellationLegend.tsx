// app/components/knowledge/ui/ConstellationLegend.tsx
import React from 'react';
import { PixelText } from '../../PixelThemeProvider';
import { KnowledgeDomain, KNOWLEDGE_DOMAINS } from '../../../store/knowledgeStore';
import { DOMAIN_COLORS } from '../../../core/themeConstants';

interface ConstellationLegendProps {
  domainMastery: Record<KnowledgeDomain, number>;
}

/**
 * Displays the legend for knowledge domains and their mastery.
 */
export const ConstellationLegend: React.FC<ConstellationLegendProps> = ({ domainMastery }) => {
  return (
    <div className="absolute bottom-4 left-4 bg-surface-dark/80 p-3 pixel-borders-thin z-10">
      <PixelText className="text-text-primary mb-2">Knowledge Domains</PixelText>
      <div className="space-y-1 text-sm">
        {/* Map through domain mastery entries */}
        {Object.entries(domainMastery)
          // Filter out domains with 0 mastery
          .filter(([_, mastery]) => mastery > 0)
          .map(([key, mastery]) => {
            const domain = KNOWLEDGE_DOMAINS[key as KnowledgeDomain];
            // Skip if domain info is missing
            if (!domain) return null;

            return (
              <div key={key} className="flex items-center">
                {/* Domain color indicator */}
                <div
                  className="w-3 h-3 mr-2"
                  style={{ backgroundColor: DOMAIN_COLORS[key as KnowledgeDomain] }}
                ></div>
                {/* Domain name and mastery percentage */}
                <PixelText className="text-sm">{domain.name}: {mastery}%</PixelText>
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default ConstellationLegend;
