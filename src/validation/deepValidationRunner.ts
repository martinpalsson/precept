/**
 * Deep Validation Runner
 * 
 * Main orchestrator that runs all deep validation checks and generates comprehensive report
 */

import { RequirementObject, RigrConfig } from '../types';
import {
  DeepValidationReport,
  DeepValidationConfig,
  ValidationFinding,
  ValidationSeverity,
  ValidationCategory,
  getDeepValidationConfig
} from './deepValidation';
import { detectCircularDependencies } from './circularDependencyDetector';
import { calculateHierarchicalCoverage } from './hierarchicalCoverageAnalyzer';
import { detectOrphanedRequirements } from './orphanDetector';
import { detectStatusInconsistencies } from './statusConsistencyValidator';
import {
  verifyHierarchicalCompleteness,
  calculatePriorityWeightedCoverage,
  analyzeBaselineStability
} from './completenessAnalyzer';
import { generateGapRecommendations } from './gapAnalyzer';

/**
 * Run complete deep validation
 */
export async function runDeepValidation(
  requirements: RequirementObject[],
  rigrConfig?: RigrConfig
): Promise<DeepValidationReport> {
  const config = getDeepValidationConfig(rigrConfig);
  const timestamp = new Date();
  
  // Run all validation checks
  const circularDependencies = detectCircularDependencies(requirements, config);
  const hierarchicalCoverage = calculateHierarchicalCoverage(requirements, config);
  const orphanedRequirements = detectOrphanedRequirements(requirements, config);
  const statusInconsistencies = detectStatusInconsistencies(requirements, config);
  const incompleteChains = verifyHierarchicalCompleteness(requirements, config);
  const priorityWeightedCoverage = calculatePriorityWeightedCoverage(requirements, config);
  const baselineIssues = analyzeBaselineStability(requirements, config);
  
  // Build initial report
  const report: DeepValidationReport = {
    timestamp,
    summary: {
      totalRequirements: requirements.length,
      totalIssues: 0,
      blockerCount: 0,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
      infoCount: 0
    },
    circularDependencies,
    hierarchicalCoverage,
    orphanedRequirements,
    statusInconsistencies,
    incompleteChains,
    priorityWeightedCoverage,
    baselineIssues,
    gapRecommendations: [],
    findings: [],
    config
  };
  
  // Generate gap recommendations
  report.gapRecommendations = generateGapRecommendations(report, requirements);
  
  // Convert all issues to findings
  report.findings = generateFindings(report);
  
  // Update summary counts
  updateSummary(report);
  
  return report;
}

/**
 * Generate validation findings from all issues
 */
function generateFindings(report: DeepValidationReport): ValidationFinding[] {
  const findings: ValidationFinding[] = [];
  
  // Circular dependencies
  for (const cycle of report.circularDependencies) {
    findings.push({
      category: ValidationCategory.CIRCULAR_DEPENDENCY,
      severity: cycle.severity,
      requirementId: cycle.cycle[0],
      message: `Circular dependency detected: ${cycle.cycle.join(' → ')}`,
      details: `Cycle length: ${cycle.length}, Link types: ${cycle.linkTypes.join(', ')}`,
      affectedIds: cycle.cycle,
      recommendation: `Break the cycle by removing one of the links in the chain`
    });
  }
  
  // Coverage gaps
  for (const cov of report.hierarchicalCoverage) {
    if (!cov.meets_threshold) {
      const severity = (cov.threshold - cov.percentage) > 20 ? ValidationSeverity.HIGH : ValidationSeverity.MEDIUM;
      
      for (const reqId of cov.missing.slice(0, 10)) { // Limit to first 10
        findings.push({
          category: ValidationCategory.COVERAGE,
          severity,
          requirementId: reqId,
          message: `Missing ${cov.linkType} link`,
          details: `${cov.linkType} coverage is ${cov.percentage}% (threshold: ${cov.threshold}%)`,
          recommendation: `Add ${cov.linkType} link to a ${cov.toTypes.join('/')} requirement`
        });
      }
    }
  }
  
  // Orphaned requirements
  for (const orphan of report.orphanedRequirements) {
    let message = '';
    let recommendation = '';
    
    switch (orphan.category) {
      case 'true_orphan':
        message = `True orphan: no incoming or outgoing links`;
        recommendation = `Add traceability links to integrate this requirement`;
        break;
      case 'dead_end':
        message = `Dead-end: has ${orphan.incomingCount} incoming but no outgoing links`;
        recommendation = `Add downstream links (implementation or test)`;
        break;
      case 'source_only':
        message = `Source node: has ${orphan.outgoingCount} outgoing but no incoming links`;
        recommendation = `Add upstream links to parent requirements`;
        break;
    }
    
    findings.push({
      category: ValidationCategory.ORPHANED,
      severity: orphan.severity,
      requirementId: orphan.id,
      message,
      details: `Priority: ${orphan.priority}, Type: ${orphan.type}`,
      recommendation
    });
  }
  
  // Status inconsistencies
  for (const inconsistency of report.statusInconsistencies) {
    findings.push({
      category: ValidationCategory.STATUS_CONSISTENCY,
      severity: inconsistency.severity,
      requirementId: inconsistency.fromId,
      message: `Status violation: ${inconsistency.fromStatus} → ${inconsistency.toStatus}`,
      details: `${inconsistency.fromId} (${inconsistency.fromStatus}) links to ${inconsistency.toId} (${inconsistency.toStatus}) via ${inconsistency.linkType}`,
      affectedIds: [inconsistency.fromId, inconsistency.toId],
      recommendation: `Update ${inconsistency.toId} status to ${inconsistency.fromStatus} or higher`,
      quickFix: {
        action: 'change_status',
        description: `Change ${inconsistency.toId} status to ${inconsistency.fromStatus}`,
        parameters: {
          targetId: inconsistency.toId,
          newStatus: inconsistency.fromStatus
        }
      }
    });
  }
  
  // Incomplete chains
  for (const chain of report.incompleteChains) {
    findings.push({
      category: ValidationCategory.COMPLETENESS,
      severity: chain.severity,
      requirementId: chain.startId,
      message: `Incomplete traceability chain`,
      details: `Expected: ${chain.expectedPath.join('→')}, Got: ${chain.actualPath.join('→')}, Missing: ${chain.missingLinks.join(', ')}`,
      recommendation: `Complete the traceability chain: ${chain.missingLinks.join(', ')}`
    });
  }
  
  // Priority coverage
  for (const pricov of report.priorityWeightedCoverage) {
    if (!pricov.meets_threshold && pricov.missing.length > 0) {
      const severity = pricov.priority === 'critical' ? ValidationSeverity.BLOCKER :
                      pricov.priority === 'high' ? ValidationSeverity.HIGH : ValidationSeverity.MEDIUM;
      
      findings.push({
        category: ValidationCategory.PRIORITY,
        severity,
        requirementId: pricov.missing[0],
        message: `${pricov.priority} priority coverage below threshold`,
        details: `${pricov.percentage}% coverage (threshold: ${pricov.threshold}%), ${pricov.missing.length} requirements without links`,
        affectedIds: pricov.missing,
        recommendation: `Add traceability links for ${pricov.priority} priority requirements`
      });
    }
  }
  
  // Baseline issues
  for (const issue of report.baselineIssues) {
    findings.push({
      category: ValidationCategory.BASELINE,
      severity: issue.severity,
      requirementId: issue.id,
      message: `Baseline issue: ${issue.issue.replace(/_/g, ' ')}`,
      details: issue.details,
      affectedIds: issue.affectedIds,
      recommendation: getBaselineRecommendation(issue.issue)
    });
  }
  
  return findings;
}

