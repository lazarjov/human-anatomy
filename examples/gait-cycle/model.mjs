export const LEG = { thigh: 44, shank: 42, ankle: 6.5, heel: 7.5, ball: 18.5, toes: 7, ground: 0 };

export const STANCE = 0.6;
export const TILT = -8;
export const CYCLE_S = 1.1;

export const PHASES = [
  { at: 0, name: "initial contact" },
  { at: 0.02, name: "loading response" },
  { at: 0.12, name: "midstance" },
  { at: 0.31, name: "terminal stance" },
  { at: 0.5, name: "pre-swing" },
  { at: 0.62, name: "initial swing" },
  { at: 0.75, name: "mid swing" },
  { at: 0.87, name: "terminal swing" },
];

export const HIP = [[0, 30], [0.1, 27], [0.3, 9], [0.5, -10], [0.6, 0], [0.7, 19], [0.8, 30], [0.88, 33], [1, 30]];
export const KNEE = [[0, 5], [0.04, 10], [0.14, 18], [0.4, 4], [0.5, 10], [0.6, 40], [0.71, 63], [0.8, 53], [0.9, 17], [0.97, 4], [1, 5]];
export const ANKLE = [[0, 0], [0.07, -7], [0.25, 5], [0.48, 10], [0.56, 0], [0.62, -18], [0.67, -10], [0.74, 0], [0.82, 4], [0.9, 2], [1, 0]];
export const FORCE = [[0, 0], [0.03, 0.55], [0.08, 1.02], [0.13, 1.15], [0.2, 0.96], [0.3, 0.79], [0.4, 0.93], [0.47, 1.11], [0.52, 1], [0.57, 0.42], [0.6, 0]];

const wrap = (t) => ((t % 1) + 1) % 1;

export const MUSCLES = [
  { id: "tibialisAnterior", name: "tibialis anterior", bursts: [[-0.06, 0.03, 0.15, 0.9], [0.56, 0.7, 1, 0.45]] },
  { id: "vastusLateralis", name: "vastus lateralis", bursts: [[-0.08, 0.06, 0.2, 0.85]] },
  { id: "vastusMedialis", name: "vastus medialis", bursts: [[-0.08, 0.06, 0.2, 0.8]] },
  { id: "rectusFemoris", name: "rectus femoris", bursts: [[-0.05, 0.05, 0.14, 0.4], [0.48, 0.58, 0.66, 0.5]] },
  { id: "gluteusMaximus", name: "gluteus maximus", bursts: [[-0.1, 0.03, 0.16, 0.7]] },
  { id: "gluteusMedius", name: "gluteus medius", bursts: [[-0.06, 0.1, 0.34, 0.8]] },
  { id: "bicepsFemoris", name: "biceps femoris", bursts: [[0.76, 0.92, 1.06, 0.85]] },
  { id: "semitendinosus", name: "semitendinosus", bursts: [[0.76, 0.92, 1.06, 0.8]] },
  { id: "gastrocnemius", name: "gastrocnemius", bursts: [[0.1, 0.42, 0.54, 0.9]] },
  { id: "soleus", name: "soleus", bursts: [[0.07, 0.42, 0.54, 1]] },
  { id: "fibularisLongus", name: "fibularis longus", bursts: [[0.14, 0.4, 0.52, 0.6]] },
  { id: "iliopsoas", name: "iliopsoas", bursts: [[0.48, 0.6, 0.72, 0.75]] },
];

function burstAt([a, m, b, peak], x) {
  for (const shift of [-1, 0, 1]) {
    const y = x + shift;
    if (y > a && y < b) {
      const s = y < m ? (y - a) / (m - a) : (b - y) / (b - m);
      const e = Math.sin((Math.PI / 2) * s);
      return peak * e * e;
    }
  }
  return 0;
}

export function activationAt(t) {
  const x = wrap(t);
  const out = {};
  for (const muscle of MUSCLES) out[muscle.id] = Math.min(1, muscle.bursts.reduce((sum, burst) => sum + burstAt(burst, x), 0));
  return out;
}

export function leadingMuscle(act) {
  let best = null;
  for (const muscle of MUSCLES) if (!best || act[muscle.id] > act[best.id]) best = muscle;
  return best && act[best.id] > 0.15 ? best.name : "none";
}

