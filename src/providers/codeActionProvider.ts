/**
 * Code Action Provider - Quick fixes for validation issues
 */

import * as vscode from 'vscode';
import { IndexBuilder } from '../indexing/indexBuilder';
import { RigrConfig, DiagnosticType } from '../types';
import { getStatusNames } from '../configuration/defaults';
import { generateNextId } from '../utils/idGenerator';

/**
 * Code action provider for requirements
 */
export class RequirementCodeActionProvider implements vscode.CodeActionProvider {
  private indexBuilder: IndexBuilder;
  private config: RigrConfig;

  public static readonly providedCodeActionKinds = [
    vscode.CodeActionKind.QuickFix,
  ];

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
   * Provide code actions
   */
  public provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
    token: vscode.CancellationToken
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    for (const diagnostic of context.diagnostics) {
      if (diagnostic.source !== 'Requirements') {
        continue;
      }

      const diagnosticType = diagnostic.code as DiagnosticType;

      switch (diagnosticType) {
        case DiagnosticType.BrokenLink:
          actions.push(...this.createBrokenLinkActions(document, diagnostic));
          break;
        case DiagnosticType.DuplicateId:
          actions.push(...this.createDuplicateIdActions(document, diagnostic));
          break;
        case DiagnosticType.InvalidStatus:
          actions.push(...this.createInvalidStatusActions(document, diagnostic));
          break;
      }
    }

    return actions;
  }

  /**
   * Create actions for broken link
   */
  private createBrokenLinkActions(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];
    const line = document.lineAt(diagnostic.range.start.line).text;

    // Extract the broken ID from the message
    const idMatch = diagnostic.message.match(/Broken link: '([^']+)'/);
    if (!idMatch) {
      return actions;
    }

    const brokenId = idMatch[1];

    // Action: Remove the broken link
    const removeAction = new vscode.CodeAction(
      `Remove link to '${brokenId}'`,
      vscode.CodeActionKind.QuickFix
    );

    const edit = new vscode.WorkspaceEdit();

    // Find and remove the ID from the line
    const idRegex = new RegExp(`\\b${brokenId}\\b,?\\s*|,?\\s*\\b${brokenId}\\b`);
    const newLine = line.replace(idRegex, '').replace(/,\s*,/g, ',').replace(/:\s*,/g, ':').replace(/,\s*$/g, '');

    edit.replace(
      document.uri,
      new vscode.Range(diagnostic.range.start.line, 0, diagnostic.range.start.line, line.length),
      newLine
    );

    removeAction.edit = edit;
    removeAction.diagnostics = [diagnostic];
    removeAction.isPreferred = false;
    actions.push(removeAction);

    // Action: Create the missing requirement (opens a new file location)
    const createAction = new vscode.CodeAction(
      `Create requirement '${brokenId}'`,
      vscode.CodeActionKind.QuickFix
    );

    createAction.command = {
      command: 'requirements.createRequirement',
      title: 'Create Requirement',
      arguments: [brokenId],
    };
    createAction.diagnostics = [diagnostic];
    actions.push(createAction);

    return actions;
  }

  /**
   * Create actions for duplicate ID
   */
  private createDuplicateIdActions(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];
    const line = document.lineAt(diagnostic.range.start.line).text;

    // Extract the duplicate ID from the message
    const idMatch = diagnostic.message.match(/Duplicate ID '([^']+)'/);
    if (!idMatch) {
      return actions;
    }

    const duplicateId = idMatch[1];

    // Generate a new unique ID using the config
    const newId = generateNextId(this.config.idConfig, this.indexBuilder.getAllRequirements());

    // Action: Rename to new ID
    const renameAction = new vscode.CodeAction(
      `Rename to '${newId}'`,
      vscode.CodeActionKind.QuickFix
    );

    const edit = new vscode.WorkspaceEdit();

    // Replace the ID in the :id: line
    const idLineRegex = new RegExp(`:id:\\s*${duplicateId}\\b`);
    const newLine = line.replace(idLineRegex, `:id: ${newId}`);

    edit.replace(
      document.uri,
      new vscode.Range(diagnostic.range.start.line, 0, diagnostic.range.start.line, line.length),
      newLine
    );

    renameAction.edit = edit;
    renameAction.diagnostics = [diagnostic];
    renameAction.isPreferred = true;
    actions.push(renameAction);

    return actions;
  }

  /**
   * Create actions for invalid status
   */
  private createInvalidStatusActions(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];
    const line = document.lineAt(diagnostic.range.start.line).text;

    // Extract the invalid status from the message
    const statusMatch = diagnostic.message.match(/Unknown status '([^']+)'/);
    if (!statusMatch) {
      return actions;
    }

    const invalidStatus = statusMatch[1];
    const validStatuses = getStatusNames(this.config);

    // Create an action for each valid status
    for (const status of validStatuses) {
      const action = new vscode.CodeAction(
        `Change to '${status}'`,
        vscode.CodeActionKind.QuickFix
      );

      const edit = new vscode.WorkspaceEdit();

      // Replace the status in the :status: line
      const statusLineRegex = new RegExp(`:status:\\s*${invalidStatus}\\b`);
      const newLine = line.replace(statusLineRegex, `:status: ${status}`);

      edit.replace(
        document.uri,
        new vscode.Range(diagnostic.range.start.line, 0, diagnostic.range.start.line, line.length),
        newLine
      );

      action.edit = edit;
      action.diagnostics = [diagnostic];

      // Make "draft" the preferred fix
      if (status === 'draft') {
        action.isPreferred = true;
      }

      actions.push(action);
    }

    return actions;
  }
}

/**
 * Register the code action provider
 */
export function registerCodeActionProvider(
  context: vscode.ExtensionContext,
  indexBuilder: IndexBuilder,
  config: RigrConfig
): RequirementCodeActionProvider {
  const provider = new RequirementCodeActionProvider(indexBuilder, config);

  const disposable = vscode.languages.registerCodeActionsProvider(
    { language: 'restructuredtext', scheme: 'file' },
    provider,
    {
      providedCodeActionKinds: RequirementCodeActionProvider.providedCodeActionKinds,
    }
  );

  context.subscriptions.push(disposable);

  return provider;
}
