import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import * as G from "../../kit/lathe.mjs";
import { kitScript } from "../../scripts/inline-kit.mjs";
import * as M from "./model.mjs";
import { makeLeg } from "./leg.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 620;
const HEIGHT = 420;
const DECK = 22;
const ROLL = 66;
const ROLL_R = 7;
const BELT_Y = 19;
const RAIL = { x: -76, w: 152, z: 4, h: 17 };
const POSTS = [-50, 50];
const GY = -34;
const BEAM_Z = 158;
const CONSOLE = { x: 90, y: -16, w: 30, d: 30, r: 3 };
const CONSOLE_H = 30;
const DIAL = [105, -1];
const DIAL_R = 10.5;
const DIAL_TOP = CONSOLE_H + 3;
const SPAN = Math.PI * 1.5;
const FULL = 1.5;
const MARK = 12;
const HIP0 = M.MEAN_HIP + DECK;

const P = k.fitProjection(
  [[-80, -40, 0], [80, 28, 0], [-80, 28, 0], [122, 16, 0], [122, -18, 0], [-58, GY, BEAM_Z + 9], [58, GY, BEAM_Z + 9], [0, 0, HIP0 + 30]],
  WIDTH,
  HEIGHT,
  { pad: 28, azimuth: 60 },
);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const X = [1, 0, 0];
const Y = [0, 1, 0];
const Z = [0, 0, 1];
const sideFrame = (y) => G.frameOf([0, y, 0], Y, X, Z);

function gantry() {
  const out = [];
  for (const x of POSTS) {
    const foot = { x: x - 11, y: GY - 11, w: 22, d: 22, r: 3 };
    out.push(`<path class="iso-halo" d="${k.haloOf(foot, 0, 3, P)}"/>`);
    out.push(S(k.slabOf(foot, 0, 3.2, P, 4, 0.6), { tone: "lo" }));
    out.push(D(k.corners(foot, 3.4).map(([px, py]) => at([px, py, 3.2])), { size: 0.5 }));
    out.push(S(k.slabOf({ x: x - 4, y: GY - 4, w: 8, d: 8, r: 1.2 }, 3.2, BEAM_Z - 3.2, P, 3, 0.4), { tone: "mid" }));
    out.push(L(k.sideSeam({ x: x - 4, y: GY - 4, w: 8, d: 8, r: 1.2 }, 14, P, 3), { tone: "faint" }));
    out.push(S(k.slabOf({ x: x - 5, y: GY - 5, w: 10, d: 10, r: 1.4 }, 10, 3, P, 3, 0.4), { tone: "mid" }));
  }
  const beam = { x: POSTS[0] - 8, y: GY - 5, w: POSTS[1] - POSTS[0] + 16, d: 10, r: 1.6 };
  out.push(S(k.slabOf(beam, BEAM_Z, 9, P, 3, 0.6), { tone: "mid" }));
  out.push(L(k.lineOnTop([beam.x, GY], [beam.x + beam.w, GY], BEAM_Z + 9, P), { tone: "faint" }));
  out.push(D([-42, -20, 20, 42].map((x) => at([x, GY + 2.6, BEAM_Z + 9])), { size: 0.45 }));
  for (const x of POSTS) out.push(S(k.slabOf({ x: x - 6, y: GY - 6, w: 12, d: 12, r: 1.6 }, BEAM_Z - 6, 6, P, 3, 0.4), { tone: "mid" }));
  const stop = { x: -12, y: GY - 4, w: 24, d: 8, r: 1.2 };
  out.push(S(k.slabOf(stop, HIP0 + 6, 4, P, 3, 0.4), { tone: "mid" }));
  for (const x of [-8, 8]) out.push(S(k.cylinder(x, GY, 1.5, HIP0 + 10, BEAM_Z - HIP0 - 10, P, 16), { tone: "mid", crease: "none" }));
  out.push(D([-8, 8].map((x) => at([x, GY + 3, HIP0 + 10])), { size: 0.4 }));
  return out.join("");
}

