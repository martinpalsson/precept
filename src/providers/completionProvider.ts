/**
 * Completion Provider - Autocomplete for requirement IDs and dynamic snippets
 */

import * as vscode from 'vscode';
import { IndexBuilder } from '../indexing/indexBuilder';
import { RigrConfig, RequirementObject, Level } from '../types';
import { isInLinkContext, isInInlineItemContext } from '../indexing/rstParser';
import { getLinkOptionNames, getStatusNames, getObjectTypeInfo, getLevelInfo, getCustomFieldNames, getCustomFieldValues } from '../configuration/defaults';
import { generateNextId } from '../utils/idGenerator';

/**
 * Create completion item from requirement
 */
function createCompletionItem(
  req: RequirementObject,
  config: RigrConfig
): vscode.CompletionItem {
  const statusLabel = req.status ? ` [${req.status}]` : '';
  const typeInfo = getObjectTypeInfo(config, req.type);
  const typeLabel = typeInfo?.title || req.type;
  const levelInfo = req.level ? getLevelInfo(config, req.level) : undefined;
  const levelLabel = levelInfo?.title || req.level || '';
  const levelDisplay = levelLabel ? ` [${levelLabel}]` : '';
  const label = `${req.id} - ${req.title} [${typeLabel}]${levelDisplay}${statusLabel}`;

  const item = new vscode.CompletionItem(label, vscode.CompletionItemKind.Reference);
  item.insertText = req.id;
  item.filterText = `${req.id} ${req.title} ${req.level || ''}`;
  item.sortText = req.id;

  // Add documentation
  const docParts = [
    `**${req.id}** - ${typeLabel}`,
    '',
    req.title,
  ];

  if (req.level) {
    docParts.push('', `Level: ${levelLabel || req.level}`);
  }

  if (req.description) {
    docParts.push('', req.description.substring(0, 200) + (req.description.length > 200 ? '...' : ''));
  }

  if (req.status) {
    docParts.push('', `Status: ${req.status}`);
  }

  if (Object.keys(req.links).length > 0) {
    docParts.push('', 'Links:');
    for (const [linkType, ids] of Object.entries(req.links)) {
      docParts.push(`  ${linkType}: ${ids.join(', ')}`);
    }
  }

  item.documentation = new vscode.MarkdownString(docParts.join('\n'));

  return item;
}

/**
 * Result of detecting directive position
 */
interface DirectivePositionInfo {
  isAtDirectivePosition: boolean;
  replaceRange: vscode.Range | null;
  matchedDirective: string | null;
}

/**
 * Detect if cursor is at a directive position and calculate replacement range
 */
function detectDirectivePosition(
  line: string,
  position: vscode.Position,
  config: RigrConfig
): DirectivePositionInfo {
  const linePrefix = line.substring(0, position.character);
  const trimmedPrefix = linePrefix.trim();
  const leadingSpaces = linePrefix.length - linePrefix.trimStart().length;

  // Pattern 1: "item-xxx" style prefix (e.g., "item-req", "item-rat")
  const itemPrefixMatch = linePrefix.match(/^(\s*)(item-\w*)$/);
  if (itemPrefixMatch) {
    const startCol = itemPrefixMatch[1].length;
    return {
      isAtDirectivePosition: true,
      replaceRange: new vscode.Range(position.line, startCol, position.line, position.character),
      matchedDirective: null,
    };
  }

  // Pattern 2: ".. directive::" style (complete or partial)
  // Matches: "..", ".. i", ".. item", ".. item:", ".. item::"
  const directiveMatch = linePrefix.match(/^(\s*)(\.\.(?:\s+(\w*)(?:::?)?)?)\s*$/);
  if (directiveMatch) {
    const startCol = directiveMatch[1].length;
    const matchedDirective = directiveMatch[3] || null;
    return {
      isAtDirectivePosition: true,
      replaceRange: new vscode.Range(position.line, startCol, position.line, position.character),
      matchedDirective,
    };
  }

  // Pattern 3: Empty line or just whitespace
  if (trimmedPrefix === '') {
    return {
      isAtDirectivePosition: true,
      replaceRange: new vscode.Range(position.line, leadingSpaces, position.line, position.character),
      matchedDirective: null,
    };
  }

  return {
    isAtDirectivePosition: false,
    replaceRange: null,
    matchedDirective: null,
  };
}

/**
 * Create a dynamic snippet completion for inserting a new requirement at a specific level
 */
