export const UNIT = 0.0025;
export const G_ACC = 9.81;
export const MASS = 10;
export const H = 196;
export const CONDYLE_R = 11;
export const PLATEAU = 11.2;
export const CUFF = 136;
export const EYE = 151;
export const CORD = 8;
export const PATELLA_R = 13.9;
export const TUBEROSITY = [30, 7.4];
export const CLEVIS = [-48, 0, H + 13];
export const MAX = 90;

const rad = (deg) => (deg * Math.PI) / 180;

export const axisOf = (deg) => {
  const t = rad(deg);
  return { d: [Math.cos(t), 0, -Math.sin(t)], n: [Math.sin(t), 0, Math.cos(t)] };
};

export const tibiaPoint = (deg, s, along = 0, side = 0) => {
  const { d, n } = axisOf(deg);
  return [d[0] * s + n[0] * along, side, H + d[2] * s + n[2] * along];
};

const frameAt = (phi) => {
  const out = [Math.sin(phi), 0, Math.cos(phi)];
  const down = [Math.cos(phi), 0, -Math.sin(phi)];
  const centre = [out[0] * PATELLA_R, 0, H + out[2] * PATELLA_R];
  return { centre, out, down };
};

const bottomAt = (phi) => {
  const { centre, out, down } = frameAt(phi);
  return [centre[0] + down[0] * 8.2 + out[0] * 0.6, 0, centre[2] + down[2] * 8.2 + out[2] * 0.6];
};

const gap = (phi, deg) => {
  const b = bottomAt(phi);
  const t = tibiaPoint(deg, TUBEROSITY[0], TUBEROSITY[1]);
  return Math.hypot(b[0] - t[0], b[2] - t[2]);
};

export const TENDON = gap(rad(-14), 0);

export const patellaAngle = (deg) => {
  let lo = rad(-40);
  let hi = rad(130);
  for (let i = 0; i < 48; i++) {
    const mid = (lo + hi) / 2;
    if (gap(mid, deg) > TENDON) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
};

export const patellaFrame = (deg) => frameAt(patellaAngle(deg));

export const poles = (deg) => {
  const { centre, out, down } = patellaFrame(deg);
  const at = (k, j) => [centre[0] + down[0] * k + out[0] * j, 0, centre[2] + down[2] * k + out[2] * j];
  return { top: at(-8.6, 1.2), bottom: at(8.2, 0.6) };
};

export const eyeOf = (deg) => tibiaPoint(deg, EYE, 0);

export const momentArm = (deg) => 0.034 + 0.0135 * Math.exp(-(((deg - 25) / 40) ** 2));

const unit = (v) => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};

export function loads(deg) {
  const angle = Math.min(MAX, Math.max(0, deg));
  const weight = MASS * G_ACC;
  const eye = eyeOf(angle);
  const lever = eye[0] * UNIT;
  const moment = weight * lever;
  const arm = momentArm(angle);
  const quad = Math.max(0, moment) / arm;
  const { top, bottom } = poles(angle);
  const u1 = unit([CLEVIS[0] - top[0], 0, CLEVIS[2] - top[2]]);
  const tub = tibiaPoint(angle, TUBEROSITY[0], TUBEROSITY[1]);
  const u2 = unit([tub[0] - bottom[0], 0, tub[2] - bottom[2]]);
  const pf = quad * Math.hypot(u1[0] + u2[0], u1[2] + u2[2]);
  return { angle, weight, lever, moment, arm, quad, pf };
}
