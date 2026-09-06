---
name: extract-svg-component
description: Extract a shape (icon, checkbox, decoration, ...) out of public/assets/character-sheet.svg into a standalone React component in this project. Use when the user points at part of the character sheet artwork ("this checkbox", "that little diamond", "the shield icon next to AC") and asks for it as a component, a reusable icon, or an interactive control.
---

# Extract a shape from character-sheet.svg into a component

`public/assets/character-sheet.svg` is the exported OpenOffice/LibreOffice
source of the printed character sheet. Every visual element is a `<g
id="idNNN">` wrapping one `<path>`, with raw absolute coordinates in a large
shared coordinate space (thousands of units). This skill turns one such
element (or a small cluster of them, e.g. a fill shape + its outline shape)
into a clean, themeable React component, following the pattern used for
`src/components/shared/DiamondCheckbox`.

## 1. Find the shape and its cluster

Ask the user for a description or an `id` if they have one open in the IDE.
Search the SVG for nearby `<text>` labels to confirm which shape is which —
elements are listed in document order, so the shape and its label are
usually within ~20 `id`s of each other:

```bash
grep -n 'id="id[0-9]*"' public/assets/character-sheet.svg
```

Read a window of the file around the candidate line with the Read tool (not
`cat`/`sed` — you'll want to scroll up/down to find sibling shapes).

A single visual element is often 2+ `<g>` entries layered together:
- a filled shape with `fill="rgb(...)"` `stroke="none"` (the background/mark)
- an outline shape, either `fill="none" stroke="rgb(...)"` (a real stroked
  path) OR — as with the diamond checkbox — a *second filled path* that
  traces the ring shape itself (outer boundary + inner boundary as two
  subpaths in one `d`, meant to be filled with `fill-rule="evenodd"`)

Identify every `<g id="idNNN">` that belongs to the one visual element
before extracting anything.

## 2. Normalize coordinates

Each shape's `<rect class="BoundingBox">` gives `x`, `y`, `width`, `height`
in the shared coordinate space. Subtract that shape's own `x,y` from every
coordinate in its `d` attribute so the path starts near `0,0` — this is
what makes the extracted SVG readable and independent of where the shape
happens to sit on the full sheet.

If two layered shapes (e.g. mark + outline) have *different* bounding
boxes, pick one shape as the reference frame (usually the larger outline)
and offset the other shape's coordinates by the difference between the two
boxes' origins, so they still align exactly when composited.

Do this arithmetic explicitly (by hand or with a short throwaway script) —
don't eyeball it. Misaligned masks are the most common failure mode here.

## 3. Decide: static asset vs. inline SVG

- **Colors never change at runtime** (a fixed-ink decoration): render it as
  a plain `<img src="/assets/....svg">`. No component needed beyond that.
- **Colors depend on theme tokens and/or component state** (checked/hover/
  selected, an accent color, dark mode): use the CSS `mask-image` pattern
  below. This is almost always the case for anything interactive.
- Avoid inlining raw path data as a JS string in the `.tsx`/`.module.css`
  — it's unreadable and hides the geometry from anyone opening the file in
  an SVG viewer. Keep path data in real `.svg` files.

## 4. Write the standalone SVG file(s)

For each layer, write a normalized, human-readable SVG to
`public/assets/<component-name>-<layer>.svg`, e.g.:

- `../../../public/assets/diamond-checkbox/diamond-checkbox-outline.svg`
- `../../../public/assets/diamond-checkbox/diamond-checkbox-mark.svg`

Format the `d` attribute with line breaks between subpaths/curves so it's
scannable, and add one comment line noting which `id`(s) in
`character-sheet.svg` it was traced from (so it can be re-derived later if
the source changes). Use a `viewBox` matching the normalized bounding box;
omit `fill`/`stroke` from the `<path>` itself when the color will be
supplied at runtime via CSS `mask-image`.

## 5. Build the component

Create `src/components/shared/<ComponentName>/`:

- `<ComponentName>.tsx` — a small functional component. If it's a control
  (checkbox-like), follow the existing `InkCheckbox` shape: a hidden
  `<input>` for real interactivity/accessibility, plus `<span>` layers for
  the visual, driven by CSS sibling selectors off `:checked`/`:focus-visible`.
  Props: `checked`, `onChange`, optional `className`, `'aria-label'`. No
  geometry, no inline `<svg>` — just structure.
- `<ComponentName>.module.css` — one class per visual layer. Each layer:
  `position: absolute; inset: 0;`, `mask-image: url('/assets/...svg')`
  (+ `-webkit-mask-image` for Safari), `mask-size: contain; mask-repeat:
  no-repeat; mask-position: center;`, and a `background` set to the
  relevant theme token (`var(--color-border-strong)`,
  `var(--color-accent)`, etc. — check `src/styles/tokens.css` for the
  right one, never a hard-coded color). State changes (checked, hover)
  toggle `background`, not the mask.

## 6. Wire it in and verify

- Only if explicitly asked or confirmed by user: replace the call site(s) that 
  used an approximation (e.g. a CSS-only rotated square standing in for the real 
  shape), removing any now-unused props/CSS from the component that previously 
  stood in for it.
- Run `npx tsc --noEmit` and `npx eslint <paths touched>`.
- Do not attempt to visually confirm the shape renders correctly.
