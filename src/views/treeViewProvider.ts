/**
 * Tree View Provider - Item Explorer sidebar
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { IndexBuilder } from '../indexing/indexBuilder';
import { PreceptConfig, RequirementObject, TreeViewGroupBy } from '../types';
import { getTreeViewGroupBy, shouldShowStatusIcons } from '../configuration/settingsManager';
import { computeContentHash } from '../signing/canonicalHash';

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
    public readonly groupType?: string,
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

      // Build description with status and signature indicator
      const parts: string[] = [];
      if (requirement.status) {
        parts.push(requirement.status);
      }
      if (requirement.signature) {
        if (requirement.signedHash) {
          const currentHash = computeContentHash(requirement);
          parts.push(currentHash === requirement.signedHash ? '$(lock)' : '$(unlock)');
        } else {
          parts.push('$(lock)');
        }
      }
      this.description = parts.join(' ');
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
      } else {
        // Custom field group
        this.iconPath = new vscode.ThemeIcon('tag');
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

    if (req.signature) {
      lines.push('');
      if (req.signedHash) {
        const currentHash = computeContentHash(req);
        if (currentHash === req.signedHash) {
          lines.push('🔒 Signed');
        } else {
          lines.push('⚠️ Signature stale (modified since signing)');
        }
      } else {
        lines.push('🔒 Signed');
      }
      if (req.signedBy) {
        lines.push(`Signed by: ${req.signedBy}`);
      }
      if (req.signedDate) {
        lines.push(`Signed: ${req.signedDate}`);
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
  private config: PreceptConfig;
  private _onDidChangeTreeData = new vscode.EventEmitter<RequirementTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private baselineFilter: string | null = null;
  private searchFilter: string | null = null;
  private treeView?: vscode.TreeView<RequirementTreeItem>;

  constructor(indexBuilder: IndexBuilder, config: PreceptConfig) {
    this.indexBuilder = indexBuilder;
    this.config = config;

    // Listen to index updates
    indexBuilder.onIndexUpdate(() => {
      this.refresh();
    });
  }

  /**
   * Bind the tree view so we can update its description
   */
  public setTreeView(treeView: vscode.TreeView<RequirementTreeItem>): void {
    this.treeView = treeView;
    this.updateDescription();
  }

  /**
   * Update configuration
   */
  public updateConfig(config: PreceptConfig): void {
    this.config = config;
    this.refresh();
  }

  /**
   * Refresh the tree view
   */
  public refresh(): void {
    this.updateDescription();
    this._onDidChangeTreeData.fire();
  }

  /**
   * Update the tree view description to show current grouping
   */
  private updateDescription(): void {
    if (!this.treeView) return;
    const groupBy = getTreeViewGroupBy();
    const label = groupBy.charAt(0).toUpperCase() + groupBy.slice(1);
    this.treeView.description = `by ${label}`;
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
      let groupType: string;

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
          if (groupBy && this.config.customFields[groupBy]) {
            groupType = groupBy;
            groupValue = this.getCustomFieldTokens(req, groupBy)[0];
          } else {
            groupType = 'type';
            groupValue = req.type;
          }
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
        // Custom field — use the title from config if available
        const fieldValues = this.config.customFields[groupType];
        const valueInfo = fieldValues?.find(v => v.value === groupValue);
        title = valueInfo?.title || (groupValue === 'unassigned' ? 'Unassigned' : groupValue);
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

    // Add a clickable header showing the current grouping mode
    const label = groupBy.charAt(0).toUpperCase() + groupBy.slice(1);
    const header = new RequirementTreeItem(
      `Group by: ${label}`,
      vscode.TreeItemCollapsibleState.None
    );
    header.id = 'group-by-header';
    header.iconPath = new vscode.ThemeIcon('list-filter');
    header.command = {
      command: 'requirements.changeGroupBy',
      title: 'Change grouping',
    };
    header.contextValue = 'groupByHeader';

    let groups: RequirementTreeItem[];
    switch (groupBy) {
      case 'type':
        groups = this.groupByType(allReqs);
        break;
      case 'level':
        groups = this.groupByLevel(allReqs);
        break;
      case 'file':
        groups = this.groupByFile(allReqs);
        break;
      case 'status':
        groups = this.groupByStatus(allReqs);
        break;
      default:
        // Check if it's a custom field name
        if (groupBy && this.config.customFields[groupBy]) {
          groups = this.groupByCustomField(allReqs, groupBy);
        } else {
          groups = this.groupByType(allReqs);
        }
    }

    return [header, ...groups];
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
   * Split a custom field metadata value into individual tokens.
   * Returns ['unassigned'] when the field is missing or empty.
   */
  private getCustomFieldTokens(req: RequirementObject, fieldName: string): string[] {
    const raw = req.metadata[fieldName];
    if (!raw || !raw.trim()) {
      return ['unassigned'];
    }
    return raw.split(/[\s,]+/).map(t => t.trim()).filter(t => t.length > 0);
  }

  /**
   * Group requirements by a custom field (multi-value aware)
   */
  private groupByCustomField(reqs: RequirementObject[], fieldName: string): RequirementTreeItem[] {
    const groups = new Map<string, RequirementObject[]>();

    for (const req of reqs) {
      for (const token of this.getCustomFieldTokens(req, fieldName)) {
        if (!groups.has(token)) {
          groups.set(token, []);
        }
        groups.get(token)!.push(req);
      }
    }

    const items: RequirementTreeItem[] = [];
    const fieldValues = this.config.customFields[fieldName];

    for (const [value, fieldReqs] of groups) {
      const valueInfo = fieldValues?.find(v => v.value === value);
      const title = valueInfo?.title || (value === 'unassigned' ? 'Unassigned' : value);

      items.push(new RequirementTreeItem(
        title,
        vscode.TreeItemCollapsibleState.Expanded,
        undefined,
        fieldName,
        value,
        fieldReqs.length
      ));
    }

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
  private getGroupChildren(groupType: string, groupValue: string): RequirementTreeItem[] {
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
      // Custom field grouping (multi-value aware)
      reqs = allReqs.filter(r => this.getCustomFieldTokens(r, groupType).includes(groupValue));
    }

    // Sort by ID
    reqs.sort((a, b) => a.id.localeCompare(b.id));

    return reqs.map(req => {
      const item = new RequirementTreeItem(
        `${req.id} - ${req.title}`,
        vscode.TreeItemCollapsibleState.None,
        req
      );
      // For custom field groups, a req can appear in multiple groups,
      // so make the tree item ID unique per group to avoid deduplication.
      if (groupType !== 'type' && groupType !== 'level' && groupType !== 'file'
          && groupType !== 'status' && groupType !== 'orphaned') {
        item.id = `req-${req.id}-${groupType}-${groupValue}`;
      }
      return item;
    });
  }
}

