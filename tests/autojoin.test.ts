import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { markAutojoin, consumeAutojoin } from '../src/lib/autojoin';

function makeStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  };
}

beforeEach(() => { vi.stubGlobal('sessionStorage', makeStorage()); });
afterEach(() => { vi.unstubAllGlobals(); });

describe('autojoin intent', () => {
  it('consumeAutojoin returns false when nothing was marked', () => {
    expect(consumeAutojoin()).toBe(false);
  });
  it('marks then consumes as true', () => {
    markAutojoin();
    expect(consumeAutojoin()).toBe(true);
  });
  it('is one-shot: a second consume returns false', () => {
    markAutojoin();
    consumeAutojoin();
    expect(consumeAutojoin()).toBe(false);
  });
});
