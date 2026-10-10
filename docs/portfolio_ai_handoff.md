# Portfolio Website Handoff — Sumit Gupta

Use this document as context when continuing work on the existing portfolio. The current `index.html` is the source of truth. Inspect it before editing; do not recreate it from scratch or restore older snippets from conversation history.

## 1. Project and stack

- **Project:** Sumit Gupta's personal portfolio / hero page.
- **Current implementation:** Single-file plain HTML, CSS, and JavaScript (`index.html`). There is no `package.json`, React, Next.js, or Vite project in the provided files.
- **External libraries:**
  - Vanta.js Fog from a CDN for the existing animated blue-violet nebula background.
  - Three.js r134 loaded for Vanta.
  - A separate Three.js ES-module import from CDN for the custom 3D scene.
  - Canvas 2D for the `sAkshi` dot-matrix word.
- **Run locally:** Serve the file with VS Code Live Server or `python -m http.server 8000`, then open `http://localhost:8000/index.html`. A local server is recommended because ES-module imports may not work from `file://` URLs in some browsers.

## 2. Visual design that must be preserved

- Full page background is pure black (`#000`).
- Header is minimal: **“Sumit Gupta.”** on the left, GitHub and LinkedIn icon links on the right.
- Clicking the logo goes to `https://sumitgupta.me/`.
- GitHub link: `https://github.com/Sumi-tgupta`.
- LinkedIn link: `https://linkedin.com/in/sumi-tgupta`.
- Main hero is a rounded dark card with a subtle blue-violet border and the existing Vanta Fog animation.
- Main heading remains exactly **“Building”** followed by **“sAkshi”** on its own line.
- `Building` stays white. `sAkshi` uses green dot-matrix animation with green/mint highlights.
- A transparent custom Three.js scene is layered on the **right side** of the hero card. It must not replace or recolor the Vanta background.
- The page includes a frontend forbidden-style page for non-home paths.
- The page has a load fade-in animation (`page-load-fade-in`, 900ms, subtle 10px upward movement).
- Text selection is disabled globally, but selection CSS is set to neon green (`#71ebba`) with dark selected text (`#03130e`) for anything that can be selected.

## 3. `sAkshi` dot-matrix effect

The original gradient text remains in the HTML as an invisible sizing/accessibility placeholder when the dots work. The visible word is rendered into `<canvas id="sakshi-dots">`.

Current implementation details:

- The `.sakshi-line` wrapper is positioned relatively.
- `#sakshi-text` contains the literal text `sAkshi` from page load and retains `aria-label="sAkshi"`.
- `#sakshi-dots` is an `aria-hidden="true"` canvas positioned over the placeholder with about 70px of extra space on all sides.
- `.dots-pending` hides the actual gradient word from first paint while the canvas initializes. `.dots-active` hides the placeholder once dot rendering is live. This prevents the complete word flashing before the letter-assembly animation.
- The canvas sampling waits for `document.fonts.ready`, reads computed font styles, samples letter pixels, and assigns dots to individual letters.
- Each letter assembles with dots spawning from random offsets and easing into place. The approximate timing is 450ms before the first letter and 170ms between letters.
- Dots shimmer among `#71ebba`, `#16b983`, and `#e4fff3`, using 12 precomputed color buckets.
- Cursor repulsion moves nearby dots away from the pointer, slightly increases their size/brightness, and springs them back toward their home positions.
- Desktop dot step starts at roughly 4px at 100px font size; mobile starts at roughly 5px. The code caps the dot count at 2,500 on desktop and 1,200 on mobile.
- The actual gradient text effect is retained as a fallback if canvas initialization or pixel sampling fails.
- Reduced-motion mode is intended to render the full static dot word without typing/spawn/shimmer/repel motion.
- The `typing-cursor` element remains in the markup for compatibility, but **is hidden with `display: none !important`**. This was done because the blinking caret appeared over the capital **A** in `sAkshi` in a screenshot. Do not re-enable it unless explicitly requested.
- The `.sakshi-line` letter spacing is currently `-1px`; this was increased from a tighter setting to give the letters a little more breathing room.
- Canvas glow is applied with CSS `drop-shadow`; the dot renderer should not create per-dot canvas shadows.

### Dot-matrix tuning variables

Inside the first inline JavaScript closure, look for:

