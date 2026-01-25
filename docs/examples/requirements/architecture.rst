.. _rigr-architecture:

==============================
Architecture and Implementation
==============================

This document describes the actual implementation architecture of the Rigr extension,
mapping design elements to the requirements they implement.

.. contents:: Table of Contents
   :local:
   :depth: 2

Architecture Overview
=====================

.. item:: Rigr extension architecture
   :id: 00254
   :type: information
   :level: component
   :status: approved

   The Rigr extension follows a layered architecture with clear separation of concerns:

   - **Configuration Layer**: Loads and manages configuration from conf.py and VS Code settings
   - **Indexing Layer**: Parses RST files and maintains an in-memory index
   - **Provider Layer**: Implements VS Code language features (completion, hover, etc.)
   - **Validation Layer**: Performs automatic and deep validation analysis
   - **Views Layer**: Provides UI components (tree view, status bar)
   - **Commands Layer**: Implements user commands for validation, baselines, reports

Component Diagram
=================

.. graphic:: Rigr Extension Component Architecture
   :id: 00255
   :caption: Component diagram showing the VS Code extension architecture layers and their interactions.

   @startuml Rigr Architecture
   skinparam componentStyle uml2
   skinparam backgroundColor #FEFEFE

   package "VS Code Extension Host" {
     [extension.ts] as EXT
     note right of EXT : Entry point\nActivation & registration
   }

   package "Configuration Layer" <<Rectangle>> {
     [ConfigLoader] as CL
     [SettingsManager] as SM
     [defaults.ts] as DEF
     CL --> DEF : fallback
     SM --> DEF : defaults
   }

   package "Indexing Layer" <<Rectangle>> {
     [RstParser] as RST
     [IndexBuilder] as IB
     [IndexCache] as IC
     RST --> IB : parsed objects
     IB --> IC : persist/load
   }

   package "Provider Layer" <<Rectangle>> {
     [CompletionProvider] as CP
     [HoverProvider] as HP
     [DefinitionProvider] as DP
     [ReferenceProvider] as RP
     [DiagnosticProvider] as DGP
     [CodeActionProvider] as CAP
   }

   package "Validation Layer" <<Rectangle>> {
     [DeepValidationRunner] as DVR
     [CircularDependencyDetector] as CDD
     [HierarchicalCoverageAnalyzer] as HCA
     [OrphanDetector] as OD
     [StatusConsistencyValidator] as SCV
     [CompletenessAnalyzer] as CA
     [GapAnalyzer] as GA
     DVR --> CDD
     DVR --> HCA
     DVR --> OD
     DVR --> SCV
     DVR --> CA
     DVR --> GA
   }

   package "Views Layer" <<Rectangle>> {
     [TreeViewProvider] as TVP
     [StatusBar] as SB
   }

   package "Commands Layer" <<Rectangle>> {
     [ValidationCommand] as VC
     [BaselineCommands] as BC
     [ReportCommands] as RC
     [ProjectCommands] as PC
   }

   package "Utilities" <<Rectangle>> {
     [IdGenerator] as IG
     [GraphAnalysis] as GRA
   }

   ' Main connections
   EXT --> CL : load config
   EXT --> SM : settings
   EXT --> IB : create index
   EXT --> CP : register
   EXT --> HP : register
   EXT --> DP : register
   EXT --> RP : register
   EXT --> DGP : register
   EXT --> CAP : register
   EXT --> TVP : register
   EXT --> VC : register
   EXT --> BC : register
   EXT --> RC : register
   EXT --> PC : register

   ' Provider dependencies
   CP --> IB : query
   HP --> IB : query
   DP --> IB : query
   RP --> IB : query
   DGP --> IB : query
   DGP --> RST : parse
   CAP --> IB : query

   ' Command dependencies
   VC --> DVR : run
   RC --> IB : query
   BC --> IB : query

   ' Utility dependencies
   DVR --> GRA : graph ops
   CP --> IG : next ID

   ' View dependencies
   TVP --> IB : subscribe

   @enduml

Entry Point
===========

