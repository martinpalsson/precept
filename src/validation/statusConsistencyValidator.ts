/**
 * DV-004: Status Consistency Validation
 * 
 * Validates that status propagates correctly through traceability chains:
 * - Approved requirements should not link to draft requirements
 * - Implemented specifications should not link to draft requirements
 * - Baselined items should link to approved/baselined items
 */

import { RequirementObject } from '../types';
import {
  StatusInconsistency,
  ValidationSeverity,
  DeepValidationConfig,
  getRequirementById
} from './deepValidation';

/**
 * Detect status inconsistencies in traceability chains
 */
export function detectStatusInconsistencies(
  requirements: RequirementObject[],
  config: DeepValidationConfig
): StatusInconsistency[] {
  const inconsistencies: StatusInconsistency[] = [];
  
  for (const req of requirements) {
    const fromStatus = req.status || 'draft';
    
    // Check all outgoing links
    for (const [linkType, targetIds] of Object.entries(req.links)) {
      for (const targetId of targetIds) {
        const target = getRequirementById(requirements, targetId);
        if (!target) continue;
        
        const toStatus = target.status || 'draft';
        const violation = detectStatusViolation(fromStatus, toStatus, config);
        
        if (violation) {
          const chain = buildChain(requirements, req.id, targetId);
          const severity = determineStatusInconsistencySeverity(
            fromStatus,
            toStatus,
            violation,
            req.metadata.priority || 'medium'
          );
          
          inconsistencies.push({
            chain,
            fromId: req.id,
            toId: targetId,
            fromStatus,
            toStatus,
            linkType,
            severity,
            violation
          });
        }
      }
    }
  }
  
  return inconsistencies;
}

/**
 * Detect if there's a status violation
 */
function detectStatusViolation(
  fromStatus: string,
  toStatus: string,
  config: DeepValidationConfig
): 'approved_to_draft' | 'implemented_to_draft' | 'baselined_to_draft' | null {
  const from = fromStatus.toLowerCase();
  const to = toStatus.toLowerCase();
  
  if (config.statusConsistency.enforceApprovedChain) {
    if (from === 'approved' && to === 'draft') {
      return 'approved_to_draft';
    }
  }
  
  if (config.statusConsistency.enforceImplementedChain) {
    if (from === 'implemented' && to === 'draft') {
      return 'implemented_to_draft';
    }
  }
  
  // Baselined should link to approved or baselined
  if (from === 'baselined' && (to === 'draft' || to === 'review')) {
    return 'baselined_to_draft';
  }
  
  return null;
}

/**
 * Determine severity of status inconsistency
 */
function determineStatusInconsistencySeverity(
  fromStatus: string,
  toStatus: string,
  violation: 'approved_to_draft' | 'implemented_to_draft' | 'baselined_to_draft',
  priority: string
): ValidationSeverity {
  // Baselined violations are always high severity
  if (violation === 'baselined_to_draft') {
    return ValidationSeverity.HIGH;
  }
  
  // For critical/high priority items, status violations are high severity
  if (priority === 'critical' || priority === 'high') {
    return ValidationSeverity.HIGH;
  }
  
  return ValidationSeverity.MEDIUM;
}

/**
 * Build chain representation [fromId → toId]
 */
function buildChain(
  requirements: RequirementObject[],
  fromId: string,
  toId: string
): string[] {
  return [fromId, toId];
}

/**
 * Get bulk update suggestions for status inconsistencies
 */
export function getBulkUpdateSuggestions(
  inconsistencies: StatusInconsistency[],
  requirements: RequirementObject[]
): Array<{
  action: 'update_target_status' | 'update_source_status';
  affectedIds: string[];
  fromStatus: string;
  toStatus: string;
  reason: string;
}> {
  const suggestions: Array<{
    action: 'update_target_status' | 'update_source_status';
    affectedIds: string[];
    fromStatus: string;
    toStatus: string;
    reason: string;
  }> = [];
  
  // Group by violation type
  const approvedToDraft = inconsistencies.filter(i => i.violation === 'approved_to_draft');
  
  if (approvedToDraft.length > 0) {
    const targetIds = [...new Set(approvedToDraft.map(i => i.toId))];
    suggestions.push({
      action: 'update_target_status',
      affectedIds: targetIds,
      fromStatus: 'draft',
      toStatus: 'approved',
      reason: `${targetIds.length} draft requirements are linked from approved requirements`
    });
  }
  
  return suggestions;
}
