# Media kit hand-off

Brand assets for Valence, made 2026-10-18 and not yet wired into the app or the repo README. This note lists the integration work for Claude Code.

## What is in `docs/media-kit/`

- `README.md`: the media kit itself (fact sheet, descriptions, screenshots, logo and colour rules). GitHub renders it.
- `logos/`: logo and mark, SVG (text outlined) and PNG, for light and dark backgrounds, plus one-colour versions.
- `screenshots/`: 2880 × 1800 PNGs of the current build.
- `valence-social-card.png`: 2400 × 1260 link-preview image.
- `web/`: files meant for the site: `favicon.svg` (follows the system theme), `apple-touch-icon.png` (180), `icon-192.png`, `icon-512.png`, `social-card.png`.
- `tools/capture-screenshots.mjs`: recaptures the screenshots from `vite preview`.

## Tasks

### 1. Repo README

Done 2026-10-18, with the optional grid of four screenshots.

- Replace the `# Valence` heading with the logo in a `<picture>` element, so GitHub shows the light or dark version to match the viewer's theme (the pattern is at the top of `docs/media-kit/README.md`). Keep a visually hidden or adjacent `Valence` text heading for accessibility and search.
- Under the opening paragraph, add one hero screenshot, `docs/media-kit/screenshots/valence-lab-red-cabbage.png`, linked to the live app. Optionally add a two-by-two grid of other screenshots after "What's in it".
- Add a line linking to the live app (https://firetailfab.com/valence/#/) near the top, and add `docs/media-kit/README.md` to the "Documents" list.
- Keep the README's existing tone and claims. Do not add claims that the media kit avoids (instructor review, school use).

### 2. The app (this repo's site)

Done 2026-10-18, except the optional mark in the menu: the menu has no "Valence" label to set it beside.

- Create `public/` at the repo root if it does not exist (Vite copies it into `dist/` as is; `base` is `./`). Copy in `favicon.svg`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png` and `social-card.png` from `docs/media-kit/web/`.
- In `index.html`, add:
  - `<link rel="icon" href="./favicon.svg" type="image/svg+xml">` and `<link rel="apple-touch-icon" href="./apple-touch-icon.png">`;
  - Open Graph and Twitter tags: `og:title` "Valence", `og:description` (the one-line description from the media kit), `og:type` website, `og:url` https://firetailfab.com/valence/, `og:image` **absolute** URL https://firetailfab.com/valence/social-card.png with `og:image:width` 2400 and `og:image:height` 1260, `og:image:alt`, and `twitter:card` summary_large_image.
  - Confirm the deployed path: if the site is served from a different path, fix `og:url` and `og:image`.
- Keep the `<!--first-paint-->` comment and the existing description meta.
- Optional: show the mark beside "Valence" in the app's menu header. The app's UI is deliberately neutral (shadcn greys, Inter), so do not restyle the app with the media-kit colours.
- Run `npm run build` (lint, tests, typecheck, build) and confirm the icons and `social-card.png` land in `dist/`.

### 3. firetailfab.com (separate site)

- Use `logos/valence-logo.svg` (or `-on-dark`) for the Valence link or card, and `social-card.png` as its preview image.
- Optional: host the media kit as a page there, built from `docs/media-kit/README.md`.

## Brand quick reference

Ink `#17151C`, Paper `#FBF9FB`, Cabbage pink `#C2185B` (on dark `#FF6FA3`). Wordmark: Bricolage Grotesque Bold, outlined. Never recolour the atoms or reset the wordmark in another font.
