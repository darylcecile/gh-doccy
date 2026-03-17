---
metadata:
  lastUpdated: 17-Mar-2026
  staleness: 30d
  tags:
    - usage
    - getting-started
---

# Usage Guide

gh-doccy is a GitHub CLI extension for managing and linting markdown documentation. It checks for spelling errors, staleness, missing metadata, and broken links.

## Installation

### As a GitHub CLI Extension

```bash
gh extension install darylcecile/gh-doccy
```

Then run commands as `gh doccy <command>`.

### From a Precompiled Binary

```bash
curl -fsSL https://raw.githubusercontent.com/darylcecile/gh-doccy/main/install.sh | bash
```

This installs the binary to `~/.local/bin`. To install a specific version:

```bash
curl -fsSL https://raw.githubusercontent.com/darylcecile/gh-doccy/main/install.sh | bash -s v0.0.2
```

### From npm

```bash
bunx gh-doccy
```

## Commands

### `gh doccy init`

Scaffold a new documentation structure in the current directory:

```bash
gh doccy init
```

This creates:
- A `docs/` directory with starter markdown files
- A `.doccyrc.yaml` configuration file

Use `--force` to overwrite an existing docs directory:

```bash
gh doccy init --force
```

### `gh doccy lint`

Check documentation for issues:

```bash
gh doccy lint
```

Options:

| Flag | Description |
|------|-------------|
| `-g, --glob <pattern>` | Glob pattern for files to lint (default: `docs/**/*.md`) |
| `-u, --unstaged` | Only lint files with unstaged changes |
| `-l, --level <level>` | Filter severity: `error` or `warn` |

Examples:

```bash
gh doccy lint --glob "**/*.md"
gh doccy lint --unstaged
gh doccy lint --level error
```

In CI environments (when the `CI` variable is set), the level defaults to `error` so the command fails on any errors.

### `gh doccy review`

Interactively review and fix documentation issues:

```bash
gh doccy review
```

Options:

| Flag | Description |
|------|-------------|
| `-g, --glob <pattern>` | Glob pattern for files to review (default: `docs/**/*.md`) |
| `-u, --unstaged` | Only review files with unstaged changes |
| `-y, --yes` | Auto-approve all suggested fixes |

The review command walks through each issue, shows the context, and prompts you to accept or skip the fix.

## Frontmatter

Documentation files support YAML frontmatter for metadata:

```markdown
---
metadata:
  lastUpdated: 17-Mar-2026
  staleness: 30d
  tags:
    - guide
---

# Your Document Title
```

See the [Configuration](./configuration.md) guide for full details on frontmatter and config options.

## Checks

gh-doccy runs the following checks:

| Check | Description |
|-------|-------------|
| **Spelling** | Spell-checks content using Hunspell dictionaries (en_US or en_GB) |
| **Staleness** | Flags documents that have not been updated within the configured threshold |
| **Missing data** | Checks for required frontmatter metadata |
| **Broken links** | Validates internal links between documents |

Each check can be configured to report as `warn` or `error` in `.doccyrc.yaml`. See the [Configuration](./configuration.md) reference.
