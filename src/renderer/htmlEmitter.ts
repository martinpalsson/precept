/**
 * RST AST to HTML emitter
 *
 * Walks the AST produced by rstFullParser and generates HTML strings.
 */

import {
  BlockNode,
  InlineNode,
  RstDocument,
} from './rstNodes';
import {
  RenderContext,
  renderItemDirective,
  renderGraphicDirective,
  renderListingDirective,
  highlightCode,
  escapeHtml,
  escapeAttr,
} from './directiveRenderer';

/**
 * Render a complete RST document to HTML (body content only, no <html> wrapper).
 */
export function renderDocument(doc: RstDocument, ctx: RenderContext): string {
  return renderBlockNodes(doc.children, ctx);
}

/**
 * Render an array of block nodes to HTML.
 */
export function renderBlockNodes(nodes: BlockNode[], ctx: RenderContext): string {
  return nodes.map(node => renderBlockNode(node, ctx)).join('\n');
}

/**
 * Render a single block node to HTML.
 */
function renderBlockNode(node: BlockNode, ctx: RenderContext): string {
  switch (node.type) {
    case 'section':
      return renderSection(node, ctx);
    case 'paragraph':
      return `<p>${renderInlineNodes(node.children, ctx)}</p>`;
    case 'bullet_list':
      return renderBulletList(node, ctx);
    case 'enum_list':
      return renderEnumList(node, ctx);
    case 'definition_list':
      return renderDefinitionList(node, ctx);
    case 'code_block':
      return renderCodeBlock(node);
    case 'literal_block':
      return `<pre><code>${escapeHtml(node.content)}</code></pre>`;
    case 'block_quote':
      return `<blockquote>\n${renderBlockNodes(node.children, ctx)}\n</blockquote>`;
    case 'image':
      return renderImage(node);
    case 'admonition':
      return renderAdmonition(node, ctx);
    case 'toctree':
      return renderToctree(node);
    case 'transition':
      return '<hr>';
    case 'comment':
      return `<!-- ${escapeHtml(node.text)} -->`;
    case 'field_list':
      return renderFieldList(node, ctx);
    case 'table':
      return renderTable(node, ctx);
    case 'raw_html':
      return node.content;
    case 'item_directive':
      return renderItemDirective(node, ctx);
    case 'graphic_directive':
      return renderGraphicDirective(node, ctx);
    case 'listing_directive':
      return renderListingDirective(node, ctx);
    case 'generic_directive':
      // Render unknown directives as a comment + their content
      if (node.content.length > 0) {
        return `<!-- directive: ${escapeHtml(node.name)} -->\n<div class="directive-${escapeAttr(node.name)}">\n${escapeHtml(node.content.join('\n'))}\n</div>`;
      }
      return `<!-- directive: ${escapeHtml(node.name)} -->`;
    default:
      return '';
  }
}

// ---------------------------------------------------------------------------
// Block renderers
// ---------------------------------------------------------------------------

function renderSection(node: BlockNode & { type: 'section' }, ctx: RenderContext): string {
  const level = Math.min(node.depth, 6);
  const tag = `h${level}`;
  const idAttr = node.id ? ` id="${escapeAttr(node.id)}"` : '';
  const titleHtml = renderInlineNodes(node.titleInline, ctx);
  const childrenHtml = renderBlockNodes(node.children, ctx);

  return `<${tag}${idAttr}>${titleHtml}</${tag}>\n${childrenHtml}`;
}

function renderBulletList(node: BlockNode & { type: 'bullet_list' }, ctx: RenderContext): string {
  const items = node.items.map(item =>
    `<li>${renderBlockNodes(item.children, ctx)}</li>`
  ).join('\n');
  return `<ul>\n${items}\n</ul>`;
}

function renderEnumList(node: BlockNode & { type: 'enum_list' }, ctx: RenderContext): string {
  const startAttr = node.start && node.start !== 1 ? ` start="${node.start}"` : '';
  const items = node.items.map(item =>
    `<li>${renderBlockNodes(item.children, ctx)}</li>`
  ).join('\n');
  return `<ol${startAttr}>\n${items}\n</ol>`;
}

function renderDefinitionList(node: BlockNode & { type: 'definition_list' }, ctx: RenderContext): string {
  const items = node.items.map(item => {
    const term = renderInlineNodes(item.term, ctx);
    const def = renderBlockNodes(item.definition, ctx);
    return `<dt>${term}</dt>\n<dd>${def}</dd>`;
  }).join('\n');
  return `<dl>\n${items}\n</dl>`;
}

function renderCodeBlock(node: BlockNode & { type: 'code_block' }): string {
  const captionHtml = node.caption
    ? `<div class="code-block-caption">${escapeHtml(node.caption)}</div>`
    : '';
  return `${captionHtml}${highlightCode(node.code, node.language)}`;
}

function renderImage(node: BlockNode & { type: 'image' }): string {
  const alt = node.alt ? ` alt="${escapeAttr(node.alt)}"` : '';
  const styles: string[] = [];
  if (node.width) styles.push(`width:${escapeAttr(node.width)}`);
  if (node.height) styles.push(`height:${escapeAttr(node.height)}`);
  if (node.scale) styles.push(`width:${escapeAttr(node.scale)}%`);
  const style = styles.length > 0 ? ` style="${styles.join(';')}"` : '';

  return `<img src="${escapeAttr(node.uri)}"${alt}${style}>`;
}

function renderAdmonition(node: BlockNode & { type: 'admonition' }, ctx: RenderContext): string {
  const titleHtml = node.title ? `<p class="admonition-title">${escapeHtml(node.title)}</p>\n` : '';
  const bodyHtml = renderBlockNodes(node.children, ctx);
  return `<div class="admonition ${escapeAttr(node.kind)}">\n${titleHtml}${bodyHtml}\n</div>`;
}