/**
 * Register the tree view
 */
export function registerTreeView(
  context: vscode.ExtensionContext,
  indexBuilder: IndexBuilder,
  config: PreceptConfig
): RequirementTreeDataProvider {
  const provider = new RequirementTreeDataProvider(indexBuilder, config);

  const treeView = vscode.window.createTreeView('requirementsExplorer', {
    treeDataProvider: provider,
    showCollapseAll: true,
  });

  provider.setTreeView(treeView);
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

  // Track editor cursor to sync explorers with the item under the cursor
  let cursorSyncTimeout: ReturnType<typeof setTimeout> | undefined;
  context.subscriptions.push(
    vscode.window.onDidChangeTextEditorSelection((event) => {
      if (event.textEditor.document.languageId !== 'restructuredtext') return;
      // Debounce to avoid thrashing on rapid cursor movement
      if (cursorSyncTimeout) clearTimeout(cursorSyncTimeout);
      cursorSyncTimeout = setTimeout(() => {
        const line = event.selections[0].active.line + 1; // 1-based
        const filePath = event.textEditor.document.uri.fsPath;
        const items = indexBuilder.getRequirementsByFile(filePath);
        // Find the item whose range contains the cursor line
        const match = items.find(r =>
          r.location.line <= line && (r.location.endLine ?? r.location.line) >= line
        );
        if (match) {
          const treeItem = new RequirementTreeItem(
            `${match.id} - ${match.title}`,
            vscode.TreeItemCollapsibleState.None,
            match
          );
          try {
            treeView.reveal(treeItem, { select: true, focus: false });
          } catch {
            // Item might not be visible in current grouping
          }
          vscode.commands.executeCommand('requirements.showRelationships', match.id);
        }
      }, 150);
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
