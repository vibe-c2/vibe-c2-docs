# Obfuscation Profile Examples

Obfuscation profiles control how the canonical C2 message fields (`id` and `encrypted_data`) are placed, named, and encoded in channel transport. They are YAML files that map canonical fields into channel-specific locations (headers, body, query params, cookies, message fields) and optionally apply reversible transform chains. This page is a self-contained walkthrough — every concept is introduced through a complete, runnable profile.

For architecture and runtime behavior see [Channel Obfuscation Profiles](channel-obfuscation-profiles.md).
For field-level schema details see [YAML Reference](channel-obfuscation-yaml-reference.md).

---

## Core Concepts Through Examples

Each example builds on the previous one. All examples use the HTTP channel unless noted otherwise.

### 1. Minimal profile — body fields, no transforms

The simplest working profile. Both `id` and `encrypted_data` travel as named JSON body fields with no encoding.

```yaml
# Implant sends: POST /sync  {"agent_id": "<id>", "payload": "<encrypted_data>"}
# Channel returns: {"payload": "<encrypted_data>"}

profile_id: 1
profile_label: http-body-plain
enabled: true
action:
  type: sync              # standard action — decode, call C2, encode response
mapping:
  id:
    target:
      location: body      # channel-defined location namespace
      key: agent_id       # JSON field name for this value
  encrypted_data_in:
    target:
      location: body
      key: payload
  encrypted_data_out:
    target:
      location: body
      key: payload
```

**What happens at runtime:**

- **Inbound** — channel reads `agent_id` from request body as `id`, reads `payload` as `encrypted_data`. Forwards canonical message to C2.
- **Outbound** — channel takes C2 response `encrypted_data`, writes it to response body as `payload`.

!!! note "Key takeaway"
    A profile needs at minimum: `profile_id`, `enabled`, `action`, and mappings for `id`, `encrypted_data_in`, and `encrypted_data_out`.

---

### 2. Adding a single transform — base64

Transforms shape data between the transport format (what the implant sends/receives) and the canonical format (what the channel forwards to C2). Here, the implant base64-encodes the payload before sending.

```yaml
# Implant sends: POST /sync  {"sid": "<id>", "data": "<base64(encrypted_data)>"}
# Channel returns: {"data": "<base64(encrypted_data)>"}

profile_id: 2
profile_label: http-body-b64
enabled: true
action:
  type: sync
mapping:
  id:
    target:
      location: body
      key: sid
  encrypted_data_in:
    target:
      location: body
      key: data
    transform:
      - type: base64        # channel decodes base64 on inbound
  encrypted_data_out:
    target:
      location: body
      key: data
    transform:
      - type: base64        # channel encodes base64 on outbound
```

**What happens at runtime:**

- **Inbound** — channel reads `data` field, base64-decodes it to get canonical `encrypted_data`.
- **Outbound** — channel base64-encodes canonical `encrypted_data`, writes to `data` field.

!!! note "Key takeaway"
    Transforms listed in `transform[]` are applied **outbound top-to-bottom** (encode), **inbound bottom-to-top** (decode). With a single transform, direction doesn't matter yet — it will in the next examples.

---

### 3. Different field placements — header + body

Fields don't have to live in the same location. Here `id` travels in an HTTP header while `encrypted_data` stays in the body.

```yaml
# Implant sends: POST /api/data  Header "X-Request-ID: <id>"  Body {"data": "<encrypted_data>"}
# Channel returns: {"data": "<encrypted_data>"}

profile_id: 3
profile_label: http-header-body
enabled: true
action:
  type: sync
mapping:
  id:
    target:
      location: header     # id is an HTTP header
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

**What happens at runtime:**

- **Inbound** — channel reads `id` from header `X-Request-ID`, reads `encrypted_data` from body field `data`.
- **Outbound** — response body only; outbound never carries `id`.

!!! note "Key takeaway"
    `target.location` is a channel-defined namespace. HTTP channel supports `header`, `body`, `query`, `cookie`. Each channel defines its own set.

---

### 4. Transform chains — order matters

When multiple transforms are chained, order is critical. Outbound applies top-to-bottom; inbound reverses (bottom-to-top).

```yaml
# Implant sends the id as: base64url(prefix("agent:", <id>))
# Example: canonical id "abc123" → prefixed "agent:abc123" → base64url "YWdlbnQ6YWJjMTIz"

profile_id: 4
profile_label: http-chain-demo
enabled: true
action:
  type: sync
mapping:
  id:
    target:
      location: header
      key: X-Session
    transform:
      - type: prefix         # step 1 outbound: prepend "agent:"
        value: "agent:"
      - type: base64url      # step 2 outbound: base64url-encode the result
  encrypted_data_in:
    target:
      location: body
      key: blob
    transform:
      - type: base64
  encrypted_data_out:
    target:
      location: body
      key: blob
    transform:
      - type: base64
