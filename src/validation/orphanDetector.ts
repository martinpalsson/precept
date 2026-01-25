/**
 * DV-003: Orphaned Requirements Detection
 * 
 * Categorizes orphaned requirements into:
 * - True orphans: No incoming or outgoing links
 * - Dead-ends: Only incoming links (nothing downstream)
 * - Source nodes: Only outgoing links (nothing upstream)
 * 
 * Severity is determined by priority level
 */

import { RequirementObject } from '../types';
import {
  OrphanedRequirement,
  ValidationSeverity,
  DeepValidationConfig,
  getAllOutgoingLinks,
  getAllIncomingLinks
} from './deepValidation';

/**
 * Detect all orphaned requirements
 */
export function detectOrphanedRequirements(
  requirements: RequirementObject[],
  config: DeepValidationConfig
): OrphanedRequirement[] {
  const orphaned: OrphanedRequirement[] = [];
  
  for (const req of requirements) {
    const outgoing = getAllOutgoingLinks(req);
    const incoming = getAllIncomingLinks(requirements, req.id);
    
    let category: 'true_orphan' | 'dead_end' | 'source_only' | null = null;
    
    if (outgoing.length === 0 && incoming.length === 0) {
      category = 'true_orphan';
    } else if (outgoing.length === 0 && incoming.length > 0) {
      category = 'dead_end';
    } else if (outgoing.length > 0 && incoming.length === 0) {
      category = 'source_only';
    }
    
    if (category) {
      const severity = determineOrphanSeverity(req, category, config);
      
      orphaned.push({
        id: req.id,
        type: req.type,
        priority: req.metadata.priority || 'medium',
        category,
        severity,
        incomingCount: incoming.length,
        outgoingCount: outgoing.length
      });
    }
  }
  
  return orphaned;
}

/**
 * Determine severity based on priority and category
 */
function determineOrphanSeverity(
  req: RequirementObject,
  category: 'true_orphan' | 'dead_end' | 'source_only',
  config: DeepValidationConfig
): ValidationSeverity {
  const priority = req.metadata.priority || 'medium';
  
  // True orphans are more severe
  if (category === 'true_orphan') {
    switch (priority.toLowerCase()) {
      case 'critical':
        return config.orphanSeverity.critical;
      case 'high':
        return config.orphanSeverity.high;
      case 'medium':
        return config.orphanSeverity.medium;
      case 'low':
        return config.orphanSeverity.low;
      default:
        return ValidationSeverity.MEDIUM;
    }
  }
  
  // Dead-ends and source nodes are less severe
  // Downgrade severity by one level
  switch (priority.toLowerCase()) {
    case 'critical':
      return ValidationSeverity.HIGH;
    case 'high':
      return ValidationSeverity.MEDIUM;
    case 'medium':
      return ValidationSeverity.LOW;
    case 'low':
      return ValidationSeverity.INFO;
    default:
      return ValidationSeverity.LOW;
  }
}

/**
 * Get orphans by category
 */
export function getOrphansByCategory(
  orphaned: OrphanedRequirement[],
  category: 'true_orphan' | 'dead_end' | 'source_only'
): OrphanedRequirement[] {
  return orphaned.filter(o => o.category === category);
}

/**
 * Get orphans by severity
 */
export function getOrphansBySeverity(
  orphaned: OrphanedRequirement[],
  severity: ValidationSeverity
): OrphanedRequirement[] {
  return orphaned.filter(o => o.severity === severity);
}
