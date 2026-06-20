import { describe, it, expect } from 'vitest';
import { slugify } from '../src/lib/slug';

describe('slugify', () => {
  it('lowercases and dashes spaces', () => {
    expect(slugify('Friday Poker Night')).toBe('friday-poker-night');
  });
  it('is case-insensitive', () => {
    expect(slugify('Poker')).toBe('poker');
    expect(slugify('POKER')).toBe('poker');
  });
  it('trims surrounding whitespace', () => {
    expect(slugify('  hello  ')).toBe('hello');
  });
  it('treats underscores as separators', () => {
    expect(slugify('a_b c')).toBe('a-b-c');
  });
  it('strips punctuation and accents without transliterating', () => {
    expect(slugify('café ☕')).toBe('caf');
  });
  it('returns empty string for all-unusable input', () => {
    expect(slugify('🎉🎉')).toBe('');
    expect(slugify('---')).toBe('');
    expect(slugify('   ')).toBe('');
  });
  it('collapses repeated dashes and trims edge dashes', () => {
    expect(slugify('a---b')).toBe('a-b');
    expect(slugify('-lead-trail-')).toBe('lead-trail');
  });
  it('caps length at 24 chars and re-trims a trailing dash from the cut', () => {
    const long = 'a'.repeat(23) + '-bbb'; // 23 a's, dash at index 23
    const out = slugify(long);
    expect(out).toBe('a'.repeat(23));
    expect(out.length).toBe(23);
    expect(out.endsWith('-')).toBe(false);
  });
  it('caps a long single word at 24 chars', () => {
    expect(slugify('a'.repeat(30))).toBe('a'.repeat(24));
  });
});
