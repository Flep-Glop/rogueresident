// app/store/knowledgeStore.ts
import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { KNOWLEDGE_DOMAINS } from '../components/knowledge/ConstellationView';

// Knowledge concept node
export interface ConceptNode {
  id: string;
  name: string;
  domain: keyof typeof KNOWLEDGE_DOMAINS;
  description: string;
  mastery: number; // 0-100% mastery level
  connections: string[]; // IDs of connected concepts
  discovered: boolean;
  position?: { x: number; y: number }; // For visual layout
}

// Knowledge connection between concepts
export interface ConceptConnection {
  source: string;
  target: string;
  strength: number; // 0-100%
  discovered: boolean;
}

// Journal entry for recording insights
export interface JournalEntry {
  id: string;
  conceptId: string;
  timestamp: number;
  content: string;
  masteryGained: number;
  source: 'challenge' | 'dialogue' | 'item' | 'observation';
}

interface KnowledgeState {
  // Knowledge constellation data
  nodes: ConceptNode[];
  connections: ConceptConnection[];
  
  // Journal data
  journalEntries: JournalEntry[];
  pendingInsights: Array<{conceptId: string, amount: number}>;
  
  // Knowledge metrics
  domainMastery: Record<keyof typeof KNOWLEDGE_DOMAINS, number>; // 0-100%
  totalMastery: number; // 0-100% across all domains
  
  // Tracking for newly acquired knowledge to animate
  newlyDiscovered: string[]; // Concept IDs
  
  // Actions
  addConcept: (concept: Omit<ConceptNode, 'id' | 'discovered' | 'connections'>) => string;
  discoverConcept: (conceptId: string) => void;
  updateMastery: (conceptId: string, amount: number) => void;
  createConnection: (sourceId: string, targetId: string) => void;
  discoverConnection: (sourceId: string, targetId: string) => void;
  addJournalEntry: (entry: Omit<JournalEntry, 'id' | 'timestamp'>) => void;
  transferInsights: () => void;
  resetNewlyDiscovered: () => void;
  
  // Development helpers
  importKnowledgeData: (data: any) => void;
  resetKnowledge: () => void;
}

// Initial state with some starter concepts
const initialConcepts: ConceptNode[] = [
  {
    id: 'radiation-basics',
    name: 'Radiation Fundamentals',
    domain: 'theoretical',
    description: 'Core principles of ionizing radiation including types, energy transfer, and interactions with matter.',
    mastery: 75,
    connections: ['dosimetry-principles', 'radiation-safety'],
    discovered: true,
    position: { x: 400, y: 200 }
  },
  {
    id: 'dosimetry-principles',
    name: 'Dosimetry Principles',
    domain: 'technical',
    description: 'Methods and instruments for measuring radiation dose and its distribution.',
    mastery: 60,
    connections: ['radiation-basics', 'radiation-detectors'],
    discovered: true,
    position: { x: 250, y: 280 }
  },
  {
    id: 'radiation-detectors',
    name: 'Radiation Detectors',
    domain: 'technical',
    description: 'Various technologies used for detection and measurement of radiation.',
    mastery: 50,
    connections: ['dosimetry-principles', 'ionization-chambers'],
    discovered: true,
    position: { x: 320, y: 370 }
  },
  {
    id: 'ionization-chambers',
    name: 'Ionization Chambers',
    domain: 'technical',
    description: 'Gas-filled detectors that measure ionizing radiation by collecting ions.',
    mastery: 40,
    connections: ['radiation-detectors', 'quantum-effects'],
    discovered: true,
    position: { x: 470, y: 350 }
  },
  {
    id: 'quantum-effects',
    name: 'Quantum Effects',
    domain: 'theoretical',
    description: 'Quantum mechanical phenomena affecting radiation interactions and detection.',
    mastery: 30,
    connections: ['ionization-chambers', 'ionix-anomaly'],
    discovered: true,
    position: { x: 550, y: 250 }
  },
  {
    id: 'radiation-safety',
    name: 'Radiation Safety',
    domain: 'clinical',
    description: 'Protocols and principles for ensuring safe use of radiation in medical settings.',
    mastery: 65,
    connections: ['radiation-basics', 'alara-principle'],
    discovered: true,
    position: { x: 320, y: 120 }
  },
  {
    id: 'alara-principle',
    name: 'ALARA Principle',
    domain: 'clinical',
    description: 'As Low As Reasonably Achievable - framework for minimizing radiation exposure.',
    mastery: 80,
    connections: ['radiation-safety'],
    discovered: true,
    position: { x: 180, y: 150 }
  },
  {
    id: 'ionix-anomaly',
    name: 'Ionix Anomaly',
    domain: 'theoretical',
    description: 'Unusual quantum behavior observed in experimental ion chambers.',
    mastery: 15,
    connections: ['quantum-effects'],
    discovered: true,
    position: { x: 620, y: 150 }
  },
  // Undiscovered nodes
  {
    id: 'detector-calibration',
    name: 'Detector Calibration',
    domain: 'technical',
    description: 'Procedures to ensure accurate readings from radiation detectors.',
    mastery: 0,
    connections: ['radiation-detectors', 'quality-assurance'],
    discovered: false,
    position: { x: 200, y: 420 }
  },
  {
    id: 'quality-assurance',
    name: 'Quality Assurance',
    domain: 'clinical',
    description: 'Procedures to ensure reliability and consistency of medical equipment.',
    mastery: 0,
    connections: ['detector-calibration'],
    discovered: false,
    position: { x: 150, y: 350 }
  }
];

