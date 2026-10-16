export const RANGE = [-6, 12];
export const STOPS = [-5, 3, 11];
export const CLASSES = ["supinated", "neutral", "overpronated"];
export const NEUTRAL = [0, 6];
export const DROP_LIMIT = 10;

export function poseOf(alpha) {
  const a = Math.min(RANGE[1], Math.max(RANGE[0], alpha));
  const drop = 0.9 * (a + 2.5);
  const tibia = 0.7 * a;
  const abduct = 0.35 * a;
  const kind = a < NEUTRAL[0] ? 0 : a > NEUTRAL[1] ? 2 : 1;
  return { alpha: a, drop, tibia, abduct, kind, label: CLASSES[kind], excessive: drop > DROP_LIMIT };
}

export const MAT = { x0: -266.4, x1: 8, y0: -56, y1: 56, px: 9.8, py: 9.333333333333334 };

export function cellsOf() {
  const cells = [];
  const cols = Math.round((MAT.x1 - MAT.x0) / MAT.px);
  const rows = Math.round((MAT.y1 - MAT.y0) / MAT.py);
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) cells.push({ i, j, x: MAT.x0 + (i + 0.5) * MAT.px, y: MAT.y0 + (j + 0.5) * MAT.py });
  return { cols, rows, cells };
}

const blob = (x, y, cx, cy, sx, sy) => Math.exp(-(((x - cx) / sx) ** 2) - ((y - cy) / sy) ** 2);

export function pressureAt(alpha, x, y) {
  const s = (Math.min(RANGE[1], Math.max(RANGE[0], alpha)) - RANGE[0]) / (RANGE[1] - RANGE[0]);
  const shift = -6 + 0.9 * alpha;
  let p = 1.0 * blob(x, y, -14, shift, 22, 18);
  p += (0.62 - 0.42 * s) * blob(x, y, -100, -26 + 4 * s, 34, 9);
  p += 1.05 * Math.max(0, (s - 0.4) / 0.6) ** 1.4 * blob(x, y, -110, 14, 34, 11);
  p += (0.5 + 0.45 * s) * blob(x, y, -205, 21, 12, 11);
  p += 0.55 * blob(x, y, -211, 5, 11, 9);
  p += (0.72 - 0.5 * s) * blob(x, y, -194, -21, 13, 10);
  p += (0.6 - 0.45 * s) * blob(x, y, -182, -33, 12, 9);
  p += (0.42 + 0.32 * s) * blob(x, y, -248, 22, 10, 9);
  p += 0.36 * blob(x, y, -246, 6, 7, 5);
  p += 0.32 * blob(x, y, -236, -9, 6, 5);
  p += (0.3 - 0.1 * s) * blob(x, y, -225, -22, 6, 5);
  p += (0.28 - 0.12 * s) * blob(x, y, -210, -36, 6, 5);
  return p;
}

export const levelOf = (p) => (p > 0.6 ? 3 : p > 0.3 ? 2 : p > 0.1 ? 1 : 0);

export function medialShare(alpha) {
  const { cells } = cellsOf();
  let medial = 0;
  let total = 0;
  for (const cell of cells) {
    const p = pressureAt(alpha, cell.x, cell.y);
    total += p;
    if (cell.y > 0) medial += p;
  }
  return medial / total;
}
