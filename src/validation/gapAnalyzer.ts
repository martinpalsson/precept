/**
 * DV-010: Gap Analysis with Actionable Recommendations
 * 
 * Analyzes all validation results and generates prioritized, actionable recommendations
 */

import { RequirementObject } from '../types';
import {
  GapRecommendation,
  ValidationSeverity,
  ValidationCategory,
  DeepValidationReport,
  CircularDependency,
  HierarchicalCoverage,
  OrphanedRequirement,
  StatusInconsistency,
  IncompleteChain,
  PriorityWeightedCoverage,
  BaselineIssue
} from './deepValidation';

/**
 * Generate gap analysis recommendations from validation report
 */
export function generateGapRecommendations(
  report: DeepValidationReport,
  requirements: RequirementObject[]
): GapRecommendation[] {
  const recommendations: GapRecommendation[] = [];
  
  // Analyze circular dependencies
  recommendations.push(...analyzeCircularDependencies(report.circularDependencies));
  
  // Analyze coverage gaps
  recommendations.push(...analyzeCoverageGaps(report.hierarchicalCoverage, requirements));
  
  // Analyze orphaned requirements
  recommendations.push(...analyzeOrphanedRequirements(report.orphanedRequirements));
  
  // Analyze status inconsistencies
  recommendations.push(...analyzeStatusInconsistencies(report.statusInconsistencies));
  
  // Analyze incomplete chains
  recommendations.push(...analyzeIncompleteChains(report.incompleteChains));
  
  // Analyze priority coverage
  recommendations.push(...analyzePriorityCoverage(report.priorityWeightedCoverage));
  
  // Analyze baseline issues
  recommendations.push(...analyzeBaselineIssues(report.baselineIssues));
  
  // Sort by priority (severity first, then affected count)
  recommendations.sort((a, b) => {
    const severityOrder = { BLOCKER: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 };
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return b.affectedCount - a.affectedCount;
  });
  
  // Assign priority numbers
  recommendations.forEach((rec, index) => {
    rec.priority = index + 1;
  });
  
  return recommendations;
}

/**
 * Analyze circular dependency issues
 */
function analyzeCircularDependencies(cycles: CircularDependency[]): GapRecommendation[] {
  if (cycles.length === 0) return [];
  
  // Group by severity
  const blockerCycles = cycles.filter(c => c.severity === ValidationSeverity.BLOCKER);
  const highCycles = cycles.filter(c => c.severity === ValidationSeverity.HIGH);
  const mediumCycles = cycles.filter(c => c.severity === ValidationSeverity.MEDIUM);
  
  const recommendations: GapRecommendation[] = [];
  
  if (blockerCycles.length > 0) {
    const affectedIds = new Set<string>();
    blockerCycles.forEach(c => c.cycle.forEach(id => affectedIds.add(id)));
    
    recommendations.push({
      severity: ValidationSeverity.BLOCKER,
      category: ValidationCategory.CIRCULAR_DEPENDENCY,
      action: 'Break circular dependencies',
      description: `${blockerCycles.length} critical circular dependencies detected with length ≤2. These must be resolved immediately.`,
      affectedCount: affectedIds.size,
      affectedIds: Array.from(affectedIds),
      estimatedEffort: 'high',
      priority: 0
    });
  }
  
  if (highCycles.length > 0) {
    const affectedIds = new Set<string>();
    highCycles.forEach(c => c.cycle.forEach(id => affectedIds.add(id)));
    
    recommendations.push({
      severity: ValidationSeverity.HIGH,
      category: ValidationCategory.CIRCULAR_DEPENDENCY,
      action: 'Resolve circular dependencies',
      description: `${highCycles.length} circular dependencies (length 3-5) should be resolved soon.`,
      affectedCount: affectedIds.size,
      affectedIds: Array.from(affectedIds),
      estimatedEffort: 'medium',
      priority: 0
    });
  }
  
  return recommendations;
}

/**
 * Analyze coverage gaps
 */
