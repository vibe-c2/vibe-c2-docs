# Message Flow (Implant/Session ↔ C2)

This diagram documents how messages move between implants/sessions and core C2, with channels acting as transport-only relays.

## RPC Sequence (Channel ↔ Core)

```mermaid
sequenceDiagram
    autonumber
    participant I as Implant/Session
    participant CH as Channel Module
    participant MQ as RabbitMQ
    participant CS as Core Server (Key Owner)
    participant TR as Translator Module
    participant IP as Implant Provider

    I->>CH: id + encrypted_data (beacon/result/check-in)
    CH->>MQ: RPC request inbound.agent_message
    MQ->>CS: Deliver RPC request
    CS->>CS: Resolve context/key from id
    CS->>CS: Decrypt + verify payload
    CS->>TR: Normalize payload
    TR->>IP: Map provider schema
    IP-->>TR: Parsed event
    TR-->>CS: Normalized C2 event
    CS->>CS: Persist/audit/update state

    CS->>TR: Build pending tasks for id (if any)
    TR->>IP: Convert task(s) to implant format
    IP-->>TR: Provider plaintext task(s)
    TR-->>CS: Normalized outbound plaintext
    CS->>CS: Encrypt outbound payload(s)
    CS-->>MQ: RPC response agent.sync_response (tasks[] or empty)
    MQ-->>CH: Deliver RPC response
    CH-->>I: Return encrypted response payload
```

## Delivery Semantics

- Channel initiates RPC when implant/session sends inbound traffic.
- Core always replies with `agent.sync_response`:
  - `tasks` may be empty (no work), or
  - contain one/many encrypted task blobs for the same `id`.
- No separate channel-consumed outbound task stream is required for this model.

## Notes

- The logical conversation is `implant/session ↔ core C2`.
- `Channel` handles transport and minimal routing metadata (`id`) only.
- `Channel` shuffles encrypted data and does not decrypt or inspect plaintext.
- `Core Server` owns key resolution, decrypt/verify, encrypt/sign, orchestration, policy, persistence, and audit.
