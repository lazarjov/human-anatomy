import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import * as G from "../../kit/lathe.mjs";
import * as T from "../../kit/tube.mjs";
import { tissueSvg, tissueStyle, activationAttrs } from "../../kit/tissue.mjs";
import { kitScript } from "../../scripts/inline-kit.mjs";
import { HIP, stance } from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 600;
const HEIGHT = 520;
const U = 3;

const HEAD = [0, 4, 90];
const HEAD_R = 7.5;
const MID = -HIP.weightArm * U;
const PIVOT = [MID, 0, 138];
const LUMBAR = 5;
const V_H = 8.4;
const DISC = 2.8;
const SPINE_TOP = PIVOT[2] + LUMBAR * (V_H + DISC);
const TROCH = [22, 0, 80];
const TROCH_R = 6.5;
const SHAFT_TOP = [20, 0, 80];
const SHAFT_LOW = [10, 0, 12];
const NECK_FROM = [16, 1, 81];
const KNEE = [10, 0, 4];
const FLOOR = -30;

const P = k.fitProjection(
  [[-98, -14, FLOOR], [40, 14, FLOOR], [-98, 0, 240], [40, 0, 240], [MID + 40, 0, 240]],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 68, elevation: 24 },
);

const at = (point) => k.iso(point, P);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const X = (paths, tissue, style = {}) => tissueSvg(k.solidSvg, paths, tissue, { tone: "hi", crease: "none", ...style });
const wrap = (tissue, inner, attrs = "") => `<g class="tissue-${tissue}"${attrs ? " " + attrs : ""}>${inner}</g>`;
const FRONTAL = G.frameOf([0, 0, 0], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
const prism = (points, y0, y1) => G.prismOf(FRONTAL, G.hullOf(points), y0, y1, P);
const mirrorX = (x) => 2 * MID - x;
const mirror3 = ([x, y, z]) => [mirrorX(x), y, z];
const faceLine = (points, y, closed = false) => k.pathOf(points.map(([x, z]) => at([x, y, z])), closed);
const ellipseOn = (cx, cz, rx, rz, y, steps = 28) => faceLine(Array.from({ length: steps }, (_, i) => [cx + rx * Math.cos((i / steps) * Math.PI * 2), cz + rz * Math.sin((i / steps) * Math.PI * 2)]), y, true);

const tube = (points, radius, tissue, options = {}) =>
  wrap(tissue, T.tubePieces(points, radius, P, { maxLength: 400, ...options }).map((piece) => T.tubeSvg(piece, { tone: "hi" })).join(""));

function rod(from, to, profile) {
  const axis = G.sub3(to, from);
  const length = G.len3(axis);
  const F = G.frameAlong(from, G.unit3(axis));
  return { F, length, paths: G.solidOf(profile(length), F, P) };
}

const spindleProfile = (r0, rMax, r1, peak = 0.45, rows = 14) => (length) =>
  Array.from({ length: rows + 1 }, (_, i) => {
    const t = i / rows;
    const bulge = t < peak ? Math.sin((t / peak) * (Math.PI / 2)) : Math.cos(((t - peak) / (1 - peak)) * (Math.PI / 2));
    const base = r0 + (r1 - r0) * t;
    return [t * length, base + (rMax - base) * Math.pow(Math.max(0, bulge), 0.8), i > 0 && i < rows ? 1 : 0];
  });

function muscleBundle(from, to, { r0 = 1.4, rMax = 3.2, r1 = 1.2, peak = 0.45, ribs = 9, tendon = 0.22 } = {}) {
  const split = G.lerp3(from, to, 1 - tendon);
  const belly = rod(from, split, spindleProfile(r0, rMax, r1, peak));
  const fibres = G.ribsOf(belly.F, belly.length * 0.12, belly.length * 0.88, rMax * 0.82, ribs, P, { fade: [0.18, 0.55], twist: 0.08, least: 0.2 });
  const cord = rod(split, to, (length) => [[0, r1], [length * 0.6, r1 * 0.8, 1], [length, r1 * 0.95]]);
  return {
    belly: X(belly.paths, "muscle") + k.fadedSvg(fibres.map(({ d, alpha }) => ({ d, alpha: alpha * 0.7 })), { tone: "faint", free: true }),
    tendon: X(cord.paths, "tendon"),
    depth: k.depthOf(G.lerp3(from, to, 0.5), P),
  };
}

const WING = [[-20, 102], [-22, 124], [-16, 136], [-6, 142], [4, 141.4], [11, 135.5], [14, 125], [13.4, 115], [8.5, 102], [0, 96.5], [-10, 94.5]];
const CREST = [[-22, 0, 123], [-17.5, 0, 134.5], [-6, 0, 141.6], [4, 0, 141.2], [11, 0, 135.2], [14.2, 0, 125]];
const ASIS = [14.6, 1, 124];
const AIIS = [12, 2, 108];
const SACRUM = [[MID - 13, 138], [MID + 13, 138], [MID + 11.5, 124], [MID + 7.5, 111], [MID + 3, 102], [MID - 3, 102], [MID - 7.5, 111], [MID - 11.5, 124]];
const SYMPHYSIS = [[MID - 1.4, 84], [MID + 1.4, 84], [MID + 1.4, 71], [MID - 1.4, 71]];

const fossa = (points) => {
  const hull = G.hullOf(points);
  const [cx, cz] = hull.reduce(([a, b], [x, z]) => [a + x / hull.length, b + z / hull.length], [0, 0]);
  return hull.map(([x, z]) => [cx + (x - cx) * 0.74, cz + 2.4 + (z - cz) * 0.7]);
};

function hemipelvis(side) {
  const m = side < 0 ? mirror3 : (p) => p;
  const mx = side < 0 ? (pts) => pts.map(([x, z]) => [mirrorX(x), z]) : (pts) => pts;
  const out = [];
  const wing = mx(WING);
  out.push(X(prism(wing, -3.4, 3.4), "bone", { inner: L(faceLine(fossa(wing), 3.4, true), { tone: "faint" }) }));
  out.push(tube(CREST.map(m), (t) => 3.4 + 0.8 * Math.sin(Math.PI * t), "bone"));
  out.push(X(G.sphereOf(m(ASIS), 2.8, P), "bone"));
  out.push(X(G.sphereOf(m(AIIS), 2.6, P), "bone"));
  const plate = mx([[-4, 84], [-10, 85.6], [-20, 83.4], [MID + 1.4, 84.4], [MID + 1.4, 70.6], [-22, 66.4], [-13.4, 60], [-8, 61.6], [-3, 70]]);
  const hole = mx([[-10.2, 79.8], [-16, 79.4], [-22.6, 77], [-23.4, 72.6], [-19, 69.4], [-13.8, 67.6], [-10.6, 70.4], [-9.4, 75.4]]);
  out.push(X(prism(plate, -3.2, 3.2), "bone", { crease: "faint", inner: `<path class="iso-shade" data-shade="0" d="${faceLine(hole, 3.2, true)}"/>` + L(faceLine(hole, 3.2, true), { tone: "mid" }) }));
  out.push(X(G.sphereOf(m([-12.4, 0.8, 62.4]), 4.2, P), "bone"));
  out.push(X(prism(mx(Array.from({ length: 36 }, (_, i) => [HEAD[0] + 10.6 * Math.cos((i / 36) * Math.PI * 2), HEAD[2] + 11 * Math.sin((i / 36) * Math.PI * 2)])), -5, 3.6), "bone", { crease: "faint" }));
  return out.join("");
}

function acetabularRim(side) {
  const m = side < 0 ? mirror3 : (p) => p;
  const from = -0.12 * Math.PI;
  const to = 1.12 * Math.PI;
  const rim = Array.from({ length: 26 }, (_, i) => { const a = from + (i / 25) * (to - from); return m([HEAD[0] + 9.2 * Math.cos(a), 5.4, HEAD[2] + 9.2 * Math.sin(a)]); });
  return tube(rim, (t) => 1 + 2 * Math.pow(Math.sin(Math.PI * t), 1.5), "bone");
}

function femurHead(centre) {
  return X(G.sphereOf(centre, HEAD_R, P), "cartilage") + L(ellipseOn(centre[0], centre[2] - 1.6, 1.3, 1.1, centre[1] + HEAD_R - 0.4, 16), { tone: "lo" });
}

function swingFemur() {
  const out = [];
  const head = mirror3(HEAD);
  const troch = mirror3(TROCH);
  const shaftTop = mirror3(SHAFT_TOP);
  const shaftEnd = [mirrorX(17), 0, 42];
  const shaft = rod(shaftEnd, shaftTop, (length) => [[0, 4.6], [length * 0.4, 4.3, 1], [length * 0.8, 5.2, 1], [length, 6.4]]);
  out.push(X(shaft.paths, "bone", { inner: L(G.circleOf(shaft.F, 0.01, 4.6, P), { tone: "faint" }) }));
  out.push(X(G.sphereOf(troch, TROCH_R, P), "bone"));
  const neck = rod(mirror3(NECK_FROM), head, (length) => [[0, 5.2], [length * 0.45, 3.9, 1], [length, 4.8]]);
  out.push(X(neck.paths, "bone"));
  return { back: out.join(""), head: femurHead(head) };
}

function stanceFemur() {
  const out = [];
  const shaft = rod(SHAFT_LOW, SHAFT_TOP, (length) => [[0, 6.4], [9, 4.6, 1], [length * 0.5, 4.2, 1], [length * 0.85, 5, 1], [length, 6.6]]);
  const aspera = G.ribsOf(shaft.F, 12, shaft.length - 10, 4.4, 1, P, { phase: Math.PI * 0.82, fade: [0.25, 0.25], least: 0.3 });
  out.push(X(shaft.paths, "bone", { inner: k.fadedSvg(aspera, { tone: "faint", free: true }) }));
  out.push(X(G.sphereOf([3.6, -1, 3], 6.6, P), "bone"));
  out.push(X(G.sphereOf([16.4, -1, 3.4], 6.2, P), "bone"));
  out.push(X(G.sphereOf([15.4, 2, 66], 2.9, P), "bone"));
  return out.join("");
}

function knee() {
  const out = [];
  const menisci = rod([10, -1, -4.4], [10, -1, -2.8], () => [[0, 10.4], [1.6, 10.4]]);
  const tibia = rod([10.4, -1, -26], [10, -1, -4.4], (length) => [[0, 4.6], [length * 0.5, 4.8, 1], [length * 0.82, 7.4, 1], [length, 9.4]]);
  const fibula = rod([20.6, -3, -26], [19.2, -3, -9], (length) => [[0, 1.8], [length * 0.7, 1.9, 1], [length, 2.8]]);
  out.push(X(fibula.paths, "bone", { inner: L(G.circleOf(fibula.F, 0.01, 1.8, P), { tone: "faint" }) }));
  out.push(X(tibia.paths, "bone", { inner: L(G.circleOf(tibia.F, 0.01, 4.6, P), { tone: "faint" }) }));
  out.push(X(menisci.paths, "cartilage"));
  return out.join("");
}

function patella() {
  const out = [];
  out.push(tube([[10, 8.6, 30], [10, 9.2, 22], [10, 9.6, 14]], (t) => 3 - 0.6 * t, "tendon"));
  out.push(X(G.sphereOf([10, 9.4, 10], 4.4, P), "bone"));
  out.push(tube([[10, 9.4, 5], [10, 7.6, -4], [10.2, 6.2, -12]], (t) => 2 - 0.4 * t, "tendon"));
  return out.join("");
}

function neckAndTroch() {
  const out = [];
  const neck = rod(NECK_FROM, HEAD, (length) => [[0, 5.4], [length * 0.45, 4, 1], [length, 4.9]]);
  out.push(X(neck.paths, "bone"));
  out.push(X(G.sphereOf(TROCH, TROCH_R, P), "bone"));
  out.push(X(G.sphereOf([24.6, 1.4, 85.6], 3.4, P), "bone"));
  return out.join("");
}

function ligaments() {
  const out = [];
  out.push(tube([[11.6, 4.2, 108], [12.4, 8.4, 96], [16, 7.6, 76]], (t) => 1.6 + 0.6 * t, "ligament"));
  out.push(tube([[10.8, 4.6, 107], [8, 9.6, 94], [7.4, 9.2, 76]], (t) => 1.4 + 0.6 * t, "ligament"));
  out.push(tube([[14.8, 4.6, 123], [6, 10.6, 106], [-10, 10.2, 92], [MID + 9, 6.4, 81]], 0.9, "ligament"));
  return out.join("");
}

const MEDIUS = [[-16, 6.4, 125], [-12, 6.6, 131], [-7, 6.8, 134.6], [-1.4, 7, 136.4], [4, 7, 135], [8.6, 6.8, 131.4], [11.6, 6.6, 126]].map((from, i) => ({ from, to: [23 + i * 0.35, 6 + (i % 2) * 0.6, 87.6 - i * 0.3] }));
const MINIMUS = [[-8, 5.8, 113], [-1.6, 6, 117], [5, 5.8, 115]].map((from, i) => ({ from, to: [19.6 + i * 0.6, 6.8, 83.4] }));

function abductors(set, options) {
  const bundles = set.map(({ from, to }) => muscleBundle(from, to, options)).sort((a, b) => a.depth - b.depth);
  return { bellies: bundles.map((b) => b.belly).join(""), tendons: bundles.map((b) => b.tendon).join("") };
}

function tfl() {
  const b = muscleBundle([15.6, 4.6, 121], [27, 5.4, 66], { r0: 1.8, rMax: 3.4, r1: 2, peak: 0.4, tendon: 0.04, ribs: 7 });
  return b.belly + b.tendon;
}

function itBand() {
  return tube([[27, 5.4, 67], [29.6, 5.6, 48], [27.4, 5, 26], [23.6, 3.6, 6], [20.6, 2.6, -8]], (t) => 1.9 - 0.5 * t, "tendon", { caps: true });
}

function vessels() {
  const out = [];
  out.push(tube([[-6.4, 12.4, 102], [-3.6, 13.4, 90], [1.2, 11.6, 62], [5.6, 9.4, 34], [8.2, 7.4, 20]], (t) => 1.5 - 0.3 * t, "vessel"));
  out.push(tube([[-1.6, 13.6, 102], [0.8, 14.2, 92], [3.4, 13, 80], [5.4, 12, 72]], (t) => 1 - 0.3 * t, "nerve"));
  return out.join("");
}

function vertebra(i) {
  const z = PIVOT[2] + DISC * 0.4 + i * (V_H + DISC);
  const r = 7 + i * 0.12;
  const out = [];
  const spine = rod([MID, -5.6, z + 4.6], [MID, -16, z + 2.6], (length) => [[0, 2.2], [length * 0.7, 1.8, 1], [length, 2.4]]);
  out.push(X(spine.paths, "bone"));
  for (const s of [-1, 1]) {
    const tp = rod([MID + s * 5.4, -2, z + 5], [MID + s * (14.6 - i * 0.4), -3.4, z + 5.6], (length) => [[0, 2.2], [length * 0.6, 1.6, 1], [length, 1.9]]);
    out.push(X(tp.paths, "bone"));
  }
  const body = rod([MID, 0, z], [MID, 0, z + V_H], (length) => [[0, r], [0.9, r + 0.5, 1], [length * 0.5, r - 0.7, 1], [length - 0.9, r + 0.5, 1], [length, r]]);
  out.push(X(body.paths, "bone", { inner: L(G.circleOf(body.F, length0(body), r - 0.6, P), { tone: "faint" }) }));
  if (i < LUMBAR) {
    const disc = rod([MID, 0, z - DISC], [MID, 0, z], (length) => [[0, r - 0.2], [length * 0.5, r + 0.4, 1], [length, r - 0.2]]);
    out.unshift(X(disc.paths, "cartilage"));
  }
  return out.join("");
}

const length0 = (body) => body.length * 0.5;

function sacrum() {
  const out = [];
  out.push(X(prism(SACRUM, -6, 6), "bone", { crease: "faint" }));
  const holes = [131, 123.4, 116, 109.4].map((z) => { const half = 3.8 + (z - 108) * 0.12; return ellipseOn(MID - half, z, 1.3, 1.6, 6, 16) + ellipseOn(MID + half, z, 1.3, 1.6, 6, 16); }).join("");
  out.push(L(holes, { tone: "lo" }));
  [2.6, 2.1, 1.6].forEach((r, i) => out.push(X(G.sphereOf([MID, 0, 100 - i * 4.2], r, P), "bone")));
  return out.join("");
}

const catmull = (points, per = 8) => {
  const out = [];
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n], p1 = points[i], p2 = points[(i + 1) % n], p3 = points[(i + 2) % n];
    for (let j = 0; j < per; j++) {
      const t = j / per, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((c) => 0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3)));
    }
  }
  return out;
};

