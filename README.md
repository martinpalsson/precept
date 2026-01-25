# Rigr

**A free and open source requirements management system.**

Rigr (pronounced "rigger") is part of a complete open source RMS stack:
- **Sphinx** - Documentation generation and publishing
- **VS Code + Rigr** - Intelligent editing with IntelliSense, validation, and traceability
- **Version Control** - Git-based change tracking (your choice of hosting)

Designed for automotive, embedded systems, and safety-critical engineering. Manage requirements through the entire product lifecycle with RST-based documentation.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![VS Code](https://img.shields.io/badge/VS%20Code-1.80+-blue.svg)](https://code.visualstudio.com/)

## Features

### IntelliSense & Autocomplete
- **Smart Autocomplete**: Suggestions for requirement IDs in link fields
- **Inline References**: Autocomplete for `:item:`REQ_001`` references
- **Fuzzy Matching**: Filter as you type

### Hover & Navigation
- **Rich Previews**: Hover over any ID to see full details
- **Go to Definition** (`F12`): Jump directly to definitions
- **Find References** (`Shift+F12`): Find all usages
- **Peek Definition** (`Alt+F12`): Inline preview

### Validation & Diagnostics
- **Real-time Validation**: Errors as you type
- **Broken Link Detection**: Catch non-existent references
- **Duplicate ID Detection**: No duplicate IDs
- **Status Validation**: Enforce valid status values
- **Quick Fixes** (`Ctrl+.`): One-click issue resolution

### Requirements Explorer
- **Tree View**: Browse all requirements in sidebar
- **Flexible Grouping**: By type, file, or status
- **Search & Filter**: Quick requirement lookup
- **Click Navigation**: Instant jumps

### Baseline & Release Management
- **Version Tagging**: Mark requirements by release
- **Release Reports**: Generate comparison reports
- **Git Integration**: Create Git tags for baselines

### Productivity
- **Code Snippets**: Pre-built requirement templates
- **Auto-increment IDs**: Smart ID generation
- **Batch Operations**: Tag/untag baselines in bulk

## Installation

### From VS Code Marketplace
1. Open Extensions (`Ctrl+Shift+X`)
2. Search for "Rigr"
3. Click **Install**

### From VSIX
```bash
code --install-extension rigr-0.0.1.vsix
```

### From Source
```bash
git clone https://github.com/martinpalsson/rigr.git
cd rigr-vscode
npm install
npm run compile
# Press F5 to launch Extension Development Host
```

## Quick Start

### 1. Project Setup

**Option A: Use the command (Recommended)**

1. Open an empty folder in VS Code
2. Press `Ctrl+Shift+P` and run `Rigr: New RMS Project`
3. Confirm to create the project structure

This creates a `docs/` folder with `conf.py`, sample requirements, and an index file.

**Option B: Manual setup**

Create a `docs/conf.py` with your configuration:

```python
# docs/conf.py

project = 'My Requirements Project'

rigr_object_types = [
    {"value": "requirement", "title": "Requirement"},
    {"value": "specification", "title": "Specification"},
    {"value": "rationale", "title": "Rationale"},
    {"value": "parameter", "title": "Parameter"},
]

rigr_id_config = {
    "prefix": "",        # Optional: e.g., "REQ" for "REQ-0001"
    "separator": "",     # Separator between prefix and number
    "padding": 4,        # Number of digits (e.g., 4 for "0001")
    "start": 1,          # Starting number for auto-increment
}

rigr_link_types = [
    {"option": "satisfies", "incoming": "satisfied_by", "outgoing": "satisfies"},
    {"option": "implements", "incoming": "implemented_by", "outgoing": "implements"},
    {"option": "tests", "incoming": "tested_by", "outgoing": "tests"},
]

rigr_statuses = [
    {"status": "draft"},
    {"status": "review"},
    {"status": "approved"},
    {"status": "implemented"},
]
```

### 2. Create Requirements

Use snippets - type `req-` and press Tab:

```rst
.. item:: System shall monitor network traffic
   :id: 0001
   :type: requirement
   :status: draft

   The system must capture and analyze all network packets
   on the designated interface.
```

### 3. Link Requirements

Autocomplete helps with linking:

```rst
.. item:: Network packet capture implementation
   :id: 0002
   :type: specification
   :implements: |  ← Press Ctrl+Space for suggestions
```

### 4. Navigate & Validate

- `Ctrl+Click` on IDs to jump to definitions
- `Shift+F12` to find all references
- Validation errors appear automatically
- Use `Ctrl+.` for quick fixes

## Configuration

Rigr reads its configuration from Sphinx's `conf.py` file - the same configuration drives both Rigr's VS Code features and Sphinx documentation builds.

### Configuration File Location

Rigr searches for `conf.py` in this order:
1. `docs/conf.py`
2. `doc/conf.py`
3. `conf.py` (project root)

### Configuration Options

#### 1. Object Types (`rigr_object_types`)

Define the types of objects you can create. Each type appears in the tree view.

```python
rigr_object_types = [
    {
        "type": "requirement",      # Internal value (used in :type: field)
        "title": "Requirement",     # Display name in UI
        "color": "#BFD8D2"          # Optional: color for visualizations
    },
    {
        "type": "specification",
        "title": "Specification",
        "color": "#FEDCD2"
    },
    {
        "type": "test",
        "title": "Test Case",
        "color": "#AEDFF7"
    },
    {
        "type": "rationale",
        "title": "Rationale",
        "color": "#DF744A"
    },
]
```

**Usage in RST:**
```rst
.. item:: My requirement title
   :id: 0001
   :type: requirement    ← Must match a "type" value above
```

#### 2. ID Configuration (`rigr_id_config`)

Configure how requirement IDs are generated and formatted. By default, IDs are plain numeric (e.g., `0001`, `0002`). Prefixes are optional.

```python
rigr_id_config = {
    "prefix": "",        # Optional prefix (e.g., "REQ" for "REQ-0001")
    "separator": "",     # Separator between prefix and number (e.g., "-")
    "padding": 4,        # Number of digits (e.g., 4 for "0001")
    "start": 1,          # Starting number for auto-increment
}
```

**Example with prefix:**
```python
rigr_id_config = {
    "prefix": "REQ",
    "separator": "-",
    "padding": 4,
    "start": 1,
}
# Produces IDs like: REQ-0001, REQ-0002, ...
```

#### 3. Link Types (`rigr_link_types`)

Define how requirements can be linked together. This enables traceability and coverage analysis.

```python
rigr_link_types = [
    {
        "type": "satisfies",           # Link type name (used as :satisfies:)
        "inverse": "satisfied_by"      # Inverse relationship name
    },
    {
        "type": "implements",
        "inverse": "implemented_by"
    },
    {
        "type": "verifies",
        "inverse": "verified_by"
    },
    {
        "type": "derives",
        "inverse": "derived_from"
    },
    {
        "type": "links",               # Generic bidirectional link
        "inverse": "links"
    },
]
```

**Usage in RST:**
```rst
.. item:: System requirement
   :id: 0002
   :type: requirement
   :satisfies: 0001              ← Links to another requirement

.. item:: Test case
   :id: 0003
   :type: test
   :verifies: 0002               ← Links to system requirement
```

#### 4. Statuses (`rigr_statuses`)

Define the workflow states for requirements. Order matters for status consistency validation.

```python
rigr_statuses = [
    {
        "status": "draft",              # Status value (used in :status: field)
        "title": "Draft",               # Display name
        "color": "#808080"              # Optional: color for UI
    },
    {
        "status": "review",
        "title": "In Review",
        "color": "#FFA500"
    },
    {
        "status": "approved",
        "title": "Approved",
        "color": "#4CAF50"
    },
    {
        "status": "implemented",
        "title": "Implemented",
        "color": "#2196F3"
    },
    {
        "status": "rejected",
        "title": "Rejected",
        "color": "#F44336"
    },
]
```

**Status consistency:** Rigr warns if an `approved` requirement links to a `draft` requirement, as this may indicate incomplete review.

#### 5. Validation Thresholds (Optional)

Configure thresholds for deep validation coverage checks:

```python
rigr_validation_thresholds = {
    'hierarchical_coverage': {
        'satisfies': {
            'threshold': 90,                    # Minimum coverage percentage
            'from_types': ['requirement'],      # Source object types
            'to_types': ['requirement']         # Target object types
        },
        'implements': {
            'threshold': 85,
            'from_types': ['requirement'],
            'to_types': ['specification']
        },
        'verifies': {
            'threshold': 80,
            'from_types': ['specification'],
            'to_types': ['test']
        },
    },
    'priority_weighted_coverage': {
        'critical': 100,    # Critical items need 100% coverage
        'high': 95,
        'medium': 85,
        'low': 70,
    },
}
```

### Complete Example Configuration

Here's a complete `conf.py` for an automotive project:

```python
# docs/conf.py - Rigr Configuration for Automotive Project

project = 'Vehicle Control System Requirements'
author = 'Engineering Team'

# Object types
rigr_object_types = [
    {"type": "requirement", "title": "Requirement", "color": "#BFD8D2"},
    {"type": "specification", "title": "Specification", "color": "#FEDCD2"},
    {"type": "test", "title": "Test Case", "color": "#AEDFF7"},
    {"type": "rationale", "title": "Rationale", "color": "#DF744A"},
]

# ID configuration (prefix is optional)
rigr_id_config = {
    "prefix": "",
    "separator": "",
    "padding": 4,
    "start": 1,
}

# Traceability links
rigr_link_types = [
    {"type": "satisfies", "inverse": "satisfied_by"},
    {"type": "implements", "inverse": "implemented_by"},
    {"type": "verifies", "inverse": "verified_by"},
    {"type": "derives", "inverse": "derived_from"},
]

# Workflow statuses
rigr_statuses = [
    {"status": "draft", "title": "Draft", "color": "#808080"},
    {"status": "review", "title": "In Review", "color": "#FFA500"},
    {"status": "approved", "title": "Approved", "color": "#4CAF50"},
    {"status": "implemented", "title": "Implemented", "color": "#2196F3"},
]
```

### VS Code Settings

Additional settings can be configured in `.vscode/settings.json`:

```json
{
  "requirements.validation.automatic": true,
  "requirements.validation.onSave": true,
  "requirements.validation.debounceMs": 500,
  "requirements.validation.checkCircularDeps": false,
  "requirements.validation.checkCoverage": false,
  "requirements.treeView.groupBy": "type",
  "requirements.treeView.showStatusIcons": true,
  "requirements.indexing.maxFiles": 1000,
  "requirements.indexing.excludePatterns": ["**/build/**", "**/_build/**"]
}
```

| Setting | Default | Description |
|---------|---------|-------------|
| `validation.automatic` | `true` | Enable real-time validation |
| `validation.onSave` | `true` | Validate when files are saved |
| `validation.debounceMs` | `500` | Delay before validation runs |
| `validation.checkCircularDeps` | `false` | Check circular dependencies (slower) |
| `validation.checkCoverage` | `false` | Check coverage during auto-validation |
| `treeView.groupBy` | `"type"` | Group by: `type`, `file`, or `status` |
| `treeView.showStatusIcons` | `true` | Show status icons in tree view |
| `indexing.maxFiles` | `1000` | Maximum RST files to index |
| `indexing.excludePatterns` | `["**/build/**"]` | Glob patterns to exclude |

## Usage

### Creating Requirements

**Using snippets** - type and press Tab:
- `req-req` → Requirement
- `req-spec` → Specification  
- `req-test` → Test Case
- `req-rationale` → Rationale

**Manual creation:**

```rst
.. item:: User authentication requirement
   :id: 0042
   :type: requirement
   :status: approved
   :satisfies: 0010, 0011
   :baseline: v1.0.0

   The system must authenticate users using OAuth 2.0.
```

### Linking Requirements

```rst
:satisfies: 0001             # Single link
:implements: 0002, 0003      # Multiple links
:tests: 0004                 # Test case link
```

Use `Ctrl+Space` after `:` for autocomplete suggestions.

### Validation

**Automatic:** Errors appear as you type in Problems panel (`Ctrl+Shift+M`)

**Manual:** Command Palette → "Rigr: Deep Validation"

**Error types:**
- 🔴 Broken links
- 🔴 Duplicate IDs
- 🔴 Invalid status/type
- 🟡 Circular dependencies
- 🟡 Status inconsistencies
- 🔵 Orphaned requirements

**Quick fixes:** Press `Ctrl+.` on errors for solutions

### Baseline Management

**Tag a baseline:**
1. Command Palette → "Rigr: Tag Current Baseline"
2. Enter version (e.g., `v1.0.0`)
3. Select which requirements to tag

**Generate release report:**
1. Command Palette → "Rigr: Generate Release Report"
2. Select baseline
3. Choose comparison baseline (optional)
4. View or save report

**Create Git tag:**
1. Command Palette → "Rigr: Create Git Tag for Baseline"
2. Select baseline
3. Git tag `req-v1.0.0` is created

## Commands

| Command | Description |
|---------|-------------|
| `Rigr: New RMS Project` | Create a new Rigr project with sample conf.py and requirements |
| `Rigr: Reload Configuration` | Reload conf.py and rebuild index |
| `Rigr: Deep Validation` | Enterprise-grade validation with detailed reports |
| `Rigr: Tag Current Baseline` | Add baseline tags |
| `Rigr: Remove Baseline Tags` | Remove baseline |
| `Rigr: Generate Release Report` | Create release report |
| `Rigr: Create Git Tag for Baseline` | Git tag for baseline |
| `Rigr: Refresh Explorer` | Refresh tree view |

### Deep Validation

The **Rigr: Deep Validation** command provides comprehensive analysis of your requirements traceability:

**What it checks:**
- **DV-001: Circular Dependencies** - Detects cycles using Tarjan's algorithm, severity by length
- **DV-002: Hierarchical Coverage** - Stakeholder→System, System→Component coverage with thresholds
- **DV-003: Orphaned Requirements** - Categorizes true orphans, dead-ends, and source-only nodes
- **DV-004: Status Consistency** - Validates status propagation (approved→draft violations)
- **DV-005: Hierarchical Completeness** - Verifies complete traceability chains across levels
- **DV-006: Priority-Weighted Coverage** - Coverage targets by priority (critical: 100%, high: 95%, etc.)
- **DV-007: Baseline Stability** - Ensures baselined requirements are approved/implemented
- **DV-010: Gap Analysis** - Actionable recommendations prioritized by severity

**Severity Levels:**
- 🔴 **BLOCKER** - Must be fixed before release
- 🟠 **HIGH** - Should be fixed soon
- 🟡 **MEDIUM** - Should be fixed eventually
- 🔵 **LOW** - Nice to have
- ℹ️ **INFO** - Informational only

**Configuration** (in `conf.py`):
```python
rigr_validation_thresholds = {
    'hierarchical_coverage': {
        'satisfies': {'threshold': 90, 'from_types': ['requirement'], 'to_types': ['requirement']},
        'implements': {'threshold': 85, 'from_types': ['requirement'], 'to_types': ['specification']},
        'tests': {'threshold': 80, 'from_types': ['specification'], 'to_types': ['parameter']},
    },
    'priority_weighted_coverage': {
        'critical': 100,
        'high': 95,
        'medium': 85,
        'low': 70,
    },
}
```

**Output:** Detailed report in VS Code Output panel with:
- Summary statistics (total issues by severity)
- Top 10 prioritized recommendations with effort estimates
- Circular dependency cycles
- Coverage metrics by link type
- Detailed findings with actionable quick fixes

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Go to Definition | `F12` or `Ctrl+Click` |
| Peek Definition | `Alt+F12` |
| Find References | `Shift+F12` |
| Autocomplete | `Ctrl+Space` |
| Quick Fix | `Ctrl+.` |
| Command Palette | `Ctrl+Shift+P` |

## Tips

### ID Conventions and Optional ID Prefix
- By default, IDs are plain numeric: `0001`, `0002`, `0003`
- Use leading zeros for proper sorting
- Optionally configure a prefix in `conf.py` (e.g., `REQ-0001`)

```python
rigr_id_config = {
    "prefix": "",       # optional prefix e.g. REQ
    "separator": "",    # optional separator e.g. the hyphen in REQ-0001
    "padding": 4,       # default 10^4 space
    "start": 1,         # default first ID is 1.
}
```

### Links types
Link types can be set up in conf.py in the rigr_link_types list. A few link types are included by default.
A new link type is set up by adding an object to rigr_link_types list. To demonstrate this, lets implement a link type for linking rationale items to requirements.
```python
{
    # The directive that is written in the rationale item. e.g. :motivates: 0002
    "option": "motivates",
    # the verb for this link type on the receiving end (in this example 0002)
    "incoming": "motivated_by",
    # the verb for this link type on the originating end (in this example 0001)
    "outgoing": "motivates",
}
```

### Status Workflow
1. **draft** → Initial creation
2. **review** → Ready for review
3. **approved** → Reviewed and approved
4. **implemented** → Implementation complete

### Validation Strategy
- Keep automatic validation enabled during requirements development
- Run Deep Validation before releases
- Use quick fixes for efficiency
- Tag baselines only with approved/implemented requirements

## Troubleshooting

### Extension not activating
- Ensure `.rst` files exist in workspace
- Check file language is "reStructuredText" (status bar)

### Configuration not loading
- Verify `conf.py` exists in supported location
- Check Python is installed: `python3 --version`
- View Output panel: View → Output → "Requirements"

### Autocomplete not working
- Ensure cursor is in link field (`:links:`, `:satisfies:`, etc.)
- Press `Ctrl+Space` to manually trigger
- Check requirements are indexed (status bar)

### Performance issues
- Add build dirs to `requirements.indexing.excludePatterns`
- Increase `requirements.indexing.maxFiles` if needed

## Building HTML Documentation

Your requirements can be built as HTML using Sphinx:

```bash
cd docs/examples

# Create virtual environment (first time)
python3 -m venv venv
source venv/bin/activate  # Linux/macOS
# or: venv\Scripts\activate  # Windows

# Install dependencies
pip install -r python-dependencies.txt

# Build HTML
make html

# Open: _build/html/index.html
```

## Contributing

We welcome contributions! Here's how to get started:

### Development Setup

```bash
git clone https://github.com/martinpalsson/rigr.git
cd rigr-vscode
npm install
npm run compile
```

**Run extension:** Press `F5` in VS Code

**Run tests:** `npm run test:unit`

**Lint:** `npm run lint`

### Project Structure

```
src/
├── extension.ts              # Entry point
├── types.ts                  # TypeScript types
├── configuration/            # Config loading (conf.py parsing)
├── indexing/                 # RST parsing & indexing
├── providers/                # VS Code language providers
├── views/                    # Requirements Explorer
├── commands/                 # Command implementations
└── utils/                    # Utility functions
```

### Key Components

- **configLoader.ts**: Executes Python to parse `conf.py`
- **rstParser.ts**: Parses RST `.. item::` directives
- **indexBuilder.ts**: Maintains requirement index
- **completionProvider.ts**: Autocomplete suggestions
- **diagnosticProvider.ts**: Validation errors

### Adding Features

1. **New command:** Add to `package.json`, implement in `src/commands/`
2. **New provider:** Create in `src/providers/`, register in `extension.ts`
3. **New validation:** Add to `diagnosticProvider.ts`
4. **New setting:** Add to `package.json`, update `types.ts` and `settingsManager.ts`

### Coding Standards

- TypeScript strict mode
- 2-space indentation
- JSDoc comments on public APIs
- Unit tests for new features
- [Conventional Commits](https://www.conventionalcommits.org/)

### Submitting Changes

1. Fork the repository
2. Create feature branch: `git checkout -b feat/my-feature`
3. Make changes with tests
4. Commit: `feat: add feature description`
5. Push and open Pull Request

## Requirements

- VS Code 1.80.0+
- Python 3.7+ (for conf.py parsing)
- Works on Windows, macOS, Linux

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

- [Report Issues](https://github.com/martinpalsson/rigr/issues)
- [Source Code](https://github.com/martinpalsson/rigr)

## Related Projects

- [reStructuredText](https://docutils.sourceforge.io/rst.html) - Documentation markup language
- [Sphinx](https://www.sphinx-doc.org/) - Documentation generator
