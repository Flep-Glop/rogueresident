// app/types/map.ts
// Import the challenge types
import { 
  ChallengeContent, 
  ChallengeFormat, 
  EquipmentType, 
  ProcedureType 
} from '../types/challenge';


/**
 * Node position in percentage units for responsive layouts
 */
export interface NodePosition {
  x: number; // percentage from left
  y: number; // percentage from top
}

/**
 * Expanded node types to support richer gameplay patterns
 */
export type NodeType = 
  | 'kapoorCalibration' // Primary calibration node - direct to specialized experience
  | 'clinical'     // Patient-focused challenges
  | 'qa'           // Equipment QA challenges
  | 'educational'  // Learning-focused nodes
  | 'experimental' // High-risk, high-reward challenges
  | 'storage'      // Item acquisition nodes
  | 'vendor'       // Shop/upgrade nodes
  | 'entrance'     // Starting point
  | 'qualification' // Required for boss access
  | 'boss'         // Generic boss encounter
  | 'boss-ionix';  // Specific boss type
  
/**
 * Node state for visual treatment and interaction rules
 * - 'active': Currently selected node
 * - 'completed': Successfully finished node
 * - 'accessible': Available for selection
 * - 'future': Visible but not yet accessible
 * - 'locked': Hidden/unknown node
 */
export type NodeState = 'active' | 'completed' | 'accessible' | 'future' | 'locked';

/**
 * Runtime type guard for NodeState checking
 * This pattern resolves the TypeScript comparison errors with string literal types
 */
export function isNodeState(value: string, state: NodeState): boolean {
  // Runtime check that bypasses TypeScript's compile-time type checking
  return value === state;
}

/**
 * Connection between nodes with visual state
 */
export interface NodeConnection {
  source: string;
  target: string;
  completed: boolean;
  available: boolean;
}

/**
 * Unified Node definition with all properties
 * Maintains backward compatibility with existing code while
 * adding support for new visual treatments
 */
export interface Node {
  id: string;
  title: string;
  description: string;
  type: NodeType;
  character?: string;
  position: NodePosition;
  connections: string[]; // IDs of connected nodes
  isLocked: boolean;     // Legacy property, will be phased out in favor of visualState
  insightReward?: number;
  content?: any; // Challenge data
  requirements?: {
    items?: string[];
    knowledge?: string[];
    nodesCompleted?: string[];
    insight?: number;
  };
  visualState?: NodeState; // Computed field for rendering
}

// Maintain backward compatibility with existing code
export type MapNode = Node;

/**
 * Game map structure
 */
export interface GameMap {
  nodes: Node[];
  startNodeId: string;
  bossNodeId: string;
  dimensions?: {
    width: number;  // Logical width of map (percentage units)
    height: number; // Logical height of map (percentage units)
  };
}

/**
 * Player statistics
 */
export interface PlayerStats {
  health: number;
  maxHealth: number;
  insight: number;
}

/**
 * Map view state to handle scrolling and zooming
 */
export interface MapViewState {
  offsetX: number;
  offsetY: number;
  zoom: number;
  isDragging: boolean;
}

/**
 * Unified Node definition with all properties
 * Maintains backward compatibility with existing code while
 * adding support for new challenge system properties
 */
export interface Node {
  id: string;
  title: string;
  description: string;
  type: NodeType;
  character?: string;
  position: NodePosition;
  connections: string[]; // IDs of connected nodes
  isLocked: boolean;     // Legacy property, will be phased out in favor of visualState
  insightReward?: number;
  
  // Challenge system properties
  content?: ChallengeContent; // Challenge content type (calibration, patient_case, etc.)
  format?: ChallengeFormat;   // Challenge format (conversation, interactive, procedural)
  equipmentType?: EquipmentType; // Type of equipment for QA challenges
  procedureType?: ProcedureType; // Type of procedure for QA challenges
  caseId?: string;             // Specific case ID for patient cases
  
  // Legacy content field - will eventually be replaced by more specific fields
  content?: any; // Challenge data
  
  requirements?: {
    items?: string[];
    knowledge?: string[];
    nodesCompleted?: string[];
    insight?: number;
  };
  visualState?: NodeState; // Computed field for rendering
}

/**
 * Type bridge for utility functions to convert between types
 */
export const mapUtils = {
  // Convert from mapGenerator.Node to map.Node
  convertLegacyNode: (legacyNode: any): Node => {
    return {
      ...legacyNode,
      // Ensure required fields are present
      title: legacyNode.title || legacyNode.id || 'Unknown',
      description: legacyNode.description || '',
      isLocked: legacyNode.isLocked ?? false,
    };
  },
  
  // Convert legacy map to updated map format
  convertLegacyMap: (legacyMap: any): GameMap => {
    return {
      nodes: legacyMap.nodes.map(mapUtils.convertLegacyNode),
      startNodeId: legacyMap.startNodeId,
      bossNodeId: legacyMap.bossNodeId,
      dimensions: legacyMap.dimensions || {
        width: 100,
        height: 100
      },
    };
  },
};