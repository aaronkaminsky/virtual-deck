# Features Research — Virtual Deck (Multiplayer Card Game Sandbox)

## Summary

Standard feature set for a multiplayer browser card game sandbox. 5 table-stakes features are missing from the initial requirements and should be added before roadmap creation.

---

## Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Visible player list / presence | Players need to know who is in the room and whether everyone has joined | Low | Show name + connection status. Without this, no one knows if someone disconnected vs. is thinking. |
| Player identity / display name | Players address each other by name during voice chat; "Player 1" breaks the experience | Low | Set on join, no auth required — just a nickname in session. |
| Reconnect / rejoin to existing room | Network hiccups are common; losing your hand on disconnect is a dealbreaker | Medium | PartyKit holds room state in-memory; rejoin must restore the player's private hand. Most critical correctness requirement after hand masking. |
| Card count visibility | Players need to see how many cards are in each pile and in each opponent's hand (but not which cards) | Low | Show integer count on pile and on opponents' hands. Physical decks always show this implicitly. |
| Undo last action | Misclicks happen constantly; absent undo, every drag dispute requires verbal negotiation | Medium | Minimum: single-level undo of last card move. Full history is differentiating. |
| Reset / new round | Players need to collect all cards and restart without refreshing the page | Low | "Collect all cards → shuffle into draw pile." Without this, each round requires a page reload. |
| Visual feedback on zone ownership | Players need to know which zone belongs to whom | Low | Color-coded zone borders or player labels on piles. |

---

## Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Action log / history | "What just happened?" — last N moves visible to all players | Medium | Useful for dispute resolution. Extension of undo history. |
| Named zones / pile labels | Reduce verbal coordination; zones labeled "Draw", "Discard", etc. | Low | Text label per zone. Large UX improvement for structured games. |
| Spectator mode | 5th+ person watches without playing | Low | No hand updates; sees full table state. |
| Zoom / inspect card | Enlarge a card for face detail on small screens | Low | Useful for mobile or small windows. |
| Animated card movement | Cards slide across table instead of teleporting; spatial orientation | Medium | Polish only; not functional. |
| Peek at face-down card (private) | Player secretly views a face-down table card without revealing it | Medium | Requires server-side "who can see this card" state. More complex than it appears. |
| Draw from bottom of pile | Complement to draw-from-top; used in some games | Low | — |
| Cut a pile | Split pile at chosen point; common pre-deal ritual | Low | Produces two piles at cut position. |

---

## Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Rule enforcement / turn order | Constrains which games work; kills "any card game" promise; massive state machine | Trust players to call their own game |
| Score tracking UI | Every game scores differently; generic tracker is wrong or never used | Honor system |
| In-app text chat | Audience is on voice call already; chat is clutter | External voice/video (Discord, FaceTime) |
| Account / auth system | Massive scope; no security benefit for this threat model | Room link is access control |
| Card art upload UI | Storage/serving infrastructure; not needed for hobby use | Swap via code change |
| AI / bot players | Out of scope for social use case | Not applicable |
| Game library / lobbies | No matchmaking needed; players know each other | Direct link sharing |
| Persistent rooms / save state | Sessions end cleanly; saved state introduces stale-data bugs | Rooms expire when all players leave |
| Mobile-first layout | Drag-and-drop on mobile is significantly worse UX; target desktop | Don't break on mobile, but don't optimize |

---

## Feature Dependencies

```
Player identity → Player presence list
Player presence list → Reconnect-to-hand (need to identify who is reconnecting)
Private hand (server-masked) → Pass card to another player's hand
Private hand (server-masked) → Peek at face-down card [differentiator]
Pile zones → Shuffle / Draw / Deal / Reset
Drag-and-drop → Undo (undo requires knowing what the last drag moved)
Card count visibility → standalone
```

---

## Missing from Initial Requirements

The following table-stakes features are **not in the current PROJECT.md requirements** and should be added before roadmap creation:

1. **Player presence / display names** — Without this, no one knows if the room is ready or if someone disconnected. Low complexity.
2. **Card count visibility** — Players can't track pile sizes without it. Fundamental to every card game. Low complexity.
3. **Reconnect-to-hand** — Any disconnect destroys a player's private hand without this. This is a correctness requirement. Medium complexity.
4. **Reset / new round** — Without collecting all cards back to a pile, the product supports one round per page load. Low complexity.
5. **Undo (single-step)** — Misclicks on drag-and-drop are constant. Without undo, players argue about "did that count?" Medium complexity.
