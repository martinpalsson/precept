/**
 * Project templates for new RMS projects
 */

/**
 * Default precept.json content for a new Precept project
 */
export const PRECEPT_JSON_TEMPLATE = JSON.stringify({
  project: 'Requirements',
  version: '0.1',

  objectTypes: [
    { type: 'requirement', title: 'Requirement' },
    { type: 'specification', title: 'Specification' },
    { type: 'rationale', title: 'Rationale' },
    { type: 'information', title: 'Information' },
    { type: 'parameter', title: 'Parameter' },
    { type: 'term', title: 'Term' },
    { type: 'graphic', title: 'Graphic' },
    { type: 'code', title: 'Code' },
    { type: 'design_element', title: 'Design Element' },
  ],

  levels: [
    { level: 'stakeholder', title: 'Stakeholder' },
    { level: 'system', title: 'System' },
    { level: 'component', title: 'Component' },
    { level: 'software', title: 'Software' },
    { level: 'hardware', title: 'Hardware' },
  ],

  idConfig: {
    prefix: '',
    separator: '',
    padding: 4,
    start: 1,
  },

  linkTypes: [
    { option: 'satisfies', incoming: 'satisfied_by', outgoing: 'satisfies', style: '#0000AA' },
    { option: 'implements', incoming: 'implemented_by', outgoing: 'implements', style: '#00AA00' },
    { option: 'derives_from', incoming: 'derives_to', outgoing: 'derives_from' },
    { option: 'tests', incoming: 'tested_by', outgoing: 'tests', style: '#AA0000' },
    { option: 'links', incoming: 'linked_from', outgoing: 'links_to' },
    { option: 'depends_on', incoming: 'blocks', outgoing: 'depends_on' },
    { option: 'references', incoming: 'referenced_by', outgoing: 'references' },
  ],

  statuses: [
    { status: 'draft', color: '#FFEB3B' },
    { status: 'review', color: '#FF9800' },
    { status: 'approved', color: '#4CAF50' },
    { status: 'implemented', color: '#2196F3' },
    { status: 'verified', color: '#9C27B0' },
    { status: 'deprecated', color: '#9E9E9E' },
    { status: 'rejected', color: '#F44336' },
  ],

  defaultStatus: 'draft',

  extraOptions: ['author', 'version', 'baseline'],

  customFields: {
    product: [
      { value: 'widget-pro', title: 'Widget Pro' },
      { value: 'widget-lite', title: 'Widget Lite' },
      { value: 'platform', title: 'Platform Core' },
    ],
    priority: [
      { value: 'critical', title: 'Critical' },
      { value: 'high', title: 'High' },
      { value: 'medium', title: 'Medium' },
      { value: 'low', title: 'Low' },
    ],
    complexity: [
      { value: 'trivial', title: 'Trivial' },
      { value: 'simple', title: 'Simple' },
      { value: 'moderate', title: 'Moderate' },
      { value: 'complex', title: 'Complex' },
    ],
  },

  headingStyles: [
    { char: '#', overline: true },
    { char: '*', overline: true },
    { char: '=', overline: false },
    { char: '-', overline: false },
    { char: '^', overline: false },
    { char: '"', overline: false },
  ],

  plantuml: {
    mode: 'local',
    command: 'plantuml',
    server: 'https://www.plantuml.com/plantuml/svg/',
  },
}, null, 2);

/**
 * Precept CSS template for styling requirements
 */
