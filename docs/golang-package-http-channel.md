# vibe-c2-http-channel

Repository: `https://github.com/vibe-c2/vibe-c2-http-channel`

## Install

```bash
go get github.com/vibe-c2/vibe-c2-http-channel@v0.5.0
```

## Purpose

- first production-ready HTTP channel module for Vibe C2
- reads runtime config from env vars (with `.env` fallback)
- loads obfuscation profiles from a watched folder
- resolves obfuscation profile (`hint` -> brute-force enabled profiles)
- supports object-based transform chains

## Runtime configuration

Environment variables:

- `CHANNEL_ID` (default: `http-main`)
- `LISTEN_ADDR` (default: `:8080`)
- `C2_SYNC_BASE_URL` (default: `http://localhost:9000`)
- `PROFILES_DIR` (default: `profiles`)

Run with `.env` fallback file path:

```bash
go run ./cmd/http-channel --config .env
```

## Profiles directory behavior

On startup:

- creates `PROFILES_DIR` if missing
- ensures `default.yaml` exists
- if missing, copies from `examples/profiles/default.yaml`

At runtime:

- watches `PROFILES_DIR` continuously
- newly created profile files are loaded instantly
- updated profile files are reloaded instantly
- deleted profile files are unloaded instantly

## Default profile behavior

Default profile (`default.yaml`) maps `id` and `encrypted_data` to body fields with base64 transform.

## Integration testing

`vibe-c2-http-channel` includes integration tests with an embedded `test-c2-core` simulator for `/api/channel/sync`.

Covered scenarios (example-driven from `examples/profiles/*.yaml`):

- `body` mapping
- `header` mapping
- `query` mapping
- `cookie` mapping
- hint-routed profile selection
- transform pipeline (`base64` decode inbound + encode outbound)
- ambiguous profile-set rejection
- default profile (body-mapped `id` + `encrypted_data`)

Run:

```bash
go test ./...
```

## Notes

- This channel is intentionally barrier-free for implant -> channel communication.
- Security boundaries are expected at transport/infrastructure layers outside this module.