.. item:: Extension entry point
   :id: 00256
   :type: design_element
   :level: component
   :status: implemented
   :implements: 00027, 00028, 00029, 00188, 00189, 00190, 00191

   **File**: ``src/extension.ts``

   The extension entry point handles:

   - Extension activation and VS Code API registration
   - Configuration loading with fallback to defaults
   - Index builder initialization and cache management
   - Provider registration (completion, hover, definition, etc.)
   - Command registration (validation, baseline, reports)
   - Status bar creation and updates
   - File watcher setup for automatic re-indexing
   - Configuration change event handling

Configuration Layer
===================

.. item:: ConfigLoader component
   :id: 00257
   :type: design_element
   :level: component
   :status: implemented
   :implements: 00004, 00005, 00006, 00007, 00008, 00010, 00012, 00014, 00016

   **File**: ``src/configuration/configLoader.ts``

   Loads Rigr configuration from Sphinx conf.py:

   - Searches for conf.py in docs/, doc/, source/, or workspace root
   - Executes embedded Python script to extract configuration as JSON
   - Parses rigr_object_types, rigr_levels, rigr_id_config, rigr_link_types, rigr_statuses
   - Falls back to default configuration on parse failure
   - Supports legacy rigr_id_prefixes for backwards compatibility

.. item:: SettingsManager component
   :id: 00258
   :type: design_element
   :level: component
   :status: implemented
   :implements: 00021, 00022, 00023, 00024

   **File**: ``src/configuration/settingsManager.ts``

   Manages VS Code extension settings:

   - Reads rigr.validation.* settings (automatic, onSave, debounceMs)
   - Reads rigr.treeView.* settings (groupBy, showStatusIcons)
   - Reads rigr.indexing.* settings (maxFiles, excludePatterns)
   - Provides typed getters for all settings
   - Emits change events when settings are modified

.. item:: Default configuration
   :id: 00259
   :type: design_element
   :level: component
   :status: implemented
   :implements: 00009, 00011, 00013, 00015, 00018, 00019, 00020

   **File**: ``src/configuration/defaults.ts``

   Provides default configuration values:

   - Default object types: requirement, rationale, information, parameter, design_element
   - Default levels: stakeholder, system, component, software, hardware
   - Default link types: satisfies/satisfied_by, implements/implemented_by, etc.
   - Default statuses: draft, review, approved, implemented, deprecated
   - Default ID config: 5-digit padding, no prefix
   - Helper functions for type/level/status lookups

Indexing Layer
==============

.. item:: RstParser component
   :id: 00260
   :type: design_element
   :level: component
   :status: implemented
   :implements: 00037, 00038, 00039, 00040, 00041, 00042

   **File**: ``src/indexing/rstParser.ts``

   Parses RST files for requirement directives:

   - Regex-based parsing for ``.. item::`` directives
   - Extracts field list options (:id:, :type:, :level:, :status:, etc.)
   - Handles multi-line descriptions with proper indentation tracking
   - Detects inline ``:item:`ID``` references in description text
   - Reports parse errors with line numbers
   - Context detection for completion triggers (link fields, inline refs)

   **Test file**: ``src/indexing/rstParser.test.ts``

.. item:: IndexBuilder component
   :id: 00261
   :type: design_element
   :level: component
   :status: implemented
   :implements: 00034, 00035, 00036, 00043, 00044, 00045, 00046, 00047, 00048, 00049, 00050, 00051, 00052

   **File**: ``src/indexing/indexBuilder.ts``

   Builds and maintains the requirement index:

   - Primary index: Map<id, RequirementObject>
   - Secondary indexes: fileIndex, typeIndex, levelIndex, statusIndex
   - Bidirectional link graph with automatic reverse link computation
   - Baseline index for release filtering
   - Full workspace scan with progress reporting
   - Incremental updates on file change events
   - File system watchers for automatic re-indexing
   - Respects exclude patterns from settings

.. item:: IndexCache component
   :id: 00262
   :type: design_element
   :level: component
   :status: implemented
   :implements: 00053, 00054, 00055

   **File**: ``src/indexing/indexCache.ts``

   Persists index to disk for faster startup:

   - Saves to ``.vscode/requirements-index.json``
   - Includes version, timestamp, and config hash for invalidation
   - Validates cache against file modification times
   - Handles corrupted cache gracefully (triggers rebuild)

