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
| Auth | Simple password gate — `ADMIN_PASSWORD` env var, no sessions |

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
ADMIN_PASSWORD
OPENAI_API_KEY
```

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

### Auth
- `POST /api/auth` validates password against `ADMIN_PASSWORD` env var
- `PasswordGate` component wraps `/write` and other private sections
- No session cookies — gate state lives in component/local state

---

## Database (Supabase Tables)

| Table | Used By |
|---|---|
| `habit_logs` | Habits tracker — daily log rows |
| `food_entries` | Nutrition / calorie tracking |
| `workout_sessions` | Strength workout logger |
| `run_sessions` | Run tracker |
| `writings` | Pieces and diary entries |
| `manuscripts` | Books / manuscript metadata |
| `books` | Media library — books |
| `films` | Media library — films |
| `shows` | Media library — TV shows |

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
- Supabase client is a singleton imported from `src/lib/supabase.ts`
