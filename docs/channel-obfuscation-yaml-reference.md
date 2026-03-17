# Obfuscation Profile YAML Reference

This page is the canonical YAML reference for channel obfuscation profiles.

It is intentionally self-contained and defines the complete YAML structure.

> **Status:** this reference describes the target spec. Individual channel implementations may not support every field yet (for example `action`) until implementation catches up.

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

action:
  type: <channel-defined-action-type>
  params: <channel-defined-object>

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
- `action` (required)
- `mapping` (required)

`match`:

- `transport` (optional)
- `required_fields[]` (optional pre-filter checks)
  - `location`: **channel-defined location namespace** (string)
  - `key`: field key/name in that location

`action`:

- `type` (required): **channel-defined behavior selector**
- `params` (required): **channel-defined object**
- evaluated only after profile match + canonical decode
- does not change `mapping.transform[]` order semantics

`mapping`:

- `profile_id` (optional)
  - used to read/write hint
- `id` (required)
  - inbound only (implant -> channel -> c2); outbound responses do not carry `id`
- `encrypted_data_in` (required)
  - inbound encrypted payload mapping (implant -> channel -> c2)
- `encrypted_data_out` (required)
  - outbound encrypted payload mapping (c2 -> channel -> implant); outbound carries only `encrypted_data`

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

## Action execution semantics

- Profile matching/decoding happens first.
- After a profile matches, the channel executes `action.type` with `action.params`.
- Typical actions:
  - `http.process_sync`
  - `http.redirect`
  - `telegram.process`
- Action behavior selection is channel-specific and independent from transform inversion rules.

## Transformation chain order (authoritative)

For a transform chain:

```yaml
transform:
  - type: T1
  - type: T2
  - type: T3
```

Order semantics:

- **Outbound** (`channel -> implant`): apply in listed order `T1 -> T2 -> T3`.
- **Inbound** (`implant -> channel`): apply in reverse order `T3 -> T2 -> T1`.

Think of it as function composition:

- outbound value: `T3(T2(T1(canonical)))`
- inbound value: `T1^-1(T2^-1(T3^-1(received)))`

This is mandatory for deterministic roundtrip.

### Mini example

```yaml
transform:
  - type: prefix
    value: "chan:"
  - type: base64url
```

- outbound canonical `payload42`
  1. prefix -> `chan:payload42`
  2. base64url -> `Y2hhbjpwYXlsb2FkNDI`

- inbound received `Y2hhbjpwYXlsb2FkNDI`
  1. base64url decode -> `chan:payload42`
  2. prefix decode -> `payload42`

## Transformation examples (channel-centric direction)

### 1) `base64`

Use case: implant sends ASCII-safe payload; channel decodes to canonical value.

```yaml
transform:
  - type: base64
```

Inbound (decode in channel):
- implant sent: `Y2lwaGVyX2Jsb2I=`
- channel canonical value: `cipher_blob`

Outbound (encode in channel):
- channel canonical value: `resp:cipher_blob`
- sent to implant: `cmVzcDpjaXBoZXJfYmxvYg==`

### 2) `base64url`

Use case: implant/channel exchange data through URL-safe fields.

```yaml
transform:
  - type: base64url
```

Inbound:
- implant sent: `aGVsbG8vd29ybGQ`
- channel canonical value: `hello/world`

Outbound:
- channel canonical value: `hello/world`
- sent to implant: `aGVsbG8vd29ybGQ`

### 3) `prefix`

Use case: implant prepends marker; channel strips by decode path.

```yaml
transform:
  - type: prefix
    value: "tg:"
```

Inbound:
- implant sent: `tg:abc123`
- channel canonical value: `abc123`

Outbound:
- channel canonical value: `abc123`
- sent to implant: `tg:abc123`

### 4) `suffix`

Use case: implant appends marker; channel strips by decode path.

```yaml
transform:
  - type: suffix
    value: "::end"
```

Inbound:
- implant sent: `abc123::end`
- channel canonical value: `abc123`

Outbound:
- channel canonical value: `abc123`
- sent to implant: `abc123::end`

### 5) `replace`

Use case: implant applies character substitution; channel reverses it in decode path.

```yaml
transform:
  - type: replace
    from: "/"
    to: "_"
```

Inbound:
- implant sent: `a_b_c`
- channel canonical value: `a/b/c`

Outbound:
- channel canonical value: `a/b/c`
- sent to implant: `a_b_c`

### 6) `url_encode` / `url_decode`

Use case: transport-safe payload in query/form-like fields.

```yaml
transform:
  - type: url_encode
```

Inbound (channel decode counterpart):
- implant sent: `a+b%26c%3Dd`
- channel canonical value: `a b&c=d`

Outbound:
- channel canonical value: `a b&c=d`
- sent to implant: `a+b%26c%3Dd`

Optional:

- `noise[]` static filler fields

## Action examples

### HTTP process/sync action

```yaml
profile_id: http-process-sync
channel_type: http
enabled: true
priority: 100
action:
  type: http.process_sync
  params:
    sync_route: /api/v1/sync
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

### HTTP redirect action (to another channel/infra)

```yaml
profile_id: http-redirect-edge
channel_type: http
enabled: true
priority: 90
action:
  type: http.redirect
  params:
    status_code: 302
    location: https://edge-redirect.example.net/tunnel
    target_channel: edge-http
mapping:
  id:
    source: id
    target:
      location: query
      key: rid
  encrypted_data_in:
    source: encrypted_data
    target:
      location: query
      key: blob
  encrypted_data_out:
    source: encrypted_data
    target:
      location: query
      key: blob
```

### Telegram process action

```yaml
profile_id: telegram-process-message
channel_type: telegram
enabled: true
priority: 100
action:
  type: telegram.process
  params:
    update_kind: message
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
  - `action` is resolved and executed first.
  - Inbound decode path uses `id` + `encrypted_data_in` field mappings.
  - Outbound encode path uses `encrypted_data_out` mapping only (outbound responses do not carry `id`).

## Validation Constraints

For enabled profile sets in same channel scope:

- no overlapping enabled `mapping.profile_id` hint keys
- no overlapping enabled mapping shapes (`mapping.id` + `mapping.encrypted_data_in`)
- use `match.required_fields` and unique hint design to minimize ambiguity

## Minimal Practical Example

```yaml
profile_id: default
channel_type: http
enabled: true
priority: 100
action:
  type: http.process_sync
  params:
    sync_route: /api/channel/sync
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
