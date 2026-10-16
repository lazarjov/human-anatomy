import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import * as G from "../../kit/lathe.mjs";
import { kitScript } from "../../scripts/inline-kit.mjs";
import { HIP, stance } from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 600;
const HEIGHT = 470;
const U = 3;

const HEAD = [0, 4, 90];
const HEAD_R = 7.5;
const MID = -HIP.weightArm * U;
const FACE = 10;
const SPINE_BASE = 138;
const VERTEBRAE = 8;
const V_H = 6.8;
const V_GAP = 1.6;
const BLOCK_FROM = VERTEBRAE * (V_H + V_GAP) - V_GAP;
const BLOCK_H = 22;
const COM = HIP.comHeight * U;

const PLATE = { x: -128, y: -40, w: 186, d: 78, r: 8 };
const PLATE_H = 10;
const FOOT_H = 5;
const STRIP = { x: -110, y: 25, w: 146, d: 7, r: 1 };
const PLUMB_Y = 28.5;
const GAUGE = [-66, -12];
const GAUGE_R = 14;
const GAUGE_H = 9;
const SPAN = Math.PI * 1.5;
const FROM = -Math.PI * 0.75;
const FULL = 4;

const SHAFT_LOW = [13, 0, 28];
const SHAFT_TOP = [21, 0, 82];
const NECK_FROM = [17, 0, 82];
const TROCH = [22, 0, 80];
const TROCH_R = 6.5;

const PULL = (HIP.pull * Math.PI) / 180;
const ARM = HIP.abductorArm * U;
const lineX = (z) => (ARM - Math.sin(PULL) * (z - HEAD[2])) / Math.cos(PULL);
const T_Z = 84;
const INSERT = [lineX(T_Z), Math.sqrt(TROCH_R ** 2 - (lineX(T_Z) - TROCH[0]) ** 2 - (T_Z - TROCH[2]) ** 2), T_Z];
const ORIGIN = [lineX(132), 9, 132];
const MUSCLE = G.unit3(G.sub3(INSERT, ORIGIN));
const MUSCLE_L = G.len3(G.sub3(INSERT, ORIGIN));
const along = (s) => G.add3(ORIGIN, G.mul3(MUSCLE, s));
const CELL_S = 37;
const CELL = along(CELL_S);
const CELL_R = 6.2;
const CELL_FACE = CELL[1] + 2.2;

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [MID - 14, -11, SPINE_BASE + BLOCK_FROM + BLOCK_H], [MID + 14 + COM * 0.18, 11, SPINE_BASE + BLOCK_FROM + BLOCK_H], [MID + 34, 0, 141]],
  WIDTH,
  HEIGHT,
  { pad: 28, azimuth: 68, elevation: 24 },
);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const AXIS_Y = (o) => G.frameOf(o, [0, 1, 0], [1, 0, 0], [0, 0, 1]);
const FRONTAL = AXIS_Y([0, 0, 0]);
const prism = (points, y0 = -FACE, y1 = FACE) => G.prismOf(FRONTAL, G.hullOf(points), y0, y1, P);
const mirror = (points) => points.map(([x, z]) => [2 * MID - x, z]);
const faceLine = (points, y = FACE, closed = false) => k.pathOf(points.map(([x, z]) => at([x, y, z])), closed);
const ellipse = (cx, cz, rx, rz, y = FACE, steps = 28) => faceLine(Array.from({ length: steps }, (_, i) => [cx + rx * Math.cos((i / steps) * Math.PI * 2), cz + rz * Math.sin((i / steps) * Math.PI * 2)]), y, true);

