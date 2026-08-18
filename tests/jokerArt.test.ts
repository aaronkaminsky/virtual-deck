import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// PNG header: 8-byte signature, then the IHDR chunk whose width/height are
// big-endian uint32s at byte offsets 16 and 20.
function pngSize(path: string): { width: number; height: number } {
  const buf = readFileSync(path);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

// Vitest runs with cwd at the project root; no test in this suite uses __dirname
// (these files are ESM).
const ART_DIR = resolve(process.cwd(), 'public', 'cards', 'jumbo');

describe('joker art assets', () => {
  const files = ['redJoker.png', 'blackJoker.png'];

  for (const file of files) {
    it(`${file} exists at the same 210x315 size as the rest of the deck`, () => {
      const path = resolve(ART_DIR, file);
      expect(existsSync(path)).toBe(true);
      expect(pngSize(path)).toEqual({ width: 210, height: 315 });
    });
  }

  it('the two jokers are not byte-identical', () => {
    const dir = ART_DIR;
    const red = readFileSync(resolve(dir, 'redJoker.png'));
    const black = readFileSync(resolve(dir, 'blackJoker.png'));
    expect(red.equals(black)).toBe(false);
  });
});
