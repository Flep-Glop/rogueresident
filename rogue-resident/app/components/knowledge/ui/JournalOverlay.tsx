// app/components/knowledge/ui/JournalOverlay.tsx
import React from 'react';
import { PixelText, PixelButton } from '../../PixelThemeProvider';
import { ConceptNode, KnowledgeDomain, KNOWLEDGE_DOMAINS } from '../../../store/knowledgeStore';
import { DOMAIN_COLORS } from '../../../core/themeConstants';

interface JournalOverlayProps {
  journalVisible: boolean;
  setJournalVisible: React.Dispatch<React.SetStateAction<boolean>>;
  discoveredNodes: ConceptNode[]; // Needed to find node details
  recentInsights: Array<{ conceptId: string, amount: number }>;
}

/**
 * Displays the Research Journal overlay.
 */
export const JournalOverlay: React.FC<JournalOverlayProps> = ({
  journalVisible,
  setJournalVisible,
  discoveredNodes,
  recentInsights,
}) => {
  if (!journalVisible) return null;

  return (
    <div className="absolute inset-0 bg-black/90 z-20 flex items-center justify-center p-4">
      <div className="bg-surface p-6 max-w-md w-full pixel-borders">
        {/* Overlay Header */}
        <div className="flex justify-between items-center mb-4">
          <PixelText className="text-2xl text-white">Research Journal</PixelText>
          <PixelButton
            className="bg-red-600 hover:bg-red-500 text-white"
            onClick={() => setJournalVisible(false)}
            size="sm"
          >
            Close
          </PixelButton>
        </div>

        {/* Recent Insights Section */}
        <div className="mb-4">
          <PixelText className="mb-2 text-text-primary">Recent Insights</PixelText>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
            {recentInsights.length > 0 ? recentInsights.map((insight, index) => {
              // Find the corresponding node details
              const node = discoveredNodes.find(n => n.id === insight.conceptId);
              if (!node) return null; // Skip if node not found (shouldn't happen ideally)

              const domainInfo = KNOWLEDGE_DOMAINS[node.domain];
              const domainColor = DOMAIN_COLORS[node.domain];

              return (
                <div
                  key={`insight-${index}-${insight.conceptId}`}
                  className="p-3 pixel-borders-thin bg-surface-dark"
                >
                  <div className="flex justify-between items-start">
                    {/* Node Name and Domain Indicator */}
                    <div className="flex items-center mr-2">
                      <div
                        className="w-3 h-3 mr-2 flex-shrink-0"
                        style={{ backgroundColor: domainColor }}
                      ></div>
                      <PixelText className="text-white truncate">{node.name}</PixelText>
                    </div>
                    {/* Insight Amount */}
                    <div className="bg-surface px-2 py-0.5 text-sm flex-shrink-0">
                      <PixelText className="text-green-400">+{insight.amount}%</PixelText>
                    </div>
                  </div>
                  {/* Domain Name */}
                  <PixelText className="text-sm text-text-secondary mt-1">
                    {domainInfo?.name || 'Unknown Domain'}
                  </PixelText>
                </div>
              );
            }) : (
              <PixelText className="text-text-secondary italic text-sm">No recent insights recorded.</PixelText>
            )}
          </div>
        </div>

        {/* Explanatory Text */}
        <div className="p-3 bg-surface-dark pixel-borders-thin">
          <PixelText className="text-text-secondary text-sm italic">
            As you learn and apply knowledge through challenges, your insights will be recorded here, then transferred to your constellation during the night phase.
          </PixelText>
        </div>
      </div>
    </div>
  );
};

export default JournalOverlay;
