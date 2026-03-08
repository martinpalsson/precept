/**
 * Configuration loader for Precept
 * Loads requirements configuration from precept.json
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import {
  PreceptConfig,
  ObjectType,
  Level,
  IdConfig,
  LinkType,
  Status,
  CustomFields,
  CustomFieldValue,
  HeadingStyle,
  ConfigLoadResult,
} from '../types';
import { DEFAULT_CONFIG, buildIdRegex } from './defaults';
import { getSettings } from './settingsManager';

/**
 * Locate precept.json file in the workspace
 */
export async function findPreceptJsonPath(workspaceRoot: string): Promise<string | null> {
  const possiblePaths = [
    path.join(workspaceRoot, 'docs', 'precept.json'),
    path.join(workspaceRoot, 'doc', 'precept.json'),
    path.join(workspaceRoot, 'source', 'precept.json'),
    path.join(workspaceRoot, 'precept.json'),
  ];

  for (const jsonPath of possiblePaths) {
    if (fs.existsSync(jsonPath)) {
      return jsonPath;
    }
  }

  // Search for precept.json in subdirectories (limited depth)
  try {
    const files = await vscode.workspace.findFiles('**/precept.json', '**/node_modules/**', 10);
    if (files.length > 0) {
      return files[0].fsPath;
    }
  } catch {
    // Ignore search errors
  }

  return null;
}

/**
 * Ensure the built-in 'references' link type is present.
 * This is used internally for :termref:, :paramval:, and :item: inline refs.
 */
function ensureReferencesLinkType(linkTypes: LinkType[]): LinkType[] {
  if (linkTypes.some(lt => lt.option === 'references')) {
    return linkTypes;
  }
  return [...linkTypes, { option: 'references', incoming: 'referenced_by', outgoing: 'references' }];
}

/**
 * Parse raw config JSON into typed config
 */
function parseRawConfig(raw: {
  objectTypes?: Array<Record<string, unknown>>;
  levels?: Array<Record<string, unknown>>;
  idConfig?: Record<string, unknown> | null;
  linkTypes?: Array<Record<string, unknown>>;
  statuses?: Array<Record<string, unknown>>;
  customFields?: Record<string, Array<Record<string, unknown>>>;
  headingStyles?: Array<Record<string, unknown>>;
  extraOptions?: string[];
  defaultStatus?: string;
  idRegex?: string;
  relationships?: Record<string, string>;
}): PreceptConfig {
  const objectTypes: ObjectType[] = (raw.objectTypes || []).map((t) => ({
    type: String(t.type || ''),
    title: String(t.title || t.type || ''),
    color: t.color ? String(t.color) : undefined,
    style: t.style ? String(t.style) : undefined,
  })).filter(t => t.type);

  const levels: Level[] = (raw.levels || []).map((l) => ({
    level: String(l.level || ''),
    title: String(l.title || l.level || ''),
  })).filter(l => l.level);

  const rawIdConfig = raw.idConfig;
  const idConfig: IdConfig = rawIdConfig ? {
    prefix: String(rawIdConfig.prefix || ''),
    separator: String(rawIdConfig.separator || ''),
    padding: Number(rawIdConfig.padding) || 4,
    start: Number(rawIdConfig.start) || 1,
  } : DEFAULT_CONFIG.idConfig;

  const linkTypes: LinkType[] = (raw.linkTypes || []).map((l) => ({
    option: String(l.option || ''),
    incoming: String(l.incoming || l.option || ''),
    outgoing: String(l.outgoing || l.option || ''),
    style: l.style ? String(l.style) : undefined,
  })).filter(l => l.option);

  const statuses: Status[] = (raw.statuses || []).map((s) => ({
    status: String(s.status || ''),
    color: s.color ? String(s.color) : undefined,
  })).filter(s => s.status);

  // Parse custom fields
  const customFields: CustomFields = {};
  if (raw.customFields && typeof raw.customFields === 'object') {
    for (const [fieldName, values] of Object.entries(raw.customFields)) {
      if (Array.isArray(values)) {
        customFields[fieldName] = values.map((v): CustomFieldValue => ({
          value: String(v.value || ''),
          title: String(v.title || v.value || ''),
        })).filter(v => v.value);
      }
    }
  }

  // Parse heading styles
  const headingStyles: HeadingStyle[] = (raw.headingStyles || []).map((h) => ({
    char: String(h.char || ''),
    overline: Boolean(h.overline),
  })).filter(h => h.char.length === 1);

  // Build ID regex from idConfig
  const id_regex = buildIdRegex(idConfig);

  return {
    objectTypes: objectTypes.length > 0 ? objectTypes : DEFAULT_CONFIG.objectTypes,
    levels: levels.length > 0 ? levels : DEFAULT_CONFIG.levels,
    idConfig,
    linkTypes: ensureReferencesLinkType(linkTypes.length > 0 ? linkTypes : DEFAULT_CONFIG.linkTypes),
    statuses: statuses.length > 0 ? statuses : DEFAULT_CONFIG.statuses,
    customFields,
    headingStyles: headingStyles.length > 0 ? headingStyles : DEFAULT_CONFIG.headingStyles,
    id_regex,
    traceability_item_id_regex: raw.idRegex,
    traceability_relationships: raw.relationships,
  };
}

