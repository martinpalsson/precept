.. _requirements-index:

================================
Rigr Extension - Requirements
================================

This is the requirements documentation for the **Rigr VS Code Extension**,
a lightweight requirements management system for RST documentation.

This project uses Rigr to manage its own requirements (dogfooding).

.. graphic:: Some banana graphics
   :id: 00306
   :file: ../images/banana.png
   :caption: Have a banana!

.. contents:: Table of Contents
   :local:
   :depth: 1

Document Structure
==================

Requirements are organized by functional area across multiple specification files:

.. code-block:: text

   requirements/
   ├── index.rst              <- You are here (overview)
   ├── configuration.rst      <- Configuration system (conf.py, settings)
   ├── data-model.rst         <- Requirement object model and parsing
   ├── intellisense.rst       <- IntelliSense, completion, navigation
   ├── validation.rst         <- Validation, diagnostics, deep analysis
   ├── baseline.rst           <- Baseline and release management
   ├── ui.rst                 <- Tree view, status bar, UI components
   ├── nfr.rst                <- Non-functional requirements
   └── architecture.rst       <- Implementation design & traceability

Requirement Hierarchy
=====================

Requirements follow a three-level hierarchy:

.. code-block:: text

   Stakeholder Requirements (STK)
       |
       | satisfies
       v
   System Requirements (SYS)
       |
       | implements
       v
   Component Requirements (CMP)

Requirement Types
=================

All requirements use the ``.. item::`` directive with a ``:type:`` field:

.. list-table::
   :header-rows: 1
   :widths: 20 80

   * - Type
     - Description
   * - requirement
     - Functional or behavioral requirements
   * - rationale
     - Justification and reasoning for requirements
   * - information
     - Supporting context and background information
   * - parameter
     - Configurable parameters and thresholds
   * - design_element
     - Architectural and design decisions

Status Values
=============

.. list-table::
   :header-rows: 1
   :widths: 20 80

   * - Status
     - Description
   * - draft
     - Initial creation, under development
   * - review
     - Ready for stakeholder review
   * - approved
     - Reviewed and approved for implementation
   * - implemented
     - Implementation complete
   * - deprecated
     - No longer valid or superseded

Link Types
==========

.. list-table::
   :header-rows: 1
   :widths: 20 30 50

   * - Link Type
     - Inverse
     - Usage
   * - satisfies
     - satisfied_by
     - Lower-level requirement satisfies higher-level
   * - implements
     - implemented_by
     - Component implements system requirement
   * - derives_from
     - derives_to
     - Requirement derived from another
   * - tests
     - tested_by
     - Test case verifies requirement

Document Index
==============

.. toctree::
   :maxdepth: 2

   configuration
   data-model
   intellisense
   validation
   baseline
   ui
   nfr
   architecture

Statistics
==========

.. itemtable::
   :columns: id, title, type, level, status
   :style: table

Traceability Matrix
===================

.. itemflow::
   :types: requirement
   :link_types: satisfies, implements
