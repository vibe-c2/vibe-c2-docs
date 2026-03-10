# Module Types

This page defines initial module categories in the Vibe C2 modular architecture.

## 1) Channel Modules

Channel modules provide transport paths between implants/sessions and the core C2 platform.

### Responsibilities

- Accept inbound agent traffic from a specific transport/platform.
- Extract/maintain minimal routing metadata (`id` + channel context).
- Treat implant payload as opaque encrypted blob (no decrypt/inspect).
- Send inbound HTTP request to core sync endpoint (`POST /api/channel/sync`).
- Wait for HTTP response from core and relay returned encrypted payload back to implant/session.
- Implement transport-specific response delivery (`poll`/long-poll/webhook reply/etc.).
- Handle transport-specific concerns (sessions, polling cadence, retries, rate limits).

### Examples

- HTTP(S) channel
- Telegram channel
- GitHub channel
- DNS channel (future)
- WebSocket channel (future)

### Notes

- Keep transport logic isolated from business/tasking logic.
- Channel modules are blind to implant plaintext by design.
- Channel role is packet/blob shuffling + HTTP relay reliability, not C2 semantics.
- The real protocol peer is core C2, not the channel module.
- Enforce per-channel authentication and abuse controls.
- Expose channel health and queue lag metrics.

## 2) Implant Provider Modules

Implant provider modules define implant families and lifecycle behavior.

### Responsibilities

- Build/generate implant artifacts for a target platform/profile.
- Define the command set supported by a specific implant family.
- Preprocess operator/core commands into implant-specific wire format.
- Postprocess raw implant responses into structured events/results.
- Manage implant metadata/capabilities and compatibility versions.

### Examples

- Go implant provider
- .NET implant provider
- Python implant provider

### Notes

- Keep provider-specific command grammar encapsulated.
- Version command contracts per implant provider.
- Track capability flags per implant build (supported commands/features).

## 3) Translator Modules

Translator modules convert between "implant language" and internal C2 language/model.

### Responsibilities

- Translate generic C2 command intents to implant-specific command forms.
- Translate implant-specific responses into normalized C2 result schema.
- Handle bidirectional mapping, field normalization, and error code translation.
- Support multiple provider versions through explicit mapping profiles.

### Examples

- Generic task model -> Go implant v1 command map
- Go implant v1 responses -> normalized C2 result model

### Notes

- Translators should be deterministic and test-heavy.
- Avoid mixing transport responsibilities into translator modules.
- Keep mappings explicit; avoid hidden heuristic behavior in critical paths.

## Cross-Cutting Module Requirements

All module types should:

- Communicate through RabbitMQ channels using versioned message schemas.
- Include correlation IDs for traceability across services.
- Be independently deployable/replaceable in Docker Compose stacks.
- Emit structured logs and health signals.
- Support graceful shutdown and idempotent processing where possible.

Crypto boundary rules:

- Implant payload crypto (`encrypt/decrypt/verify/sign`) belongs to core C2 services.
- Channel modules must be plaintext-blind and process only routing metadata + encrypted blobs.

## Suggested Next Step

Create an ADR that freezes:

1. Base message envelope format (`message_id`, `correlation_id`, `type`, `version`, `payload`, `timestamp`).
2. Exchange/queue naming convention.
3. Ownership boundaries between channel/provider/translator modules.