- `BASE_DOT_STEP_DESKTOP`
- `BASE_DOT_STEP_MOBILE`
- `REPEL_RADIUS_SCALE`, `REPEL_RADIUS_MIN`, `REPEL_RADIUS_MAX`
- `REPEL_STRENGTH`
- `SPRING_K` and `DAMPING`
- `SPAWN_DELAY_MS`, `LETTER_INTERVAL_MS`, `SPAWN_DURATION_MS`
- `SHIMMER_SPEED`, `COLOR_BUCKET_COUNT`, `COLOR_STOPS`

Prefer editing these variables rather than rewriting the implementation.

## 4. Three.js scene on the right side of the hero

The existing Three.js scene is implemented in the final `<script type="module">` and must be preserved unless the user specifically asks for a change.

Its visual structure is one group with three layers:

1. **Core crystal:** dark glass-style icosahedron, shader-based Fresnel green edge light, breathing inner glow, and pointer-responsive edge brightness.
2. **Particle shell:** approximately 3,000 points on desktop and 1,200 on mobile, blending green and soft purple with subtle rotation and cursor response.
3. **Orbit rings:** three tilted rings with different radii/rotation speeds and small orbiting particles.

Other scene requirements in the current implementation:

- Transparent WebGL canvas over the CSS/Vanta background.
- Canvas is marked `aria-hidden="true"` and ignores pointer input so it does not block text/links.
- Wake-up animation uses one progress value over approximately three seconds for the crystal, particles, and rings.
- Cursor tilt and green cursor light are disabled or reduced for mobile/reduced-motion usage.
- Rendering pauses when the hero is off-screen or the tab is hidden.
- Geometries, materials, listeners, renderer, and animation frame are cleaned up during disposal.
- If WebGL cannot initialize, the existing HTML hero and Vanta background should still be visible.

## 5. Routing and accessibility behavior

- The home layout is shown for `/`, `/index.html`, and local-file preview mode.
- Other paths show the existing frontend **“ERROR 403 / Forbidden.”** page and a link back to `https://sumitgupta.me/`.
- This is a frontend visual state; it does not automatically set the HTTP response status to 403. Hosting fallback/rewrite configuration is needed for unknown paths to serve this HTML.
- The text is non-selectable by design. Preserve keyboard focus-visible outlines for links.
- The `sAkshi` heading/placeholder must remain accessible to screen readers through its existing `aria-label`.
- Respect `prefers-reduced-motion` for the page, dot canvas, and 3D scene.

## 6. Recent change history

1. Set the overall page to black and kept a rounded hero card with a blue-violet Vanta Fog background.
2. Kept the personal logo in the navbar and made it link to `sumitgupta.me`; replaced text social links with inline SVG GitHub and LinkedIn icons.
3. Added a green `sAkshi` treatment without changing the Vanta colors.
4. Added a custom transparent Three.js scene on the right side of the hero: crystal, particle sphere, and three orbit rings.
5. Replaced the visible `sAkshi` word with a Canvas 2D dot-matrix animation featuring per-letter assembly, green shimmer, cursor repel, and a gradient-text fallback.
6. Hid the typewriter caret because it overlapped the capital A.
7. Added slightly more `sAkshi` letter spacing (`-1px`).
8. Changed browser selection highlight from the default blue to neon green (`#71ebba`).
9. Added a 900ms page-load fade-in and hid the real `sAkshi` text on first paint while the dot canvas initializes, to prevent a flash of the full word before the dot animation starts.

## 7. Hard rules for future edits

- **Start by reading the attached/current `index.html` before making changes.** It has both inline scripts, the full CSS, canvas dot renderer, Vanta setup, and the Three.js module.
- Keep the project plain HTML unless asked to migrate it. Do not add a build system or dependencies without a clear reason and explicit approval.
- Do not change the navbar, social URLs/icons, Vanta settings/colors, 3D scene, heading copy, routing, page layout, or colors outside `sAkshi` unless the user requests it.
- Do not add captions, labels, tooltips, or explanatory copy describing what `sAkshi` is.
- Do not restore the blinking typewriter cursor; it must remain hidden.
- Avoid introducing a visible full-text flash before the dot-matrix startup sequence.
- Return the **complete updated `index.html`** when asked for code, not a diff or partial snippets. If also requested, provide a direct download link to the final file.
- Verify JavaScript syntax after editing and, where possible, preview the page in a browser. Be transparent if a real browser render could not be tested.

## 8. Current source of truth

The current page file is `index.html`. This handoff is context only; the actual page markup, CSS, and scripts in that file are authoritative if any detail here differs from the live file.
