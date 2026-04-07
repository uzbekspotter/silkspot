# Silkspot — handoff notes (upload / fleet context)

Краткая памятка для продолжения работы в **другой сессии чата, дома и на работе** (один контекст на двух машинах). Это **не CHANGELOG**: сюда — коротко, только заметные правки по продукту.

**Отдельно:** чеклист по безопасности (когда дойдёшь руками) — [`docs/SECURITY_CHECKLIST.md`](./SECURITY_CHECKLIST.md).

## Для агента / новой сессии (другой ПК, работа)

1. **После заметной работы** по продукту (страницы, UX, API, БД, важные фиксы) — в конце задачи **дописать в начало секции «Последнее»** один–три коротких пункта: **дата и время** (`YYYY-MM-DD HH:mm`, локальное время), суть, файлы, хэш коммита. Так следующий чат или машина попадут в контекст без догадок.
2. **Перед крупной задачей** — прочитать «Последнее» ниже (и при необходимости связанные файлы).

В Cursor это закреплено правилом `.cursor/rules/session-handoff.mdc` (`alwaysApply`).

## Последнее (сегодня / этот чат)

*Формат записи: в начале пункта — **`YYYY-MM-DD HH:mm`** (локальное время, время можно взять из `git show -s --format=%ci <hash>`). Если коммита ещё нет — поставить текущие дату/время вручную.*

- **2026-04-07 18:02** — **Community/Stats/About: усилена локальная тень (+~15%):** точечные `box-shadow` на ключевых секциях этих страниц увеличены с `rgba(..., 0.08)` до `rgba(..., 0.10)` для более заметного отделения от backdrop. Файлы: `src/components/CommunityPage.tsx`, `src/components/StatsPage.tsx`, `src/components/AboutPage.tsx`.

- **2026-04-07 01:15** — **Community/Stats/About: явные тени на ключевых секциях:** добавлены мягкие `box-shadow` на верхние секции и главный about-панель, потому что часть блоков не использует базовый `.card` и визуально «плоская» на backdrop. Файлы: `src/components/CommunityPage.tsx`, `src/components/StatsPage.tsx`, `src/components/AboutPage.tsx`. Коммит: `39ac537`.

- **2026-04-07 01:03** — **Карточки отделены от backdrop мягкой тенью:** в `src/index.css` для `.card` и `.card-gray` добавлен лёгкий базовый `box-shadow`; hover-тень усилена немного, чтобы «окошки» читались объёмнее без тяжёлого UI.

- **2026-04-07 00:55** — **Окантовка карточек по всему сайту усилена:** базовые стили `.card` и `.card-gray` в `src/index.css` переведены на более тёмный бордер (`#64748b`, hover `#475569`) для лучшей читаемости «окон» на тёмном backdrop.

- **2026-04-07 00:20** — **Community → Spotting Locations:** на странице `Community (Forums)` добавлен блок со ссылкой на гайд по TAS/UTTT (Spotterguide), открывается в новой вкладке. Файл: `src/components/CommunityPage.tsx`. Коммит: `c4f19a5`.

- **2026-04-06 22:00** — **Handoff «Последнее»:** у пунктов в начале секции и в архиве ниже разделителя добавлены префиксы **даты и времени** (`YYYY-MM-DD HH:mm` где известно из `git`); в инструкции для агента и под заголовком «Последнее» зафиксирован формат записи. Правило Cursor: `.cursor/rules/session-handoff.mdc`.

- **2026-04-06 21:53** — **Moderation Center — Review Tools на всю ширину `site-w`:** `PhotoReviewTools` вынесен **над** сеткой очередь + детали; превью на полную ширину контейнера. Внутри инструмента боковая панель вкладок перенесена **под** превью; Reference и Histogram — адаптивные сетки колонок. Файлы: `src/components/AdminPage.tsx`, `src/components/PhotoReviewTools.tsx`. Коммит: `45bc1cf`.

