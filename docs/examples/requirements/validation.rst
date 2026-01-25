.. _rigr-validation:

==============================
Validation and Diagnostics
==============================

This document specifies requirements for validation, diagnostics,
deep analysis, and quick fixes in the Rigr extension.

.. contents:: Table of Contents
   :local:
   :depth: 2

Stakeholder Requirements
========================

.. item:: Real-time error detection
   :id: 00087
   :type: requirement
   :level: stakeholder
   :status: approved

   Requirements engineers shall be notified of errors and inconsistencies
   in real-time while editing, before documentation is built or published.

.. item:: Release readiness verification
   :id: 00088
   :type: requirement
   :level: stakeholder
   :status: approved

   Before release, stakeholders shall be able to verify complete traceability
   coverage and identify any gaps or inconsistencies.

.. item:: Actionable error resolution
   :id: 00089
   :type: requirement
   :level: stakeholder
   :status: approved

   When errors are detected, users shall be provided with clear guidance
   and quick actions to resolve them.

Validation Strategy
===================

.. item:: Hybrid validation approach
   :id: 00090
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00087, 00088

   The extension shall implement a hybrid validation strategy:

   - Automatic validation: Lightweight checks on save (fast)
   - Deep validation: Comprehensive analysis on command (thorough)

.. item:: Rationale for hybrid approach
   :id: 00091
   :type: rationale
   :level: system
   :status: approved
   :derives_from: 00090

   Hybrid validation balances responsiveness with thoroughness:

   - Automatic checks catch common errors instantly
   - Deep checks avoid performance impact during editing
   - Users control when to run expensive analysis

Automatic Validation
====================

.. item:: Automatic validation trigger
   :id: 00092
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00087

   Automatic validation shall be triggered on file save with
   configurable debouncing (default: 500ms).

.. item:: Broken link detection
   :id: 00093
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00092

   The extension shall detect and report links to non-existent
   requirement IDs as ERROR diagnostics.

.. item:: Duplicate ID detection
   :id: 00094
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00092

   The extension shall detect and report duplicate IDs (same ID
   defined multiple times) as ERROR diagnostics with all locations.

.. item:: Invalid type detection
   :id: 00095
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00092

   The extension shall detect type field values not in configured
   ``rigr_object_types`` as ERROR diagnostics.

.. item:: Invalid level detection
   :id: 00096
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00092

   The extension shall detect level field values not in configured
   ``rigr_levels`` as ERROR diagnostics.

.. item:: Invalid status detection
   :id: 00097
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00092

   The extension shall detect status field values not in configured
   ``rigr_statuses`` as WARNING diagnostics.

.. item:: Missing required fields
   :id: 00098
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00092

   The extension shall detect missing required fields:

   - Missing ``:id:`` - ERROR
   - Missing ``:type:`` - WARNING
   - Missing ``:level:`` - WARNING

.. item:: Syntax error detection
   :id: 00099
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00092

   The extension shall detect malformed RST directive syntax
   as ERROR diagnostics with position information.

Deep Validation Command
=======================

.. item:: Deep validation command
   :id: 00100
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00088

   The extension shall provide a command "Rigr: Deep Validation"
   for comprehensive analysis that is too expensive for real-time.

.. item:: Deep validation output
   :id: 00101
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00100

   Deep validation shall generate an HTML report with:

   - Executive summary with key metrics
   - Detailed findings by category
   - Interactive visualizations
   - Actionable recommendations

Circular Dependency Detection
=============================

.. item:: Cycle detection in dependency graph
   :id: 00102
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00100

   Deep validation SHALL detect all cycles in the requirements
   dependency graph formed by link relationships.

.. item:: Minimal cycle identification
   :id: 00103
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00102

   The extension SHALL identify minimal cycles (shortest path
   forming the cycle) to aid in resolution.

.. item:: Cycle path reporting
   :id: 00104
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00102

   Cycles SHALL be reported with full path:

   ``00001 -> 00002 -> 00005 -> 00001``

.. item:: Cycle severity levels
   :id: 00105
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00102

   Cycles SHALL be flagged by severity:

   - ERROR: Direct circular dependency (A -> B -> A)
   - WARNING: Longer cycles (A -> B -> C -> A)

.. item:: Cycle break suggestion
   :id: 00106
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00102, 00089

   The extension SHALL provide "Break cycle at link" quick fix
   suggesting which link to remove to break the cycle.

Traceability Coverage Analysis
==============================

.. item:: Hierarchical coverage calculation
   :id: 00107
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00100

   Deep validation SHALL calculate coverage for each level transition:

   - Forward coverage: % of upper-level items with downstream links
   - Backward coverage: % of lower-level items with upstream links

.. item:: Coverage by link type
   :id: 00108
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00107

   Coverage SHALL be computed per configured link type:

   - ``satisfies``: stakeholder -> system coverage
   - ``implements``: system -> component coverage
   - ``tests``: component -> test coverage

