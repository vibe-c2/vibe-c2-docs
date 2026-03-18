# Створіть власний канал за 15 хвилин

Цей посібник показує найкоротший шлях до створення власного модуля каналу з використанням:

- `vibe-c2-golang-protocol`
- `vibe-c2-golang-channel-core`

## 1) Ініціалізація модуля

```bash
mkdir my-channel && cd my-channel
go mod init github.com/you/my-channel
go get github.com/vibe-c2/vibe-c2-golang-channel-core@v0.3.0
```

## 2) Реалізація транспортної обгортки

Ваш транспортний адаптер повинен лише задовольняти інтерфейс `TransportEnvelope`:

- `SourceKey()`
- `GetField(location,key)`
- `SetField(location,key,value)`

## 3) Завантаження профілів

Використовуйте `profile.ParseYAMLProfiles(...)` з channel-core для завантаження набору YAML-профілів.

## 4) Визначення профілю та запуск рантайму

Потік для кожного вхідного повідомлення:

1. Виявити підказку (`profile_id`) з транспорту, якщо присутня.
2. `matcher.Resolve(ctx, hint, profiles)`
3. Витягти `id` + `encrypted_data` за допомогою визначених посилань зіставлення.
4. `runtime.HandleWithProfile(ctx, envelope, channelID, resolvedProfile)`
5. Повернути вихідні зіставлені значення через транспорт.

## 5) Зберігайте простоту

Ваш власний модуль повинен зосереджуватися лише на логіці, специфічній для транспорту:

- де розташовані поля
- як передається запит/відповідь
- делегування рантайму до channel-core для канонічного потоку

Ось основна ідея: розробка каналів з мінімальним шаблонним кодом для спільноти.