- **2026-04-06 21:31** — **Профиль → галерея:** превью с **`width_px` / `height_px`** — `aspect-ratio` как у оригинала, **`object-contain`** (без кропа). Запрос фото теперь выбирает размеры; вкладка **Stats**: график загрузок по месяцам с подписями месяцев, **Top Airports**, **Photos by category**, блок **Engagement** (суммарные views/likes, средние на фото). Файл: `src/components/ProfilePage.tsx`. Коммит: `256d52b`.
- **2026-04-06 21:31** — **Upload:** переключатель **Single photo** / **Batch** (до 20 файлов); в single — один файл, `multiple` выкл., при переключении на single лишние превью сбрасываются. Для батча ≥2 кадров — панель **Batch quick fill**: «Apply global shot details to all» и «Copy first card to all»; при совпадении аэропорта и даты съёмки на всех — подсветка «Same airport & shot date». Файл: `src/components/UploadPage.tsx`. Коммит: `256d52b`.

- **2026-04-06 16:25** — **Контраст текста на тёмном backdrop:** осветлены подписи/заголовки, которые лежат прямо на `SkyWaveBackdrop` без светлой подложки (`Map`: хедер/подзаголовок; `About`: верхний заголовок; `Explore`: блок `Spotters today`). Файлы: `src/components/MapPage.tsx`, `src/components/AboutPage.tsx`, `src/components/ExplorePage.tsx`. Коммит: `2b2f7cd`.

- **2026-04-06 12:29** — **Аудит ручной верификации fast-track:** добавлена миграция `supabase/migrations/024_external_verification_audit_log.sql` с таблицей `external_verification_events` (old/new статус, кто изменил, note, timestamp) + RLS/policies только для admin. Коммит: `4e020b9`.
- **2026-04-06 12:29** — **Admin User Management показывает историю изменений верификации:** при включении/выключении fast-track теперь пишется событие в audit-лог; в строке пользователя выводится `Last change: enabled/disabled by ...`. Файл: `src/components/AdminPage.tsx`. Коммит: `4e020b9`.

- **2026-04-06 12:27** — **Fast-track UX доведён до прозрачного контроля:** в `AdminPage` добавлены фильтры пользователей (`With JetPhotos/PlaneSpotters`, `Fast-track enabled/disabled`) и бейдж `Externally verified` в модерационной очереди/карточке фото. Файл: `src/components/AdminPage.tsx`. Коммит: `a477474`.
- **2026-04-06 12:27** — **Публичный бейдж доверенного автора:** в `ProfilePage` рядом с рангом показывается `Externally verified`, если аккаунт одобрен админом для fast-track. Файл: `src/components/ProfilePage.tsx`. Коммит: `a477474`.

- **2026-04-06 12:22** — **Ручная верификация внешних профилей для fast-track:** добавлена миграция `supabase/migrations/023_external_spotter_verification.sql` (`external_verified`, `external_verified_by`, `external_verified_at`, `external_verification_note` в `user_profiles`). В `Admin` → `User Management` добавлен переключатель fast-track и индикатор наличия ссылок JetPhotos/PlaneSpotters. Коммит: `7e15710`.
- **2026-04-06 12:22** — **Upload зависит от admin-верификации:** при `external_verified=true` новые фото пишутся сразу со статусом `APPROVED`, иначе остаются `PENDING`; текст экрана успешной отправки теперь показывает «published immediately» для verified-аккаунтов. Файл: `src/components/UploadPage.tsx`. Коммит: `7e15710`.
- **2026-04-06 12:22** — **Settings показывает readiness/статус верификации:** в блоке `Account` добавлен статус `External profile verification` и подсказка про trusted-ссылки (JetPhotos/PlaneSpotters) + необходимость одобрения админом. Файл: `src/components/SettingsPage.tsx`. Коммит: `7e15710`.

- **2026-04-01** — **Плоский UI без скруглений:** убраны скруглённые углы по всему сайту (карточки, кнопки, инпуты, бейджи, скроллбары и т.д.). **`src/index.css`:** в `@theme` все токены **`--radius-*`** и **`--radius`** → **`0`**; у классов `.card`, кнопок, полей, тегов, статусов, `.skeleton`, полос прокрутки — явный **`border-radius: 0`**; в конце файла — **`*, *::before, *::after { border-radius: 0 !important }`**, чтобы перекрыть Tailwind-классы `rounded-*` / `rounded-full` и инлайновые **`borderRadius`** в TSX. **`src/components/MapPage.tsx`:** у Leaflet попап и кнопки зума переопределялись своими правилами с **`!important`** — выставлено **`border-radius: 0`**; маркеры аэропортов на карте сделаны квадратными (вместо круга). Коммит: дописать после фиксации в git.