```

**What happens at runtime:**

- **Outbound** (encode `id` for transport):
    1. `prefix` → `agent:abc123`
    2. `base64url` → `YWdlbnQ6YWJjMTIz`
    3. Written to header `X-Session`
- **Inbound** (decode `id` from transport):
    1. Read header `X-Session`: `YWdlbnQ6YWJjMTIz`
    2. `base64url` decode → `agent:abc123`
    3. `prefix` decode (strip `agent:`) → `abc123`

!!! note "Key takeaway"
    Think of transforms as function composition. Outbound: `T2(T1(value))`. Inbound: `T1⁻¹(T2⁻¹(received))`. Always list transforms in the outbound (encode) order.

---

### 5. Profile hint for fast matching

When a channel has multiple enabled profiles, it must figure out which one applies to each request. A `profile_id` mapping entry places a hint in transport so the channel can skip brute-force matching.

```yaml
# Implant sends: Header "X-Profile: p:5"  (hint for profile_id 5)

profile_id: 5
profile_label: http-with-hint
enabled: true
action:
  type: sync
mapping:
  profile_id:                # optional hint mapping
    target:
      location: header
      key: X-Profile
    transform:
      - type: prefix
        value: "p:"         # implant sends "p:5", channel strips prefix to get "5"
  id:
    target:
      location: header
      key: X-Agent-ID
  encrypted_data_in:
    target:
      location: body
      key: data
    transform:
      - type: base64
  encrypted_data_out:
    target:
      location: body
      key: data
    transform:
      - type: base64
```

**What happens at runtime:**

- **Inbound** — channel reads `X-Profile` header, strips `p:` prefix, gets `5`. Looks up profile with `profile_id: 5` directly — no brute-force needed.
- Without the hint, the channel would try each enabled profile in frequency order until one decodes successfully.

!!! note "Key takeaway"
    `profile_id` mapping is optional but recommended when multiple profiles coexist. It enables O(1) profile selection instead of iterating candidates.

---

### 6. Composite inbound — length prefix

Sometimes `id` and `encrypted_data` are concatenated into a single transport value. `composite_in` replaces separate `id` + `encrypted_data_in` mappings. The `length_prefix` separator takes the first N bytes as `id`.

```yaml
# Implant sends: POST /sync  Body is base64(16-byte-id + encrypted_data)

profile_id: 6
profile_label: http-composite-length
enabled: true
action:
  type: sync
mapping:
  composite_in:              # replaces id + encrypted_data_in
    separator:
      type: length_prefix
      id_length: 16          # first 16 bytes are id
    target:
      location: body
    transform:
      - type: base64         # decode base64 first, then split
  encrypted_data_out:
    target:
      location: body
    transform:
      - type: base64
```

**What happens at runtime:**

- **Inbound** — channel base64-decodes the raw body, takes first 16 bytes as `id`, remainder as `encrypted_data`.
- **Outbound** — channel base64-encodes `encrypted_data` and writes to body (no `id` on outbound).

!!! note "Key takeaway"
    `composite_in` is useful when the implant packs both fields into a single blob. Note that `target.key` is omitted — the mapping targets the entire body.

---

### 7. Composite inbound — delimiter

Alternative to length prefix: split on a delimiter character.

```yaml
# Implant sends: POST /sync  Body is base64(<id>||<encrypted_data>)
# "||" separates the two fields

profile_id: 7
profile_label: http-composite-delim
enabled: true
action:
  type: sync
mapping:
  composite_in:
    separator:
      type: delimiter
      value: "||"            # split on "||"
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

**What happens at runtime:**

- **Inbound** — channel base64-decodes body, splits on first `||` occurrence. Left part is `id`, right part is `encrypted_data`.
- **Outbound** — same as length-prefix example: only `encrypted_data`.

---

### 8. Custom action — redirect

Custom actions change what the channel does after decoding. `redirect` sends the implant to alternate infrastructure instead of processing locally.

```yaml
profile_id: 8
profile_label: http-redirect-edge
enabled: true
action:
  type: redirect             # custom action (channel-defined)
  params:                    # channel-specific parameters
    status_code: 302
    location: https://edge.example.net/tunnel
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
```

**What happens at runtime:**

- **Inbound** — channel decodes `id` and `encrypted_data` from query params as usual, but instead of calling C2 sync, it returns an HTTP 302 redirect to the edge URL.
- The `params` block is entirely channel-defined — `redirect` is not a standard action.
- `encrypted_data_out` is omitted because redirect action does not return data to the implant.

---

### 9. Custom action — proxy_pass

`proxy_pass` forwards the decoded request to an upstream server transparently.

```yaml
profile_id: 9
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

**What happens at runtime:**

- **Inbound** — channel decodes the profile, then forwards the canonical message to the upstream URL instead of the local C2 sync endpoint.
- Note: `encrypted_data_in` and `encrypted_data_out` have no `key` — they target the raw body.

---

## Channel Catalog

Ready-to-use profiles for common scenarios. Copy, adjust `profile_id`, and deploy.

### HTTP Channel

#### Simple body sync (JSON API style)

Looks like a normal JSON API. Good default for development and testing.

```yaml
profile_id: 100
profile_label: http-json-api
enabled: true
action:
  type: sync