function createRequirementSnippetCompletion(
  level: Level,
  nextId: string,
  config: RigrConfig,
  replaceRange: vscode.Range | null
): vscode.CompletionItem {
  const statuses = getStatusNames(config);
  const statusChoices = statuses.length > 0 ? statuses.join(',') : 'draft,review,approved,implemented';

  const objectTypes = config.objectTypes.map(t => t.type).join(',');
  const levels = config.levels.map(l => l.level).join(',');

  const label = `New ${level.title} (${nextId})`;
  const item = new vscode.CompletionItem(label, vscode.CompletionItemKind.Snippet);

  // Build the snippet with auto-incremented ID, type selection, and level
  const snippetLines = [
    `.. item:: \${1:Title}`,
    `   :id: ${nextId}`,
    `   :type: \${2|${objectTypes}|}`,
    `   :level: ${level.level}`,
    `   :status: \${3|${statusChoices}|}`,
    ``,
    `   \${0:Description}`,
  ];

  item.insertText = new vscode.SnippetString(snippetLines.join('\n'));
  item.filterText = `item-${level.level} .. item:: ${level.title.toLowerCase()} new`;
  item.sortText = `0-${level.level}`; // Sort before ID completions

  // Set the range to replace the typed prefix
  if (replaceRange) {
    item.range = replaceRange;
  }

  item.documentation = new vscode.MarkdownString([
    `**Insert New ${level.title}**`,
    '',
    `Creates a new \`item\` directive with auto-generated ID \`${nextId}\`.`,
    '',
    `Level: \`${level.level}\``,
  ].join('\n'));

  // Mark as a snippet
  item.detail = `Insert item with ID ${nextId}`;

  return item;
}

/**
 * Create a generic snippet completion (no specific level pre-filled)
 */
function createGenericSnippetCompletion(
  nextId: string,
  config: RigrConfig,
  replaceRange: vscode.Range | null
): vscode.CompletionItem {
  const statuses = getStatusNames(config);
  const statusChoices = statuses.length > 0 ? statuses.join(',') : 'draft,review,approved,implemented';

  const objectTypes = config.objectTypes.map(t => t.type).join(',');
  const levels = config.levels.map(l => l.level).join(',');

  const label = `New Item (${nextId})`;
  const item = new vscode.CompletionItem(label, vscode.CompletionItemKind.Snippet);

  // Build the snippet with auto-incremented ID and level selection
  const snippetLines = [
    `.. item:: \${1:Title}`,
    `   :id: ${nextId}`,
    `   :type: \${2|${objectTypes}|}`,
    `   :level: \${3|${levels}|}`,
    `   :status: \${4|${statusChoices}|}`,
    ``,
    `   \${0:Description}`,
  ];

  item.insertText = new vscode.SnippetString(snippetLines.join('\n'));
  item.filterText = `item .. item:: new requirement`;
  item.sortText = `0-0-generic`; // Sort first

  // Set the range to replace the typed prefix
  if (replaceRange) {
    item.range = replaceRange;
  }

  item.documentation = new vscode.MarkdownString([
    `**Insert New Item**`,
    '',
    `Creates a new \`item\` directive with auto-generated ID \`${nextId}\`.`,
    '',
    `You can select the type and level from the dropdown.`,
  ].join('\n'));

  // Mark as a snippet
  item.detail = `Insert item with ID ${nextId}`;

  return item;
}

/**
 * Create a snippet completion for inserting a new graphic directive
 */
function createGraphicSnippetCompletion(
  nextId: string,
  config: RigrConfig,
  replaceRange: vscode.Range | null
): vscode.CompletionItem {
  const label = `New Graphic (${nextId})`;
  const item = new vscode.CompletionItem(label, vscode.CompletionItemKind.Snippet);

  const snippetLines = [
    `.. graphic:: \${1:Title}`,
    `   :id: ${nextId}`,
    `   :file: \${2:images/filename.png}`,
    `   :caption: \${3:Caption text}`,
    `   \${4::satisfies: }`,
    ``,
  ];

  item.insertText = new vscode.SnippetString(snippetLines.join('\n'));
  item.filterText = `graphic .. graphic:: new image diagram`;
  item.sortText = `0-1-graphic`;

  if (replaceRange) {
    item.range = replaceRange;
  }

  item.documentation = new vscode.MarkdownString([
    `**Insert New Graphic**`,
    '',
    `Creates a new \`graphic\` directive with auto-generated ID \`${nextId}\`.`,
    '',
    `Use \`:file:\` for images or put PlantUML code in the body.`,
  ].join('\n'));

  item.detail = `Insert graphic with ID ${nextId}`;

  return item;
}

