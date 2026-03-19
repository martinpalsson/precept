/**
 * Precept - Requirements Management System - VS Code Extension
 *
 * Main entry point for the extension.
 */

import * as vscode from 'vscode';
import {
  ConfigurationManager,
  loadConfiguration,
  handleBrokenConfig,
  onSettingsChange,
  updateSetting,
} from './configuration';
import {
  IndexBuilder,
  IndexCacheManager,
} from './indexing';
import {
  registerCompletionProvider,
  registerHoverProvider,
  registerDefinitionProvider,
  registerReferenceProvider,
  registerDiagnosticProvider,
  registerCodeActionProvider,
  RequirementCompletionProvider,
  RequirementHoverProvider,
  RequirementDefinitionProvider,
  RequirementReferenceProvider,
  RequirementDiagnosticProvider,
  RequirementCodeActionProvider,
} from './providers';
import { registerTreeView, RequirementTreeDataProvider, registerRelationshipExplorer, RelationshipExplorerProvider } from './views';
import {
  registerValidationCommand,
  registerBaselineCommands,
  registerGenerateReportCommand,
  registerCreateProjectCommand,
  registerDocumentationCommands,
  registerSigningCommands,
  SigningCommandManager,
  registerInsertImageCommand,
} from './commands';
import { RstPreviewProvider } from './preview';
import { ImagePasteProvider } from './providers';
import { PreceptConfig } from './types';
import { DEFAULT_CONFIG } from './configuration/defaults';

let statusBarItem: vscode.StatusBarItem;
let indexBuilder: IndexBuilder;
let cacheManager: IndexCacheManager;
let configManager: ConfigurationManager;

// Providers (for config updates)
let completionProvider: RequirementCompletionProvider;
let hoverProvider: RequirementHoverProvider;
let definitionProvider: RequirementDefinitionProvider;
let referenceProvider: RequirementReferenceProvider;
let diagnosticProvider: RequirementDiagnosticProvider;
let codeActionProvider: RequirementCodeActionProvider;
let treeViewProvider: RequirementTreeDataProvider;
let relationshipExplorerProvider: RelationshipExplorerProvider;
let signingManager: SigningCommandManager;
let pasteProvider: ImagePasteProvider;
let previewProvider: RstPreviewProvider;

/**
 * Update status bar with current state
 */
function updateStatusBar(config: PreceptConfig, source: string, count: number): void {
  const typeCount = config.objectTypes.length;
  const levelCount = config.levels.length;

  if (configManager && configManager.isUsingFallbackDefaults()) {
    statusBarItem.text = `$(warning) Precept: ${count} objects (defaults)`;
    statusBarItem.tooltip = `Precept — Using default configuration (precept.json is broken)\nRequirements indexed: ${count}\nObject types: ${typeCount}\nLevels: ${levelCount}\nClick to retry loading configuration`;
    statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    statusBarItem.command = 'requirements.reloadConfiguration';
  } else if (configManager && configManager.isConfigIncomplete()) {
    statusBarItem.text = `$(warning) Precept: ${count} objects (config incomplete)`;
    statusBarItem.tooltip = `Precept — Your precept.json is missing configuration fields\nRequirements indexed: ${count}\nObject types: ${typeCount}\nLevels: ${levelCount}\nClick to reload and add missing fields`;
    statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    statusBarItem.command = 'requirements.reloadConfiguration';
  } else {
    statusBarItem.text = `$(checklist) Precept: ${count} objects`;
    statusBarItem.tooltip = `Precept — Requirements indexed: ${count}\nObject types: ${typeCount}\nLevels: ${levelCount}\nSource: ${source}`;
    statusBarItem.backgroundColor = undefined;
    statusBarItem.command = undefined;
  }
  statusBarItem.show();
}

/**
 * Show config error in status bar
 */
function showConfigError(error: string): void {
  statusBarItem.text = '$(error) Precept: Config Error';
  statusBarItem.tooltip = `Precept — Configuration error: ${error}\nClick to reload`;
  statusBarItem.command = 'requirements.reloadConfiguration';
  statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
  statusBarItem.show();
}

/**
 * Update all providers with new config
 */
function updateProvidersConfig(config: PreceptConfig): void {
  if (completionProvider) {
    completionProvider.updateConfig(config);
  }
  if (hoverProvider) {
    hoverProvider.updateConfig(config);
  }
  if (definitionProvider) {
    definitionProvider.updateConfig(config);
  }
  if (referenceProvider) {
    referenceProvider.updateConfig(config);
  }
  if (diagnosticProvider) {
    diagnosticProvider.updateConfig(config);
  }
  if (codeActionProvider) {
    codeActionProvider.updateConfig(config);
  }
  if (treeViewProvider) {
    treeViewProvider.updateConfig(config);
  }
  if (relationshipExplorerProvider) {
    relationshipExplorerProvider.updateConfig(config);
  }
  if (signingManager) {
    signingManager.updateConfig(config);
  }
  if (pasteProvider) {
    pasteProvider.updateConfig(config);
  }
  if (previewProvider) {
    previewProvider.updateConfig(config);
  }
  if (indexBuilder) {
    indexBuilder.updateConfig(config);
  }
}

