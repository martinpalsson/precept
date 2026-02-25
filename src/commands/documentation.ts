/**
 * Documentation Build Command
 *
 * Builds documentation using the built-in TypeScript renderer.
 * Built-in static HTML documentation builder.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { findPreceptJsonPath, loadConfigFromJson } from '../configuration/configLoader';
import { buildStaticSite } from '../build/staticBuilder';
import { DEFAULT_CONFIG } from '../configuration/defaults';
import { IndexBuilder } from '../indexing';

/** Output channel for build logs */
let outputChannel: vscode.OutputChannel | null = null;

/**
 * Get or create the output channel for documentation builds
 */
function getOutputChannel(): vscode.OutputChannel {
  if (!outputChannel) {
    outputChannel = vscode.window.createOutputChannel('Precept Documentation');
  }
  return outputChannel;
}

/**
 * Build documentation using the built-in renderer
 */
export async function buildDocumentation(workspaceRoot: string, indexBuilder?: IndexBuilder): Promise<boolean> {
  const channel = getOutputChannel();
  channel.clear();
  channel.show();

  channel.appendLine('Precept: Building Documentation');
  channel.appendLine('='.repeat(50));
  channel.appendLine('');

  // Find precept.json
  const jsonPath = await findPreceptJsonPath(workspaceRoot);
  channel.appendLine(jsonPath
    ? `Configuration: ${jsonPath}`
    : 'Configuration: using defaults (no precept.json found)');
  channel.appendLine('');

  // Find index.rst entry point
  const possibleEntryPoints = [
    jsonPath ? path.join(path.dirname(jsonPath), 'index.rst') : null,
    path.join(workspaceRoot, 'docs', 'index.rst'),
    path.join(workspaceRoot, 'doc', 'index.rst'),
    path.join(workspaceRoot, 'index.rst'),
  ].filter(Boolean) as string[];

  let entryPoint: string | null = null;
  for (const ep of possibleEntryPoints) {
    if (fs.existsSync(ep)) {
      entryPoint = ep;
      break;
    }
  }

  if (!entryPoint) {
    const error = 'No index.rst found. Please create an index.rst file or run "Precept: New RMS Project".';
    channel.appendLine(`Error: ${error}`);
    vscode.window.showErrorMessage(error);
    return false;
  }

  channel.appendLine(`Entry point: ${entryPoint}`);
  channel.appendLine('');

  // Load config
  let config = DEFAULT_CONFIG;
  let theme = 'default';
  if (jsonPath) {
    try {
      const result = await loadConfigFromJson(jsonPath);
      if (result.success && result.config) {
        config = result.config;
        theme = result.theme || 'default';
      }
    } catch {
      channel.appendLine('Warning: Failed to load config, using defaults.');
    }
  }

  // Determine output directory (same level as source, in _build/html/)
  const sourceDir = path.dirname(entryPoint);
  const outputDir = path.join(sourceDir, '_build', 'html');

  channel.appendLine(`Output: ${outputDir}`);
  channel.appendLine('');
  channel.appendLine('Building...');

  channel.appendLine(`Theme: ${theme}`);
  channel.appendLine('');

  // Run static builder
  const result = buildStaticSite({
    entryPoint,
    outputDir,
    config,
    index: indexBuilder?.getIndex(),
    projectName: 'Documentation',
    theme,
    onProgress: (current, total, fileName) => {
      channel.appendLine(`  [${current}/${total}] ${fileName}`);
    },
  });

  channel.appendLine('');
  if (result.errors.length > 0) {
    channel.appendLine('Warnings/Errors:');
    for (const err of result.errors) {
      channel.appendLine(`  - ${err}`);
    }
    channel.appendLine('');
  }

  channel.appendLine(`Build complete: ${result.filesBuilt} files generated.`);
  channel.appendLine(`Output: ${result.outputDir}`);

  if (result.filesBuilt > 0) {
    const indexFile = path.join(outputDir, 'index.html');
    const action = await vscode.window.showInformationMessage(
      `Documentation built: ${result.filesBuilt} pages → ${path.relative(workspaceRoot, outputDir)}`,
      'Open in Browser'
    );
    if (action === 'Open in Browser') {
      vscode.env.openExternal(vscode.Uri.file(indexFile));
    }
  } else {
    vscode.window.showWarningMessage('No documentation files were generated.');
  }

  return result.filesBuilt > 0;
}

/**
 * Find the built documentation index.html
 */
async function findDocumentationIndex(workspaceRoot: string): Promise<string | null> {
  const jsonPath = await findPreceptJsonPath(workspaceRoot);
  const searchDirs = jsonPath
    ? [path.dirname(jsonPath)]
    : [path.join(workspaceRoot, 'docs'), workspaceRoot];

  for (const dir of searchDirs) {
    const locations = [
      path.join(dir, '_build', 'html', 'index.html'),
      path.join(dir, 'build', 'html', 'index.html'),
    ];

    for (const loc of locations) {
      if (fs.existsSync(loc)) {
        return loc;
      }
    }
  }

  return null;
}

/**
 * View documentation in browser
 */
export async function viewDocumentation(workspaceRoot: string, indexBuilder?: IndexBuilder): Promise<boolean> {
  const indexPath = await findDocumentationIndex(workspaceRoot);

  if (!indexPath) {
    const result = await vscode.window.showWarningMessage(
      'No built documentation found. Would you like to build it now?',
      'Build Documentation',
      'Cancel'
    );

    if (result === 'Build Documentation') {
      const buildSuccess = await buildDocumentation(workspaceRoot, indexBuilder);
      if (buildSuccess) {
        return viewDocumentation(workspaceRoot, indexBuilder);
      }
    }
    return false;
  }

  // Open in default browser using VS Code API
  const uri = vscode.Uri.file(indexPath);
  await vscode.env.openExternal(uri);
  return true;
}

/**
 * Register documentation commands
 */
export function registerDocumentationCommands(
  context: vscode.ExtensionContext,
  indexBuilder?: IndexBuilder
): vscode.Disposable[] {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

  if (!workspaceRoot) {
    return [];
  }

  const disposables: vscode.Disposable[] = [];

  // Register build command
  disposables.push(
    vscode.commands.registerCommand('requirements.buildDocumentation', async () => {
      await buildDocumentation(workspaceRoot, indexBuilder);
    })
  );

  // Register view command
  disposables.push(
    vscode.commands.registerCommand('requirements.viewDocumentation', async () => {
      await viewDocumentation(workspaceRoot, indexBuilder);
    })
  );

  return disposables;
}
