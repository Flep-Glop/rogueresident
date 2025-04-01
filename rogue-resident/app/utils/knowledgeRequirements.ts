// app/utils/knowledgeRequirements.ts
import { useKnowledgeStore } from '../store/knowledgeStore';
import { KNOWLEDGE_DOMAINS } from '../components/knowledge/ConstellationView';

// For dialogue options, challenge unlocks, special actions
export interface KnowledgeRequirement {
  conceptId?: string;         // Specific concept required
  domain?: keyof typeof KNOWLEDGE_DOMAINS;  // Domain knowledge required
  masteryLevel: number;       // Minimum mastery required (0-100)
}

/**
 * Check if the player meets a knowledge requirement
 */
export function meetsRequirement(requirement: KnowledgeRequirement): boolean {
  const { nodes, domainMastery } = useKnowledgeStore.getState();
  
  // Check concept-specific requirement
  if (requirement.conceptId) {
    const concept = nodes.find(node => node.id === requirement.conceptId);
    if (!concept || !concept.discovered) return false;
    return concept.mastery >= requirement.masteryLevel;
  }
  
  // Check domain-wide requirement
  if (requirement.domain) {
    return domainMastery[requirement.domain] >= requirement.masteryLevel;
  }
  
  return false;
}

/**
 * Get insight bonus based on relevant knowledge
 * @param domainKey The knowledge domain relevant to the challenge/dialogue
 * @returns Percentage bonus to insight gain (0-100%)
 */
export function getInsightBonus(domainKey: keyof typeof KNOWLEDGE_DOMAINS): number {
  const { domainMastery } = useKnowledgeStore.getState();
  
  // Convert domain mastery to insight bonus
  // Formula: Every 10% of domain mastery gives 2.5% insight bonus (capped at 25%)
  return Math.min(25, Math.floor(domainMastery[domainKey] / 10) * 2.5);
}

/**
 * Get a list of concepts that are close to forming new connections
 * @returns Array of concept pairs that could form new connections
 */
export function getPotentialConnections(): Array<{sourceId: string, targetId: string, similarity: number}> {
  const { nodes, connections } = useKnowledgeStore.getState();
  const potentialConnections: Array<{sourceId: string, targetId: string, similarity: number}> = [];
  
  // Only consider discovered nodes
  const discoveredNodes = nodes.filter(node => node.discovered);
  
  // Check each pair of nodes
  for (let i = 0; i < discoveredNodes.length; i++) {
    for (let j = i + 1; j < discoveredNodes.length; j++) {
      const source = discoveredNodes[i];
      const target = discoveredNodes[j];
      
      // Skip if connection already exists
      const alreadyConnected = connections.some(
        conn => (conn.source === source.id && conn.target === target.id) ||
                (conn.source === target.id && conn.target === source.id)
      );
      
      if (!alreadyConnected) {
        // Calculate "similarity" or connection potential
        // Based on: Same domain (+50 pts), shared connections (+10 pts each), mastery level (up to +40 pts)
        let similarity = 0;
        
        // Same domain bonus
        if (source.domain === target.domain) {
          similarity += 50;
        }
        
        // Shared connections bonus
        const sourceConnections = new Set(source.connections);
        const sharedConnections = target.connections.filter(id => sourceConnections.has(id));
        similarity += sharedConnections.length * 10;
        
        // Mastery level bonus - higher mastery means better ability to form connections
        const masteryBonus = (source.mastery + target.mastery) / 5; // 0-40 points
        similarity += masteryBonus;
        
        // Only suggest connections with reasonable similarity
        if (similarity > 40) {
          potentialConnections.push({
            sourceId: source.id,
            targetId: target.id,
            similarity: Math.min(100, similarity)
          });
        }
      }
    }
  }
  
  // Sort by similarity (highest first)
  return potentialConnections.sort((a, b) => b.similarity - a.similarity);
}

/**
 * Get missing knowledge for a specific requirement
 * @returns Information about what knowledge is needed
 */
export function getMissingKnowledgeInfo(requirement: KnowledgeRequirement): string {
  const { nodes, domainMastery } = useKnowledgeStore.getState();
  
  if (requirement.conceptId) {
    const concept = nodes.find(node => node.id === requirement.conceptId);
    if (!concept) {
      return `Missing knowledge: Unknown concept`;
    }
    
    if (!concept.discovered) {
      return `This requires discovering "${concept.name}"`;
    }
    
    return `Requires ${requirement.masteryLevel}% mastery of "${concept.name}" (current: ${concept.mastery}%)`;
  }
  
  if (requirement.domain) {
    const domain = KNOWLEDGE_DOMAINS[requirement.domain];
    const currentMastery = domainMastery[requirement.domain];
    return `Requires ${requirement.masteryLevel}% mastery in ${domain.name} (current: ${currentMastery}%)`;
  }
  
  return 'Unknown knowledge requirement';
}