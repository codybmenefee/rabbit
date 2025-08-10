## YouTube Analytics Prototype Plan (Rapid Build)

This document outlines a 2–3 hour prototype plan to stand up a beautiful, Basedash-inspired analytics app using Next.js (App Router) and Tailwind. It prioritizes cross-product decisions first, followed by complete, copy/paste-ready instructions for each parallel agent. No code is included; all directions are high-level and actionable.

### Goals
- **Core value**: Business intelligence insights over a user’s YouTube watch history (Google Takeout import).
- **Prototype scope**: Upload → Parse → Normalize → Store → Display key insights and filters.
- **Deployment**: Compatible with Vercel (local dev first).
- **Design**: High-quality, Basedash-inspired UI (see `youtube-analytics/inspo/basedash/*`).

### Existing Repo Snapshot
- **Tech**: Next.js (App Router), Tailwind, Recharts, Lucide.
- **UI**: Glass/gradient baseline already in `app/page.tsx` and `components/*`.
- **Inspiration**: `youtube-analytics/inspo/basedash/*.png`.
- **Sample data**: Large `watch-history.html` found at repo root (`/watch-history.html`).

---

## Cross-Product Decisions

### Architecture
- **Prototype architecture**: Client-only parsing for speed and simplicity.
  - Parse Google Takeout `watch-history.html` (or zip containing it) in the browser.
  - Store normalized records in **IndexedDB** to keep backend out of scope for now.
  - Render charts and KPI cards from local store.
- **Migration path (Phase 2)**: Server parsing + database (Postgres/Turso) for multi-user and heavier analytics.

### Data Source Structure (watch-history.html)
- **Format characteristics** (as seen in typical Takeout exports and the large file in repo):
  - Each watch entry appears as a content block, frequently under a `div` with classes like `content-cell mdl-cell mdl-cell--6-col mdl-typography--body-1`.
  - Fields typically available per entry:
    - **Video link and title**: anchor `href` with `https://www.youtube.com/watch?v=...` and text as video title.
    - **Channel link and name**: anchor `href` with `https://www.youtube.com/channel/...` or `@handle`; text as channel name.
    - **Timestamp**: text fragment such as “Watched …” followed by a timestamp (local timezone); wording can vary slightly.
  - **Edge cases**:
    - Missing or private videos (no watch link; text may say “Private video” or similar).
    - YouTube Music entries (wording may differ, sometimes “Listened to …”).
    - Entries without `titleUrl` (no clickable video link).
    - Non-ASCII characters in titles/channels.

### Normalization (prototype)
- **WatchRecord** (normalized fields):
  - `id`: stable hash or concatenation of `watchedAt + videoUrl` (uniqueness heuristic for prototype).
  - `watchedAt`: ISO string parsed from the entry timestamp (fallback to `null` if unparseable, but keep the raw text).
  - `videoId`: extracted from `watch?v=...` query param (fallback `null` if missing).
  - `videoTitle`: text of the video anchor if present.
  - `videoUrl`: `https://www.youtube.com/watch?...` if present.
  - `channelTitle`: text of the channel anchor if present.
  - `channelUrl`: URL of the channel anchor if present.
  - `product`: `YouTube` or `YouTube Music` (best-effort classification based on surrounding text).
  - `topics`: string[] derived via simple keyword mapping from `videoTitle` and `channelTitle`.
  - Derived fields for aggregations: `year`, `month`, `week`, `dayOfWeek`, `hour`, `yoyKey` (e.g., `YYYY-MM`).

### MVP Insights (no durations required)
- **KPI cards**: Total videos (YTD, MTD, QTD) with YOY deltas; unique channels.
- **Top channels**: bar chart, filterable by timeframe.
- **Monthly trend**: line/area chart of videos watched per month.
- **Day/time heatmap**: day-of-week × hour intensity grid.
- **Topics leaderboard**: counts of derived topic tags.
- **Filters**: timeframe (MTD, QTD, YTD, last 6, last 12), product (YouTube vs Music), topics (multi), channel (search).

### Design System
- **Visual style**: Basedash-inspired glassmorphism with subtle gradients; dark-first palette.
- **Components to standardize**: `Card`, `Button`, `Select`, `Badge`, `ChartContainer`.
- **Charts**: Recharts with consistent theming and legend/tooltip patterns.
- **Accessibility**: Keyboard focus states, readable contrast, responsive.

### Minimal Dependencies (prototype)
- **Client parsing + store**: `jszip` (if zip support is desired), `zod` (schema validation), `idb-keyval` or `dexie` (IndexedDB). Select one IndexedDB helper and stick to it.
- **Charts**: `recharts` is already present.
- Defer tables to a later phase (consider `@tanstack/react-table` if needed).

### Test Data Strategy
- **Smaller test file**: Create `watch-history.sample.html` by extracting the first ~200–500 entries from the large `watch-history.html`, preserving the HTML header/footer and container structure so parsers work identically.
- **Synthetic fixtures**: Provide 2–3 tiny anonymized JSON datasets for unit tests (converted from normalized records) to exercise edge cases (missing links, private videos, unusual timestamps).

### Risk & Deferments
- **Durations**: Accurate “minutes watched” requires external enrichment; defer to Phase 2 (YouTube Data API).
- **Time zone parsing**: Normalize to UTC; keep raw timestamp text for traceability.
- **Performance**: Large HTML files processed client-side may be slow; acceptable for prototype; server parsing in Phase 2.

### Branching & PRs
- **Trunk-based**: Small PRs, clear scopes; Vercel Preview Deploys for each PR.
- **Naming**: `[feat|fix|chore]/scope-short-summary`.
- **Shared contracts**: Centralize types in `types/records.ts` and derive-only helpers in `lib/aggregations.ts`.

