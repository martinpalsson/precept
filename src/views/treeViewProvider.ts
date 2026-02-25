/**
 * Tree View Provider - Item Explorer sidebar
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { IndexBuilder } from '../indexing/indexBuilder';
import { RigrConfig, RequirementObject, TreeViewGroupBy } from '../types';
import { getTreeViewGroupBy, shouldShowStatusIcons } from '../configuration/settingsManager';

/**
 * Status icons
 */
const STATUS_ICONS: Record<string, string> = {
  'approved': '$(check)',
  'draft': '$(edit)',
  'review': '$(sync)',
  'implemented': '$(rocket)',
  'deprecated': '$(warning)',
  'rejected': '$(x)',
};

/**
 * Type icons
 */
const TYPE_ICONS: Record<string, string> = {
  'req': '$(checklist)',
  'spec': '$(file-code)',
  'test': '$(beaker)',
  'rationale': '$(lightbulb)',
  'info': '$(info)',
};

/**
 * Tree item representing a requirement or group
 */
export class RequirementTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly requirement?: RequirementObject,
    public readonly groupType?: 'type' | 'level' | 'file' | 'status' | 'orphaned',
    public readonly groupValue?: string,
    public readonly count?: number
  ) {
    super(label, collapsibleState);

    // Set unique ID for tree item identification (needed for reveal to work)
    if (requirement) {
      this.id = `req-${requirement.id}`;
    } else if (groupType && groupValue !== undefined) {
      this.id = `group-${groupType}-${groupValue}`;
    }

    if (requirement) {
      // This is a requirement item
      this.contextValue = 'requirement';
      this.description = requirement.status || '';
      this.tooltip = this.createTooltip(requirement);

      // Set icon based on status
      if (shouldShowStatusIcons() && requirement.status) {
        const iconId = STATUS_ICONS[requirement.status.toLowerCase()] || '$(circle-outline)';
        this.iconPath = new vscode.ThemeIcon(iconId.replace('$(', '').replace(')', ''));
      }

      // Set command to open the file at the requirement location
      this.command = {
        command: 'vscode.open',
        title: 'Open Requirement',
        arguments: [
          vscode.Uri.file(requirement.location.file),
          {
            selection: new vscode.Range(
              requirement.location.line - 1,
              0,
              requirement.location.line - 1,
              0
            ),
          },
        ],
      };
    } else if (groupType) {
      // This is a group item
      this.contextValue = 'group';
      this.description = count !== undefined ? `(${count})` : '';

      // Set icon based on group type
      if (groupType === 'type' && groupValue) {
        const iconId = TYPE_ICONS[groupValue] || '$(folder)';
        this.iconPath = new vscode.ThemeIcon(iconId.replace('$(', '').replace(')', ''));
      } else if (groupType === 'level') {
        this.iconPath = new vscode.ThemeIcon('layers');
      } else if (groupType === 'file') {
        this.iconPath = new vscode.ThemeIcon('file');
      } else if (groupType === 'status') {
        const iconId = groupValue ? (STATUS_ICONS[groupValue.toLowerCase()] || '$(circle-outline)') : '$(folder)';
        this.iconPath = new vscode.ThemeIcon(iconId.replace('$(', '').replace(')', ''));
      } else if (groupType === 'orphaned') {
        this.iconPath = new vscode.ThemeIcon('warning');
      }
    }
  }

  private createTooltip(req: RequirementObject): vscode.MarkdownString {
    const lines = [
      `**${req.id}** - ${req.title}`,
      '',
      req.description ? req.description.substring(0, 200) + (req.description.length > 200 ? '...' : '') : '',
    ];

    if (req.level) {
      lines.push('', `Level: ${req.level}`);
    }

    if (req.status) {
      lines.push('', `Status: ${req.status}`);
    }

    if (Object.keys(req.links).length > 0) {
      lines.push('', 'Links:');
      for (const [linkType, ids] of Object.entries(req.links)) {
        lines.push(`  ${linkType}: ${ids.join(', ')}`);
      }
    }

    const markdown = new vscode.MarkdownString(lines.join('\n'));
    return markdown;
  }
}

