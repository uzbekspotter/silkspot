# 🚀 План запуска SkyGrid Pro

## Сценарий А: Vercel + Supabase

---

## ✅ ШАГ 1 — Supabase (база данных + хранилище фото)

**Время: ~20 минут**

### 1.1 Регистрация

1. Открой [https://supabase.com](https://supabase.com)
2. Нажми **Start your project** → войди через GitHub или email
3. Нажми **New project**
4. Заполни:
  - Name: `skygrid-pro`
  - Database Password: придумай надёжный пароль, **сохрани его**
  - Region: **Frankfurt (eu-central-1)**
5. Нажми **Create new project** — подожди 2 минуты

### 1.2 Запуск миграций (создание таблиц)

1. В левом меню Supabase: **SQL Editor**
2. Нажми **New query**
3. Открой файл `supabase/migrations/001_schema.sql` — скопируй всё, вставь, нажми **RUN**
4. Повтори для `002_rls.sql`
5. Повтори для `003_seed.sql`
6. Повтори для `004_aircraft_details.sql`

Если всё ок — увидишь "Success. No rows returned"

### 1.3 Настройка хранилища для фото

1. Левое меню: **Storage**
2. Нажми **New bucket**
3. Name: `photos`
4. **Public bucket**: включи ✅
5. Нажми **Create bucket**

### 1.4 Получить ключи

1. Левое меню: **Settings** → **API**
2. Скопируй:
  - **Project URL** (выглядит как `https://abcdefgh.supabase.co`)
  - **anon public** key (длинная строка `eyJ...`)

### 1.5 Создать .env файл

В папке `C:\WWW\skygrid-pro\` создай файл `.env`
(скопируй `.env.example` и переименуй):

```
VITE_SUPABASE_URL=https://ВАШ_ПРОЕКТ.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...ВАШ_КЛЮЧ
VITE_APP_URL=http://localhost:3000
```

### 1.6 Перезапусти dev-сервер

```
Ctrl+C
npm run dev
```

---

## ✅ ШАГ 2 — Проверить что логин работает

1. Открой [http://localhost:3000](http://localhost:3000)
2. Попробуй войти через email: `aziz@skygrid.uz` / `Skygrid2025!`

Если не работает — в Supabase: **Authentication** → **Users** → **Invite user**
Введи свой email, получишь письмо, установишь пароль.

---

## ✅ ШАГ 3 — Залить первые фото

1. Войди на сайт
2. Нажми **Upload** в navbar
3. Перетащи свои JPEG фото
4. Заполни данные, нажми Submit

Фото пока сохраняются в Supabase Storage.

---

## ✅ ШАГ 4 — Vercel (публичный сайт в интернете)

**Время: ~10 минут**

### 4.1 Загрузить код на GitHub

1. Открой [https://github.com](https://github.com) → New repository
2. Назови `skygrid-pro`, Private ✅
3. В папке проекта открой терминал:

```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/ВАШ_ЮЗЕР/skygrid-pro.git
git push -u origin main
```

### 4.2 Деплой на Vercel

1. Открой [https://vercel.com](https://vercel.com) → Sign up через GitHub
2. Нажми **Add New Project**
3. Выбери репозиторий `skygrid-pro`
4. В разделе **Environment Variables** добавь:
  - `VITE_SUPABASE_URL` = твой URL из шага 1.4
  - `VITE_SUPABASE_ANON_KEY` = твой ключ из шага 1.4
  - `VITE_APP_URL` = `https://skygrid-pro.vercel.app` (Vercel покажет адрес)
5. Нажми **Deploy**

Через 2-3 минуты сайт доступен по адресу `https://skygrid-pro.vercel.app`

### 4.3 Обновить Supabase (разрешить твой домен)

1. Supabase → **Authentication** → **URL Configuration**
2. Site URL: `https://skygrid-pro.vercel.app`
3. Redirect URLs: добавь `https://skygrid-pro.vercel.app/`**

---

## ✅ ШАГ 5 — Тестирование перед анонсом

Проверь по чеклисту:

- Регистрация нового пользователя работает
- Загрузка фото работает
- Фото появляется в Explore
- Регистрация самолёта определяется автоматически
- Fleet страница работает
- Карта открывается

---

## 📱 После тестирования — анонс друзьям

Когда всё проверишь, просто отправь ссылку `https://skygrid-pro.vercel.app`

---

## 🆘 Если что-то не работает

Пиши мне — я помогу с бэкендом.
Что сообщать: что именно не работает + любые ошибки из консоли браузера (F12 → Console).