export const PRECEPT_CSS_TEMPLATE = `/* =============================================================================
   Precept Requirements Styling
   =============================================================================
   Theme-compatible styles for requirement items.
   All colours use var(--precept-*) custom properties injected by the theme.
   ============================================================================= */

/* -----------------------------------------------------------------------------
   Item Container
   ----------------------------------------------------------------------------- */
.precept-item {
    border: 1px solid var(--precept-border-color);
    border-radius: 4px;
    margin: 1.5em 0;
    background: var(--precept-bg-light);
    overflow: hidden;
}

/* Type-specific left border accent */
.precept-type-requirement {
    border-left: 4px solid #1976d2;
}

.precept-type-specification {
    border-left: 4px solid #388e3c;
}

.precept-type-rationale {
    border-left: 4px solid #f57c00;
}

.precept-type-information {
    border-left: 4px solid #7b1fa2;
}

.precept-type-parameter {
    border-left: 4px solid #0097a7;
}

.precept-type-term {
    border-left: 4px solid #98D8AA;
}

.precept-type-design_element {
    border-left: 4px solid #455a64;
}

/* -----------------------------------------------------------------------------
   Title (rubric element)
   ----------------------------------------------------------------------------- */
.precept-item .precept-title,
.precept-graphic .precept-title,
.precept-code .precept-title {
    margin: 0;
    padding: 0.5em 0.75em;
    background: var(--precept-bg-header);
    border-bottom: 1px solid var(--precept-border-color);
    font-size: 1.1em;
    font-weight: 600;
    color: var(--precept-text-primary);
}

/* ID displayed in title */
.precept-title-id {
    font-family: ui-monospace, 'SF Mono', 'Monaco', 'Consolas', monospace;
    font-weight: 600;
    color: var(--precept-id-color);
    background: var(--precept-id-bg);
    padding: 0.1em 0.35em;
    border-radius: 3px;
    font-size: 0.9em;
    margin-right: 0.3em;
}

/* -----------------------------------------------------------------------------
   ID and Type styling in table cells
   ----------------------------------------------------------------------------- */
.precept-id {
    font-family: ui-monospace, 'SF Mono', 'Monaco', 'Consolas', monospace;
    font-weight: 600;
    color: var(--precept-id-color);
    background: var(--precept-id-bg);
    padding: 0.15em 0.4em;
    border-radius: 3px;
    font-size: 0.95em;
}

.precept-type-label {
    color: var(--precept-text-secondary);
    font-weight: 500;
    text-transform: uppercase;
    font-size: 0.85em;
    letter-spacing: 0.05em;
}

/* -----------------------------------------------------------------------------
   Content Wrapper - body on left, metadata on right
   ----------------------------------------------------------------------------- */
.precept-content-wrapper {
    display: flex;
    flex-wrap: wrap;
    gap: 0;
}

.precept-body {
    flex: 1 1 70%;
    min-width: 300px;
    padding: 0.5em 0.75em 0.5em 1em !important;
    background: var(--precept-bg-content);
    color: var(--precept-text-primary);
}

.precept-body > *:first-child {
    margin-top: 0;
}

.precept-body > *:last-child {
    margin-bottom: 0;
}

.precept-metadata-wrapper {
    flex: 0 0 auto;
    width: 25%;
    min-width: 180px;
    max-width: 280px;
    background: var(--precept-bg-light);
    border-left: 1px solid var(--precept-border-color);
    display: flex;
    flex-direction: column;
}

.precept-metadata-wrapper .precept-metadata-table,
.precept-metadata-wrapper table {
    margin: 0 !important;
    padding: 0 !important;
    border: none !important;
    flex: 1;
    display: flex;
    flex-direction: column;
}

.precept-metadata-wrapper tbody,
.precept-metadata-wrapper tgroup {
    margin: 0 !important;
    padding: 0 !important;
    display: flex;
    flex-direction: column;
    flex: 1;
}

.precept-metadata-wrapper tr {
    display: flex;
    width: 100%;
}

.precept-metadata-wrapper tr:last-child {
    flex: 1;
}

.precept-metadata-wrapper td:first-child {
    flex: 0 0 auto;
    width: 40%;
}

.precept-metadata-wrapper td:last-child {
    flex: 1;
}

/* -----------------------------------------------------------------------------
   Metadata Table - compact styling
   ----------------------------------------------------------------------------- */
.precept-metadata-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.8em;
    margin: 0 !important;
    padding: 0;
    background: transparent;
    border: none;
}

.precept-metadata-table td {
    padding: 0.25em 0.5em;
    border-bottom: 1px solid var(--precept-border-color);
    vertical-align: top;
    color: var(--precept-text-primary);
}

.precept-metadata-table td:first-child {
    width: 40%;
    font-weight: 500;
    color: var(--precept-text-secondary);
    white-space: nowrap;
}

.precept-metadata-table td:last-child {
    background: var(--precept-bg-content);
}

.precept-metadata-table tr:last-child td {
    border-bottom: none;
}

/* Clickable link references */
.precept-link-ref {
    color: var(--precept-id-color);
    text-decoration: none;
}

.precept-link-ref:hover {
    text-decoration: underline;
}

/* =============================================================================
   GRAPHIC DIRECTIVE STYLES
   ============================================================================= */

.precept-graphic {
    margin: 2em 0;
    padding: 0;
    background: var(--precept-bg-light);
    border: 1px solid var(--precept-border-color);
    border-radius: 4px;
    overflow: hidden;
}

.precept-graphic-content {
    padding: 1em;
    background: var(--precept-bg-content);
    overflow-x: auto;
    text-align: center;
}

.precept-graphic-link {
    display: block;
    cursor: zoom-in;
}

.precept-graphic-link:hover img {
    opacity: 0.9;
}

.precept-graphic-content img {
    max-width: 100%;
    height: auto;
    display: block;
    margin: 0 auto;
    transition: opacity 0.2s;
}

.precept-graphic-content object,
.precept-graphic-content svg {
    max-width: 100%;
    height: auto;
    display: block;
    margin: 0 auto;
}

.precept-graphic-uml {
    width: 100%;
}

.precept-graphic-uml .plantuml {
    width: 100%;
    overflow-x: auto;
}

.precept-graphic-uml object {
    max-width: 100%;
    width: auto !important;
    height: auto !important;
}

.precept-graphic-caption {
    padding: 0.75em 1em;
    background: var(--precept-bg-header);
    border-top: 1px solid var(--precept-border-color);
    text-align: center;
    font-style: italic;
    color: var(--precept-text-secondary);
}

.precept-graphic-caption p {
    margin: 0;
}

/* =============================================================================
   CODE DIRECTIVE STYLES
   ============================================================================= */

.precept-code {
    margin: 2em 0;
    padding: 0;
    background: var(--precept-bg-light);
    border: 1px solid var(--precept-border-color);
    border-radius: 4px;
    overflow: hidden;
}

.precept-code-content {
    margin: 0;
    padding: 0;
}

.precept-code-content .highlight {
    margin: 0;
    border-radius: 0;
}

.precept-code-content pre {
    margin: 0;
    border-radius: 0;
    border: none;
    border-top: 1px solid var(--precept-border-color);
    border-bottom: 1px solid var(--precept-border-color);
}

.precept-code-caption {
    padding: 0.75em 1em;
    background: var(--precept-bg-header);
    border-top: 1px solid var(--precept-border-color);
    text-align: center;
    font-style: italic;
    color: var(--precept-text-secondary);
}

.precept-code-caption p {
    margin: 0;
}

/* -----------------------------------------------------------------------------
   Admonitions
   ----------------------------------------------------------------------------- */
.admonition {
    border: 1px solid var(--precept-border-color);
    border-radius: 4px;
    margin: 1em 0;
    padding: 0.75em 1em;
    background: var(--precept-bg-light);
}

.admonition-title {
    font-weight: 600;
    margin: 0 0 0.5em 0;
}

.admonition.note { border-left: 4px solid #2196F3; }
.admonition.warning { border-left: 4px solid #FF9800; }
.admonition.tip { border-left: 4px solid #4CAF50; }
.admonition.important { border-left: 4px solid #F44336; }
.admonition.caution { border-left: 4px solid #FF9800; }
.admonition.danger { border-left: 4px solid #F44336; }

/* -----------------------------------------------------------------------------
   Status Theming
   ----------------------------------------------------------------------------- */
.precept-status-draft { border-top: 2px solid #CFB53B; }
.precept-status-review { border-top: 2px solid #E08A00; }
.precept-status-approved { border-top: 2px solid #388E3C; }
.precept-status-implemented { border-top: 2px solid #1976D2; }
.precept-status-verified { border-top: 2px solid #7B1FA2; }
.precept-status-deprecated { border-top: 2px solid #9E9E9E; }
.precept-status-rejected { border-top: 2px solid #C62828; }

.precept-field-status { font-weight: 600; }
.precept-status-draft .precept-field-status { color: #CFB53B; }
.precept-status-review .precept-field-status { color: #E08A00; }
.precept-status-approved .precept-field-status { color: #388E3C; }
.precept-status-implemented .precept-field-status { color: #1976D2; }
.precept-status-verified .precept-field-status { color: #7B1FA2; }
.precept-status-deprecated .precept-field-status { color: #9E9E9E; }
.precept-status-rejected .precept-field-status { color: #C62828; }

/* -----------------------------------------------------------------------------
   PlantUML Diagrams
   ----------------------------------------------------------------------------- */
.precept-graphic-uml {
    padding: 1em;
    text-align: center;
    background: var(--precept-bg-content);
}

.precept-graphic-uml img.plantuml-diagram {
    max-width: 100%;
    height: auto;
    display: inline-block;
}

/* -----------------------------------------------------------------------------
   Syntax Highlighting (highlight.js)
   ----------------------------------------------------------------------------- */
.hljs {
    background: var(--precept-code-block-bg);
}

.hljs-keyword, .hljs-built_in, .hljs-name { color: #0000ff; }
.hljs-string, .hljs-attr, .hljs-symbol { color: #a31515; }
.hljs-type, .hljs-title, .hljs-section, .hljs-title.class_, .hljs-title.function_ { color: #267f99; }
.hljs-number, .hljs-literal { color: #098658; }
.hljs-comment, .hljs-quote { color: #008000; font-style: italic; }
.hljs-meta { color: #795E26; }
.hljs-variable, .hljs-template-variable { color: #001080; }
.hljs-emphasis { font-style: italic; }
.hljs-strong { font-weight: bold; }

/* -----------------------------------------------------------------------------
   Print Styles
   ----------------------------------------------------------------------------- */
/* =============================================================================
   SIGNATURE BLOCK
   ============================================================================= */
.precept-signature {
    margin: 0;
    padding: 0.4em 0.75em;
    border-top: 1px solid var(--precept-border-color);
    font-size: 0.85em;
    color: var(--precept-text-secondary);
}

.precept-signature summary {
    cursor: pointer;
    font-style: italic;
}

.precept-signature-stale {
    border-top-color: #e65100;
    background: rgba(230, 81, 0, 0.06);
}

.precept-signature-stale summary {
    color: #e65100;
}

.precept-signature-table {
    margin-top: 0.5em;
    width: 100%;
    border-collapse: collapse;
}

.precept-signature-table td {
    padding: 0.25em 0.5em;
    border: none;
    vertical-align: top;
}

.precept-signature-table td:first-child {
    white-space: nowrap;
    font-weight: 600;
    width: 120px;
}

.precept-signature-value {
    word-break: break-all;
}

@media print {
    .precept-item {
        break-inside: avoid;
        border: 1px solid #ccc;
        box-shadow: none;
    }

    .precept-graphic {
        break-inside: avoid;
    }

    .precept-code {
        break-inside: avoid;
    }

    .precept-signature[open] {
        break-inside: avoid;
    }
}
`;

