@AGENTS.md

# diwakarwrites — Codebase Reference

Personal productivity and life-tracking platform with integrated AI coaching. Single-user, password-gated, built on Next.js App Router.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, React 19, TypeScript 5) |
| Styling | Tailwind CSS 4 + `@tailwindcss/typography` |
| Database | Supabase (PostgreSQL) |
| AI / LLM | OpenAI GPT-4o / GPT-4o-mini via Vercel AI SDK (`ai`, `@ai-sdk/openai`, `@ai-sdk/react`) |
| Rich Text | Tiptap v3 (`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-placeholder`) |
| Auth | HMAC-signed session cookie derived from `ADMIN_PASSWORD`, enforced in `src/proxy.ts` |

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL          # or SUPABASE_URL — server-only either way now
NEXT_PUBLIC_SUPABASE_ANON_KEY     # or SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY         # optional, required once RLS is enabled
ADMIN_PASSWORD                    # also the HMAC secret for session cookies
OPENAI_API_KEY
```

No Supabase credential is sent to the browser. Client components import
`supabase` from `src/lib/supabase.ts`, which points at the session-gated
`/api/db` proxy; server code imports `db` from `src/lib/db.ts`.

---

## Project Structure

```
src/
├── app/                    # Next.js App Router pages & API routes
│   ├── layout.tsx          # Root layout: NavBar, Sidebar, Footer, MobileDataStrip, StickyTodo
│   ├── page.tsx            # Home dashboard (ISR, revalidate=60)
│   ├── globals.css         # Global styles, CSS variables, dark mode
│   ├── habits/
│   │   ├── page.tsx        # Full habit tracker (940 lines)
│   │   └── workout/
│   │       └── page.tsx    # Workout session logger
│   ├── write/
│   │   ├── page.tsx        # Writing hub — Pieces, Diary, Book chapters (PasswordGated)
│   │   ├── actions.ts      # Server actions: create/update writing entries
│   │   ├── [id]/
│   │   │   ├── page.tsx    # Individual writing editor page
│   │   │   ├── WritingEditor.tsx  # Tiptap editor component
│   │   │   └── actions.ts  # Server actions for content saves
│   │   └── book/
│   │       ├── page.tsx    # Manuscript management
│   │       └── [id]/
│   │           └── page.tsx  # Manuscript detail / chapter list
│   ├── writings/
│   │   ├── page.tsx        # Public writings library hub
│   │   ├── [id]/page.tsx   # Published writing detail page
│   │   └── WritingHub.tsx  # Browse/display component
│   ├── library/
│   │   └── page.tsx        # Books, films, TV shows tracker
│   ├── board/
│   │   └── page.tsx        # Dashboard/board view
│   ├── expenses/
│   │   └── page.tsx        # Expense tracker with custom categories
│   ├── login/
│   │   ├── page.tsx        # Password gate login page
│   │   └── actions.ts      # Auth validation server action
│   └── api/
│       ├── auth/route.ts         # POST: password validation
│       ├── nutrition/route.ts    # POST: AI meal → macros (GPT-4o-mini)
│       ├── ticker/route.ts       # Ticker data endpoint
│       ├── tidbit/route.ts       # Tidbit/fact endpoint
│       └── chat/
│           ├── writing/route.ts  # Streaming: writing coach (GPT-4o)
│           ├── fitness/route.ts  # Streaming: fitness/nutrition coach (GPT-4o)
│           ├── coach/route.ts    # Streaming: daily life coach (GPT-4o-mini)
│           └── content/route.ts  # Streaming: content brainstorming (GPT-4o)
└── components/
│   ├── ChatPanel.tsx       # Floating multi-agent chat UI (4 agents)
│   ├── NavBar.tsx          # Sticky top nav with streak display
│   ├── Sidebar.tsx         # Sticky left sidebar (200px)
│   ├── MobileDataStrip.tsx # Mobile-optimized key metrics strip
│   ├── StickyTodo.tsx      # Floating sticky-notes / to-do widget
│   ├── Editor.tsx          # Tiptap rich text editor wrapper
│   ├── PasswordGate.tsx    # HOC for password-protected sections
│   └── Footer.tsx          # Minimal footer
└── lib/
    ├── supabase.ts         # Supabase client + `Writing` and `Manuscript` types
    └── proxy.ts            # API proxy logic
