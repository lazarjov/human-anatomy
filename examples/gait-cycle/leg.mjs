export function makeLeg(k, G, T, P, X) {
  const RAD = Math.PI / 180;
  const V = G.viewOf(P);
  const Y = [0, 1, 0];
  const Z0 = X.ground;
  const tissue = (paths, name, style = {}) => X.tissueSvg(k.solidSvg, paths, name, { crease: "none", ...style });
  const W = (p, y = 0) => [p[0], y, p[1] + Z0];
  const dir = (a) => [Math.sin(a), 0, -Math.cos(a)];
  const fwd = (a) => [Math.cos(a), 0, Math.sin(a)];
  const up = (a) => [-Math.sin(a), 0, Math.cos(a)];
  const at = (o, pairs) => pairs.reduce((p, [v, s]) => G.add3(p, G.mul3(v, s)), o);
  const depth = (p) => G.dot3(p, V);
  const ease = (s) => s * s * (3 - 2 * s);

  const spindle = (R, rt, power = 0.85) => ({
    radius: (u) => rt + (R - rt) * Math.pow(Math.max(0, Math.sin(Math.PI * u)), power),
  });

  const SCALE = G.scaleOf(P);
  const SPACING = 2.4;

  function fibresOf(a, b, radiusAt, count) {
    const sa = k.iso(a, P);
    const sb = k.iso(b, P);
    const dx = sb[0] - sa[0];
    const dy = sb[1] - sa[1];
    const length = Math.hypot(dx, dy) || 1;
    const nx = -dy / length;
    const ny = dx / length;
    const edge = (u, side) => {
      const w = radiusAt(u) * SCALE * side;
      return [sa[0] + dx * u + nx * w, sa[1] + dy * u + ny * w];
    };
    const steps = Math.max(1, Math.round(G.len3(G.sub3(b, a)) / SPACING));
    const snap = (u) => Math.round(u * steps) / steps;
    const span = Math.min(0.42, (2 * radiusAt(0.5) * SCALE * 2.1) / length);
    let d = "";
    for (let j = 0; j < count; j++) {
      const u0 = 0.06 + ((0.88 - span) * j) / Math.max(1, count - 1);
      const p = edge(snap(u0), 1);
      const q = edge(snap(u0 + span), -1);
      d += `M${p[0].toFixed(2)} ${p[1].toFixed(2)}L${q[0].toFixed(2)} ${q[1].toFixed(2)}`;
    }
    return d ? `<path class="iso-line tissue-fiber" data-tone="mid" d="${d}"/>` : "";
  }

  function body(a, b, radiusAt, name, { fibres = 0 } = {}) {
    const pieces = T.tubePieces([a, b], radiusAt, P, { maxLength: 400, spacing: SPACING });
    const svg = pieces.map((piece) => T.tubeSvg(piece, { tone: "hi" })).join("");
    return `<g class="tissue-${name}">${svg}${fibres ? fibresOf(a, b, radiusAt, fibres) : ""}</g>`;
  }

  const ball = (centre, r, name, steps = 32) => tissue(G.sphereOf(centre, r, P, { steps }), name);

  function tube(points, r, name, { round = 0 } = {}) {
    const route = round ? G.fillet(points, round, 7) : points;
    const pieces = T.tubePieces(route, r, P, { maxLength: 60, spacing: 1.2 });
    return `<g class="tissue-${name}">${pieces.map((piece) => T.tubeSvg(piece, { tone: "hi" })).join("")}</g>`;
  }

  function framesOf(pose) {
    const H = W(pose.H);
    const pa = X.tilt * RAD;
    const pelvis = (u, a, y = 0) => at(H, [[up(pa), u], [fwd(pa), a], [Y, y]]);
    const thigh = (s, a, y = 0) => at(H, [[dir(pose.thighA), s], [fwd(pose.thighA), a], [Y, y]]);
    const K = W(pose.K);
    const shank = (s, a, y = 0) => at(K, [[dir(pose.shankA), s], [fwd(pose.shankA), a], [Y, y]]);
    const A = W(pose.A);
    const foot = (f, n, y = 0) => at(A, [[fwd(pose.footA), f], [up(pose.footA), n], [Y, y]]);
    const bisector = G.unit3(G.add3(fwd(pose.thighA), fwd(pose.shankA)));
    const patella = at(K, [[bisector, 3.6], [dir(pose.thighA), -1.2]]);
    const patTop = at(patella, [[dir(pose.thighA), -2]]);
    const patLow = at(patella, [[dir(pose.shankA), 2]]);
    return { H, K, A, pa, pelvis, thigh, shank, foot, patella, patTop, patLow };
  }

  const ILIUM = [
    [7, 6.5], [10, 5], [12.4, 2], [13.2, -2], [12, -6], [9.6, -8.4], [8, -9], [6, -8.6], [4, -7], [2.2, -6.2], [0, -6.8], [-2.5, -6], [-5.5, -5.8], [-7.2, -4.2], [-7, -2], [-5.5, 0], [-5.2, 2.5], [-4.4, 5], [-3, 6], [-1.2, 5.2], [0.4, 4.6], [3.5, 5], [5, 5.2],
  ];
  const SACRUM = [[11, -9], [9.5, -11.5], [5, -13.2], [0.5, -13.4], [-1.5, -12.4], [1, -10.8], [5.5, -9.6], [9, -8.6]];

  function pelvis(J) {
    const out = [];
    const toWorld = (u, a, y) => J.pelvis(u, a, y);
    const prism = (poly, y0, y1) => {
      const pa = J.pa;
      const F = G.frameOf(J.H, Y, fwd(pa), up(pa));
      return G.prismOf(F, poly.map(([u, a]) => [a, u]), y0, y1, P);
    };
    out.push({ key: -9, svg: tissue(prism(SACRUM.map(([u, a]) => [u, a]), -9.5, -7.2), "bone") });
    const plate = prism(ILIUM, -5.4, -3.8);
    const foramen = [];
    for (let i = 0; i <= 28; i++) {
      const t = (i / 28) * Math.PI * 2;
      foramen.push(k.iso(toWorld(-3.1 + Math.sin(t) * 1.25, 2.5 + Math.cos(t) * 1.9, -3.8), P));
    }
    const crest = [];
    for (let i = 0; i <= 20; i++) {
      const s = i / 20;
      const [u0, a0] = ILIUM[Math.min(ILIUM.length - 1, Math.floor(s * 8))];
      const [u1, a1] = ILIUM[Math.min(ILIUM.length - 1, Math.floor(s * 8) + 1)];
      const f = s * 8 - Math.floor(s * 8);
      crest.push(k.iso(toWorld(u0 + (u1 - u0) * f - 1.1, a0 + (a1 - a0) * f, -3.8), P));
    }
    const lineOf = (pts) => "M" + pts.map((p) => p[0].toFixed(2) + " " + p[1].toFixed(2)).join("L");
    const inner = k.lineSvg(lineOf(foramen) + "Z", { tone: "mid" }) + k.fadeLineSvg(crest.slice(1, -1), { fade: [10, 10], tone: "lo" });
    out.push({ key: -5, svg: tissue(plate, "bone", { inner }) });
    const cup = G.frameOf(J.H, Y, fwd(J.pa), up(J.pa));
    out.push({ key: -3.2, svg: tissue(G.ringBand(-3.8, -2.2, 2.5, 3.5, cup, P), "cartilage") });
    return out;
  }

  function femur(J) {
    const out = [];
    const neckEnd = J.thigh(3.2, -0.5, 2.4);
    out.push({ key: 0.2, svg: body(J.H, neckEnd, () => 1.55, "bone") });
    out.push({ key: 0.4, svg: ball(J.H, 2.4, "cartilage", 36) });
    const top = J.thigh(2.6, -0.4, 2.4);
    const bottom = J.thigh(41.2, -0.4, 0.4);
    const shaft = (u) => {
      const s = u;
      return 1.75 - 0.25 * Math.sin(Math.PI * Math.min(1, s / 0.8)) + 1.1 * Math.pow(Math.max(0, (s - 0.78) / 0.22), 2);
    };
    out.push({ key: 0.3, svg: body(top, bottom, shaft, "bone") });
    out.push({ key: 2.6, svg: ball(J.thigh(1.4, -1.3, 4.1), 1.9, "bone") });
    out.push({ key: -0.6, svg: ball(J.thigh(6.6, -1.3, 0.9), 0.95, "bone", 20) });
    out.push({ key: -1.4, svg: ball(J.thigh(42.4, -0.7, -2.1), 2.3, "cartilage") });
    out.push({ key: 1.4, svg: ball(J.thigh(42.4, -0.7, 2.1), 2.3, "cartilage") });
    out.push({ key: 2.5, svg: ball(J.thigh(41.2, -0.6, 3.4), 0.85, "bone", 18) });
    return out;
  }

  function tibia(J) {
    const out = [];
    const F = G.frameAlong(J.shank(1.4, 0, 0), dir(J.pose.shankA));
    out.push({ key: 0.9, svg: tissue(G.disc(0, 1, 3.3, F, P, { steps: 36 }), "cartilage") });
    const head = J.shank(2.2, 0.1, 0);
    const foot = J.shank(41.6, 0.2, -0.2);
    const radius = (u) => 1.45 + 1.9 * Math.pow(Math.max(0, 1 - u / 0.2), 2) + 0.7 * Math.pow(Math.max(0, (u - 0.86) / 0.14), 2);
    out.push({ key: 1, svg: body(head, foot, radius, "bone") });
    out.push({ key: 1.6, svg: ball(J.shank(5, 2.3, 0.3), 0.9, "bone", 18) });
    out.push({ key: -1.6, svg: ball(J.shank(41.4, 0.4, -2.3), 1.15, "bone", 20) });
    const fibTop = J.shank(2.8, -1.4, 2.8);
    const fibLow = J.shank(42.6, -0.6, 2.7);
    out.push({ key: 2.8, svg: body(fibTop, fibLow, (u) => 0.62 + 0.25 * Math.pow(Math.max(0, 1 - u / 0.12), 2) + 0.3 * Math.pow(Math.max(0, (u - 0.9) / 0.1), 2), "bone") });
    out.push({ key: 3, svg: ball(fibTop, 1.15, "bone", 20) });
    out.push({ key: 3, svg: ball(fibLow, 1.05, "bone", 20) });
    return out;
  }

  const RAYS = [
    { y: -2.9, base: 7.4, r: 1.1, toe: 6.6, tr: 1.05 },
    { y: -1.2, base: 7.9, r: 0.8, toe: 5.6, tr: 0.72 },
    { y: 0.4, base: 7.7, r: 0.76, toe: 5.1, tr: 0.68 },
    { y: 1.9, base: 7.3, r: 0.72, toe: 4.6, tr: 0.64 },
    { y: 3.3, base: 6.5, r: 0.76, toe: 4, tr: 0.6 },
  ];

  function foot(J, pose) {
    const items = [];
    const f = fwd(pose.footA);
    const n = up(pose.footA);
    items.push({ d: depth(J.foot(-4, -4, 0.2)), svg: body(J.foot(-8.4, -4.1, 0.2), J.foot(1.6, -4.1, 0.2), (u) => 1.3 + 1.2 * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.4 + 0.05)), 0.5) * (1 - 0.3 * u), "bone") });
    items.push({ d: depth(J.foot(0, -1.6, 0)) + 2, svg: ball(J.foot(0, -1.6, 0), 2.1, "cartilage") });
    items.push({ d: depth(J.foot(2.4, -2.2, 0)) + 2, svg: body(J.foot(0.6, -2, 0), J.foot(3.6, -2.4, -0.6), (u) => 1.4 + 0.3 * Math.sin(Math.PI * u), "bone") });
    items.push({ d: depth(J.foot(4, -2.5, -1.2)) + 2, svg: ball(J.foot(4.2, -2.5, -1.3), 1.25, "bone", 22) });
    items.push({ d: depth(J.foot(4, -4.2, 2.2)) + 2, svg: ball(J.foot(4.1, -4.1, 2.2), 1.35, "bone", 22) });
    for (const y of [-2.4, -0.8, 0.8]) items.push({ d: depth(J.foot(6, -3, y)) + 2, svg: ball(J.foot(6.1, y < 0 ? -3 : -3.4, y), 0.95, "bone", 20) });
    const ballC = W(pose.ball);
    const tf = fwd(pose.toeA);
    for (const ray of RAYS) {
      const base = J.foot(ray.base, -3.3 - Math.abs(ray.y) * 0.15, ray.y * 0.95);
      const headC = at(ballC, [[n, 1.3], [Y, ray.y], [f, ray.y > 2.5 ? -2.2 : -Math.abs(ray.y) * 0.25]]);
      const tip = at(headC, [[tf, ray.toe], [up(pose.toeA), -0.3]]);
      const mid = at(headC, [[tf, ray.toe * 0.55]]);
      const svg =
        body(base, headC, (u) => ray.r * (1.3 - 0.45 * Math.sin(Math.PI * u)), "bone") +
        ball(headC, ray.r * 1.35, "cartilage", 20) +
        body(headC, mid, (u) => ray.tr * (1 - 0.15 * Math.sin(Math.PI * u)), "bone") +
        ball(mid, ray.tr * 1.02, "bone", 16) +
        body(mid, tip, (u) => ray.tr * (0.92 - 0.3 * u), "bone");
      items.push({ d: 2 + depth([0, ray.y, 0]) * 0.3 + depth(headC) * 0.01, svg });
    }
    const heelLow = J.foot(-6.6, -6.2, 0);
    const ballLow = at(ballC, [[n, 0.2], [f, -0.6], [Y, -0.6]]);
    items.push({ d: -50, svg: tube([heelLow, J.foot(4, -6.4, -0.3), ballLow], 0.45, "ligament", { round: 4 }) });
    const malleolus = J.shank(42.6, -0.6, 2.7);
    items.push({ d: 50, svg: tube([malleolus, J.foot(2.6, -1.6, 2.1)], 0.32, "ligament") + tube([malleolus, J.foot(-3.4, -4.4, 2.4)], 0.32, "ligament") });
    return items.sort((p, q) => p.d - q.d).map((item) => item.svg).join("");
  }

  function muscle(origin, path, R, rt, span, level, { fibres = 7, power = 0.85 } = {}) {
    const first = path[0];
    const axis = G.sub3(first, origin);
    const a = G.add3(origin, G.mul3(axis, span[0]));
    const b = G.add3(origin, G.mul3(axis, span[1]));
    const radius = spindle(R, rt, power).radius;
    const svg = body(a, b, radius, "muscle", { fibres });
    const tendons = [];
    if (span[0] > 0.02) tendons.push(tube([origin, a], rt, "tendon"));
    const rest = [b, ...path];
    if (rest.length > 1) tendons.push(tube(rest, rt, "tendon", { round: rest.length > 2 ? 3 : 0 }));
    return `<g ${X.activationAttrs(level)}>${tendons.join("")}${svg}</g>`;
  }

  function muscles(J, pose) {
    const act = pose.act;
    const Ct = J.foot(-7.4, -3.6, 0.2);
    const out = [];
    out.push({ key: -6.5, svg: muscle(J.pelvis(10.5, 2.4, -6.4), [J.pelvis(-1.4, 5, -2.8), J.thigh(6.6, -0.8, 0.6)], 3, 0.6, [0, 0.95], act.iliopsoas) });
    out.push({ key: -2.2, svg: muscle(J.pelvis(-5.6, -4.6, -0.8), [J.thigh(40, -3.4, -2.8), J.shank(6, 1.6, -2.4)], 2.4, 0.45, [0.08, 0.68], act.semitendinosus, { fibres: 5 }) });
    out.push({ key: -1.8, svg: muscle(J.thigh(40.6, -2.2, -2.1), [Ct], 3.4, 0.95, [0.05, 0.5], act.gastrocnemius) });
    out.push({ key: -1.2, svg: muscle(J.thigh(9, 0.6, -2), [J.patTop], 3.6, 0.7, [0.25, 0.92], act.vastusMedialis, { power: 1.4 }) });
    out.push({ key: 1.6, svg: muscle(J.shank(6, -1.4, 0.8), [Ct], 3.1, 0.95, [0.06, 0.8], act.soleus) });
    out.push({ key: 2.4, svg: muscle(J.shank(5, 1.6, 1.4), [J.shank(39, 2.5, 0.4), J.foot(6.2, -2.3, -1.9)], 2.1, 0.42, [0, 0.62], act.tibialisAnterior, { fibres: 5 }) });
    out.push({ key: 3.1, svg: muscle(J.thigh(40.6, -2.2, 2.1), [Ct], 3.4, 0.95, [0.05, 0.5], act.gastrocnemius) });
    out.push({ key: 3.6, svg: muscle(J.shank(4, -0.8, 3.6), [J.shank(42.4, -1.8, 3.2), J.foot(3.6, -5.4, 2.6)], 1.7, 0.36, [0, 0.6], act.fibularisLongus, { fibres: 5 }) });
    out.push({ key: 4, svg: muscle(J.pelvis(3.2, 5, 0.4), [J.patTop], 3.1, 0.7, [0.1, 0.8], act.rectusFemoris) });
    out.push({ key: 4.5, svg: muscle(J.thigh(4, -0.6, 4.2), [at(J.patTop, [[Y, 1]])], 4.3, 0.7, [0.05, 0.86], act.vastusLateralis) });
    out.push({ key: 5, svg: muscle(J.pelvis(10.4, -1.2, -2.2), [J.thigh(1.2, -1.2, 5.6)], 3.8, 0.8, [0, 0.9], act.gluteusMedius) });
    out.push({ key: 5.5, svg: muscle(J.pelvis(-5.8, -5, 0.6), [J.shank(2.8, -1.6, 3.6)], 3, 0.55, [0.1, 0.84], act.bicepsFemoris) });
    out.push({ key: 6, svg: muscle(J.pelvis(6.5, -8.8, 0.8), [J.thigh(10, -1.6, 2.8)], 5.4, 1.1, [0, 0.86], act.gluteusMaximus, { fibres: 9, power: 0.7 }) });
    return out;
  }

  function soft(J) {
    const out = [];
    out.push({ key: 1.2, svg: tube([J.patLow, J.shank(5, 2.4, 0.3)], 0.8, "tendon") });
    out.push({ key: 3.3, svg: tube([J.thigh(41.4, -0.7, 3.6), J.shank(2.9, -1.5, 3.7)], 0.45, "ligament") });
    out.push({ key: 0.7, svg: tube([J.pelvis(3.4, 4.6, -1.2), J.thigh(5.4, 1.1, 1.8)], 0.8, "ligament") });
    out.push({ key: -0.9, svg: tube([J.pelvis(3, -6.8, -2.4), J.thigh(6, -2.8, 0.4), J.thigh(38, -2.8, 0), J.shank(8, -2.2, -0.2), J.shank(38, -1, -1.8), J.foot(-1.6, -2.8, -2.6)], 0.5, "nerve", { round: 5 }) });
    out.push({ key: -1.3, svg: tube([J.pelvis(-0.6, 6.4, -2.2), J.thigh(9, 1.8, -2.8), J.thigh(30, 0.2, -3.1), J.thigh(41, -2.6, -0.8), J.shank(9, -1.8, -0.6), J.shank(38, -0.6, -2.2)], 0.48, "vessel", { round: 5 }) });
    out.push({ key: 1.9, svg: tissue(G.sphereOf(J.patella, 2.1, P, { steps: 32 }), "bone") });
    return out;
  }

  function skin(J, pose) {
    const out = [];
    out.push(body(J.pelvis(-5, -1.6, 0), J.pelvis(14, -1, 0), (u) => 6 + 5 * Math.pow(Math.sin(Math.PI * Math.min(1, u * 0.85 + 0.12)), 0.6), "skin"));
    out.push(body(J.thigh(-1, -0.6, 0.6), J.thigh(44, -0.2, 0.2), (u) => 8.6 - 3.8 * u + 0.6 * Math.sin(Math.PI * u), "skin"));
    out.push(tissue(G.sphereOf(at(J.K, [[fwd(pose.shankA), 0.4]]), 4.9, P, { steps: 40 }), "skin"));
    out.push(body(J.shank(0, -0.6, 0.2), J.shank(41, -0.2, 0), (u) => 4.6 + 1.6 * Math.sin(Math.PI * Math.min(1, u * 1.6)) * (u < 0.62 ? 1 : 0) - 1.4 * Math.max(0, (u - 0.62) / 0.38), "skin"));
    out.push(body(J.foot(-8.8, -3.4, 0.3), J.foot(17.2, -4.6, 0.2), (u) => 2.4 + 1.2 * Math.sin(Math.PI * Math.min(1, u * 1.1)), "skin"));
    out.push(tissue(G.sphereOf(J.foot(0, -2.2, 0.2), 3.3, P, { steps: 36 }), "skin"));
    return out.join("");
  }

  function ground(pose) {
    const low = Math.min(pose.heel[1], pose.ball[1], pose.toe[1]);
    const cx = (pose.heel[0] + pose.toe[0]) / 2;
    const span = Math.max(12, Math.abs(pose.toe[0] - pose.heel[0]) + 5);
    const alpha = Math.max(0, 1 - low / 22);
    const plan = { x: cx - span / 2, y: -5, w: span, d: 10, r: 4.5 };
    const shadow = `<path class="iso-halo" d="${k.haloOf(plan, Z0, 0.1, P)}" style="filter:blur(3px);opacity:${(alpha * 0.32).toFixed(2)}"/>`;
    if (pose.force <= 0.01) return shadow;
    const contact = Math.min(1, pose.force / 1.2);
    const ballX = pose.ball[0];
    const heelX = pose.heel[0];
    const on = (z) => z < 2.5;
    const xs = [];
    if (on(pose.heel[1])) xs.push(heelX - 1.5);
    if (on(pose.ball[1])) xs.push(ballX + 1.5);
    if (on(pose.toe[1])) xs.push(pose.toe[0]);
    if (!xs.length) return shadow;
    const x0 = Math.min(...xs) - 1.5;
    const x1 = Math.max(...xs) + 1.5;
    const w = 2.8 + 3.4 * contact;
    const patch = { x: x0, y: -w / 2, w: x1 - x0, d: w, r: w / 2 - 0.01 };
    return shadow + `<path class="iso-halo gait-contact" d="${k.haloOf(patch, Z0, 0.1, P)}" style="filter:blur(2.5px);opacity:${(0.18 + 0.5 * contact).toFixed(2)}"/>`;
  }

  function legSvg(pose) {
    const J = { ...framesOf(pose), pose };
    const layers = [...pelvis(J), ...femur(J), ...tibia(J), ...muscles(J, pose), ...soft(J), { key: 0.95, svg: foot(J, pose) }];
    layers.sort((p, q) => p.key - q.key);
    return [ground(pose), `<g class="gait-skin">${skin(J, pose)}</g>`, ...layers.map((layer) => layer.svg)].join("");
  }

  return { legSvg };
}
