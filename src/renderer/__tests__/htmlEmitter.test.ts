import { renderDocument, renderBlockNodes, renderInlineNodes } from '../htmlEmitter';
import { parseRstDocument } from '../rstFullParser';
import { parseInline } from '../inlineParser';
import { RenderContext } from '../directiveRenderer';
import { PreceptConfig } from '../../types';

const defaultConfig: PreceptConfig = {
  objectTypes: [{ type: 'requirement', title: 'Requirement' }],
  levels: [{ level: 'stakeholder', title: 'Stakeholder' }],
  idConfig: { prefix: 'REQ', separator: '-', padding: 3, start: 1 },
  linkTypes: [],
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

const ctx: RenderContext = { config: defaultConfig };

describe('htmlEmitter', () => {
  describe('renderInlineNodes', () => {
    it('should render plain text with HTML escaping', () => {
      const nodes = parseInline('Hello <world> & "friends"');
      const html = renderInlineNodes(nodes, ctx);
      expect(html).toBe('Hello &lt;world&gt; &amp; &quot;friends&quot;');
    });

    it('should render strong', () => {
      const nodes = parseInline('**bold**');
      const html = renderInlineNodes(nodes, ctx);
      expect(html).toBe('<strong>bold</strong>');
    });

    it('should render emphasis', () => {
      const nodes = parseInline('*italic*');
      const html = renderInlineNodes(nodes, ctx);
      expect(html).toBe('<em>italic</em>');
    });

    it('should render inline code', () => {
      const nodes = parseInline('``code``');
      const html = renderInlineNodes(nodes, ctx);
      expect(html).toBe('<code>code</code>');
    });

    it('should render hyperlink', () => {
      const nodes = parseInline('`Google <https://google.com>`_');
      const html = renderInlineNodes(nodes, ctx);
      expect(html).toBe('<a href="https://google.com">Google</a>');
    });

    it('should render :item: role as link', () => {
      const nodes = parseInline(':item:`REQ-001`');
      const html = renderInlineNodes(nodes, ctx);
      expect(html).toBe('<a href="#req-REQ-001" class="precept-link-ref">REQ-001</a>');
    });
  });

  describe('renderBlockNodes', () => {
    it('should render a paragraph', () => {
      const doc = parseRstDocument('Hello world.');
      const html = renderBlockNodes(doc.children, ctx);
      expect(html).toBe('<p>Hello world.</p>');
    });

    it('should render a section with heading', () => {
      const doc = parseRstDocument('Title\n=====\n\nContent.');
      const html = renderDocument(doc, ctx);
      expect(html).toContain('<h3'); // = underline-only → h3
      expect(html).toContain('Title');
      expect(html).toContain('<p>Content.</p>');
    });

    it('should render a bullet list', () => {
      const doc = parseRstDocument('- Alpha\n- Beta');
      const html = renderBlockNodes(doc.children, ctx);
      expect(html).toContain('<ul>');
      expect(html).toContain('<li>');
      expect(html).toContain('Alpha');
      expect(html).toContain('Beta');
      expect(html).toContain('</ul>');
    });

    it('should render an enumerated list', () => {
      const doc = parseRstDocument('1. First\n2. Second');
      const html = renderBlockNodes(doc.children, ctx);
      expect(html).toContain('<ol>');
      expect(html).toContain('<li>');
      expect(html).toContain('First');
      expect(html).toContain('</ol>');
    });

    it('should render a code block', () => {
      const rst = '.. code-block:: javascript\n\n   const x = 1;';
      const doc = parseRstDocument(rst);
      const html = renderBlockNodes(doc.children, ctx);
      expect(html).toContain('<pre>');
      expect(html).toContain('language-javascript');
      // Code is syntax-highlighted, "const" and "1" are wrapped in spans
      expect(html).toContain('const');
      expect(html).toContain('x =');
      expect(html).toContain('1');
    });

    it('should render an admonition', () => {
      const rst = '.. note::\n\n   Pay attention.';
      const doc = parseRstDocument(rst);
      const html = renderBlockNodes(doc.children, ctx);
      expect(html).toContain('class="admonition note"');
      expect(html).toContain('admonition-title');
      expect(html).toContain('Pay attention.');
    });

    it('should render a transition', () => {
      const rst = 'Before.\n\n----\n\nAfter.';
      const doc = parseRstDocument(rst);
      const html = renderDocument(doc, ctx);
      expect(html).toContain('<hr>');
    });

    it('should render a comment as HTML comment', () => {
      const rst = '.. This is a comment.';
      const doc = parseRstDocument(rst);
      const html = renderBlockNodes(doc.children, ctx);
      expect(html).toContain('<!--');
      expect(html).toContain('-->');
    });

    it('should render a field list', () => {
      const rst = ':Author: John\n:Version: 1.0';
      const doc = parseRstDocument(rst);
      const html = renderBlockNodes(doc.children, ctx);
      expect(html).toContain('<table class="field-list">');
      expect(html).toContain('<th>Author</th>');
      expect(html).toContain('<td>John</td>');
    });

    it('should render an image', () => {
      const rst = '.. image:: photo.png\n   :alt: A photo';
      const doc = parseRstDocument(rst);
      const html = renderBlockNodes(doc.children, ctx);
      expect(html).toContain('<img');
      expect(html).toContain('src="photo.png"');
      expect(html).toContain('alt="A photo"');
    });
  });

  describe('renderDocument', () => {
    it('should render a complete document', () => {
      const rst = [
        'My Document',
        '===========',
        '',
        'Introduction paragraph.',
        '',
        '.. note::',
        '',
        '   Important info.',
        '',
        '- Item A',
        '- Item B',
      ].join('\n');

      const doc = parseRstDocument(rst);
      const html = renderDocument(doc, ctx);

      expect(html).toContain('<h3'); // = underline-only → h3
      expect(html).toContain('My Document');
      expect(html).toContain('<p>Introduction paragraph.</p>');
      expect(html).toContain('class="admonition note"');
      expect(html).toContain('<ul>');
    });
  });
});
