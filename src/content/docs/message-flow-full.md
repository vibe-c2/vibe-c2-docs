---
title: "Message Flow (Full System)"
---

This page documents the end-to-end flow across all major components:

- Minion
- Channel Module
- Core Server
- Minion Provider Module

## End-to-End Sequence

```mermaid
sequenceDiagram
    autonumber
    participant I as Minion
    participant CH as Channel Module
    participant CS as Core Server (Key Owner)
    participant IP as Minion Provider

    I->>CH: id + encrypted_data (beacon/result/check-in)
    CH->>CS: POST /api/channel/sync (inbound.minion_message)
    CS->>CS: Resolve context/key from id
    CS->>CS: Decrypt + verify payload
    CS->>IP: Parse provider response into normalized C2 event
    IP-->>CS: Normalized C2 event
    CS->>CS: Persist/audit/update state

    CS->>IP: Build outbound payload for id (if any)
    IP-->>CS: Provider plaintext payload
    CS->>CS: Encrypt outbound payload (or no-op envelope)
    CS-->>CH: HTTP 200 outbound.minion_message (encrypted_data)
    CH-->>I: Return encrypted response payload
```

## Notes

- `minion ↔ core C2` is the logical protocol conversation.
- Channel is a transport relay and remains plaintext-blind.
- Minion Provider is an internal core-side processing layer.