// Helper function to build connections from nodes
const buildInitialConnections = (nodes: ConceptNode[]): ConceptConnection[] => {
  const connections: ConceptConnection[] = [];
  const processedPairs = new Set<string>();
  
  nodes.forEach(node => {
    if (!node.discovered) return;
    
    node.connections.forEach(targetId => {
      // Skip if already processed this pair (avoid duplicates)
      const pairKey = [node.id, targetId].sort().join('-');
      if (processedPairs.has(pairKey)) return;
      processedPairs.add(pairKey);
      
      // Only create connection if target node exists and is discovered
      const targetNode = nodes.find(n => n.id === targetId);
      if (targetNode?.discovered) {
        connections.push({
          source: node.id,
          target: targetId,
          strength: (node.mastery + (targetNode?.mastery || 0)) / 2,
          discovered: true
        });
      }
    });
  });
  
  return connections;
};

// Calculate domain mastery from nodes
const calculateDomainMastery = (nodes: ConceptNode[]): Record<keyof typeof KNOWLEDGE_DOMAINS, number> => {
  const domainTotals: Record<string, {sum: number, count: number}> = {};
  
  // Initialize all domains with 0
  (Object.keys(KNOWLEDGE_DOMAINS) as Array<keyof typeof KNOWLEDGE_DOMAINS>).forEach(domain => {
    domainTotals[domain] = {sum: 0, count: 0};
  });
  
  // Sum up mastery for each domain
  nodes.filter(node => node.discovered).forEach(node => {
    domainTotals[node.domain].sum += node.mastery;
    domainTotals[node.domain].count += 1;
  });
  
  // Calculate averages
  const result = {} as Record<keyof typeof KNOWLEDGE_DOMAINS, number>;
  (Object.keys(KNOWLEDGE_DOMAINS) as Array<keyof typeof KNOWLEDGE_DOMAINS>).forEach(domain => {
    result[domain] = domainTotals[domain].count > 0 
      ? Math.round(domainTotals[domain].sum / domainTotals[domain].count) 
      : 0;
  });
  
  return result;
};

// Calculate total mastery across all domains
const calculateTotalMastery = (domainMastery: Record<keyof typeof KNOWLEDGE_DOMAINS, number>): number => {
  const domains = Object.keys(domainMastery) as Array<keyof typeof KNOWLEDGE_DOMAINS>;
  const total = domains.reduce((sum, domain) => sum + domainMastery[domain], 0);
  return Math.round(total / domains.length);
};