function renderToctree(node: BlockNode & { type: 'toctree' }): string {
  if (node.entries.length === 0) return '';

  const parts: string[] = [];
  if (node.caption) {
    parts.push(`<p class="toctree-caption"><strong>${escapeHtml(node.caption)}</strong></p>`);
  }
  parts.push('<ul class="toctree">');
  for (const entry of node.entries) {
    const href = `${escapeAttr(entry)}.html`;
    parts.push(`<li><a href="${href}">${escapeHtml(entry)}</a></li>`);
  }
  parts.push('</ul>');
  return parts.join('\n');
}

function renderFieldList(node: BlockNode & { type: 'field_list' }, ctx: RenderContext): string {
  const rows = node.fields.map(field => {
    const name = escapeHtml(field.name);
    const body = renderInlineNodes(field.body, ctx);
    return `<tr><th>${name}</th><td>${body}</td></tr>`;
  }).join('\n');
  return `<table class="field-list">\n<tbody>\n${rows}\n</tbody>\n</table>`;
}

function renderTable(node: BlockNode & { type: 'table' }, ctx: RenderContext): string {
  const parts: string[] = ['<table>'];

  if (node.headers.length > 0) {
    parts.push('<thead>');
    for (const row of node.headers) {
      parts.push('<tr>');
      for (const cell of row) {
        parts.push(`<th>${renderInlineNodes(cell.children, ctx)}</th>`);
      }
      parts.push('</tr>');
    }
    parts.push('</thead>');
  }

  if (node.rows.length > 0) {
    parts.push('<tbody>');
    for (const row of node.rows) {
      parts.push('<tr>');
      for (const cell of row) {
        parts.push(`<td>${renderInlineNodes(cell.children, ctx)}</td>`);
      }
      parts.push('</tr>');
    }
    parts.push('</tbody>');
  }

  parts.push('</table>');
  return parts.join('\n');
}

// ---------------------------------------------------------------------------
// Inline rendering
// ---------------------------------------------------------------------------

/**
 * Render inline nodes to HTML.
 */
export function renderInlineNodes(nodes: InlineNode[], ctx: RenderContext): string {
  return nodes.map(node => renderInlineNode(node, ctx)).join('');
}

function renderInlineNode(node: InlineNode, ctx: RenderContext): string {
  switch (node.type) {
    case 'text':
      return escapeHtml(node.value);
    case 'strong':
      return `<strong>${renderInlineNodes(node.children, ctx)}</strong>`;
    case 'emphasis':
      return `<em>${renderInlineNodes(node.children, ctx)}</em>`;
    case 'inline_code':
      return `<code>${escapeHtml(node.value)}</code>`;
    case 'role':
      return renderRole(node, ctx);
    case 'hyperlink':
      return `<a href="${escapeAttr(node.uri)}">${escapeHtml(node.text)}</a>`;
    default:
      return '';
  }
}

/**
 * Resolve an item ID to an href, handling cross-file links.
 * If the item lives in a different file than currentSlug, produces "otherfile.html#anchor".
 * Otherwise produces just "#anchor".
 */
function resolveItemHref(id: string, anchor: string, ctx: RenderContext): string {
  if (!ctx.currentSlug || !ctx.index || !ctx.basePath) {
    return `#${anchor}`;
  }

  const obj = ctx.index.objects.get(id);
  if (!obj) return `#${anchor}`;

  // Determine slug of the file containing this item
  const itemFile = obj.location.file;
  const basePath = ctx.basePath.endsWith('/') ? ctx.basePath : ctx.basePath + '/';
  let itemSlug = itemFile;
  if (itemFile.startsWith(basePath)) {
    itemSlug = itemFile.slice(basePath.length);
  }
  // Strip .rst extension
  itemSlug = itemSlug.replace(/\.rst$/, '');

  if (itemSlug === ctx.currentSlug) {
    return `#${anchor}`;
  }

  // Compute relative path from currentSlug to itemSlug
  const currentDepth = ctx.currentSlug.split('/').length - 1;
  const prefix = currentDepth > 0 ? '../'.repeat(currentDepth) : '';
  return `${prefix}${itemSlug}.html#${anchor}`;
}

function renderRole(node: InlineNode & { type: 'role' }, ctx: RenderContext): string {
  switch (node.name) {
    case 'item': {
      const href = resolveItemHref(node.target, `req-${node.target}`, ctx);
      return `<a href="${escapeAttr(href)}" class="rigr-link-ref">${escapeHtml(node.target)}</a>`;
    }
    case 'paramval': {
      // Resolve parameter value from index
      const obj = ctx.index?.objects.get(node.target);
      const value = obj?.metadata.value;
      if (value) {
        const href = resolveItemHref(node.target, `req-${node.target}`, ctx);
        return `<a href="${escapeAttr(href)}" class="paramval-ref">${escapeHtml(value)}</a>`;
      }
      return `<span class="paramval-missing">[unknown: ${escapeHtml(node.target)}]</span>`;
    }
    case 'termref': {
      // Resolve term from index
      const obj = ctx.index?.objects.get(node.target);
      const term = obj?.metadata.term;
      if (term) {
        const href = resolveItemHref(node.target, `req-${node.target}`, ctx);
        return `<a href="${escapeAttr(href)}" class="termref">${escapeHtml(term)}</a>`;
      }
      return `<span class="termref-missing">[unknown: ${escapeHtml(node.target)}]</span>`;
    }
    case 'ref':
      return `<a href="#${escapeAttr(node.target)}">${escapeHtml(node.target)}</a>`;
    default:
      return `<span class="role-${escapeAttr(node.name)}">${escapeHtml(node.target)}</span>`;
  }
}
