import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import * as G from "../../kit/lathe.mjs";
import { kitScript } from "../../scripts/inline-kit.mjs";
import * as M from "./model.mjs";
import { makeFoot } from "./parts.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";
const RAD = Math.PI / 180;

const WIDTH = 600;
const HEIGHT = 420;
const PLATE = { x: -292, y: -104, w: 344, d: 240, r: 10 };
const PLATE_H = 12;
const FOOT_H = 5;
const MAT_PLAN = { x: M.MAT.x0 - 6, y: M.MAT.y0 - 6, w: M.MAT.x1 - M.MAT.x0 + 12, d: M.MAT.y1 - M.MAT.y0 + 12, r: 4 };
const MAT_H = 3;
const POST = [-48, -86];
const ARC = { x0: 14, x1: 18, rIn: 92, rOut: 104, span: 33, pivot: 4 };
const GAUGE = { x: -113, y: 66, w: 12, d: 4, r: 1, h: 60 };
const TABLET = { x: -232, y: 78, w: 162, d: 46, r: 5 };
const TABLET_H = 7;
const START = 3;

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [-48, 2, 154], [POST[0], POST[1], 136], [ARC.x1, 0, ARC.pivot + ARC.rOut + 2]],
  WIDTH,
  HEIGHT,
  { pad: 22, azimuth: 40 },
);
const V = G.viewOf(P);
const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const F = makeFoot(k, G, P, M);
const GRID = M.cellsOf();

function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 24))) {
    out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid", inner: L(k.sideSeam(PLATE, -5, P, 8), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 11);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  const strip = { x: -276, y: PLATE.y + PLATE.d - 15, w: 312, d: 7, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.8, 0.6, [2, 3.6], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(D([at([strip.x + 2, strip.y + 3.5, 0.6]), at([strip.x + strip.w - 2, strip.y + 3.5, 0.6])], { size: 0.45 }));
  const label = { x: 0, y: 82, w: 38, d: 26, r: 2 };
  out.push(S(k.slabOf(label, 0, 0.8, P, 3, 0.3), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(label, 2.2), 0.8, P, 3), { tone: "faint" }));
  out.push(k.faceTextSvg(k.topMatrix([label.x + 6, label.y + 8], 0.8, P, "x"), "LEFT · STJ", { size: 3, tone: "mid" }));
  [13, 17, 21].forEach((y, index) => out.push(L(k.lineOnTop([label.x + 6, label.y + y], [label.x + (index === 2 ? 22 : 31), label.y + y], 0.8, P), { tone: "faint", free: true })));
  out.push(D(k.corners(label, 2.6).map(([x, y]) => at([x, y, 0.8])), { size: 0.4, tone: "lo" }));
  return out.join("");
}

function stand() {
  const out = [];
  const [x, y] = POST;
  const base = { x: x - 14, y: y - 12, w: 28, d: 24, r: 3 };
  out.push(S(k.slabOf(base, 0, 9, P, 4, 0.6), { tone: "mid" }));
  out.push(D(k.corners(base, 4).map(([px, py]) => at([px, py, 9])), { size: 0.45, tone: "lo" }));
  out.push(S(k.cylinder(x, y, 6, 9, 3, P, 28), { tone: "mid" }));
  const CZ = 106;
  out.push(S(k.cylinder(x, y, 4, 12, CZ - 14, P, 28), { tone: "mid", crease: "none", inner: L([40, 80].map((z) => k.sideArc(x, y, 4, z, P, 16)).join(""), { tone: "faint" }) }));
  out.push(S(k.cylinder(x, y, 4.6, CZ - 2, 2, P, 28), { tone: "mid" }));
  const clamp = { x: x - 7, y: y - 7, w: 14, d: 14, r: 2.5 };
  out.push(S(k.slabOf(clamp, CZ, 16, P, 4, 0.6), { tone: "mid" }));
  out.push(S(k.cylinder(x, y, 4, CZ + 16, 12, P, 28), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(x, y, 4.6, CZ + 28, 2, P, 28), { tone: "mid" }));
  const thumb = [x - 10, y];
  out.push(S(k.slabOf({ x: x - 10, y: y - 1.4, w: 3, d: 2.8, r: 0.8 }, CZ + 6, 4, P, 2), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(thumb[0] - 1.4, thumb[1], 2.6, CZ + 4, 6, P, 20), { tone: "mid" }));
  out.push(L(k.knurl(thumb[0] - 1.4, thumb[1], 2.6, CZ + 4, CZ + 10, 18, P), { tone: "lo" }));
  const arm = { x: x - 5, y: y + 7, w: 10, d: 2 - y - 7 - 20, r: 2 };
  out.push(S(k.slabOf(arm, CZ + 4, 8, P, 4, 0.5), { tone: "mid" }));
  out.push(D([at([x, arm.y + 5, CZ + 12]), at([x, arm.y + arm.d - 5, CZ + 12])], { size: 0.45 }));
  return out.join("");
}

