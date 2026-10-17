import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import * as G from "../../kit/lathe.mjs";
import { tissueStyle, activationAttrs } from "../../kit/tissue.mjs";
import { kitScript } from "../../scripts/inline-kit.mjs";
import * as M from "./model.mjs";
import { makeParts } from "./parts.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 600;
const HEIGHT = 470;
const TIBIA = [-20, 2];
const TIBIA_Z = 88;
const TIBIA_LEN = 290;
const PLATEAU = TIBIA_Z + TIBIA_LEN;
const FEMUR_TOP = 462;

const top = M.poseOf(M.RANGE[1]);
const P = k.fitProjection(
  [[-110, -40, 0], [215, 30, 0], [-110, 40, 0], [-30 + top.shift[0], 0, FEMUR_TOP + top.shift[2]], [-80, 50, FEMUR_TOP], [30 + top.shift[0], -50, FEMUR_TOP + top.shift[2]], [-90 + top.shift[0], 0, 300 + top.shift[2]]],
  WIDTH,
  HEIGHT,
  { pad: 22, azimuth: 70 },
);

const parts = makeParts(k, G, P, M);
const { T, bone, band, along, ellipsoid, closed } = parts;
const V = G.viewOf(P);

const muscleProfile = (length, peak, at, start, end) => {
  const out = [[0, 0], [0, start, 1]];
  for (let i = 1; i < 14; i++) {
    const t = i / 14;
    const rise = t < at ? Math.sin((Math.PI / 2) * (t / at)) : Math.cos((Math.PI / 2) * ((t - at) / (1 - at)));
    const floor = t < at ? start : end;
    out.push([length * t, floor + (peak - floor) * rise ** 0.9, 1]);
  }
  out.push([length, end, 1], [length, 0]);
  return out;
};

const radiusAt = (profile, s) => {
  for (let i = 1; i < profile.length; i++) {
    const [s0, r0] = profile[i - 1];
    const [s1, r1] = profile[i];
    if (s <= s1 && s1 > s0) return r0 + ((r1 - r0) * (s - s0)) / (s1 - s0);
  }
  return profile[profile.length - 1][1];
};

function fibresOf(F, length, profile, count, { phase = 0, twist = 0, from = 0.08, to = 0.92 } = {}) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const t = phase + (i / count) * Math.PI * 2;
    const facing = G.dot3(G.radialOf(F, t + twist * 0.5), V);
    if (facing < 0.12) continue;
    const alpha = Math.min(1, (facing - 0.12) / 0.4) * 0.8;
    const points = [];
    for (let j = 0; j <= 18; j++) {
      const s = length * (from + ((to - from) * j) / 18);
      points.push(k.iso(G.pointOf(F, s, radiusAt(profile, s) * 0.995, t + twist * (j / 18)), P));
    }
    out.push(`<g opacity="${alpha.toFixed(2)}">${k.fadeLineSvg(points, { fade: [10, 10], tone: "mid" })}</g>`);
  }
  return out.join("");
}

function muscle(from, to, peak, at, start, end, fibres = 14, options = {}) {
  const { F, length } = along(from, to);
  const profile = muscleProfile(length, peak, at, start, end);
  return T(G.lathe(profile, F, P, { steps: 56, smooth: { rows: 3 } }), "muscle") + `<g class="tissue-muscle">${fibresOf(F, length, profile, fibres, options)}</g>`;
}

const ACTIVE = (pose) => Math.min(1, pose.force / M.poseOf(0).force);

function floor() {
  const fore = { x: 92, y: -46, w: 120, d: 92, r: 40 };
  const heel = { x: -102, y: -34, w: 70, d: 66, r: 30 };
  return `<path class="iso-halo" d="${k.haloOf(fore, 0, 0.1, P)}"/><g data-part="heel-shadow"><path class="iso-halo" d="${k.haloOf(heel, 0, 0.1, P)}"/></g>`;
}

function skinLeg() {
  const { F, length } = along([-36, 0, 52], [-26, 2, FEMUR_TOP]);
  const profile = [[0, 0.01], [3, 22, 1], [30, 25, 1], [90, 30, 1], [160, 43, 1], [220, 51, 1], [262, 50, 1], [320, 43, 1], [360, 45, 1], [length, 52, 1]];
  return T(G.lathe([...profile, [length, 0]], F, P, { steps: 72, smooth: { rows: 3 } }), "skin");
}

function legBack() {
  const out = [];
  out.push(bone([-26, -21, 54], [-32, -23, 356], [[0, 0.01], [3, 7.5, 1], [14, 9.4, 1], [34, 5.6, 1], [120, 4.4, 1], [230, 4.8, 1], [272, 7.6, 1], [288, 10.6, 1], [298, 9.6, 1], [302, 0.01, 1]], 32));
  out.push(`<g data-part="calf-deep" ${activationAttrs(1)}>`);
  out.push(muscle([-44, -6, 348], [-67, -2, 150], 22, 0.42, 6, 5.4, 16, { phase: 0.2 }));
  out.push(muscle([-42, -17, 400], [-66, -7, 242], 15, 0.38, 4.5, 3.4, 12, { phase: 0.4 }));
  out.push(`</g>`);
  out.push(`<g data-part="shin-muscle" ${activationAttrs(0.08)}>`);
  out.push(muscle([-4, -15, 340], [6, -7, 176], 9.6, 0.36, 4, 2.4, 9, { phase: 0.1 }));
  out.push(`</g>`);
  out.push(band([6, -7, 178], [14, 4, 98], 2.4, 2.8, "tendon"));
  return out.join("");
}

