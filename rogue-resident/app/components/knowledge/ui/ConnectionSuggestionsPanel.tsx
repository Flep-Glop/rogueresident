// app/components/knowledge/ui/ConnectionSuggestionsPanel.tsx
import React from 'react';
import { PixelText } from '../../PixelThemeProvider';
import { ConceptNode, ConceptConnection, KnowledgeDomain, useKnowledgeStore } from '../../../store/knowledgeStore';
import { DOMAIN_COLORS } from '../../../core/themeConstants';

interface ConnectionSuggestionsPanelProps {
  selectedNode: ConceptNode | null;
  discoveredNodes: ConceptNode[];
  discoveredConnections: ConceptConnection[];
  setPendingConnection: React.Dispatch<React.SetStateAction<string | null>>;
}

/**
 * Displays suggested connections for the selected node.
 */
export const ConnectionSuggestionsPanel: React.FC<ConnectionSuggestionsPanelProps> = ({
  selectedNode,
  discoveredNodes,
  discoveredConnections,
  setPendingConnection,
}) => {
  if (!selectedNode) return null;

  // Zustand actions
  const createConnection = useKnowledgeStore(state => state.createConnection);
  const updateMastery = useKnowledgeStore(state => state.updateMastery);

  // Find possible connections
  const possibleConnections = discoveredNodes.filter(node =>
    // Must be a different node than selected
    node.id !== selectedNode.id &&
    // Must not already be connected
    !discoveredConnections.some(conn =>
      (conn.source === selectedNode.id && conn.target === node.id) ||
      (conn.target === selectedNode.id && conn.source === node.id)
    )
  );

  // If no suggestions, don't render anything
  if (possibleConnections.length === 0) return null;

  // Take up to 3 suggestions
  const suggestions = possibleConnections.slice(0, 3);

  const handleSuggestionClick = (targetNode: ConceptNode) => {
    if (!selectedNode) return;

    // Start the connection process visually
    setPendingConnection(selectedNode.id);

    // Use setTimeout to allow UI update before creating connection
    setTimeout(() => {
      try {
        // Create the connection in the store
        createConnection(selectedNode.id, targetNode.id);

        // Boost mastery slightly for both nodes
        updateMastery(selectedNode.id, 3);
        updateMastery(targetNode.id, 3);

        console.log('Would play connection success sound');

        // Reset pending connection state after successful creation
        setPendingConnection(null);
      } catch (error) {
        console.error("Error creating connection from suggestion:", error);
        setPendingConnection(null); // Reset even on error
      }
    }, 50); // Short delay
  };

  return (
    <div className="absolute top-4 right-4 w-64 z-10">
      <div className="bg-surface-dark/80 p-3 pixel-borders-thin">
        <PixelText className="text-text-primary mb-2">Suggested Connections</PixelText>
        <div className="space-y-2">
          {suggestions.map(node => (
            <div
              key={node.id}
              className="bg-surface p-2 hover:bg-surface-dark cursor-pointer pixel-borders-thin"
              onClick={() => handleSuggestionClick(node)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleSuggestionClick(node)}
            >
              <div className="flex items-center">
                {/* Domain color indicator */}
                <div
                  className="w-2 h-2 rounded-full mr-2 flex-shrink-0"
                  style={{ backgroundColor: DOMAIN_COLORS[node.domain] }}
                ></div>
                {/* Node name */}
                <PixelText className="text-sm text-text-primary truncate">{node.name}</PixelText>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ConnectionSuggestionsPanel;
