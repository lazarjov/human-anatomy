import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import * as G from "../../kit/lathe.mjs";
import * as T from "../../kit/tube.mjs";
import { kitScript } from "../../scripts/inline-kit.mjs";
import * as M from "./model.mjs";
import { makeKnee } from "./parts.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const KIT = join(HERE, "..", "..", "kit");
const theme = process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 600;
const HEIGHT = 410;
const REST = 38;

const PLATE = { x: -164, y: -40, w: 320, d: 80, r: 9 };
const PLATE_H = 12;
const FOOT_H = 5;
const H = M.H;
const COLUMN = { x: -138, y: -13, w: 30, d: 26, r: 3 };
const VISE = { x: -142, y: -17, w: 40, d: 34, r: 3 };
const VISE_Z = H - 17;
const JAW_Z = H - 9;
const JAW_TOP = H + 8;
const BRIDGE_Z = JAW_TOP;
const CELL = { from: -118, to: -102, r: 3.6, z: M.CLEVIS[2] };
const SUPPORT = [-72, 0];
const TURNBUCKLE = [-88, -77];

const extremes = [
  ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
  [-140, 0, H + 24],
  [156, 0, H + 8],
  [150, 26, H - 10],
];
const P = k.fitProjection(extremes, WIDTH, HEIGHT, { pad: 18, azimuth: 70 });
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const X = [1, 0, 0];
const Y = [0, 1, 0];
const Z = [0, 0, 1];
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 24))) {
    out.push(S(k.cylinder(x, y, 7.5, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.8, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "lo", inner: L(k.sideSeam(PLATE, -4, P, 8), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "faint" }));
  const screws = k.corners(PLATE, 11);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.3, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  const strip = { x: -60, y: PLATE.y + PLATE.d - 15, w: 206, d: 7, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.8, 0.6, [2, 3.6], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(D([at([strip.x + 2, strip.y + 3.5, 0.6]), at([strip.x + strip.w - 2, strip.y + 3.5, 0.6])], { size: 0.45 }));
  const label = { x: -154, y: PLATE.y + PLATE.d - 22, w: 40, d: 14, r: 1.5 };
  out.push(S(k.slabOf(label, 0, 0.8, P, 3, 0.3), { tone: "lo", crease: "none" }));
  [0, 1, 2].forEach((row) => out.push(L(k.lineOnTop([label.x + 5, label.y + 3.6 + row * 3.4], [label.x + (row === 0 ? 30 : 24), label.y + 3.6 + row * 3.4], 0.8, P), { tone: "lo", free: true })));
  out.push(D([at([label.x + 2, label.y + 2, 0.8]), at([label.x + label.w - 2, label.y + label.d - 2, 0.8])], { size: 0.4 }));
  return out.join("");
}

function supportPost() {
  const [x, y] = SUPPORT;
  const out = [];
  out.push(S(k.cylinder(x, y, 11, 0, 3, P, 40, 0.6), { tone: "mid" }));
  out.push(D(byDepth([[x - 7.5, y], [x + 7.5, y], [x, y - 7.5], [x, y + 7.5]]).map(([px, py]) => at([px, py, 3])), { size: 0.45, tone: "lo" }));
  out.push(S(k.cylinder(x, y, 4.6, 3, 70, P, 28), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(x, y, 6, 73, 10, P, 32, 0.5), { tone: "mid" }));
  out.push(S(k.slabOf({ x: x - 1.6, y: y + 5.6, w: 3.2, d: 3.2, r: 0.8 }, 75, 4, P, 2), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(x, y + 11.6, 3, 74, 6, P, 20), { tone: "mid" }));
  out.push(L(k.knurl(x, y + 11.6, 3, 74, 80, 18, P), { tone: "lo" }));
  out.push(S(k.cylinder(x, y, 3.2, 83, H - 15 - 83, P, 28), { tone: "mid", crease: "none" }));
  out.push(L([110, 135].map((z) => k.sideArc(x, y, 3.2, z, P, 16)).join(""), { tone: "faint" }));
  const block = { x: x - 7, y: y - 10, w: 14, d: 20, r: 1.5 };
  out.push(S(k.slabOf(block, H - 15, 9.4, P, 3, 0.5), { tone: "mid" }));
  const VF = G.frameOf([x - 7, 0, H], X, Y, Z);
  out.push(L([G.circleOf(VF, 14, 5.6, P, 40)].join(""), { tone: "faint" }));
  out.push(D([at([x - 4, y - 7.4, H - 5.6]), at([x + 4, y - 7.4, H - 5.6]), at([x - 4, y + 7.4, H - 5.6]), at([x + 4, y + 7.4, H - 5.6])], { size: 0.45, tone: "lo" }));
  return out.join("");
}

function spares() {
  const [x, y] = [-38, -10];
  const out = [`<path class="iso-halo" style="filter:blur(3px)" d="${k.haloOf({ x: x - 14, y: y - 14, w: 28, d: 28, r: 14 }, 0, 0.1, P)}"/>`];
  out.push(S(k.cylinder(x, y, 8, 0, 2.4, P, 40, 0.5), { tone: "mid" }));
  out.push(S(k.cylinder(x, y, 3.4, 2.4, 1.6, P, 24), { tone: "mid" }));
  out.push(S(k.cylinder(x, y, 1.1, 4, 14, P, 16), { tone: "mid", crease: "none" }));
  [0, 1].forEach((i) => {
    const z = 4 + i * 3.8;
    out.push(S(k.cylinder(x, y, 12.5, z, 3.5, P, 56, 0.5), { tone: "mid", crease: "lo", inner: L(k.sideArc(x, y, 12.5, z + 1.75, P, 40), { tone: "faint" }) }));
  });
  const top = 4 + 2 * 3.8 - 0.3;
  out.push(L(k.ring(x, y, 2.2, top, P, 20), { tone: "lo" }));
  out.push(L(k.lineOnTop([x + 2.2, y], [x + 12.5, y], top, P), { tone: "faint" }));
  out.push(S(k.cylinder(x, y, 1.6, 18, 1.2, P, 16), { tone: "mid" }));
  return out.join("");
}

function viseBack() {
  const out = [];
  out.push(S(k.slabOf({ x: COLUMN.x - 8, y: COLUMN.y - 8, w: COLUMN.w + 16, d: COLUMN.d + 16, r: 3 }, 0, 3, P, 4, 0.6), { tone: "mid" }));
  out.push(D(k.corners({ x: COLUMN.x - 8, y: COLUMN.y - 8, w: COLUMN.w + 16, d: COLUMN.d + 16, r: 3 }, 3.6).map(([px, py]) => at([px, py, 3])), { size: 0.45, tone: "lo" }));
  out.push(S(k.slabOf(COLUMN, 3, VISE_Z - 3, P, 4, 0.6), { tone: "mid", inner: L([40, 90, 140].map((z) => k.sideSeam(COLUMN, z, P, 4)).join(""), { tone: "faint" }) }));
  out.push(S(k.slabOf(VISE, VISE_Z, JAW_Z - VISE_Z, P, 4, 0.6), { tone: "mid" }));
  out.push(D([at([VISE.x + 4, VISE.y + VISE.d - 3, JAW_Z]), at([VISE.x + VISE.w - 4, VISE.y + VISE.d - 3, JAW_Z])], { size: 0.45, tone: "lo" }));
  const rule = { x: COLUMN.x + 6, y: COLUMN.y + COLUMN.d, w: 7, d: 0.7, r: 0.3 };
  out.push(S(k.slabOf(rule, 24, VISE_Z - 34, P, 2), { tone: "lo", crease: "none" }));
  const face = rule.y + rule.d;
  for (let z = 28, i = 0; z <= VISE_Z - 14; z += 5, i++) {
    const big = i % 5 === 0;
    out.push(L(k.segment([rule.x, face, z], [rule.x + (big ? 4.4 : 2.4), face, z], P), { tone: big ? "mid" : "lo" }));
  }
  out.push(D([at([rule.x + 3.5, face, 26]), at([rule.x + 3.5, face, VISE_Z - 12])], { size: 0.4 }));
  const back = { x: VISE.x + 2, y: VISE.y, w: VISE.w - 4, d: VISE.d / 2 - 5.6, r: 1.5 };
  out.push(S(k.slabOf(back, JAW_Z, JAW_TOP - JAW_Z, P, 3, 0.5), { tone: "mid" }));
  return out.join("");
}

function viseFront() {
  const out = [];
  const front = { x: VISE.x + 2, y: 5.6, w: VISE.w - 4, d: VISE.d / 2 - 5.6, r: 1.5 };
  out.push(S(k.slabOf(front, JAW_Z, JAW_TOP - JAW_Z, P, 3, 0.5), { tone: "mid", inner: L(k.sideSeam(front, H, P, 3), { tone: "faint" }) }));
  const screwF = G.frameOf([-122, 0, JAW_Z + 4], Y, X, Z);
  out.push(S(G.disc(VISE.y + VISE.d, VISE.y + VISE.d + 3, 3.2, screwF, P), { tone: "mid" }));
  out.push(S(G.disc(VISE.y + VISE.d + 3, VISE.y + VISE.d + 15, 1.5, screwF, P), { tone: "mid" }));
  const handleF = G.frameOf([-122, VISE.y + VISE.d + 15.8, JAW_Z + 4], Z, X, Y);
  out.push(S(G.disc(-11, 11, 0.9, handleF, P), { tone: "mid" }));
  out.push(S(G.sphereOf([-122, VISE.y + VISE.d + 15.8, JAW_Z - 7.6], 1.6, P), { tone: "mid" }));
  out.push(S(G.sphereOf([-122, VISE.y + VISE.d + 15.8, JAW_Z + 15.6], 1.6, P), { tone: "mid" }));
  const bridge = { x: -130, y: -16, w: 24, d: 32, r: 2 };
  out.push(S(k.slabOf(bridge, BRIDGE_Z, 3, P, 3, 0.5), { tone: "mid" }));
  out.push(D(k.corners(bridge, 3.4).map(([px, py]) => at([px, py, BRIDGE_Z + 3])), { size: 0.45, tone: "lo" }));
  out.push(S(k.slabOf({ x: -118, y: -5, w: 14, d: 10, r: 1 }, BRIDGE_Z + 3, CELL.z - CELL.r - BRIDGE_Z - 3 + 0.4, P, 2, 0.4), { tone: "mid" }));
  const cellF = G.frameOf([0, 0, CELL.z], X, Y, Z);
  const cell = G.solidOf([[CELL.from, 3.6], [CELL.from + 1.2, 4.2], [CELL.to - 1.2, 4.2], [CELL.to, 3.6]], cellF, P);
  out.push(S(cell, { tone: "mid", crease: "none", inner: L([CELL.from + 4, CELL.to - 4].map((s) => G.arcOf(cellF, s, 4.2, P)).join(""), { tone: "lo" }) }));
  out.push(S(G.disc(CELL.to, CELL.to + 2.4, 1.6, cellF, P), { tone: "mid" }));
  const cableFrom = CELL.to + 2.4;
  const cableTo = M.CLEVIS[0] - 8;
  const [tb0, tb1] = TURNBUCKLE;
  const pieces = T.tubePieces([[cableFrom, 0, CELL.z], [cableTo, 0, CELL.z]], 0.75, P, { maxLength: 400, gaps: [[tb0 - cableFrom, tb1 - cableFrom]], rings: { pitch: 1.4, twist: 1.6, fade: [0.1, 0.55] } });
  out.push(pieces.map((piece) => T.tubeSvg(piece, { tone: "mid" })).join(""));
  const tbProfile = [[tb0, 1.6], [tb0 + 1.4, 2.6, 1], [tb0 + 3, 2.9, 1], [tb1 - 3, 2.9, 1], [tb1 - 1.4, 2.6, 1], [tb1, 1.6]];
  out.push(S(G.solidOf(tbProfile, cellF, P), { tone: "mid", crease: "none" }));
  out.push(k.fadedSvg(G.ribsOf(cellF, tb0 + 4, tb1 - 4, 2.9, 18, P, { fade: [0.05, 0.4] }), { tone: "lo" }));
  out.push(L(G.arcOf(cellF, tb0 + 4, 2.9, P) + G.arcOf(cellF, tb1 - 4, 2.9, P), { tone: "lo" }));
  const bandF = G.frameOf([SUPPORT[0], 0, H], X, Y, Z);
  out.push(S(G.ringBand(-2.4, 2.4, 5.6, 6.6, bandF, P), { tone: "mid", crease: "none", inner: L(G.arcOf(bandF, 0, 6.6, P), { tone: "faint" }) }));
  out.push(S(G.disc(6.6, 9.4, 1.6, G.frameOf([SUPPORT[0], 0, H], Y, X, Z), P), { tone: "mid" }));
  out.push(S(G.disc(9.4, 11.4, 3, G.frameOf([SUPPORT[0], 0, H], Y, X, Z), P), { tone: "mid" }));
  const clevisF = G.frameOf([0, 0, CELL.z], [-1, 0, 0], Y, Z);
  out.push(S(G.prismOf(clevisF, [[-3, -3], [3, -3], [3, 3], [-3, 3]].map(([u, v]) => [u * 1, v * 1]), -M.CLEVIS[0] - 8, -M.CLEVIS[0] + 2, P), { tone: "mid", crease: "faint" }));
  const pinF = G.frameOf([M.CLEVIS[0] - 3, 0, CELL.z], Y, X, Z);
  out.push(S(G.disc(3, 4.6, 1.5, pinF, P), { tone: "mid" }));
  out.push(D([at([M.CLEVIS[0] - 3, 4.6, CELL.z])], { size: 0.45, tone: "lo" }));
  return out.join("");
}

function weight(deg) {
  const eye = M.eyeOf(deg);
  const hook = [eye[0], 0, eye[2] - M.CORD];
  const plates = 4;
  const PT = 3.8;
  const T0 = hook[2] - 9;
  const out = [];
  out.push(S(k.cylinder(hook[0], 0, 3.6, T0 - plates * PT - 3, 3, P, 24, 0.4), { tone: "mid" }));
  out.push(S(k.cylinder(hook[0], 0, 1.1, T0 - plates * PT, plates * PT + 7.6, P, 16), { tone: "mid", crease: "none" }));
  for (let i = plates - 1; i >= 0; i--) {
    const top = T0 - i * PT - 0.3;
    out.push(S(k.cylinder(hook[0], 0, 12.5, T0 - (i + 1) * PT, PT - 0.3, P, 56, 0.5), { tone: "mid", crease: "lo", inner: L(k.sideArc(hook[0], 0, 12.5, top - PT / 2 + 0.15, P, 40), { tone: "faint" }) }));
  }
  out.push(L(k.lineOnTop([hook[0] + 2.2, 0], [hook[0] + 12.5, 0], T0 - 0.3, P), { tone: "faint" }));
  out.push(L(k.ring(hook[0], 0, 2.2, T0 - 0.3, P, 20), { tone: "lo" }));
  out.push(k.faceTextSvg(k.topMatrix([hook[0] - 5, 6.5], T0 - 0.3, P, "x"), "2.5 kg", { size: 2.2, tone: "lo", anchor: "middle" }));
  out.push(S(G.sphereOf([hook[0], 0, hook[2] - 0.2], 1.5, P), { tone: "mid" }));
  return { svg: out.join(""), hook };
}

const knee = makeKnee(k, G, T, P, M);
const restWeight = weight(90);
const restEye = M.eyeOf(90);
const eyeAt = M.eyeOf(REST);
const shift = [eyeAt[0] - restEye[0], 0, eyeAt[2] - restEye[2]];
const cordD = (deg) => {
  const e = M.eyeOf(deg);
  return k.pathOf([at([e[0], 0, e[2] - 1.6]), at([e[0], 0, e[2] - M.CORD + 1.3])]);
};
const halo = (deg) => {
  const e = M.eyeOf(deg);
  return k.haloOf({ x: e[0] - 12, y: -12, w: 24, d: 24, r: 12 }, 0, 0.1, P);
};
const HALO_END = PLATE.x + PLATE.w - 16;
const haloAlpha = (deg) => Math.min(1, Math.max(0, (HALO_END - M.eyeOf(deg)[0]) / 30));

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "An anatomical left knee on a test bench, seen from the lateral side. The femur is clamped in a vise and rests on a V-block; the tibia and fibula hang from the femoral condyles, with menisci, cruciate and collateral ligaments. The quadriceps tendon runs over the patella from a cable and load cell, and the patellar tendon pulls on the tibial tuberosity. A 10 kg weight hangs from an ankle cuff, and a goniometer reads the flexion angle.",
  body: [
    plate(),
    `<path data-part="halo" class="iso-halo" style="filter:blur(5px)" opacity="${haloAlpha(REST).toFixed(2)}" d="${halo(REST)}"/>`,
    viseBack(),
    spares(),
    supportPost(),
    `<g data-part="knee">${knee.knee(REST)}</g>`,
    viseFront(),
    `<path data-part="cord" class="iso-line" data-tone="mid" d="${cordD(REST)}"/>`,
    `<g data-part="weight" transform="${k.translateAlong(P, shift)}">${restWeight.svg}</g>`,
    `<g data-part="gonio">${knee.goniometer(REST)}</g>`,
  ],
});

