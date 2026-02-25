/**
 * Rigr custom directive HTML renderer
 *
 * Renders item, graphic, and listing directives to HTML that matches
 * the CSS classes from the original Sphinx extension.
 */

import {
  ItemDirectiveNode,
  GraphicDirectiveNode,
  ListingDirectiveNode,
  BlockNode,
} from './rstNodes';
import { RigrConfig, RequirementIndex } from '../types';
import { renderBlockNodes } from './htmlEmitter';
import { encodePlantUml } from './plantumlRenderer';
import hljs from 'highlight.js';

const DEFAULT_PLANTUML_SERVER = 'https://www.plantuml.com/plantuml/svg/';

/**
 * Context for rendering directives, providing access to config and index.
 */
export interface RenderContext {
  config: RigrConfig;
  index?: RequirementIndex;
  /** Base path for resolving relative file references */
  basePath?: string;
  /** PlantUML server URL for diagram rendering (defaults to public server) */
  plantumlServer?: string;
  /** Current file path (relative slug, e.g. "stakeholder") for cross-file link resolution */
  currentSlug?: string;
}

// ---------------------------------------------------------------------------
// Item directive
// ---------------------------------------------------------------------------

export function renderItemDirective(node: ItemDirectiveNode, ctx: RenderContext): string {
  const { config } = ctx;
  const typeClass = `rigr-type-${node.itemType}`;
  const statusClass = `rigr-status-${node.status}`;
  const idAttr = node.id ? ` id="req-${escapeAttr(node.id)}"` : '';

  const parts: string[] = [];
  parts.push(`<div class="rigr-item ${typeClass} ${statusClass}"${idAttr}>`);

  // Title with ID on the left
  parts.push('<p class="rubric rigr-title">');
  if (node.id) {
    parts.push(`<span class="rigr-title-id">${escapeHtml(node.id)}</span> `);
  }
  parts.push(`${escapeHtml(node.title)}</p>`);

  // Content wrapper: body on left, metadata on right
  parts.push('<div class="rigr-content-wrapper">');

  // Body content
  parts.push('<div class="rigr-body">');
  if (node.contentNodes.length > 0) {
    parts.push(renderBlockNodes(node.contentNodes, ctx));
  }
  parts.push('</div>');

  // Metadata table
  const rows = buildItemMetadataRows(node, config, ctx.index);
  if (rows.length > 0) {
    parts.push(renderMetadataTable(rows));
  }

  parts.push('</div>'); // rigr-content-wrapper
  parts.push('</div>'); // rigr-item

  return parts.join('\n');
}

// ---------------------------------------------------------------------------
// Graphic directive
// ---------------------------------------------------------------------------

