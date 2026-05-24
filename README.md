# Simple Todo List — Supabase Integration

This project is a simple todo list web app. I added Supabase integration for user authentication and remote storage with a localStorage fallback.

What I changed
- Added `supabaseClient.js` (small client initializer; replace placeholders with your values)
- Updated `index.html` to include an auth UI (magic link) and search box
- Rewrote `script.js` to sync data with Supabase when a user is signed in, otherwise use localStorage

Quick setup (Supabase)
1. Create a project at https://app.supabase.com
2. Create a table called `categories` with columns:
   - `id` UUID (or bigint) primary key (if UUID, use `gen_random_uuid()` default)
   - `name` text

3. Create a table called `todos` with columns:
   - `id` bigint (or UUID) primary key (if using bigint, set to auto-increment)
   - `user_id` uuid references auth.users (nullable if you want local tasks)
   - `text` text
   - `completed` boolean default false
   - `category_id` references `categories(id)`
   - `due_date` date (nullable)
   - `created_at` timestamptz default now()

4. In the Supabase dashboard, open Settings → API and copy the `anon` public key and the project URL.

5. Edit `supabaseClient.js` and replace `SUPABASE_URL` and `SUPABASE_ANON_KEY` with your project values. Do NOT commit real keys to public repos.

Local testing
- Open `index.html` in your browser. If you are not signed in, the app will use `localStorage` to store categories and tasks.
- To use Supabase, send a magic login link to your email from the UI; once signed in, data will be loaded from Supabase and writes will go there.

Notes & next steps I recommend
- Secure RLS (Row Level Security) policies in Supabase so users only access their tasks. Example policy: allow `todos` inserts/selects/updates where `user_id = auth.uid()`.
- Move secrets server-side for production (e.g., Next.js or server functions) — don't bake anon keys in public builds except for limited clients with proper RLS.
- Add nicer auth (OAuth) and client-side UI for invited users.
- Add migration SQL or use Supabase Migrations to track schema changes.

If you want, I can:
- Add SQL snippets with exact types for Postgres and RLS policy examples
- Convert this into a Next.js app and put keys in `process.env` with server-side helpers
- Add tests or a simple CI deploy to Vercel


Enjoy — tell me which next step you'd like me to do.

---

**Migrations & RLS**

I added a `migrations.sql` file that you can run in the Supabase SQL editor (or via psql) to create the `categories` and `todos` tables and enable Row Level Security policies.

Quick notes:
- The migration uses `gen_random_uuid()` (requires the `pgcrypto` extension) to generate UUIDs for `categories`.
- `categories` allows `user_id` to be NULL (public/global categories) or set to the owning user.
- `todos` are owned (required `user_id`) so policies restrict access to the owning user only.

Run the SQL from `migrations.sql` inside the Supabase SQL editor. After applying the migration, verify the policy behavior using the Supabase UI by signing in as a test user.

If you'd like, I can also:
- Provide exact `ALTER ROLE` or service policies for server-side migrations or automated CI jobs.
- Add a `migrations/` directory with timestamped SQL files suitable for tracked migrations.

The `migrations.sql` file lives at `migrations.sql` in the project root.
