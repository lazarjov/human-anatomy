export const MASS = 75;
export const GRAVITY = 9.81;
export const WEIGHT = MASS * GRAVITY;
export const UNIT = 0.005;
export const CYCLE = 4.4;

const g = GRAVITY;
export const START = 0.7;
const DIP = 0.65;
const UNWEIGHT = 0.36;
const PUSH = 0.36;
const RISE = 0.3;
const HOLD = 0.88;
const SPEED = 2.6;
const LAND_STIFF = 7;
const LAND_DAMP = 1;
const LAND_RISE = 0.08;
const LAND_SINK = 0.2;
const STEP = 0.0002;
const SAMPLE = 0.001;

const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
function pushBw(u, lift) {
  return (1 + lift * smooth(u / RISE) * (1 - 0.25 * smooth((u - RISE) / (HOLD - RISE)))) * (1 - smooth((u - HOLD) / (1 - HOLD)));
}

const sinkAt = (age) => -LAND_SINK * smooth(age / 0.14) * (1 - smooth((age - 0.3) / 0.7));

function unweightBw(u) {
  return 1 - DIP * Math.sin(Math.PI * u) ** 2;
}

function launch(lift) {
  let v = 0;
  const n = 4000;
  for (let i = 0; i < n; i++) v += g * (unweightBw((i + 0.5) / n) - 1) * (UNWEIGHT / n);
  for (let i = 0; i < n; i++) v += g * (pushBw((i + 0.5) / n, lift) - 1) * (PUSH / n);
  return v;
}