function mat() {
  const out = [`<path class="iso-halo" d="${k.haloOf(k.insetPlan(MAT_PLAN, 4), 0, 0.1, P)}" style="filter:blur(5px)"/>`];
  out.push(S(k.slabOf(MAT_PLAN, 0, MAT_H, P, 4, 0.5), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(MAT_PLAN, 3.2), MAT_H, P, 4), { tone: "faint" }));
  const cells = GRID.cells.map(({ x, y }, index) => {
    const hx = M.MAT.px / 2 - 1.1;
    const hy = M.MAT.py / 2 - 1.1;
    const d = k.onTop([[x - hx, y - hy], [x + hx, y - hy], [x + hx, y + hy], [x - hx, y + hy]], MAT_H, P, true);
    return `<path class="fp-cell" data-cell="${index}" data-load="${M.levelOf(M.pressureAt(START, x, y))}" d="${d}"/>`;
  });
  out.push(`<g data-part="mat-cells">${cells.join("")}</g>`);
  const box = { x: -60, y: MAT_PLAN.y + MAT_PLAN.d, w: 20, d: 7, r: 1.2 };
  out.push(S(k.slabOf(box, 0, 5, P, 3, 0.4), { tone: "mid" }));
  out.push(D([at([box.x + 4, box.y + box.d, 2.5]), at([box.x + box.w - 4, box.y + box.d, 2.5])], { size: 0.45, tone: "lo" }));
  return out.join("");
}

function arcPoint(x, r, deg) {
  return [x, r * Math.sin(deg * RAD), ARC.pivot + r * Math.cos(deg * RAD)];
}

