/**
 * Image Drop Provider - drag and drop images into RST files
 */

import * as vscode from 'vscode';
import * as path from 'path';
import {
  resolveImageDirectory,
  copyImageToProject,
  computeRelativePath,
  isImageFile,
} from '../utils/imageUtils';

/**
 * Provides drop edits for image files dropped onto RST documents.
 */
export class ImageDropProvider implements vscode.DocumentDropEditProvider {
  async provideDocumentDropEdits(
    document: vscode.TextDocument,
    position: vscode.Position,
    dataTransfer: vscode.DataTransfer,
    token: vscode.CancellationToken,
  ): Promise<vscode.DocumentDropEdit | undefined> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
      return undefined;
    }

    // Check for dropped file URIs
    const uriListItem = dataTransfer.get('text/uri-list');
    if (!uriListItem) {
      return undefined;
    }

    const uriList = await uriListItem.asString();
    const uris = uriList.split('\n').map(u => u.trim()).filter(Boolean);

    if (uris.length === 0) {
      return undefined;
    }

    // Process the first image URI
    const fileUri = vscode.Uri.parse(uris[0]);
    if (fileUri.scheme !== 'file' || !isImageFile(fileUri.fsPath)) {
      return undefined;
    }

    const sourcePath = fileUri.fsPath;
    const imageDir = await resolveImageDirectory(workspaceRoot);

    // If already in an image directory, just use relative path
    let destPath: string;
    const resolvedSource = path.resolve(sourcePath);
    const resolvedImageDir = path.resolve(imageDir);
    if (resolvedSource.startsWith(resolvedImageDir + path.sep)) {
      destPath = sourcePath;
    } else {
      destPath = await copyImageToProject(sourcePath, imageDir);
    }

    const relativePath = computeRelativePath(document.uri.fsPath, destPath);
    const snippet = new vscode.SnippetString(
      `.. image:: ${relativePath}\n   :alt: \${1:${path.basename(destPath, path.extname(destPath))}}\n`
    );

    const dropEdit = new vscode.DocumentDropEdit(snippet);
    dropEdit.title = 'Insert as RST image';
    return dropEdit;
  }
}
