/**
 * Rigr - Type Definitions
 */

/**
 * Object type definition from rigr_object_types in conf.py
 * Defines the type/nature of an object (requirement, rationale, information, parameter, etc.)
 */
export interface ObjectType {
  type: string;       // Object type value (e.g., "requirement", "rationale", "information")
  title: string;      // Display name (e.g., "Requirement", "Rationale")
  color?: string;     // Color for visualization
  style?: string;     // Display style
}

/**
 * Level definition from rigr_levels in conf.py
 * Defines abstraction tiers in the requirements hierarchy (stakeholder, system, component, etc.)
 */
export interface Level {
  level: string;      // Level identifier (e.g., "stakeholder", "system", "component")
  title: string;      // Display name (e.g., "Stakeholder Requirements", "System Requirements")
}

/**
 * ID configuration from rigr_id_config in conf.py
 * Controls how IDs are generated and formatted
 */
export interface IdConfig {
  prefix: string;     // Optional prefix for all IDs (e.g., "REQ")
  separator: string;  // Separator between prefix and number (e.g., "-")
  padding: number;    // Number of digits (e.g., 4 for "0001")
  start: number;      // Starting number for auto-increment
}

/**
 * @deprecated Use Level instead - kept for backwards compatibility during migration
 */
export interface IdPrefix {
  prefix: string;
  title: string;
}

/**
 * Link type definition from link types configuration in conf.py
 */
export interface LinkType {
  option: string;     // Forward link name (e.g., "satisfies")
  incoming: string;   // Reverse link name (e.g., "satisfied_by")
  outgoing: string;   // Outgoing link direction name
  style?: string;     // Link style for visualization
}

/**
 * Status definition from statuses configuration in conf.py
 */
export interface Status {
  status: string;     // Status name (e.g., "draft", "approved")
  color?: string;     // Color for status indication
}

/**
 * Complete Rigr configuration loaded from conf.py
 */
export interface RigrConfig {
  objectTypes: ObjectType[];    // Customizable object types (requirement, rationale, etc.)
  levels: Level[];              // Abstraction levels (stakeholder, system, component, etc.)
  idConfig: IdConfig;           // ID generation configuration
  linkTypes: LinkType[];
  statuses: Status[];
  id_regex: RegExp;             // Pattern for project-unique IDs (e.g., /\d{4}/g or /[A-Z]+-\d{4}/g)
  // Melexis.trace configuration (optional)
  traceability_item_id_regex?: string;
  traceability_relationships?: Record<string, string>;
  /** @deprecated Use levels instead */
  idPrefixes?: IdPrefix[];
}

/**
 * Location in source file
 */
export interface SourceLocation {
  file: string;       // Absolute file path
  line: number;       // Line number (1-based)
  endLine?: number;   // End line number for multi-line content
}

/**
 * Parsed requirement object
 */
export interface RequirementObject {
  id: string;                         // Project-unique ID (e.g., "0001", "0042")
  type: string;                       // Object type from objectTypes (e.g., "requirement", "rationale")
  level?: string;                     // Abstraction level from levels (e.g., "stakeholder", "system")
  title: string;                      // Object title
  description: string;                // Full description text
  status?: string;                    // Status from statuses
  links: Record<string, string[]>;    // Link type -> array of linked IDs
  metadata: Record<string, string>;   // Additional fields
  location: SourceLocation;           // File location
  baseline?: string;                  // Release baseline tag
}

/**
 * Requirement index for efficient lookup
 */
export interface RequirementIndex {
  objects: Map<string, RequirementObject>;     // id -> requirement
  fileIndex: Map<string, Set<string>>;         // file path -> set of IDs
  typeIndex: Map<string, Set<string>>;         // type -> set of IDs
  levelIndex: Map<string, Set<string>>;        // level -> set of IDs
  statusIndex: Map<string, Set<string>>;       // status -> set of IDs
  linkGraph: Map<string, Set<string>>;         // id -> set of linked IDs (all directions)
  baselines: Map<string, Set<string>>;         // baseline -> set of IDs
}

/**
 * Validation diagnostic types
 */
export enum DiagnosticType {
  BrokenLink = 'brokenLink',
  DuplicateId = 'duplicateId',
  CircularDep = 'circularDep',
  OrphanedReq = 'orphanedReq',
  StatusInconsistent = 'statusInconsistent',
  InvalidStatus = 'invalidStatus',
  InvalidType = 'invalidType',
  InvalidLevel = 'invalidLevel',
  MissingType = 'missingType',
  MissingLevel = 'missingLevel',
  MissingId = 'missingId',
  MissingCoverage = 'missingCoverage',
}

/**
 * Validation result for a single issue
 */
export interface ValidationIssue {
  type: DiagnosticType;
  message: string;
  location: SourceLocation;
  relatedIds?: string[];       // Related requirement IDs
  severity: 'error' | 'warning' | 'info';
}

/**
 * Deep validation result
 */
export interface DeepValidationResult {
  issues: ValidationIssue[];
  coverage: {
    total: number;
    withLinks: number;
    percentage: number;
  };
  circularDeps: string[][];    // Arrays of IDs forming cycles
  orphanedReqs: string[];      // IDs with no links
}

/**
 * Release report data
 */
export interface ReleaseReport {
  baseline: string;
  generatedAt: Date;
  summary: {
    total: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
  };
  newRequirements?: string[];
  modifiedRequirements?: Array<{
    id: string;
    changes: string[];
  }>;
  removedRequirements?: string[];
  coverage: {
    matrix: Record<string, Record<string, { covered: number; total: number }>>;
  };
}

/**
 * Tree view grouping options
 */
export type TreeViewGroupBy = 'type' | 'level' | 'file' | 'status';

/**
 * Extension settings from VS Code configuration
 */
export interface ExtensionSettings {
  validation: {
    automatic: boolean;
    onSave: boolean;
    debounceMs: number;
    checkCircularDeps: boolean;
    checkCoverage: boolean;
  };
  treeView: {
    groupBy: TreeViewGroupBy;
    showStatusIcons: boolean;
  };
  indexing: {
    maxFiles: number;
    excludePatterns: string[];
  };
  config: {
    overrideConfig: boolean;
    customTypes: ObjectType[];
  };
}

/**
 * Reference to a requirement in a file
 */
export interface RequirementReference {
  id: string;
  location: SourceLocation;
  context: 'link' | 'inline' | 'definition';
}

/**
 * Parsed content from an RST file
 */
export interface ParsedRstFile {
  filePath: string;
  requirements: RequirementObject[];
  references: RequirementReference[];
  parseErrors: Array<{
    line: number;
    message: string;
  }>;
}

/**
 * Index update event
 */
export interface IndexUpdateEvent {
  type: 'add' | 'update' | 'remove';
  affectedIds: string[];
  file?: string;
}

/**
 * Configuration load result
 */
export interface ConfigLoadResult {
  success: boolean;
  config?: RigrConfig;
  error?: string;
  source: 'conf.py' | 'settings' | 'defaults';
}
