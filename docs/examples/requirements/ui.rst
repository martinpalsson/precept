.. _rigr-ui:

==========================
User Interface Components
==========================

This document specifies requirements for the tree view, status bar,
and other UI components in the Rigr extension.

.. contents:: Table of Contents
   :local:
   :depth: 2

Stakeholder Requirements
========================

.. item:: Visual requirements overview
   :id: 00175
   :type: requirement
   :level: stakeholder
   :status: approved

   Users shall have a visual overview of all requirements in the
   workspace without needing to open individual files.

.. item:: Quick status awareness
   :id: 00176
   :type: requirement
   :level: stakeholder
   :status: approved

   Users shall be able to quickly assess the status of their
   requirements project (counts, health, configuration state).

.. item:: Efficient requirement discovery
   :id: 00177
   :type: requirement
   :level: stakeholder
   :status: approved

   Users shall be able to find specific requirements quickly through
   filtering, searching, and organized grouping.

.. item:: Quick relation view
   :id: 00285
   :type: requirement
   :level: stakeholder
   :status: draft

   The user shall be able to see relationships between items
   through the UI components, both incoming and outgoing relationships
   for one selected item.



Requirements Tree View
======================

.. item:: Tree view sidebar
   :id: 00178
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00175

   The extension shall provide a tree view in the VS Code sidebar
   titled "REQUIREMENTS EXPLORER" showing all indexed requirements.

.. item:: Tree view grouping modes
   :id: 00179
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00178

   The tree view shall support grouping requirements by:

   - Type (default): Requirements, Rationales, Information, etc.
   - Level: Stakeholder, System, Component, etc.
   - File: Grouped by source file path
   - Status: Draft, Review, Approved, etc.
   - Baseline: Grouped by baseline version

.. item:: Tree view item display
   :id: 00180
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00178

   Tree items shall display:

   ``[status-icon] ID - Title [level] [status]``

   Example: ``[tick] 00001 - Single source of truth [stakeholder] [approved]``

.. item:: Status icons
   :id: 00181
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00180

   Status shall be indicated by icons:

   - Draft: pencil icon
   - Review: eye icon
   - Approved: checkmark icon
   - Implemented: rocket icon
   - Deprecated: x-mark icon

.. item:: Tree item click navigation
   :id: 00182
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00178, 00177

   Clicking a tree item shall navigate to the requirement's
   definition location in the editor.

.. item:: Tree item context menu
   :id: 00183
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00178

   Right-click context menu shall provide:

   - Go to Definition
   - Find All References
   - Show Dependencies (outgoing links)
   - Show Dependents (incoming links)
   - Add Baseline Tag
   - Copy ID to Clipboard

.. item:: Tree view filtering
   :id: 00184
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00177

   The tree view shall provide a filter/search bar:

   - Filter by ID substring
   - Filter by title keywords
   - Filter by type, level, status
   - Clear filter button

.. item:: Tree view actions
   :id: 00185
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00178

   Tree view toolbar shall include:

   - Refresh button
   - Collapse all button
   - Group by selector
   - Filter toggle

.. item:: Orphaned requirements section
   :id: 00186
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00178

   Tree view shall include a special "Orphaned" section showing
   requirements with no links (when any exist).

.. item:: Tree view example structure
   :id: 00187
   :type: information
   :level: system
   :status: approved
   :derives_from: 00178

   Example tree structure (grouped by type):

   .. code-block:: text

      REQUIREMENTS EXPLORER
      +-- Requirements (42)
      |   +-- [tick] 00001 - Single source... [stakeholder] [approved]
      |   +-- [pencil] 00002 - Zero config... [stakeholder] [draft]
      |   +-- ...
      +-- Rationales (8)
      |   +-- 00003 - Rationale for...
      |   +-- ...
      +-- Information (12)
      +-- Parameters (5)
      +-- Design Elements (15)
      +-- Orphaned (3)
          +-- 00099 - No links

Link Explorer Panel
===========================

.. item:: Relationship explorer panel
   :id: 00286
   :type: requirement
   :level: system
   :status: draft
   :satisfies: 00285

   The extension shall provide a link explorer panel in the VS Code sidebar
   titled "RELATIONSHIP EXPLORER" showing all incoming and outgoing relationships
   for one selected item.

.. item:: Relationship explorer item display
   :id: 00287
   :type: requirement
   :level: system
   :status: draft
   :satisfies: 00285

   Explorer items shall display:

   ``[direction-icon] ID - Title [level] [status]``