.. item:: Coverage report format
   :id: 00109
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00107

   Coverage SHALL be reported as:

   .. code-block:: text

      Traceability Coverage:
      - stakeholder -> system (satisfies):  42/45 (93%)  Good
      - system -> component (implements):   35/42 (83%)  Needs improvement
      - component -> test (tests):          28/35 (80%)  Needs improvement

.. item:: Coverage gap identification
   :id: 00110
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00107

   Specific gaps SHALL be identified:

   "00003, 00012, 00027 have no system implementation"

.. item:: Coverage threshold parameters
   :id: 00111
   :type: parameter
   :level: system
   :status: approved
   :derives_from: 00107

   Configurable coverage thresholds:

   - Good: >= 90%
   - Warning: >= 70%
   - Error: < 70%

Orphaned Requirements Detection
===============================

.. item:: Orphan identification
   :id: 00112
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00100

   Deep validation SHALL identify requirements with no incoming
   OR outgoing links (true orphans).

.. item:: Orphan categorization
   :id: 00113
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00112

   Orphans SHALL be categorized by type:

   - True orphans: No links at all
   - Dead-end items: Incoming links only (leaf nodes, may be valid)
   - Source items: Outgoing links only (root nodes, may be valid)

.. item:: Orphan severity by priority
   :id: 00114
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00112

   Orphan severity SHALL depend on priority:

   - ERROR: Critical/high priority items with no links
   - WARNING: Medium priority orphaned items
   - INFO: Low priority or draft orphaned items

.. item:: Orphan link suggestions
   :id: 00115
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00112, 00089

   The extension SHALL provide "Add link to..." quick fix with
   suggestions based on:

   - Same level matching
   - Similar title text (fuzzy matching)
   - Same file proximity

Status Consistency Analysis
===========================

.. item:: Status mismatch detection
   :id: 00116
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00100

   Deep validation SHALL detect status mismatches across links:

   - ERROR: Approved requirement depends on draft requirement
   - WARNING: Implemented depends on review-status requirement
   - WARNING: Baselined links to non-baselined requirement

.. item:: Status transition validation
   :id: 00117
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00116

   Status transitions SHALL be validated:

   - Valid: draft -> review -> approved -> implemented
   - ERROR: approved -> draft regression without justification

.. item:: Status inconsistency chain reporting
   :id: 00118
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00116

   Inconsistency chains SHALL be reported:

   .. code-block:: text

      Status Inconsistency Chain:
      00001 (approved) -> 00005 (draft) -> 00012 (approved)
                               ^ Problem here

.. item:: Bulk status update action
   :id: 00119
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00116, 00089

   The extension SHALL provide "Update downstream statuses"
   bulk action to resolve chains.

Hierarchical Completeness
=========================

.. item:: Complete chain verification
   :id: 00120
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00100

   Deep validation SHALL verify complete traceability chains:

   For each stakeholder item, verify:
   stakeholder -> system -> component -> test chain exists

   Report: "00001 complete chain (4 levels), 00002 broken at system"

.. item:: Missing level detection
   :id: 00121
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00120

   Level gaps SHALL be identified:

   - Gap: 00001 -> 00005 (missing system intermediary)
   - Report: "Direct jump from stakeholder to component - missing system"

.. item:: Bidirectional traceability validation
   :id: 00122
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00120

   Bidirectional links SHALL be validated:

   - Forward: stakeholder `satisfies` -> system
   - Backward: system `satisfied_by` -> stakeholder
   - ERROR if forward exists but backward missing

Priority-Weighted Coverage
==========================

.. item:: Priority-weighted coverage calculation
   :id: 00123
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00100

   Coverage SHALL be calculated weighted by priority:

   .. code-block:: text

      Priority-Weighted Coverage:
      - Critical: 45/45 (100%)  PASS
      - High:     38/40 (95%)   PASS
      - Medium:   22/30 (73%)   WARNING
      - Low:      8/15  (53%)   INFO

.. item:: Priority coverage thresholds
   :id: 00124
   :type: parameter
   :level: system
   :status: approved
   :derives_from: 00123

   Priority coverage targets:

   - Critical: 100% required
   - High: >= 95% target
   - Medium: >= 85% target
   - Low: >= 70% target

.. item:: High priority blocker
   :id: 00125
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00123

   High-priority requirements with no implementation SHALL be
   flagged as BLOCKER for release.

Baseline Stability Analysis
===========================

.. item:: Baseline status consistency
   :id: 00126
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00100

   Deep validation SHALL verify baseline consistency:

   - All baselined items must have stable status (approved/implemented)
   - ERROR: Baselined item in draft or review status

.. item:: Baseline leakage detection
   :id: 00127
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00126

   Baseline leakage SHALL be detected:

   - WARNING: Baselined item links to non-baselined item
   - Report: "00001 (v1.0.0) depends on 00005 (no baseline)"

.. item:: Baseline version conflicts
   :id: 00128
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00126

   Version conflicts within baseline SHALL be reported:

   All items in same baseline should have same version tag.

Traceability Matrix Generation
==============================

.. item:: Interactive traceability matrix
   :id: 00129
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00100, 00088

   Deep validation SHALL generate an interactive matrix showing:

   - Rows: Source level (stakeholder, system)
   - Columns: Target level (system, component)
   - Cells: Link count, link type, coverage indicator

