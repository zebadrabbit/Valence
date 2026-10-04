# Valence Phase 2B (Molecule Explorer) — Build Record

**Spec:** `docs/superpowers/specs/2026-10-03-valence-v1-design.md`, sections 6 and 11.

Phase 2B was built as a reviewed prototype on the branch `spike/phase-2b` and adopted as it stood, the same way as phase 2A. This file records what was built, how it was checked, and what is left.

## What was built

- **Library** at `#/explore`: 31 entries under five topic headings.
- **Molecule page** at `#/explore/:id`: formula, geometry-source label, notes, form toggle for glycine and alanine, PubChem link, and a text description.
- **Four views:** ball-and-stick, space-filling, wireframe (React Three Fiber, loaded lazily), and a 2D Lewis view in SVG.
- **Selection** by pointer or from a DOM list of atoms and bonds, shared by every view.
- **Inspectors:** atom card and bond card with a Sources control; cited values print the digits their source publishes.
- **Measure tool:** distance, angle, and dihedral.
- **Valence display levels:** Bohr diagram; lone pairs; hybrid lobes on the selected atom and molecular orbital diagrams for O₂ and N₂.
- **Command palette** on Ctrl+K.
- **Reviewer documentation:** faculty and accessibility sections in `docs/for-institutions.md`.

## How it was checked

- 707 automated tests; lint, type check, and production build pass.
- An independent 17-point test in headless Chromium across all 33 structures, both themes, desktop and phone widths, keyboard-only use, and with WebGL unavailable.
- A chemistry, accessibility, and engineering review, with fixes re-checked.
- Every published figure for the 13 experimental molecules, the electronegativities, and the atomic weights was re-fetched from its source and compared digit for digit.

## Not built or partial

- Hybrid lobes draw only for the selected atom, without the small back lobe, and not in the space-filling view. Amide and urea nitrogens carry a note instead of a p-orbital lobe.
- Bonds cannot be clicked in the space-filling view; the bond list is the route.
- The Lewis view always shows lone pairs, whatever the valence level.
- Molecular orbital diagrams are a single column of levels, without atomic orbitals at the sides.
- The per-atom lone-pair direction override (spec 6.4) is deferred.
- Zooming in far at level 3 can clip a lobe at the edge of the viewer.

## Not tested

- Firefox, Safari, and any tablet or touch device.
- Any screen reader used by a person; contrast measured with a tool; browser zoom; forced colours.
- The screenshots were looked at by the AI coding assistant that built the explorer, not yet by a chemistry instructor.

## Open choices

- Hydrogen's electronegativity prints 2.2, as the PubChem periodic table does. Showing 2.20 would need a different cited source.
- PCl₅'s 90°, 120°, and 180° angles follow from its symmetry; the NIST page prints no figure for them.
