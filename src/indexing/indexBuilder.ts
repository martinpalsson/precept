/**
 * Index Builder - Builds and maintains the requirement index
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import {
  RequirementIndex,
  RequirementObject,
  RequirementReference,
  ParsedRstFile,
  RigrConfig,
  IndexUpdateEvent,
} from '../types';
import { parseRstFile } from './rstParser';
import { getExcludePatterns } from '../configuration/settingsManager';

/**
 * Create an empty index
 */
export function createEmptyIndex(): RequirementIndex {
  return {
    objects: new Map(),
    fileIndex: new Map(),
    typeIndex: new Map(),
    levelIndex: new Map(),
    statusIndex: new Map(),
    linkGraph: new Map(),
    baselines: new Map(),
  };
}

/**
 * Add a requirement to the index
 */
function addToIndex(index: RequirementIndex, req: RequirementObject): void {
  // Add to main objects map
  index.objects.set(req.id, req);

  // Add to file index
  if (!index.fileIndex.has(req.location.file)) {
    index.fileIndex.set(req.location.file, new Set());
  }
  index.fileIndex.get(req.location.file)!.add(req.id);

  // Add to type index
  if (!index.typeIndex.has(req.type)) {
    index.typeIndex.set(req.type, new Set());
  }
  index.typeIndex.get(req.type)!.add(req.id);

  // Add to level index
  if (req.level) {
    if (!index.levelIndex.has(req.level)) {
      index.levelIndex.set(req.level, new Set());
    }
    index.levelIndex.get(req.level)!.add(req.id);
  }

  // Add to status index
  if (req.status) {
    if (!index.statusIndex.has(req.status)) {
      index.statusIndex.set(req.status, new Set());
    }
    index.statusIndex.get(req.status)!.add(req.id);
  }

  // Add to link graph
  if (!index.linkGraph.has(req.id)) {
    index.linkGraph.set(req.id, new Set());
  }
  for (const linkedIds of Object.values(req.links)) {
    for (const linkedId of linkedIds) {
      index.linkGraph.get(req.id)!.add(linkedId);

      // Add reverse link
      if (!index.linkGraph.has(linkedId)) {
        index.linkGraph.set(linkedId, new Set());
      }
      index.linkGraph.get(linkedId)!.add(req.id);
    }
  }

  // Add to baseline index
  if (req.baseline) {
    if (!index.baselines.has(req.baseline)) {
      index.baselines.set(req.baseline, new Set());
    }
    index.baselines.get(req.baseline)!.add(req.id);
  }
}

/**
 * Remove a requirement from the index
 */
function removeFromIndex(index: RequirementIndex, reqId: string): void {
  const req = index.objects.get(reqId);
  if (!req) {
    return;
  }

  // Remove from objects
  index.objects.delete(reqId);

  // Remove from file index
  const fileIds = index.fileIndex.get(req.location.file);
  if (fileIds) {
    fileIds.delete(reqId);
    if (fileIds.size === 0) {
      index.fileIndex.delete(req.location.file);
    }
  }

  // Remove from type index
  const typeIds = index.typeIndex.get(req.type);
  if (typeIds) {
    typeIds.delete(reqId);
    if (typeIds.size === 0) {
      index.typeIndex.delete(req.type);
    }
  }

  // Remove from level index
  if (req.level) {
    const levelIds = index.levelIndex.get(req.level);
    if (levelIds) {
      levelIds.delete(reqId);
      if (levelIds.size === 0) {
        index.levelIndex.delete(req.level);
      }
    }
  }

  // Remove from status index
  if (req.status) {
    const statusIds = index.statusIndex.get(req.status);
    if (statusIds) {
      statusIds.delete(reqId);
      if (statusIds.size === 0) {
        index.statusIndex.delete(req.status);
      }
    }
  }

  // Remove from link graph (both directions)
  const linkedIds = index.linkGraph.get(reqId);
  if (linkedIds) {
    for (const linkedId of linkedIds) {
      const reverseLinks = index.linkGraph.get(linkedId);
      if (reverseLinks) {
        reverseLinks.delete(reqId);
      }
    }
  }
  index.linkGraph.delete(reqId);

  // Remove from baseline index
  if (req.baseline) {
    const baselineIds = index.baselines.get(req.baseline);
    if (baselineIds) {
      baselineIds.delete(reqId);
      if (baselineIds.size === 0) {
        index.baselines.delete(req.baseline);
      }
    }
  }
}

/**
 * Remove all requirements from a file
 */
