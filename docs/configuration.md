---
metadata:
  lastUpdated: 17-Mar-2026
  staleness: 30d
  tags:
    - configuration
    - reference
---

# Configuration Reference

gh-doccy is configured via a `.doccyrc.yaml` (or `.doccyrc.json`) file at your project root.

## Full Example

```yaml
skipTypes:
  - code
  - inlineCode
  - html
dictionaryLang: en_US
dateFormat: DD-MMM-YYYY
defaultStalenessThreshold: 30d
strictness:
  spelling: warn
  staleness: error
  missingData: warn
  brokenLinks: error
```

## Options

### `skipTypes`

A list of markdown AST node types to skip during spell-checking. Common values:

| Type | Description |
|------|-------------|
| `code` | Fenced code blocks |
| `inlineCode` | Inline code spans |
| `html` | Raw HTML blocks |

### `dictionaryLang`

The Hunspell dictionary language for spell-checking.

- `en_US` — American English (default)
- `en_GB` — British English

### `dateFormat`

The date format used for parsing `lastUpdated` values in frontmatter.

Default: `DD-MMM-YYYY`

Common formats:
- `DD-MMM-YYYY` — `17-Mar-2026`
- `YYYY-MM-DD` — `2026-03-17`

### `defaultStalenessThreshold`

The default staleness window applied to documents that do not specify their own `staleness` in frontmatter.

Default: `30d`

Accepts duration strings like `7d`, `30d`, `90d`, `1y`.

### `strictness`

Controls the severity level for each check type. Each can be set to `warn` or `error`:

| Check | Description | Default |
|-------|-------------|---------|
| `spelling` | Spell-check violations | `warn` |
| `staleness` | Documents past their staleness threshold | `error` |
| `missingData` | Missing required frontmatter fields | `warn` |
| `brokenLinks` | Internal links that do not resolve | `error` |

When running in CI, only `error`-level issues cause the lint command to exit with a non-zero code.

## Frontmatter Schema

Each markdown document can include YAML frontmatter with a `metadata` block:

```yaml
---
metadata:
  lastUpdated: 17-Mar-2026
  staleness: 30d
  tags:
    - guide
    - reference
---
```

### `metadata.lastUpdated`

**Required** for staleness checks. The date the document was last meaningfully updated. Should be updated whenever the document content changes.

### `metadata.staleness`

**Optional.** Overrides the `defaultStalenessThreshold` from `.doccyrc.yaml` for this specific document.

Accepts duration strings: `7d`, `30d`, `90d`, `1y`.

### `metadata.tags`

**Optional.** A list of tags for categorizing the document. Not currently used by lint checks but useful for organization.

## Generating a Config

Run `gh doccy init` to generate a default `.doccyrc.yaml`:

```bash
gh doccy init
```

This creates the config with sensible defaults alongside a starter `docs/` directory.