function periodic(keys, t) {
  const n = keys.length - 1;
  const x = wrap(t);
  let i = 0;
  while (i < n - 1 && x >= keys[i + 1][0]) i++;
  const at = (j) => {
    const m = ((j % n) + n) % n;
    const lap = Math.floor(j / n);
    return [keys[m][0] + lap, keys[m][1]];
  };
  const [t0, y0] = at(i);
  const [t1, y1] = at(i + 1);
  const [tp, yp] = at(i - 1);
  const [tn, yn] = at(i + 2);
  const slope = (ta, ya, tb, yb, tc, yc) => {
    const d0 = (yb - ya) / (tb - ta);
    const d1 = (yc - yb) / (tc - tb);
    return d0 * d1 <= 0 ? 0 : (2 * d0 * d1) / (d0 + d1);
  };
  const m0 = slope(tp, yp, t0, y0, t1, y1);
  const m1 = slope(t0, y0, t1, y1, tn, yn);
  const h = t1 - t0;
  const s = (x - t0) / h;
  const s2 = s * s;
  const s3 = s2 * s;
  return (2 * s3 - 3 * s2 + 1) * y0 + (s3 - 2 * s2 + s) * h * m0 + (-2 * s3 + 3 * s2) * y1 + (s3 - s2) * h * m1;
}

function ramp(keys, t) {
  const x = wrap(t);
  if (x >= keys[keys.length - 1][0]) return 0;
  let i = 0;
  while (x >= keys[i + 1][0]) i++;
  const [t0, y0] = keys[i];
  const [t1, y1] = keys[i + 1];
  const s = (x - t0) / (t1 - t0);
  const e = s * s * (3 - 2 * s);
  return Math.max(0, y0 + (y1 - y0) * e);
}

export const anglesAt = (t) => ({ hip: periodic(HIP, t), knee: Math.max(0, periodic(KNEE, t)), ankle: periodic(ANKLE, t) });
export const forceAt = (t) => ramp(FORCE, t);
export const phaseAt = (t) => {
  const x = wrap(t);
  let index = 0;
  PHASES.forEach((phase, i) => {
    if (x >= phase.at) index = i;
  });
  return { index, name: PHASES[index].name, stance: x < STANCE };
};

const RAD = Math.PI / 180;
const add = (a, b, s) => [a[0] + b[0] * s, a[1] + b[1] * s];

const OFF = STANCE + 0.02;
const footAt = (t) => {
  const { hip, knee, ankle } = anglesAt(t);
  return (hip + TILT - knee + ankle) * RAD;
};
const BEND0 = Math.max(0, -footAt(OFF));
function bendAt(x) {
  const s = Math.min(1, (x - OFF) / 0.22);
  const e = s * s * (3 - 2 * s);
  const back = Math.max(0, (x - 0.9) / 0.1);
  return (BEND0 * (1 - e) + 0.4 * e) * (1 - back * back * (3 - 2 * back));
}

export function chainAt(t, hipZ = 0) {
  const { hip, knee, ankle } = anglesAt(t);
  const p1 = (hip + TILT) * RAD;
  const p2 = (hip + TILT - knee) * RAD;
  const footA = p2 + ankle * RAD;
  const H = [0, hipZ];
  const K = add(H, [Math.sin(p1), -Math.cos(p1)], LEG.thigh);
  const A = add(K, [Math.sin(p2), -Math.cos(p2)], LEG.shank);
  const f = [Math.cos(footA), Math.sin(footA)];
  const n = [-Math.sin(footA), Math.cos(footA)];
  const heel = add(add(A, f, -LEG.heel), n, -LEG.ankle);
  const ball = add(add(A, f, LEG.ball), n, -LEG.ankle);
  const x = wrap(t);
  const toeA = x < OFF ? Math.max(footA, 0) : footA + bendAt(x);
  const toe = add(ball, [Math.cos(toeA), Math.sin(toeA)], LEG.toes);
  return { H, K, A, heel, ball, toe, thighA: p1, shankA: p2, footA, toeA };
}

const lowOf = (c) => Math.min(c.heel[1], c.ball[1], c.toe[1]);

function stanceHeight(t) {
  return LEG.ground - lowOf(chainAt(t, 0));
}

const ease = (s) => s * s * (3 - 2 * s);
const BLEND = 0.1;

export function hipHeightAt(t) {
  const x = wrap(t);
  if (x < STANCE) return stanceHeight(x);
  const other = stanceHeight(x - 0.5);
  const a = stanceHeight(STANCE - 1e-6) - stanceHeight(STANCE - 0.5);
  const b = stanceHeight(0) - stanceHeight(0.5 - 1e-6);
  const s = (x - STANCE) / (1 - STANCE);
  const lead = 1 - ease(Math.min(1, (x - STANCE) / BLEND));
  const tail = ease(Math.max(0, (x - (1 - BLEND)) / BLEND));
  return other + a * lead * (1 - s) + b * tail;
}

export const MEAN_HIP = (() => {
  let sum = 0;
  for (let i = 0; i < 200; i++) sum += hipHeightAt(i / 200);
  return sum / 200;
})();

export const poseAt = (t) => {
  const z = hipHeightAt(t);
  return { t: wrap(t), ...chainAt(t, z), bob: z - MEAN_HIP, force: forceAt(t), phase: phaseAt(t), angles: anglesAt(t), act: activationAt(t) };
};
