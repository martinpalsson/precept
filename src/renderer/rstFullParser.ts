/**
 * Full RST-to-AST parser
 *
 * Parses reStructuredText into a tree of RstNode objects.
 * Handles: sections, paragraphs, lists, code blocks, images,
 * admonitions, toctree, and Precept custom directives.
 */

import {
  RstDocument,
  BlockNode,
  SectionNode,
  ParagraphNode,
  BulletListNode,
  EnumListNode,
  ListItemNode,
  CodeBlockNode,
  LiteralBlockNode,
  BlockQuoteNode,
  ImageNode,
  AdmonitionNode,
  ToctreeNode,
  TransitionNode,
  CommentNode,
  FieldListNode,
  FieldNode,
  TableNode,
  TableCellNode,
  ItemDirectiveNode,
  GraphicDirectiveNode,
  ListingDirectiveNode,
  GenericDirectiveNode,
  InlineNode,
} from './rstNodes';
import { HeadingStyle } from '../types';
import { parseInline } from './inlineParser';

// All valid RST section underline/overline characters
const SECTION_CHARS = new Set(['=', '-', '~', '^', '"', '#', '*', '+', '`', '_']);

// Default heading styles — Python documentation convention
const DEFAULT_HEADING_STYLES: HeadingStyle[] = [
  { char: '#', overline: true },
  { char: '*', overline: true },
  { char: '=', overline: false },
  { char: '-', overline: false },
  { char: '^', overline: false },
  { char: '"', overline: false },
];

/**
 * Build a depth map from heading styles.
 * Key format: character for underline-only, character + '_over' for overline+underline.
 */
