# Приклади профілів обфускації

Профілі обфускації контролюють, як канонічні поля повідомлень C2 (`id` та `encrypted_data`) розміщуються, іменуються та кодуються у транспорті каналу. Це YAML-файли, що відображають канонічні поля у специфічні для каналу місця (заголовки, тіло, query-параметри, cookies, поля повідомлень) і опціонально застосовують оборотні ланцюги трансформацій. Ця сторінка — самодостатній покроковий огляд: кожна концепція вводиться через повний, робочий профіль.

Архітектуру та поведінку під час виконання див. у [Профілі обфускації каналів](channel-obfuscation-profiles.md).
Деталі схеми на рівні полів див. у [YAML-довідник](channel-obfuscation-yaml-reference.md).

---

## Основні концепції через приклади

Кожен приклад будується на попередньому. Усі приклади використовують HTTP-канал, якщо не зазначено інше.

### 1. Мінімальний профіль — поля body, без трансформацій

Найпростіший робочий профіль. І `id`, і `encrypted_data` передаються як іменовані JSON-поля body без кодування.

```yaml
# Імплант відправляє: POST /sync  {"agent_id": "<id>", "payload": "<encrypted_data>"}
# Канал повертає: {"payload": "<encrypted_data>"}

profile_id: 1
profile_label: http-body-plain
enabled: true
action:
  type: sync              # стандартна дія — декодування, виклик C2, кодування відповіді
mapping:
  id:
    target:
      location: body      # простір імен розташування, визначений каналом
      key: agent_id       # ім'я JSON-поля для цього значення
  encrypted_data_in:
    target:
      location: body
      key: payload
  encrypted_data_out:
    target:
      location: body
      key: payload
```

**Що відбувається під час виконання:**

- **Вхідний** — канал читає `agent_id` з тіла запиту як `id`, читає `payload` як `encrypted_data`. Пересилає канонічне повідомлення до C2.
- **Вихідний** — канал бере `encrypted_data` з відповіді C2, записує у тіло відповіді як `payload`.

!!! note "Ключовий висновок"
    Профіль потребує як мінімум: `profile_id`, `enabled`, `action` та відображення для `id`, `encrypted_data_in` і `encrypted_data_out`.

---

### 2. Додавання однієї трансформації — base64

Трансформації формують дані між транспортним форматом (що імплант відправляє/отримує) та канонічним форматом (що канал пересилає до C2). Тут імплант кодує payload у base64 перед відправкою.

```yaml
# Імплант відправляє: POST /sync  {"sid": "<id>", "data": "<base64(encrypted_data)>"}
# Канал повертає: {"data": "<base64(encrypted_data)>"}

profile_id: 2
profile_label: http-body-b64
enabled: true
action:
  type: sync
mapping:
  id:
    target:
      location: body
      key: sid
  encrypted_data_in:
    target:
      location: body
      key: data
    transform:
      - type: base64        # канал декодує base64 на вході
  encrypted_data_out:
    target:
      location: body
      key: data
    transform:
      - type: base64        # канал кодує base64 на виході
```

**Що відбувається під час виконання:**

- **Вхідний** — канал читає поле `data`, декодує base64 для отримання канонічного `encrypted_data`.
- **Вихідний** — канал кодує канонічний `encrypted_data` у base64, записує у поле `data`.

!!! note "Ключовий висновок"
    Трансформації у `transform[]` застосовуються **на виході зверху вниз** (кодування), **на вході знизу вгору** (декодування). З однією трансформацією напрямок ще не має значення — це зміниться у наступних прикладах.

---

### 3. Різне розміщення полів — header + body

Поля не обов'язково мають бути в одному місці. Тут `id` передається в HTTP-заголовку, а `encrypted_data` залишається в тілі.

```yaml
# Імплант відправляє: POST /api/data  Header "X-Request-ID: <id>"  Body {"data": "<encrypted_data>"}
# Канал повертає: {"data": "<encrypted_data>"}

profile_id: 3
profile_label: http-header-body
enabled: true
action:
  type: sync
mapping:
  id:
    target:
      location: header     # id — це HTTP-заголовок
      key: X-Request-ID
  encrypted_data_in:
    target:
      location: body
      key: data
  encrypted_data_out:
    target:
      location: body
      key: data
```

**Що відбувається під час виконання:**

- **Вхідний** — канал читає `id` із заголовка `X-Request-ID`, читає `encrypted_data` з поля body `data`.
- **Вихідний** — лише тіло відповіді; вихідний потік ніколи не несе `id`.