/**
 * Get recommendation for baseline issue
 */
function getBaselineRecommendation(issue: string): string {
  switch (issue) {
    case 'not_approved':
      return 'Update status to approved or implemented before baselining';
    case 'not_implemented':
      return 'Complete implementation before baselining';
    case 'downstream_not_baselined':
      return 'Baseline all downstream requirements or remove baseline from this requirement';
    case 'version_conflict':
      return 'Ensure all linked requirements are on the same baseline version';
    default:
      return 'Review baseline configuration';
  }
}

/**
 * Update summary counts based on findings
 */
function updateSummary(report: DeepValidationReport): void {
  report.summary.totalIssues = report.findings.length;
  
  for (const finding of report.findings) {
    switch (finding.severity) {
      case ValidationSeverity.BLOCKER:
        report.summary.blockerCount++;
        break;
      case ValidationSeverity.HIGH:
        report.summary.highCount++;
        break;
      case ValidationSeverity.MEDIUM:
        report.summary.mediumCount++;
        break;
      case ValidationSeverity.LOW:
        report.summary.lowCount++;
        break;
      case ValidationSeverity.INFO:
        report.summary.infoCount++;
        break;
    }
  }
}

/**
 * Export report as JSON
 */
export function exportReportAsJSON(report: DeepValidationReport): string {
  return JSON.stringify(report, null, 2);
}

/**
 * Export report as human-readable text
 */
export function exportReportAsText(report: DeepValidationReport): string {
  const lines: string[] = [];
  
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('RIGR DEEP VALIDATION REPORT');
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push(`Generated: ${report.timestamp.toISOString()}`);
  lines.push('');
  
  // Summary
  lines.push('SUMMARY');
  lines.push('───────────────────────────────────────────────────────────');
  lines.push(`Total Requirements: ${report.summary.totalRequirements}`);
  lines.push(`Total Issues: ${report.summary.totalIssues}`);
  lines.push(`  BLOCKER: ${report.summary.blockerCount}`);
  lines.push(`  HIGH:    ${report.summary.highCount}`);
  lines.push(`  MEDIUM:  ${report.summary.mediumCount}`);
  lines.push(`  LOW:     ${report.summary.lowCount}`);
  lines.push(`  INFO:    ${report.summary.infoCount}`);
  lines.push('');
  
  // Gap Recommendations
  if (report.gapRecommendations.length > 0) {
    lines.push('TOP RECOMMENDATIONS');
    lines.push('───────────────────────────────────────────────────────────');
    for (const rec of report.gapRecommendations.slice(0, 10)) {
      lines.push(`${rec.priority}. [${rec.severity}] ${rec.action}`);
      lines.push(`   ${rec.description}`);
      lines.push(`   Affected: ${rec.affectedCount} requirements | Effort: ${rec.estimatedEffort}`);
      lines.push('');
    }
  }
  
  // Circular Dependencies
  if (report.circularDependencies.length > 0) {
    lines.push(`CIRCULAR DEPENDENCIES (${report.circularDependencies.length})`);
    lines.push('───────────────────────────────────────────────────────────');
    for (const cycle of report.circularDependencies.slice(0, 5)) {
      lines.push(`[${cycle.severity}] ${cycle.cycle.join(' → ')}`);
    }
    lines.push('');
  }
  
  // Hierarchical Coverage
  lines.push('HIERARCHICAL COVERAGE');
  lines.push('───────────────────────────────────────────────────────────');
  for (const cov of report.hierarchicalCoverage) {
    const status = cov.meets_threshold ? '✓' : '✗';
    lines.push(`${status} ${cov.linkType}: ${cov.percentage}% (${cov.withLinks}/${cov.total}) [threshold: ${cov.threshold}%]`);
  }
  lines.push('');
  
  return lines.join('\n');
}
