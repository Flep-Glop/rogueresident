// app/core/dialogue/WriterToolsIntegration.ts
/**
 * Writer Tools Integration
 * 
 * Bridges the gap between narrative design and technical implementation,
 * providing writer-friendly tools for dialogue creation and management.
 * 
 * Inspired by Supergiant's custom narrative design tools that enable
 * writers to focus on storytelling while maintaining technical correctness.
 */

import { 
    AuthoredDialogue, 
    validateAuthoredDialogue, 
    convertAuthoredDialogue 
  } from './DialogueAuthoringFormat';
  import { useEventBus } from '../events/CentralEventBus';
  import { GameEventType } from '../events/EventTypes';
  
  // Types for writer tools
  export interface DialogueExportFormat {
    dialogues: AuthoredDialogue[];
    version: string;
    lastExported: string;
    contentStats: {
      totalDialogues: number;
      totalNodes: number;
      totalOptions: number;
      wordCount: number;
      characterCount: number;
    };
  }
  
  export interface DialogueImportResult {
    success: boolean;
    dialoguesImported: number;
    errors: string[];
    warnings: string[];
  }
  
  export interface ValidationReport {
    dialogueId: string;
    title: string;
    character: string;
    valid: boolean;
    errors: string[];
    warnings: string[];
    criticalPathComplete: boolean;
    unreachableNodes: string[];
    deadEndNodes: string[];
    wordCount: number;
  }
  
  /**
   * Export dialogues to Ink format
   * 
   * This converts our authored dialogues to a format compatible with Ink,
   * allowing use of Inky editor for visual editing of dialogue flow.
   */
  export function exportToInk(dialogues: AuthoredDialogue[]): string {
    let inkContent = "// Rogue Resident Dialogue Export\n";
    inkContent += "// Generated: " + new Date().toISOString() + "\n\n";
    
    dialogues.forEach(dialogue => {
      // Start with dialogue header
      inkContent += `// === ${dialogue.title} ===\n`;
      inkContent += `// Character: ${dialogue.character}\n`;
      inkContent += `// ID: ${dialogue.id}\n\n`;
      
      // Create a knot for each node
      dialogue.nodes.forEach(node => {
        // Start knot with node ID
        inkContent += `=== ${node.id} ===\n`;
        
        // Add node text
        inkContent += `${node.text}\n\n`;
        
        // Add critical path marker if needed
        if (node.isCriticalPath) {
          inkContent += `// CRITICAL PATH\n`;
        }
        
        // Handle options
        if (node.options && node.options.length > 0) {
          node.options.forEach(option => {
            // Format the option with appropriate divert
            const targetKnot = option.next || node.next || 'END';
            
            // Add option with any modifiers
            let optionText = `* [${option.text}]`;
            
            // Add response if available
            if (option.response) {
              optionText += ` ${option.response}`;
            }
            
            // Add divert to next node
            optionText += ` -> ${targetKnot}\n`;
            
            // Add critical path marker if needed
            if (option.isCriticalPath) {
              optionText = `// CRITICAL PATH\n${optionText}`;
            }
            
            inkContent += optionText;
          });
          inkContent += '\n';
        } else if (node.next) {
          // Simple divert for nodes without options
          inkContent += `-> ${node.next}\n\n`;
        } else if (node.isConclusion) {
          // End the flow
          inkContent += `-> END\n\n`;
        }
      });
      
      inkContent += '\n\n';
    });
    
    return inkContent;
  }
  
  /**
   * Import dialogues from ink format
   * 
   * This is a simplified parser for ink format that converts basic ink
   * into our authored dialogue format. A full parser would be more complex.
   */
  export function importFromInk(inkContent: string): DialogueImportResult {
    const result: DialogueImportResult = {
      success: false,
      dialoguesImported: 0,
      errors: [],
      warnings: [],
    };
    
    try {
      const lines = inkContent.split('\n');
      const dialogues: AuthoredDialogue[] = [];
      let currentDialogue: Partial<AuthoredDialogue> | null = null;
      let currentNode: any = null;
      
      // Very simplified parsing for demonstration
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Skip empty lines and comments
        if (!line || line.startsWith('//')) continue;
        
        // Check for dialogue header
        if (line.startsWith('// === ') && line.endsWith(' ===')) {
          // Start a new dialogue
          if (currentDialogue) {
            // Finalize previous dialogue
            dialogues.push(currentDialogue as AuthoredDialogue);
          }
          
          // Extract title
          const title = line.replace('// === ', '').replace(' ===', '');
          
          // Get character from next line
          let character = 'unknown';
          if (i + 1 < lines.length && lines[i + 1].startsWith('// Character:')) {
            character = lines[i + 1].replace('// Character:', '').trim();
            i++; // Skip the character line
          }
          
          // Get ID from next line
          let id = `dialogue-${Date.now()}`;
          if (i + 1 < lines.length && lines[i + 1].startsWith('// ID:')) {
            id = lines[i + 1].replace('// ID:', '').trim();
            i++; // Skip the ID line
          }
          
          // Create new dialogue
          currentDialogue = {
            id,
            title,
            character,
            type: 'challenge',
            version: '1.0.0',
            initialNodeId: '',
            nodes: []
          };
          
          currentNode = null;
        }
        // Check for knot declaration
        else if (line.startsWith('===') && line.endsWith('===')) {
          // Finalize previous node if exists
          if (currentNode && currentDialogue) {
            currentDialogue.nodes!.push(currentNode);
            
            // Set initial node if not set
            if (!currentDialogue.initialNodeId && currentDialogue.nodes!.length === 1) {
              currentDialogue.initialNodeId = currentNode.id;
            }
          }
          
          // Extract node ID
          const nodeId = line.replace('===', '').replace('===', '').trim();
          
          // Create new node
          currentNode = {
            id: nodeId,
            character: currentDialogue?.character || 'unknown',
            text: '',
            options: [],
            isCriticalPath: false,
            isConclusion: false,
            tags: []
          };
        }
        // Check for normal content (dialogue text)
        else if (currentNode && !line.startsWith('*') && !line.startsWith('->')) {
          // Append to node text
          currentNode.text += line + ' ';
        }
        // Check for option
        else if (currentNode && line.startsWith('*')) {
          // Parse option
          const option: any = {
            id: `option-${currentNode.id}-${currentNode.options.length + 1}`,
            text: '',
            isCriticalPath: false
          };
          
          // Check for critical path marker above
          if (i > 0 && lines[i - 1].includes('CRITICAL PATH')) {
            option.isCriticalPath = true;
          }
          
          // Extract option text and response
          if (line.includes('[') && line.includes(']')) {
            const optionText = line.substring(
              line.indexOf('[') + 1,
              line.indexOf(']')
            );
            option.text = optionText;
            
            // Extract response text if present
            const afterBracket = line.substring(line.indexOf(']') + 1);
            if (afterBracket.includes('->')) {
              const responseText = afterBracket.substring(
                0,
                afterBracket.indexOf('->')
              ).trim();
              
              if (responseText) {
                option.response = responseText;
              }
            }
          }
          
          // Extract target
          if (line.includes('->')) {
            const target = line.substring(line.indexOf('->') + 2).trim();
            if (target !== 'END') {
              option.next = target;
            }
          }
          
          // Add option to node
          currentNode.options.push(option);
        }
        // Check for divert
        else if (currentNode && line.startsWith('->')) {
          const target = line.substring(2).trim();
          if (target !== 'END') {
            currentNode.next = target;
          } else {
            currentNode.isConclusion = true;
          }
        }
      }
      
      // Add the last node and dialogue
      if (currentNode && currentDialogue) {
        currentDialogue.nodes!.push(currentNode);
      }
      
      if (currentDialogue) {
        dialogues.push(currentDialogue as AuthoredDialogue);
      }
      
      // Validate imported dialogues
      const validDialogues: AuthoredDialogue[] = [];
      
      dialogues.forEach(dialogue => {
        const validation = validateAuthoredDialogue(dialogue);
        
        if (validation.valid) {
          validDialogues.push(dialogue);
        } else {
          result.warnings.push(`Issues with dialogue "${dialogue.title}": ${validation.errors.join(', ')}`);
        }
      });
      
      // Report results
      result.success = validDialogues.length > 0;
      result.dialoguesImported = validDialogues.length;
      
      if (validDialogues.length < dialogues.length) {
        result.warnings.push(`Only ${validDialogues.length} of ${dialogues.length} dialogues were valid.`);
      }
      
      // If successful, emit import event
      if (result.success) {
        useEventBus.getState().dispatch(GameEventType.UI_BUTTON_CLICKED, {
          componentId: 'writerTools',
          action: 'dialoguesImported',
          metadata: {
            count: validDialogues.length,
            titles: validDialogues.map(d => d.title)
          }
        });
      }
      
      return result;
    } catch (error) {
      result.success = false;
      result.errors.push(`Failed to parse Ink content: ${error instanceof Error ? error.message : String(error)}`);
      return result;
    }
  }
  
  /**
   * Validate a set of dialogues for narrative consistency
   */
  export function validateDialogues(dialogues: AuthoredDialogue[]): ValidationReport[] {
    return dialogues.map(dialogue => {
      // Basic validation
      const validation = validateAuthoredDialogue(dialogue);
      
      // Count words
      const allText = dialogue.nodes
        .map(node => [
          node.text,
          ...(node.options?.map(opt => opt.text) || []),
          ...(node.options?.map(opt => opt.response || '') || [])
        ].join(' '))
        .join(' ');
        
      const wordCount = allText.split(/\s+/).filter(Boolean).length;
      
      // Check critical path
      const criticalPathNodes = dialogue.nodes.filter(node => node.isCriticalPath);
      const criticalPathOptions = dialogue.nodes
        .flatMap(node => (node.options || []).filter(opt => opt.isCriticalPath));
        
      const criticalPathComplete = criticalPathNodes.length > 0 || criticalPathOptions.length > 0;
      
      // Get unreachable nodes
      const reachableNodes = getReachableNodes(dialogue);
      const unreachableNodes = dialogue.nodes
        .filter(node => !reachableNodes.has(node.id))
        .map(node => node.id);
        
      // Get dead end nodes
      const deadEndNodes = dialogue.nodes
        .filter(node => 
          !node.isConclusion && 
          !node.next && 
          (!node.options || node.options.length === 0)
        )
        .map(node => node.id);
      
      return {
        dialogueId: dialogue.id,
        title: dialogue.title,
        character: dialogue.character,
        valid: validation.valid,
        errors: validation.errors,
        warnings: validation.warnings,
        criticalPathComplete,
        unreachableNodes,
        deadEndNodes,
        wordCount
      };
    });
  }
  
  /**
   * Get the set of nodes reachable from the initial node
   */
  function getReachableNodes(dialogue: AuthoredDialogue): Set<string> {
    const reachable = new Set<string>();
    const toVisit: string[] = [dialogue.initialNodeId];
    
    while (toVisit.length > 0) {
      const nodeId = toVisit.pop()!;
      
      // Skip if already visited
      if (reachable.has(nodeId)) continue;
      
      // Mark as reachable
      reachable.add(nodeId);
      
      // Find the node
      const node = dialogue.nodes.find(n => n.id === nodeId);
      if (!node) continue;
      
      // Add next node if exists
      if (node.next) {
        toVisit.push(node.next);
      }
      
      // Add option targets
      node.options?.forEach(option => {
        if (option.next) {
          toVisit.push(option.next);
        }
      });
    }
    
    return reachable;
  }
  
  /**
   * Automatically identify critical paths in a dialogue
   */
  export function identifyCriticalPath(dialogue: AuthoredDialogue): string[] {
    // Strategy for critical path identification:
    // 1. Required path to reach conclusion
    // 2. Nodes that grant important knowledge
    // 3. Nodes that establish character relationship
    // 4. Nodes that progress main story
    
    const criticalNodeIds: string[] = [];
    
    // Find all paths to conclusion nodes
    const conclusionNodes = dialogue.nodes.filter(node => node.isConclusion);
    
    // For each conclusion, work backwards to find required nodes
    conclusionNodes.forEach(conclusion => {
      const requiredPath = findRequiredPath(dialogue, conclusion.id);
      criticalNodeIds.push(...requiredPath.filter(id => !criticalNodeIds.includes(id)));
    });
    
    // Find nodes with important knowledge or relationship impact
    dialogue.nodes.forEach(node => {
      // Check for knowledge teaching points
      if (node.teachingPoints?.some(tp => tp.importance === 'primary')) {
        if (!criticalNodeIds.includes(node.id)) {
          criticalNodeIds.push(node.id);
        }
      }
      
      // Check options for high relationship impact
      node.options?.forEach(option => {
        if (option.relationshipChange && Math.abs(option.relationshipChange) >= 2) {
          if (!criticalNodeIds.includes(node.id)) {
            criticalNodeIds.push(node.id);
          }
        }
      });
    });
    
    return criticalNodeIds;
  }
  
  /**
   * Find nodes that must be visited to reach a target node
   */
  function findRequiredPath(dialogue: AuthoredDialogue, targetNodeId: string): string[] {
    // Build node connections map
    const nodeConnections: Record<string, string[]> = {};
    
    dialogue.nodes.forEach(node => {
      nodeConnections[node.id] = [];
      
      // Add next node connection
      if (node.next) {
        nodeConnections[node.id].push(node.next);
      }
      
      // Add option connections
      node.options?.forEach(option => {
        if (option.next) {
          nodeConnections[node.id].push(option.next);
        }
      });
    });
    
    // Find nodes that lead to the target (reverse mapping)
    const leadsTo: Record<string, string[]> = {};
    
    Object.entries(nodeConnections).forEach(([nodeId, connections]) => {
      connections.forEach(conn => {
        if (!leadsTo[conn]) {
          leadsTo[conn] = [];
        }
        leadsTo[conn].push(nodeId);
      });
    });
    
    // Work backwards from target to find required path
    const requiredPath: string[] = [targetNodeId];
    let current = targetNodeId;
    
    // Keep going until we reach the initial node or a node with multiple paths to it
    while (current !== dialogue.initialNodeId && leadsTo[current]?.length === 1) {
      current = leadsTo[current][0];
      requiredPath.unshift(current);
    }
    
    return requiredPath;
  }
  
  /**
   * Generate statistics about dialogue content
   */
  export function generateDialogueStats(dialogues: AuthoredDialogue[]): {
    totalDialogues: number;
    byCharacter: Record<string, number>;
    totalNodes: number;
    totalOptions: number;
    criticalPathNodes: number;
    totalWordCount: number;
    uniqueTags: string[];
    averageOptionsPerNode: number;
    completionPaths: number;
    deadEnds: number;
  } {
    const stats = {
      totalDialogues: dialogues.length,
      byCharacter: {} as Record<string, number>,
      totalNodes: 0,
      totalOptions: 0,
      criticalPathNodes: 0,
      totalWordCount: 0,
      uniqueTags: [] as string[],
      averageOptionsPerNode: 0,
      completionPaths: 0,
      deadEnds: 0
    };
    
    // Collect tags
    const allTags = new Set<string>();
    
    // Process each dialogue
    dialogues.forEach(dialogue => {
      // Count by character
      stats.byCharacter[dialogue.character] = (stats.byCharacter[dialogue.character] || 0) + 1;
      
      // Count nodes
      stats.totalNodes += dialogue.nodes.length;
      
      // Count critical path nodes
      stats.criticalPathNodes += dialogue.nodes.filter(node => node.isCriticalPath).length;
      
      // Count completion paths
      stats.completionPaths += dialogue.nodes.filter(node => node.isConclusion).length;
      
      // Count options and calculate word count
      dialogue.nodes.forEach(node => {
        // Count options
        const optionsCount = node.options?.length || 0;
        stats.totalOptions += optionsCount;
        
        // Count words in node text
        const nodeText = node.text || '';
        stats.totalWordCount += nodeText.split(/\s+/).filter(Boolean).length;
        
        // Count words in options
        node.options?.forEach(option => {
          const optionText = option.text || '';
          const responseText = option.response || '';
          stats.totalWordCount += optionText.split(/\s+/).filter(Boolean).length;
          stats.totalWordCount += responseText.split(/\s+/).filter(Boolean).length;
        });
        
        // Count dead ends
        if (!node.isConclusion && !node.next && (!node.options || node.options.length === 0)) {
          stats.deadEnds++;
        }
        
        // Collect tags
        node.tags?.forEach(tag => allTags.add(tag));
      });
    });
    
    // Calculate averages
    stats.averageOptionsPerNode = stats.totalNodes > 0 
      ? stats.totalOptions / stats.totalNodes 
      : 0;
      
    // Set unique tags
    stats.uniqueTags = Array.from(allTags);
    
    return stats;
  }
  
  /**
   * Export dialogues to JSON format for easy serialization
   */
  export function exportDialoguesToJSON(dialogues: AuthoredDialogue[]): string {
    const exportData: DialogueExportFormat = {
      dialogues,
      version: '1.0.0',
      lastExported: new Date().toISOString(),
      contentStats: {
        totalDialogues: dialogues.length,
        totalNodes: dialogues.reduce((sum, d) => sum + d.nodes.length, 0),
        totalOptions: dialogues.reduce((sum, d) => 
          sum + d.nodes.reduce((s, n) => s + (n.options?.length || 0), 0), 0),
        wordCount: calculateWordCount(dialogues),
        characterCount: calculateCharacterCount(dialogues)
      }
    };
    
    return JSON.stringify(exportData, null, 2);
  }
  
  /**
   * Calculate total word count for all dialogues
   */
  function calculateWordCount(dialogues: AuthoredDialogue[]): number {
    return dialogues.reduce((sum, dialogue) => {
      return sum + dialogue.nodes.reduce((nodeSum, node) => {
        // Count node text
        let count = node.text.split(/\s+/).filter(Boolean).length;
        
        // Count option text and responses
        count += (node.options || []).reduce((optSum, opt) => {
          return optSum + 
            opt.text.split(/\s+/).filter(Boolean).length + 
            (opt.response ? opt.response.split(/\s+/).filter(Boolean).length : 0);
        }, 0);
        
        return nodeSum + count;
      }, 0);
    }, 0);
  }
  
  /**
   * Calculate total character count for all dialogues
   */
  function calculateCharacterCount(dialogues: AuthoredDialogue[]): number {
    return dialogues.reduce((sum, dialogue) => {
      return sum + dialogue.nodes.reduce((nodeSum, node) => {
        // Count node text
        let count = node.text.length;
        
        // Count option text and responses
        count += (node.options || []).reduce((optSum, opt) => {
          return optSum + 
            opt.text.length + 
            (opt.response ? opt.response.length : 0);
        }, 0);
        
        return nodeSum + count;
      }, 0);
    }, 0);
  }
  
  /**
   * Import dialogues from JSON format
   */
  export function importDialoguesFromJSON(jsonContent: string): DialogueImportResult {
    const result: DialogueImportResult = {
      success: false,
      dialoguesImported: 0,
      errors: [],
      warnings: []
    };
    
    try {
      // Parse JSON
      const data = JSON.parse(jsonContent) as DialogueExportFormat;
      
      // Validate each dialogue
      const validDialogues: AuthoredDialogue[] = [];
      
      data.dialogues.forEach(dialogue => {
        const validation = validateAuthoredDialogue(dialogue);
        
        if (validation.valid) {
          validDialogues.push(dialogue);
        } else {
          result.warnings.push(`Issues with dialogue "${dialogue.title}": ${validation.errors.join(', ')}`);
        }
      });
      
      // Report results
      result.success = validDialogues.length > 0;
      result.dialoguesImported = validDialogues.length;
      
      if (validDialogues.length < data.dialogues.length) {
        result.warnings.push(`Only ${validDialogues.length} of ${data.dialogues.length} dialogues were valid.`);
      }
      
      // If successful, emit import event
      if (result.success) {
        useEventBus.getState().dispatch(GameEventType.UI_BUTTON_CLICKED, {
          componentId: 'writerTools',
          action: 'dialoguesImported',
          metadata: {
            count: validDialogues.length,
            titles: validDialogues.map(d => d.title),
            source: 'json'
          }
        });
      }
      
      return result;
    } catch (error) {
      result.success = false;
      result.errors.push(`Failed to parse JSON content: ${error instanceof Error ? error.message : String(error)}`);
      return result;
    }
  }
  
  /**
   * Visualize dialogue flow structure
   * 
   * This generates a DOT format representation of the dialogue
   * that can be rendered with GraphViz or similar tools.
   */
  export function generateDialogueVisualization(dialogue: AuthoredDialogue): string {
    let dot = 'digraph G {\n';
    dot += '  rankdir=LR;\n';
    dot += '  node [shape=box, style=rounded];\n\n';
    
    // Define nodes
    dialogue.nodes.forEach(node => {
      const nodeLabel = node.text.substring(0, 30) + (node.text.length > 30 ? '...' : '');
      const nodeShape = node.isCriticalPath ? 'box,style=filled,fillcolor=gold' : 
                       node.isConclusion ? 'oval' : 'box';
                       
      dot += `  "${node.id}" [label="${nodeLabel}", shape=${nodeShape}];\n`;
    });
    
    dot += '\n';
    
    // Define edges
    dialogue.nodes.forEach(node => {
      // Add direct next connection
      if (node.next) {
        dot += `  "${node.id}" -> "${node.next}";\n`;
      }
      
      // Add option connections
      node.options?.forEach(option => {
        if (option.next) {
          const edgeStyle = option.isCriticalPath ? 'color=red,penwidth=2.0' : '';
          const styleAttr = edgeStyle ? ` [${edgeStyle}]` : '';
          dot += `  "${node.id}" -> "${option.next}"${styleAttr};\n`;
        }
      });
    });
    
    dot += '}\n';
    
    return dot;
  }
  
  export default {
    exportToInk,
    importFromInk,
    validateDialogues,
    identifyCriticalPath,
    generateDialogueStats,
    exportDialoguesToJSON,
    importDialoguesFromJSON,
    generateDialogueVisualization
  };