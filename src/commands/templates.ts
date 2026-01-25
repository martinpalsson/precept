/**
 * Project templates for new RMS projects
 */

/**
 * Default conf.py content for a new Rigr project
 * Full configuration with PlantUML, themes, and graphics support
 */
export const CONF_PY_TEMPLATE = `# =============================================================================
# Rigr Configuration for Requirements Management
# =============================================================================
#
# This is the conf.py for your Rigr requirements project.
# It configures both the Rigr VS Code extension and Sphinx documentation.
#
# =============================================================================

import os
import sys
sys.path.insert(0, os.path.abspath('_extensions'))

# -- Sphinx Extensions -------------------------------------------------------

extensions = ['rigr_sphinx', 'sphinxcontrib.plantuml']

# PlantUML configuration
# Option 1: Local installation (requires: dnf install plantuml OR apt install plantuml)
plantuml = 'plantuml'
# Option 2: Online server (no local installation required)
# plantuml = 'https://www.plantuml.com/plantuml/svg/'
plantuml_output_format = 'svg'

# -- Project information -----------------------------------------------------

project = 'Requirements'
copyright = '2024'
author = 'Author'
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
    {"type": "term", "title": "Term"},
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
# SPHINX THEME CONFIGURATION
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
html_theme = 'alabaster'

html_theme_options = {
    'description': 'Requirements Management Documentation',
    'github_button': False,
    'show_powered_by': False,
}

# -----------------------------------------------------------------------------
# Option 2: Read the Docs theme - Popular, feature-rich
# Requires: pip install sphinx-rtd-theme
# -----------------------------------------------------------------------------
# html_theme = 'sphinx_rtd_theme'
# html_theme_options = {
#     'navigation_depth': 4,
#     'collapse_navigation': False,
#     'sticky_navigation': True,
#     'includehidden': True,
#     'titles_only': False,
# }

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
`;

/**
 * Rigr Sphinx Extension template
 */