function analyzeCoverageGaps(
  coverage: HierarchicalCoverage[],
  requirements: RequirementObject[]
): GapRecommendation[] {
  const recommendations: GapRecommendation[] = [];
  
  for (const cov of coverage) {
    if (!cov.meets_threshold && cov.missing.length > 0) {
      const gap = cov.threshold - cov.percentage;
      const severity = gap > 20 ? ValidationSeverity.HIGH : 
                      gap > 10 ? ValidationSeverity.MEDIUM : ValidationSeverity.LOW;
      
      recommendations.push({
        severity,
        category: ValidationCategory.COVERAGE,
        action: `Add ${cov.linkType} links`,
        description: `${cov.linkType} coverage is ${cov.percentage}% (threshold: ${cov.threshold}%). ${cov.missing.length} requirements need links.`,
        affectedCount: cov.missing.length,
        affectedIds: cov.missing,
        estimatedEffort: cov.missing.length > 20 ? 'high' : cov.missing.length > 10 ? 'medium' : 'low',
        priority: 0
      });
    }
  }
  
  return recommendations;
}

/**
 * Analyze orphaned requirements
 */
function analyzeOrphanedRequirements(orphans: OrphanedRequirement[]): GapRecommendation[] {
  if (orphans.length === 0) return [];
  
  const trueOrphans = orphans.filter(o => o.category === 'true_orphan');
  const deadEnds = orphans.filter(o => o.category === 'dead_end');
  const sourceOnly = orphans.filter(o => o.category === 'source_only');
  
  const recommendations: GapRecommendation[] = [];
  
  if (trueOrphans.length > 0) {
    const criticalOrphans = trueOrphans.filter(o => o.severity === ValidationSeverity.BLOCKER || o.severity === ValidationSeverity.HIGH);
    
    if (criticalOrphans.length > 0) {
      recommendations.push({
        severity: ValidationSeverity.HIGH,
        category: ValidationCategory.ORPHANED,
        action: 'Link critical orphaned requirements',
        description: `${criticalOrphans.length} critical/high-priority requirements have no links. These must be integrated into traceability.`,
        affectedCount: criticalOrphans.length,
        affectedIds: criticalOrphans.map(o => o.id),
        estimatedEffort: 'high',
        priority: 0
      });
    }
  }
  
  if (deadEnds.length > 5) {
    recommendations.push({
      severity: ValidationSeverity.MEDIUM,
      category: ValidationCategory.ORPHANED,
      action: 'Add downstream traceability',
      description: `${deadEnds.length} requirements are dead-ends (no downstream links). Add implementations or tests.`,
      affectedCount: deadEnds.length,
      affectedIds: deadEnds.map(o => o.id),
      estimatedEffort: 'high',
      priority: 0
    });
  }
  
  return recommendations;
}

/**
 * Analyze status inconsistencies
 */
function analyzeStatusInconsistencies(inconsistencies: StatusInconsistency[]): GapRecommendation[] {
  if (inconsistencies.length === 0) return [];
  
  const approvedToDraft = inconsistencies.filter(i => i.violation === 'approved_to_draft');
  const baselinedToDraft = inconsistencies.filter(i => i.violation === 'baselined_to_draft');
  
  const recommendations: GapRecommendation[] = [];
  
  if (baselinedToDraft.length > 0) {
    const affectedIds = new Set<string>();
    baselinedToDraft.forEach(i => {
      affectedIds.add(i.fromId);
      affectedIds.add(i.toId);
    });
    
    recommendations.push({
      severity: ValidationSeverity.HIGH,
      category: ValidationCategory.STATUS_CONSISTENCY,
      action: 'Fix baselined requirement status violations',
      description: `${baselinedToDraft.length} baselined requirements link to draft/review items. Update downstream statuses.`,
      affectedCount: affectedIds.size,
      affectedIds: Array.from(affectedIds),
      estimatedEffort: 'medium',
      priority: 0
    });
  }
  
  if (approvedToDraft.length > 0) {
    const targetIds = new Set(approvedToDraft.map(i => i.toId));
    
    recommendations.push({
      severity: ValidationSeverity.MEDIUM,
      category: ValidationCategory.STATUS_CONSISTENCY,
      action: 'Update status of downstream requirements',
      description: `${approvedToDraft.length} approved requirements link to draft items. Consider bulk status update.`,
      affectedCount: targetIds.size,
      affectedIds: Array.from(targetIds),
      estimatedEffort: 'low',
      priority: 0
    });
  }
  
  return recommendations;
}

