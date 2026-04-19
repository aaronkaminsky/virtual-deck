Add password protection?
Add logging of IP address, along with usage stats and player name?
Add sound effects, should go near the "art" features

Consider, can we add browser use to Claude so it can do more self testing?

This file is some brainstorming ideas for the virtual card deck I am building.

What is below is just one approach, alternatives that improve on my goals are welcome.

---

# Project Blueprint: Synced Sandbox Card Game

## 1. Project Vision
* **Goal:** A web-based, multiplayer "sandbox" for card games using a standard 52-card deck.
* **Core Mechanics:** Shared board state with private "hand" zones for individual players.
* **Philosophy:** Minimal enforcement of rules; players move cards manually as they would in person. As much as possible, the goals is to support the flexibility and fun of playing cards in person.

## 2. Architectural Components

| Component | Technology | Responsibility | Hosting |
| :--- | :--- | :--- | :--- |
| **Frontend** | React / Vanilla JS | UI, Drag-and-drop, Rendering hands. | **GitHub Pages** (Static) |
| **Real-time Engine**| **PartyKit** (Cloudflare) | State synchronization & "Room" logic. | **PartyKit Cloud** (Edge) |
| **Communication** | WebSockets (`partysocket`) | Low-latency bi-directional updates. | Encrypted (WSS) |

---

## 3. Key Technical Decisions

### Why PartyKit over Supabase?
* **Low Latency:** PartyKit runs in memory at the "edge" (Cloudflare’s global network). This ensures that dragging a card feels fluid and responsive, rather than waiting for database writes.
* **Server Authority:** Unlike pure Peer-to-Peer, a PartyKit "Room" script allows you to hide card data. The server knows what is in everyone’s hand but only broadcasts the "Back of Card" image to opponents.
* **Architectural Fit:** As a programmer, you have direct control over the "Room" logic in TypeScript without managing a full Linux server or complex database schemas.

### Security & Privacy Logic
* **Connection Security:** Uses `onBeforeConnect` hooks to validate users or room passwords.
* **Data Masking:** The server filters the state JSON based on the `connection.id`.
    * *Public Board:* Full data sent to everyone.
    * *Private Hand:* Full data sent to the owner; `face_up: false` sent to everyone else.

---

## 4. Deployment Workflow (macOS / M1)

1.  **Local Development:**
    * Run the PartyKit server locally: `npx partykit dev`.
    * Run the Frontend (Vite/Webpack) locally: `npm run dev`.
2.  **Backend Deployment:**
    * Deploy the "Brain" to the cloud: `npx partykit deploy`. This provides a stable URL (e.g., `my-game.your-user.partykit.dev`).
3.  **Frontend Deployment:**
    * Build the static assets and push to **GitHub Pages**. Ensure the frontend points to your deployed PartyKit URL.

---

## 5. Cost & Scalability (2026 Outlook)
* **Cost:** **$0** (Hobby Tier). Since it’s a project for friends, you will comfortably stay within the free limits of both GitHub Pages and PartyKit/Cloudflare.
* **Maintenance:** "Serverless" architecture. There are no OS updates to manage or databases to tune.
* **Location:** Since you are in **San Jose**, Cloudflare will likely host your active "Room" in a nearby Silicon Valley data center, resulting in sub-20ms latency for you and local friends.

