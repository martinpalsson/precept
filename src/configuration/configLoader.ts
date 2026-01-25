/**
 * Configuration loader for Rigr conf.py
 * Extracts requirements configuration using Python execution
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import {
  RigrConfig,
  ObjectType,
  Level,
  IdConfig,
  LinkType,
  Status,
  ConfigLoadResult,
} from '../types';
import { DEFAULT_CONFIG, buildIdRegex } from './defaults';
import { getSettings } from './settingsManager';

const execAsync = promisify(exec);

/**
 * Python script to extract requirements configuration as JSON
 */
const PYTHON_EXTRACT_SCRIPT = `
import sys
import json
import os

# Add the config directory to path
conf_dir = sys.argv[1] if len(sys.argv) > 1 else '.'
sys.path.insert(0, conf_dir)

# Also add parent directory in case conf.py imports from there
parent_dir = os.path.dirname(conf_dir)
if parent_dir:
    sys.path.insert(0, parent_dir)

try:
    import conf

    # Rigr configuration
    result = {
        'rigr_object_types': getattr(conf, 'rigr_object_types', []),
        'rigr_levels': getattr(conf, 'rigr_levels', []),
        'rigr_id_config': getattr(conf, 'rigr_id_config', None),
        'rigr_link_types': getattr(conf, 'rigr_link_types', []),
        'rigr_statuses': getattr(conf, 'rigr_statuses', []),
        'rigr_id_regex': getattr(conf, 'rigr_id_regex', None),
        'rigr_relationships': getattr(conf, 'rigr_relationships', None),
        # Legacy support
        'rigr_id_prefixes': getattr(conf, 'rigr_id_prefixes', []),
    }

    print(json.dumps(result))
except Exception as e:
    print(json.dumps({'error': str(e)}), file=sys.stderr)
    sys.exit(1)
`;

/**
 * Locate conf.py file in the workspace
 */
export async function findConfPyPath(workspaceRoot: string): Promise<string | null> {
  const possiblePaths = [
    path.join(workspaceRoot, 'docs', 'conf.py'),
    path.join(workspaceRoot, 'doc', 'conf.py'),
    path.join(workspaceRoot, 'source', 'conf.py'),
    path.join(workspaceRoot, 'conf.py'),
  ];

  for (const confPath of possiblePaths) {
    if (fs.existsSync(confPath)) {
      return confPath;
    }
  }

  // Search for conf.py in subdirectories (limited depth)
  try {
    const files = await vscode.workspace.findFiles('**/conf.py', '**/node_modules/**', 10);
    if (files.length > 0) {
      return files[0].fsPath;
    }
  } catch {
    // Ignore search errors
  }

  return null;
}

/**
 * Parse raw config from Python output into typed config
 */
function parseRawConfig(raw: {
  rigr_object_types?: Array<Record<string, unknown>>;
  rigr_levels?: Array<Record<string, unknown>>;
  rigr_id_config?: Record<string, unknown> | null;
  rigr_link_types?: Array<Record<string, unknown>>;
  rigr_statuses?: Array<Record<string, unknown>>;
  rigr_id_regex?: string;
  rigr_relationships?: Record<string, string>;
  rigr_id_prefixes?: Array<Record<string, unknown>>; // Legacy
}): RigrConfig {
  const objectTypes: ObjectType[] = (raw.rigr_object_types || []).map((t) => ({
    type: String(t.type || ''),
    title: String(t.title || t.type || ''),
    color: t.color ? String(t.color) : undefined,
    style: t.style ? String(t.style) : undefined,
  })).filter(t => t.type);

  // Parse levels from rigr_levels
  const levels: Level[] = (raw.rigr_levels || []).map((l) => ({
    level: String(l.level || ''),
    title: String(l.title || l.level || ''),
  })).filter(l => l.level);

  // Parse ID config
  const rawIdConfig = raw.rigr_id_config;
  const idConfig: IdConfig = rawIdConfig ? {
    prefix: String(rawIdConfig.prefix || ''),
    separator: String(rawIdConfig.separator || ''),
    padding: Number(rawIdConfig.padding) || 4,
    start: Number(rawIdConfig.start) || 1,
  } : DEFAULT_CONFIG.idConfig;

  const linkTypes: LinkType[] = (raw.rigr_link_types || []).map((l) => ({
    option: String(l.option || ''),
    incoming: String(l.incoming || l.option || ''),
    outgoing: String(l.outgoing || l.option || ''),
    style: l.style ? String(l.style) : undefined,
  })).filter(l => l.option);

  const statuses: Status[] = (raw.rigr_statuses || []).map((s) => ({
    status: String(s.status || ''),
    color: s.color ? String(s.color) : undefined,
  })).filter(s => s.status);

  // Build ID regex from idConfig
  const id_regex = buildIdRegex(idConfig);

  return {
    objectTypes: objectTypes.length > 0 ? objectTypes : DEFAULT_CONFIG.objectTypes,
    levels: levels.length > 0 ? levels : DEFAULT_CONFIG.levels,
    idConfig,
    linkTypes: linkTypes.length > 0 ? linkTypes : DEFAULT_CONFIG.linkTypes,
    statuses: statuses.length > 0 ? statuses : DEFAULT_CONFIG.statuses,
    id_regex,
    traceability_item_id_regex: raw.rigr_id_regex,
    traceability_relationships: raw.rigr_relationships,
  };
}

