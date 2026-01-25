/**
 * Index Cache - Persist index to workspace storage for faster startup
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { RequirementObject, RequirementReference } from '../types';
import { IndexBuilder } from './indexBuilder';

const CACHE_VERSION = 1;
const CACHE_FILENAME = 'requirements-index.json';

interface CacheData {
  version: number;
  timestamp: number;
  configHash: string;
  objects: Array<[string, RequirementObject]>;
  references: Array<[string, RequirementReference[]]>;
}

/**
 * Simple hash function for config comparison
 */
function hashConfig(config: unknown): string {
  const str = JSON.stringify(config);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

/**
 * Get cache file path
 */
function getCacheFilePath(workspaceRoot: string): string {
  const vscodePath = path.join(workspaceRoot, '.vscode');
  return path.join(vscodePath, CACHE_FILENAME);
}

/**
 * Save index to cache
 */
export async function saveIndexCache(
  workspaceRoot: string,
  indexBuilder: IndexBuilder,
  config: unknown
): Promise<void> {
  try {
    const cacheData: CacheData = {
      version: CACHE_VERSION,
      timestamp: Date.now(),
      configHash: hashConfig(config),
      ...indexBuilder.exportData(),
    };

    const cachePath = getCacheFilePath(workspaceRoot);
    const vscodePath = path.dirname(cachePath);

    // Ensure .vscode directory exists
    if (!fs.existsSync(vscodePath)) {
      await fs.promises.mkdir(vscodePath, { recursive: true });
    }

    await fs.promises.writeFile(
      cachePath,
      JSON.stringify(cacheData, null, 2),
      'utf-8'
    );
  } catch (error) {
    console.error('Failed to save index cache:', error);
  }
}

/**
 * Load index from cache
 * Returns true if cache was valid and loaded successfully
 */
export async function loadIndexCache(
  workspaceRoot: string,
  indexBuilder: IndexBuilder,
  config: unknown
): Promise<boolean> {
  try {
    const cachePath = getCacheFilePath(workspaceRoot);

    if (!fs.existsSync(cachePath)) {
      return false;
    }

    const content = await fs.promises.readFile(cachePath, 'utf-8');
    const cacheData: CacheData = JSON.parse(content);

    // Check version
    if (cacheData.version !== CACHE_VERSION) {
      console.log('Index cache version mismatch, rebuilding...');
      return false;
    }

    // Check config hash
    const currentHash = hashConfig(config);
    if (cacheData.configHash !== currentHash) {
      console.log('Config changed, rebuilding index...');
      return false;
    }

    // Check if any RST files are newer than cache
    const cacheTime = cacheData.timestamp;
    const rstFiles = await vscode.workspace.findFiles('**/*.rst', '**/node_modules/**', 100);

    for (const file of rstFiles) {
      try {
        const stat = await fs.promises.stat(file.fsPath);
        if (stat.mtimeMs > cacheTime) {
          console.log('RST files modified since cache, rebuilding...');
          return false;
        }
      } catch {
        // Ignore stat errors
      }
    }

    // Import cached data
    indexBuilder.importData({
      objects: cacheData.objects,
      references: cacheData.references,
    });

    console.log(`Loaded ${cacheData.objects.length} requirements from cache`);
    return true;
  } catch (error) {
    console.error('Failed to load index cache:', error);
    return false;
  }
}

/**
 * Clear the index cache
 */
export async function clearIndexCache(workspaceRoot: string): Promise<void> {
  try {
    const cachePath = getCacheFilePath(workspaceRoot);
    if (fs.existsSync(cachePath)) {
      await fs.promises.unlink(cachePath);
    }
  } catch (error) {
    console.error('Failed to clear index cache:', error);
  }
}

/**
 * Index cache manager that auto-saves on changes
 */
export class IndexCacheManager {
  private saveTimer: NodeJS.Timeout | null = null;
  private workspaceRoot: string;
  private indexBuilder: IndexBuilder;
  private config: unknown;
  private disposable: vscode.Disposable | null = null;

  constructor(
    workspaceRoot: string,
    indexBuilder: IndexBuilder,
    config: unknown
  ) {
    this.workspaceRoot = workspaceRoot;
    this.indexBuilder = indexBuilder;
    this.config = config;

    // Subscribe to index updates
    this.disposable = indexBuilder.onIndexUpdate(() => {
      this.scheduleSave();
    });
  }

  /**
   * Update configuration
   */
  public updateConfig(config: unknown): void {
    this.config = config;
    // Invalidate cache when config changes
    clearIndexCache(this.workspaceRoot);
  }

  /**
   * Schedule a debounced save
   */
  private scheduleSave(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }

    this.saveTimer = setTimeout(() => {
      this.save();
    }, 5000); // Save 5 seconds after last change
  }

  /**
   * Save immediately
   */
  public async save(): Promise<void> {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }

    await saveIndexCache(this.workspaceRoot, this.indexBuilder, this.config);
  }

  /**
   * Load from cache
   */
  public async load(): Promise<boolean> {
    return loadIndexCache(this.workspaceRoot, this.indexBuilder, this.config);
  }

  /**
   * Clear cache
   */
  public async clear(): Promise<void> {
    await clearIndexCache(this.workspaceRoot);
  }

  /**
   * Dispose resources
   */
  public dispose(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
    if (this.disposable) {
      this.disposable.dispose();
    }
  }
}
