# Sumit Gupta Portfolio — Next.js migration

This project converts the supplied standalone HTML portfolio into a fresh Next.js App Router project while preserving the original styling and animation behavior.

## Requirements

- Node.js 20.9 or newer (Node.js 22 is recommended)
- npm

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Checks

```bash
npm run typecheck
npm run build
```

## Structure

- `app/globals.css` — original CSS preserved from the supplied HTML.
- `components/PortfolioHero.tsx` — header and hero layout.
- `components/VantaFog.tsx` — browser-only Vanta setup and teardown; uses the same CDN scripts and settings as the source HTML.
- `components/SakshiDotMatrix.tsx` — original Canvas 2D letter sampling, dot animation, pointer response, and gradient fallback.
- `components/SakshiCrystalScene.tsx` — original Three.js 0.160.0 crystal, particles, orbit rings, pointer behavior, and resource cleanup.
- `components/ForbiddenPage.tsx` — the original Forbidden-style screen for other paths.
- `app/[...slug]/page.tsx` — renders the Forbidden screen for non-home routes; the specific `/index.html` route takes precedence.
- `app/index.html/page.tsx` — preserves the original `/index.html` homepage path without changing the URL.

## Notes

- The heading preserves the source HTML's exact `sAkshI` spelling.
- The original CSS is retained without a Tailwind conversion.
- The Vanta fog uses the source URL (`vanta@latest`). Since that URL follows upstream releases, its CDN output can change independently over time.
- The `ERROR 403 / Forbidden` screen is a visual frontend route, not an HTTP 403 response, matching the supplied HTML behavior.
- Vanta and Three.js require WebGL/browser support for their animated effects. If those scripts fail, the dark hero fallback and heading remain in place.
