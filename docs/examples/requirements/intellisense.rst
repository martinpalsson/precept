.. _rigr-intellisense:

================================
IntelliSense and Navigation
================================

This document specifies requirements for intelligent editing support,
including autocompletion, hover information, code navigation, and snippets.

.. contents:: Table of Contents
   :local:
   :depth: 2

Stakeholder Requirements
========================

.. item:: Efficient requirement authoring
   :id: 00056
   :type: requirement
   :level: stakeholder
   :status: approved

   Requirements engineers shall be able to create new requirements quickly
   with minimal typing and without memorizing syntax or IDs.

.. item:: Easy requirement navigation
   :id: 00057
   :type: requirement
   :level: stakeholder
   :status: approved

   Users shall be able to navigate between linked requirements instantly
   to understand relationships and trace dependencies.

.. item:: Contextual information access
   :id: 00058
   :type: requirement
   :level: stakeholder
   :status: approved

   Users shall be able to view requirement details without leaving
   their current editing context.

Use Case: Quick Object Creation
===============================

.. item:: Completion trigger on directive start
   :id: 00059
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00056

   When user types ".." at the start of a line (or with only whitespace
   before cursor), the extension shall trigger an intelligent completion
   menu showing available object type options.

.. item:: Object type completion items
   :id: 00060
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00059

   The completion menu shall display items for each configured object type:

   - "New Requirement"
   - "New Rationale"
   - "New Information"
   - "New Parameter"
   - "New Design Element"

.. item:: Snippet insertion on selection
   :id: 00061
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00059

   Upon selection, the extension shall insert a complete snippet with:

   - Correct ``.. item::`` directive
   - Auto-generated unique ID
   - Pre-filled ``:type:`` field matching selection
   - Pre-filled ``:level:`` field (defaulting to current file's level)
   - Placeholder fields for ``:status:`` and common fields
   - Cursor positioned at first editable field (title)

.. item:: Tab navigation through fields
   :id: 00062
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00061

   The snippet shall support Tab key navigation through editable fields,
   moving cursor between title, type, status, links, and description.

.. item:: Auto-generated unique ID
   :id: 00063
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00061

   The extension shall auto-generate the next available unique ID:

   - Analyze existing IDs in the project
   - Compute next sequential number
   - Format with configured prefix and padding
   - Guarantee project-wide uniqueness

Completion Provider
===================

.. item:: Link field completion
   :id: 00064
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00056

   When editing link fields (``:satisfies:``, ``:implements:``, etc.),
   the extension shall provide auto-completion of existing requirement IDs.

.. item:: Completion item format
   :id: 00065
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00064

   Completion items shall display:

   ``ID - Title [type] [level] [status]``

   Example: ``00001 - Single source of truth [requirement] [stakeholder] [approved]``

.. item:: Fuzzy filtering
   :id: 00066
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00064

   Completion results shall support fuzzy matching, filtering by:

   - ID prefix/substring
   - Title keywords
   - Type or level

.. item:: Inline reference completion
   :id: 00067
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00056

   When typing ``:item:``, the extension shall trigger completion for
   inline requirement references within description text.

.. item:: Completion sorting
   :id: 00068
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00064

   Completion results shall be sorted by:

   1. Relevance to filter text
   2. Recently used IDs (if applicable)
   3. Alphabetically by ID

.. item:: Documentation preview
   :id: 00069
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00064

   Each completion item shall include documentation showing the full
   requirement description for preview before selection.

Hover Provider
==============

.. item:: Hover on requirement ID
   :id: 00070
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00058

   Hovering over a requirement ID shall display a popup with full
   requirement metadata and description.

.. item:: Hover content format
   :id: 00071
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00070

   Hover popup shall display:

   - ID and title (header)
   - Type, level, status fields
   - Baseline tag (if present)
   - Description text (truncated if long)
   - Links section showing all relationships
   - File location with line number

.. item:: Hover on link fields
   :id: 00072
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00070

   Hovering over IDs within link field values shall show the same
   hover information as hovering over the ID definition.

Definition Provider
===================

.. item:: Go to definition
   :id: 00073
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00057

   Pressing F12 or Ctrl+Click on a requirement ID shall navigate to
   the requirement's definition location in the workspace.

.. item:: Peek definition
   :id: 00074
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00073

   Alt+F12 shall show the definition inline without navigating away
   from the current file (VS Code Peek feature).

.. item:: Definition from any reference
   :id: 00075
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00073

   Go-to-definition shall work from:

   - Link field values (``:satisfies: 00001``)
   - Inline references (``:item:`00001```)
   - ID definition itself (no-op or show message)

Reference Provider
==================

.. item:: Find all references
   :id: 00076
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00057

   Shift+F12 or "Find All References" command shall locate all mentions
   of a requirement ID across the workspace.

.. item:: Reference locations
   :id: 00077
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00076

   References shall include:

   - The definition location
   - All link field references
   - All inline text references
   - References in other file types (if configured)

.. item:: Reference preview
   :id: 00078
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00076

   The references panel shall show context around each reference,
   allowing users to understand usage before navigating.

Code Snippets
=============

.. item:: Dynamic snippet generation
   :id: 00079
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00056

   Snippets shall be generated dynamically from configuration:

   - One snippet per configured object type
   - Prefix pattern: ``item-<type>`` (e.g., ``item-requirement``)
   - Fields populated from configured options
   

.. item:: Snippet template structure
   :id: 00080
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00079

   Snippet template shall include:

   .. code-block:: rst

      .. item:: ${1:Title}
         :id: ${2:auto-id}
         :type: ${3|type1,type2,...|}
         :level: ${4|level1,level2,...|}
         :status: ${5|status1,status2,...|}
         ${6::links: }

         ${0:Description}

.. item:: Choice dropdowns
   :id: 00081
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00080

   Enumerated fields (type, level, status) shall use VS Code choice
   placeholders (``${n|opt1,opt2|}``) for quick selection.

.. item:: Custom user snippets
   :id: 00082
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00079

   Users shall be able to define custom snippets in:

   - VS Code user snippets settings
   - ``.vscode/requirements.code-snippets`` in workspace

Use Case: Project Creation
==========================

.. item:: New project command
   :id: 00083
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00056

   The extension shall provide a command (Ctrl+Shift+P: "Rigr: New Project")
   to create a new Rigr requirements management project.

.. item:: Project creation confirmation
   :id: 00084
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00083

   Before creating a project, the extension shall prompt the user for
   confirmation with options to proceed or cancel.

.. item:: Project template selection
   :id: 00085
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00083

   The user shall be able to select from available templates:

   - Minimal: Basic structure with minimal configuration
   - Standard: Common structure for general projects
   - Automotive: Structure suited for automotive/embedded systems

.. item:: Generated project structure
   :id: 00086
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00083

   Created project shall include:

   - ``docs/conf.py`` with Rigr configuration
   - ``docs/requirements/index.rst`` with overview
   - Example requirement file(s)
   - ``.vscode/settings.json`` with recommended settings
