.. _rigr-data-model:

=============================
Data Model and Indexing
=============================

This document specifies the requirement object model, RST parsing,
and the indexing system for the Rigr extension.

.. contents:: Table of Contents
   :local:
   :depth: 2

Stakeholder Requirements
========================

.. item:: Structured requirement storage
   :id: 00031
   :type: requirement
   :level: stakeholder
   :status: approved

   Requirements shall be stored in a structured, human-readable format
   that supports version control and diff/merge operations.

.. item:: Fast requirement lookup
   :id: 00032
   :type: requirement
   :level: stakeholder
   :status: approved

   The extension shall provide instant access to requirement information
   during editing, without noticeable delay.

.. item:: Rationale for RST format
   :id: 00033
   :type: rationale
   :level: stakeholder
   :status: approved
   :derives_from: 00031

   RST (reStructuredText) is chosen as the storage format because:

   - Plain text, version control friendly
   - Sphinx ecosystem for documentation generation
   - Directive syntax allows structured metadata
   - Human-readable without special tools

Requirement Object Model
========================

.. item:: Core object structure
   :id: 00034
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00031

   Each requirement object shall contain the following properties:

   - id: Project-unique identifier
   - type: Object type from configuration
   - level: Hierarchy level from configuration
   - title: Short descriptive title
   - description: Full description text
   - status: Current status value
   - links: Map of link type to target IDs
   - metadata: Additional custom fields
   - location: File path and line number

.. item:: Optional object fields
   :id: 00035
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00034

   The following object fields are optional:

   - baseline: Release baseline tag (e.g., "v1.0.0")
   - priority: Requirement priority level
   - author: Requirement author
   - created: Creation date
   - modified: Last modification date

.. item:: Link storage format
   :id: 00036
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00034

   Links shall be stored as comma-separated ID lists in link type fields,
   supporting multiple targets per link type.

   Example: ``:satisfies: 00001, 00002``

RST Parsing
===========

.. item:: Item directive parsing
   :id: 00037
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00031

   The extension shall parse the ``.. item::`` RST directive with the
   following structure:

   .. code-block:: rst

      .. item:: Title text
         :id: 00001
         :type: requirement
         :level: system
         :status: approved
         :satisfies: 00002

         Description content here.

.. item:: Field list parsing
   :id: 00038
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00037

   The parser shall extract all field list entries (`:field: value`)
   following the directive, mapping them to object properties.

.. item:: Multi-line description parsing
   :id: 00039
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00037

   The parser shall correctly handle multi-line and multi-paragraph
   description content, preserving formatting.

.. item:: Inline reference parsing
   :id: 00040
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00037

   The parser shall detect inline RST references to other requirements
   using the ``:item:`ID``` syntax within description text.

.. item:: Robust error handling
   :id: 00041
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00037

   The parser shall handle malformed RST gracefully:

   - Skip unparseable directives with warning
   - Continue parsing remaining content
   - Report parse errors as diagnostics

.. item:: Required field validation
   :id: 00042
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00037

   The parser shall validate that required fields are present:

   - id: Always required
   - type: Required (warn if missing)
   - level: Required (warn if missing)

Index Architecture
==================

.. item:: In-memory requirement index
   :id: 00043
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00032

   The extension shall maintain an in-memory index of all parsed
   requirement objects for fast lookup and navigation.

.. item:: Primary index by ID
   :id: 00044
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00043

   The primary index shall be a map from requirement ID to the full
   RequirementObject, providing O(1) lookup by ID.

.. item:: Secondary indexes
   :id: 00045
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00043

   Secondary indexes shall be maintained for efficient queries:

   - fileIndex: Map<file path, Set<ID>>
   - typeIndex: Map<type, Set<ID>>
   - levelIndex: Map<level, Set<ID>>
   - statusIndex: Map<status, Set<ID>>

.. item:: Link graph index
   :id: 00046
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00043

   A bidirectional link graph shall track all requirement relationships:

   - Forward links: source ID -> Set<target IDs>
   - Backward links: target ID -> Set<source IDs>
   - Automatic computation of reverse links

.. item:: Baseline index
   :id: 00047
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00043

   A baseline index shall map baseline tags to sets of requirement IDs
   for baseline filtering and reporting.

Workspace Scanning
==================

.. item:: RST file discovery
   :id: 00048
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00032

   The extension shall scan the workspace for all .rst files on
   activation and when workspace folders change.

.. item:: Exclude pattern support
   :id: 00049
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00048

   The scanner shall respect exclude patterns from configuration:

   - Default excludes: ``**/build/**``, ``**/_build/**``, ``**/node_modules/**``
   - User-configurable via settings

.. item:: Initial full scan
   :id: 00050
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00048

   On activation, the extension shall perform a full scan of all RST
   files, displaying progress notification for large workspaces.

.. item:: Incremental updates
   :id: 00051
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00048

   On file save, only the changed file shall be re-parsed, with
   affected indexes updated incrementally.

.. item:: File watcher
   :id: 00052
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00051

   The extension shall watch for file system events (create, modify,
   delete) and update the index accordingly.

Index Persistence
=================

.. item:: Index caching
   :id: 00053
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00032

   The parsed index shall be cached to disk for faster startup:

   - Location: ``.vscode/requirements-index.json``
   - Revalidated against file modification times on load

.. item:: Cache invalidation
   :id: 00054
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00053

   The cache shall be invalidated when:

   - Configuration changes (conf.py modified)
   - Extension version changes
   - User requests manual rebuild

.. item:: Cache format
   :id: 00055
   :type: information
   :level: system
   :status: approved
   :derives_from: 00053

   Cache JSON structure includes:

   - version: Cache format version
   - timestamp: Last update time
   - configHash: Hash of configuration for invalidation
   - objects: Serialized requirement objects
   - references: File-to-references mapping