export function renderGraphicDirective(node: GraphicDirectiveNode, ctx: RenderContext): string {
  const statusClass = `rigr-status-${node.status}`;
  const idAttr = node.id ? ` id="fig-${escapeAttr(node.id)}"` : '';

  const parts: string[] = [];
  parts.push(`<div class="rigr-graphic ${statusClass}"${idAttr}>`);

  // Title
  parts.push('<p class="rubric rigr-title">');
  if (node.id) {
    parts.push(`<span class="rigr-title-id">${escapeHtml(node.id)}</span> `);
  }
  parts.push(`${escapeHtml(node.title || 'Graphic')}</p>`);

  // Content wrapper
  parts.push('<div class="rigr-content-wrapper">');

  // Body
  parts.push('<div class="rigr-body">');

  if (node.file) {
    // Image file
    const alt = escapeAttr(node.alt || node.title || 'Graphic');
    const scaleAttr = node.scale ? ` style="width:${escapeAttr(node.scale)}%"` : '';
    parts.push(`<div class="rigr-graphic-image rigr-clickable">`);
    parts.push(`<img src="${escapeAttr(node.file)}" alt="${alt}"${scaleAttr}>`);
    parts.push('</div>');
  } else if (node.content.length > 0) {
    const contentText = node.content.join('\n');
    if (contentText.includes('@startuml') || contentText.includes('@startmindmap') || contentText.includes('@startgantt')) {
      // PlantUML — render via server URL as inline <img>
      const server = ctx.plantumlServer || DEFAULT_PLANTUML_SERVER;
      const encoded = encodePlantUml(contentText);
      const imgUrl = server.endsWith('/') ? `${server}${encoded}` : `${server}/${encoded}`;
      const alt = escapeAttr(node.alt || node.title || 'PlantUML diagram');
      parts.push('<div class="rigr-graphic-uml">');
      parts.push(`<img src="${escapeAttr(imgUrl)}" alt="${alt}" class="plantuml-diagram">`);
      parts.push('</div>');
    } else if (node.contentNodes.length > 0) {
      parts.push(renderBlockNodes(node.contentNodes, ctx));
    }
  }

  // Caption
  if (node.caption) {
    parts.push('<div class="rigr-graphic-caption">');
    parts.push(`<p>${escapeHtml(node.caption)}</p>`);
    parts.push('</div>');
  }

  parts.push('</div>'); // rigr-body

  // Metadata table
  const rows = buildGraphicMetadataRows(node, ctx.config, ctx.index);
  if (rows.length > 0) {
    parts.push(renderMetadataTable(rows));
  }

  parts.push('</div>'); // rigr-content-wrapper
  parts.push('</div>'); // rigr-graphic

  return parts.join('\n');
}

// ---------------------------------------------------------------------------
// Listing directive
// ---------------------------------------------------------------------------

export function renderListingDirective(node: ListingDirectiveNode, ctx: RenderContext): string {
  const statusClass = `rigr-status-${node.status}`;
  const idAttr = node.id ? ` id="code-${escapeAttr(node.id)}"` : '';

  const parts: string[] = [];
  parts.push(`<div class="rigr-code ${statusClass}"${idAttr}>`);

  // Title
  parts.push('<p class="rubric rigr-title">');
  if (node.id) {
    parts.push(`<span class="rigr-title-id">${escapeHtml(node.id)}</span> `);
  }
  parts.push(`${escapeHtml(node.title || 'Code')}</p>`);

  // Content wrapper
  parts.push('<div class="rigr-content-wrapper">');

  // Body: code block
  parts.push('<div class="rigr-body">');
  if (node.code) {
    parts.push('<div class="rigr-code-content">');
    parts.push(highlightCode(node.code, node.language));
    parts.push('</div>');
  }

  // Caption
  if (node.caption) {
    parts.push('<div class="rigr-code-caption">');
    parts.push(`<p>${escapeHtml(node.caption)}</p>`);
    parts.push('</div>');
  }

  parts.push('</div>'); // rigr-body

  // Metadata table
  const rows = buildListingMetadataRows(node, ctx.config, ctx.index);
  if (rows.length > 0) {
    parts.push(renderMetadataTable(rows));
  }

  parts.push('</div>'); // rigr-content-wrapper
  parts.push('</div>'); // rigr-code

  return parts.join('\n');
}

// ---------------------------------------------------------------------------
// Metadata table construction
// ---------------------------------------------------------------------------

interface MetadataRow {
  label: string;
  value: string;
  isLink: boolean;
  cssClass?: string;
}

function buildItemMetadataRows(node: ItemDirectiveNode, config: RigrConfig, index?: RequirementIndex): MetadataRow[] {
  const rows: MetadataRow[] = [];

  // Type
  const typeTitle = getTypeTitle(config, node.itemType);
  rows.push({ label: 'Type', value: typeTitle, isLink: false });

  // Level
  if (node.level) {
    const levelTitle = getLevelTitle(config, node.level);
    rows.push({ label: 'Level', value: levelTitle, isLink: false });
  }

  // Status
  rows.push({ label: 'Status', value: titleCase(node.status), isLink: false });

  // Value (for parameters)
  if (node.options.value) {
    rows.push({ label: 'Value', value: node.options.value, isLink: false, cssClass: 'rigr-value' });
  }

  // Term (for terminology)
  if (node.options.term) {
    rows.push({ label: 'Term', value: node.options.term, isLink: false, cssClass: 'rigr-term' });
  }

  // Outgoing link fields
  addLinkRows(rows, node.options, config);

  // Extra options
  addExtraOptionRows(rows, node.options, config);

  // Custom fields
  addCustomFieldRows(rows, node.options, config);

  // Incoming links
  addIncomingLinkRows(rows, node.id, config, index);

  return rows;
}

