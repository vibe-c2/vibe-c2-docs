# Obfuscation Profile YAML Reference

This page is the canonical YAML reference for channel obfuscation profiles.

It is intentionally self-contained and defines the complete YAML structure.

## Rules

- **One YAML file = one profile**.
- Multi-profile arrays/wrappers in one file are not allowed.
- There is **no default profile** behavior.

## Canonical YAML Structure

```yaml
profile_id: generic-profile-01
channel_type: <channel-type>
enabled: true
priority: 100
version: 1

match:
  transport: <channel-type>
  required_fields:
    - location: <channel-defined-location>
      key: <field-key>

mapping:
  profile_id:
    source: profile_id
    target:
      location: <channel-defined-location>
      key: <profile-hint-key>
    transform:
      - type: prefix
        value: "p:"
      - type: base64url

  id:
    source: id
    target:
      location: <channel-defined-location>
      key: <id-key>
    transform:
      - type: suffix
        value: "::id"
      - type: base64url

  encrypted_data_in:
    source: encrypted_data
    target:
      location: <channel-defined-location>
      key: <payload-in-key>
    transform:
      - type: base64

  encrypted_data_out:
    source: encrypted_data
    target:
      location: <channel-defined-location>
      key: <payload-out-key>
    transform:
      - type: prefix
        value: "out:"
      - type: base64

  noise:
    - location: <channel-defined-location>
      key: <noise-key>
      value: "<noise-value>"
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
  - `location`: **channel-defined location namespace** (string)
  - `key`: field key/name in that location

`mapping`:

- `profile_id` (optional)
  - used to read/write hint
- `id` (required)
- `encrypted_data_in` (required)
  - inbound encrypted payload mapping (implant -> channel -> c2)
- `encrypted_data_out` (required)
  - outbound encrypted payload mapping (c2 -> channel -> implant)

Each mapping entry supports:

- `source`: canonical field name
- `target.location`: **channel-defined location namespace** (string)
- `target.key`: transport key/name
- `transform[]`: ordered transform object list

Supported transform types (v1):

- `base64`
- `base64url`
- `prefix` (`value` required)
- `suffix` (`value` required)
- `replace` (`from`, `to` required)
- `url_encode` / `url_decode`

## Transformation examples (before/after)

### 1) `base64`

Use case: put binary-like encrypted blobs into transport fields that expect ASCII-safe text.

```yaml
transform:
  - type: base64
```

- before: `cipher_blob`
- after: `Y2lwaGVyX2Jsb2I=`

### 2) `base64url`

Use case: carry payload in URL/query paths without `+` and `/` characters.

```yaml
transform:
  - type: base64url
```

- before: `hello/world`
- after: `aGVsbG8vd29ybGQ`

### 3) `prefix`

Use case: add static marker for routing/identification in noisy transport payloads.

```yaml
transform:
  - type: prefix
    value: "tg:"
```

- before: `abc123`
- after: `tg:abc123`

### 4) `suffix`

Use case: append marker for parser hints or camouflage in expected formats.

```yaml
transform:
  - type: suffix
    value: "::end"
```

- before: `abc123`
- after: `abc123::end`

### 5) `replace`

Use case: channel-specific character substitution to match allowed charset/patterns.

```yaml
transform:
  - type: replace
    from: "/"
    to: "_"
```

- before: `a/b/c`
- after: `a_b_c`

### 6) `url_encode` / `url_decode`

Use case: safely embed payload into query parameters or form-like values.

```yaml
transform:
  - type: url_encode
```

- before: `a b&c=d`
- after: `a+b%26c%3Dd`

Decode counterpart:

```yaml
transform:
  - type: url_decode
```

- before: `a+b%26c%3Dd`
- after: `a b&c=d`

### Ordered chain example

```yaml
transform:
  - type: prefix
    value: "chan:"
  - type: base64url
```

- before: `payload42`
- after step1: `chan:payload42`
- final: `Y2hhbjpwYXlsb2FkNDI`

Optional:

- `noise[]` static filler fields

## Channel-specific location namespaces

Location namespace is channel-defined. Same schema, different location values.

### HTTP channel example

```yaml
mapping:
  id:
    source: id
    target:
      location: header
      key: X-Request-ID
  encrypted_data_in:
    source: encrypted_data
    target:
      location: body
      key: data
  encrypted_data_out:
    source: encrypted_data
    target:
      location: body
      key: data
```

### Telegram channel example

```yaml
mapping:
  id:
    source: id
    target:
      location: message
      key: id
  encrypted_data_in:
    source: encrypted_data
    target:
      location: message
      key: payload
  encrypted_data_out:
    source: encrypted_data
    target:
      location: message
      key: payload
```

## Matching Model

- If `profile_id` hint resolves to one enabled profile, use it.
- Otherwise, brute-force enabled profiles using matching strategy.
- If no profile matches, reject request as unmatched.
- On successful match:
  - `encrypted_data_in` mapping is used for inbound decode path.
  - `encrypted_data_out` mapping is used for outbound encode path.

## Validation Constraints

For enabled profile sets in same channel scope:

- no overlapping enabled `mapping.profile_id` hint keys
- no overlapping enabled mapping shapes (`mapping.id` + `mapping.encrypted_data_in`)
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
  encrypted_data_in:
    source: encrypted_data
    target:
      location: body
      key: encrypted_data
  encrypted_data_out:
    source: encrypted_data
    target:
      location: body
      key: encrypted_data
```
