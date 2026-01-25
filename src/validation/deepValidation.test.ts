/**
 * Unit tests for Deep Validation utilities
 */

import {
  buildGraph,
  getAllOutgoingLinks,
  getAllIncomingLinks,
  getTypePrefix,
  DEFAULT_DEEP_VALIDATION_CONFIG,
  ValidationSeverity,
} from './deepValidation';
import { RequirementObject } from '../types';

function createMockRequirement(
  id: string,
  type: string = 'requirement',
  links: Record<string, string[]> = {},
  status: string = 'draft'
): RequirementObject {
  return {
    id,
    type,
    title: `Requirement ${id}`,
    description: 'Test description',
    status,
    links,
    metadata: {},
    location: { file: '/test/file.rst', line: 1 },
  };
}

describe('Deep Validation', () => {
  describe('buildGraph', () => {
    it('should build graph from requirements', () => {
      const requirements = [
        createMockRequirement('REQ001', 'requirement', { implements: ['DSE001'] }),
        createMockRequirement('DSE001', 'design_element', {}),
      ];

      const graph = buildGraph(requirements);

      expect(graph.has('REQ001')).toBe(true);
      expect(graph.has('DSE001')).toBe(true);
      expect(graph.get('REQ001')?.get('implements')).toContain('DSE001');
    });

    it('should handle multiple link types', () => {
      const requirements = [
        createMockRequirement('REQ001', 'requirement', {
          implements: ['DSE001'],
          derives: ['REQ002'],
        }),
        createMockRequirement('REQ002', 'requirement', {}),
        createMockRequirement('DSE001', 'design_element', {}),
      ];

      const graph = buildGraph(requirements);
      const req001Edges = graph.get('REQ001');

      expect(req001Edges?.get('implements')).toContain('DSE001');
      expect(req001Edges?.get('derives')).toContain('REQ002');
    });

    it('should handle requirements with no links', () => {
      const requirements = [
        createMockRequirement('REQ001', 'requirement', {}),
      ];

      const graph = buildGraph(requirements);

      expect(graph.has('REQ001')).toBe(true);
      expect(graph.get('REQ001')?.size).toBe(0);
    });
  });

  describe('getAllOutgoingLinks', () => {
    it('should return all outgoing links', () => {
      const req = createMockRequirement('REQ001', 'requirement', {
        implements: ['DSE001', 'DSE002'],
        derives: ['REQ002'],
      });

      const outgoing = getAllOutgoingLinks(req);

      expect(outgoing).toContain('DSE001');
      expect(outgoing).toContain('DSE002');
      expect(outgoing).toContain('REQ002');
      expect(outgoing.length).toBe(3);
    });

    it('should return empty array for no links', () => {
      const req = createMockRequirement('REQ001', 'requirement', {});

      const outgoing = getAllOutgoingLinks(req);

      expect(outgoing).toHaveLength(0);
    });
  });

  describe('getAllIncomingLinks', () => {
    it('should find all requirements linking to target', () => {
      const requirements = [
        createMockRequirement('REQ001', 'requirement', { implements: ['DSE001'] }),
        createMockRequirement('REQ002', 'requirement', { implements: ['DSE001'] }),
        createMockRequirement('DSE001', 'design_element', {}),
      ];

      const incoming = getAllIncomingLinks(requirements, 'DSE001');

      expect(incoming).toContain('REQ001');
      expect(incoming).toContain('REQ002');
      expect(incoming.length).toBe(2);
    });

    it('should return empty array when no incoming links', () => {
      const requirements = [
        createMockRequirement('REQ001', 'requirement', {}),
        createMockRequirement('REQ002', 'requirement', {}),
      ];

      const incoming = getAllIncomingLinks(requirements, 'REQ001');

      expect(incoming).toHaveLength(0);
    });
  });

  describe('getTypePrefix', () => {
    it('should extract prefix from ID', () => {
      expect(getTypePrefix('REQ001')).toBe('REQ');
      expect(getTypePrefix('DSE123')).toBe('DSE');
      expect(getTypePrefix('STK001')).toBe('STK');
    });

    it('should handle IDs with underscores', () => {
      expect(getTypePrefix('REQ_001')).toBe('REQ');
    });

    it('should return empty string for invalid ID', () => {
      expect(getTypePrefix('123')).toBe('');
      expect(getTypePrefix('')).toBe('');
    });
  });

  describe('DEFAULT_DEEP_VALIDATION_CONFIG', () => {
    it('should have all required severity settings', () => {
      expect(DEFAULT_DEEP_VALIDATION_CONFIG.cycleSeverity.length2).toBe(ValidationSeverity.HIGH);
      expect(DEFAULT_DEEP_VALIDATION_CONFIG.cycleSeverity.length3_5).toBe(ValidationSeverity.MEDIUM);
      expect(DEFAULT_DEEP_VALIDATION_CONFIG.cycleSeverity.length6plus).toBe(ValidationSeverity.LOW);
    });

    it('should have coverage thresholds', () => {
      expect(DEFAULT_DEEP_VALIDATION_CONFIG.hierarchicalCoverage.satisfies.threshold).toBeGreaterThan(0);
      expect(DEFAULT_DEEP_VALIDATION_CONFIG.hierarchicalCoverage.implements.threshold).toBeGreaterThan(0);
    });

    it('should have priority thresholds', () => {
      expect(DEFAULT_DEEP_VALIDATION_CONFIG.priorityWeightedCoverage.critical).toBe(100);
      expect(DEFAULT_DEEP_VALIDATION_CONFIG.priorityWeightedCoverage.high).toBeLessThan(100);
    });
  });
});
