---
phase: 02-lobby-room-join
plan: 01
subsystem: ui
tags: [react, vite, tailwind, shadcn, typescript]

requires:
  - phase: 01-server-foundation
    provides: shared types (Card, GameState, ClientGameState) and working server

provides:
  - Vite 8 + React 18 build pipeline with GitHub Pages base config
  - shadcn v4 component library (button, separator, badge) with dark green felt design tokens
  - src/globals.css with HSL CSS variables for the virtual card table theme
  - src/card-art.ts with CARD_BACK_URL and CARD_FACE_URL placeholder exports (DECK-03)
  - src/App.tsx stub with nanoid room ID generation and query-param routing
  - Unit tests for card-art export shape

affects: [02-02-lobby-panel, 03-game-board, 04-drag-drop]

tech-stack:
  added:
    - react@18.3.1
    - react-dom@18.3.1
    - @vitejs/plugin-react@6.0.1
    - vite@8.0.3
    - tailwindcss@4.2.2
    - @tailwindcss/vite@4.2.2
    - shadcn@4.1.2
    - @base-ui/react (installed by shadcn)
    - class-variance-authority
    - clsx
    - tailwind-merge
    - tw-animate-css
    - lucide-react@1.7.0
    - @types/node
    - @types/react
    - @types/react-dom
  patterns:
    - shadcn v4 base-nova style with HSL CSS variable overrides
    - Vite path aliases mirrored in both vite.config.ts and tsconfig.json
    - GitHub Pages base config via vite.config.ts base field

key-files:
  created:
    - vite.config.ts
    - src/main.tsx
    - src/App.tsx
    - src/globals.css
    - src/card-art.ts
    - src/vite-env.d.ts
    - src/components/ui/button.tsx
    - src/components/ui/separator.tsx
    - src/components/ui/badge.tsx
    - src/lib/utils.ts
    - tests/card-art.test.ts
    - components.json
    - index.html (updated)
  modified:
    - package.json
    - tsconfig.json

key-decisions:
  - "shadcn v4 base-nova style uses oklch colors by default; overrode CSS variables in :root with HSL channel values to match dark green felt UI-SPEC design tokens"
  - "shadcn CLI placed files in src/shared/ due to alias mismatch; manually moved to src/components/ui/ and updated components.json aliases to @/"
  - "Added @/* path alias to tsconfig.json and vite.config.ts to support shadcn component imports"
  - "vite-env.d.ts added to resolve TypeScript CSS side-effect import error from main.tsx"

requirements-completed: [DECK-03, ROOM-01]

duration: 4min
completed: 2026-04-03
---

# Phase 2 Plan 01: Frontend Scaffold Summary

**React 18 + Vite 8 frontend scaffold with shadcn v4 button/separator/badge components, dark green felt design tokens (HSL CSS vars), and card-art.ts placeholder exports satisfying DECK-03**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-04-03T01:44:13Z
- **Completed:** 2026-04-03T01:48:47Z
- **Tasks:** 2
- **Files modified:** 14

## Accomplishments

- React 18 + Vite 8 frontend scaffold with @tailwindcss/vite plugin, builds to dist/ without errors
- shadcn v4 initialized with button, separator, badge components; CSS variables overridden to dark green felt theme (160 38% 16% background, 38 92% 50% gold primary)
- src/card-art.ts created with CARD_BACK_URL and CARD_FACE_URL exports, unit-tested via TDD (3 passing tests)
- All 28 tests pass (25 prior server tests + 3 new card-art tests), no regressions

## Task Commits

1. **Task 1: Scaffold React + Vite + shadcn** - `54d84e0` (feat)
2. **Task 2: RED - card-art test** - `1147516` (test)
3. **Task 2: GREEN - card-art implementation** - `02a62bd` (feat)

## Files Created/Modified

