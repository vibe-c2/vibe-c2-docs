# Architecture Draft

## High-Level Components

- **Core Server**: central control plane for authentication, orchestration, policy enforcement, and module lifecycle.
- **Operator UI / API Client**: operator-facing interface for tasking, monitoring, and administration.
- **Module Services**: independent services implementing capabilities (for example: task dispatcher, result processor, notification service).
- **Message Bus (RabbitMQ)**: asynchronous communication backbone between core server and modules via channels/queues.
- **Persistence Layer**: durable storage for users, agents, tasks, module state, and audit logs.
- **Telemetry / Logging**: centralized collection of operational and security events.

## Communication Ownership Model

- The logical conversation is **implant/session ↔ core C2**.
- A channel module is only a transport relay between implant/session and core C2.
- Channel modules shuffle opaque encrypted blobs plus minimal routing metadata (`id`).
- Channel modules are not protocol peers for implant business logic and must stay plaintext-blind.

## Communication Model

- Modules do not call each other directly by default.
- Core server and modules communicate over RabbitMQ channels.
- Implant-to-C2 payloads are application-layer encrypted end-to-end.
- Channel modules do not decrypt implant payloads; they relay metadata + encrypted blobs.
- Core<->channel interaction for implant traffic uses RabbitMQ RPC (`request -> response`).
- On inbound request, core can return pending outbound tasks in the same RPC response.
- Only core C2 services hold decryption keys and perform decrypt/verify operations.
- Messages should be schema-versioned and idempotent where possible.
- Critical flows should use acknowledgements/retries and dead-letter queues.

## Initial Deployment Shape

- Docker Compose orchestrates all services for MVP environments.
- Services include: core server, RabbitMQ, database, and selected modules.
- Optional reverse proxy can handle TLS termination for operator/API entrypoints.

## Trust Boundaries

- Internet/agent network to core server entrypoint.
- Operator network to core server entrypoint.
- Core server/modules to RabbitMQ.
- Core server/modules to database.

## Baseline Security Controls

- Encrypted transport for all external/control-plane traffic.
- Application-layer E2E encryption for implant payloads (`implant` ↔ `core C2`).
- Decryption keys are available only to core C2 services.
- Channel modules operate as blind routers for encrypted blobs.
- RBAC for all operator actions.
- Queue access control per service/module in RabbitMQ.
- Strict audit logging for sensitive workflows and module-triggered actions.

## Pending Decisions

1. RabbitMQ exchange/queue naming conventions and routing-key strategy.
2. Message contract format and versioning policy.
3. Database engine and schema partitioning strategy.
4. Module packaging and lifecycle policy (enable/disable/version compatibility).
