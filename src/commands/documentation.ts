/**
 * Documentation Build Command
 *
 * Implements requirements:
 * - 00292: Build documentation command
 * - 00293: Build command prerequisites
 * - 00294: Build output location
 * - 00295: Build error handling
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { findConfPyPath } from '../configuration/configLoader';

const execAsync = promisify(exec);

/** Output channel for build logs */
let outputChannel: vscode.OutputChannel | null = null;

/**
 * Get or create the output channel for documentation builds
 */
function getOutputChannel(): vscode.OutputChannel {
  if (!outputChannel) {
    outputChannel = vscode.window.createOutputChannel('Rigr Documentation');
  }
  return outputChannel;
}

/**
 * Check if a command is available in the system
 */
async function isCommandAvailable(command: string): Promise<boolean> {
  try {
    const checkCmd = process.platform === 'win32' ? 'where' : 'which';
    await execAsync(`${checkCmd} ${command}`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Find available Python command (python3 or python)
 */
async function findPythonCommand(): Promise<string | null> {
  if (await isCommandAvailable('python3')) {
    return 'python3';
  }
  if (await isCommandAvailable('python')) {
    return 'python';
  }
  return null;
}

/**
 * Check if sphinx-build is available
 */
async function isSphinxAvailable(): Promise<boolean> {
  return await isCommandAvailable('sphinx-build');
}

/**
 * Verify build prerequisites (implements 00293)
 */
async function verifyPrerequisites(workspaceRoot: string): Promise<{
  valid: boolean;
  confPyPath: string | null;
  pythonCmd: string | null;
  sphinxAvailable: boolean;
  error?: string;
}> {
  const confPyPath = await findConfPyPath(workspaceRoot);
  const pythonCmd = await findPythonCommand();
  const sphinxAvailable = await isSphinxAvailable();

  if (!confPyPath) {
    return {
      valid: false,
      confPyPath: null,
      pythonCmd,
      sphinxAvailable,
      error: 'conf.py not found in workspace. Please ensure your Sphinx documentation is set up correctly.',
    };
  }

  if (!pythonCmd) {
    return {
      valid: false,
      confPyPath,
      pythonCmd: null,
      sphinxAvailable,
      error: 'Python not found. Please install Python and ensure it is in your PATH.',
    };
  }

  if (!sphinxAvailable) {
    return {
      valid: false,
      confPyPath,
      pythonCmd,
      sphinxAvailable: false,
      error: 'sphinx-build not found. Please install Sphinx: pip install sphinx',
    };
  }

  return {
    valid: true,
    confPyPath,
    pythonCmd,
    sphinxAvailable: true,
  };
}

/**
 * Build documentation using Sphinx (implements 00292)
 */
export async function buildDocumentation(workspaceRoot: string): Promise<boolean> {
  const channel = getOutputChannel();
  channel.clear();
  channel.show();

  channel.appendLine('Rigr: Building Documentation');
  channel.appendLine('═'.repeat(50));
  channel.appendLine('');

  // Verify prerequisites (implements 00293)
  channel.appendLine('Checking prerequisites...');
  const prereqs = await verifyPrerequisites(workspaceRoot);

  if (!prereqs.valid) {
    channel.appendLine(`❌ ${prereqs.error}`);
    vscode.window.showErrorMessage(prereqs.error!, 'Show Output').then(action => {
      if (action === 'Show Output') {
        channel.show();
      }
    });
    return false;
  }

  channel.appendLine(`✓ conf.py found: ${prereqs.confPyPath}`);
  channel.appendLine(`✓ Python available: ${prereqs.pythonCmd}`);
  channel.appendLine(`✓ sphinx-build available`);
  channel.appendLine('');

  // Determine source and build directories (implements 00294)
  const confDir = path.dirname(prereqs.confPyPath!);
  const sourceDir = confDir;
  const buildDir = path.join(confDir, '_build', 'html');

  // Also check for build/html as fallback location
  const altBuildDir = path.join(confDir, 'build', 'html');

  channel.appendLine(`Source directory: ${sourceDir}`);
  channel.appendLine(`Build directory: ${buildDir}`);
  channel.appendLine('');

  // Create build directory if needed
  const buildParent = path.dirname(buildDir);
  if (!fs.existsSync(buildParent)) {
    fs.mkdirSync(buildParent, { recursive: true });
  }

  // Execute sphinx-build
  channel.appendLine('Running sphinx-build...');
  channel.appendLine('-'.repeat(50));

  const sphinxCmd = `sphinx-build -b html "${sourceDir}" "${buildDir}"`;
  channel.appendLine(`$ ${sphinxCmd}`);
  channel.appendLine('');

  return new Promise((resolve) => {
    vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Building documentation...',
        cancellable: true,
      },
      async (progress, token) => {
        try {
          const childProcess = exec(sphinxCmd, {
            cwd: confDir,
            maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large outputs
          });

          // Handle cancellation
          token.onCancellationRequested(() => {
            childProcess.kill();
            channel.appendLine('\n❌ Build cancelled by user');
            resolve(false);
          });

          let stdout = '';
          let stderr = '';

          childProcess.stdout?.on('data', (data) => {
            stdout += data;
            channel.append(data.toString());
          });

          childProcess.stderr?.on('data', (data) => {
            stderr += data;
            channel.append(data.toString());
          });

          childProcess.on('close', (code) => {
            channel.appendLine('');
            channel.appendLine('-'.repeat(50));

            if (code === 0) {
              channel.appendLine('✓ Build completed successfully');
              channel.appendLine(`Output: ${buildDir}`);

              vscode.window.showInformationMessage(
                'Documentation built successfully',
                'View in Browser'
              ).then(action => {
                if (action === 'View in Browser') {
                  viewDocumentation(workspaceRoot);
                }
              });
              resolve(true);
            } else {
              // Error handling (implements 00295)
              channel.appendLine(`❌ Build failed with exit code ${code}`);

              // Try to parse Sphinx error messages for file and line
              const errorMatch = stderr.match(/([^:]+):(\d+):/);
              if (errorMatch) {
                channel.appendLine(`Error location: ${errorMatch[1]}:${errorMatch[2]}`);
              }

              vscode.window.showErrorMessage(
                'Documentation build failed',
                'Show Output'
              ).then(action => {
                if (action === 'Show Output') {
                  channel.show();
                }
              });
              resolve(false);
            }
          });

          childProcess.on('error', (err) => {
            channel.appendLine(`❌ Error: ${err.message}`);
            vscode.window.showErrorMessage(
              `Documentation build error: ${err.message}`,
              'Show Output'
            ).then(action => {
              if (action === 'Show Output') {
                channel.show();
              }
            });
            resolve(false);
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          channel.appendLine(`❌ Error: ${errorMessage}`);
          vscode.window.showErrorMessage(
            `Documentation build error: ${errorMessage}`,
            'Show Output'
          ).then(action => {
            if (action === 'Show Output') {
              channel.show();
            }
          });
          resolve(false);
        }
      }
    );
  });
}

/**
 * Find the built documentation index.html (implements 00297)
 */
async function findDocumentationIndex(workspaceRoot: string): Promise<string | null> {
  const confPyPath = await findConfPyPath(workspaceRoot);
  if (!confPyPath) {
    return null;
  }

  const confDir = path.dirname(confPyPath);

  // Check standard locations
  const locations = [
    path.join(confDir, '_build', 'html', 'index.html'),
    path.join(confDir, 'build', 'html', 'index.html'),
  ];

  for (const loc of locations) {
    if (fs.existsSync(loc)) {
      return loc;
    }
  }

  return null;
}

/**
 * View documentation in browser (implements 00296)
 */
export async function viewDocumentation(workspaceRoot: string): Promise<boolean> {
  const indexPath = await findDocumentationIndex(workspaceRoot);

  if (!indexPath) {
    const result = await vscode.window.showWarningMessage(
      'No built documentation found. Would you like to build it now?',
      'Build Documentation',
      'Cancel'
    );

    if (result === 'Build Documentation') {
      const buildSuccess = await buildDocumentation(workspaceRoot);
      if (buildSuccess) {
        // Try again after build
        return viewDocumentation(workspaceRoot);
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
  context: vscode.ExtensionContext
): vscode.Disposable[] {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

  if (!workspaceRoot) {
    return [];
  }

  const disposables: vscode.Disposable[] = [];

  // Register build command
  disposables.push(
    vscode.commands.registerCommand('requirements.buildDocumentation', async () => {
      await buildDocumentation(workspaceRoot);
    })
  );

  // Register view command
  disposables.push(
    vscode.commands.registerCommand('requirements.viewDocumentation', async () => {
      await viewDocumentation(workspaceRoot);
    })
  );

  return disposables;
}
