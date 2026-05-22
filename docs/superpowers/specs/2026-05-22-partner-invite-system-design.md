# Partner Invite & Acceptance System — Design Spec

Date: 2026-05-22

## Overview

Add a complete email-based invite flow so users can invite accountability partners and receive/respond to invites. Uses Resend to send email and Supabase for persistence.

## Files

| File | Action |
|------|--------|
| `app/api/invite/route.js` | Create |
| `app/partners/invite/page.js` | Update |
| `app/partners/respond/page.js` | Create |
| `app/login/page.js` | Update |
| `app/dashboard/page.js` | Update |

## Architecture

### `app/api/invite/route.js`

POST-only server route handler. Auth via `createServerClient` with `request.cookies.getAll()` (same pattern as `auth/callback/route.js`). If no session, returns 401 JSON.

Reads `email` and `partnership_id` from JSON body. Instantiates `Resend` with `process.env.RESEND_API_KEY`. Sends from `onboarding@resend.dev` with subject "You have been invited to be an accountability partner on Streak!". HTML body is dark-themed, shows inviter email, a "View Invite" button linking to `{origin}/partners/respond?id={partnership_id}`.

Returns `{ success: true }` or `{ error: string }`.

### `app/partners/invite/page.js`

After successful `partnerships` insert, capture the returned row `id`. POST to `/api/invite` with `{ email, partnership_id: id }`.

Success message: `"Invite sent! We emailed {email}"`.
If email API fails, show a separate warning: `"Partnership created but email could not be sent."`.

### `app/partners/respond/page.js`

Client component (`'use client'`). Reads `id` from `useSearchParams`.

On mount:
1. Get current user from Supabase browser client.
2. If null → `router.replace('/login?redirect=/partners/respond?id={id}')`.
3. Fetch `partnerships` row where `id = searchParam id`.
4. Fetch `profiles` where `id = partnership.user_id` (the inviter).
5. Set state: `{ inviterEmail, partnership }`.

UI: dark theme, orange accents. Shows inviter email, description text, Accept and Decline buttons.

Accept handler: `update partnerships set status='active' where id=...` → `router.replace('/dashboard')`.
Decline handler: `update partnerships set status='declined' where id=...` → `router.replace('/dashboard')`.

Loading and error states handled.

### `app/login/page.js`

Add `useSearchParams`. Read `redirect` param. On successful login, `router.replace(redirect ?? '/dashboard')`.

### `app/dashboard/page.js`

Add `pendingInvites` state (`[]`).

In `load()`, after existing queries, run:
```
select * from partnerships
where partner_id = user.id and status = 'pending'
```
For each result, fetch `profiles where id = partnership.user_id` to get inviter email.
Set `pendingInvites` as array of `{ partnershipId, inviterEmail }`.

New "Pending Invites" section rendered above "Active Partners". Only shown when `pendingInvites.length > 0`. Each item shows inviter email with Accept and Decline buttons.

Accept handler: update status to `'active'` in Supabase, remove from `pendingInvites` state, add to `partners` state (fetch profile + streak).
Decline handler: update status to `'declined'` in Supabase, remove from `pendingInvites` state.

## Data Flow

```
User fills invite form
  → insert partnership (status: pending)
  → POST /api/invite (email, partnership_id)
    → Resend sends email to partner
Partner clicks email link
  → /partners/respond?id=xxx
  → if not logged in → /login?redirect=...
  → after login → back to /partners/respond?id=xxx
  → Accept or Decline
    → update partnerships.status
    → redirect /dashboard
Dashboard also shows pending invites inline
  → same Accept/Decline without leaving page
```

## Error Handling

- Invite page: DB error shown as generic error. Email failure shown as a separate warning (partnership still created).
- Respond page: if partnership not found or already actioned, show error message (don't crash).
- Dashboard: accept/decline failures show inline error without disrupting the rest of the page.

## Constraints

- Resend free tier requires sending from `onboarding@resend.dev`.
- `RESEND_API_KEY` must be set in `.env.local`.
- No server-side Supabase client exists in `lib/` — the API route creates its own inline (same pattern as auth callback).
