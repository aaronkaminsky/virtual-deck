---
status: complete
phase: 09-player-identity-presence
source: [09-01-SUMMARY.md, 09-02-SUMMARY.md, 09-03-SUMMARY.md]
started: "2026-04-19T00:00:00Z"
updated: "2026-04-19T00:00:00Z"
---

## Current Test

<!-- OVERWRITE each test - shows where we are -->

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running dev server. Start fresh with `npm run dev` and `npx partykit dev`. Both boot without errors. Navigate to the app URL — the lobby screen loads (name input visible, Join Game button visible). No console errors.
result: pass

### 2. Lobby Name Input and Join Gate
expected: The lobby shows a text input for your name and a "Join Game" button. The Join Game button is disabled when the input is empty. Typing a name enables the button. Clicking Join Game connects to the room and the game board appears.
result: pass

### 3. Name Pre-fill from localStorage
expected: Enter a name and join. Refresh the page (or open a new tab to the same room). The name input is pre-filled with the name you previously entered.
result: pass

### 4. Name Truncation at 20 Characters
expected: In the name input, try typing more than 20 characters. The input stops accepting characters after 20 — you cannot type a name longer than 20 chars.
result: pass

### 5. Your Name Label Above Your Hand
expected: After joining with a name, your name appears as a label above your own hand zone at the bottom of the board. A colored presence dot is visible next to the name.
result: pass

### 6. Opponent Name Labels Above Their Hands
expected: When a second player joins with a different name, their name appears above their hand zone on the board (visible to you). A presence dot is shown next to their name.
result: pass

### 7. Presence Dot Colors
expected: A connected player's presence dot is green. If a player disconnects (close their tab), their dot turns gray and their name remains visible.
result: pass

### 8. No Presence Dots in Header
expected: The app header area does NOT show any presence/connection dots. The dots only appear next to player names above each hand zone.
result: pass

## Summary

total: 8
passed: 8
issues: 0
skipped: 0
pending: 0

## Gaps

[none yet]
