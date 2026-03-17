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
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2

      - name: Install gh-doccy
        run: |
          curl -fsSL https://raw.githubusercontent.com/darylcecile/gh-doccy/main/install.sh | bash
          echo "$HOME/.local/bin" >> $GITHUB_PATH

      - name: Lint documentation
        run: gh-doccy lint
```

## Using the Install Script

The `install.sh` script auto-detects the runner's OS and architecture, then downloads the correct binary from GitHub Releases:

```bash
curl -fsSL https://raw.githubusercontent.com/darylcecile/gh-doccy/main/install.sh | bash
```

Pin a specific version:

```bash
curl -fsSL https://raw.githubusercontent.com/darylcecile/gh-doccy/main/install.sh | bash -s v0.0.2
```

The binary is installed to `~/.local/bin/gh-doccy`. Add it to `$GITHUB_PATH` so subsequent steps can use it:

```bash
echo "$HOME/.local/bin" >> $GITHUB_PATH
```

## Using with Bun Directly

If your project already uses Bun, you can skip the binary install and run from source:

```yaml
- uses: oven-sh/setup-bun@v2

- name: Install dependencies
  run: bun install --frozen-lockfile

- name: Lint documentation
  run: bun run src/index.ts lint
```

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
  run: gh-doccy lint --unstaged
```

## Custom Glob Patterns

Lint files outside the default `docs/` directory:

```yaml
- name: Lint all markdown
  run: gh-doccy lint --glob "**/*.md"
```
