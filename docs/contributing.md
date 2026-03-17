---
metadata:
  lastUpdated: 17-Mar-2026
  staleness: 30d
  tags:
    - contributing
    - development
---

# Contributing to gh-doccy

Thank you for your interest in contributing to gh-doccy! This guide covers everything you need to get started.

## Prerequisites

- [Bun](https://bun.sh) (latest stable version)
- [GitHub CLI](https://cli.github.com/) (for testing as a `gh` extension)
- Git

## Getting Started

1. Fork and clone the repository:

```bash
git clone https://github.com/<your-username>/gh-doccy.git
cd gh-doccy
```

2. Install dependencies:

```bash
bun install
```

3. Verify the setup by running the linter against the docs:

```bash
bun run src/index.ts lint
```

## Project Structure

```
gh-doccy/
├── src/
│   ├── index.ts          # Entry point
│   ├── cli.ts            # CLI command definitions (Commander.js)
│   ├── action/           # Command implementations
│   │   ├── init.ts       # `gh doccy init` — scaffold docs
│   │   ├── lint.ts       # `gh doccy lint` — check docs for issues
│   │   └── review.ts     # `gh doccy review` — interactive fix flow
│   ├── utils/            # Shared utilities
│   │   ├── checks/      # Lint check adapters (spelling, staleness, etc.)
│   │   └── lang/        # Hunspell dictionary files
│   └── __tests__/        # Test files
├── docs/                 # Project documentation (linted by gh-doccy itself)
├── .doccyrc.yaml         # Linter configuration
├── install.sh            # Binary installation script
└── types.d.ts            # Type declarations for dictionary files
```

## Development Workflow

### Running Locally

Run any CLI command directly with Bun:

```bash
bun run src/index.ts lint
bun run src/index.ts lint --glob "docs/**/*.md"
bun run src/index.ts review
```

### Running Tests

```bash
bun test
```

### Building

Compile a standalone binary:

```bash
bun run build
```

This produces `dist/doccy`.

## Making Changes

1. Create a feature branch from `main`:

```bash
git checkout -b my-feature
```

2. Make your changes and ensure:
   - Tests pass (`bun test`)
   - Docs lint cleanly (`bun run src/index.ts lint`)
   - Code follows existing patterns and style

3. Commit with a clear, descriptive message.

4. Open a pull request against `main`.

## Documentation

All documentation lives in `docs/` and is linted by gh-doccy itself in CI. When adding or updating docs:

- Include YAML frontmatter with `lastUpdated` and `staleness` fields (see [Configuration](./configuration.md) for details)
- Use relative links for cross-references between docs
- Run `bun run src/index.ts lint` locally before pushing

## Reporting Issues

Open an issue on [GitHub](https://github.com/darylcecile/gh-doccy/issues) with:

- A clear description of the problem or feature request
- Steps to reproduce (for bugs)
- Expected vs actual behavior
