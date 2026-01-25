/**
 * Definition Provider - Go to requirement definition
 */

import * as vscode from 'vscode';
import { IndexBuilder } from '../indexing/indexBuilder';
import { RigrConfig } from '../types';
import { findIdAtPosition } from '../indexing/rstParser';

/**
 * Definition provider for requirements
 */
export class RequirementDefinitionProvider implements vscode.DefinitionProvider {
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
   * Provide definition location
   */
  public provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): vscode.Location | null {
    const line = document.lineAt(position.line).text;

    // Find requirement ID at position
    const id = findIdAtPosition(line, position.character, this.config);

    if (!id) {
      return null;
    }

    // Look up requirement in index
    const req = this.indexBuilder.getRequirement(id);

    if (!req) {
      return null;
    }

    // Return location of definition
    const uri = vscode.Uri.file(req.location.file);
    const definitionPosition = new vscode.Position(req.location.line - 1, 0);

    return new vscode.Location(uri, definitionPosition);
  }
}

/**
 * Register the definition provider
 */
export function registerDefinitionProvider(
  context: vscode.ExtensionContext,
  indexBuilder: IndexBuilder,
  config: RigrConfig
): RequirementDefinitionProvider {
  const provider = new RequirementDefinitionProvider(indexBuilder, config);

  const disposable = vscode.languages.registerDefinitionProvider(
    { language: 'restructuredtext', scheme: 'file' },
    provider
  );

  context.subscriptions.push(disposable);

  return provider;
}
