/**
 * RST live preview webview provider
 *
 * Creates a side-panel webview that renders the active RST file using the
 * TypeScript renderer. Updates live as the user types.
 */

import * as crypto from 'crypto';
import * as vscode from 'vscode';
import * as path from 'path';
import { parseRstDocument } from '../renderer/rstFullParser';
import { renderDocument } from '../renderer/htmlEmitter';
import { RenderContext } from '../renderer/directiveRenderer';
import { PreceptConfig } from '../types';
import { IndexBuilder } from '../indexing';
import { PREVIEW_CSS } from './previewStyles';
import { getTheme, generateThemeVars } from '../themes';

/**
 * Manages the RST preview webview panel.
 */
export class RstPreviewProvider implements vscode.Disposable {
  private panel: vscode.WebviewPanel | undefined;
  private config: PreceptConfig;
  private indexBuilder: IndexBuilder;
  private disposables: vscode.Disposable[] = [];
  private updateTimeout: ReturnType<typeof setTimeout> | undefined;
  private scrollTimeout: ReturnType<typeof setTimeout> | undefined;
  private currentUri: vscode.Uri | undefined;
  private themeName: string;

  constructor(config: PreceptConfig, indexBuilder: IndexBuilder, themeName: string = 'default') {
    this.config = config;
    this.indexBuilder = indexBuilder;
    this.themeName = themeName;
  }

  /**
   * Update the config (called when config changes).
   */
  updateConfig(config: PreceptConfig): void {
    this.config = config;
    this.scheduleUpdate();
  }

  /**
   * Update the theme (called when config changes).
   */
  updateTheme(themeName: string): void {
    this.themeName = themeName;
    this.scheduleUpdate();
  }

  /**
   * Restore a previously serialized webview panel (called on VS Code restart).
   */
  restorePanel(panel: vscode.WebviewPanel): void {
    this.panel = panel;

    panel.onDidDispose(() => {
      this.panel = undefined;
    }, null, this.disposables);

    this.setupPanelListeners();

    // Show loading state immediately
    panel.webview.html = this.wrapHtml(
      '<p style="text-align:center;opacity:0.5;margin-top:2em;">Loading preview…</p>'
    );

    // Try to render now if a document is already available
    if (this.tryRenderFromOpenDocuments()) {
      return;
    }

    // Documents may not be loaded yet — wait for one to open
    const onOpen = vscode.workspace.onDidOpenTextDocument(doc => {
      if (doc.languageId === 'restructuredtext') {
        onOpen.dispose();
        this.updatePreview(doc);
      }
    });
    this.disposables.push(onOpen);

    // Also listen for editor activation (covers the case where the doc
    // is already open but wasn't enumerable yet)
    const onEditor = vscode.window.onDidChangeActiveTextEditor(editor => {
      if (editor && editor.document.languageId === 'restructuredtext') {
        onEditor.dispose();
        this.updatePreview(editor.document);
      }
    });
    this.disposables.push(onEditor);
  }

  /**
   * Try to render from currently open documents. Returns true if successful.
   */
  private tryRenderFromOpenDocuments(): boolean {
    const editor = vscode.window.visibleTextEditors.find(
      e => e.document.languageId === 'restructuredtext'
    );
    if (editor) {
      this.updatePreview(editor.document);
      return true;
    }

    const rstDoc = vscode.workspace.textDocuments.find(
      doc => doc.languageId === 'restructuredtext'
    );
    if (rstDoc) {
      this.updatePreview(rstDoc);
      return true;
    }

    return false;
  }

  /**
   * Open or reveal the preview panel for the active RST editor.
   */
  open(): void {
    let editor = vscode.window.activeTextEditor;

    // If the active editor isn't RST, try to find an open RST document
    if (!editor || editor.document.languageId !== 'restructuredtext') {
      const rstDoc = vscode.workspace.textDocuments.find(
        doc => doc.languageId === 'restructuredtext'
      );
      if (rstDoc) {
        // Show the RST document so it becomes the active editor
        vscode.window.showTextDocument(rstDoc, vscode.ViewColumn.One, true).then(shown => {
          editor = shown;
          this.createOrRevealPanel(editor);
        });
        return;
      }
      vscode.window.showInformationMessage('Open an RST file to preview.');
      return;
    }

    this.createOrRevealPanel(editor);
  }

