/**
 * Image Paste Provider - paste images from clipboard into RST files
 */

import * as vscode from 'vscode';
import { IndexBuilder } from '../indexing/indexBuilder';
import { PreceptConfig } from '../types';
import { generateNextId } from '../utils/idGenerator';
import {
  resolveImageDirectory,
  saveImageData,
  computeRelativePath,
} from '../utils/imageUtils';

const PASTE_KIND = vscode.DocumentDropOrPasteEditKind.Empty.append('precept', 'image');

/**
 * Provides paste edits for image data pasted from clipboard.
 */
export class ImagePasteProvider implements vscode.DocumentPasteEditProvider {
  private config: PreceptConfig;
  private indexBuilder: IndexBuilder;

  constructor(config: PreceptConfig, indexBuilder: IndexBuilder) {
    this.config = config;
    this.indexBuilder = indexBuilder;
  }

  updateConfig(config: PreceptConfig): void {
    this.config = config;
  }

  async provideDocumentPasteEdits(
    document: vscode.TextDocument,
    ranges: readonly vscode.Range[],
    dataTransfer: vscode.DataTransfer,
    context: vscode.DocumentPasteEditContext,
    token: vscode.CancellationToken,
  ): Promise<vscode.DocumentPasteEdit[] | undefined> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
      return undefined;
    }

    // Try image mime types in preference order
    const mimeTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
    let imageItem: vscode.DataTransferItem | undefined;
    let detectedMime = 'image/png';

    for (const mime of mimeTypes) {
      const item = dataTransfer.get(mime);
      if (item) {
        imageItem = item;
        detectedMime = mime;
        break;
      }
    }

    if (!imageItem) {
      return undefined;
    }

    const file = imageItem.asFile?.();
    if (!file) {
      return undefined;
    }

    const data = await file.data();
    if (!data || data.byteLength === 0) {
      return undefined;
    }

    // Determine extension from mime type
    const extMap: Record<string, string> = {
      'image/png': '.png',
      'image/jpeg': '.jpg',
      'image/gif': '.gif',
      'image/webp': '.webp',
    };
    const ext = extMap[detectedMime] || '.png';

    // Generate filename: img-XXXX where XXXX is a short random hex
    const hex = Math.random().toString(16).slice(2, 8);
    const filename = `img-${hex}${ext}`;

    // Save to image directory
    const imageDir = await resolveImageDirectory(workspaceRoot);
    const destPath = await saveImageData(new Uint8Array(data), imageDir, filename);
    const relativePath = computeRelativePath(document.uri.fsPath, destPath);

    // Generate as tracked graphic directive with auto ID
    const nextId = generateNextId(this.config.idConfig, this.indexBuilder.getAllRequirements());
    const snippet = new vscode.SnippetString(
      `.. graphic:: \${1:Title}\n   :id: ${nextId}\n   :type: graphic\n   :status: draft\n   :file: ${relativePath}\n   :caption: \${2:Caption}\n`
    );

    const edit = new vscode.DocumentPasteEdit(snippet, 'Insert as Precept graphic', PASTE_KIND);
    edit.yieldTo = [vscode.DocumentDropOrPasteEditKind.Text];
    return [edit];
  }
}