const WING_Y = 4;
const WING = [[-20, 102], [-22, 124], [-16, 136], [-6, 142], [4, 141.4], [11, 135.5], [14, 125], [13.4, 115], [8.5, 102], [0, 96.5], [-10, 94.5]];
const SOCKET = Array.from({ length: 36 }, (_, i) => [HEAD[0] + 10.4 * Math.cos((i / 36) * Math.PI * 2), HEAD[2] + 11.2 * Math.sin((i / 36) * Math.PI * 2)]);
const RAMUS_UP = [[-7, 87], [-6, 80.5], [MID + 1.2, 77.5], [MID + 1.2, 83.5]];
const ISCHIUM = [[-1, 82], [-9.5, 82], [-14, 67], [-11, 63.5], [-5, 64.5]];
const RAMUS_LOW = [[-13, 71], [-11, 64.5], [MID + 1.2, 70], [MID + 1.2, 75]];
const SYMPHYSIS = [[MID - 1.2, 83.5], [MID + 1.2, 83.5], [MID + 1.2, 70], [MID - 1.2, 70]];
const SACRUM = [[MID - 13, 138], [MID + 13, 138], [MID + 11.5, 124], [MID + 7.5, 111], [MID + 3, 102], [MID - 3, 102], [MID - 7.5, 111], [MID - 11.5, 124]];
const COCCYX = [[MID - 3, 103], [MID + 3, 103], [MID + 1.6, 95], [MID - 1.6, 95]];

function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 18))) {
    out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid", inner: L(k.sideSeam(PLATE, -PLATE_H + 3, P, 8), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  out.push(S(k.slabOf(STRIP, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(-105, 30, U, 5, STRIP.y + 0.8, 0.6, [2, 3.6], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(L(k.lineOnTop([0, STRIP.y + 0.8], [0, STRIP.y + 5.2], 0.6, P), { tone: "hi" }));
  out.push(D([at([STRIP.x + 2, STRIP.y + 3.5, 0.6]), at([STRIP.x + STRIP.w - 2, STRIP.y + 3.5, 0.6])], { size: 0.45 }));
  const label = { x: 22, y: -32, w: 30, d: 14, r: 1.5 };
  out.push(S(k.slabOf(label, 0, 0.8, P, 4), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(label, 1.6), 0.8, P, 4), { tone: "faint" }));
  [[22, 0.9], [17, 0.6], [12, 0.75]].forEach(([w, _], i) => out.push(L(k.lineOnTop([label.x + 4, label.y + 4 + i * 3], [label.x + 4 + w * (i === 1 ? 0.7 : 1), label.y + 4 + i * 3], 0.8, P), { tone: "lo", free: true })));
  out.push(D([at([label.x + 2.4, label.y + 2.4, 0.8]), at([label.x + label.w - 2.4, label.y + label.d - 2.4, 0.8])], { size: 0.4 }));
  return out.join("");
}

function gauge() {
  const [x, y] = GAUGE;
  const top = GAUGE_H;
  const out = [];
  out.push(S(k.cylinder(x, y, GAUGE_R + 2.4, 0, 2.2, P, 64, 0.5), { tone: "mid" }));
  out.push(S(k.cylinder(x, y, GAUGE_R, 2.2, GAUGE_H - 2.2, P, 64, 0.8), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(x, y, GAUGE_R, top - 3, top, 80, P, 0.3), { tone: "lo" }));
  out.push(L(k.sideArc(x, y, GAUGE_R, top - 3, P, 40), { tone: "faint" }));
  out.push(L(k.ring(x, y, GAUGE_R - 2, top, P, 64), { tone: "lo" }));
  const ticks = k.radialTicks(x, y, GAUGE_R - 2.6, 40, 10, top, [1.2, 2.8], P, FROM, SPAN);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  const red = FROM + (3 / FULL) * SPAN;
  out.push(L(k.onTop(Array.from({ length: 13 }, (_, i) => { const a = red + (i / 12) * (FROM + SPAN - red); return [x + Math.sin(a) * (GAUGE_R - 6.2), y - Math.cos(a) * (GAUGE_R - 6.2)]; }), top, P), { tone: "mid", free: true }));
  out.push(L(k.ring(x, y, 1.8, top, P, 16), { tone: "mid" }));
  out.push(D(k.corners({ x: x - GAUGE_R - 2.4, y: y - GAUGE_R - 2.4, w: (GAUGE_R + 2.4) * 2, d: (GAUGE_R + 2.4) * 2 }, 3.6).filter((_, i) => i !== 1).map(([px, py]) => at([px, py, 2.2])), { size: 0.4, tone: "lo" }));
  const boss = [x + GAUGE_R * 0.42, y + GAUGE_R * 0.91];
  out.push(S(k.cylinder(boss[0], boss[1], 2.6, 2.2, 4.4, P, 20), { tone: "mid" }));
  return out.join("");
}

