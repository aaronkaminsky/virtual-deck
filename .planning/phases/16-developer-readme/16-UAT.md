---
status: complete
phase: 16-developer-readme
source: [16-01-SUMMARY.md]
started: 2026-04-29T00:00:00Z
updated: 2026-04-29T00:30:00Z
---

## Current Test

[testing complete]

## Tests

### 1. README exists and is navigable
expected: Open README.md at the repo root. It has a title, and five clear H2 sections: Local Setup, Architecture, Tests, Deploy. Each section is present and easy to navigate.
result: pass

### 2. Local Setup: two-terminal start
expected: The Local Setup section tells you to run `npm run dev` in one terminal and `npm run dev:client` in another. Port numbers (1999 for PartyKit, 5173 for Vite) are mentioned. The URL to open in a browser is documented (`http://localhost:5173/virtual-deck/`).
result: pass

### 3. Command reference table
expected: The README includes a command reference table listing all dev commands — including `npm run dev`, `npm run dev:client`, `npm test`, `npm run test:e2e`, `npm run typecheck`, and `npm run test:watch`. Each command has a description.
result: pass

### 4. Architecture section: hand masking explanation
expected: The Architecture section explains (in prose) the client/server split, PartyKit's role, and how hand privacy is maintained via `viewFor` — each player only receives their own hand from the server. No bullet lists or diagrams — just readable prose.
result: pass

### 5. Tests section: how to run e2e tests
expected: The Tests section explains how to run Playwright e2e tests (`npm run test:e2e`), mentions the first-run browser install step (`npx playwright install chromium`), and notes the `reuseExistingServer` behavior. The note about mixed server state (both-or-neither) is present.
result: pass

### 6. Deploy section: GitHub Pages pre-flight
expected: The Deploy section covers the GitHub Pages frontend deploy: enabling GitHub Pages in Settings, setting the `VITE_PARTYKIT_HOST` secret, and triggering via push to main or `workflow_dispatch`. Steps are clear enough for a first-time deploy.
result: issue
reported: "README instructs adding VITE_PARTYKIT_HOST as a GitHub Actions secret, but deploy.yml hardcodes the value directly — the secret is never read. Instructions are incorrect and should be removed."
severity: minor

### 7. Deploy section: PartyKit Cloud pre-flight
expected: The Deploy section covers the PartyKit server deploy: `partykit login`, then `npm run deploy`. First-time deploy order (server before frontend) is noted.
result: issue
reported: "VITE_PARTYKIT_HOST secret referenced again at lines 134 and 149 — same incorrect instructions as test 6. The first-time deploy order (login → deploy server → push to main) is correct, but the step to add the secret (line 149) should be replaced with editing deploy.yml."
severity: minor

## Summary

total: 7
passed: 5
issues: 2
pending: 0
skipped: 0

## Gaps

- truth: "Deploy section should accurately describe how VITE_PARTYKIT_HOST is configured — it is hardcoded in deploy.yml, not read from a secret"
  status: failed
  reason: "README instructs adding VITE_PARTYKIT_HOST as a GitHub Actions secret in three places (lines 105-106, 134, 149), but deploy.yml hardcodes the value directly — the secret is never read. Instructions are incorrect and should be replaced with a note to edit deploy.yml for forks."
  severity: minor
  test: 6 and 7
  artifacts: [README.md, .github/workflows/deploy.yml]
  missing: ["Remove all three secret setup references; document that host is hardcoded in deploy.yml and forks must edit it directly"]
