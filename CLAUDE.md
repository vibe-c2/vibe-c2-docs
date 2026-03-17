# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Repo Is

This is the **documentation site** for the Vibe C2 project — a modular command-and-control platform. It contains only Markdown docs, MkDocs configuration, and a GitHub Actions deployment pipeline. There is no application code here; the Go packages and modules are in separate repositories.

## Build and Serve

```bash
# One-time setup
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Local dev server (http://127.0.0.1:8000)
mkdocs serve

# Production build (used in CI with --strict)
mkdocs build --strict
```

The `--strict` flag is what CI uses — it fails on warnings (broken links, missing references). Always validate locally with `--strict` before pushing.

## Deployment

Pushes to `main` trigger `.github/workflows/deploy-docs.yml`, which builds with Python 3.12 and deploys to GitHub Pages automatically.

## Documentation Structure

All content lives in `docs/`. The navigation hierarchy is defined in `mkdocs.yml` under `nav:` — always update it when adding or renaming pages.

- **Foundations** — Architecture, requirements, core responsibilities, module taxonomy, full-system message flow
- **Channels** — Channel-specific message flow, contracts, obfuscation profiles (YAML reference), per-channel module docs (HTTP, Telegram), and the 15-minute channel authoring guide
- **Go Packages Ecosystem** — Docs for shared Go packages: `vibe-c2-golang-protocol` (message contracts), `vibe-c2-golang-channel-core` (channel runtime SDK)
- **ADR** — Architecture Decision Records

## Key Concepts for Editing Docs

- **Three module types**: Channel Modules (transport), Implant Provider Modules (build artifacts), Translator Modules (format conversion). Channels are plaintext-blind — they relay encrypted blobs only.
- **Message contracts** are versioned (`inbound.agent_message`, `outbound.agent_message`). The canonical fields are `id` and `encrypted_data`.
- **Obfuscation profiles** are YAML-defined transport-shaping configurations that map `id`/`encrypted_data` into channel-specific locations using transform chains. The `custom_mapping` block handles channel-specific grouped data.
- **Transform chains** have explicit ordering: outbound applies transforms top-to-bottom, inbound reverses them bottom-to-top.

## Markdown Extensions

Configured in `mkdocs.yml`: `admonition`, `tables`, `pymdownx.superfences` (with Mermaid diagram support), and `toc` with permalinks. Use fenced code blocks with `mermaid` language for diagrams.
