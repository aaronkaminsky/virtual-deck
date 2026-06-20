import { describe, it, expect, vi, afterEach } from 'vitest';
import { probeOccupancy } from '../src/lib/occupancy';

afterEach(() => vi.unstubAllGlobals());

describe('probeOccupancy', () => {
  it('returns parsed occupancy on a successful response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true, status: 200, json: async () => ({ occupied: true, playerCount: 2 }),
    })));
    expect(await probeOccupancy('poker')).toEqual({ occupied: true, playerCount: 2 });
  });
  it('fails open on a network error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network down'); }));
    expect(await probeOccupancy('poker')).toEqual({ occupied: false, playerCount: 0 });
  });
  it('fails open on a non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) })));
    expect(await probeOccupancy('poker')).toEqual({ occupied: false, playerCount: 0 });
  });
});