export const useKnowledgeStore = create<KnowledgeState>((set, get) => {
  // Build initial state
  const initialConnections = buildInitialConnections(initialConcepts);
  const initialDomainMastery = calculateDomainMastery(initialConcepts);
  const initialTotalMastery = calculateTotalMastery(initialDomainMastery);
  
  return {
    // Initial state
    nodes: initialConcepts,
    connections: initialConnections,
    journalEntries: [],
    pendingInsights: [],
    domainMastery: initialDomainMastery,
    totalMastery: initialTotalMastery,
    newlyDiscovered: [],
    
    // Add a new concept
    addConcept: (concept) => {
      const id = nanoid();
      
      set(state => {
        const newNode: ConceptNode = {
          id,
          ...concept,
          connections: [],
          discovered: false
        };
        
        return {
          nodes: [...state.nodes, newNode]
        };
      });
      
      return id;
    },
    
    // Discover a concept
    discoverConcept: (conceptId) => {
      set(state => {
        // Skip if already discovered
        if (state.nodes.find(n => n.id === conceptId)?.discovered) {
          return state;
        }
        
        // Update node discovered state
        const updatedNodes = state.nodes.map(node => 
          node.id === conceptId 
            ? { ...node, discovered: true } 
            : node
        );
        
        // Recalculate domain mastery
        const domainMastery = calculateDomainMastery(updatedNodes);
        const totalMastery = calculateTotalMastery(domainMastery);
        
        return {
          nodes: updatedNodes,
          domainMastery,
          totalMastery,
          newlyDiscovered: [...state.newlyDiscovered, conceptId]
        };
      });
    },
    
    // Update concept mastery
    updateMastery: (conceptId, amount) => {
      set(state => {
        // Find the node
        const node = state.nodes.find(n => n.id === conceptId);
        if (!node) return state;
        
        // Calculate new mastery (capped at 100%)
        const newMastery = Math.min(100, Math.max(0, node.mastery + amount));
        
        // If node not discovered and gaining mastery, auto-discover
        const shouldDiscover = !node.discovered && amount > 0;
        
        // Update node mastery
        const updatedNodes = state.nodes.map(node => 
          node.id === conceptId 
            ? { 
                ...node, 
                mastery: newMastery,
                discovered: node.discovered || shouldDiscover
              } 
            : node
        );
        
        // Update connections that involve this node
        const updatedConnections = state.connections.map(conn => {
          if (conn.source === conceptId || conn.target === conceptId) {
            // Get the other node in the connection
            const otherNodeId = conn.source === conceptId ? conn.target : conn.source;
            const otherNode = updatedNodes.find(n => n.id === otherNodeId);
            
            // Recalculate connection strength based on both nodes' mastery
            return {
              ...conn,
              strength: (newMastery + (otherNode?.mastery || 0)) / 2
            };
          }
          return conn;
        });
        
        // Add to pending insights if gaining mastery
        let pendingInsights = [...state.pendingInsights];
        if (amount > 0) {
          pendingInsights.push({
            conceptId,
            amount
          });
        }
        
        // If newly discovered, add to that list
        const newlyDiscovered = shouldDiscover
          ? [...state.newlyDiscovered, conceptId]
          : state.newlyDiscovered;
        
        // Recalculate domain mastery
        const domainMastery = calculateDomainMastery(updatedNodes);
        const totalMastery = calculateTotalMastery(domainMastery);
        
        return {
          nodes: updatedNodes,
          connections: updatedConnections,
          pendingInsights,
          domainMastery,
          totalMastery,
          newlyDiscovered
        };
      });
    },
    
    // Create a new connection between concepts
    createConnection: (sourceId, targetId) => {
      set(state => {
        // Check if nodes exist and are discovered
        const sourceNode = state.nodes.find(n => n.id === sourceId);
        const targetNode = state.nodes.find(n => n.id === targetId);
        
        if (!sourceNode || !targetNode || !sourceNode.discovered || !targetNode.discovered) {
          console.warn('Cannot create connection: nodes not found or not discovered');
          return state;
        }
        
        // Check if connection already exists
        const existingConnection = state.connections.find(
          conn => (conn.source === sourceId && conn.target === targetId) ||
                 (conn.source === targetId && conn.target === sourceId)
        );
        
        if (existingConnection) {
          console.warn('Connection already exists');
          return state;
        }
        
        // Create new connection
        const newConnection: ConceptConnection = {
          source: sourceId,
          target: targetId,
          strength: (sourceNode.mastery + targetNode.mastery) / 2,
          discovered: true
        };
        
        // Update nodes to include connection reference
        const updatedNodes = state.nodes.map(node => {
          if (node.id === sourceId && !node.connections.includes(targetId)) {
            return {
              ...node,
              connections: [...node.connections, targetId]
            };
          }
          if (node.id === targetId && !node.connections.includes(sourceId)) {
            return {
              ...node,
              connections: [...node.connections, sourceId]
            };
          }
          return node;
        });
        
        return {
          nodes: updatedNodes,
          connections: [...state.connections, newConnection]
        };
      });
    },
    
    // Discover an existing connection
    discoverConnection: (sourceId, targetId) => {
      set(state => {
        // Find the connection
        const connection = state.connections.find(
          conn => (conn.source === sourceId && conn.target === targetId) ||
                 (conn.source === targetId && conn.target === sourceId)
        );
        
        if (!connection) {
          console.warn('Connection not found');
          return state;
        }
        
        // Update connection
        const updatedConnections = state.connections.map(conn => 
          (conn.source === sourceId && conn.target === targetId) ||
          (conn.source === targetId && conn.target === sourceId)
            ? { ...conn, discovered: true }
            : conn
        );
        
        return {
          connections: updatedConnections
        };
      });
    },
    
    // Add a journal entry
    addJournalEntry: (entry) => {
      const id = nanoid();
      
      set(state => ({
        journalEntries: [
          ...state.journalEntries,
          {
            id,
            ...entry,
            timestamp: Date.now()
          }
        ]
      }));
      
      // Also update concept mastery
      get().updateMastery(entry.conceptId, entry.masteryGained);
    },
    
    // Transfer pending insights to the constellation
    transferInsights: () => {
      set(state => {
        // Clear pending insights after transfer
        return {
          pendingInsights: []
        };
      });
    },
    
    // Reset newly discovered tracking
    resetNewlyDiscovered: () => {
      set({ newlyDiscovered: [] });
    },
    
    // Import knowledge data (for development/testing)
    importKnowledgeData: (data) => {
      if (!data) return;
      
      set(state => {
        // Import nodes
        const nodes = data.nodes || state.nodes;
        
        // Build connections
        const connections = data.connections || buildInitialConnections(nodes);
        
        // Recalculate domain mastery
        const domainMastery = calculateDomainMastery(nodes);
        const totalMastery = calculateTotalMastery(domainMastery);
        
        return {
          nodes,
          connections,
          journalEntries: data.journalEntries || state.journalEntries,
          pendingInsights: data.pendingInsights || state.pendingInsights,
          domainMastery,
          totalMastery,
          newlyDiscovered: []
        };
      });
    },
    
    // Reset knowledge to initial state
    resetKnowledge: () => {
      set({
        nodes: initialConcepts,
        connections: initialConnections,
        journalEntries: [],
        pendingInsights: [],
        domainMastery: initialDomainMastery,
        totalMastery: initialTotalMastery,
        newlyDiscovered: []
      });
    }
  };
});

// Add some middleware for console debugging in development
if (process.env.NODE_ENV !== 'production') {
  const originalSet = useKnowledgeStore.setState;
  useKnowledgeStore.setState = (state, replace) => {
    console.log('Knowledge store updated:', state);
    return originalSet(state, replace === true);
  };
}