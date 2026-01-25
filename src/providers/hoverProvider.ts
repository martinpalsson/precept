/**
 * Hover Provider - Show requirement details on hover
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { IndexBuilder } from '../indexing/indexBuilder';
import { RigrConfig, RequirementObject } from '../types';
import { findIdAtPosition } from '../indexing/rstParser';
import { getObjectTypeInfo, getLevelInfo } from '../configuration/defaults';

/**
 * Format requirement for hover display
 */
function formatRequirementHover(
  req: RequirementObject,
  config: RigrConfig
): vscode.MarkdownString {
  const typeInfo = getObjectTypeInfo(config, req.type);
  const typeName = typeInfo?.title || req.type;
  const levelInfo = req.level ? getLevelInfo(config, req.level) : undefined;
  const levelName = levelInfo?.title || req.level;

  const lines: string[] = [
    '---',
    `### ${req.id} - ${typeName}`,
    '---',
  ];

  if (req.level) {
    lines.push(`**Level:** ${levelName}`);
  }

  if (req.status) {
    const statusEmoji = getStatusEmoji(req.status);
    lines.push(`**Status:** ${statusEmoji} ${req.status}`);
  }

  if (req.baseline) {
    lines.push(`**Baseline:** ${req.baseline}`);
  }

  lines.push('');
  lines.push(`**${req.title}**`);

  if (req.description) {
    lines.push('');
    // Limit description length for hover
    const desc = req.description.length > 500
      ? req.description.substring(0, 500) + '...'
      : req.description;
    lines.push(desc);
  }

  // Links section
  if (Object.keys(req.links).length > 0) {
    lines.push('');
    lines.push('**Links:**');
    for (const [linkType, ids] of Object.entries(req.links)) {
      lines.push(`  - *${linkType}:* ${ids.join(', ')}`);
    }
  }

  // Metadata section
  if (Object.keys(req.metadata).length > 0) {
    lines.push('');
    lines.push('**Metadata:**');
    for (const [key, value] of Object.entries(req.metadata)) {
      lines.push(`  - *${key}:* ${value}`);
    }
  }

  // Location
  lines.push('');
  const relativePath = vscode.workspace.asRelativePath(req.location.file);
  lines.push(`*Defined in:* [${relativePath}:${req.location.line}](${vscode.Uri.file(req.location.file)}#L${req.location.line})`);
  lines.push('---');

  const markdown = new vscode.MarkdownString(lines.join('\n'));
  markdown.isTrusted = true;
  markdown.supportHtml = true;

  return markdown;
}

/**
 * Get emoji for status
 */
function getStatusEmoji(status: string): string {
  const statusEmojis: Record<string, string> = {
    'draft': '📝',
    'review': '🔄',
    'approved': '✅',
    'implemented': '🎯',
    'deprecated': '⚠️',
    'rejected': '❌',
  };
  return statusEmojis[status.toLowerCase()] || '📋';
}

/**
 * Hover provider for requirements
 */
export class RequirementHoverProvider implements vscode.HoverProvider {
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
   * Provide hover information
   */
  public provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): vscode.Hover | null {
    const line = document.lineAt(position.line).text;

    // Find requirement ID at position
    const id = findIdAtPosition(line, position.character, this.config);

    if (!id) {
      return null;
    }

    // Look up requirement in index
    const req = this.indexBuilder.getRequirement(id);

    if (!req) {
      // Show "not found" hover for broken links
      const markdown = new vscode.MarkdownString(
        `⚠️ **${id}** - Requirement not found\n\n` +
        `This requirement ID does not exist in the index.`
      );
      return new vscode.Hover(markdown);
    }

    // Format and return hover
    const hoverContent = formatRequirementHover(req, this.config);

    // Calculate hover range
    const idIndex = line.indexOf(id, Math.max(0, position.character - id.length));
    const range = new vscode.Range(
      position.line,
      idIndex,
      position.line,
      idIndex + id.length
    );

    return new vscode.Hover(hoverContent, range);
  }
}

/**
 * Register the hover provider
 */
export function registerHoverProvider(
  context: vscode.ExtensionContext,
  indexBuilder: IndexBuilder,
  config: RigrConfig
): RequirementHoverProvider {
  const provider = new RequirementHoverProvider(indexBuilder, config);

  const disposable = vscode.languages.registerHoverProvider(
    { language: 'restructuredtext', scheme: 'file' },
    provider
  );

  context.subscriptions.push(disposable);

  return provider;
}
