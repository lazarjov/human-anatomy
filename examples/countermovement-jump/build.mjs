import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import * as G from "../../kit/lathe.mjs";
import { kitScript } from "../../scripts/inline-kit.mjs";
import * as M from "./model.mjs";
import { BODY, makeBody } from "./body.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 600;
const HEIGHT = 560;

const BASE = { x: -112, y: -62, w: 292, d: 132, r: 8 };
const BASE_TOP = -10;
const BASE_H = 12;
const FOOT_H = 5;
const PLATE = { x: -40, y: -40, w: 104, d: 80, r: 3 };
const PLATE_H = 6;
const CELL_H = 4;
const POST = [-66, 0];
const POST_R = 4.4;
const POST_TOP = 344;
const RULER = { x: -92, y: 4, w: 7, d: 4, r: 0.8 };
const CAR = { x: -76, y: -9, w: 20, d: 18, r: 2.5 };
const CAR_Z = [16, 58];
const TRUNK = { x: -12, y: -17, w: 38, d: 34, r: 4 };
const TRUNK_Z = [30, 74];
const ARM_Z = [40, 47];
const AMP = { x: 86, y: 18, w: 74, d: 38, r: 3 };
const AMP_H = 54;
const SCREEN = { x0: 92, x1: 154, z0: BASE_TOP + 10, z1: BASE_TOP + 42 };
const TRACE_T = [0.45, 3.25];
const TRACE_MAX = 4;
const RATE = 0.42;

const peakRise = (M.TAKEOFF_AT + M.HEIGHT) / M.UNIT;
const P = k.fitProjection(
  [...k.boxCorners(BASE, BASE_TOP - BASE_H - FOOT_H, BASE_TOP), [POST[0], POST[1], POST_TOP + 3], [TRUNK.x + TRUNK.w, TRUNK.y, 190 + peakRise + TRUNK_Z[1]]],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 60 },
);
const body = makeBody(k, G, P, M);
const HIP0 = body.hip0;

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const f1 = (v) => Math.round(v * 10) / 10;