!!! note "Ключовий висновок"
    `target.location` — це простір імен, визначений каналом. HTTP-канал підтримує `header`, `body`, `query`, `cookie`. Кожен канал визначає власний набір.

---

### 4. Ланцюги трансформацій — порядок має значення

Коли кілька трансформацій з'єднані в ланцюг, порядок є критичним. На виході застосовується зверху вниз; на вході — у зворотному порядку (знизу вгору).

```yaml
# Імплант відправляє id як: base64url(prefix("agent:", <id>))
# Приклад: канонічний id "abc123" → з префіксом "agent:abc123" → base64url "YWdlbnQ6YWJjMTIz"

profile_id: 4
profile_label: http-chain-demo
enabled: true
action:
  type: sync
mapping:
  id:
    target:
      location: header
      key: X-Session
    transform:
      - type: prefix         # крок 1 вихідний: додати "agent:"
        value: "agent:"
      - type: base64url      # крок 2 вихідний: base64url-кодування результату
  encrypted_data_in:
    target:
      location: body
      key: blob
    transform:
      - type: base64
  encrypted_data_out:
    target:
      location: body
      key: blob
    transform:
      - type: base64
```

**Що відбувається під час виконання:**

- **Вихідний** (кодування `id` для транспорту):
    1. `prefix` → `agent:abc123`
    2. `base64url` → `YWdlbnQ6YWJjMTIz`
    3. Записується в заголовок `X-Session`
- **Вхідний** (декодування `id` з транспорту):
    1. Читає заголовок `X-Session`: `YWdlbnQ6YWJjMTIz`
    2. `base64url` декодування → `agent:abc123`
    3. `prefix` декодування (видалення `agent:`) → `abc123`

!!! note "Ключовий висновок"
    Думайте про трансформації як про композицію функцій. Вихід: `T2(T1(значення))`. Вхід: `T1⁻¹(T2⁻¹(отримане))`. Завжди перелічуйте трансформації у порядку вихідного (кодування) напрямку.

---

### 5. Підказка профілю для швидкого зіставлення

Коли канал має кілька увімкнених профілів, він повинен визначити, який з них застосовується до кожного запиту. Запис `profile_id` у mapping розміщує підказку в транспорті, щоб канал міг пропустити перебір.

```yaml
# Імплант відправляє: Header "X-Profile: p:5"  (підказка для profile_id 5)

profile_id: 5
profile_label: http-with-hint
enabled: true
action:
  type: sync
mapping:
  profile_id:                # опціональне відображення підказки
    target:
      location: header
      key: X-Profile
    transform:
      - type: prefix
        value: "p:"         # імплант надсилає "p:5", канал видаляє префікс і отримує "5"
  id:
    target:
      location: header
      key: X-Agent-ID
  encrypted_data_in:
    target:
      location: body
      key: data
    transform:
      - type: base64
  encrypted_data_out:
    target:
      location: body
      key: data
    transform:
      - type: base64
```

**Що відбувається під час виконання:**

- **Вхідний** — канал читає заголовок `X-Profile`, видаляє префікс `p:`, отримує `5`. Шукає профіль з `profile_id: 5` напряму — без перебору.
- Без підказки канал перебирав би кожен увімкнений профіль у порядку частоти, поки один не декодується успішно.

!!! note "Ключовий висновок"
    Відображення `profile_id` є опціональним, але рекомендованим, коли співіснують кілька профілів. Це забезпечує O(1) вибір профілю замість ітерації кандидатів.

---

### 6. Композитний вхідний — префікс довжини

Іноді `id` та `encrypted_data` конкатенуються в одне транспортне значення. `composite_in` замінює окремі відображення `id` + `encrypted_data_in`. Роздільник `length_prefix` бере перші N байтів як `id`.

```yaml
# Імплант відправляє: POST /sync  Body — base64(16-байт-id + encrypted_data)

profile_id: 6
profile_label: http-composite-length
enabled: true
action:
  type: sync
mapping:
  composite_in:              # замінює id + encrypted_data_in
    separator:
      type: length_prefix
      id_length: 16          # перші 16 байтів — це id
    target:
      location: body
    transform:
      - type: base64         # спочатку декодувати base64, потім розділити
  encrypted_data_out:
    target:
      location: body
    transform:
      - type: base64
```

**Що відбувається під час виконання:**

