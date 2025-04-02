// app/components/knowledge/ConnectionSuggestions.tsx
'use client';
import { useState, useEffect, useMemo } from 'react';
import { PixelText, PixelButton } from '../PixelThemeProvider';
import { useKnowledgeStore } from '../../store/knowledgeStore';
import { getPotentialConnections } from '../../utils/knowledgeRequirements';
import { useGameEffects } from '../GameEffects';

interface ConnectionSuggestionsProps {
  onSelectConnection?: (sourceId: string, targetId: string) => void;
  maxSuggestions?: number;
}

export default function ConnectionSuggestions({ 
  onSelectConnection, 
  maxSuggestions = 3 
}: ConnectionSuggestionsProps) {
  // CRITICAL FIX: Use hooks at the top level with consistent ordering
  const { nodes } = useKnowledgeStore(state => ({
    nodes: state.nodes
  }));
  
  const { playSound } = useGameEffects();
  
  const [suggestions, setSuggestions] = useState<Array<{
    sourceId: string, 
    targetId: string, 
    similarity: number,
    sourceName: string,
    targetName: string
  }>>([]);
  
  // Use useMemo for computations, not for hook composition
  const processedNodes = useMemo(() => nodes, [nodes]);
  
  // Update suggestions when nodes change
  useEffect(() => {
    if (!processedNodes) return;
    
    // Get potential connections from utility
    const potentialConnections = getPotentialConnections();
    
    // Limit to max suggestions and add node names
    const topSuggestions = potentialConnections
      .slice(0, maxSuggestions)
      .map(conn => {
        const sourceNode = processedNodes.find(n => n.id === conn.sourceId);
        const targetNode = processedNodes.find(n => n.id === conn.targetId);
        
        return {
          ...conn,
          sourceName: sourceNode?.name || 'Unknown Concept',
          targetName: targetNode?.name || 'Unknown Concept'
        };
      });
    
    setSuggestions(topSuggestions);
  }, [processedNodes, maxSuggestions]);
  
  // Handle selection with proper error boundaries
  const handleConnectionSelect = (sourceId: string, targetId: string) => {
    if (playSound) playSound('click');
    if (onSelectConnection) {
      try {
        onSelectConnection(sourceId, targetId);
      } catch (error) {
        console.error("Error selecting connection:", error);
        // Optionally show error toast here
      }
    }
  };
  
  // No suggestions to show
  if (suggestions.length === 0) {
    return (
      <div className="p-3 bg-surface-dark pixel-borders-thin">
        <PixelText className="text-text-secondary text-sm">
          No potential connections detected yet. Keep exploring!
        </PixelText>
      </div>
    );
  }
  
  return (
    <div className="bg-surface-dark pixel-borders">
      <div className="p-3 border-b border-border">
        <PixelText>Potential Connections</PixelText>
      </div>
      
      <div className="p-3 space-y-3">
        {suggestions.map((suggestion, index) => (
          <div key={index} className="bg-surface p-3 pixel-borders-thin">
            <div className="flex justify-between items-start mb-2">
              <PixelText className="text-sm">
                {suggestion.sourceName} <span className="text-text-secondary">⟷</span> {suggestion.targetName}
              </PixelText>
              <div className="bg-surface-dark px-2 py-1">
                <PixelText className="text-xs">
                  {Math.round(suggestion.similarity)}% match
                </PixelText>
              </div>
            </div>
            
            {/* Connection strength indicator */}
            <div className="w-full bg-surface-dark h-2 mb-2">
              <div 
                className="h-full bg-educational" 
                style={{ width: `${suggestion.similarity}%` }}
              ></div>
            </div>
            
            <div className="flex justify-end">
              <PixelButton
                className="text-sm bg-educational text-white py-1 px-2"
                onClick={() => handleConnectionSelect(suggestion.sourceId, suggestion.targetId)}
              >
                Connect Concepts
              </PixelButton>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}