function goniometer() {
  const out = [];
  const ends = [-ARC.span, ARC.span];
  for (const deg of ends) {
    const y = 98 * Math.sin(deg * RAD);
    const zTop = ARC.pivot + ARC.rIn * Math.cos(deg * RAD) - 3;
    out.push(S(k.slabOf({ x: 10, y: y - 6, w: 12, d: 12, r: 2 }, 0, 4, P, 3, 0.4), { tone: "mid" }));
    out.push(S(k.cylinder(16, y, 2.8, 4, zTop - 4, P, 20), { tone: "mid", crease: "none" }));
    out.push(S(k.slabOf({ x: 11.5, y: y - 6.5, w: 9, d: 13, r: 1.5 }, zTop, 5, P, 3, 0.4), { tone: "mid" }));
  }
  const n = 66;
  const angles = Array.from({ length: n + 1 }, (_, i) => -ARC.span + (2 * ARC.span * i) / n);
  const front = [...angles.map((a) => at(arcPoint(ARC.x1, ARC.rOut, a))), ...angles.slice().reverse().map((a) => at(arcPoint(ARC.x1, ARC.rIn, a)))];
  const strip = [...angles.map((a) => at(arcPoint(ARC.x0, ARC.rOut, a))), ...angles.slice().reverse().map((a) => at(arcPoint(ARC.x1, ARC.rOut, a)))];
  const cap = [arcPoint(ARC.x0, ARC.rIn, ARC.span), arcPoint(ARC.x0, ARC.rOut, ARC.span), arcPoint(ARC.x1, ARC.rOut, ARC.span), arcPoint(ARC.x1, ARC.rIn, ARC.span)].map(at);
  const area = (poly) => poly.reduce((sum, [x, y], i) => { const [nx, ny] = poly[(i + 1) % poly.length]; return sum + x * ny - nx * y; }, 0);
  const wind = (poly) => (area(poly) < 0 ? poly.slice().reverse() : poly);
  const shades = ["", "", "", ""];
  let topD = "";
  const put = (poly, normal) => {
    const band = G.toneOf(normal, P);
    const d = k.pathOf(wind(poly), true);
    if (band >= 4) topD += d;
    else shades[band] += d;
  };
  put(front, [1, 0, 0]);
  for (let i = 0; i < n; i++) {
    const a0 = angles[i];
    const a1 = angles[i + 1];
    const mid = ((a0 + a1) / 2) * RAD;
    put([arcPoint(ARC.x0, ARC.rOut, a0), arcPoint(ARC.x0, ARC.rOut, a1), arcPoint(ARC.x1, ARC.rOut, a1), arcPoint(ARC.x1, ARC.rOut, a0)].map(at), [0, Math.sin(mid), Math.cos(mid)]);
  }
  put(cap, [0, Math.cos(ARC.span * RAD), -Math.sin(ARC.span * RAD)]);
  const fill = [front, strip, cap].map((poly) => k.pathOf(wind(poly), true)).join("");
  const outline = [
    k.pathOf(front, true),
    k.pathOf(angles.map((a) => at(arcPoint(ARC.x0, ARC.rOut, a)))),
    k.pathOf([at(arcPoint(ARC.x0, ARC.rOut, -ARC.span)), at(arcPoint(ARC.x1, ARC.rOut, -ARC.span))]),
    k.pathOf(cap, true),
  ].join("");
  out.push(S({ fill, outline, crease: "", top: topD, shades }, { tone: "mid" }));
  const minor = [];
  const major = [];
  for (let deg = -32; deg <= 32; deg += 2) {
    const big = deg % 10 === 0;
    (big ? major : minor).push(k.segment(arcPoint(ARC.x1, ARC.rIn, deg), arcPoint(ARC.x1, ARC.rIn + (big ? 5 : 3), deg), P));
  }
  out.push(L(minor.join(""), { tone: "lo" }), L(major.join(""), { tone: "mid" }));
  out.push(L(k.segment(arcPoint(ARC.x1, ARC.rIn, 0), arcPoint(ARC.x1, ARC.rOut, 0), P), { tone: "hi" }));
  const zone = Array.from({ length: 13 }, (_, i) => at(arcPoint(ARC.x1, ARC.rOut - 2.6, (6 * i) / 12)));
  out.push(L(k.pathOf(zone), { tone: "hi" }));
  out.push(L(k.segment(arcPoint(ARC.x1, ARC.rOut - 4, 6), arcPoint(ARC.x1, ARC.rOut, 6), P), { tone: "hi" }));
  out.push(D([-20, 20].map((deg) => at(arcPoint(ARC.x1, ARC.rOut - 2.4, deg))), { size: 0.5, tone: "hi" }));
  return out.join("");
}

function gauge() {
  const out = [];
  out.push(S(k.slabOf({ x: GAUGE.x - 4, y: GAUGE.y - 4, w: GAUGE.w + 8, d: GAUGE.d + 8, r: 2 }, 0, 4, P, 3, 0.4), { tone: "mid" }));
  out.push(S(k.slabOf(GAUGE, 4, GAUGE.h, P, 2, 0.3), { tone: "mid" }));
  const face = GAUGE.y + GAUGE.d;
  const minor = [];
  const major = [];
  for (let z = 8; z <= GAUGE.h; z += 2) {
    const big = (z - 4) % 10 === 0;
    (big ? major : minor).push(k.segment([GAUGE.x + GAUGE.w, face, z], [GAUGE.x + GAUGE.w - (big ? 5 : 2.8), face, z], P));
  }
  out.push(L(minor.join(""), { tone: "lo" }), L(major.join(""), { tone: "mid" }));
  out.push(D([at([GAUGE.x + 2.4, face, GAUGE.h + 1.2])], { size: 0.45, tone: "lo" }));
  return out.join("");
}

function collar() {
  const out = [];
  const [x, y] = F.TIBIA;
  const [z0, z1] = F.COLLAR_Z;
  const Fz = G.frameAlong([x, y, z0], [0, 0, 1]);
  out.push(S(G.ringBand(0, z1 - z0, 12.8, 21, Fz, P), { tone: "mid", inner: L(G.arcOf(Fz, (z1 - z0) / 2, 21, P), { tone: "faint" }) }));
  const minor = [];
  const major = [];
  for (let deg = -14; deg <= 14; deg += 2) {
    const big = deg % 10 === 0;
    const t = deg * RAD;
    const dir = [Math.sin(t), Math.cos(t)];
    (big ? major : minor).push(k.lineOnTop([x + dir[0] * 21, y + dir[1] * 21], [x + dir[0] * (big ? 15.6 : 17.8), y + dir[1] * (big ? 15.6 : 17.8)], z1, P));
  }
  out.push(L(minor.join(""), { tone: "lo" }), L(major.join(""), { tone: "mid" }));
  out.push(D([150, 210].map((deg) => { const t = deg * RAD; return at([x + Math.sin(t) * 17, y + Math.cos(t) * 17, z1]); }), { size: 0.45, tone: "lo" }));
  return out.join("");
}