const SKIN_Y = -2;
const SKIN = catmull([[18, 240], [22, 206], [24, 176], [20, 154], [32, 132], [40, 104], [42, 82], [39, 52], [33, 22], [28, 0], [24, -14], [20, -28], [2, -28], [-2, -12], [-6, 10], [-12, 38], [-16, 60], [-24, 72], [-38, 66], [-46, 54], [-54, 40], [-68, 34], [-84, 38], [-93, 62], [-99, 104], [-96, 130], [-86, 154], [-90, 178], [-90, 206], [-86, 240]], 8).map(([x, z]) => [Number(x.toFixed(2)), Number(z.toFixed(2))]);
const SKIN_W = SKIN.map(([, z]) => Number(Math.min(1, Math.max(0, (z - 146) / 22)).toFixed(3)));

const leanPoint = ([x, z], w, deg) => {
  const r = (deg * w * Math.PI) / 180;
  const dx = x - PIVOT[0], dz = z - PIVOT[2];
  return [PIVOT[0] + dx * Math.cos(r) + dz * Math.sin(r), PIVOT[2] - dx * Math.sin(r) + dz * Math.cos(r)];
};
const skinPath = (deg) => k.pathOf(SKIN.map((p, i) => leanPoint(p, SKIN_W[i], deg)).map(([x, z]) => k.iso([x, SKIN_Y, z], P)), true);