mapping:
  profile_id:
    target:
      location: header
      key: X-Api-Version
    transform:
      - type: prefix
        value: "v"           # implant sends "v100", channel extracts "100"
  id:
    target:
      location: body
      key: request_id
  encrypted_data_in:
    target:
      location: body
      key: payload
    transform:
      - type: base64
  encrypted_data_out:
    target:
      location: body
      key: payload
    transform:
      - type: base64
```

#### Header-based id + body payload (CDN/proxy blend)

`id` in a standard-looking header, payload in body. Blends with CDN/proxy traffic.

```yaml
profile_id: 101
profile_label: http-cdn-blend
enabled: true
action:
  type: sync
mapping:
  profile_id:
    target:
      location: header
      key: X-Correlation-ID
    transform:
      - type: prefix
        value: "cor-"
  id:
    target:
      location: header
      key: X-Request-ID
    transform:
      - type: base64url
  encrypted_data_in:
    target:
      location: body
      key: data
    transform:
      - type: base64
  encrypted_data_out:
    target:
      location: body
      key: data
    transform:
      - type: base64
```

#### Cookie-based id + body payload

`id` travels in a cookie — blends with typical web application traffic.

```yaml
profile_id: 102
profile_label: http-cookie-id
enabled: true
action:
  type: sync
mapping:
  id:
    target:
      location: cookie
      key: session_token
    transform:
      - type: base64url      # cookie-safe encoding
  encrypted_data_in:
    target:
      location: body
      key: form_data
    transform:
      - type: base64
  encrypted_data_out:
    target:
      location: body
      key: form_data
    transform:
      - type: base64
```

#### All-in-query-string (GET-only beacon)

Inbound via query params — works with GET requests, useful for lightweight beacons. Response returned in body.

```yaml
profile_id: 103
profile_label: http-get-beacon
enabled: true
action:
  type: sync
mapping:
  profile_id:
    target:
      location: query
      key: v
  id:
    target:
      location: query
      key: uid
    transform:
      - type: base64url      # URL-safe encoding for query values
  encrypted_data_in:
    target:
      location: query
      key: q
    transform:
      - type: base64url
      - type: url_encode     # double-safe: base64url then url_encode
  encrypted_data_out:
    target:
      location: body
      key: q
    transform:
      - type: base64url
```

#### Mixed placement — header + query + body

Splits fields across all available locations.

```yaml
profile_id: 104
profile_label: http-mixed-placement
enabled: true
action:
  type: sync
mapping:
  profile_id:
    target:
      location: header
      key: X-Api-Key
    transform:
      - type: prefix
        value: "key-"
  id:
    target:
      location: query
      key: trace
    transform:
      - type: base64url
  encrypted_data_in:
    target:
      location: body
      key: content
    transform:
      - type: base64
  encrypted_data_out:
    target:
      location: body
      key: content
    transform:
      - type: base64
```

#### Composite body with base64 and prefix

Compact format: single body value carries both fields with a marker prefix.

```yaml
profile_id: 105
profile_label: http-composite-prefixed
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
      - type: prefix
        value: "msg:"        # strip "msg:" first, then base64 decode, then split
      - type: base64
  encrypted_data_out:
    target:
      location: body
    transform:
      - type: prefix
        value: "msg:"
      - type: base64
```

### Telegram Channel

Telegram channel uses `message` as its primary location namespace.

#### Simple message sync

Straightforward message-based transport with named fields.

```yaml
profile_id: 200
profile_label: telegram-simple
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

#### Message with prefix markers and base64

Fields carry prefix markers for visual structure, payloads are base64-encoded.

```yaml
profile_id: 201
profile_label: telegram-marked-b64
enabled: true
action:
  type: sync
mapping:
  profile_id:
    target:
      location: message
      key: profile
    transform:
      - type: prefix
        value: "p:"
  id:
    target:
      location: message
      key: id
    transform:
      - type: prefix
        value: "id:"
      - type: base64url
  encrypted_data_in:
    target:
      location: message
      key: data
    transform:
      - type: base64
  encrypted_data_out:
    target:
      location: message
      key: data
    transform:
      - type: base64
```

---

## Quick Reference

| Profile | Action | Locations | Transforms |
|---------|--------|-----------|------------|
| http-json-api | sync | header, body | prefix, base64 |
| http-cdn-blend | sync | header, body | prefix, base64url, base64 |
| http-cookie-id | sync | cookie, body | base64url, base64 |
| http-get-beacon | sync | query | base64url, url_encode |
| http-mixed-placement | sync | header, query, body | prefix, base64url, base64 |
| http-composite-prefixed | sync | body | prefix, base64 |
| http-redirect-edge | redirect | query | — |
| http-proxy-upstream | proxy_pass | header, body | — |
| telegram-simple | sync | message | — |
| telegram-marked-b64 | sync | message | prefix, base64url, base64 |