/**
 * Tree data provider for requirements
 */
export class RequirementTreeDataProvider implements vscode.TreeDataProvider<RequirementTreeItem> {
  private indexBuilder: IndexBuilder;
  private config: RigrConfig;
  private _onDidChangeTreeData = new vscode.EventEmitter<RequirementTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private baselineFilter: string | null = null;
  private searchFilter: string | null = null;

  constructor(indexBuilder: IndexBuilder, config: RigrConfig) {
    this.indexBuilder = indexBuilder;
    this.config = config;

    // Listen to index updates
    indexBuilder.onIndexUpdate(() => {
      this.refresh();
    });
  }

  /**
   * Update configuration
   */
  public updateConfig(config: RigrConfig): void {
    this.config = config;
    this.refresh();
  }

  /**
   * Refresh the tree view
   */
  public refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  /**
   * Set baseline filter
   */
  public setBaselineFilter(baseline: string | null): void {
    this.baselineFilter = baseline;
    this.refresh();
  }

  /**
   * Set search filter
   */
  public setSearchFilter(search: string | null): void {
    this.searchFilter = search?.toLowerCase() || null;
    this.refresh();
  }

  /**
   * Get tree item
   */
  getTreeItem(element: RequirementTreeItem): vscode.TreeItem {
    return element;
  }

  /**
   * Get parent of a tree item (needed for reveal to work)
   */
  getParent(element: RequirementTreeItem): RequirementTreeItem | null {
    if (element.requirement) {
      // This is a requirement item, find its parent group
      const groupBy = getTreeViewGroupBy();
      const req = element.requirement;

      let groupValue: string;
      let groupType: 'type' | 'level' | 'file' | 'status' | 'orphaned';

      switch (groupBy) {
        case 'type':
          groupType = 'type';
          groupValue = req.type;
          break;
        case 'level':
          groupType = 'level';
          groupValue = req.level || 'unassigned';
          break;
        case 'file':
          groupType = 'file';
          groupValue = req.location.file;
          break;
        case 'status':
          groupType = 'status';
          groupValue = req.status || 'unset';
          break;
        default:
          groupType = 'type';
          groupValue = req.type;
      }

      // Get the title for the group
      let title: string;
      if (groupType === 'type') {
        const typeInfo = this.config.objectTypes.find(t => t.type === groupValue);
        title = typeInfo?.title || groupValue;
      } else if (groupType === 'level') {
        const levelInfo = this.config.levels.find(l => l.level === groupValue);
        title = levelInfo?.title || (groupValue === 'unassigned' ? 'Unassigned' : groupValue);
      } else if (groupType === 'file') {
        title = vscode.workspace.asRelativePath(groupValue);
      } else if (groupType === 'status') {
        title = groupValue.charAt(0).toUpperCase() + groupValue.slice(1);
      } else {
        title = groupValue;
      }

      return new RequirementTreeItem(
        title,
        vscode.TreeItemCollapsibleState.Expanded,
        undefined,
        groupType,
        groupValue
      );
    }

    // Group items are at root level, no parent
    return null;
  }

  /**
   * Get children
   */
  getChildren(element?: RequirementTreeItem): RequirementTreeItem[] {
    if (!element) {
      // Root level - return groups
      return this.getRootItems();
    }

    if (element.groupType && element.groupValue !== undefined) {
      // Group item - return requirements in group
      return this.getGroupChildren(element.groupType, element.groupValue);
    }

    return [];
  }

  /**
   * Get root items (groups)
   */
  private getRootItems(): RequirementTreeItem[] {
    const groupBy = getTreeViewGroupBy();
    const allReqs = this.getFilteredRequirements();

    switch (groupBy) {
      case 'type':
        return this.groupByType(allReqs);
      case 'level':
        return this.groupByLevel(allReqs);
      case 'file':
        return this.groupByFile(allReqs);
      case 'status':
        return this.groupByStatus(allReqs);
      default:
        return this.groupByType(allReqs);
    }
  }

