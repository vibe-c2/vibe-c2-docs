# Message Contracts

This page defines RabbitMQ RPC contracts for implant/session sync between channel and core C2.

## Model

- Implant -> Channel input: only `id` + `encrypted_data`.
- Channel wraps input and sends RPC request to core.
- Core responds with `agent.sync_response` containing zero or more encrypted tasks.
- Channel returns response payload to implant/session over its native transport.

---

## `inbound.agent_message` (RPC request)

Purpose: channel-to-core request carrying inbound encrypted implant data.

### Envelope (v1)

```json
{
  "message_id": "01JNX6R8VQ2H3CN4K9EJ1T2Z7M",
  "type": "inbound.agent_message",
  "version": "1.0",
  "timestamp": "2026-03-09T21:05:12.481Z",
  "source": {
    "module": "channel-http",
    "module_instance": "channel-http-1",
    "transport": "http",
    "tenant": "default"
  },
  "id": "s-2b77df",
  "encrypted_data": "QkM4V1R...",
  "meta": {
    "receive_count": 1,
    "trace_id": "tr-6fd92d8b"
  }
}
```

### Validation rules

Channel-side (implant -> channel):
- Require non-empty `id`.
- Require non-empty `encrypted_data`.
- Treat `encrypted_data` as opaque.

Core-side (RPC request envelope):
- Require `type == inbound.agent_message`.
- Require `id` and `encrypted_data`.
- Require parseable RFC3339 `timestamp`.

---

## `agent.sync_response` (RPC response)

Purpose: core-to-channel response for the same `id`, optionally bundling pending outbound tasks.

### Envelope (v1)

```json
{
  "message_id": "01JNX7D8H8QY3G6P2R4X1K8ABC",
  "type": "agent.sync_response",
  "version": "1.0",
  "timestamp": "2026-03-09T21:05:12.690Z",
  "id": "s-2b77df",
  "tasks": [
    {
      "task_id": "t-10045",
      "encrypted_data": "U2FtcGxlRW5jcnlwdGVkQmxvYg=="
    }
  ],
  "meta": {
    "status": "ok",
    "trace_id": "tr-6fd92d8b"
  }
}
```

### Response semantics

- `tasks` may be empty.
- Every task payload is opaque to channel.
- Channel returns these encrypted blobs to implant/session.

### Validation rules

Channel-side (RPC response envelope):
- Require `type == agent.sync_response`.
- Require matching `id`.
- Require `tasks` array (can be empty).
- Treat each `tasks[*].encrypted_data` as opaque.

---

## Processing expectations

- Channel sends `inbound.agent_message` RPC request per implant/session inbound message.
- Core processes inbound payload and returns `agent.sync_response` in the same RPC exchange.
- Core decrypts/verifies inbound and encrypts outbound; channel never decrypts.
- Core may return no tasks when queue is empty for that `id`.
