import {
  renderItemDirective,
  renderGraphicDirective,
  renderListingDirective,
  RenderContext,
  escapeHtml,
  escapeAttr,
} from '../directiveRenderer';
import { parseRstDocument } from '../rstFullParser';
import { PreceptConfig, RequirementIndex, RequirementObject } from '../../types';

const defaultConfig: PreceptConfig = {
  objectTypes: [
    { type: 'requirement', title: 'Requirement' },
    { type: 'parameter', title: 'Parameter' },
  ],
  levels: [
    { level: 'stakeholder', title: 'Stakeholder' },
    { level: 'system', title: 'System' },
  ],
  idConfig: { prefix: 'REQ', separator: '-', padding: 3, start: 1 },
  linkTypes: [
    { option: 'satisfies', incoming: 'satisfied_by', outgoing: 'satisfies' },
  ],
  statuses: [{ status: 'draft', color: '#ccc' }],
  customFields: {},
  headingStyles: [
    { char: '#', overline: true },
    { char: '*', overline: true },
    { char: '=', overline: false },
    { char: '-', overline: false },
    { char: '^', overline: false },
    { char: '"', overline: false },
  ],
  id_regex: /\d{4}/g,
};

function makeCtx(config?: Partial<PreceptConfig>, index?: RequirementIndex): RenderContext {
  return {
    config: { ...defaultConfig, ...config },
    index,
  };
}

