/**
 * Insert Image Command - file picker, copy to project, insert directive
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { PreceptConfig } from '../types';
import { IndexBuilder } from '../indexing/indexBuilder';
import { generateNextId } from '../utils/idGenerator';
import {
  resolveImageDirectory,
  copyImageToProject,
  computeRelativePath,
  IMAGE_EXTENSIONS,
} from '../utils/imageUtils';

/**
 * Register the insert image command.
 */
export function registerInsertImageCommand(
  context: vscode.ExtensionContext,
  indexBuilder: IndexBuilder,
  config: PreceptConfig,
): vscode.Disposable[] {
  let currentConfig = config;
  const disposables: vscode.Disposable[] = [];

  disposables.push(
    vscode.commands.registerCommand('requirements.insertImage', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document.languageId !== 'restructuredtext') {
        vscode.window.showWarningMessage('Open an RST file to insert an image.');
        return;
      }

      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!workspaceRoot) {
        return;
      }

      // File picker
      const fileUris = await vscode.window.showOpenDialog({
        canSelectMany: false,
        filters: {
          'Images': IMAGE_EXTENSIONS.map(e => e.slice(1)),
        },
        title: 'Select Image',
      });

      if (!fileUris || fileUris.length === 0) {
        return;
      }

      const sourcePath = fileUris[0].fsPath;

      // Ask directive type
      const choice = await vscode.window.showQuickPick([
        { label: 'Standard Image', description: '.. image::', value: 'image' as const },
        { label: 'Tracked Graphic', description: '.. graphic:: (with ID and traceability)', value: 'graphic' as const },
      ], {
        placeHolder: 'Insert as...',
      });

      if (!choice) {
        return;
      }

      // Copy to image directory
      const imageDir = await resolveImageDirectory(workspaceRoot);
      const destPath = await copyImageToProject(sourcePath, imageDir);
      const relativePath = computeRelativePath(editor.document.uri.fsPath, destPath);

      // Build snippet
      let snippet: string;
      if (choice.value === 'image') {
        snippet = `.. image:: ${relativePath}\n   :alt: \${1:Alt text}\n`;
      } else {
        const nextId = generateNextId(currentConfig.idConfig, indexBuilder.getAllRequirements());
        snippet = `.. graphic:: \${1:Title}\n   :id: ${nextId}\n   :type: graphic\n   :status: draft\n   :file: ${relativePath}\n   :caption: \${2:Caption}\n`;
      }

      await editor.insertSnippet(new vscode.SnippetString(snippet), editor.selection.active);
    })
  );

  // Config update
  const updateConfig = (newConfig: PreceptConfig): void => {
    currentConfig = newConfig;
  };

  (registerInsertImageCommand as { updateConfig?: (c: PreceptConfig) => void }).updateConfig = updateConfig;

  return disposables;
}
