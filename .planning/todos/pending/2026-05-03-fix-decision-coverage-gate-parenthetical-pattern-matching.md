---
created: 2026-05-03T16:43:06.306Z
title: Fix decision-coverage gate parenthetical pattern matching
area: planning
files:
  - .planning/phases/16.1-fix-partykit-ci-deploy/16.1-01-PLAN.md
---

## Problem

The `gsd-sdk query check.decision-coverage-plan` gate only recognizes `D-NN:` format (decision ID followed by a colon) when checking whether a plan covers CONTEXT.md decisions. It returns false negatives when plans use parenthetical notation like `(per D-01)`, `(D-02)`, or `(per D-01/D-02)`.

Surfaced during Phase 16.1 planning: the plan-checker (AI agent) verified all 4 decisions were explicitly covered throughout the plan body, action blocks, acceptance criteria, and must_haves — but the SDK gate reported `covered: 0` because no `D-01:` pattern appeared.

## Solution

Update the gate's matching logic to recognize these equivalent forms:
- `D-01:` (current — requires colon)
- `(per D-01)` — most common in planner output
- `(D-01)` — also common
- `D-01,` — comma-separated references
- `D-01/D-02` — slash-combined references

Word-boundary matching should be used (`\bD-\d+\b`) so `D-1` doesn't match `D-10`.
