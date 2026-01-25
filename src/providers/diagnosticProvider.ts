/**
 * Diagnostic Provider - Validation and error reporting
 */

import * as vscode from 'vscode';
import { IndexBuilder } from '../indexing/indexBuilder';
import { RigrConfig, DiagnosticType, ValidationIssue } from '../types';
import { parseRstFile, getIdsInLine } from '../indexing/rstParser';
import { getStatusNames, getObjectTypeValues, getLinkOptionNames } from '../configuration/defaults';
import { getValidationDebounceMs, isAutoValidationEnabled, isValidateOnSaveEnabled } from '../configuration/settingsManager';
import * as fs from 'fs';

/**
 * Diagnostic collection name
 */
const DIAGNOSTIC_COLLECTION_NAME = 'requirements';

/**
 * Map diagnostic type to VS Code severity
 */
function getSeverity(type: DiagnosticType): vscode.DiagnosticSeverity {
  switch (type) {
    case DiagnosticType.BrokenLink:
    case DiagnosticType.DuplicateId:
    case DiagnosticType.InvalidStatus:
    case DiagnosticType.InvalidType:
      return vscode.DiagnosticSeverity.Error;
    case DiagnosticType.CircularDep:
    case DiagnosticType.StatusInconsistent:
      return vscode.DiagnosticSeverity.Warning;
    case DiagnosticType.OrphanedReq:
    case DiagnosticType.MissingCoverage:
      return vscode.DiagnosticSeverity.Information;
    default:
      return vscode.DiagnosticSeverity.Information;
  }
}

/**
 * Create a VS Code diagnostic from a validation issue
 */
function createDiagnostic(issue: ValidationIssue): vscode.Diagnostic {
  const range = new vscode.Range(
    issue.location.line - 1,
    0,
    issue.location.endLine ? issue.location.endLine - 1 : issue.location.line - 1,
    1000
  );

  const diagnostic = new vscode.Diagnostic(
    range,
    issue.message,
    getSeverity(issue.type)
  );

  diagnostic.source = 'Requirements';
  diagnostic.code = issue.type;

  if (issue.relatedIds && issue.relatedIds.length > 0) {
    diagnostic.relatedInformation = issue.relatedIds.map(id => {
      return new vscode.DiagnosticRelatedInformation(
        new vscode.Location(vscode.Uri.file(issue.location.file), range),
        `Related to: ${id}`
      );
    });
  }

  return diagnostic;
}

/**
 * Validate a single file
 */
export function validateFile(
  filePath: string,
  content: string,
  indexBuilder: IndexBuilder,
  config: RigrConfig
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const validStatuses = new Set(getStatusNames(config));
  const validObjectTypes = new Set(getObjectTypeValues(config));
  const linkOptions = new Set(getLinkOptionNames(config));

  // Parse the file
  const parsed = parseRstFile(content, filePath, config);

  // Track IDs in this file for duplicate detection
  const idsInFile = new Map<string, number[]>();

  for (const req of parsed.requirements) {
    // Track ID occurrences
    if (!idsInFile.has(req.id)) {
      idsInFile.set(req.id, []);
    }
    idsInFile.get(req.id)!.push(req.location.line);

    // Check for invalid object type
    if (!validObjectTypes.has(req.type)) {
      issues.push({
        type: DiagnosticType.InvalidType,
        message: `Unknown object type '${req.type}'. Valid types: ${Array.from(validObjectTypes).join(', ')}`,
        location: req.location,
        severity: 'error',
      });
    }

    // Check for invalid status
    if (req.status && !validStatuses.has(req.status)) {
      issues.push({
        type: DiagnosticType.InvalidStatus,
        message: `Unknown status '${req.status}'. Valid statuses: ${Array.from(validStatuses).join(', ')}`,
        location: req.location,
        severity: 'error',
      });
    }

    // Check for broken links
    for (const [linkType, linkedIds] of Object.entries(req.links)) {
      for (const linkedId of linkedIds) {
        if (!indexBuilder.hasRequirement(linkedId)) {
          issues.push({
            type: DiagnosticType.BrokenLink,
            message: `Broken link: '${linkedId}' does not exist`,
            location: req.location,
            relatedIds: [linkedId],
            severity: 'error',
          });
        }
      }
    }
  }

  // Check for duplicate IDs
  for (const [id, lines] of idsInFile) {
    if (lines.length > 1) {
      for (const line of lines) {
        issues.push({
          type: DiagnosticType.DuplicateId,
          message: `Duplicate ID '${id}' also defined at lines: ${lines.filter(l => l !== line).join(', ')}`,
          location: { file: filePath, line },
          severity: 'error',
        });
      }
    }

    // Also check against other files
    const existingReq = indexBuilder.getRequirement(id);
    if (existingReq && existingReq.location.file !== filePath) {
      for (const line of lines) {
        issues.push({
          type: DiagnosticType.DuplicateId,
          message: `Duplicate ID '${id}' already defined in ${vscode.workspace.asRelativePath(existingReq.location.file)}:${existingReq.location.line}`,
          location: { file: filePath, line },
          severity: 'error',
        });
      }
    }
  }

  // Add parse errors
  for (const error of parsed.parseErrors) {
    issues.push({
      type: DiagnosticType.InvalidType,
      message: error.message,
      location: { file: filePath, line: error.line },
      severity: 'error',
    });
  }

  return issues;
}