export const RIGR_SPHINX_PY_TEMPLATE = `"""
Rigr Sphinx Extension
=====================

A Sphinx extension that provides the \`\`.. item::\`\`, \`\`.. graphic::\`\`, and
\`\`.. listing::\`\` directives for requirements management documentation.

This extension reads configuration from conf.py (rigr_* settings) and renders
requirement items with proper styling and cross-references.

Implements:
- 00300: Presentation of items in the generated Sphinx document
- 00301: Theme of items in the generated Sphinx document
- 00303: Graphic directive for images
- 00304: Graphic directive for PlantUML diagrams
- 00305: Graphic presentation format
- 00308: Code directive for source code
- 00309: Code presentation format
"""

from docutils import nodes
from docutils.parsers.rst import directives, roles
from docutils.statemachine import ViewList
from sphinx.application import Sphinx
from sphinx.util.docutils import SphinxDirective
from sphinx.util.nodes import nested_parse_with_titles
from typing import Any, Dict, List
import logging

logger = logging.getLogger(__name__)


class DynamicOptionSpec(dict):
    """
    A dict subclass that returns directives.unchanged for any missing key.
    This allows directives to accept custom options defined in conf.py
    (e.g., custom link types) without hardcoding them in option_spec.
    """
    def __missing__(self, key):
        return directives.unchanged


def init_rigr_data(app: Sphinx) -> None:
    """Initialize rigr data storage in the environment."""
    if not hasattr(app.env, 'rigr_items'):
        app.env.rigr_items = {}  # id -> {outgoing_links: {link_type: [ids]}}


def collect_item_links(env, item_id: str, options: dict, config: Any, docname: str) -> None:
    """Collect outgoing links and values from an item for later resolution."""
    if not item_id:
        return

    if not hasattr(env, 'rigr_items'):
        env.rigr_items = {}

    link_types = getattr(config, 'rigr_link_types', [])
    link_options = [lt.get('option') for lt in link_types if lt.get('option')]

    outgoing = {}
    for opt in link_options:
        if opt in options and options[opt]:
            # Parse comma-separated IDs
            ids = [id.strip() for id in options[opt].split(',')]
            outgoing[opt] = ids

    # Store the item data including value/term for references and docname for cross-doc links
    env.rigr_items[item_id] = {
        'outgoing': outgoing,
        'value': options.get('value', None),
        'term': options.get('term', None),
        'docname': docname,
    }


def build_incoming_links(env) -> Dict[str, Dict[str, List[str]]]:
    """Build a map of incoming links for all items."""
    incoming = {}  # target_id -> {link_type: [source_ids]}

    if not hasattr(env, 'rigr_items'):
        return incoming

    for source_id, data in env.rigr_items.items():
        for link_type, target_ids in data.get('outgoing', {}).items():
            for target_id in target_ids:
                if target_id not in incoming:
                    incoming[target_id] = {}
                if link_type not in incoming[target_id]:
                    incoming[target_id][link_type] = []
                incoming[target_id][link_type].append(source_id)

    return incoming


def get_incoming_label(config: Any, link_type: str) -> str:
    """Get the incoming label for a link type from config."""
    link_types = getattr(config, 'rigr_link_types', [])
    for lt in link_types:
        if lt.get('option') == link_type:
            return lt.get('incoming', f'{link_type} (incoming)').replace('_', ' ').title()
    return f'{link_type} (incoming)'.replace('_', ' ').title()


class paramval_ref(nodes.Inline, nodes.TextElement):
    """Node for parameter value references (resolved later)."""
    pass


def paramval_role(name, rawtext, text, lineno, inliner, options={}, content=[]):
    """
    Role for referencing parameter values inline.

    Usage: :paramval:\`0042\` -> renders as the value of parameter 0042
    """
    param_id = text.strip()
    node = paramval_ref(rawtext, param_id, param_id=param_id)
    return [node], []


def resolve_paramval_refs(app: Sphinx, doctree: nodes.document, docname: str) -> None:
    """Resolve parameter value references after all documents are read."""
    env = app.env

    if not hasattr(env, 'rigr_items'):
        env.rigr_items = {}

    for node in doctree.traverse(paramval_ref):
        param_id = node.get('param_id', '')
        item_data = env.rigr_items.get(param_id, {})
        value = item_data.get('value')

        if value:
            # Create a reference link to the parameter
            refnode = nodes.reference('', value, internal=True)
            # Build cross-document URI if item is in a different document
            target_docname = item_data.get('docname', docname)
            if target_docname != docname:
                refnode['refuri'] = app.builder.get_relative_uri(docname, target_docname) + f'#req-{param_id}'
            else:
                refnode['refuri'] = f'#req-{param_id}'
            refnode['classes'] = ['paramval-ref']
            node.replace_self(refnode)
        else:
            # Parameter not found or no value - show warning
            logger.warning(f'Parameter value not found for ID: {param_id}')
            warning_node = nodes.inline('', f'[unknown: {param_id}]')
            warning_node['classes'] = ['paramval-missing']
            node.replace_self(warning_node)


class termref_node(nodes.Inline, nodes.TextElement):
    """Node for term references (resolved later)."""
    pass


def termref_role(name, rawtext, text, lineno, inliner, options={}, content=[]):
    """
    Role for referencing terminology items inline.

    Usage: :termref:\`0050\` -> renders as the term text of item 0050
    """
    term_id = text.strip()
    node = termref_node(rawtext, term_id, term_id=term_id)
    return [node], []


def resolve_termref_nodes(app: Sphinx, doctree: nodes.document, docname: str) -> None:
    """Resolve term references after all documents are read."""
    env = app.env

    if not hasattr(env, 'rigr_items'):
        env.rigr_items = {}

    for node in doctree.traverse(termref_node):
        term_id = node.get('term_id', '')
        item_data = env.rigr_items.get(term_id, {})
        term = item_data.get('term')

        if term:
            # Create a reference link to the term definition
            refnode = nodes.reference('', term, internal=True)
            # Build cross-document URI if item is in a different document
            target_docname = item_data.get('docname', docname)
            if target_docname != docname:
                refnode['refuri'] = app.builder.get_relative_uri(docname, target_docname) + f'#req-{term_id}'
            else:
                refnode['refuri'] = f'#req-{term_id}'
            refnode['classes'] = ['termref']
            node.replace_self(refnode)
        else:
            # Term not found or no term defined - show warning
            logger.warning(f'Term not found for ID: {term_id}')
            warning_node = nodes.inline('', f'[unknown: {term_id}]')
            warning_node['classes'] = ['termref-missing']
            node.replace_self(warning_node)


def add_incoming_links_to_doctree(app: Sphinx, doctree: nodes.document, docname: str) -> None:
    """Post-process doctree to add incoming links to item metadata tables."""
    env = app.env
    config = app.config

    # Build the incoming links map
    incoming_links = build_incoming_links(env)

    if not incoming_links:
        return

    # Find all rigr-item containers and add incoming links
    for container in doctree.traverse(nodes.container):
        classes = container.get('classes', [])
        if 'rigr-item' not in classes and 'rigr-graphic' not in classes and 'rigr-code' not in classes:
            continue

        # Extract item ID from container ids (e.g., 'req-0001' -> '0001')
        container_ids = container.get('ids', [])
        item_id = None
        for cid in container_ids:
            if cid.startswith('req-'):
                item_id = cid[4:]
                break
            elif cid.startswith('fig-'):
                item_id = cid[4:]
                break
            elif cid.startswith('code-'):
                item_id = cid[5:]
                break

        if not item_id or item_id not in incoming_links:
            continue

        # Find the metadata table in this container
        for table in container.traverse(nodes.table):
            if 'rigr-metadata-table' not in table.get('classes', []):
                continue

            # Find the tbody
            for tgroup in table.traverse(nodes.tgroup):
                for tbody in tgroup.traverse(nodes.tbody):
                    # Add incoming link rows
                    for link_type, source_ids in incoming_links[item_id].items():
                        label = get_incoming_label(config, link_type)
                        value = ', '.join(source_ids)

                        # Create new row
                        row = nodes.row()

                        # Field name cell
                        entry1 = nodes.entry()
                        entry1 += nodes.paragraph(text=label)
                        row += entry1

                        # Field value cell
                        entry2 = nodes.entry()
                        entry2['classes'] = [f'rigr-field-{label.lower().replace(" ", "-")}']
                        value_para = nodes.paragraph()
                        value_para += nodes.inline(text=value)
                        entry2 += value_para
                        row += entry2

                        tbody += row

                    break  # Only process first tbody
            break  # Only process first matching table


class ItemDirective(SphinxDirective):
    """
    Directive for defining requirement items.

    Usage::

        .. item:: Title of the Requirement
           :id: REQ-001
           :type: requirement
           :level: system
           :status: draft
           :satisfies: STK-001, STK-002
           :priority: high

           Description of the requirement.

    Output format (per 00300):
        - <Title> as header
        - Table containing: ID, Type, Level, Status, relationships
        - <Description> as main content body
    """

    has_content = True
    required_arguments = 1  # Title (single argument with whitespace)
    optional_arguments = 0
    final_argument_whitespace = True

    # Use DynamicOptionSpec to accept any option, including custom link types
    # defined in conf.py. Core options are listed for documentation purposes.
    option_spec = DynamicOptionSpec({
        'id': directives.unchanged,
        'type': directives.unchanged,
        'level': directives.unchanged,
        'status': directives.unchanged,
        'value': directives.unchanged,  # Parameter value for :paramval: references
        'term': directives.unchanged,   # Term text for :termref: references
    })

    def run(self) -> List[nodes.Node]:
        """Process the item directive and return docutils nodes."""
        env = self.env
        config = env.config

        # Title is the full argument (all words), ID comes from :id: option
        title = ' '.join(self.arguments) if self.arguments else 'Untitled'
        item_id = self.options.get('id', '')

        # Collect outgoing links for incoming link resolution
        collect_item_links(env, item_id, self.options, config, env.docname)

        # Get options with defaults
        item_type = self.options.get('type', 'requirement')
        level = self.options.get('level', '')
        status = self.options.get('status', getattr(config, 'rigr_default_status', 'draft'))

        # Get type title from config
        type_title = self._get_type_title(config, item_type)

        # Create container div
        container = nodes.container()
        container['classes'] = ['rigr-item', f'rigr-type-{item_type}', f'rigr-status-{status}']
        if item_id:
            container['ids'] = [f'req-{item_id}']

        # === Title as header (per 00300) ===
        title_node = nodes.rubric(text=title)
        title_node['classes'] = ['rigr-title']
        container += title_node

        # === Metadata table (per 00300) ===
        # Table contains: ID, Type, Level, Status, relationships
        metadata_rows = self._build_metadata_rows(config, item_id, type_title, level, status)
        if metadata_rows:
            table = nodes.table()
            table['classes'] = ['rigr-metadata-table']

            tgroup = nodes.tgroup(cols=2)
            table += tgroup

            # Column specs
            tgroup += nodes.colspec(colwidth=30)
            tgroup += nodes.colspec(colwidth=70)

            # Table body
            tbody = nodes.tbody()
            tgroup += tbody

            for field_name, field_value, field_class in metadata_rows:
                row = nodes.row()
                tbody += row

                # Field name cell
                entry1 = nodes.entry()
                entry1 += nodes.paragraph(text=field_name)
                row += entry1

                # Field value cell
                entry2 = nodes.entry()
                entry2['classes'] = [f'rigr-field-{field_name.lower().replace(" ", "-")}']
                value_para = nodes.paragraph()

                # Apply special styling based on field class
                if field_class:
                    value_span = nodes.inline(text=field_value)
                    value_span['classes'] = field_class if isinstance(field_class, list) else [field_class]
                    value_para += value_span
                else:
                    value_para += nodes.inline(text=field_value)
                entry2 += value_para
                row += entry2

            container += table

        # === Description / body content (per 00300) ===
        if self.content:
            body = nodes.container()
            body['classes'] = ['rigr-body']
            self.state.nested_parse(self.content, self.content_offset, body)
            container += body

        return [container]

    def _get_type_title(self, config: Any, item_type: str) -> str:
        """Get display title for a type from config."""
        object_types = getattr(config, 'rigr_object_types', [])
        for ot in object_types:
            if ot.get('type') == item_type:
                return ot.get('title', item_type.title())
        return item_type.title()

    def _get_status_color(self, config: Any, status: str) -> str:
        """Get the color for a status from config."""
        statuses = getattr(config, 'rigr_statuses', [])
        for s in statuses:
            if s.get('status') == status:
                return s.get('color', '#9E9E9E')
        return '#9E9E9E'

    def _build_metadata_rows(self, config: Any, item_id: str, type_title: str, level: str, status: str) -> List[tuple]:
        """Build list of (field_name, field_value, field_class) tuples for metadata table."""
        rows = []

        # Core metadata (per 00300): ID, Type, Level, Status
        if item_id:
            rows.append(('ID', item_id, 'rigr-id'))

        rows.append(('Type', type_title, 'rigr-type-label'))

        if level:
            level_title = self._get_level_title(config, level)
            rows.append(('Level', level_title, None))

        rows.append(('Status', status, ['rigr-status-badge', f'rigr-status-{status}']))

        # Value field for parameters (per 00313)
        if 'value' in self.options and self.options['value']:
            rows.append(('Value', self.options['value'], 'rigr-value'))

        # Term field for terminology (per 00318)
        if 'term' in self.options and self.options['term']:
            rows.append(('Term', self.options['term'], 'rigr-term'))

        # Link fields - all incoming and outgoing relationships
        link_types = getattr(config, 'rigr_link_types', [])
        link_options = [lt.get('option') for lt in link_types if lt.get('option')]

        for opt in link_options:
            if opt in self.options and self.options[opt]:
                # Get display label from config
                label = opt.replace('_', ' ').title()
                for lt in link_types:
                    if lt.get('option') == opt:
                        label = lt.get('outgoing', opt).replace('_', ' ').title()
                        break
                rows.append((label, self.options[opt], None))

        # Extra options
        extra_options = getattr(config, 'rigr_extra_options', [])
        for opt in extra_options:
            if opt in self.options and self.options[opt]:
                label = opt.replace('_', ' ').title()
                rows.append((label, self.options[opt], None))

        return rows

    def _get_level_title(self, config: Any, level: str) -> str:
        """Get display title for a level from config."""
        levels = getattr(config, 'rigr_levels', [])
        for lv in levels:
            if lv.get('level') == level:
                return lv.get('title', level.title())
        return level.title()


class GraphicDirective(SphinxDirective):
    """
    Directive for embedding graphics (images and PlantUML diagrams).

    Usage with image file::

        .. graphic:: Architecture Diagram
           :id: FIG-001
           :file: images/architecture.png
           :caption: This diagram shows the system architecture.
           :satisfies: REQ-001

    Usage with PlantUML::

        .. graphic:: Component Overview
           :id: FIG-002
           :caption: Component interactions in the system.

           @startuml
           component A
           component B
           A -> B
           @enduml

    Output format (per 00305):
        - <Title> as header
        - Table containing: ID, relationships
        - <Actual graphic> (clickable, full-width)
        - <Caption>
    """

    has_content = True
    required_arguments = 0  # Title is optional
    optional_arguments = 1
    final_argument_whitespace = True

    # Use DynamicOptionSpec to accept custom link types from conf.py
    option_spec = DynamicOptionSpec({
        'id': directives.unchanged,
        'file': directives.unchanged,
        'alt': directives.unchanged,
        'scale': directives.unchanged,
        'caption': directives.unchanged,
    })

    def run(self) -> List[nodes.Node]:
        """Process the graphic directive and return docutils nodes."""
        env = self.env
        config = env.config

        # Get title, caption and ID
        title = ' '.join(self.arguments) if self.arguments else ''
        graphic_id = self.options.get('id', '')
        caption = self.options.get('caption', '')
        file_path = self.options.get('file', '')
        alt_text = self.options.get('alt', title or 'Graphic')

        # Collect outgoing links for incoming link resolution
        collect_item_links(env, graphic_id, self.options, config, env.docname)

        # Create container
        container = nodes.container()
        container['classes'] = ['rigr-graphic']
        if graphic_id:
            container['ids'] = [f'fig-{graphic_id}']

        # === Title as header (per 00305) ===
        if title:
            title_node = nodes.rubric(text=title)
            title_node['classes'] = ['rigr-title']
            container += title_node

        # === Metadata table (per 00305) - ID and relationships ===
        metadata_rows = self._build_metadata_rows(config, graphic_id)
        if metadata_rows:
            table = nodes.table()
            table['classes'] = ['rigr-metadata-table']

            tgroup = nodes.tgroup(cols=2)
            table += tgroup

            # Column specs
            tgroup += nodes.colspec(colwidth=30)
            tgroup += nodes.colspec(colwidth=70)

            # Table body
            tbody = nodes.tbody()
            tgroup += tbody

            for field_name, field_value, field_class in metadata_rows:
                row = nodes.row()
                tbody += row

                # Field name cell
                entry1 = nodes.entry()
                entry1 += nodes.paragraph(text=field_name)
                row += entry1

                # Field value cell
                entry2 = nodes.entry()
                entry2['classes'] = [f'rigr-field-{field_name.lower().replace(" ", "-")}']
                value_para = nodes.paragraph()

                if field_class:
                    value_span = nodes.inline(text=field_value)
                    value_span['classes'] = field_class if isinstance(field_class, list) else [field_class]
                    value_para += value_span
                else:
                    value_para += nodes.inline(text=field_value)
                entry2 += value_para
                row += entry2

            container += table

        # === Actual graphic - clickable, full-width (per 00305) ===
        content = nodes.container()
        content['classes'] = ['rigr-graphic-content']

        if file_path:
            # Use Sphinx's image directive to properly handle image paths
            # This ensures the image gets copied to _build/html/_images/
            img_container = nodes.container()
            img_container['classes'] = ['rigr-graphic-image', 'rigr-clickable']
            rst_lines = ViewList()
            rst_lines.append(f'.. image:: {file_path}', '<graphic>')
            if alt_text:
                rst_lines.append(f'   :alt: {alt_text}', '<graphic>')
            if 'scale' in self.options:
                rst_lines.append(f'   :scale: {self.options["scale"]}', '<graphic>')
            self.state.nested_parse(rst_lines, 0, img_container)
            content += img_container
        elif self.content:
            # Check if content is PlantUML
            content_text = '\\n'.join(self.content)
            if '@startuml' in content_text or '@startmindmap' in content_text or '@startgantt' in content_text:
                # Use the uml directive from sphinxcontrib-plantuml
                uml_container = nodes.container()
                uml_container['classes'] = ['rigr-graphic-uml']
                # Build ViewList with uml directive wrapping the content
                rst_lines = ViewList()
                rst_lines.append('.. uml::', '<graphic>')
                rst_lines.append('', '<graphic>')
                for line in self.content:
                    rst_lines.append('   ' + line, '<graphic>')
                self.state.nested_parse(rst_lines, 0, uml_container)
                content += uml_container
            else:
                # Regular content
                self.state.nested_parse(self.content, self.content_offset, content)

        container += content

        # === Caption (per 00305) ===
        if caption:
            caption_node = nodes.container()
            caption_node['classes'] = ['rigr-graphic-caption']
            caption_para = nodes.paragraph(text=caption)
            caption_node += caption_para
            container += caption_node

        return [container]

    def _build_metadata_rows(self, config: Any, graphic_id: str) -> List[tuple]:
        """Build list of (field_name, field_value, field_class) tuples for metadata table."""
        rows = []

        # ID (per 00305)
        if graphic_id:
            rows.append(('ID', graphic_id, 'rigr-id'))

        # Link fields - all incoming and outgoing relationships
        link_types = getattr(config, 'rigr_link_types', [])
        link_options = [lt.get('option') for lt in link_types if lt.get('option')]

        for opt in link_options:
            if opt in self.options and self.options[opt]:
                # Get display label from config
                label = opt.replace('_', ' ').title()
                for lt in link_types:
                    if lt.get('option') == opt:
                        label = lt.get('outgoing', opt).replace('_', ' ').title()
                        break
                rows.append((label, self.options[opt], None))

        return rows


class CodeDirective(SphinxDirective):
    """
    Directive for embedding source code blocks with traceability.

    Usage::

        .. listing:: Database Schema
           :id: CODE-001
           :language: sql
           :caption: The main users table schema.
           :satisfies: REQ-003

           CREATE TABLE users (
               id SERIAL PRIMARY KEY,
               name VARCHAR(100) NOT NULL
           );

    Output format (per 00309):
        - <Title> as header
        - Table containing: ID, relationships
        - <Code block> with syntax highlighting
        - <Caption>

    Implements:
    - 00308: Code directive for source code
    - 00309: Code presentation format
    """

    has_content = True
    required_arguments = 0  # Title is optional
    optional_arguments = 1
    final_argument_whitespace = True

    # Use DynamicOptionSpec to accept custom link types from conf.py
    option_spec = DynamicOptionSpec({
        'id': directives.unchanged,
        'language': directives.unchanged,
        'caption': directives.unchanged,
    })

    def run(self) -> List[nodes.Node]:
        """Process the code directive and return docutils nodes."""
        env = self.env
        config = env.config

        # Get title, caption and ID
        title = ' '.join(self.arguments) if self.arguments else ''
        code_id = self.options.get('id', '')
        caption = self.options.get('caption', '')
        language = self.options.get('language', 'text')

        # Collect outgoing links for incoming link resolution
        collect_item_links(env, code_id, self.options, config, env.docname)

        # Create container
        container = nodes.container()
        container['classes'] = ['rigr-code']
        if code_id:
            container['ids'] = [f'code-{code_id}']

        # === Title as header (per 00309) ===
        if title:
            title_node = nodes.rubric(text=title)
            title_node['classes'] = ['rigr-title']
            container += title_node

        # === Metadata table (per 00309) - ID, language, and relationships ===
        metadata_rows = self._build_metadata_rows(config, code_id, language)
        if metadata_rows:
            table = nodes.table()
            table['classes'] = ['rigr-metadata-table']

            tgroup = nodes.tgroup(cols=2)
            table += tgroup

            tgroup += nodes.colspec(colwidth=30)
            tgroup += nodes.colspec(colwidth=70)

            tbody = nodes.tbody()
            tgroup += tbody

            for field_name, field_value, field_class in metadata_rows:
                row = nodes.row()
                tbody += row

                entry1 = nodes.entry()
                entry1 += nodes.paragraph(text=field_name)
                row += entry1

                entry2 = nodes.entry()
                entry2['classes'] = [f'rigr-field-{field_name.lower().replace(" ", "-")}']
                value_para = nodes.paragraph()

                if field_class:
                    value_span = nodes.inline(text=field_value)
                    value_span['classes'] = field_class if isinstance(field_class, list) else [field_class]
                    value_para += value_span
                else:
                    value_para += nodes.inline(text=field_value)
                entry2 += value_para
                row += entry2

            container += table

        # === Code block with syntax highlighting (per 00309) ===
        if self.content:
            code_content = nodes.container()
            code_content['classes'] = ['rigr-code-content']

            # Use Sphinx code-block directive for proper highlighting
            rst_lines = ViewList()
            rst_lines.append(f'.. code-block:: {language}', '<code>')
            rst_lines.append('', '<code>')
            for line in self.content:
                rst_lines.append('   ' + line, '<code>')
            self.state.nested_parse(rst_lines, 0, code_content)
            container += code_content

        # === Caption (per 00309) ===
        if caption:
            caption_node = nodes.container()
            caption_node['classes'] = ['rigr-code-caption']
            caption_para = nodes.paragraph(text=caption)
            caption_node += caption_para
            container += caption_node

        return [container]

    def _build_metadata_rows(self, config: Any, code_id: str, language: str) -> List[tuple]:
        """Build list of (field_name, field_value, field_class) tuples for metadata table."""
        rows = []

        if code_id:
            rows.append(('ID', code_id, 'rigr-id'))

        if language and language != 'text':
            rows.append(('Language', language, 'rigr-language'))

        # Link fields
        link_types = getattr(config, 'rigr_link_types', [])
        link_options = [lt.get('option') for lt in link_types if lt.get('option')]

        for opt in link_options:
            if opt in self.options and self.options[opt]:
                label = opt.replace('_', ' ').title()
                for lt in link_types:
                    if lt.get('option') == opt:
                        label = lt.get('outgoing', opt).replace('_', ' ').title()
                        break
                rows.append((label, self.options[opt], None))

        return rows


def setup(app: Sphinx) -> Dict[str, Any]:
    """Setup function for Sphinx extension."""
    # Register config values
    app.add_config_value('rigr_object_types', [], 'env')
    app.add_config_value('rigr_levels', [], 'env')
    app.add_config_value('rigr_link_types', [], 'env')
    app.add_config_value('rigr_statuses', [], 'env')
    app.add_config_value('rigr_extra_options', [], 'env')
    app.add_config_value('rigr_default_status', 'draft', 'env')
    app.add_config_value('rigr_id_config', {}, 'env')

    # Register directives
    app.add_directive('item', ItemDirective)
    app.add_directive('graphic', GraphicDirective)
    app.add_directive('listing', CodeDirective)

    # Register roles for parameter and term references
    roles.register_local_role('paramval', paramval_role)
    roles.register_local_role('termref', termref_role)

    # Register event handlers for incoming link resolution and reference resolution
    app.connect('builder-inited', init_rigr_data)
    app.connect('doctree-resolved', add_incoming_links_to_doctree)
    app.connect('doctree-resolved', resolve_paramval_refs)
    app.connect('doctree-resolved', resolve_termref_nodes)

    return {
        'version': '1.3.0',
        'parallel_read_safe': True,
        'parallel_write_safe': True,
    }
`;

