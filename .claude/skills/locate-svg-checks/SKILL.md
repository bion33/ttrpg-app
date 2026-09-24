---
name: locate-svg-checks
description: Find small hand-drawn/traced circles (or other round shapes) inside a rendered, inline SVG — e.g. the tick-boxes on a scanned/traced character sheet — and get their bounding boxes, in the SVG's own viewBox coordinates, for overlaying interactive checkbox elements (typically a <foreignObject> input) on top of them. Use whenever placing checkbox overlays against circular marks in SVG background art — "turn the death saves circles into checkboxes", "where are the proficiency dots", etc. Requires the app's dev server to already be running with the SVG inlined in the DOM (not an <img>/<object> reference).
---

# locate-svg-checks

Sibling skill to [[locate-svg-label]] — use that one for text-label-relative
field placement, this one for circular tick-box art. Same underlying
technique (reading true position off the DOM via `getScreenCTM()` in headless
Chromium, so nested/convoluted `transform` chains in traced SVGs don't need
to be chased by hand), applied to shape geometry instead of text content.

## Why this is harder than it looks

PDF-trace tools almost never emit `<circle>`/`<ellipse>` tags for round
marks — a circle is usually a small square-ish `<path>`. So "find the
circles" really means "find small paths whose bounding box is roughly
square", not a tag selector. Groups of checks are also frequently
**not** on a straight grid — e.g. a chain-of-circles motif that staggers
each circle in/out along a curve — so don't assume a uniform row/column
spacing; take each box's own reported position.

Also: text proximity is not a reliable filter by itself. A label like
"DEATH SAVES" can sit directly above an *unrelated* checkbox grid for a
different section (e.g. damage-resistance checks) that happens to be closer
in the layout than the checks that actually belong to that label. Always
sanity-check candidates against a cropped screenshot (see below) before
trusting the geometry search.

## What it does NOT do

It does not know which circles form one logical group (e.g. "3 successes +
3 failures") — it returns every roughly-round shape in the search region in
reading order (top-to-bottom, left-to-right within a row) and leaves
grouping/labeling to you. It also does not try to detect which circle (if
any) is pre-filled as a "checked" example in the source art — check `style`
(a `fill` other than `none`/`#fff` on one candidate is a hint) or just look
at the screenshot.

## Usage

The target dev server must already be running (e.g. `yarn dev`) and the SVG
must be inlined in the page DOM.

Anchor near a text label (searches a square region around it):

```bash
node .claude/skills/locate-svg-checks/tool/locate-circles.mjs \
  --near "DEATH SAVES" --selector "svg.character-sheet" --radius 90
```

Or give an explicit region directly (viewBox user units: `x,y,width,height`)
once you know roughly where to look, e.g. from a cropped screenshot:

```bash
node .claude/skills/locate-svg-checks/tool/locate-circles.mjs \
  --region "660,175,130,70" --selector "svg.character-sheet"
```

Arguments:
- `--near`: substring to search for in the SVG's text content, case-insensitive. Mutually exclusive with `--region`.
- `--radius` (default `90`): half-width, in SVG user units, of the square search box centered on the matched label when using `--near`.
- `--region`: explicit `x,y,width,height` search box in viewBox user units, if you already know roughly where to look (e.g. from a screenshot) or `--near` pulled in an unrelated group.
- `--url` (default `http://localhost:5173`): page to load.
- `--selector` (default `svg`): CSS selector for the target `<svg>` element.
- `--min-size` / `--max-size` (default `4` / `20`): bounding-box size range, in SVG user units, for a shape to count as a candidate circle. Widen these if the real circles are unusually large/small (check a screenshot first to estimate).

Output is JSON: `labelBox` (if `--near` was used), `searchRegion`, `count`,
and `circles` — each with its `box` (`x`, `y`, `width`, `height`, suitable
to hand straight to a `<foreignObject>`) and raw `style` string (useful for
spotting a pre-filled "example checked" circle by its `fill`).

**Always cross-check the result against a screenshot** of that region before
using it — crop the dev server screenshot to the search box and eyeball that
the count and layout match what's actually drawn (see locate-svg-label's own
tips on this — same idea applies here). Geometry search over-fires easily
where multiple checkbox groups sit close together.

## First-time setup

Own isolated dependency, same pattern as `locate-svg-label`'s tool — kept
separate from the app's own `package.json`/lockfile:

```bash
cd .claude/skills/locate-svg-checks/tool && npm install --no-audit --no-fund
```

Reuses the Chromium binary Playwright already has cached
(`~/.cache/ms-playwright`); if that cache is empty, `npx playwright install
chromium` first.

## Cleanup

This skill's tool only prints JSON to stdout — nothing of its own to clean
up. But applying its output typically involves throwaway verification
(crop scripts, screenshots) outside the tool directory — remove those from
the repo before finishing, and prefer the session scratchpad directory for
that verification in the first place. Check `git status` at the end to
confirm nothing untracked-but-unwanted was left behind.