function removeFileFromIndex(index: RequirementIndex, filePath: string): string[] {
  const removedIds: string[] = [];
  const fileIds = index.fileIndex.get(filePath);

  if (fileIds) {
    for (const id of fileIds) {
      removeFromIndex(index, id);
      removedIds.push(id);
    }
  }

  return removedIds;
}

/**
 * Index Builder class
 */
export class IndexBuilder {
  private index: RequirementIndex = createEmptyIndex();
  private references: Map<string, RequirementReference[]> = new Map();
  private config: RigrConfig;
  private disposables: vscode.Disposable[] = [];
  private onIndexUpdateEmitter = new vscode.EventEmitter<IndexUpdateEvent>();
  private debounceTimer: NodeJS.Timeout | null = null;
  private pendingFiles: Set<string> = new Set();

  public readonly onIndexUpdate = this.onIndexUpdateEmitter.event;

  constructor(config: RigrConfig) {
    this.config = config;
  }

  /**
   * Update configuration
   */
  public updateConfig(config: RigrConfig): void {
    this.config = config;
  }

  /**
   * Get the current index
   */
  public getIndex(): RequirementIndex {
    return this.index;
  }

  /**
   * Get a requirement by ID
   */
  public getRequirement(id: string): RequirementObject | undefined {
    return this.index.objects.get(id);
  }

  /**
   * Get all requirements
   */
  public getAllRequirements(): RequirementObject[] {
    return Array.from(this.index.objects.values());
  }

  /**
   * Get requirements by type
   */
  public getRequirementsByType(type: string): RequirementObject[] {
    const ids = this.index.typeIndex.get(type);
    if (!ids) {
      return [];
    }
    return Array.from(ids)
      .map(id => this.index.objects.get(id))
      .filter((r): r is RequirementObject => r !== undefined);
  }

  /**
   * Get requirements by file
   */
  public getRequirementsByFile(filePath: string): RequirementObject[] {
    const ids = this.index.fileIndex.get(filePath);
    if (!ids) {
      return [];
    }
    return Array.from(ids)
      .map(id => this.index.objects.get(id))
      .filter((r): r is RequirementObject => r !== undefined);
  }

  /**
   * Get requirements by level
   */
  public getRequirementsByLevel(level: string): RequirementObject[] {
    const ids = this.index.levelIndex.get(level);
    if (!ids) {
      return [];
    }
    return Array.from(ids)
      .map(id => this.index.objects.get(id))
      .filter((r): r is RequirementObject => r !== undefined);
  }

  /**
   * Get requirements by status
   */
  public getRequirementsByStatus(status: string): RequirementObject[] {
    const ids = this.index.statusIndex.get(status);
    if (!ids) {
      return [];
    }
    return Array.from(ids)
      .map(id => this.index.objects.get(id))
      .filter((r): r is RequirementObject => r !== undefined);
  }

  /**
   * Get requirements by baseline
   */
  public getRequirementsByBaseline(baseline: string): RequirementObject[] {
    const ids = this.index.baselines.get(baseline);
    if (!ids) {
      return [];
    }
    return Array.from(ids)
      .map(id => this.index.objects.get(id))
      .filter((r): r is RequirementObject => r !== undefined);
  }

  /**
   * Get linked requirements
   */
  public getLinkedRequirements(id: string): RequirementObject[] {
    const linkedIds = this.index.linkGraph.get(id);
    if (!linkedIds) {
      return [];
    }
    return Array.from(linkedIds)
      .map(linkedId => this.index.objects.get(linkedId))
      .filter((r): r is RequirementObject => r !== undefined);
  }

  /**
   * Get all references to a requirement ID
   */
  public getReferences(id: string): RequirementReference[] {
    const refs: RequirementReference[] = [];

    for (const fileRefs of this.references.values()) {
      for (const ref of fileRefs) {
        if (ref.id === id) {
          refs.push(ref);
        }
      }
    }

    return refs;
  }

  /**
   * Check if an ID exists
   */
  public hasRequirement(id: string): boolean {
    return this.index.objects.has(id);
  }

  /**
   * Get all unique types
   */
  public getTypes(): string[] {
    return Array.from(this.index.typeIndex.keys());
  }

  /**
   * Get all unique levels
   */
  public getLevels(): string[] {
    return Array.from(this.index.levelIndex.keys());
  }

  /**
   * Get all unique statuses
   */
  public getStatuses(): string[] {
    return Array.from(this.index.statusIndex.keys());
  }

  /**
   * Get all unique baselines
   */
  public getBaselines(): string[] {
    return Array.from(this.index.baselines.keys());
  }

