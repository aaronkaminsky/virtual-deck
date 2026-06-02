export const CELEBRATION_DURATION_MS = 5000;
export const CELEBRATION_BURST_COUNT = 12; // ~20% denser than the 10-burst preview

export interface Burst {
  xPct: number;   // horizontal position, 12–88
  yPct: number;   // vertical position, 12–62
  delayMs: number; // 0 .. (DURATION - 1700) so the last burst finishes by ~5s
  particles: number; // 8–11 suits per burst
  radius: number;  // 55–95 px explosion radius
}

export function generateBursts(count: number, rand: () => number = Math.random): Burst[] {
  const bursts: Burst[] = [];
  for (let i = 0; i < count; i++) {
    bursts.push({
      xPct: 12 + rand() * 76,
      yPct: 12 + rand() * 50,
      delayMs: Math.floor(rand() * (CELEBRATION_DURATION_MS - 1700)),
      particles: 8 + Math.floor(rand() * 4),
      radius: 55 + rand() * 40,
    });
  }
  return bursts;
}
