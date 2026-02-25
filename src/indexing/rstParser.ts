/**
 * RST Parser for requirement directives
 */

import {
  RequirementObject,
  RequirementReference,
  ParsedRstFile,
  RigrConfig,
  SourceLocation,
} from '../types';
import { getLinkOptionNames } from '../configuration/defaults';

// Regex patterns for RST parsing
const ITEM_DIRECTIVE_REGEX = /^\.\.\s+item::\s*(.*)$/;
const GRAPHIC_DIRECTIVE_REGEX = /^\.\.\s+graphic::\s*(.*)$/;
const CODE_DIRECTIVE_REGEX = /^\.\.\s+code::\s*(.*)$/;
const OPTION_REGEX = /^\s+:(\w+):\s*(.*)$/;
const INLINE_ITEM_REGEX = /:item:`([^`]+)`/g;
const INDENT_REGEX = /^(\s+)/;

type DirectiveType = 'item' | 'graphic' | 'code';

interface ParseState {
  inDirective: boolean;
  directiveType: DirectiveType | null;
  currentTitle: string;
  currentOptions: Map<string, string>;
  currentDescription: string[];
  startLine: number;
  directiveIndent: number;
  contentIndent: number | null;
  pastOptions: boolean;
}

/**
 * Parse IDs from a comma/space separated string
 */
function parseIdList(value: string): string[] {
  return value
    .split(/[,\s]+/)
    .map(id => id.trim())
    .filter(id => id.length > 0);
}

/**
 * Check if a line is a directive start (item or graphic directive)
 */
function isDirectiveStart(line: string): { title: string; type: DirectiveType } | null {
  const itemMatch = line.match(ITEM_DIRECTIVE_REGEX);
  if (itemMatch) {
    return {
      title: itemMatch[1].trim(),
      type: 'item',
    };
  }

  const graphicMatch = line.match(GRAPHIC_DIRECTIVE_REGEX);
  if (graphicMatch) {
    return {
      title: graphicMatch[1].trim(),
      type: 'graphic',
    };
  }

  const codeMatch = line.match(CODE_DIRECTIVE_REGEX);
  if (codeMatch) {
    return {
      title: codeMatch[1].trim(),
      type: 'code',
    };
  }

  return null;
}

/**
 * Check if a line is an option
 */
function isOption(line: string): { name: string; value: string } | null {
  const match = line.match(OPTION_REGEX);
  if (match) {
    return {
      name: match[1],
      value: match[2].trim(),
    };
  }
  return null;
}

/**
 * Get line indent level
 */
function getIndent(line: string): number {
  const match = line.match(INDENT_REGEX);
  return match ? match[1].length : 0;
}

/**
 * Check if line is blank or whitespace only
 */
function isBlankLine(line: string): boolean {
  return line.trim().length === 0;
}

/**
 * Build RequirementObject from parsed state
 */
function buildRequirement(
  state: ParseState,
  filePath: string,
  endLine: number,
  config: RigrConfig
): RequirementObject | null {
  const id = state.currentOptions.get('id');
  // For graphics/code, default type to directive type if not specified
  const type = state.currentOptions.get('type') ||
    (state.directiveType === 'graphic' ? 'graphic' :
     state.directiveType === 'code' ? 'code' : undefined);

  if (!id || !type) {
    return null;
  }

  const linkOptions = new Set(getLinkOptionNames(config));
  const links: Record<string, string[]> = {};
  const metadata: Record<string, string> = {};

  // Reserved options that are not stored in metadata
  const reservedOptions = new Set(['id', 'type', 'level', 'status', 'baseline']);

  for (const [key, value] of state.currentOptions) {
    if (reservedOptions.has(key)) {
      continue;
    }
    if (linkOptions.has(key)) {
      links[key] = parseIdList(value);
    } else {
      metadata[key] = value;
    }
  }

  // Scan body text for :termref: and :paramval: inline references
  const bodyText = state.currentDescription.join('\n');
  const inlineRefIds = extractInlineRefIds(bodyText);
  if (inlineRefIds.length > 0) {
    const existing = links['references'] || [];
    links['references'] = [...new Set([...existing, ...inlineRefIds])];
  }

  return {
    id,
    type,
    level: state.currentOptions.get('level'),
    title: state.currentTitle,
    description: bodyText.trim(),
    status: state.currentOptions.get('status'),
    links,
    metadata,
    location: {
      file: filePath,
      line: state.startLine,
      endLine,
    },
    baseline: state.currentOptions.get('baseline'),
  };
}

/**
 * Extract IDs from :termref:`ID`, :paramval:`ID`, and :item:`ID` inline roles in body text.
 */
function extractInlineRefIds(text: string): string[] {
  const ids: string[] = [];
  const pattern = /:(?:termref|paramval|item):`([^`]+)`/g;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const id = match[1].trim();
    if (id) ids.push(id);
  }
  return ids;
}

