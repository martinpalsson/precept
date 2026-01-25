/**
 * Unit tests for RST Parser
 */

import { parseRstFile, findIdAtPosition, isInLinkContext, isInInlineItemContext, getIdsInLine } from './rstParser';
import { RigrConfig } from '../types';
import { DEFAULT_CONFIG } from '../configuration/defaults';

describe('rstParser', () => {
  const testConfig: RigrConfig = {
    ...DEFAULT_CONFIG,
    objectTypes: [
      { type: 'requirement', title: 'Requirement' },
      { type: 'specification', title: 'Specification' },
      { type: 'test', title: 'Test Case' },
    ],
    idPrefixes: [
      { prefix: 'REQ', title: 'Requirements' },
      { prefix: 'SPEC', title: 'Specifications' },
      { prefix: 'TEST', title: 'Tests' },
    ],
  };

  describe('parseRstFile', () => {
    it('should parse a simple requirement', () => {
      const content = `
.. item:: Simple requirement title
   :id: REQ_001
   :type: requirement
   :status: draft

   This is the description.
`;
      const result = parseRstFile(content, '/test/file.rst', testConfig);

      expect(result.requirements).toHaveLength(1);
      expect(result.requirements[0].id).toBe('REQ_001');
      expect(result.requirements[0].type).toBe('requirement');
      expect(result.requirements[0].title).toBe('Simple requirement title');
      expect(result.requirements[0].status).toBe('draft');
      expect(result.requirements[0].description).toBe('This is the description.');
    });

    it('should parse multiple requirements', () => {
      const content = `
.. item:: First requirement
   :id: REQ_001
   :type: requirement
   :status: approved

   First description.

.. item:: First specification
   :id: SPEC_001
   :type: specification
   :status: draft
   :implements: REQ_001

   Spec description.
`;
      const result = parseRstFile(content, '/test/file.rst', testConfig);

      expect(result.requirements).toHaveLength(2);
      expect(result.requirements[0].id).toBe('REQ_001');
      expect(result.requirements[1].id).toBe('SPEC_001');
      expect(result.requirements[1].links).toHaveProperty('implements');
      expect(result.requirements[1].links['implements']).toContain('REQ_001');
    });

    it('should parse links with multiple IDs', () => {
      const content = `
.. item:: Requirement with multiple links
   :id: REQ_001
   :type: requirement
   :status: draft
   :links: REQ_002, REQ_003, REQ_004

   Description.
`;
      const result = parseRstFile(content, '/test/file.rst', testConfig);

      expect(result.requirements[0].links['links']).toHaveLength(3);
      expect(result.requirements[0].links['links']).toContain('REQ_002');
      expect(result.requirements[0].links['links']).toContain('REQ_003');
      expect(result.requirements[0].links['links']).toContain('REQ_004');
    });

    it('should parse multi-line descriptions', () => {
      const content = `
.. item:: Requirement with long description
   :id: REQ_001
   :type: requirement
   :status: draft

   This is the first paragraph of the description.
   It spans multiple lines.

   This is the second paragraph.
`;
      const result = parseRstFile(content, '/test/file.rst', testConfig);

      expect(result.requirements[0].description).toContain('first paragraph');
      expect(result.requirements[0].description).toContain('second paragraph');
    });

    it('should find inline references', () => {
      const content = `
See :item:\`REQ_001\` for more details.

Also check :item:\`SPEC_001\` and :item:\`TEST_001\`.
`;
      const result = parseRstFile(content, '/test/file.rst', testConfig);

      expect(result.references).toHaveLength(3);
      expect(result.references.map(r => r.id)).toContain('REQ_001');
      expect(result.references.map(r => r.id)).toContain('SPEC_001');
      expect(result.references.map(r => r.id)).toContain('TEST_001');
    });

    it('should track file locations', () => {
      const content = `Line 1
Line 2
.. item:: Requirement on line 3
   :id: REQ_001
   :type: requirement

   Description.
`;
      const result = parseRstFile(content, '/test/file.rst', testConfig);

      expect(result.requirements[0].location.file).toBe('/test/file.rst');
      expect(result.requirements[0].location.line).toBe(3);
    });

    it('should parse baseline field', () => {
      const content = `
.. item:: Requirement with baseline
   :id: REQ_001
   :type: requirement
   :status: approved
   :baseline: v1.0.0

   Description.
`;
      const result = parseRstFile(content, '/test/file.rst', testConfig);

      expect(result.requirements[0].baseline).toBe('v1.0.0');
    });

    it('should handle requirements without id', () => {
      const content = `
.. item:: Requirement without ID
   :type: requirement
   :status: draft

   This should generate a parse error.
`;
      const result = parseRstFile(content, '/test/file.rst', testConfig);

      expect(result.requirements).toHaveLength(0);
      expect(result.parseErrors).toHaveLength(1);
      expect(result.parseErrors[0].message).toContain('missing required :id:');
    });
  });

  describe('findIdAtPosition', () => {
    it('should find ID at cursor position', () => {
      const line = '   :links: REQ_001, REQ_002';
      const config = { ...testConfig, id_regex: /REQ_\d+/g };

      expect(findIdAtPosition(line, 12, config)).toBe('REQ_001');
      expect(findIdAtPosition(line, 21, config)).toBe('REQ_002');
    });

    it('should return null when not on an ID', () => {
      const line = '   :links: REQ_001, REQ_002';
      const config = { ...testConfig, id_regex: /REQ_\d+/g };

      expect(findIdAtPosition(line, 5, config)).toBeNull();
    });
  });

  describe('getIdsInLine', () => {
    it('should find all IDs in a line', () => {
      const line = 'See REQ_001, SPEC_002, and TEST_003 for details.';
      const config = { ...testConfig, id_regex: /(REQ_|SPEC_|TEST_)\d+/g };

      const ids = getIdsInLine(line, config);

      expect(ids).toHaveLength(3);
      expect(ids).toContain('REQ_001');
      expect(ids).toContain('SPEC_002');
      expect(ids).toContain('TEST_003');
    });
  });

  describe('isInLinkContext', () => {
    it('should detect link context', () => {
      const line = '   :links: REQ_001';

      expect(isInLinkContext(line, 12, testConfig)).toBe(true);
      expect(isInLinkContext(line, 5, testConfig)).toBe(false);
    });

    it('should detect satisfies context', () => {
      const line = '   :satisfies: REQ_001';

      expect(isInLinkContext(line, 16, testConfig)).toBe(true);
    });
  });

  describe('isInInlineItemContext', () => {
    it('should detect inline item context', () => {
      const line = 'See :item:`REQ_001` for details.';

      expect(isInInlineItemContext(line, 11)).toBe(true);
      expect(isInInlineItemContext(line, 17)).toBe(true);
      expect(isInInlineItemContext(line, 25)).toBe(false);
    });
  });
});