const gaugeNeedle = (value) => {
  const a = FROM + (Math.min(FULL, Math.max(0, value)) / FULL) * SPAN;
  const [x, y] = GAUGE;
  return k.lineOnTop([x - Math.sin(a) * 3.2, y + Math.cos(a) * 3.2], [x + Math.sin(a) * (GAUGE_R - 4), y - Math.cos(a) * (GAUGE_R - 4)], GAUGE_H + 0.2, P);
};

function pedestal() {
  const [x, y] = SHAFT_LOW;
  const out = [`<path class="iso-halo" d="${k.haloOf({ x: x - 13, y: y - 13, w: 26, d: 26, r: 13 }, 0, 0.1, P)}" style="filter:blur(3px)"/>`];
  out.push(S(k.cylinder(x, y, 12, 0, 3, P, 56, 0.6), { tone: "mid" }));
  out.push(L(k.ring(x, y, 9.4, 3, P, 48), { tone: "faint" }));
  out.push(D([0, 1, 2, 3].map((i) => { const a = Math.PI / 4 + (i * Math.PI) / 2; return [x + Math.cos(a) * 9.4, y + Math.sin(a) * 9.4]; }).map(([px, py]) => at([px, py, 3])), { size: 0.45 }));
  out.push(S(k.cylinder(x, y, 5.6, 3, 20, P, 32), { tone: "mid", crease: "none", inner: L(k.sideArc(x, y, 5.6, 9, P, 16) + k.sideArc(x, y, 5.6, 17, P, 16), { tone: "faint" }) }));
  out.push(S(k.cylinder(x, y, 7.2, 23, 3.4, P, 40, 0.4), { tone: "mid" }));
  return out.join("");
}

const SHAFT = G.frameAlong(SHAFT_LOW, G.unit3(G.sub3(SHAFT_TOP, SHAFT_LOW)));
const SHAFT_L = G.len3(G.sub3(SHAFT_TOP, SHAFT_LOW));

function collar() {
  const out = [];
  out.push(S(G.ringBand(-0.4, 7, 4.5, 6.8, SHAFT, P, { bevel: 0.4 }), { tone: "mid", inner: L(G.arcOf(SHAFT, 3.3, 6.8, P), { tone: "faint" }) }));
  const knob = G.add3(G.pointOf(SHAFT, 3.3, 6.8, Math.PI / 2), [0, 0, 0]);
  const KF = G.frameAlong(knob, [0, 1, 0]);
  out.push(S(G.disc(0, 2.6, 1.4, KF, P), { tone: "mid" }));
  out.push(S(G.disc(2.6, 5, 2.6, KF, P), { tone: "mid", inner: L(G.ribsOf(KF, 2.6, 5, 2.6, 18, P, { least: 0.25 }), { tone: "lo" }) }));
  return out.join("");
}

function femur() {
  const out = [];
  const shaft = [[0, 4.4], [10, 4.15, 1], [30, 4.25, 1], [44, 5, 1], [SHAFT_L, 6.6]];
  out.push(S(G.solidOf(shaft, SHAFT, P), { tone: "hi", crease: "none", inner: L(G.arcOf(SHAFT, 0.6, 4.4, P), { tone: "faint" }) }));
  out.push(S(G.sphereOf([15.4, 1.2, 66], 2.8, P), { tone: "hi" }));
  const NECK = G.frameAlong(NECK_FROM, G.unit3(G.sub3(HEAD, NECK_FROM)));
  const neckL = G.len3(G.sub3(HEAD, NECK_FROM));
  out.push(S(G.solidOf([[0, 5.2], [5, 4.1, 1], [11, 3.7, 1], [neckL, 4.8]], NECK, P), { tone: "hi", crease: "none" }));
  out.push(S(G.sphereOf(TROCH, TROCH_R, P), { tone: "hi" }));
  return out.join("");
}

function head() {
  const out = [];
  out.push(S(G.sphereOf(HEAD, HEAD_R, P), { tone: "hi" }));
  const PIN = AXIS_Y([HEAD[0], HEAD[1] + HEAD_R - 1.4, HEAD[2]]);
  out.push(S(G.disc(0, 2.6, 2.6, PIN, P, { bevel: 0.3 }), { tone: "lit", lit: true }));
  out.push(L(G.circleOf(PIN, 2.6, 1.2, P), { tone: "lo" }));
  return out.join("");
}