- **Вхідний** — канал декодує base64 з тіла, бере перші 16 байтів як `id`, решту як `encrypted_data`.
- **Вихідний** — канал кодує `encrypted_data` у base64 і записує в body (без `id` на виході).

!!! note "Ключовий висновок"
    `composite_in` корисний, коли імплант пакує обидва поля в один блоб. Зверніть увагу, що `target.key` опущений — відображення спрямоване на все тіло.

---

### 7. Композитний вхідний — роздільник

Альтернатива префіксу довжини: розділення за символом-роздільником.

```yaml
# Імплант відправляє: POST /sync  Body — base64(<id>||<encrypted_data>)
# "||" розділяє два поля

profile_id: 7
profile_label: http-composite-delim
enabled: true
action:
  type: sync
mapping:
  composite_in:
    separator:
      type: delimiter
      value: "||"            # розділити за "||"
    target:
      location: body
    transform:
      - type: base64
  encrypted_data_out:
    target:
      location: body
    transform:
      - type: base64
```

**Що відбувається під час виконання:**

- **Вхідний** — канал декодує base64 з body, розділяє за першим входженням `||`. Ліва частина — `id`, права — `encrypted_data`.
- **Вихідний** — так само, як у прикладі з префіксом довжини: тільки `encrypted_data`.

---

### 8. Користувацька дія — redirect

Користувацькі дії змінюють поведінку каналу після декодування. `redirect` відправляє імплант до альтернативної інфраструктури замість локальної обробки.

```yaml
profile_id: 8
profile_label: http-redirect-edge
enabled: true
action:
  type: redirect             # користувацька дія (визначена каналом)
  params:                    # параметри, специфічні для каналу
    status_code: 302
    location: https://edge.example.net/tunnel
    target_channel: edge-http
mapping:
  id:
    target:
      location: query
      key: rid
  encrypted_data_in:
    target:
      location: query
      key: blob
```

**Що відбувається під час виконання:**

- **Вхідний** — канал декодує `id` та `encrypted_data` з query-параметрів як зазвичай, але замість виклику C2 sync повертає HTTP 302 redirect на edge URL.
- Блок `params` повністю визначається каналом — `redirect` не є стандартною дією.
- `encrypted_data_out` не вказано, оскільки дія redirect не повертає дані імпланту.

---

### 9. Користувацька дія — proxy_pass

`proxy_pass` пересилає декодований запит на upstream-сервер прозоро.

```yaml
profile_id: 9
profile_label: http-proxy-upstream
enabled: true
action:
  type: proxy_pass
  params:
    upstream: https://upstream.example.net/c2
mapping:
  id:
    target:
      location: header
      key: X-Agent-ID
  encrypted_data_in:
    target:
      location: body
  encrypted_data_out:
    target:
      location: body
```

**Що відбувається під час виконання:**

- **Вхідний** — канал декодує профіль, потім пересилає канонічне повідомлення на upstream URL замість локального C2 sync endpoint.
- Зверніть увагу: `encrypted_data_in` та `encrypted_data_out` не мають `key` — вони спрямовані на сире тіло.

---

## Каталог каналів

Готові до використання профілі для типових сценаріїв. Копіюйте, змінюйте `profile_id` та розгортайте.

### HTTP-канал

#### Простий body sync (стиль JSON API)

Виглядає як звичайний JSON API. Хороший варіант за замовчуванням для розробки та тестування.

```yaml
profile_id: 100
profile_label: http-json-api
enabled: true
action:
  type: sync
mapping:
  profile_id:
    target:
      location: header
      key: X-Api-Version
    transform:
      - type: prefix
        value: "v"           # імплант надсилає "v100", канал витягує "100"
  id:
    target:
      location: body
      key: request_id
  encrypted_data_in:
    target:
      location: body
      key: payload
    transform:
      - type: base64
  encrypted_data_out:
    target:
      location: body
      key: payload
    transform:
      - type: base64
```

#### Id у заголовку + payload у body (маскування під CDN/proxy)

`id` у стандартному заголовку, payload у body. Маскується під CDN/proxy-трафік.

```yaml
profile_id: 101
profile_label: http-cdn-blend
enabled: true
action:
  type: sync
mapping:
  profile_id:
    target:
      location: header
      key: X-Correlation-ID
    transform:
      - type: prefix
        value: "cor-"
  id:
    target:
      location: header
      key: X-Request-ID
    transform:
      - type: base64url
  encrypted_data_in:
    target:
      location: body
      key: data
    transform:
      - type: base64
  encrypted_data_out:
    target:
      location: body
      key: data
    transform:
      - type: base64
```

