/**
 * Route checks that survive the deploy base.
 *
 * React Router strips the `basename` before handing `useLocation()` a
 * pathname, but the app must not depend on that detail: a pathname can arrive
 * with the base attached (`/fremit/mockup`) depending on the router version
 * and the entry point, and a raw `startsWith('/mockup')` would then be false
 * at the very page it is meant to detect. Normalizing here keeps the check
 * correct either way.
 */

/** True when `pathname` is `route` or a child of it, with or without the base. */
export function isAppRoute(
  pathname: string,
  route: string,
  base: string = import.meta.env.BASE_URL,
): boolean {
  const normalizedBase = base.replace(/\/+$/, '');
  const path =
    normalizedBase.length > 0 && pathname.startsWith(normalizedBase)
      ? pathname.slice(normalizedBase.length)
      : pathname;

  return path === route || path.startsWith(`${route}/`);
}
