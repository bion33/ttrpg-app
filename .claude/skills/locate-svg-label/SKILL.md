---
name: locate-svg-label
description: Find a text label inside a rendered SVG (e.g. a scanned/traced character sheet or form) and get a rough bounding box, in the SVG's own viewBox coordinates, for placing an overlay element (typically a <foreignObject> input) near it. Use whenever positioning an input/overlay against label text in an SVG background — "place a field under CHARACTER NAME", "where is the CLASS & LEVEL line", etc. Renders a standalone SVG file from disk in headless Chromium, so no dev server is required.
---

# locate-svg-label

Positioning a form input over hand-drawn or PDF-traced SVG artwork requires
knowing the label's exact position in the SVG's *user-unit* coordinate space
(the `viewBox` system), not CSS pixels — those only match at 1:1 zoom. Reading
that from the raw SVG source means chasing `transform="matrix(...)"` chains by
hand, which is slow and error-prone (nested transforms, PDF-trace tools often
merge multiple labels into one `<tspan>` with large `dx` jumps, etc).

This skill renders the SVG in headless Chromium and reads the label's true
position off the DOM via `getScreenCTM()`, which is always correct regardless of
how convoluted the source transforms are. It reads a standalone SVG file
straight off disk (`--svg`), so **no dev server or running app is needed**.

## What it does NOT do

It does not try to find the precise edges of a blank writing area (rule lines,
boxes, etc.) — only the label text's own bounding box, plus one simple
heuristic offset (below/above/left/right/center) from it. Treat the result as
a rough starting point. The person will hand-tune the final position — do not
iterate trying to make the suggested box pixel-perfect.

## Usage

Point `--svg` at the SVG file on disk (e.g. `public/character-sheet/character-sheet.svg`).
The returned boxes are in that file's own `viewBox` coordinate space.

```bash
node .claude/skills/locate-svg-label/tool/locate.mjs \
  --label "CHARACTER NAME" \
  --svg public/character-sheet/character-sheet.svg \
  --hint below
```

Arguments:
- `--label` (required): substring to search for in the SVG's text content, case-insensitive.
- `--svg`: path to the standalone SVG file to render from disk (the normal mode — no server).
- `--url` (default `http://localhost:5173`): alternative to `--svg` — a running page with the SVG
  inlined in its DOM (not an `<img src>`/`<object>`, which don't expose their internal text nodes).
  Only needed when inspecting live, runtime-modified SVG rather than the source file.
- `--selector` (default `svg`): CSS selector for the target `<svg>` element, if the page has more than one or it needs to be specific.
- `--hint` (default `below`): where the field sits relative to the label — one of `below`, `above`, `left`, `right`, `center`. If the person gives a more specific hint (e.g. "top-left", "just past the label on the same line"), map it to the closest of these, or use the raw `labelBox` in the output to compute a custom box yourself.
- `--width`, `--height`, `--gap` (optional): override the automatic sizing/spacing heuristics, in SVG user units.

Output is JSON on stdout: the label's own `labelBox`, a `suggestedBox` for the
field, `candidateCount` (how many text nodes matched — investigate if this is
surprisingly high), and `possiblyMergedLabel` (true if the matched text is
much longer than the query, meaning it likely swallowed a neighboring label
too — treat the box with extra suspicion in that case and consider searching
for a more specific/unique substring instead).

## First-time setup

The tool has its own isolated dependency (`playwright`) in
`tool/package.json`, separate from the app's own `package.json`/lockfile —
this avoids installing a browser-automation dependency into the app itself,
and avoids `npm install` cross-contaminating a yarn-managed lockfile (it will
rewrite `yarn.lock` registry URls if run at the repo root). If
`tool/node_modules` doesn't exist yet:

```bash
cd .claude/skills/locate-svg-label/tool && npm install --no-audit --no-fund
```

This reuses the Chromium binary Playwright already has cached
(`~/.cache/ms-playwright`) rather than re-downloading it; if that cache is
empty on a given machine, `npx playwright install chromium` first.

## Cleanup

This skill itself writes no output files — it only prints JSON to stdout — so
there is nothing of its own to clean up. But applying its suggestions
typically involves throwaway verification (test scripts, screenshots) outside
this skill's own tool directory. Before finishing the task, remove anything
like that: any one-off `.mjs`/`.png` files dropped in the project root or
elsewhere in the repo for a look-and-check during positioning, and check
`git status` to confirm nothing untracked-but-unwanted is left behind. Keep
temporary verification artifacts in the session scratchpad directory instead
of the repo when possible, so there's nothing to clean up at all.