function legFront() {
  const out = [];
  const T0 = G.frameOf([TIBIA[0], TIBIA[1], TIBIA_Z], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
  const tibia = [[0, 0], [0, 17, 1], [4, 20.5, 1], [14, 18.5, 1], [40, 14, 1], [80, 12.4, 1], [200, 12.6, 1], [236, 15, 1], [262, 23, 1], [278, 29, 1], [TIBIA_LEN, 30.5], [TIBIA_LEN, 0]];
  out.push(T(G.lathe(tibia, T0, P, { steps: 64, smooth: { rows: 3 } }), "bone"));
  out.push(`<g class="tissue-bone">${k.fadedSvg(G.ribsOf(T0, 60, 220, 12.6, 5, P, { fade: [0.4, 0.9], phase: 0.3 }).map(({ d, alpha }) => ({ d: d, alpha: alpha * 0.35 })), { tone: "faint" })}</g>`);
  out.push(bone([-17, 15, 94], [-17, 17, 70], [[0, 0.01], [2, 5, 1], [8, 7.6, 1], [16, 7, 1], [24, 0.01, 1]]));
  out.push(T(G.lathe(closed(ellipsoid(22, 6.4)), along([-4, 3, 346], [-2, 3, 324]).F, P, { steps: 28, smooth: { rows: 3 } }), "bone"));
  const cap = G.frameOf([TIBIA[0], TIBIA[1], PLATEAU], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
  out.push(T(G.disc(0, 2.2, 28.5, cap, P, { steps: 72 }), "cartilage"));
  out.push(T(G.ringBand(2.2, 6.4, 16, 30.5, cap, P, { steps: 96 }), "cartilage"));
  const femur = G.frameOf([-24, 2, PLATEAU + 6], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
  out.push(T(G.lathe([[0, 0], [0, 12, 1], [4, 26, 1], [14, 32, 1], [30, 27, 1], [52, 17, 1], [70, 14.4, 1], [FEMUR_TOP - PLATEAU - 6, 14.6, 1], [FEMUR_TOP - PLATEAU - 6, 0]], femur, P, { steps: 72, smooth: { rows: 3 } }), "bone"));
  out.push(T(G.lathe([[0, 0], [0, 13, 1], [4, 27, 1], [11, 31.4, 1], [11, 0]], femur, P, { steps: 72, smooth: { rows: 3 } }), "cartilage"));
  out.push(band([18, 3, 396], [0, 3, 340], 5.2, 4.4, "tendon"));
  out.push(T(G.sphereOf([19, 3, 405], 11.5, P), "bone"));
  out.push(`<g data-part="thigh" ${activationAttrs(0.05)}>`);
  out.push(muscle([4, 3, FEMUR_TOP], [18, 3, 414], 15, 0.25, 13, 5, 10, { phase: 0.3 }));
  out.push(muscle([-16, 24, FEMUR_TOP], [6, 16, 404], 16, 0.68, 9, 4, 10, { phase: 0.05 }));
  out.push(`</g>`);
  out.push(`<g data-part="calf-near" ${activationAttrs(1)}>`);
  out.push(muscle([-44, 19, 402], [-68, 6, 226], 18, 0.4, 5, 4.2, 14, { phase: 0.15 }));
  out.push(`</g>`);
  return out.join("");
}

const rest = M.poseOf(0);
const peak = M.poseOf(M.RANGE[1]);
const move = (pose) => k.translateAlong(P, pose.shift);
const CSS = `<style>.cord-edge,.cord-core{fill:none;stroke-linecap:round;stroke-linejoin:round}.cord-edge{stroke:var(--anatomy-hi);stroke-width:2.6px}.cord-core{stroke:var(--anatomy-paper);stroke-width:1.5px}</style>`;

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "An anatomical model of a right lower leg and foot, seen from the inner side, inside a faint outline of the skin. The tibia and fibula run from the knee, with its patella, cartilage and menisci, down to the ankle. Behind them the calf muscles, the two heads of the gastrocnemius over the soleus, narrow into the Achilles tendon, which inserts on the back of the heel bone. In front, tibialis anterior sends its tendon over the ankle to the inner foot. The tibial artery and nerve pass behind the inner ankle bone, the deltoid ligament fans from it to the foot, and the plantar fascia runs under the arch. As the heel rises the foot rolls on the ball of the foot and the calf muscles deepen in colour with the force they make.",
  body: [
    floor(),
    `<g data-part="leg-skin" transform="${move(rest)}">${skinLeg()}</g>`,
    `<g data-part="back" transform="${move(rest)}">${legBack()}</g>`,
    `<g data-part="tendon">${parts.tendonOf(rest)}</g>`,
    `<g data-part="cords">${parts.cordsOf(rest)}</g>`,
    `<g data-part="fascia">${parts.fasciaOf(0)}</g>`,
    `<g data-part="foot"><g data-key="0">${parts.footItems(0)}</g></g>`,
    `<g data-part="toes">${parts.skinToes()}${parts.toes()}</g>`,
    `<g data-part="front" transform="${move(rest)}">${legFront()}</g>`,
    `<g data-part="crossings">${parts.crossings(rest)}</g>`,
  ],
});

const readoutOf = (pose) => `heel ${(pose.lift / 10).toFixed(1)} cm · ${pose.theta.toFixed(0)}° · Achilles ${Math.round(pose.force)} N (${pose.ratio.toFixed(2)}× BW)`;

const strip = (file) => readFileSync(join(HERE, file), "utf8").replace(/^export /gm, "");
const latheSource = readFileSync(join(HERE, "..", "..", "kit", "lathe.mjs"), "utf8").replace(/^import .*$/m, "").replace(/^export /gm, "");
const latheScript = `const G = (() => {${latheSource}\nreturn { viewOf, scaleOf, frameAlong, frameOf, pointOf, radialOf, lathe, disc, ringBand, sphereOf, circleOf, arcOf, angleToward, dot3, add3, sub3, mul3, unit3, cross3, len3, lerp3 };})();\n`;
const modelScript = `const M = (() => {${strip("model.mjs")}\nreturn { BW, SOLE, RANGE, BALL, ANKLE, rollOf, poseOf, thetaForLift, FULL_SCALE };})();\n`;
const partsScript = strip("parts.mjs");

const live = `
const P = ${JSON.stringify(P)};
const K = { iso, solidSvg, lineSvg, translateAlong };
const PARTS = makeParts(K, G, P, M);
const readoutOf = ${readoutOf.toString()};
const ACTIVE = ${ACTIVE.toString()};
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const part = (name) => svg.querySelector('[data-part="' + name + '"]');
const foot = part("foot"), tendon = part("tendon"), back = part("back"), front = part("front"), skin = part("leg-skin"), fascia = part("fascia"), cords = part("cords"), crossings = part("crossings"), heelShadow = part("heel-shadow");
const calves = [part("calf-deep"), part("calf-near")];
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const [LOW, HIGH] = M.RANGE;
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
  skin.setAttribute("transform", move);
  const index = Math.round(theta / STEP);
  const group = keyOf(index);
  if (group !== shown) { group.style.display = ""; shown.style.display = "none"; shown = group; }
  foot.setAttribute("transform", rollMatrix(theta - index * STEP));
  tendon.innerHTML = PARTS.tendonOf(pose);
  fascia.innerHTML = PARTS.fasciaOf(theta);
  cords.innerHTML = PARTS.cordsOf(pose);
  crossings.innerHTML = PARTS.crossings(pose);
  heelShadow.setAttribute("opacity", Math.max(0, 1 - pose.lift / 40).toFixed(3));
  const act = ACTIVE(pose).toFixed(3);
  for (const calf of calves) calf.style.setProperty("--act", act);
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

const body = tissueStyle() + CSS + k.plateHtml({
  fig: "Fig 1",
  title: "Heel raise",
  hint: "Move up and down to raise the heel",
  readout: readoutOf(rest),
  keys: [
    { mark: "red", label: "Gastrocnemius and soleus: deeper red the harder they pull" },
    { mark: "lit", label: "Achilles tendon to the heel bone" },
    { mark: "raised", label: "Bones, cartilage and ligaments of the leg and foot" },
  ],
  caption:
    `The foot is a second-class lever. It pivots on the ball of the foot, the body's weight, 70 kg on one leg, comes down through the ankle 14 cm behind it, and the calf muscles pull up on the heel through the Achilles tendon 5 cm behind the ankle. So the tendon pulls 140 / 50 = ${rest.ratio.toFixed(1)} times body weight, about ${Math.round(rest.force / 10) * 10} N, the moment the heel leaves the floor. As the heel rises the ankle rolls forward over the ball of the foot and the tendon's moment arm grows, so at ${M.RANGE[1]}° and ${(peak.lift / 10).toFixed(1)} cm the pull falls to ${peak.ratio.toFixed(1)} times body weight, and the gastrocnemius and soleus pale with it. The ankle joint between tibia and talus carries body weight plus that pull, ${(rest.joint / M.BW).toFixed(1)} times body weight at heel-off.`,
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Heel raise: arrow keys raise and lower the heel in 5 degree steps" aria-valuemin="0" aria-valuemax="30" aria-valuenow="0">${svg}</div>`,
});

const name = theme === "light" ? "calf-raise-light.html" : "calf-raise.html";
writeFileSync(join(HERE, name), k.pageHtml({ title: "Heel raise", theme, body, script: kitScript() + latheScript + modelScript + partsScript + live }));
console.log("wrote", name);
