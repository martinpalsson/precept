/**
 * Relationship Explorer Provider - Shows incoming/outgoing relationships for selected requirement
 *
 * Implements requirements:
 * - 00285: Quick relation view
 * - 00286: Relationship explorer panel
 * - 00287: Relationship explorer item display
 * - 00288: Relationship explorer item selection
 * - 00289: Relationship explorer navigation
 * - 00299: Selected item displayed
 */

import * as vscode from 'vscode';
import { IndexBuilder } from '../indexing/indexBuilder';
import { RigrConfig, RequirementObject } from '../types';

/**
 * Direction icons for relationship display
 */
const DIRECTION_ICONS = {
  incoming: 'arrow-left',
  outgoing: 'arrow-right',
};

/**
 * Tree item representing a relationship or group
 */
export class RelationshipTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly requirement?: RequirementObject,
    public readonly direction?: 'incoming' | 'outgoing',
    public readonly linkType?: string,
    public readonly count?: number,
    public readonly isSelectedHeader?: boolean
  ) {
    super(label, collapsibleState);

    if (isSelectedHeader && requirement) {
      // This is the selected requirement header (implements 00299)
      this.contextValue = 'selectedRequirement';
      this.description = `[${requirement.level || 'unassigned'}] [${requirement.status || 'unset'}]`;
      this.tooltip = this.createSelectedTooltip(requirement);
      this.iconPath = new vscode.ThemeIcon('target');

      // Set command to navigate to the requirement
      this.command = {
        command: 'requirements.navigateToRequirement',
        title: 'Navigate to Requirement',
        arguments: [requirement],
      };
    } else if (requirement && direction) {
      // This is a relationship item
      this.contextValue = 'relationship';
      this.description = requirement.status || '';
      this.tooltip = this.createTooltip(requirement, direction, linkType);

      // Set icon based on direction
      this.iconPath = new vscode.ThemeIcon(DIRECTION_ICONS[direction]);

      // Set command to navigate to the requirement
      this.command = {
        command: 'requirements.navigateToRequirement',
        title: 'Navigate to Requirement',
        arguments: [requirement],
      };
    } else if (direction && !requirement) {
      // This is a direction group header (Incoming/Outgoing)
      this.contextValue = 'relationshipGroup';
      this.description = count !== undefined ? `(${count})` : '';
      this.iconPath = new vscode.ThemeIcon(DIRECTION_ICONS[direction]);
    } else if (linkType) {
      // This is a link type group (satisfies, implements, etc.)
      this.contextValue = 'linkTypeGroup';
      this.description = count !== undefined ? `(${count})` : '';
      this.iconPath = new vscode.ThemeIcon('link');
    }
  }

  private createTooltip(
    req: RequirementObject,
    direction: 'incoming' | 'outgoing',
    linkType?: string
  ): vscode.MarkdownString {
    const directionText = direction === 'incoming' ? 'Referenced by' : 'References';
    const lines = [
      `**${req.id}** - ${req.title}`,
      '',
      `*${directionText}* via \`${linkType || 'link'}\``,
      '',
      req.description ? req.description.substring(0, 200) + (req.description.length > 200 ? '...' : '') : '',
    ];

    if (req.level) {
      lines.push('', `Level: ${req.level}`);
    }

    if (req.status) {
      lines.push('', `Status: ${req.status}`);
    }

    const markdown = new vscode.MarkdownString(lines.join('\n'));
    return markdown;
  }

  private createSelectedTooltip(req: RequirementObject): vscode.MarkdownString {
    const lines = [
      `**Currently Selected Requirement**`,
      '',
      `**${req.id}** - ${req.title}`,
      '',
      req.description ? req.description.substring(0, 300) + (req.description.length > 300 ? '...' : '') : '',
    ];

    if (req.level) {
      lines.push('', `Level: ${req.level}`);
    }

    if (req.status) {
      lines.push('', `Status: ${req.status}`);
    }

    if (req.type) {
      lines.push('', `Type: ${req.type}`);
    }

    const markdown = new vscode.MarkdownString(lines.join('\n'));
    return markdown;
  }
}

/**
 * Tree data provider for relationship explorer
 */