- `vite.config.ts` - Vite config with base '/virtual-deck/', react() + tailwindcss() plugins, @/ and @shared/ aliases
- `tsconfig.json` - Added jsx: react-jsx, @/* path alias, .tsx in include array
- `src/globals.css` - Tailwind import + HSL CSS variables for dark green felt theme
- `src/main.tsx` - ReactDOM createRoot entry point
- `src/App.tsx` - Room routing stub: reads ?room param, generates nanoid(8) and redirects if missing
- `src/vite-env.d.ts` - Vite client type reference (fixes CSS import TS error)
- `src/card-art.ts` - DECK-03: CARD_BACK_URL string and CARD_FACE_URL(card) function with placeholder empty values
- `src/components/ui/button.tsx` - shadcn Button component using @base-ui/react
- `src/components/ui/separator.tsx` - shadcn Separator component
- `src/components/ui/badge.tsx` - shadcn Badge component
- `src/lib/utils.ts` - cn() utility from clsx + tailwind-merge
- `tests/card-art.test.ts` - Unit tests for DECK-03 export shape
- `components.json` - shadcn config with @/ aliases
- `package.json` - Added react, react-dom, vite, shadcn deps; added build and dev:client scripts
- `index.html` - HTML entry with Inter font link and root div (already existed, confirmed unchanged)

## Decisions Made

- shadcn v4 base-nova style uses `oklch()` colors by default; overrode the `:root` CSS variable block with bare HSL channel values (`160 38% 16%`) to match the dark green felt design tokens from UI-SPEC. The shadcn Tailwind v4 machinery still works correctly with these values.
- shadcn CLI created files in `src/shared/components/` due to the existing `@shared` alias; moved to `src/components/ui/` and updated components.json to use `@/` prefix.
- Added `@/*` alias to both tsconfig.json and vite.config.ts so shadcn component imports (`@/lib/utils`) resolve at compile and bundle time.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] shadcn init failed without pre-existing Tailwind install**
- **Found during:** Task 1 (shadcn init)
- **Issue:** `npx shadcn@latest init --defaults` failed with "We could not detect a supported framework" — Vite was not present yet. Second attempt failed with "No Tailwind CSS configuration found".
- **Fix:** Created minimal vite.config.ts with react() plugin first, then installed tailwindcss + @tailwindcss/vite, then ran shadcn init successfully. Matches Pitfall 1 sequence from RESEARCH.
- **Files modified:** vite.config.ts (bootstrap version, then overwritten with full config)
- **Committed in:** 54d84e0

**2. [Rule 3 - Blocking] shadcn CLI placed components in src/shared/ due to @shared alias**
- **Found during:** Task 1 (shadcn add button)
- **Issue:** CLI resolved the `@/` alias literally as a directory name, creating `@/components/ui/` and placing button in `src/shared/components/ui/button.tsx` due to the existing tsconfig @shared alias.
- **Fix:** Manually moved files to `src/components/ui/`, `src/lib/utils.ts`; updated components.json aliases from `@shared/components` to `@/components`; fixed button.tsx import from `@shared/lib/utils` to `@/lib/utils`.
- **Files modified:** components.json, src/components/ui/button.tsx
- **Committed in:** 54d84e0

**3. [Rule 3 - Blocking] TypeScript error: Cannot find module for CSS side-effect import**
- **Found during:** Task 1 (typecheck verification)
- **Issue:** `src/main.tsx` import of `./globals.css` caused TS2882 without Vite's client type defs.
- **Fix:** Created `src/vite-env.d.ts` with `/// <reference types="vite/client" />`.
- **Files modified:** src/vite-env.d.ts (created)
- **Committed in:** 54d84e0

---

**Total deviations:** 3 auto-fixed (all Rule 3 - blocking issues during scaffolding sequence)
**Impact on plan:** All auto-fixes were necessary for the scaffold to work. No scope creep. The shadcn v4 CLI behavior (oklch colors, alias resolution) differs from what the plan expected based on research, but all acceptance criteria are met.

## Known Stubs

- `src/card-art.ts`: `CARD_BACK_URL = ''` and `CARD_FACE_URL` returns `''` — intentional per plan. Phase 3 will replace with real image paths. The empty strings do not prevent Plan 01's goal (DECK-03 export shape established).
- `src/App.tsx`: Renders a minimal room-ID display. Plan 02 replaces the body with LobbyPanel.

## Issues Encountered

- shadcn v4.1.2 uses "base-nova" style by default which generates oklch() color values instead of the HSL channel format the plan expected. Overriding in the :root block is the correct approach — Tailwind v4 reads these as channel values regardless of whether they were originally in oklch or HSL format.

## Next Phase Readiness

- Frontend scaffold is complete; Plan 02 can build LobbyPanel component immediately
- shadcn Button, Separator, Badge are available via `@/components/ui/`
- Design tokens are in place: `bg-background`, `text-foreground`, `bg-primary` all resolve to felt theme colors
- No blockers for Plan 02

---
*Phase: 02-lobby-room-join*
*Completed: 2026-04-03*

## Self-Check: PASSED

All created files verified to exist. All task commits verified in git log.
