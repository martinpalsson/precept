/**
 * Webview preview styles
 *
 * Adapts the Precept CSS for VS Code webview rendering, using VS Code
 * CSS variables for theme integration plus --precept-* custom properties
 * that are injected per-theme.
 */

/**
 * CSS for the RST preview webview.
 *
 * All colour references use var(--precept-*) which are injected
 * from the selected theme before this stylesheet.
 */
export const PREVIEW_CSS = `
/* ---------------------------------------------------------------------------
   Base
   --------------------------------------------------------------------------- */
body {
  font-family: var(--vscode-editor-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif);
  font-size: var(--vscode-editor-font-size, 14px);
  color: var(--precept-text-primary);
  background: var(--precept-page-bg);
  line-height: 1.6;
  padding: 1em 2em;
  max-width: 960px;
  margin: 0 auto;
}

/* ---------------------------------------------------------------------------
   Typography
   --------------------------------------------------------------------------- */
h1, h2, h3, h4, h5, h6 {
  color: var(--precept-text-primary);
  margin-top: 1.5em;
  margin-bottom: 0.5em;
  font-weight: 600;
  border-bottom: 1px solid var(--precept-border-color);
  padding-bottom: 0.3em;
}

h1 { font-size: 2em; }
h2 { font-size: 1.5em; }
h3 { font-size: 1.25em; }
h4 { font-size: 1.1em; border-bottom: none; }
h5, h6 { font-size: 1em; border-bottom: none; }

p { margin: 0.5em 0; }
a { color: var(--precept-link-color); text-decoration: none; }
a:hover { color: var(--precept-link-hover); text-decoration: underline; }

code {
  font-family: var(--vscode-editor-font-family, 'SF Mono', 'Monaco', 'Consolas', monospace);
  font-size: 0.9em;
  background: var(--precept-code-block-bg);
  padding: 0.15em 0.3em;
  border-radius: 3px;
}

pre {
  background: var(--precept-code-block-bg);
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
  border-left: 3px solid var(--precept-border-color);
  margin: 0.5em 0;
  padding: 0.25em 1em;
  color: var(--precept-text-secondary);
}

hr {
  border: none;
  border-top: 1px solid var(--precept-border-color);
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
  border: 1px solid var(--precept-border-color);
  padding: 0.4em 0.75em;
  text-align: left;
}

th {
  background: var(--precept-bg-header);
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
   Precept Item Container
   --------------------------------------------------------------------------- */
.precept-item {
  border: 1px solid var(--precept-border-color);
  border-radius: 4px;
  margin: 1.5em 0;
  background: var(--precept-bg-light);
  overflow: hidden;
}

.precept-type-requirement { border-left: 4px solid #1976d2; }
.precept-type-specification { border-left: 4px solid #388e3c; }
.precept-type-rationale { border-left: 4px solid #f57c00; }
.precept-type-information { border-left: 4px solid #7b1fa2; }
.precept-type-parameter { border-left: 4px solid #0097a7; }
.precept-type-term { border-left: 4px solid #98D8AA; }
.precept-type-design_element { border-left: 4px solid #455a64; }

/* ---------------------------------------------------------------------------
   Title
   --------------------------------------------------------------------------- */
.precept-item .precept-title,
.precept-graphic .precept-title,
.precept-code .precept-title {
  margin: 0;
  padding: 0.5em 0.75em;
  background: var(--precept-bg-header);
  border-bottom: 1px solid var(--precept-border-color);
  font-size: 1.1em;
  font-weight: 600;
  color: var(--precept-text-primary);
}

.precept-title-id {
  font-family: var(--vscode-editor-font-family, monospace);
  font-weight: 600;
  color: var(--precept-id-color);
  background: var(--precept-id-bg);
  padding: 0.1em 0.35em;
  border-radius: 3px;
  font-size: 0.9em;
  margin-right: 0.3em;
}

/* ---------------------------------------------------------------------------
   Content Wrapper
   --------------------------------------------------------------------------- */
.precept-content-wrapper {
  display: flex;
  flex-wrap: wrap;
  gap: 0;
}

.precept-body {
  flex: 1 1 70%;
  min-width: 0;
  padding: 0.5em 0.75em 0.5em 1em;
  background: var(--precept-bg-content);
  color: var(--precept-text-primary);
  overflow: hidden;
}

.precept-body > *:first-child { margin-top: 0; }
.precept-body > *:last-child { margin-bottom: 0; }
.precept-body img { max-width: 100%; height: auto; }

.precept-item:has(.precept-signature) .precept-body {
  padding-bottom: 0;
}

.precept-metadata-wrapper {
  flex: 0 0 auto;
  width: 25%;
  min-width: 180px;
  max-width: 280px;
  background: var(--precept-bg-light);
  border-left: 1px solid var(--precept-border-color);
  display: flex;
  flex-direction: column;
}

.precept-metadata-wrapper .precept-metadata-table,
.precept-metadata-wrapper table {
  margin: 0 !important;
  padding: 0 !important;
  border: none !important;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.precept-metadata-wrapper tbody {
  margin: 0 !important;
  padding: 0 !important;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.precept-metadata-wrapper tr {
  display: flex;
  width: 100%;
}

.precept-metadata-wrapper tr:last-child {
  flex: 1;
}

.precept-metadata-wrapper td:first-child {
  flex: 0 0 auto;
  width: 40%;
}

.precept-metadata-wrapper td:last-child {
  flex: 1;
}

/* ---------------------------------------------------------------------------
   Metadata Table
   --------------------------------------------------------------------------- */
.precept-metadata-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8em;
  margin: 0 !important;
  padding: 0;
  background: transparent;
  border: none;
}

.precept-metadata-table td {
  padding: 0.25em 0.5em;
  border-bottom: 1px solid var(--precept-border-color);
  vertical-align: top;
  color: var(--precept-text-primary);
}

.precept-metadata-table td:first-child {
  width: 40%;
  font-weight: 500;
  color: var(--precept-text-secondary);
  white-space: nowrap;
}

.precept-metadata-table td:last-child {
  background: var(--precept-bg-content);
}

.precept-metadata-table tr:last-child td {
  border-bottom: none;
}

/* Clickable link references */
.precept-link-ref {
  color: var(--precept-id-color);
  text-decoration: none;
}

.precept-link-ref:hover {
  text-decoration: underline;
}

/* ---------------------------------------------------------------------------
   Graphic Directive
   --------------------------------------------------------------------------- */
.precept-graphic {
  margin: 2em 0;
  padding: 0;
  background: var(--precept-bg-light);
  border: 1px solid var(--precept-border-color);
  border-radius: 4px;
  overflow: hidden;
}

.precept-graphic-image img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 0 auto;
}

.precept-graphic-caption {
  padding: 0.75em 1em;
  background: var(--precept-bg-header);
  border-top: 1px solid var(--precept-border-color);
  text-align: center;
  font-style: italic;
  color: var(--precept-text-secondary);
}

.precept-graphic-caption p { margin: 0; }

/* ---------------------------------------------------------------------------
   Code Directive
   --------------------------------------------------------------------------- */
.precept-code {
  margin: 2em 0;
  padding: 0;
  background: var(--precept-bg-light);
  border: 1px solid var(--precept-border-color);
  border-radius: 4px;
  overflow: hidden;
}

.precept-code-content pre {
  margin: 0;
  border-radius: 0;
  border: none;
  border-top: 1px solid var(--precept-border-color);
  border-bottom: 1px solid var(--precept-border-color);
}

.precept-code-caption {
  padding: 0.75em 1em;
  background: var(--precept-bg-header);
  border-top: 1px solid var(--precept-border-color);
  text-align: center;
  font-style: italic;
  color: var(--precept-text-secondary);
}

.precept-code-caption p { margin: 0; }

/* ---------------------------------------------------------------------------
   Admonitions
   --------------------------------------------------------------------------- */
.admonition {
  border: 1px solid var(--precept-border-color);
  border-radius: 4px;
  margin: 1em 0;
  padding: 0.75em 1em;
  background: var(--precept-bg-light);
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
.precept-status-draft { border-top: 2px solid #CFB53B; }
.precept-status-review { border-top: 2px solid #E08A00; }
.precept-status-approved { border-top: 2px solid #388E3C; }
.precept-status-implemented { border-top: 2px solid #1976D2; }
.precept-status-verified { border-top: 2px solid #7B1FA2; }
.precept-status-deprecated { border-top: 2px solid #9E9E9E; }
.precept-status-rejected { border-top: 2px solid #C62828; }

/* Status value in the metadata table */
.precept-field-status {
  font-weight: 600;
}

.precept-status-draft .precept-field-status { color: #CFB53B; }
.precept-status-review .precept-field-status { color: #E08A00; }
.precept-status-approved .precept-field-status { color: #388E3C; }
.precept-status-implemented .precept-field-status { color: #1976D2; }
.precept-status-verified .precept-field-status { color: #7B1FA2; }
.precept-status-deprecated .precept-field-status { color: #9E9E9E; }
.precept-status-rejected .precept-field-status { color: #C62828; }

/* ---------------------------------------------------------------------------
   PlantUML Diagrams
   --------------------------------------------------------------------------- */
.precept-graphic-uml {
  padding: 1em;
  text-align: center;
  background: var(--precept-bg-content);
}

.precept-graphic-uml img.plantuml-diagram {
  max-width: 100%;
  height: auto;
  display: inline-block;
}

.precept-plantuml-fallback .plantuml-notice {
  color: var(--precept-text-secondary);
  font-size: 0.9em;
  margin-bottom: 0.5em;
}

/* ---------------------------------------------------------------------------
   Syntax Highlighting (highlight.js theme adapted for VS Code)
   --------------------------------------------------------------------------- */
.hljs {
  background: var(--precept-code-block-bg);
  color: var(--precept-text-primary);
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
   Signature block
   --------------------------------------------------------------------------- */
.precept-signature {
  margin: 0;
  padding: 0.4em 0.75em;
  border-top: 1px solid var(--precept-border-color);
  font-size: 0.85em;
  color: var(--precept-text-muted, #666);
}

.precept-signature summary {
  cursor: pointer;
  font-style: italic;
}

.precept-signature-stale {
  border-top-color: #e65100;
  background: rgba(230, 81, 0, 0.06);
}

.precept-signature-stale summary {
  color: #e65100;
}

.precept-signature-table {
  margin-top: 0.5em;
  width: 100%;
  border-collapse: collapse;
}

.precept-signature-table td {
  padding: 0.25em 0.5em;
  border: none;
  vertical-align: top;
}

.precept-signature-table td:first-child {
  white-space: nowrap;
  font-weight: 600;
  width: 120px;
}

.precept-signature-value {
  word-break: break-all;
}

/* ---------------------------------------------------------------------------
   Print
   --------------------------------------------------------------------------- */
@media print {
  .precept-item, .precept-graphic, .precept-code {
    break-inside: avoid;
  }

  .precept-signature[open] {
    break-inside: avoid;
  }
}
`;
