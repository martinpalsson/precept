<p align="center">
  <img src="icon.png" alt="Precept" width="128" height="128">
</p>

# Precept

**A free and open source requirements engineering tool for VS Code.**

Precept is a lightweight requirements management system built into VS Code.
Write requirements in RST files, get IntelliSense, validation, traceability,
live preview, and static HTML documentation — no external tools needed.

> **Early release disclaimer:** This is an initial release. Some features may be rough around the edges, and you may encounter bugs. Feedback and issue reports are very welcome at [github.com/martinpalsson/precept/issues](https://github.com/martinpalsson/precept/issues).

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

### Item Explorer
- **Tree View**: Browse all items in sidebar
- **Flexible Grouping**: By type, file, or status
- **Cursor Sync**: Explorer follows your cursor position
- **Click Navigation**: Instant jumps

### Link Explorer
- **Relationship View**: Incoming and outgoing links for the focused item
- **Inline References**: `:termref:`, `:paramval:`, and `:item:` references tracked as links
- **Bidirectional Navigation**: Click a linked item to navigate there

### Live Preview & Static HTML
- **Live RST Preview**: Rendered preview panel that follows your cursor
- **Static HTML Build**: Generate a full documentation site from your RST files
- **Selectable Themes**: Choose from Default, Read the Docs, Alabaster, Furo, or PyData
- **PlantUML Diagrams**: Embedded diagram rendering
- **Syntax Highlighting**: Code blocks with highlight.js

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
2. Search for "Precept"
3. Click **Install**

### From VSIX
```bash
code --install-extension precept-0.1.0.vsix
```

### From Source
```bash
git clone https://github.com/martinpalsson/precept.git
cd precept
npm install
npm run compile
# Press F5 to launch Extension Development Host
```

## Quick Start

### 1. Project Setup

**Option A: Use the command (Recommended)**

1. Open an empty folder in VS Code
2. Press `Ctrl+Shift+P` and run `Precept: New RMS Project`
3. Confirm to create the project structure

This creates a `docs/` folder with `precept.json`, sample requirements, and an index file.

**Option B: Manual setup**

Create a `docs/precept.json` with your configuration:

```json
{
  "project": "My Requirements Project",

  "objectTypes": [
    { "type": "requirement", "title": "Requirement" },
    { "type": "specification", "title": "Specification" },
    { "type": "rationale", "title": "Rationale" },
    { "type": "parameter", "title": "Parameter" }
  ],

  "idConfig": {
    "prefix": "",
    "separator": "",
    "padding": 4,
    "start": 1
  },

  "linkTypes": [
    { "option": "satisfies", "incoming": "satisfied_by", "outgoing": "satisfies" },
    { "option": "implements", "incoming": "implemented_by", "outgoing": "implements" },
    { "option": "tests", "incoming": "tested_by", "outgoing": "tests" }
  ],

  "statuses": [
    { "status": "draft" },
    { "status": "review" },
    { "status": "approved" },
    { "status": "implemented" }
  ]
}
```

### 2. Create Requirements

Use snippets - type `.. `, a dropdown will appear and you can select among common snippets.

![Snippets menu](docs/images/dropdown1.png)

The snippet can then be navigated by tabbing field by field. Intellisense on the attributes
![Attributes dropdown menu](docs/images/dropdown2.png)

### 3. Link Requirements

Autocomplete helps with linking:

```rst
.. item:: Network packet capture implementation
   :id: 0002
   :type: specification
   :implements: |  <- Press Ctrl+Space for suggestions
```

### 4. Navigate

#### `Ctrl+Click` on IDs to jump to definitions
#### `Shift+F12` to find all references
![References popup](docs/images/find-all-references1.png)

#### Item Explorer
![Item Explorer](docs/images/req-explorer1.png)

All items (not limited to requirements) show up in the Item Explorer.
When an item in the Item Explorer is selected, the text editor is
focused on that item, and the Link Explorer will focus on that item.

#### Link Explorer
![Link Explorer](docs/images/rel-explorer1.png)

Shows the links (incoming/outgoing) for the item in focus. The user can
click on a related item in the Link Explorer to navigate the text
to the item, and focus the Item Explorer on it.

### 5. Validate
#### Validation errors appear automatically
![Validation errors are marked with red squiggly lines](docs/images/validation-error1.png)
#### Use `Ctrl+.` for quick fixes
Also works when clicking the star symbol.

![Quick Fix](docs/images/quick-fix1.png)

## Configuration

Precept reads its configuration from `precept.json`. This single file drives all features — IntelliSense, validation, preview themes, and static HTML builds.

### Configuration File Location

Precept searches for `precept.json` in this order:
1. `docs/precept.json`
2. `doc/precept.json`
3. `source/precept.json`
4. `precept.json` (project root)
5. Recursive search in subdirectories

### Configuration Options

#### 1. Object Types (`objectTypes`)

Define the types of objects you can create. Each type appears in the tree view.

```json
{
  "objectTypes": [
    { "type": "requirement", "title": "Requirement" },
    { "type": "specification", "title": "Specification" },
    { "type": "rationale", "title": "Rationale" },
    { "type": "parameter", "title": "Parameter" },
    { "type": "term", "title": "Term" },
    { "type": "design_element", "title": "Design Element" }
  ]
}
```

**Usage in RST:**
```rst
.. item:: My requirement title
   :id: 0001
   :type: requirement    <- Must match a "type" value above
```

#### 2. ID Configuration (`idConfig`)

Configure how requirement IDs are generated and formatted. By default, IDs are plain numeric (e.g., `0001`, `0002`). Prefixes are optional.

```json
{
  "idConfig": {
    "prefix": "",
    "separator": "",
    "padding": 4,
    "start": 1
  }
}
```

**Example with prefix:**
```json
{
  "idConfig": {
    "prefix": "REQ",
    "separator": "-",
    "padding": 4,
    "start": 1
  }
}
```
Produces IDs like: `REQ-0001`, `REQ-0002`, ...

#### 3. Link Types (`linkTypes`)

Define how requirements can be linked together. This enables traceability and coverage analysis.

```json
{
  "linkTypes": [
    { "option": "satisfies", "incoming": "satisfied_by", "outgoing": "satisfies" },
    { "option": "implements", "incoming": "implemented_by", "outgoing": "implements" },
    { "option": "tests", "incoming": "tested_by", "outgoing": "tests" },
    { "option": "derives_from", "incoming": "derives_to", "outgoing": "derives_from" },
    { "option": "links", "incoming": "linked_from", "outgoing": "links_to" }
  ]
}
```

**Usage in RST:**
```rst
.. item:: System requirement
   :id: 0002
   :type: requirement
   :satisfies: 0001

.. item:: Test case
   :id: 0003
   :type: requirement
   :tests: 0002
```

#### 4. Statuses (`statuses`)

Define the workflow states for requirements. Order matters for status consistency validation.

```json
{
  "statuses": [
    { "status": "draft", "color": "#FFEB3B" },
    { "status": "review", "color": "#FF9800" },
    { "status": "approved", "color": "#4CAF50" },
    { "status": "implemented", "color": "#2196F3" },
    { "status": "rejected", "color": "#F44336" }
  ]
}
```

**Status consistency:** Precept warns if an `approved` requirement links to a `draft` requirement, as this may indicate incomplete review.

#### 5. Custom Fields (`customFields`)

Define custom metadata fields with enumerated values for IntelliSense completion:

```json
{
  "customFields": {
    "product": [
      { "value": "widget-pro", "title": "Widget Pro" },
      { "value": "widget-lite", "title": "Widget Lite" }
    ],
    "priority": [
      { "value": "critical", "title": "Critical" },
      { "value": "high", "title": "High" },
      { "value": "medium", "title": "Medium" },
      { "value": "low", "title": "Low" }
    ]
  }
}
```

**Usage in RST:**
```rst
.. item:: High priority requirement
   :id: 0010
   :type: requirement
   :priority: critical
   :product: widget-pro
```

#### 6. Theme (`theme`)

Select a visual theme for preview and static HTML output:

```json
{
  "theme": "readthedocs"
}
```

Available themes: `default`, `readthedocs`, `alabaster`, `furo`, `pydata`

### Complete Example Configuration

Here's a complete `precept.json`:

```json
{
  "project": "Vehicle Control System Requirements",
  "version": "1.0",
  "theme": "furo",

  "objectTypes": [
    { "type": "requirement", "title": "Requirement" },
    { "type": "specification", "title": "Specification" },
    { "type": "rationale", "title": "Rationale" },
    { "type": "parameter", "title": "Parameter" },
    { "type": "term", "title": "Term" },
    { "type": "design_element", "title": "Design Element" }
  ],

  "levels": [
    { "level": "stakeholder", "title": "Stakeholder" },
    { "level": "system", "title": "System" },
    { "level": "component", "title": "Component" },
    { "level": "software", "title": "Software" },
    { "level": "hardware", "title": "Hardware" }
  ],

  "idConfig": {
    "prefix": "",
    "separator": "",
    "padding": 4,
    "start": 1
  },

  "linkTypes": [
    { "option": "satisfies", "incoming": "satisfied_by", "outgoing": "satisfies" },
    { "option": "implements", "incoming": "implemented_by", "outgoing": "implements" },
    { "option": "derives_from", "incoming": "derives_to", "outgoing": "derives_from" },
    { "option": "tests", "incoming": "tested_by", "outgoing": "tests" },
    { "option": "links", "incoming": "linked_from", "outgoing": "links_to" }
  ],

  "statuses": [
    { "status": "draft", "color": "#FFEB3B" },
    { "status": "review", "color": "#FF9800" },
    { "status": "approved", "color": "#4CAF50" },
    { "status": "implemented", "color": "#2196F3" }
  ],

  "customFields": {
    "priority": [
      { "value": "critical", "title": "Critical" },
      { "value": "high", "title": "High" },
      { "value": "medium", "title": "Medium" },
      { "value": "low", "title": "Low" }
    ]
  }
}
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
- `req-req` -> Requirement
- `req-spec` -> Specification
- `req-test` -> Test Case
- `req-rationale` -> Rationale

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

### Inline References

Reference items inline using roles:

```rst
The system communicates via the :termref:`0050`.
The timeout is :paramval:`0042`.
See :item:`0001` for details.
```

These are tracked as links in the Link Explorer.

### Validation

**Automatic:** Errors appear as you type in Problems panel (`Ctrl+Shift+M`)

**Manual:** Command Palette -> "Precept: Deep Validation"

**Error types:**
- Broken links
- Duplicate IDs
- Invalid status/type
- Circular dependencies
- Status inconsistencies
- Orphaned requirements

**Quick fixes:** Press `Ctrl+.` on errors for solutions

### Baseline Management

**Tag a baseline:**
1. Command Palette -> "Precept: Tag Current Baseline"
2. Enter version (e.g., `v1.0.0`)
3. Select which requirements to tag

**Generate release report:**
1. Command Palette -> "Precept: Generate Release Report"
2. Select baseline
3. Choose comparison baseline (optional)
4. View or save report

**Create Git tag:**
1. Command Palette -> "Precept: Create Git Tag for Baseline"
2. Select baseline
3. Git tag `req-v1.0.0` is created

### Building HTML Documentation

Use the VS Code command palette:
- **Precept: Build Documentation** - generates static HTML in `_build/html/`
- **Precept: View Documentation** - opens the built HTML in your browser
- **Precept: Open RST Preview** - live preview in VS Code

The static HTML builder is built into the extension — no external tools required.

## Commands

| Command | Description |
|---------|-------------|
| `Precept: New RMS Project` | Create a new Precept project with precept.json and sample requirements |
| `Precept: Reload Configuration` | Reload precept.json and rebuild index |
| `Precept: Open RST Preview` | Live rendered preview of the current RST file |
| `Precept: Build Documentation` | Generate static HTML documentation |
| `Precept: View Documentation` | Open built HTML in browser |
| `Precept: Deep Validation` | Comprehensive validation with detailed reports |
| `Precept: Tag Current Baseline` | Add baseline tags |
| `Precept: Remove Baseline Tags` | Remove baseline |
| `Precept: Generate Release Report` | Create release report |
| `Precept: Create Git Tag for Baseline` | Git tag for baseline |
| `Precept: Refresh Explorer` | Refresh tree view |

### Deep Validation

The **Precept: Deep Validation** command provides comprehensive analysis of your requirements traceability:

**What it checks:**
- **DV-001: Circular Dependencies** - Detects cycles using Tarjan's algorithm, severity by length
- **DV-002: Hierarchical Coverage** - Stakeholder->System, System->Component coverage with thresholds
- **DV-003: Orphaned Requirements** - Categorizes true orphans, dead-ends, and source-only nodes
- **DV-004: Status Consistency** - Validates status propagation (approved->draft violations)
- **DV-005: Hierarchical Completeness** - Verifies complete traceability chains across levels
- **DV-006: Priority-Weighted Coverage** - Coverage targets by priority (critical: 100%, high: 95%, etc.)
- **DV-007: Baseline Stability** - Ensures baselined requirements are approved/implemented
- **DV-010: Gap Analysis** - Actionable recommendations prioritized by severity

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
- Optionally configure a prefix in `precept.json` (e.g., `REQ-0001`)

### Link Types
Link types can be set up in precept.json in the `linkTypes` array. A few link types are included by default.
A new link type is set up by adding an object to `linkTypes`. To demonstrate, here is a link type for linking rationale items to requirements:
```json
{
  "option": "motivates",
  "incoming": "motivated_by",
  "outgoing": "motivates"
}
```

### Folder Structure
RST files can be organized in subdirectories. Use `.. toctree::` to define the document hierarchy. The static HTML builder preserves the folder structure and generates correct cross-file links.

### Status Workflow
1. **draft** -> Initial creation
2. **review** -> Ready for review
3. **approved** -> Reviewed and approved
4. **implemented** -> Implementation complete

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
- Verify `precept.json` exists in a supported location (see Configuration File Location above)
- View Output panel: View -> Output -> "Requirements"

### Autocomplete not working
- Ensure cursor is in link field (`:links:`, `:satisfies:`, etc.)
- Press `Ctrl+Space` to manually trigger
- Check requirements are indexed (status bar)

### Performance issues
- Add build dirs to `requirements.indexing.excludePatterns`
- Increase `requirements.indexing.maxFiles` if needed

## Contributing

We welcome contributions! Here's how to get started:

### Development Setup

```bash
git clone https://github.com/martinpalsson/precept.git
cd precept
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
├── configuration/            # Config loading (precept.json parsing)
├── indexing/                 # RST parsing & indexing
├── providers/                # VS Code language providers
├── views/                    # Item Explorer & Link Explorer
├── commands/                 # Command implementations
├── renderer/                 # RST-to-HTML rendering engine
├── preview/                  # Live preview panel
├── build/                    # Static HTML site builder
├── themes/                   # Selectable theme definitions
├── validation/               # Deep validation analyzers
└── utils/                    # Utility functions
```

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

## Requirements

- VS Code 1.80.0+
- Works on Windows, macOS, Linux
- No external dependencies required

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

- [Report Issues](https://github.com/martinpalsson/precept/issues)
- [Source Code](https://github.com/martinpalsson/precept)
