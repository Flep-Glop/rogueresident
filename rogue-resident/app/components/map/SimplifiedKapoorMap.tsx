/**
 * @file app/components/map/SimplifiedKapoorMap.tsx
 * @description React component for rendering the interactive game map.
 * Includes fixes for hydration errors and potential infinite update loops.
 * (This file is unchanged from the previous version provided)
 */
'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useGameStore } from '@/app/store/gameStore';
import { useJournalStore } from '@/app/store/journalStore';
import { useKnowledgeStore } from '@/app/store/knowledgeStore';
import { Button } from '@/app/components/ui/button'; // Assuming shadcn Button is setup
// Import type definitions - Requires app/types/game.ts to exist
import { MapNode } from '@/app/types/game';
import CentralEventBus from '@/app/core/events/CentralEventBus';
// import { useEventSubscription } from '@/app/core/events/EventSubscriptionHooks'; // Uncomment if needed later
import { THEME_COLORS } from '@/app/core/themeConstants'; // Import theme colors

// Interface for component props
interface SimplifiedKapoorMapProps {
  onNodeSelect?: (nodeId: string) => void; // Optional callback when a node is selected
  autoSelectEnabled?: boolean; // Prop to control if a node should be auto-selected on load
}

/**
 * SimplifiedKapoorMap Component
 *
 * Renders a basic representation of the game map and handles node interactions.
 * Addresses hydration errors and potential update loops.
 */
