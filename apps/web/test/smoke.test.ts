import { describe, expect, it } from 'vitest';

describe('web', () => {
  it('runs in jsdom', () => {
    expect(typeof document).toBe('object');
  });
});
