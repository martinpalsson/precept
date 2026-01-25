.. _rigr-baseline:

================================
Baseline and Release Management
================================

This document specifies requirements for baseline tagging, release
management, reporting, and Git integration in the Rigr extension.

.. contents:: Table of Contents
   :local:
   :depth: 2

Stakeholder Requirements
========================

.. item:: Version-controlled requirements
   :id: 00145
   :type: requirement
   :level: stakeholder
   :status: approved

   Stakeholders shall be able to track which requirements were included
   in specific product releases for auditing and compliance.

.. item:: Release documentation
   :id: 00146
   :type: requirement
   :level: stakeholder
   :status: approved

   For each release, stakeholders shall have access to comprehensive
   documentation of requirements, coverage, and changes.

.. item:: Change tracking
   :id: 00147
   :type: requirement
   :level: stakeholder
   :status: approved

   Stakeholders shall be able to see what requirements changed between
   releases to understand evolution and impact.

Baseline Tagging
================

.. item:: Baseline field support
   :id: 00148
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00145

   The extension shall support a ``:baseline:`` field on requirement
   objects to indicate inclusion in a specific release.

   Example: ``:baseline: v1.0.0``

.. item:: Tag current baseline command
   :id: 00149
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00148

   The extension shall provide a command "Rigr: Tag Current Baseline":

   1. Prompt for baseline name (e.g., "v1.0.0")
   2. Add ``:baseline: v1.0.0`` to eligible requirements
   3. Report count of tagged requirements

.. item:: Baseline eligibility
   :id: 00150
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00149

   Only requirements meeting criteria shall be eligible for baseline:

   - Status must be "approved" or "implemented"
   - Option to filter by type, level, or file pattern

.. item:: Baseline selection options
   :id: 00151
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00149

   Tag command shall support selection options:

   - All eligible requirements
   - By type filter
   - By level filter
   - By file/folder pattern
   - Manual multi-select

.. item:: Remove baseline tags command
   :id: 00152
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00148

   The extension shall provide "Rigr: Remove Baseline Tags" command
   to remove baseline field from selected requirements.

Baseline Filtering
==================

.. item:: Tree view baseline filter
   :id: 00153
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00145

   The tree view shall support filtering to show only requirements
   with a specific baseline tag.

.. item:: Status bar baseline selector
   :id: 00154
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00153

   The status bar shall display a baseline selector dropdown:

   - "All" - Show all requirements
   - "v1.0.0" - Show only v1.0.0 baseline
   - Count: "Baseline v1.0.0 (87 requirements)"

.. item:: Baseline comparison
   :id: 00155
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00147

   The extension shall support comparing two baselines:

   - Show requirements added in newer baseline
   - Show requirements modified between baselines
   - Show requirements removed from baseline

Release Report Generation
=========================

.. item:: Generate release report command
   :id: 00156
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00146

   The extension shall provide "Rigr: Generate Release Report" command
   to create comprehensive release documentation.

.. item:: Report summary section
   :id: 00157
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00156

   Release report shall include summary:

   - Total requirements count
   - Breakdown by status (approved, implemented)
   - Breakdown by type
   - Breakdown by level
   - Generation timestamp

.. item:: Report changes section
   :id: 00158
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00156, 00147

   Release report shall include changes since previous baseline:

   - New requirements (IDs and titles)
   - Modified requirements (field changes)
   - Removed requirements
   - Status transitions

.. item:: Report coverage section
   :id: 00159
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00156

   Release report shall include traceability coverage:

   - Coverage percentage per level transition
   - List of requirements with incomplete coverage
   - Visual coverage matrix

.. item:: Report output format
   :id: 00160
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00156

   Release report format shall be Markdown with:

   .. code-block:: markdown

      # Requirements Release Report: v1.0.0
      Generated: 2025-01-06

      ## Summary
      - Total requirements: 87
      - By status:
        - Approved: 65
        - Implemented: 22
      ...

      ## New Requirements (since v0.9.0)
      - 00042: System shall support...
      ...

      ## Traceability Coverage
      - stakeholder -> system: 95% (40/42)
      ...

.. item:: Report save location
   :id: 00161
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00156

   Default report save location: ``docs/releases/release-{version}.md``

   User may specify alternative location via dialog.

.. item:: Report export formats
   :id: 00162
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00156

   Release reports shall be exportable in formats:

   - Markdown (default)
   - HTML (standalone)
   - PDF (via HTML conversion)

Git Integration
===============

.. item:: Create Git tag for baseline
   :id: 00163
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00145

   The extension shall provide "Rigr: Create Git Tag for Baseline"
   command to create an annotated Git tag.

.. item:: Git tag format
   :id: 00164
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00163

   Git tag shall be created with:

   - Tag name: ``req-{baseline}`` (e.g., ``req-v1.0.0``)
   - Annotation: Requirement count and summary
   - Option to use custom tag name

.. item:: Git integration prerequisites
   :id: 00165
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00163

   Git commands shall require:

   - Workspace is a Git repository
   - No uncommitted changes to requirements files
   - User confirmation before creating tag

.. item:: Git tag scope limitation
   :id: 00166
   :type: information
   :level: system
   :status: approved
   :derives_from: 00163

   Full GitHub Release creation via GitHub Actions is out of scope.
   The extension provides markdown reports that can be attached to
   releases manually or via CI/CD pipelines.

Baseline Validation
===================

.. item:: Baseline completeness validation
   :id: 00167
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00145

   When tagging a baseline, the extension shall validate:

   - All linked dependencies are also baselined (or warn)
   - No draft/review status items in baseline
   - Coverage thresholds are met

.. item:: Baseline dependency check
   :id: 00168
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00167

   The extension shall warn if a baselined requirement links to
   a non-baselined requirement (baseline leakage).

.. item:: Pre-baseline checklist
   :id: 00169
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00167

   Before baseline creation, show checklist:

   - [ ] All requirements approved/implemented
   - [ ] No broken links
   - [ ] Coverage thresholds met
   - [ ] No circular dependencies
   - [ ] Dependencies baselined

Baseline History
================

.. item:: Baseline history tracking
   :id: 00170
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 00147

   The extension shall maintain a history of baselines:

   - List of all baseline versions
   - Timestamp of each baseline creation
   - Requirement counts per baseline

.. item:: Baseline timeline view
   :id: 00171
   :type: requirement
   :level: system
   :status: draft
   :satisfies: 00170

   Future: Display timeline showing:

   - Baseline versions chronologically
   - Requirement count growth
   - Major changes highlighted

Component Requirements
======================

.. item:: BaselineManager implementation
   :id: 00172
   :type: design_element
   :level: component
   :status: approved
   :implements: 00148, 00149, 00150

   The BaselineManager component shall:

   - Track all baseline tags in workspace
   - Apply baseline tags via document edits
   - Validate baseline eligibility
   - Query requirements by baseline

.. item:: ReportGenerator implementation
   :id: 00173
   :type: design_element
   :level: component
   :status: approved
   :implements: 00156, 00157, 00158

   The ReportGenerator component shall:

   - Collect data from index for baseline
   - Format Markdown/HTML report
   - Compute change delta from previous baseline
   - Generate coverage metrics section

.. item:: GitIntegration implementation
   :id: 00174
   :type: design_element
   :level: component
   :status: approved
   :implements: 00163, 00164

   The GitIntegration component shall:

   - Check Git repository status
   - Create annotated tags via Git CLI
   - Handle errors gracefully
   - Not require Git extension dependency
