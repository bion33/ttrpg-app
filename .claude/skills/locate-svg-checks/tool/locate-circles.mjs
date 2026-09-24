#!/usr/bin/env node
// Finds small circular (or near-circular) shapes inside a rendered, inline
// <svg> — e.g. the hand-drawn checkbox circles on a PDF-traced character
// sheet — and returns their bounding boxes in the SVG's own viewBox
// user-unit coordinate system (not pixels), for placing <foreignObject>
// checkbox overlays on top of them.
//
// Traced PDF art rarely uses <circle>/<ellipse> tags — circles are almost
// always drawn as small square-ish <path> shapes. This searches by
// geometry (bounding-box size + aspect ratio), not element tag, and
// optionally anchors the search near a text label first.
//
// Usage:
//   node locate-circles.mjs --near "DEATH SAVES" [--url http://localhost:5173]
//     [--selector svg] [--radius 90] [--min-size 4] [--max-size 20]
//   node locate-circles.mjs --region "670,190,90,50" [--min-size 4] [--max-size 20]
//
// Requires the target page to already be running (e.g. `yarn dev`) and to
// contain the SVG inline in the DOM (not inside an <img> or <object>).

import { chromium } from 'playwright';

function parseArgs(argv) {
  const args = {
    url: 'http://localhost:5173',
    selector: 'svg',
    near: null,
    radius: 90,
    region: null,
    minSize: 4,
    maxSize: 20,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === '--url') args.url = next();
    else if (a === '--selector') args.selector = next();
    else if (a === '--near') args.near = next();
    else if (a === '--radius') args.radius = parseFloat(next());
    else if (a === '--region') args.region = next();
    else if (a === '--min-size') args.minSize = parseFloat(next());
    else if (a === '--max-size') args.maxSize = parseFloat(next());
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
if (!args.near && !args.region) {
  console.error(
    'Usage: node locate-circles.mjs --near "<label text>" [--radius N] | --region "x,y,w,h" ' +
      '[--url <url>] [--selector <css>] [--min-size N] [--max-size N]'
  );
  process.exit(1);
}

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 1600 } });
  await page.goto(args.url, { waitUntil: 'networkidle' });
  await page.waitForSelector(args.selector);

  const result = await page.evaluate(
    ({ selector, near, radius, region, minSize, maxSize }) => {
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

      let searchRegion = null;
      let labelBox = null;
      if (region) {
        const [x, y, w, h] = region.split(',').map((n) => parseFloat(n));
        searchRegion = { x, y, width: w, height: h };
      } else if (near) {
        const needle = near.toLowerCase();
        const candidates = [];
        for (const el of svgEl.querySelectorAll('tspan')) {
          const text = (el.textContent || '').trim();
          if (text.toLowerCase().includes(needle)) candidates.push({ el, text });
        }
        if (candidates.length === 0) {
          return { error: `No text found containing "${near}"`, viewBox: svgEl.getAttribute('viewBox') };
        }
        candidates.sort((a, b) => a.text.length - b.text.length);
        labelBox = toUserBox(candidates[0].el);
        searchRegion = {
          x: labelBox.x - radius,
          y: labelBox.y - radius,
          width: labelBox.width + radius * 2,
          height: labelBox.height + radius * 2,
        };
      }

      const circles = [];
      for (const el of svgEl.querySelectorAll('path, circle, ellipse')) {
        const b = toUserBox(el);
        if (b.width <= 0 || b.height <= 0) continue;
        if (b.width < minSize || b.height < minSize || b.width > maxSize || b.height > maxSize) continue;
        const aspect = b.width / b.height;
        if (aspect < 0.65 || aspect > 1.55) continue;
        const cx = b.x + b.width / 2;
        const cy = b.y + b.height / 2;
        if (
          cx < searchRegion.x ||
          cx > searchRegion.x + searchRegion.width ||
          cy < searchRegion.y ||
          cy > searchRegion.y + searchRegion.height
        ) {
          continue;
        }
        circles.push({ tag: el.tagName, box: b, style: el.getAttribute('style') || '' });
      }

      // De-dupe near-identical boxes (traced art sometimes layers two
      // coincident paths — e.g. a fill pass and a stroke pass — for the
      // same visible circle).
      const deduped = [];
      for (const c of circles) {
        const dup = deduped.find(
          (d) => Math.abs(d.box.x - c.box.x) < 0.5 && Math.abs(d.box.y - c.box.y) < 0.5
        );
        if (!dup) deduped.push(c);
      }

      // Reading order: top-to-bottom rows (grouped by y, tolerant of small
      // stagger), left-to-right within a row.
      deduped.sort((a, b) => a.box.y - b.box.y || a.box.x - b.box.x);
      const rows = [];
      for (const c of deduped) {
        const row = rows.find((r) => Math.abs(r.y - c.box.y) < c.box.height * 0.6);
        if (row) {
          row.items.push(c);
          row.y = (row.y * (row.items.length - 1) + c.box.y) / row.items.length;
        } else {
          rows.push({ y: c.box.y, items: [c] });
        }
      }
      for (const row of rows) row.items.sort((a, b) => a.box.x - b.box.x);
      const ordered = rows.flatMap((r) => r.items);

      return {
        viewBox: svgEl.getAttribute('viewBox'),
        labelBox,
        searchRegion,
        count: ordered.length,
        circles: ordered.map((c) => ({ box: c.box, style: c.style })),
        note:
          'Rough geometry match only — verify count/order against a screenshot before wiring up ' +
          'overlays, and hand-tune the final positions.',
      };
    },
    {
      selector: args.selector,
      near: args.near,
      radius: args.radius,
      region: args.region,
      minSize: args.minSize,
      maxSize: args.maxSize,
    }
  );

  console.log(JSON.stringify(result, null, 2));
  if (result.error) process.exitCode = 1;
} finally {
  await browser.close();
}