function tablet() {
  const out = [`<path class="iso-halo" d="${k.haloOf(k.insetPlan(TABLET, 3), 0, 0.1, P)}" style="filter:blur(4px)"/>`];
  out.push(S(k.slabOf(TABLET, 0, TABLET_H, P, 6, 0.8), { tone: "mid" }));
  const screen = { x: TABLET.x + 6, y: TABLET.y + 5, w: 124, d: TABLET.d - 10, r: 2 };
  out.push(S(k.slabOf(screen, TABLET_H - 0.4, 0.4, P, 3), { tone: "lo", crease: "none", flat: true }));
  const sc = 0.32;
  const ox = screen.x + 6;
  const oy = screen.y + (screen.d - (M.MAT.y1 - M.MAT.y0) * sc) / 2;
  const cells = GRID.cells.map(({ x, y }, index) => {
    const cx = ox + (x - M.MAT.x0) * sc;
    const cy = oy + (y - M.MAT.y0) * sc;
    const hx = (M.MAT.px * sc) / 2 - 0.35;
    const hy = (M.MAT.py * sc) / 2 - 0.35;
    const d = k.onTop([[cx - hx, cy - hy], [cx + hx, cy - hy], [cx + hx, cy + hy], [cx - hx, cy + hy]], TABLET_H, P, true);
    return `<path class="fp-cell fp-mini" data-cell="${index}" data-load="${M.levelOf(M.pressureAt(START, x, y))}" d="${d}"/>`;
  });
  out.push(`<g data-part="mini-cells">${cells.join("")}</g>`);
  const bar = { x: screen.x + screen.w - 17, y: screen.y + 5, w: 6, d: screen.d - 10 };
  out.push(L(k.planOutline({ ...bar, r: 0.6 }, TABLET_H, P, 2), { tone: "mid" }));
  out.push(L(k.lineOnTop([bar.x, bar.y + bar.d / 2], [bar.x + bar.w, bar.y + bar.d / 2], TABLET_H, P), { tone: "mid" }));
  const share = M.medialShare(START);
  out.push(`<path data-part="share" class="fp-share" d="${shareBar(bar, share)}"/>`);
  out.push(`<g data-bar='${JSON.stringify(bar)}'></g>`);
  const keys = [0, 1, 2].map((i) => [screen.x + screen.w + 8, screen.y + 7 + i * 11]);
  keys.forEach(([x, y]) => {
    out.push(S(k.cylinder(x + 6, y, 3.4, TABLET_H, 1.2, P, 20), { tone: "mid" }));
  });
  out.push(D([at([TABLET.x + TABLET.w - 8, TABLET.y + TABLET.d - 7, TABLET_H])], { size: 0.9, tone: "hi", pulse: true }));
  out.push(D(k.corners(TABLET, 3.4).map(([x, y]) => at([x, y, TABLET_H])), { size: 0.4, tone: "lo" }));
  return out.join("");
}

function shareBar(bar, share) {
  const h = bar.d * share;
  const y0 = bar.y + bar.d - h;
  return k.onTop([[bar.x + 1, y0], [bar.x + bar.w - 1, y0], [bar.x + bar.w - 1, bar.y + bar.d - 0.6], [bar.x + 1, bar.y + bar.d - 0.6]], TABLET_H, P, true);
}

function cable() {
  const from = at([-50, MAT_PLAN.y + MAT_PLAN.d + 7, 2.5]);
  const via = [at([-50, 73, 0.8]), at([-82, 73, 0.8])];
  const to = at([-82, TABLET.y, 3.5]);
  return k.wireSvg(from, to, { via, tone: "mid", size: 1 });
}

const CSS = `
.fp-cell{stroke:var(--anatomy-faint);stroke-width:.4;fill:transparent;transition:fill .18s linear}
.fp-cell[data-load="1"]{fill:var(--anatomy-lo)}
.fp-cell[data-load="2"]{fill:var(--anatomy-mid)}
.fp-cell[data-load="3"]{fill:var(--anatomy-hi)}
.fp-share{fill:var(--anatomy-hi);stroke:none}
.iso-stage:focus{outline:none}
.iso-stage:focus-visible{outline:1px solid var(--anatomy-muted);outline-offset:6px}
@media (prefers-reduced-motion:reduce){.fp-cell{transition:none}}
`;

