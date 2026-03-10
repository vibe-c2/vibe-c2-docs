# Message Flow (Implant/Session ↔ C2)

This diagram documents how messages move between implants/sessions and core C2, with channels acting as transport-only relays.

## HTTP Sync Sequence (Channel ↔ Core)

```mermaid
sequenceDiagram
    autonumber
    participant I as Implant/Session
    participant CH as Channel Module
    participant CS as Core Server (Key Owner)
    participant TR as Translator Module
    participant IP as Implant Provider

    I->>CH: id + encrypted_data (beacon/result/check-in)
    CH->>CS: POST /api/channel/sync (inbound.agent_message)
    CS->>CS: Resolve context/key from id
    CS->>CS: Decrypt + verify payload
    CS->>TR: Normalize payload
    TR->>IP: Map provider schema
    IP-->>TR: Parsed event
    TR-->>CS: Normalized C2 event
    CS->>CS: Persist/audit/update state

    CS->>TR: Build outbound payload for id (if any)
    TR->>IP: Convert to implant format
    IP-->>TR: Provider plaintext payload
    TR-->>CS: Normalized outbound plaintext
    CS->>CS: Encrypt outbound payload (or no-op envelope)
    CS-->>CH: HTTP 200 outbound.agent_message (encrypted_data)
    CH-->>I: Return encrypted response payload
```

## Delivery Semantics

- Channel initiates sync when implant/session sends inbound traffic.
- Core always replies with `outbound.agent_message`.
- Response body exposed to channel is encrypted-only (`encrypted_data`).
- If no work is available, core returns an empty/no-op encrypted payload.

## Notes

- The logical conversation is `implant/session ↔ core C2`.
- `Channel` handles transport and minimal routing metadata (`id`) only.
- `Channel` shuffles encrypted data and does not decrypt or inspect plaintext.
- `Core Server` owns key resolution, decrypt/verify, encrypt/sign, orchestration, policy, persistence, and audit.
