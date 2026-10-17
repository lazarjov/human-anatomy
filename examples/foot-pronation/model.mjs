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

const spanOf = (alpha) => (Math.min(RANGE[1], Math.max(RANGE[0], alpha)) - RANGE[0]) / (RANGE[1] - RANGE[0]);

export function blobsOf(alpha) {
  const s = spanOf(alpha);
  const shift = -6 + 0.9 * Math.min(RANGE[1], Math.max(RANGE[0], alpha));
  return [
    { w: 1.0, cx: -14, cy: shift, sx: 22, sy: 18 },
    { w: 0.62 - 0.42 * s, cx: -100, cy: -26 + 4 * s, sx: 34, sy: 9 },
    { w: 1.05 * Math.max(0, (s - 0.4) / 0.6) ** 1.4, cx: -110, cy: 14, sx: 34, sy: 11 },
    { w: 0.5 + 0.45 * s, cx: -205, cy: 21, sx: 12, sy: 11 },
    { w: 0.55, cx: -211, cy: 5, sx: 11, sy: 9 },
    { w: 0.72 - 0.5 * s, cx: -194, cy: -21, sx: 13, sy: 10 },
    { w: 0.6 - 0.45 * s, cx: -182, cy: -33, sx: 12, sy: 9 },
    { w: 0.42 + 0.32 * s, cx: -248, cy: 22, sx: 10, sy: 9 },
    { w: 0.36, cx: -246, cy: 6, sx: 7, sy: 5 },
    { w: 0.32, cx: -236, cy: -9, sx: 6, sy: 5 },
    { w: 0.3 - 0.1 * s, cx: -225, cy: -22, sx: 6, sy: 5 },
    { w: 0.28 - 0.12 * s, cx: -210, cy: -36, sx: 6, sy: 5 },
  ];
}

export function pressureAt(alpha, x, y) {
  return blobsOf(alpha).reduce((sum, b) => sum + b.w * blob(x, y, b.cx, b.cy, b.sx, b.sy), 0);
}

export function activationOf(alpha) {
  const s = spanOf(alpha);
  return { tp: 0.15 + 0.8 * s ** 1.4, pl: 0.45 - 0.2 * s, ah: 0.2 + 0.45 * s, so: 0.3 };
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
