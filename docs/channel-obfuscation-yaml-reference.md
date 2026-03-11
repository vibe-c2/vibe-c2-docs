# Obfuscation Profile YAML Reference

This page defines the canonical YAML format for channel obfuscation profiles.

## Rule

- **One YAML file = one profile**.
- Multi-profile arrays/wrappers in a single file are not allowed in example/profile repos.
- There is **no default profile** behavior.

## Required Fields

```yaml
profile_id: profile-http-body
channel_type: http
enabled: true
priority: 100
mapping:
  id: body:id
  encrypted_data: body:encrypted_data
```

Required keys:

- `profile_id`
- `channel_type`
- `enabled`
- `priority`
- `mapping.id`
- `mapping.encrypted_data`

Optional:

- `mapping.profile_id` (hint mapping)

## Mapping reference format

`mapping.*` values use reference format:

- `body:<field>`
- `header:<name>`
- `query:<name>`
- `cookie:<name>`

Examples:

- `id: body:id`
- `encrypted_data: header:X-Payload`
- `id: query:agent`

## Transform pipeline syntax

Transforms can be appended with `|`:

- `|base64`
- `|base64url`

Example:

```yaml
mapping:
  id: body:id|base64
  encrypted_data: body:encrypted_data|base64
```

Behavior:

- inbound: channel decodes using listed transforms
- outbound: channel encodes using same transforms

## Hint-routed profile pattern

Primary profile:

```yaml
profile_id: p1
channel_type: http
enabled: true
priority: 200
mapping:
  profile_id: body:profile_id
  id: body:id_field
  encrypted_data: body:blob_field
```

Secondary profile (separate file):

```yaml
profile_id: p2
channel_type: http
enabled: true
priority: 150
mapping:
  profile_id: body:profile_id
  id: body:id2
  encrypted_data: body:blob2
```

## Matching model

- If `profile_id` hint is present and valid, use matching profile.
- If hint is absent/invalid, brute-force all enabled profiles using matching strategy.
- If nothing matches, reject request as unmatched profile.

## Validation constraints

For an enabled profile set in one channel scope:

- no overlapping enabled `mapping.profile_id` hint keys
- no overlapping enabled mapping shapes (`mapping.id` + `mapping.encrypted_data`)
- enabled profiles should have hint mapping (`mapping.profile_id`) where possible to reduce ambiguity
