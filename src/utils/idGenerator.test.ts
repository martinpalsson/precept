/**
 * Unit tests for ID Generator utilities
 */

import {
  generateNextId,
  isValidId,
  parseId,
  getIdsSorted,
  getIdsByLevel,
  findIdGaps,
  suggestNextId,
} from './idGenerator';
import { RequirementObject, IdConfig } from '../types';

const defaultIdConfig: IdConfig = {
  prefix: '',
  separator: '',
  padding: 4,
  start: 1,
};

const prefixedIdConfig: IdConfig = {
  prefix: 'REQ',
  separator: '-',
  padding: 4,
  start: 1,
};

function createMockRequirement(id: string, level?: string): RequirementObject {
  return {
    id,
    type: 'requirement',
    level,
    title: `Requirement ${id}`,
    description: 'Test description',
    links: {},
    metadata: {},
    location: { file: '/test/file.rst', line: 1 },
  };
}

describe('idGenerator', () => {
  describe('generateNextId with numeric IDs', () => {
    it('should generate first ID when no existing', () => {
      const nextId = generateNextId(defaultIdConfig, []);
      expect(nextId).toBe('0001');
    });

    it('should increment from highest existing ID', () => {
      const existing = [
        createMockRequirement('0001'),
        createMockRequirement('0005'),
        createMockRequirement('0003'),
      ];

      const nextId = generateNextId(defaultIdConfig, existing);
      expect(nextId).toBe('0006');
    });

    it('should use configured padding', () => {
      const config: IdConfig = { ...defaultIdConfig, padding: 6 };
      const existing = [createMockRequirement('000001')];

      const nextId = generateNextId(config, existing);
      expect(nextId).toBe('000002');
    });

    it('should use configured start value', () => {
      const config: IdConfig = { ...defaultIdConfig, start: 100 };
      const nextId = generateNextId(config, []);
      expect(nextId).toBe('0100');
    });
  });

  describe('generateNextId with prefixed IDs', () => {
    it('should generate first prefixed ID', () => {
      const nextId = generateNextId(prefixedIdConfig, []);
      expect(nextId).toBe('REQ-0001');
    });

    it('should increment prefixed ID', () => {
      const existing = [
        createMockRequirement('REQ-0001'),
        createMockRequirement('REQ-0005'),
      ];

      const nextId = generateNextId(prefixedIdConfig, existing);
      expect(nextId).toBe('REQ-0006');
    });
  });

  describe('isValidId', () => {
    it('should validate correct numeric IDs', () => {
      expect(isValidId('0001', defaultIdConfig)).toBe(true);
      expect(isValidId('0123', defaultIdConfig)).toBe(true);
      expect(isValidId('9999', defaultIdConfig)).toBe(true);
    });

    it('should validate correct prefixed IDs', () => {
      expect(isValidId('REQ-0001', prefixedIdConfig)).toBe(true);
      expect(isValidId('REQ-0123', prefixedIdConfig)).toBe(true);
    });

    it('should reject invalid IDs', () => {
      expect(isValidId('ABC', defaultIdConfig)).toBe(false);
      expect(isValidId('0000', defaultIdConfig)).toBe(false); // 0 is not valid
      expect(isValidId('REQ-0001', defaultIdConfig)).toBe(false); // wrong format
      expect(isValidId('0001', prefixedIdConfig)).toBe(false); // missing prefix
    });
  });

  describe('parseId', () => {
    it('should parse numeric IDs', () => {
      expect(parseId('0001', defaultIdConfig)).toEqual({ number: 1 });
      expect(parseId('0123', defaultIdConfig)).toEqual({ number: 123 });
    });

    it('should parse prefixed IDs', () => {
      expect(parseId('REQ-0001', prefixedIdConfig)).toEqual({ number: 1 });
      expect(parseId('REQ-0123', prefixedIdConfig)).toEqual({ number: 123 });
    });

    it('should return null for invalid IDs', () => {
      expect(parseId('ABC', defaultIdConfig)).toBeNull();
      expect(parseId('REQ-0001', defaultIdConfig)).toBeNull();
    });
  });

  describe('getIdsSorted', () => {
    it('should sort IDs numerically', () => {
      const requirements = [
        createMockRequirement('0005'),
        createMockRequirement('0001'),
        createMockRequirement('0010'),
      ];

      const ids = getIdsSorted(defaultIdConfig, requirements);
      expect(ids).toEqual(['0001', '0005', '0010']);
    });
  });

  describe('getIdsByLevel', () => {
    it('should filter IDs by level', () => {
      const requirements = [
        createMockRequirement('0001', 'system'),
        createMockRequirement('0002', 'stakeholder'),
        createMockRequirement('0003', 'system'),
        createMockRequirement('0004', 'component'),
      ];

      const systemIds = getIdsByLevel('system', defaultIdConfig, requirements);
      expect(systemIds).toEqual(['0001', '0003']);

      const stakeholderIds = getIdsByLevel('stakeholder', defaultIdConfig, requirements);
      expect(stakeholderIds).toEqual(['0002']);
    });

    it('should return empty array for non-matching level', () => {
      const requirements = [
        createMockRequirement('0001', 'system'),
      ];

      const ids = getIdsByLevel('hardware', defaultIdConfig, requirements);
      expect(ids).toHaveLength(0);
    });
  });

  describe('findIdGaps', () => {
    it('should find gaps in ID sequence', () => {
      const requirements = [
        createMockRequirement('0001'),
        createMockRequirement('0003'),
        createMockRequirement('0005'),
      ];

      const gaps = findIdGaps(defaultIdConfig, requirements);

      expect(gaps).toContain(2);
      expect(gaps).toContain(4);
      expect(gaps).not.toContain(1);
      expect(gaps).not.toContain(3);
    });

    it('should return empty array when no gaps', () => {
      const requirements = [
        createMockRequirement('0001'),
        createMockRequirement('0002'),
        createMockRequirement('0003'),
      ];

      const gaps = findIdGaps(defaultIdConfig, requirements);
      expect(gaps).toHaveLength(0);
    });
  });

  describe('suggestNextId', () => {
    it('should suggest next ID without filling gaps by default', () => {
      const requirements = [
        createMockRequirement('0001'),
        createMockRequirement('0003'),
      ];

      const nextId = suggestNextId(defaultIdConfig, requirements, false);
      expect(nextId).toBe('0004');
    });

    it('should fill gaps when requested', () => {
      const requirements = [
        createMockRequirement('0001'),
        createMockRequirement('0003'),
      ];

      const nextId = suggestNextId(defaultIdConfig, requirements, true);
      expect(nextId).toBe('0002');
    });

    it('should fall back to next ID when no gaps', () => {
      const requirements = [
        createMockRequirement('0001'),
        createMockRequirement('0002'),
      ];

      const nextId = suggestNextId(defaultIdConfig, requirements, true);
      expect(nextId).toBe('0003');
    });
  });
});
