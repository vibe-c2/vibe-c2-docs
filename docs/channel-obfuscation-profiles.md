# Channel Obfuscation Profiles

This page defines the obfuscation layer used by channel modules when transporting `id` and `encrypted_data` between implant/session and core C2.

## Purpose

Obfuscation profiles are a transport-shaping layer on top of the base sync contract. They do **not** replace app-level implant↔C2 encryption.

- App-level encryption (`encrypted_data`) remains mandatory.
- Obfuscation controls how `id` and `encrypted_data` are embedded in channel transport fields.

## What a profile can control

A profile may define where and how fields are placed, for example:

- HTTP headers
- query parameters
- cookies
- body fields
- mixed placement (split across multiple locations)

In addition to `id` and `encrypted_data`, transport may carry `profile_id` hint used for fast profile selection.
A profile may also define reversible encoding/wrapping, for example:

- base64/base64url variants
- field renaming/aliasing
- optional channel-layer wrapping/encryption
- padding/noise fields

A profile also defines channel behavior through an `action` namespace object.

> **Status:** documentation-level specification (design target). Runtime implementation may lag behind spec.


```yaml
action:
  type: <channel-defined-action-type>
  params: <channel-defined-object>
```

- `action.type` selects behavior after profile match and canonical decode.
- `action.params` carries channel-defined parameters for that behavior.
- `action` does not change transform ordering semantics in `mapping.transform`.

## Profile storage and ownership

- Profiles are persisted in durable storage.
- Profile format is YAML.
- Channel module owns runtime loading, validation, and execution of profiles.
- Core C2 owns management UX/API and policy decisions.

## YAML Specification

YAML schema details are intentionally kept in a dedicated page:

- [Obfuscation Profile YAML Reference](channel-obfuscation-yaml-reference.md)

Use this page for architecture/behavioral concepts and matching model.
Use the YAML reference page for exact profile file structure, field-level syntax, and examples.

## Runtime flow

Inbound (implant/session -> channel -> core):

1. Channel receives obfuscated transport payload.
2. Channel first attempts to extract `profile_id` hint using configured hint locations.
3. If hint is valid and points to enabled profile, channel uses that profile directly.
4. If hint is missing/invalid, channel builds candidate list from enabled profiles using `match` pre-filters.
5. Channel tries candidates in priority/frequency order.
6. On first successful decode to canonical fields (`id`, `encrypted_data`), channel uses that profile.
7. If no candidate succeeds, channel rejects request as unmatched profile.
8. After profile match, channel resolves and executes `action` from that profile.
9. For process-style actions, channel sends canonical request to C2 sync endpoint after successful action resolution.

Outbound (core -> channel -> implant/session):

1. Channel receives canonical response (`outbound.agent_message`).
2. Channel uses the inbound-resolved profile and selected `action` to produce outbound transport behavior.
3. Channel returns transport-shaped response to implant/session.
4. Channel updates profile usage counters/cache for future ordering.

## Action examples

Concrete examples of channel-defined action types after profile match:

### HTTP process/sync action

```yaml
action:
  type: http.process_sync
  params:
    sync_route: /api/v1/sync
```

- Normal HTTP channel path: decode profile mapping, call C2 sync, then encode response.

### HTTP redirect action (to another channel/infra)

```yaml
action:
  type: http.redirect
  params:
    status_code: 302
    location: https://edge-redirect.example.net/tunnel
    target_channel: edge-http
```

- Returns redirect behavior to alternate channel infrastructure instead of local sync processing.

### Telegram process action

```yaml
action:
  type: telegram.process
  params:
    update_kind: message
```

- Uses Telegram channel processing flow after profile decode.

## Management model

Channel modules expose RabbitMQ RPC management endpoints so core can manage profiles.

### Example RPC actions

- `obf.profile.list`
- `obf.profile.get`
- `obf.profile.create`
- `obf.profile.update`
- `obf.profile.delete`
- `obf.profile.activate`
- `obf.profile.validate`
- `obf.profile.simulate_match`
- `obf.profile.stats`

Validation on create/update should include overlap checks against other enabled profiles for the same channel.

## Matching conflict and performance strategy

### Conflict control

- Multiple enabled profiles may accidentally match the same inbound shape.
- Channel/C2 must reject create/update operations that introduce ambiguous overlap (for same channel + transport).
- `profile_id` hint must uniquely map to one enabled profile in channel scope.
- Default profile behavior is not supported; unmatched payloads must be rejected.

### Performance control

- Prefer direct selection via transport `profile_id` hint.
- Use `match` pre-filters to narrow candidate set before decode attempts when hint is unavailable.
- Order attempts by observed frequency/success rate.
- Cache source-to-profile affinity (for example `source_ip -> profile_id`, `telegram_chat_id -> profile_id`) with TTL.
- On cache hit, try cached profile first; on miss/failure, continue ordered candidates.

## Security boundaries

- Obfuscation is not a substitute for cryptography.
- Channel must stay plaintext-blind for implant business semantics.
- Profile logic must not require decrypting `encrypted_data`.
- Changes to active profile should be auditable (who/when/what changed).