/**
 * Precept JavaScript template for clickable graphics
 */
export const PRECEPT_JS_TEMPLATE = `/**
 * Precept - Make graphics clickable to view full-size
 */
document.addEventListener('DOMContentLoaded', function() {
    // Find all clickable graphic images
    document.querySelectorAll('.precept-clickable img').forEach(function(img) {
        img.style.cursor = 'zoom-in';
        img.addEventListener('click', function() {
            window.open(img.src, '_blank');
        });
    });

    // Find all PlantUML diagrams (rendered as <object> with SVG)
    document.querySelectorAll('.precept-graphic-uml .plantuml').forEach(function(container) {
        var obj = container.querySelector('object');
        if (obj) {
            var overlay = document.createElement('div');
            overlay.className = 'precept-uml-overlay';
            overlay.style.position = 'absolute';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100%';
            overlay.style.height = '100%';
            overlay.style.cursor = 'zoom-in';
            overlay.title = 'Click to view full-size';

            container.style.position = 'relative';
            container.style.display = 'inline-block';

            overlay.addEventListener('click', function() {
                window.open(obj.data, '_blank');
            });

            container.appendChild(overlay);
        }
    });

    // Handle PlantUML fallback images
    document.querySelectorAll('.precept-graphic-uml img').forEach(function(img) {
        img.style.cursor = 'zoom-in';
        img.addEventListener('click', function() {
            window.open(img.src, '_blank');
        });
    });
});
`;

