#!/usr/bin/env bash
# curl-examples.sh
# Validate Supabase RLS policies via the PostgREST REST API.
#
# SETUP:
#   export SUPABASE_URL="https://your-project-ref.supabase.co"
#   export SUPABASE_ANON_KEY="your-anon-key"
#   export SUPABASE_SERVICE_KEY="your-service-role-key"   # server-only, never in client
#
# To get a USER_JWT:
#   1. Call the OTP endpoint to send a magic link (see §1 below).
#   2. Click the link in your email; the URL fragment contains #access_token=...
#   3. Copy that token into USER_JWT_A / USER_JWT_B below.
#   OR use signInWithPassword if you enabled email/password auth.

SUPABASE_URL="${SUPABASE_URL:-https://your-project-ref.supabase.co}"
ANON_KEY="${SUPABASE_ANON_KEY:-your-anon-key}"
SERVICE_KEY="${SUPABASE_SERVICE_KEY:-your-service-role-key}"
USER_JWT_A="${USER_JWT_A:-jwt-for-user-a}"
USER_JWT_B="${USER_JWT_B:-jwt-for-user-b}"

# ════════════════════════════════════════════════════════════
# §1 — AUTH: Send magic link (OTP)
# ════════════════════════════════════════════════════════════

# Send login link to user A
curl -s -X POST "$SUPABASE_URL/auth/v1/otp" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email": "user-a@example.com"}' | jq
# Expected: {} (204 No Content body — email sent)

# Exchange OTP token for a session (if using PKCE / verify endpoint)
# curl -s -X POST "$SUPABASE_URL/auth/v1/verify" \
#   -H "apikey: $ANON_KEY" \
#   -H "Content-Type: application/json" \
#   -d '{"type":"magiclink","token":"TOKEN_FROM_EMAIL"}' | jq '.access_token'

# ════════════════════════════════════════════════════════════
# §2 — TODOS: SELECT — user only sees own rows (RLS: select_user)
# ════════════════════════════════════════════════════════════

echo "=== GET /todos as user_a (should return only user_a todos) ==="
curl -s "$SUPABASE_URL/rest/v1/todos?select=id,text,user_id" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $USER_JWT_A" | jq
# Expected: array of todos belonging to user_a only

echo "=== GET /todos as user_b (should return only user_b todos) ==="
curl -s "$SUPABASE_URL/rest/v1/todos?select=id,text,user_id" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $USER_JWT_B" | jq
# Expected: array of todos belonging to user_b only

# ════════════════════════════════════════════════════════════
# §3 — TODOS: SELECT with explicit user_id filter — RLS still applies
# ════════════════════════════════════════════════════════════

echo "=== user_b tries to filter for user_a's todos — should get 0 rows ==="
curl -s "$SUPABASE_URL/rest/v1/todos?user_id=eq.USER_A_UUID&select=id,text" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $USER_JWT_B" | jq
# Expected: [] — RLS overrides the explicit filter

# ════════════════════════════════════════════════════════════
# §4 — TODOS: INSERT — user inserts with own user_id
# ════════════════════════════════════════════════════════════

echo "=== POST /todos as user_a (valid insert) ==="
curl -s -X POST "$SUPABASE_URL/rest/v1/todos" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $USER_JWT_A" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "user_id": "USER_A_UUID",
    "text": "Test todo via curl",
    "completed": false
  }' | jq
# Expected: created todo object with id

# ════════════════════════════════════════════════════════════
# §5 — TODOS: INSERT — user tries to spoof another user_id
# ════════════════════════════════════════════════════════════

echo "=== POST /todos as user_a spoofing user_b's id — should be rejected ==="
curl -s -X POST "$SUPABASE_URL/rest/v1/todos" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $USER_JWT_A" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "USER_B_UUID",
    "text": "Spoofed todo",
    "completed": false
  }' | jq
# Expected: {"code":"42501","message":"new row violates row-level security policy"}

# ════════════════════════════════════════════════════════════
# §6 — TODOS: PATCH — user updates own todo
# ════════════════════════════════════════════════════════════

TODO_ID="replace-with-real-todo-id"

echo "=== PATCH /todos/:id as owner (valid update) ==="
curl -s -X PATCH "$SUPABASE_URL/rest/v1/todos?id=eq.$TODO_ID" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $USER_JWT_A" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{"completed": true}' | jq
# Expected: updated todo with completed=true

# ════════════════════════════════════════════════════════════
# §7 — TODOS: PATCH — user tries to update another user's todo
# ════════════════════════════════════════════════════════════

echo "=== PATCH /todos/:id as user_b on user_a's todo — should affect 0 rows ==="
curl -s -X PATCH "$SUPABASE_URL/rest/v1/todos?id=eq.$TODO_ID" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $USER_JWT_B" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{"completed": true}' | jq
# Expected: [] (empty array — 0 rows matched)

# ════════════════════════════════════════════════════════════
# §8 — TODOS: DELETE — user deletes own todo
# ════════════════════════════════════════════════════════════

echo "=== DELETE /todos/:id as owner ==="
curl -s -X DELETE "$SUPABASE_URL/rest/v1/todos?id=eq.$TODO_ID" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $USER_JWT_A" | jq
# Expected: 204 No Content (success, row deleted)

# ════════════════════════════════════════════════════════════
# §9 — CATEGORIES: SELECT — public categories visible to everyone
# ════════════════════════════════════════════════════════════

echo "=== GET /categories — public (user_id=null) should be visible to all ==="
curl -s "$SUPABASE_URL/rest/v1/categories?user_id=is.null&select=id,name" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $USER_JWT_A" | jq
# Expected: array of global categories

# ════════════════════════════════════════════════════════════
# §10 — CATEGORIES: INSERT — user cannot create a public category
# ════════════════════════════════════════════════════════════

echo "=== POST /categories with user_id=null — should be rejected ==="
curl -s -X POST "$SUPABASE_URL/rest/v1/categories" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $USER_JWT_A" \
  -H "Content-Type: application/json" \
  -d '{"name": "Fake Global", "user_id": null}' | jq
# Expected: {"code":"42501","message":"new row violates row-level security policy"}

# ════════════════════════════════════════════════════════════
# §11 — NO AUTH: access without JWT — should return empty or 401
# ════════════════════════════════════════════════════════════

echo "=== GET /todos without Authorization header ==="
curl -s "$SUPABASE_URL/rest/v1/todos?select=*" \
  -H "apikey: $ANON_KEY" | jq
# Expected: [] (anon role has no SELECT policy) or 401 depending on config

# ════════════════════════════════════════════════════════════
# §12 — SERVICE ROLE: bypasses RLS — sees ALL rows
# ════════════════════════════════════════════════════════════

echo "=== GET /todos with service_role key — bypasses RLS ==="
curl -s "$SUPABASE_URL/rest/v1/todos?select=id,text,user_id" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" | jq
# Expected: ALL todos from all users (service role bypasses RLS)
# WARNING: Never expose SERVICE_KEY in client-side code.
