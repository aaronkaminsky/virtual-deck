import { nanoid } from 'nanoid';

const STORAGE_KEY = 'playerId';

export function getOrCreatePlayerId(): string {
  const existing = localStorage.getItem(STORAGE_KEY);
  if (existing) return existing;
  const id = nanoid();
  localStorage.setItem(STORAGE_KEY, id);
  return id;
}