export function SimplifiedKapoorMap({
  onNodeSelect,
  autoSelectEnabled = true, // Default autoSelect to true if not provided
}: SimplifiedKapoorMapProps) {
  // --- State Hooks ---
  const [isMounted, setIsMounted] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // --- Zustand Store Hooks ---
  const { day, phase, mapData, selectedNodeId, selectNode, initializeMap } = useGameStore(
    useCallback((state) => ({
        day: state.day, phase: state.phase, mapData: state.mapData,
        selectedNodeId: state.selectedNodeId, selectNode: state.selectNode,
        initializeMap: state.initializeMap,
      }), [])
  );
  const hasJournal = useJournalStore(useCallback((state) => state.hasJournal, []));
  const completedNodes = useKnowledgeStore(useCallback((state) => state.completedNodes, []));

  // --- Derived State and Memos ---
  const nodes = useMemo(() => mapData?.nodes ?? [], [mapData]);

  // --- Effects ---

  // Effect 1: Set isMounted flag (for hydration fix)
  useEffect(() => { setIsMounted(true); }, []);

  // Effect 2: Initialize map data if needed
  useEffect(() => {
    if (!mapData) {
      console.log('🗺️ Initializing simplified Kapoor map (useEffect)...');
      initializeMap();
    } else {
      console.log('🗺️ Map data exists, marking as ready.');
      setMapReady(true);
    }
  }, [mapData, initializeMap]);

  // Effect 3: Mark map as ready once data/nodes are present
  useEffect(() => {
    if (mapData && nodes.length > 0) {
      console.log('🗺️ Map data loaded, nodes available. Marking map as ready.');
      setMapReady(true);
    }
  }, [mapData, nodes]);

  // Effect 4: Handle Auto-selection logic (Refined)
  useEffect(() => {
    if (isMounted && mapReady && autoSelectEnabled && !selectedNodeId && nodes.length > 0) {
      const firstAvailableNode = nodes.find(node => !completedNodes.includes(node.id));
      const targetNodeId = firstAvailableNode ? firstAvailableNode.id : nodes[0].id;
      console.log(`[Map] Attempting auto-selection. Target: ${targetNodeId}. Current selection: ${selectedNodeId}`);

      if (targetNodeId !== selectedNodeId) {
         const targetNode = nodes.find(n => n.id === targetNodeId);
         if (!targetNode) { console.warn(`[Map] Auto-select target node ${targetNodeId} not found.`); return; }
         const journalRequired = targetNode.requiresJournal ?? false;
         const requiredPhase = targetNode.phaseSpecific;
         let canSelect = true;
         if (journalRequired && !hasJournal) { console.log(`[Map] Cannot auto-select ${targetNodeId}: Journal required.`); canSelect = false; }
         if (requiredPhase && requiredPhase !== phase) { console.log(`[Map] Cannot auto-select ${targetNodeId}: Requires ${requiredPhase} phase.`); canSelect = false; }
         if(canSelect) {
            console.log(`[Map] Auto-selecting node: ${targetNodeId}`);
            selectNode(targetNodeId);
            if (onNodeSelect) { onNodeSelect(targetNodeId); }
         } else { console.log(`[Map] Auto-selection conditions not met for ${targetNodeId}.`); }
      } else { console.log(`[Map] Auto-selection skipped: Target node ${targetNodeId} is already selected.`); }
    }
  }, [ isMounted, mapReady, autoSelectEnabled, selectedNodeId, nodes, completedNodes, hasJournal, phase, selectNode, onNodeSelect ]);


  // --- Event Handlers ---
  const handleNodeClick = useCallback((nodeId: string, node: MapNode) => {
    console.log(`[Map] Node clicked: ${nodeId}`);
    const journalRequired = node.requiresJournal ?? false;
    const requiredPhase = node.phaseSpecific;
    if (journalRequired && !hasJournal) {
      console.warn(`[Map] Cannot select ${nodeId}: Journal required.`);
      CentralEventBus.emit('ui:show:toast', { message: "Requires Journal", type: "warning" }); return;
    }
    if (requiredPhase && requiredPhase !== phase) {
        console.warn(`[Map] Cannot select ${nodeId}: Only available during ${requiredPhase} phase.`);
        CentralEventBus.emit('ui:show:toast', { message: `Only available at ${requiredPhase}`, type: "warning" }); return;
    }
    if (nodeId !== selectedNodeId) {
      selectNode(nodeId);
      if (onNodeSelect) { onNodeSelect(nodeId); }
      CentralEventBus.emit('ui:button:clicked', { element: 'map_node', nodeId: nodeId });
    } else { console.log(`[Map] Node ${nodeId} is already selected.`); }
  }, [selectNode, onNodeSelect, selectedNodeId, hasJournal, phase]);


  // --- Rendering Logic ---

  // Hydration Fix: Render placeholder until mounted client-side
  if (!isMounted) {
    return ( <div className="h-full w-full flex items-center justify-center" ref={containerRef}> <div className="text-center pixel-font text-lg text-gray-400">Initializing Map...</div> </div> );
  }

  // Loading state (after mount, before map ready)
  if (!mapReady || !mapData) {
    return ( <div className="h-full w-full flex items-center justify-center bg-background" ref={containerRef}> <div className="text-center pixel-font text-lg text-gray-400 animate-pulse">Loading Map Data...</div> </div> );
  }

  // Actual map render
  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-gray-800 border-4 border-gray-600 shadow-inner" style={{ backgroundImage: `radial-gradient(${THEME_COLORS.map.gridDot} 1px, transparent 1px)`, backgroundSize: '20px 20px', }} >
      {/* Map Nodes */}
      {nodes.map((node) => {
        const isSelected = node.id === selectedNodeId;
        const isCompleted = completedNodes.includes(node.id);
        const journalRequired = node.requiresJournal ?? false;
        const requiredPhase = node.phaseSpecific;
        let isDisabled = false;
        let titleText = `Location: ${node.name}`;
        if (journalRequired && !hasJournal) { isDisabled = true; titleText += " (Requires Journal)"; }
        if (requiredPhase && requiredPhase !== phase) { isDisabled = true; titleText += ` (Available at ${requiredPhase})`; }
        const left = `${node.x ?? 50}%`; const top = `${node.y ?? 50}%`;
        return (
          <Button key={node.id} variant="ghost"
            className={` absolute transform -translate-x-1/2 -translate-y-1/2 p-2 rounded-full shadow-lg transition-all duration-200 ease-in-out border-2 ${isSelected ? 'ring-4 ring-offset-2 ring-yellow-400 scale-110 z-10' : ''} ${isCompleted ? 'border-green-500 bg-green-900 opacity-70' : 'border-blue-500 bg-blue-900'} ${isDisabled ? 'opacity-50 cursor-not-allowed filter grayscale' : 'hover:scale-105 hover:border-yellow-400 cursor-pointer'} `}
            style={{ left: left, top: top, width: '40px', height: '40px', }}
            onClick={() => !isDisabled && handleNodeClick(node.id, node)}
            disabled={isDisabled} title={titleText} >
            <span className={`block w-3 h-3 rounded-full ${isCompleted ? 'bg-green-400' : 'bg-blue-400'}`}></span>
          </Button>
        );
      })}
      {/* Selected Node Info Overlay */}
      {selectedNodeId && ( <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 text-white p-2 rounded pixel-font border border-gray-500 text-sm"> Selected: {nodes.find(n => n.id === selectedNodeId)?.name ?? 'Unknown'} </div> )}
      {/* Day/Phase Info Overlay */}
      <div className="absolute top-4 right-4 bg-black bg-opacity-70 text-white p-2 rounded pixel-font border border-gray-500 text-sm"> Day: {day} | Phase: {phase} </div>
    </div>
  );
}
