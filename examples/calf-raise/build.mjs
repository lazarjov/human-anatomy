import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import * as G from "../../kit/lathe.mjs";
import { kitScript } from "../../scripts/inline-kit.mjs";
import * as M from "./model.mjs";
import { makeParts } from "./parts.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 600;
const HEIGHT = 450;
const PLATE = { x: -222, y: -84, w: 428, d: 168, r: 10 };
const PLATE_H = 12;
const FOOT_H = 5;
const SOLE = M.SOLE;
const PAD = { x: 100, y: -42, w: 90, d: 82, r: 4 };
const REST = { x: -92, y: -30, w: 54, d: 56, r: 4 };
const RULER = { x: -126, y: -62, w: 10, d: 8, r: 0.6 };
const RULER_TOP = 148;
const UNIT = { x: -206, y: 16, w: 66, d: 56, r: 5 };
const UNIT_H = 22;
const DIAL = [-173, 44];
const DIAL_R = 21;
const DIAL_Z = UNIT_H;
const DIAL_H = 6;
const DIAL_TOP = DIAL_Z + DIAL_H;
const SWEEP = [-0.75 * Math.PI, 1.5 * Math.PI];
const TIBIA = [-20, 2];
const TIBIA_Z = 88;
const TIBIA_LEN = 290;
const PLATEAU = TIBIA_Z + TIBIA_LEN;
const BELLY = [-70, -4];
const BELLY_Z = M.ANKLE[2] + M.JUNCTION[2];
const BELLY_LEN = 146;
const CONNECTOR = [UNIT.x + UNIT.w, 34, 12];

const top = M.poseOf(M.RANGE[1]);
const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [TIBIA[0], TIBIA[1] + 54, PLATEAU + 46], [TIBIA[0] + top.shift[0] + 54, TIBIA[1], PLATEAU + 46 + top.shift[2]], [TIBIA[0] - 54, TIBIA[1], PLATEAU + 46], [BELLY[0] - 30, BELLY[1], BELLY_Z + 40]],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 70 },
);

const parts = makeParts(k, G, P, M);
const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const zAxis = (x, y, z = 0) => G.frameOf([x, y, z], [0, 0, 1], [1, 0, 0], [0, 1, 0]);

