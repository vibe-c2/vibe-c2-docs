# Message Flow (Implant/Session ↔ C2)

This diagram documents how messages move between implants/sessions and core C2, with channels acting as transport-only relays.

## End-to-End Sequence

```mermaid
sequenceDiagram
    autonumber
    participant I as Implant
    participant CH as Channel Module
    participant MQ as RabbitMQ
    participant CS as Core Server (Key Owner)
    participant TR as Translator Module
    participant IP as Implant Provider

    I->>CH: Beacon/check-in + encrypted blob
    CH->>MQ: Publish inbound.agent_message (id + encrypted_data)
    MQ->>CS: Deliver inbound.agent_message
    CS->>CS: Resolve context/key using id + decrypted payload type
    CS->>CS: Decrypt + verify payload
    CS->>TR: Pass plaintext message for normalization
    TR->>IP: Map implant/provider schema
    IP-->>TR: Parsed result + capabilities
    TR-->>CS: Normalized C2 event
    CS->>CS: Persist event + update state

    CS->>TR: Build task intent (C2-native)
    TR->>IP: Convert to implant command
    IP-->>TR: Provider-specific plaintext command
    TR-->>CS: Normalized outbound plaintext
    CS->>CS: Encrypt command for implant/session
    CS->>MQ: Publish outbound.task (id + encrypted_data)
    MQ->>CH: Deliver outbound.task
    CH-->>I: Deliver encrypted task blob

    I->>CH: Encrypted task result blob
    CH->>MQ: Publish inbound.task_result (id + encrypted_data)
    MQ->>CS: Deliver inbound.task_result
    CS->>CS: Decrypt + verify result payload
    CS->>TR: Normalize response
    TR-->>CS: C2 result model
    CS->>CS: Persist result + audit log
```

## Responsibility Map

```mermaid
flowchart LR
    I[Implant] --> CH[Channel Module]
    CH --> MQ[(RabbitMQ)]
    MQ --> CS[Core Server]
    CS --> TR[Translator]
    TR --> IP[Implant Provider]
    IP --> TR
    TR --> CS
    CS --> MQ
    MQ --> CH
    CH --> I
```

## Notes

- The logical conversation is `implant/session ↔ core C2`.
- `Channel` handles transport delivery and minimal routing metadata (`id`) only.
- `Channel` shuffles encrypted data and does not decrypt or inspect implant plaintext.
- `Core Server` owns key resolution, decrypt/verify, encrypt/sign, orchestration, policy, persistence, and audit.
- `Translator` handles language/model conversion after core decrypts payload.
- `Implant Provider` handles implant family specifics (commands/build/capabilities).
- All inter-service traffic should carry `message_id` and `correlation_id`.
