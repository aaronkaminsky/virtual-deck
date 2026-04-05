import { nanoid } from 'nanoid';

const STORAGE_KEY = 'playerId';

export function getOrCreatePlayerId(): string {
  const params = new URLSearchParams(window.location.search);
  const urlParam = params.get('player');

  let id: string;

  if (urlParam) {
    id = urlParam;
    localStorage.setItem(STORAGE_KEY, id);
  } else {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      id = stored;
    } else {
      id = nanoid();
      localStorage.setItem(STORAGE_KEY, id);
    }
  }

  params.set('player', id);
  history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);

  return id;
}