function buildGraphicMetadataRows(node: GraphicDirectiveNode, config: RigrConfig, index?: RequirementIndex): MetadataRow[] {
  const rows: MetadataRow[] = [];

  rows.push({ label: 'Type', value: 'Graphic', isLink: false });

  if (node.level) {
    rows.push({ label: 'Level', value: getLevelTitle(config, node.level), isLink: false });
  }

  rows.push({ label: 'Status', value: titleCase(node.status), isLink: false });

  addLinkRows(rows, node.options, config);
  addExtraOptionRows(rows, node.options, config);
  addIncomingLinkRows(rows, node.id, config, index);

  return rows;
}

function buildListingMetadataRows(node: ListingDirectiveNode, config: RigrConfig, index?: RequirementIndex): MetadataRow[] {
  const rows: MetadataRow[] = [];

  rows.push({ label: 'Type', value: 'Code', isLink: false });

  if (node.language && node.language !== 'text') {
    rows.push({ label: 'Language', value: node.language, isLink: false, cssClass: 'rigr-language' });
  }

  if (node.level) {
    rows.push({ label: 'Level', value: getLevelTitle(config, node.level), isLink: false });
  }

  rows.push({ label: 'Status', value: titleCase(node.status), isLink: false });

  addLinkRows(rows, node.options, config);
  addExtraOptionRows(rows, node.options, config);
  addIncomingLinkRows(rows, node.id, config, index);

  return rows;
}

function addLinkRows(rows: MetadataRow[], options: Record<string, string>, config: RigrConfig): void {
  const linkOptions = config.linkTypes.map(lt => lt.option).filter(Boolean);

  for (const opt of linkOptions) {
    if (options[opt]) {
      let label = opt.replace(/_/g, ' ');
      for (const lt of config.linkTypes) {
        if (lt.option === opt) {
          label = lt.outgoing.replace(/_/g, ' ');
          break;
        }
      }
      rows.push({ label: titleCase(label), value: options[opt], isLink: true });
    }
  }
}

function addExtraOptionRows(rows: MetadataRow[], options: Record<string, string>, _config: RigrConfig): void {
  // Extra options are not currently stored in RigrConfig, but we can detect them
  const knownOptions = new Set(['id', 'type', 'level', 'status', 'value', 'term', 'file', 'alt', 'scale', 'caption', 'language']);

  for (const [key, value] of Object.entries(options)) {
    if (knownOptions.has(key)) continue;
    // Skip link types (already handled)
    if (_config.linkTypes.some(lt => lt.option === key)) continue;
    // Skip custom fields (handled separately)
    if (key in _config.customFields) continue;

    rows.push({ label: titleCase(key.replace(/_/g, ' ')), value, isLink: false });
  }
}

function addCustomFieldRows(rows: MetadataRow[], options: Record<string, string>, config: RigrConfig): void {
  for (const [fieldName, fieldValues] of Object.entries(config.customFields)) {
    if (options[fieldName]) {
      const value = options[fieldName];
      let displayValue = value;
      for (const fv of fieldValues) {
        if (fv.value === value) {
          displayValue = fv.title;
          break;
        }
      }
      rows.push({ label: titleCase(fieldName.replace(/_/g, ' ')), value: displayValue, isLink: false });
    }
  }
}