function carriage() {
  const out = [];
  const z = HIP0 + 20;
  const block = { x: -12, y: GY - 5, w: 24, d: 10, r: 2 };
  out.push(S(k.slabOf(block, z, 14, P, 4, 0.6), { tone: "mid" }));
  for (const x of [-8, 8]) {
    out.push(S(k.cylinder(x, GY, 2.6, z + 14, 2, P, 20), { tone: "mid" }));
    out.push(S(k.cylinder(x, GY, 1.5, z + 16, 6, P, 16), { tone: "mid", crease: "none" }));
  }
  out.push(D([[-8, GY + 5, z + 3.5], [8, GY + 5, z + 3.5], [-8, GY + 5, z + 10.5], [8, GY + 5, z + 10.5]].map(at), { size: 0.45 }));
  out.push(S(k.slabOf({ x: -3.5, y: GY + 5, w: 7, d: 25.6, r: 1.2 }, z + 4, 6, P, 3, 0.4), { tone: "mid" }));
  out.push(D([at([0, -14, z + 10]), at([0, -24, z + 10])], { size: 0.45 }));
  const H = [0, 0, HIP0];
  const F = G.frameOf([0, -9.2, 0], Y, X, Z);
  const ilium = [[-15, HIP0 + 7], [-8, HIP0 - 4.5], [5, HIP0 - 5], [12.5, HIP0 + 2], [12, HIP0 + 14], [5, HIP0 + 28], [-6, HIP0 + 29], [-15.5, HIP0 + 19]];
  out.push(S(G.prismOf(F, ilium, 0, 3, P), { tone: "hi" }));
  out.push(L(G.circleOf(G.frameOf([0, -6.2, HIP0 + 18], Y, X, Z), 0, 2.4, P, 20), { tone: "faint" }));
  out.push(D([at([-8, -6.2, HIP0 + 20]), at([6, -6.2, HIP0 + 22])], { size: 0.45 }));
  const cup = G.frameOf([H[0], 0, H[2]], Y, X, Z);
  out.push(S(G.ringBand(-6.2, -4.6, 5.7, 7.6, cup, P), { tone: "hi" }));
  out.push(S(k.slabOf({ x: -3.5, y: -9.2, w: 7, d: 3, r: 0.8 }, z + 4, 6, P, 3, 0.3), { tone: "mid" }));
  return out.join("");
}

function belt() {
  const out = [];
  const plan = { x: RAIL.x, y: -26, w: RAIL.w, d: 52, r: 4 };
  out.push(`<path class="iso-halo" d="${k.haloOf(plan, 0, 4, P)}"/>`);
  const feet = [[-66, -22], [66, -22], [-66, 22], [66, 22]].sort((a, b) => k.depthOf([...a, 0], P) - k.depthOf([...b, 0], P));
  for (const [x, y] of feet) {
    if (y > 0) continue;
    out.push(S(k.cylinder(x, y, 4.6, 0, 1.4, P, 20), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 3.4, 1.4, 2.6, P, 20), { tone: "mid" }));
  }
  const back = { x: RAIL.x, y: -25, w: RAIL.w, d: 5, r: 1.2 };
  out.push(S(k.slabOf(back, RAIL.z, RAIL.h, P, 3, 0.5), { tone: "mid" }));
  const BF = G.frameOf([-ROLL, -BELT_Y, DECK - ROLL_R], Y, X, Z);
  const loop = G.prismOf(BF, G.stadium(ROLL_R, ROLL_R, ROLL * 2, 40), 0, BELT_Y * 2, P);
  out.push(S(loop, { tone: "lo", crease: "faint" }));
  for (const y of [BELT_Y - 2.2, -BELT_Y + 2.2]) out.push(k.fadeLineSvg([at([-ROLL, y, DECK]), at([ROLL, y, DECK])], { fade: [18, 18], tone: "faint" }));
  return out.join("");
}

function marks(offset) {
  const list = [];
  const first = Math.ceil((-ROLL - offset) / MARK);
  for (let i = first; ; i++) {
    const x = i * MARK + offset;
    if (x > ROLL) break;
    const edge = Math.min(x + ROLL, ROLL - x);
    const alpha = Math.max(0, Math.min(1, (edge - 2) / 22));
    const e = alpha * alpha * (3 - 2 * alpha);
    if (e > 0.02) list.push({ d: k.lineOnTop([x, -BELT_Y + 2.2], [x, BELT_Y - 2.2], DECK, P), alpha: e });
  }
  return k.fadedSvg(list, { tone: "faint" });
}

