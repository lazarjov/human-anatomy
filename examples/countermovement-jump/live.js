const D = __DATA__;
const P = D.P;
const kit = { solidSvg, lineSvg, iso, dotsSvg };
const body = makeBody(kit, G, P, M, T, TB);
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const part = (name) => svg.querySelector(`[data-part="${name}"]`);
const far = part("far"), near = part("near"), trunk = part("trunk"), shadow = part("shadow");
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const TRACE = [0.45, 3.25];
const MARKS = [0, 0.7, 1.06, 1.19, M.TAKEOFF + 0.18, M.LAND + 0.06, 2.6];
let time = 0, target = 0, frame = 0, last = 0, visible = false, touring = !still.matches, idle = 0, lastText = "", lastPhase = "";
function draw() {
  const st = M.stateAt(time);
  const pose = body.poseAt(st.s, st.contact);
  const fig = body.figureAt(pose, M.activationAt(st.t));
  far.innerHTML = fig.far;
  trunk.innerHTML = fig.trunk;
  near.innerHTML = fig.near;
  const lift = Math.max(0, pose.lift);
  const spread = 1 + lift / 160;
  const o = D.SHADOW_ORIGIN;
  shadow.setAttribute("transform", `translate(${o[0]} ${o[1]}) scale(${spread.toFixed(3)}) translate(${-o[0]} ${-o[1]})`);
  shadow.style.opacity = (1 / (1 + lift / 22)).toFixed(3);
  const v = (st.v >= 0 ? "+" : "−") + Math.abs(st.v).toFixed(2) + " m/s";
  let text;
  if (st.phase === "flight") text = "flight · " + v + " · h " + (M.HEIGHT * 100).toFixed(1) + " cm · " + Math.round(M.FLIGHT * 1000) + " ms";
  else text = st.phase + " · " + st.bw.toFixed(2) + " BW · " + v + " · knee " + Math.round(pose.flex) + "°";
  if (text !== lastText) { readout.textContent = text; lastText = text; }
  if (st.phase !== lastPhase) {
    lastPhase = st.phase;
    stage.setAttribute("aria-valuenow", st.t.toFixed(2));
    stage.setAttribute("aria-valuetext", st.phase === "flight" ? "flight, jump height " + (M.HEIGHT * 100).toFixed(1) + " centimetres" : st.phase);
  }
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (touring) { time = (time + dt * D.RATE) % M.CYCLE; target = time; }
  else if (calm) time = target;
  else {
    time += (target - time) * (1 - Math.exp(-dt / 0.18));
    if (Math.abs(target - time) < 0.0005) time = target;
  }
  draw();
  const settled = !touring && time === target;
  frame = visible && !settled ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const rest = () => { clearTimeout(idle); idle = setTimeout(() => { if (!still.matches) { touring = true; run(); } }, 3600); };
const steer = (to) => { touring = false; target = Math.max(0, Math.min(M.CYCLE - 0.001, to)); rest(); run(); };
const jump = () => { clearTimeout(idle); time = 0.45; target = time; touring = !still.matches; if (still.matches) { target = M.TAKEOFF + M.FLIGHT / 2; time = target; } run(); draw(); };
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
stage.addEventListener("pointermove", (event) => {
  if (event.pointerType === "touch") return;
  const box = svg.getBoundingClientRect();
  const share = Math.min(1, Math.max(0, ((event.clientX - box.left) / box.width - 0.12) / 0.76));
  steer(TRACE[0] + share * (TRACE[1] - TRACE[0]));
});
stage.addEventListener("pointerleave", () => rest());
stage.addEventListener("click", jump);
stage.addEventListener("keydown", (event) => {
  if (event.key === " " || event.key === "Enter") { event.preventDefault(); jump(); return; }
  const here = MARKS.reduce((best, m, i) => (Math.abs(m - target) < Math.abs(MARKS[best] - target) ? i : best), 0);
  let to = null;
  if (event.key === "ArrowRight" || event.key === "ArrowUp") to = Math.min(MARKS.length - 1, here + 1);
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") to = Math.max(0, here - 1);
  if (event.key === "Home") to = 0;
  if (event.key === "End") to = MARKS.length - 1;
  if (to === null) return;
  event.preventDefault();
  steer(MARKS[to]);
});
if (still.matches) touring = false;
draw();
