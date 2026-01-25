/**
 * Project Commands - Create and initialize Rigr RMS projects
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import {
  CONF_PY_TEMPLATE,
  SAMPLE_RST_TEMPLATE,
  INDEX_RST_TEMPLATE,
  RIGR_SPHINX_PY_TEMPLATE,
  RIGR_CSS_TEMPLATE,
  RIGR_JS_TEMPLATE,
  PYTHON_DEPENDENCIES_TEMPLATE
} from './templates';

/**
 * Create a new Rigr RMS project
 */
export function registerCreateProjectCommand(
  context: vscode.ExtensionContext
): vscode.Disposable {
  return vscode.commands.registerCommand('requirements.createProject', async () => {
    // Get workspace root
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

    if (!workspaceRoot) {
      vscode.window.showErrorMessage('Please open a folder first to create a Rigr RMS project.');
      return;
    }

    // Check if project already exists
    const confPyPath = path.join(workspaceRoot, 'docs', 'conf.py');
    const altConfPyPath = path.join(workspaceRoot, 'conf.py');

    if (fs.existsSync(confPyPath) || fs.existsSync(altConfPyPath)) {
      const overwrite = await vscode.window.showWarningMessage(
        'A conf.py file already exists. Do you want to overwrite it?',
        'Yes',
        'No'
      );

      if (overwrite !== 'Yes') {
        return;
      }
    }

    // Prompt user to confirm project creation (UC2 step 3)
    const confirm = await vscode.window.showInformationMessage(
      'Create a new Rigr RMS project in this workspace?',
      'Yes',
      'No'
    );

    // UC2 step 4: User may press no or cancel
    if (confirm !== 'Yes') {
      return;
    }

    // UC2 step 5: Create the project
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Creating Rigr RMS project...',
        cancellable: false,
      },
      async (progress) => {
        try {
          // Create docs directory
          const docsDir = path.join(workspaceRoot, 'docs');
          if (!fs.existsSync(docsDir)) {
            progress.report({ message: 'Creating docs directory...' });
            await fs.promises.mkdir(docsDir, { recursive: true });
          }

          // Create _extensions directory and rigr_sphinx.py
          progress.report({ message: 'Creating Sphinx extension...' });
          const extensionsDir = path.join(docsDir, '_extensions');
          if (!fs.existsSync(extensionsDir)) {
            await fs.promises.mkdir(extensionsDir, { recursive: true });
          }
          await fs.promises.writeFile(
            path.join(extensionsDir, 'rigr_sphinx.py'),
            RIGR_SPHINX_PY_TEMPLATE,
            'utf-8'
          );

          // Create _static directory with CSS and JS
          progress.report({ message: 'Creating static files...' });
          const staticDir = path.join(docsDir, '_static');
          if (!fs.existsSync(staticDir)) {
            await fs.promises.mkdir(staticDir, { recursive: true });
          }
          await fs.promises.writeFile(
            path.join(staticDir, 'rigr.css'),
            RIGR_CSS_TEMPLATE,
            'utf-8'
          );
          await fs.promises.writeFile(
            path.join(staticDir, 'rigr.js'),
            RIGR_JS_TEMPLATE,
            'utf-8'
          );

          // Create images directory for graphics
          const imagesDir = path.join(docsDir, 'images');
          if (!fs.existsSync(imagesDir)) {
            await fs.promises.mkdir(imagesDir, { recursive: true });
          }

          // Create python-dependencies.txt
          progress.report({ message: 'Creating python-dependencies.txt...' });
          await fs.promises.writeFile(
            path.join(docsDir, 'python-dependencies.txt'),
            PYTHON_DEPENDENCIES_TEMPLATE,
            'utf-8'
          );

          // Create conf.py
          progress.report({ message: 'Creating conf.py...' });
          await fs.promises.writeFile(
            path.join(docsDir, 'conf.py'),
            CONF_PY_TEMPLATE,
            'utf-8'
          );

          // Create sample requirements file
          progress.report({ message: 'Creating sample requirements...' });
          await fs.promises.writeFile(
            path.join(docsDir, 'requirements.rst'),
            SAMPLE_RST_TEMPLATE,
            'utf-8'
          );

          // Create index.rst
          await fs.promises.writeFile(
            path.join(docsDir, 'index.rst'),
            INDEX_RST_TEMPLATE,
            'utf-8'
          );

          vscode.window.showInformationMessage(
            'Rigr RMS project created successfully! Open docs/requirements.rst to get started.'
          );

          // Open the sample requirements file
          const sampleFile = vscode.Uri.file(path.join(docsDir, 'requirements.rst'));
          await vscode.window.showTextDocument(sampleFile);

          // Reload configuration to pick up the new conf.py
          await vscode.commands.executeCommand('requirements.reloadConfiguration');

        } catch (error) {
          vscode.window.showErrorMessage(
            `Failed to create project: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
    );
  });
}