function front() {
  const out = [];
  const rail = { x: RAIL.x, y: 20, w: RAIL.w, d: 5, r: 1.2 };
  for (const [x, y] of [[-66, 22], [66, 22]]) {
    out.push(S(k.cylinder(x, y, 4.6, 0, 1.4, P, 20), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 3.4, 1.4, 2.6, P, 20), { tone: "mid" }));
  }
  out.push(S(k.slabOf(rail, RAIL.z, RAIL.h, P, 3, 0.5), { tone: "mid", inner: L(k.sideSeam(rail, 9, P, 3), { tone: "faint" }) }));
  for (const x of [-ROLL, ROLL]) {
    const F = G.frameOf([x, 0, DECK - ROLL_R], Y, X, Z);
    out.push(S(G.disc(25, 26.4, 3.2, F, P, { steps: 24 }), { tone: "mid" }));
    out.push(L(G.circleOf(F, 26.4, 1.3, P, 16), { tone: "lo" }));
  }
  const strip = { x: -58, y: 20.8, w: 116, d: 3.4, r: 0.6 };
  out.push(S(k.slabOf(strip, RAIL.z + RAIL.h, 0.5, P, 2), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 2, strip.x + strip.w - 2, 4, 5, strip.y + 0.2, RAIL.z + RAIL.h + 0.5, [1.2, 2.4], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  const LF = G.frameOf([0, 25, 0], Y, X, Z);
  const label = [[-36, 7], [0, 7], [0, 17], [-36, 17]];
  out.push(S(G.prismOf(LF, label, 0, 0.6, P), { tone: "lo", crease: "none" }));
  out.push(k.faceTextSvg(k.sideMatrix([-33.5, 25.6], 13.4, P, "left"), "FORCE PLATE 1", { size: 2.6, tone: "mid" }));
  for (const [x, w] of [[-33.5, 22], [-33.5, 14]]) out.push(L(k.segment([x, 25.6, 10.4 - (w === 14 ? 1.6 : 0)], [x + w, 25.6, 10.4 - (w === 14 ? 1.6 : 0)], P), { tone: "lo", free: true }));
  out.push(D([at([-34.6, 25.6, 15.6]), at([-1.4, 25.6, 15.6]), at([-34.6, 25.6, 8.4]), at([-1.4, 25.6, 8.4])], { size: 0.45 }));
  const CF = G.frameOf([0, 25, 0], Y, X, Z);
  out.push(S(G.prismOf(CF, [[40, 7], [50, 7], [50, 15], [40, 15]], 0, 3, P), { tone: "mid" }));
  out.push(S(G.disc(28, 30, 2, G.frameOf([45, 0, 11], Y, X, Z), P, { steps: 20 }), { tone: "mid" }));
  return out.join("");
}

function console_() {
  const out = [];
  out.push(`<path class="iso-halo" d="${k.haloOf(CONSOLE, 0, 3, P)}"/>`);
  for (const [x, y] of k.corners(CONSOLE, 4).sort((a, b) => k.depthOf([...a, 0], P) - k.depthOf([...b, 0], P))) out.push(S(k.cylinder(x, y, 2.4, 0, 2, P, 16), { tone: "lo" }));
  out.push(S(k.slabOf(CONSOLE, 2, CONSOLE_H - 2, P, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(CONSOLE, 8, P, 4), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(CONSOLE, 2.4), CONSOLE_H, P, 4), { tone: "lo" }));
  out.push(D(k.corners(CONSOLE, 4.4).map(([x, y]) => at([x, y, CONSOLE_H])), { size: 0.45 }));
  const [x, y] = DIAL;
  out.push(S(k.cylinder(x, y, DIAL_R + 1.4, CONSOLE_H, 1.6, P, 56), { tone: "mid" }));
  out.push(S(k.cylinder(x, y, DIAL_R, CONSOLE_H + 1.6, 1.4, P, 56, 0.5), { tone: "hi", crease: "lo" }));
  const ticks = k.radialTicks(x, y, DIAL_R - 1.4, 15, 5, DIAL_TOP, [1, 2.2], P, -SPAN / 2, SPAN);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(L(k.ring(x, y, 1.3, DIAL_TOP, P, 16), { tone: "mid" }));
  out.push(L(k.ring(x, y, DIAL_R - 1.4, DIAL_TOP, P, 56), { tone: "faint" }));
  out.push(k.faceTextSvg(k.topMatrix([x, y + 5.6], DIAL_TOP, P, "x"), "× BW", { size: 2, tone: "lo", anchor: "middle" }));
  const knob = [CONSOLE.x + CONSOLE.w - 5, CONSOLE.y + CONSOLE.d - 5];
  out.push(S(k.cylinder(knob[0], knob[1], 2.6, CONSOLE_H, 3, P, 20), { tone: "mid" }));
  out.push(L(k.knurl(knob[0], knob[1], 2.6, CONSOLE_H, CONSOLE_H + 3, 16, P), { tone: "lo" }));
  const port = G.frameOf([CONSOLE.x + 8, 0, 8], Y, X, Z);
  out.push(S(G.disc(CONSOLE.y + CONSOLE.d, CONSOLE.y + CONSOLE.d + 2, 2, port, P, { steps: 20 }), { tone: "mid" }));
  return out.join("");
}

function cable() {
  const from = at([45, 30, 11]);
  const to = at([CONSOLE.x + 8, CONSOLE.y + CONSOLE.d + 2, 8]);
  const via = [at([45, 33, 1.5]), at([66, 33, 0.5]), at([CONSOLE.x + 8, 33, 0.5]), at([CONSOLE.x + 8, 21, 2.5])];
  return k.wireSvg(from, to, { via, tone: "lo", size: 1 });
}

const needleAt = (force) => {
  const angle = -SPAN / 2 + (Math.min(force, FULL) / FULL) * SPAN;
  const [x, y] = DIAL;
  return k.lineOnTop([x - Math.sin(angle) * 2.6, y + Math.cos(angle) * 2.6], [x + Math.sin(angle) * (DIAL_R - 2), y - Math.cos(angle) * (DIAL_R - 2)], DIAL_TOP + 0.2, P);
};

const LEG = makeLeg(k, G, P, { deck: DECK });
const pose0 = M.poseAt(0.3);
const offset0 = 0;
const readoutOf = (pose) => `${Math.round(pose.t * 100)}% · ${pose.phase.name} · ${pose.force.toFixed(2)} × BW`;

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "An articulated model of a left leg, femur, patella, tibia, fibula, heel, ankle and the five rays of the foot, pinned at the hip to a carriage that rides up and down a gantry, walking on an instrumented treadmill. A force plate under the belt drives a dial reading the vertical ground reaction force in body weights. The leg runs through one gait cycle: 60% stance with the foot on the belt, 40% swing.",
  body: [
    gantry(),
    belt(),
    `<g data-part="marks">${marks(offset0)}</g>`,
    `<g data-part="carriage" transform="${k.translateAlong(P, [0, 0, pose0.bob])}">${carriage()}</g>`,
    `<g data-part="leg">${LEG.legSvg(pose0)}</g>`,
    front(),
    cable(),
    console_(),
    `<path data-part="needle" class="iso-line" data-tone="lit" data-free="start" d="${needleAt(pose0.force)}" style="stroke-width:1.1"/>`,
  ],
});

