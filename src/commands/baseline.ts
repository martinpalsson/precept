/**
 * Baseline Commands - Tag and manage requirement baselines
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { IndexBuilder } from '../indexing/indexBuilder';
import { RigrConfig, RequirementObject } from '../types';

const execAsync = promisify(exec);

/**
 * Add baseline tag to a requirement in file
 */
async function addBaselineToFile(
  filePath: string,
  reqId: string,
  baseline: string
): Promise<boolean> {
  try {
    let content = await fs.promises.readFile(filePath, 'utf-8');
    const lines = content.split('\n');

    // Find the requirement and add/update baseline
    let inReq = false;
    let reqIndent = 0;
    let foundId = false;
    let baselineAdded = false;
    let lastOptionLine = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check for directive start
      const directiveMatch = line.match(/^(\s*)\.\.\s+\w+::/);
      if (directiveMatch) {
        if (foundId && !baselineAdded) {
          // Add baseline after the last option of previous requirement
          const indent = ' '.repeat(reqIndent + 3);
          lines.splice(lastOptionLine + 1, 0, `${indent}:baseline: ${baseline}`);
          baselineAdded = true;
          break;
        }
        inReq = true;
        reqIndent = directiveMatch[1].length;
        foundId = false;
        lastOptionLine = i;
        continue;
      }

      if (inReq) {
        const currentIndent = line.match(/^(\s*)/)?.[1].length || 0;

        // Check if we've left the directive
        if (line.trim() && currentIndent <= reqIndent && !line.match(/^\s+:/)) {
          if (foundId && !baselineAdded) {
            // Add baseline after the last option
            const indent = ' '.repeat(reqIndent + 3);
            lines.splice(lastOptionLine + 1, 0, `${indent}:baseline: ${baseline}`);
            baselineAdded = true;
            break;
          }
          inReq = false;
          continue;
        }

        // Check for :id: option
        const idMatch = line.match(/:id:\s*(\S+)/);
        if (idMatch && idMatch[1] === reqId) {
          foundId = true;
          lastOptionLine = i;
        }

        // Track last option line
        if (line.match(/^\s+:\w+:/)) {
          lastOptionLine = i;

          // Check if baseline already exists
          const baselineMatch = line.match(/:baseline:\s*(.*)/);
          if (baselineMatch && foundId) {
            // Update existing baseline
            lines[i] = line.replace(/:baseline:\s*.*/, `:baseline: ${baseline}`);
            baselineAdded = true;
            break;
          }
        }
      }
    }

    if (!baselineAdded && foundId) {
      // Add at the end of options
      const indent = ' '.repeat(reqIndent + 3);
      lines.splice(lastOptionLine + 1, 0, `${indent}:baseline: ${baseline}`);
      baselineAdded = true;
    }

    if (baselineAdded) {
      await fs.promises.writeFile(filePath, lines.join('\n'), 'utf-8');
      return true;
    }

    return false;
  } catch (error) {
    console.error(`Error adding baseline to ${filePath}:`, error);
    return false;
  }
}

/**
 * Remove baseline tag from a requirement in file
 */
async function removeBaselineFromFile(
  filePath: string,
  reqId: string
): Promise<boolean> {
  try {
    let content = await fs.promises.readFile(filePath, 'utf-8');
    const lines = content.split('\n');

    let inReq = false;
    let foundId = false;
    let removed = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check for directive start
      if (line.match(/^\s*\.\.\s+\w+::/)) {
        inReq = true;
        foundId = false;
        continue;
      }

      if (inReq) {
        // Check for :id: option
        const idMatch = line.match(/:id:\s*(\S+)/);
        if (idMatch && idMatch[1] === reqId) {
          foundId = true;
        }

        // Remove baseline if this is the right requirement
        if (foundId && line.match(/^\s+:baseline:/)) {
          lines.splice(i, 1);
          removed = true;
          break;
        }

        // Check if we've left the directive
        if (line.trim() && !line.match(/^\s+:/)) {
          inReq = false;
          foundId = false;
        }
      }
    }

    if (removed) {
      await fs.promises.writeFile(filePath, lines.join('\n'), 'utf-8');
      return true;
    }

    return false;
  } catch (error) {
    console.error(`Error removing baseline from ${filePath}:`, error);
    return false;
  }
}

