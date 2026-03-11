# vibe-c2-http-channel

Repository: `https://github.com/vibe-c2/vibe-c2-http-channel`

## Install

```bash
go get github.com/vibe-c2/vibe-c2-http-channel@v0.4.0
```

## Purpose

- first production-ready channel module for Vibe C2 (`v0.4.0`)
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

## Profile Mapping Examples

### Body mapping

```yaml
mapping:
  profile_id: body:profile_id
  id: body:id
  encrypted_data: body:encrypted_data
```

### Header mapping

```yaml
mapping:
  id: header:X-Agent-ID
  encrypted_data: header:X-Payload
```

### Query mapping

```yaml
mapping:
  id: query:agent
  encrypted_data: query:data
```

### Cookie mapping

```yaml
mapping:
  id: cookie:agent_id
  encrypted_data: cookie:payload
```

## Integration Testing

`vibe-c2-http-channel` includes integration tests with an embedded `test-c2-core` simulator for `/api/channel/sync`.

Covered scenarios (driven by real profile examples in `examples/profiles/*.yaml`):

- `body` mapping
- `header` mapping
- `query` mapping
- `cookie` mapping
- hint-routed profile selection
- transform pipeline (`base64` decode inbound + encode outbound)
- ambiguous profile-set rejection at parse/validation stage

Run:

```bash
go test ./...
```

## Notes

- This channel is intentionally barrier-free for implant->channel communication.
- Security boundaries are expected at transport/infrastructure layers outside this module.