  /**
   * Create the webview panel or reveal it if already open.
   */
  private createOrRevealPanel(editor: vscode.TextEditor): void {
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.Beside, true);
      this.updatePreview(editor.document);
      return;
    }

    const workspaceRoots = (vscode.workspace.workspaceFolders || [])
      .map(f => f.uri);

    this.panel = vscode.window.createWebviewPanel(
      'preceptPreview',
      'RST Preview',
      { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
      {
        enableScripts: true,
        localResourceRoots: workspaceRoots,
      },
    );

    this.panel.onDidDispose(() => {
      this.panel = undefined;
    }, null, this.disposables);

    this.setupPanelListeners();
    this.updatePreview(editor.document);
  }

  /**
   * Set up event listeners for the webview panel.
   */
  private setupPanelListeners(): void {
    // Subscribe to document changes (live update)
    this.disposables.push(
      vscode.workspace.onDidChangeTextDocument(e => {
        if (
          e.document.languageId === 'restructuredtext' &&
          e.document.uri.toString() === this.currentUri?.toString()
        ) {
          this.scheduleUpdate();
        }
      }),
    );

    // Subscribe to active editor changes
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor && editor.document.languageId !== 'restructuredtext') {
          return;
        }
        if (editor && editor.document.languageId === 'restructuredtext') {
          this.updatePreview(editor.document);
        }
      }),
    );

    // Subscribe to cursor changes for scroll sync
    this.disposables.push(
      vscode.window.onDidChangeTextEditorSelection(event => {
        if (event.textEditor.document.languageId !== 'restructuredtext') return;
        if (event.textEditor.document.uri.toString() !== this.currentUri?.toString()) return;
        this.scheduleScrollSync(event.textEditor);
      }),
    );

    // Subscribe to index updates (incoming links, paramval, etc.)
    this.disposables.push(
      this.indexBuilder.onIndexUpdate(() => {
        this.scheduleUpdate();
      }),
    );
  }

  /**
   * Schedule a debounced preview update (300ms).
   */
  private scheduleUpdate(): void {
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }
    this.updateTimeout = setTimeout(() => {
      const editor = vscode.window.activeTextEditor;
      if (editor && editor.document.languageId === 'restructuredtext') {
        this.updatePreview(editor.document);
      }
    }, 300);
  }

  /**
   * Schedule a debounced scroll sync (100ms).
   */
  private scheduleScrollSync(editor: vscode.TextEditor): void {
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }
    this.scrollTimeout = setTimeout(() => {
      this.syncScroll(editor);
    }, 100);
  }

  /**
   * Find the nearest item/section at the cursor and tell the webview to scroll to it.
   */
  private syncScroll(editor: vscode.TextEditor): void {
    if (!this.panel) return;

    const line = editor.selection.active.line + 1; // 1-based
    const filePath = editor.document.uri.fsPath;

    // Try to find a requirement item at the cursor
    const items = this.indexBuilder.getRequirementsByFile(filePath);
    const match = items.find(r =>
      r.location.line <= line && (r.location.endLine ?? r.location.line) >= line
    );

    if (match) {
      // Determine the anchor prefix based on type
      const type = match.type;
      let prefix = 'req-';
      if (type === 'graphic') prefix = 'fig-';
      if (type === 'code') prefix = 'code-';
      this.panel.webview.postMessage({ type: 'scrollTo', id: `${prefix}${match.id}` });
      return;
    }

    // Fallback: estimate scroll position as a fraction of the document
    const totalLines = editor.document.lineCount;
    const fraction = totalLines > 1 ? (line - 1) / (totalLines - 1) : 0;
    this.panel.webview.postMessage({ type: 'scrollToFraction', fraction });
  }

  /**
   * Render and push HTML to the webview.
   */
  private updatePreview(document: vscode.TextDocument): void {
    if (!this.panel) return;

    this.currentUri = document.uri;

    const fileName = path.basename(document.uri.fsPath);
    this.panel.title = `Preview: ${fileName}`;

    const rstText = document.getText();
    const bodyHtml = this.renderRst(rstText, document.uri);
    const resolvedHtml = this.resolveLocalImages(bodyHtml, document.uri);

    this.panel.webview.html = this.wrapHtml(resolvedHtml);
  }

  /**
   * Parse and render RST text to HTML body content.
   */
  private renderRst(text: string, uri: vscode.Uri): string {
    try {
      const doc = parseRstDocument(text, this.config.headingStyles);
      const index = this.indexBuilder.getIndex();
      const ctx: RenderContext = {
        config: this.config,
        index: index || undefined,
        basePath: path.dirname(uri.fsPath),
        plantumlServer: 'https://www.plantuml.com/plantuml/svg/',
      };
      return renderDocument(doc, ctx);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return `<div class="render-error"><p><strong>Render error:</strong></p><pre>${escapeHtml(msg)}</pre></div>`;
    }
  }

  /**
   * Rewrite relative image src attributes to webview-safe URIs.
   */
  private resolveLocalImages(html: string, documentUri: vscode.Uri): string {
    if (!this.panel) return html;
    const baseDir = path.dirname(documentUri.fsPath);
    const webview = this.panel.webview;

    return html.replace(
      /(<img\s[^>]*src=")([^"]+)(")/g,
      (_match, prefix, src, suffix) => {
        // Skip data URIs, http(s), and already-resolved webview URIs
        if (/^(data:|https?:|vscode-resource:)/i.test(src)) {
          return `${prefix}${src}${suffix}`;
        }
        // Resolve relative path to absolute, then convert to webview URI
        const absPath = path.resolve(baseDir, src);
        const webviewUri = webview.asWebviewUri(vscode.Uri.file(absPath));
        return `${prefix}${webviewUri}${suffix}`;
      }
    );
  }

  /**
   * Wrap body HTML in a full HTML page with styles and CSP.
   */
  private wrapHtml(body: string): string {
    // Generate a unique nonce for this render pass
    const nonce = crypto.randomBytes(16).toString('base64');

    // CSP: nonce-based script policy, inline styles, images from PlantUML server
    const csp = [
      "default-src 'none'",
      "style-src 'unsafe-inline'",
      `script-src 'nonce-${nonce}'`,
      `img-src data: ${this.panel!.webview.cspSource} https://www.plantuml.com https:`,
    ].join('; ');

    // Detect VS Code colour theme kind for light/dark variant
    const themeKind = vscode.window.activeColorTheme.kind;
    const isDark = themeKind === vscode.ColorThemeKind.Dark ||
                   themeKind === vscode.ColorThemeKind.HighContrast;
    const mode = isDark ? 'dark' : 'light';

    const theme = getTheme(this.themeName);
    const themeVarsCss = generateThemeVars(theme, mode);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RST Preview</title>
  <style>${themeVarsCss}\n${PREVIEW_CSS}</style>
</head>
<body>
${body}
<script nonce="${nonce}">
(function() {
  const vscode = acquireVsCodeApi();
  window.addEventListener('message', function(event) {
    const msg = event.data;
    if (msg.type === 'scrollTo') {
      const el = document.getElementById(msg.id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else if (msg.type === 'scrollToFraction') {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (maxScroll > 0) {
        window.scrollTo({ top: maxScroll * msg.fraction, behavior: 'smooth' });
      }
    }
  });
})();
</script>
</body>
</html>`;
  }

  dispose(): void {
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }
    if (this.panel) {
      this.panel.dispose();
    }
    for (const d of this.disposables) {
      d.dispose();
    }
    this.disposables = [];
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
