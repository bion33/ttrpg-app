#!/usr/bin/env node
// Finds a text label inside a rendered, inline <svg> and returns its bounding
// box in the SVG's own viewBox user-unit coordinate system (not pixels), plus
// a rough suggested box for a field placed near it (e.g. for a <foreignObject>
// overlay input). This is a locator, not a layout engine: the suggested box
// is a starting point to hand-tune, not a final answer.
//
// Usage:
//   node locate.mjs --label "CHARACTER NAME" --svg public/character-sheet/character-sheet.svg
//     [--selector svg] [--hint below|above|left|right|center] [--width N]
//     [--height N] [--gap N]
//
// Reads a standalone SVG file straight off disk (--svg) and renders it inline
// in headless Chromium, so no dev server or running app is needed. The
// returned boxes are in that SVG file's own viewBox coordinate space. Pass
// --url instead to introspect an SVG already inlined in a running page's DOM
// (not inside an <img>/<object>, which can't be introspected this way).

import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

// Renders the --svg file inline (no server), else navigates to --url.
async function openPage(browser, args) {
  const page = await browser.newPage({ viewport: { width: 1200, height: 1600 } });
  if (args.svg) {
    const svgSource = readFileSync(args.svg, 'utf8');
    const html =
      '<!doctype html><meta charset="utf-8">' +
      '<style>html,body{margin:0}svg{display:block;width:100vw;height:auto}</style>' +
      svgSource;
    await page.setContent(html, { waitUntil: 'networkidle' });
  } else {
    await page.goto(args.url, { waitUntil: 'networkidle' });
  }
  await page.waitForSelector(args.selector);
  return page;
}

function parseArgs(argv) {
  const args = {
    url: 'http://localhost:5173',
    svg: null,
    selector: 'svg',
    hint: 'below',
    label: null,
    gap: null,
    width: null,
    height: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === '--url') args.url = next();
    else if (a === '--svg') args.svg = next();
    else if (a === '--selector') args.selector = next();
    else if (a === '--label') args.label = next();
    else if (a === '--hint') args.hint = next();
    else if (a === '--gap') args.gap = parseFloat(next());
    else if (a === '--width') args.width = parseFloat(next());
    else if (a === '--height') args.height = parseFloat(next());
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
if (!args.label) {
  console.error(
    'Usage: node locate.mjs --label "<text>" [--url <url>] [--selector <css>] ' +
      '[--hint below|above|left|right|center] [--width N] [--height N] [--gap N]'
  );
  process.exit(1);
}

const browser = await chromium.launch();
try {
  const page = await openPage(browser, args);

  const result = await page.evaluate(
    ({ selector, label, hint, gap, width, height }) => {
      const svgEl = document.querySelector(selector);
      if (!svgEl || svgEl.tagName.toLowerCase() !== 'svg') {
        return { error: `Selector "${selector}" did not match an <svg> element` };
      }
      const ctm = svgEl.getScreenCTM();
      if (!ctm) {
        return { error: 'Could not compute a screen transform for the SVG (is it visible / non-zero size?)' };
      }
      const inv = ctm.inverse();

      function toUserBox(el) {
        const r = el.getBoundingClientRect();
        const p1 = new DOMPoint(r.left, r.top).matrixTransform(inv);
        const p2 = new DOMPoint(r.right, r.bottom).matrixTransform(inv);
        return {
          x: Math.round(p1.x * 100) / 100,
          y: Math.round(p1.y * 100) / 100,
          width: Math.round((p2.x - p1.x) * 100) / 100,
          height: Math.round((p2.y - p1.y) * 100) / 100,
        };
      }

      const needle = label.toLowerCase();
      const candidates = [];
      for (const el of svgEl.querySelectorAll('text, tspan')) {
        const text = (el.textContent || '').trim();
        if (text.toLowerCase().includes(needle)) candidates.push({ el, text });
      }
      if (candidates.length === 0) {
        return { error: `No text found containing "${label}"`, viewBox: svgEl.getAttribute('viewBox') };
      }
      // Prefer the shortest match: a long match usually means several labels
      // got merged into one <tspan> (common in PDF-traced SVGs), which makes
      // for an unreliable box.
      candidates.sort((a, b) => a.text.length - b.text.length);
      const best = candidates[0];
      const box = toUserBox(best.el);
      const possiblyMerged = best.text.length > label.length + 15;

      const g = gap ?? Math.max(1, Math.round(box.height * 0.35 * 100) / 100);
      const w = width ?? Math.max(box.width, Math.round(box.height * 7 * 100) / 100);
      const h = height ?? Math.max(Math.round(box.height * 1.2 * 100) / 100, 8);

      let suggestedBox;
      switch (hint) {
        case 'above':
          suggestedBox = { x: box.x, y: box.y - h - g, width: w, height: h };
          break;
        case 'left':
          suggestedBox = { x: box.x - w - g, y: box.y, width: w, height: h };
          break;
        case 'right':
          suggestedBox = { x: box.x + box.width + g, y: box.y, width: w, height: h };
          break;
        case 'center':
        case 'overlap':
          suggestedBox = { x: box.x, y: box.y, width: box.width, height: box.height };
          break;
        case 'below':
        default:
          suggestedBox = { x: box.x, y: box.y + box.height + g, width: w, height: h };
          break;
      }

      return {
        viewBox: svgEl.getAttribute('viewBox'),
        query: label,
        matchedText: best.text,
        candidateCount: candidates.length,
        possiblyMergedLabel: possiblyMerged,
        labelBox: box,
        hint,
        suggestedBox,
        note: 'Rough estimate only — meant as a starting point to hand-tune, not a final position.',
      };
    },
    { selector: args.selector, label: args.label, hint: args.hint, gap: args.gap, width: args.width, height: args.height }
  );

  console.log(JSON.stringify(result, null, 2));
  if (result.error) process.exitCode = 1;
} finally {
  await browser.close();
}
