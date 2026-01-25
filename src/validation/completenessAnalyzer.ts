/**
 * DV-005: Hierarchical Completeness Verification
 * DV-006: Priority-Weighted Coverage
 * DV-007: Baseline Stability Analysis
 */

import { RequirementObject } from '../types';
import {
  IncompleteChain,
  PriorityWeightedCoverage,
  BaselineIssue,
  ValidationSeverity,
  DeepValidationConfig,
  getRequirementById,
  getTypePrefix,
  getAllOutgoingLinks
} from './deepValidation';

/**
 * DV-005: Verify complete traceability chains exist
 * Expected path: STK → SYS → DSG → TST
 */
export function verifyHierarchicalCompleteness(
  requirements: RequirementObject[],
  config: DeepValidationConfig,
  expectedChain: string[] = ['STK', 'SYS', 'DSG', 'TST']
): IncompleteChain[] {
  const incompleteChains: IncompleteChain[] = [];
  
  // Find all requirements at the start of the chain
  const startRequirements = requirements.filter(req => {
    const prefix = getTypePrefix(req.id);
    return prefix === expectedChain[0];
  });
  
  for (const startReq of startRequirements) {
    const { actualPath, missingLinks } = traceChain(
      requirements,
      startReq.id,
      expectedChain
    );
    
    if (missingLinks.length > 0) {
      const severity = determineCompletenessSeverity(
        startReq.metadata.priority || 'medium',
        missingLinks.length
      );
      
      incompleteChains.push({
        startId: startReq.id,
        expectedPath: expectedChain,
        actualPath,
        missingLinks,
        severity
      });
    }
  }
  
  return incompleteChains;
}

/**
 * Trace a chain from a starting requirement through expected types
 */
function traceChain(
  requirements: RequirementObject[],
  startId: string,
  expectedChain: string[]
): { actualPath: string[]; missingLinks: string[] } {
  const actualPath: string[] = [getTypePrefix(startId)];
  const missingLinks: string[] = [];
  
  let currentReqs = [startId];
  
  for (let i = 1; i < expectedChain.length; i++) {
    const targetType = expectedChain[i];
    const foundTargets = new Set<string>();
    
    // Find all links from current level to next level
    for (const reqId of currentReqs) {
      const req = getRequirementById(requirements, reqId);
      if (!req) continue;
      
      const outgoing = getAllOutgoingLinks(req);
      for (const targetId of outgoing) {
        const target = getRequirementById(requirements, targetId);
        if (target && getTypePrefix(target.id) === targetType) {
          foundTargets.add(targetId);
        }
      }
    }
    
    if (foundTargets.size > 0) {
      actualPath.push(targetType);
      currentReqs = Array.from(foundTargets);
    } else {
      const prevType = expectedChain[i - 1];
      missingLinks.push(`${prevType}→${targetType}`);
      break; // Can't continue tracing
    }
  }
  
  return { actualPath, missingLinks };
}

/**
 * Determine severity based on priority and number of missing links
 */
function determineCompletenessSeverity(
  priority: string,
  missingLinkCount: number
): ValidationSeverity {
  if (priority === 'critical') {
    return ValidationSeverity.BLOCKER;
  }
  
  if (priority === 'high') {
    return missingLinkCount > 1 ? ValidationSeverity.HIGH : ValidationSeverity.MEDIUM;
  }
  
  return ValidationSeverity.MEDIUM;
}

/**
 * DV-006: Calculate priority-weighted coverage
 */
export function calculatePriorityWeightedCoverage(
  requirements: RequirementObject[],
  config: DeepValidationConfig
): PriorityWeightedCoverage[] {
  const priorities = ['critical', 'high', 'medium', 'low'];
  const results: PriorityWeightedCoverage[] = [];
  
  for (const priority of priorities) {
    const priorityReqs = requirements.filter(req => {
      return (req.metadata.priority || 'medium').toLowerCase() === priority;
    });
    
    const covered = priorityReqs.filter(req => {
      const outgoing = getAllOutgoingLinks(req);
      return outgoing.length > 0;
    });
    
    const missing = priorityReqs
      .filter(req => getAllOutgoingLinks(req).length === 0)
      .map(req => req.id);
    
    const threshold = config.priorityWeightedCoverage[priority as keyof typeof config.priorityWeightedCoverage] || 80;
    const total = priorityReqs.length;
    const coveredCount = covered.length;
    const percentage = total > 0 ? Math.round((coveredCount / total) * 100) : 0;
    
    results.push({
      priority,
      total,
      covered: coveredCount,
      percentage,
      threshold,
      meets_threshold: percentage >= threshold,
      missing
    });
  }
  
  return results;
}

/**
 * DV-007: Analyze baseline stability
 */
export function analyzeBaselineStability(
  requirements: RequirementObject[],
  config: DeepValidationConfig
): BaselineIssue[] {
  const issues: BaselineIssue[] = [];
  
  // Find all baselined requirements
  const baselinedReqs = requirements.filter(req => req.baseline);
  
  for (const req of baselinedReqs) {
    // Check if baselined requirement is approved/implemented
    if (config.baselineStability.requireApproved) {
      const status = (req.status || 'draft').toLowerCase();
      if (status !== 'approved' && status !== 'implemented' && status !== 'baselined') {
        issues.push({
          id: req.id,
          baseline: req.baseline!,
          issue: 'not_approved',
          severity: ValidationSeverity.HIGH,
          affectedIds: [req.id],
          details: `Baselined requirement ${req.id} has status '${req.status}' but should be approved/implemented`
        });
      }
    }
    
    // Check if downstream requirements are also baselined
    if (config.baselineStability.requireDownstreamBaselined) {
      const outgoing = getAllOutgoingLinks(req);
      const notBaselined: string[] = [];
      
      for (const targetId of outgoing) {
        const target = getRequirementById(requirements, targetId);
        if (target && !target.baseline) {
          notBaselined.push(targetId);
        } else if (target && target.baseline && target.baseline !== req.baseline) {
          // Version conflict
          issues.push({
            id: req.id,
            baseline: req.baseline!,
            issue: 'version_conflict',
            severity: ValidationSeverity.MEDIUM,
            affectedIds: [req.id, targetId],
            details: `${req.id} (${req.baseline}) links to ${targetId} (${target.baseline})`
          });
        }
      }
      
      if (notBaselined.length > 0) {
        issues.push({
          id: req.id,
          baseline: req.baseline!,
          issue: 'downstream_not_baselined',
          severity: ValidationSeverity.MEDIUM,
          affectedIds: [req.id, ...notBaselined],
          details: `Baselined ${req.id} links to non-baselined: ${notBaselined.join(', ')}`
        });
      }
    }
  }
  
  return issues;
}
