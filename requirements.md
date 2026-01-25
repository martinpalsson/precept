# Rigr - VS Code Extension for Requirements Management

## Project Overview
Rigr (pronounced "rigger") is the lightest tool to rig a project for success. It's a VS Code extension providing a minimalistic requirements management system with intelligent editing support for requirements documentation in RST format. Rigr supports configurable requirement object types, intelligent linking, validation, and release baseline management for automotive/embedded systems requirements engineering.

## Use Cases

### UC1: Quick Object Creation with Smart Completion

**Actor:** Requirements engineer writing documentation

**Precondition:** User is editing an RST file in VS Code with the extension active

**Main Flow:**
1. User positions cursor at the start of a new line (or with only whitespace before cursor)
2. User types `..` (two dots)
3. Extension triggers intelligent completion menu showing available object type options
4. User sees completion items like:
   - "New Requirement" 
   - "New Rationale"
   - "New Information"
   - "New Parameter"
5. User selects desired type (via keyboard arrows or mouse)
6. Extension inserts complete snippet with:
   - Correct `.. item::` directive
   - Auto-generated unique ID (e.g., `0001`)
   - Pre-filled `:type:` field matching selection
   - Pre-filled `:level:` field (defaulting to specification's level or user choice)
   - Placeholder fields for `:status:` and other common fields
   - Cursor positioned at first editable field (title)
7. User fills in title and presses Tab
8. Cursor moves to next field (type dropdown)
9. User tabs through remaining fields (status, links, description)
10. User presses Tab/Esc to exit snippet mode

**Postcondition:** A new, valid requirement object is created with minimal keystrokes

**Technical Implementation:**
- Use VS Code CompletionItemProvider triggered on `..` pattern
- Generate CompletionItem with SnippetString for each configured object type
- Use `${}` placeholders and `${n|choice1,choice2|}` for dropdowns
- Auto-increment ID based on existing objects in workspace (project-global unique IDs)

**Similar to:** Emmet in HTML/CSS, snippet expansion in VS Code

### UC2: Project creation
**Actor:** Requirements engineer writing documentation

**Precondition:** User is editing an RST file in VS Code with the extension active

**Main Flow:**
1. User trypes ctrl + shift + p to open the menu
2. User types `rigr new rms` or similar
3. Extension prompts the user if he wants to create a new rigr rms
4. User may depress `no` or `cancel` if it was a mistake
5. When user answer `yes` the Extension will create a new rigr rms

**Postcondition:** A new rgr rms project is created

---

## 1. Configuration System

### 1.1 Primary Configuration Source: Sphinx conf.py
The extension SHALL read its primary configuration from the Sphinx `conf.py` file to ensure single source of truth.

**Required parsing capabilities:**
- Locate `docs/conf.py` or `conf.py` in workspace root
- Parse Python configuration using one of:
  - Execute Python script to extract config as JSON: `python -c "import sys; sys.path.insert(0, 'docs'); import conf; import json; print(json.dumps({'rigr_object_types': conf.rigr_object_types, ...}))"`
  - Use Python AST parser library if pure TypeScript solution needed
- Extract relevant configuration objects (see below)

**Rigr configuration to extract:**
```python
# Example conf.py structure to parse

# Object types define the customizable classification of requirement objects
rigr_object_types = [
    {
        "type": "requirement",       # Object type value
        "title": "Requirement",      # Display name
        "color": "#BFD8D2",          # Color for visualization
        "style": "node"              # Display style
    },
    {
        "type": "rationale",
        "title": "Rationale",
        "color": "#FEDCD2",
        "style": "node"
    },
    {
        "type": "information",
        "title": "Information",
        "color": "#DF744A",
        "style": "node"
    },
    {
        "type": "parameter",
        "title": "Parameter",
        "color": "#AEDFF7",
        "style": "node"
    },
    {
        "type": "design_element",
        "title": "Design Element",
        "color": "#C8A2C8",
        "style": "node"
    },
    # User can define unlimited custom object types
]

# Levels define the abstraction tiers in the requirements hierarchy
# The level is stored as an attribute on each item, NOT encoded in the ID
rigr_levels = [
    {"level": "stakeholder", "title": "Stakeholder Requirements"},
    {"level": "system", "title": "System Requirements"},
    {"level": "component", "title": "Component Requirements"},
    {"level": "software", "title": "Software Requirements"},
    {"level": "hardware", "title": "Hardware Requirements"},
    # User can define custom levels for their project structure
]

rigr_link_types = [
    {
        "option": "satisfies",       # Forward link name
        "incoming": "satisfied_by",  # Reverse link name
        "outgoing": "satisfies",
        "style": "#black"
    },
    {
        "option": "implements",
        "incoming": "implemented_by",
        "outgoing": "implements"
    },
    {
        "option": "derives_from",
        "incoming": "derives_to",
        "outgoing": "derives_from"
    },
    # User-defined relationship types
]

rigr_statuses = [
    {"status": "draft", "color": "#yellow"},
    {"status": "review", "color": "#orange"},
    {"status": "approved", "color": "#green"},
    {"status": "implemented", "color": "#blue"},
    # User-defined statuses
]

# ID configuration - IDs are semantically neutral and project-unique
rigr_id_config = {
    "prefix": "REQ",           # Optional prefix for all IDs (e.g., 0001)
    "separator": "-",          # Separator between prefix and number
    "padding": 4,              # Number of digits (e.g., 0001)
    "start": 1,                # Starting number for auto-increment
}

# Melexis.trace configuration (if present)
traceability_item_id_regex = r'[A-Z]+-[0-9]+'
traceability_relationships = {
    'fulfills': 'fulfilled_by',
    'depends_on': 'impacts',
}
```

**Configuration loading behavior:**
- Load on extension activation
- Reload when `conf.py` is saved
- Show notification if config parsing fails
- Fall back to default configuration if parsing fails

### 1.2 Default Configuration
If no `conf.py` found or parsing fails, use minimal defaults:
```typescript
const DEFAULT_CONFIG = {
  rigr_object_types: [
    { type: "requirement", title: "Requirement" },
    { type: "information", title: "Information" },
  ],
  rigr_levels: [
    { level: "stakeholder", title: "Stakeholder Requirements" },
    { level: "system", title: "System Requirements" },
    { level: "component", title: "Component Requirements" },
  ],
  rigr_link_types: [
    { option: "links", incoming: "links", outgoing: "links" }
  ],
  rigr_statuses: [
    { status: "draft" },
    { status: "approved" },
  ],
  rigr_id_config: {
    prefix: "REQ",
    separator: "-",
    padding: 4,
    start: 1,
  },
  id_regex: /[A-Z]+-[0-9]+/g  // e.g., 0001, 0042
};
```

### 1.3 Extension-Specific Settings (VS Code settings.json)
User-configurable extension behavior via VS Code settings:
```json
{
  // Validation behavior
  "requirements.validation.automatic": true,
  "requirements.validation.onSave": true,
  "requirements.validation.debounceMs": 500,
  "requirements.validation.checkCircularDeps": false,
  "requirements.validation.checkCoverage": false,
  
  // UI preferences
  "requirements.treeView.groupBy": "type",  // "type" | "file" | "status" | "level"
  "requirements.treeView.showStatusIcons": true,
  
  // Performance
  "requirements.indexing.maxFiles": 1000,
  "requirements.indexing.excludePatterns": ["**/build/**", "**/_build/**"],
  
  // Advanced: Override conf.py (not recommended)
  "requirements.config.overrideSphinxConfig": false,
  "requirements.config.customTypes": [],
}
```

### 1.4 Configuration Refresh
**Commands:**
- "Rigr: Reload Configuration" - Manual reload
- Automatic reload on `conf.py` save

**Status bar indicator:**
- Show "Rigr: Ready (42 objects)" when config loaded
- Show "Rigr: Config Error" if parsing failed (clickable to see error)

## 2. Requirement Object Model

### 2.1 Dynamic Object Type System
The extension SHALL support project-unique IDs and customizable object types as defined in `conf.py`.

**Key design principles:**
- **Unique IDs:** Each object has a globally unique ID within the project (e.g., `0001`, `0042`). IDs are semantically neutral and do not encode level or type information.
- **Object types:** The type of object (requirement, rationale, information, parameter, design_element, etc.) is stored as a `:type:` attribute.
- **Levels:** The abstraction tier (stakeholder, system, component, software, hardware, etc.) is stored as a `:level:` attribute, independent of the ID.
- **Specification context:** The specification an item belongs to is determined by which .rst file it resides in.
- **Customizable:** Projects define their own object types and levels in configuration.

**Core object structure (parsed from RST):**
```typescript
interface RequirementObject {
  id: string;              // Project-unique ID, e.g., "0001", "0042"
  type: string;            // Object type from rigr_object_types (e.g., "requirement", "rationale", "design_element")
  level: string;           // Abstraction level from rigr_levels (e.g., "stakeholder", "system", "component")
  title: string;           // Object title
  description: string;     // Full description text
  status?: string;         // From rigr_statuses
  links: {                 // Dynamic link types from rigr_link_types
    [linkType: string]: string[];  // e.g., satisfies: ["0005", "0007"]
  };
  metadata: {              // All other fields
    [key: string]: string;
  };
  location: {              // File location
    file: string;
    line: number;
  };
  baseline?: string;       // Release baseline tag (e.g., "v1.0.0")
}
```

### 2.2 RST Parsing
**Directive format to parse:**
```rst
.. item:: System shall monitor ethernet traffic
   :id: 0001
   :type: requirement
   :level: system
   :status: approved
   :satisfies: 0005, 0007
   :implemented_by: 0042
   :baseline: v1.0.0
   
   Detailed description of the requirement goes here.
   Can be multiple paragraphs.

.. item:: Justification for 0001
   :id: 0002
   :type: rationale
   :level: system
   :links: 0001
   
   Explanation of why this requirement exists.

.. item:: Additional context
   :id: 0003
   :type: information
   :level: system
   :links: 0001
   
   Supporting information.

.. item:: Maximum response time
   :id: 0004
   :type: parameter
   :level: system
   :links: 0001
   
   Response time shall not exceed 100ms.

.. item:: Ethernet subsystem architecture
   :id: 0005
   :type: design_element
   :level: component
   :derives_from: 0001
   
   This design element describes the ethernet subsystem.
```

**Parser requirements:**
- Parse `.. item::` directive (single directive type)
- Extract all fields (id, type, level, status, title, description, all link types)
- Validate that `:type:` field value is in `rigr_object_types`
- Validate that `:level:` field value is in `rigr_levels`
- Handle multi-line descriptions
- Parse inline links: `:item:`0001``
- Robust error handling for malformed RST
- Ensure IDs are project-unique (no duplicate IDs regardless of type or level)

### 2.3 Index Structure
```typescript
interface RequirementIndex {
  objects: Map<string, RequirementObject>;  // id -> object
  fileIndex: Map<string, Set<string>>;      // file -> set of IDs
  typeIndex: Map<string, Set<string>>;      // type -> set of IDs
  levelIndex: Map<string, Set<string>>;     // level -> set of IDs
  statusIndex: Map<string, Set<string>>;    // status -> set of IDs
  linkGraph: Map<string, Set<string>>;      // id -> set of linked IDs (all directions)
  baselines: Map<string, Set<string>>;      // baseline -> set of IDs
}
```

## 3. Core Features

### 3.1 IntelliSense & Autocomplete

**Trigger contexts:**
1. Link field completion:
```rst
.. item:: Example
   :id: 0001
   :type: requirement
   :level: system
   :satisfies: |  <-- trigger autocomplete here
```

2. Inline link completion:
```rst
This requirement :item:`|`  <-- trigger here
```

**Autocomplete behavior:**
- Show all valid requirement IDs from index
- Filter by typing (fuzzy match)
- Display format: `0001 - System shall monitor ethernet traffic [requirement] [system] [approved]`
- Context-aware filtering (optional): show type and level in display to help users distinguish objects
- Sort by: relevance, then alphabetically

**Implementation:**
- Register `CompletionItemProvider` for `.rst` files
- Detect trigger position (after `:links:`, `:satisfies:`, etc.)
- Query index for matching IDs
- Return `CompletionItem[]` with documentation preview

### 3.2 Hover Information

**Hover over requirement ID shows:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
0001 - Requirement
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Type: requirement
Level: system
Status: approved
Baseline: v1.0.0

System shall monitor ethernet traffic

This requirement specifies that the system
must be capable of capturing...

Links:
  satisfies: 0005, 0007
  implemented_by: 0042

📄 defined in: requirements/system.rst:42
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Implementation:**
- Register `HoverProvider` for `.rst` files
- Detect ID under cursor using regex from config
- Look up in index
- Format as Markdown with links

### 3.3 Go-to-Definition & Navigation

**Features:**
- `F12` / `Ctrl+Click`: Jump to requirement definition
- `Alt+F12`: Peek definition inline
- `Shift+F12`: Find all references (where this ID is mentioned)

**Implementation:**
- Register `DefinitionProvider`
- Register `ReferenceProvider`
- Query index for location
- Return `Location` or `Location[]`

### 3.4 Code Snippets

**Built-in snippets (configured dynamically from `rigr_object_types` and `rigr_levels`):**

For each object type in `rigr_object_types`, generate snippets:
```
Prefix: item-<type>
Example: item-requirement, item-rationale, item-information, item-design
```

**Snippet template:**
```rst
.. item:: ${1:Title}
   :id: ${2:0001}
   :type: ${3|requirement,rationale,information,parameter,design_element|}
   :level: ${4|stakeholder,system,component,software,hardware|}
   :status: ${5|draft,review,approved,implemented|}
   ${6::links: }
   
   ${0:Description}
```

**Auto-increment ID:**
- Analyze existing IDs in the project
- Suggest next available number
- Format with leading zeros to match configured pattern (0001, 0002, etc.)
- IDs are project-unique, independent of object type or level

**Custom snippets:**
- Allow user to define in VS Code snippets settings
- Load from `.vscode/requirements.code-snippets` if present

### 3.5 Requirements Tree View

**Tree view sidebar:**
```
REQUIREMENTS EXPLORER
├─ 📋 By Type
│  ├─ Requirements (42)
│  │  ├─ ✅ 0001 - System shall monitor... [system] [approved]
│  │  ├─ 📝 0002 - System shall log... [system] [draft]
│  │  └─ ...
│  ├─ Design Elements (15)
│  │  ├─ 0042 - Hardware architecture [component]
│  │  └─ ...
│  ├─ 💡 Rationales (8)
│  ├─ ℹ️  Information (12)
│  └─ 🔢 Parameters (5)
├─ 🏛️ By Level
│  ├─ Stakeholder (20)
│  ├─ System (35)
│  ├─ Component (18)
│  ├─ Software (12)
│  └─ Hardware (7)
└─ 🔍 Orphaned (3)
   ├─ 0099 - No links
   └─ ...
```

**Features:**
- Group by: Type (default), Level, File, Status, Baseline
- Status icons: ✅ approved, 📝 draft, 🔄 review, 🎯 implemented
- Click to navigate to definition
- Context menu: "Show Dependencies", "Find References", "Add Baseline Tag"
- Search/filter bar at top
- Refresh button
- Collapse/expand all
- Show object type and level in tree (e.g., "[requirement] [system]")

**Implementation:**
- Register `TreeDataProvider`
- Subscribe to index updates
- Provide tree items from index groupings

## 4. Validation & Diagnostics

### 4.1 Validation Strategy: Hybrid Automatic + On-Command

**Automatic validation (lightweight checks):**
- **Trigger:** On file save (debounced 500ms)
- **Checks:**
  - Broken links (linked ID doesn't exist)
  - Duplicate IDs (same ID defined multiple times - IDs must be project-unique)
  - Basic syntax errors (malformed directives)
  - Status value validation (status not in `rigr_statuses`)
  - Type field validation (type value not in `rigr_object_types`)
  - Level field validation (level value not in `rigr_levels`)
  - Missing required fields (id, type, level must be present)

**On-command validation (expensive checks):**
- **Command:** "Rigr: Deep Validation"
- **Purpose:** Comprehensive analysis for release readiness and traceability verification
- **Execution:** On-demand only (not automatic) due to computational cost
- **Output:** HTML report with interactive visualizations

#### 4.1.1 Deep Validation Analysis Requirements

**DV-001: Circular Dependency Detection**
- SHALL detect all cycles in the requirements dependency graph
- SHALL identify minimal cycles (shortest path forming the cycle)
- SHALL report cycle path: `0001 → 0003 → 0005 → 0001`
- SHALL flag cycles by severity:
  - ERROR: Direct circular dependency (A → B → A)
  - WARNING: Longer cycles (A → B → C → A)
- SHALL provide "Break cycle at link" quick fix

**DV-002: Traceability Chain Coverage Analysis**
- SHALL calculate hierarchical coverage by level and link type:
  - Forward coverage: % of upper-level requirements with downstream implementation
  - Backward coverage: % of lower-level items with upstream justification
- SHALL compute coverage for each configured link type and level transition:
  - `satisfies`: stakeholder → system coverage (% of stakeholder items with system implementation)
  - `implements`: system → component coverage (% of system items with component specification)
  - `tests`: component → test coverage (% of component items with test verification)
- SHALL report coverage as:
  ```
  Traceability Coverage:
  - stakeholder → system (satisfies):    42/45 (93%)  ✓ Good
  - system → component (implements):     35/42 (83%)  ⚠ Needs improvement  
  - component → test (tests):            28/35 (80%)  ⚠ Needs improvement
  ```
- SHALL identify specific gaps: "0003, 0012, 0027 (stakeholder) have no system implementation"
- SHALL support configurable thresholds:
  - `requirements.validation.coverage.good`: >= 90%
  - `requirements.validation.coverage.warning`: >= 70%
  - `requirements.validation.coverage.error`: < 70%

**DV-003: Orphaned Requirements Detection**
- SHALL identify requirements with no incoming OR outgoing links
- SHALL categorize orphans by severity:
  - ERROR: Critical requirements (priority: high/critical) with no links
  - WARNING: Medium priority orphaned requirements
  - INFO: Low priority or draft orphaned requirements
- SHALL distinguish between:
  - True orphans: No links at all
  - Dead-end requirements: Has incoming but no outgoing (leaf nodes - may be valid)
  - Source requirements: Has outgoing but no incoming (root nodes - may be valid)
- SHALL provide "Add link to..." quick fix with suggestions based on:
  - Same level (level matching)
  - Similar titles (fuzzy text matching)
  - Same file proximity

**DV-004: Status Consistency Analysis**
- SHALL detect status mismatches across traceability chains:
  - ERROR: Approved requirement depends on draft requirement
  - WARNING: Implemented requirement depends on review-status requirement
  - WARNING: Baselined requirement links to non-baselined requirement
- SHALL validate status transitions:
  - draft → review → approved → implemented (forward only)
  - ERROR: approved → draft regression without justification
- SHALL report inconsistency chains:
  ```
  Status Inconsistency Chain:
  0001 (approved) → 0005 (draft) → 0012 (approved)
                        ↑ Problem here
  ```
- SHALL provide bulk "Update downstream statuses" action

**DV-005: Hierarchical Completeness Verification**
- SHALL verify complete traceability chains for each top-level requirement:
  - For each stakeholder item: stakeholder → system → component → test chain must exist
  - Report: "0001 complete chain (4 levels), 0002 broken at system level"
- SHALL identify missing levels in hierarchy:
  - Gap detection: 0001 (stakeholder) → 0005 (component) (missing system intermediary)
  - Report: "Direct jump from stakeholder to component - missing system requirement"
- SHALL validate bidirectional traceability:
  - Forward: stakeholder `satisfies` → system
  - Backward: system `satisfied_by` → stakeholder
  - ERROR if forward exists but backward missing

**DV-006: Coverage by Priority Analysis**
- SHALL calculate coverage weighted by priority:
  - Critical priority coverage: 100% required
  - High priority coverage: ≥ 95% target
  - Medium priority coverage: ≥ 85% target
  - Low priority coverage: ≥ 70% target
- SHALL report: 
  ```
  Priority-Weighted Coverage:
  - Critical: 45/45 (100%)  ✓
  - High:     38/40 (95%)   ✓
  - Medium:   22/30 (73%)   ⚠
  - Low:      8/15  (53%)   ℹ
  ```
- SHALL flag high-priority requirements with no implementation as BLOCKER

**DV-007: Baseline Stability Analysis**
- SHALL verify baseline consistency:
  - All baselined requirements must have stable status (approved/implemented)
  - ERROR: Baselined requirement in draft or review status
- SHALL detect baseline leakage:
  - Baselined requirement links to non-baselined requirement
  - WARNING: "0001 (v1.0.0) depends on 0005 (no baseline)"
- SHALL validate baseline versions:
  - All requirements in same baseline should have same version tag
  - Report version conflicts within baseline

**DV-008: Traceability Matrix Generation**
- SHALL generate interactive matrix showing:
  - Rows: Source level (stakeholder, system)
  - Columns: Target level (system, component)
  - Cells: Link count, link type, coverage indicator
- SHALL support filtering by:
  - Link type (satisfies, implements, tests)
  - Status (approved, draft, etc.)
  - Priority
  - Baseline version
- SHALL export matrix as:
  - HTML with clickable cells
  - CSV for analysis in Excel
  - Markdown for documentation

**DV-009: Graph Visualization**
- SHALL generate dependency graph showing:
  - Nodes: Requirements colored by type and/or level
  - Edges: Links labeled by link type
  - Visual indicators: status, priority, baseline
- SHALL support layouts:
  - Hierarchical: Top-down tree layout by level
  - Circular: Cycle emphasis
  - Force-directed: General overview
- SHALL allow interactive navigation:
  - Click node → jump to definition
  - Hover edge → show link details
  - Filter by type/level/status/baseline

**DV-010: Gap Analysis Report**
- SHALL identify actionable gaps:
  - Missing implementations: List of stakeholder/system items with no downstream
  - Orphaned implementations: List of component/test items with no upstream
  - Broken chains: List of incomplete traceability paths
- SHALL prioritize gaps by business impact:
  - BLOCKER: Critical requirements not implemented
  - HIGH: High priority with poor coverage
  - MEDIUM: Status inconsistencies
  - LOW: Documentation gaps (orphaned info/rationale)
- SHALL suggest specific actions:
  - "Create system requirement to satisfy 0003 (stakeholder)"
  - "Add test case for 0012 (component)"
  - "Link 0008 to upstream 0002"

**DV-011: Historical Trend Analysis** (Future Enhancement)
- SHALL track coverage metrics over time (Git commits)
- SHALL show trends:
  - Coverage improving/declining
  - New orphaned requirements introduced
  - Cycles added/removed
- SHALL generate burndown chart for release readiness

**DV-012: Compliance Reporting** (Future Enhancement)
- SHALL support regulatory templates:
  - ISO 26262 traceability requirements
  - DO-178C traceability objectives
  - IEC 62304 requirements tracing
- SHALL generate compliance report showing:
  - Required traceability levels met/not met
  - Evidence of verification (test links)
  - Change impact analysis

### 4.2 Diagnostic Types
```typescript
enum DiagnosticType {
  BrokenLink,        // ERROR: Links to non-existent ID
  DuplicateId,       // ERROR: ID defined multiple times (IDs must be project-unique)
  CircularDep,       // WARNING: Circular dependency detected
  OrphanedReq,       // INFO: No links to/from this requirement
  StatusInconsistent,// WARNING: Approved req links to draft
  InvalidStatus,     // ERROR: Status not in allowed list
  InvalidType,       // ERROR: Type field value not in rigr_object_types
  InvalidLevel,      // ERROR: Level field value not in rigr_levels
  MissingType,       // ERROR: Type field missing
  MissingLevel,      // ERROR: Level field missing
  MissingId,         // ERROR: ID field missing
  MissingCoverage,   // INFO: No downstream requirements
}
```

**Diagnostic display:**
- Inline: Red/yellow squiggly underlines
- Problems panel: Categorized by file
- Hover: Show diagnostic message with fix suggestions

### 4.3 Quick Fixes

**Provide CodeActions for:**
- Broken link → "Create requirement 0042"
- Broken link → "Remove link"
- Duplicate ID → "Rename to 0043"
- Orphaned req → "Add link to..."
- Invalid status → "Change to approved/draft/..."
- Invalid type → "Change to requirement/rationale/information/..."
- Invalid level → "Change to stakeholder/system/component/..."
- Missing type → "Add type field"
- Missing level → "Add level field"

### 4.4 Validation Configuration

Control validation behavior via settings:
```json
{
  "requirements.validation.automatic": true,
  "requirements.validation.onSave": true,
  "requirements.validation.debounceMs": 500,
  "requirements.validation.errors": {
    "brokenLinks": "error",
    "duplicateIds": "error",
    "circularDeps": "warning",
    "orphanedReqs": "info",
    "statusInconsistent": "warning",
    "invalidLevel": "error"
  }
}
```

## 5. Release & Baseline Management

### 5.1 Baseline Tagging

**Purpose:** Tag requirements at specific release points for version control and change tracking.

**Baseline field:**
```rst
.. item:: Example
   :id: 0001
   :type: requirement
   :level: system
   :status: approved
   :baseline: v1.0.0
```

**Commands:**
- "Rigr: Tag Current Baseline"
  - Prompt for baseline name (e.g., "v1.0.0")
  - Add `:baseline: v1.0.0` to all approved/implemented requirements
  - Option to filter by type, level, or file
- "Rigr: Remove Baseline Tags"
  - Remove baseline field from requirements

### 5.2 Baseline Filtering

**Tree view filter:**
- Show only requirements with baseline: `v1.0.0`
- Compare two baselines: show added/modified/removed

**Status bar:**
- Dropdown to select active baseline filter
- Show count: "Baseline v1.0.0 (87 requirements)"

### 5.3 Release Report Generation

**Command:** "Rigr: Generate Release Report"

**Output:** Markdown file with:
```markdown
# Requirements Release Report: v1.0.0
Generated: 2025-01-06

## Summary
- Total requirements: 87
- By status:
  - Approved: 65
  - Implemented: 22
- By type:
  - Requirements: 42
  - Design Elements: 15
  - ...
- By level:
  - Stakeholder: 20
  - System: 35
  - Component: 18
  - ...

## New Requirements (since v0.9.0)
- 0042: System shall support...
- 0043: System shall validate...

## Modified Requirements
- 0001: Status changed: draft → approved
- 0005: Added link to 0023

## Removed Requirements
- 0099: Deprecated and removed

## Traceability Coverage
- stakeholder → system: 95% (40/42)
- system → component: 88% (37/42)
- component → test: 72% (30/42)
```

**Save location:** `docs/releases/release-v1.0.0.md`

### 5.4 Git Integration (Basic)

**Commands:**
- "Rigr: Create Git Tag for Baseline"
  - Create annotated Git tag: `req-v1.0.0`
  - Commit message includes requirement count and summary

**Note:** Full GitHub Release creation via GitHub Actions is out of scope for extension. Extension provides markdown report that can be attached manually or via CI/CD.

## 6. Technical Architecture

### 6.1 Extension Structure
```
requirements-vscode/
├── src/
│   ├── extension.ts              # Entry point, activation
│   ├── configuration/
│   │   ├── configLoader.ts       # Parse conf.py
│   │   └── settingsManager.ts    # VS Code settings
│   ├── indexing/
│   │   ├── rstParser.ts          # Parse RST files
│   │   ├── indexBuilder.ts       # Build requirement index
│   │   └── indexCache.ts         # Persist index to disk
│   ├── providers/
│   │   ├── completionProvider.ts
│   │   ├── hoverProvider.ts
│   │   ├── definitionProvider.ts
│   │   ├── referenceProvider.ts
│   │   └── diagnosticProvider.ts
│   ├── views/
│   │   └── treeViewProvider.ts
│   ├── commands/
│   │   ├── validation.ts
│   │   ├── baseline.ts
│   │   └── reports.ts
│   └── utils/
│       ├── idGenerator.ts        # Auto-increment IDs
│       └── graphAnalysis.ts      # Circular deps, coverage
├── syntaxes/
│   └── rst-requirements.json     # Enhanced syntax highlighting
├── snippets/
│   └── requirements.json         # Dynamic snippets
└── package.json
```

### 6.2 Language Server Protocol (Optional Enhancement)
For larger projects (1000+ requirements), consider implementing as Language Server:
- Separate server process
- Handles indexing and validation
- Reduces extension main thread load

**For v1.0:** Use in-process providers. Defer LSP to v1.1 if performance issues arise.

### 6.3 Performance Considerations

**Indexing:**
- Initial full scan on activation (show progress notification)
- Incremental updates on file save
- Debounce file system events (500ms)
- Cache index to workspace state: `.vscode/requirements-index.json`
- Lazy loading: Only parse files in viewport + one level deep

**Validation:**
- Limit automatic validation to changed files only
- Deep validation only on command
- Async/background thread for expensive operations
- Cancel in-flight operations if new changes detected

**Memory:**
- Soft limit: 1000 files / 10,000 requirements
- If exceeded, prompt user to exclude directories
- Store only essential data in memory (IDs, locations)
- Full descriptions loaded on-demand

## 7. Implementation Phases

### Phase 1: Core Infrastructure (Week 1)
- ✅ Extension scaffold, activation events
- ✅ Configuration loader (conf.py parser)
- ✅ RST parser (basic directive parsing)
- ✅ Index builder and cache

### Phase 2: IntelliSense Features (Week 2)
- ✅ Completion provider (link autocomplete)
- ✅ Hover provider (requirement preview)
- ✅ Definition provider (go-to-definition)
- ✅ Reference provider (find all references)
- ✅ Snippets (dynamic from config)

### Phase 3: Validation (Week 3)
- ✅ Diagnostic provider (broken links, duplicates)
- ✅ Automatic validation on save
- ✅ Deep validation command
- ✅ Quick fixes (CodeActions)

### Phase 4: Tree View & UI (Week 4)
- ✅ Requirements tree view
- ✅ Grouping and filtering (including by level)
- ✅ Status bar integration
- ✅ Configuration UI

### Phase 5: Baseline & Reporting (Week 5)
- ✅ Baseline tagging commands
- ✅ Release report generation
- ✅ Baseline filtering in tree view
- ✅ Basic Git integration

## 8. Testing Requirements

### 8.1 Unit Tests
- Configuration parser (various conf.py formats)
- RST parser (all directive types, malformed input)
- Index builder (incremental updates)
- ID auto-increment logic
- Graph analysis (circular deps detection)
- Level validation

### 8.2 Integration Tests
- Full indexing workflow
- Provider responses (completion, hover, etc.)
- Validation diagnostics accuracy
- Command execution

### 8.3 Test Fixtures
Provide sample project structure:
```
test-fixtures/
├── docs/
│   ├── conf.py                  # Various rigr_object_types and rigr_levels configs
│   ├── requirements/
│   │   ├── stakeholder.rst      # Stakeholder-level items
│   │   ├── system.rst           # System-level items
│   │   └── component.rst        # Component-level items
│   └── design/
│       └── architecture.rst     # Design elements
└── .vscode/
    └── settings.json
```

## 9. Documentation Requirements

### 9.1 README.md
- Installation instructions
- Quick start guide
- Feature overview with screenshots
- Configuration guide
- Keyboard shortcuts reference

### 9.2 CHANGELOG.md
- Version history
- Breaking changes

### 9.3 In-extension Help
- Command palette descriptions
- Hover tooltips on settings
- Link to online documentation

## 10. Deliverables

### Minimum Viable Product (v1.0.0):
- ✅ Configuration loading from conf.py
- ✅ Requirement indexing (all types and levels from config)
- ✅ IntelliSense (autocomplete, hover, go-to-def)
- ✅ Snippets (dynamic from config)
- ✅ Tree view (basic grouping by type and level)
- ✅ Automatic validation (broken links, duplicates, invalid levels)
- ✅ Deep validation command
- ✅ Baseline tagging
- ✅ Release report generation

### Future Enhancements (v1.1+):
- Language Server Protocol implementation
- Traceability matrix visualization
- Full GitHub API integration
- Diff view for requirement changes
- Export to PDF/HTML
- Collaborative features
- Integration with issue trackers

## 11. Success Criteria

The extension is considered successful if:
1. ✅ Correctly parses conf.py with arbitrary `rigr_object_types`, `rigr_levels`, and `rigr_link_types`
2. ✅ Provides autocomplete for requirement IDs with <500ms latency
3. ✅ Detects broken links with 100% accuracy
4. ✅ Handles projects with 1000+ requirements without performance degradation
5. ✅ Reduces time to create new requirement from ~2 minutes (manual) to <30 seconds (snippet + autocomplete)
6. ✅ Zero false positives in validation errors
7. ✅ Successfully generates baseline reports matching actual requirement state

## 12. Non-Functional Requirements

### 12.1 Performance
- Extension activation: <2 seconds
- Initial index build: <5 seconds for 500 requirements
- Incremental index update: <500ms
- Autocomplete response: <300ms
- Validation: <1 second per file

### 12.2 Reliability
- Graceful degradation if conf.py parsing fails
- No data loss on crashes (index persisted)
- Handle malformed RST without crashing

### 12.3 Usability
- Zero configuration required for basic usage (defaults work)
- Progressive disclosure (advanced features opt-in)
- Clear error messages with actionable suggestions

### 12.4 Compatibility
- VS Code version: >=1.80.0
- Python version (for conf.py): >=3.7
- OS: Windows, macOS, Linux
- RST format: Compatible with Sphinx 4.x, 5.x, 6.x, 7.x


### 12.5 Instructions
1. README.md with:
   - Installation instructions (from VSIX and from marketplace)
   - Quick start guide with screenshots/examples
   - Feature overview (what each feature does)
   - Configuration guide (how to set up conf.py, what settings exist)
   - Keyboard shortcuts table
   - Troubleshooting section
   - Example project structure

2. USAGE.md with:
   - Step-by-step workflows
   - How to create requirements
   - How to use autocomplete and navigation
   - How to run validation
   - How to create baselines and reports
   - Best practices

3. CONTRIBUTING.md with:
   - Development setup
   - How to build and test
   - Code structure explanation
   - How to add new features

4. In-code examples in docs/ folder:
   - Example conf.py with comments
   - Example requirements.rst files
   - Sample project structure

Make documentation clear for both end-users and developers.
---

## Implementation Notes for Claude Code

**Preferred technologies:**
- TypeScript for extension code
- Use VS Code Extension API (not LSP for v1.0)
- Python execution for conf.py parsing (via child_process)
- Fallback: AST parser if Python unavailable

**Code organization:**
- Follow VS Code extension best practices
- Use dependency injection for testability
- Separate concerns (parsing, indexing, UI)
- Comprehensive error handling

**Testing:**
- Jest for unit tests
- VS Code extension test runner for integration tests
- Minimum 80% code coverage

**Documentation:**
- JSDoc comments on public APIs
- Inline comments for complex logic
- README with examples

This specification is complete and ready for implementation. Begin with Phase 1 (Core Infrastructure) and proceed sequentially through phases.