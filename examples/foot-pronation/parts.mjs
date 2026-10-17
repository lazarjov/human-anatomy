export function makeFoot(k, G, T, P, M) {
  const V = G.viewOf(P);
  const depth = (p) => G.dot3(p, V);
  const at = (p) => k.iso(p, P);
  const RAD = Math.PI / 180;
  const PIVOT = 4;
  const TOP = 172;
  const TIBIA = [-48, 2];
  const tissue = (name, paths, style = {}) => k.solidSvg(paths, { tone: "hi", crease: "none", ...style, className: `tissue-${name}` });
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
  const turnLeg = (p, deg) => {
    const w = Math.max(0, Math.min(1, (p[2] - 50) / 20));
    const t = deg * w * RAD;
    const x = p[0] - TIBIA[0];
    const y = p[1] - TIBIA[1];
    return [TIBIA[0] + x * Math.cos(t) + y * Math.sin(t), TIBIA[1] - x * Math.sin(t) + y * Math.cos(t), p[2]];
  };
  const X = [-1, 0, 0];
  const ball = (c, r, name = "bone") => ({ d: depth(c), svg: tissue(name, G.sphereOf(c, r, P, { steps: 28 })) });

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
    return { d: depth(G.lerp3(a, b, 0.5)) + (extra.bias || 0), svg: tissue("bone", G.solidOf(profile, F, P, { steps: 18 })) };
  }

  function block(o, deg, w, h, len, bevelled = 2.2, bias = 0, axis = X) {
    const a = rotV(axis, deg);
    const u = rotV([0, 1, 0], deg);
    const v = rotV([0, 0, 1], deg);
    const F = G.frameOf(o, a, u, v);
    const hw = w / 2;
    const hh = h / 2;
    const c = Math.min(bevelled, hw * 0.8, hh * 0.8);
    const poly = [];
    const corners = [[hw - c, hh - c, 0], [-hw + c, hh - c, 90], [-hw + c, -hh + c, 180], [hw - c, -hh + c, 270]];
    for (const [cx, cy, start] of corners) for (let i = 0; i <= 4; i++) {
      const t = (start + i * 22.5) * RAD;
      poly.push([cx + c * Math.cos(t), cy + c * Math.sin(t)]);
    }
    const centre = G.add3(o, G.mul3(a, len / 2));
    return { d: depth(centre) + bias, svg: tissue("bone", G.prismOf(F, poly, 0, len, P), { crease: "faint" }) };
  }

  function belly(from, to, profile) {
    const axis = G.sub3(to, from);
    const L = G.len3(axis);
    const F = G.frameAlong(from, axis);
    const scaled = profile.map(([s, r, smooth]) => (smooth ? [s * L, r, 1] : [s * L, r]));
    const rAt = (s) => {
      let i = 1;
      while (i < scaled.length - 1 && scaled[i][0] < s) i++;
      const [sa, ra] = scaled[i - 1];
      const [sb, rb] = scaled[i];
      return ra + ((rb - ra) * (s - sa)) / (sb - sa || 1);
    };
    const lines = [];
    const count = 22;
    for (let i = 0; i < count; i++) {
      const t = (i / count) * Math.PI * 2 + 0.13;
      const facing = G.dot3(G.radialOf(F, t), V);
      const alpha = G.fadeOf(facing, [0.12, 0.7]) * 0.8;
      if (alpha < 0.05) continue;
      const pts = [];
      const s0 = scaled[0][0];
      const s1 = scaled[scaled.length - 1][0];
      for (let j = 0; j <= 24; j++) {
        const s = s0 + ((s1 - s0) * j) / 24;
        pts.push(at(G.pointOf(F, s, rAt(s), t + 0.18 * Math.sin((s / L) * Math.PI))));
      }
      lines.push({ d: k.pathOf(pts), alpha });
    }
    return tissue("muscle", G.solidOf(scaled, F, P, { steps: 40, smooth: { rows: 3 } }), { inner: k.fadedSvg(lines, { tone: "mid" }) });
  }

  function sheet(name, outline, fibres, extra = "") {
    const ring = k.pathOf(outline.map(at), true);
    const lines = fibres.map(([a, b]) => k.pathOf([at(a), at(b)])).join("");
    return `<g class="tissue-${name}"><path class="iso-fill" d="${ring}" style="fill:var(--anatomy-paper)"/><path class="iso-shade" data-shade="2" d="${ring}" opacity=".35"/>${extra}<path class="iso-line" data-tone="lo" d="${lines}"/><path class="iso-line iso-edge" data-tone="hi" d="${ring}"/></g>`;
  }

  function fan(apex, ends, steps = 4) {
    const outline = [apex, ...ends];
    const fibres = [];
    for (let i = 0; i < ends.length - 1; i++) for (let j = i === 0 ? 1 : 0; j < steps; j++) fibres.push([apex, G.lerp3(ends[i], ends[i + 1], j / steps)]);
    return { outline, fibres };
  }

  function cord(name, points, r, { fillet = 9, caps = true } = {}) {
    const route = G.fillet(points, fillet, 7);
    const pieces = T.tubePieces(route, r, P, { maxLength: 400, caps });
    return `<g class="tissue-${name}">${pieces.map((piece) => T.tubeSvg(piece, { tone: "hi" })).join("")}</g>`;
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

  function toes() {
    const items = [];
    TOES.forEach((toe, index) => {
      let a = toe.from;
      toe.seg.forEach(([x, y, z, rb, rh], j) => {
        const b = [x, y, z];
        const dir = G.unit3(G.sub3(b, a));
        const end = G.sub3(b, G.mul3(dir, rh * 0.6));
        items.push(shaft(G.add3(a, G.mul3(dir, rb * 0.5)), end, [rb, rb * 0.82, rb * 0.62, rh]));
        if (j < toe.seg.length - 1) items.push(ball(G.sub3(b, G.mul3(dir, rh * 0.2)), rh * 1.05, "cartilage"));
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

  function landmarks(alpha) {
    const pose = M.poseOf(alpha);
    const A = pose.alpha;
    const ND = pose.drop;
    return {
      A,
      ND,
      IR: pose.tibia,
      tub: [-107, 28 + 0.3 * A, 36 - ND],
      nav: [-104, 15 + 0.3 * A, 42 - ND],
      head: [-93, 12 + 0.3 * A, 44 - 0.7 * ND],
      sust: rotX([-44, 10, 36], A),
      heel: rotX([2, -6, 24], A),
      medialTubercle: rotX([-6, 5, 11.5], A),
      mt1: [-139, 19 + 0.12 * A, 36 - 0.85 * ND],
    };
  }

  function foot(alpha) {
    const Lm = landmarks(alpha);
    const { A, ND } = Lm;
    const items = [];
    const calF = G.frameOf(Lm.heel, rotV(X, A), rotV([0, 1, 0], A), rotV([0, 0, 1], A));
    items.push({ d: depth(G.add3(Lm.heel, [-30, 0, 0])) - 6, svg: tissue("bone", G.solidOf([[0, 11], [5, 19, 1], [17, 21.5, 1], [36, 16, 1], [54, 14, 1], [70, 15.4, 1], [82, 11.5]], calF, P, { steps: 30 })) });
    items.push({ ...ball(rotX([-3, -6, 33], A), 13.5), d: depth(rotX([-3, -6, 33], A)) - 4 });
    items.push({ ...ball(Lm.medialTubercle, 8.4), d: depth(Lm.medialTubercle) - 8 });
    items.push({ ...ball(rotX([-6, -15, 11], A), 7.4), d: depth(rotX([-6, -15, 11], A)) - 12 });
    items.push({ d: depth(Lm.sust) + 2, svg: tissue("bone", G.solidOf([[0, 6.4], [6, 6.8, 1], [13, 5.2]], G.frameAlong(Lm.sust, rotV([0, 1, 0.1], A)), P, { steps: 28 })) });
    const tA = 0.3 * A;
    const troch = rotX([-48, -15, 54], tA);
    const trochF = G.frameAlong(troch, rotV([0, 1, 0], tA));
    items.push({ d: depth(rotX([-48, 0, 54], tA)) + 4, svg: tissue("bone", G.solidOf([[0, 12.5], [4, 14.4, 1], [15, 13.4, 1], [26, 14.6, 1], [31, 12.5]], trochF, P, { steps: 28 })) });
    const neck = rotX([-60, 3, 50], tA);
    items.push(shaft(neck, Lm.head, [11, 9.2, 8, 9.4], { bias: 6 }));
    items.push({ ...ball(Lm.head, 12, "cartilage"), d: depth(Lm.head) + 6 });
    items.push({ d: depth(G.add3(Lm.nav, [-5, 0, 0])) + 8, svg: tissue("bone", G.solidOf([[0, 11], [3, 13, 1], [7.5, 13, 1], [10.5, 11]], G.frameAlong(Lm.nav, [-1, 0.08, 0]), P, { steps: 30 })) });
    items.push({ ...ball(Lm.tub, 5.6), d: depth(Lm.tub) + 10 });
    const cub = rotX([-84, -22, 22 - 0.3 * ND], 0.5 * A);
    items.push(block(cub, 0.5 * A, 21, 19, 30, 5, -2));
    const cun = [
      { o: [-117, 19, 38 - 0.9 * ND], w: 12, h: 23 },
      { o: [-117, 5.5, 39 - 0.7 * ND], w: 11, h: 17 },
      { o: [-116, -7, 34 - 0.5 * ND], w: 11, h: 16 },
    ];
    cun.forEach(({ o, w, h }, index) => items.push(block([o[0], o[1] + 0.2 * A, o[2]], 0.3 * A * (index === 0 ? 1 : 0.5), w, h, 22, 3.6, 3 - index)));
    METATARSALS.forEach((m, index) => {
      const base = [m.base[0], m.base[1] + 0.12 * A, m.base[2] - m.drop * ND];
      const dir = G.unit3(G.sub3(m.head, base));
      const end = G.sub3(m.head, G.mul3(dir, m.hr * 0.55));
      items.push(shaft(base, end, m.r, { bias: index === 0 ? 2 : 0 }));
      items.push(ball(m.head, m.hr));
      if (index === 4) items.push({ ...ball([-112, -37.5, 16 - 0.25 * ND], 5.8), d: depth([-112, -37.5, 16]) - 2 });
    });
    items.sort((p, q) => p.d - q.d);
    const s0 = [-54, 19 + 0.3 * A, 33 - 0.3 * ND];
    const s1 = [-54, 19 + 0.3 * A, 24 - 0.3 * ND];
    const n0 = [-98, 21 + 0.3 * A, 34 - ND];
    const n1 = [-98, 21 + 0.3 * A, 26 - ND];
    const springFibres = [0, 0.25, 0.5, 0.75, 1].map((t) => [G.lerp3(s0, s1, t), G.lerp3(n0, n1, t)]).slice(1, -1);
    const spring = sheet("ligament", [s0, n0, n1, s1], springFibres);
    return items.map((item) => item.svg).join("") + spring;
  }

  function back(alpha) {
    const Lm = landmarks(alpha);
    const { A, IR } = Lm;
    const out = [];
    const plTop = turnLeg([-50, -33, TOP], IR);
    const plTip = turnLeg([-46, -34, 96], IR);
    out.push(`<g data-muscle="pl" data-active="" style="--act:${M.activationOf(alpha).pl.toFixed(3)}">${belly(plTip, plTop, [[0, 2.2], [0.2, 6, 1], [0.6, 8.5, 1], [1, 7.6]])}</g>`);
    out.push(cord("tendon", [plTip, turnLeg([-44, -33, 66], IR), [-46, -32, 40], rotX([-64, -36, 22], A), rotX([-86, -33, 13], 0.5 * A)], 2.2, { fillet: 12 }));
    const z = 3.2;
    const heel = [G.add3(Lm.medialTubercle, [-4, 4, -8]), G.add3(Lm.medialTubercle, [-4, -16, -8])];
    const heads = [[-198, 26, z], [-208, 12, z], [-207, 0, z], [-200, -12, z]];
    const outline = [heel[0], [-130, 20, z], ...heads, [-130, -6, z], heel[1]];
    const fibres = heads.map((h, i) => [G.lerp3(heel[0], heel[1], (i + 0.5) / heads.length), h]);
    out.push(sheet("ligament", outline, fibres));
    return out.join("");
  }

  function soft(alpha) {
    const Lm = landmarks(alpha);
    const { A, IR } = Lm;
    const act = M.activationOf(alpha);
    const out = [];
    const mal = [-47, 25.5, 43];
    const deltoid = fan(mal, [[-82, 30 + 0.3 * A, 37 - 0.8 * Lm.ND], [-64, 28, 30 - 0.4 * Lm.ND], rotX([-46, 24, 27], A), rotX([-28, 22, 31], 0.5 * A)]);
    out.push(sheet("ligament", deltoid.outline, deltoid.fibres));
    const tpTop = turnLeg([-36, -8, TOP], IR);
    const tpTip = turnLeg([-35, 2, 102], IR);
    out.push(`<g data-muscle="tp" data-active="" style="--act:${act.tp.toFixed(3)}">${belly(tpTip, tpTop, [[0, 2.4], [0.22, 6.5, 1], [0.62, 9.5, 1], [1, 8.4]])}</g>`);
    out.push(cord("tendon", [tpTip, turnLeg([-35, 14, 74], IR), [-37, 25, 54], [-50, 30, 41], [-78, 30, 37 - 0.4 * Lm.ND], G.add3(Lm.tub, [4, 0, 0])], 2.4, { fillet: 12 }));
    const nv = (dy, dz) => [turnLeg([-27, 20 + dy, TOP], IR), turnLeg([-28, 23 + dy, 100], IR), [-30, 32 + dy, 60 + dz], [-46, 35 + dy, 39 + dz], [-80, 22 + 0.3 * dy, 17 + dz]];
    out.push(cord("vessel", nv(0, 0), 1.8, { fillet: 14 }));
    out.push(cord("nerve", nv(4, -2), 1.5, { fillet: 14 }));
    const ahFrom = G.add3(Lm.medialTubercle, [-6, 9, 2]);
    const ahTo = [-150, 29 + 0.12 * A, 14];
    out.push(`<g data-muscle="ah" data-active="" style="--act:${act.ah.toFixed(3)}">${belly(ahTo, ahFrom, [[0, 2], [0.3, 5, 1], [0.75, 5.4, 1], [1, 2.6]])}</g>`);
    out.push(cord("tendon", [ahTo, [-185, 30, 11], [-214, 29, 9]], 2, { fillet: 10 }));
    const soTop = turnLeg([-16, -8, TOP], IR);
    const soTip = turnLeg([-12, -7, 122], IR);
    out.push(`<g data-muscle="so" data-active="" style="--act:${act.so.toFixed(3)}">${belly(soTip, soTop, [[0, 4.4], [0.35, 11, 1], [0.8, 14, 1], [1, 13]])}</g>`);
    const achilles = G.fillet([soTip, turnLeg([-9, -6.6, 100], IR), [-3, -6, 62], rotX([5, -6, 31], A)], 30, 7);
    out.push(`<g class="tissue-tendon">${T.tubePieces(achilles, (t) => 4.4 - 1.6 * Math.sin(Math.PI * Math.min(1, t * 1.15)) + 1.4 * Math.max(0, t - 0.8) / 0.2, P, { maxLength: 400 }).map((piece) => T.tubeSvg(piece, { tone: "hi" })).join("")}</g>`);
    return out.join("");
  }

  function skinFoot(alpha) {
    const { A, ND } = landmarks(alpha);
    const section = [
      [18, -4, 16, 34],
      [10, -4, 24, 48],
      [-10, -4, 28, 58],
      [-60, -4, 31, 60],
      [-100, -3, 36, 52 - 0.6 * ND],
      [-150, -4, 40, 40 - 0.4 * ND],
      [-200, -5, 41, 26],
      [-240, -6, 35, 18],
      [-262, -6, 25, 12],
      [-272, -6, 12, 6],
    ];
    const pts = [];
    for (const [x, yc, w, h] of section) for (let i = 0; i <= 12; i++) {
      const phi = (i / 12) * Math.PI;
      let p = [x, yc + w * Math.cos(phi), h * Math.sin(phi)];
      if (x > -70) p = rotX(p, A * (x > -20 ? 1 : 0.5));
      pts.push(at(p));
    }
    return G.hullOf(pts);
  }

  function skinLeg() {
    const pts = [];
    for (const [z, r] of [[50, 30], [80, 31], [120, 35], [TOP, 41]]) for (let i = 0; i < 36; i++) {
      const t = (i / 36) * Math.PI * 2;
      pts.push(at([-40 + r * Math.cos(t), -6 + r * Math.sin(t), z]));
    }
    return G.hullOf(pts);
  }

  function smooth(poly, rounds = 3) {
    let pts = poly;
    for (let r = 0; r < rounds; r++) {
      const next = [];
      pts.forEach((p, i) => {
        const q = pts[(i + 1) % pts.length];
        next.push([p[0] * 0.75 + q[0] * 0.25, p[1] * 0.75 + q[1] * 0.25], [p[0] * 0.25 + q[0] * 0.75, p[1] * 0.25 + q[1] * 0.75]);
      });
      pts = next;
    }
    return pts;
  }

  function skinAnkle(alpha) {
    const { A, ND } = landmarks(alpha);
    const pts = [];
    for (let i = 0; i < 36; i++) {
      const t = (i / 36) * Math.PI * 2;
      pts.push(at([-40 + 33 * Math.cos(t), -6 + 33 * Math.sin(t), 108]));
    }
    for (let i = 0; i <= 12; i++) {
      const phi = (i / 12) * Math.PI;
      pts.push(at([-150, -4 + 40 * Math.cos(phi), (40 - 0.4 * ND) * Math.sin(phi)]));
      pts.push(at(rotX([14, -4 + 20 * Math.cos(phi), 40 * Math.sin(phi)], A)));
    }
    return G.hullOf(pts);
  }

  function skin(alpha) {
    const shapes = [skinFoot(alpha), skinAnkle(alpha), skinLeg()].map((poly) => k.pathOf(smooth(poly), true));
    const F = G.frameAlong([-40, -6, TOP], [0, 0, 1]);
    const cut = G.circleOf(F, 0, 41, P, 72);
    const box = 'maskUnits="userSpaceOnUse" x="-2000" y="-2000" width="4000" height="4000"';
    const masks = shapes.map((_, i) => `<mask id="fp-skin-${i}" ${box}><rect x="-2000" y="-2000" width="4000" height="4000" fill="#fff"/>${shapes.filter((__, j) => j !== i).map((d) => `<path d="${d}" fill="#000"/>`).join("")}</mask>`).join("");
    const edges = shapes.map((d, i) => `<path class="iso-line" data-tone="hi" d="${d}" mask="url(#fp-skin-${i})"/>`).join("");
    return `<defs>${masks}</defs><g class="tissue-skin"><g opacity=".5"><path class="iso-fill" d="${shapes.join("")}" style="fill:var(--anatomy-paper)"/><path class="iso-fill" d="${cut}" style="fill:var(--anatomy-top)"/></g>${edges}<path class="iso-line" data-tone="mid" d="${cut}"/></g>`;
  }

  function print(alpha) {
    const out = [];
    for (const b of M.blobsOf(alpha)) {
      if (b.w < 0.03) continue;
      const pts = [];
      for (let i = 0; i < 40; i++) {
        const t = (i / 40) * Math.PI * 2;
        pts.push(at([b.cx + b.sx * 1.05 * Math.cos(t), b.cy + b.sy * 1.05 * Math.sin(t), 0]));
      }
      out.push(`<path d="${k.pathOf(pts, true)}" style="fill:var(--anatomy-paper)" opacity="${Math.min(0.75, 0.55 * b.w).toFixed(3)}"/>`);
    }
    return `<g class="tissue-vessel" style="filter:blur(3.5px)">${out.join("")}</g>`;
  }

  function cutFace(F, s, r) {
    return k.lineSvg(G.circleOf(F, s, r, P, 48), { tone: "mid" });
  }

  function fibula() {
    const F = G.frameAlong([-54, -22, 50], [0, 0, 1]);
    const L = TOP - 50;
    return tissue("bone", G.solidOf([[0, 6.2], [10, 4.6, 1], [30, 4.2, 1], [80, 4.8, 1], [L, 5.4]], F, P, { steps: 24 }), { inner: cutFace(F, L, 2.4) }) + tissue("bone", G.sphereOf([-54, -22, 46], 7, P, { steps: 40 }));
  }

  function tibia() {
    const F = G.frameAlong([TIBIA[0], TIBIA[1], 62], [0, 0, 1]);
    const L = TOP - 62;
    return (
      tissue("bone", G.solidOf([[0, 18.5], [10, 17.6, 1], [34, 13.6, 1], [70, 12.3, 1], [L, 13.4]], F, P, { steps: 44 }), { inner: cutFace(F, L, 7.2) }) +
      tissue("bone", G.sphereOf([TIBIA[0] + 1, TIBIA[1] + 17, 46], 6.4, P, { steps: 40 }))
    );
  }

  return { toes, fibula, tibia, foot, back, soft, skin, print, TOP };
}
