'use client';
import { useGameStore } from '../store/gameStore';
import NodeComponent from './NodeComponent';
import { useState, useEffect } from 'react';

export default function GameMap() {
  const { currentNodeId, completedNodeIds, setCurrentNode, map } = useGameStore();
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  
  // Log for debugging
  useEffect(() => {
    console.log("GameMap - completedNodeIds updated:", completedNodeIds);
  }, [completedNodeIds]);

  if (!map) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse flex space-x-4">
          <div className="rounded-full bg-blue-400 h-12 w-12"></div>
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-blue-400 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-blue-400 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Determine which nodes are available (connected to completed nodes or start)
  const availableNodeIds = new Set<string>();
  
  // Start node is always available
  availableNodeIds.add(map.startNodeId);
  
  // Add nodes connected to completed nodes
  completedNodeIds.forEach(nodeId => {
    const node = map.nodes.find(n => n.id === nodeId);
    if (node) {
      node.connections.forEach(connId => availableNodeIds.add(connId));
    } else {
      console.warn(`Node ${nodeId} in completedNodeIds not found in current map!`);
    }
  });
  
  // Get node position for label placement
  const getNodeConnectionLine = (nodeId1: string, nodeId2: string) => {
    const node1 = map.nodes.find(n => n.id === nodeId1);
    const node2 = map.nodes.find(n => n.id === nodeId2);
    
    if (!node1 || !node2) return null;
    
    const x1 = node1.position.x * 150 + 50;
    const y1 = node1.position.y * 100 + 50;
    const x2 = node2.position.x * 150 + 50;
    const y2 = node2.position.y * 100 + 50;
    
    // Calculate if the path is available
    const isPathActive = 
      completedNodeIds.includes(nodeId1) && availableNodeIds.has(nodeId2) || 
      completedNodeIds.includes(nodeId2) && availableNodeIds.has(nodeId1);
      
    // Calculate if the path is completed (both nodes are complete)
    const isPathCompleted = 
      completedNodeIds.includes(nodeId1) && completedNodeIds.includes(nodeId2);
    
    return { x1, y1, x2, y2, isPathActive, isPathCompleted };
  };
  
  return (
    <div className="relative w-full h-full starfield-bg overflow-hidden">
      {/* Map title */}
      <div className="absolute top-4 left-0 right-0 text-center z-10">
        <h2 className="map-title text-2xl font-bold text-white mb-1">Medical Physics Department</h2>
        <p className="map-subtitle text-blue-300 text-sm">Navigate through challenges to reach the final encounter</p>
      </div>
      
      {/* Debug info for development */}
      <div className="debug-console absolute bottom-20 left-4 z-50">
        <div>Completed: {completedNodeIds.length} nodes</div>
        <div>Available: {availableNodeIds.size} nodes</div>
        <div>Selected: {currentNodeId?.substring(0, 8) || 'none'}</div>
      </div>
      
      {/* Draw connections between nodes */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        
        {/* Connections between nodes */}
        {map.nodes.map(node => 
          node.connections.map(connId => {
            const conn = getNodeConnectionLine(node.id, connId);
            if (!conn) return null;
            
            return (
              <g key={`${node.id}-${connId}`}>
                {/* Shadow/glow effect for active paths */}
                {conn.isPathActive && (
                  <line
                    x1={conn.x1}
                    y1={conn.y1}
                    x2={conn.x2}
                    y2={conn.y2}
                    stroke="#60A5FA"
                    strokeWidth={5}
                    strokeOpacity={0.5}
                    filter="url(#glow)"
                  />
                )}
                
                {/* Main connection line */}
                <line
                  x1={conn.x1}
                  y1={conn.y1}
                  x2={conn.x2}
                  y2={conn.y2}
                  className={`
                    pixel-connection
                    ${conn.isPathCompleted ? 'pixel-connection-completed stroke-success' : ''}
                    ${conn.isPathActive && !conn.isPathCompleted ? 'pixel-connection-active stroke-blue-500' : ''}
                    ${!conn.isPathActive && !conn.isPathCompleted ? 'stroke-gray-600' : ''}
                  `}
                />
              </g>
            );
          })
        )}
      </svg>
      
      {/* Render nodes */}
      {map.nodes.map(node => {
        const isAvailable = availableNodeIds.has(node.id);
        const isCompleted = completedNodeIds.includes(node.id);
        const isSelected = node.id === currentNodeId;
        const isHovered = node.id === hoveredNodeId;
        
        return (
          <div
            key={node.id}
            className={`
              absolute transition-all duration-300
              ${isHovered && isAvailable ? 'z-20 scale-110' : 'z-10'}
              ${isSelected ? 'z-30' : ''}
            `}
            style={{
              left: `${node.position.x * 150}px`,
              top: `${node.position.y * 100}px`,
            }}
          >
            <NodeComponent
              node={node}
              isAvailable={isAvailable}
              isCompleted={isCompleted}
              isSelected={isSelected}
              isHovered={isHovered}
              onClick={() => {
                if (isAvailable) {
                  console.log(`Selecting node: ${node.id} (type: ${node.type})`);
                  setCurrentNode(node.id);
                }
              }}
              onMouseEnter={() => setHoveredNodeId(node.id)}
              onMouseLeave={() => setHoveredNodeId(null)}
            />
          </div>
        );
      })}
      
      {/* Legend */}
      <div className="map-legend absolute bottom-4 right-4 text-sm">
        <div className="flex items-center mb-2">
          <div className="legend-dot bg-blue-500 mr-2"></div>
          <span>Available Nodes</span>
        </div>
        <div className="flex items-center mb-2">
          <div className="legend-dot bg-green-500 mr-2"></div>
          <span>Completed Nodes</span>
        </div>
        <div className="flex items-center">
          <div className="legend-dot bg-gray-400 mr-2"></div>
          <span>Locked Nodes</span>
        </div>
      </div>
    </div>
  );
}