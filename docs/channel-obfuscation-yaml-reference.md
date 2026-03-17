# Obfuscation Profile YAML Reference

> **Status:** this reference describes the target spec. Individual channel implementations may not support every field yet (for example `action`) until implementation catches up.

## Canonical YAML Structure

```yaml
profile_id: 1
profile_label: generic-profile-01
enabled: true

action:
  type: sync

mapping:
  profile_id:
    target:
      location: <channel-defined-location>
      key: <profile-hint-key>
    transform:
      - type: prefix
        value: "p:"
      - type: base64url

  id:
    target:
      location: <channel-defined-location>
      key: <id-key>
    transform:
      - type: suffix
        value: "::id"
      - type: base64url

  encrypted_data_in:
    target:
      location: <channel-defined-location>
      key: <payload-in-key>
    transform:
      - type: base64

  encrypted_data_out:
    target:
      location: <channel-defined-location>
      key: <payload-out-key>
    transform:
      - type: base64
```

## Field Reference

Top-level:

- `profile_id` (required): int32 numeric identifier
- `profile_label` (optional): human-readable name
- `enabled` (required)
- `action` (required)
- `mapping` (required)

`action`:

- `type` (required): action name
- `params` (optional): action-specific parameters

Standard actions (every channel must implement):

- `sync` — decode mapping, call C2 sync endpoint, encode response

Channels may define additional custom actions (e.g., `redirect`). Custom action names, params schema, and behavior are fully channel-defined.

`mapping`:

- `profile_id` (optional)
  - used to read/write hint
- `id` (required unless `composite_in` is used)
  - inbound only (implant -> channel -> c2); outbound responses do not carry `id`
- `encrypted_data_in` (required unless `composite_in` is used)
  - inbound encrypted payload mapping (implant -> channel -> c2)
- `composite_in` (optional; replaces `id` + `encrypted_data_in`)
  - single transport value carrying both `id` and `encrypted_data` concatenated together
  - requires `separator` to define how fields are split/joined
- `encrypted_data_out` (required)
  - outbound encrypted payload mapping (c2 -> channel -> implant); outbound carries only `encrypted_data`

Each mapping entry supports:

- `target.location`: **channel-defined location namespace** (string)
- `target.key` (optional): transport key/name; omit when the mapping targets the entire location (e.g., raw body)
- `transform[]`: ordered transform object list

`composite_in.separator`:

- `type: length_prefix` — first N bytes are `id`, rest is `encrypted_data` (`id_length` required)
- `type: delimiter` — split on character sequence (`value` required)

Supported transform types (v1):

- `base64`
- `base64url`
- `prefix` (`value` required)
- `suffix` (`value` required)
- `replace` (`from`, `to` required)
- `url_encode`

## Action execution semantics

- Profile matching/decoding happens first.
- After a profile matches, the channel executes `action.type` with `action.params`.
- Standard actions (`sync`) have spec-defined behavior; custom actions are channel-defined.

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

**Constraint:** `replace` is only safe when the `to` character is guaranteed not to appear in the input value. If both `from` and `to` characters can appear in the data, the inbound reversal is lossy. When applying `replace` to `encrypted_data`, always pair it with a prior encoding transform (e.g., `base64url`) that eliminates the ambiguous character first.

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

### 6) `url_encode`

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

## Action examples

### Standard action: `sync` (HTTP channel)

```yaml
profile_id: 100
profile_label: http-sync-header
enabled: true
action:
  type: sync
mapping:
  id:
    target:
      location: header
      key: X-Request-ID
  encrypted_data_in:
    target:
      location: body
      key: data
  encrypted_data_out:
    target:
      location: body
      key: data
```

### Standard action: `sync` (Telegram channel)

```yaml
profile_id: 200
profile_label: telegram-sync-message
enabled: true
action:
  type: sync
mapping:
  id:
    target:
      location: message
      key: id
  encrypted_data_in:
    target:
      location: message
      key: payload
  encrypted_data_out:
    target:
      location: message
      key: payload
```

### Custom action: `redirect` (HTTP channel)

```yaml
profile_id: 101
profile_label: http-redirect-edge
enabled: true
action:
  type: redirect
  params:
    status_code: 302
    location: https://edge-redirect.example.net/tunnel
    target_channel: edge-http
mapping:
  id:
    target:
      location: query
      key: rid
  encrypted_data_in:
    target:
      location: query
      key: blob
  encrypted_data_out:
    target:
      location: query
      key: blob
```

### Custom action: `proxy_pass` (HTTP channel)

```yaml
profile_id: 102
profile_label: http-proxy-upstream
enabled: true
action:
  type: proxy_pass
  params:
    upstream: https://upstream.example.net/c2
mapping:
  id:
    target:
      location: header
      key: X-Agent-ID
  encrypted_data_in:
    target:
      location: body
  encrypted_data_out:
    target:
      location: body
```

### Composite inbound: `id` + `encrypted_data` in single body (HTTP channel)

```yaml
profile_id: 103
profile_label: http-composite-body
enabled: true
action:
  type: sync
mapping:
  composite_in:
    separator:
      type: length_prefix
      id_length: 16
    target:
      location: body
    transform:
      - type: base64
  encrypted_data_out:
    target:
      location: body
    transform:
      - type: base64
```

Inbound: base64-decode body, take first 16 bytes as `id`, remainder as `encrypted_data`.
Outbound: only `encrypted_data` — base64-encode and write to body.

## Matching Model

- If `profile_id` hint resolves to one enabled profile, use it.
- Otherwise, brute-force enabled profiles ordered by runtime match frequency.
- If no profile matches, reject request as unmatched.
- On successful match:
  - `action` is resolved and executed first.
  - Inbound decode path uses `id` + `encrypted_data_in` field mappings (or `composite_in` when fields are concatenated).
  - Outbound encode path uses `encrypted_data_out` mapping only (outbound responses do not carry `id`).

## Validation Constraints

For enabled profile sets in same channel scope:

- no duplicate `profile_id` values
- no overlapping enabled `mapping.profile_id` hint keys
- no overlapping enabled mapping shapes (`mapping.id` + `mapping.encrypted_data_in`)
- use unique hint design to minimize ambiguity

## Minimal Practical Example

```yaml
profile_id: 1
enabled: true
action:
  type: sync
mapping:
  id:
    target:
      location: body
      key: id
  encrypted_data_in:
    target:
      location: body
      key: encrypted_data
  encrypted_data_out:
    target:
      location: body
      key: encrypted_data
```
