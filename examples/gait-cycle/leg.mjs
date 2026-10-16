export function makeLeg(k, G, P, D) {
  const S = (paths, style) => k.solidSvg(paths, style);
  const Ln = (d, style) => k.lineSvg(d, style);
  const V = G.viewOf(P);
  const depth = (p) => G.dot3(p, V);
  const Y = [0, 1, 0];
  const Z0 = D.deck;
  const W = (p, y = 0) => [p[0], y, p[1] + Z0];
  const dir = (angle) => [Math.sin(angle), 0, -Math.cos(angle)];
  const fwd = (angle) => [Math.cos(angle), 0, Math.sin(angle)];
  const up = (angle) => [-Math.sin(angle), 0, Math.cos(angle)];
  const at = (o, pairs) => pairs.reduce((p, [v, s]) => G.add3(p, G.mul3(v, s)), o);
  const rod = (a, b, r0, r1 = r0, tone = "hi") => {
    const axis = G.sub3(b, a);
    const length = G.len3(axis);
    const F = G.frameAlong(a, axis);
    return S(G.solidOf([[0, r0], [length, r1]], F, P, { steps: 18 }), { tone, crease: "none" });
  };
  const pin = (centre, y0, y1, r) => {
    const F = G.frameOf([centre[0], 0, centre[2]], Y, [1, 0, 0], [0, 0, 1]);
    return S(G.disc(y0, y1, r, F, P, { steps: 24 }), { tone: "mid" }) + Ln(G.circleOf(F, y1, r * 0.45, P, 16), { tone: "lo" });
  };

  const FEMUR = [[1.5, 4.6, 1], [5, 5.2, 1], [9, 4.2, 1], [18, 3.6, 1], [30, 3.7, 1], [37, 4.7, 1], [41.5, 6.1, 1], [45, 6.2, 1], [47.8, 3.8, 1]];
  const TIBIA = [[3.6, 5.6, 1], [5, 6.2, 1], [9, 5, 1], [16, 3.6, 1], [30, 3.2, 1], [37, 3.7, 1], [40.4, 4.4, 1], [41.4, 3.8, 1]];
  const FIBULA = [[0, 1.8, 1], [1.8, 2.4, 1], [4.5, 1.6, 1], [24, 1.35, 1], [33, 1.5, 1], [36.6, 2.3, 1], [38.6, 1.5, 1]];
  const HEEL = [[-9.2, 2.2, 1], [-7.8, 3.8, 1], [-3.6, 3.7, 1], [1.8, 2.7, 1]];
  const RAYS = [
    { y: -3.8, base: 7.2, r: 1.45, toe: 7.2, tr: 1.35 },
    { y: -1.6, base: 7.8, r: 1.05, toe: 6.1, tr: 0.95 },
    { y: 0.5, base: 7.6, r: 1, toe: 5.6, tr: 0.9 },
    { y: 2.5, base: 7.2, r: 0.95, toe: 5, tr: 0.85 },
    { y: 4.4, base: 6.4, r: 1, toe: 4.3, tr: 0.8 },
  ];

  function femur(pose) {
    const H = W(pose.H);
    const F = G.frameAlong(H, dir(pose.thighA));
    const shaft = S(G.solidOf(FEMUR, F, P), { tone: "hi", inner: Ln(G.arcOf(F, 41.5, 6.1, P, { slope: 0 }), { tone: "faint" }) });
    const head = S(G.sphereOf(H, 5.5, P, { steps: 40 }), { tone: "hi" });
    const neck = Ln(G.arcOf(F, 9, 4.2, P), { tone: "faint" });
    return shaft + neck + head;
  }

  function tibia(pose) {
    const K = W(pose.K);
    const F = G.frameAlong(K, dir(pose.shankA));
    return S(G.solidOf(TIBIA, F, P), { tone: "hi", inner: Ln(G.arcOf(F, 5, 6.1, P), { tone: "faint" }) });
  }

  function fibula(pose) {
    const a = pose.shankA;
    const o = at(W(pose.K, 4), [[dir(a), 5.6], [fwd(a), -3]]);
    const F = G.frameAlong(o, dir(a));
    return S(G.solidOf(FIBULA, F, P), { tone: "hi" });
  }

  function knee(pose) {
    const K = W(pose.K);
    const ta = pose.thighA;
    const sa = pose.shankA;
    const ant = G.unit3(G.add3(fwd(ta), fwd(sa)));
    const pat = at(K, [[ant, 6.4], [dir(ta), -1.8]]);
    const tuber = at(K, [[dir(sa), 9], [fwd(sa), 4.4]]);
    const quad = at(K, [[dir(ta), -16], [fwd(ta), 3.1]]);
    const patTop = at(pat, [[dir(ta), -2.4]]);
    const patLow = at(pat, [[dir(sa), 2.4]]);
    return {
      tendons: rod(quad, patTop, 1.6, 1.9, "mid") + rod(patLow, tuber, 1.1, 1.3, "mid"),
      patella: S(G.sphereOf(pat, 3.1, P, { steps: 32 }), { tone: "hi" }),
      pin: pin(K, 5.6, 7.2, 2.3),
    };
  }

  function foot(pose) {
    const A = W(pose.A);
    const a = pose.footA;
    const f = fwd(a);
    const n = up(a);
    const out = [];
    const C = G.frameAlong(at(A, [[n, -2.8]]), f);
    out.push({ d: -1, svg: S(G.solidOf(HEEL, C, P), { tone: "hi" }) });
    out.push({ d: 0, svg: S(G.sphereOf(at(A, [[n, -1.1]]), 3.7, P, { steps: 32 }), { tone: "hi" }) });
    const M = G.frameOf(A, Y, f, n);
    out.push({ d: 1, svg: S(G.prismOf(M, [[0.8, -1.7], [4.4, -1.6], [8.6, -3], [8.4, -5.8], [2.2, -6.1], [-0.6, -4.2]], -4.8, 5.2, P), { tone: "hi" }) });
    const ball = W(pose.ball);
    const tf = fwd(pose.toeA);
    const rays = RAYS.map((ray) => {
      const base = at(A, [[f, ray.base], [n, -3.4], [Y, ray.y * 0.92]]);
      const headC = at(ball, [[n, 1.75], [Y, ray.y], [f, ray.y > 3 ? -2.4 : -Math.abs(ray.y) * 0.25]]);
      const tip = at(headC, [[tf, ray.toe], [up(pose.toeA), -0.35]]);
      const mid = at(headC, [[tf, ray.toe * 0.55]]);
      const svg =
        rod(base, headC, ray.r * 1.35, ray.r) +
        S(G.sphereOf(headC, ray.r * 1.45, P, { steps: 24 }), { tone: "hi" }) +
        rod(headC, mid, ray.tr, ray.tr * 0.9) +
        S(G.sphereOf(mid, ray.tr * 1.05, P, { steps: 20 }), { tone: "hi" }) +
        rod(mid, tip, ray.tr * 0.9, ray.tr * 0.7);
      return { d: 2 + depth([0, ray.y, 0]), svg };
    });
    return [...out, ...rays].sort((p, q) => p.d - q.d).map((item) => item.svg).join("");
  }

  function shadow(pose) {
    const low = Math.min(pose.heel[1], pose.ball[1], pose.toe[1]);
    const cx = (pose.heel[0] + pose.toe[0]) / 2;
    const span = Math.max(14, Math.abs(pose.toe[0] - pose.heel[0]) + 6);
    const alpha = Math.max(0, 1 - low / 24);
    const plan = { x: cx - span / 2, y: -7, w: span, d: 14, r: 6 };
    return `<path class="iso-halo" d="${k.haloOf(plan, Z0, 0.1, P)}" style="filter:blur(3px)" opacity="${alpha.toFixed(2)}"/>`;
  }

  function legSvg(pose) {
    const K = knee(pose);
    return [
      shadow(pose),
      femur(pose),
      K.tendons,
      foot(pose),
      tibia(pose),
      fibula(pose),
      K.patella,
      pin(W(pose.A), 6, 7.3, 1.6),
      K.pin,
      pin(W(pose.H), 5.3, 7.1, 2.2),
    ].join("");
  }

  return { legSvg };
}
