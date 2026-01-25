# =============================================================================
# Rigr Configuration for Requirements Management
# =============================================================================
#
# This is an example conf.py showing how to configure Rigr for
# requirements management in VS Code. This file is used by the Rigr
# extension to understand your project's requirement structure.
#
# Documentation: https://github.com/rigr/rigr-vscode
# =============================================================================

import os
import sys
sys.path.insert(0, os.path.abspath('_extensions'))

# -- Sphinx Extensions -------------------------------------------------------

extensions = ['rigr_sphinx', 'sphinxcontrib.plantuml']

# PlantUML configuration
# Option 1: Local installation (requires: dnf install plantuml)
plantuml = 'plantuml'
# Option 2: Online server (no local installation required)
# plantuml = 'https://www.plantuml.com/plantuml/svg/'
plantuml_output_format = 'svg'

# -- Project information -----------------------------------------------------

project = 'Rigr Requirements Management'
copyright = '2025, Martin Pålsson'
author = 'Martin Pålsson'
version = '0.1'
release = '0.0.1'

# -- Rigr Configuration ------------------------------------------------

# =============================================================================
# OBJECT TYPES (rigr_object_types)
# =============================================================================
# Define the types of objects used in your requirements with the :type: field.
# These are the values that go in :type: field of .. item:: directives.
#
# Fields:
#   - type: The string value used in :type: field (e.g., :type: requirement)
#   - title: Display name in documentation and VS Code
# =============================================================================

rigr_object_types = [
    {"type": "requirement", "title": "Requirement"},
    {"type": "specification", "title": "Specification"},
    {"type": "rationale", "title": "Rationale"},
    {"type": "information", "title": "Information"},
    {"type": "parameter", "title": "Parameter"},
    {"type": "graphic", "title": "Graphic"},
    {"type": "code", "title": "Code"},
    {"type": "design_element", "title": "Design Element"},
]

# =============================================================================
# LEVELS (rigr_levels)
# =============================================================================
# Define the abstraction levels in your requirements hierarchy.
# Used with the :level: field on .. item:: directives.
#
# Fields:
#   - level: The level identifier (e.g., "stakeholder", "system")
#   - title: Display name for the level
# =============================================================================

rigr_levels = [
    {"level": "stakeholder", "title": "Stakeholder Requirements"},
    {"level": "system", "title": "System Requirements"},
    {"level": "component", "title": "Component Requirements"},
    {"level": "software", "title": "Software Requirements"},
    {"level": "hardware", "title": "Hardware Requirements"},
]

# =============================================================================
# ID CONFIGURATION (rigr_id_config)
# =============================================================================
# Configure how requirement IDs are generated and formatted.
#
# Fields:
#   - prefix: Optional prefix for all IDs (e.g., "REQ" for "REQ-0001")
#   - separator: Separator between prefix and number (e.g., "-")
#   - padding: Number of digits (e.g., 4 for "0001")
#   - start: Starting number for auto-increment
# =============================================================================

rigr_id_config = {
    "prefix": "",
    "separator": "",
    "padding": 4,
    "start": 1,
}

# =============================================================================
# LINK TYPES (rigr_link_types)
# =============================================================================
# Define relationships between requirements.
# These become options on directives (e.g., :satisfies:)
#
# Fields:
#   - option: The option name used in RST (e.g., :satisfies:)
#   - incoming: Label for reverse direction in docs
#   - outgoing: Label for forward direction in docs
#   - style: Line style for visualization (optional)
# =============================================================================

rigr_link_types = [
    # Stakeholder → System traceability
    {
        "option": "satisfies",
        "incoming": "satisfied_by",
        "outgoing": "satisfies",
        "style": "#0000AA",  # Blue lines
    },

    # System → Design traceability
    {
        "option": "implements",
        "incoming": "implemented_by",
        "outgoing": "implements",
        "style": "#00AA00",  # Green lines
    },

    # Derived requirements
    {
        "option": "derives_from",
        "incoming": "derives_to",
        "outgoing": "derives_from",
    },

    # Design → Test traceability
    {
        "option": "tests",
        "incoming": "tested_by",
        "outgoing": "tests",
        "style": "#AA0000",  # Red lines
    },

    # General links (any direction)
    {
        "option": "links",
        "incoming": "linked_from",
        "outgoing": "links_to",
    },

    # Dependency tracking
    {
        "option": "depends_on",
        "incoming": "blocks",
        "outgoing": "depends_on",
    },

    # Rationale justification (custom link type for testing)
    {
        "option": "justifies",
        "incoming": "justified_by",
        "outgoing": "justifies",
        "style": "#FF6600",  # Orange lines
    },
]

