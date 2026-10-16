export function makeFoot(k, G, P, M) {
  const V = G.viewOf(P);
  const S = (paths, style) => k.solidSvg(paths, style);
  const Ln = (d, style) => k.lineSvg(d, style);
  const depth = (p) => G.dot3(p, V);
  const RAD = Math.PI / 180;
  const PIVOT = 4;
  const rotX = (p, deg) => {
    const c = Math.cos(deg * RAD);
    const s = Math.sin(deg * RAD);
    const y = p[1];
    const z = p[2] - PIVOT;
    return [p[0], y * c + z * s, PIVOT + z * c - y * s];
  };
  const rotV = (v, deg) => {
    const c = Math.cos(deg * RAD);
    const s = Math.sin(deg * RAD);
    return [v[0], v[1] * c + v[2] * s, v[2] * c - v[1] * s];
  };
  const X = [-1, 0, 0];
  const ball = (c, r, style = {}) => ({ d: depth(c), svg: S(G.sphereOf(c, r, P, { steps: 28 }), { tone: "hi", crease: "none", ...style }) });

  function shaft(a, b, [r0, r1, r2, r3], extra = {}) {
    const axis = G.sub3(b, a);
    const L = G.len3(axis);
    const F = G.frameAlong(a, axis);
    const profile = [
      [0, r0],
      [L * 0.16, r1, 1],
      [L * 0.52, r2, 1],
      [L * 0.86, (r2 + r3) / 2, 1],
      [L, r3],
    ];
    return { d: depth(G.lerp3(a, b, 0.5)) + (extra.bias || 0), svg: S(G.solidOf(profile, F, P, { steps: 18 }), { tone: "hi", crease: "none" }) };
  }

  function block(o, deg, w, h, len, bevelled = 2.2, bias = 0, axis = X) {
    const a = rotV(axis, deg);
    const u = rotV([0, 1, 0], deg);
    const v = rotV([0, 0, 1], deg);
    const F = G.frameOf(o, a, u, v);
    const hw = w / 2;
    const hh = h / 2;
    const c = Math.min(bevelled, hw * 0.6, hh * 0.6);
    const poly = [
      [-hw + c, -hh],
      [hw - c, -hh],
      [hw, -hh + c],
      [hw, hh - c],
      [hw - c, hh],
      [-hw + c, hh],
      [-hw, hh - c],
      [-hw, -hh + c],
    ];
    const centre = G.add3(o, G.mul3(a, len / 2));
    return { d: depth(centre) + bias, svg: S(G.prismOf(F, poly, 0, len, P), { tone: "hi", crease: "faint" }) };
  }

  const METATARSALS = [
    { base: [-139, 19, 36], head: [-205, 22, 13], drop: 0.85, r: [10, 8, 6.2, 8.4], hr: 9.6 },
    { base: [-139, 5, 36], head: [-213, 6, 10.5], drop: 0.65, r: [7.4, 5.8, 4.4, 6], hr: 6.6 },
    { base: [-136, -7, 32], head: [-207, -8, 9.5], drop: 0.5, r: [7, 5.4, 4.2, 5.8], hr: 6.2 },
    { base: [-113, -18, 26], head: [-197, -20, 8.6], drop: 0.36, r: [6.8, 5.2, 4, 5.6], hr: 5.8 },
    { base: [-113, -31, 20], head: [-185, -33, 8], drop: 0.3, r: [7.2, 5.2, 3.8, 5.4], hr: 5.6 },
  ];
  const TOES = [
    { from: [-212, 22.5, 12], seg: [[-238, 23, 9.4, 6.6, 5.4], [-259, 23.4, 6.4, 5.6, 3.4]] },
    { from: [-218, 6, 10], seg: [[-238, 6.2, 9.8, 4.4, 3.6], [-247, 6.4, 8, 3.6, 3.1], [-255, 6.6, 5.4, 3.1, 2.1]] },
    { from: [-212, -8, 9.2], seg: [[-230, -8.4, 9, 4.2, 3.4], [-238, -8.8, 7.4, 3.4, 2.9], [-245, -9, 5.2, 2.9, 2]] },
    { from: [-202, -20.2, 8.2], seg: [[-218, -21, 8, 3.9, 3.1], [-225, -21.6, 6.6, 3.1, 2.6], [-231, -22, 4.9, 2.6, 1.8]] },
    { from: [-190, -33.5, 7.6], seg: [[-203, -34.6, 7, 3.6, 2.9], [-209, -35.2, 5.8, 2.9, 2.4], [-214, -35.6, 4.5, 2.4, 1.7]] },
  ];
  const TIBIA = [-48, 2];
  const COLLAR_Z = [108, 122];
  const TOP_Z = 152;

  function toes() {
    const items = [];
    TOES.forEach((toe, index) => {
      let a = toe.from;
      toe.seg.forEach(([x, y, z, rb, rh], j) => {
        const b = [x, y, z];
        const dir = G.unit3(G.sub3(b, a));
        const end = G.sub3(b, G.mul3(dir, rh * 0.6));
        items.push(shaft(G.add3(a, G.mul3(dir, rb * 0.5)), end, [rb, rb * 0.82, rb * 0.62, rh]));
        if (j < toe.seg.length - 1) items.push(ball(G.sub3(b, G.mul3(dir, rh * 0.2)), rh * 1.05));
        else items.push(ball(G.sub3(b, G.mul3(dir, rh * 0.5)), rh * 0.85));
        a = b;
      });
      if (index === 0) {
        items.push(ball([-201, 26.5, 6], 3.2));
        items.push(ball([-201, 17.5, 6], 3));
      }
    });
    return items.sort((p, q) => p.d - q.d).map((item) => item.svg).join("");
  }

  function foot(alpha) {
    const pose = M.poseOf(alpha);
    const A = pose.alpha;
    const ND = pose.drop;
    const items = [];
    const cal = rotX([2, -6, 24], A);
    const calF = G.frameOf(cal, rotV(X, A), rotV([0, 1, 0], A), rotV([0, 0, 1], A));
    items.push({ d: depth(G.add3(cal, [-30, 0, 0])) - 6, svg: S(G.solidOf([[0, 11], [5, 19, 1], [17, 21.5, 1], [36, 16, 1], [54, 14, 1], [70, 15.4, 1], [82, 11.5]], calF, P, { steps: 30 }), { tone: "hi", crease: "none" }) });
    items.push({ ...ball(rotX([-3, -6, 33], A), 13.5), d: depth(rotX([-3, -6, 33], A)) - 4 });
    items.push({ ...ball(rotX([-6, 5, 11.5], A), 8.4), d: depth(rotX([-6, 5, 11.5], A)) - 8 });
    items.push({ ...ball(rotX([-6, -15, 11], A), 7.4), d: depth(rotX([-6, -15, 11], A)) - 12 });
    const sust = rotX([-44, 10, 36], A);
    items.push({ d: depth(sust) + 2, svg: S(G.solidOf([[0, 6.4], [6, 6.8, 1], [13, 5.2]], G.frameAlong(sust, rotV([0, 1, 0.1], A)), P, { steps: 28 }), { tone: "hi", crease: "none" }) });
    const tA = 0.3 * A;
    const troch = rotX([-48, -15, 54], tA);
    const trochF = G.frameAlong(troch, rotV([0, 1, 0], tA));
    items.push({ d: depth(rotX([-48, 0, 54], tA)) + 4, svg: S(G.solidOf([[0, 12.5], [4, 14.4, 1], [15, 13.4, 1], [26, 14.6, 1], [31, 12.5]], trochF, P, { steps: 28 }), { tone: "hi", crease: "none" }) });
    const head = [-93, 12 + 0.3 * A, 44 - 0.7 * ND];
    const neck = rotX([-60, 3, 50], tA);
    items.push(shaft(neck, head, [11, 9.2, 8, 9.4], { bias: 6 }));
    items.push({ ...ball(head, 12), d: depth(head) + 6 });
    const nav = [-104, 15 + 0.3 * A, 42 - ND];
    items.push({ d: depth(G.add3(nav, [-5, 0, 0])) + 8, svg: S(G.solidOf([[0, 11], [3, 13, 1], [7.5, 13, 1], [10.5, 11]], G.frameAlong(nav, [-1, 0.08, 0]), P, { steps: 30 }), { tone: "hi", crease: "none" }) });
    const tub = [-107, 28 + 0.3 * A, 36 - ND];
    items.push({ ...ball(tub, 5.6), d: depth(tub) + 10 });
    const cub = rotX([-84, -22, 22 - 0.3 * ND], 0.5 * A);
    items.push(block(cub, 0.5 * A, 21, 19, 30, 4, -2));
    const cun = [
      { o: [-117, 19, 38 - 0.9 * ND], w: 12, h: 23 },
      { o: [-117, 5.5, 39 - 0.7 * ND], w: 11, h: 17 },
      { o: [-116, -7, 34 - 0.5 * ND], w: 11, h: 16 },
    ];
    cun.forEach(({ o, w, h }, index) => items.push(block([o[0], o[1] + 0.2 * A, o[2]], 0.3 * A * (index === 0 ? 1 : 0.5), w, h, 22, 2.4, 3 - index)));
    METATARSALS.forEach((m, index) => {
      const base = [m.base[0], m.base[1] + 0.12 * A, m.base[2] - m.drop * ND];
      const dir = G.unit3(G.sub3(m.head, base));
      const end = G.sub3(m.head, G.mul3(dir, m.hr * 0.55));
      items.push(shaft(base, end, m.r, { bias: index === 0 ? 2 : 0 }));
      items.push(ball(m.head, m.hr));
      if (index === 4) items.push({ ...ball([-112, -37.5, 16 - 0.25 * ND], 5.8), d: depth([-112, -37.5, 16]) - 2 });
    });
    items.sort((p, q) => p.d - q.d);
    const pinDots = [G.add3(tub, [0, 5.4, 0]), G.add3(G.lerp3(head, nav, 0.62), [0, 12.4, 0]), [-116, 25.4, 38 - 0.9 * ND], [-137, 29, 36 - 0.85 * ND], rotX([-30, 15, 30], A)];
    return items.map((item) => item.svg).join("") + k.dotsSvg(pinDots.map((p) => k.iso(p, P)), { size: 0.7, tone: "mid" });
  }

  function rod(alpha) {
    const A = M.poseOf(alpha).alpha;
    const up = rotV([0, 0, 1], A);
    const bracket = rotX([8, 0, 30], A);
    const out = [];
    out.push(S(G.prismOf(G.frameOf(bracket, [1, 0, 0], rotV([0, 1, 0], A), up), [[-3.2, -3], [3.2, -3], [3.2, 3], [-3.2, 3]], 0, 14.5, P), { tone: "mid", crease: "faint" }));
    const foot = rotX([21.5, 0, 26], A);
    const F = G.frameAlong(foot, up);
    out.push(S(G.disc(0, 68, 1.2, F, P, { steps: 16 }), { tone: "hi", crease: "none", lit: true }));
    out.push(S(G.sphereOf(rotX([21.5, 0, 26 + 68], A), 1.9, P, { steps: 24 }), { tone: "hi", lit: true }));
    out.push(k.dotsSvg([k.iso(rotX([22.7, 0, 30], A), P)], { size: 0.5, tone: "hi" }));
    return out.join("");
  }

  function slider(alpha) {
    const ND = M.poseOf(alpha).drop;
    const z = 36 - ND;
    const out = [];
    const F = G.frameAlong([-107, 64, z], [0, -1, 0]);
    out.push(S(G.disc(0, 30, 0.9, F, P, { steps: 14 }), { tone: "mid", crease: "none" }));
    out.push(S(G.sphereOf([-107, 34.4, z], 1.5, P, { steps: 20 }), { tone: "mid" }));
    out.push(S(k.slabOf({ x: -113, y: 63, w: 12, d: 8, r: 1.2 }, z - 4, 8, P, 3, 0.4), { tone: "mid" }));
    out.push(Ln(k.segment([-113, 71, z], [-101, 71, z], P), { tone: "hi" }));
    return out.join("");
  }

  function top(alpha) {
    const IR = M.poseOf(alpha).tibia * RAD;
    const F = G.frameAlong([TIBIA[0], TIBIA[1], COLLAR_Z[1]], [0, 0, 1]);
    const out = [];
    out.push(S(G.solidOf([[0, 12.6], [TOP_Z - COLLAR_Z[1] - 2, 12.2], [TOP_Z - COLLAR_Z[1], 11.4]], F, P, { steps: 44 }), { tone: "hi", crease: "faint", inner: Ln(G.arcOf(F, TOP_Z - COLLAR_Z[1] - 12, 12.25, P), { tone: "faint" }) }));
    const dir = [Math.sin(IR), Math.cos(IR), 0];
    const from = [TIBIA[0] + dir[0] * 12.2, TIBIA[1] + dir[1] * 12.2, COLLAR_Z[1] + 5];
    const PF = G.frameAlong(from, dir);
    out.push(S(G.disc(-0.5, 9.5, 1.4, PF, P, { steps: 16 }), { tone: "hi", crease: "none" }));
    out.push(S(G.sphereOf(G.add3(from, G.mul3(dir, 10.2)), 1.7, P, { steps: 20 }), { tone: "hi" }));
    out.push(Ln(k.segment(G.add3(from, G.mul3(dir, 11.4)), [TIBIA[0] + dir[0] * 17, TIBIA[1] + dir[1] * 17, COLLAR_Z[1]], P), { tone: "faint" }));
    return out.join("");
  }

  function fibula() {
    const out = [];
    out.push(S(G.solidOf([[0, 6.2], [10, 4.6, 1], [30, 4.2, 1], [44, 4.6]], G.frameAlong([-54, -22, 50], [0, 0, 1]), P, { steps: 24 }), { tone: "hi", crease: "none" }));
    out.push(S(G.disc(44, 47, 5.4, G.frameAlong([-54, -22, 50], [0, 0, 1]), P, { steps: 28 }), { tone: "hi", crease: "faint" }));
    out.push(S(G.sphereOf([-54, -22, 46], 7, P, { steps: 40 }), { tone: "hi", crease: "none" }));
    return out.join("");
  }

  function tibia() {
    const tib = G.frameAlong([TIBIA[0], TIBIA[1], 62], [0, 0, 1]);
    const out = [];
    out.push(S(G.solidOf([[0, 18.5], [10, 17.6, 1], [34, 13.6, 1], [70, 12.3, 1], [COLLAR_Z[0] - 62, 12.6]], tib, P, { steps: 44 }), { tone: "hi", crease: "none", inner: Ln(G.arcOf(tib, 3, 18.4, P), { tone: "faint" }) }));
    out.push(S(G.sphereOf([TIBIA[0] + 1, TIBIA[1] + 17, 46], 6.4, P, { steps: 40 }), { tone: "hi", crease: "none" }));
    return out.join("");
  }

  return { toes, fibula, tibia, foot, rod, slider, top, TIBIA, COLLAR_Z, TOP_Z };
}