- **2026-04-02 11:35** — **Страница борта (`AircraftDetailPage`):** в шапке карточка «Latest upload» — превью последней **по дате загрузки на сайт** (`photos.created_at`) одобренной фото; подписи **On site** (заливка) и **Shot** (дата съёмки). Галерея и лайтбокс показывают обе даты. `App` передаёт `onPhotoClick` для открытия `PhotoDetailPage`. (См. также коммит `fc1e316` — кликабельность блоков на карточке фото.)

- **2026-04-02** — **Карточка фото — правка места/даты/категории:** владелец может после загрузки поправить аэропорт (IATA/ICAO из БД), дату съёмки и категорию (статусы `PENDING` / `APPROVED` / `REJECTED`). UI: `PhotoDetailPage` → блок «Correct shot details». Бэкенд: RPC `update_my_photo_shot_details` в миграции **`supabase/migrations/017_owner_photo_shot_metadata.sql`** — **нужно применить на проекте Supabase** (SQL Editor или `supabase db push`). Типы: `src/lib/database.types.ts`.

- **Handoff-процесс:** секция «Для агента / новая сессия» в этом файле + правило Cursor **`.cursor/rules/session-handoff.mdc`** (`alwaysApply`) — после заметной работы дописывать коротко в «Последнее», при крупной задаче читать «Последнее» сверху.

- **2026-04-05 11:59** — **Защита (памятка на потом):** добавлен [`docs/SECURITY_CHECKLIST.md`](./SECURITY_CHECKLIST.md) — шаги (2FA, RLS, presign/delete, домен в Supabase Auth). Коммит: `ce21ae3`.
- **2026-04-05 12:06** — **Explore → Primary sensor:** зелёные углы HUD масштабируются с рамкой фото (`container-type: size`, `cqmin`); 4:3 vs 16:9 по метаданным: `r >= 1.5` → `aspect-video`, иначе `aspect-[4/3]`. Обновление ленты каждые 90 с **в фоне** без полноэкранного «Loading…» (раньше выглядело как F5). Файл: `src/components/ExplorePage.tsx`. Коммит: `0187509`.
- **2026-04-05 02:55** — **Upload → Acceptance criteria:** блок критериев — 3 строки × 2 колонки, шире правая колонка, длинная строка с именем файла не обрезается (`min-w-0` / `flex-1 basis-0`, при необходимости горизонтальный скролл без полосы). Файл: `src/components/UploadPage.tsx`. Коммит: `37b7a77`.

---

- **PhotoDetailPage (карточка фото):** сделано единообразное отображение полей и кликабельность.
  - **Registration/Type** → переход в карточку самолёта (`aircraft-detail`)
  - **Airline** → переход в `Fleet`
  - **Airport** → переход в `Map` (если аэропорт не привязан — показываем `Not linked`, чтобы было понятно почему пусто)
  - Правые блоки (самолёт/оператор/аэропорт) тоже кликабельны (см. скрин с пометками 1/2/3).
  - Файлы: `src/components/PhotoDetailPage.tsx`, `src/App.tsx`
  - Коммит: `fc1e316`
- **Импорт аэропортов в Supabase:** добавлен/починен скрипт `scripts/import-ourairports.ts` (поддержка `SUPABASE_SECRET_KEY`, обработка конфликтов IATA).
  - Успешный запуск: `npm run import:airports` → `Done`
  - Загружено: `airports 52170/52170` + `556/556` (IATA-only), страны: `249`
  - Проверка: в таблице `airports` доступны `LED` / `ULLI` (через фильтр по `iata`/`icao`)
  - Коммиты: `dbf2784`, `82ddadd`, `d8f2863`, `db996c5`
- **Security:** `.env` перестали трекать в git; после алерта GitGuardian проведена ротация JWT ключей в Supabase, локальные ключи нужно держать только в `.env`/Vercel variables.
- **Map UX:** клик по аэропорту в `PhotoDetailPage` теперь открывает `Map` с фокусом/zoom на этот IATA; добавлен переключатель слоёв карты (`Light` / `Satellite` / `Dark`).
  - Файлы: `src/App.tsx`, `src/components/PhotoDetailPage.tsx`, `src/components/MapPage.tsx`
  - Коммит: `f41d6c4`