function liftFor(speed) {
  let lo = 0, hi = 6;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (launch(mid) < speed) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export const LIFT = liftFor(SPEED);
export const TAKEOFF = START + UNWEIGHT + PUSH;

function contactBw(t) {
  if (t < START) return 1;
  if (t < START + UNWEIGHT) return unweightBw((t - START) / UNWEIGHT);
  if (t < TAKEOFF) return pushBw((t - START - UNWEIGHT) / PUSH, LIFT);
  return 0;
}

function simulate() {
  const count = Math.round(CYCLE / SAMPLE);
  const s = new Float64Array(count + 1);
  const v = new Float64Array(count + 1);
  const f = new Float64Array(count + 1);
  let ps = 0, pv = 0, t = 0, mode = "push", off = null, land = null;
  const per = Math.round(SAMPLE / STEP);
  const w = LAND_STIFF;
  const accel = (time, x, rate) => {
    if (mode === "push") return g * (contactBw(time) - 1);
    if (mode === "fly") return -g;
    const r = smooth((time - land.t) / LAND_RISE);
    return -g + r * (g - w * w * (x - sinkAt(time - land.t)) - 2 * LAND_DAMP * w * rate);
  };
  for (let i = 0; i <= count; i++) {
    const a = accel(t, ps, pv);
    s[i] = ps;
    v[i] = pv;
    f[i] = Math.max(0, (g + a) / g);
    for (let j = 0; j < per; j++) {
      const k1 = accel(t, ps, pv);
      const mv = pv + (k1 * STEP) / 2;
      const ms = ps + (pv * STEP) / 2;
      const k2 = accel(t + STEP / 2, ms, mv);
      ps += mv * STEP;
      pv += k2 * STEP;
      t += STEP;
      if (mode === "push" && t >= TAKEOFF - 1e-9) {
        mode = "fly";
        off = { t, s: ps, v: pv };
      } else if (mode === "fly" && pv < 0 && ps <= off.s) {
        mode = "land";
        land = { t, s: ps, v: pv };
      }
    }
  }
  return { s, v, f, off, land };
}

const SIM = simulate();
export const TAKEOFF_AT = SIM.off.s;
export const TAKEOFF_V = SIM.off.v;
export const FLIGHT = SIM.land.t - SIM.off.t;
export const HEIGHT = (TAKEOFF_V * TAKEOFF_V) / (2 * g);
export const LAND = SIM.land.t;

function sample(table, t) {
  const x = Math.min(table.length - 1.000001, Math.max(0, t / SAMPLE));
  const i = Math.floor(x);
  const u = x - i;
  return table[i] * (1 - u) + table[i + 1] * u;
}

export function stateAt(time) {
  const t = ((time % CYCLE) + CYCLE) % CYCLE;
  const contact = t < TAKEOFF || t >= LAND;
  let s = sample(SIM.s, t);
  let v = sample(SIM.v, t);
  if (!contact) {
    const u = t - TAKEOFF;
    s = TAKEOFF_AT + TAKEOFF_V * u - (g * u * u) / 2;
    v = TAKEOFF_V - g * u;
  }
  const bw = contact ? sample(SIM.f, t) : 0;
  let phase = "quiet stance";
  if (!contact) phase = "flight";
  else if (t >= LAND) phase = v < 0 ? "landing" : Math.abs(s) > 0.004 || Math.abs(v) > 0.02 ? "recovery" : "quiet stance";
  else if (t >= START) phase = t < START + UNWEIGHT ? "unweighting" : v > 0 ? "propulsion" : "braking";
  return { t, s, v, bw, force: bw * WEIGHT, contact, phase };
}

function bottomOf() {
  for (let t = START + UNWEIGHT; t < TAKEOFF; t += 0.001) if (sample(SIM.v, t) >= 0) return t;
  return TAKEOFF;
}
export const BRAKE = START + UNWEIGHT * 0.62;
export const BOTTOM = bottomOf();

const envelope = (t, t0, t1, rise, fall) => smooth((t - t0) / rise) * (1 - smooth((t - t1) / fall));

export const MUSCLES = ["glute", "quad", "ham", "gastro", "soleus", "tibialis"];

export function activationAt(time) {
  const t = ((time % CYCLE) + CYCLE) % CYCLE;
  const unweight = envelope(t, START + 0.02, BRAKE - 0.06, 0.06, 0.06);
  const brake = envelope(t, BRAKE - 0.04, BOTTOM, 0.08, 0.06);
  const push = (lead, lag) => envelope(t, BOTTOM - 0.03 + lead, TAKEOFF - lag, 0.06, 0.1);
  const hold = envelope(t, BRAKE - 0.04, BOTTOM + 0.12, 0.08, 0.06);
  const preland = envelope(t, LAND - 0.12, LAND, 0.08, 0.02);
  const land = envelope(t, LAND - 0.01, LAND + 0.16, 0.025, 0.45);
  const quiet = 1 - envelope(t, START, LAND + 0.4, 0.05, 0.6);
  const level = (rest, values) => Math.min(1, Math.max(0.03, rest * quiet, ...values));
  return {
    glute: level(0.05, [0.55 * brake, 0.95 * push(0, 0.06), 0.25 * preland, 0.7 * land]),
    quad: level(0.06, [0.78 * brake, 0.97 * push(0.03, 0.05), 0.45 * preland, 1 * land]),
    ham: level(0.05, [0.35 * brake, 0.7 * push(0, 0.06), 0.3 * preland, 0.45 * land]),
    gastro: level(0.1, [0.45 * hold, 1 * push(0.1, 0), 0.55 * preland, 0.85 * land]),
    soleus: level(0.2, [0.5 * hold, 0.95 * push(0.08, 0), 0.5 * preland, 0.9 * land]),
    tibialis: level(0.08, [0.35 * unweight, 0.15 * brake, 0.45 * envelope(t, TAKEOFF + 0.04, LAND - 0.02, 0.06, 0.05), 0.4 * land]),
  };
}

export function summary(samples = 8800) {
  let peak = 0, minBw = Infinity, landPeak = 0, deepest = 0, landDeep = 0;
  const marks = {};
  let prev = "";
  for (let i = 0; i < samples; i++) {
    const st = stateAt((i / samples) * CYCLE);
    if (st.t >= START && st.t < TAKEOFF) { peak = Math.max(peak, st.bw); deepest = Math.min(deepest, st.s); }
    if (st.phase === "unweighting") minBw = Math.min(minBw, st.bw);
    if (st.t >= LAND) { landPeak = Math.max(landPeak, st.bw); landDeep = Math.min(landDeep, st.s); }
    if (st.phase !== prev && !(st.phase in marks)) marks[st.phase] = st.t;
    prev = st.phase;
  }
  return { lift: LIFT, peak, minBw, landPeak, deepest, landDeep, takeoffAt: TAKEOFF_AT, takeoffV: TAKEOFF_V, height: HEIGHT, flight: FLIGHT, takeoff: TAKEOFF, land: LAND, marks };
}

export function trace(count = 240) {
  return Array.from({ length: count + 1 }, (_, i) => {
    const t = (i / count) * CYCLE;
    return [t, stateAt(t).bw];
  });
}