function base() {
  const out = [`<path class="iso-halo" d="${k.haloOf(BASE, BASE_TOP - BASE_H - FOOT_H, BASE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(BASE, 20))) {
    out.push(S(k.cylinder(x, y, 7, BASE_TOP - BASE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, BASE_TOP - BASE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(BASE, BASE_TOP - BASE_H, BASE_H, P, 8, 1.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(BASE, 5), BASE_TOP, P), { tone: "lo" }));
  const screws = k.corners(BASE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, BASE_TOP, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, BASE_TOP])), { size: 0.5 }));
  const well = k.insetPlan(PLATE, -3);
  out.push(L(k.planOutline(well, BASE_TOP, P, 4), { tone: "faint" }));
  const label = { x: -104, y: 42, w: 40, d: 14, r: 1.2 };
  out.push(S(k.slabOf(label, BASE_TOP, 0.8, P, 4), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(label, 1.6), BASE_TOP + 0.8, P, 3), { tone: "faint" }));
  out.push(L(k.lineOnTop([label.x + 4, label.y + 4.4], [label.x + 30, label.y + 4.4], BASE_TOP + 0.8, P), { tone: "lo", free: true }));
  out.push(L(k.lineOnTop([label.x + 4, label.y + 7.2], [label.x + 22, label.y + 7.2], BASE_TOP + 0.8, P), { tone: "lo", free: true }));
  out.push(L(k.lineOnTop([label.x + 4, label.y + 10], [label.x + 26, label.y + 10], BASE_TOP + 0.8, P), { tone: "lo", free: true }));
  out.push(D([at([label.x + 2.2, label.y + 7, BASE_TOP + 0.8]), at([label.x + label.w - 2.2, label.y + 7, BASE_TOP + 0.8])], { size: 0.45 }));
  const strip = { x: PLATE.x, y: PLATE.y + PLATE.d + 6, w: PLATE.w, d: 7, r: 1 };
  out.push(S(k.slabOf(strip, BASE_TOP, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.8, BASE_TOP + 0.6, [2, 3.6], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(D([at([strip.x + 2, strip.y + 3.5, BASE_TOP + 0.6]), at([strip.x + strip.w - 2, strip.y + 3.5, BASE_TOP + 0.6])], { size: 0.45 }));
  return out.join("");
}

function column() {
  const out = [];
  const flange = { x: POST[0] - 11, y: POST[1] - 11, w: 22, d: 22, r: 3 };
  out.push(S(k.slabOf(flange, BASE_TOP, 4, P, 4, 0.6), { tone: "mid" }));
  out.push(D(k.corners(flange, 3.4).map(([x, y]) => at([x, y, BASE_TOP + 4])), { size: 0.5 }));
  out.push(S(k.slabOf(RULER, BASE_TOP + 4, POST_TOP - 6 - BASE_TOP - 4, P, 3, 0.3), { tone: "lo" }));
  const face = RULER.y + RULER.d;
  const edge = RULER.x + RULER.w;
  const minor = [];
  const major = [];
  for (let z = 0, i = 0; BASE_TOP + 4 + 4 + z * 1 <= POST_TOP - 10; z += 4, i++) {
    const zz = BASE_TOP + 8 + z;
    (i % 5 === 0 ? major : minor).push(k.segment([RULER.x, face, zz], [RULER.x + (i % 5 === 0 ? 4.2 : 2.2), face, zz], P));
  }
  out.push(L(minor.join(""), { tone: "faint" }), L(major.join(""), { tone: "mid" }));
  const zero = HIP0;
  out.push(L(k.segment([RULER.x, face, zero], [edge - 0.8, face, zero], P), { tone: "hi", free: "end" }));
  for (const z of [BASE_TOP + 4, POST_TOP - 6]) {
    const clip = { x: RULER.x - 1, y: RULER.y - 4, w: RULER.w + 2, d: 4, r: 0.6 };
    out.push(S(k.slabOf(clip, z === BASE_TOP + 4 ? z : z - 5, 5, P, 2, 0.3), { tone: "mid" }));
  }
  out.push(S(k.cylinder(POST[0], POST[1], 6.4, BASE_TOP + 4, 5, P, 28, 0.5), { tone: "mid" }));
  out.push(S(k.cylinder(POST[0], POST[1], POST_R, BASE_TOP + 9, POST_TOP - BASE_TOP - 9, P, 28), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(POST[0], POST[1], 6, POST_TOP, 4, P, 28, 0.5), { tone: "mid" }));
  out.push(L(k.ring(POST[0], POST[1], 2, POST_TOP + 4, P, 16), { tone: "lo" }));
  const brace = { x: RULER.x + 1, y: RULER.y - 4, w: POST[0] - RULER.x - 2, d: 3, r: 0.8 };
  out.push(S(k.slabOf(brace, POST_TOP - 4, 3, P, 2, 0.3), { tone: "mid" }));
  return out.join("");
}

function forcePlate() {
  const out = [];
  const cells = k.corners(PLATE, 9);
  for (const [x, y] of byDepth(cells)) {
    out.push(S(k.cylinder(x, y, 6.2, BASE_TOP, 1.2, P, 24), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 4.6, BASE_TOP + 1.2, CELL_H - 1.2, P, 24), { tone: "mid" }));
    out.push(L(k.sideArc(x, y, 4.6, BASE_TOP + 2.6, P, 16), { tone: "faint" }));
  }
  const z0 = BASE_TOP + CELL_H;
  out.push(`<path class="iso-halo" d="${k.haloOf(k.insetPlan(PLATE, 4), z0, 0.1, P)}" style="filter:blur(3px)"/>`);
  out.push(S(k.slabOf(PLATE, z0, -z0, P, 4, 0.8), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 4), 0, P, 3), { tone: "lo" }));
  const grid = [];
  for (let x = PLATE.x + 12; x < PLATE.x + PLATE.w - 6; x += 12) grid.push(k.lineOnTop([x, PLATE.y + 4], [x, PLATE.y + PLATE.d - 4], 0, P));
  out.push(L(grid.join(""), { tone: "faint" }));
  out.push(L(k.lineOnTop([PLATE.x + 4, 0], [PLATE.x + PLATE.w - 4, 0], 0, P), { tone: "faint" }));
  const screws = k.corners(PLATE, 9);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  const jack = { x: PLATE.x + PLATE.w, y: 22, w: 4, d: 8, r: 1 };
  out.push(S(k.slabOf(jack, z0 + 0.6, 4.6, P, 2, 0.3), { tone: "mid" }));
  out.push(S(G.disc(0, 3, 2.2, G.frameOf([jack.x + jack.w, 26, z0 + 2.9], [1, 0, 0], [0, 1, 0], [0, 0, 1]), P, { steps: 20 }), { tone: "mid" }));
  return out.join("");
}

function amplifier() {
  const out = [`<path class="iso-halo" d="${k.haloOf(AMP, BASE_TOP, AMP_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(AMP, 6))) out.push(S(k.cylinder(x, y, 3, BASE_TOP, 2, P, 20), { tone: "lo" }));
  const z0 = BASE_TOP + 2;
  out.push(S(k.slabOf(AMP, z0, AMP_H - 2, P, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(AMP, z0 + 6, P, 4), { tone: "lo" }) }));
  const top = z0 + AMP_H - 2;
  out.push(L(k.planOutline(k.insetPlan(AMP, 3), top, P, 3), { tone: "faint" }));
  const vents = [];
  for (let x = AMP.x + 8; x <= AMP.x + 28; x += 3.2) vents.push(k.planOutline({ x, y: AMP.y + 8, w: 1.4, d: 12, r: 0.7 }, top, P, 3));
  out.push(L(vents.join(""), { tone: "lo" }));
  for (const [x, r] of [[AMP.x + 40, 4.4], [AMP.x + 52, 3.4]]) {
    const y = AMP.y + 14;
    out.push(S(k.cylinder(x, y, r, top, 3.4, P, 28), { tone: "mid" }));
    out.push(L(k.knurl(x, y, r, top, top + 3.4, 28, P), { tone: "lo" }));
    out.push(L(k.lineOnTop([x, y], [x + r * 0.6, y + r * 0.6], top + 3.4, P), { tone: "hi" }));
  }
  const fy = AMP.y + AMP.d;
  const bezel = [[SCREEN.x0 - 2, SCREEN.z0 - 2], [SCREEN.x1 + 2, SCREEN.z0 - 2], [SCREEN.x1 + 2, SCREEN.z1 + 2], [SCREEN.x0 - 2, SCREEN.z1 + 2]];
  const W = G.frameOf([0, fy, 0], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  out.push(S(G.prismOf(W, bezel, 0, 0.8, P), { tone: "lo", crease: "none" }));
  const glass = [[SCREEN.x0, SCREEN.z0], [SCREEN.x1, SCREEN.z0], [SCREEN.x1, SCREEN.z1], [SCREEN.x0, SCREEN.z1]];
  out.push(`<path class="cmj-glass" d="${glass.map((p, i) => (i ? "L" : "M") + at([p[0], fy + 0.8, p[1]]).map(f1).join(" ")).join("")}Z"/>`);
  const grid = [];
  for (let b = 1; b < TRACE_MAX; b++) {
    const z = SCREEN.z0 + 1.5 + (b / TRACE_MAX) * (SCREEN.z1 - SCREEN.z0 - 3);
    grid.push(k.segment([SCREEN.x0, fy + 0.8, z], [SCREEN.x1, fy + 0.8, z], P));
  }
  out.push(L(grid.join(""), { tone: "faint" }));
  out.push(`<path data-part="ghost" class="iso-line" data-tone="lo" d="${traceD(TRACE_T[1])}"/>`);
  out.push(`<path data-part="trace" class="iso-line" data-tone="lit" style="stroke-width:0.9" d=""/>`);
  out.push(`<circle data-part="cursor" class="cmj-cursor" r="1.3" cx="0" cy="0"/>`);
  const leds = [[AMP.x + 8, 0], [AMP.x + 13, 1]];
  out.push(D(leds.map(([x]) => at([x, fy + 0.8, SCREEN.z1 + 6])), { size: 0.7, tone: "mid" }));
  out.push(`<circle data-part="led" class="cmj-led" r="1.1" cx="${f1(at([AMP.x + 18, fy + 0.8, SCREEN.z1 + 6])[0])}" cy="${f1(at([AMP.x + 18, fy + 0.8, SCREEN.z1 + 6])[1])}"/>`);
  return out.join("");
}

function tracePoint(t, bw) {
  const u = (t - TRACE_T[0]) / (TRACE_T[1] - TRACE_T[0]);
  const x = SCREEN.x0 + 1.5 + u * (SCREEN.x1 - SCREEN.x0 - 3);
  const z = SCREEN.z0 + 1.5 + (Math.min(bw, TRACE_MAX) / TRACE_MAX) * (SCREEN.z1 - SCREEN.z0 - 3);
  return at([x, AMP.y + AMP.d + 0.8, z]);
}
function traceD(until) {
  const out = [];
  for (let t = TRACE_T[0]; t <= until + 1e-9; t += 0.01) out.push(tracePoint(t, M.stateAt(t).bw));
  return out.map((p, i) => (i ? "L" : "M") + p.map(f1).join(" ")).join("");
}

function cable() {
  const from = at([PLATE.x + PLATE.w + 7, 26, BASE_TOP + CELL_H + 2.9]);
  const mid = at([PLATE.x + PLATE.w + 7, 26, BASE_TOP + 0.6]);
  const to = at([AMP.x, AMP.y + 6, BASE_TOP + 0.6]);
  return k.wireSvg(from, to, { via: [mid], tone: "lo", size: 1.1 });
}

function carriage() {
  const out = [];
  out.push(S(k.slabOf(CAR, HIP0 + CAR_Z[0], CAR_Z[1] - CAR_Z[0], P, 4, 0.6), { tone: "mid", inner: L(k.sideSeam(CAR, HIP0 + CAR_Z[0] + 8, P, 4) + k.sideSeam(CAR, HIP0 + CAR_Z[1] - 8, P, 4), { tone: "lo" }) }));
  out.push(L(k.ring(POST[0], POST[1], POST_R + 1.6, HIP0 + CAR_Z[1], P, 24), { tone: "lo" }));
  out.push(D(k.corners(CAR, 3).map(([x, y]) => at([x, y, HIP0 + CAR_Z[1]])), { size: 0.45 }));
  const arm = { x: CAR.x + CAR.w, y: -4, w: TRUNK.x + 14 - CAR.x - CAR.w, d: 8, r: 1.5 };
  out.push(S(k.slabOf(arm, HIP0 + ARM_Z[0], ARM_Z[1] - ARM_Z[0], P, 3, 0.5), { tone: "mid" }));
  out.push(D([at([arm.x + 4, 0, HIP0 + ARM_Z[1]]), at([arm.x + 8, 0, HIP0 + ARM_Z[1]])], { size: 0.45 }));
  const face = RULER.y + RULER.d;
  const tipZ = HIP0;
  const pointer = [[RULER.x + RULER.w - 0.6, tipZ], [CAR.x + 0.2, tipZ - 3], [CAR.x + 0.2, tipZ + 3]];
  const PF = G.frameOf([0, face, 0], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  out.push(S(k.slabOf({ x: RULER.x + RULER.w + 1.2, y: face, w: CAR.x - RULER.x - RULER.w - 1, d: 2, r: 0.5 }, tipZ - 2, 4, P, 2, 0.2), { tone: "mid" }));
  out.push(S(G.prismOf(PF, pointer, 2, 3.2, P), { tone: "hi", crease: "none" }));
  return out.join("");
}

function trunk() {
  const out = [];
  const pelvis = [[-17, -7], [10, -9], [18, 6], [14, 26], [-6, 30], [-19, 18]].map(([x, z]) => [x + BODY.hipX, z]);
  const PF = G.frameOf([0, 0, HIP0], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  out.push(S(G.prismOf(PF, pelvis, -12, 12, P), { tone: "hi", crease: "lo" }));
  const axle = G.frameOf([BODY.hipX, 0, HIP0], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  out.push(S(G.disc(12, 13.2, 5.6, axle, P, { steps: 24 }), { tone: "mid" }));
  out.push(D([at([BODY.hipX, 13.2, HIP0])], { size: 0.5, tone: "lo" }));
  const z0 = HIP0 + TRUNK_Z[0];
  const slab = (plan, z, h, tone, bevel) => S(k.slabOf(plan, z, h, P, 4, bevel), { tone });
  out.push(slab(k.insetPlan(TRUNK, 4), z0, 4, "mid", 0.4));
  const plates = [[z0 + 4, 12], [z0 + 16, 12], [z0 + 28, 12]];
  for (const [z, h] of plates) out.push(slab(TRUNK, z, h - 0.6, "mid", 0.8));
  out.push(S(k.cylinder(TRUNK.x + TRUNK.w / 2, 0, 4, z0 + 40, 4, P, 24, 0.4), { tone: "mid" }));
  out.push(L(k.ring(TRUNK.x + TRUNK.w / 2, 0, 1.6, z0 + 44, P, 16), { tone: "lo" }));
  out.push(D(k.corners(TRUNK, 4).map(([x, y]) => at([x, y, z0 + 39.4])), { size: 0.5 }));
  const m = k.sideMatrix([TRUNK.x + TRUNK.w / 2, TRUNK.y + TRUNK.d, z0 + 20], z0 + 23, P, "right");
  out.push(k.faceTextSvg(m, `${M.MASS} kg`, { size: 3.2, tone: "lo", anchor: "middle" }));
  return out.join("");
}

const pose0 = body.poseAt(0, true);
const legsAt = (pose) => ({ far: body.legSvg(pose, -1), near: body.legSvg(pose, 1) });
const legs0 = legsAt(pose0);
const POST_UP = (rise) => S(k.cylinder(POST[0], POST[1], POST_R, HIP0 + CAR_Z[1] + rise, POST_TOP - HIP0 - CAR_Z[1] - rise, P, 28), { tone: "mid", crease: "none" });

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "A countermovement jump rig: a lower-limb skeleton model, pelvis, femurs, tibias, fibulas and feet joined by steel pins, carries a 75 kilogram trunk mass on a carriage that rides a vertical guide column with a centimetre ruler. Its feet stand on a force plate on four load cells, wired to an amplifier whose screen traces the vertical force. The model dips, drives up, leaves the plate, flies about 34 centimetres and lands again.",
  body: [
    base(),
    column(),
    forcePlate(),
    `<g data-part="carriage">${carriage()}</g>`,
    `<g data-part="post">${POST_UP(0)}</g>`,
    `<g data-part="far">${legs0.far}</g>`,
    `<g data-part="trunk">${trunk()}</g>`,
    `<g data-part="near">${legs0.near}</g>`,
    cable(),
    amplifier(),
  ],
});

const DATA = { P, HIP0, POST, POST_R, POST_TOP, CAR_Z, TRACE_T, TRACE_MAX, SCREEN, AMP, RATE, BASE_TOP };
const strip = (file) => readFileSync(join(HERE, file), "utf8").replace(/^import .*$/gm, "").replace(/^export /gm, "");
const latheSource = readFileSync(join(HERE, "..", "..", "kit", "lathe.mjs"), "utf8").replace(/^import .*$/m, "").replace(/^export /gm, "");
const latheScript = `const G = (() => {${latheSource}\nreturn { viewOf, scaleOf, frameAlong, frameOf, pointOf, disc, sphereOf, prismOf, solidOf, dot3, add3, sub3, mul3, unit3, cross3, len3 };})();\n`;
const modelScript = `const M = (() => {${strip("model.mjs")}\nreturn { MASS, WEIGHT, UNIT, CYCLE, TAKEOFF, TAKEOFF_AT, TAKEOFF_V, FLIGHT, HEIGHT, LAND, stateAt };})();\n`;
const bodyScript = strip("body.mjs");
const live = readFileSync(join(HERE, "live.js"), "utf8").replace("__DATA__", JSON.stringify(DATA));
const css = `<style>.cmj-glass{fill:var(--anatomy-paper);stroke:var(--anatomy-lo);stroke-width:var(--anatomy-weight)}.cmj-cursor{fill:var(--anatomy-lit)}.cmj-led{fill:var(--anatomy-lo);transition:fill .12s}.cmj-led[data-on]{fill:var(--anatomy-lit)}.cmj-muscle{stroke-width:2.1;stroke-linecap:round}.iso-stage:focus{outline:none}.iso-stage:focus-visible{outline:1px solid var(--anatomy-muted);outline-offset:6px}</style>`;

const summary = M.summary();
const page = k.plateHtml({
  fig: "Fig 1",
  title: "Countermovement jump",
  hint: "Hover to scrub · click or space to jump",
  readout: "quiet stance · 1.00 BW · 0.00 m/s",
  keys: [
    { mark: "lit", label: "Force trace: the plate's vertical force in body weights" },
    { mark: "raised", label: "Skeleton model: femur, tibia, fibula, foot and patella" },
    { mark: "edge", label: "Patellar and Achilles tendons, quadriceps line" },
  ],
  caption: `A ${M.MASS} kg jumper on a force plate, played at ${RATE}× speed. Unweighting drops the force to ${summary.minBw.toFixed(2)} BW and the centre of mass ${Math.round(-summary.deepest * 100)} cm down; braking and propulsion push it to a ${summary.peak.toFixed(2)} BW peak. The net impulse gives a takeoff velocity of ${M.TAKEOFF_V.toFixed(2)} m/s, so the centre of mass rises v²/2g = ${(M.HEIGHT * 100).toFixed(1)} cm for ${Math.round(M.FLIGHT * 1000)} ms of flight, and the landing peaks near ${summary.landPeak.toFixed(1)} BW.`,
  body: `${css}<div class="iso-stage" tabindex="0" role="slider" aria-label="Countermovement jump: move the pointer across to scrub through the jump; Space or Enter jumps; arrow keys step through the phases" aria-valuemin="0" aria-valuemax="${M.CYCLE}" aria-valuenow="0" aria-valuetext="quiet stance" style="touch-action:pan-y">${svg}</div>`,
});

const name = theme === "light" ? "countermovement-jump-light.html" : "countermovement-jump.html";
writeFileSync(join(HERE, name), k.pageHtml({ title: "Countermovement jump", theme, body: page, script: kitScript() + latheScript + modelScript + bodyScript + live }));
console.log("wrote", name, "· scale", P.scale.toFixed(3), "· peak", summary.peak.toFixed(2), "BW · h", (M.HEIGHT * 100).toFixed(1), "cm");