- **Map data source:** `MapPage` переведён с демо-массива на реальный запрос из Supabase (`airports` + агрегация approved photos из `photos`), fallback на demo оставлен.
  - Теперь новые аэропорты из загрузок (например `UGC`) появляются точками на карте при наличии записи в `airports`.
  - Коммит: `bdf01a6`
- **Platform Statistics UX:** основные карточки и рейтинги сделаны кликабельными (Overview cards, Spotter podium/list, Aircraft type rows).
  - Навигация: Photos → `Explore`, Spotters → `Community`/tab `Spotters`, Aircraft types → `Fleet`.
  - Коммит: `13fea0c`
- **Admin User Management:** изменения роли/ранга/бана больше не применяются мгновенно по одному клику — добавлен явный режим черновика и кнопка `Save` на строке пользователя.
  - Это снижает риск случайных изменений и делает фиксацию правок предсказуемой.
  - Коммит: `b105d43`
- **Upload mixed batch MVP:** добавлены per-photo overrides в карточке фото (`Airport IATA`, `Shot date`, `Category`).
  - При submit теперь используются эффективные значения per-photo (override → global fallback).
  - Валидация submit проверяет каждую фото-карточку: нельзя отправить, если для конкретного фото нет Airport/Date/Category.
  - Коммит: `5f0ea3e`
- **Upload UX polish:** для per-photo `Airport IATA` добавлены подсказки по 2+ буквам (IATA/city), а для дат добавлены 2 режима ввода: `Calendar` и `Manual` (как в карточке фото, так и в глобальном блоке Shot Details).
  - Коммит: `95b6ad8`
- **i18n-ready scaffold (EN-first):** добавлен базовый словарь `src/lib/i18n.ts` с локалями `en`, `ru`, `uz_lat`, `uz_cy` и helper `getUiText()`.
  - В `UploadPage` переключатели даты (`Calendar` / `Manual`) переведены на использование словаря, при этом фактический язык пока зафиксирован на английском (`getUiText('en')`).
  - Статус: локальные изменения, без отдельного коммита.
- **Profile avatar fix:** исправлен `proxyImageUrl()` в `src/lib/storage.ts`, чтобы через `/r2/...` проксировались не только `photos/...`, но и любые storage keys (`avatars/...`, `covers/...` и т.д.).
  - Симптом до фикса: в Navbar аватар был виден, а в шапке `Profile` — нет.
  - Статус: локальные изменения, без отдельного коммита.
- **Profile/Settings UX unification:** убран дублирующий modal `Edit Profile` из `ProfilePage`; кнопка `Edit Profile` теперь ведет в `Settings`, где остается единая точка редактирования профиля.
  - Обновлено: `src/components/ProfilePage.tsx`, `src/App.tsx`.
  - Статус: локальные изменения, без отдельного коммита.
- **Stats → Spotter profile navigation:** исправлен клик по споттерам на `Platform Statistics` (podium + table).
  - Раньше клик вел в `Community`; теперь открывается `Profile` выбранного споттера по `user_id`.
  - Добавлен callback `onOpenSpotter` в `StatsPage`, состояние `selectedProfileUserId` в `App`, и загрузка профиля/фото по `profileUserId` в `ProfilePage`.
  - Статус: локальные изменения, без отдельного коммита.
- **Upload crash hotfix:** исправлен runtime `ReferenceError: uiText is not defined` при выборе фото на странице Upload (per-photo date mode labels в `PhotoCard`).
  - Симптом: после выбора файлов страница ломалась/становилась пустой.
  - Файл: `src/components/UploadPage.tsx`.
- **Screener moderation workflow (MVP):** добавлена поддержка роли `screener` для доступа в `Moderation Center` без доступа к `User Management`.
  - `App`: роль `screener` добавлена в client role mapping и guard на страницу `admin`; пункт `Admin Panel` теперь виден для `admin|moderator|screener`.
  - `AdminPage`: текущая роль загружается из `user_profiles.role`; вкладка `User Management` показывается только `admin`; для screeners остаются moderation queue + stats.
  - В списке ролей User Management добавлен вариант `SCREENER` для назначения админом.
