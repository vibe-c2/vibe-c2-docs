# vibe-c2-http-channel

Repository: `https://github.com/vibe-c2/vibe-c2-http-channel`

## Install

```bash
go get github.com/vibe-c2/vibe-c2-http-channel@v0.3.0
```

## Purpose

- first production-ready channel module for Vibe C2
- receives implant/session traffic over HTTP
- resolves obfuscation profile (`hint` -> `fallback`)
- extracts canonical values from configurable locations (`body/header/query/cookie`)
- syncs with core C2 using channel-core runtime

## Quickstart

1. Copy config templates:

```bash
cp configs/channel.example.yaml configs/channel.yaml
cp configs/profiles.example.yaml configs/profiles.yaml
```

2. Run channel:

```bash
CONFIG_FILE=configs/channel.yaml go run ./cmd/http-channel
```

3. Send test sync request:

```bash
curl -sS -X POST http://localhost:8080/sync \
  -H 'Content-Type: application/json' \
  -d '{"profile_id":"default-http","id":"agent-1","encrypted_data":"ZW5jcnlwdGVk"}'
```

## Notes

- This channel is intentionally barrier-free for implant->channel communication.
- Security boundaries are expected at transport/infrastructure layers outside this module.
