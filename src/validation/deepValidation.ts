/**
 * Deep Validation Module
 * 
 * Implements comprehensive validation checks for requirements traceability:
 * - DV-001: Circular dependency detection
 * - DV-002: Hierarchical traceability coverage
 * - DV-003: Orphaned requirements detection
 * - DV-004: Status consistency validation
 * - DV-005: Hierarchical completeness verification
 * - DV-006: Priority-weighted coverage
 * - DV-007: Baseline stability analysis
 * - DV-010: Gap analysis with recommendations
 */

import { RequirementObject, RigrConfig, LinkType } from '../types';

/**
 * Severity levels for validation issues
 */
export enum ValidationSeverity {
  BLOCKER = 'BLOCKER',   // Must be fixed before release
  HIGH = 'HIGH',         // Should be fixed soon
  MEDIUM = 'MEDIUM',     // Should be fixed eventually
  LOW = 'LOW',           // Nice to have
  INFO = 'INFO'          // Informational only
}

/**
 * Category of validation issue
 */
export enum ValidationCategory {
  CIRCULAR_DEPENDENCY = 'circular_dependency',
  COVERAGE = 'coverage',
  ORPHANED = 'orphaned',
  STATUS_CONSISTENCY = 'status_consistency',
  COMPLETENESS = 'completeness',
  BASELINE = 'baseline',
  PRIORITY = 'priority'
}

/**
 * Individual validation finding
 */
export interface ValidationFinding {
  category: ValidationCategory;
  severity: ValidationSeverity;
  requirementId: string;
  message: string;
  details?: string;
  affectedIds?: string[];
  recommendation?: string;
  quickFix?: QuickFix;
}

/**
 * Quick fix action for a validation issue
 */
export interface QuickFix {
  action: 'add_link' | 'remove_link' | 'change_status' | 'add_baseline' | 'remove_baseline';
  description: string;
  parameters: Record<string, any>;
}

/**
 * Circular dependency cycle information
 */
export interface CircularDependency {
  cycle: string[];
  length: number;
  severity: ValidationSeverity;
  linkTypes: string[];
}

/**
 * Hierarchical coverage metrics by link type
 */
export interface HierarchicalCoverage {
  linkType: string;
  fromTypes: string[];
  toTypes: string[];
  total: number;
  withLinks: number;
  percentage: number;
  threshold: number;
  meets_threshold: boolean;
  missing: string[];
}

/**
 * Orphaned requirement categorization
 */
export interface OrphanedRequirement {
  id: string;
  type: string;
  priority: string;
  category: 'true_orphan' | 'dead_end' | 'source_only';
  severity: ValidationSeverity;
  incomingCount: number;
  outgoingCount: number;
}

/**
 * Status consistency issue in traceability chain
 */
export interface StatusInconsistency {
  chain: string[];
  fromId: string;
  toId: string;
  fromStatus: string;
  toStatus: string;
  linkType: string;
  severity: ValidationSeverity;
  violation: 'approved_to_draft' | 'implemented_to_draft' | 'baselined_to_draft';
}

/**
 * Incomplete traceability chain
 */
export interface IncompleteChain {
  startId: string;
  expectedPath: string[];  // e.g., ['STK', 'SYS', 'DSG', 'TST']
  actualPath: string[];    // What we found
  missingLinks: string[];  // Which transitions are missing
  severity: ValidationSeverity;
}

/**
 * Priority-weighted coverage metrics
 */
export interface PriorityWeightedCoverage {
  priority: string;
  total: number;
  covered: number;
  percentage: number;
  threshold: number;
  meets_threshold: boolean;
  missing: string[];
}

/**
 * Baseline stability issue
 */
export interface BaselineIssue {
  id: string;
  baseline: string;
  issue: 'not_approved' | 'not_implemented' | 'downstream_not_baselined' | 'version_conflict';
  severity: ValidationSeverity;
  affectedIds: string[];
  details: string;
}

/**
 * Actionable gap analysis recommendation
 */
export interface GapRecommendation {
  severity: ValidationSeverity;
  category: ValidationCategory;
  action: string;
  description: string;
  affectedCount: number;
  affectedIds: string[];
  estimatedEffort: 'low' | 'medium' | 'high';
  priority: number;  // For sorting
}

/**
 * Configuration for deep validation thresholds
 */
export interface DeepValidationConfig {
  hierarchicalCoverage: {
    satisfies: { threshold: number; fromTypes: string[]; toTypes: string[] };
    implements: { threshold: number; fromTypes: string[]; toTypes: string[] };
    tests: { threshold: number; fromTypes: string[]; toTypes: string[] };
  };
  priorityWeightedCoverage: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  statusConsistency: {
    enforceApprovedChain: boolean;
    enforceImplementedChain: boolean;
  };
  baselineStability: {
    requireApproved: boolean;
    requireDownstreamBaselined: boolean;
  };
  cycleSeverity: {
    length2: ValidationSeverity;
    length3_5: ValidationSeverity;
    length6plus: ValidationSeverity;
  };
  orphanSeverity: {
    critical: ValidationSeverity;
    high: ValidationSeverity;
    medium: ValidationSeverity;
    low: ValidationSeverity;
  };
}