/**
 * Diagnostic provider class
 */
export class RequirementDiagnosticProvider {
  private diagnosticCollection: vscode.DiagnosticCollection;
  private indexBuilder: IndexBuilder;
  private config: RigrConfig;
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private disposables: vscode.Disposable[] = [];

  constructor(indexBuilder: IndexBuilder, config: RigrConfig) {
    this.indexBuilder = indexBuilder;
    this.config = config;
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection(DIAGNOSTIC_COLLECTION_NAME);
  }

  /**
   * Update configuration
   */
  public updateConfig(config: RigrConfig): void {
    this.config = config;
  }

  /**
   * Set up document change listeners
   */
  public setupListeners(): void {
    // Validate on document change (debounced)
    this.disposables.push(
      vscode.workspace.onDidChangeTextDocument((e) => {
        if (e.document.languageId === 'restructuredtext' && isAutoValidationEnabled()) {
          this.scheduleValidation(e.document);
        }
      })
    );

    // Validate on save
    this.disposables.push(
      vscode.workspace.onDidSaveTextDocument((document) => {
        if (document.languageId === 'restructuredtext' && isValidateOnSaveEnabled()) {
          this.validateDocument(document);
        }
      })
    );

    // Clear diagnostics when document is closed
    this.disposables.push(
      vscode.workspace.onDidCloseTextDocument((document) => {
        this.diagnosticCollection.delete(document.uri);
      })
    );

    // Re-validate on index update
    this.disposables.push(
      this.indexBuilder.onIndexUpdate(() => {
        this.revalidateAll();
      })
    );
  }

  /**
   * Schedule a debounced validation
   */
  private scheduleValidation(document: vscode.TextDocument): void {
    const key = document.uri.toString();

    // Clear existing timer
    const existingTimer = this.debounceTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(() => {
      this.debounceTimers.delete(key);
      this.validateDocument(document);
    }, getValidationDebounceMs());

    this.debounceTimers.set(key, timer);
  }

  /**
   * Validate a document
   */
  public validateDocument(document: vscode.TextDocument): void {
    if (document.languageId !== 'restructuredtext') {
      return;
    }

    const content = document.getText();
    const issues = validateFile(
      document.uri.fsPath,
      content,
      this.indexBuilder,
      this.config
    );

    const diagnostics = issues.map(issue => createDiagnostic(issue));
    this.diagnosticCollection.set(document.uri, diagnostics);
  }

  /**
   * Validate a file by path
   */
  public async validateFilePath(filePath: string): Promise<ValidationIssue[]> {
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      return validateFile(filePath, content, this.indexBuilder, this.config);
    } catch (error) {
      console.error(`Error validating ${filePath}:`, error);
      return [];
    }
  }

  /**
   * Re-validate all open documents
   */
  public revalidateAll(): void {
    for (const document of vscode.workspace.textDocuments) {
      if (document.languageId === 'restructuredtext') {
        this.validateDocument(document);
      }
    }
  }

  /**
   * Clear all diagnostics
   */
  public clearAll(): void {
    this.diagnosticCollection.clear();
  }

  /**
   * Get diagnostic collection
   */
  public getDiagnosticCollection(): vscode.DiagnosticCollection {
    return this.diagnosticCollection;
  }

  /**
   * Dispose resources
   */
  public dispose(): void {
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
    this.diagnosticCollection.dispose();
  }
}

/**
 * Register the diagnostic provider
 */
export function registerDiagnosticProvider(
  context: vscode.ExtensionContext,
  indexBuilder: IndexBuilder,
  config: RigrConfig
): RequirementDiagnosticProvider {
  const provider = new RequirementDiagnosticProvider(indexBuilder, config);
  provider.setupListeners();

  context.subscriptions.push(provider);

  return provider;
}
