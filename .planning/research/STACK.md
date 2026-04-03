# Technology Stack

**Project:** Virtual Deck
**Researched:** 2026-03-28
**Confidence note:** Versions are from training data (cutoff Aug 2025). All version numbers marked [UNVERIFIED] must be confirmed against current releases before use.

---

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| React | 18.x [UNVERIFIED] | Frontend UI, component tree, state | Project already leans toward React. Component model maps cleanly to Card, Hand, Pile, Board. Hooks make local drag state manageable. |
| TypeScript | 5.x [UNVERIFIED] | Type safety across frontend and PartyKit server | PartyKit server is TypeScript-native. Sharing types between client and server (GameState, Card, Player) eliminates a whole class of sync bugs. |
| Vite | 5.x [UNVERIFIED] | Dev server, build tooling | Fast HMR, zero-config GitHub Pages deploys via `vite build`. Lighter than webpack for a project this size. |

### Real-Time Engine

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| PartyKit | latest (no semver — deploy via CLI) [UNVERIFIED] | WebSocket room server, authoritative game state, hand masking | Already decided. Edge-hosted, in-memory per room, server can filter state per connection ID — exactly what server-authoritative hand privacy requires. |
| partysocket | bundled with PartyKit SDK [UNVERIFIED] | Client-side WebSocket wrapper | Handles reconnection, message queuing, and typed message passing. Use instead of raw WebSocket. |

### Hosting / Deployment

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| GitHub Pages | N/A | Static frontend hosting | Free, integrated with repo, trivially configured with Vite. No server needed. |
| PartyKit Cloud | N/A | Edge server hosting for room logic | Free hobby tier covers 2–4 player sessions at the expected usage volume. |

### Drag-and-Drop

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @dnd-kit/core + @dnd-kit/sortable | 6.x [UNVERIFIED] | Card drag between hand, zones, piles | dnd-kit is pointer-events based (works on touch/mouse), does not rely on the HTML5 drag-and-drop API (which has poor mobile support and z-index quirks). Accessible by default. react-beautiful-dnd is archived/deprecated — do not use. |

### Randomization

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Native `crypto.getRandomValues` | N/A (Web Crypto API, built-in) | Shuffle pile with cryptographically random order | No library needed. Available in all modern browsers and in Cloudflare Workers (where PartyKit runs). Fisher-Yates shuffle seeded from `crypto.getRandomValues` is the correct approach. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| nanoid | 4.x [UNVERIFIED] | Generate short room codes and player IDs | nanoid's default alphabet produces URL-safe IDs. Use for room code generation on the PartyKit server. Confirm v4+ works in Cloudflare Workers (no Node.js crypto dependency). |
| zustand | 4.x [UNVERIFIED] | Local client-side UI state (drag preview, selected card, etc.) | Lightweight, no boilerplate. Use for ephemeral UI state that does not need to sync over the wire — not for game state (that lives on PartyKit). Do not put game state in zustand; it should flow from server messages. |
| immer | 10.x [UNVERIFIED] | Immutable state updates inside zustand and PartyKit | Prevents accidental mutation of shared game state objects. Makes hand-masking logic easier to reason about. |

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Drag-and-drop | @dnd-kit/core | react-beautiful-dnd | Archived by Atlassian, no longer maintained. |
| Drag-and-drop | @dnd-kit/core | HTML5 native drag API | Poor z-index behavior, no touch support, difficult to customize card ghost rendering. |
| Real-time | PartyKit | Supabase Realtime | Database-write latency unsuitable for card drags. No per-connection state masking without custom functions. |
| Real-time | PartyKit | Liveblocks | More suited to collaborative document editing; pricing model doesn't fit hobby use. |
| Real-time | PartyKit | raw Cloudflare Durable Objects | PartyKit is a DX wrapper around Durable Objects — same primitives, less boilerplate. No reason to drop down unless PartyKit becomes a constraint. |
| Frontend framework | React | Vanilla JS | PROJECT.md notes "React or Vanilla JS." React wins because shared type-safe components (Card, Pile) are worth the overhead at this feature count. Vanilla JS is viable but would require manual DOM diffing for real-time updates. |
| Frontend framework | React | Svelte / SolidJS | Not worth the ecosystem risk for a small project. Less community tooling for drag-and-drop and WebSocket integration. |
| Build tool | Vite | Create React App | CRA is deprecated. Do not use. |
| Client state | zustand | Redux | Redux is overengineered for a project where global state is primarily owned by the PartyKit server. |
| Room IDs | nanoid | uuid | uuid v4 IDs are 36 chars; nanoid default is 21 chars. Both work. nanoid is shorter and URL-friendlier for room codes. |

---

## Installation

```bash
# Scaffold Vite + React + TypeScript
npm create vite@latest virtual-deck -- --template react-ts

# Runtime dependencies
npm install partysocket @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities zustand immer nanoid

# Dev dependencies
npm install -D partykit typescript @types/react @types/react-dom
```

> [UNVERIFIED] — Package names and install commands reflect training data. Verify `partysocket` is still the correct client package name for PartyKit (it may have been folded into a unified SDK). Check PartyKit docs before running.

---

## Version Validation Checklist

Before any code is written, verify these against current official sources:

| Claim | Source to Check | Risk if Wrong |
|-------|----------------|---------------|
| React 18.x is current stable | https://react.dev | React 19 may be stable; breaking changes in concurrent features |
| @dnd-kit/core 6.x is current | https://github.com/clauderic/dnd-kit | API changes between major versions |
| PartyKit server API (onConnect, onMessage, onBeforeConnect hooks) | https://docs.partykit.io | PartyKit is pre-1.0 and API has changed in the past |
| `partysocket` is still the correct client package | https://docs.partykit.io | May have been renamed or merged |
| nanoid v4 works in Cloudflare Workers | https://github.com/ai/nanoid | v3 had a Node.js crypto dependency; v4 fixed it, but confirm |
| Vite 5.x GitHub Pages deploy workflow | https://vitejs.dev/guide/static-deploy | `base` config path for GH Pages is version-sensitive |
| crypto.getRandomValues in Cloudflare Workers | https://developers.cloudflare.com/workers/runtime-apis/web-crypto/ | If not available, need a fallback; LOW risk, Web Crypto is part of WinterCG |

---

## Sources

- Training data (cutoff Aug 2025) — all version claims LOW confidence
- PROJECT.md and project-brainstorm.md (this repo) — stack decisions HIGH confidence, pre-decided by user
- PartyKit documentation should be checked at https://docs.partykit.io before implementation
- dnd-kit repo at https://github.com/clauderic/dnd-kit for current version and API
