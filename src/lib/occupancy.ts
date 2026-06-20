import { PARTYKIT_HOST } from './partyHost';

export interface Occupancy {
  occupied: boolean;
  playerCount: number;
}

const FREE: Occupancy = { occupied: false, playerCount: 0 };

export async function probeOccupancy(slug: string): Promise<Occupancy> {
  const proto = import.meta.env.DEV ? 'http' : 'https';
  try {
    const res = await fetch(`${proto}://${PARTYKIT_HOST}/parties/main/${slug}`);
    if (!res.ok) return FREE;
    const data = (await res.json()) as Partial<Occupancy>;
    return { occupied: !!data.occupied, playerCount: data.playerCount ?? 0 };
  } catch {
    return FREE; // fail open — a flaky probe must never block table creation
  }
}