/**
 * Create a snippet completion for inserting a new code directive
 */
function createCodeSnippetCompletion(
  nextId: string,
  config: RigrConfig,
  replaceRange: vscode.Range | null
): vscode.CompletionItem {
  const label = `New Code (${nextId})`;
  const item = new vscode.CompletionItem(label, vscode.CompletionItemKind.Snippet);

  const snippetLines = [
    `.. listing:: \${1:Title}`,
    `   :id: ${nextId}`,
    `   :language: \${2|python,c,cpp,java,rust,go,javascript,typescript,xml,yaml,json,bash,sql|}`,
    `   :caption: \${3:Description}`,
    `   \${4::satisfies: }`,
    ``,
    `   \${0:# Your code here}`,
  ];

  item.insertText = new vscode.SnippetString(snippetLines.join('\n'));
  item.filterText = `listing .. listing:: new source codeblock`;
  item.sortText = `0-1-code`;

  if (replaceRange) {
    item.range = replaceRange;
  }

  item.documentation = new vscode.MarkdownString([
    `**Insert New Code Block**`,
    '',
    `Creates a new \`code\` directive with auto-generated ID \`${nextId}\`.`,
    '',
    `Select the programming language for syntax highlighting.`,
  ].join('\n'));

  item.detail = `Insert code block with ID ${nextId}`;

  return item;
}

/**
 * Create a snippet completion for inserting a new parameter
 */
function createParameterSnippetCompletion(
  nextId: string,
  config: RigrConfig,
  replaceRange: vscode.Range | null
): vscode.CompletionItem {
  const statuses = getStatusNames(config);
  const statusChoices = statuses.length > 0 ? statuses.join(',') : 'draft,review,approved,implemented';
  const levels = config.levels.map(l => l.level).join(',');

  const label = `New Parameter (${nextId})`;
  const item = new vscode.CompletionItem(label, vscode.CompletionItemKind.Snippet);

  const snippetLines = [
    `.. item:: \${1:Parameter Name}`,
    `   :id: ${nextId}`,
    `   :type: parameter`,
    `   :level: \${2|${levels}|}`,
    `   :status: \${3|${statusChoices}|}`,
    `   :value: \${4:value}`,
    ``,
    `   \${0:Description of the parameter.}`,
  ];

  item.insertText = new vscode.SnippetString(snippetLines.join('\n'));
  item.filterText = `parameter .. item:: new parameter value`;
  item.sortText = `0-1-parameter`;

  if (replaceRange) {
    item.range = replaceRange;
  }

  item.documentation = new vscode.MarkdownString([
    `**Insert New Parameter**`,
    '',
    `Creates a new parameter item with auto-generated ID \`${nextId}\`.`,
    '',
    `Parameters have a \`:value:\` field that can be referenced using \`:paramval:\`${nextId}\`\`.`,
  ].join('\n'));

  item.detail = `Insert parameter with ID ${nextId}`;

  return item;
}

/**
 * Create a snippet completion for inserting a new term
 */
function createTermSnippetCompletion(
  nextId: string,
  config: RigrConfig,
  replaceRange: vscode.Range | null
): vscode.CompletionItem {
  const statuses = getStatusNames(config);
  const statusChoices = statuses.length > 0 ? statuses.join(',') : 'draft,review,approved,implemented';
  const levels = config.levels.map(l => l.level).join(',');

  const label = `New Term (${nextId})`;
  const item = new vscode.CompletionItem(label, vscode.CompletionItemKind.Snippet);

  const snippetLines = [
    `.. item:: \${1:Full Term Name}`,
    `   :id: ${nextId}`,
    `   :type: term`,
    `   :level: \${2|${levels}|}`,
    `   :status: \${3|${statusChoices}|}`,
    `   :term: \${4:Abbreviation or Short Name}`,
    ``,
    `   \${0:Definition of the term.}`,
  ];

  item.insertText = new vscode.SnippetString(snippetLines.join('\n'));
  item.filterText = `term .. item:: new term glossary terminology`;
  item.sortText = `0-1-term`;

  if (replaceRange) {
    item.range = replaceRange;
  }

  item.documentation = new vscode.MarkdownString([
    `**Insert New Term**`,
    '',
    `Creates a new terminology item with auto-generated ID \`${nextId}\`.`,
    '',
    `Terms have a \`:term:\` field that can be referenced using \`:termref:\`${nextId}\`\`.`,
  ].join('\n'));

  item.detail = `Insert term with ID ${nextId}`;

  return item;
}