/**
 * Load configuration from precept.json
 */
export async function loadConfigFromJson(jsonPath: string): Promise<ConfigLoadResult> {
  try {
    const content = await fs.promises.readFile(jsonPath, 'utf-8');
    const rawConfig = JSON.parse(content);
    const config = parseRawConfig(rawConfig);
    const theme = typeof rawConfig.theme === 'string' ? rawConfig.theme : undefined;
    const mobileBreakpoint = typeof rawConfig.mobileBreakpoint === 'number' ? rawConfig.mobileBreakpoint : undefined;

    return {
      success: true,
      config,
      source: 'precept.json',
      theme,
      mobileBreakpoint,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      source: 'precept.json',
    };
  }
}

/**
 * Load configuration from VS Code settings (custom types override)
 */
export function loadConfigFromSettings(): ConfigLoadResult {
  const settings = getSettings();

  if (!settings.config.overrideConfig || settings.config.customTypes.length === 0) {
    return {
      success: false,
      error: 'Settings override not enabled or no custom types defined',
      source: 'settings',
    };
  }

  const config: PreceptConfig = {
    ...DEFAULT_CONFIG,
    objectTypes: settings.config.customTypes,
    headingStyles: DEFAULT_CONFIG.headingStyles,
  };

  return {
    success: true,
    config,
    source: 'settings',
  };
}

/**
 * Main configuration loading function
 * Tries sources in order: VS Code settings (if override enabled) -> precept.json -> defaults
 */
export async function loadConfiguration(workspaceRoot: string): Promise<ConfigLoadResult> {
  // Check if settings override is enabled
  const settings = getSettings();
  if (settings.config.overrideConfig && settings.config.customTypes.length > 0) {
    const settingsResult = loadConfigFromSettings();
    if (settingsResult.success) {
      return settingsResult;
    }
  }

  // Try to find and load precept.json
  const jsonPath = await findPreceptJsonPath(workspaceRoot);
  if (jsonPath) {
    const jsonResult = await loadConfigFromJson(jsonPath);
    if (jsonResult.success) {
      return jsonResult; // includes theme if present
    }
    // precept.json exists but failed to parse — report the failure
    return {
      success: false,
      error: jsonResult.error,
      source: 'precept.json',
      failedConfigPath: jsonPath,
    };
  }

  // No precept.json found — defaults are expected
  return {
    success: true,
    config: DEFAULT_CONFIG,
    source: 'defaults',
  };
}

/**
 * Show a warning dialog when precept.json exists but failed to parse.
 * Returns the user's choice.
 */
export async function handleBrokenConfig(
  error: string,
  failedConfigPath: string
): Promise<'edit' | 'defaults' | 'cancel'> {
  const editFile = 'Edit File';
  const useDefaults = 'Use Defaults';

  const choice = await vscode.window.showWarningMessage(
    `Failed to parse precept.json: ${error}`,
    editFile,
    useDefaults
  );

  if (choice === editFile) {
    const doc = await vscode.workspace.openTextDocument(failedConfigPath);
    await vscode.window.showTextDocument(doc);
    return 'edit';
  }
  if (choice === useDefaults) {
    return 'defaults';
  }
  return 'cancel';
}

/**
 * Create a file watcher for precept.json changes
 */
export function createConfigWatcher(
  workspaceRoot: string,
  onConfigChange: () => void
): vscode.Disposable {
  const watcher = vscode.workspace.createFileSystemWatcher(
    new vscode.RelativePattern(workspaceRoot, '**/precept.json')
  );

  const disposables = [
    watcher,
    watcher.onDidChange(onConfigChange),
    watcher.onDidCreate(onConfigChange),
    watcher.onDidDelete(onConfigChange),
  ];

  return vscode.Disposable.from(...disposables);
}

/**
 * Configuration manager singleton
 */
