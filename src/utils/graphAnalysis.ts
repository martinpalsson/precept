/**
 * Graph Analysis - Circular dependency detection, coverage analysis
 */

import { RequirementIndex, RequirementObject, DeepValidationResult, DiagnosticType, ValidationIssue } from '../types';

/**
 * Detect circular dependencies using DFS
 */
export function detectCircularDependencies(
  requirements: RequirementObject[]
): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const path: string[] = [];

  // Build adjacency list
  const graph = new Map<string, string[]>();
  for (const req of requirements) {
    const links: string[] = [];
    for (const linkedIds of Object.values(req.links)) {
      links.push(...linkedIds);
    }
    graph.set(req.id, links);
  }

  function dfs(nodeId: string): void {
    visited.add(nodeId);
    recursionStack.add(nodeId);
    path.push(nodeId);

    const neighbors = graph.get(nodeId) || [];

    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (graph.has(neighbor)) {
          dfs(neighbor);
        }
      } else if (recursionStack.has(neighbor)) {
        // Found a cycle
        const cycleStart = path.indexOf(neighbor);
        if (cycleStart !== -1) {
          const cycle = path.slice(cycleStart);
          cycle.push(neighbor); // Complete the cycle
          cycles.push(cycle);
        }
      }
    }

    path.pop();
    recursionStack.delete(nodeId);
  }

  for (const req of requirements) {
    if (!visited.has(req.id)) {
      dfs(req.id);
    }
  }

  // Deduplicate cycles (same cycle can be detected from different starting points)
  const uniqueCycles: string[][] = [];
  const seenCycles = new Set<string>();

  for (const cycle of cycles) {
    // Normalize cycle by starting from the smallest element
    const normalized = normalizeCycle(cycle);
    const key = normalized.join('->');

    if (!seenCycles.has(key)) {
      seenCycles.add(key);
      uniqueCycles.push(normalized);
    }
  }

  return uniqueCycles;
}

/**
 * Normalize a cycle to start from the smallest element
 */
function normalizeCycle(cycle: string[]): string[] {
  if (cycle.length <= 1) {
    return cycle;
  }

  // Remove the last element if it's same as first (closing the cycle)
  const cleanCycle = cycle[0] === cycle[cycle.length - 1]
    ? cycle.slice(0, -1)
    : cycle;

  // Find minimum element index
  let minIndex = 0;
  for (let i = 1; i < cleanCycle.length; i++) {
    if (cleanCycle[i] < cleanCycle[minIndex]) {
      minIndex = i;
    }
  }

  // Rotate to start from minimum
  return [...cleanCycle.slice(minIndex), ...cleanCycle.slice(0, minIndex)];
}

/**
 * Find orphaned requirements (no incoming or outgoing links)
 */
export function findOrphanedRequirements(
  requirements: RequirementObject[],
  index: RequirementIndex
): string[] {
  const orphaned: string[] = [];

  for (const req of requirements) {
    // Check outgoing links
    const hasOutgoing = Object.values(req.links).some(ids => ids.length > 0);

    // Check incoming links
    const linkedIds = index.linkGraph.get(req.id);
    const hasIncoming = linkedIds !== undefined && linkedIds.size > 0;

    if (!hasOutgoing && !hasIncoming) {
      orphaned.push(req.id);
    }
  }

  return orphaned;
}

/**
 * Calculate coverage statistics
 */
export function calculateCoverage(
  requirements: RequirementObject[]
): { total: number; withLinks: number; percentage: number } {
  const total = requirements.length;

  const withLinks = requirements.filter(req => {
    return Object.values(req.links).some(ids => ids.length > 0);
  }).length;

  const percentage = total > 0 ? Math.round((withLinks / total) * 100) : 0;

  return { total, withLinks, percentage };
}

/**
 * Calculate traceability matrix coverage
 */
export function calculateTraceabilityMatrix(
  requirements: RequirementObject[],
  typeHierarchy: string[][] // e.g., [['STK', 'SYS'], ['SYS', 'DSG'], ['DSG', 'TST']]
): Record<string, Record<string, { covered: number; total: number }>> {
  const matrix: Record<string, Record<string, { covered: number; total: number }>> = {};

  for (const [sourceType, targetType] of typeHierarchy) {
    if (!matrix[sourceType]) {
      matrix[sourceType] = {};
    }

    const sourceReqs = requirements.filter(r =>
      r.type === sourceType || r.id.startsWith(sourceType + '_')
    );

    const targetReqs = requirements.filter(r =>
      r.type === targetType || r.id.startsWith(targetType + '_')
    );

    const targetIds = new Set(targetReqs.map(r => r.id));

    let covered = 0;
    for (const req of sourceReqs) {
      const hasLink = Object.values(req.links).some(ids =>
        ids.some(id => targetIds.has(id))
      );
      if (hasLink) {
        covered++;
      }
    }

    matrix[sourceType][targetType] = {
      covered,
      total: sourceReqs.length,
    };
  }

  return matrix;
}