/**
 * Rigr CSS template for styling requirements
 */
export const RIGR_CSS_TEMPLATE = `/* =============================================================================
   Rigr Requirements Styling
   =============================================================================
   Theme-compatible styles for requirement items (implements 00300, 00301, 00305).
   Works with: Sphinx default, Alabaster, Read the Docs, Furo, and other themes.
   ============================================================================= */

/* -----------------------------------------------------------------------------
   CSS Custom Properties (Theme Integration)
   These inherit from the page context for proper theme compatibility
   ----------------------------------------------------------------------------- */
:root {
    --rigr-border-color: rgba(0, 0, 0, 0.1);
    --rigr-bg-light: rgba(0, 0, 0, 0.02);
    --rigr-bg-header: rgba(0, 0, 0, 0.04);
    --rigr-bg-content: transparent;
    --rigr-text-primary: inherit;
    --rigr-text-secondary: inherit;
    --rigr-id-color: #1565c0;
    --rigr-id-bg: rgba(21, 101, 192, 0.1);
    --rigr-type-color: #5d4037;
}

/* -----------------------------------------------------------------------------
   Item Container
   ----------------------------------------------------------------------------- */
.rigr-item {
    border: 1px solid var(--rigr-border-color);
    border-radius: 4px;
    margin: 1.5em 0;
    background: var(--rigr-bg-light);
    overflow: hidden;
}

/* Type-specific left border accent */
.rigr-type-requirement {
    border-left: 4px solid #1976d2;
}

.rigr-type-specification {
    border-left: 4px solid #388e3c;
}

.rigr-type-rationale {
    border-left: 4px solid #f57c00;
}

.rigr-type-information {
    border-left: 4px solid #7b1fa2;
}

.rigr-type-parameter {
    border-left: 4px solid #0097a7;
}

.rigr-type-term {
    border-left: 4px solid #98D8AA;
}

.rigr-type-design_element {
    border-left: 4px solid #455a64;
}

/* -----------------------------------------------------------------------------
   Title (rubric element) - per 00300, 00305
   Used for both items and graphics
   ----------------------------------------------------------------------------- */
.rigr-item .rigr-title,
.rigr-graphic .rigr-title,
.rigr-code .rigr-title {
    margin: 0;
    padding: 0.75em 1em;
    background: var(--rigr-bg-header);
    border-bottom: 1px solid var(--rigr-border-color);
    font-size: 1.1em;
    font-weight: 600;
    color: var(--rigr-text-primary);
}

/* -----------------------------------------------------------------------------
   ID and Type styling in table cells - per 00300
   ----------------------------------------------------------------------------- */
.rigr-id {
    font-family: ui-monospace, 'SF Mono', 'Monaco', 'Consolas', monospace;
    font-weight: 600;
    color: var(--rigr-id-color);
    background: var(--rigr-id-bg);
    padding: 0.15em 0.4em;
    border-radius: 3px;
    font-size: 0.95em;
}

.rigr-type-label {
    color: var(--rigr-type-color);
    font-weight: 500;
    text-transform: uppercase;
    font-size: 0.85em;
    letter-spacing: 0.05em;
}

/* -----------------------------------------------------------------------------
   Metadata Table - per 00300, 00305
   Contains: ID, Type, Level, Status, relationships
   ----------------------------------------------------------------------------- */
.rigr-metadata-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9em;
    margin: 0;
    background: transparent;
}

.rigr-metadata-table td {
    padding: 0.4em 1em;
    border-bottom: 1px solid var(--rigr-border-color);
    vertical-align: top;
    color: var(--rigr-text-primary);
}

.rigr-metadata-table td:first-child {
    width: 30%;
    font-weight: 500;
    color: var(--rigr-text-secondary);
    background: var(--rigr-bg-header);
}

.rigr-metadata-table td:last-child {
    background: var(--rigr-bg-content);
}

.rigr-metadata-table tr:last-child td {
    border-bottom: none;
}

/* -----------------------------------------------------------------------------
   Status Badges
   Colors match conf.py rigr_statuses configuration
   ----------------------------------------------------------------------------- */
.rigr-status-badge {
    display: inline-block;
    padding: 0.2em 0.6em;
    border-radius: 3px;
    font-size: 0.85em;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.03em;
}

.rigr-status-badge.rigr-status-draft {
    background: #FFEB3B;
    color: #5d4037;
}

.rigr-status-badge.rigr-status-review {
    background: #FF9800;
    color: #fff;
}

.rigr-status-badge.rigr-status-approved {
    background: #4CAF50;
    color: #fff;
}

.rigr-status-badge.rigr-status-implemented {
    background: #2196F3;
    color: #fff;
}

.rigr-status-badge.rigr-status-verified {
    background: #9C27B0;
    color: #fff;
}

.rigr-status-badge.rigr-status-deprecated {
    background: #9E9E9E;
    color: #fff;
}

.rigr-status-badge.rigr-status-rejected {
    background: #F44336;
    color: #fff;
}

/* -----------------------------------------------------------------------------
   Body Content - per 00300
   ----------------------------------------------------------------------------- */
.rigr-body {
    padding: 1em;
    background: var(--rigr-bg-content);
    color: var(--rigr-text-primary);
}

.rigr-body > *:first-child {
    margin-top: 0;
}

.rigr-body > *:last-child {
    margin-bottom: 0;
}

/* -----------------------------------------------------------------------------
   Theme: Read the Docs Compatibility
   ----------------------------------------------------------------------------- */
.wy-body-for-nav .rigr-item,
.wy-body-for-nav .rigr-graphic,
.wy-body-for-nav .rigr-code,
.rst-content .rigr-item,
.rst-content .rigr-graphic,
.rst-content .rigr-code {
    --rigr-border-color: #e1e4e5;
    --rigr-bg-light: #f8f9fa;
    --rigr-bg-header: #eef0f1;
    --rigr-bg-content: #fcfcfc;
    --rigr-text-primary: #404040;
    --rigr-text-secondary: #6c757d;
    --rigr-type-color: #6c757d;
}

/* RTD specific table overrides - prevent theme table styles from interfering */
.rst-content .rigr-metadata-table {
    margin-bottom: 0;
    border: none;
}

.rst-content .rigr-metadata-table td {
    border-left: none;
    border-right: none;
}

/* -----------------------------------------------------------------------------
   Theme: Alabaster Compatibility
   ----------------------------------------------------------------------------- */
body.alabaster .rigr-item,
body.alabaster .rigr-graphic,
body.alabaster .rigr-code {
    --rigr-border-color: #ddd;
    --rigr-bg-light: #fdfdfd;
    --rigr-bg-header: #f7f7f7;
    --rigr-bg-content: #fff;
}

/* -----------------------------------------------------------------------------
   Theme: Sphinx Default (Classic) Compatibility
   ----------------------------------------------------------------------------- */
div.body .rigr-item,
div.body .rigr-graphic,
div.body .rigr-code {
    --rigr-border-color: #ccc;
    --rigr-bg-light: #f8f8f8;
    --rigr-bg-header: #efefef;
    --rigr-bg-content: #fff;
}

/* -----------------------------------------------------------------------------
   Theme: Furo Compatibility
   ----------------------------------------------------------------------------- */
body[data-theme="light"] .rigr-item,
body[data-theme="light"] .rigr-graphic,
body[data-theme="light"] .rigr-code,
.furo-body .rigr-item,
.furo-body .rigr-graphic,
.furo-body .rigr-code {
    --rigr-border-color: var(--color-background-border, #e0e0e0);
    --rigr-bg-light: var(--color-background-secondary, #fafafa);
    --rigr-bg-header: var(--color-background-hover, #f5f5f5);
    --rigr-bg-content: var(--color-background-primary, #fff);
}

/* Furo dark theme */
body[data-theme="dark"] .rigr-item,
body[data-theme="dark"] .rigr-graphic,
body[data-theme="dark"] .rigr-code {
    --rigr-border-color: var(--color-background-border, #404040);
    --rigr-bg-light: var(--color-background-secondary, #1a1a1a);
    --rigr-bg-header: var(--color-background-hover, #262626);
    --rigr-bg-content: var(--color-background-primary, #1a1a1a);
    --rigr-text-primary: var(--color-foreground-primary, #e0e0e0);
    --rigr-text-secondary: var(--color-foreground-secondary, #9e9e9e);
    --rigr-id-color: #90caf9;
    --rigr-id-bg: rgba(144, 202, 249, 0.15);
    --rigr-type-color: #bcaaa4;
}

/* -----------------------------------------------------------------------------
   Dark Mode Support (system preference)
   ----------------------------------------------------------------------------- */
@media (prefers-color-scheme: dark) {
    :root {
        --rigr-border-color: rgba(255, 255, 255, 0.1);
        --rigr-bg-light: rgba(255, 255, 255, 0.03);
        --rigr-bg-header: rgba(255, 255, 255, 0.05);
        --rigr-bg-content: transparent;
        --rigr-id-color: #90caf9;
        --rigr-id-bg: rgba(144, 202, 249, 0.15);
        --rigr-type-color: #bcaaa4;
    }
}

/* =============================================================================
   GRAPHIC DIRECTIVE STYLES (implements 00303, 00304, 00305)
   ============================================================================= */

/* -----------------------------------------------------------------------------
   Graphic Container - Full width display
   ----------------------------------------------------------------------------- */
.rigr-graphic {
    margin: 2em 0;
    padding: 0;
    background: var(--rigr-bg-light);
    border: 1px solid var(--rigr-border-color);
    border-radius: 4px;
    overflow: hidden;
}

/* -----------------------------------------------------------------------------
   Graphic Content - Full width images and diagrams (per 00305)
   ----------------------------------------------------------------------------- */
.rigr-graphic-content {
    padding: 1em;
    background: var(--rigr-bg-content);
    overflow-x: auto;
    text-align: center;
}

/* Clickable link wrapper for full-size view (per 00305) */
.rigr-graphic-link {
    display: block;
    cursor: zoom-in;
}

.rigr-graphic-link:hover img {
    opacity: 0.9;
}

/* Images display at full width */
.rigr-graphic-content img {
    max-width: 100%;
    height: auto;
    display: block;
    margin: 0 auto;
    transition: opacity 0.2s;
}

/* PlantUML SVG objects display at full width */
.rigr-graphic-content object,
.rigr-graphic-content svg {
    max-width: 100%;
    height: auto;
    display: block;
    margin: 0 auto;
}

/* PlantUML container */
.rigr-graphic-uml {
    width: 100%;
}

.rigr-graphic-uml .plantuml {
    width: 100%;
    overflow-x: auto;
}

.rigr-graphic-uml object {
    max-width: 100%;
    width: auto !important;
    height: auto !important;
}

/* -----------------------------------------------------------------------------
   Graphic Caption (per 00305)
   ----------------------------------------------------------------------------- */
.rigr-graphic-caption {
    padding: 0.75em 1em;
    background: var(--rigr-bg-header);
    border-top: 1px solid var(--rigr-border-color);
    text-align: center;
    font-style: italic;
    color: var(--rigr-text-secondary);
}

.rigr-graphic-caption p {
    margin: 0;
}

/* -----------------------------------------------------------------------------
   Theme: Read the Docs Compatibility for Graphics
   ----------------------------------------------------------------------------- */
.rst-content .rigr-graphic-content img {
    max-width: 100%;
}

/* =============================================================================
   CODE DIRECTIVE STYLES (implements 00308, 00309)
   ============================================================================= */

/* -----------------------------------------------------------------------------
   Code Container
   ----------------------------------------------------------------------------- */
.rigr-code {
    margin: 2em 0;
    padding: 0;
    background: var(--rigr-bg-light);
    border: 1px solid var(--rigr-border-color);
    border-radius: 4px;
    overflow: hidden;
}

/* Code content - the actual code block */
.rigr-code-content {
    margin: 0;
    padding: 0;
}

/* Remove extra margins from nested code-block */
.rigr-code-content .highlight {
    margin: 0;
    border-radius: 0;
}

.rigr-code-content pre {
    margin: 0;
    border-radius: 0;
    border: none;
    border-top: 1px solid var(--rigr-border-color);
    border-bottom: 1px solid var(--rigr-border-color);
}

/* Code Caption */
.rigr-code-caption {
    padding: 0.75em 1em;
    background: var(--rigr-bg-header);
    border-top: 1px solid var(--rigr-border-color);
    text-align: center;
    font-style: italic;
    color: var(--rigr-text-secondary);
}

.rigr-code-caption p {
    margin: 0;
}

/* -----------------------------------------------------------------------------
   Print Styles
   ----------------------------------------------------------------------------- */
@media print {
    .rigr-item {
        break-inside: avoid;
        border: 1px solid #ccc;
        box-shadow: none;
    }

    .rigr-graphic {
        break-inside: avoid;
    }

    .rigr-code {
        break-inside: avoid;
    }

    .rigr-status-badge {
        border: 1px solid currentColor;
    }
}
`;

