/**
 * Deep Validation Command
 */

import * as vscode from 'vscode';
import { IndexBuilder } from '../indexing/indexBuilder';
import { RigrConfig, DeepValidationResult, DiagnosticType } from '../types';
import { performDeepValidation } from '../utils/graphAnalysis';
import { getStatusNames } from '../configuration/defaults';
import { runDeepValidation as runNewDeepValidation, exportReportAsText } from '../validation/deepValidationRunner';

/**
 * Run legacy deep validation (backward compatibility)
 */
export async function runDeepValidation(
  indexBuilder: IndexBuilder,
  config: RigrConfig
): Promise<DeepValidationResult> {
  const requirements = indexBuilder.getAllRequirements();
  const index = indexBuilder.getIndex();
  const statusOrder = getStatusNames(config);

  return performDeepValidation(requirements, index, statusOrder);
}

/**
 * Run comprehensive deep validation with new validation system
 */
export async function runComprehensiveDeepValidation(
  indexBuilder: IndexBuilder,
  config: RigrConfig
): Promise<void> {
  const outputChannel = vscode.window.createOutputChannel('Rigr Deep Validation');
  outputChannel.show();
  outputChannel.clear();
  
  outputChannel.appendLine('Running comprehensive deep validation...\n');
  
  const requirements = indexBuilder.getAllRequirements();
  
  if (requirements.length === 0) {
    outputChannel.appendLine('No requirements found. Make sure your RST files are indexed.');
    return;
  }
  
  outputChannel.appendLine(`Analyzing ${requirements.length} requirements...\n`);
  
  try {
    const report = await runNewDeepValidation(requirements, config);
    
    // Generate text report
    const textReport = exportReportAsText(report);
    outputChannel.appendLine(textReport);
    
    // Show detailed findings
    if (report.findings.length > 0) {
      outputChannel.appendLine('\n');
      outputChannel.appendLine('DETAILED FINDINGS');
      outputChannel.appendLine('───────────────────────────────────────────────────────────');
      
      // Group by severity
      const blockers = report.findings.filter(f => f.severity === 'BLOCKER');
      const high = report.findings.filter(f => f.severity === 'HIGH');
      const medium = report.findings.filter(f => f.severity === 'MEDIUM');
      const low = report.findings.filter(f => f.severity === 'LOW');
      
      if (blockers.length > 0) {
        outputChannel.appendLine('\n🔴 BLOCKER ISSUES:');
        blockers.forEach((f, i) => {
          outputChannel.appendLine(`${i + 1}. [${f.requirementId}] ${f.message}`);
          if (f.details) outputChannel.appendLine(`   ${f.details}`);
          if (f.recommendation) outputChannel.appendLine(`   → ${f.recommendation}`);
        });
      }
      
      if (high.length > 0) {
        outputChannel.appendLine('\n🟠 HIGH SEVERITY:');
        high.forEach((f, i) => {
          outputChannel.appendLine(`${i + 1}. [${f.requirementId}] ${f.message}`);
          if (f.recommendation) outputChannel.appendLine(`   → ${f.recommendation}`);
        });
      }
      
      if (medium.length > 0) {
        outputChannel.appendLine('\n🟡 MEDIUM SEVERITY:');
        medium.slice(0, 20).forEach((f, i) => {
          outputChannel.appendLine(`${i + 1}. [${f.requirementId}] ${f.message}`);
        });
        if (medium.length > 20) {
          outputChannel.appendLine(`   ... and ${medium.length - 20} more`);
        }
      }
      
      if (low.length > 0) {
        outputChannel.appendLine(`\n🔵 LOW SEVERITY: ${low.length} issues`);
      }
    }
    
    // Show success message
    const statusIcon = report.summary.blockerCount > 0 ? '❌' :
                       report.summary.highCount > 0 ? '⚠️' : '✅';
    
    vscode.window.showInformationMessage(
      `${statusIcon} Deep Validation Complete: ${report.summary.totalIssues} issues found ` +
      `(${report.summary.blockerCount} blocker, ${report.summary.highCount} high, ` +
      `${report.summary.mediumCount} medium, ${report.summary.lowCount} low)`
    );
    
  } catch (error) {
    outputChannel.appendLine(`\n❌ Error during validation: ${error}`);
    vscode.window.showErrorMessage(`Deep validation failed: ${error}`);
  }
}

