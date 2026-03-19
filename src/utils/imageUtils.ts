/**
 * Image utilities for inserting, copying, and referencing images
 */

import * as fs from 'fs';
import * as path from 'path';
import { findPreceptJsonPath } from '../configuration/configLoader';

export const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.bmp', '.webp'];

/**
 * Check if a filename has an image extension.
 */
export function isImageFile(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return IMAGE_EXTENSIONS.includes(ext);
}

/**
 * Resolve the project's image directory.
 *
 * Looks for existing image directories (images/, _images/, img/) relative
 * to the docs root (where precept.json lives). Creates images/ if none exist.
 */
export async function resolveImageDirectory(workspaceRoot: string): Promise<string> {
  const docsRoot = await getDocsRoot(workspaceRoot);
  const candidates = ['images', '_images', 'img'];

  for (const dir of candidates) {
    const candidate = path.join(docsRoot, dir);
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      return candidate;
    }
  }

  // Create default
  const defaultDir = path.join(docsRoot, 'images');
  await fs.promises.mkdir(defaultDir, { recursive: true });
  return defaultDir;
}

/**
 * Get the docs root directory (where precept.json lives, or workspace root).
 */
async function getDocsRoot(workspaceRoot: string): Promise<string> {
  const jsonPath = await findPreceptJsonPath(workspaceRoot);
  if (jsonPath) {
    return path.dirname(jsonPath);
  }
  return workspaceRoot;
}

/**
 * Copy an image file into the project's image directory.
 * Returns the destination path. Handles name conflicts with numeric suffix.
 */
export async function copyImageToProject(
  sourcePath: string,
  imageDir: string,
  preferredName?: string,
): Promise<string> {
  const name = preferredName || path.basename(sourcePath);
  const destPath = await resolveUniquePath(imageDir, name);

  await fs.promises.copyFile(sourcePath, destPath);
  return destPath;
}

/**
 * Save raw image data (e.g., from clipboard) to the image directory.
 * Returns the destination path.
 */
export async function saveImageData(
  data: Uint8Array,
  imageDir: string,
  filename: string,
): Promise<string> {
  const destPath = await resolveUniquePath(imageDir, filename);
  await fs.promises.writeFile(destPath, data);
  return destPath;
}

/**
 * Resolve a unique file path, appending a numeric suffix if needed.
 */
async function resolveUniquePath(dir: string, filename: string): Promise<string> {
  let destPath = path.join(dir, filename);
  if (!fs.existsSync(destPath)) {
    return destPath;
  }

  const ext = path.extname(filename);
  const base = path.basename(filename, ext);
  let counter = 1;
  do {
    destPath = path.join(dir, `${base}-${counter}${ext}`);
    counter++;
  } while (fs.existsSync(destPath));

  return destPath;
}

/**
 * Compute the relative path from an RST file to an image file.
 */
export function computeRelativePath(fromRstFile: string, toImageFile: string): string {
  const fromDir = path.dirname(fromRstFile);
  return path.relative(fromDir, toImageFile).replace(/\\/g, '/');
}

/**
 * Generate RST directive text for an image.
 */
export function generateImageDirective(relativePath: string, type: 'image' | 'graphic'): string {
  if (type === 'image') {
    return `.. image:: ${relativePath}\n   :alt: \${1:Alt text}\n`;
  }
  return `.. graphic:: \${1:Title}\n   :id: \${2:ID}\n   :type: graphic\n   :status: draft\n   :file: ${relativePath}\n   :caption: \${3:Caption}\n`;
}

/**
 * Scan the image directory for all image files (non-recursive).
 */
export async function listImageFiles(imageDir: string): Promise<string[]> {
  if (!fs.existsSync(imageDir)) {
    return [];
  }

  const entries = await fs.promises.readdir(imageDir, { withFileTypes: true });
  return entries
    .filter(e => e.isFile() && isImageFile(e.name))
    .map(e => e.name)
    .sort();
}
