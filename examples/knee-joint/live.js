const DATA = __DATA__;
const P = DATA.P;
const knee = makeKnee({ solidSvg, lineSvg, dotsSvg, fadeLineSvg, iso, pathOf }, GL, TB, P, MD);
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const kneeG = svg.querySelector('[data-part="knee"]');
const skinG = svg.querySelector('[data-part="skin"]');
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
let angle = DATA.REST, target = DATA.REST, drawn = DATA.REST;
let frame = 0, last = 0, clock = Math.acos(clamp((46 - DATA.REST) / 41, -1, 1)) / (Math.PI * 2) * 9, touring = !still.matches, visible = false, idleTimer = 0;
const tourAt = (t) => 46 - 41 * Math.cos((t / 9) * Math.PI * 2);
const say = (l) => Math.round(l.angle) + "° flexion · quad " + Math.round(l.quad) + " N · PF " + Math.round(l.pf) + " N";
function draw(force) {
  if (!force && Math.abs(angle - drawn) < 0.08) return;
  drawn = angle;
  skinG.innerHTML = knee.skin(angle);
  kneeG.innerHTML = knee.knee(angle);
  const text = say(MD.loads(angle));
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(Math.round(angle)));
  stage.setAttribute("aria-valuetext", text);
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  if (touring) { clock += dt; target = tourAt(clock); }
  angle = still.matches ? target : angle + (target - angle) * (1 - Math.exp(-dt / 0.3));
  if (Math.abs(target - angle) < 0.02) angle = target;
  draw(false);
  const settled = !touring && angle === target;
  frame = visible && !settled ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const steer = (next) => {
  touring = false;
  target = clamp(next, 0, DATA.MAX);
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => { touring = !still.matches; clock = Math.acos(clamp((46 - angle) / 41, -1, 1)) / (Math.PI * 2) * 9; run(); }, 4000);
  run();
};
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
stage.addEventListener("pointermove", (event) => {
  const box = svg.getBoundingClientRect();
  const sx = clamp(((event.clientX - box.left) / box.width - 0.2) / 0.6, 0, 1);
  const sy = clamp(((event.clientY - box.top) / box.height - 0.2) / 0.6, 0, 1);
  steer(DATA.MAX * (1 - sx) * 0.5 + DATA.MAX * sy * 0.5);
});
stage.addEventListener("keydown", (event) => {
  let to = null;
  if (event.key === "ArrowRight" || event.key === "ArrowUp") to = Math.round(target) - 5;
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") to = Math.round(target) + 5;
  if (event.key === "Home") to = 0;
  if (event.key === "End") to = DATA.MAX;
  if (to === null) return;
  event.preventDefault();
  steer(to);
});
window.__knee = { set: (v) => { touring = false; target = angle = clamp(v, 0, DATA.MAX); draw(true); } };
draw(true);
