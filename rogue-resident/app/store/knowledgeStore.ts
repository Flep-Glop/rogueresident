// app/store/knowledgeStore.ts
/**
 * Knowledge Constellation System
 * 
 * This store manages the player's evolving understanding of medical physics
 * represented as a personal constellation in the night sky. Stars (concepts)
 * illuminate as mastery increases, forming connections that represent
 * true expertise development.
 * 
 * Design Philosophy:
 * - Knowledge acquisition mirrors authentic expertise development
 * - Visual metaphors reinforce abstract learning
 * - Systems reflect cognitive development patterns
 */

import { create } from 'zustand';
import { nanoid } from 'nanoid';

// Knowledge domains with visual styling properties
export const KNOWLEDGE_DOMAINS = {
  'radiation-physics': {
    name: 'Radiation Physics',
    color: 'var(--clinical-color)',
    textClass: 'text-clinical-light',
    bgClass: 'bg-clinical'
  },
  'quality-assurance': {
    name: 'Quality Assurance',
    color: 'var(--qa-color)',
    textClass: 'text-qa-light',
    bgClass: 'bg-qa'
  },
  'clinical-practice': {
    name: 'Clinical Practice',
    color: 'var(--clinical-alt-color, var(--clinical-color))',
    textClass: 'text-clinical-light',
    bgClass: 'bg-clinical-dark'
  },
  'radiation-protection': {
    name: 'Radiation Protection',
    color: 'var(--warning-color)',
    textClass: 'text-warning',
    bgClass: 'bg-warning'
  },
  'technical': {
    name: 'Technical Expertise',
    color: 'var(--qa-color)',
    textClass: 'text-qa-light',
    bgClass: 'bg-qa'
  },
  'theoretical': {
    name: 'Theoretical Foundations',
    color: 'var(--educational-color)',
    textClass: 'text-educational-light',
    bgClass: 'bg-educational'
  },
  'general': {
    name: 'General Knowledge',
    color: 'var(--text-primary)',
    textClass: 'text-text-primary',
    bgClass: 'bg-surface-dark'
  }
};

// Type Definitions
export type KnowledgeDomain = keyof typeof KNOWLEDGE_DOMAINS;
export type MasteryLevel = 'undiscovered' | 'introduced' | 'practicing' | 'mastered';

// Core Interfaces
export interface ConceptNode {
  id: string;
  name: string;
  domain: KnowledgeDomain;
  description: string;
  mastery: number; // 0-100% mastery level
  connections: string[]; // IDs of connected concepts
  discovered: boolean;
  position?: { x: number; y: number }; // For visual layout
  lastPracticed?: number; // Timestamp for knowledge decay
}

export interface ConceptConnection {
  source: string;
  target: string;
  strength: number; // 0-100%
  discovered: boolean;
}

export interface JournalEntry {
  id: string;
  conceptId: string;
  timestamp: number;
  content: string;
  masteryGained: number;
  source: 'challenge' | 'dialogue' | 'item' | 'observation';
}

interface KnowledgeState {
  // Core data structures
  nodes: ConceptNode[];
  connections: ConceptConnection[];
  journalEntries: JournalEntry[];
  
  // Ephemeral tracking
  pendingInsights: Array<{conceptId: string, amount: number}>;
  newlyDiscovered: string[]; // Concept IDs for animation
  
  // Derived metrics
  domainMastery: Record<KnowledgeDomain, number>; // 0-100%
  totalMastery: number; // 0-100% across all domains
  
  // Actions
  addConcept: (concept: Omit<ConceptNode, 'id' | 'discovered' | 'connections' | 'lastPracticed'>) => string;
  discoverConcept: (conceptId: string) => void;
  updateMastery: (conceptId: string, amount: number) => void;
  createConnection: (sourceId: string, targetId: string) => void;
  discoverConnection: (sourceId: string, targetId: string) => void;
  addJournalEntry: (entry: Omit<JournalEntry, 'id' | 'timestamp'>) => void;
  applyKnowledgeDecay: () => void;
  transferInsights: () => void;
  resetNewlyDiscovered: () => void;
  
  // Development helpers
  importKnowledgeData: (data: Partial<KnowledgeState>) => void;
  resetKnowledge: () => void;
}