const fossa = (points) => {
  const hull = G.hullOf(points);
  const [cx, cz] = hull.reduce(([a, b], [x, z]) => [a + x / hull.length, b + z / hull.length], [0, 0]);
  return hull.map(([x, z]) => [cx + (x - cx) * 0.78, cz + 2 + (z - cz) * 0.74]);
};

function pelvis() {
  const out = [];
  const faceDetail = [];
  const sides = [(p) => mirror(p), (p) => p];
  out.push(S(prism(SACRUM, -6, 6), { tone: "hi", crease: "faint" }));
  out.push(S(prism(COCCYX, -3, 3), { tone: "hi", crease: "faint" }));
  for (const z of [131, 123, 115, 108]) {
    const half = 3.6 + (z - 108) * 0.12;
    faceDetail.push(D([at([MID - half, 6, z]), at([MID + half, 6, z])], { size: 0.9, tone: "lo" }));
  }
  for (const side of sides) {
    out.push(S(prism(side(WING), -WING_Y, WING_Y), { tone: "hi", crease: "faint", inner: L(faceLine(fossa(side(WING)), WING_Y, true), { tone: "faint" }) }));
    out.push(S(prism(side(RAMUS_LOW), -3.5, 3.5), { tone: "hi", crease: "faint" }));
    out.push(S(prism(side(ISCHIUM), -5, 5), { tone: "hi", crease: "faint" }));
    out.push(S(prism(side(RAMUS_UP), -4, 4), { tone: "hi", crease: "faint" }));
    out.push(S(prism(side(SOCKET), -5.5, 5.5), { tone: "hi", crease: "faint", inner: L(ellipse(side([[0, 90]])[0][0], HEAD[2], 8.4, 8.4, 5.5, 40), { tone: "lo" }) }));
  }
  out.push(S(prism(SYMPHYSIS, -4.2, 4.2), { tone: "lo", crease: "none" }));
  const swing = [2 * MID - HEAD[0], HEAD[1], HEAD[2]];
  const stubFrom = [2 * MID - NECK_FROM[0] + 6, 0, NECK_FROM[2] + 3];
  const STUB = G.frameAlong(swing, G.unit3(G.sub3(stubFrom, swing)));
  const stubL = G.len3(G.sub3(stubFrom, swing));
  out.push(S(G.solidOf([[0, 4.6], [stubL * 0.5, 3.8, 1], [stubL, 4.1]], STUB, P), { tone: "hi", crease: "none", inner: L(G.circleOf(STUB, stubL, 2.6, P), { tone: "faint" }) }));
  out.push(S(G.sphereOf(swing, HEAD_R, P), { tone: "hi" }));
  return out.join("") + faceDetail.join("");
}

function vertebra(i) {
  const d = i * (V_H + V_GAP);
  const z = SPINE_BASE + d;
  const r = 6.6 - i * 0.12;
  const out = [];
  out.push(S(k.slabOf({ x: MID - 15 + i * 0.3, y: -4.5, w: 30 - i * 0.6, d: 3.4, r: 1.5 }, z + 1.6, 3, P, 3, 0.3), { tone: "mid" }));
  out.push(S(k.slabOf({ x: MID - 1.6, y: -15, w: 3.2, d: 8, r: 1.2 }, z + 1, 4, P, 3), { tone: "mid" }));
  out.push(S(k.cylinder(MID, 0, r, z, V_H, P, 36, 0.4), { tone: "hi", inner: L(k.sideArc(MID, 0, r, z + V_H / 2, P, 20), { tone: "faint" }) }));
  if (i < VERTEBRAE - 1) out.push(S(k.cylinder(MID, 0, r - 0.9, z + V_H, V_GAP, P, 32), { tone: "lo", crease: "none" }));
  return { d: d + V_H / 2, svg: out.join("") };
}

