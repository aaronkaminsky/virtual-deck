# Phase 2: Discussion Log

**Session:** 2026-04-02
**Areas discussed:** Room entry flow, URL/routing strategy, Player naming, Card art swap point

---

## Area 1: Room Entry Flow

**Q:** When someone opens the app with no room in the URL, what should happen?

**Options presented:**
- Auto-create a room (Recommended)
- Landing page with Create / Join
- Join-only landing page

**Clarification asked:** "Who creates the room?"
**Clarification provided:** Any player can be the one to start a session. "Creating a room" = what happens when the first person opens the app. PartyKit creates rooms on demand (any room ID works), so "room not found" is not a real error state.

**Decision:** Auto-create — root URL generates nanoid room ID and redirects. Room param joins. No landing screen.

---

## Area 2: URL / Routing Strategy

**Q:** What should the shareable room URL look like?

**Options presented:**
- Query param: `?room=ABC123` (Recommended)
- Hash: `#ABC123`
- Clean path: `/room/ABC123`

**Decision:** Query param `?room=ABC123`. Simple, no GH Pages configuration needed.

---

## Area 3: Player Naming

**Q:** PRES-01 (player display names) is v2. How should Phase 2 handle player identity?

**Options presented:**
- Defer entirely — anonymous for now (Recommended)
- Collect name in join flow

**Decision:** Defer entirely. Players are anonymous tokens. `Player` type unchanged.

---

## Area 4: Card Art Swap Point

**Q:** How should card art be configured in the codebase?

**Options presented:**
- Single constants file `src/card-art.ts` (Recommended)
- Public assets + naming convention

**Decision:** `src/card-art.ts` with `CARD_BACK_URL` and `CARD_FACE_URL(card)`. Placeholders for Phase 2; real images in Phase 3.