// Medical physics concepts for the game
const medicalPhysicsConcepts: ConceptNode[] = [
  // Radiation Physics Domain
  {
    id: 'electron-equilibrium',
    name: 'Electron Equilibrium',
    domain: 'radiation-physics',
    description: 'The condition where the number of electrons entering a volume equals the number leaving it.',
    mastery: 0,
    connections: ['output-calibration', 'dosimetry-principles'],
    discovered: false,
    position: { x: 250, y: 150 },
    lastPracticed: Date.now()
  },
  {
    id: 'inverse-square-law',
    name: 'Inverse Square Law',
    domain: 'radiation-physics',
    description: 'The principle that the intensity of radiation is inversely proportional to the square of the distance from the source.',
    mastery: 0,
    connections: ['radiation-safety'],
    discovered: false,
    position: { x: 300, y: 200 },
    lastPracticed: Date.now()
  },
  {
    id: 'attenuation',
    name: 'Attenuation',
    domain: 'radiation-physics',
    description: 'The reduction in intensity of a radiation beam as it passes through matter.',
    mastery: 0,
    connections: ['half-value-layer', 'shielding'],
    discovered: false,
    position: { x: 350, y: 250 },
    lastPracticed: Date.now()
  },
  {
    id: 'half-value-layer',
    name: 'Half-Value Layer',
    domain: 'radiation-physics',
    description: 'The thickness of a specified material that reduces the intensity of radiation to one-half its original value.',
    mastery: 0,
    connections: ['attenuation', 'shielding'],
    discovered: false,
    position: { x: 400, y: 300 },
    lastPracticed: Date.now()
  },
  {
    id: 'linear-energy-transfer',
    name: 'Linear Energy Transfer',
    domain: 'radiation-physics',
    description: 'The amount of energy that an ionizing particle transfers to the material traversed per unit distance.',
    mastery: 0,
    connections: ['radiation-dosimetry'],
    discovered: false,
    position: { x: 450, y: 350 },
    lastPracticed: Date.now()
  },
  
  // Quality Assurance Domain
  {
    id: 'output-calibration',
    name: 'Output Calibration',
    domain: 'quality-assurance',
    description: 'The process of measuring and adjusting the radiation output from treatment machines.',
    mastery: 0,
    connections: ['electron-equilibrium', 'tolerance-limits', 'dosimetry-principles'],
    discovered: false,
    position: { x: 200, y: 200 },
    lastPracticed: Date.now()
  },
  {
    id: 'tolerance-limits',
    name: 'Tolerance Limits',
    domain: 'quality-assurance',
    description: 'Acceptable levels of variation in radiation therapy parameters.',
    mastery: 0,
    connections: ['output-calibration', 'linac-qa'],
    discovered: false,
    position: { x: 150, y: 250 },
    lastPracticed: Date.now()
  },
  {
    id: 'dosimetry-principles',
    name: 'Dosimetry Principles',
    domain: 'quality-assurance',
    description: 'Fundamental concepts and techniques for measuring radiation dose.',
    mastery: 0,
    connections: ['electron-equilibrium', 'output-calibration', 'radiation-dosimetry'],
    discovered: false,
    position: { x: 250, y: 300 },
    lastPracticed: Date.now()
  },
  {
    id: 'linac-qa',
    name: 'LINAC Quality Assurance',
    domain: 'quality-assurance',
    description: 'Procedures for verifying the performance of linear accelerators.',
    mastery: 0,
    connections: ['tolerance-limits', 'output-calibration'],
    discovered: false,
    position: { x: 100, y: 300 },
    lastPracticed: Date.now()
  },
  {
    id: 'gamma-analysis',
    name: 'Gamma Analysis',
    domain: 'quality-assurance',
    description: 'A method for comparing measured dose distributions to calculated ones, often used in IMRT QA.',
    mastery: 0,
    connections: ['imrt'],
    discovered: false,
    position: { x: 150, y: 350 },
    lastPracticed: Date.now()
  },
  
  // Clinical Practice Domain
  {
    id: 'treatment-planning',
    name: 'Treatment Planning',
    domain: 'clinical-practice',
    description: 'The process of determining the appropriate radiation dose distribution for tumor treatment.',
    mastery: 0,
    connections: ['dose-prescription', 'target-volumes', 'organs-at-risk'],
    discovered: false,
    position: { x: 500, y: 150 },
    lastPracticed: Date.now()
  },
  {
    id: 'dose-prescription',
    name: 'Dose Prescription',
    domain: 'clinical-practice',
    description: 'The radiation oncologist\'s specification of the radiation dose to be delivered.',
    mastery: 0,
    connections: ['treatment-planning', 'fractionation'],
    discovered: false,
    position: { x: 550, y: 200 },
    lastPracticed: Date.now()
  },
  {
    id: 'fractionation',
    name: 'Fractionation',
    domain: 'clinical-practice',
    description: 'The practice of dividing the total radiation dose into multiple smaller doses over time.',
    mastery: 0,
    connections: ['dose-prescription'],
    discovered: false,
    position: { x: 600, y: 250 },
    lastPracticed: Date.now()
  },
  {
    id: 'target-volumes',
    name: 'Target Volumes',
    domain: 'clinical-practice',
    description: 'Defined volumes for radiation planning including GTV, CTV, and PTV.',
    mastery: 0,
    connections: ['treatment-planning', 'organs-at-risk'],
    discovered: false,
    position: { x: 550, y: 300 },
    lastPracticed: Date.now()
  },
  {
    id: 'organs-at-risk',
    name: 'Organs at Risk',
    domain: 'clinical-practice',
    description: 'Normal tissues whose radiation sensitivity may influence treatment planning.',
    mastery: 0,
    connections: ['treatment-planning', 'target-volumes'],
    discovered: false,
    position: { x: 600, y: 350 },
    lastPracticed: Date.now()
  },
  
  // Radiation Protection Domain
  {
    id: 'radiation-safety',
    name: 'Radiation Safety',
    domain: 'radiation-protection',
    description: 'Principles and practices for minimizing radiation exposure to patients, staff, and the public.',
    mastery: 0,
    connections: ['inverse-square-law', 'alara-principle'],
    discovered: false,
    position: { x: 400, y: 150 },
    lastPracticed: Date.now()
  },
  {
    id: 'alara-principle',
    name: 'ALARA Principle',
    domain: 'radiation-protection',
    description: 'The principle that radiation exposure should be kept "As Low As Reasonably Achievable".',
    mastery: 0,
    connections: ['radiation-safety', 'dose-limits', 'personal-dosimetry'],
    discovered: false,
    position: { x: 450, y: 200 },
    lastPracticed: Date.now()
  },
  {
    id: 'dose-limits',
    name: 'Dose Limits',
    domain: 'radiation-protection',
    description: 'Regulatory restrictions on radiation dose for workers and the public.',
    mastery: 0,
    connections: ['alara-principle'],
    discovered: false,
    position: { x: 500, y: 250 },
    lastPracticed: Date.now()
  },
  {
    id: 'shielding',
    name: 'Shielding',
    domain: 'radiation-protection',
    description: 'Materials used to reduce radiation exposure.',
    mastery: 0,
    connections: ['attenuation', 'half-value-layer', 'alara-principle'],
    discovered: false,
    position: { x: 450, y: 300 },
    lastPracticed: Date.now()
  },
  {
    id: 'personal-dosimetry',
    name: 'Personal Dosimetry',
    domain: 'radiation-protection',
    description: 'Monitoring of radiation dose received by individuals.',
    mastery: 0,
    connections: ['alara-principle', 'radiation-survey'],
    discovered: false,
    position: { x: 500, y: 350 },
    lastPracticed: Date.now()
  },
  
  // Kapoor calibration node specific concepts (initially discovered)
  {
    id: 'radiation-dosimetry',
    name: 'Radiation Dosimetry',
    domain: 'radiation-physics',
    description: 'The measurement of absorbed dose delivered by ionizing radiation.',
    mastery: 25,
    connections: ['dosimetry-principles', 'linear-energy-transfer'],
    discovered: true,
    position: { x: 300, y: 250 },
    lastPracticed: Date.now()
  },
  {
    id: 'ptp-correction',
    name: 'Temperature and Pressure Correction',
    domain: 'quality-assurance',
    description: 'Correction factors applied to ionization chamber measurements to account for atmospheric conditions.',
    mastery: 0,
    connections: ['output-calibration', 'calibration-factors'],
    discovered: false,
    position: { x: 200, y: 250 },
    lastPracticed: Date.now()
  },
  {
    id: 'calibration-factors',
    name: 'Calibration Factors',
    domain: 'quality-assurance',
    description: 'Factors applied to convert measured ionization to absorbed dose.',
    mastery: 0,
    connections: ['ptp-correction', 'output-calibration'],
    discovered: false,
    position: { x: 250, y: 275 },
    lastPracticed: Date.now()
  },
  {
    id: 'clinical-dose-significance',
    name: 'Clinical Dose Significance',
    domain: 'clinical-practice',
    description: 'The impact of dose variations on clinical outcomes and patient treatment.',
    mastery: 0,
    connections: ['dose-prescription', 'output-calibration'],
    discovered: false,
    position: { x: 535, y: 225 },
    lastPracticed: Date.now()
  },
  
  // Boss-related concepts
  {
    id: 'ionix-anomaly',
    name: 'Ionix Anomaly',
    domain: 'theoretical',
    description: 'Unusual quantum behavior observed in experimental ion chambers.',
    mastery: 0,
    connections: ['quantum-effects'],
    discovered: false,
    position: { x: 350, y: 400 },
    lastPracticed: Date.now()
  },
  {
    id: 'quantum-effects',
    name: 'Quantum Effects',
    domain: 'theoretical',
    description: 'Quantum mechanical phenomena affecting radiation interactions and detection.',
    mastery: 0,
    connections: ['ionix-anomaly'],
    discovered: false,
    position: { x: 400, y: 450 },
    lastPracticed: Date.now()
  }
];

