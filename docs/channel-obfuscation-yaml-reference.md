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

### Ordered chain example

```yaml
transform:
  - type: prefix
    value: "chan:"
  - type: base64url
```

Inbound:
- implant sent: `Y2hhbjpwYXlsb2FkNDI`
- channel step1 (base64url decode): `chan:payload42`
- channel step2 (prefix decode): `payload42`

Outbound:
- channel canonical value: `payload42`
- encode step1 (prefix): `chan:payload42`
- encode step2 (base64url): `Y2hhbjpwYXlsb2FkNDI`

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