#### Id у cookie + payload у body

`id` передається у cookie — маскується під типовий трафік веб-застосунку.

```yaml
profile_id: 102
profile_label: http-cookie-id
enabled: true
action:
  type: sync
mapping:
  id:
    target:
      location: cookie
      key: session_token
    transform:
      - type: base64url      # безпечне для cookie кодування
  encrypted_data_in:
    target:
      location: body
      key: form_data
    transform:
      - type: base64
  encrypted_data_out:
    target:
      location: body
      key: form_data
    transform:
      - type: base64
```

#### Все у query-рядку (GET-only beacon)

Вхідні дані через query-параметри — працює з GET-запитами, корисно для легких beacon'ів. Відповідь повертається у body.

```yaml
profile_id: 103
profile_label: http-get-beacon
enabled: true
action:
  type: sync
mapping:
  profile_id:
    target:
      location: query
      key: v
  id:
    target:
      location: query
      key: uid
    transform:
      - type: base64url      # URL-безпечне кодування для query-значень
  encrypted_data_in:
    target:
      location: query
      key: q
    transform:
      - type: base64url
      - type: url_encode     # подвійний захист: base64url потім url_encode
  encrypted_data_out:
    target:
      location: body
      key: q
    transform:
      - type: base64url
```

#### Змішане розміщення — header + query + body

Розподіл полів по всіх доступних місцях.

```yaml
profile_id: 104
profile_label: http-mixed-placement
enabled: true
action:
  type: sync
mapping:
  profile_id:
    target:
      location: header
      key: X-Api-Key
    transform:
      - type: prefix
        value: "key-"
  id:
    target:
      location: query
      key: trace
    transform:
      - type: base64url
  encrypted_data_in:
    target:
      location: body
      key: content
    transform:
      - type: base64
  encrypted_data_out:
    target:
      location: body
      key: content
    transform:
      - type: base64
```

#### Композитне body з base64 та префіксом

Компактний формат: одне значення body несе обидва поля з маркерним префіксом.

```yaml
profile_id: 105
profile_label: http-composite-prefixed
enabled: true
action:
  type: sync
mapping:
  composite_in:
    separator:
      type: length_prefix
      id_length: 16
    target:
      location: body
    transform:
      - type: prefix
        value: "msg:"        # видалити "msg:", потім декодувати base64, потім розділити
      - type: base64
  encrypted_data_out:
    target:
      location: body
    transform:
      - type: prefix
        value: "msg:"
      - type: base64
```

### Telegram-канал

Telegram-канал використовує `message` як основний простір імен розташування.

#### Простий message sync

Простий транспорт на основі повідомлень з іменованими полями.

```yaml
profile_id: 200
profile_label: telegram-simple
enabled: true
action:
  type: sync
mapping:
  id:
    target:
      location: message
      key: id
  encrypted_data_in:
    target:
      location: message
      key: payload
  encrypted_data_out:
    target:
      location: message
      key: payload
```

#### Повідомлення з префіксними маркерами та base64

Поля несуть префіксні маркери для візуальної структури, payload'и кодуються у base64.

```yaml
profile_id: 201
profile_label: telegram-marked-b64
enabled: true
action:
  type: sync
mapping:
  profile_id:
    target:
      location: message
      key: profile
    transform:
      - type: prefix
        value: "p:"
  id:
    target:
      location: message
      key: id
    transform:
      - type: prefix
        value: "id:"
      - type: base64url
  encrypted_data_in:
    target:
      location: message
      key: data
    transform:
      - type: base64
  encrypted_data_out:
    target:
      location: message
      key: data
    transform:
      - type: base64
```

---

## Швидкий довідник

| Профіль | Дія | Розташування | Трансформації |
|---------|-----|-------------|---------------|
| http-json-api | sync | header, body | prefix, base64 |
| http-cdn-blend | sync | header, body | prefix, base64url, base64 |
| http-cookie-id | sync | cookie, body | base64url, base64 |
| http-get-beacon | sync | query | base64url, url_encode |
| http-mixed-placement | sync | header, query, body | prefix, base64url, base64 |
| http-composite-prefixed | sync | body | prefix, base64 |
| http-redirect-edge | redirect | query | — |
| http-proxy-upstream | proxy_pass | header, body | — |
| telegram-simple | sync | message | — |
| telegram-marked-b64 | sync | message | prefix, base64url, base64 |