/**
 * Tag current baseline command
 */
export function registerTagBaselineCommand(
  context: vscode.ExtensionContext,
  indexBuilder: IndexBuilder,
  config: RigrConfig
): vscode.Disposable {
  return vscode.commands.registerCommand('requirements.tagBaseline', async () => {
    // Prompt for baseline name
    const baseline = await vscode.window.showInputBox({
      prompt: 'Enter baseline name (e.g., v1.0.0)',
      placeHolder: 'v1.0.0',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Baseline name is required';
        }
        if (!/^[a-zA-Z0-9._-]+$/.test(value)) {
          return 'Baseline name can only contain letters, numbers, dots, underscores, and hyphens';
        }
        return null;
      },
    });

    if (!baseline) {
      return;
    }

    // Ask which requirements to tag
    const options = [
      { label: 'All approved requirements', value: 'approved' },
      { label: 'All implemented requirements', value: 'implemented' },
      { label: 'All approved and implemented', value: 'approved,implemented' },
      { label: 'All requirements', value: 'all' },
    ];

    const selection = await vscode.window.showQuickPick(options, {
      placeHolder: 'Select which requirements to tag',
    });

    if (!selection) {
      return;
    }

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Tagging baseline ${baseline}...`,
        cancellable: false,
      },
      async (progress) => {
        let requirements = indexBuilder.getAllRequirements();

        // Filter by status if needed
        if (selection.value !== 'all') {
          const statuses = selection.value.split(',');
          requirements = requirements.filter(r => r.status && statuses.includes(r.status));
        }

        let tagged = 0;
        const total = requirements.length;

        // Group by file for efficient processing
        const byFile = new Map<string, RequirementObject[]>();
        for (const req of requirements) {
          if (!byFile.has(req.location.file)) {
            byFile.set(req.location.file, []);
          }
          byFile.get(req.location.file)!.push(req);
        }

        for (const [filePath, reqs] of byFile) {
          for (const req of reqs) {
            const success = await addBaselineToFile(filePath, req.id, baseline);
            if (success) {
              tagged++;
            }
            progress.report({
              message: `Tagged ${tagged}/${total} requirements`,
              increment: (1 / total) * 100,
            });
          }
        }

        vscode.window.showInformationMessage(
          `Tagged ${tagged} requirements with baseline '${baseline}'`
        );

        // Trigger re-index
        for (const filePath of byFile.keys()) {
          indexBuilder.scheduleFileUpdate(filePath);
        }
      }
    );
  });
}

/**
 * Remove baseline tags command
 */
export function registerRemoveBaselineCommand(
  context: vscode.ExtensionContext,
  indexBuilder: IndexBuilder,
  config: RigrConfig
): vscode.Disposable {
  return vscode.commands.registerCommand('requirements.removeBaselineTags', async () => {
    // Get available baselines
    const baselines = indexBuilder.getBaselines();

    if (baselines.length === 0) {
      vscode.window.showInformationMessage('No baseline tags found');
      return;
    }

    // Ask which baseline to remove
    const baseline = await vscode.window.showQuickPick(baselines, {
      placeHolder: 'Select baseline to remove',
    });

    if (!baseline) {
      return;
    }

    // Confirm
    const confirm = await vscode.window.showWarningMessage(
      `Remove baseline '${baseline}' from all requirements?`,
      'Yes',
      'No'
    );

    if (confirm !== 'Yes') {
      return;
    }

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Removing baseline ${baseline}...`,
        cancellable: false,
      },
      async (progress) => {
        const requirements = indexBuilder.getRequirementsByBaseline(baseline);
        let removed = 0;
        const total = requirements.length;

        // Group by file
        const byFile = new Map<string, RequirementObject[]>();
        for (const req of requirements) {
          if (!byFile.has(req.location.file)) {
            byFile.set(req.location.file, []);
          }
          byFile.get(req.location.file)!.push(req);
        }

        for (const [filePath, reqs] of byFile) {
          for (const req of reqs) {
            const success = await removeBaselineFromFile(filePath, req.id);
            if (success) {
              removed++;
            }
            progress.report({
              message: `Removed ${removed}/${total} tags`,
              increment: (1 / total) * 100,
            });
          }
        }

        vscode.window.showInformationMessage(
          `Removed baseline '${baseline}' from ${removed} requirements`
        );

        // Trigger re-index
        for (const filePath of byFile.keys()) {
          indexBuilder.scheduleFileUpdate(filePath);
        }
      }
    );
  });
}

