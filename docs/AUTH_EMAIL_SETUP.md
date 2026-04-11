# Email confirmation and password reset (Supabase)

The app uses **`emailRedirectTo` / `redirectTo` = `window.location.origin + '/'`** for sign-up confirmation links, magic links, and password recovery. Supabase must allow that URL.

## Dashboard checklist

1. **Authentication → Providers → Email** — enabled.
2. **Authentication → Sign up / Providers** — if **Confirm email** is on, new users must click the link in the mail before signing in with password.
3. **Authentication → URL Configuration**
   - **Site URL** — production origin, e.g. `https://your-domain.com` (no trailing path required; app uses `/`).
   - **Redirect URLs** — include:
     - `https://your-domain.com/**`
     - `http://localhost:5173/**` (and/or `3000`) for local dev.
4. **Email templates** — optional: customize **Confirm signup** and **Reset password**; the default links still work if URLs above are correct.
5. **SMTP** — for production deliverability, configure custom SMTP under **Project Settings → Auth** (or rely on Supabase default with its limits).

## In-app behavior

- **Register (email + password)** — `signUpWithEmail` passes `emailRedirectTo` so the confirmation email returns users to the site root.
- **Forgot password** — `requestPasswordReset` uses `redirectTo` to the same root; after the link, Supabase emits `PASSWORD_RECOVERY` and the app shows the password update modal (`App.tsx`).

If links open but redirect fails with “invalid redirect”, add the exact URL Supabase shows in the error to **Redirect URLs**.
