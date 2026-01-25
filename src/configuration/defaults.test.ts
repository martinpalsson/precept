/**
 * Unit tests for Configuration Defaults
 */

import {
  DEFAULT_CONFIG,
  DEFAULT_OBJECT_TYPES,
  DEFAULT_LEVELS,
  DEFAULT_ID_CONFIG,
  DEFAULT_LINK_TYPES,
  DEFAULT_STATUSES,
  getObjectTypeValues,
  getLevelValues,
  getLinkOptionNames,
  getStatusNames,
  getObjectTypeInfo,
  getLevelInfo,
  getStatusInfo,
  buildIdRegex,
  formatId,
  parseIdNumber,
} from './defaults';

describe('Configuration Defaults', () => {
  describe('DEFAULT_CONFIG', () => {
    it('should have all required properties', () => {
      expect(DEFAULT_CONFIG.objectTypes).toBeDefined();
      expect(DEFAULT_CONFIG.levels).toBeDefined();
      expect(DEFAULT_CONFIG.idConfig).toBeDefined();
      expect(DEFAULT_CONFIG.linkTypes).toBeDefined();
      expect(DEFAULT_CONFIG.statuses).toBeDefined();
      expect(DEFAULT_CONFIG.id_regex).toBeDefined();
    });

    it('should have non-empty arrays', () => {
      expect(DEFAULT_CONFIG.objectTypes.length).toBeGreaterThan(0);
      expect(DEFAULT_CONFIG.levels.length).toBeGreaterThan(0);
      expect(DEFAULT_CONFIG.linkTypes.length).toBeGreaterThan(0);
      expect(DEFAULT_CONFIG.statuses.length).toBeGreaterThan(0);
    });
  });

  describe('getObjectTypeValues', () => {
    it('should return all object type values', () => {
      const types = getObjectTypeValues(DEFAULT_CONFIG);

      expect(types).toContain('requirement');
      expect(types.length).toBe(DEFAULT_OBJECT_TYPES.length);
    });
  });

  describe('getLevelValues', () => {
    it('should return all level values', () => {
      const levels = getLevelValues(DEFAULT_CONFIG);

      expect(levels.length).toBe(DEFAULT_LEVELS.length);
      expect(levels).toContain('stakeholder');
      expect(levels).toContain('system');
    });
  });

  describe('getLinkOptionNames', () => {
    it('should return all link option names including incoming/outgoing', () => {
      const options = getLinkOptionNames(DEFAULT_CONFIG);

      // Should include both option names and their inverses
      expect(options).toContain('links');
      expect(options).toContain('satisfies');
      expect(options).toContain('satisfied_by');
    });

    it('should return unique values', () => {
      const options = getLinkOptionNames(DEFAULT_CONFIG);
      const unique = new Set(options);

      expect(options.length).toBe(unique.size);
    });
  });

  describe('getStatusNames', () => {
    it('should return all status names', () => {
      const statuses = getStatusNames(DEFAULT_CONFIG);

      expect(statuses).toContain('draft');
      expect(statuses).toContain('approved');
      expect(statuses.length).toBe(DEFAULT_STATUSES.length);
    });
  });

  describe('getObjectTypeInfo', () => {
    it('should find existing object type', () => {
      const info = getObjectTypeInfo(DEFAULT_CONFIG, 'requirement');

      expect(info).toBeDefined();
      expect(info?.type).toBe('requirement');
      expect(info?.title).toBe('Requirement');
    });

    it('should return undefined for non-existent type', () => {
      const info = getObjectTypeInfo(DEFAULT_CONFIG, 'nonexistent');

      expect(info).toBeUndefined();
    });
  });

  describe('getLevelInfo', () => {
    it('should find existing level', () => {
      const info = getLevelInfo(DEFAULT_CONFIG, 'stakeholder');

      expect(info).toBeDefined();
      expect(info?.level).toBe('stakeholder');
      expect(info?.title).toBe('Stakeholder Requirements');
    });

    it('should return undefined for non-existent level', () => {
      const info = getLevelInfo(DEFAULT_CONFIG, 'nonexistent');

      expect(info).toBeUndefined();
    });
  });

  describe('getStatusInfo', () => {
    it('should find existing status', () => {
      const info = getStatusInfo(DEFAULT_CONFIG, 'draft');

      expect(info).toBeDefined();
      expect(info?.status).toBe('draft');
    });

    it('should return undefined for non-existent status', () => {
      const info = getStatusInfo(DEFAULT_CONFIG, 'nonexistent');

      expect(info).toBeUndefined();
    });
  });

  describe('buildIdRegex', () => {
    it('should build regex for numeric IDs', () => {
      const regex = buildIdRegex(DEFAULT_ID_CONFIG);
      expect('0001').toMatch(regex);
      expect('9999').toMatch(regex);
    });

    it('should build regex for prefixed IDs', () => {
      const regex = buildIdRegex({ prefix: 'REQ', separator: '-', padding: 4, start: 1 });
      expect('REQ-0001').toMatch(regex);
      expect('REQ-9999').toMatch(regex);
    });
  });

  describe('formatId', () => {
    it('should format numeric IDs', () => {
      expect(formatId(DEFAULT_ID_CONFIG, 1)).toBe('0001');
      expect(formatId(DEFAULT_ID_CONFIG, 42)).toBe('0042');
      expect(formatId(DEFAULT_ID_CONFIG, 999)).toBe('0999');
    });

    it('should format prefixed IDs', () => {
      const config = { prefix: 'REQ', separator: '-', padding: 4, start: 1 };
      expect(formatId(config, 1)).toBe('REQ-0001');
      expect(formatId(config, 42)).toBe('REQ-0042');
    });
  });

  describe('parseIdNumber', () => {
    it('should parse numeric IDs', () => {
      expect(parseIdNumber(DEFAULT_ID_CONFIG, '0001')).toBe(1);
      expect(parseIdNumber(DEFAULT_ID_CONFIG, '0042')).toBe(42);
    });

    it('should parse prefixed IDs', () => {
      const config = { prefix: 'REQ', separator: '-', padding: 4, start: 1 };
      expect(parseIdNumber(config, 'REQ-0001')).toBe(1);
      expect(parseIdNumber(config, 'REQ-0042')).toBe(42);
    });

    it('should return null for invalid IDs', () => {
      expect(parseIdNumber(DEFAULT_ID_CONFIG, 'ABC')).toBeNull();
      expect(parseIdNumber({ prefix: 'REQ', separator: '-', padding: 4, start: 1 }, '0001')).toBeNull();
    });
  });
});
