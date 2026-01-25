# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Rigr (pronounced "rigger") is the lightest tool to rig a project for success. It's a VS Code extension providing a minimalistic requirements management system for RST (reStructuredText) files. It provides IntelliSense, validation, and navigation for requirement documentation.

## Build & Development Commands

```bash
npm run compile          # One-time TypeScript compilation
npm run watch            # Watch mode for development
npm run lint             # Run ESLint
npm run lint -- --fix    # Auto-fix linting issues
npm run test:unit        # Run Jest unit tests
npm run test:unit -- --coverage  # With coverage report (80% threshold)
npm run test             # Full integration tests (requires VS Code)
```

**Debug**: Press F5 in VS Code to launch Extension Development Host (uses `.vscode/launch.json`).

## Architecture

```
src/
├── extension.ts              # Entry point - activation, provider registration
├── types.ts                  # Core interfaces (ObjectType, RequirementObject, etc.)
├── configuration/            # Config loading from Sphinx conf.py + defaults
├── indexing/                 # RST parsing and in-memory index
├── providers/                # VS Code language providers (completion, hover, definition, etc.)
├── views/                    # UI (Requirements Explorer tree view)
├── commands/                 # Command implementations (validation, baseline, reports)
└── utils/                    # ID generation, graph analysis
```

### Key Patterns

**Dependency Injection**: All providers receive `IndexBuilder` and `RigrConfig` via constructor, with `updateConfig()` method for config changes.

**Index Architecture**: `IndexBuilder` maintains multiple maps:
- `objects`: Map<id, RequirementObject> - primary lookup
- `fileIndex`, `typeIndex`, `statusIndex`: secondary indexes
- `linkGraph`: dependency tracking for traceability

**Configuration Layer**: Three-tier priority: Sphinx conf.py → defaults → VS Code settings. ConfigLoader parses Python conf.py via subprocess.

**Validation**: Automatic (on save, lightweight) vs Deep (command-triggered, circular deps, coverage analysis).

## Coding Standards

- TypeScript strict mode enabled
- Prefer `interface` over `type` for object shapes
- Explicit return types on public functions
- Avoid `any` - use `unknown` with type guards
- JSDoc comments for public APIs
- Conventional Commits for commit messages

## Adding New Features

**New Provider**: Create class in `src/providers/` implementing VS Code interface, register in `extension.ts`, add export to `providers/index.ts`.

**New Command**: Declare in `package.json` contributes.commands, implement in `src/commands/`, register in `extension.ts`.

**New Setting**: Add to `package.json` contributes.configuration, handle in `settingsManager.ts`.