/**
 * Rigr JavaScript template for clickable graphics
 */
export const RIGR_JS_TEMPLATE = `/**
 * Rigr - Make graphics clickable to view full-size
 */
document.addEventListener('DOMContentLoaded', function() {
    // Find all clickable graphic images
    document.querySelectorAll('.rigr-clickable img').forEach(function(img) {
        img.style.cursor = 'zoom-in';
        img.addEventListener('click', function() {
            window.open(img.src, '_blank');
        });
    });

    // Find all PlantUML diagrams (rendered as <object> with SVG)
    // Add a clickable overlay since <object> intercepts click events
    document.querySelectorAll('.rigr-graphic-uml .plantuml').forEach(function(container) {
        var obj = container.querySelector('object');
        if (obj) {
            // Create overlay div
            var overlay = document.createElement('div');
            overlay.className = 'rigr-uml-overlay';
            overlay.style.position = 'absolute';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100%';
            overlay.style.height = '100%';
            overlay.style.cursor = 'zoom-in';
            overlay.title = 'Click to view full-size';

            // Make container relative for overlay positioning
            container.style.position = 'relative';
            container.style.display = 'inline-block';

            overlay.addEventListener('click', function() {
                window.open(obj.data, '_blank');
            });

            container.appendChild(overlay);
        }
    });

    // Also handle PlantUML fallback images (when SVG fails to load)
    document.querySelectorAll('.rigr-graphic-uml img').forEach(function(img) {
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
export const PYTHON_DEPENDENCIES_TEMPLATE = `Sphinx>=9.1.0
sphinx-basic-ng>=1.0.0b2
sphinx_rtd_theme>=3.1.0
sphinxcontrib-applehelp>=2.0.0
sphinxcontrib-devhelp>=2.0.0
sphinxcontrib-htmlhelp>=2.1.0
sphinxcontrib-jquery>=4.1
sphinxcontrib-jsmath>=1.0.1
sphinxcontrib-plantuml>=0.31
sphinxcontrib-qthelp>=2.0.0
sphinxcontrib-serializinghtml>=2.0.0
furo>=2025.12.19
pydata-sphinx-theme>=0.16.1
`;

export const INDEX_RST_TEMPLATE = `Welcome to Requirements Documentation
=====================================

.. toctree::
   :maxdepth: 2
   :caption: Contents:

   requirements
`;