/**
 * Get trigger characters for completion
 */
function getTriggerCharacters(config: RigrConfig): string[] {
  return [':', '`', ',', ' '];
}

/**
 * Result of detecting attribute context
 */
interface AttributeContextInfo {
  attributeName: string | null;
  replaceRange: vscode.Range | null;
}

/**
 * Detect if cursor is in an attribute value context (e.g., ":type: " or ":status: draft")
 * Returns the attribute name and a range to replace any existing value
 */
function detectAttributeContext(
  line: string,
  position: vscode.Position
): AttributeContextInfo {
  const linePrefix = line.substring(0, position.character);

  // Match patterns like ":type: " or ":type: req" (with partial value)
  // The attribute must be at the start of the line (with optional leading whitespace)
  const attrMatch = linePrefix.match(/^\s+:(\w+):\s*(\S*)$/);
  if (attrMatch) {
    const attributeName = attrMatch[1];
    const existingValue = attrMatch[2];
    const valueStart = linePrefix.lastIndexOf(existingValue);

    // Calculate the range to replace (from start of value to end of line's current value)
    const lineSuffix = line.substring(position.character);
    const valueEndMatch = lineSuffix.match(/^(\S*)/);
    const valueEndLength = valueEndMatch ? valueEndMatch[1].length : 0;

    const replaceRange = new vscode.Range(
      position.line,
      valueStart,
      position.line,
      position.character + valueEndLength
    );

    return { attributeName, replaceRange };
  }

  return { attributeName: null, replaceRange: null };
}

/**
 * Create completion items for type attribute
 */
function createTypeCompletions(
  config: RigrConfig,
  replaceRange: vscode.Range | null
): vscode.CompletionItem[] {
  return config.objectTypes.map((objType, index) => {
    const item = new vscode.CompletionItem(objType.type, vscode.CompletionItemKind.EnumMember);
    item.detail = objType.title;
    item.documentation = `Set type to "${objType.title}"`;
    item.sortText = String(index).padStart(3, '0');
    if (replaceRange) {
      item.range = replaceRange;
    }
    return item;
  });
}

/**
 * Create completion items for level attribute
 */
function createLevelCompletions(
  config: RigrConfig,
  replaceRange: vscode.Range | null
): vscode.CompletionItem[] {
  return config.levels.map((level, index) => {
    const item = new vscode.CompletionItem(level.level, vscode.CompletionItemKind.EnumMember);
    item.detail = level.title;
    item.documentation = `Set level to "${level.title}"`;
    item.sortText = String(index).padStart(3, '0');
    if (replaceRange) {
      item.range = replaceRange;
    }
    return item;
  });
}

/**
 * Create completion items for status attribute
 */
function createStatusCompletions(
  config: RigrConfig,
  replaceRange: vscode.Range | null
): vscode.CompletionItem[] {
  return config.statuses.map((status, index) => {
    const item = new vscode.CompletionItem(status.status, vscode.CompletionItemKind.EnumMember);
    item.detail = `Status: ${status.status}`;
    if (status.color) {
      item.documentation = `Set status to "${status.status}"`;
    }
    item.sortText = String(index).padStart(3, '0');
    if (replaceRange) {
      item.range = replaceRange;
    }
    return item;
  });
}

/**
 * Create completions for custom field values
 */
function createCustomFieldCompletions(
  config: RigrConfig,
  fieldName: string,
  replaceRange: vscode.Range | null
): vscode.CompletionItem[] {
  const fieldValues = config.customFields?.[fieldName] || [];
  return fieldValues.map((fieldValue, index) => {
    const item = new vscode.CompletionItem(fieldValue.value, vscode.CompletionItemKind.EnumMember);
    item.detail = fieldValue.title;
    item.documentation = `Set ${fieldName} to "${fieldValue.value}"`;
    item.sortText = String(index).padStart(3, '0');
    if (replaceRange) {
      item.range = replaceRange;
    }
    return item;
  });
}

/**
 * Completion provider for requirement IDs
 */
export class RequirementCompletionProvider implements vscode.CompletionItemProvider {
  private indexBuilder: IndexBuilder;
  private config: RigrConfig;

  constructor(indexBuilder: IndexBuilder, config: RigrConfig) {
    this.indexBuilder = indexBuilder;
    this.config = config;
  }

  /**
   * Update configuration
   */
  public updateConfig(config: RigrConfig): void {
    this.config = config;
  }