.. item:: Relationship explorer item selection
   :id: 00288
   :type: requirement
   :level: system
   :status: draft
   :satisfies: 00285

   Explorer items shall display relationships for the currently selected
   requirement in the Item Explorer.

.. item:: Relationship explorer navigation
   :id: 00289
   :type: requirement
   :level: system
   :status: draft
   :satisfies: 00285

   When clicking the link explorer items, the extension shall navigate
   to the requirement's definition location in the editor, and make the Requirements
   Explorer select that item.

.. item:: Selected item displayed
   :id: 00299
   :type: requirement
   :level: system
   :status: draft
   :satisfies: 00285
   
   The link explorer panel shall prominently display the currently
   selected requirement at the top of the panel, including its ID, title,
   level, and status.

Status Bar
==========

.. item:: Status bar item
   :id: 00188
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00176

   The extension shall display a status bar item showing:

   - Extension name/icon
   - Requirement count
   - Configuration status

.. item:: Status bar ready state
   :id: 00189
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00188

   When operating normally, status bar shall show:

   ``Rigr: Ready (N objects)``

   Where N is the total indexed requirement count.

.. item:: Status bar error state
   :id: 00190
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00188

   When configuration error occurs, status bar shall show:

   ``Rigr: Config Error``

   Clicking shall show error details.

.. item:: Status bar indexing state
   :id: 00191
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00188

   During indexing, status bar shall show:

   ``Rigr: Indexing... (N/M files)``

   With progress indication.

.. item:: Status bar click action
   :id: 00192
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00188

   Clicking the status bar item shall show a quick pick menu:

   - Show Item Explorer
   - Reload Configuration
   - Run Deep Validation
   - Generate Release Report
   - Open Settings

.. item:: Status bar baseline indicator
   :id: 00193
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00188

   When baseline filter is active, status bar shall show:

   ``Rigr: v1.0.0 (87 reqs)``

Progress Notifications
======================

.. item:: Initial indexing notification
   :id: 00194
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00176

   During initial workspace scan, a progress notification shall show:

   - "Rigr: Indexing requirements..."
   - Progress bar or percentage
   - Cancel button for large workspaces

.. item:: Deep validation progress
   :id: 00195
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00176

   During deep validation, a progress notification shall show:

   - Current analysis phase
   - Cancel button
   - Estimated completion (if available)

.. item:: Operation completion notifications
   :id: 00196
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00176

   Upon completion of operations, show notification:

   - "Indexed N requirements in M files"
   - "Baseline v1.0.0 tagged on N requirements"
   - "Deep validation complete - view report"

Error and Warning Displays
==========================

.. item:: Configuration error display
   :id: 00197
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00176

   Configuration errors shall be displayed via:

   - Status bar error indicator
   - Notification with "View Error" action
   - Output channel with detailed error

.. item:: Validation results display
   :id: 00198
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00176

   Validation errors shall be displayed via:

   - Inline editor decorations (squiggles)
   - Problems panel entries
   - Tree view warning badges (optional)

.. item:: Output channel
   :id: 00199
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00176

   The extension shall provide an output channel "Rigr" for:

   - Detailed error messages
   - Debug information
   - Operation logs

Commands Palette
================

.. item:: Command palette commands
   :id: 00200
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00177

   The following commands shall be available via Ctrl+Shift+P:

   - Rigr: Reload Configuration
   - Rigr: Deep Validation
   - Rigr: Tag Current Baseline
   - Rigr: Remove Baseline Tags
   - Rigr: Generate Release Report
   - Rigr: Create Git Tag for Baseline
   - Rigr: New Project
   - Rigr: Show Item Explorer
   - Rigr: Show Output

.. item:: Command descriptions
   :id: 00201
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00200

   Each command shall have a clear description displayed in the
   command palette for discoverability.

Keyboard Shortcuts
==================

.. item:: Default keyboard shortcuts
   :id: 00202
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00177

   Default keyboard shortcuts shall be provided:

   - F12: Go to Definition (standard VS Code)
   - Alt+F12: Peek Definition (standard VS Code)
   - Shift+F12: Find All References (standard VS Code)

.. item:: Customizable shortcuts
   :id: 00203
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00202

   All Rigr commands shall be customizable via VS Code keyboard
   shortcuts settings (keybindings.json).

Settings UI
===========

.. item:: Settings contribution
   :id: 00204
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00176

   The extension shall contribute settings to VS Code Settings UI
   under a "Rigr" category with:

   - Validation settings
   - Tree view preferences
   - Performance settings

.. item:: Settings descriptions
   :id: 00205
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00204

   Each setting shall have:

   - Clear description
   - Default value shown
   - Valid values/ranges documented