const pose0 = M.poseOf(START);
const readoutOf = (pose) => `eversion ${pose.alpha >= 0 ? "+" : "−"}${Math.abs(pose.alpha).toFixed(1)}° · ${pose.drop >= 0 ? "drop" : "rise"} ${Math.abs(pose.drop).toFixed(1)} mm · ${pose.label}`;

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "A skeletal left foot model standing on a plantar pressure mat. A pointer fixed to the back of the heel bone reads the rearfoot angle on an arc scale; a slider on a ruler beside the arch marks the height of the navicular; a bearing collar on the stand reads the tibia's rotation; and a tablet maps the pressure under each sensor cell. As the heel everts, the arch lowers, the tibia turns inward and the load moves to the inner side of the foot.",
  body: [
    plate(),
    stand(),
    mat(),
    `<path class="iso-halo" d="${k.haloOf({ x: -236, y: -36, w: 232, d: 58, r: 26 }, MAT_H, 0.1, P)}" style="filter:blur(7px)"/>`,
    `<g data-part="toes">${F.toes()}</g>`,
    `<g data-part="fibula">${F.fibula()}</g>`,
    `<g data-part="foot">${F.foot(START)}</g>`,
    `<g data-part="tibia">${F.tibia()}</g>`,
    goniometer(),
    gauge(),
    `<g data-part="rod">${F.rod(START)}</g>`,
    `<g data-part="slider">${F.slider(START)}</g>`,
    collar(),
    `<g data-part="top">${F.top(START)}</g>`,
    cable(),
    tablet(),
  ],
});

const latheSource = readFileSync(join(HERE, "..", "..", "kit", "lathe.mjs"), "utf8").replace(/^import .*$/m, "").replace(/^export /gm, "");
const latheScript = `const G = (() => {${latheSource}\nreturn { viewOf, frameAlong, frameOf, disc, sphereOf, prismOf, solidOf, arcOf, dot3, add3, sub3, mul3, unit3, len3, lerp3 };})();\n`;
const modelScript = `const M = (() => {${readFileSync(join(HERE, "model.mjs"), "utf8").replace(/^export /gm, "")}\nreturn { poseOf, cellsOf, pressureAt, levelOf, medialShare, RANGE, STOPS, MAT };})();\n`;
const partsScript = readFileSync(join(HERE, "parts.mjs"), "utf8").replace(/^export /gm, "");

