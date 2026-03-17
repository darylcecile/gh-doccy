---
metadata:
  lastUpdated: 2024-06-20
  staleness: 2d
---
# Using GitHub CLI Extensions (Demo)

GitHub CLI extensions let you add custom commands to `gh`.  
After installation, extnsiodns run as `gh <extension-name>`.

## Prerequisites

- [GitHub CLI](https://cli.github.com/) installed
- Authenticated session:

```bash
gh auth login
```

Check version:

```bash
gh --version
```

## Discover Extensions

Browse available extensions:

```bash
gh extension search
```

Filter by keyword:

```bash
gh extension search release
```

## Install an Extension

Install from GitHub:

```bash
gh extension install owner/gh-example
```

Install a specific extension (example):

```bash
gh extension install dlvhdr/gh-dash
```

## List Installed Extensions

```bash
gh extension list
```

## Run an Extension

Use the etension name as a `gh` subcommand:

```bash
gh dash
```

If an extension is named `gh-foo`, run it as:

```bash
gh foo
```

## Upgrade Extensions

Upgrade all installed extensions:

```bash
gh extension upgrade --all
```

Upgrade one extension:

```bash
gh extension upgrade owner/gh-example
```

## Remove an Extension

```bash
gh extension remove owner/gh-example
```

## Create Your Own Extension (Quick Start)

Create a new extension scaffold:

```bash
gh extension create gh-my-tool
```

Follow the prompts, then test locally:

```bash
gh my-tool
```

Publish when ready from your repository.

## Troubleshooting

- Command not found: confirm with `gh extension list`.
- Auth issues: rerun `gh auth login`.
- Permission errors: verify repository visibility and access rights.

## Example Workflow

```bash
gh extension search dashboard
gh extension install dlvhdr/gh-dash
gh dash
gh extension upgrade --all
```

That is a complete basic flow: discover, install, run, and maintain extensions.