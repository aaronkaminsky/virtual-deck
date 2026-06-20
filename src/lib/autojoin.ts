// One-shot "skip the lobby" intent, set by HomeView before navigating to a room
// and consumed once by RoomView on mount. sessionStorage keeps it tab-scoped, so
// a shared URL opened in a new tab/device never inherits the intent.
const AUTOJOIN_FLAG = 'vd:autojoin';

export function markAutojoin(): void {
  sessionStorage.setItem(AUTOJOIN_FLAG, '1');
}

export function consumeAutojoin(): boolean {
  const marked = sessionStorage.getItem(AUTOJOIN_FLAG) === '1';
  sessionStorage.removeItem(AUTOJOIN_FLAG);
  return marked;
}