function addIncomingLinkRows(rows: MetadataRow[], itemId: string, config: RigrConfig, index?: RequirementIndex): void {
  if (!index || !itemId) return;

  // Build incoming links from the linkGraph
  // For each item that has a link TO this item, find what link type it is
  const allObjects = index.objects;
  const incoming: Record<string, string[]> = {};

  for (const [sourceId, sourceObj] of allObjects) {
    if (sourceId === itemId) continue;

    for (const [linkType, targetIds] of Object.entries(sourceObj.links)) {
      if (targetIds.includes(itemId)) {
        if (!incoming[linkType]) {
          incoming[linkType] = [];
        }
        incoming[linkType].push(sourceId);
      }
    }
  }

  // Add incoming link rows
  for (const [linkType, sourceIds] of Object.entries(incoming)) {
    const incomingLabel = getIncomingLabel(config, linkType);
    rows.push({
      label: incomingLabel,
      value: sourceIds.join(', '),
      isLink: true,
    });
  }
}

// ---------------------------------------------------------------------------
// Metadata table HTML rendering
// ---------------------------------------------------------------------------

function renderMetadataTable(rows: MetadataRow[]): string {
  const parts: string[] = [];
  parts.push('<div class="rigr-metadata-wrapper">');
  parts.push('<table class="rigr-metadata-table">');
  parts.push('<tbody>');

  for (const row of rows) {
    const fieldClass = `rigr-field-${row.label.toLowerCase().replace(/\s+/g, '-')}`;
    parts.push('<tr>');
    parts.push(`<td>${escapeHtml(row.label)}</td>`);
    parts.push(`<td class="${fieldClass}">`);

    if (row.isLink && row.value) {
      const ids = row.value.split(',').map(s => s.trim());
      const links = ids.map(id =>
        `<a href="#req-${escapeAttr(id)}" class="rigr-link-ref">${escapeHtml(id)}</a>`
      );
      parts.push(links.join(', '));
    } else if (row.cssClass) {
      parts.push(`<span class="${row.cssClass}">${escapeHtml(row.value)}</span>`);
    } else {
      parts.push(escapeHtml(row.value));
    }

    parts.push('</td>');
    parts.push('</tr>');
  }

  parts.push('</tbody>');
  parts.push('</table>');
  parts.push('</div>');

  return parts.join('\n');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getTypeTitle(config: RigrConfig, itemType: string): string {
  for (const ot of config.objectTypes) {
    if (ot.type === itemType) {
      return ot.title || titleCase(itemType);
    }
  }
  return titleCase(itemType);
}

function getLevelTitle(config: RigrConfig, level: string): string {
  for (const lv of config.levels) {
    if (lv.level === level) {
      return lv.title || titleCase(level);
    }
  }
  return titleCase(level);
}

function getIncomingLabel(config: RigrConfig, linkType: string): string {
  for (const lt of config.linkTypes) {
    if (lt.option === linkType) {
      return titleCase(lt.incoming.replace(/_/g, ' '));
    }
  }
  return titleCase(`${linkType} (incoming)`.replace(/_/g, ' '));
}

function titleCase(str: string): string {
  return str.replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Highlight code using highlight.js (pre-rendered, no client-side JS needed).
 * Falls back to escaped plain text if the language is unknown.
 */
export function highlightCode(code: string, language?: string): string {
  try {
    if (language && language !== 'text' && hljs.getLanguage(language)) {
      const result = hljs.highlight(code, { language });
      return `<pre><code class="hljs language-${escapeAttr(language)}">${result.value}</code></pre>`;
    }
    // Auto-detect or plain
    if (!language || language === 'text') {
      return `<pre><code>${escapeHtml(code)}</code></pre>`;
    }
    // Language not recognized — try auto-detect
    const result = hljs.highlightAuto(code);
    return `<pre><code class="hljs">${result.value}</code></pre>`;
  } catch {
    return `<pre><code>${escapeHtml(code)}</code></pre>`;
  }
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function escapeAttr(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