function block() {
  const z = SPINE_BASE + BLOCK_FROM;
  const plan = { x: MID - 15, y: -12, w: 30, d: 24, r: 2.5 };
  const out = [`<path class="iso-halo" d="${k.haloOf(k.insetPlan(plan, 2), z - 1, 0.1, P)}" style="filter:blur(3px)"/>`];
  out.push(S(k.cylinder(MID, 0, 5, z - V_GAP, V_GAP, P, 28), { tone: "lo", crease: "none" }));
  out.push(S(k.slabOf(plan, z, 6, P, 4, 0.5), { tone: "mid" }));
  const upper = k.insetPlan(plan, 1);
  out.push(S(k.slabOf(upper, z + 6, BLOCK_H - 6, P, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(upper, z + 13, P, 4), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(upper, 3.5), z + BLOCK_H, P, 4), { tone: "faint" }));
  out.push(D(k.corners(upper, 3).map(([x, y]) => at([x, y, z + BLOCK_H])), { size: 0.45 }));
  out.push(S(k.cylinder(MID, 0, 4, z + BLOCK_H, 2.4, P, 28), { tone: "mid" }));
  out.push(S(k.cylinder(MID, 0, 1.6, z + BLOCK_H + 2.4, 3.2, P, 16), { tone: "mid" }));
  out.push(k.faceTextSvg(k.sideMatrix([MID - 9, upper.y + upper.d], z + 15.6, P, "left"), "W′ 5/6 BW", { size: 3, tone: "lo" }));
  const arm = { x: MID - 2, y: plan.y + plan.d, w: 4, d: PLUMB_Y + 1.6 - plan.y - plan.d, r: 1 };
  out.push(S(k.slabOf(arm, z + 1.2, 2.4, P, 2, 0.3), { tone: "mid" }));
  out.push(S(k.cylinder(MID, PLUMB_Y, 1.4, z + 0.4, 0.8, P, 16), { tone: "mid", crease: "none" }));
  return out.join("");
}

const BOB_Z = 12;

function plumb() {
  const out = [];
  const top = SPINE_BASE + BLOCK_FROM + 0.4;
  out.push(`<path class="iso-line" data-tone="mid" data-part="cord" d="${k.segment([MID, PLUMB_Y, top], [MID, PLUMB_Y, BOB_Z + 5.4], P)}" style="stroke-width:0.5"/>`);
  const BF = G.frameAlong([MID, PLUMB_Y, BOB_Z], [0, 0, 1]);
  out.push(S(G.solidOf([[0, 0.2], [1.6, 1.5, 1], [3.6, 2.4, 1], [4.8, 1.6], [5.4, 0.8]], BF, P), { tone: "hi", crease: "none" }));
  return out.join("");
}

function muscle() {
  const out = [];
  const MF = G.frameAlong(ORIGIN, MUSCLE);
  const TF = G.frameAlong(along(24), MUSCLE);
  out.push(S(G.solidOf([[0, 1.3], [MUSCLE_L - 24 - 0.6, 1.3], [MUSCLE_L - 24 + 0.8, 2.2]], TF, P), { tone: "hi", crease: "none" }));
  const pad = AXIS_Y([ORIGIN[0], WING_Y, ORIGIN[2] + 1.2]);
  out.push(S(G.disc(0, 1.2, 4.6, pad, P), { tone: "hi" }));
  const bellyR = (s) => 6 * Math.pow(Math.sin((Math.PI * (s + 1.2)) / 28.4), 0.7);
  const belly = Array.from({ length: 25 }, (_, i) => { const s = (i / 24) * 26; return [s, Math.max(1.3, bellyR(s)), i > 0 && i < 24 ? 1 : 0]; });
  const ribs = G.ribsOf(MF, 4, 22, 4.8, 26, P, { fade: [0.15, 0.6], twist: 0.18 });
  out.push(S(G.solidOf(belly, MF, P), { tone: "hi", crease: "none" }));
  out.push(k.fadedSvg(ribs.map(({ d, alpha }) => ({ d, alpha: alpha * 0.8 })), { tone: "faint", free: true }));
  for (const s of [CELL_S - CELL_R - 2.6, CELL_S + CELL_R - 0.2]) {
    const F = G.frameAlong(along(s), MUSCLE);
    out.push(S(G.disc(0, 2.8, 2.1, F, P), { tone: "mid" }));
  }
  const CF = AXIS_Y([CELL[0], CELL[1] - 2.2, CELL[2]]);
  out.push(S(G.disc(0, 4.4, CELL_R, CF, P, { bevel: 0.4 }), { tone: "mid", inner: L(G.arcOf(CF, 2.2, CELL_R, P), { tone: "faint" }) }));
  out.push(L(G.circleOf(CF, 4.4, CELL_R - 1.1, P), { tone: "lo" }));
  const ticks = [];
  for (let i = 0; i <= 16; i++) {
    const a = FROM + (i / 16) * SPAN;
    const r1 = CELL_R - 1.1;
    const r0 = r1 - (i % 4 === 0 ? 1.4 : 0.7);
    ticks.push(faceLine([[CELL[0] + Math.sin(a) * r0, CELL[2] + Math.cos(a) * r0], [CELL[0] + Math.sin(a) * r1, CELL[2] + Math.cos(a) * r1]], CELL_FACE));
  }
  out.push(L(ticks.join(""), { tone: "lo" }));
  out.push(D([at([CELL[0], CELL_FACE, CELL[2]])], { size: 0.6, tone: "mid" }));
  return out.join("");
}