- **DB follow-up for screener role:** добавлена миграция `supabase/migrations/013_add_screener_role.sql`.
  - Добавляет enum value `SCREENER` в `user_role` и переопределяет `admin_set_user_role`.
  - В `AdminPage` добавлена подсказка в ошибке `invalid input value for enum user_role` с указанием запустить `013`.
  - Обновлен `src/lib/database.types.ts` (`UserRole` теперь включает `SCREENER`).
- **Telegram moderation alerts (optional):** добавлен Vercel endpoint `api/telegram-moderation.ts`.
  - Вызывается из Supabase **Database Webhook** на `INSERT` в `photos` (статус `PENDING`); шлёт сообщение в Telegram с ID фото и ссылкой на `/admin`.
  - Env на Vercel: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_IDS` (через запятую), `TELEGRAM_WEBHOOK_SECRET` (тот же секрет в заголовке webhook), опционально `TELEGRAM_APP_URL`.
  - См. комментарии в `.env.example`.

## Сделано (UploadPage)

- **`photosRef`** синхронизируется с `photos`; в **`triggerLookup`** при `notfound` (и при регистрации короче 3 символов) не сбрасываются airline/type, если одно валидное фото с тем же регом и на карточке уже есть данные (оператор/тип или manual).
- **Одно фото:** пустое поле **Aircraft Registration** справа заполняется регом с карточки и вызывается лукап.
- **Эффект при `notfound`:** подтягивает оператор/тип с карточки при совпадении регистрации (в т.ч. когда батч-лукап обновил карточку позже).
- **MSN:** синхронизация карточка ↔ блок **Optional details** (одно фото или совпадение регистрации с головной).
- **Ручные Airline/Type** в жёлтом блоке справа при одном фото пишут в `manualAirline` / `manualType` на карточке; с карточки панель обновляется через `updateField`.
- **`triggerLookup`** обёрнут в `useCallback`.

Основной файл: `src/components/UploadPage.tsx`.

## Возможные следующие шаги

- Явно синхронизировать **смену регистрации на карточке** с полем **Aircraft Registration** справа (если нужен сценарий «правлю только на карточке»).
- Прогнать UX с **несколькими фото** с разными регами — логика заточена под «головной» рег в панели и совпадение по `normRegKey`.
- Проверить, что **все загруженные фото получают `airport_id`** (если при загрузке выбран аэропорт, но на карточке пусто — значит в БД нет связи или airport не найден при резолве).

## Идеи на будущее (пока не делали — памятка)

- **Уведомления staff о новых фото на модерации (Telegram):** в репозитории уже есть `api/telegram-moderation.ts` — Vercel endpoint + env (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_IDS`, `TELEGRAM_WEBHOOK_SECRET`, опционально `TELEGRAM_APP_URL`). Подключение: Supabase **Database Webhook** на `INSERT` в `photos` со статусом `PENDING`, заголовок `Authorization: Bearer <секрет>`. Не email — сообщения в Telegram (личка или группа модераторов).
- **In-app уведомления:** таблица `notifications` в схеме есть; можно добавить создание записи при `PENDING`, бейдж в Navbar для `admin`/`screener`, страницу «уведомления» — без Telegram.
- **Push / PWA:** сейчас только responsive web (`viewport` + Tailwind breakpoints); отдельного PWA/manifest/service worker нет — при желании: установка на домашний экран + Web Push (сложнее, отдельная настройка подписок).
- **Мобильная версия:** это тот же сайт на телефоне; отдельного нативного приложения нет.
- **Мультиязычность:** задел `src/lib/i18n.ts` (EN-first); позже Uzbek (лат + кирилл), Russian, English — когда стабилизируют UI.
- **Редактирование данных ВС после загрузки:** сейчас MSN/двигатель/конфиг в основном на этапе upload; опционально форма «дополнить карточку самолёта» из профиля/карточки фото с ограничениями по правам.

## Связанные темы из переписки

- Fleet: hub (`home_hub_iata`), типы, миграции `009`–`011` (hub RPC, длина `home_hub_iata`, сиды типов).

*Файл можно править или удалить — это только для удобства продолжения диалога.*
