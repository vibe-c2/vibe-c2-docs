# vibe-c2-telegram-channel

Repository: `https://github.com/vibe-c2/vibe-c2-telegram-channel`

## Install

```bash
go get github.com/vibe-c2/vibe-c2-telegram-channel@v0.2.0
```

## Config

`configs/channel.example.yaml` fields:

- `channel_id`
- `bot_token`
- `c2_sync_base_url`
- `profiles_file`
- `poll_timeout_seconds`

`profiles_file` points to profile YAML (example: `configs/profiles.example.yaml`).

## Message Format (v0.1+)

Inbound Telegram text to bot:

```text
p:<profile-id>
id:<id>
<encrypted_data>
```

or (without hint):

```text
id:<id>
<encrypted_data>
```

Outbound response to chat:

```text
id:<outbound-id>
<outbound-encrypted_data>
```

## Quick Test Flow

1. Start module:

```bash
go run ./cmd/telegram-channel
```

2. In Telegram, send bot message:

```text
p:default-telegram
id:agent-1
ZW5jcnlwdGVkLXBheWxvYWQ=
```

3. Channel behavior:

- parses text to canonical values
- resolves profile (`hint` -> brute-force enabled profiles)
- calls C2 sync endpoint via channel-core runtime
- sends outbound encrypted response back to same chat

## Notes

- This module is used as a stress test of channel-core package ecosystem.
- Current transport mode is long polling (`getUpdates`).
- Current release: `v0.2.0`.
