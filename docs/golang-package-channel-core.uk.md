# vibe-c2-golang-channel-core

Репозиторій: `https://github.com/vibe-c2/vibe-c2-golang-channel-core`

## Встановлення

```bash
go get github.com/vibe-c2/vibe-c2-golang-channel-core@latest
```

## Призначення

- багаторазовий SDK середовища виконання каналів для авторів модулів
- абстракція транспортного конверта (обробка `id` + `encrypted_data`)
- примітиви моделі профілів, їх парсингу та валідації
- sync-клієнт до точки доступу C2 (`POST /api/channel/sync`)
- каркас управлінського RPC для операцій з профілями

## Поточний стан

- включає об'єктно-орієнтовані трансформації
- інтегровано в канальні модулі: `vibe-c2-http-channel`, `vibe-c2-telegram-channel`