Provider Layer
==============

.. item:: CompletionProvider component
   :id: 00263
   :type: design_element
   :level: component
   :status: implemented
   :implements: 00059, 00060, 00061, 00062, 00063, 00064, 00065, 00066, 00067, 00068, 00069, 00079, 00080, 00081

   **File**: ``src/providers/completionProvider.ts``

   Provides intelligent autocompletion:

   - Triggers on ".." for new item snippets
   - Triggers in link field context for ID completion
   - Triggers on ``:item:``` for inline references
   - Generates dynamic snippets from configured object types
   - Auto-generates next available unique ID
   - Displays ID, title, type, level, status in completion items
   - Fuzzy filtering on ID and title
   - Documentation preview with full description

.. item:: HoverProvider component
   :id: 00264
   :type: design_element
   :level: component
   :status: implemented
   :implements: 00070, 00071, 00072

   **File**: ``src/providers/hoverProvider.ts``

   Shows requirement details on hover:

   - Detects requirement ID under cursor
   - Displays formatted Markdown with all metadata
   - Shows type, level, status, baseline
   - Shows description (truncated if long)
   - Lists all links grouped by link type
   - Shows file location with line number

.. item:: DefinitionProvider component
   :id: 00265
   :type: design_element
   :level: component
   :status: implemented
   :implements: 00073, 00074, 00075

   **File**: ``src/providers/definitionProvider.ts``

   Enables go-to-definition navigation:

   - F12 / Ctrl+Click to jump to definition
   - Works from link field values
   - Works from inline ``:item:``` references
   - Returns Location for VS Code navigation

.. item:: ReferenceProvider component
   :id: 00266
   :type: design_element
   :level: component
   :status: implemented
   :implements: 00076, 00077, 00078

   **File**: ``src/providers/referenceProvider.ts``

   Finds all references to a requirement:

   - Shift+F12 to show all references
   - Includes definition location
   - Includes all link field references
   - Includes all inline text references
   - Returns Location array for references panel

.. item:: DiagnosticProvider component
   :id: 00267
   :type: design_element
   :level: component
   :status: implemented
   :implements: 00090, 00091, 00092, 00093, 00094, 00095, 00096, 00097, 00098, 00099, 00135, 00198

   **File**: ``src/providers/diagnosticProvider.ts``

   Provides real-time validation diagnostics:

   - Validates on file save (debounced)
   - Detects broken links (ERROR)
   - Detects duplicate IDs (ERROR)
   - Detects invalid type values (ERROR)
   - Detects invalid level values (ERROR)
   - Detects invalid status values (WARNING)
   - Detects missing required fields (WARNING)
   - Maps diagnostic types to VS Code severities
   - Creates diagnostics with proper ranges

.. item:: CodeActionProvider component
   :id: 00268
   :type: design_element
   :level: component
   :status: implemented
   :implements: 00135, 00136

   **File**: ``src/providers/codeActionProvider.ts``

   Provides quick fix suggestions:

   - "Create requirement [ID]" for broken links
   - "Remove link" for broken links
   - Change to valid type/level/status values
   - Generates WorkspaceEdit for automatic fixes

Validation Layer
================

.. item:: DeepValidationRunner component
   :id: 00269
   :type: design_element
   :level: component
   :status: implemented
   :implements: 00100, 00101

   **File**: ``src/validation/deepValidationRunner.ts``

   Orchestrates comprehensive deep validation:

   - Runs all validation checks in sequence
   - Aggregates findings from all analyzers
   - Generates structured DeepValidationReport
   - Computes summary statistics (blocker, high, medium, low counts)
   - Generates gap recommendations

   **Test file**: ``src/validation/deepValidation.test.ts``

.. item:: CircularDependencyDetector component
   :id: 00270
   :type: design_element
   :level: component
   :status: implemented
   :implements: 00102, 00103, 00104, 00105

   **File**: ``src/validation/circularDependencyDetector.ts``

   Detects cycles in the dependency graph:

   - Implements cycle detection algorithm
   - Identifies minimal cycles
   - Reports full cycle paths
   - Classifies by severity (direct vs. longer cycles)

   **Test file**: ``src/validation/circularDependencyDetector.test.ts``

