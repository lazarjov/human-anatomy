import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import * as G from "../../kit/lathe.mjs";
import * as T from "../../kit/tube.mjs";
import { tissueStyle } from "../../kit/tissue.mjs";
import { kitScript } from "../../scripts/inline-kit.mjs";
import * as M from "./model.mjs";
import { makeFoot } from "./parts.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const KIT = join(HERE, "..", "..", "kit");
const theme = process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 600;
const HEIGHT = 420;
const START = 3;

const P = k.fitProjection(
  [[24, -46, 0], [24, 44, 0], [-276, -46, 0], [-276, 44, 0], [-40, -47, 172], [-40, 35, 172], [-81, -6, 172], [1, -6, 172]],
  WIDTH,
  HEIGHT,
  { pad: 28, azimuth: 40 },
);
const F = makeFoot(k, G, T, P, M);

const pose0 = M.poseOf(START);
const act0 = M.activationOf(START);
const pct = (v) => Math.round(v * 100);
const readoutOf = (pose, act) => `eversion ${pose.alpha >= 0 ? "+" : "−"}${Math.abs(pose.alpha).toFixed(1)}° · arch ${pose.drop >= 0 ? "−" : "+"}${Math.abs(pose.drop).toFixed(1)} mm · TP ${pct(act.tp)}% · ${pose.label}`;

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "An anatomical model of a left foot and the lower third of the leg, seen from behind and the inner side, inside a faint outline of the skin. The bones of the foot, the tibia and fibula, articular cartilage, the plantar fascia, the spring and deltoid ligaments, and the tibialis posterior, peroneus longus and abductor hallucis muscles with their tendons are shown, with the posterior tibial artery and tibial nerve behind the inner ankle. As the heel everts, the arch lowers, the tibialis posterior deepens in colour as it works harder, and the contact print on the floor moves to the inner side of the foot.",
  body: [
    `<path class="iso-halo" d="${k.haloOf({ x: -250, y: -40, w: 260, d: 76, r: 30 }, 0, 0.1, P)}" style="filter:blur(10px)"/>`,
    `<g data-part="print">${F.print(START)}</g>`,
    `<g data-part="skin">${F.skin(START)}</g>`,
    `<g data-part="back">${F.back(START)}</g>`,
    `<g data-part="toes">${F.toes()}</g>`,
    `<g data-part="fibula">${F.fibula()}</g>`,
    `<g data-part="foot">${F.foot(START)}</g>`,
    `<g data-part="tibia">${F.tibia()}</g>`,
    `<g data-part="soft">${F.soft(START)}</g>`,
  ],
});

const stripped = (file) => readFileSync(join(KIT, file), "utf8").replace(/^import .*$/gm, "").replace(/^export /gm, "");
const namesOf = (file) => [...readFileSync(join(KIT, file), "utf8").matchAll(/^export (?:function|const) (\w+)/gm)].map((m) => m[1]);
const latheScript = `const G = (() => {${stripped("lathe.mjs")}\nreturn { ${namesOf("lathe.mjs").join(", ")} };})();\n`;
const tubeScript = `const T = (() => {${stripped("tube.mjs")}\nreturn { ${namesOf("tube.mjs").join(", ")} };})();\n`;
const modelScript = `const M = (() => {${readFileSync(join(HERE, "model.mjs"), "utf8").replace(/^export /gm, "")}\nreturn { poseOf, cellsOf, pressureAt, blobsOf, activationOf, levelOf, medialShare, RANGE, STOPS, MAT };})();\n`;
const partsScript = readFileSync(join(HERE, "parts.mjs"), "utf8").replace(/^export /gm, "");

