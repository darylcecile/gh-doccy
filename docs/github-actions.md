---
metadata:
  lastUpdated: 17-Mar-2026
  staleness: 30d
  tags:
    - ci
    - github-actions
---

# Using gh-doccy in GitHub Actions

gh-doccy can be integrated into your CI pipeline to automatically lint documentation on every push or pull request.

## Basic Workflow

Create `.github/workflows/lint-docs.yml` in your repository:

```yaml
name: Lint Docs

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint-docs:
    runs-on: ubuntu-latest
    env:
      GH_TOKEN: ${{ github.token }}
    steps:
      - uses: actions/checkout@v4

      - name: Install gh-doccy
        run: gh extension install darylcecile/gh-doccy

      - name: Lint documentation
        run: gh doccy lint
```

The workflow installs gh-doccy as a GitHub CLI extension (the `gh` CLI is pre-installed on GitHub-hosted runners). The `GH_TOKEN` environment variable is required for `gh` to authenticate.

## CI Behavior

When the `CI` environment variable is set (which GitHub Actions does by default), `gh doccy lint` automatically:

- Defaults to `--level error` (only errors fail the build, warnings are shown but do not cause failure)
- Exits with code 1 if any errors are found

This means staleness violations, broken links, and other checks configured as `error` in `.doccyrc.yaml` will fail the workflow.

## Configuration

Ensure your repository has a `.doccyrc.yaml` at the root. The workflow uses the same config as local development. See the [Configuration](./configuration.md) reference for all options.

### Staleness in CI

The staleness check compares each document's `lastUpdated` frontmatter date against the configured threshold. If a document exceeds the threshold, it reports an issue:

- Set `staleness: error` in `.doccyrc.yaml` to fail CI on stale docs
- Set `staleness: warn` to surface stale docs without blocking merges

Example frontmatter with a 30-day staleness window:

```markdown
---
metadata:
  lastUpdated: 17-Mar-2026
  staleness: 30d
---
```

## Linting Only Changed Files

To lint only files modified in a PR:

```yaml
- name: Lint changed docs
  run: gh doccy lint --unstaged
```

## Custom Glob Patterns

Lint files outside the default `docs/` directory:

```yaml
- name: Lint all markdown
  run: gh doccy lint --glob "**/*.md"
```