  /**
   * Provide completion items
   */
  public provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
    context: vscode.CompletionContext
  ): vscode.CompletionItem[] | null {
    const line = document.lineAt(position.line).text;
    const linePrefix = line.substring(0, position.character);

    // Check if we're in an attribute value context (highest priority for contextual completions)
    const attrContext = detectAttributeContext(line, position);
    if (attrContext.attributeName) {
      // Provide context-specific completions based on attribute name
      switch (attrContext.attributeName) {
        case 'type':
          return createTypeCompletions(this.config, attrContext.replaceRange);
        case 'level':
          return createLevelCompletions(this.config, attrContext.replaceRange);
        case 'status':
          return createStatusCompletions(this.config, attrContext.replaceRange);
        default:
          // Check if it's a custom field with defined values
          const customFieldNames = getCustomFieldNames(this.config);
          if (customFieldNames.includes(attrContext.attributeName)) {
            return createCustomFieldCompletions(this.config, attrContext.attributeName, attrContext.replaceRange);
          }
          // For link attributes, provide ID completions
          const linkOptions = getLinkOptionNames(this.config);
          if (linkOptions.includes(attrContext.attributeName)) {
            const requirements = this.indexBuilder.getAllRequirements();
            return requirements.map(req => createCompletionItem(req, this.config));
          }
          break;
      }
    }

    // Check if we're in a link context
    const inLinkContext = isInLinkContext(line, position.character, this.config);

    // Check if we're in an inline item context
    const inInlineItem = isInInlineItemContext(line, position.character);

    // Check if we're at a position where a new directive can be inserted
    const directiveInfo = detectDirectivePosition(line, position, this.config);

    // Get all requirements (needed for both ID completions and next ID generation)
    const requirements = this.indexBuilder.getAllRequirements();

    const items: vscode.CompletionItem[] = [];

    // Add dynamic snippet completions for inserting new requirements
    if (directiveInfo.isAtDirectivePosition) {
      // Generate the next ID (project-global)
      const nextId = generateNextId(this.config.idConfig, requirements);

      // Add generic snippet (select level from dropdown)
      const genericItem = createGenericSnippetCompletion(nextId, this.config, directiveInfo.replaceRange);
      items.push(genericItem);

      // Add level-specific snippets
      for (const level of this.config.levels) {
        const snippetItem = createRequirementSnippetCompletion(level, nextId, this.config, directiveInfo.replaceRange);
        items.push(snippetItem);
      }

      // Add graphic directive snippet
      const graphicItem = createGraphicSnippetCompletion(nextId, this.config, directiveInfo.replaceRange);
      items.push(graphicItem);

      // Add code directive snippet
      const codeItem = createCodeSnippetCompletion(nextId, this.config, directiveInfo.replaceRange);
      items.push(codeItem);

      // Add parameter snippet
      const paramItem = createParameterSnippetCompletion(nextId, this.config, directiveInfo.replaceRange);
      items.push(paramItem);

      // Add term snippet
      const termItem = createTermSnippetCompletion(nextId, this.config, directiveInfo.replaceRange);
      items.push(termItem);
    }

    // Add ID reference completions if in link/inline context
    if (inLinkContext || inInlineItem) {
      const idItems = requirements.map(req => createCompletionItem(req, this.config));
      items.push(...idItems);
    } else if (!directiveInfo.isAtDirectivePosition) {
      // Check if the user just typed a colon after a link option name
      const linkOptions = getLinkOptionNames(this.config);
      const colonMatch = linePrefix.match(/:(\w+):\s*$/);
      if (colonMatch && linkOptions.includes(colonMatch[1])) {
        // Just entered a link field, show ID completions
        const idItems = requirements.map(req => createCompletionItem(req, this.config));
        items.push(...idItems);
      }
    }

    return items.length > 0 ? items : null;
  }

  /**
   * Resolve additional details for a completion item
   */
  public resolveCompletionItem(
    item: vscode.CompletionItem,
    token: vscode.CancellationToken
  ): vscode.CompletionItem {
    // Item is already fully resolved in provideCompletionItems
    return item;
  }
}

/**
 * Register the completion provider
 */
export function registerCompletionProvider(
  context: vscode.ExtensionContext,
  indexBuilder: IndexBuilder,
  config: RigrConfig
): RequirementCompletionProvider {
  const provider = new RequirementCompletionProvider(indexBuilder, config);

  const triggerCharacters = getTriggerCharacters(config);

  const disposable = vscode.languages.registerCompletionItemProvider(
    { language: 'restructuredtext', scheme: 'file' },
    provider,
    ...triggerCharacters
  );

  context.subscriptions.push(disposable);

  return provider;
}
