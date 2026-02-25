/**
 * Webview preview styles
 *
 * Adapts the Rigr CSS for VS Code webview rendering, using VS Code
 * CSS variables for theme integration plus --rigr-* custom properties
 * that are injected per-theme.
 */

/**
 * CSS for the RST preview webview.
 *
 * All colour references use var(--rigr-*) which are injected
 * from the selected theme before this stylesheet.
 */
export const PREVIEW_CSS = `
/* ---------------------------------------------------------------------------
   Base
   --------------------------------------------------------------------------- */
body {
  font-family: var(--vscode-editor-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif);
  font-size: var(--vscode-editor-font-size, 14px);
  color: var(--rigr-text-primary);
  background: var(--rigr-page-bg);
  line-height: 1.6;
  padding: 1em 2em;
  max-width: 960px;
  margin: 0 auto;
}

/* ---------------------------------------------------------------------------
   Typography
   --------------------------------------------------------------------------- */
h1, h2, h3, h4, h5, h6 {
  color: var(--rigr-text-primary);
  margin-top: 1.5em;
  margin-bottom: 0.5em;
  font-weight: 600;
  border-bottom: 1px solid var(--rigr-border-color);
  padding-bottom: 0.3em;
}

h1 { font-size: 2em; }
h2 { font-size: 1.5em; }
h3 { font-size: 1.25em; }
h4 { font-size: 1.1em; border-bottom: none; }
h5, h6 { font-size: 1em; border-bottom: none; }

p { margin: 0.5em 0; }
a { color: var(--rigr-link-color); text-decoration: none; }
a:hover { color: var(--rigr-link-hover); text-decoration: underline; }

code {
  font-family: var(--vscode-editor-font-family, 'SF Mono', 'Monaco', 'Consolas', monospace);
  font-size: 0.9em;
  background: var(--rigr-code-block-bg);
  padding: 0.15em 0.3em;
  border-radius: 3px;
}

pre {
  background: var(--rigr-code-block-bg);
  padding: 1em;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 0.9em;
}

pre code {
  background: transparent;
  padding: 0;
}

blockquote {
  border-left: 3px solid var(--rigr-border-color);
  margin: 0.5em 0;
  padding: 0.25em 1em;
  color: var(--rigr-text-secondary);
}

hr {
  border: none;
  border-top: 1px solid var(--rigr-border-color);
  margin: 2em 0;
}

/* ---------------------------------------------------------------------------
   Tables
   --------------------------------------------------------------------------- */
table {
  border-collapse: collapse;
  margin: 1em 0;
  width: 100%;
}

th, td {
  border: 1px solid var(--rigr-border-color);
  padding: 0.4em 0.75em;
  text-align: left;
}

th {
  background: var(--rigr-bg-header);
  font-weight: 600;
}

table.field-list {
  width: auto;
}

table.field-list th {
  white-space: nowrap;
  font-weight: 500;
}

/* ---------------------------------------------------------------------------
   Lists
   --------------------------------------------------------------------------- */
ul, ol {
  margin: 0.5em 0;
  padding-left: 2em;
}

li { margin: 0.25em 0; }

dl dt {
  font-weight: 600;
  margin-top: 0.75em;
}

dl dd {
  margin-left: 1.5em;
}

/* ---------------------------------------------------------------------------
   Images
   --------------------------------------------------------------------------- */
img {
  max-width: 100%;
  height: auto;
}

/* ---------------------------------------------------------------------------
   Rigr Item Container
   --------------------------------------------------------------------------- */
.rigr-item {
  border: 1px solid var(--rigr-border-color);
  border-radius: 4px;
  margin: 1.5em 0;
  background: var(--rigr-bg-light);
  overflow: hidden;
}

.rigr-type-requirement { border-left: 4px solid #1976d2; }
.rigr-type-specification { border-left: 4px solid #388e3c; }
.rigr-type-rationale { border-left: 4px solid #f57c00; }
.rigr-type-information { border-left: 4px solid #7b1fa2; }
.rigr-type-parameter { border-left: 4px solid #0097a7; }
.rigr-type-term { border-left: 4px solid #98D8AA; }
.rigr-type-design_element { border-left: 4px solid #455a64; }

/* ---------------------------------------------------------------------------
   Title
   --------------------------------------------------------------------------- */
.rigr-item .rigr-title,
.rigr-graphic .rigr-title,
.rigr-code .rigr-title {
  margin: 0;
  padding: 0.5em 0.75em;
  background: var(--rigr-bg-header);
  border-bottom: 1px solid var(--rigr-border-color);
  font-size: 1.1em;
  font-weight: 600;
  color: var(--rigr-text-primary);
}

.rigr-title-id {
  font-family: var(--vscode-editor-font-family, monospace);
  font-weight: 600;
  color: var(--rigr-id-color);
  background: var(--rigr-id-bg);
  padding: 0.1em 0.35em;
  border-radius: 3px;
  font-size: 0.9em;
  margin-right: 0.3em;
}

/* ---------------------------------------------------------------------------
   Content Wrapper
   --------------------------------------------------------------------------- */
.rigr-content-wrapper {
  display: flex;
  flex-wrap: wrap;
  gap: 0;
}

.rigr-body {
  flex: 1 1 70%;
  min-width: 300px;
  padding: 0.5em 0.75em 0.5em 1em;
  background: var(--rigr-bg-content);
  color: var(--rigr-text-primary);
}

.rigr-body > *:first-child { margin-top: 0; }
.rigr-body > *:last-child { margin-bottom: 0; }

.rigr-metadata-wrapper {
  flex: 0 0 auto;
  width: 25%;
  min-width: 180px;
  max-width: 280px;
  background: var(--rigr-bg-light);
  border-left: 1px solid var(--rigr-border-color);
  display: flex;
  flex-direction: column;
}

.rigr-metadata-wrapper .rigr-metadata-table,
.rigr-metadata-wrapper table {
  margin: 0 !important;
  padding: 0 !important;
  border: none !important;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.rigr-metadata-wrapper tbody {
  margin: 0 !important;
  padding: 0 !important;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.rigr-metadata-wrapper tr {
  display: flex;
  width: 100%;
}

.rigr-metadata-wrapper tr:last-child {
  flex: 1;
}

.rigr-metadata-wrapper td:first-child {
  flex: 0 0 auto;
  width: 40%;
}

.rigr-metadata-wrapper td:last-child {
  flex: 1;
}

/* ---------------------------------------------------------------------------
   Metadata Table
   --------------------------------------------------------------------------- */
.rigr-metadata-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8em;
  margin: 0 !important;
  padding: 0;
  background: transparent;
  border: none;
}

.rigr-metadata-table td {
  padding: 0.25em 0.5em;
  border-bottom: 1px solid var(--rigr-border-color);
  vertical-align: top;
  color: var(--rigr-text-primary);
}

.rigr-metadata-table td:first-child {
  width: 40%;
  font-weight: 500;
  color: var(--rigr-text-secondary);
  white-space: nowrap;
}

.rigr-metadata-table td:last-child {
  background: var(--rigr-bg-content);
}

.rigr-metadata-table tr:last-child td {
  border-bottom: none;
}

/* Clickable link references */
.rigr-link-ref {
  color: var(--rigr-id-color);
  text-decoration: none;
}

.rigr-link-ref:hover {
  text-decoration: underline;
}

/* ---------------------------------------------------------------------------
   Graphic Directive
   --------------------------------------------------------------------------- */
.rigr-graphic {
  margin: 2em 0;
  padding: 0;
  background: var(--rigr-bg-light);
  border: 1px solid var(--rigr-border-color);
  border-radius: 4px;
  overflow: hidden;
}

.rigr-graphic-image img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 0 auto;
}

.rigr-graphic-caption {
  padding: 0.75em 1em;
  background: var(--rigr-bg-header);
  border-top: 1px solid var(--rigr-border-color);
  text-align: center;
  font-style: italic;
  color: var(--rigr-text-secondary);
}

.rigr-graphic-caption p { margin: 0; }

/* ---------------------------------------------------------------------------
   Code Directive
   --------------------------------------------------------------------------- */
.rigr-code {
  margin: 2em 0;
  padding: 0;
  background: var(--rigr-bg-light);
  border: 1px solid var(--rigr-border-color);
  border-radius: 4px;
  overflow: hidden;
}

.rigr-code-content pre {
  margin: 0;
  border-radius: 0;
  border: none;
  border-top: 1px solid var(--rigr-border-color);
  border-bottom: 1px solid var(--rigr-border-color);
}

.rigr-code-caption {
  padding: 0.75em 1em;
  background: var(--rigr-bg-header);
  border-top: 1px solid var(--rigr-border-color);
  text-align: center;
  font-style: italic;
  color: var(--rigr-text-secondary);
}

.rigr-code-caption p { margin: 0; }

/* ---------------------------------------------------------------------------
   Admonitions
   --------------------------------------------------------------------------- */
.admonition {
  border: 1px solid var(--rigr-border-color);
  border-radius: 4px;
  margin: 1em 0;
  padding: 0.75em 1em;
  background: var(--rigr-bg-light);
}

.admonition-title {
  font-weight: 600;
  margin: 0 0 0.5em 0;
}

.admonition.note { border-left: 4px solid #2196F3; }
.admonition.warning { border-left: 4px solid #FF9800; }
.admonition.tip { border-left: 4px solid #4CAF50; }
.admonition.important { border-left: 4px solid #F44336; }
.admonition.caution { border-left: 4px solid #FF9800; }
.admonition.danger { border-left: 4px solid #F44336; }

/* ---------------------------------------------------------------------------
   Status Theming
   --------------------------------------------------------------------------- */

/* Status indicator: subtle coloured top border */
.rigr-status-draft { border-top: 2px solid #CFB53B; }
.rigr-status-review { border-top: 2px solid #E08A00; }
.rigr-status-approved { border-top: 2px solid #388E3C; }
.rigr-status-implemented { border-top: 2px solid #1976D2; }
.rigr-status-verified { border-top: 2px solid #7B1FA2; }
.rigr-status-deprecated { border-top: 2px solid #9E9E9E; }
.rigr-status-rejected { border-top: 2px solid #C62828; }

/* Status value in the metadata table */
.rigr-field-status {
  font-weight: 600;
}

.rigr-status-draft .rigr-field-status { color: #CFB53B; }
.rigr-status-review .rigr-field-status { color: #E08A00; }
.rigr-status-approved .rigr-field-status { color: #388E3C; }
.rigr-status-implemented .rigr-field-status { color: #1976D2; }
.rigr-status-verified .rigr-field-status { color: #7B1FA2; }
.rigr-status-deprecated .rigr-field-status { color: #9E9E9E; }
.rigr-status-rejected .rigr-field-status { color: #C62828; }

/* ---------------------------------------------------------------------------
   PlantUML Diagrams
   --------------------------------------------------------------------------- */
.rigr-graphic-uml {
  padding: 1em;
  text-align: center;
  background: var(--rigr-bg-content);
}

.rigr-graphic-uml img.plantuml-diagram {
  max-width: 100%;
  height: auto;
  display: inline-block;
}

.rigr-plantuml-fallback .plantuml-notice {
  color: var(--rigr-text-secondary);
  font-size: 0.9em;
  margin-bottom: 0.5em;
}

/* ---------------------------------------------------------------------------
   Syntax Highlighting (highlight.js theme adapted for VS Code)
   --------------------------------------------------------------------------- */
.hljs {
  background: var(--rigr-code-block-bg);
  color: var(--rigr-text-primary);
}

/* Keywords, built-ins */
.hljs-keyword,
.hljs-selector-tag,
.hljs-built_in,
.hljs-name { color: var(--vscode-symbolIcon-keywordForeground, #0000ff); }

/* Strings */
.hljs-string,
.hljs-attr,
.hljs-symbol,
.hljs-bullet,
.hljs-addition { color: var(--vscode-symbolIcon-stringForeground, #a31515); }

/* Types, classes */
.hljs-type,
.hljs-title,
.hljs-section,
.hljs-title.class_,
.hljs-title.function_ { color: var(--vscode-symbolIcon-classForeground, #267f99); }

/* Numbers */
.hljs-number,
.hljs-literal { color: var(--vscode-symbolIcon-numberForeground, #098658); }

/* Comments */
.hljs-comment,
.hljs-quote,
.hljs-deletion { color: var(--vscode-symbolIcon-commentForeground, #008000); font-style: italic; }

/* Meta, preprocessor */
.hljs-meta { color: #795E26; }
.hljs-meta .hljs-string { color: #a31515; }

/* Tags, attributes (HTML/XML) */
.hljs-tag { color: #800000; }
.hljs-attr { color: #e50000; }

/* Variables, template */
.hljs-variable,
.hljs-template-variable { color: #001080; }

/* Emphasis */
.hljs-emphasis { font-style: italic; }
.hljs-strong { font-weight: bold; }

/* Dark theme overrides using VS Code's body class */
.vscode-dark .hljs-keyword,
.vscode-dark .hljs-built_in,
.vscode-dark .hljs-name { color: #569cd6; }

.vscode-dark .hljs-string,
.vscode-dark .hljs-attr { color: #ce9178; }

.vscode-dark .hljs-type,
.vscode-dark .hljs-title,
.vscode-dark .hljs-section,
.vscode-dark .hljs-title.class_,
.vscode-dark .hljs-title.function_ { color: #4ec9b0; }

.vscode-dark .hljs-number,
.vscode-dark .hljs-literal { color: #b5cea8; }

.vscode-dark .hljs-comment,
.vscode-dark .hljs-quote { color: #6a9955; }

.vscode-dark .hljs-meta { color: #d7ba7d; }
.vscode-dark .hljs-tag { color: #808080; }
.vscode-dark .hljs-variable,
.vscode-dark .hljs-template-variable { color: #9cdcfe; }

/* High-contrast theme */
.vscode-high-contrast .hljs-keyword,
.vscode-high-contrast .hljs-built_in { color: #569cd6; }
.vscode-high-contrast .hljs-string { color: #ce9178; }
.vscode-high-contrast .hljs-comment { color: #7ca668; }
.vscode-high-contrast .hljs-number { color: #b5cea8; }

/* ---------------------------------------------------------------------------
   Toctree
   --------------------------------------------------------------------------- */
.toctree-caption {
  margin: 1em 0 0.5em 0;
}

ul.toctree {
  list-style: none;
  padding-left: 0;
}

ul.toctree li {
  padding: 0.25em 0;
}

/* ---------------------------------------------------------------------------
   Print
   --------------------------------------------------------------------------- */
@media print {
  .rigr-item, .rigr-graphic, .rigr-code {
    break-inside: avoid;
  }
}
`;
