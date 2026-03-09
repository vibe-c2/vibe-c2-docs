# Architecture Draft

## High-Level Components

- **Core Server**: central control plane for authentication, orchestration, policy enforcement, and module lifecycle.
- **Operator UI / API Client**: operator-facing interface for tasking, monitoring, and administration.
- **Module Services**: independent services implementing capabilities (for example: task dispatcher, result processor, notification service).
- **Message Bus (RabbitMQ)**: asynchronous communication backbone between core server and modules via channels/queues.
- **Persistence Layer**: durable storage for users, agents, tasks, module state, and audit logs.
- **Telemetry / Logging**: centralized collection of operational and security events.

## Communication Model

- Modules do not call each other directly by default.
- Core server and modules communicate over RabbitMQ channels.
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
- RBAC for all operator actions.
- Queue access control per service/module in RabbitMQ.
- Strict audit logging for sensitive workflows and module-triggered actions.

## Pending Decisions

1. RabbitMQ exchange/queue naming conventions and routing-key strategy.
2. Message contract format and versioning policy.
3. Database engine and schema partitioning strategy.
4. Module packaging and lifecycle policy (enable/disable/version compatibility).
