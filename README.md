# Fremit

Turn links, screenshots, and image URLs into polished presentation assets.

[Open the live app](https://mafhper.github.io/fremit/)

![Fremit promotional site](docs/readme/promo-site.png)

Fremit is a static React app for creating framed mockups from a website link, direct image URL, uploaded screenshot, or pasted image. It runs on GitHub Pages and is split into a public promo site plus a focused editor workspace.

## What It Does

- Imports screenshots, clipboard images, and direct image URLs
- Attempts website previews through Microlink screenshots, then Open Graph images
- Keeps the last successful composition when a later URL preview fails
- Frames content in desktop browser, phone, or tablet mockups
- Supports portrait and landscape device orientations
- Tunes viewport preset, shadow, radius, image fit, background, format, and export scale
- Exports the current canvas as PNG or JPG through `html-to-image`
- Supports English, Portuguese, and Spanish UI copy

![Fremit editor framing the promo site](docs/readme/editor-promo-site.png)

## URL Preview Contract

Fremit is intentionally static. It does not run a backend browser or access private sessions.

Website URLs are resolved in this order:

1. Microlink screenshot
2. Open Graph image
3. Manual fallback asking for a screenshot

Use an uploaded screenshot for authenticated pages, private apps, highly dynamic views, or any page where the generated URL preview does not match the desired state.

## Stack

- React 19
- TypeScript 5.9
- Vite 7
- React Router
- Zustand
- Tailwind CSS
- Radix UI primitives
- `html-to-image`
- `colorthief`
- `images.weserv.nl`
- Microlink
- Vitest
- Playwright

## Getting Started

```bash
bun install
bun run dev
```

Vite serves the app at `/fremit/`, matching the GitHub Pages base path.

## Scripts

```bash
bun run dev
bun run build
bun run lint
bun run test
bun run test:smoke
```

## GitHub Pages

Deployment is handled by `.github/workflows/deploy.yml`.

- GitHub Actions installs with `bun install --frozen-lockfile`
- GitHub Actions builds with `bun run build`
- `vite.config.ts` sets `base: '/fremit/'`
- `public/404.html` handles SPA deep-link fallback
- `src/main.tsx` restores redirected routes after a Pages refresh

## Dependency Safety

The repository keeps both `bun.lock` and `package-lock.json` committed because Bun drives local/CI installs while GitHub Dependabot audits npm manifests. Security overrides in `package.json` pin vulnerable transitive packages to patched versions when upstream dependency ranges lag behind advisories.

## Verification

Use the full local gate before publishing changes:

```bash
bun run lint
bun run build
bun run test
bun run test:smoke
```

For dependency or lockfile changes, also run:

```bash
bun install --frozen-lockfile --ignore-scripts
npm audit --package-lock-only --audit-level=high
npm audit signatures
```

## Project Notes

- The app is intentionally static and zero-cost.
- Mobile and tablet frames are generic mockups, not hardware simulations.
- Saved projects and long-lived composition history are out of scope for this phase.

## License

MIT
