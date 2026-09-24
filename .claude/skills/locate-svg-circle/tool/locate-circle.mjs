#!/usr/bin/env node
// Finds a large, filled "value" circle inside a rendered, inline <svg> — e.g.
// the PROFICIENCY BONUS / PASSIVE PERCEPTION / ARMOR CLASS circles on a
// PDF-traced character sheet — and returns its center plus a CENTERED
// bounding box for dropping a <foreignObject> input into it, all in the
// SVG's own viewBox user-unit coordinate system (not pixels).
//
// Unlike locate-svg-checkboxes (many small round tick-boxes → corner boxes
// for checkbox overlays) this targets ONE big circle beside a label and
// returns a box centered on it, because a numeric input wants centering, not
// corner-anchoring. The circle is matched by fill color — traced art draws
// these as white-filled <path> rings, and querying by computed fill
// (rgb(255,255,255)) is far more reliable than visual grid/crop guessing.
//
// Usage:
//   node locate-circle.mjs --near "PROFICIENCY" --side left
//     [--url http://localhost:5173] [--selector svg]
//     [--radius 120] [--min-size 30] [--max-size 90] [--fill white|any]
//     [--field-width N] [--field-height N]
//   node locate-circle.mjs --region "40,150,60,70"   (anchor by box instead)
//
// Requires the target page to already be running (e.g. `yarn dev`) and to
// contain the SVG inline in the DOM (not inside an <img> or <object>).

import { chromium } from 'playwright';