function buildSectionDepthMap(styles: HeadingStyle[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (let i = 0; i < styles.length && i < 6; i++) {
    const key = styles[i].overline ? `${styles[i].char}_over` : styles[i].char;
    map[key] = i + 1;
  }
  return map;
}
const ADMONITION_TYPES = new Set([
  'note', 'warning', 'tip', 'important', 'caution', 'danger',
  'error', 'hint', 'attention', 'seealso',
]);

/**
 * Parse an RST document string into an AST.
 * @param headingStyles Optional heading style config. Defaults to Python documentation convention.
 */
export function parseRstDocument(text: string, headingStyles?: HeadingStyle[]): RstDocument {
  const depthMap = buildSectionDepthMap(headingStyles || DEFAULT_HEADING_STYLES);
  const lines = text.split('\n');
  const nodes = parseBlocks(lines, 0, 0, depthMap);
  const title = findDocumentTitle(nodes);
  return { children: nodes, title };
}

/**
 * Find the document title (first section title).
 */
function findDocumentTitle(nodes: BlockNode[]): string | undefined {
  for (const node of nodes) {
    if (node.type === 'section') {
      return node.title;
    }
  }
  return undefined;
}

/**
 * Parse a sequence of lines into block nodes, starting at a given indent level.
 */
function parseBlocks(lines: string[], startLine: number, minIndent: number, depthMap: Record<string, number> = {}): BlockNode[] {
  const nodes: BlockNode[] = [];
  let i = startLine;

  while (i < lines.length) {
    const line = lines[i];

    // Skip blank lines
    if (isBlank(line)) {
      i++;
      continue;
    }

    const indent = getIndent(line);

    // If we're in an indented context and the line is at or below minIndent, stop
    if (minIndent > 0 && indent < minIndent && !isBlank(line)) {
      break;
    }

    // Check for section heading: text line followed by underline
    const sectionResult = tryParseSection(lines, i, depthMap);
    if (sectionResult) {
      nodes.push(sectionResult.node);
      i = sectionResult.nextLine;
      continue;
    }

    // Check for transition: 4+ identical punctuation chars on their own
    if (isTransition(line, lines, i)) {
      nodes.push({ type: 'transition' });
      i++;
      continue;
    }

    // Check for directive: .. name:: argument
    const directiveResult = tryParseDirective(lines, i);
    if (directiveResult) {
      nodes.push(directiveResult.node);
      i = directiveResult.nextLine;
      continue;
    }

    // Check for comment: .. followed by blank line or indented text
    if (line.trimStart().startsWith('.. ') || line.trimStart() === '..') {
      const commentResult = parseComment(lines, i);
      nodes.push(commentResult.node);
      i = commentResult.nextLine;
      continue;
    }

    // Check for field list: :field: value
    const fieldListResult = tryParseFieldList(lines, i, minIndent);
    if (fieldListResult) {
      nodes.push(fieldListResult.node);
      i = fieldListResult.nextLine;
      continue;
    }

    // Check for bullet list
    const bulletResult = tryParseBulletList(lines, i, indent);
    if (bulletResult) {
      nodes.push(bulletResult.node);
      i = bulletResult.nextLine;
      continue;
    }

    // Check for enumerated list
    const enumResult = tryParseEnumList(lines, i, indent);
    if (enumResult) {
      nodes.push(enumResult.node);
      i = enumResult.nextLine;
      continue;
    }

    // Check for simple table
    const tableResult = tryParseSimpleTable(lines, i);
    if (tableResult) {
      nodes.push(tableResult.node);
      i = tableResult.nextLine;
      continue;
    }

    // Check for literal block (paragraph ending with ::)
    const literalResult = tryParseLiteralBlock(lines, i);
    if (literalResult) {
      if (literalResult.paragraph) {
        nodes.push(literalResult.paragraph);
      }
      nodes.push(literalResult.node);
      i = literalResult.nextLine;
      continue;
    }

    // Check for block quote (indented text not matching anything else)
    if (indent > minIndent) {
      const bqResult = parseBlockQuote(lines, i, indent);
      nodes.push(bqResult.node);
      i = bqResult.nextLine;
      continue;
    }

    // Default: paragraph
    const paraResult = parseParagraph(lines, i, minIndent);
    nodes.push(paraResult.node);
    i = paraResult.nextLine;
  }

  return nodes;
}

// ---------------------------------------------------------------------------
// Section parsing
// ---------------------------------------------------------------------------

interface ParseResult<T> {
  node: T;
  nextLine: number;
}

/**
 * Look up the heading depth for a section style from the depth map.
 * Returns null if the style is not configured.
 */
function getSectionDepth(depthMap: Record<string, number>, charKey: string): number | null {
  return depthMap[charKey] ?? null;
}

function tryParseSection(
  lines: string[],
  i: number,
  depthMap: Record<string, number>,
): ParseResult<SectionNode> | null {
  // --- Overline form: overline + title + underline (3 lines) ---
  if (i + 2 < lines.length) {
    const possibleOverline = lines[i].trim();
    if (possibleOverline.length > 0 &&
        SECTION_CHARS.has(possibleOverline[0]) &&
        possibleOverline.split('').every(c => c === possibleOverline[0]) &&
        getIndent(lines[i]) === 0) {
      const titleLine = lines[i + 1];
      const underlineLine = lines[i + 2].trim();
      if (!isBlank(titleLine) && getIndent(titleLine) === 0 &&
          underlineLine.length > 0 &&
          underlineLine.split('').every(c => c === possibleOverline[0]) &&
          possibleOverline.length >= titleLine.trim().length &&
          underlineLine.length >= titleLine.trim().length) {
        const charKey = `${possibleOverline[0]}_over`;
        const depth = getSectionDepth(depthMap, charKey);
        if (depth === null) return null; // unsupported style

        const title = titleLine.trim();
        const id = slugify(title);
        const bodyStart = i + 3;
        const bodyNodes = parseSectionBody(lines, bodyStart, depth, depthMap);

        return {
          node: {
            type: 'section',
            depth,
            title,
            titleInline: parseInline(title),
            children: bodyNodes.nodes,
            id,
          },
          nextLine: bodyNodes.nextLine,
        };
      }
    }
  }

  // --- Underline-only form: title + underline (2 lines) ---
  if (i + 1 >= lines.length) return null;

  const titleLine = lines[i];
  const underline = lines[i + 1];

  if (isBlank(titleLine) || isBlank(underline)) return null;
  if (getIndent(titleLine) > 0) return null;

  const trimmedUnderline = underline.trim();
  if (trimmedUnderline.length < 1) return null;

  const underlineChar = trimmedUnderline[0];
  if (!SECTION_CHARS.has(underlineChar)) return null;
  if (!trimmedUnderline.split('').every(c => c === underlineChar)) return null;
  if (trimmedUnderline.length < titleLine.trim().length) return null;

  const depth = getSectionDepth(depthMap, underlineChar);
  if (depth === null) return null; // unsupported style

  const title = titleLine.trim();
  const id = slugify(title);

  const bodyStart = i + 2;
  const bodyNodes = parseSectionBody(lines, bodyStart, depth, depthMap);

  return {
    node: {
      type: 'section',
      depth,
      title,
      titleInline: parseInline(title),
      children: bodyNodes.nodes,
      id,
    },
    nextLine: bodyNodes.nextLine,
  };
}

function parseSectionBody(
  lines: string[],
  startLine: number,
  currentDepth: number,
  depthMap: Record<string, number>,
): { nodes: BlockNode[]; nextLine: number } {
  const nodes: BlockNode[] = [];
  let i = startLine;

  while (i < lines.length) {
    // Check if we hit a section heading at same or higher level

    // Check for overline form: lines[i] is overline, lines[i+1] is title, lines[i+2] is underline
    if (i + 2 < lines.length && !isBlank(lines[i])) {
      const potentialOverline = lines[i].trim();
      if (potentialOverline.length > 0 &&
          SECTION_CHARS.has(potentialOverline[0]) &&
          potentialOverline.split('').every(c => c === potentialOverline[0]) &&
          getIndent(lines[i]) === 0) {
        const titleLine = lines[i + 1];
        const underlineLine = lines[i + 2].trim();
        if (!isBlank(titleLine) && getIndent(titleLine) === 0 &&
            underlineLine.length > 0 &&
            underlineLine.split('').every(c => c === potentialOverline[0]) &&
            potentialOverline.length >= titleLine.trim().length &&
            underlineLine.length >= titleLine.trim().length) {
          const charKey = `${potentialOverline[0]}_over`;
          const depth = getSectionDepth(depthMap, charKey);
          if (depth !== null && depth <= currentDepth) {
            return { nodes, nextLine: i };
          }
        }
      }
    }

    // Check for underline-only form: lines[i] is title, lines[i+1] is underline
    if (i + 1 < lines.length && !isBlank(lines[i]) && !isBlank(lines[i + 1])) {
      const potentialUnderline = lines[i + 1].trim();
      if (potentialUnderline.length >= lines[i].trim().length) {
        const uc = potentialUnderline[0];
        if (SECTION_CHARS.has(uc) && potentialUnderline.split('').every(c => c === uc)) {
          const depth = getSectionDepth(depthMap, uc);
          if (depth !== null && depth <= currentDepth) {
            return { nodes, nextLine: i };
          }
        }
      }
    }

    const line = lines[i];

    if (isBlank(line)) {
      i++;
      continue;
    }

    // Try parsing sub-section
    const sectionResult = tryParseSection(lines, i, depthMap);
    if (sectionResult) {
      nodes.push(sectionResult.node);
      i = sectionResult.nextLine;
      continue;
    }

    // Try other block elements
    const blockResult = parseSingleBlock(lines, i, 0);
    if (blockResult) {
      nodes.push(blockResult.node);
      i = blockResult.nextLine;
      continue;
    }

    i++;
  }

  return { nodes, nextLine: i };
}

/**
 * Parse a single block element (not a section).
 */
function parseSingleBlock(
  lines: string[],
  i: number,
  minIndent: number,
): ParseResult<BlockNode> | null {
  const line = lines[i];
  if (isBlank(line)) return null;
  const indent = getIndent(line);

  // Transition
  if (isTransition(line, lines, i)) {
    return { node: { type: 'transition' }, nextLine: i + 1 };
  }

  // Directive
  const directiveResult = tryParseDirective(lines, i);
  if (directiveResult) return directiveResult;

  // Comment
  if (line.trimStart().startsWith('.. ') || line.trimStart() === '..') {
    return parseComment(lines, i);
  }

  // Field list
  const fieldListResult = tryParseFieldList(lines, i, minIndent);
  if (fieldListResult) return fieldListResult;

  // Bullet list
  const bulletResult = tryParseBulletList(lines, i, indent);
  if (bulletResult) return bulletResult;

  // Enum list
  const enumResult = tryParseEnumList(lines, i, indent);
  if (enumResult) return enumResult;

  // Simple table
  const tableResult = tryParseSimpleTable(lines, i);
  if (tableResult) return tableResult;

  // Literal block
  const literalResult = tryParseLiteralBlock(lines, i);
  if (literalResult) {
    // Return just the literal block, skipping paragraph for simplicity
    if (literalResult.paragraph) {
      // We need to return both — wrap in a helper
      // For now just return the paragraph, next call will get the literal
    }
    return { node: literalResult.node, nextLine: literalResult.nextLine };
  }

  // Block quote
  if (indent > minIndent) {
    return parseBlockQuote(lines, i, indent);
  }

  // Paragraph
  return parseParagraph(lines, i, minIndent);
}

// ---------------------------------------------------------------------------
// Directive parsing
// ---------------------------------------------------------------------------

const DIRECTIVE_PATTERN = /^(\s*)\.\.?\s+([a-zA-Z_][a-zA-Z0-9_-]*)::\s*(.*)/;
const OPTION_PATTERN = /^\s+:([^:]+):\s*(.*)/;

function tryParseDirective(lines: string[], i: number): ParseResult<BlockNode> | null {
  const line = lines[i];
  const match = line.match(DIRECTIVE_PATTERN);
  if (!match) return null;

  const baseIndent = match[1].length;
  const name = match[2];
  const argument = match[3].trim();

  // Collect options and content
  let j = i + 1;
  const options: Record<string, string> = {};
  const contentLines: string[] = [];
  const contentIndent = baseIndent + 3; // Standard RST directive content indent

  // Parse options (indented :name: value lines)
  while (j < lines.length) {
    const optLine = lines[j];
    if (isBlank(optLine)) {
      j++;
      break; // blank line ends options
    }
    const optMatch = optLine.match(OPTION_PATTERN);
    if (optMatch && getIndent(optLine) >= baseIndent + 1) {
      options[optMatch[1].trim()] = optMatch[2].trim();
      j++;
    } else {
      break;
    }
  }

  // Skip blank lines between options and content
  while (j < lines.length && isBlank(lines[j])) {
    j++;
  }

  // Collect content (indented block)
  while (j < lines.length) {
    const contentLine = lines[j];
    if (isBlank(contentLine)) {
      // Check if next non-blank line is still indented
      let k = j + 1;
      while (k < lines.length && isBlank(lines[k])) k++;
      if (k < lines.length && getIndent(lines[k]) >= contentIndent) {
        contentLines.push('');
        j++;
        continue;
      }
      break;
    }
    if (getIndent(contentLine) >= contentIndent) {
      contentLines.push(contentLine.slice(contentIndent));
      j++;
    } else {
      break;
    }
  }

  // Route to specific directive handler
  const node = createDirectiveNode(name, argument, options, contentLines);
  return { node, nextLine: j };
}

function createDirectiveNode(
  name: string,
  argument: string,
  options: Record<string, string>,
  contentLines: string[]
): BlockNode {
  switch (name) {
    case 'item':
      return createItemDirectiveNode(argument, options, contentLines);
    case 'graphic':
      return createGraphicDirectiveNode(argument, options, contentLines);
    case 'listing':
    case 'code':
      return createListingDirectiveNode(argument, options, contentLines);
    case 'code-block':
      return createCodeBlockNode(argument, contentLines);
    case 'image':
      return createImageNode(argument, options);
    case 'figure':
      return createImageNode(argument, options); // simplified
    case 'toctree':
      return createToctreeNode(options, contentLines);
    case 'raw':
      if (argument === 'html') {
        return { type: 'raw_html', content: contentLines.join('\n') };
      }
      return { type: 'comment', text: contentLines.join('\n') };
    default:
      if (ADMONITION_TYPES.has(name)) {
        return createAdmonitionNode(name, argument, contentLines);
      }
      return {
        type: 'generic_directive',
        name,
        argument,
        options,
        content: contentLines,
      };
  }
}

function createItemDirectiveNode(
  title: string,
  options: Record<string, string>,
  contentLines: string[]
): ItemDirectiveNode {
  const contentNodes = contentLines.length > 0
    ? parseBlocks(contentLines, 0, 0)
    : [];

  return {
    type: 'item_directive',
    title: title || 'Untitled',
    id: options.id || '',
    itemType: options.type || 'requirement',
    level: options.level || '',
    status: options.status || 'draft',
    options,
    content: contentLines,
    contentNodes,
  };
}

function createGraphicDirectiveNode(
  title: string,
  options: Record<string, string>,
  contentLines: string[]
): GraphicDirectiveNode {
  const contentNodes = contentLines.length > 0 && !isPlantUml(contentLines)
    ? parseBlocks(contentLines, 0, 0)
    : [];

  return {
    type: 'graphic_directive',
    title: title || '',
    id: options.id || '',
    level: options.level || '',
    status: options.status || 'draft',
    file: options.file || '',
    alt: options.alt || title || 'Graphic',
    scale: options.scale || '',
    caption: options.caption || '',
    options,
    content: contentLines,
    contentNodes,
  };
}

function createListingDirectiveNode(
  title: string,
  options: Record<string, string>,
  contentLines: string[]
): ListingDirectiveNode {
  return {
    type: 'listing_directive',
    title: title || '',
    id: options.id || '',
    level: options.level || '',
    status: options.status || 'draft',
    language: options.language || 'text',
    caption: options.caption || '',
    options,
    code: contentLines.join('\n'),
  };
}

function createCodeBlockNode(language: string, contentLines: string[]): CodeBlockNode {
  return {
    type: 'code_block',
    language: language || 'text',
    code: contentLines.join('\n'),
  };
}

function createImageNode(uri: string, options: Record<string, string>): ImageNode {
  return {
    type: 'image',
    uri,
    alt: options.alt,
    scale: options.scale,
    width: options.width,
    height: options.height,
  };
}

function createToctreeNode(options: Record<string, string>, contentLines: string[]): ToctreeNode {
  const entries = contentLines
    .map(l => l.trim())
    .filter(l => l.length > 0 && !l.startsWith(':'));

  return {
    type: 'toctree',
    entries,
    maxdepth: options.maxdepth ? parseInt(options.maxdepth, 10) : undefined,
    caption: options.caption,
  };
}

function createAdmonitionNode(kind: string, title: string, contentLines: string[]): AdmonitionNode {
  const children = contentLines.length > 0
    ? parseBlocks(contentLines, 0, 0)
    : [];

  return {
    type: 'admonition',
    kind,
    title: title || kind.charAt(0).toUpperCase() + kind.slice(1),
    children,
  };
}

// ---------------------------------------------------------------------------
// Comment parsing
// ---------------------------------------------------------------------------

function parseComment(lines: string[], i: number): ParseResult<CommentNode> {
  const baseIndent = getIndent(lines[i]);
  const commentLines: string[] = [];

  let j = i + 1;
  while (j < lines.length) {
    if (isBlank(lines[j])) {
      // Check if next non-blank is still indented
      let k = j + 1;
      while (k < lines.length && isBlank(lines[k])) k++;
      if (k < lines.length && getIndent(lines[k]) > baseIndent) {
        commentLines.push('');
        j++;
        continue;
      }
      break;
    }
    if (getIndent(lines[j]) > baseIndent) {
      commentLines.push(lines[j].trimStart());
      j++;
    } else {
      break;
    }
  }

  return {
    node: { type: 'comment', text: commentLines.join('\n') },
    nextLine: j,
  };
}

// ---------------------------------------------------------------------------
// Paragraph parsing
// ---------------------------------------------------------------------------

function parseParagraph(lines: string[], i: number, minIndent: number): ParseResult<ParagraphNode> {
  const paraLines: string[] = [];
  let j = i;

  while (j < lines.length) {
    const line = lines[j];
    if (isBlank(line)) break;

    const indent = getIndent(line);
    if (indent < minIndent && j > i) break;

    // Check if this line starts something else
    if (j > i) {
      if (line.trimStart().startsWith('.. ')) break;
      if (line.trimStart().match(/^[-*+]\s/)) break;
      if (line.trimStart().match(/^(\d+\.|#\.)\s/)) break;
      if (line.trimStart().match(/^:[\w]+:/)) break;
    }

    // Check if next line is a section underline
    if (j + 1 < lines.length && !isBlank(lines[j + 1])) {
      const nextTrimmed = lines[j + 1].trim();
      if (nextTrimmed.length >= line.trim().length &&
          nextTrimmed.length > 0 &&
          SECTION_CHARS.has(nextTrimmed[0]) &&
          nextTrimmed.split('').every(c => c === nextTrimmed[0])) {
        // This line is a section title — stop paragraph before it
        if (j === i) {
          // This IS the first line, let section parser handle it
          break;
        }
        break;
      }
    }

    paraLines.push(line.trimStart());
    j++;
  }

  if (paraLines.length === 0) {
    // Edge case: skip this line
    return {
      node: { type: 'paragraph', children: [{ type: 'text', value: '' }] },
      nextLine: i + 1,
    };
  }

  const text = paraLines.join(' ');
  return {
    node: { type: 'paragraph', children: parseInline(text) },
    nextLine: j,
  };
}

// ---------------------------------------------------------------------------
// List parsing
// ---------------------------------------------------------------------------

const BULLET_PATTERN = /^(\s*)([-*+])\s+(.*)/;
const ENUM_PATTERN = /^(\s*)(\d+\.|#\.)\s+(.*)/;

function tryParseBulletList(lines: string[], i: number, indent: number): ParseResult<BulletListNode> | null {
  const match = lines[i].match(BULLET_PATTERN);
  if (!match) return null;
  if (getIndent(lines[i]) !== indent) return null;

  const items: ListItemNode[] = [];
  let j = i;

  while (j < lines.length) {
    const itemMatch = lines[j].match(BULLET_PATTERN);
    if (!itemMatch || getIndent(lines[j]) !== indent) break;

    const itemIndent = indent + itemMatch[2].length + 1; // "- " = 2 chars
    const itemLines: string[] = [itemMatch[3]];
    j++;

    // Collect continuation lines
    while (j < lines.length) {
      if (isBlank(lines[j])) {
        // Check if next non-blank is a continuation or new item
        let k = j + 1;
        while (k < lines.length && isBlank(lines[k])) k++;
        if (k < lines.length && getIndent(lines[k]) >= itemIndent) {
          itemLines.push('');
          j++;
          continue;
        }
        break;
      }
      if (getIndent(lines[j]) >= itemIndent) {
        itemLines.push(lines[j].slice(itemIndent));
        j++;
      } else {
        break;
      }
    }

    // Skip trailing blanks between items
    while (j < lines.length && isBlank(lines[j])) j++;

    const children = parseBlocks(itemLines, 0, 0);
    if (children.length === 0) {
      children.push({ type: 'paragraph', children: parseInline(itemLines.join(' ')) });
    }
    items.push({ type: 'list_item', children });
  }

  if (items.length === 0) return null;

  return {
    node: { type: 'bullet_list', items },
    nextLine: j,
  };
}

function tryParseEnumList(lines: string[], i: number, indent: number): ParseResult<EnumListNode> | null {
  const match = lines[i].match(ENUM_PATTERN);
  if (!match) return null;
  if (getIndent(lines[i]) !== indent) return null;

  const items: ListItemNode[] = [];
  let j = i;
  const start = match[2] === '#.' ? 1 : parseInt(match[2], 10);

  while (j < lines.length) {
    const itemMatch = lines[j].match(ENUM_PATTERN);
    if (!itemMatch || getIndent(lines[j]) !== indent) break;

    const enumWidth = itemMatch[2].length + 1; // "1. " = 3 chars
    const itemIndent = indent + enumWidth;
    const itemLines: string[] = [itemMatch[3]];
    j++;

    while (j < lines.length) {
      if (isBlank(lines[j])) {
        let k = j + 1;
        while (k < lines.length && isBlank(lines[k])) k++;
        if (k < lines.length && getIndent(lines[k]) >= itemIndent) {
          itemLines.push('');
          j++;
          continue;
        }
        break;
      }
      if (getIndent(lines[j]) >= itemIndent) {
        itemLines.push(lines[j].slice(itemIndent));
        j++;
      } else {
        break;
      }
    }

    while (j < lines.length && isBlank(lines[j])) j++;

    const children = parseBlocks(itemLines, 0, 0);
    if (children.length === 0) {
      children.push({ type: 'paragraph', children: parseInline(itemLines.join(' ')) });
    }
    items.push({ type: 'list_item', children });
  }

  if (items.length === 0) return null;

  return {
    node: { type: 'enum_list', items, start },
    nextLine: j,
  };
}

// ---------------------------------------------------------------------------
// Field list parsing
// ---------------------------------------------------------------------------

// Field list pattern: :fieldname: value
// Must NOT match role syntax like :termref:`0001` (field names don't contain backticks)
const FIELD_PATTERN = /^(\s*):([^:`]+):\s+(.*)/;

function tryParseFieldList(lines: string[], i: number, minIndent: number): ParseResult<FieldListNode> | null {
  const match = lines[i].match(FIELD_PATTERN);
  if (!match) return null;

  const baseIndent = getIndent(lines[i]);
  if (baseIndent < minIndent) return null;

  const fields: FieldNode[] = [];
  let j = i;

  while (j < lines.length) {
    const fieldMatch = lines[j].match(FIELD_PATTERN);
    if (!fieldMatch || getIndent(lines[j]) !== baseIndent) break;

    fields.push({
      type: 'field',
      name: fieldMatch[2].trim(),
      body: parseInline(fieldMatch[3].trim()),
    });
    j++;
  }

  if (fields.length === 0) return null;

  return {
    node: { type: 'field_list', fields },
    nextLine: j,
  };
}

// ---------------------------------------------------------------------------
// Table parsing (simple RST tables)
// ---------------------------------------------------------------------------

const TABLE_BORDER_PATTERN = /^(\s*)([=]+(\s+[=]+)*)\s*$/;

function tryParseSimpleTable(lines: string[], i: number): ParseResult<TableNode> | null {
  if (!lines[i].match(TABLE_BORDER_PATTERN)) return null;

  const indent = getIndent(lines[i]);
  const borderLine = lines[i].trim();

  // Parse column widths from border
  const colWidths = borderLine.split(/\s+/).map(s => s.length);
  let j = i + 1;
  let headers: TableCellNode[][] = [];
  const rows: TableCellNode[][] = [];
  let inHeader = true;

  while (j < lines.length) {
    const line = lines[j];

    if (line.trim().match(TABLE_BORDER_PATTERN)) {
      if (inHeader) {
        inHeader = false;
      } else {
        j++;
        break; // End of table
      }
      j++;
      continue;
    }

    if (isBlank(line)) {
      j++;
      break; // End of table
    }

    // Parse cells based on column widths
    const rawLine = line.slice(indent);
    const cells: TableCellNode[] = [];
    let colStart = 0;
    for (const width of colWidths) {
      const cellText = rawLine.slice(colStart, colStart + width).trim();
      cells.push({ type: 'table_cell', children: parseInline(cellText) });
      colStart += width + 1; // +1 for space separator
    }

    if (inHeader) {
      headers.push(cells);
    } else {
      rows.push(cells);
    }
    j++;
  }

  // If no header separator was found, everything is body
  if (inHeader) {
    return {
      node: { type: 'table', headers: [], rows: headers },
      nextLine: j,
    };
  }

  return {
    node: { type: 'table', headers, rows },
    nextLine: j,
  };
}

// ---------------------------------------------------------------------------
// Literal block parsing (paragraph ending with ::)
// ---------------------------------------------------------------------------

function tryParseLiteralBlock(lines: string[], i: number): (ParseResult<LiteralBlockNode> & { paragraph?: ParagraphNode }) | null {
  // Check if current paragraph ends with ::
  let j = i;
  const paraLines: string[] = [];

  while (j < lines.length && !isBlank(lines[j])) {
    paraLines.push(lines[j]);
    j++;
  }

  if (paraLines.length === 0) return null;
  const lastLine = paraLines[paraLines.length - 1].trimEnd();
  if (!lastLine.endsWith('::')) return null;

  // Skip blank lines
  while (j < lines.length && isBlank(lines[j])) j++;
  if (j >= lines.length) return null;

  // The next non-blank line must be indented
  const blockIndent = getIndent(lines[j]);
  if (blockIndent <= getIndent(lines[i])) return null;

  // Collect literal block
  const blockLines: string[] = [];
  while (j < lines.length) {
    if (isBlank(lines[j])) {
      let k = j + 1;
      while (k < lines.length && isBlank(lines[k])) k++;
      if (k < lines.length && getIndent(lines[k]) >= blockIndent) {
        blockLines.push('');
        j++;
        continue;
      }
      break;
    }
    if (getIndent(lines[j]) >= blockIndent) {
      blockLines.push(lines[j].slice(blockIndent));
      j++;
    } else {
      break;
    }
  }

  // Create paragraph from text before ::
  let paragraph: ParagraphNode | undefined;
  const paraText = paraLines.join(' ').trimEnd();
  if (paraText !== '::') {
    // Remove trailing :: and add single :
    const cleanText = paraText.endsWith(' ::')
      ? paraText.slice(0, -3) + ':'
      : paraText.slice(0, -1); // remove one :
    if (cleanText.trim().length > 0) {
      paragraph = { type: 'paragraph', children: parseInline(cleanText) };
    }
  }

  return {
    node: { type: 'literal_block', content: blockLines.join('\n') },
    nextLine: j,
    paragraph,
  };
}

// ---------------------------------------------------------------------------
// Block quote parsing
// ---------------------------------------------------------------------------

function parseBlockQuote(lines: string[], i: number, indent: number): ParseResult<BlockQuoteNode> {
  const bqLines: string[] = [];
  let j = i;

  while (j < lines.length) {
    if (isBlank(lines[j])) {
      let k = j + 1;
      while (k < lines.length && isBlank(lines[k])) k++;
      if (k < lines.length && getIndent(lines[k]) >= indent) {
        bqLines.push('');
        j++;
        continue;
      }
      break;
    }
    if (getIndent(lines[j]) >= indent) {
      bqLines.push(lines[j].slice(indent));
      j++;
    } else {
      break;
    }
  }

  const children = parseBlocks(bqLines, 0, 0);

  return {
    node: { type: 'block_quote', children },
    nextLine: j,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isBlank(line: string): boolean {
  return line.trim().length === 0;
}

function getIndent(line: string): number {
  const match = line.match(/^(\s*)/);
  return match ? match[1].length : 0;
}

function isTransition(line: string, lines: string[], i: number): boolean {
  const trimmed = line.trim();
  if (trimmed.length < 4) return false;
  const ch = trimmed[0];
  if (!SECTION_CHARS.has(ch)) return false;
  if (!trimmed.split('').every(c => c === ch)) return false;

  // Must be preceded and followed by blank lines (or start/end of doc)
  const prevBlank = i === 0 || isBlank(lines[i - 1]);
  const nextBlank = i + 1 >= lines.length || isBlank(lines[i + 1]);
  return prevBlank && nextBlank;
}

function isPlantUml(contentLines: string[]): boolean {
  const text = contentLines.join('\n');
  return text.includes('@startuml') || text.includes('@startmindmap') || text.includes('@startgantt');
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