Webview Panels
==============

.. item:: Deep validation report webview
   :id: 00206
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00176

   Deep validation results shall be displayed in a webview panel:

   - Interactive HTML report
   - Clickable links to requirements
   - Collapsible sections
   - Export options

.. item:: Traceability matrix webview
   :id: 00207
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00175

   Traceability matrix shall be displayed in a webview:

   - Interactive grid
   - Hover details
   - Click to navigate
   - Filter controls

.. item:: Dependency graph webview
   :id: 00208
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00175

   Dependency graph visualization shall use a webview:

   - SVG/Canvas rendering
   - Pan and zoom
   - Node click navigation
   - Layout options

Documentation Generation
========================

.. item:: Documentation preview capability
   :id: 00291
   :type: requirement
   :level: stakeholder
   :status: draft

   Users shall be able to build and preview the Sphinx documentation
   output directly from VS Code to verify how requirements will appear
   in the generated documentation.

.. item:: Build documentation command
   :id: 00292
   :type: requirement
   :level: system
   :status: draft
   :satisfies: 00291

   The extension shall provide a command "Rigr: Build Documentation"
   that invokes the Sphinx build process:

   - Locate conf.py using existing discovery mechanism
   - Execute ``sphinx-build -b html <source> <build>`` command
   - Display build progress in notification
   - Show build output in dedicated output channel
   - Report success or failure with actionable message

.. item:: Build command prerequisites
   :id: 00293
   :type: requirement
   :level: system
   :status: draft
   :satisfies: 00292

   Before building, the command shall verify:

   - conf.py exists in workspace
   - Python is available (python3 or python)
   - sphinx-build command is accessible

   If prerequisites are not met, display helpful error message
   with installation instructions.

.. item:: Build output location
   :id: 00294
   :type: requirement
   :level: system
   :status: draft
   :satisfies: 00292

   The build command shall output to a standard location:

   - Default: ``_build/html`` relative to conf.py directory
   - Respect existing Sphinx configuration if specified
   - Create output directory if it does not exist

.. item:: Build error handling
   :id: 00295
   :type: requirement
   :level: system
   :status: draft
   :satisfies: 00292

   On build failure, the extension shall:

   - Display error notification with "Show Output" action
   - Log full error details to output channel
   - Parse Sphinx error messages to show file and line if available

.. item:: View documentation command
   :id: 00296
   :type: requirement
   :level: system
   :status: draft
   :satisfies: 00291

   The extension shall provide a command "Rigr: View Documentation"
   that opens the generated documentation in the default web browser:

   - Locate index.html in the build output directory
   - Open using system default browser via VS Code API
   - If documentation not yet built, prompt user to build first

.. item:: View command file detection
   :id: 00297
   :type: requirement
   :level: system
   :status: draft
   :satisfies: 00296

   The view command shall locate the documentation entry point:

   - Check ``_build/html/index.html`` relative to conf.py
   - Fall back to ``build/html/index.html`` if exists
   - Report clear error if no built documentation found

.. item:: Build and view workflow
   :id: 00298
   :type: requirement
   :level: system
   :status: draft
   :satisfies: 00292, 00296

   The extension shall support a streamlined workflow:

   - "Build Documentation" automatically offers to view on success
   - "View Documentation" offers to build if output is stale or missing
   - Status bar shows last build timestamp when documentation exists

.. item:: Presentation of items in the generated Sphinx document
   :id: 00300
   :type: requirement
   :level: system
   :status: draft
   
   The generated Sphinx documentation shall present each item according to
   below:
   - <Title> as a header of the item
   - Table containing:
   -- ID <id> 
   -- Type <type>
   -- Level <level> (In plain text)
   -- Status <status> (In plain text)
   - All incoming and outgoing relationships, one table row per "relation type" and direction.
   - <Description> as the main content body

.. item:: Theme of items in the generated Sphinx document
   :id: 00301
   :type: requirement
   :level: system
   :status: draft
   
   The item in the generated Sphinx documentation shall follow the Theme
   as configured in the Rigr settings for Sphinx documentation generation.

   Example themes are:
   - Sphinx default theme
   - Alabaster
   - Read the Docs

Graphics and Diagrams
=====================

.. item:: Embed graphics in documentation
   :id: 00302
   :type: requirement
   :level: stakeholder
   :status: draft

   Users shall be able to embed graphics such as images and diagrams
   in the requirements documentation, displayed at their full size
   without being constrained by item containers.

