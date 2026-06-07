@AGENTS.md

# Streak App — Codebase Guide

## What This App Is

Streak is a social habit-tracking app. Users create timed challenges (7/14/30/60 days), invite friends by username or email, and check in daily. Missing a day means losing. There's a badge system, rivalry tracking, group challenges (up to 5 people), and optional stakes.

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router) — see AGENTS.md warning |
| UI | React 19, TypeScript (strict), Tailwind CSS 4 |
| Database & Auth | Supabase (PostgreSQL + Supabase Auth) |
| Email | Resend |

## Running Locally

```bash
npm run dev       # dev server at localhost:3000
npm run build     # production build
npm run lint      # ESLint
```

## Environment Variables

All required. Put in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY     # server-side only, never expose to client
RESEND_API_KEY
```

## Directory Structure

```
app/
  page.js                    # Landing page
  login/page.js
  signup/page.js
  setup/page.js              # Post-signup profile setup
  auth/callback/route.js     # Supabase auth callback
  dashboard/page.js          # Main hub: active challenges, pending invites
  profile/page.js            # Stats, badges, rivalries
  challenges/
    new/page.js              # Create solo or group challenge
    [id]/page.js             # Challenge detail + daily calendar
  habits/new/page.js         # Create personal habit
  api/
    challenge-invite/        # POST — send email invite via Resend
    group-invites/           # GET/POST/PATCH — group participant management
    update-rivalry/          # POST — record win/loss in rivalry table
    partner-data/            # GET — opponent's public data
lib/
  supabase.js                # Supabase browser client factory
  badges.js                  # Badge definitions, calculation, award logic
```

## Database Schema (Supabase)

- `profiles` — username, avatar (emoji), badges array, member since
- `habit_challenges` — challenger/opponent, status, duration, start date, stake, winner
- `challenge_checkins` — one row per daily check-in
- `challenge_participants` — extra participants for group challenges
- `habits` — personal habits (no opponent)
- `personal_completions` — completions for personal habits
- `rivalries` — wins/losses/total per user-pair

## Key Conventions

**Styling:** Mostly inline React style objects. Dark theme — `#030712` bg, `#f97316` orange accent, `#fff` text. Tailwind used mainly in auth/form pages. Glass-morphism with `backdrop-filter: blur()`.

**Client components:** Every page uses `'use client'`. Auth check pattern: call `supabase.auth.getUser()` in a `useEffect`, redirect to `/login` if no session.

**Dates:** Always ISO `YYYY-MM-DD` strings. Use the shared `toDateStr(date)` helper — don't inline date formatting.

**API routes:** RESTful, JSON in/out. Server-side routes that need elevated access use the service role key via `createClient()` with it — never ship that key to the browser.

**Email sends:** Fire-and-forget `fetch()` calls to the internal API routes. They must never block a redirect or UI update.

**RLS bypass:** Group participant inserts go through `/api/group-invites` (service role) because RLS blocks direct client inserts.

**Badge checks:** Triggered async on profile page load, fire-and-forget. Don't await or block on them.

**Challenge auto-completion:** The `[id]/page.js` detail page checks on load whether the challenge duration has elapsed and auto-completes with winner calculation. No cron job — it's client-triggered.

## Challenge Lifecycle

```
pending → active → completed
```

- Pending: challenger created it, waiting for opponent to accept
- Active: both accepted, daily check-ins begin
- Completed: duration elapsed or someone forfeited; winner recorded

## Badges

| Badge | Condition |
|---|---|
| First Blood | 1 win |
| On Fire | 7-day streak |
| Ruthless | 5 wins |
| Undefeated | 10 wins, 0 losses |
| Early Bird | 5 check-ins before 7am |
| Comeback Kid | Win a 14+ day challenge |
| Consistent | Complete a 30-day challenge |
| Social | Challenge 3+ different people |

## Path Alias

`@/*` maps to the project root. Use it for imports instead of `../../`.

## No Tests

No test framework is set up. There are no test files.