.. item:: Matrix filtering
   :id: 00130
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00129

   Matrix SHALL support filtering by:

   - Link type (satisfies, implements, tests)
   - Status (approved, draft, etc.)
   - Priority level
   - Baseline version

.. item:: Matrix export formats
   :id: 00131
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00129

   Matrix SHALL be exportable as:

   - HTML with clickable cells
   - CSV for analysis in spreadsheet tools
   - Markdown for documentation

Graph Visualization
===================

.. item:: Dependency graph visualization
   :id: 00132
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00100

   Deep validation SHALL generate a dependency graph showing:

   - Nodes: Requirements colored by type and/or level
   - Edges: Links labeled by link type
   - Visual indicators: status, priority, baseline

.. item:: Graph layouts
   :id: 00133
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00132

   Graph SHALL support layouts:

   - Hierarchical: Top-down tree layout by level
   - Circular: Cycle emphasis
   - Force-directed: General overview

.. item:: Graph interactivity
   :id: 00134
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00132

   Graph SHALL allow interactive navigation:

   - Click node: Jump to definition
   - Hover edge: Show link details
   - Filter: By type/level/status/baseline

Gap Analysis Report
===================

.. item:: Actionable gap identification
   :id: 00135
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00100, 00088

   Gap analysis SHALL identify actionable items:

   - Missing implementations: Stakeholder/system items with no downstream
   - Orphaned implementations: Component/test items with no upstream
   - Broken chains: Incomplete traceability paths

.. item:: Gap prioritization
   :id: 00136
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00135

   Gaps SHALL be prioritized by business impact:

   - BLOCKER: Critical requirements not implemented
   - HIGH: High priority with poor coverage
   - MEDIUM: Status inconsistencies
   - LOW: Documentation gaps (orphaned info/rationale)

.. item:: Gap resolution suggestions
   :id: 00137
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00135, 00089

   Specific actions SHALL be suggested:

   - "Create system requirement to satisfy 00003"
   - "Add test case for 00012"
   - "Link 00008 to upstream 00002"

Future Enhancements
===================

.. item:: Historical trend analysis
   :id: 00138
   :type: requirement
   :level: system
   :status: draft
   :satisfies: 00100

   Future: Track coverage metrics over time (Git commits):

   - Coverage improving/declining trends
   - New orphaned requirements introduced
   - Cycles added/removed
   - Burndown chart for release readiness

.. item:: Compliance reporting
   :id: 00139
   :type: requirement
   :level: system
   :status: draft
   :satisfies: 00088

   Future: Support regulatory compliance templates:

   - ISO 26262 traceability requirements
   - DO-178C traceability objectives
   - IEC 62304 requirements tracing

Diagnostic Types
================

.. item:: Diagnostic type enumeration
   :id: 00140
   :type: information
   :level: system
   :status: approved
   :derives_from: 00092

   Supported diagnostic types:

   - BrokenLink: ERROR - Links to non-existent ID
   - DuplicateId: ERROR - ID defined multiple times
   - CircularDep: WARNING - Circular dependency detected
   - OrphanedReq: INFO - No links to/from requirement
   - StatusInconsistent: WARNING - Approved links to draft
   - InvalidStatus: WARNING - Status not in allowed list
   - InvalidType: ERROR - Type not in rigr_object_types
   - InvalidLevel: ERROR - Level not in rigr_levels
   - MissingType: WARNING - Type field missing
   - MissingLevel: WARNING - Level field missing
   - MissingId: ERROR - ID field missing

.. item:: Diagnostic display
   :id: 00141
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00087

   Diagnostics SHALL be displayed via:

   - Inline squiggly underlines (red for error, yellow for warning)
   - Problems panel categorized by file
   - Hover showing message with fix suggestions

Quick Fixes
===========

.. item:: Quick fix code actions
   :id: 00142
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00089

   The extension SHALL provide CodeActions for common fixes:

   - Broken link -> "Create requirement [ID]" or "Remove link"
   - Duplicate ID -> "Rename to [next-available-ID]"
   - Orphaned req -> "Add link to..."
   - Invalid status -> "Change to [valid-status]"
   - Invalid type -> "Change to [valid-type]"
   - Invalid level -> "Change to [valid-level]"
   - Missing field -> "Add [field] field"

Validation Configuration
========================

.. item:: Configurable validation behavior
   :id: 00143
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00092

   Validation behavior SHALL be configurable via settings:

   - ``rigr.validation.automatic``: Enable/disable (default: true)
   - ``rigr.validation.onSave``: Validate on save (default: true)
   - ``rigr.validation.debounceMs``: Debounce interval (default: 500)

.. item:: Configurable diagnostic severity
   :id: 00144
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00143

   Diagnostic severity SHALL be configurable per error type:

   .. code-block:: json

      {
        "rigr.validation.errors": {
          "brokenLinks": "error",
          "duplicateIds": "error",
          "circularDeps": "warning",
          "orphanedReqs": "info",
          "statusInconsistent": "warning"
        }
      }
