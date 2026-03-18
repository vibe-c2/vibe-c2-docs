# vibe-c2-telegram-channel

Репозиторій: `https://github.com/vibe-c2/vibe-c2-telegram-channel`

## Встановлення

```bash
go get github.com/vibe-c2/vibe-c2-telegram-channel@v0.2.0
```

## Конфігурація

Поля `configs/channel.example.yaml`:

- `channel_id`
- `bot_token`
- `c2_sync_base_url`
- `profiles_file`
- `poll_timeout_seconds`

`profiles_file` вказує на YAML-файл профілю (приклад: `configs/profiles.example.yaml`).

## Формат повідомлень (v0.1+)

Вхідний текст Telegram до бота:

```text
p:<profile-id>
id:<id>
<encrypted_data>
```

або (без підказки):

```text
id:<id>
<encrypted_data>
```

Вихідна відповідь у чат:

```text
id:<outbound-id>
<outbound-encrypted_data>
```

## Швидкий тестовий потік

1. Запустіть модуль:

```bash
go run ./cmd/telegram-channel
```

2. У Telegram надішліть повідомлення боту:

```text
p:default-telegram
id:agent-1
ZW5jcnlwdGVkLXBheWxvYWQ=
```

3. Поведінка каналу:

- парсить текст до канонічних значень
- визначає профіль (`hint` -> перебір увімкнених профілів)
- викликає кінцеву точку синхронізації C2 через рантайм channel-core
- надсилає вихідну зашифровану відповідь назад у той самий чат

## Примітки

- Цей модуль використовується як стрес-тест екосистеми пакету channel-core.
- Поточний режим транспорту — long polling (`getUpdates`).
- Поточна версія: `v0.2.0`.