const cellNeedle = (value) => {
  const a = FROM + (Math.min(FULL, Math.max(0, value)) / FULL) * SPAN;
  return faceLine([[CELL[0] - Math.sin(a) * 1.2, CELL[2] - Math.cos(a) * 1.2], [CELL[0] + Math.sin(a) * (CELL_R - 2), CELL[2] + Math.cos(a) * (CELL_R - 2)]], CELL_FACE + 0.1);
};

function cable() {
  const pin = [HEAD[0], HEAD[1] + HEAD_R + 1.2, HEAD[2]];
  const end = [GAUGE[0] + GAUGE_R * 0.42, GAUGE[1] + GAUGE_R * 0.91 + 2.6, 4.4];
  const route = [pin, [pin[0] - 1, 15, HEAD[2] - 16], [-3, 15, 1.2], [-12, 14, 1.2], [end[0] + 4, end[1] + 3, 1.2], end].map(at);
  return k.wireSvg(route[0], route[route.length - 1], { via: route.slice(1, -1), tone: "lo", size: 1 });
}

const rest = stance(0);
const vertebrae = Array.from({ length: VERTEBRAE }, (_, i) => vertebra(i));
const lean = (d, deg) => { const r = (deg * Math.PI) / 180; return [d * Math.sin(r), 0, d * (Math.cos(r) - 1)]; };

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "An anatomical model of a pelvis balanced on one femoral head, seen from the front, on an instrumented plate. A lumbar spine stands on the sacrum and carries a block for the 5/6 of body weight above the stance hip; a plumb line from the block marks its lever arm on a ruler. The gluteus medius runs from the iliac wing to the greater trochanter through a load cell, and a load pin through the femoral head is wired to a gauge for the hip joint force. Leaning the trunk toward the stance hip shortens the weight's lever and the forces fall.",
  body: [
    plate(),
    gauge(),
    `<path data-part="gauge-needle" class="iso-line" data-tone="lit" data-free="start" d="${gaugeNeedle(rest.joint)}" style="stroke-width:1.1"/>`,
    pedestal(),
    pelvis(),
    ...vertebrae.map(({ svg: body }, i) => `<g data-part="vertebra" data-d="${vertebrae[i].d}">${body}</g>`),
    `<g data-part="block" data-d="${COM}">${block()}</g>`,
    femur(),
    collar(),
    head(),
    muscle(),
    `<path data-part="cell-needle" class="iso-line" data-tone="hi" data-free="start" d="${cellNeedle(rest.abductor)}" style="stroke-width:0.8"/>`,
    cable(),
    `<g data-part="plumb" data-d="${COM}">${plumb()}</g>`,
  ],
});

const readoutOf = (s) => `lean ${s.lean.toFixed(1)}° · abd ${s.abductor.toFixed(2)} · hip ${s.joint.toFixed(2)} × BW`;

