import { describe, expect, it } from 'vitest';
import worker from '../public/sw.js?raw';

describe('service worker update policy', () => {
  it('versions the shell, removes previous shells, and uses network-first navigation', async () => {
    expect(worker).toMatch(/const CACHE = 'gpu-vram-burnin-v\d+'/);
    expect(worker).toContain("filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE)");
    expect(worker).toContain("const networkFirst = event.request.mode === 'navigate'");
    expect(worker).toContain("try { return await network(); }");
    expect(worker).toContain("caches.match('/')");
  });
});