  /**
   * Get all indexed files
   */
  public getIndexedFiles(): string[] {
    return Array.from(this.index.fileIndex.keys());
  }

  /**
   * Get requirement count
   */
  public getCount(): number {
    return this.index.objects.size;
  }

  /**
   * Build full index from workspace
   */
  public async buildFullIndex(
    workspaceRoot: string,
    progress?: vscode.Progress<{ message?: string; increment?: number }>
  ): Promise<void> {
    // Clear existing index
    this.index = createEmptyIndex();
    this.references.clear();

    // Find all RST files
    const excludePatterns = getExcludePatterns();
    const excludeGlob = excludePatterns.length > 0
      ? `{${excludePatterns.join(',')}}`
      : undefined;

    const files = await vscode.workspace.findFiles(
      '**/*.rst',
      excludeGlob,
      1000 // max files limit
    );

    const totalFiles = files.length;
    let processed = 0;

    for (const file of files) {
      try {
        await this.indexFile(file.fsPath);
        processed++;

        if (progress) {
          progress.report({
            message: `Indexing ${processed}/${totalFiles} files...`,
            increment: (1 / totalFiles) * 100,
          });
        }
      } catch (error) {
        console.error(`Error indexing ${file.fsPath}:`, error);
      }
    }

    this.onIndexUpdateEmitter.fire({
      type: 'add',
      affectedIds: Array.from(this.index.objects.keys()),
    });
  }

  /**
   * Index a single file
   */
  public async indexFile(filePath: string): Promise<ParsedRstFile> {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const parsed = parseRstFile(content, filePath, this.config);

    // Remove old requirements from this file
    const removedIds = removeFileFromIndex(this.index, filePath);

    // Add new requirements
    for (const req of parsed.requirements) {
      addToIndex(this.index, req);
    }

    // Store references
    this.references.set(filePath, parsed.references);

    // Emit update event
    const addedIds = parsed.requirements.map(r => r.id);
    if (removedIds.length > 0 || addedIds.length > 0) {
      this.onIndexUpdateEmitter.fire({
        type: removedIds.length > 0 ? 'update' : 'add',
        affectedIds: [...new Set([...removedIds, ...addedIds])],
        file: filePath,
      });
    }

    return parsed;
  }

  /**
   * Remove a file from the index
   */
  public removeFile(filePath: string): void {
    const removedIds = removeFileFromIndex(this.index, filePath);
    this.references.delete(filePath);

    if (removedIds.length > 0) {
      this.onIndexUpdateEmitter.fire({
        type: 'remove',
        affectedIds: removedIds,
        file: filePath,
      });
    }
  }

  /**
   * Schedule a debounced file update
   */
  public scheduleFileUpdate(filePath: string, debounceMs: number = 500): void {
    this.pendingFiles.add(filePath);

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(async () => {
      const files = Array.from(this.pendingFiles);
      this.pendingFiles.clear();

      for (const file of files) {
        if (fs.existsSync(file)) {
          await this.indexFile(file);
        } else {
          this.removeFile(file);
        }
      }
    }, debounceMs);
  }

  /**
   * Set up file watchers
   */
  public setupFileWatchers(workspaceRoot: string): void {
    const watcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(workspaceRoot, '**/*.rst')
    );

    this.disposables.push(
      watcher,
      watcher.onDidChange((uri) => {
        this.scheduleFileUpdate(uri.fsPath);
      }),
      watcher.onDidCreate((uri) => {
        this.scheduleFileUpdate(uri.fsPath);
      }),
      watcher.onDidDelete((uri) => {
        this.removeFile(uri.fsPath);
      })
    );
  }

  /**
   * Export index data for serialization
   */
  public exportData(): {
    objects: Array<[string, RequirementObject]>;
    references: Array<[string, RequirementReference[]]>;
  } {
    return {
      objects: Array.from(this.index.objects.entries()),
      references: Array.from(this.references.entries()),
    };
  }

  /**
   * Import index data from serialization
   */
  public importData(data: {
    objects: Array<[string, RequirementObject]>;
    references: Array<[string, RequirementReference[]]>;
  }): void {
    this.index = createEmptyIndex();
    this.references.clear();

    for (const [, req] of data.objects) {
      addToIndex(this.index, req);
    }

    for (const [filePath, refs] of data.references) {
      this.references.set(filePath, refs);
    }
  }

  /**
   * Dispose resources
   */
  public dispose(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
    this.onIndexUpdateEmitter.dispose();
  }
}
