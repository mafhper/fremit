import { describe, expect, it } from 'vitest';
import { isAppRoute } from '@/lib/appPath';

describe('isAppRoute', () => {
  const base = '/fremit/';

  it('matches the route with and without the deploy base', () => {
    expect(isAppRoute('/editor', '/editor', base)).toBe(true);
    expect(isAppRoute('/fremit/editor', '/editor', base)).toBe(true);
    expect(isAppRoute('/mockup', '/mockup', base)).toBe(true);
    expect(isAppRoute('/fremit/mockup', '/mockup', base)).toBe(true);
  });

  it('matches child paths of the route', () => {
    expect(isAppRoute('/fremit/mockup/print', '/mockup', base)).toBe(true);
    expect(isAppRoute('/mockup/print', '/mockup', base)).toBe(true);
  });

  it('does not match siblings, shared prefixes or the base root', () => {
    expect(isAppRoute('/fremit/editorial', '/editor', base)).toBe(false);
    expect(isAppRoute('/fremit-editor', '/editor', base)).toBe(false);
    expect(isAppRoute('/fremit', '/mockup', base)).toBe(false);
    expect(isAppRoute('/fremit/', '/mockup', base)).toBe(false);
    expect(isAppRoute('/', '/editor', base)).toBe(false);
  });

  it('works with a root base', () => {
    expect(isAppRoute('/mockup', '/mockup', '/')).toBe(true);
    expect(isAppRoute('/mockup/print', '/mockup', '/')).toBe(true);
    expect(isAppRoute('/editorial', '/editor', '/')).toBe(false);
  });
});
