# DropShare

A responsive Next.js app for sharing photos and videos using public links. Files are uploaded directly to Supabase Storage and are not resized or transcoded by this app. Each share page provides previews and links to download the original uploaded files.

## Stack

- Next.js App Router + TypeScript
- Supabase Storage for persistent media files
- Supabase Postgres for share metadata
- Deployable on Vercel from GitHub

## Deploy it

### 1. Create Supabase storage/database

1. Create a project at https://supabase.com.
2. Open **SQL Editor** in the Supabase dashboard.
3. Run all of [`supabase/schema.sql`](./supabase/schema.sql).
4. In **Project Settings → API** (or Connect), copy the Project URL and the publishable/anon key. Never put a `service_role` key in a `NEXT_PUBLIC_` variable or in frontend code.

### 2. Configure locally (optional)

```bash
npm install
cp .env.example .env.local
```

Fill `.env.local` with your Supabase Project URL and publishable/anon key:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
NEXT_PUBLIC_STORAGE_BUCKET=shared-media
```

Then run `npm run dev`.

### 3. Deploy from GitHub to Vercel

1. Push this project folder to a GitHub repository.
2. In Vercel, choose **Add New → Project** and import that repository.
3. Add the three environment variables above in Vercel Project Settings → Environment Variables.
4. Deploy. Redeploy after changing environment variables.

No custom build settings are needed; Vercel detects Next.js automatically.

## Important limits and safety

- Current UI limit: 20 files per share and 100 MB per file. Supabase bucket policies also cap each object at 100 MB.
- Files are uploaded as-is. The app does not compress or re-encode them. Download behavior can vary by browser; if a browser previews a file instead, use its download option or save the linked original.
- Share links are public: anyone who has the link can view/download the files, and the public bucket URLs are accessible. Do not upload sensitive or private content.
- This starter allows anonymous uploads. Before sharing it widely, add CAPTCHA and server-side rate limiting, quotas/expiry, a reporting/removal process, and abuse monitoring. Public upload can otherwise be abused and storage costs can grow.
- Anonymous users cannot delete uploaded files from this UI. Add authenticated ownership/admin moderation if you need deletion controls.
- The free plan/storage quotas and bandwidth limits depend on your Supabase plan. Vercel is hosting the app; Supabase is storing the media.
