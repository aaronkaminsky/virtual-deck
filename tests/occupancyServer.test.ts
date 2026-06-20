import { describe, it, expect } from 'vitest';
import { occupancyBody, corsHeaders } from '../party/index';

describe('occupancyBody', () => {
  it('reports free when no live connections', () => {
    expect(occupancyBody(0)).toEqual({ occupied: false, playerCount: 0 });
  });
  it('reports occupied with the live connection count', () => {
    expect(occupancyBody(3)).toEqual({ occupied: true, playerCount: 3 });
  });
});

describe('corsHeaders', () => {
  it('reflects an allowlisted origin', () => {
    expect(corsHeaders('http://localhost:5173')['Access-Control-Allow-Origin'])
      .toBe('http://localhost:5173');
    expect(corsHeaders('https://aaronkaminsky.github.io')['Access-Control-Allow-Origin'])
      .toBe('https://aaronkaminsky.github.io');
  });
  it('falls back to the prod origin for unknown or null origins', () => {
    expect(corsHeaders('https://evil.example')['Access-Control-Allow-Origin'])
      .toBe('https://aaronkaminsky.github.io');
    expect(corsHeaders(null)['Access-Control-Allow-Origin'])
      .toBe('https://aaronkaminsky.github.io');
  });
  it('only advertises GET and OPTIONS', () => {
    expect(corsHeaders(null)['Access-Control-Allow-Methods']).toBe('GET, OPTIONS');
  });
});