  /**
   * Get filtered requirements based on current filters
   */
  private getFilteredRequirements(): RequirementObject[] {
    let reqs = this.indexBuilder.getAllRequirements();

    // Apply baseline filter
    if (this.baselineFilter) {
      reqs = reqs.filter(r => r.baseline === this.baselineFilter);
    }

    // Apply search filter
    if (this.searchFilter) {
      reqs = reqs.filter(r =>
        r.id.toLowerCase().includes(this.searchFilter!) ||
        r.title.toLowerCase().includes(this.searchFilter!) ||
        r.description.toLowerCase().includes(this.searchFilter!)
      );
    }

    return reqs;
  }

  /**
   * Group requirements by type
   */
  private groupByType(reqs: RequirementObject[]): RequirementTreeItem[] {
    const groups = new Map<string, RequirementObject[]>();

    for (const req of reqs) {
      if (!groups.has(req.type)) {
        groups.set(req.type, []);
      }
      groups.get(req.type)!.push(req);
    }

    const items: RequirementTreeItem[] = [];

    // Add type groups
    for (const [type, typeReqs] of groups) {
      const typeInfo = this.config.objectTypes.find(t => t.type === type);
      const title = typeInfo?.title || type;

      items.push(new RequirementTreeItem(
        title,
        vscode.TreeItemCollapsibleState.Expanded,
        undefined,
        'type',
        type,
        typeReqs.length
      ));
    }

    // Add orphaned group
    const orphaned = this.findOrphaned(reqs);
    if (orphaned.length > 0) {
      items.push(new RequirementTreeItem(
        'Orphaned',
        vscode.TreeItemCollapsibleState.Collapsed,
        undefined,
        'orphaned',
        'orphaned',
        orphaned.length
      ));
    }

    // Sort by title
    items.sort((a, b) => a.label.toString().localeCompare(b.label.toString()));

    return items;
  }

  /**
   * Group requirements by level
   */
  private groupByLevel(reqs: RequirementObject[]): RequirementTreeItem[] {
    const groups = new Map<string, RequirementObject[]>();

    for (const req of reqs) {
      const level = req.level || 'unassigned';
      if (!groups.has(level)) {
        groups.set(level, []);
      }
      groups.get(level)!.push(req);
    }

    const items: RequirementTreeItem[] = [];

    // Add level groups
    for (const [level, levelReqs] of groups) {
      const levelInfo = this.config.levels.find(l => l.level === level);
      const title = levelInfo?.title || (level === 'unassigned' ? 'Unassigned' : level);

      items.push(new RequirementTreeItem(
        title,
        vscode.TreeItemCollapsibleState.Expanded,
        undefined,
        'level',
        level,
        levelReqs.length
      ));
    }

    // Add orphaned group
    const orphaned = this.findOrphaned(reqs);
    if (orphaned.length > 0) {
      items.push(new RequirementTreeItem(
        'Orphaned',
        vscode.TreeItemCollapsibleState.Collapsed,
        undefined,
        'orphaned',
        'orphaned',
        orphaned.length
      ));
    }

    // Sort by title
    items.sort((a, b) => a.label.toString().localeCompare(b.label.toString()));

    return items;
  }

  /**
   * Group requirements by file
   */
  private groupByFile(reqs: RequirementObject[]): RequirementTreeItem[] {
    const groups = new Map<string, RequirementObject[]>();

    for (const req of reqs) {
      if (!groups.has(req.location.file)) {
        groups.set(req.location.file, []);
      }
      groups.get(req.location.file)!.push(req);
    }

    const items: RequirementTreeItem[] = [];

    for (const [filePath, fileReqs] of groups) {
      const fileName = path.basename(filePath);
      const relativePath = vscode.workspace.asRelativePath(filePath);

      items.push(new RequirementTreeItem(
        relativePath,
        vscode.TreeItemCollapsibleState.Expanded,
        undefined,
        'file',
        filePath,
        fileReqs.length
      ));
    }

    // Sort by path
    items.sort((a, b) => a.label.toString().localeCompare(b.label.toString()));

    return items;
  }

