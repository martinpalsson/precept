# Changelog

## [0.3.0] - 2026-03-17

### Fixed
- Editing lag when project contains multiple PlantUML graphics (#18)
  - Added caching for PlantUML encoding so unchanged diagrams skip the expensive synchronous deflate compression on re-renders

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
