.. _rigr-configuration:

======================
Configuration System
======================

This document specifies requirements for the Rigr configuration system,
including Sphinx conf.py parsing, VS Code settings, and configuration management.

.. contents:: Table of Contents
   :local:
   :depth: 2

Stakeholder Requirements
========================

.. item:: Single source of truth for configuration
   :id: 00001
   :type: requirement
   :level: stakeholder
   :status: approved

   The extension shall use a single, authoritative source for project configuration
   to avoid synchronization issues and ensure consistency across tools.

.. item:: Zero-configuration startup
   :id: 00002
   :type: requirement
   :level: stakeholder
   :status: approved

   Users shall be able to use the extension immediately without mandatory
   configuration, with sensible defaults for common use cases.

.. item:: Rationale for Sphinx integration
   :id: 00003
   :type: rationale
   :level: stakeholder
   :status: approved
   :derives_from: 00001

   Sphinx conf.py is chosen as the primary configuration source because:

   - Most RST-based documentation projects already use Sphinx
   - Avoids duplication of configuration between docs and editor
   - Enables consistent behavior between Sphinx build and VS Code editing

Sphinx Configuration Parsing
============================

.. item:: Primary configuration source
   :id: 00004
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00001

   The extension SHALL read its primary configuration from the Sphinx ``conf.py``
   file to ensure single source of truth with the documentation build system.

.. item:: Configuration file discovery
   :id: 00005
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00004

   The extension shall search for conf.py in the following locations (in order):

   1. ``docs/conf.py`` relative to workspace root
   2. ``conf.py`` in workspace root
   3. User-specified path via VS Code settings

.. item:: Python configuration extraction
   :id: 00006
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00004

   The extension shall parse Python configuration by executing a Python script
   to extract configuration as JSON, with fallback to AST parsing if Python
   is unavailable.

.. item:: Configuration variables to extract
   :id: 00007
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00004

   The extension shall extract the following configuration from conf.py:

   - ``rigr_object_types``: Object type definitions
   - ``rigr_levels``: Hierarchy level definitions
   - ``rigr_link_types``: Relationship type definitions
   - ``rigr_statuses``: Status value definitions
   - ``rigr_id_config``: ID format configuration

Object Type Configuration
=========================

.. item:: Configurable object types
   :id: 00008
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00001

   The extension shall support user-defined object types with the following
   properties: type (identifier), title (display name), color (visualization),
   and style (rendering hint).

.. item:: Default object types
   :id: 00009
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00008, 00002

   Default object types shall include:

   - requirement: Primary functional requirements
   - rationale: Justification for requirements
   - information: Supporting context
   - parameter: Configurable values
   - design_element: Architectural decisions

Level Configuration
===================

.. item:: Configurable hierarchy levels
   :id: 00010
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00001

   The extension shall support user-defined hierarchy levels defining
   abstraction tiers in the requirements structure. Levels are stored
   as a ``:level:`` attribute, independent of the ID.

.. item:: Default hierarchy levels
   :id: 00011
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00010, 00002

   Default hierarchy levels shall include:

   - stakeholder: High-level user/business requirements
   - system: System-level functional requirements
   - component: Component-level specifications
   - software: Software implementation requirements
   - hardware: Hardware implementation requirements

Link Type Configuration
=======================

.. item:: Configurable link types
   :id: 00012
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00001

   The extension shall support user-defined link types with:

   - option: Field name used in RST (e.g., "satisfies")
   - incoming: Reverse link name (e.g., "satisfied_by")
   - outgoing: Forward link name (e.g., "satisfies")
   - style: Optional visual styling

.. item:: Default link types
   :id: 00013
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00012, 00002

   Default link types shall include:

   - satisfies/satisfied_by: Vertical traceability
   - implements/implemented_by: Implementation links
   - derives_from/derives_to: Derivation relationships
   - tests/tested_by: Verification links

Status Configuration
====================

.. item:: Configurable status values
   :id: 00014
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00001

   The extension shall support user-defined status values with labels and
   optional colors for visual indication.

.. item:: Default status values
   :id: 00015
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00014, 00002

   Default status values shall include:

   - draft: Initial creation
   - review: Under review
   - approved: Approved for implementation
   - implemented: Implementation complete
   - deprecated: No longer valid

ID Configuration
================

.. item:: Configurable ID format
   :id: 00016
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00001

   The extension shall support configurable ID format with:

   - prefix: Optional prefix string (e.g., "REQ")
   - separator: Character between prefix and number (e.g., "-")
   - padding: Number of digits with leading zeros (e.g., 5 for "00001")
   - start: Starting number for auto-increment

.. item:: Project-unique IDs
   :id: 00017
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00016

   IDs shall be semantically neutral and globally unique within the project.
   The ID does not encode type, level, or location information.

.. item:: ID format parameters
   :id: 00018
   :type: parameter
   :level: system
   :status: approved
   :derives_from: 00016

   Default ID configuration parameters:

   - prefix: "" (empty, no prefix)
   - separator: "-"
   - padding: 5 (e.g., "00001")
   - start: 1

Default Configuration
=====================

.. item:: Fallback configuration
   :id: 00019
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00002

   If no conf.py is found or parsing fails, the extension shall use a
   minimal default configuration that enables basic functionality.

.. item:: Graceful degradation
   :id: 00020
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00019

   The extension shall continue operating with defaults when configuration
   parsing fails, displaying a notification about the fallback.

VS Code Settings
================

.. item:: Extension-specific settings
   :id: 00021
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00001

   The extension shall support VS Code settings.json for user-configurable
   extension behavior that is separate from project configuration.

.. item:: Validation settings
   :id: 00022
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00021

   Validation behavior settings shall include:

   - ``rigr.validation.automatic``: Enable/disable automatic validation
   - ``rigr.validation.onSave``: Validate on file save
   - ``rigr.validation.debounceMs``: Debounce interval (default: 500ms)

.. item:: UI preference settings
   :id: 00023
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00021

   UI preference settings shall include:

   - ``rigr.treeView.groupBy``: Grouping mode (type/file/status/level)
   - ``rigr.treeView.showStatusIcons``: Show status icons in tree

.. item:: Performance settings
   :id: 00024
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00021

   Performance settings shall include:

   - ``rigr.indexing.maxFiles``: Maximum files to index (default: 1000)
   - ``rigr.indexing.excludePatterns``: Glob patterns to exclude

.. item:: Validation debounce parameter
   :id: 00025
   :type: parameter
   :level: system
   :status: approved
   :derives_from: 00022

   Default validation debounce: 500 milliseconds

.. item:: Max files parameter
   :id: 00026
   :type: parameter
   :level: system
   :status: approved
   :derives_from: 00024

   Default maximum files to index: 1000 files

Configuration Refresh
=====================

.. item:: Manual configuration reload
   :id: 00027
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00001

   The extension shall provide a command "Rigr: Reload Configuration"
   to manually reload configuration from conf.py.

.. item:: Automatic configuration reload
   :id: 00028
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00027

   The extension shall automatically reload configuration when conf.py
   is saved, without requiring manual refresh.

.. item:: Configuration status indicator
   :id: 00029
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00027

   The status bar shall display configuration status:

   - "Rigr: Ready (N objects)" when configuration is loaded successfully
   - "Rigr: Config Error" when parsing failed (clickable to view error)

.. item:: Configuration change notification
   :id: 00030
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00028

   When configuration changes affect existing objects (e.g., removed type),
   the extension shall display a notification and re-validate all objects.
