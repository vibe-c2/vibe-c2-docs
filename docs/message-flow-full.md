# Message Flow (Full System)

This page documents the end-to-end flow across all major components:

- Implant/Session
- Channel Module
- Core Server
- Translator Module
- Implant Provider Module

## End-to-End Sequence

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

## Notes

- `implant/session ↔ core C2` is the logical protocol conversation.
- Channel is a transport relay and remains plaintext-blind.
- Translator and Implant Provider are internal core-side processing layers.