/**
 * Find inline item references in text
 */
function findInlineReferences(
  text: string,
  lineNumber: number,
  filePath: string
): RequirementReference[] {
  const references: RequirementReference[] = [];
  let match;

  // Reset regex state
  INLINE_ITEM_REGEX.lastIndex = 0;

  while ((match = INLINE_ITEM_REGEX.exec(text)) !== null) {
    references.push({
      id: match[1].trim(),
      location: {
        file: filePath,
        line: lineNumber,
      },
      context: 'inline',
    });
  }

  return references;
}

/**
 * Find references in link options
 */
function findLinkReferences(
  options: Map<string, string>,
  lineNumber: number,
  filePath: string,
  config: RigrConfig
): RequirementReference[] {
  const references: RequirementReference[] = [];
  const linkOptions = new Set(getLinkOptionNames(config));

  for (const [key, value] of options) {
    if (linkOptions.has(key)) {
      const ids = parseIdList(value);
      for (const id of ids) {
        references.push({
          id,
          location: {
            file: filePath,
            line: lineNumber,
          },
          context: 'link',
        });
      }
    }
  }

  return references;
}

/**
 * Parse an RST file and extract requirements and references
 */
export function parseRstFile(
  content: string,
  filePath: string,
  config: RigrConfig
): ParsedRstFile {
  const lines = content.split('\n');
  const requirements: RequirementObject[] = [];
  const references: RequirementReference[] = [];
  const parseErrors: Array<{ line: number; message: string }> = [];

  let state: ParseState = {
    inDirective: false,
    directiveType: null,
    currentTitle: '',
    currentOptions: new Map(),
    currentDescription: [],
    startLine: 0,
    directiveIndent: 0,
    contentIndent: null,
    pastOptions: false,
  };

  const finishCurrentDirective = (endLine: number) => {
    if (state.inDirective) {
      const req = buildRequirement(state, filePath, endLine, config);
      if (req) {
        requirements.push(req);

        // Add definition reference
        references.push({
          id: req.id,
          location: req.location,
          context: 'definition',
        });

        // Add link references
        const linkRefs = findLinkReferences(
          state.currentOptions,
          state.startLine,
          filePath,
          config
        );
        references.push(...linkRefs);
      } else if (state.currentOptions.size > 0) {
        const directiveName = state.directiveType || 'item';
        if (!state.currentOptions.get('id')) {
          parseErrors.push({
            line: state.startLine,
            message: `Directive '${directiveName}' is missing required :id: option`,
          });
        }
        // Only require :type: for item directives, not graphics
        if (state.directiveType === 'item' && !state.currentOptions.get('type')) {
          parseErrors.push({
            line: state.startLine,
            message: `Directive 'item' is missing required :type: option`,
          });
        }
      }
    }

    // Reset state
    state = {
      inDirective: false,
      directiveType: null,
      currentTitle: '',
      currentOptions: new Map(),
      currentDescription: [],
      startLine: 0,
      directiveIndent: 0,
      contentIndent: null,
      pastOptions: false,
    };
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1; // 1-based line numbers

    // Find inline references in any line
    const inlineRefs = findInlineReferences(line, lineNumber, filePath);
    references.push(...inlineRefs);

    // Check for new directive
    const directiveMatch = isDirectiveStart(line);
    if (directiveMatch) {
      // Finish previous directive
      finishCurrentDirective(lineNumber - 1);

      // Start new directive
      state.inDirective = true;
      state.directiveType = directiveMatch.type;
      state.currentTitle = directiveMatch.title;
      state.startLine = lineNumber;
      state.directiveIndent = getIndent(line);
      continue;
    }

    if (!state.inDirective) {
      continue;
    }

    // Inside a directive
    const currentIndent = getIndent(line);

    // Check if we've exited the directive (non-blank line with same or less indent)
    if (!isBlankLine(line) && currentIndent <= state.directiveIndent) {
      finishCurrentDirective(lineNumber - 1);

      // Re-process this line (it might be another directive)
      const newDirective = isDirectiveStart(line);
      if (newDirective) {
        state.inDirective = true;
        state.directiveType = newDirective.type;
        state.currentTitle = newDirective.title;
        state.startLine = lineNumber;
        state.directiveIndent = currentIndent;
      }
      continue;
    }

    // Parse option (only before body content starts)
    if (!state.pastOptions) {
      const optionMatch = isOption(line);
      if (optionMatch) {
        state.currentOptions.set(optionMatch.name, optionMatch.value);
        continue;
      }
    }

    // Description line (or blank line within directive)
    if (isBlankLine(line)) {
      // A blank line after options signals the end of the options section
      if (state.currentOptions.size > 0) {
        state.pastOptions = true;
      }
      if (state.currentDescription.length > 0) {
        state.currentDescription.push('');
      }
    } else {
      // Any non-option content line means we're past the options section
      state.pastOptions = true;
      // Set content indent from first non-blank content line
      if (state.contentIndent === null) {
        state.contentIndent = currentIndent;
      }

      // Add to description, removing the content indent
      const descLine = currentIndent >= state.contentIndent
        ? line.substring(state.contentIndent)
        : line.trim();
      state.currentDescription.push(descLine);
    }
  }

  // Finish last directive
  finishCurrentDirective(lines.length);

  return {
    filePath,
    requirements,
    references,
    parseErrors,
  };
}