export class ConfigurationManager {
  private static instance: ConfigurationManager;
  private config: PreceptConfig = DEFAULT_CONFIG;
  private configSource: 'precept.json' | 'settings' | 'defaults' = 'defaults';
  private preceptJsonPath: string | null = null;
  private themeName: string = 'default';
  private pendingErrorDialog: boolean = false;
  private errorDismissed: boolean = false;
  private fallbackDefaults: boolean = false;
  private disposables: vscode.Disposable[] = [];
  private onConfigChangeEmitter = new vscode.EventEmitter<PreceptConfig>();
  private onConfigErrorEmitter = new vscode.EventEmitter<string>();

  public readonly onConfigChange = this.onConfigChangeEmitter.event;
  public readonly onConfigError = this.onConfigErrorEmitter.event;

  private constructor() {}

  public static getInstance(): ConfigurationManager {
    if (!ConfigurationManager.instance) {
      ConfigurationManager.instance = new ConfigurationManager();
    }
    return ConfigurationManager.instance;
  }

  /**
   * Initialize the configuration manager
   */
  public async initialize(workspaceRoot: string): Promise<void> {
    // Load initial configuration (silent — extension.ts handles the startup dialog)
    await this.silentReload(workspaceRoot);

    // Set up precept.json watcher
    this.disposables.push(
      createConfigWatcher(workspaceRoot, () => this.reload(workspaceRoot))
    );

    // Set up settings change listener
    this.disposables.push(
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('requirements.config')) {
          this.reload(workspaceRoot);
        }
      })
    );
  }

  /**
   * Reload configuration
   */
  public async reload(workspaceRoot: string): Promise<void> {
    const result = await loadConfiguration(workspaceRoot);

    if (result.success && result.config) {
      this.pendingErrorDialog = false;
      this.errorDismissed = false;
      this.fallbackDefaults = false;
      this.config = result.config;
      this.configSource = result.source;
      this.themeName = result.theme || 'default';
      this.onConfigChangeEmitter.fire(this.config);
      return;
    }

    // precept.json exists but is broken
    if (result.failedConfigPath && !this.pendingErrorDialog && !this.errorDismissed) {
      this.pendingErrorDialog = true;
      this.onConfigErrorEmitter.fire(result.error || 'Unknown parse error');

      const choice = await handleBrokenConfig(
        result.error || 'Unknown parse error',
        result.failedConfigPath
      );
      this.pendingErrorDialog = false;
      this.errorDismissed = true;

      if (choice === 'defaults') {
        this.config = DEFAULT_CONFIG;
        this.configSource = 'defaults';
        this.themeName = 'default';
        this.fallbackDefaults = true;
        this.onConfigChangeEmitter.fire(this.config);
      }
      // 'edit' and 'cancel': keep current config unchanged.
      // The file watcher will re-trigger reload() when the user saves fixes.
    }
  }

  /**
   * Reload without showing a dialog — used by the file watcher.
   * Updates status bar via events only.
   */
  private async silentReload(workspaceRoot: string): Promise<void> {
    const result = await loadConfiguration(workspaceRoot);

    if (result.success && result.config) {
      this.fallbackDefaults = false;
      this.errorDismissed = false;
      this.config = result.config;
      this.configSource = result.source;
      this.themeName = result.theme || 'default';
      this.onConfigChangeEmitter.fire(this.config);
      return;
    }

    // precept.json is still broken — update status bar but don't show a dialog
    if (result.failedConfigPath) {
      this.onConfigErrorEmitter.fire(result.error || 'Unknown parse error');
    }
  }

  /**
   * Get current configuration
   */
  public getConfig(): PreceptConfig {
    return this.config;
  }

  /**
   * Get configuration source
   */
  public getConfigSource(): 'precept.json' | 'settings' | 'defaults' {
    return this.configSource;
  }

  /**
   * Get the selected theme name
   */
  public getThemeName(): string {
    return this.themeName;
  }

  /**
   * Whether the extension is using default config because precept.json failed to parse
   */
  public isUsingFallbackDefaults(): boolean {
    return this.fallbackDefaults;
  }

  /**
   * Mark that we're using fallback defaults (called from activation when user chooses defaults)
   */
  public setFallbackDefaults(value: boolean): void {
    this.fallbackDefaults = value;
  }

  /**
   * Get precept.json path if found
   */
  public getPreceptJsonPath(): string | null {
    return this.preceptJsonPath;
  }

  /**
   * Dispose resources
   */
  public dispose(): void {
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
    this.onConfigChangeEmitter.dispose();
    this.onConfigErrorEmitter.dispose();
  }
}
