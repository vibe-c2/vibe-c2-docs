# Obfuscation Profile YAML Reference

This page is the canonical YAML reference for channel obfuscation profiles.

It is intentionally self-contained and defines the complete YAML structure.

## Rules

- **One YAML file = one profile**.
- Multi-profile arrays/wrappers in one file are not allowed.
- There is **no default profile** behavior.

## Canonical YAML Structure

```yaml
profile_id: http-profile-01
channel_type: http
enabled: true
priority: 100
version: 1

match:
  transport: http
  required_fields:
    - location: header
      key: X-Request-ID
    - location: body
      key: data

mapping:
  profile_id:
    source: profile_id
    target:
      location: query
      key: p
    transform:
      - type: base64url

  id:
    source: id
    target:
      location: header
      key: X-Request-ID
    transform:
      - type: base64url

  encrypted_data:
    source: encrypted_data
    target:
      location: body
      key: data
    transform:
      - type: base64

  noise:
    - location: query
      key: v
      value: "20260310"
```

## Field Reference

Top-level:

- `profile_id` (required)
- `channel_type` (required)
- `enabled` (required)
- `priority` (required)
- `version` (optional)
- `match` (optional but recommended)
- `mapping` (required)

`match`:

- `transport` (optional)
- `required_fields[]` (optional pre-filter checks)
  - `location`: `header` | `query` | `cookie` | `body`
  - `key`: field key/name

`mapping`:

- `profile_id` (optional)
  - used to read/write hint
- `id` (required)
- `encrypted_data` (required)

Each mapping entry supports:

- `source`: canonical field name
- `target.location`: `header` | `query` | `cookie` | `body`
- `target.key`: transport key/name
- `transform[]`: ordered transform list
  - supported now: `base64`, `base64url`

Optional:

- `noise[]` static filler fields

## Matching Model

- If `profile_id` hint resolves to one enabled profile, use it.
- Otherwise, brute-force enabled profiles using matching strategy.
- If no profile matches, reject request as unmatched.

## Validation Constraints

For enabled profile sets in same channel scope:

- no overlapping enabled `mapping.profile_id` hint keys
- no overlapping enabled mapping shapes (`mapping.id` + `mapping.encrypted_data`)
- use `match.required_fields` and unique hint design to minimize ambiguity

## Minimal Practical Example

```yaml
profile_id: body-minimal
channel_type: http
enabled: true
priority: 100
mapping:
  id:
    source: id
    target:
      location: body
      key: id
  encrypted_data:
    source: encrypted_data
    target:
      location: body
      key: encrypted_data
```