/**
 * Create Git tag for baseline
 */
export function registerCreateGitTagCommand(
  context: vscode.ExtensionContext,
  indexBuilder: IndexBuilder,
  config: RigrConfig
): vscode.Disposable {
  return vscode.commands.registerCommand('requirements.createGitTag', async () => {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
      vscode.window.showErrorMessage('No workspace folder open');
      return;
    }

    // Get available baselines
    const baselines = indexBuilder.getBaselines();

    if (baselines.length === 0) {
      vscode.window.showInformationMessage('No baseline tags found. Tag requirements first.');
      return;
    }

    // Ask which baseline to create tag for
    const baseline = await vscode.window.showQuickPick(baselines, {
      placeHolder: 'Select baseline for Git tag',
    });

    if (!baseline) {
      return;
    }

    const requirements = indexBuilder.getRequirementsByBaseline(baseline);
    const tagName = `req-${baseline}`;

    // Build tag message
    const byType = new Map<string, number>();
    const byStatus = new Map<string, number>();

    for (const req of requirements) {
      byType.set(req.type, (byType.get(req.type) || 0) + 1);
      if (req.status) {
        byStatus.set(req.status, (byStatus.get(req.status) || 0) + 1);
      }
    }

    const typesSummary = Array.from(byType.entries())
      .map(([type, count]) => `${type}: ${count}`)
      .join(', ');

    const statusSummary = Array.from(byStatus.entries())
      .map(([status, count]) => `${status}: ${count}`)
      .join(', ');

    const tagMessage = `Requirements Baseline ${baseline}

Total requirements: ${requirements.length}
By type: ${typesSummary}
By status: ${statusSummary}

Generated by Rigr Requirements Extension`;

    try {
      // Check if git is available
      await execAsync('git --version', { cwd: workspaceRoot });

      // Check if there are uncommitted changes
      const { stdout: statusOutput } = await execAsync('git status --porcelain', { cwd: workspaceRoot });
      if (statusOutput.trim()) {
        const proceed = await vscode.window.showWarningMessage(
          'There are uncommitted changes. Create tag anyway?',
          'Yes',
          'No'
        );
        if (proceed !== 'Yes') {
          return;
        }
      }

      // Create annotated tag
      await execAsync(
        `git tag -a "${tagName}" -m "${tagMessage.replace(/"/g, '\\"')}"`,
        { cwd: workspaceRoot }
      );

      vscode.window.showInformationMessage(
        `Created Git tag '${tagName}' with ${requirements.length} requirements`
      );
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to create Git tag: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  });
}

/**
 * Register all baseline commands
 */
export function registerBaselineCommands(
  context: vscode.ExtensionContext,
  indexBuilder: IndexBuilder,
  config: RigrConfig
): void {
  context.subscriptions.push(
    registerTagBaselineCommand(context, indexBuilder, config),
    registerRemoveBaselineCommand(context, indexBuilder, config),
    registerCreateGitTagCommand(context, indexBuilder, config)
  );
}