/**
 * Analyze incomplete chains
 */
function analyzeIncompleteChains(chains: IncompleteChain[]): GapRecommendation[] {
  if (chains.length === 0) return [];
  
  const criticalChains = chains.filter(c => c.severity === ValidationSeverity.BLOCKER || c.severity === ValidationSeverity.HIGH);
  
  if (criticalChains.length === 0) return [];
  
  return [{
    severity: ValidationSeverity.HIGH,
    category: ValidationCategory.COMPLETENESS,
    action: 'Complete critical traceability chains',
    description: `${criticalChains.length} critical requirements have incomplete traceability chains (STK→SYS→DSG→TST).`,
    affectedCount: criticalChains.length,
    affectedIds: criticalChains.map(c => c.startId),
    estimatedEffort: 'high',
    priority: 0
  }];
}

/**
 * Analyze priority coverage
 */
function analyzePriorityCoverage(coverage: PriorityWeightedCoverage[]): GapRecommendation[] {
  const recommendations: GapRecommendation[] = [];
  
  for (const cov of coverage) {
    if (!cov.meets_threshold && cov.missing.length > 0) {
      const severity = cov.priority === 'critical' ? ValidationSeverity.BLOCKER :
                      cov.priority === 'high' ? ValidationSeverity.HIGH : ValidationSeverity.MEDIUM;
      
      recommendations.push({
        severity,
        category: ValidationCategory.PRIORITY,
        action: `Add links for ${cov.priority} priority requirements`,
        description: `${cov.priority} priority coverage is ${cov.percentage}% (threshold: ${cov.threshold}%). ${cov.missing.length} requirements need links.`,
        affectedCount: cov.missing.length,
        affectedIds: cov.missing,
        estimatedEffort: cov.missing.length > 10 ? 'high' : 'medium',
        priority: 0
      });
    }
  }
  
  return recommendations;
}

/**
 * Analyze baseline issues
 */
function analyzeBaselineIssues(issues: BaselineIssue[]): GapRecommendation[] {
  if (issues.length === 0) return [];
  
  const notApproved = issues.filter(i => i.issue === 'not_approved');
  const versionConflicts = issues.filter(i => i.issue === 'version_conflict');
  
  const recommendations: GapRecommendation[] = [];
  
  if (notApproved.length > 0) {
    recommendations.push({
      severity: ValidationSeverity.HIGH,
      category: ValidationCategory.BASELINE,
      action: 'Approve baselined requirements',
      description: `${notApproved.length} baselined requirements are not in approved/implemented status.`,
      affectedCount: notApproved.length,
      affectedIds: notApproved.map(i => i.id),
      estimatedEffort: 'medium',
      priority: 0
    });
  }
  
  if (versionConflicts.length > 0) {
    const affectedIds = new Set<string>();
    versionConflicts.forEach(i => i.affectedIds.forEach(id => affectedIds.add(id)));
    
    recommendations.push({
      severity: ValidationSeverity.MEDIUM,
      category: ValidationCategory.BASELINE,
      action: 'Resolve baseline version conflicts',
      description: `${versionConflicts.length} baseline version conflicts detected in traceability chains.`,
      affectedCount: affectedIds.size,
      affectedIds: Array.from(affectedIds),
      estimatedEffort: 'medium',
      priority: 0
    });
  }
  
  return recommendations;
}
