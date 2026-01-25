/**
 * Unit tests for Graph Analysis utilities
 */

import {
  detectCircularDependencies,
  findOrphanedRequirements,
  calculateCoverage,
  getReverseDependencies,
  getDependencyChain,
} from './graphAnalysis';
import { RequirementObject, RequirementIndex } from '../types';

function createMockRequirement(
  id: string,
  links: Record<string, string[]> = {}
): RequirementObject {
  return {
    id,
    type: 'req',
    title: `Requirement ${id}`,
    description: 'Test description',
    links,
    metadata: {},
    location: { file: '/test/file.rst', line: 1 },
  };
}

function createMockIndex(requirements: RequirementObject[]): RequirementIndex {
  const index: RequirementIndex = {
    objects: new Map(),
    fileIndex: new Map(),
    typeIndex: new Map(),
    levelIndex: new Map(),
    statusIndex: new Map(),
    linkGraph: new Map(),
    baselines: new Map(),
  };

  for (const req of requirements) {
    index.objects.set(req.id, req);
    // Only create a new Set if one doesn't already exist (to preserve reverse links)
    if (!index.linkGraph.has(req.id)) {
      index.linkGraph.set(req.id, new Set());
    }

    for (const linkedIds of Object.values(req.links)) {
      for (const linkedId of linkedIds) {
        index.linkGraph.get(req.id)!.add(linkedId);
        if (!index.linkGraph.has(linkedId)) {
          index.linkGraph.set(linkedId, new Set());
        }
        index.linkGraph.get(linkedId)!.add(req.id);
      }
    }
  }

  return index;
}

describe('graphAnalysis', () => {
  describe('detectCircularDependencies', () => {
    it('should detect no cycles in linear chain', () => {
      const requirements = [
        createMockRequirement('REQ_001', { links: ['REQ_002'] }),
        createMockRequirement('REQ_002', { links: ['REQ_003'] }),
        createMockRequirement('REQ_003', {}),
      ];

      const cycles = detectCircularDependencies(requirements);
      expect(cycles).toHaveLength(0);
    });

    it('should detect simple cycle', () => {
      const requirements = [
        createMockRequirement('REQ_001', { links: ['REQ_002'] }),
        createMockRequirement('REQ_002', { links: ['REQ_003'] }),
        createMockRequirement('REQ_003', { links: ['REQ_001'] }),
      ];

      const cycles = detectCircularDependencies(requirements);
      expect(cycles).toHaveLength(1);
      expect(cycles[0]).toContain('REQ_001');
      expect(cycles[0]).toContain('REQ_002');
      expect(cycles[0]).toContain('REQ_003');
    });

    it('should detect self-reference cycle', () => {
      const requirements = [
        createMockRequirement('REQ_001', { links: ['REQ_001'] }),
      ];

      const cycles = detectCircularDependencies(requirements);
      expect(cycles.length).toBeGreaterThanOrEqual(1);
    });

    it('should detect multiple independent cycles', () => {
      const requirements = [
        createMockRequirement('REQ_001', { links: ['REQ_002'] }),
        createMockRequirement('REQ_002', { links: ['REQ_001'] }),
        createMockRequirement('REQ_003', { links: ['REQ_004'] }),
        createMockRequirement('REQ_004', { links: ['REQ_003'] }),
      ];

      const cycles = detectCircularDependencies(requirements);
      expect(cycles.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('findOrphanedRequirements', () => {
    it('should identify orphaned requirements', () => {
      const requirements = [
        createMockRequirement('REQ_001', { links: ['REQ_002'] }),
        createMockRequirement('REQ_002', {}),
        createMockRequirement('REQ_003', {}), // orphaned
      ];
      const index = createMockIndex(requirements);

      const orphaned = findOrphanedRequirements(requirements, index);
      expect(orphaned).toContain('REQ_003');
      expect(orphaned).not.toContain('REQ_001');
      expect(orphaned).not.toContain('REQ_002');
    });

    it('should return empty array when no orphans', () => {
      const requirements = [
        createMockRequirement('REQ_001', { links: ['REQ_002'] }),
        createMockRequirement('REQ_002', { links: ['REQ_001'] }),
      ];
      const index = createMockIndex(requirements);

      const orphaned = findOrphanedRequirements(requirements, index);
      expect(orphaned).toHaveLength(0);
    });
  });

  describe('calculateCoverage', () => {
    it('should calculate correct coverage percentage', () => {
      const requirements = [
        createMockRequirement('REQ_001', { links: ['REQ_002'] }),
        createMockRequirement('REQ_002', { links: ['REQ_003'] }),
        createMockRequirement('REQ_003', {}),
        createMockRequirement('REQ_004', {}),
      ];

      const coverage = calculateCoverage(requirements);

      expect(coverage.total).toBe(4);
      expect(coverage.withLinks).toBe(2);
      expect(coverage.percentage).toBe(50);
    });

    it('should handle empty requirements', () => {
      const coverage = calculateCoverage([]);

      expect(coverage.total).toBe(0);
      expect(coverage.withLinks).toBe(0);
      expect(coverage.percentage).toBe(0);
    });

    it('should handle 100% coverage', () => {
      const requirements = [
        createMockRequirement('REQ_001', { links: ['REQ_002'] }),
        createMockRequirement('REQ_002', { links: ['REQ_001'] }),
      ];

      const coverage = calculateCoverage(requirements);

      expect(coverage.percentage).toBe(100);
    });
  });

  describe('getReverseDependencies', () => {
    it('should find all requirements that depend on a given ID', () => {
      const requirements = [
        createMockRequirement('REQ_001', { links: ['REQ_003'] }),
        createMockRequirement('REQ_002', { links: ['REQ_003'] }),
        createMockRequirement('REQ_003', {}),
      ];

      const deps = getReverseDependencies('REQ_003', requirements);

      expect(deps).toContain('REQ_001');
      expect(deps).toContain('REQ_002');
      expect(deps).toHaveLength(2);
    });

    it('should return empty array when no dependents', () => {
      const requirements = [
        createMockRequirement('REQ_001', {}),
        createMockRequirement('REQ_002', {}),
      ];

      const deps = getReverseDependencies('REQ_001', requirements);
      expect(deps).toHaveLength(0);
    });
  });

  describe('getDependencyChain', () => {
    it('should get downstream dependency chain', () => {
      const requirements = [
        createMockRequirement('REQ_001', { links: ['REQ_002'] }),
        createMockRequirement('REQ_002', { links: ['REQ_003'] }),
        createMockRequirement('REQ_003', {}),
      ];

      const chain = getDependencyChain('REQ_001', requirements, 'downstream');

      expect(chain).toContain('REQ_002');
      expect(chain).toContain('REQ_003');
    });

    it('should get upstream dependency chain', () => {
      const requirements = [
        createMockRequirement('REQ_001', { links: ['REQ_002'] }),
        createMockRequirement('REQ_002', { links: ['REQ_003'] }),
        createMockRequirement('REQ_003', {}),
      ];

      const chain = getDependencyChain('REQ_003', requirements, 'upstream');

      expect(chain).toContain('REQ_002');
      expect(chain).toContain('REQ_001');
    });
  });
});
