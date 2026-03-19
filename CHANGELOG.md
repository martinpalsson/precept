# Changelog

## [0.3.0] - 2026-03-17

### Added
- GPG signing for requirement approval (Closes #19)
  - Sign individual requirements or batch sign by status with `Precept: Sign Requirement` and `Precept: Sign All Requirements`
  - Verify signatures with `Precept: Verify Requirement Signature`
  - Supports local GPG keys and hardware tokens (YubiKey) transparently
  - Stale signature detection: automatic warning when a signed requirement is modified
  - Signature status shown in hover tooltips, Item Explorer tree view, and rendered HTML output
  - Collapsible signature details block in preview and static HTML builds with full hash and signer info
  - New `signing` configuration block in `precept.json` (`enabled`, `gpgPath`, `defaultKeyId`, `requireSignature`)
  - Diagnostic warnings for stale and missing signatures

- Image insertion support
  - `Precept: Insert Image` command: file picker with copy to project and directive generation
  - Clipboard paste: paste an image directly into an RST file, auto-saves and inserts `.. graphic::` with generated ID
  - `:file:` path auto-completion for images in project directories
- Preview panel now restores on VS Code restart
- Local images now render in the live preview

### Fixed
- ID generation no longer picks up digit runs from signed hashes, filenames, or other non-ID content
- Images inside item bodies now scale to fit the content area

### Security
- Fix XSS in validation webview: HTML-escape all user-derived values and add Content Security Policy
- Fix regex injection in code action provider and RST parser: escape dynamic values before RegExp construction
- Harden preview webview CSP: replace `script-src 'unsafe-inline'` with nonce-based policy
- Fix path traversal in toctree builder: validate resolved paths stay within document root
- Fix path traversal in asset copier: skip symlinks and validate destination paths

### Fixed
- Editing lag when project contains multiple PlantUML graphics (#18)
  - Added caching for PlantUML encoding so unchanged diagrams skip the expensive synchronous deflate compression on re-renders
- Auto-generated IDs no longer reuse IDs from unsaved files (#17)
  - ID generation now scans open editor buffers so unsaved items are accounted for

## [0.2.0] - 2026-03-10

### Added
- Hamburger menu for sidebar navigation on narrow screens
- "Open in Browser" button after building documentation
- Configuration migration: automatic detection and inclusion of missing precept.json settings when upgrading

### Fixed
- Preview panel now opens on first click when a project is already active (#16)
- Configuration error handling: status bar turns red with prompt to fix or use defaults

### Changed
- Reworked header concept in rendered output

## [0.1.0] - 2025-02-25

### Added
- IntelliSense with smart autocomplete for requirement IDs and inline references
- Go to Definition, Find References, and Peek Definition
- Real-time validation with broken link, duplicate ID, and status checks
- Quick fixes for common issues
- Item Explorer tree view with grouping by type, level, file, status, or custom fields
- Link Explorer showing incoming/outgoing relationships
- Live RST preview with cursor sync
- Static HTML documentation builder with selectable themes
- Baseline tagging and release report generation
- Deep validation with circular dependency detection and coverage analysis
- Code snippets for common requirement patterns
- Auto-increment ID generation