---

## Agent Instructions (Copy/Paste)

### Agent A — Design & Shell (UI Framework)
- **Branch**: `feat/ui-shell`
- **Objective**: Establish the application shell and reusable UI primitives in a Basedash-like style. Ensure a cohesive dark theme and responsive layout.
- **Scope**:
  - Create a left sidebar and a topbar with global timeframe/product filters.
  - Define reusable primitives: Card, Button, Select, Badge, ChartContainer.
  - Implement states: loading, empty (pre-import), and populated.
  - Ensure keyboard navigability and focus styles.
- **Acceptance**:
  - Sidebar/topbar present; layout responsive; theme consistent with `inspo/basedash`.
  - Filters visible and operable (stubbed; no data wiring required by this agent).
  - Empty state includes a clear CTA to upload data.
- **Deliverables**:
  - Updated layout components under `components/layout/*` and `components/ui/*`.
  - Design tokens (colors, spacing) and Tailwind utility usage guidance.

### Agent B — Import & Storage (Client Parsing)
- **Branch**: `feat/import-client`
- **Objective**: Allow users to upload Google Takeout data (`watch-history.html` or zip), parse client-side, normalize, and save to IndexedDB.
- **Scope**:
  - Build a drag-and-drop upload component integrated into the empty state CTA.
  - Support `.html` first; optionally add `.zip` support if time allows.
  - Parse HTML entries; extract video title/link, channel title/link, and timestamp.
  - Normalize records to the shared `WatchRecord` shape; validate with a schema library.
  - Save, load, and clear data via IndexedDB helper.
  - Show a post-import summary (record count, unique channels).
- **Acceptance**:
  - A user can upload the small test file and see an import summary within seconds.
  - Data persists across page reloads locally.
  - Graceful handling of missing data (e.g., private videos).
- **Deliverables**:
  - Upload flow integrated into the dashboard entry path.
  - Storage helper module for save/get/clear operations.

### Agent C — Aggregations & Filters
- **Branch**: `feat/aggregations`
- **Objective**: Implement pure functions to compute insights from normalized records and to apply global filters.
- **Scope**:
  - Implement aggregations for: monthly counts, top channels, day-of-week × hour matrix, topics leaderboard, and KPI counts (YTD/MTD/QTD) with YOY deltas.
  - Implement filter application: timeframe windows, product filter, topic inclusion, channel inclusion.
  - Provide deterministic behavior for entries with missing timestamps (exclude from time-based metrics but count elsewhere as appropriate).
  - Provide a small set of synthetic fixtures to validate edge cases.
- **Acceptance**:
  - Given the same input array, functions return stable, tested outputs.
  - Filters are applied consistently and compose correctly.
- **Deliverables**:
  - Aggregations and filter application utilities in a dedicated library module.
  - Brief notes documenting input/output contracts for dashboard components.

### Agent D — Dashboards & Charts
- **Branch**: `feat/dashboards`
- **Objective**: Render the insights using charts and lists, wired to the store and filters.
- **Scope**:
  - KPI cards: total videos (YTD/MTD/QTD), YOY deltas, unique channels.
  - Monthly trend: area or line chart with smooth transitions.
  - Top channels: horizontal bar chart.
  - Day/time heatmap: grid with color scale and tooltips.
  - Topics leaderboard: list with badges.
  - Wire global filters to recompute aggregations and rerender charts.
- **Acceptance**:
  - With sample data loaded, all panels render without errors and respond to filters instantly.
  - Visuals align with the Basedash-inspired style from Agent A.
- **Deliverables**:
  - Dashboard page and chart components under `components/dashboard/*`.
  - Clear guidance on the shape of props expected from aggregation utilities.

### Agent E — Fixtures, Test Data & QA
- **Branch**: `chore/fixtures`
- **Objective**: Provide sample data and QA routines to accelerate development.
- **Scope**:
  - Create a smaller `watch-history.sample.html` preserving header/footer and a subset of entries for fast testing.
  - Provide 2–3 tiny synthetic normalized datasets to test edge cases.
  - Add a developer-only “Load sample data” pathway in the UI for rapid testing.
  - Document manual QA flows: fresh import, filter changes, empty/clear data, re-import.
- **Acceptance**:
  - Developers can fully exercise the app without real user data.
  - Common edge cases are represented in fixtures.
- **Deliverables**:
  - Sample files stored under a fixtures folder in the project.
  - Short QA checklist for reviewers.

---

## Creating the Smaller Test File (Process Guidance)
- Open the large `watch-history.html` and identify the container that wraps all entries; keep the document head, styles, and the start/end of the entries container intact.
- Select the first ~200–500 entry blocks (the repeated content cells) without altering surrounding structure.
- Save as `watch-history.sample.html` and validate by opening in a browser; ensure layout renders and links are present.
- Confirm the prototype importer recognizes and parses entries from this sample file as it would the full export.

## Timeline (Suggested)
- 0:00–0:15: Kickoff, agree on architecture, align on shared types and file locations.
- 0:15–1:00: Agent A and B proceed in parallel; Agent E prepares sample file.
- 1:00–2:00: Agent C completes aggregations; Agent D wires charts and filters.
- 2:00–2:30: QA with fixtures; polish visuals; prepare for Vercel preview.

## Phase 2 Preview (Post-Prototype)
- Server parsing with database (Drizzle + Postgres/Turso) for scalability and multi-user sessions.
- YouTube Data API enrichment for durations to enable watch-time metrics (YTD/MTD/QTD/YOY) and more precise insights.
- Advanced BI: session detection, streaks, creator overlap networks, category pivots.