/**
 * Complete deep validation report
 */
export interface DeepValidationReport {
  timestamp: Date;
  summary: {
    totalRequirements: number;
    totalIssues: number;
    blockerCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    infoCount: number;
  };
  circularDependencies: CircularDependency[];
  hierarchicalCoverage: HierarchicalCoverage[];
  orphanedRequirements: OrphanedRequirement[];
  statusInconsistencies: StatusInconsistency[];
  incompleteChains: IncompleteChain[];
  priorityWeightedCoverage: PriorityWeightedCoverage[];
  baselineIssues: BaselineIssue[];
  gapRecommendations: GapRecommendation[];
  findings: ValidationFinding[];
  config: DeepValidationConfig;
}

/**
 * Default deep validation configuration
 */
export const DEFAULT_DEEP_VALIDATION_CONFIG: DeepValidationConfig = {
  hierarchicalCoverage: {
    satisfies: { threshold: 90, fromTypes: ['requirement'], toTypes: ['requirement'] },
    implements: { threshold: 85, fromTypes: ['requirement'], toTypes: ['specification'] },
    tests: { threshold: 80, fromTypes: ['specification'], toTypes: ['parameter'] }
  },
  priorityWeightedCoverage: {
    critical: 100,
    high: 95,
    medium: 85,
    low: 70
  },
  statusConsistency: {
    enforceApprovedChain: true,
    enforceImplementedChain: true
  },
  baselineStability: {
    requireApproved: true,
    requireDownstreamBaselined: true
  },
  cycleSeverity: {
    length2: ValidationSeverity.HIGH,
    length3_5: ValidationSeverity.MEDIUM,
    length6plus: ValidationSeverity.LOW
  },
  orphanSeverity: {
    critical: ValidationSeverity.BLOCKER,
    high: ValidationSeverity.HIGH,
    medium: ValidationSeverity.MEDIUM,
    low: ValidationSeverity.LOW
  }
};

/**
 * Extract configuration from Rigr config or use defaults
 */
export function getDeepValidationConfig(rigrConfig?: RigrConfig): DeepValidationConfig {
  // In future, parse from rigrConfig.extra.rigr_validation_thresholds
  // For now, use defaults
  return DEFAULT_DEEP_VALIDATION_CONFIG;
}

/**
 * Build adjacency list from requirements
 */
export function buildGraph(requirements: RequirementObject[]): Map<string, Map<string, string[]>> {
  const graph = new Map<string, Map<string, string[]>>();
  
  for (const req of requirements) {
    if (!graph.has(req.id)) {
      graph.set(req.id, new Map());
    }
    
    const edges = graph.get(req.id)!;
    
    for (const [linkType, targetIds] of Object.entries(req.links)) {
      if (!edges.has(linkType)) {
        edges.set(linkType, []);
      }
      edges.get(linkType)!.push(...targetIds);
    }
  }
  
  return graph;
}

/**
 * Get requirement by ID
 */
export function getRequirementById(
  requirements: RequirementObject[],
  id: string
): RequirementObject | undefined {
  return requirements.find(req => req.id === id);
}

/**
 * Get all outgoing links for a requirement (all link types combined)
 */
export function getAllOutgoingLinks(req: RequirementObject): string[] {
  const allLinks: string[] = [];
  for (const targetIds of Object.values(req.links)) {
    allLinks.push(...targetIds);
  }
  return allLinks;
}

/**
 * Get all incoming links for a requirement
 */
export function getAllIncomingLinks(
  requirements: RequirementObject[],
  targetId: string
): string[] {
  const incoming: string[] = [];
  for (const req of requirements) {
    const outgoing = getAllOutgoingLinks(req);
    if (outgoing.includes(targetId)) {
      incoming.push(req.id);
    }
  }
  return incoming;
}

/**
 * Check if requirement has any links of specified types
 */
export function hasLinksOfType(
  req: RequirementObject,
  linkTypes: string[]
): boolean {
  for (const linkType of linkTypes) {
    const links = req.links[linkType];
    if (links && links.length > 0) {
      return true;
    }
  }
  return false;
}

/**
 * Get type prefix from requirement ID (e.g., 'STK' from 'STK001')
 */
export function getTypePrefix(id: string): string {
  const match = id.match(/^([A-Z]+)/);
  return match ? match[1] : '';
}