const leanMatrix = (deg) => {
  const o = k.iso(PIVOT, P);
  const ex = k.iso([PIVOT[0] + 10, PIVOT[1], PIVOT[2]], P);
  const ez = k.iso([PIVOT[0], PIVOT[1], PIVOT[2] + 10], P);
  const r = (deg * Math.PI) / 180;
  const rx = k.iso([PIVOT[0] + 10 * Math.cos(r), PIVOT[1], PIVOT[2] - 10 * Math.sin(r)], P);
  const rz = k.iso([PIVOT[0] + 10 * Math.sin(r), PIVOT[1], PIVOT[2] + 10 * Math.cos(r)], P);
  const A = [ex[0] - o[0], ez[0] - o[0], ex[1] - o[1], ez[1] - o[1]];
  const B = [rx[0] - o[0], rz[0] - o[0], rx[1] - o[1], rz[1] - o[1]];
  const det = A[0] * A[3] - A[1] * A[2];
  const inv = [A[3] / det, -A[1] / det, -A[2] / det, A[0] / det];
  const M = [B[0] * inv[0] + B[1] * inv[2], B[0] * inv[1] + B[1] * inv[3], B[2] * inv[0] + B[3] * inv[2], B[2] * inv[1] + B[3] * inv[3]];
  const e = o[0] - (M[0] * o[0] + M[1] * o[1]);
  const f = o[1] - (M[2] * o[0] + M[3] * o[1]);
  return `matrix(${M[0].toFixed(5)} ${M[2].toFixed(5)} ${M[1].toFixed(5)} ${M[3].toFixed(5)} ${e.toFixed(3)} ${f.toFixed(3)})`;
};

