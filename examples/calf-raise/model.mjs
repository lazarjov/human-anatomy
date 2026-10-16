export const MASS = 70;
export const GRAVITY = 9.81;
export const BW = MASS * GRAVITY;
export const SOLE = 10;
export const RANGE = [0, 30];
export const BALL = [120, 0, 19];
export const ANKLE = [-20, 0, 70];
export const INSERTION = [-70, 0, 43];
export const HEEL = [-64, 0, 10];
export const JUNCTION = [-50, 0, 150];
export const FULL_SCALE = 2500;

const RAD = Math.PI / 180;

export function rollOf(theta) {
  const c = Math.cos(theta * RAD);
  const s = Math.sin(theta * RAD);
  return (p) => {
    const x = p[0] - BALL[0];
    const z = p[2] - BALL[2];
    return [BALL[0] + x * c + z * s, p[1], BALL[2] - x * s + z * c];
  };
}

export function poseOf(theta) {
  const roll = rollOf(theta);
  const ankle = roll(ANKLE);
  const insertion = roll(INSERTION);
  const heel = roll(HEEL);
  const shift = [ankle[0] - ANKLE[0], 0, ankle[2] - ANKLE[2]];
  const junction = [ankle[0] + JUNCTION[0], 0, ankle[2] + JUNCTION[2]];
  const line = [junction[0] - insertion[0], junction[2] - insertion[2]];
  const length = Math.hypot(line[0], line[1]);
  const along = [line[0] / length, line[1] / length];
  const arm = Math.abs((ankle[0] - insertion[0]) * along[1] - (ankle[2] - insertion[2]) * along[0]);
  const fore = BALL[0] - ankle[0];
  const force = (BW * fore) / arm;
  const joint = Math.hypot(force * along[0], BW + force * along[1]);
  return { theta, roll, ankle, insertion, heel, shift, junction, along, length, arm, fore, force, joint, lift: heel[2] - SOLE, ratio: force / BW };
}

export function thetaForLift(lift) {
  let low = RANGE[0];
  let high = RANGE[1];
  for (let step = 0; step < 40; step++) {
    const mid = (low + high) / 2;
    if (poseOf(mid).lift < lift) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}