/**
 * Load configuration from conf.py using Python
 */
export async function loadConfigFromConfPy(confPyPath: string): Promise<ConfigLoadResult> {
  const confDir = path.dirname(confPyPath);

  try {
    // Write temp script file
    const tempScriptPath = path.join(confDir, '__extract_config.py');
    fs.writeFileSync(tempScriptPath, PYTHON_EXTRACT_SCRIPT);

    try {
      // Execute Python to extract config
      const { stdout, stderr } = await execAsync(
        `python3 "${tempScriptPath}" "${confDir}"`,
        {
          cwd: confDir,
          timeout: 10000, // 10 second timeout
        }
      );

      if (stderr && stderr.includes('error')) {
        return {
          success: false,
          error: `Python error: ${stderr}`,
          source: 'conf.py',
        };
      }

      const rawConfig = JSON.parse(stdout.trim());

      if (rawConfig.error) {
        return {
          success: false,
          error: rawConfig.error,
          source: 'conf.py',
        };
      }

      const config = parseRawConfig(rawConfig);

      return {
        success: true,
        config,
        source: 'conf.py',
      };
    } finally {
      // Clean up temp script
      try {
        fs.unlinkSync(tempScriptPath);
      } catch {
        // Ignore cleanup errors
      }
    }
  } catch (error) {
    // Try python instead of python3
    try {
      const tempScriptPath = path.join(confDir, '__extract_config.py');
      fs.writeFileSync(tempScriptPath, PYTHON_EXTRACT_SCRIPT);

      try {
        const { stdout } = await execAsync(
          `python "${tempScriptPath}" "${confDir}"`,
          {
            cwd: confDir,
            timeout: 10000,
          }
        );

        const rawConfig = JSON.parse(stdout.trim());
        const config = parseRawConfig(rawConfig);

        return {
          success: true,
          config,
          source: 'conf.py',
        };
      } finally {
        try {
          fs.unlinkSync(tempScriptPath);
        } catch {
          // Ignore
        }
      }
    } catch {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        source: 'conf.py',
      };
    }
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

  const config: RigrConfig = {
    ...DEFAULT_CONFIG,
    objectTypes: settings.config.customTypes,
  };

  return {
    success: true,
    config,
    source: 'settings',
  };
}

/**
 * Main configuration loading function
 * Tries sources in order: VS Code settings (if override enabled) -> conf.py -> defaults
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

  // Try to find and load conf.py
  const confPyPath = await findConfPyPath(workspaceRoot);
  if (confPyPath) {
    const confPyResult = await loadConfigFromConfPy(confPyPath);
    if (confPyResult.success) {
      return confPyResult;
    }
    // Log error but continue to defaults
    console.warn(`Failed to load conf.py: ${confPyResult.error}`);
  }

  // Fall back to defaults
  return {
    success: true,
    config: DEFAULT_CONFIG,
    source: 'defaults',
  };
}

/**
 * Create a file watcher for conf.py changes
 */
export function createConfPyWatcher(
  workspaceRoot: string,
  onConfigChange: () => void
): vscode.Disposable {
  const watcher = vscode.workspace.createFileSystemWatcher(
    new vscode.RelativePattern(workspaceRoot, '**/conf.py')
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
  private config: RigrConfig = DEFAULT_CONFIG;
  private configSource: 'conf.py' | 'settings' | 'defaults' = 'defaults';
  private confPyPath: string | null = null;
  private disposables: vscode.Disposable[] = [];
  private onConfigChangeEmitter = new vscode.EventEmitter<RigrConfig>();

  public readonly onConfigChange = this.onConfigChangeEmitter.event;

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
    // Load initial configuration
    await this.reload(workspaceRoot);

    // Set up conf.py watcher
    this.disposables.push(
      createConfPyWatcher(workspaceRoot, () => this.reload(workspaceRoot))
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
      this.config = result.config;
      this.configSource = result.source;
      this.onConfigChangeEmitter.fire(this.config);
    }
  }

  /**
   * Get current configuration
   */
  public getConfig(): RigrConfig {
    return this.config;
  }

  /**
   * Get configuration source
   */
  public getConfigSource(): 'conf.py' | 'settings' | 'defaults' {
    return this.configSource;
  }

  /**
   * Get conf.py path if found
   */
  public getConfPyPath(): string | null {
    return this.confPyPath;
  }

  /**
   * Dispose resources
   */
  public dispose(): void {
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
    this.onConfigChangeEmitter.dispose();
  }
}
