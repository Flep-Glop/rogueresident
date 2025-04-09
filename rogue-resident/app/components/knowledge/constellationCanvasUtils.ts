// app/components/knowledge/constellationCanvasUtils.ts
import { KnowledgeDomain, ConceptNode, ConceptConnection } from '../../store/knowledgeStore';
import { DOMAIN_COLORS, DOMAIN_COLORS_LIGHT } from '../../core/themeConstants';

// Helper type for particle effects
type ParticleEffect = {
  id: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  opacity?: number;
  velocity?: { x: number, y: number }
};

/**
 * Converts a hex color string to an rgba string.
 */
export const hexToRgba = (hex: string, alpha: number = 1): string => {
  hex = hex.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/**
 * Draws a starry background with subtle nebula effects.
 */
export const drawStarryBackground = (ctx: CanvasRenderingContext2D, width: number, height: number): void => {
  // Fill with deep space color
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  // Create distant stars
  for (let i = 0; i < 300; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const radius = Math.random() * 1.2;
    const opacity = Math.random() * 0.3 + 0.1;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
    ctx.fill();
  }

  // Add subtle nebula effect
  for (let i = 0; i < 5; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const radius = Math.random() * 150 + 100;
    const domainKeys = Object.keys(DOMAIN_COLORS);
    const randomDomain = domainKeys[Math.floor(Math.random() * domainKeys.length)] as KnowledgeDomain;
    const color = DOMAIN_COLORS[randomDomain];
    const nebula = ctx.createRadialGradient(x, y, 0, x, y, radius);
    const colorRgba = hexToRgba(color, 0.05);
    nebula.addColorStop(0, colorRgba);
    nebula.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = nebula;
    ctx.fillRect(0, 0, width, height);
  }
};

/**
 * Draws the connections between discovered concept nodes.
 */
export const drawConnections = (
  ctx: CanvasRenderingContext2D,
  discoveredConnections: ConceptConnection[],
  discoveredNodes: ConceptNode[],
  selectedNode: ConceptNode | null,
  pendingConnection: string | null
): void => {
  discoveredConnections.forEach(connection => {
    const sourceNode = discoveredNodes.find(n => n.id === connection.source);
    const targetNode = discoveredNodes.find(n => n.id === connection.target);

    if (sourceNode && targetNode && sourceNode.position && targetNode.position) {
      const isActive =
        (selectedNode?.id === sourceNode.id || selectedNode?.id === targetNode.id) ||
        (pendingConnection === sourceNode.id || pendingConnection === targetNode.id);

      const opacity = connection.strength / 200 + 0.3;
      const width = connection.strength / 100 * 2 + 1;

      const sourceColor = DOMAIN_COLORS[sourceNode.domain];
      const targetColor = DOMAIN_COLORS[targetNode.domain];
      const gradient = ctx.createLinearGradient(
        sourceNode.position.x, sourceNode.position.y,
        targetNode.position.x, targetNode.position.y
      );
      gradient.addColorStop(0, sourceColor);
      gradient.addColorStop(1, targetColor);

      ctx.beginPath();
      ctx.moveTo(sourceNode.position.x, sourceNode.position.y);
      ctx.lineTo(targetNode.position.x, targetNode.position.y);

      if (isActive) {
        ctx.strokeStyle = 'white';
        ctx.lineWidth = width + 1;
        ctx.globalAlpha = opacity + 0.2;
        ctx.shadowColor = 'white';
        ctx.shadowBlur = 8;
      } else {
        ctx.strokeStyle = gradient;
        ctx.lineWidth = width;
        ctx.globalAlpha = opacity;
        ctx.shadowBlur = 0;
      }

      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
  });
};

/**
 * Draws the concept nodes on the canvas.
 */
export const drawNodes = (
  ctx: CanvasRenderingContext2D,
  discoveredNodes: ConceptNode[],
  activeNode: ConceptNode | null,
  selectedNode: ConceptNode | null,
  pendingConnection: string | null,
  activeNodes: string[],
  newlyDiscovered: string[],
  showLabels: boolean
): void => {
  discoveredNodes.forEach(node => {
    if (!node.position) return;

    const domainColor = DOMAIN_COLORS[node.domain];
    const domainLightColor = DOMAIN_COLORS_LIGHT[node.domain];

    const isActiveNode = activeNode?.id === node.id;
    const isSelectedNode = selectedNode?.id === node.id;
    const isPendingConnection = pendingConnection === node.id;
    const isHighlighted = activeNodes.includes(node.id) || newlyDiscovered.includes(node.id);

    const baseSize = 10 + (node.mastery / 100) * 10;
    const size = isActiveNode || isSelectedNode || isPendingConnection || isHighlighted
      ? baseSize * 1.3
      : baseSize;

    // Draw glow for active/highlighted nodes
    if (isActiveNode || isSelectedNode || isPendingConnection || isHighlighted) {
      ctx.beginPath();
      const glowRadius = isHighlighted ? size * 2.5 : size * 1.8;
      ctx.arc(node.position.x, node.position.y, glowRadius, 0, Math.PI * 2);
      const glow = ctx.createRadialGradient(
        node.position.x, node.position.y, size * 0.5,
        node.position.x, node.position.y, glowRadius
      );
      const color = isHighlighted ? domainLightColor : domainColor;
      glow.addColorStop(0, color);
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.fill();

      if (isHighlighted) {
        ctx.beginPath();
        ctx.arc(node.position.x, node.position.y, glowRadius * 1.5, 0, Math.PI * 2);
        const outerGlow = ctx.createRadialGradient(
          node.position.x, node.position.y, glowRadius,
          node.position.x, node.position.y, glowRadius * 1.5
        );
        outerGlow.addColorStop(0, hexToRgba(domainColor, 0.3));
        outerGlow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = outerGlow;
        ctx.fill();
        ctx.shadowColor = domainColor;
        ctx.shadowBlur = 15;
      }
    }

    // Draw primary node
    ctx.beginPath();
    ctx.arc(node.position.x, node.position.y, size, 0, Math.PI * 2);
    ctx.fillStyle = isHighlighted ? domainLightColor : domainColor;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Add inner highlight
    ctx.beginPath();
    ctx.arc(
      node.position.x - size * 0.3,
      node.position.y - size * 0.3,
      size * 0.4,
      0, Math.PI * 2
    );
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fill();

    // Add mastery indicator ring
    if (node.mastery > 0) {
      ctx.beginPath();
      ctx.arc(
        node.position.x,
        node.position.y,
        size + 2,
        -Math.PI / 2,
        (Math.PI * 2) * (node.mastery / 100) - Math.PI / 2
      );
      ctx.strokeStyle = domainLightColor;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Draw labels
    if ((isActiveNode || isSelectedNode || isHighlighted || showLabels)) {
      const isTemporaryLabel = isActiveNode && !isSelectedNode && !isHighlighted && !showLabels;
      ctx.font = '12px Arial, sans-serif';
      const textWidth = ctx.measureText(node.name).width;
      const padding = 4;
      const rectX = node.position.x - textWidth / 2 - padding;
      const rectY = node.position.y + 15 - padding;

      ctx.fillStyle = isTemporaryLabel ? 'rgba(26, 30, 36, 0.6)' : 'rgba(26, 30, 36, 0.8)';
      ctx.fillRect(rectX, rectY, textWidth + padding * 2, 18);
      ctx.fillStyle = isHighlighted ? '#FFFFFF' : domainColor;
      ctx.textAlign = 'center';
      ctx.fillText(node.name, node.position.x, node.position.y + 28);
      ctx.fillStyle = domainColor;
      ctx.fillRect(node.position.x - textWidth / 2 - padding, rectY, 3, 18);
    }
  });
};

/**
 * Draws the dashed line indicating a pending connection.
 */
export const drawPendingConnection = (
  ctx: CanvasRenderingContext2D,
  discoveredNodes: ConceptNode[],
  pendingConnection: string | null,
  activeNode: ConceptNode | null
): void => {
  if (pendingConnection && activeNode) {
    const sourceNode = discoveredNodes.find(n => n.id === pendingConnection);
    if (sourceNode && sourceNode.position && activeNode.position) {
      ctx.beginPath();
      ctx.moveTo(sourceNode.position.x, sourceNode.position.y);
      ctx.lineTo(activeNode.position.x, activeNode.position.y);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
};

/**
 * Draws the particle effects on the canvas.
 */
export const drawParticles = (
  ctx: CanvasRenderingContext2D,
  particleEffects: ParticleEffect[]
): void => {
  particleEffects.forEach(particle => {
    ctx.beginPath();
    const opacity = particle.opacity !== undefined
      ? particle.opacity
      : particle.life / particle.maxLife;
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fillStyle = hexToRgba(particle.color, opacity);
    ctx.fill();
  });
};
