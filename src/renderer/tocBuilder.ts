/**
 * Toctree builder
 *
 * Resolves toctree directives across multiple RST files to build a
 * navigation structure for static HTML builds.
 */

import * as path from 'path';
import * as fs from 'fs';
import { HeadingStyle } from '../types';
import { parseRstDocument } from './rstFullParser';
import { BlockNode } from './rstNodes';

export interface TocEntry {
  /** Source file path relative to the doc root (without extension) */
  slug: string;
  /** Display title (from the document's first section heading) */
  title: string;
  /** Nested children from sub-toctrees */
  children: TocEntry[];
}

export interface TocTree {
  /** Ordered flat list of all document slugs for prev/next navigation */
  order: string[];
  /** Hierarchical tree for sidebar navigation */
  tree: TocEntry[];
}

/**
 * Build a toctree starting from a root document (typically index.rst).
 *
 * @param rootFile Absolute path to the root RST file
 * @returns The resolved TocTree
 */
export function buildTocTree(rootFile: string, headingStyles?: HeadingStyle[]): TocTree {
  const docRoot = path.dirname(rootFile);
  const rootSlug = path.basename(rootFile, '.rst');

  const visited = new Set<string>();
  const order: string[] = [];

  const rootEntry = resolveEntry(rootSlug, docRoot, visited, order, headingStyles);

  return {
    order,
    tree: rootEntry ? [rootEntry] : [],
  };
}

/**
 * Recursively resolve a toctree entry and its children.
 */
function resolveEntry(
  slug: string,
  docRoot: string,
  visited: Set<string>,
  order: string[],
  headingStyles?: HeadingStyle[],
): TocEntry | null {
  if (visited.has(slug)) return null;
  visited.add(slug);
  order.push(slug);

  const filePath = path.resolve(docRoot, `${slug}.rst`);
  if (!filePath.startsWith(path.resolve(docRoot) + path.sep)) {
    return null; // Reject path traversal attempts
  }
  if (!fs.existsSync(filePath)) {
    return { slug, title: slug, children: [] };
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const doc = parseRstDocument(content, headingStyles);

  // Extract document title from first section
  const title = doc.title || slug;

  // Find toctree directives and collect their entries
  const children: TocEntry[] = [];
  collectToctreeEntries(doc.children, docRoot, slug, visited, order, children, headingStyles);

  return { slug, title, children };
}

/**
 * Walk block nodes to find toctree directives and resolve their entries.
 */
function collectToctreeEntries(
  nodes: BlockNode[],
  docRoot: string,
  _parentSlug: string,
  visited: Set<string>,
  order: string[],
  children: TocEntry[],
  headingStyles?: HeadingStyle[],
): void {
  for (const node of nodes) {
    if (node.type === 'toctree') {
      for (const entry of node.entries) {
        // Resolve relative paths
        const entrySlug = entry.replace(/^\//, '');
        const child = resolveEntry(entrySlug, docRoot, visited, order, headingStyles);
        if (child) {
          children.push(child);
        }
      }
    }

    // Recurse into sections
    if (node.type === 'section') {
      collectToctreeEntries(node.children, docRoot, _parentSlug, visited, order, children, headingStyles);
    }
  }
}

/**
 * Get prev/next navigation links for a given slug.
 */
export function getNavLinks(
  tocTree: TocTree,
  currentSlug: string,
): { prev: string | null; next: string | null } {
  const idx = tocTree.order.indexOf(currentSlug);
  if (idx === -1) return { prev: null, next: null };

  return {
    prev: idx > 0 ? tocTree.order[idx - 1] : null,
    next: idx < tocTree.order.length - 1 ? tocTree.order[idx + 1] : null,
  };
}

/**
 * Flatten the toctree into a list suitable for sidebar rendering.
 */
export function flattenTocTree(
  entries: TocEntry[],
  depth: number = 0,
): Array<{ slug: string; title: string; depth: number }> {
  const result: Array<{ slug: string; title: string; depth: number }> = [];

  for (const entry of entries) {
    result.push({ slug: entry.slug, title: entry.title, depth });
    result.push(...flattenTocTree(entry.children, depth + 1));
  }

  return result;
}
