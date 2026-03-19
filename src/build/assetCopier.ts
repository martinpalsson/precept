/**
 * Asset copier for static builds
 *
 * Copies CSS, JS, and referenced images to the build output directory.
 */

import * as fs from 'fs';
import * as path from 'path';
import { PRECEPT_CSS_TEMPLATE, PRECEPT_JS_TEMPLATE } from '../commands/templates';
import { generateStaticPageCss } from './templateEngine';
import { generateStaticThemeCss } from '../themes';

/**
 * Copy all static assets to the build output directory.
 *
 * Creates `_static/` with CSS and JS files.
 * Prepends theme CSS custom properties (light + dark media query).
 */
export function copyStaticAssets(outputDir: string, themeName: string = 'default', mobileBreakpoint?: number): void {
  const staticDir = path.join(outputDir, '_static');
  mkdirSync(staticDir);

  // Combined CSS: theme vars + page layout + precept component styles
  const themeCss = generateStaticThemeCss(themeName);
  const pageCss = generateStaticPageCss(mobileBreakpoint);
  const combinedCss = `${themeCss}\n\n${pageCss}\n\n${PRECEPT_CSS_TEMPLATE}`;
  fs.writeFileSync(path.join(staticDir, 'precept.css'), combinedCss, 'utf-8');

  // JavaScript
  fs.writeFileSync(path.join(staticDir, 'precept.js'), PRECEPT_JS_TEMPLATE, 'utf-8');
}

/**
 * Copy referenced images from the source directory to the build output.
 *
 * Scans for common image directories (images/, _images/, img/) and copies them.
 */
export function copyImages(sourceDir: string, outputDir: string): void {
  const imageDirs = ['images', '_images', 'img'];

  for (const dir of imageDirs) {
    const srcPath = path.join(sourceDir, dir);
    if (fs.existsSync(srcPath) && fs.statSync(srcPath).isDirectory()) {
      const destPath = path.join(outputDir, dir);
      copyDirRecursive(srcPath, destPath);
    }
  }
}

/**
 * Recursively copy a directory.
 */
function copyDirRecursive(src: string, dest: string): void {
  mkdirSync(dest);
  const resolvedDest = path.resolve(dest);
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    // Skip symlinks to prevent symlink-based traversal
    if (entry.isSymbolicLink()) {
      continue;
    }

    const srcPath = path.join(src, entry.name);
    const destPath = path.resolve(dest, entry.name);

    // Validate destination stays within the target directory
    if (!destPath.startsWith(resolvedDest + path.sep)) {
      continue;
    }

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Create a directory if it doesn't exist (recursive).
 */
function mkdirSync(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}