/**
 * Sample requirements RST file template
 */
export const SAMPLE_RST_TEMPLATE = `Requirements
============

This document contains the system requirements.

Stakeholder Requirements
------------------------

.. item:: Sample Stakeholder Requirement
   :id: 0001
   :type: requirement
   :level: stakeholder
   :status: draft

   This is a sample stakeholder requirement. Replace this with your actual requirements.

   **Acceptance Criteria:**

   - Criterion 1
   - Criterion 2

System Requirements
-------------------

.. item:: System Requirement
   :id: 0002
   :type: requirement
   :level: system
   :status: draft
   :satisfies: 0001

   This system requirement satisfies stakeholder requirement 0001.

.. item:: Another System Requirement
   :id: 0003
   :type: requirement
   :level: system
   :status: draft
   :satisfies: 0001

   This requirement also satisfies 0001, demonstrating traceability.

Design Elements
---------------

.. item:: Sample Design Element
   :id: 0004
   :type: design_element
   :level: component
   :status: draft
   :implements: 0002

   This design element implements system requirement 0002.

Rationales
----------

.. item:: Rationale for Requirement 0001
   :id: 0005
   :type: rationale
   :level: stakeholder
   :status: draft
   :links: 0001

   This rationale explains why requirement 0001 exists.

   The requirement is needed because of regulatory compliance
   and customer expectations for system reliability.

Graphics Example
----------------

Below is an example of the graphic directive with PlantUML:

.. graphic:: System Overview
   :id: 0006
   :caption: This diagram shows the basic system architecture.

   @startuml
   actor User
   component "Frontend" as FE
   component "Backend" as BE
   database "Database" as DB

   User --> FE
   FE --> BE
   BE --> DB
   @enduml

Code Example
------------

Below is an example of the code directive with syntax highlighting:

.. listing:: User Data Model
   :id: 0007
   :language: python
   :caption: Python class representing the user data model.
   :implements: 0002

   class User:
       """Represents a system user."""

       def __init__(self, name: str, email: str):
           self.name = name
           self.email = email

       def validate(self) -> bool:
           return "@" in self.email
`;

/**
 * Index RST template
 */
export const INDEX_RST_TEMPLATE = `Welcome to Requirements Documentation
=====================================

.. toctree::
   :maxdepth: 2
   :caption: Contents:

   requirements
`;
