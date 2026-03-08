jest.mock('vscode', () => ({
  window: {
    showInformationMessage: jest.fn(),
  },
}), { virtual: true });

import {
  findMissingFields,
  needsRepair,
  repairConfig,
} from './configRepair';

describe('config repair', () => {
  describe('findMissingFields', () => {
    it('returns missing field names', () => {
      const raw = { project: 'Test' };
      const missing = findMissingFields(raw);
      expect(missing).toContain('headingStyles');
    });

    it('returns empty array when all fields present', () => {
      const raw = {
        project: 'Test',
        headingStyles: [{ char: '=', overline: false }],
      };
      expect(findMissingFields(raw)).toEqual([]);
    });
  });

  describe('needsRepair', () => {
    it('returns true when expected fields are missing', () => {
      expect(needsRepair({ project: 'Test' })).toBe(true);
    });

    it('returns false when all expected fields are present', () => {
      const raw = {
        project: 'Test',
        headingStyles: [{ char: '=', overline: false }],
      };
      expect(needsRepair(raw)).toBe(false);
    });
  });

  describe('repairConfig', () => {
    it('adds missing headingStyles with defaults', () => {
      const raw = { project: 'Test' };
      const result = repairConfig(raw);
      expect(result.headingStyles).toBeDefined();
      expect(Array.isArray(result.headingStyles)).toBe(true);
      expect((result.headingStyles as unknown[]).length).toBe(6);
    });

    it('preserves existing fields', () => {
      const raw = {
        project: 'My Project',
        objectTypes: [{ type: 'custom', title: 'Custom' }],
      };
      const result = repairConfig(raw);
      expect(result.project).toBe('My Project');
      expect(result.objectTypes).toEqual([{ type: 'custom', title: 'Custom' }]);
    });

    it('does not overwrite existing headingStyles', () => {
      const customStyles = [{ char: '=', overline: false }];
      const raw = { project: 'Test', headingStyles: customStyles };
      const result = repairConfig(raw);
      expect(result.headingStyles).toEqual(customStyles);
    });

    it('does not mutate the original object', () => {
      const raw = { project: 'Test' };
      const result = repairConfig(raw);
      expect(raw).not.toHaveProperty('headingStyles');
      expect(result).toHaveProperty('headingStyles');
    });

    it('is idempotent — repairing a complete config changes nothing', () => {
      const raw = {
        project: 'Test',
        headingStyles: [{ char: '#', overline: true }],
        objectTypes: [{ type: 'req', title: 'Req' }],
      };
      const result = repairConfig(raw);
      expect(result).toEqual(raw);
    });

    it('preserves all user data while adding missing fields', () => {
      const raw = {
        project: 'My RMS',
        objectTypes: [{ type: 'req', title: 'Requirement' }],
        linkTypes: [{ option: 'satisfies', incoming: 'satisfied_by', outgoing: 'satisfies' }],
        customFields: { priority: [{ value: 'high', title: 'High' }] },
      };
      const result = repairConfig(raw);

      // User data intact
      expect(result.project).toBe('My RMS');
      expect(result.objectTypes).toEqual(raw.objectTypes);
      expect(result.linkTypes).toEqual(raw.linkTypes);
      expect(result.customFields).toEqual(raw.customFields);

      // Missing field added
      expect(result.headingStyles).toBeDefined();
    });
  });
});