const strip = (file) => readFileSync(file, "utf8").replace(/^import .*$/gm, "").replace(/^export /gm, "");
const namesOf = (file) => [...readFileSync(file, "utf8").matchAll(/^export (?:function|const) (\w+)/gm)].map((m) => m[1]);
const wrap = (name, file, prelude = "") => `const ${name} = (() => {${prelude}\n${strip(file)}\nreturn { ${namesOf(file).join(", ")} };})();\n`;
const modules =
  wrap("GL", join(KIT, "lathe.mjs")) +
  wrap("TB", join(KIT, "tube.mjs"), "const G = GL;") +
  wrap("MD", join(HERE, "model.mjs")) +
  strip(join(HERE, "parts.mjs"));

const first = M.loads(REST);
const say = (l) => `${Math.round(l.angle)}° flexion · quad ${Math.round(l.quad)} N · PF ${Math.round(l.pf)} N`;
const live = readFileSync(join(HERE, "live.js"), "utf8").replace("__DATA__", JSON.stringify({ P, REST, restEye, MAX: M.MAX, HALO_END }));

const body = k.plateHtml({
  fig: "Fig 1",
  title: "Knee extensor bench",
  hint: "Hover or ← → to flex the knee",
  readout: say(first),
  keys: [
    { mark: "lit", label: "Extensor mechanism: quadriceps tendon, patella, patellar tendon" },
    { mark: "raised", label: "Bones: femur, tibia, fibula, condyles and menisci" },
    { mark: "edge", label: "Cable, turnbuckle and load cell reading the quadriceps pull" },
  ],
  caption:
    "A left knee on a seated knee-extension bench, 1 unit = 2.5 mm. A 10 kg weight hangs from the tibia's end, 37.8 cm from the knee axis, so its moment about the knee is 98 N × the horizontal lever, largest at full extension. The quadriceps balances it through the patellar tendon, whose moment arm follows a typical published curve: about 4.3 cm straight, 4.75 cm near 25° and 3.5 cm at 90°. Force = moment ÷ arm. The patella acts as a pulley: with equal tension in both tendons, the patellofemoral force is the quadriceps force times the vector sum of the two tendon directions, so it peaks in mid-range where the tendons bend most sharply over the trochlea while the load is still large. The tibia turns about a fixed axis through the condyles, a simplification of the real roll and glide.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Knee flexion: arrow keys bend and straighten the knee" aria-valuemin="0" aria-valuemax="90" aria-valuenow="${REST}" aria-valuetext="${say(first)}">${svg}</div>`,
});

const name = theme === "light" ? "knee-joint-light.html" : "knee-joint.html";
const page = k.pageHtml({ title: "Knee extensor bench", theme, body, script: kitScript() + modules + live });
writeFileSync(join(HERE, name), page);
console.log("wrote", name, `${(page.length / 1024).toFixed(0)} KB`);