.. item:: Graphic directive for images
   :id: 00303
   :type: requirement
   :level: system
   :status: draft
   :satisfies: 00302

   The Sphinx extension shall provide a ``.. graphic::`` directive that:

   - Accepts image files (PNG, JPG, SVG, GIF) via ``:file:`` option
   - Displays images at full width (100% of content area)
   - Supports caption (argument) and ID for cross-referencing
   - Integrates with the configured Sphinx theme

.. item:: Graphic directive for PlantUML diagrams
   :id: 00304
   :type: requirement
   :level: system
   :status: draft
   :satisfies: 00302

   The ``.. graphic::`` directive shall support inline PlantUML:

   - PlantUML code in the directive body (between @startuml/@enduml)
   - Renders diagrams at full width (100% of content area)
   - Supports caption and ID for cross-referencing
   - Uses the configured PlantUML renderer (local or server)

.. item:: Graphic presentation format
   :id: 00305
   :type: requirement
   :level: system
   :status: draft
   :satisfies: 00302

   The generated Sphinx documentation shall present each graphic item according to
   below:
   - Consistent styling that follows the configured theme
   - <Title> as a header of the graphic item
   - Table containing:
   -- ID <id> 
   - All incoming and outgoing relationships, one table row per "relation type" and direction.
   - <Actual graphic>
   -- Clickable to view full-size in a new tab
   -- Full-width display
   - Caption displayed below the graphic

Code Blocks
============

.. item:: Embed code blocks in documentation
   :id: 00307
   :type: requirement
   :level: stakeholder
   :status: draft

   Users shall be able to embed code blocks (source code, configuration,
   scripts, etc.) in the requirements documentation as referenceable objects
   that can be traced to from requirements, specifications, and other items.

.. item:: Code directive for source code
   :id: 00308
   :type: requirement
   :level: system
   :status: draft
   :satisfies: 00307

   The Sphinx extension shall provide a ``.. code::`` directive that:

   - Accepts a programming language via ``:language:`` option (e.g., python, c, java, rust, xml)
   - Renders code with syntax highlighting using the Sphinx/Pygments code highlighter
   - Supports an ``:id:`` option for cross-referencing from other items
   - Supports a ``:caption:`` option for a description below the code
   - Supports all link options (satisfies, implements, etc.) for traceability
   - The code content is placed in the directive body

.. item:: Code presentation format
   :id: 00309
   :type: requirement
   :level: system
   :status: draft
   :satisfies: 00307

   The generated Sphinx documentation shall present each code item according to
   below:
   - Consistent styling that follows the configured theme
   - <Title> as a header of the code item
   - Table containing:
   -- ID <id>
   - All incoming and outgoing relationships, one table row per "relation type" and direction.
   - <Actual code block> with syntax highlighting for the specified language
   - Caption displayed below the code

.. item:: Code and Graphic directives in completion menu
   :id: 00310
   :type: requirement
   :level: system
   :status: draft
   :satisfies: 00307, 00302

   The VS Code extension completion menu shall offer snippets for:

   - ``.. graphic::`` directive with auto-generated ID, language/file options
   - ``.. code::`` directive with auto-generated ID, language option, and body placeholder

   These shall appear alongside the existing ``.. item::`` snippets when the user
   triggers autocompletion at a directive position.

.. item:: Code and Graphic in explorers
   :id: 00311
   :type: requirement
   :level: system
   :status: draft
   :satisfies: 00307, 00302

   Code and Graphic objects shall be visible in:

   - The Item Explorer tree view (grouped by type, level, or status)
   - The Link Explorer (showing incoming/outgoing links)

   They shall be navigable (click to go to source) and display their
   ID, title, and relationships just like regular items.

Component Requirements
======================

.. item:: TreeDataProvider implementation
   :id: 00209
   :type: design_element
   :level: component
   :status: approved
   :implements: 00178, 00179, 00180

   The TreeDataProvider component shall:

   - Implement VS Code TreeDataProvider interface
   - Subscribe to index updates for refresh
   - Support multiple grouping strategies
   - Provide tree items with icons and descriptions

.. item:: StatusBarManager implementation
   :id: 00210
   :type: design_element
   :level: component
   :status: approved
   :implements: 00188, 00189, 00190

   The StatusBarManager component shall:

   - Create and manage status bar item
   - Update text based on extension state
   - Handle click actions with quick pick
   - Show progress during operations

.. item:: WebviewProvider implementation
   :id: 00211
   :type: design_element
   :level: component
   :status: approved
   :implements: 00206, 00207, 00208

   The WebviewProvider component shall:

   - Create webview panels for reports
   - Generate HTML content from templates
   - Handle message passing for interactivity
   - Support export functionality