const live = `
const P = ${JSON.stringify(P)};
const K = { iso, pathOf, solidSvg, lineSvg, dotsSvg, fadedSvg };
const PARTS = makeFoot(K, G, T, P, M);
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const $ = (sel) => svg.querySelector(sel);
const el = { foot: $('[data-part="foot"]'), back: $('[data-part="back"]'), soft: $('[data-part="soft"]'), skin: $('[data-part="skin"]'), print: $('[data-part="print"]') };
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const [LO, HI] = M.RANGE;
const STOPS = M.STOPS;
const pct = (v) => Math.round(v * 100);
const say = (pose, act) => "eversion " + (pose.alpha >= 0 ? "+" : "\\u2212") + Math.abs(pose.alpha).toFixed(1) + "\\u00b0 \\u00b7 arch " + (pose.drop >= 0 ? "\\u2212" : "+") + Math.abs(pose.drop).toFixed(1) + " mm \\u00b7 TP " + pct(act.tp) + "% \\u00b7 " + pose.label;
let alpha = ${START}, target = alpha, drawn = alpha, kind = -1;
let frame = 0, last = 0, clock = 0, touring = !still.matches, visible = false, idleTimer = 0;
const TOUR = [3, 11, 3, -5];
const tourAt = (t) => TOUR[Math.floor(t / 2.6) % TOUR.length];
function draw() {
  if (Math.abs(alpha - drawn) < (alpha === target ? 0.005 : 0.08)) return;
  drawn = alpha;
  el.foot.innerHTML = PARTS.foot(alpha);
  el.back.innerHTML = PARTS.back(alpha);
  el.soft.innerHTML = PARTS.soft(alpha);
  el.skin.innerHTML = PARTS.skin(alpha);
  el.print.innerHTML = PARTS.print(alpha);
  const pose = M.poseOf(alpha);
  const text = say(pose, M.activationOf(alpha));
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
const fromPointer = (event) => {
  const box = svg.getBoundingClientRect();
  const share = clamp(((event.clientX - box.left) / box.width - 0.2) / 0.6, 0, 1);
  steer(LO + share * (HI - LO));
};
stage.addEventListener("pointermove", fromPointer);
stage.addEventListener("pointerdown", fromPointer);
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
`;

const CSS = `
.iso-stage:focus{outline:none}
.iso-stage:focus-visible{outline:1px solid var(--anatomy-muted);outline-offset:6px}
`;

const body =
  tissueStyle() +
  `<style>${CSS}</style>` +
  k.plateHtml({
    fig: "Fig 1",
    title: "Subtalar pronation",
    hint: "Hover to evert the heel",
    readout: readoutOf(pose0, act0),
    keys: [
      { mark: "red", label: "Muscles: deeper red, more activity (TP = tibialis posterior)" },
      { mark: "raised", label: "Bones, with blue-white articular cartilage; pearly tendons and ligaments" },
      { mark: "flat", label: "Contact print: darker where the floor takes more load" },
    ],
    caption:
      "A left foot and the lower third of the leg, from behind and the inner side. Rolling the heel from 5° of inversion to 12° of eversion lowers the arch: the navicular drops about 0.9 mm per degree, 3–5 mm at a neutral 3° and past 10 mm when overpronated, stretching the spring ligament and plantar fascia, while the tibia turns inward about 0.7° per degree. Tibialis posterior, whose tendon loops behind the inner ankle to the navicular, works harder to hold the arch (from 15% to 95% of its range here, as EMG studies of flat-arched feet report), helped by abductor hallucis; the contact print moves from the outer border to the inner arch and the big toe.",
    body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Foot pronation: arrow keys step between supinated, neutral and overpronated" aria-valuemin="${M.RANGE[0]}" aria-valuemax="${M.RANGE[1]}" aria-valuenow="${START}" aria-valuetext="neutral, rearfoot eversion ${START} degrees" style="touch-action:pan-y">${svg}</div>`,
  });

const name = theme === "light" ? "foot-pronation-light.html" : "foot-pronation.html";
writeFileSync(join(HERE, name), k.pageHtml({ title: "Foot pronation", theme, body, script: kitScript() + latheScript + tubeScript + modelScript + partsScript + live }));
console.log("wrote", name);
