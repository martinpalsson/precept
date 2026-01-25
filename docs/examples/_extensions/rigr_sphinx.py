"""
Rigr Sphinx Extension
=====================

A Sphinx extension that provides the ``.. item::`` and ``.. graphic::`` directives
for requirements management documentation.

This extension reads configuration from conf.py (rigr_* settings) and renders
requirement items with proper styling and cross-references.

Implements:
- 00300: Presentation of items in the generated Sphinx document
- 00301: Theme of items in the generated Sphinx document
- 00303: Graphic directive for images
- 00304: Graphic directive for PlantUML diagrams
- 00305: Graphic presentation format
"""

from docutils import nodes
from docutils.parsers.rst import directives
from docutils.statemachine import ViewList
from sphinx.application import Sphinx
from sphinx.util.docutils import SphinxDirective
from sphinx.util.nodes import nested_parse_with_titles
from typing import Any, Dict, List


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

    # Core options
    option_spec = {
        'id': directives.unchanged,
        'type': directives.unchanged,
        'level': directives.unchanged,
        'status': directives.unchanged,
        # Link options (populated dynamically from config)
        'satisfies': directives.unchanged,
        'implements': directives.unchanged,
        'derives_from': directives.unchanged,
        'tests': directives.unchanged,
        'links': directives.unchanged,
        'depends_on': directives.unchanged,
        # Extra options
        'priority': directives.unchanged,
        'complexity': directives.unchanged,
        'author': directives.unchanged,
        'version': directives.unchanged,
        'baseline': directives.unchanged,
    }

    def run(self) -> List[nodes.Node]:
        """Process the item directive and return docutils nodes."""
        env = self.env
        config = env.config

        # Title is the full argument (all words), ID comes from :id: option
        title = ' '.join(self.arguments) if self.arguments else 'Untitled'
        item_id = self.options.get('id', '')

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

    option_spec = {
        'id': directives.unchanged,
        'file': directives.unchanged,
        'alt': directives.unchanged,
        'scale': directives.unchanged,
        'caption': directives.unchanged,
        # Link options for traceability
        'satisfies': directives.unchanged,
        'implements': directives.unchanged,
        'derives_from': directives.unchanged,
        'tests': directives.unchanged,
        'links': directives.unchanged,
        'depends_on': directives.unchanged,
    }

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
            content_text = '\n'.join(self.content)
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

    option_spec = {
        'id': directives.unchanged,
        'language': directives.unchanged,
        'caption': directives.unchanged,
        # Link options for traceability
        'satisfies': directives.unchanged,
        'implements': directives.unchanged,
        'derives_from': directives.unchanged,
        'tests': directives.unchanged,
        'links': directives.unchanged,
        'depends_on': directives.unchanged,
    }

    def run(self) -> List[nodes.Node]:
        """Process the code directive and return docutils nodes."""
        env = self.env
        config = env.config

        # Get title, caption and ID
        title = ' '.join(self.arguments) if self.arguments else ''
        code_id = self.options.get('id', '')
        caption = self.options.get('caption', '')
        language = self.options.get('language', 'text')

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

    return {
        'version': '1.0.0',
        'parallel_read_safe': True,
        'parallel_write_safe': True,
    }