  /**
   * Group requirements by status
   */
  private groupByStatus(reqs: RequirementObject[]): RequirementTreeItem[] {
    const groups = new Map<string, RequirementObject[]>();

    for (const req of reqs) {
      const status = req.status || 'unset';
      if (!groups.has(status)) {
        groups.set(status, []);
      }
      groups.get(status)!.push(req);
    }

    const items: RequirementTreeItem[] = [];

    for (const [status, statusReqs] of groups) {
      const statusInfo = this.config.statuses.find(s => s.status === status);
      const title = statusInfo ? status.charAt(0).toUpperCase() + status.slice(1) : status;

      items.push(new RequirementTreeItem(
        title,
        vscode.TreeItemCollapsibleState.Expanded,
        undefined,
        'status',
        status,
        statusReqs.length
      ));
    }

    // Sort by status
    items.sort((a, b) => a.label.toString().localeCompare(b.label.toString()));

    return items;
  }

  /**
   * Find orphaned requirements (no links)
   */
  private findOrphaned(reqs: RequirementObject[]): RequirementObject[] {
    return reqs.filter(req => {
      const hasOutgoingLinks = Object.values(req.links).some(ids => ids.length > 0);
      const hasIncomingLinks = this.indexBuilder.getLinkedRequirements(req.id).length > 0;
      return !hasOutgoingLinks && !hasIncomingLinks;
    });
  }

  /**
   * Get children for a group
   */
  private getGroupChildren(groupType: 'type' | 'level' | 'file' | 'status' | 'orphaned', groupValue: string): RequirementTreeItem[] {
    const allReqs = this.getFilteredRequirements();
    let reqs: RequirementObject[];

    if (groupType === 'type') {
      reqs = allReqs.filter(r => r.type === groupValue);
    } else if (groupType === 'level') {
      reqs = allReqs.filter(r => (r.level || 'unassigned') === groupValue);
    } else if (groupType === 'file') {
      reqs = allReqs.filter(r => r.location.file === groupValue);
    } else if (groupType === 'status') {
      reqs = allReqs.filter(r => (r.status || 'unset') === groupValue);
    } else if (groupType === 'orphaned') {
      reqs = this.findOrphaned(allReqs);
    } else {
      reqs = [];
    }

    // Sort by ID
    reqs.sort((a, b) => a.id.localeCompare(b.id));

    return reqs.map(req => new RequirementTreeItem(
      `${req.id} - ${req.title}`,
      vscode.TreeItemCollapsibleState.None,
      req
    ));
  }
}

/**
 * Register the tree view
 */
export function registerTreeView(
  context: vscode.ExtensionContext,
  indexBuilder: IndexBuilder,
  config: RigrConfig
): RequirementTreeDataProvider {
  const provider = new RequirementTreeDataProvider(indexBuilder, config);

  const treeView = vscode.window.createTreeView('requirementsExplorer', {
    treeDataProvider: provider,
    showCollapseAll: true,
  });

  context.subscriptions.push(treeView);

  // Handle selection change to update relationship explorer
  context.subscriptions.push(
    treeView.onDidChangeSelection((event) => {
      const selectedItem = event.selection[0];
      if (selectedItem?.requirement) {
        // Update relationship explorer with selected requirement
        vscode.commands.executeCommand('requirements.showRelationships', selectedItem.requirement.id);
      }
    })
  );

  // Register refresh command
  context.subscriptions.push(
    vscode.commands.registerCommand('requirements.refreshTreeView', () => {
      provider.refresh();
    })
  );

  // Register reveal in explorer command
  context.subscriptions.push(
    vscode.commands.registerCommand('requirements.revealInExplorer', async (requirementId: string) => {
      // Find the tree item for this requirement and reveal it
      const allReqs = indexBuilder.getAllRequirements();
      const req = allReqs.find(r => r.id === requirementId);
      if (req) {
        // Create a tree item to reveal
        const item = new RequirementTreeItem(
          `${req.id} - ${req.title}`,
          vscode.TreeItemCollapsibleState.None,
          req
        );
        try {
          await treeView.reveal(item, { select: true, focus: false });
        } catch {
          // Item might not be visible in current grouping, ignore
        }
      }
    })
  );

  return provider;
}
