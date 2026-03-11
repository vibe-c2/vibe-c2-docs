# ADR-0001: Golang Channel Core Foundation Package Ecosystem

## Status
Accepted

## Context

Vibe C2 is community-centered and aims to let anyone vibe-code modules and vibe-deploy infrastructure.

Without a reusable SDK foundation, every new channel implementation must rebuild:
- canonical message handling
- obfuscation profile parsing/matching
- profile validation/conflict checks
- sync client behavior (timeouts/retries)
- management interfaces

This slows contributors and creates inconsistent behavior across channels.

The system also has specific constraints:
- channel modules must remain plaintext-blind
- implant/session <-> C2 communication is app-level encrypted
- channel<->C2 data-plane uses HTTP sync (`POST /api/channel/sync`)
- obfuscation profile management remains channel-controlled and exposed to C2 via RabbitMQ RPC

## Decision

Adopt a package ecosystem with clear separation of concerns:

1. `vibe-c2-golang-protocol` (shared contracts)
   - canonical message structs (`inbound.agent_message`, `outbound.agent_message`)
   - versioning and validation helpers
   - shared status/error codes

2. `vibe-c2-golang-channel-core` (channel runtime SDK)
   - runtime pipeline: transport -> de-obfuscate -> canonicalize -> sync -> re-obfuscate -> transport
   - profile engine (YAML parsing, semantic validation, overlap detection)
   - profile selection strategy (`profile_id` hint first, cache/frequency optimization, then brute-force enabled profiles)
   - sync client for `POST /api/channel/sync`
   - RabbitMQ RPC management surface for profile operations
   - telemetry hooks and typed error model

3. Optional future package: `vibe-c2-golang-channel-adapters`
   - reusable transport adapters for common channels

### Core implementation rules

- Channels never decrypt `encrypted_data`.
- Canonical channel-core contract remains `id` + `encrypted_data`.
- Obfuscation is transport shaping, not cryptographic replacement.
- Profile selection must not depend on a default profile; use hint-first then brute-force enabled profiles.
- Profile create/update operations must reject ambiguous overlap.

## Consequences

### Positive

- Dramatically lower barrier for community contributors.
- Consistent behavior and error semantics across channel modules.
- Reusable, testable components reduce duplicated logic.
- Easier hardening and observability across all channels.

### Negative / Costs

- Upfront design and package maintenance overhead.
- Need to keep protocol and channel-core versions compatible.
- Requires clear contribution guidelines and test discipline.

### Tradeoffs

- More structure vs. faster ad-hoc coding.
- Initial complexity yields long-term scalability and contributor velocity.

## Implementation Notes

Primary rollout phases:
1. Protocol package contracts and validation baseline.
2. Channel-core interfaces and skeleton.
3. Profile engine + matcher + brute-force strategy.
4. Sync client + management RPC.
5. Hardening, benchmarks, and examples.