```

---

## Features

### Habit Tracker (`/habits`)
- Daily log: sleep hours, steps, water intake, meditation, reading pages, writing pages, self-care, chess games, mood (emoji), content creation flag
- **Net calorie tracking**: food log with AI nutrition estimation; TDEE calculated from Mifflin-St Jeor BMR + activity burn
- **52-week heatmap**: calendar grid with 6-metric daily score
- **30-day trend charts**: sparklines and polyline charts with target lines
- **Fitness coach chat**: floating panel with 30-day habit/workout context fed to GPT-4o

### Workout Logger (`/habits/workout`)
- Per-set logging for strength exercises
- Run tracking (distance, duration, pace)
- Sessions stored in Supabase `workout_sessions` / `run_sessions` tables

### Writing Platform (`/write`)
- Password-gated
- Hierarchical: **Manuscripts → Chapters → Pieces / Diary entries**
- Draft / published status per entry
- Word count and last-updated tracking
- Tiptap rich text editor with placeholder support
- **Writing coach chat**: full manuscript + chapter + diary context fed to GPT-4o

### Published Writings (`/writings`)
- Public-facing library of published pieces
- Browse by type (essay, diary, etc.)

### Media Library (`/library`)
- **Books**: reading progress percentage, star ratings
- **Films**: watched date, star ratings, short review
- **TV shows**: status (watching / finished / dropped), star ratings

### Expense Tracker (`/expenses`)
- Daily expense logging with custom categories
- Stored in Supabase

### Home Dashboard (`/`)
- ISR page (revalidate 60 s)
- Widgets: habit rooms, writing stats, library preview, streaks

### AI Agents (via `ChatPanel`)
| Agent | Route | Model | Context |
|---|---|---|---|
| Fitness | `/api/chat/fitness` | GPT-4o | 30-day habit logs, food, workouts, runs, weight |
| Writing | `/api/chat/writing` | GPT-4o | Manuscripts, chapters, diary samples, recent pieces |
| Coach | `/api/chat/coach` | GPT-4o-mini | Today's habits, food, recent workouts, reading, writing |
| Content | `/api/chat/content` | GPT-4o | Full writing corpus for ideation |

All chat routes stream responses using Vercel AI SDK (`streamText`). `maxDuration = 30` is set on streaming routes.

### Public vs private

The site has two faces, chosen by whether the request carries a valid owner
session. `src/app/layout.tsx` picks the shell; `src/proxy.ts` is the fence.

| | Visitor | Owner |
|---|---|---|
| Shell | `PublicShell` — masthead, one column, no rails | NavBar + Sidebar + StickyTodo + VoiceLogger |
| `/` | Public landing: intro, public writing, board link | Full dashboard |
| `/writings` | Only rows with `is_public = true` | Everything published |
| `/writings/[id]` | 404 unless `is_public` | Always |
| `/board` | Open, minus the owner's private notes | Everything, plus delete and visibility toggles |
| Everything else | Redirect to `/login` | Full access |

### Auth
- `src/lib/session.ts` — HMAC-SHA256 signed token, `dw_session` cookie, 60-day life
- `src/lib/auth.ts` — `isAdmin()` for server components, routes and actions
- `src/proxy.ts` — outer gate; anything not on the public list redirects to `/login`
- `POST /api/auth` and the `/login` server action both issue the session; `/logout` clears it
- Forged cookies fail the signature check, so the value cannot simply be typed in

---

## Database (Supabase Tables)

| Table | Used By |
|---|---|
| `habit_logs` | Habits tracker — daily log rows |
| `food_entries` | Nutrition / calorie tracking |
| `workout_sessions` | Strength workout logger |
| `run_sessions` | Run tracker |
| `writings` | Pieces and diary entries (`is_public` gates the public site) |
| `manuscripts` | Books / manuscript metadata |
| `books` | Media library — books |
| `films` | Media library — films |
| `shows` | Media library — TV shows |
| `board_posts` | Public board — threaded via `parent_id`, `is_owner` + `visibility` control who sees what |

Types exported from `src/lib/supabase.ts`: `Writing`, `Manuscript`.

---

## Design System

- **Palette**: warm paper `#FAF7F2`, accent `#C4502E`, dark bg `#1a1a1a`
- **Typeface**: Source Serif 4 (serif body), system sans for UI
- **Grid**: 12-column custom grid (`.col-6`, `.col-4` etc.)
- **Dark mode**: `data-theme` attribute on root; CSS variable overrides in `globals.css`
- **Tailwind 4**: uses `@import "tailwindcss"` — no `tailwind.config.js`; config lives in CSS

---

## Conventions

- **Server components by default**; client components marked with `"use client"` only where needed (interactivity, hooks, AI streaming)
- **Server actions** in co-located `actions.ts` files (write, login)
- **API routes** use Next.js Route Handlers (`route.ts`) — `export async function POST(req: Request)`
- `force-dynamic` set on pages that must not be cached (e.g., `/write`)
- Streaming AI routes export `export const maxDuration = 30`
- Server code uses `db` from `src/lib/db.ts`; client code uses `supabase` from `src/lib/supabase.ts` (routed through `/api/db`)
- Never reference `NEXT_PUBLIC_SUPABASE_*` from a client component — it would inline the key into the bundle
- New private routes are gated automatically; new *public* routes must be added to `PUBLIC_PATHS` in `src/proxy.ts`
