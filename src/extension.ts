/**
 * Rigr - Requirements Management System - VS Code Extension
 *
 * Main entry point for the extension.
 */

import * as vscode from 'vscode';
import {
  ConfigurationManager,
  loadConfiguration,
  onSettingsChange,
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
} from './commands';
import { RigrConfig } from './types';
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

/**
 * Update status bar with current state
 */
function updateStatusBar(config: RigrConfig, source: string, count: number): void {
  const typeCount = config.objectTypes.length;
  const levelCount = config.levels.length;
  statusBarItem.text = `$(checklist) Requirements: ${count} objects`;
  statusBarItem.tooltip = `Requirements indexed: ${count}\nObject types: ${typeCount}\nLevels: ${levelCount}\nSource: ${source}`;
  statusBarItem.show();
}

/**
 * Show config error in status bar
 */
function showConfigError(error: string): void {
  statusBarItem.text = '$(error) Requirements: Config Error';
  statusBarItem.tooltip = `Configuration error: ${error}\nClick to reload`;
  statusBarItem.command = 'requirements.reloadConfiguration';
  statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
  statusBarItem.show();
}

/**
 * Update all providers with new config
 */
function updateProvidersConfig(config: RigrConfig): void {
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
  if (indexBuilder) {
    indexBuilder.updateConfig(config);
  }
}

/**
 * Extension activation
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  console.log('Rigr Requirements extension is activating...');

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
  statusBarItem.text = '$(sync~spin) Requirements: Loading...';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // Load configuration
  let config: RigrConfig = DEFAULT_CONFIG;
  try {
    const result = await loadConfiguration(workspaceRoot);
    if (result.success && result.config) {
      config = result.config;
      console.log(`Loaded config from ${result.source}`);
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
  const docCommands = registerDocumentationCommands(context);
  docCommands.forEach(cmd => context.subscriptions.push(cmd));

  // Register reload configuration command
  context.subscriptions.push(
    vscode.commands.registerCommand('requirements.reloadConfiguration', async () => {
      statusBarItem.text = '$(sync~spin) Requirements: Reloading...';

      try {
        const result = await loadConfiguration(workspaceRoot);
        if (result.success && result.config) {
          config = result.config;
          updateProvidersConfig(config);
          cacheManager.updateConfig(config);

          // Rebuild index
          await vscode.window.withProgress(
            {
              location: vscode.ProgressLocation.Window,
              title: 'Re-indexing requirements...',
            },
            async (progress) => {
              await indexBuilder.buildFullIndex(workspaceRoot, progress);
            }
          );

          updateStatusBar(config, result.source, indexBuilder.getCount());
          vscode.window.showInformationMessage(
            `Requirements configuration reloaded from ${result.source}`
          );
        } else {
          showConfigError(result.error || 'Unknown error');
        }
      } catch (error) {
        showConfigError(error instanceof Error ? error.message : String(error));
      }
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

  // Listen for config changes
  context.subscriptions.push(
    configManager.onConfigChange((newConfig) => {
      config = newConfig;
      updateProvidersConfig(config);
      updateStatusBar(config, configManager.getConfigSource(), indexBuilder.getCount());
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

  console.log('Rigr Requirements extension is now active');
}

/**
 * Extension deactivation
 */
export function deactivate(): void {
  console.log('Rigr Requirements extension is deactivating...');

  // Save cache before deactivating
  if (cacheManager) {
    cacheManager.save();
  }
}
