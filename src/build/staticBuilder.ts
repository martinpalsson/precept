/**
 * Static HTML builder
 *
 * Builds a complete static HTML site from RST source files.
 * Uses the toctree from index.rst to determine file set and ordering.
 */

import * as fs from 'fs';
import * as path from 'path';
import { parseRstDocument } from '../renderer/rstFullParser';
import { renderDocument } from '../renderer/htmlEmitter';
import { RenderContext } from '../renderer/directiveRenderer';
import { buildTocTree, getNavLinks, TocTree } from '../renderer/tocBuilder';
import { renderPage, PageTemplateContext } from './templateEngine';
import { copyStaticAssets, copyImages } from './assetCopier';
import { RigrConfig, RequirementIndex } from '../types';

export interface BuildOptions {
  /** Absolute path to the root RST file (e.g. index.rst) */
  entryPoint: string;
  /** Absolute path to the output directory */
  outputDir: string;
  /** Rigr configuration */
  config: RigrConfig;
  /** Requirement index for cross-reference resolution */
  index?: RequirementIndex;
  /** Project name for page titles */
  projectName?: string;
  /** Theme name (default: 'default') */
  theme?: string;
  /** Progress callback: (current, total, fileName) */
  onProgress?: (current: number, total: number, fileName: string) => void;
}

export interface BuildResult {
  success: boolean;
  filesBuilt: number;
  errors: string[];
  outputDir: string;
}

/**
 * Build a static HTML site from RST source files.
 */
export function buildStaticSite(options: BuildOptions): BuildResult {
  const {
    entryPoint,
    outputDir,
    config,
    index,
    projectName = 'Documentation',
    theme = 'default',
    onProgress,
  } = options;

  const sourceDir = path.dirname(entryPoint);
  const errors: string[] = [];
  let filesBuilt = 0;

  // Build toctree to determine file set and navigation
  let tocTree: TocTree;
  try {
    tocTree = buildTocTree(entryPoint);
  } catch (err) {
    return {
      success: false,
      filesBuilt: 0,
      errors: [`Failed to build toctree: ${err instanceof Error ? err.message : String(err)}`],
      outputDir,
    };
  }

  const totalFiles = tocTree.order.length;

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Copy static assets
  try {
    copyStaticAssets(outputDir, theme);
    copyImages(sourceDir, outputDir);
  } catch (err) {
    errors.push(`Asset copy failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Render each document
  for (let i = 0; i < tocTree.order.length; i++) {
    const slug = tocTree.order[i];
    const rstFile = path.join(sourceDir, `${slug}.rst`);

    onProgress?.(i + 1, totalFiles, `${slug}.rst`);

    if (!fs.existsSync(rstFile)) {
      errors.push(`File not found: ${slug}.rst`);
      continue;
    }

    try {
      const rstContent = fs.readFileSync(rstFile, 'utf-8');
      const doc = parseRstDocument(rstContent);

      const ctx: RenderContext = {
        config,
        index,
        basePath: sourceDir,
      };

      const bodyHtml = renderDocument(doc, ctx);
      const title = doc.title || slug;
      const nav = getNavLinks(tocTree, slug);

      // Compute relative path prefix for nested slugs (e.g. "ip/usb/foo" → "../../")
      const depth = slug.split('/').length - 1;
      const pathPrefix = depth > 0 ? '../'.repeat(depth) : '';

      const pageCtx: PageTemplateContext = {
        title,
        bodyHtml,
        currentSlug: slug,
        tocEntries: tocTree.tree,
        prevSlug: nav.prev,
        nextSlug: nav.next,
        projectName: projectName,
        cssPath: `${pathPrefix}_static/rigr.css`,
        jsPath: `${pathPrefix}_static/rigr.js`,
        pathPrefix,
      };

      const pageHtml = renderPage(pageCtx);
      const outFile = path.join(outputDir, `${slug}.html`);
      const outDir = path.dirname(outFile);
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
      }
      fs.writeFileSync(outFile, pageHtml, 'utf-8');
      filesBuilt++;
    } catch (err) {
      errors.push(`Error rendering ${slug}.rst: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return {
    success: errors.length === 0,
    filesBuilt,
    errors,
    outputDir,
  };
}
