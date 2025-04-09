// app/core/themeConstants.ts

import { KnowledgeDomain } from '../store/knowledgeStore'; // Assuming KnowledgeDomain type is exported from here

// Domain color map for direct use
export const DOMAIN_COLORS: Record<KnowledgeDomain, string> = {
  'radiation-physics': '#3b82f6', // Blue
  'quality-assurance': '#10b981', // Green
  'clinical-practice': '#ec4899', // Pink
  'radiation-protection': '#f59e0b', // Amber
  'technical': '#6366f1', // Indigo
  'theoretical': '#8b5cf6', // Violet
  'general': '#6b7280', // Gray
};

// Light variant colors for highlights
export const DOMAIN_COLORS_LIGHT: Record<KnowledgeDomain, string> = {
  'radiation-physics': '#93c5fd', // Light blue
  'quality-assurance': '#5eead4', // Light green
  'clinical-practice': '#fbcfe8', // Light pink
  'radiation-protection': '#fcd34d', // Light amber
  'technical': '#a5b4fc', // Light indigo
  'theoretical': '#c4b5fd', // Light violet
  'general': '#9ca3af', // Light gray
};

// Helper function to convert hex color to rgba (Can be placed here or in a utils file)
export const hexToRgba = (hex: string, alpha: number = 1): string => {
  // Remove # if present
  hex = hex.replace('#', '');
  // Parse the hex values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  // Return rgba string
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Helper function to get domain color (used in Debug Panel)
export function getDomainColor(domain: string): string {
  return DOMAIN_COLORS[domain as KnowledgeDomain] || DOMAIN_COLORS.general;
}