const live = `
const P = ${JSON.stringify(P)};
const TABLET_H = ${TABLET_H};
const K = { iso, pathOf, solidSvg, lineSvg, dotsSvg, onTop, segment, slabOf };
const PARTS = makeFoot(K, G, P, M);
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const $ = (sel) => svg.querySelector(sel);
const el = { foot: $('[data-part="foot"]'), rod: $('[data-part="rod"]'), slider: $('[data-part="slider"]'), top: $('[data-part="top"]'), share: $('[data-part="share"]') };
const bar = JSON.parse($("[data-bar]").getAttribute("data-bar"));
const matCells = [...svg.querySelectorAll('[data-part="mat-cells"] .fp-cell')];
const miniCells = [...svg.querySelectorAll('[data-part="mini-cells"] .fp-cell')];
const GRID = M.cellsOf();
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const [LO, HI] = M.RANGE;
const STOPS = M.STOPS;
const say = (pose) => "eversion " + (pose.alpha >= 0 ? "+" : "\\u2212") + Math.abs(pose.alpha).toFixed(1) + "\\u00b0 \\u00b7 " + (pose.drop >= 0 ? "drop " : "rise ") + Math.abs(pose.drop).toFixed(1) + " mm \\u00b7 " + pose.label;
const shareBar = (share) => { const h = bar.d * share; const y0 = bar.y + bar.d - h; return onTop([[bar.x + 1, y0], [bar.x + bar.w - 1, y0], [bar.x + bar.w - 1, bar.y + bar.d - 0.6], [bar.x + 1, bar.y + bar.d - 0.6]], TABLET_H, P, true); };
let alpha = ${START}, target = alpha, drawn = NaN, kind = -1;
let frame = 0, last = 0, clock = 0, touring = !still.matches, visible = false, idleTimer = 0;
const TOUR = [3, 11, 3, -5];
const tourAt = (t) => TOUR[Math.floor(t / 2.6) % TOUR.length];
function draw() {
  if (Math.abs(alpha - drawn) < (alpha === target ? 0.005 : 0.08)) return;
  drawn = alpha;
  el.foot.innerHTML = PARTS.foot(alpha);
  el.rod.innerHTML = PARTS.rod(alpha);
  el.slider.innerHTML = PARTS.slider(alpha);
  el.top.innerHTML = PARTS.top(alpha);
  GRID.cells.forEach((cell, index) => {
    const level = String(M.levelOf(M.pressureAt(alpha, cell.x, cell.y)));
    if (matCells[index].dataset.load !== level) { matCells[index].dataset.load = level; miniCells[index].dataset.load = level; }
  });
  el.share.setAttribute("d", shareBar(M.medialShare(alpha)));
  const pose = M.poseOf(alpha);
  const text = say(pose);
  if (readout.textContent !== text) readout.textContent = text;
  if (pose.kind !== kind) {
    kind = pose.kind;
    stage.setAttribute("aria-valuenow", String(Math.round(pose.alpha)));
    stage.setAttribute("aria-valuetext", pose.label + ", rearfoot eversion " + Math.round(pose.alpha) + " degrees");
  }
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  if (touring) { clock += dt; target = tourAt(clock); }
  alpha = still.matches ? target : alpha + (target - alpha) * (1 - Math.exp(-dt / 0.42));
  if (Math.abs(target - alpha) < 0.01) alpha = target;
  draw();
  const settled = !touring && alpha === target;
  frame = visible && !settled ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const steer = (next) => { touring = false; target = clamp(next, LO, HI); clearTimeout(idleTimer); idleTimer = setTimeout(() => { touring = !still.matches; clock = 0; run(); }, 3600); run(); };
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
stage.addEventListener("pointermove", (event) => {
  const box = svg.getBoundingClientRect();
  const share = clamp(((event.clientX - box.left) / box.width - 0.2) / 0.6, 0, 1);
  steer(LO + share * (HI - LO));
});
stage.addEventListener("pointerdown", (event) => {
  const box = svg.getBoundingClientRect();
  const share = clamp(((event.clientX - box.left) / box.width - 0.2) / 0.6, 0, 1);
  steer(LO + share * (HI - LO));
});
stage.addEventListener("keydown", (event) => {
  const here = STOPS.reduce((best, stop, index) => (Math.abs(stop - target) < Math.abs(STOPS[best] - target) ? index : best), 0);
  let to = null;
  if (event.key === "ArrowRight" || event.key === "ArrowUp") to = STOPS[Math.min(STOPS.length - 1, here + 1)];
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") to = STOPS[Math.max(0, here - 1)];
  if (event.key === "Home") to = LO;
  if (event.key === "End") to = HI;
  if (to === null) return;
  event.preventDefault();
  steer(to);
});
drawn = alpha;
`;

const body =
  `<style>${CSS}</style>` +
  k.plateHtml({
    fig: "Fig 1",
    title: "Subtalar pronation",
    hint: "Hover left to right to evert the heel",
    readout: readoutOf(pose0),
    keys: [
      { mark: "lit", label: "Heel pointer: the calcaneus's tilt against the leg, read on the arc" },
      { mark: "raised", label: "Bones of the left foot, pinned as a study model" },
      { mark: "flat", label: "Pressure cells: darker ink, more load" },
    ],
    caption:
      "A left foot standing on a pressure mat, seen from behind and the inner side. Rolling the heel from 5° of inversion to 12° of eversion lowers the arch (the navicular drops about 0.9 mm per degree; 3–5 mm at a neutral 3°, past 10 mm when overpronated), turns the tibia inward about 0.7° per degree on its collar, and moves the load from the outer border to the inner arch and the big toe. 0–6° of eversion in relaxed stance is the neutral band marked on the arc.",
    body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Foot pronation: arrow keys step between supinated, neutral and overpronated" aria-valuemin="${M.RANGE[0]}" aria-valuemax="${M.RANGE[1]}" aria-valuenow="${START}" aria-valuetext="neutral, rearfoot eversion ${START} degrees" style="touch-action:pan-y">${svg}</div>`,
  });

const name = theme === "light" ? "foot-pronation-light.html" : "foot-pronation.html";
writeFileSync(join(HERE, name), k.pageHtml({ title: "Foot pronation", theme, body, script: kitScript() + latheScript + modelScript + partsScript + live }));
console.log("wrote", name);
