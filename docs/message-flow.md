# Channel Message Flow (Isolated)

This page documents **channel-only** flow and responsibilities.

It intentionally excludes internal core processing layers such as translators and implant providers.

## Channel-Centric Sequence

```mermaid
sequenceDiagram
    autonumber
    participant I as Implant/Session
    participant CH as Channel Module
    participant CS as Core Server

    I->>CH: transport message (obfuscated id + encrypted_data)
    CH->>CH: resolve profile (hint -> brute-force enabled profiles)
    CH->>CH: de-obfuscate to canonical id + encrypted_data
    CH->>CS: POST /api/channel/sync (inbound.agent_message)
    CS-->>CH: HTTP 200 outbound.agent_message (encrypted_data)
    CH->>CH: re-obfuscate response by active profile
    CH-->>I: transport response (obfuscated id + encrypted_data)
```

## Channel Responsibilities

- Transport adaptation (HTTP/Telegram/etc.).
- Obfuscation profile resolution and mapping.
- Canonicalization to `id` + `encrypted_data`.
- Forwarding canonical request to core sync endpoint.
- Returning core response to implant/session in transport form.

## Channel Boundaries

- Channel does **not** decrypt payload plaintext.
- Channel does **not** execute core business logic.
- Channel does **not** own translator/implant-provider semantics.
