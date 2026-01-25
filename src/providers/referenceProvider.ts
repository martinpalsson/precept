/**
 * Reference Provider - Find all references to a requirement
 */

import * as vscode from 'vscode';
import { IndexBuilder } from '../indexing/indexBuilder';
import { RigrConfig } from '../types';
import { findIdAtPosition } from '../indexing/rstParser';

/**
 * Reference provider for requirements
 */
export class RequirementReferenceProvider implements vscode.ReferenceProvider {
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
   * Provide reference locations
   */
  public provideReferences(
    document: vscode.TextDocument,
    position: vscode.Position,
    context: vscode.ReferenceContext,
    token: vscode.CancellationToken
  ): vscode.Location[] {
    const line = document.lineAt(position.line).text;

    // Find requirement ID at position
    const id = findIdAtPosition(line, position.character, this.config);

    if (!id) {
      return [];
    }

    // Get all references from index
    const references = this.indexBuilder.getReferences(id);

    // Convert to locations
    const locations: vscode.Location[] = [];

    for (const ref of references) {
      // Skip definition if not requested
      if (!context.includeDeclaration && ref.context === 'definition') {
        continue;
      }

      const uri = vscode.Uri.file(ref.location.file);
      const refPosition = new vscode.Position(ref.location.line - 1, 0);

      locations.push(new vscode.Location(uri, refPosition));
    }

    // Also search for references in linked requirements
    const req = this.indexBuilder.getRequirement(id);
    if (req) {
      // Find requirements that link to this one
      for (const otherReq of this.indexBuilder.getAllRequirements()) {
        for (const linkedIds of Object.values(otherReq.links)) {
          if (linkedIds.includes(id)) {
            const uri = vscode.Uri.file(otherReq.location.file);
            const refPosition = new vscode.Position(otherReq.location.line - 1, 0);

            // Avoid duplicates
            const exists = locations.some(
              loc => loc.uri.fsPath === uri.fsPath && loc.range.start.line === refPosition.line
            );
            if (!exists) {
              locations.push(new vscode.Location(uri, refPosition));
            }
          }
        }
      }
    }

    return locations;
  }
}

/**
 * Register the reference provider
 */
export function registerReferenceProvider(
  context: vscode.ExtensionContext,
  indexBuilder: IndexBuilder,
  config: RigrConfig
): RequirementReferenceProvider {
  const provider = new RequirementReferenceProvider(indexBuilder, config);

  const disposable = vscode.languages.registerReferenceProvider(
    { language: 'restructuredtext', scheme: 'file' },
    provider
  );

  context.subscriptions.push(disposable);

  return provider;
}