const DATA = { P, deck: DECK, roll: ROLL, beltY: BELT_Y, mark: MARK, dial: DIAL, dialR: DIAL_R, dialTop: DIAL_TOP, span: SPAN, full: FULL, belt: M.BELT, cycle: M.CYCLE_S, phases: M.PHASES };
const strip = (file) => readFileSync(file, "utf8").replace(/^import .*$/gm, "").replace(/^export /gm, "");
const latheSource = strip(join(HERE, "..", "..", "kit", "lathe.mjs"));
const latheScript = `const G = (() => {${latheSource}\nreturn { viewOf, frameAlong, frameOf, solidOf, sphereOf, prismOf, disc, circleOf, arcOf, dot3, add3, sub3, mul3, unit3, len3 };})();\n`;
const modelScript = `const M = (() => {${strip(join(HERE, "model.mjs"))}\nreturn { poseAt, BELT, CYCLE_S, PHASES };})();\n`;
const legScript = strip(join(HERE, "leg.mjs"));
const live = `
const D = ${JSON.stringify(DATA)};
const P = D.P;
const K = { iso, solidSvg, lineSvg, haloOf };
const LEG = makeLeg(K, G, P, { deck: D.deck });
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const leg = svg.querySelector('[data-part="leg"]');
const carriage = svg.querySelector('[data-part="carriage"]');
const marksEl = svg.querySelector('[data-part="marks"]');
const needle = svg.querySelector('[data-part="needle"]');
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const marks = ${marks.toString()};
const needleAt = ${needleAt.toString()};
const ROLL = D.roll, BELT_Y = D.beltY, MARK = D.mark, DECK = D.deck, DIAL = D.dial, DIAL_R = D.dialR, DIAL_TOP = D.dialTop, SPAN = D.span, FULL = D.full;
const k = { lineOnTop, fadedSvg };
const SLOW = 2;
let t = 0.3, target = 0.3, travel = 0, frame = 0, last = 0, touring = !still.matches, visible = false, idle = 0, needleF = M.poseAt(t).force;
const wrap = (v) => ((v % 1) + 1) % 1;
const near = (v) => ((v % 1) + 1.5) % 1 - 0.5;
function draw() {
  const pose = M.poseAt(t);
  leg.innerHTML = LEG.legSvg(pose);
  carriage.setAttribute("transform", translateAlong(P, [0, 0, pose.bob]));
  const offset = ((-travel * D.belt * D.cycle) % MARK + MARK) % MARK;
  marksEl.innerHTML = marks(offset);
  needle.setAttribute("d", needleAt(needleF));
  const text = Math.round(pose.t * 100) + "% · " + pose.phase.name + " · " + pose.force.toFixed(2) + " × BW";
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(Math.round(pose.t * 100)));
  stage.setAttribute("aria-valuetext", text);
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  let step;
  if (touring) step = dt / (D.cycle * SLOW);
  else step = still.matches ? near(target - t) : near(target - t) * (1 - Math.exp(-dt / 0.22));
  t = wrap(t + step);
  travel += step;
  const want = M.poseAt(t).force;
  needleF += still.matches ? want - needleF : (want - needleF) * (1 - Math.exp(-dt / 0.06));
  draw();
  const settled = !touring && Math.abs(near(target - t)) < 1e-4 && Math.abs(want - needleF) < 1e-3;
  frame = visible && !settled ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const steer = (next) => { touring = false; target = wrap(next); clearTimeout(idle); idle = setTimeout(() => { touring = !still.matches; run(); }, 3600); run(); };
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
stage.addEventListener("pointermove", (event) => {
  const box = svg.getBoundingClientRect();
  steer(Math.min(0.999, Math.max(0, ((event.clientX - box.left) / box.width - 0.1) / 0.8)));
});
stage.addEventListener("pointerleave", () => steer(target));
stage.addEventListener("keydown", (event) => {
  const starts = D.phases.map((phase) => phase.at);
  const here = starts.reduce((best, at, index) => (at <= wrap(target) + 1e-6 ? index : best), 0);
  let to = null;
  if (event.key === "ArrowRight" || event.key === "ArrowUp") to = starts[(here + 1) % starts.length];
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") to = starts[Math.abs(wrap(target) - starts[here]) > 1e-6 ? here : (here - 1 + starts.length) % starts.length];
  if (event.key === "Home") to = 0;
  if (to === null) return;
  event.preventDefault();
  steer(to + 0.001);
});
window.__gait = { set: (v) => { touring = false; t = target = wrap(v); needleF = M.poseAt(t).force; draw(); } };
draw();
`;