/**
 * Check status consistency (e.g., approved req linking to draft)
 */
export function checkStatusConsistency(
  requirements: RequirementObject[],
  statusOrder: string[] // e.g., ['draft', 'review', 'approved', 'implemented']
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const reqMap = new Map(requirements.map(r => [r.id, r]));

  const statusRank = new Map(statusOrder.map((s, i) => [s, i]));

  for (const req of requirements) {
    if (!req.status) {
      continue;
    }

    const reqRank = statusRank.get(req.status);
    if (reqRank === undefined) {
      continue;
    }

    for (const linkedIds of Object.values(req.links)) {
      for (const linkedId of linkedIds) {
        const linkedReq = reqMap.get(linkedId);
        if (!linkedReq || !linkedReq.status) {
          continue;
        }

        const linkedRank = statusRank.get(linkedReq.status);
        if (linkedRank === undefined) {
          continue;
        }

        // Flag if approved requirement links to draft requirement
        if (reqRank > linkedRank && reqRank >= statusOrder.indexOf('approved')) {
          issues.push({
            type: DiagnosticType.StatusInconsistent,
            message: `'${req.id}' (${req.status}) links to '${linkedId}' (${linkedReq.status})`,
            location: req.location,
            relatedIds: [linkedId],
            severity: 'warning',
          });
        }
      }
    }
  }

  return issues;
}

/**
 * Perform deep validation analysis
 */
export function performDeepValidation(
  requirements: RequirementObject[],
  index: RequirementIndex,
  statusOrder: string[] = ['draft', 'review', 'approved', 'implemented']
): DeepValidationResult {
  const issues: ValidationIssue[] = [];

  // Detect circular dependencies
  const circularDeps = detectCircularDependencies(requirements);

  for (const cycle of circularDeps) {
    const firstReq = requirements.find(r => r.id === cycle[0]);
    if (firstReq) {
      issues.push({
        type: DiagnosticType.CircularDep,
        message: `Circular dependency: ${cycle.join(' -> ')}`,
        location: firstReq.location,
        relatedIds: cycle,
        severity: 'warning',
      });
    }
  }

  // Find orphaned requirements
  const orphanedReqs = findOrphanedRequirements(requirements, index);

  for (const orphanId of orphanedReqs) {
    const req = requirements.find(r => r.id === orphanId);
    if (req) {
      issues.push({
        type: DiagnosticType.OrphanedReq,
        message: `Orphaned requirement: '${orphanId}' has no links`,
        location: req.location,
        severity: 'info',
      });
    }
  }

  // Check status consistency
  const statusIssues = checkStatusConsistency(requirements, statusOrder);
  issues.push(...statusIssues);

  // Calculate coverage
  const coverage = calculateCoverage(requirements);

  return {
    issues,
    coverage,
    circularDeps,
    orphanedReqs,
  };
}

/**
 * Get all requirements that depend on a given requirement (reverse dependencies)
 */
export function getReverseDependencies(
  id: string,
  requirements: RequirementObject[]
): string[] {
  const dependents: string[] = [];

  for (const req of requirements) {
    for (const linkedIds of Object.values(req.links)) {
      if (linkedIds.includes(id)) {
        dependents.push(req.id);
        break;
      }
    }
  }

  return dependents;
}

/**
 * Get the full dependency chain for a requirement
 */
export function getDependencyChain(
  id: string,
  requirements: RequirementObject[],
  direction: 'upstream' | 'downstream'
): string[] {
  const chain: string[] = [];
  const visited = new Set<string>();
  const reqMap = new Map(requirements.map(r => [r.id, r]));

  function traverse(currentId: string): void {
    if (visited.has(currentId)) {
      return;
    }
    visited.add(currentId);

    if (direction === 'downstream') {
      // Get requirements that this one links to
      const req = reqMap.get(currentId);
      if (req) {
        for (const linkedIds of Object.values(req.links)) {
          for (const linkedId of linkedIds) {
            chain.push(linkedId);
            traverse(linkedId);
          }
        }
      }
    } else {
      // Get requirements that link to this one
      for (const req of requirements) {
        for (const linkedIds of Object.values(req.links)) {
          if (linkedIds.includes(currentId)) {
            chain.push(req.id);
            traverse(req.id);
          }
        }
      }
    }
  }

  traverse(id);
  return chain;
}