# =============================================================================
# STATUS VALUES (rigr_statuses)
# =============================================================================
# Define the lifecycle states for requirements.
#
# Fields:
#   - status: The status name used in RST (e.g., :status: draft)
#   - color: Color for status indication (optional)
# =============================================================================

rigr_statuses = [
    # Initial state
    {"status": "draft", "color": "#FFEB3B"},       # Yellow

    # Under review
    {"status": "review", "color": "#FF9800"},      # Orange

    # Approved by stakeholders
    {"status": "approved", "color": "#4CAF50"},    # Green

    # Implementation complete
    {"status": "implemented", "color": "#2196F3"}, # Blue

    # Verified/tested
    {"status": "verified", "color": "#9C27B0"},    # Purple

    # No longer valid
    {"status": "deprecated", "color": "#9E9E9E"},  # Gray

    # Rejected/not approved
    {"status": "rejected", "color": "#F44336"},    # Red
]

# =============================================================================
# ADDITIONAL OPTIONS
# =============================================================================

# Default status for new requirements
rigr_default_status = "draft"

# Extra options available on all item types
rigr_extra_options = [
    "priority",      # e.g., :priority: high
    "complexity",    # e.g., :complexity: medium
    "author",        # e.g., :author: John Doe
    "version",       # e.g., :version: 1.0
    "baseline",      # e.g., :baseline: v1.0.0
]

# =============================================================================
# HTML OUTPUT CONFIGURATION
# =============================================================================

html_static_path = ['_static']
html_css_files = ['rigr.css']
html_js_files = ['rigr.js']

# =============================================================================
# SPHINX THEME CONFIGURATION (implements 00301)
# =============================================================================
# Choose a theme by uncommenting ONE of the options below.
# The rigr.css stylesheet is designed to work with all these themes.
#
# After changing themes, you may need to install the theme package:
#   pip install sphinx-rtd-theme
#   pip install furo
#   pip install pydata-sphinx-theme
# =============================================================================

# -----------------------------------------------------------------------------
# Option 1: Alabaster (Sphinx default) - Clean, minimal design
# -----------------------------------------------------------------------------
# html_theme = 'alabaster'

# html_theme_options = {
#     'description': 'Requirements Management Documentation',
#     'github_button': False,
#     'show_powered_by': False,
# }

# -----------------------------------------------------------------------------
# Option 2: Read the Docs theme - Popular, feature-rich
# Requires: pip install sphinx-rtd-theme
# -----------------------------------------------------------------------------
html_theme = 'sphinx_rtd_theme'
html_theme_options = {
    'navigation_depth': 4,
    'collapse_navigation': False,
    'sticky_navigation': True,
    'includehidden': True,
    'titles_only': False,
}

# -----------------------------------------------------------------------------
# Option 3: Furo - Modern, clean with dark mode support
# Requires: pip install furo
# -----------------------------------------------------------------------------
# html_theme = 'furo'
# html_theme_options = {
#     'light_css_variables': {
#         'color-brand-primary': '#1976d2',
#         'color-brand-content': '#1976d2',
#     },
#     'dark_css_variables': {
#         'color-brand-primary': '#90caf9',
#         'color-brand-content': '#90caf9',
#     },
# }

# -----------------------------------------------------------------------------
# Option 4: PyData Sphinx Theme - Great for technical documentation
# Requires: pip install pydata-sphinx-theme
# -----------------------------------------------------------------------------
# html_theme = 'pydata_sphinx_theme'
# html_theme_options = {
#     'show_toc_level': 2,
#     'navigation_with_keys': True,
# }

# -----------------------------------------------------------------------------
# Option 5: Classic Sphinx theme - Traditional look
# -----------------------------------------------------------------------------
# html_theme = 'classic'
# html_theme_options = {
#     'body_max_width': 'none',
# }