/**
 * Builds visual constellation connections from node data
 * Only creates connections between discovered nodes
 */
const buildInitialConnections = (nodes: ConceptNode[]): ConceptConnection[] => {
  const connections: ConceptConnection[] = [];
  const processedPairs = new Set<string>();
  
  nodes.forEach(node => {
    if (!node.discovered) return;
    
    node.connections.forEach(targetId => {
      // Prevent duplicate connections
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

/**
 * Calculates mastery level for each knowledge domain
 * with safety checks for domain validity
 */
const calculateDomainMastery = (nodes: ConceptNode[]): Record<KnowledgeDomain, number> => {
  // Initialize accumulator for each domain
  const domainTotals: Record<string, {sum: number, count: number}> = {};
  
  // Ensure all domains are initialized
  (Object.keys(KNOWLEDGE_DOMAINS) as KnowledgeDomain[]).forEach(domain => {
    domainTotals[domain] = {sum: 0, count: 0};
  });
  
  // Only consider discovered nodes
  nodes.filter(node => node.discovered).forEach(node => {
    // Safely access the domain or fall back to 'general'
    const domain = domainTotals[node.domain] ? node.domain : 'general';
    
    if (domain !== node.domain) {
      console.warn(`Unknown domain "${node.domain}" for node "${node.id}", using "general" instead`);
    }
    
    domainTotals[domain].sum += node.mastery;
    domainTotals[domain].count += 1;
  });
  
  // Calculate average mastery for each domain
  const result = {} as Record<KnowledgeDomain, number>;
  (Object.keys(KNOWLEDGE_DOMAINS) as KnowledgeDomain[]).forEach(domain => {
    result[domain] = domainTotals[domain].count > 0 
      ? Math.round(domainTotals[domain].sum / domainTotals[domain].count) 
      : 0;
  });
  
  return result;
};

/**
 * Calculates overall mastery across all domains
 * Weighted by number of concepts in each domain
 */
const calculateTotalMastery = (domainMastery: Record<KnowledgeDomain, number>, nodes: ConceptNode[]): number => {
  // Count discovered nodes per domain for weighting
  const domainCounts: Record<KnowledgeDomain, number> = {} as Record<KnowledgeDomain, number>;
  let totalNodes = 0;
  
  // Initialize all domains with 0
  (Object.keys(KNOWLEDGE_DOMAINS) as KnowledgeDomain[]).forEach(domain => {
    domainCounts[domain] = 0;
  });
  
  // Count discovered nodes in each domain
  nodes.filter(node => node.discovered).forEach(node => {
    if (domainCounts[node.domain] !== undefined) {
      domainCounts[node.domain]++;
      totalNodes++;
    }
  });
  
  // If no nodes discovered yet, return 0
  if (totalNodes === 0) return 0;
  
  // Calculate weighted average
  let weightedSum = 0;
  (Object.keys(KNOWLEDGE_DOMAINS) as KnowledgeDomain[]).forEach(domain => {
    weightedSum += domainMastery[domain] * (domainCounts[domain] / totalNodes);
  });
  
  return Math.round(weightedSum);
};

/**
 * Determines mastery level category based on numeric value
 */
export const getMasteryLevel = (mastery: number): MasteryLevel => {
  if (mastery < 10) return 'undiscovered';
  if (mastery < 40) return 'introduced';
  if (mastery < 80) return 'practicing';
  return 'mastered';
};

// Create the knowledge store with Zustand
export const useKnowledgeStore = create<KnowledgeState>((set, get) => {
  // Build initial state
  const initialConnections = buildInitialConnections(medicalPhysicsConcepts);
  const initialDomainMastery = calculateDomainMastery(medicalPhysicsConcepts);
  const initialTotalMastery = calculateTotalMastery(initialDomainMastery, medicalPhysicsConcepts);
  
  return {
    // Initial state
    nodes: medicalPhysicsConcepts,
    connections: initialConnections,
    journalEntries: [],
    pendingInsights: [],
    domainMastery: initialDomainMastery,
    totalMastery: initialTotalMastery,
    newlyDiscovered: [],
    
    // Add a new concept to the constellation
    addConcept: (concept) => {
      const id = nanoid();
      
      // Validate domain before adding
      const validDomain = Object.keys(KNOWLEDGE_DOMAINS).includes(concept.domain as string) 
        ? concept.domain 
        : 'general' as KnowledgeDomain;
      
      if (validDomain !== concept.domain) {
        console.warn(`Invalid domain "${concept.domain}" changed to "general" for concept: ${concept.name}`);
      }
      
      set(state => {
        const newNode: ConceptNode = {
          id,
          ...concept,
          domain: validDomain,
          connections: [],
          discovered: false,
          lastPracticed: Date.now()
        };
        
        const updatedNodes = [...state.nodes, newNode];
        
        return { nodes: updatedNodes };
      });
      
      return id;
    },
    
    // Discover a previously unknown concept
    discoverConcept: (conceptId) => {
      set(state => {
        // Skip if already discovered
        if (state.nodes.find(n => n.id === conceptId)?.discovered) {
          return state;
        }
        
        // Mark node as discovered
        const updatedNodes = state.nodes.map(node => 
          node.id === conceptId 
            ? { ...node, discovered: true, lastPracticed: Date.now() } 
            : node
        );
        
        // Recalculate domain mastery
        const domainMastery = calculateDomainMastery(updatedNodes);
        const totalMastery = calculateTotalMastery(domainMastery, updatedNodes);
        
        return {
          nodes: updatedNodes,
          domainMastery,
          totalMastery,
          newlyDiscovered: [...state.newlyDiscovered, conceptId]
        };
      });
    },
    
    // Update mastery level for a concept
    updateMastery: (conceptId, amount) => {
      set(state => {
        // Find the node
        const node = state.nodes.find(n => n.id === conceptId);
        if (!node) {
          console.warn(`Concept not found: ${conceptId}`);
          return state;
        }
        
        // Calculate new mastery (capped at 0-100%)
        const newMastery = Math.min(100, Math.max(0, node.mastery + amount));
        
        // Auto-discover node if gaining mastery for the first time
        const shouldDiscover = !node.discovered && amount > 0;
        
        // Update node mastery and timestamp
        const updatedNodes = state.nodes.map(node => 
          node.id === conceptId 
            ? { 
                ...node, 
                mastery: newMastery,
                discovered: node.discovered || shouldDiscover,
                lastPracticed: Date.now()
              } 
            : node
        );
        
        // Update connection strengths for all affected connections
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
        
        // Track pending insights for night phase transfer
        let pendingInsights = [...state.pendingInsights];
        if (amount > 0) {
          pendingInsights.push({
            conceptId,
            amount
          });
        }
        
        // Track newly discovered concepts for animation
        const newlyDiscovered = shouldDiscover
          ? [...state.newlyDiscovered, conceptId]
          : state.newlyDiscovered;
        
        // Recalculate domain mastery metrics
        const domainMastery = calculateDomainMastery(updatedNodes);
        const totalMastery = calculateTotalMastery(domainMastery, updatedNodes);
        
        console.log(`Updated mastery for ${conceptId}: ${node.mastery} -> ${newMastery}`);
        
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
        // Validate nodes exist and are discovered
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
        
        // Create new connection with strength based on node mastery
        const newConnection: ConceptConnection = {
          source: sourceId,
          target: targetId,
          strength: (sourceNode.mastery + targetNode.mastery) / 2,
          discovered: true
        };
        
        // Update nodes to include connection references
        const updatedNodes = state.nodes.map(node => {
          if (node.id === sourceId && !node.connections.includes(targetId)) {
            return {
              ...node,
              connections: [...node.connections, targetId],
              lastPracticed: Date.now() // Forming connections refreshes concepts
            };
          }
          if (node.id === targetId && !node.connections.includes(sourceId)) {
            return {
              ...node,
              connections: [...node.connections, sourceId],
              lastPracticed: Date.now()
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
    
    // Discover an existing but previously hidden connection
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
        
        // Update connection visibility
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
    
    // Add a journal entry and apply its mastery gain
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
    
    // Apply knowledge decay based on time since last practice
    // This models how human memory fades without reinforcement
    applyKnowledgeDecay: () => {
      const now = Date.now();
      const decayThresholdDays = 3; // Days before decay begins
      const decayRatePerDay = 0.7; // % mastery lost per day after threshold
      
      set(state => {
        let needsMetricsUpdate = false;
        
        // Apply decay to each node
        const updatedNodes = state.nodes.map(node => {
          if (!node.discovered || !node.lastPracticed) return node;
          
          // Calculate days since last practice
          const daysSinceLastPractice = (now - node.lastPracticed) / (1000 * 60 * 60 * 24);
          
          // Only decay after threshold
          if (daysSinceLastPractice <= decayThresholdDays) return node;
          
          // Calculate decay amount
          const decayDays = daysSinceLastPractice - decayThresholdDays;
          const decayAmount = decayDays * decayRatePerDay;
          
          // Apply decay with diminishing returns (harder to forget mastered concepts)
          const masteryRetention = 0.75 + (0.25 * (node.mastery / 100)); // 75-100% retention rate
          const adjustedDecay = decayAmount * (1 - masteryRetention);
          
          // Don't decay below 10% (core understanding remains)
          const newMastery = Math.max(10, node.mastery - adjustedDecay);
          
          // Only update if there's a meaningful change
          if (Math.abs(newMastery - node.mastery) >= 0.5) {
            needsMetricsUpdate = true;
            return { ...node, mastery: newMastery };
          }
          
          return node;
        });
        
        // Recalculate metrics only if needed
        if (!needsMetricsUpdate) return { nodes: updatedNodes };
        
        // Update connection strengths based on new mastery levels
        const updatedConnections = state.connections.map(conn => {
          const sourceNode = updatedNodes.find(n => n.id === conn.source);
          const targetNode = updatedNodes.find(n => n.id === conn.target);
          
          if (!sourceNode || !targetNode) return conn;
          
          return {
            ...conn,
            strength: (sourceNode.mastery + targetNode.mastery) / 2
          };
        });
        
        // Recalculate domain mastery
        const domainMastery = calculateDomainMastery(updatedNodes);
        const totalMastery = calculateTotalMastery(domainMastery, updatedNodes);
        
        return {
          nodes: updatedNodes,
          connections: updatedConnections,
          domainMastery,
          totalMastery
        };
      });
    },
    
    // Transfer pending insights to the constellation (night phase)
    transferInsights: () => {
      set({ pendingInsights: [] });
    },
    
    // Reset newly discovered tracking after animations complete
    resetNewlyDiscovered: () => {
      set({ newlyDiscovered: [] });
    },
    
    // Import knowledge data (for development/testing)
    importKnowledgeData: (data) => {
      if (!data) return;
      
      set(state => {
        // Import provided data with fallbacks to current state
        const nodes = data.nodes || state.nodes;
        const connections = data.connections || buildInitialConnections(nodes);
        
        // Recalculate domain mastery
        const domainMastery = calculateDomainMastery(nodes);
        const totalMastery = calculateTotalMastery(domainMastery, nodes);
        
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
      const domainMastery = calculateDomainMastery(medicalPhysicsConcepts);
      const totalMastery = calculateTotalMastery(domainMastery, medicalPhysicsConcepts);
      
      set({
        nodes: medicalPhysicsConcepts,
        connections: buildInitialConnections(medicalPhysicsConcepts),
        journalEntries: [],
        pendingInsights: [],
        domainMastery,
        totalMastery,
        newlyDiscovered: []
      });
    }
  };
});