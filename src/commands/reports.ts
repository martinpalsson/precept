/**
 * Release Report Generation Command
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { IndexBuilder } from '../indexing/indexBuilder';
import { RigrConfig, RequirementObject, ReleaseReport } from '../types';
import { calculateTraceabilityMatrix, calculateCoverage } from '../utils/graphAnalysis';

/**
 * Generate release report data
 */
function generateReportData(
  baseline: string,
  requirements: RequirementObject[],
  config: RigrConfig,
  previousBaseline?: string,
  previousRequirements?: RequirementObject[]
): ReleaseReport {
  // Calculate summary
  const byStatus: Record<string, number> = {};
  const byType: Record<string, number> = {};

  for (const req of requirements) {
    if (req.status) {
      byStatus[req.status] = (byStatus[req.status] || 0) + 1;
    }
    byType[req.type] = (byType[req.type] || 0) + 1;
  }

  const report: ReleaseReport = {
    baseline,
    generatedAt: new Date(),
    summary: {
      total: requirements.length,
      byStatus,
      byType,
    },
    coverage: {
      matrix: {},
    },
  };

  // If we have previous baseline, calculate changes
  if (previousBaseline && previousRequirements) {
    const previousIds = new Set(previousRequirements.map(r => r.id));
    const currentIds = new Set(requirements.map(r => r.id));

    // New requirements
    report.newRequirements = requirements
      .filter(r => !previousIds.has(r.id))
      .map(r => r.id);

    // Removed requirements
    report.removedRequirements = previousRequirements
      .filter(r => !currentIds.has(r.id))
      .map(r => r.id);

    // Modified requirements
    const previousMap = new Map(previousRequirements.map(r => [r.id, r]));
    report.modifiedRequirements = [];

    for (const req of requirements) {
      const prev = previousMap.get(req.id);
      if (prev) {
        const changes: string[] = [];

        if (prev.status !== req.status) {
          changes.push(`Status: ${prev.status || 'unset'} → ${req.status || 'unset'}`);
        }
        if (prev.title !== req.title) {
          changes.push('Title changed');
        }
        if (prev.description !== req.description) {
          changes.push('Description changed');
        }

        // Check links
        const prevLinks = new Set(Object.values(prev.links).flat());
        const currLinks = new Set(Object.values(req.links).flat());

        const addedLinks = Array.from(currLinks).filter(l => !prevLinks.has(l));
        const removedLinks = Array.from(prevLinks).filter(l => !currLinks.has(l));

        if (addedLinks.length > 0) {
          changes.push(`Added links: ${addedLinks.join(', ')}`);
        }
        if (removedLinks.length > 0) {
          changes.push(`Removed links: ${removedLinks.join(', ')}`);
        }

        if (changes.length > 0) {
          report.modifiedRequirements.push({ id: req.id, changes });
        }
      }
    }
  }

  // Calculate traceability coverage
  // Build level hierarchy from config levels
  const levelHierarchy: string[][] = [];
  const levels = config.levels.map(l => l.level);

  // Common hierarchies: stakeholder->system->component->software
  const commonHierarchy = ['stakeholder', 'system', 'component', 'software', 'hardware'];
  for (let i = 0; i < commonHierarchy.length - 1; i++) {
    if (levels.includes(commonHierarchy[i]) && levels.includes(commonHierarchy[i + 1])) {
      levelHierarchy.push([commonHierarchy[i], commonHierarchy[i + 1]]);
    }
  }

  if (levelHierarchy.length > 0) {
    report.coverage.matrix = calculateTraceabilityMatrix(requirements, levelHierarchy);
  }

  return report;
}

/**
 * Format report as Markdown
 */
