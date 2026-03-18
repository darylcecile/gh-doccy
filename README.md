# gh-doccy

A GitHub CLI extension for managing and linting markdown documentation in git repositories. It checks for spelling errors, staleness, missing metadata, and broken links.

## Installation

### As a GitHub CLI extension

```bash
gh extension install darylcecile/gh-doccy
```

### From a precompiled binary

```bash
curl -fsSL https://raw.githubusercontent.com/darylcecile/gh-doccy/main/install.sh | bash
```

This installs the binary to `~/.local/bin`. You can pass a specific version:

```bash
curl -fsSL https://raw.githubusercontent.com/darylcecile/gh-doccy/main/install.sh | bash -s v0.0.2
```

### From npm

```bash
bunx gh-doccy
```

## Usage

### Initialize documentation

Scaffold a new documentation structure in the current directory:

```bash
gh doccy init
gh doccy init --force  # overwrite existing docs directory
```

### Lint documentation

Check documentation for spelling errors, staleness, missing metadata, and broken links:

```bash
gh doccy lint
gh doccy lint --glob "docs/**/*.md"
gh doccy lint --unstaged          # only lint files with unstaged changes
gh doccy lint --level error       # only show errors, hide warnings
```

### Review documentation

Interactively review and fix documentation issues:

```bash
gh doccy review
gh doccy review --glob "docs/**/*.md"
gh doccy review --unstaged        # only review files with unstaged changes
gh doccy review --yes             # auto-approve all changes
```

## Configuration

Create a `.doccyrc.yaml` (or `.doccyrc.json`) in your project root:

```yaml
skipTypes:
  - code
  - inlineCode
  - html
dictionaryLang: en_US          # en_US or en_GB
dictionary:                    # words the spellchecker should ignore
  - doccy
  - kubernetes
root: docs                     # folder to scan for markdown files
dateFormat: DD-MMM-YYYY
defaultStalenessThreshold: 30d
strictness:
  spelling: warn
  staleness: error
  missingData: warn
  brokenLinks: error
```

| Key | Type | Default | Description |
|---|---|---|---|
| `skipTypes` | `string[]` | `["code", "inlineCode", "html"]` | AST node types to skip during spell-checking |
| `dictionaryLang` | `"en_US" \| "en_GB"` | `"en_US"` | Language dictionary for spell-checking |
| `dictionary` | `string[]` | `[]` | Custom words the spellchecker should ignore |
| `root` | `string` | `"docs"` | Root folder to scan for markdown files |
| `dateFormat` | `string` | `"DD-MMM-YYYY"` | Expected date format in frontmatter |
| `defaultStalenessThreshold` | `string` | `"30d"` | Default staleness threshold (e.g. `12hr`, `30d`, `4w`) |
| `strictness` | `object` | See below | Severity levels for each check type |

### Frontmatter

Documentation files support YAML frontmatter for metadata:

```markdown
---
metadata:
  lastUpdated: 2024-06-20
  staleness: 30d
---
# Your Document Title
```

## Checks

| Check | Description |
|---|---|
| **Spelling** | Spell-checks content using Hunspell dictionaries (en_US/en_GB) |
| **Staleness** | Flags documents that haven't been updated within the configured threshold |
| **Missing data** | Checks for required frontmatter metadata |
| **Broken links** | Validates internal links between documents |

## Development

Requires [Bun](https://bun.sh).

```bash
bun install
bun run src/index.ts lint
bun test
```

### Building

```bash
bun run build
```

Produces a standalone compiled binary at `dist/doccy`.

## License

[MIT](LICENSE)