function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 24))) {
    out.push(S(k.cylinder(x, y, 8, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 6.2, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid", inner: L(k.sideSeam(PLATE, -5, P, 8), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 11);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.4, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  const strip = { x: -120, y: PLATE.y + PLATE.d - 17, w: 316, d: 8, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 5, 5, strip.y + 0.8, 0.6, [2, 4], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(L(k.lineOnTop([M.ANKLE[0], strip.y + 0.8], [M.ANKLE[0], strip.y + 6.4], 0.6, P), { tone: "hi" }));
  out.push(L(k.lineOnTop([M.BALL[0], strip.y + 0.8], [M.BALL[0], strip.y + 6.4], 0.6, P), { tone: "hi" }));
  out.push(D([at([strip.x + 2, strip.y + 4, 0.6]), at([strip.x + strip.w - 2, strip.y + 4, 0.6])], { size: 0.45 }));
  const label = { x: 150, y: -70, w: 44, d: 20, r: 1.5 };
  out.push(S(k.slabOf(label, 0, 0.8, P, 3, 0.3), { tone: "lo", crease: "none" }));
  out.push(D(k.corners(label, 2.6).map(([x, y]) => at([x, y, 0.8])), { size: 0.4 }));
  [6, 10, 14].forEach((y, index) => out.push(L(k.lineOnTop([label.x + 6, label.y + y], [label.x + (index ? 30 : 38), label.y + y], 0.8, P), { tone: index ? "faint" : "lo", free: true })));
  return out.join("");
}

function ruler() {
  const out = [];
  const base = { x: RULER.x - 7, y: RULER.y - 6, w: 24, d: 20, r: 2.5 };
  out.push(S(k.slabOf(base, 0, 6, P, 4, 0.6), { tone: "mid" }));
  out.push(D([at([base.x + 3.4, base.y + base.d - 3.4, 6]), at([base.x + base.w - 3.4, base.y + base.d - 3.4, 6])], { size: 0.45 }));
  out.push(S(k.slabOf(RULER, 6, RULER_TOP - 6, P, 2), { tone: "mid", crease: "none" }));
  out.push(S(k.slabOf(k.insetPlan(RULER, -1), RULER_TOP, 3, P, 2, 0.3), { tone: "mid" }));
  const face = RULER.y + RULER.d;
  const minor = [];
  const major = [];
  for (let mm = 0; mm <= 125; mm += 5) {
    const z = SOLE + mm;
    const big = mm % 25 === 0;
    (big ? major : minor).push(k.segment([RULER.x, face, z], [RULER.x + (big ? 6 : 3.6), face, z], P));
  }
  out.push(L(minor.join(""), { tone: "lo" }), L(major.join(""), { tone: "mid" }));
  out.push(L(k.segment([RULER.x, face, SOLE], [RULER.x + 8, face, SOLE], P), { tone: "hi" }));
  return out.join("");
}

function cursor() {
  const out = [];
  const collar = k.insetPlan(RULER, -2.2);
  out.push(S(k.slabOf(collar, SOLE - 4, 8, P, 2, 0.4), { tone: "mid" }));
  const arm = { x: RULER.x + RULER.w + 2, y: RULER.y + 1, w: 30, d: 5, r: 0.8 };
  out.push(S(k.slabOf(arm, SOLE - 1, 2, P, 2), { tone: "mid", crease: "none" }));
  out.push(L(k.lineOnTop([arm.x + arm.w - 3, arm.y], [arm.x + arm.w - 3, arm.y + arm.d], SOLE + 1, P), { tone: "lit" }));
  const screw = [collar.x + collar.w / 2, collar.y + collar.d];
  out.push(S(G.disc(0, 3, 2.4, G.frameOf([screw[0], screw[1], SOLE], [0, 1, 0], [1, 0, 0], [0, 0, 1]), P, { steps: 24 }), { tone: "mid" }));
  return out.join("");
}

function pads() {
  const out = [];
  out.push(`<path class="iso-halo" d="${k.haloOf(PAD, 0, 0.1, P)}" style="filter:blur(3px)"/>`);
  out.push(S(k.slabOf(PAD, 0, 7, P, 4, 0.5), { tone: "mid" }));
  out.push(D(k.corners(PAD, 4).map(([x, y]) => at([x, y, 7])), { size: 0.45 }));
  const mat = k.insetPlan(PAD, 6);
  out.push(S(k.slabOf(mat, 7, SOLE - 7, P, 4, 0.4), { tone: "lo" }));
  const grooves = [];
  for (let x = mat.x + 6; x < mat.x + mat.w - 3; x += 6) grooves.push(k.lineOnTop([x, mat.y], [x, mat.y + mat.d], SOLE, P));
  out.push(L(grooves.join(""), { tone: "faint" }));
  out.push(S(k.slabOf(REST, 0, SOLE - 2, P, 4, 0.5), { tone: "mid" }));
  out.push(S(k.slabOf(k.insetPlan(REST, 5), SOLE - 2, 2, P, 4, 0.3), { tone: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(REST, 9), SOLE, P, 4), { tone: "faint" }));
  out.push(D(k.corners(REST, 2.6).map(([x, y]) => at([x, y, SOLE - 2])), { size: 0.4 }));
  return out.join("");
}

function legBack() {
  const out = [];
  const fibula = G.frameAlong([-26, -20, 72], [-4, -2, 286]);
  out.push(S(G.lathe([[0, 0], [0, 4, 1], [4, 8.5, 1], [16, 7, 1], [34, 5, 1], [150, 4.6, 1], [252, 5, 1], [272, 8.6, 1], [282, 9.4, 1], [287, 0, 1]], fibula, P, { steps: 32 }), { tone: "mid", crease: "none" }));
  const belly = zAxis(BELLY[0], BELLY[1], BELLY_Z);
  const profile = [[0, 4.6, 1], [12, 8.4, 1], [40, 24, 1], [78, 31, 1], [112, 26, 1], [136, 15, 1], [BELLY_LEN, 11, 1]];
  const ribs = G.ribsOf(belly, 40, 112, 24, 26, P, { fade: [0.15, 0.6], r1: 26, seams: true });
  out.push(S(G.lathe([[0, 0], ...profile, [BELLY_LEN, 0]], belly, P, { steps: 56 }), { tone: "hi", crease: "none" }));
  out.push(k.fadedSvg(ribs.map(({ d, alpha }) => ({ d, alpha: alpha * 0.55 })), { tone: "faint" }));
  out.push(S(G.disc(BELLY_LEN, BELLY_LEN + 4, 12.6, belly, P, { steps: 40 }), { tone: "mid" }));
  const pin = G.frameAlong([BELLY[0], BELLY[1], BELLY_Z + BELLY_LEN + 2], [1, 0.12, 0]);
  out.push(S(G.disc(0, 44, 3.2, pin, P, { steps: 24 }), { tone: "mid" }));
  return out.join("");
}

function legFront() {
  const out = [];
  const T = zAxis(TIBIA[0], TIBIA[1], TIBIA_Z);
  const profile = [[0, 17, 1], [4, 20.5, 1], [14, 18.5, 1], [40, 14, 1], [80, 12.4, 1], [200, 12.6, 1], [236, 15, 1], [262, 23, 1], [278, 29, 1], [TIBIA_LEN, 30.5]];
  const seams = L(G.arcOf(T, TIBIA_LEN - 6, 30, P), { tone: "faint" });
  out.push(S(G.lathe([[0, 0], ...profile, [TIBIA_LEN, 0]], T, P, { steps: 64 }), { tone: "hi", crease: "lo", inner: seams }));
  out.push(k.fadedSvg(G.ribsOf(T, 40, 230, 12.5, 6, P, { fade: [0.4, 0.9], phase: 0.3 }).map(({ d, alpha }) => ({ d, alpha: alpha * 0.4 })), { tone: "faint" }));
  const clamp = zAxis(TIBIA[0], TIBIA[1], PLATEAU - 22);
  out.push(S(G.ringBand(0, 9, 12, 17.5, clamp, P, { steps: 56 }), { tone: "mid", inner: L(G.arcOf(clamp, 4.5, 17.5, P), { tone: "faint" }) }));
  out.push(D(G.dotsOf(clamp, 4.5, 17.5, 8, P, { fade: [0.04, 0.42] }), { size: 0.45, tone: "lo" }));
  out.push(S(G.lathe([[0, 0], [0.01, 0.01], [2, 5, 1], [8, 7.6, 1], [16, 7, 1], [24, 0.01, 1], [24, 0]], G.frameAlong([-17, 15, 94], [0, 2, -24]), P, { steps: 40 }), { tone: "hi", crease: "none" }));
  const pinF = G.frameOf([M.ANKLE[0], 25, M.ANKLE[2]], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  out.push(S(G.disc(0, 2.4, 4.6, pinF, P, { steps: 32 }), { tone: "mid" }));
  out.push(L(G.circleOf(pinF, 2.4, 1.6, P, 16), { tone: "lo" }));
  out.push(D([at([M.ANKLE[0], 27.4, M.ANKLE[2]])], { size: 0.5, tone: "hi" }));
  const cap = zAxis(TIBIA[0], TIBIA[1], PLATEAU);
  out.push(S(G.disc(0, 5, 34, cap, P, { steps: 96, bevel: 0.6 }), { tone: "mid" }));
  out.push(S(G.disc(5, 46, 5.4, cap, P, { steps: 32 }), { tone: "mid" }));
  for (const [z0, z1] of [[5.4, 19.4], [20.2, 34.2]]) {
    const plateP = G.ringBand(z0, z1, 6, 52, cap, P, { steps: 120, bevel: 0.8 });
    out.push(S(plateP, { tone: "mid", inner: L(G.arcOf(cap, (z0 + z1) / 2, 52, P), { tone: "faint" }) }));
    out.push(L(G.circleOf(cap, z1, 44, P, 96), { tone: "faint" }));
    out.push(L(G.circleOf(cap, z1, 10, P, 40), { tone: "lo" }));
  }
  out.push(k.faceTextSvg(k.topMatrix([TIBIA[0] + 2, TIBIA[1] + 26], PLATEAU + 34.2, P, "x"), "70 kg", { size: 6, tone: "lo", anchor: "middle" }));
  const nut = zAxis(TIBIA[0], TIBIA[1], PLATEAU + 34.2);
  out.push(S(G.disc(0, 7, 10, nut, P, { steps: 40, bevel: 0.4 }), { tone: "mid" }));
  out.push(L(k.knurl(TIBIA[0], TIBIA[1], 10, PLATEAU + 35, PLATEAU + 40.6, 30, P), { tone: "lo" }));
  out.push(L(G.circleOf(nut, 7, 5.4, P, 28), { tone: "lo" }));
  return out.join("");
}

function unit() {
  const out = [`<path class="iso-halo" d="${k.haloOf(UNIT, 0, 0.1, P)}" style="filter:blur(3px)"/>`];
  out.push(S(k.slabOf(UNIT, 0, UNIT_H, P, 5, 0.8), { tone: "mid", inner: L(k.sideSeam(UNIT, 6, P, 5), { tone: "faint" }) }));
  out.push(D(k.corners(UNIT, 4).map(([x, y]) => at([x, y, UNIT_H])), { size: 0.45 }));
  const [x, y] = DIAL;
  out.push(S(k.cylinder(x, y, DIAL_R, DIAL_Z, DIAL_H, P, 64, 0.8), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(x, y, DIAL_R, DIAL_TOP - 3, DIAL_TOP, 80, P, 0.3), { tone: "lo" }));
  out.push(L(k.ring(x, y, DIAL_R - 2.2, DIAL_TOP, P, 64), { tone: "lo" }));
  const ticks = k.radialTicks(x, y, DIAL_R - 3, 25, 5, DIAL_TOP, [1.3, 2.8], P, SWEEP[0], SWEEP[1]);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  const bw = SWEEP[0] + (M.BW / M.FULL_SCALE) * SWEEP[1];
  out.push(L(k.lineOnTop([x + Math.sin(bw) * (DIAL_R - 3), y - Math.cos(bw) * (DIAL_R - 3)], [x + Math.sin(bw) * (DIAL_R - 6.6), y - Math.cos(bw) * (DIAL_R - 6.6)], DIAL_TOP, P), { tone: "red" }));
  out.push(L(k.ring(x, y, 1.6, DIAL_TOP, P, 16), { tone: "mid" }));
  out.push(k.faceTextSvg(k.topMatrix([x, y + 10], DIAL_TOP, P, "x"), "×100 N", { size: 2.4, tone: "lo", anchor: "middle" }));
  const C = G.frameOf(CONNECTOR, [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  out.push(S(G.disc(0, 3, 4.6, C, P, { steps: 32 }), { tone: "mid" }));
  out.push(S(G.disc(3, 8, 3, C, P, { steps: 24 }), { tone: "mid" }));
  out.push(L(G.ribsOf(C, 3.4, 7.6, 3, 14, P, { seams: false }), { tone: "lo" }));
  const knob = [UNIT.x + 12, UNIT.y + UNIT.d - 10];
  out.push(S(k.cylinder(knob[0], knob[1], 4.4, UNIT_H, 4, P, 28), { tone: "mid" }));
  out.push(L(k.knurl(knob[0], knob[1], 4.4, UNIT_H, UNIT_H + 4, 24, P), { tone: "lo" }));
  out.push(L(k.lineOnTop(knob, [knob[0], knob[1] - 4.4], UNIT_H + 4, P), { tone: "hi" }));
  return out.join("");
}

const needleAt = (force) => {
  const angle = SWEEP[0] + Math.min(1, force / M.FULL_SCALE) * SWEEP[1];
  const [x, y] = DIAL;
  return k.lineOnTop([x - Math.sin(angle) * 3.4, y + Math.cos(angle) * 3.4], [x + Math.sin(angle) * (DIAL_R - 4), y - Math.cos(angle) * (DIAL_R - 4)], DIAL_TOP + 0.2, P);
};

const wireAt = (port) => {
  const end = [CONNECTOR[0] + 8, CONNECTOR[1], CONNECTOR[2]];
  const points = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    const p = G.lerp3(port, end, t);
    p[1] += Math.sin(Math.PI * t) * 26;
    p[2] -= Math.sin(Math.PI * t) * 30 * (1 - t * 0.3);
    points.push(k.iso(p, P));
  }
  return k.wireSvg(points[0], points[points.length - 1], { via: points.slice(1, -1), tone: "lo", size: 1 });
};

const rest = M.poseOf(0);
const peak = M.poseOf(M.RANGE[1]);
const tendon = parts.tendonOf(rest);
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "A skeletal model of a lower leg and foot standing on an instrumented base plate. The forefoot rests on a ribbed pad, the heel on a rest pad. The calf muscle is a spindle behind the tibia; its Achilles tendon runs through an inline load cell to the back of the heel bone, and the load cell is wired to a dial on the bench. A 70 kg mass sits on top of the tibia. As the heel rises the foot rolls about the ball of the foot, a height gauge behind the heel follows it, and the dial reads the tendon force.",
  body: [
    plate(),
    ruler(),
    `<g data-part="cursor">${cursor()}</g>`,
    pads(),
    `<g data-part="fascia">${parts.fasciaOf(0)}</g>`,
    `<g data-part="back">${legBack()}</g>`,
    `<g data-part="tendon">${tendon.svg}</g>`,
    `<g data-part="foot"><g data-key="0">${parts.footItems(0)}</g></g>`,
    `<g data-part="toes">${parts.toes()}</g>`,
    `<g data-part="front">${legFront()}</g>`,
    `<g data-part="wire">${wireAt(tendon.port)}</g>`,
    unit(),
    `<path data-part="needle" class="iso-line" data-tone="lit" data-free="start" d="${needleAt(rest.force)}" style="stroke-width:1.1"/>`,
  ],
});

const readoutOf = (pose) => `heel ${(pose.lift / 10).toFixed(1)} cm · ${pose.theta.toFixed(0)}° · Achilles ${Math.round(pose.force)} N (${pose.ratio.toFixed(2)}× BW)`;

const strip = (file) => readFileSync(join(HERE, file), "utf8").replace(/^export /gm, "");
const latheSource = readFileSync(join(HERE, "..", "..", "kit", "lathe.mjs"), "utf8").replace(/^import .*$/m, "").replace(/^export /gm, "");
const latheScript = `const G = (() => {${latheSource}\nreturn { viewOf, scaleOf, frameAlong, frameOf, pointOf, lathe, disc, sphereOf, circleOf, arcOf, angleToward, dot3, add3, sub3, mul3, unit3, cross3, len3, lerp3 };})();\n`;
const modelScript = `const M = (() => {${strip("model.mjs")}\nreturn { BW, SOLE, RANGE, BALL, ANKLE, rollOf, poseOf, thetaForLift, FULL_SCALE };})();\n`;
const partsScript = strip("parts.mjs");

const live = `
const P = ${JSON.stringify(P)};
const K = { iso, solidSvg, lineSvg, wireSvg, translateAlong };
const PARTS = makeParts(K, G, P, M);
const DIAL = ${JSON.stringify(DIAL)}, DIAL_R = ${DIAL_R}, DIAL_TOP = ${DIAL_TOP}, SWEEP = ${JSON.stringify(SWEEP)}, CONNECTOR = ${JSON.stringify(CONNECTOR)};
const needleAt = ${needleAt.toString().replace("k.lineOnTop", "lineOnTop")};
const wireAt = ${wireAt.toString().replace(/k\.iso/g, "iso").replace("k.wireSvg", "wireSvg")};
const readoutOf = ${readoutOf.toString()};
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const part = (name) => svg.querySelector('[data-part="' + name + '"]');
const foot = part("foot"), tendon = part("tendon"), back = part("back"), front = part("front"), cursor = part("cursor"), wire = part("wire"), fascia = part("fascia"), needle = part("needle");
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const [LOW, HIGH] = M.RANGE;
const STOPS = [0, 10, 20, 30];
const STEP = 2;
const keys = new Map([[0, foot.firstElementChild]]);
let shown = keys.get(0);
const O = iso([0, 0, 0], P), AX = iso([1, 0, 0], P), AZ = iso([0, 0, 1], P);
const ax = [AX[0] - O[0], AX[1] - O[1]], az = [AZ[0] - O[0], AZ[1] - O[1]];
const det = ax[0] * az[1] - ax[1] * az[0];
const pivot = iso(M.BALL, P);
function rollMatrix(degrees) {
  const c = Math.cos((degrees * Math.PI) / 180), s = Math.sin((degrees * Math.PI) / 180);
  const bx = [c * ax[0] - s * az[0], c * ax[1] - s * az[1]], bz = [s * ax[0] + c * az[0], s * ax[1] + c * az[1]];
  const a = (bx[0] * az[1] - bz[0] * ax[1]) / det, b = (bx[1] * az[1] - bz[1] * ax[1]) / det;
  const cc = (bz[0] * ax[0] - bx[0] * az[0]) / det, d = (bz[1] * ax[0] - bx[1] * az[0]) / det;
  const e = pivot[0] - a * pivot[0] - cc * pivot[1], f = pivot[1] - b * pivot[0] - d * pivot[1];
  return "matrix(" + [a, b, cc, d, e, f].map((v) => v.toFixed(5)).join(" ") + ")";
}
function keyOf(index) {
  let group = keys.get(index);
  if (!group) {
    group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.setAttribute("data-key", String(index));
    group.style.display = "none";
    group.innerHTML = PARTS.footItems(index * STEP);
    foot.appendChild(group);
    keys.set(index, group);
  }
  return group;
}
const fill = (deadline) => { for (let i = 0; i <= M.RANGE[1] / STEP; i++) if (!keys.has(i)) { keyOf(i); if (!deadline || deadline.timeRemaining() < 25) break; } if (keys.size <= M.RANGE[1] / STEP) (window.requestIdleCallback || setTimeout)(fill); };
(window.requestIdleCallback || setTimeout)(fill);
let theta = 0, target = 0, drawn = -1, frame = 0, last = 0, clock = 0, touring = true, visible = false, idleTimer = 0;
const tourAt = (t) => { const phase = (t % 7) / 7; const lift = phase < 0.3 ? phase / 0.3 : phase < 0.5 ? 1 : phase < 0.8 ? 1 - (phase - 0.5) / 0.3 : 0; return HIGH * (0.5 - 0.5 * Math.cos(Math.PI * lift)); };
function draw() {
  if (Math.abs(theta - drawn) < 0.01) return;
  drawn = theta;
  const pose = M.poseOf(theta);
  const move = translateAlong(P, pose.shift);
  back.setAttribute("transform", move);
  front.setAttribute("transform", move);
  cursor.setAttribute("transform", translateAlong(P, [0, 0, pose.lift]));
  const index = Math.round(theta / STEP);
  const group = keyOf(index);
  if (group !== shown) { group.style.display = ""; shown.style.display = "none"; shown = group; }
  foot.setAttribute("transform", rollMatrix(theta - index * STEP));
  const t = PARTS.tendonOf(pose);
  tendon.innerHTML = t.svg;
  wire.innerHTML = wireAt(t.port);
  fascia.innerHTML = PARTS.fasciaOf(theta);
  needle.setAttribute("d", needleAt(pose.force));
  const text = readoutOf(pose);
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(Math.round(theta)));
  stage.setAttribute("aria-valuetext", text);
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  if (touring) { clock += dt; target = tourAt(clock); }
  theta = still.matches ? target : theta + (target - theta) * (1 - Math.exp(-dt / (touring ? 0.05 : 0.3)));
  if (Math.abs(target - theta) < 0.02) theta = target;
  draw();
  const settled = !touring && theta === target;
  frame = visible && !settled ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const steer = (next) => { touring = false; target = clamp(next, LOW, HIGH); clearTimeout(idleTimer); idleTimer = setTimeout(() => { touring = !still.matches; clock = 0; run(); }, 3600); run(); };
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
if (still.matches) touring = false;
stage.addEventListener("pointermove", (event) => {
  const box = svg.getBoundingClientRect();
  const share = clamp((0.8 - (event.clientY - box.top) / box.height) / 0.6, 0, 1);
  steer(LOW + share * (HIGH - LOW));
});
stage.addEventListener("pointerleave", () => steer(target));
stage.addEventListener("keydown", (event) => {
  let to = null;
  if (event.key === "ArrowUp" || event.key === "ArrowRight") to = target + 5;
  if (event.key === "ArrowDown" || event.key === "ArrowLeft") to = target - 5;
  if (event.key === "Home") to = LOW;
  if (event.key === "End") to = HIGH;
  if (to === null) return;
  event.preventDefault();
  steer(Math.round(to / 5) * 5);
});
window.__calf = { set: (value) => { touring = false; clearTimeout(idleTimer); target = theta = clamp(value, LOW, HIGH); drawn = -1; draw(); } };
draw();
`;

const body = k.plateHtml({
  fig: "Fig 1",
  title: "Heel raise",
  hint: "Move up and down to raise the heel",
  readout: readoutOf(rest),
  keys: [
    { mark: "lit", label: "Achilles tendon and dial needle: the force the calf must make" },
    { mark: "raised", label: "Bones of the leg and foot, 70 kg on one leg" },
    { mark: "red", label: "Body weight, 687 N, on the dial" },
  ],
  caption:
    `The foot is a second-class lever. It pivots on the ball of the foot, body weight comes down through the ankle 14 cm behind it, and the Achilles tendon pulls up on the heel 5 cm behind the ankle, so it pulls 140 / 50 = ${rest.ratio.toFixed(1)} times body weight, about ${Math.round(rest.force / 10) * 10} N, the moment the heel leaves the pad. As the heel rises the ankle rolls forward over the ball of the foot and the tendon's moment arm grows, so at ${M.RANGE[1]}° and ${(peak.lift / 10).toFixed(1)} cm the pull falls to ${peak.ratio.toFixed(1)} times body weight. The joint between tibia and talus carries body weight plus that pull, ${(rest.joint / M.BW).toFixed(1)} times body weight at heel-off.`,
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Heel raise: arrow keys raise and lower the heel in 5 degree steps" aria-valuemin="0" aria-valuemax="30" aria-valuenow="0">${svg}</div>`,
});

const name = theme === "light" ? "calf-raise-light.html" : "calf-raise.html";
writeFileSync(join(HERE, name), k.pageHtml({ title: "Heel raise", theme, body, script: kitScript() + latheScript + modelScript + partsScript + live }));
console.log("wrote", name);