function formatReportMarkdown(report: ReleaseReport): string {
  const lines: string[] = [
    `# Requirements Release Report: ${report.baseline}`,
    `Generated: ${report.generatedAt.toISOString().split('T')[0]}`,
    '',
    '## Summary',
    `- **Total requirements:** ${report.summary.total}`,
    '',
    '### By Status',
  ];

  for (const [status, count] of Object.entries(report.summary.byStatus).sort()) {
    lines.push(`- ${status}: ${count}`);
  }

  lines.push('', '### By Type');

  for (const [type, count] of Object.entries(report.summary.byType).sort()) {
    lines.push(`- ${type}: ${count}`);
  }

  // New requirements
  if (report.newRequirements && report.newRequirements.length > 0) {
    lines.push('', '## New Requirements', '');
    for (const id of report.newRequirements) {
      lines.push(`- ${id}`);
    }
  }

  // Modified requirements
  if (report.modifiedRequirements && report.modifiedRequirements.length > 0) {
    lines.push('', '## Modified Requirements', '');
    for (const { id, changes } of report.modifiedRequirements) {
      lines.push(`### ${id}`);
      for (const change of changes) {
        lines.push(`- ${change}`);
      }
      lines.push('');
    }
  }

  // Removed requirements
  if (report.removedRequirements && report.removedRequirements.length > 0) {
    lines.push('', '## Removed Requirements', '');
    for (const id of report.removedRequirements) {
      lines.push(`- ${id}`);
    }
  }

  // Traceability coverage
  if (Object.keys(report.coverage.matrix).length > 0) {
    lines.push('', '## Traceability Coverage', '');

    for (const [sourceType, targets] of Object.entries(report.coverage.matrix)) {
      for (const [targetType, data] of Object.entries(targets)) {
        const percentage = data.total > 0
          ? Math.round((data.covered / data.total) * 100)
          : 0;
        lines.push(`- ${sourceType} → ${targetType}: ${percentage}% (${data.covered}/${data.total})`);
      }
    }
  }

  lines.push('', '---', '*Generated by Rigr Requirements Extension*');

  return lines.join('\n');
}

/**
 * Register generate report command
 */
export function registerGenerateReportCommand(
  context: vscode.ExtensionContext,
  indexBuilder: IndexBuilder,
  config: RigrConfig
): vscode.Disposable {
  return vscode.commands.registerCommand('requirements.generateReport', async () => {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
      vscode.window.showErrorMessage('No workspace folder open');
      return;
    }

    // Get available baselines
    const baselines = indexBuilder.getBaselines();

    if (baselines.length === 0) {
      // Generate report for all requirements if no baselines
      const allReqs = indexBuilder.getAllRequirements();
      if (allReqs.length === 0) {
        vscode.window.showInformationMessage('No requirements found');
        return;
      }

      const report = generateReportData('current', allReqs, config);
      const markdown = formatReportMarkdown(report);

      // Show in new document
      const doc = await vscode.workspace.openTextDocument({
        content: markdown,
        language: 'markdown',
      });
      await vscode.window.showTextDocument(doc);
      return;
    }

    // Ask which baseline to generate report for
    const baseline = await vscode.window.showQuickPick(baselines, {
      placeHolder: 'Select baseline for report',
    });

    if (!baseline) {
      return;
    }

    // Ask for comparison baseline
    const otherBaselines = baselines.filter(b => b !== baseline);
    let previousBaseline: string | undefined;
    let previousRequirements: RequirementObject[] | undefined;

    if (otherBaselines.length > 0) {
      const compareWith = await vscode.window.showQuickPick(
        ['None (new report)', ...otherBaselines],
        { placeHolder: 'Compare with previous baseline? (optional)' }
      );

      if (compareWith && compareWith !== 'None (new report)') {
        previousBaseline = compareWith;
        previousRequirements = indexBuilder.getRequirementsByBaseline(previousBaseline);
      }
    }

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Generating release report...',
        cancellable: false,
      },
      async (progress) => {
        progress.report({ message: 'Collecting data...' });

        const requirements = indexBuilder.getRequirementsByBaseline(baseline);
        const report = generateReportData(
          baseline,
          requirements,
          config,
          previousBaseline,
          previousRequirements
        );

        progress.report({ message: 'Formatting report...' });

        const markdown = formatReportMarkdown(report);

        // Ask where to save
        const saveOptions = [
          { label: 'Open in editor', value: 'editor' },
          { label: 'Save to file', value: 'file' },
        ];

        const saveOption = await vscode.window.showQuickPick(saveOptions, {
          placeHolder: 'How do you want to view the report?',
        });

        if (!saveOption) {
          return;
        }

        if (saveOption.value === 'file') {
          // Save to docs/releases/
          const releasesDir = path.join(workspaceRoot, 'docs', 'releases');
          const fileName = `release-${baseline}.md`;
          const filePath = path.join(releasesDir, fileName);

          try {
            await fs.promises.mkdir(releasesDir, { recursive: true });
            await fs.promises.writeFile(filePath, markdown, 'utf-8');

            const doc = await vscode.workspace.openTextDocument(filePath);
            await vscode.window.showTextDocument(doc);

            vscode.window.showInformationMessage(
              `Report saved to ${vscode.workspace.asRelativePath(filePath)}`
            );
          } catch (error) {
            vscode.window.showErrorMessage(
              `Failed to save report: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        } else {
          // Open in new editor
          const doc = await vscode.workspace.openTextDocument({
            content: markdown,
            language: 'markdown',
          });
          await vscode.window.showTextDocument(doc);
        }
      }
    );
  });
}