export class RelationshipExplorerProvider implements vscode.TreeDataProvider<RelationshipTreeItem> {
  private indexBuilder: IndexBuilder;
  private config: RigrConfig;
  private _onDidChangeTreeData = new vscode.EventEmitter<RelationshipTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private selectedRequirementId: string | null = null;

  constructor(indexBuilder: IndexBuilder, config: RigrConfig) {
    this.indexBuilder = indexBuilder;
    this.config = config;
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
   * Set the selected requirement to display relationships for
   */
  public setSelectedRequirement(requirementId: string | null): void {
    this.selectedRequirementId = requirementId;
    this.refresh();
  }

  /**
   * Get the currently selected requirement ID
   */
  public getSelectedRequirementId(): string | null {
    return this.selectedRequirementId;
  }

  /**
   * Get tree item
   */
  getTreeItem(element: RelationshipTreeItem): vscode.TreeItem {
    return element;
  }

  /**
   * Get children
   */
  getChildren(element?: RelationshipTreeItem): RelationshipTreeItem[] {
    if (!this.selectedRequirementId) {
      return [];
    }

    const selectedReq = this.indexBuilder.getRequirement(this.selectedRequirementId);
    if (!selectedReq) {
      return [];
    }

    if (!element) {
      // Root level - return Incoming and Outgoing groups
      return this.getRootItems(selectedReq);
    }

    if (element.direction && !element.linkType && !element.requirement) {
      // Direction group - return link type groups
      return this.getLinkTypeGroups(selectedReq, element.direction);
    }

    if (element.linkType && element.direction) {
      // Link type group - return individual relationships
      return this.getRelationshipItems(selectedReq, element.direction, element.linkType);
    }

    return [];
  }

  /**
   * Get root items (Selected header + Incoming and Outgoing groups)
   * Implements requirement 00299: Display selected requirement prominently
   */
  private getRootItems(selectedReq: RequirementObject): RelationshipTreeItem[] {
    const items: RelationshipTreeItem[] = [];

    // Add selected requirement header at the top (implements 00299)
    const headerItem = new RelationshipTreeItem(
      `${selectedReq.id} - ${selectedReq.title}`,
      vscode.TreeItemCollapsibleState.None,
      selectedReq,
      undefined,
      undefined,
      undefined,
      true  // isSelectedHeader
    );
    items.push(headerItem);

    // Count outgoing relationships
    const outgoingCount = Object.values(selectedReq.links)
      .reduce((sum, ids) => sum + ids.length, 0);

    // Count incoming relationships
    const incomingLinks = this.getIncomingLinks(selectedReq.id);
    const incomingCount = Object.values(incomingLinks)
      .reduce((sum, ids) => sum + ids.length, 0);

    // Add Outgoing group
    if (outgoingCount > 0) {
      items.push(new RelationshipTreeItem(
        'Outgoing',
        vscode.TreeItemCollapsibleState.Expanded,
        undefined,
        'outgoing',
        undefined,
        outgoingCount
      ));
    }

    // Add Incoming group
    if (incomingCount > 0) {
      items.push(new RelationshipTreeItem(
        'Incoming',
        vscode.TreeItemCollapsibleState.Expanded,
        undefined,
        'incoming',
        undefined,
        incomingCount
      ));
    }

    if (items.length === 1) {
      // Only the header - no relationships, add a message item
      const noRelItem = new RelationshipTreeItem(
        'No relationships',
        vscode.TreeItemCollapsibleState.None
      );
      noRelItem.description = 'This item has no links';
      items.push(noRelItem);
    }

    return items;
  }

  /**
   * Get link type groups for a direction
   */
  private getLinkTypeGroups(
    selectedReq: RequirementObject,
    direction: 'incoming' | 'outgoing'
  ): RelationshipTreeItem[] {
    const items: RelationshipTreeItem[] = [];

    if (direction === 'outgoing') {
      // Group by outgoing link types
      for (const [linkType, ids] of Object.entries(selectedReq.links)) {
        if (ids.length > 0) {
          const linkTypeInfo = this.config.linkTypes.find(lt => lt.option === linkType);
          const displayName = linkTypeInfo?.outgoing || linkType;

          items.push(new RelationshipTreeItem(
            displayName,
            vscode.TreeItemCollapsibleState.Expanded,
            undefined,
            'outgoing',
            linkType,
            ids.length
          ));
        }
      }
    } else {
      // Group by incoming link types
      const incomingLinks = this.getIncomingLinks(selectedReq.id);

      for (const [linkType, ids] of Object.entries(incomingLinks)) {
        if (ids.length > 0) {
          const linkTypeInfo = this.config.linkTypes.find(lt => lt.option === linkType);
          const displayName = linkTypeInfo?.incoming || `${linkType} (reverse)`;

          items.push(new RelationshipTreeItem(
            displayName,
            vscode.TreeItemCollapsibleState.Expanded,
            undefined,
            'incoming',
            linkType,
            ids.length
          ));
        }
      }
    }

    return items;
  }

  /**
   * Get individual relationship items for a link type
   */
  private getRelationshipItems(
    selectedReq: RequirementObject,
    direction: 'incoming' | 'outgoing',
    linkType: string
  ): RelationshipTreeItem[] {
    const items: RelationshipTreeItem[] = [];
    let ids: string[] = [];

    if (direction === 'outgoing') {
      ids = selectedReq.links[linkType] || [];
    } else {
      const incomingLinks = this.getIncomingLinks(selectedReq.id);
      ids = incomingLinks[linkType] || [];
    }

    for (const id of ids) {
      const req = this.indexBuilder.getRequirement(id);
      if (req) {
        items.push(new RelationshipTreeItem(
          `${req.id} - ${req.title}`,
          vscode.TreeItemCollapsibleState.None,
          req,
          direction,
          linkType
        ));
      } else {
        // Broken link - show with warning
        const brokenItem = new RelationshipTreeItem(
          `${id} (not found)`,
          vscode.TreeItemCollapsibleState.None,
          undefined,
          direction,
          linkType
        );
        brokenItem.iconPath = new vscode.ThemeIcon('warning');
        items.push(brokenItem);
      }
    }

    // Sort by ID
    items.sort((a, b) => a.label.toString().localeCompare(b.label.toString()));

    return items;
  }

  /**
   * Get incoming links for a requirement ID
   * Returns a map of link type -> array of source IDs
   */
  private getIncomingLinks(targetId: string): Record<string, string[]> {
    const incomingLinks: Record<string, string[]> = {};

    // Iterate through all requirements and find those that link to this one
    for (const req of this.indexBuilder.getAllRequirements()) {
      for (const [linkType, ids] of Object.entries(req.links)) {
        if (ids.includes(targetId)) {
          if (!incomingLinks[linkType]) {
            incomingLinks[linkType] = [];
          }
          incomingLinks[linkType].push(req.id);
        }
      }
    }

    return incomingLinks;
  }
}

/**
 * Register the relationship explorer view
 */
export function registerRelationshipExplorer(
  context: vscode.ExtensionContext,
  indexBuilder: IndexBuilder,
  config: RigrConfig
): RelationshipExplorerProvider {
  const provider = new RelationshipExplorerProvider(indexBuilder, config);

  const treeView = vscode.window.createTreeView('relationshipExplorer', {
    treeDataProvider: provider,
    showCollapseAll: true,
  });

  context.subscriptions.push(treeView);

  // Register command to navigate to a requirement and update selection
  context.subscriptions.push(
    vscode.commands.registerCommand('requirements.navigateToRequirement', async (requirement: RequirementObject) => {
      // Open the file at the requirement location
      const document = await vscode.workspace.openTextDocument(vscode.Uri.file(requirement.location.file));
      const editor = await vscode.window.showTextDocument(document);

      const line = requirement.location.line - 1;
      const position = new vscode.Position(line, 0);
      editor.selection = new vscode.Selection(position, position);
      editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);

      // Update the relationship explorer to show this requirement's relationships
      provider.setSelectedRequirement(requirement.id);

      // Also reveal in requirements explorer
      vscode.commands.executeCommand('requirements.revealInExplorer', requirement.id);
    })
  );

  // Register command to set selected requirement from requirements explorer
  context.subscriptions.push(
    vscode.commands.registerCommand('requirements.showRelationships', (requirementId: string) => {
      provider.setSelectedRequirement(requirementId);
    })
  );

  // Register refresh command
  context.subscriptions.push(
    vscode.commands.registerCommand('requirements.refreshRelationshipExplorer', () => {
      provider.refresh();
    })
  );

  return provider;
}
