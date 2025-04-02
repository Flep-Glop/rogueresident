// app/utils/knowledgeRequirements.ts
import { useKnowledgeStore, ConceptNode, KnowledgeDomain, KNOWLEDGE_DOMAINS } from '../store/knowledgeStore';

/**
 * Knowledge requirement for dialogue options, challenge unlocks, special actions
 */
export type KnowledgeRequirement = 
  | { conceptId: string; minimumMastery: number }
  | { domain: KnowledgeDomain; minimumMastery: number };

/**
 * Check if the player meets a knowledge requirement
 * @param requirement Knowledge requirement to check
 * @returns Boolean indicating if requirement is met
 */
export function meetsRequirement(requirement: KnowledgeRequirement): boolean {
  const { nodes, domainMastery } = useKnowledgeStore.getState();
  
  // Check domain requirement
  if ('domain' in requirement) {
    const domainLevel = domainMastery[requirement.domain] || 0;
    return domainLevel >= requirement.minimumMastery;
  }
  
  // Check concept requirement
  if ('conceptId' in requirement) {
    const concept = nodes.find(n => n.id === requirement.conceptId);
    if (!concept || !concept.discovered) return false;
    
    return concept.mastery >= requirement.minimumMastery;
  }
  
  return false;
}

/**
 * Get information about what knowledge is missing to meet a requirement
 * @param requirement Knowledge requirement that isn't met
 * @returns String explaining what knowledge is needed
 */
export function getMissingKnowledgeInfo(requirement: KnowledgeRequirement): string {
  const { nodes, domainMastery } = useKnowledgeStore.getState();
  
  // Domain requirement info
  if ('domain' in requirement) {
    const domainInfo = KNOWLEDGE_DOMAINS[requirement.domain];
    const currentLevel = domainMastery[requirement.domain] || 0;
    
    if (!domainInfo) {
      return `Knowledge in an unknown domain is required.`;
    }
    
    return `Requires ${requirement.minimumMastery}% mastery in ${domainInfo.name} (current: ${currentLevel}%)`;
  }
  
  // Concept requirement info
  if ('conceptId' in requirement) {
    const concept = nodes.find(n => n.id === requirement.conceptId);
    
    if (!concept) {
      return `Knowledge of an unknown concept is required.`;
    }
    
    if (!concept.discovered) {
      return `Knowledge of "${concept.name}" is required but hasn't been discovered yet.`;
    }
    
    return `Requires ${requirement.minimumMastery}% mastery of "${concept.name}" (current: ${concept.mastery}%)`;
  }
  
  return "Unknown knowledge requirement.";
}

/**
 * Get insight bonus based on relevant knowledge
 * @param domain The knowledge domain relevant to the challenge/dialogue
 * @returns Percentage bonus to insight gain (0-25%)
 */
export function getInsightBonus(domain: KnowledgeDomain): number {
  const { domainMastery } = useKnowledgeStore.getState();
  
  // Convert domain mastery to insight bonus
  // Formula: Every 10% of domain mastery gives 2.5% insight bonus (capped at 25%)
  return Math.min(25, Math.floor(domainMastery[domain] / 10) * 2.5);
}

/**
 * Get a list of concepts that share a domain with the given concept
 * @param conceptId Source concept ID
 * @returns Array of related concepts in the same domain
 */
export function getRelatedConcepts(conceptId: string): ConceptNode[] {
  const { nodes } = useKnowledgeStore.getState();
  
  const sourceNode = nodes.find(n => n.id === conceptId);
  if (!sourceNode || !sourceNode.discovered) return [];
  
  // Find other discovered nodes in the same domain
  return nodes.filter(n => 
    n.id !== conceptId && 
    n.discovered && 
    n.domain === sourceNode.domain
  );
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
        const sourceConns = connections
          .filter(conn => conn.source === source.id || conn.target === source.id)
          .map(conn => conn.source === source.id ? conn.target : conn.source);
          
        const targetConns = connections
          .filter(conn => conn.source === target.id || conn.target === target.id)
          .map(conn => conn.source === target.id ? conn.target : conn.source);
          
        const sharedConnections = sourceConns.filter(id => targetConns.includes(id));
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
 * Get the list of concepts that meet a certain mastery threshold
 * @param minimumMastery Minimum mastery level (0-100)
 * @returns Array of concepts meeting the threshold
 */
export function getExpertiseConcepts(minimumMastery: number = 50): ConceptNode[] {
  const { nodes } = useKnowledgeStore.getState();
  
  return nodes
    .filter(concept => concept.discovered && concept.mastery >= minimumMastery);
}

/**
 * Get the domain with highest average mastery
 * @returns Domain ID and average mastery
 */
export function getStrongestDomain(): { domainId: KnowledgeDomain; averageMastery: number } {
  const { domainMastery } = useKnowledgeStore.getState();
  
  let strongestDomain: KnowledgeDomain = 'general';
  let highestMastery = 0;
  
  Object.entries(domainMastery).forEach(([domain, mastery]) => {
    if (mastery > highestMastery) {
      strongestDomain = domain as KnowledgeDomain;
      highestMastery = mastery;
    }
  });
  
  return { 
    domainId: strongestDomain, 
    averageMastery: highestMastery 
  };
}

/**
 * Apply a concept-specific knowledge update from a challenge or dialogue
 * @param conceptId The concept to update
 * @param amount Amount of mastery to add
 * @param source Source of the knowledge (for journal entry)
 * @param content Description of what was learned
 */
export function applyKnowledgeUpdate(
  conceptId: string, 
  amount: number, 
  source: 'challenge' | 'dialogue' | 'item' | 'observation' = 'challenge',
  content: string = ''
): void {
  const { updateMastery, addJournalEntry } = useKnowledgeStore.getState();
  
  // First update mastery level
  updateMastery(conceptId, amount);
  
  // Then add journal entry if content provided
  if (content) {
    addJournalEntry({
      conceptId,
      content,
      masteryGained: amount,
      source
    });
  }
}