# SkyGrid Pro — Backend Setup Guide

## Stack

- **Database**: PostgreSQL via Supabase
- **Auth**: Supabase Auth (email + Google OAuth)
- **Storage**: Supabase Storage (photos bucket)
- **Hosting**: Vercel (frontend) + Supabase Cloud (backend)

---

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Name: `skygrid-pro` | Region: choose closest to your users
3. Save your **Project URL** and **anon key**

---

## 2. Run Migrations

In Supabase Dashboard → SQL Editor, run in order:

```bash
# Or use Supabase CLI:
supabase db push
```

Files in `/supabase/migrations/`:

1. `001_schema.sql` — all tables, indexes, enums
2. `002_rls.sql`    — Row Level Security + auth triggers
3. `003_seed.sql`   — reference data (countries, airports, airlines, aircraft types)

---

## 3. Configure Storage

In Supabase Dashboard → Storage:

1. Create bucket: `photos`
2. Set to **Public** (photos are publicly readable)
3. Add policy: authenticated users can upload to their own folder (`{user_id}/`*)

```sql
-- Storage policy for uploads
CREATE POLICY "Users can upload own photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Photos are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'photos');
```

---

## 4. Configure Auth

In Supabase Dashboard → Authentication:

1. **Email**: Enable email confirmations
2. **Google OAuth**: Add Client ID + Secret from Google Cloud Console
3. **Redirect URLs**: Add `http://localhost:3000` and your production URL

---

## 5. Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in:

```
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

---

## 6. Connect Frontend to Real Data

The hooks in `src/hooks/` are ready to use. Replace static data in pages:

### ExplorePage — latest photos

```tsx
import { usePhotos } from '../hooks/usePhotos';

const { photos, loading } = usePhotos({ limit: 20, orderBy: 'created_at' });
```

### ProfilePage — real profile

```tsx
import { useProfile } from '../hooks/useProfile';
import { usePhotos } from '../hooks/usePhotos';

const { profile } = useProfile(username);
const { photos }  = usePhotos({ uploaderId: profile?.id });
```

### UploadPage — real submission

```tsx
import { useAuth }   from '../hooks/useAuth';
import { useUpload } from '../hooks/useUpload';

const { user }              = useAuth();
const { submit, status }    = useUpload(user?.id ?? null);
```

### AircraftDetailPage — real aircraft data

```tsx
import { useAircraft } from '../hooks/useAircraft';
import { usePhotos }   from '../hooks/usePhotos';

const { aircraft } = useAircraft('N829AN');
const { photos }   = usePhotos({ aircraftId: aircraft?.id });
```

---

## 7. Deploy to Vercel

```bash
npm i -g vercel
vercel --prod
# Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel dashboard
```

---

## Architecture Diagram

```
Browser (React + Vite)
    │
    ├── supabase.ts client
    │       ├── auth.signIn / signUp
    │       ├── from('photos').select(...)
    │       └── storage.upload(file)
    │
    └── Supabase Cloud
            ├── PostgreSQL (all tables)
            ├── Auth (JWT, OAuth)
            ├── Storage (photo files)
            └── RLS (security policies)
```

---

## File Structure Added

```
src/
├── lib/
│   ├── supabase.ts          ← Supabase client + auth/storage helpers
│   └── database.types.ts    ← TypeScript types for all tables
└── hooks/
    ├── useAuth.ts           ← Session, user, profile state
    ├── usePhotos.ts         ← Photo queries + like toggle
    ├── useAircraft.ts       ← Aircraft lookup + search
    ├── useProfile.ts        ← Spotter profile + leaderboard
    └── useUpload.ts         ← Full upload flow (file → DB)

supabase/
└── migrations/
    ├── 001_schema.sql       ← All tables, indexes, enums
    ├── 002_rls.sql          ← RLS policies + triggers
    └── 003_seed.sql         ← Countries, airports, airlines, achievements
```