/**
 * Parse a single requirement directive from text
 * Useful for hover previews and incremental parsing
 */
export function parseRequirementAtLine(
  content: string,
  filePath: string,
  lineNumber: number,
  config: RigrConfig
): RequirementObject | null {
  const parsed = parseRstFile(content, filePath, config);

  // Find requirement that contains this line
  for (const req of parsed.requirements) {
    if (lineNumber >= req.location.line && lineNumber <= (req.location.endLine || req.location.line)) {
      return req;
    }
  }

  return null;
}

/**
 * Find requirement ID at a specific position in text
 */
export function findIdAtPosition(
  line: string,
  column: number,
  config: RigrConfig
): string | null {
  // Create a fresh regex for this search
  const idRegex = new RegExp(config.id_regex.source, 'g');

  let match;
  while ((match = idRegex.exec(line)) !== null) {
    const start = match.index;
    const end = start + match[0].length;

    if (column >= start && column <= end) {
      return match[0];
    }
  }

  return null;
}

/**
 * Get all requirement IDs mentioned in a line
 */
export function getIdsInLine(line: string, config: RigrConfig): string[] {
  const ids: string[] = [];
  const idRegex = new RegExp(config.id_regex.source, 'g');

  let match;
  while ((match = idRegex.exec(line)) !== null) {
    ids.push(match[0]);
  }

  return ids;
}

/**
 * Check if position is in a link context (after :links:, :satisfies:, etc.)
 */
export function isInLinkContext(
  line: string,
  column: number,
  config: RigrConfig
): boolean {
  const linkOptions = getLinkOptionNames(config);

  for (const option of linkOptions) {
    const pattern = new RegExp(`:${option}:\\s*`);
    const match = line.match(pattern);
    if (match && match.index !== undefined) {
      const optionEnd = match.index + match[0].length;
      if (column >= optionEnd) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if position is in an inline item context (:item:`...`)
 */
export function isInInlineItemContext(line: string, column: number): boolean {
  // Find all :item:` positions
  const itemPattern = /:item:`/g;
  let match;

  while ((match = itemPattern.exec(line)) !== null) {
    const start = match.index;
    const backtickStart = start + match[0].length - 1;

    // Find closing backtick
    const closingPos = line.indexOf('`', backtickStart + 1);
    const end = closingPos === -1 ? line.length : closingPos;

    if (column >= backtickStart && column <= end) {
      return true;
    }
  }

  return false;
}
