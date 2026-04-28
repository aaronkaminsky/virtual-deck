# Phase 16: Developer README - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-28
**Phase:** 16-developer-readme
**Areas discussed:** Architecture overview format, Audience assumption, Deploy section scope

---

## Architecture Overview Format

| Option | Description | Selected |
|--------|-------------|----------|
| Prose paragraphs | 2–3 paragraphs: client/server split, PartyKit role, hand masking, message flow. No tooling needed to render. | ✓ |
| Annotated source map | Table mapping key files (party/index.ts, src/shared/, etc.) to their role. Scannable, quick to update. | |
| ASCII/Mermaid diagram | Visual flow showing client→server→client message loop and hand masking boundary. | |

**User's choice:** Prose paragraphs

**Follow-up — Include decision rationale?**

| Option | Description | Selected |
|--------|-------------|----------|
| Structure only | Explain what the parts are and how data flows. Link to PROJECT.md Key Decisions for rationale. | ✓ |
| Include rationale | Add a "Why this stack" paragraph in the README. | |

**User's choice:** Structure only, with a link/reference to `.planning/PROJECT.md` (Key Decisions table)

---

## Audience Assumption

| Option | Description | Selected |
|--------|-------------|----------|
| Future self | Quick-start reference — commands and gotchas. No need to explain why React or what PartyKit is. | |
| External contributor | Fully self-contained — explains stack choices, what PartyKit is, why GitHub Pages. | |
| Both (lean toward future self) | Primarily for future Aaron, enough context that an external dev could follow without googling the stack. | ✓ |

**User's choice:** Both (lean toward future self)

**Follow-up — Opening section?**

| Option | Description | Selected |
|--------|-------------|----------|
| Brief project description first | 1–2 sentences on what Virtual Deck is, then setup. | ✓ |
| Straight to setup | No preamble. README starts immediately with Prerequisites / Local Setup. | |

**User's choice:** Brief project description first

---

## Deploy Section Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Commands + env var prereqs | Document commands and call out VITE_PARTYKIT_HOST GitHub Actions secret. | |
| Commands only | Just the commands; assume reader knows about env var and GitHub Pages setup. | |
| Full pre-flight | GitHub Pages activation, partykit login, project creation, GitHub secret setup, then commands. | ✓ |

**User's choice:** Full pre-flight

**Follow-up — Separate subsections?**

| Option | Description | Selected |
|--------|-------------|----------|
| Separate subsections | Frontend (GitHub Pages) and Server (PartyKit Cloud) as distinct deploy subsections. | ✓ |
| Single combined section | Both targets documented in one sequence. | |

**User's choice:** Yes, separate subsections

---

## Claude's Discretion

- Section ordering within Local Setup (prerequisites, clone/install, start commands) follows conventional README structure.
- Whether to use code blocks vs. inline code follows standard README conventions.

## Deferred Ideas

None — discussion stayed within phase scope.