const CONTACT_Y = HEAD[1] + HEAD_R * 0.62;
const contactPath = () => ellipseOn(HEAD[0] + 0.6, HEAD[2] + 4.2, 4.4, 2.2, CONTACT_Y, 28);
const contactOpacity = (joint) => Math.max(0.12, Math.min(0.9, (joint - 1.4) / 1.4));
const activationOf = (abductor, rest) => Math.max(0, Math.min(1, 0.62 * (abductor / rest)));

const rest = stance(0);
const swing = swingFemur();
const medius = abductors(MEDIUS, { r0: 2.4, rMax: 4.6, r1: 1.4, peak: 0.38, ribs: 9, tendon: 0.2 });
const minimus = abductors(MINIMUS, { r0: 1.4, rMax: 2.8, r1: 1.1, peak: 0.45, ribs: 7, tendon: 0.26 });
const act = activationOf(rest.abductor, rest.abductor);
const spine = Array.from({ length: LUMBAR }, (_, i) => vertebra(i)).join("");

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "An anatomical model of the hip in single-leg stance, seen from the front. The pelvis balances on the cartilage-covered head of the stance femur. The lumbar spine and the trunk outline stand on the sacrum and carry 5/6 of body weight 10.5 cm medial to the hip; the gluteus medius fans from the outer iliac wing to the greater trochanter 5 cm lateral to it, with the gluteus minimus beneath and the tensor fasciae latae running into the iliotibial band. Leaning the trunk over the stance hip shortens the weight's lever: the abductors pale as they relax and the weight-bearing dome of the femoral head is loaded less.",
  body: [
    `<path class="iso-halo" d="${k.haloOf({ x: -2, y: -10, w: 26, d: 20, r: 10 }, FLOOR, 0.1, P)}" style="filter:blur(6px)"/>`,
    `<g class="tissue-skin"><g class="iso-solid"><path data-part="skin-fill" class="iso-fill" d="${skinPath(0)}"/><path data-part="skin-edge" class="iso-line iso-edge" data-tone="hi" d="${skinPath(0)}"/></g></g>`,
    swing.back,
    hemipelvis(-1),
    swing.head,
    acetabularRim(-1),
    sacrum(),
    `<g data-part="spine" transform="${leanMatrix(0)}">${spine}</g>`,
    X(prism(SYMPHYSIS, -3.6, 3.6), "cartilage"),
    hemipelvis(1),
    `<g data-part="minimus" ${activationAttrs(act)}>${minimus.bellies}</g>`,
    minimus.tendons,
    knee(),
    stanceFemur(),
    patella(),
    neckAndTroch(),
    femurHead(HEAD),
    `<path data-part="contact" d="${contactPath()}" style="fill:var(--anatomy-lit);stroke:none;filter:blur(1.4px);opacity:${contactOpacity(rest.joint).toFixed(3)}"/>`,
    acetabularRim(1),
    ligaments(),
    `<g data-part="medius" ${activationAttrs(act)}>${medius.bellies}</g>`,
    medius.tendons,
    `<g data-part="tfl" ${activationAttrs(act * 0.7)}>${tfl()}</g>`,
    itBand(),
    vessels(),
  ],
});

