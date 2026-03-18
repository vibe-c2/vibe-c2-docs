# Потік повідомлень каналу (ізольований)

Ця сторінка документує потік і відповідальності **лише на рівні каналу**.

Вона навмисно виключає внутрішні шари обробки ядра, такі як перекладачі та провайдери імплантів.

## Послідовність з точки зору каналу

```mermaid
sequenceDiagram
    autonumber
    participant I as Implant/Session
    participant CH as Channel Module
    participant CS as Core Server

    I->>CH: transport message (obfuscated id + encrypted_data)
    CH->>CH: resolve profile (hint -> brute-force enabled profiles)
    CH->>CH: de-obfuscate to canonical id + encrypted_data
    CH->>CS: POST /api/channel/sync (inbound.agent_message)
    CS-->>CH: HTTP 200 outbound.agent_message (encrypted_data)
    CH->>CH: re-obfuscate response by active profile
    CH-->>I: transport response (obfuscated id + encrypted_data)
```

## Відповідальності каналу

- Адаптація транспорту (HTTP/Telegram/тощо).
- Визначення та зіставлення профілю обфускації.
- Канонізація до `id` + `encrypted_data`.
- Передача канонічного запиту до кінцевої точки синхронізації ядра.
- Повернення відповіді ядра до імпланту/сесії у транспортній формі.

## Межі каналу

- Канал **не** розшифровує корисне навантаження у відкритий текст.
- Канал **не** виконує бізнес-логіку ядра.
- Канал **не** володіє семантикою перекладача/провайдера імплантів.
