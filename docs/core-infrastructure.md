# Core Infrastructure

This page maps the infrastructure services that support the Vibe C2 platform at MVP scope. It covers what each service does, why it was chosen, and what connects to it.

For architectural rationale see the [Architecture Draft](architecture.md). For core server responsibilities see [Core Responsibilities](core-responsibilities.md).

## Infrastructure Topology

```mermaid
graph TD
    subgraph compose["Docker Compose Stack"]
        CS[Core Server]
        RMQ[(RabbitMQ)]
        DB[(MongoDB)]
        SFS[(SeaweedFS)]

        subgraph modules["Modules"]
            CH[Channel Modules]
            TR[Translator Modules]
            IP[Implant Provider Modules]
        end

        subgraph obs["Observability"]
            OBS[Logging / Metrics / Tracing]
        end
    end

    CH -- "AMQP: RPC, events" --> RMQ
    TR -- "AMQP" --> RMQ
    IP -- "AMQP" --> RMQ
    CS -- "AMQP: coordination" --> RMQ

    CH -- "HTTP: POST /api/channel/sync" --> CS

    CS -- "read/write" --> DB
    CS -- "blob storage" --> SFS
    IP -- "artifact upload" --> SFS

    CS -.-> OBS
    CH -.-> OBS
    TR -.-> OBS
    IP -.-> OBS
    RMQ -.-> OBS
    DB -.-> OBS
```

## RabbitMQ — Message Bus

- **Role**: asynchronous communication backbone between core server and all modules. Carries control-plane RPC (e.g. obfuscation profile CRUD), event notifications, and module coordination messages. Does **not** carry implant traffic — that flows via the HTTP sync endpoint.
- **Why RabbitMQ**: mature AMQP broker with exchange/queue routing patterns suited to module-type-based message routing, dead-letter queues for reliability ([FR-05](tech-requirements.md)), and per-queue ACLs for trust boundary enforcement.
- **Connections**: Core Server (publisher/consumer), Channel Modules, Translator Modules, Implant Provider Modules — all communicate over AMQP.

## MongoDB — Persistence Layer

- **Role**: durable storage for operator accounts, agent registrations, task history, session state, audit logs, and obfuscation profile YAML documents.
- **Why MongoDB**: schema-flexible document model maps well to YAML profile storage and semi-structured audit/event data. Supports evolving MVP contracts without rigid schema migrations.
- **Connections**: Core Server is the primary read/write client.

!!! note
    MongoDB resolves the database engine decision listed as pending in the
    [Architecture Draft](architecture.md#pending-decisions).

## SeaweedFS — Blob Storage

- **Role**: distributed object/blob storage for large artifacts — implant build outputs from [Implant Provider Modules](module-types.md), staged payloads, and file exfiltration results.
- **Why SeaweedFS**: lightweight, self-hosted, S3-compatible API. Avoids external cloud dependencies and keeps binary blobs out of the document database.
- **Connections**: Core Server (read/write), Implant Provider Modules (artifact upload).

## Docker Compose — Deployment Orchestration

- **Role**: defines and runs the complete MVP service topology as a single declarative stack. All services — core server, RabbitMQ, MongoDB, SeaweedFS, modules, observability — run as containers managed by Compose.
- **Why Docker Compose**: matches the [tech-requirements.md](tech-requirements.md) constraint ("Runtime architecture is containerized and orchestrated with Docker Compose for MVP"). Simple single-host deployment without Kubernetes complexity.
- **Topology**: single `docker-compose.yml` on an internal Docker network. External exposure is limited to operator/API ports and channel listener ports, optionally behind a reverse proxy for TLS termination (see [Architecture Draft](architecture.md#initial-deployment-shape)).

## Observability Stack

- **Role**: centralized collection of logs, metrics, and traces from all services. Supports auditability requirements ([FR-09](tech-requirements.md)) and operational reliability targets.
- **Components**: structured logging aggregation, metrics collection, and distributed tracing. Specific tooling (e.g. Prometheus, Grafana, Loki) is not yet prescribed — this section captures the role, not the implementation.
- **Connections**: all services emit structured logs and health signals. Core server and modules expose health/metrics endpoints. The observability stack scrapes/collects from all containers.

## Service Communication Summary

| From | To | Protocol | Purpose |
|---|---|---|---|
| Core Server | RabbitMQ | AMQP | Module coordination, RPC, events |
| Channel Modules | RabbitMQ | AMQP | Profile management RPC, event publishing |
| Translator Modules | RabbitMQ | AMQP | Translation coordination |
| Implant Providers | RabbitMQ | AMQP | Build coordination |
| Channel Modules | Core Server | HTTP | Implant sync (`POST /api/channel/sync`) |
| Core Server | MongoDB | MongoDB wire protocol | State persistence, audit logs |
| Core Server | SeaweedFS | HTTP (S3-compatible) | Artifact storage and retrieval |
| Implant Providers | SeaweedFS | HTTP (S3-compatible) | Artifact upload |
| All services | Observability | Structured logs / metrics | Monitoring and audit |
