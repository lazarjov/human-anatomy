import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import * as G from "../../kit/lathe.mjs";
import * as T from "../../kit/tube.mjs";
import { tissueSvg, tissueStyle, activationAttrs } from "../../kit/tissue.mjs";
import { kitScript } from "../../scripts/inline-kit.mjs";
import * as M from "./model.mjs";
import { makeLeg } from "./leg.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 620;
const HEIGHT = 520;
const GROUND = 0;
const HIP0 = M.MEAN_HIP + GROUND;

const extent = [];
for (let i = 0; i < 40; i++) {
  const pose = M.poseAt(i / 40);
  for (const [x, z] of [pose.heel, pose.toe, pose.ball, pose.K]) extent.push([x, 0, z + GROUND], [x, 9, z + GROUND], [x, -9, z + GROUND]);
}
extent.push([-16, 0, HIP0 + 16], [14, 0, HIP0 + 16], [-16, 12, HIP0], [12, -12, HIP0], [-30, -10, 0], [30, 10, 0]);

const P = k.fitProjection(extent, WIDTH, HEIGHT, { pad: 26, azimuth: 72 });
const X = { ground: GROUND, tilt: M.TILT, tissueSvg, activationAttrs };
const LEG = makeLeg(k, G, T, P, X);
const pose0 = M.poseAt(0.3);
const pct = (pose) => Math.round(pose.t * 100);
const readoutOf = (pose) => `${pct(pose)}% · ${pose.phase.name} · ${pose.force.toFixed(2)} × BW · ${M.leadingMuscle(pose.act)}`;

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "An anatomical model of a left leg walking, seen from the outside: hip bone and sacrum, femur with its head in the acetabulum, patella, tibia and fibula, and the bones of the foot, with articular cartilage at the joints. Twelve muscles run from their origins to their insertions on tendons: gluteus maximus and medius, iliopsoas, rectus femoris, vastus lateralis and medialis, biceps femoris, semitendinosus, gastrocnemius, soleus, tibialis anterior and fibularis longus. The sciatic nerve and femoral artery run down the thigh, and a faint outline of skin surrounds the leg. Each muscle deepens from pink to red while it is active in the stride.",
  body: [`<g data-part="leg">${LEG.legSvg(pose0)}</g>`],
});

const exportsOf = (source) => [...source.matchAll(/^export (?:async )?(?:function|const|let) (\w+)/gm)].map((m) => m[1]);
const strip = (file) => readFileSync(file, "utf8").replace(/^import .*$/gm, "").replace(/^export /gm, "");
const moduleScript = (name, file) => {
  const source = readFileSync(file, "utf8");
  return `const ${name} = (() => {${strip(file)}\nreturn { ${exportsOf(source).join(", ")} };})();\n`;
};
const kitDir = join(HERE, "..", "..", "kit");
const libs = moduleScript("G", join(kitDir, "lathe.mjs")) + moduleScript("T", join(kitDir, "tube.mjs")) + moduleScript("TS", join(kitDir, "tissue.mjs")) + moduleScript("M", join(HERE, "model.mjs"));
const legScript = strip(join(HERE, "leg.mjs"));
const DATA = { P, ground: GROUND, tilt: M.TILT, cycle: M.CYCLE_S, phases: M.PHASES };
const live = `
const D = ${JSON.stringify(DATA)};
const P = D.P;
const K = { iso, solidSvg, lineSvg, haloOf, fadedSvg, fadeLineSvg };
const LEG = makeLeg(K, G, T, P, { ground: D.ground, tilt: D.tilt, tissueSvg: TS.tissueSvg, activationAttrs: TS.activationAttrs });
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const leg = svg.querySelector('[data-part="leg"]');
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const SLOW = 2;
const QUANT = 300;
const cache = new Map();
let t = 0.3, target = 0.3, frame = 0, last = 0, touring = !still.matches, visible = false, idle = 0, shown = -1;
const wrap = (v) => ((v % 1) + 1) % 1;
const near = (v) => ((v % 1) + 1.5) % 1 - 0.5;
function markup(index) {
  let html = cache.get(index);
  if (!html) {
    html = LEG.legSvg(M.poseAt(index / QUANT));
    if (cache.size > 60) cache.delete(cache.keys().next().value);
    cache.set(index, html);
  }
  return html;
}
function draw() {
  const index = Math.round(wrap(t) * QUANT) % QUANT;
  if (index !== shown) { leg.innerHTML = markup(index); shown = index; }
  const pose = M.poseAt(index / QUANT);
  const text = Math.round(pose.t * 100) + "% · " + pose.phase.name + " · " + pose.force.toFixed(2) + " × BW · " + M.leadingMuscle(pose.act);
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
  draw();
  const settled = !touring && Math.abs(near(target - t)) < 1e-4;
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
window.__gait = { set: (v) => { touring = false; t = target = wrap(v); draw(); } };
shown = Math.round(0.3 * QUANT);
draw();
`;

const PAGE_CSS = `<style>.iso .gait-contact{fill:var(--anatomy-lit)}.iso .gait-skin{opacity:.8}</style>`;

const body = k.plateHtml({
  fig: "Fig 1",
  title: "Gait cycle",
  hint: "Hover · ← → phases",
  readout: readoutOf(pose0),
  keys: [
    { mark: "red", label: "Muscles: pink at rest, deepening to red while active (typical EMG timing)" },
    { mark: "raised", label: "Bones, with bluish articular cartilage on the hip, knee and foot joints" },
    { mark: "dim", label: "Skin outline of the hip, thigh, leg and foot" },
    { mark: "lit", label: "Contact patch: grows with the vertical ground reaction force" },
  ],
  caption: `One stride of normal walking, left leg, at half speed. Stance is 60% of the cycle and swing 40%; the eight phases are Perry's. Joint angles follow typical sagittal-plane curves: hip about 30° flexion at heel strike to 10° extension in terminal stance, knee 5° → 18° → 4° → 63° in swing, ankle 7° plantarflexion after heel strike, 10° dorsiflexion before heel off and 18° plantarflexion at toe off. Muscle colour follows typical surface EMG timing (after Perry and Burnfield, and Winter): tibialis anterior lowers the forefoot after heel strike and lifts it again in swing; the vasti and gluteus maximus take the load in loading response; gluteus medius steadies the pelvis in early single support; soleus and gastrocnemius, with fibularis longus, control the shank over the foot and push off in terminal stance; iliopsoas and rectus femoris swing the thigh forward; and the hamstrings brake the swinging leg before the next contact. The vertical ground reaction force is a double hump: about 1.15 × body weight after loading, 0.8 in midstance, 1.1 at push-off and zero in swing. The hip rises and falls about 3 cm over each step.`,
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Gait cycle: arrow keys step through the eight phases" aria-valuemin="0" aria-valuemax="100" aria-valuenow="30">${svg}</div>`,
});

const name = theme === "light" ? "gait-cycle-light.html" : "gait-cycle.html";
writeFileSync(join(HERE, name), k.pageHtml({ title: "Gait cycle", theme, body: tissueStyle() + PAGE_CSS + body, script: kitScript() + libs + legScript + live }));
console.log("wrote", name);
