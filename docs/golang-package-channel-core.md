# vibe-c2-golang-channel-core

Repository: `https://github.com/vibe-c2/vibe-c2-golang-channel-core`

## Install

```bash
go get github.com/vibe-c2/vibe-c2-golang-channel-core@v0.2.0
```

## Purpose

- reusable channel runtime SDK for module authors
- transport envelope abstraction (`id` + `encrypted_data` handling)
- profile model/parsing/validation primitives
- sync client to C2 endpoint (`POST /api/channel/sync`)
- management RPC scaffolding for profile operations

## Current Status

- released version: `v0.2.0`
- integrated into first module: `vibe-c2-http-channel`