describe('directiveRenderer', () => {
  describe('escapeHtml', () => {
    it('should escape HTML special characters', () => {
      expect(escapeHtml('<script>"alert"&</script>')).toBe(
        '&lt;script&gt;&quot;alert&quot;&amp;&lt;/script&gt;'
      );
    });
  });

  describe('escapeAttr', () => {
    it('should escape attribute special characters', () => {
      expect(escapeAttr('a"b\'c<d>e&f')).toBe('a&quot;b&#39;c&lt;d&gt;e&amp;f');
    });
  });

  describe('renderItemDirective', () => {
    it('should render an item directive with correct CSS classes', () => {
      const rst = [
        '.. item:: My Requirement',
        '   :id: REQ-001',
        '   :type: requirement',
        '   :status: draft',
        '',
        '   Description here.',
      ].join('\n');

      const doc = parseRstDocument(rst);
      const node = doc.children[0];
      expect(node.type).toBe('item_directive');

      if (node.type === 'item_directive') {
        const html = renderItemDirective(node, makeCtx());
        expect(html).toContain('class="precept-item precept-type-requirement precept-status-draft"');
        expect(html).toContain('id="req-REQ-001"');
        expect(html).toContain('class="rubric precept-title"');
        expect(html).toContain('class="precept-title-id"');
        expect(html).toContain('REQ-001');
        expect(html).toContain('My Requirement');
        expect(html).toContain('precept-body');
        expect(html).toContain('precept-metadata-table');
        expect(html).toContain('Description here.');
      }
    });

    it('should render metadata rows for type, level, and status', () => {
      const rst = [
        '.. item:: Test Item',
        '   :id: REQ-010',
        '   :type: requirement',
        '   :level: stakeholder',
        '   :status: draft',
      ].join('\n');

      const doc = parseRstDocument(rst);
      const node = doc.children[0];

      if (node.type === 'item_directive') {
        const html = renderItemDirective(node, makeCtx());
        expect(html).toContain('Type');
        expect(html).toContain('Requirement');
        expect(html).toContain('Level');
        expect(html).toContain('Stakeholder');
        expect(html).toContain('Status');
        expect(html).toContain('Draft');
      }
    });

    it('should render outgoing link references', () => {
      const rst = [
        '.. item:: Sub Req',
        '   :id: REQ-002',
        '   :type: requirement',
        '   :status: draft',
        '   :satisfies: REQ-001',
      ].join('\n');

      const doc = parseRstDocument(rst);
      const node = doc.children[0];

      if (node.type === 'item_directive') {
        const html = renderItemDirective(node, makeCtx());
        expect(html).toContain('Satisfies');
        expect(html).toContain('href="#req-REQ-001"');
        expect(html).toContain('class="precept-link-ref"');
      }
    });

    it('should render incoming link references from index', () => {
      const index: RequirementIndex = {
        objects: new Map<string, RequirementObject>([
          ['REQ-001', {
            id: 'REQ-001',
            title: 'Parent',
            type: 'requirement',
            level: 'stakeholder',
            status: 'draft',
            description: '',
            location: { file: 'test.rst', line: 1 },
            links: { satisfies: [] },
            metadata: {},
          }],
          ['REQ-002', {
            id: 'REQ-002',
            title: 'Child',
            type: 'requirement',
            level: 'system',
            status: 'draft',
            description: '',
            location: { file: 'test.rst', line: 10 },
            links: { satisfies: ['REQ-001'] },
            metadata: {},
          }],
        ]),
        fileIndex: new Map(),
        typeIndex: new Map(),
        levelIndex: new Map(),
        statusIndex: new Map(),
        linkGraph: new Map(),
        baselines: new Map(),
      };

      const rst = [
        '.. item:: Parent Req',
        '   :id: REQ-001',
        '   :type: requirement',
        '   :status: draft',
      ].join('\n');

      const doc = parseRstDocument(rst);
      const node = doc.children[0];

      if (node.type === 'item_directive') {
        const html = renderItemDirective(node, makeCtx(undefined, index));
        expect(html).toContain('Satisfied By');
        expect(html).toContain('REQ-002');
      }
    });

    it('should render value for parameter items', () => {
      const rst = [
        '.. item:: Max Speed',
        '   :id: PAR-001',
        '   :type: parameter',
        '   :status: draft',
        '   :value: 100 km/h',
      ].join('\n');

      const doc = parseRstDocument(rst);
      const node = doc.children[0];

      if (node.type === 'item_directive') {
        const html = renderItemDirective(node, makeCtx());
        expect(html).toContain('Value');
        expect(html).toContain('100 km/h');
        expect(html).toContain('precept-value');
      }
    });
  });

  describe('renderGraphicDirective', () => {
    it('should render a graphic with an image file', () => {
      const rst = [
        '.. graphic:: Architecture',
        '   :id: FIG-001',
        '   :status: draft',
        '   :file: images/arch.png',
        '   :alt: Architecture diagram',
      ].join('\n');

      const doc = parseRstDocument(rst);
      const node = doc.children[0];
      expect(node.type).toBe('graphic_directive');

      if (node.type === 'graphic_directive') {
        const html = renderGraphicDirective(node, makeCtx());
        expect(html).toContain('class="precept-graphic precept-status-draft"');
        expect(html).toContain('id="fig-FIG-001"');
        expect(html).toContain('<img');
        expect(html).toContain('src="images/arch.png"');
        expect(html).toContain('alt="Architecture diagram"');
        expect(html).toContain('precept-metadata-table');
      }
    });

    it('should render a graphic with PlantUML content', () => {
      const rst = [
        '.. graphic:: Sequence',
        '   :id: FIG-002',
        '   :status: draft',
        '',
        '   @startuml',
        '   Alice -> Bob : hello',
        '   @enduml',
      ].join('\n');

      const doc = parseRstDocument(rst);
      const node = doc.children[0];

      if (node.type === 'graphic_directive') {
        const html = renderGraphicDirective(node, makeCtx());
        expect(html).toContain('plantuml-diagram');
        expect(html).toContain('plantuml.com/plantuml/svg/');
      }
    });
  });

  describe('renderListingDirective', () => {
    it('should render a code listing', () => {
      const rst = [
        '.. listing:: Example',
        '   :id: CODE-001',
        '   :status: draft',
        '   :language: python',
        '',
        '   def foo():',
        '       return 42',
      ].join('\n');

      const doc = parseRstDocument(rst);
      const node = doc.children[0];
      expect(node.type).toBe('listing_directive');

      if (node.type === 'listing_directive') {
        const html = renderListingDirective(node, makeCtx());
        expect(html).toContain('class="precept-code precept-status-draft"');
        expect(html).toContain('id="code-CODE-001"');
        expect(html).toContain('language-python');
        // Code is syntax-highlighted, so "def" is wrapped in spans
        expect(html).toContain('def');
        expect(html).toContain('foo');
        expect(html).toContain('precept-metadata-table');
        expect(html).toContain('Language');
      }
    });
  });
});
