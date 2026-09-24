---
name: locate-svg-circle
description: Find one large filled "value" circle inside a rendered, inline SVG (e.g. the PROFICIENCY BONUS, PASSIVE PERCEPTION, or ARMOR CLASS circle on a scanned/traced character sheet) and get its center plus a CENTERED bounding box, in the SVG's own viewBox coordinates, for dropping a numeric/text input (a <foreignObject>) into the middle of it. Use whenever placing a single input inside a round field beside a label — "add a number in the proficiency circle", "put an input in the passive perception circle", etc. Requires the app's dev server to already be running with the SVG inlined in the DOM (not an <img>/<object> reference).
---

# locate-svg-circle

Sibling skill to [[locate-svg-label]] (text-relative placement) and
[[locate-svg-checkboxes]] (many small tick-boxes → corner boxes for checkbox
overlays). This one targets **one big filled circle beside a label** and
returns a box **centered** on it, because a numeric/text input wants centering,
not corner-anchoring.

Same core technique as its siblings: read true position off the live DOM via
`getScreenCTM()` in headless Chromium, so the nested/convoluted
`transform="matrix(...)"` chains that PDF-trace tools emit don't have to be
chased by hand.

## Why match by fill, not geometry

For small tick-boxes, geometry (a small square-ish bounding box) is enough. For
a large value circle it is not — at that size the bounding box overlaps
neighbouring art, decorative rings, and the label's own circle frame, so a
size+aspect filter alone returns junk. The reliable discriminator is the
**fill**: these circles are drawn as a white-filled `<path>` ring, so the tool
matches on computed fill `rgb(255,255,255)` by default. In practice this one
query beats every visual grid/crop/eyeball attempt — reach for it first.

## What it does NOT do

It finds the circle and centers a box on it. It does not find the perfect
inner writing area, and the default field size (~0.7 × 0.55 of the diameter) is
a starting point. The person will hand-tune — don't iterate for pixel
perfection.

## Usage

The target dev server must already be running (e.g. `yarn dev`) and the SVG
must be inlined in the page DOM (not `<img src>`/`<object>`).

```bash
node .claude/skills/locate-svg-circle/tool/locate-circle.mjs \
  --near "PROFICIENCY" --side left \
  --selector "svg.character-sheet"
```

Arguments:
- `--near` (required unless `--region`): substring of the label the circle sits
  beside, case-insensitive.
- `--side` (default `auto`): which side of the label the circle is on — `left`,
  `right`, `above`, `below`, or `auto` (nearest matching circle in range).
- `--region "x,y,w,h"`: anchor by an explicit box instead of a label.
- `--url` (default `http://localhost:5173`), `--selector` (default `svg`).
- `--radius` (default 120): how far, in user units, to look from the anchor
  center.
- `--min-size` / `--max-size` (default 30 / 90): circle diameter range in user
  units. Widen if the circle isn't found; narrow if a wrong shape wins.
- `--fill` (default `white`): `white` matches white-filled rings; `any` drops
  the fill filter (falls back to geometry only — noisier).
- `--field-width` / `--field-height`: override the centered box size in user
  units (defaults scale to the diameter).

Output is JSON on stdout: `circle` (its `center`, `diameter`, raw `box`),
`suggestedBox` (the centered field box: `x,y` = center − size/2, plus
`width,height`), `labelBox`, and `candidateCount`. On no match it returns the
in-range `candidates` (center + diameter) so you can adjust `--side`/`--size`.

### Aligning several fields

To make two circle-fields line up (e.g. proficiency on the left, passive
perception on the right), locate both, then in the field definitions give them
a **shared `y`** (or `x`) and **identical `width`/`height`/`fontSize`** — the
circles usually already share a center axis, so reuse the value rather than
trusting two independent estimates.

### Field placement

The suggestedBox maps straight onto a `<foreignObject>`-backed field whose
`x,y` are its top-left (as in this project's `Fields` array in
`src/CharacterSheet.tsx`): use `suggestedBox.x/y/width/height`, `type:'number'`,
`textAlign:'center'`, and a `fontSize` that fits the circle.

## First-time setup

Isolated `playwright` dependency in `tool/package.json`, kept out of the app's
own `package.json`/lockfile. If `tool/node_modules` doesn't exist:

```bash
cd .claude/skills/locate-svg-circle/tool && npm install --no-audit --no-fund
```

This reuses Playwright's cached Chromium (`~/.cache/ms-playwright`); if that
cache is empty, run `npx playwright install chromium` first.

## Cleanup

The tool only prints JSON — nothing of its own to clean up. Applying its
output usually involves throwaway verification (a marker-overlay screenshot to
confirm the box lands in the circle): keep those in the session scratchpad, not
the repo, and check `git status` before finishing so no stray `.mjs`/`.png`
files are left behind.