.. item:: HierarchicalCoverageAnalyzer component
   :id: 00271
   :type: design_element
   :level: component
   :status: implemented
   :implements: 00106, 00107, 00108, 00109

   **File**: ``src/validation/hierarchicalCoverageAnalyzer.ts``

   Calculates traceability coverage metrics:

   - Computes coverage per level transition
   - Calculates forward and backward coverage
   - Groups by link type (satisfies, implements, etc.)
   - Identifies specific coverage gaps
   - Applies configurable thresholds

.. item:: OrphanDetector component
   :id: 00272
   :type: design_element
   :level: component
   :status: implemented
   :implements: 00110, 00111, 00112

   **File**: ``src/validation/orphanDetector.ts``

   Identifies orphaned requirements:

   - True orphans: no links at all
   - Dead-end items: incoming only (leaf nodes)
   - Source items: outgoing only (root nodes)
   - Categorizes severity by priority

.. item:: StatusConsistencyValidator component
   :id: 00273
   :type: design_element
   :level: component
   :status: implemented
   :implements: 00113, 00114, 00115

   **File**: ``src/validation/statusConsistencyValidator.ts``

   Validates status consistency across links:

   - Detects approved depending on draft
   - Detects implemented depending on review
   - Validates status transitions
   - Reports inconsistency chains

.. item:: CompletenessAnalyzer component
   :id: 00274
   :type: design_element
   :level: component
   :status: implemented
   :implements: 00116, 00117, 00118, 00119, 00120, 00121, 00122, 00123

   **File**: ``src/validation/completenessAnalyzer.ts``

   Verifies hierarchical completeness:

   - Complete chain verification (stakeholder -> ... -> test)
   - Missing level detection
   - Bidirectional traceability validation
   - Priority-weighted coverage calculation
   - Baseline stability analysis
   - Baseline leakage detection

.. item:: GapAnalyzer component
   :id: 00275
   :type: design_element
   :level: component
   :status: implemented
   :implements: 00130, 00131, 00132

   **File**: ``src/validation/gapAnalyzer.ts``

   Generates actionable gap recommendations:

   - Identifies missing implementations
   - Identifies orphaned implementations
   - Identifies broken chains
   - Prioritizes by business impact
   - Suggests specific actions to resolve gaps

Views Layer
===========

.. item:: TreeViewProvider component
   :id: 00276
   :type: design_element
   :level: component
   :status: implemented
   :implements: 00178, 00179, 00180, 00181, 00182, 00183, 00184, 00185, 00186

   **File**: ``src/views/treeViewProvider.ts``

   Provides the Requirements Explorer tree view:

   - Implements VS Code TreeDataProvider
   - Supports grouping by type, level, file, status
   - Displays ID, title, level, status with icons
   - Click to navigate to definition
   - Context menu for actions
   - Refresh and filter controls
   - Orphaned requirements section
   - Subscribes to index updates for auto-refresh

.. item:: RelationshipExplorerProvider component
   :id: 00290
   :type: design_element
   :level: component
   :status: implemented
   :implements: 00285, 00286, 00287, 00288, 00289

   **File**: ``src/views/relationshipExplorerProvider.ts``

   Provides the Relationship Explorer tree view:

   - Shows incoming and outgoing relationships for selected requirement
   - Groups relationships by direction (Incoming/Outgoing)
   - Sub-groups by link type (satisfies, implements, etc.)
   - Displays relationship items with direction icons
   - Click to navigate to related requirement
   - Updates automatically when selection changes in Requirements Explorer
   - Bidirectional navigation between explorers

Commands Layer
==============

.. item:: ValidationCommand component
   :id: 00277
   :type: design_element
   :level: component
   :status: implemented
   :implements: 00100, 00200

   **File**: ``src/commands/validation.ts``

   Implements the deep validation command:

   - "Rigr: Deep Validation" command
   - Runs DeepValidationRunner
   - Displays progress notification
   - Shows results in output channel or webview