function parseArgs(argv) {
  const args = {
    url: 'http://localhost:5173',
    selector: 'svg',
    near: null,
    side: 'auto', // left | right | above | below | auto (nearest)
    radius: 120,
    region: null,
    minSize: 30,
    maxSize: 90,
    fill: 'white', // white | any
    fieldWidth: null,
    fieldHeight: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === '--url') args.url = next();
    else if (a === '--selector') args.selector = next();
    else if (a === '--near') args.near = next();
    else if (a === '--side') args.side = next();
    else if (a === '--radius') args.radius = parseFloat(next());
    else if (a === '--region') args.region = next();
    else if (a === '--min-size') args.minSize = parseFloat(next());
    else if (a === '--max-size') args.maxSize = parseFloat(next());
    else if (a === '--fill') args.fill = next();
    else if (a === '--field-width') args.fieldWidth = parseFloat(next());
    else if (a === '--field-height') args.fieldHeight = parseFloat(next());
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
if (!args.near && !args.region) {
  console.error(
    'Usage: node locate-circle.mjs --near "<label text>" [--side left|right|above|below] ' +
      '| --region "x,y,w,h" [--url <url>] [--selector <css>] [--min-size N] [--max-size N] ' +
      '[--fill white|any] [--field-width N] [--field-height N]'
  );
  process.exit(1);
}

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 1600 } });
  await page.goto(args.url, { waitUntil: 'networkidle' });
  await page.waitForSelector(args.selector);

  const result = await page.evaluate((opts) => {
    const { selector, near, side, radius, region, minSize, maxSize, fill } = opts;
    const svgEl = document.querySelector(selector);
    if (!svgEl || svgEl.tagName.toLowerCase() !== 'svg') {
      return { error: `Selector "${selector}" did not match an <svg> element` };
    }
    const ctm = svgEl.getScreenCTM();
    if (!ctm) {
      return { error: 'Could not compute a screen transform for the SVG (is it visible / non-zero size?)' };
    }
    const inv = ctm.inverse();
    const round = (n) => Math.round(n * 100) / 100;

    function toUserBox(el) {
      const r = el.getBoundingClientRect();
      const p1 = new DOMPoint(r.left, r.top).matrixTransform(inv);
      const p2 = new DOMPoint(r.right, r.bottom).matrixTransform(inv);
      return {
        x: round(p1.x),
        y: round(p1.y),
        width: round(p2.x - p1.x),
        height: round(p2.y - p1.y),
      };
    }

    // Resolve the anchor point/box the circle should sit beside.
    let anchor = null; // {x,y,width,height} in user units
    let labelBox = null;
    if (region) {
      const [x, y, w, h] = region.split(',').map((n) => parseFloat(n));
      anchor = { x, y, width: w, height: h };
    } else {
      const needle = near.toLowerCase();
      const candidates = [];
      for (const el of svgEl.querySelectorAll('tspan, text')) {
        const text = (el.textContent || '').trim();
        if (text.toLowerCase().includes(needle)) candidates.push({ el, text });
      }
      if (candidates.length === 0) {
        return { error: `No text found containing "${near}"`, viewBox: svgEl.getAttribute('viewBox') };
      }
      candidates.sort((a, b) => a.text.length - b.text.length);
      labelBox = toUserBox(candidates[0].el);
      anchor = labelBox;
    }
    const anchorCx = anchor.x + anchor.width / 2;
    const anchorCy = anchor.y + anchor.height / 2;

    const wantWhite = fill === 'white';
    const isWhite = (el) => {
      const f = (el.getAttribute('fill') || getComputedStyle(el).fill || '').replace(/\s/g, '');
      return f === 'rgb(255,255,255)' || f === '#fff' || f === '#ffffff' || f === 'white';
    };

    // Collect filled, roughly-circular shapes in range, matched by fill.
    const found = [];
    for (const el of svgEl.querySelectorAll('path, circle, ellipse')) {
      const b = toUserBox(el);
      if (b.width <= 0 || b.height <= 0) continue;
      if (b.width < minSize || b.height < minSize || b.width > maxSize || b.height > maxSize) continue;
      const aspect = b.width / b.height;
      if (aspect < 0.75 || aspect > 1.33) continue;
      if (wantWhite && !isWhite(el)) continue;
      const cx = b.x + b.width / 2;
      const cy = b.y + b.height / 2;
      const dist = Math.hypot(cx - anchorCx, cy - anchorCy);
      if (dist > radius) continue;
      found.push({ box: b, cx: round(cx), cy: round(cy), diameter: round((b.width + b.height) / 2), dist });
    }

    // De-dupe concentric rings (outer + inner path for the same circle):
    // same center within 1.5u → keep the larger diameter.
    found.sort((a, b) => b.diameter - a.diameter);
    const deduped = [];
    for (const c of found) {
      if (!deduped.some((d) => Math.abs(d.cx - c.cx) < 1.5 && Math.abs(d.cy - c.cy) < 1.5)) {
        deduped.push(c);
      }
    }

    // Pick the circle on the requested side of the anchor (else nearest).
    const onSide = (c) => {
      switch (side) {
        case 'left': return c.cx < anchorCx;
        case 'right': return c.cx > anchorCx;
        case 'above': return c.cy < anchorCy;
        case 'below': return c.cy > anchorCy;
        default: return true;
      }
    };
    const eligible = deduped.filter(onSide);
    eligible.sort((a, b) => a.dist - b.dist);
    const chosen = eligible[0] || null;

    if (!chosen) {
      return {
        viewBox: svgEl.getAttribute('viewBox'),
        labelBox,
        error: `No ${wantWhite ? 'white-filled ' : ''}circle (size ${minSize}-${maxSize}) found ` +
          `on side "${side}" within radius ${radius} of the anchor. ` +
          `Candidates in range: ${deduped.length}.`,
        candidates: deduped.map((c) => ({ center: { x: c.cx, y: c.cy }, diameter: c.diameter })),
      };
    }

    // Centered field box. Default size scales to the circle; a square-ish
    // input a bit smaller than the diameter reads well inside the ring.
    const fw = opts.fieldWidth != null ? opts.fieldWidth : round(chosen.diameter * 0.7);
    const fh = opts.fieldHeight != null ? opts.fieldHeight : round(chosen.diameter * 0.55);
    const suggestedBox = {
      x: round(chosen.cx - fw / 2),
      y: round(chosen.cy - fh / 2),
      width: fw,
      height: fh,
    };

    return {
      viewBox: svgEl.getAttribute('viewBox'),
      labelBox,
      circle: { center: { x: chosen.cx, y: chosen.cy }, diameter: chosen.diameter, box: chosen.box },
      suggestedBox,
      candidateCount: deduped.length,
      note:
        'suggestedBox is CENTERED on the circle (top-left = center - size/2), sized ~0.7x0.55 of the ' +
        'diameter. Verify against a screenshot and hand-tune; to align several fields on one axis, ' +
        'reuse a shared y (or x) and identical width/height/fontSize across them.',
    };
  }, args);

  console.log(JSON.stringify(result, null, 2));
  if (result.error) process.exitCode = 1;
} finally {
  await browser.close();
}