/**
 * Extension activation
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  console.log('Precept Requirements extension is activating...');

  // Register webview serializer BEFORE any awaits — VS Code deserializes
  // panels synchronously during activation and will discard them if no
  // serializer is registered in time.
  let deferredPanel: vscode.WebviewPanel | undefined;
  context.subscriptions.push(
    vscode.window.registerWebviewPanelSerializer('preceptPreview', {
      async deserializeWebviewPanel(panel: vscode.WebviewPanel, _state: unknown) {
        if (previewProvider) {
          previewProvider.restorePanel(panel);
        } else {
          // Provider not ready yet — stash the panel for later
          deferredPanel = panel;
          panel.webview.html = '<html><body><p style="text-align:center;opacity:0.5;margin-top:2em;">Loading preview…</p></body></html>';
        }
      },
    })
  );

  // Get workspace root
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceRoot) {
    vscode.window.showWarningMessage(
      'Requirements extension requires an open workspace folder'
    );
    return;
  }

  // Create status bar item
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
  );
  statusBarItem.text = '$(sync~spin) Precept: Loading...';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // Load configuration
  let config: PreceptConfig = DEFAULT_CONFIG;
  let activationFallback = false;
  try {
    const result = await loadConfiguration(workspaceRoot);
    if (result.success && result.config) {
      config = result.config;
      console.log(`Loaded config from ${result.source}`);
    } else if (result.failedConfigPath) {
      // precept.json exists but is broken — warn the user
      showConfigError(result.error || 'Unknown error');
      const choice = await handleBrokenConfig(
        result.error || 'Unknown parse error',
        result.failedConfigPath
      );
      if (choice === 'defaults') {
        config = DEFAULT_CONFIG;
        activationFallback = true;
      }
      // 'edit' / 'cancel': keep DEFAULT_CONFIG, file watcher will re-trigger
    } else {
      console.warn(`Failed to load config: ${result.error}`);
      showConfigError(result.error || 'Unknown error');
    }
  } catch (error) {
    console.error('Error loading configuration:', error);
    showConfigError(error instanceof Error ? error.message : String(error));
  }

  // Create configuration manager
  configManager = ConfigurationManager.getInstance();
  await configManager.initialize(workspaceRoot);
  if (activationFallback) {
    configManager.setFallbackDefaults(true);
  }
  context.subscriptions.push(configManager);

  // Create index builder
  indexBuilder = new IndexBuilder(config);
  context.subscriptions.push(indexBuilder);

  // Create cache manager
  cacheManager = new IndexCacheManager(workspaceRoot, indexBuilder, config);
  context.subscriptions.push(cacheManager);

  // Try to load from cache
  const cacheLoaded = await cacheManager.load();

  if (!cacheLoaded) {
    // Build full index with progress
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Window,
        title: 'Indexing requirements...',
      },
      async (progress) => {
        await indexBuilder.buildFullIndex(workspaceRoot, progress);
      }
    );
  }

  // Set up file watchers
  indexBuilder.setupFileWatchers(workspaceRoot);

  // Register providers
  completionProvider = registerCompletionProvider(context, indexBuilder, config);
  hoverProvider = registerHoverProvider(context, indexBuilder, config);
  definitionProvider = registerDefinitionProvider(context, indexBuilder, config);
  referenceProvider = registerReferenceProvider(context, indexBuilder, config);
  diagnosticProvider = registerDiagnosticProvider(context, indexBuilder, config);
  codeActionProvider = registerCodeActionProvider(context, indexBuilder, config);

  // Register tree view
  treeViewProvider = registerTreeView(context, indexBuilder, config);

  // Register relationship explorer
  relationshipExplorerProvider = registerRelationshipExplorer(context, indexBuilder, config);

  // Register commands
  context.subscriptions.push(
    registerValidationCommand(context, indexBuilder, config)
  );

  registerBaselineCommands(context, indexBuilder, config);
  context.subscriptions.push(
    registerGenerateReportCommand(context, indexBuilder, config)
  );
  context.subscriptions.push(
    registerCreateProjectCommand(context)
  );

  // Register documentation commands
  const docCommands = registerDocumentationCommands(context, indexBuilder);
  docCommands.forEach(cmd => context.subscriptions.push(cmd));

  // Register signing commands
  signingManager = registerSigningCommands(context, indexBuilder, config);

  // Register insert image command
  const imageCommands = registerInsertImageCommand(context, indexBuilder, config);
  imageCommands.forEach(cmd => context.subscriptions.push(cmd));

  // Register image paste provider (clipboard)
  const rstSelector: vscode.DocumentSelector = { language: 'restructuredtext', scheme: 'file' };
  pasteProvider = new ImagePasteProvider(config, indexBuilder);
  context.subscriptions.push(
    vscode.languages.registerDocumentPasteEditProvider(
      rstSelector,
      pasteProvider,
      {
        pasteMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
        providedPasteEditKinds: [vscode.DocumentDropOrPasteEditKind.Empty.append('precept', 'image')],
      },
    )
  );

  // Register RST preview (pass theme from initial config load)
  const initialTheme = configManager.getThemeName();
  previewProvider = new RstPreviewProvider(config, indexBuilder, initialTheme);
  context.subscriptions.push(previewProvider);
  context.subscriptions.push(
    vscode.commands.registerCommand('requirements.openPreview', () => {
      previewProvider.open();
    })
  );

  // If a preview panel was deserialized before the provider was ready, adopt it now
  if (deferredPanel) {
    previewProvider.restorePanel(deferredPanel);
    deferredPanel = undefined;
  }

  // Register reload configuration command
  context.subscriptions.push(
    vscode.commands.registerCommand('requirements.reloadConfiguration', async () => {
      statusBarItem.text = '$(sync~spin) Precept: Reloading...';
      configManager.resetRepairDismissed();

      // Delegate to ConfigurationManager — handles broken config dialogs + migration
      await configManager.reload(workspaceRoot);

      // The onConfigChange listener already updates providers and status bar.
      // Now rebuild the index with the (possibly updated) config.
      config = configManager.getConfig();
      updateProvidersConfig(config);
      cacheManager.updateConfig(config);

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Window,
          title: 'Re-indexing requirements...',
        },
        async (progress) => {
          await indexBuilder.buildFullIndex(workspaceRoot, progress);
        }
      );

      updateStatusBar(config, configManager.getConfigSource(), indexBuilder.getCount());
    })
  );

  // Register create requirement command (for quick fix)
  context.subscriptions.push(
    vscode.commands.registerCommand('requirements.createRequirement', async (id: string) => {
      vscode.window.showInformationMessage(
        `Create requirement '${id}' - Use a snippet to create a new requirement with this ID`
      );
    })
  );

  // Register group-by quick pick command
  context.subscriptions.push(
    vscode.commands.registerCommand('requirements.changeGroupBy', async () => {
      const builtInModes = [
        { label: 'Type', value: 'type' },
        { label: 'Level', value: 'level' },
        { label: 'File', value: 'file' },
        { label: 'Status', value: 'status' },
      ];

      const customFieldItems = Object.keys(config.customFields).map(field => ({
        label: field.charAt(0).toUpperCase() + field.slice(1),
        value: field,
        description: 'custom field',
      }));

      const items = [...builtInModes, ...customFieldItems];

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Group items by...',
      });

      if (selected) {
        await updateSetting('treeView.groupBy', selected.value);
      }
    })
  );

  // Listen for config changes
  context.subscriptions.push(
    configManager.onConfigChange((newConfig) => {
      config = newConfig;
      updateProvidersConfig(config);
      // Update preview theme from config manager
      if (previewProvider) {
        previewProvider.updateTheme(configManager.getThemeName());
      }
      updateStatusBar(config, configManager.getConfigSource(), indexBuilder.getCount());
    })
  );

  // Listen for config errors (e.g. broken precept.json detected by file watcher)
  context.subscriptions.push(
    configManager.onConfigError((error) => {
      showConfigError(error);
    })
  );

  // Listen for settings changes
  context.subscriptions.push(
    onSettingsChange(() => {
      // Tree view and validation settings may have changed
      treeViewProvider.refresh();
      diagnosticProvider.revalidateAll();
    })
  );

  // Update status bar with index info
  indexBuilder.onIndexUpdate(() => {
    updateStatusBar(config, configManager.getConfigSource(), indexBuilder.getCount());
  });

  // Initial status bar update
  updateStatusBar(config, configManager.getConfigSource(), indexBuilder.getCount());

  // Validate open documents
  for (const document of vscode.workspace.textDocuments) {
    if (document.languageId === 'restructuredtext') {
      diagnosticProvider.validateDocument(document);
    }
  }

  console.log('Precept Requirements extension is now active');
}

/**
 * Extension deactivation
 */
export function deactivate(): void {
  console.log('Precept Requirements extension is deactivating...');

  // Save cache before deactivating
  if (cacheManager) {
    cacheManager.save();
  }
}