.. item:: BaselineCommands component
   :id: 00278
   :type: design_element
   :level: component
   :status: implemented
   :implements: 00148, 00149, 00150, 00151, 00152, 00167, 00168

   **File**: ``src/commands/baseline.ts``

   Implements baseline management commands:

   - "Rigr: Tag Current Baseline"
   - "Rigr: Remove Baseline Tags"
   - Prompts for baseline name
   - Validates baseline eligibility
   - Applies tags to eligible requirements
   - Reports tagged count

.. item:: ReportCommands component
   :id: 00279
   :type: design_element
   :level: component
   :status: implemented
   :implements: 00156, 00157, 00158, 00159, 00160, 00161

   **File**: ``src/commands/reports.ts``

   Implements report generation commands:

   - "Rigr: Generate Release Report"
   - Collects data from index
   - Formats Markdown report
   - Includes summary, changes, coverage sections
   - Saves to docs/releases/ directory

.. item:: ProjectCommands component
   :id: 00280
   :type: design_element
   :level: component
   :status: implemented
   :implements: 00083, 00084, 00085, 00086

   **File**: ``src/commands/project.ts``

   Implements project creation commands:

   - "Rigr: New Project"
   - Template selection (minimal, standard, automotive)
   - Creates docs/conf.py with configuration
   - Creates example requirements structure
   - Creates .vscode/settings.json

   **Templates file**: ``src/commands/templates.ts``
   **Test file**: ``src/commands/project.test.ts``

Utilities
=========

.. item:: IdGenerator utility
   :id: 00281
   :type: design_element
   :level: component
   :status: implemented
   :implements: 00063, 00017

   **File**: ``src/utils/idGenerator.ts``

   Generates unique requirement IDs:

   - Tracks all existing IDs in project
   - Computes next sequential number
   - Applies configured prefix and padding
   - Guarantees project-wide uniqueness

   **Test file**: ``src/utils/idGenerator.test.ts``

.. item:: GraphAnalysis utility
   :id: 00282
   :type: design_element
   :level: component
   :status: implemented
   :implements: 00102, 00116

   **File**: ``src/utils/graphAnalysis.ts``

   Provides graph operations for validation:

   - Builds adjacency lists from link graph
   - Cycle detection algorithms
   - Transitive closure computation
   - Path finding for coverage analysis

   **Test file**: ``src/utils/graphAnalysis.test.ts``

Type Definitions
================

.. item:: Core type definitions
   :id: 00283
   :type: design_element
   :level: component
   :status: implemented
   :implements: 00034, 00035, 00036

   **File**: ``src/types.ts``

   Defines all TypeScript interfaces:

   - ObjectType, Level, IdConfig, LinkType, Status
   - RigrConfig - complete configuration
   - RequirementObject - parsed requirement
   - RequirementIndex - index structure
   - DiagnosticType enum
   - ValidationIssue, DeepValidationResult
   - ExtensionSettings
   - ParsedRstFile, RequirementReference

Implementation Status Summary
=============================

.. item:: Implementation coverage summary
   :id: 00284
   :type: information
   :level: component
   :status: approved

   **Implemented Features** (traced to requirements above):

   - Configuration: conf.py loading, VS Code settings, defaults
   - Indexing: RST parsing, index building, caching
   - IntelliSense: completion, hover, definition, references
   - Validation: automatic diagnostics, deep validation with all DV checks
   - UI: tree view, status bar
   - Commands: validation, baseline, reports, project creation

   **Test Coverage**:

   - rstParser.test.ts - RST parsing
   - circularDependencyDetector.test.ts - Cycle detection
   - deepValidation.test.ts - Deep validation
   - idGenerator.test.ts - ID generation
   - defaults.test.ts - Default configuration
   - graphAnalysis.test.ts - Graph utilities
   - project.test.ts - Project creation

   **Not Yet Implemented** (requirements in draft status):

   - 00124 through 00129: Interactive traceability matrix and graph webviews
   - 00133, 00134: Historical trend analysis, compliance reporting
   - 00163 through 00165: Git tag integration
   - 00171: Baseline timeline view
   - 00206 through 00208: Webview panels for reports