const readoutOf = (s) => `lean ${s.lean.toFixed(1)}° · abd ${s.abductor.toFixed(2)} · hip ${s.joint.toFixed(2)} × BW`;

const live = `
const P = ${JSON.stringify(P)};
const HIP = ${JSON.stringify(HIP)};
const PIVOT = ${JSON.stringify(PIVOT)};
const SKIN = ${JSON.stringify(SKIN)};
const SKIN_W = ${JSON.stringify(SKIN_W)};
const SKIN_Y = ${SKIN_Y};
const REST = ${rest.abductor};
const stance = ${stance.toString()};
const k = { iso, pathOf };
const leanPoint = ${leanPoint.toString()};
const skinPath = ${skinPath.toString()};
const leanMatrix = ${leanMatrix.toString()};
const contactOpacity = ${contactOpacity.toString()};
const activationOf = ${activationOf.toString()};
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const spine = svg.querySelector('[data-part="spine"]');
const skinFill = svg.querySelector('[data-part="skin-fill"]');
const skinEdge = svg.querySelector('[data-part="skin-edge"]');
const contact = svg.querySelector('[data-part="contact"]');
const muscles = ["medius", "minimus", "tfl"].map((name) => ({ el: svg.querySelector('[data-part="' + name + '"]'), share: name === "tfl" ? 0.7 : 1 }));
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const MAX = HIP.leanMax;
let angle = 0, target = 0, drawn = null;
let frame = 0, last = 0, clock = 0, touring = !still.matches, visible = false, idleTimer = 0;
const tourAt = (t) => MAX * (0.5 - 0.5 * Math.cos((t / 9) * Math.PI * 2));
function draw() {
  if (drawn === angle) return;
  drawn = angle;
  const s = stance(angle);
  spine.setAttribute("transform", leanMatrix(angle));
  const d = skinPath(angle);
  skinFill.setAttribute("d", d);
  skinEdge.setAttribute("d", d);
  contact.style.opacity = contactOpacity(s.joint).toFixed(3);
  const a = activationOf(s.abductor, REST);
  for (const { el, share } of muscles) el.style.setProperty("--act", (a * share).toFixed(3));
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

const body = tissueStyle() + k.plateHtml({
  fig: "Fig 1",
  title: "Hip in single-leg stance",
  hint: "Hover to lean the trunk",
  readout: readoutOf(rest),
  keys: [
    { mark: "lit", label: "Weight-bearing dome of the femoral head: deeper as the hip joint force rises" },
    { mark: "red", label: "Gluteus medius, gluteus minimus and tensor fasciae latae: redder the harder they pull" },
    { mark: "raised", label: "Bone, cartilage, ligaments, the iliotibial band, femoral artery and nerve" },
  ],
  caption:
    "Standing on one leg, the pelvis is a lever balanced on the femoral head. Five sixths of body weight acts 10.5 cm medial to the hip, and the gluteus medius and minimus pull 5 cm lateral to it at 20° from vertical, so they must pull 1.75 × body weight and the joint carries their sum, about 2.5 × BW. Leaning the trunk 10° over the stance hip moves the weight 4.5 cm inward: the abductors drop to 1.0 × BW and the hip to 1.8 × BW. That is the lurch a patient with weak abductors or a painful hip makes; a cane in the opposite hand does the same from outside.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Trunk lean over the stance hip: arrow keys change it by one degree" aria-valuemin="0" aria-valuemax="${HIP.leanMax}" aria-valuenow="0">${svg}</div>`,
});

const name = theme === "light" ? "hip-abductors-light.html" : "hip-abductors.html";
writeFileSync(join(HERE, name), k.pageHtml({ title: "Hip in single-leg stance", theme, body, script: kitScript() + live }));
console.log("wrote", name);
