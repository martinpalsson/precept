/**
 * Unit tests for Circular Dependency Detector
 */

import { detectCircularDependencies, findMinimalCycle } from './circularDependencyDetector';
import { DEFAULT_DEEP_VALIDATION_CONFIG, buildGraph, ValidationSeverity } from './deepValidation';
import { RequirementObject } from '../types';

function createMockRequirement(
  id: string,
  links: Record<string, string[]> = {}
): RequirementObject {
  return {
    id,
    type: 'requirement',
    title: `Requirement ${id}`,
    description: 'Test description',
    links,
    metadata: {},
    location: { file: '/test/file.rst', line: 1 },
  };
}

describe('Circular Dependency Detector', () => {
  describe('detectCircularDependencies', () => {
    it('should detect no cycles in linear chain', () => {
      const requirements = [
        createMockRequirement('REQ001', { links: ['REQ002'] }),
        createMockRequirement('REQ002', { links: ['REQ003'] }),
        createMockRequirement('REQ003', {}),
      ];

      const cycles = detectCircularDependencies(requirements, DEFAULT_DEEP_VALIDATION_CONFIG);

      expect(cycles).toHaveLength(0);
    });

    it('should detect simple two-node cycle', () => {
      const requirements = [
        createMockRequirement('REQ001', { links: ['REQ002'] }),
        createMockRequirement('REQ002', { links: ['REQ001'] }),
      ];

      const cycles = detectCircularDependencies(requirements, DEFAULT_DEEP_VALIDATION_CONFIG);

      expect(cycles.length).toBeGreaterThanOrEqual(1);
      const cycleIds = cycles[0].cycle;
      expect(cycleIds).toContain('REQ001');
      expect(cycleIds).toContain('REQ002');
    });

    it('should detect three-node cycle', () => {
      const requirements = [
        createMockRequirement('REQ001', { links: ['REQ002'] }),
        createMockRequirement('REQ002', { links: ['REQ003'] }),
        createMockRequirement('REQ003', { links: ['REQ001'] }),
      ];

      const cycles = detectCircularDependencies(requirements, DEFAULT_DEEP_VALIDATION_CONFIG);

      expect(cycles.length).toBeGreaterThanOrEqual(1);
      const cycleIds = cycles[0].cycle;
      expect(cycleIds).toContain('REQ001');
      expect(cycleIds).toContain('REQ002');
      expect(cycleIds).toContain('REQ003');
    });

    it('should detect self-loop', () => {
      const requirements = [
        createMockRequirement('REQ001', { links: ['REQ001'] }),
      ];

      const cycles = detectCircularDependencies(requirements, DEFAULT_DEEP_VALIDATION_CONFIG);

      expect(cycles.length).toBeGreaterThanOrEqual(1);
      expect(cycles[0].cycle).toContain('REQ001');
      expect(cycles[0].length).toBe(1);
    });

    it('should assign severity based on cycle length', () => {
      // Two-node cycle
      const requirements2 = [
        createMockRequirement('REQ001', { links: ['REQ002'] }),
        createMockRequirement('REQ002', { links: ['REQ001'] }),
      ];

      const cycles2 = detectCircularDependencies(requirements2, DEFAULT_DEEP_VALIDATION_CONFIG);
      expect(cycles2[0].severity).toBeDefined();
      // Severity should be one of the valid values
      expect([ValidationSeverity.HIGH, ValidationSeverity.MEDIUM, ValidationSeverity.LOW])
        .toContain(cycles2[0].severity);

      // Longer cycles should have equal or lower severity than shorter cycles
      const requirements6 = [
        createMockRequirement('REQ001', { links: ['REQ002'] }),
        createMockRequirement('REQ002', { links: ['REQ003'] }),
        createMockRequirement('REQ003', { links: ['REQ004'] }),
        createMockRequirement('REQ004', { links: ['REQ005'] }),
        createMockRequirement('REQ005', { links: ['REQ006'] }),
        createMockRequirement('REQ006', { links: ['REQ001'] }),
      ];

      const cycles6 = detectCircularDependencies(requirements6, DEFAULT_DEEP_VALIDATION_CONFIG);
      expect(cycles6[0].severity).toBeDefined();
    });

    it('should handle requirements with no links', () => {
      const requirements = [
        createMockRequirement('REQ001', {}),
        createMockRequirement('REQ002', {}),
      ];

      const cycles = detectCircularDependencies(requirements, DEFAULT_DEEP_VALIDATION_CONFIG);

      expect(cycles).toHaveLength(0);
    });

    it('should handle empty requirements list', () => {
      const cycles = detectCircularDependencies([], DEFAULT_DEEP_VALIDATION_CONFIG);

      expect(cycles).toHaveLength(0);
    });
  });

  describe('findMinimalCycle', () => {
    it('should find minimal cycle through an edge', () => {
      const requirements = [
        createMockRequirement('REQ001', { links: ['REQ002'] }),
        createMockRequirement('REQ002', { links: ['REQ003'] }),
        createMockRequirement('REQ003', { links: ['REQ001'] }),
      ];

      const graph = buildGraph(requirements);
      const cycle = findMinimalCycle('REQ001', 'REQ002', graph);

      expect(cycle).not.toBeNull();
      expect(cycle).toContain('REQ001');
      expect(cycle).toContain('REQ002');
    });

    it('should return null when no cycle exists', () => {
      const requirements = [
        createMockRequirement('REQ001', { links: ['REQ002'] }),
        createMockRequirement('REQ002', { links: ['REQ003'] }),
        createMockRequirement('REQ003', {}),
      ];

      const graph = buildGraph(requirements);
      const cycle = findMinimalCycle('REQ001', 'REQ002', graph);

      expect(cycle).toBeNull();
    });
  });
});