const body = k.plateHtml({
  fig: "Fig 1",
  title: "Gait cycle",
  hint: "Hover to scrub the stride · ← → phases",
  readout: readoutOf(pose0),
  keys: [
    { mark: "lit", label: "Needle: vertical ground reaction force from the plate under the belt, 0 to 1.5 × body weight" },
    { mark: "raised", label: "Leg model: femur, patella, tibia, fibula, talus, calcaneus, midfoot and five rays" },
    { mark: "edge", label: "Carriage: the hip rides up and down with the body's centre of mass" },
  ],
  caption: `One stride of normal walking, left leg, at half speed. Stance is 60% of the cycle and swing 40%; the eight phases are Perry's. Joint angles follow typical sagittal-plane curves (hip about 30° flexion at heel strike to 10° extension in terminal stance, knee 5° → 18° → 4° → 63° in swing, ankle 7° plantarflexion after heel strike, 10° dorsiflexion before heel off and 18° plantarflexion at toe off). The force trace is the double hump of a ground reaction force: about 1.15 × body weight after loading, 0.8 in midstance as the body vaults over the foot, 1.1 again at push-off, and zero in swing. The hip rises and falls about 3 cm as the body vaults over each foot, highest in midstance, lowest in double support.`,
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Gait cycle: arrow keys step through the eight phases" aria-valuemin="0" aria-valuemax="100" aria-valuenow="30">${svg}</div>`,
});

const name = theme === "light" ? "gait-cycle-light.html" : "gait-cycle.html";
writeFileSync(join(HERE, name), k.pageHtml({ title: "Gait cycle", theme, body, script: kitScript() + latheScript + modelScript + legScript + live }));
console.log("wrote", name);
