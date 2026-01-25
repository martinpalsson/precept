/**
 * DV-002: Hierarchical Traceability Coverage
 * 
 * Calculates coverage percentages for each link type in the traceability chain:
 * - STK→SYS (satisfies): % of stakeholder requirements with system requirements
 * - SYS→DSG (implements): % of system requirements with design specifications
 * - DSG→TST (tests): % of design specifications with test parameters
 */

import { RequirementObject } from '../types';
import {
  HierarchicalCoverage,
  DeepValidationConfig,
  hasLinksOfType,
  getTypePrefix
} from './deepValidation';

/**
 * Calculate hierarchical coverage for all configured link types
 */
export function calculateHierarchicalCoverage(
  requirements: RequirementObject[],
  config: DeepValidationConfig
): HierarchicalCoverage[] {
  const results: HierarchicalCoverage[] = [];
  
  // Calculate for each configured link type
  for (const [linkType, linkConfig] of Object.entries(config.hierarchicalCoverage)) {
    const coverage = calculateCoverageForLinkType(
      requirements,
      linkType,
      linkConfig.fromTypes,
      linkConfig.toTypes,
      linkConfig.threshold
    );
    results.push(coverage);
  }
  
  return results;
}

/**
 * Calculate coverage for a specific link type
 */
function calculateCoverageForLinkType(
  requirements: RequirementObject[],
  linkType: string,
  fromTypes: string[],
  toTypes: string[],
  threshold: number
): HierarchicalCoverage {
  // Filter requirements by type
  const sourceRequirements = requirements.filter(req => {
    return fromTypes.includes(req.type);
  });
  
  // Find which source requirements have links of this type
  const withLinks: RequirementObject[] = [];
  const missing: string[] = [];
  
  for (const req of sourceRequirements) {
    const links = req.links[linkType];
    if (links && links.length > 0) {
      // Verify at least one target exists and has correct type
      const validTargets = links.filter(targetId => {
        const target = requirements.find(r => r.id === targetId);
        return target && toTypes.includes(target.type);
      });
      
      if (validTargets.length > 0) {
        withLinks.push(req);
      } else {
        missing.push(req.id);
      }
    } else {
      missing.push(req.id);
    }
  }
  
  const total = sourceRequirements.length;
  const covered = withLinks.length;
  const percentage = total > 0 ? Math.round((covered / total) * 100) : 0;
  
  return {
    linkType,
    fromTypes,
    toTypes,
    total,
    withLinks: covered,
    percentage,
    threshold,
    meets_threshold: percentage >= threshold,
    missing
  };
}

/**
 * Get overall traceability coverage score (weighted average)
 */
export function getOverallCoverageScore(
  hierarchicalCoverage: HierarchicalCoverage[]
): number {
  if (hierarchicalCoverage.length === 0) return 0;
  
  let totalWeight = 0;
  let weightedSum = 0;
  
  for (const coverage of hierarchicalCoverage) {
    const weight = coverage.total; // Weight by number of requirements
    totalWeight += weight;
    weightedSum += coverage.percentage * weight;
  }
  
  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
}

/**
 * Get coverage by type prefix (e.g., all STK requirements)
 */
export function getCoverageByTypePrefix(
  requirements: RequirementObject[],
  typePrefix: string,
  linkTypes: string[]
): { total: number; covered: number; percentage: number; missing: string[] } {
  const typeRequirements = requirements.filter(req => {
    const prefix = getTypePrefix(req.id);
    return prefix === typePrefix;
  });
  
  const covered: RequirementObject[] = [];
  const missing: string[] = [];
  
  for (const req of typeRequirements) {
    if (hasLinksOfType(req, linkTypes)) {
      covered.push(req);
    } else {
      missing.push(req.id);
    }
  }
  
  const total = typeRequirements.length;
  const coveredCount = covered.length;
  const percentage = total > 0 ? Math.round((coveredCount / total) * 100) : 0;
  
  return { total, covered: coveredCount, percentage, missing };
}

/**
 * Build traceability matrix showing coverage between type pairs
 */
export function buildTraceabilityMatrix(
  requirements: RequirementObject[],
  linkTypes: string[]
): Map<string, Map<string, { covered: number; total: number }>> {
  const matrix = new Map<string, Map<string, { covered: number; total: number }>>();
  
  // Get all type prefixes
  const typePrefixes = new Set<string>();
  for (const req of requirements) {
    const prefix = getTypePrefix(req.id);
    if (prefix) {
      typePrefixes.add(prefix);
    }
  }
  
  // Build matrix
  for (const fromType of typePrefixes) {
    matrix.set(fromType, new Map());
    
    for (const toType of typePrefixes) {
      const fromReqs = requirements.filter(req => getTypePrefix(req.id) === fromType);
      let covered = 0;
      
      for (const req of fromReqs) {
        for (const linkType of linkTypes) {
          const links = req.links[linkType] || [];
          const hasLinkToType = links.some(targetId => {
            const target = requirements.find(r => r.id === targetId);
            return target && getTypePrefix(target.id) === toType;
          });
          
          if (hasLinkToType) {
            covered++;
            break; // Count each requirement only once
          }
        }
      }
      
      matrix.get(fromType)!.set(toType, {
        covered,
        total: fromReqs.length
      });
    }
  }
  
  return matrix;
}

/**
 * Get requirements missing specific link type
 */
export function getRequirementsMissingLinkType(
  requirements: RequirementObject[],
  linkType: string,
  fromTypes: string[]
): RequirementObject[] {
  return requirements.filter(req => {
    if (!fromTypes.includes(req.type)) return false;
    const links = req.links[linkType];
    return !links || links.length === 0;
  });
}