const live = `
const P = ${JSON.stringify(P)};
const HIP = ${JSON.stringify(HIP)};
const stance = ${stance.toString()};
const FROM = ${FROM}, SPAN = ${SPAN}, FULL = ${FULL};
const GAUGE = ${JSON.stringify(GAUGE)}, GAUGE_R = ${GAUGE_R}, GAUGE_H = ${GAUGE_H};
const CELL = ${JSON.stringify(CELL)}, CELL_R = ${CELL_R}, CELL_FACE = ${CELL_FACE};
const k = { lineOnTop, pathOf, iso };
const at = (point) => iso(point, P);
const faceLine = (points, y) => pathOf(points.map(([x, z]) => at([x, y, z])));
const gaugeNeedle = ${gaugeNeedle.toString()};
const cellNeedle = ${cellNeedle.toString()};
const lean = ${lean.toString()};
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const movers = [...svg.querySelectorAll('[data-part="vertebra"], [data-part="block"], [data-part="plumb"]')].map((el) => ({ el, d: Number(el.dataset.d) }));
const gauge = svg.querySelector('[data-part="gauge-needle"]');
const cell = svg.querySelector('[data-part="cell-needle"]');
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const MAX = HIP.leanMax;
let angle = 0, target = 0, shown = { joint: ${rest.joint}, abductor: ${rest.abductor} };
let frame = 0, last = 0, clock = 0, touring = !still.matches, visible = false, idleTimer = 0;
const tourAt = (t) => MAX * (0.5 - 0.5 * Math.cos((t / 9) * Math.PI * 2));
function draw() {
  const s = stance(angle);
  for (const { el, d } of movers) el.setAttribute("transform", translateAlong(P, lean(d, angle)));
  gauge.setAttribute("d", gaugeNeedle(s.joint));
  cell.setAttribute("d", cellNeedle(s.abductor));
  const text = "lean " + s.lean.toFixed(1) + "° · abd " + s.abductor.toFixed(2) + " · hip " + s.joint.toFixed(2) + " × BW";
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", angle.toFixed(1));
  stage.setAttribute("aria-valuetext", text);
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  if (touring) { clock += dt; target = tourAt(clock); }
  angle = still.matches ? target : angle + (target - angle) * (1 - Math.exp(-dt / 0.35));
  if (Math.abs(target - angle) < 0.002) angle = target;
  draw();
  const settled = !touring && angle === target;
  frame = visible && !settled ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const steer = (next) => { touring = false; target = clamp(next, 0, MAX); clearTimeout(idleTimer); idleTimer = setTimeout(() => { touring = !still.matches; clock = Math.acos(clamp(1 - (2 * target) / MAX, -1, 1)) / (Math.PI * 2) * 9; run(); }, 4000); run(); };
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
stage.addEventListener("pointermove", (event) => {
  const box = svg.getBoundingClientRect();
  steer(clamp(((event.clientX - box.left) / box.width - 0.2) / 0.6, 0, 1) * MAX);
});
stage.addEventListener("pointerleave", () => steer(target));
stage.addEventListener("keydown", (event) => {
  let to = null;
  if (event.key === "ArrowRight" || event.key === "ArrowUp") to = Math.round(target) + 1;
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") to = Math.round(target) - 1;
  if (event.key === "Home") to = 0;
  if (event.key === "End") to = MAX;
  if (to === null) return;
  event.preventDefault();
  steer(to);
});
draw();
`;

const body = k.plateHtml({
  fig: "Fig 1",
  title: "Hip in single-leg stance",
  hint: "Hover to lean the trunk",
  readout: readoutOf(rest),
  keys: [
    { mark: "lit", label: "Load pin through the femoral head and its gauge: the hip joint force, 0–4 × BW" },
    { mark: "raised", label: "Gluteus medius with an in-line load cell, 5 cm from the hip centre" },
    { mark: "edge", label: "Plumb line from the 5/6 BW above the hip, 10.5 cm out at rest" },
  ],
  caption:
    "Standing on one leg, the pelvis is a lever balanced on the femoral head. Five sixths of body weight acts 10.5 cm medial to the hip and the abductors pull 5 cm lateral to it at 20° from vertical, so they must pull 1.75 × body weight and the joint carries their sum, about 2.5 × BW. Leaning the trunk 10° over the stance hip moves the weight 4.5 cm inward: the abductors drop to 1.0 × BW and the hip to 1.8 × BW, the lurch a patient with weak abductors or a painful hip makes. A cane in the opposite hand does the same from outside.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Trunk lean over the stance hip: arrow keys change it by one degree" aria-valuemin="0" aria-valuemax="${HIP.leanMax}" aria-valuenow="0">${svg}</div>`,
});

const name = theme === "light" ? "hip-abductors-light.html" : "hip-abductors.html";
writeFileSync(join(HERE, name), k.pageHtml({ title: "Hip in single-leg stance", theme, body, script: kitScript() + live }));
console.log("wrote", name);
