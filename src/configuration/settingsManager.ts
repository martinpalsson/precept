/**
 * VS Code settings manager for extension configuration
 */

import * as vscode from 'vscode';
import { ExtensionSettings, TreeViewGroupBy, ObjectType } from '../types';

const SECTION = 'requirements';

/**
 * Get all extension settings from VS Code configuration
 */
export function getSettings(): ExtensionSettings {
  const config = vscode.workspace.getConfiguration(SECTION);

  return {
    validation: {
      automatic: config.get<boolean>('validation.automatic', true),
      onSave: config.get<boolean>('validation.onSave', true),
      debounceMs: config.get<number>('validation.debounceMs', 500),
      checkCircularDeps: config.get<boolean>('validation.checkCircularDeps', false),
      checkCoverage: config.get<boolean>('validation.checkCoverage', false),
    },
    treeView: {
      groupBy: config.get<TreeViewGroupBy>('treeView.groupBy', 'type'),
      showStatusIcons: config.get<boolean>('treeView.showStatusIcons', true),
    },
    indexing: {
      maxFiles: config.get<number>('indexing.maxFiles', 1000),
      excludePatterns: config.get<string[]>('indexing.excludePatterns', ['**/build/**', '**/_build/**']),
    },
    config: {
      overrideConfig: config.get<boolean>('config.overrideConfig', false),
      customTypes: config.get<ObjectType[]>('config.customTypes', []),
    },
  };
}

/**
 * Update a specific setting
 */
export async function updateSetting<T>(
  key: string,
  value: T,
  target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Workspace
): Promise<void> {
  const config = vscode.workspace.getConfiguration(SECTION);
  await config.update(key, value, target);
}

/**
 * Create a configuration change listener
 */
export function onSettingsChange(
  callback: (e: vscode.ConfigurationChangeEvent) => void
): vscode.Disposable {
  return vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration(SECTION)) {
      callback(e);
    }
  });
}

/**
 * Get a specific setting value
 */
export function getSetting<T>(key: string, defaultValue: T): T {
  const config = vscode.workspace.getConfiguration(SECTION);
  return config.get<T>(key, defaultValue);
}

/**
 * Check if a specific setting has been changed
 */
export function settingAffected(
  e: vscode.ConfigurationChangeEvent,
  settingKey: string
): boolean {
  return e.affectsConfiguration(`${SECTION}.${settingKey}`);
}

/**
 * Get exclude patterns as glob patterns
 */
export function getExcludePatterns(): string[] {
  return getSettings().indexing.excludePatterns;
}

/**
 * Get validation debounce delay
 */
export function getValidationDebounceMs(): number {
  return getSettings().validation.debounceMs;
}

/**
 * Check if automatic validation is enabled
 */
export function isAutoValidationEnabled(): boolean {
  return getSettings().validation.automatic;
}

/**
 * Check if validation on save is enabled
 */
export function isValidateOnSaveEnabled(): boolean {
  return getSettings().validation.onSave;
}

/**
 * Get tree view grouping preference
 */
export function getTreeViewGroupBy(): TreeViewGroupBy {
  return getSettings().treeView.groupBy;
}

/**
 * Check if status icons should be shown
 */
export function shouldShowStatusIcons(): boolean {
  return getSettings().treeView.showStatusIcons;
}
