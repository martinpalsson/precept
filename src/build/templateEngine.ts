/**
 * HTML page template engine for static builds
 *
 * Wraps rendered RST body content in a full HTML page with navigation,
 * sidebar, and asset references.
 */

import { TocEntry, flattenTocTree } from '../renderer/tocBuilder';

export interface PageTemplateContext {
  title: string;
  bodyHtml: string;
  currentSlug: string;
  tocEntries: TocEntry[];
  prevSlug: string | null;
  nextSlug: string | null;
  projectName: string;
  cssPath: string;
  jsPath: string;
  /** Relative prefix to reach root from current page (e.g. "../../" for nested pages) */
  pathPrefix?: string;
}

/**
 * Render a full HTML page from body content and navigation context.
 */
export function renderPage(ctx: PageTemplateContext): string {
  const prefix = ctx.pathPrefix || '';
  const sidebar = renderSidebar(ctx.tocEntries, ctx.currentSlug, prefix);
  const navHtml = renderNavigation(ctx.prevSlug, ctx.nextSlug, prefix);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(ctx.title)} &mdash; ${escapeHtml(ctx.projectName)}</title>
  <link rel="stylesheet" href="${escapeAttr(ctx.cssPath)}">
</head>
<body>
<div class="rigr-page">
  <nav class="rigr-sidebar">
    <div class="rigr-sidebar-header">
      <h2>${escapeHtml(ctx.projectName)}</h2>
    </div>
    ${sidebar}
  </nav>
  <main class="rigr-main">
    ${ctx.bodyHtml}
    ${navHtml}
  </main>
</div>
<script src="${escapeAttr(ctx.jsPath)}"></script>
</body>
</html>`;
}

function renderSidebar(entries: TocEntry[], currentSlug: string, pathPrefix: string): string {
  const flat = flattenTocTree(entries);
  if (flat.length === 0) return '';

  const items = flat.map(item => {
    const active = item.slug === currentSlug ? ' class="active"' : '';
    const indent = `padding-left: ${0.75 + item.depth * 1}em`;
    return `<li${active}><a href="${escapeAttr(pathPrefix + item.slug)}.html" style="${indent}">${escapeHtml(item.title)}</a></li>`;
  });

  return `<ul class="rigr-nav">\n${items.join('\n')}\n</ul>`;
}

function renderNavigation(prevSlug: string | null, nextSlug: string | null, pathPrefix: string): string {
  if (!prevSlug && !nextSlug) return '';

  const parts: string[] = ['<nav class="rigr-page-nav">'];
  if (prevSlug) {
    parts.push(`<a class="rigr-nav-prev" href="${escapeAttr(pathPrefix + prevSlug)}.html">&laquo; Previous</a>`);
  }
  if (nextSlug) {
    parts.push(`<a class="rigr-nav-next" href="${escapeAttr(pathPrefix + nextSlug)}.html">Next &raquo;</a>`);
  }
  parts.push('</nav>');
  return parts.join('\n');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * CSS for static HTML builds (page layout: sidebar + main).
 */
export const STATIC_PAGE_CSS = `
/* Page layout */
body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 16px;
  line-height: 1.6;
  color: var(--rigr-text-primary);
  background: var(--rigr-page-bg);
}

a { color: var(--rigr-link-color); text-decoration: none; }
a:hover { color: var(--rigr-link-hover); text-decoration: underline; }

.rigr-page {
  display: flex;
  min-height: 100vh;
}

.rigr-sidebar {
  width: 260px;
  flex-shrink: 0;
  background: var(--rigr-sidebar-bg);
  border-right: 1px solid var(--rigr-sidebar-border);
  padding: 1em 0;
  overflow-y: auto;
  position: sticky;
  top: 0;
  height: 100vh;
}

.rigr-sidebar-header {
  padding: 0 1em 0.5em;
  border-bottom: 1px solid var(--rigr-sidebar-border);
  margin-bottom: 0.5em;
  color: var(--rigr-sidebar-text);
}

.rigr-sidebar-header h2 {
  margin: 0;
  font-size: 1.1em;
  border-bottom: none;
  padding-bottom: 0;
}

.rigr-nav {
  list-style: none;
  padding: 0;
  margin: 0;
}

.rigr-nav li a {
  display: block;
  padding: 0.35em 0.75em;
  color: var(--rigr-sidebar-text);
  text-decoration: none;
  font-size: 0.9em;
}

.rigr-nav li a:hover {
  background: var(--rigr-sidebar-active-bg);
}

.rigr-nav li.active a {
  background: var(--rigr-sidebar-active-bg);
  color: var(--rigr-sidebar-active-text);
  font-weight: 500;
}

.rigr-main {
  flex: 1;
  padding: 1.5em 2em;
  max-width: 860px;
  background: var(--rigr-page-bg);
}

.rigr-page-nav {
  display: flex;
  justify-content: space-between;
  margin-top: 2em;
  padding-top: 1em;
  border-top: 1px solid var(--rigr-border-color);
}

.rigr-page-nav a {
  color: var(--rigr-link-color);
  text-decoration: none;
}

.rigr-page-nav a:hover {
  text-decoration: underline;
}

@media (max-width: 768px) {
  .rigr-page { flex-direction: column; }
  .rigr-sidebar {
    width: 100%;
    height: auto;
    position: static;
    border-right: none;
    border-bottom: 1px solid var(--rigr-sidebar-border);
  }
  .rigr-main { max-width: 100%; }
}
`;