/**
 * Show validation results in a panel
 */
async function showValidationResults(result: DeepValidationResult): Promise<void> {
  const panel = vscode.window.createWebviewPanel(
    'requirementsValidation',
    'Requirements Validation Report',
    vscode.ViewColumn.One,
    {}
  );

  const issueRows = result.issues.map(issue => {
    const severity = issue.severity === 'error' ? '🔴'
      : issue.severity === 'warning' ? '🟡'
        : '🔵';
    return `<tr>
      <td>${severity}</td>
      <td>${issue.type}</td>
      <td>${issue.message}</td>
      <td>${vscode.workspace.asRelativePath(issue.location.file)}:${issue.location.line}</td>
    </tr>`;
  }).join('');

  const circularDepsHtml = result.circularDeps.length > 0
    ? `<h3>Circular Dependencies (${result.circularDeps.length})</h3>
       <ul>${result.circularDeps.map(cycle => `<li>${cycle.join(' → ')}</li>`).join('')}</ul>`
    : '<p>No circular dependencies found.</p>';

  const orphanedHtml = result.orphanedReqs.length > 0
    ? `<h3>Orphaned Requirements (${result.orphanedReqs.length})</h3>
       <ul>${result.orphanedReqs.map(id => `<li>${id}</li>`).join('')}</ul>`
    : '<p>No orphaned requirements found.</p>';

  panel.webview.html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Validation Report</title>
      <style>
        body { font-family: var(--vscode-font-family); padding: 20px; }
        h1 { color: var(--vscode-editor-foreground); }
        h2, h3 { color: var(--vscode-editor-foreground); margin-top: 20px; }
        table { border-collapse: collapse; width: 100%; margin-top: 10px; }
        th, td { border: 1px solid var(--vscode-panel-border); padding: 8px; text-align: left; }
        th { background-color: var(--vscode-editor-background); }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .stat { background: var(--vscode-editor-background); padding: 15px; border-radius: 5px; }
        .stat-value { font-size: 24px; font-weight: bold; }
        .stat-label { color: var(--vscode-descriptionForeground); }
        ul { margin: 10px 0; padding-left: 20px; }
      </style>
    </head>
    <body>
      <h1>Requirements Validation Report</h1>

      <h2>Summary</h2>
      <div class="summary">
        <div class="stat">
          <div class="stat-value">${result.coverage.total}</div>
          <div class="stat-label">Total Requirements</div>
        </div>
        <div class="stat">
          <div class="stat-value">${result.coverage.percentage}%</div>
          <div class="stat-label">Coverage</div>
        </div>
        <div class="stat">
          <div class="stat-value">${result.issues.filter(i => i.severity === 'error').length}</div>
          <div class="stat-label">Errors</div>
        </div>
        <div class="stat">
          <div class="stat-value">${result.issues.filter(i => i.severity === 'warning').length}</div>
          <div class="stat-label">Warnings</div>
        </div>
      </div>

      <h2>Issues (${result.issues.length})</h2>
      ${result.issues.length > 0 ? `
        <table>
          <tr>
            <th>Severity</th>
            <th>Type</th>
            <th>Message</th>
            <th>Location</th>
          </tr>
          ${issueRows}
        </table>
      ` : '<p>No issues found.</p>'}

      ${circularDepsHtml}
      ${orphanedHtml}
    </body>
    </html>
  `;
}

/**
 * Register deep validation command (uses new comprehensive validation)
 */
export function registerValidationCommand(
  context: vscode.ExtensionContext,
  indexBuilder: IndexBuilder,
  config: RigrConfig
): vscode.Disposable {
  return vscode.commands.registerCommand('requirements.deepValidation', async () => {
    // Use the new comprehensive deep validation
    await runComprehensiveDeepValidation(indexBuilder, config);
  });
}
