export function makeKnee(k, G, T, P, M) {
  const S = (paths, style) => k.solidSvg(paths, style);
  const Ln = (d, style) => k.lineSvg(d, style);
  const Y = [0, 1, 0];
  const O = [0, 0, M.H];
  const V = G.viewOf(P);
  const depth = (p) => G.dot3(p, V);
  const wrap = (name, svg, act = null) =>
    act === null ? `<g class="tissue-${name}">${svg}</g>` : `<g class="tissue-${name}" data-active="" style="--act:${Math.max(0, Math.min(1, act)).toFixed(3)}">${svg}</g>`;
  const tube = (points, radius, options = {}) =>
    T.tubePieces(points, radius, P, { maxLength: 400, ...options })
      .map((piece) => T.tubeSvg(piece, { tone: "hi" }))
      .join("");
  const ellipse = (a, b, steps = 40, shift = 0) => Array.from({ length: steps }, (_, i) => [shift + a * Math.cos((i / steps) * Math.PI * 2), b * Math.sin((i / steps) * Math.PI * 2)]);
  const unit = (v) => G.mul3(v, 1 / (Math.hypot(v[0], v[1], v[2]) || 1));
  const along = (from, to) => {
    const a = unit(G.sub3(to, from));
    const side = Math.abs(a[1]) > 0.9 ? [1, 0, 0] : Y;
    const u = unit(G.cross3(side, a));
    const v = G.cross3(a, u);
    return { F: G.frameOf(from, a, u, v), length: G.len3(G.sub3(to, from)) };
  };

  function fibres(F, profile, count, { from = 0.12, to = 0.9, phase = 0, fade = 0.32 } = {}) {
    const curve = G.profileCurve(profile);
    const s0 = profile[0][0];
    const s1 = profile[profile.length - 1][0];
    const out = [];
    for (let i = 0; i < count; i++) {
      const angle = phase + (i / count) * Math.PI * 2;
      const samples = Array.from({ length: 24 }, (_, j) => s0 + (s1 - s0) * (from + ((to - from) * j) / 23));
      const facing = samples.map((s) => G.facingOf(F, angle, P, curve.slope(s)));
      if (Math.min(...facing) < 0.2) continue;
      const points = samples.map((s) => k.iso(G.pointOf(F, s, curve.radius(s), angle), P));
      let length = 0;
      for (let j = 1; j < points.length; j++) length += Math.hypot(points[j][0] - points[j - 1][0], points[j][1] - points[j - 1][1]);
      out.push(k.fadeLineSvg(points, { fade: [length * fade, length * fade], tone: "lo", className: "tissue-fiber" }));
    }
    return out.join("");
  }

  function muscle(from, to, profile, count, act, phase = 0) {
    const { F } = along(from, to);
    const body = S(G.solidOf(profile, F, P), { tone: "hi", crease: "none" });
    const mid = G.pointOf(F, (profile[0][0] + profile[profile.length - 1][0]) / 2, 0, 0);
    return { key: depth(mid), svg: wrap("muscle", body + fibres(F, profile, count, { phase }), act), muscle: true };
  }

  const femurFrame = G.frameOf(O, [-1, 0, 0], Y, [0, 0, 1]);
  const condyleFrame = G.frameOf(O, Y, [1, 0, 0], [0, 0, -1]);
  const sector = (r, a0, a1, steps = 28) => [
    [0, 0],
    ...Array.from({ length: steps + 1 }, (_, i) => {
      const phi = ((a0 + ((a1 - a0) * i) / steps) * Math.PI) / 180;
      return [r * Math.sin(phi), -r * Math.cos(phi)];
    }),
  ];
  const condyleProfile = (s0, s1) => [
    [s0, 5.2, 1],
    [s0 + 1.2, 8.6, 1],
    [s0 + 3.4, 10.7, 1],
    [(s0 + s1) / 2, 11.2, 1],
    [s1 - 3.4, 10.7, 1],
    [s1 - 1.2, 8.6, 1],
    [s1, 5.2, 1],
  ];
  const CUT = 70;
  const femurProfile = [
    [1.2, 5.4, 1],
    [2.6, 8.8, 1],
    [5.5, 10.4, 1],
    [10, 9.9, 1],
    [17, 8.3, 1],
    [27, 6.8, 1],
    [42, 5.9, 1],
    [55, 5.6, 1],
    [CUT, 5.5],
  ];
  const femurCurve = G.profileCurve(femurProfile);
  const arcAt = (F, curve, s) => G.arcOf(F, s, curve.radius(s), P, { slope: curve.slope(s) });
  const EPI_L = [-1.5, 16.8, M.H + 1.5];
  const EPI_M = [-1.5, -16.8, M.H + 1.5];

  const statics = [
    { key: depth([-50, 0, M.H]), svg: wrap("bone", S(G.solidOf(femurProfile, femurFrame, P), { tone: "hi", crease: "none", inner: Ln(arcAt(femurFrame, femurCurve, 15) + arcAt(femurFrame, femurCurve, 34), { tone: "faint" }) })) },
    { key: depth([0, -10.5, M.H]) + 1, svg: wrap("cartilage", S(G.solidOf(condyleProfile(-16.5, -4.5), condyleFrame, P), { tone: "hi", crease: "none" })) },
    { key: depth([0, 10.5, M.H]) + 1, svg: wrap("cartilage", S(G.solidOf(condyleProfile(4.5, 16.5), condyleFrame, P), { tone: "hi", crease: "none" })) },
    { key: depth([0, 16, M.H]) + 2, svg: wrap("bone", S(G.solidOf([[15.2, 7.6, 1], [16.4, 6.4, 1], [17.1, 4, 1], [17.4, 1.2]], condyleFrame, P), { tone: "hi", crease: "none" })) },
    { key: depth([0, -16, M.H]), svg: wrap("bone", S(G.solidOf([[-15.2, 7.6, 1], [-16.4, 6.4, 1], [-17.1, 4, 1], [-17.4, 1.2]], condyleFrame, P), { tone: "hi", crease: "none" })) },
    { key: depth([4, 0, M.H + 4]), svg: wrap("cartilage", S(G.prismOf(condyleFrame, sector(10.6, -42, 100), -5.4, 5.4, P), { tone: "hi", crease: "none" })) },
    { key: depth([-30, -17, M.H + 4]), svg: wrap("bone", S(G.sphereOf([-26, -11.5, M.H + 3], 2.2, P), { tone: "hi" })) },
  ];

  const QJ = [-27, 0, M.H + 12.8];
  const VLJ = [-22, 9, M.H + 8];
  const VMJ = [-13, -9, M.H + 6];
  const BFJ = [-20, 10, M.H - 11];
  const STJ = [-22, -9, M.H - 11];
  const GLJ = [-7, 9, M.H - 8];
  const GMJ = [-7, -9, M.H - 8];

  const thigh = (act) => [
    muscle(QJ, [-72, 0, M.H + 15], [[0, 2.4, 1], [6, 4.8, 1], [18, 7.6, 1], [34, 8.4, 1], [45, 8.2]], 9, act, 0.2),
    muscle(VLJ, [-72, 12.5, M.H + 4], [[0, 2.2, 1], [10, 6.6, 1], [26, 9.4, 1], [50, 9.6]], 10, act, 0.5),
    muscle(VMJ, [-72, -12, M.H + 3], [[0, 2.4, 1], [5, 7, 1], [14, 9.8, 1], [30, 8.4, 1], [59, 7]], 10, act, 0.1),
    muscle(BFJ, [-72, 9, M.H - 13], [[0, 1.8, 1], [10, 5.6, 1], [30, 7.8, 1], [52, 7.8]], 8, 0.08, 0.3),
    muscle(STJ, [-72, -7, M.H - 13], [[0, 1.8, 1], [10, 6, 1], [30, 8.4, 1], [50, 8.2]], 8, 0.08, 0.6),
  ];

  const tibiaShaft = [
    [19, 9.2, 1],
    [25, 7.3, 1],
    [33, 5.9, 1],
    [46, 5.1, 1],
    [60, 4.7, 1],
    [78, 4.6],
  ];
  const fibulaShaft = [
    [17.5, 1.6, 1],
    [19, 3.2, 1],
    [22, 3.9, 1],
    [25.5, 3.2, 1],
    [30, 2.1, 1],
    [36, 1.9, 1],
    [78, 1.9],
  ];
  const FIB = [-4.6, 13.2];
  const tibiaCurve = G.profileCurve(tibiaShaft);

  function knee(deg) {
    const L = M.loads(deg);
    const quadAct = L.quad / M.loads(0).quad;
    const pfShare = L.pf / 680;
    const { d, n } = M.axisOf(deg);
    const F = G.frameOf(O, d, n, Y);
    const seen = Math.abs(G.dot3(d, V)) > 0.07;
    const at = (s, a = 0, side = 0) => M.tibiaPoint(deg, s, a, side);
    const fibF = G.frameOf(at(0, FIB[0], FIB[1]), d, n, Y);
    const quads = thigh(quadAct);
    const items = [...statics, ...quads];

    const cutEnd = G.dot3(d, V) > 0.12;
    const marrow = cutEnd ? Ln(G.circleOf(F, 78, 2.6, P), { tone: "lo" }) : "";
    items.push({ key: depth(at(50)), svg: wrap("bone", S(G.solidOf(tibiaShaft, F, P), { tone: "hi", crease: "none", inner: (seen ? Ln(arcAt(F, tibiaCurve, 24), { tone: "faint" }) : "") + marrow })) });
    for (const y of [-8.4, 8.4]) {
      const CF = G.frameOf([0, y, M.H], d, n, Y);
      const lateral = y > 0;
      items.push({ key: depth(at(16, 0, y)) - (lateral ? 0 : 0.5), svg: wrap("bone", S(G.solidOf([[M.PLATEAU + 1, 6.6, 1], [M.PLATEAU + 2.4, 8.4, 1], [M.PLATEAU + 5, 8.6, 1], [M.PLATEAU + 9, 7, 1], [M.PLATEAU + 13, 3.6, 1], [M.PLATEAU + 15, 1.2]], CF, P), { tone: "hi", crease: "none" })) });
      items.push({ key: depth(at(16, 0, y)) + 0.3 - (lateral ? 0 : 0.5), svg: wrap("cartilage", S(G.solidOf([[M.PLATEAU, 5.2, 1], [M.PLATEAU + 0.5, 6.8, 1], [M.PLATEAU + 1.2, 7.3, 1], [M.PLATEAU + 1.6, 7]], CF, P), { tone: "hi", crease: "none" })) });
      items.push({ key: depth(at(M.PLATEAU, 0, y)) + 2, svg: wrap("tendon", S(G.ringBand(M.PLATEAU - 1.2, M.PLATEAU, 4.6, 6.8, CF, P), { tone: "hi", crease: "faint" })) });
    }
    const tibiaKey = depth(at(50));
    items.push({ key: tibiaKey - 0.1, svg: wrap("bone", S(G.sphereOf(at(M.TUBEROSITY[0] + 1, M.TUBEROSITY[1] - 2.6), 3.2, P), { tone: "hi" })) });
    items.push({ key: depth(at(15)) + 1.5, svg: wrap("bone", S(G.solidOf(fibulaShaft, fibF, P), { tone: "hi", crease: "none", inner: G.dot3(d, V) > 0.12 ? Ln(G.circleOf(fibF, 78, 1, P), { tone: "lo" }) : "" })) });

    items.push({ key: depth([0, 0, M.H]) + 0.4, svg: wrap("ligament", tube([[-3.4, 3.2, M.H - 6.6], at(M.PLATEAU, 3.2, 1.6)], 1.3)) });
    items.push({ key: depth([0, 0, M.H]) + 0.2, svg: wrap("ligament", tube([[2.6, -3.2, M.H - 7], at(M.PLATEAU + 0.6, -6.2, -1.6)], 1.4)) });
    items.push({ key: depth(EPI_L) + 3, svg: wrap("ligament", tube([[EPI_L[0], EPI_L[1] - 1, EPI_L[2] - 0.6], at(21, FIB[0], FIB[1] + 3.4)], 1.2, { caps: false })) });
    items.push({ key: depth(EPI_M) - 1, svg: wrap("ligament", tube([[EPI_M[0], EPI_M[1] + 1, EPI_M[2] - 0.6], at(23, -1, -17.6), at(44, 0.4, -5.4)], (t) => 1.6 - 0.4 * t, { caps: false })) });

    const { centre, out, down } = M.patellaFrame(deg);
    const front = G.dot3(out, V) > 0;
    const pKey = depth(centre) + 30;
    const patF = G.frameOf(G.add3(centre, G.mul3(out, 0.8)), down, out, Y);
    const facetF = G.frameOf(G.add3(centre, G.mul3(out, -2.2)), down, out, Y);
    const facetProfile = [[-7.8, 1.2, 1], [-6.4, 4.4, 1], [-2.4, 5.6, 1], [2, 5, 1], [5.6, 2.8, 1], [7, 0.8]];
    const facetSvg = S(G.solidOf(facetProfile, facetF, P), { tone: "hi", crease: "none" });
    items.push({ key: pKey - 1, svg: wrap("cartilage", facetSvg) + `<g style="opacity:${Math.min(1, pfShare).toFixed(3)}">${wrap("muscle", facetSvg, 1)}</g>` });
    const patProfile = [[-8.8, 1.2, 1], [-8, 4, 1], [-5.6, 5.8, 1], [-1.6, 6, 1], [2.6, 5, 1], [6.2, 2.8, 1], [8.4, 0.8]];
    const patCurve = G.profileCurve(patProfile);
    const ridge = front ? Ln(arcAt(patF, patCurve, -1.6), { tone: "faint" }) : "";
    items.push({ key: pKey, svg: wrap("bone", S(G.solidOf(patProfile, patF, P), { tone: "hi", crease: "none", inner: ridge })) });

    const { top, bottom } = M.poles(deg);
    const under = Math.min(...quads.slice(0, 3).map((m) => m.key), pKey) - 0.5;
    const inP = (p, toward, by) => G.add3(p, G.mul3(unit(G.sub3(toward, p)), -by));
    items.push({ key: under, svg: wrap("tendon", tube([[top[0] - 0.6, -3.2, top[2] - 0.6], G.add3(VMJ, [-4, 0, 0])], (t) => 1.6 + 0.6 * t, { caps: false })) });
    items.push({ key: pKey - 0.7, svg: wrap("tendon", tube([[top[0] - 0.6, 3.2, top[2] - 0.6], G.add3(VLJ, [-3, 0, 0])], (t) => 1.6 + 0.4 * t, { caps: false })) });
    items.push({ key: pKey - 0.6, svg: wrap("tendon", tube([inP(top, QJ, 1.5), G.add3(QJ, [-5, 0, 0.6])], (t) => 3.4 - 1.2 * t, { caps: false })) });
    const tub = at(M.TUBEROSITY[0] + 2, M.TUBEROSITY[1] + 0.2);
    items.push({ key: pKey - 0.5, svg: wrap("tendon", tube([inP(bottom, tub, 1.5), tub], (t) => 2.5 - 0.5 * t, { caps: false })) });

    items.push({ key: depth(at(22, FIB[0], FIB[1] + 2)) + 2, svg: wrap("tendon", tube(G.fillet([G.add3(BFJ, [-4, 0, 0]), [-6, 13, M.H - 10.5], at(21, FIB[0] - 1.5, FIB[1] + 2.6)], 12), (t) => 1.9 - 0.5 * t, { caps: false })) });
    items.push({ key: depth(at(26, 2, -14)) - 1, svg: wrap("tendon", tube([G.add3(STJ, [-4, 0, 0]), [-8, -15, M.H - 9], at(28, 2.4, -13.6)], 1.4, { caps: false })) });

    const gl = muscle(at(26, -15, 7), at(78, -12, 6), [[0, 2.4, 1], [10, 6.8, 1], [28, 9, 1], [52, 8.4]], 9, 0.06, 0.4);
    const gm = muscle(at(24, -15, -7), at(78, -12, -6), [[0, 2.4, 1], [10, 7, 1], [28, 9.4, 1], [54, 8.8]], 9, 0.06, 0.1);
    items.push(gl, gm);
    items.push({ key: gl.key - 0.5, svg: wrap("tendon", tube([GLJ, at(29, -15, 7)], (t) => 1.6 + 0.6 * t, { caps: false })) });
    items.push({ key: gm.key - 0.5, svg: wrap("tendon", tube([GMJ, at(27, -15, -7)], (t) => 1.6 + 0.6 * t, { caps: false })) });

    const knee3 = G.lerp3([-14, 0, M.H - 15], at(14, -13, 0), 0.5);
    items.push({ key: -1e4, svg: wrap("vessel", tube([[-70, -1, M.H - 16], [-22, -1, M.H - 15], knee3, at(30, -12.5, -1), at(76, -11, -1)], 1.5)) });
    items.push({ key: -1e4 + 1, svg: wrap("nerve", tube([[-70, 2.2, M.H - 16.5], [-22, 2.2, M.H - 15.5], G.add3(knee3, [0, 2.2, 0]), at(30, -12.5, 1.6), at(76, -11, 1.6)], 1)) });
    items.push({ key: depth(at(15)) + 1.4, svg: wrap("nerve", tube(G.fillet([[-30, 6, M.H - 15.5], [-10, 12, M.H - 14], at(18, FIB[0] - 5, FIB[1] + 4.4), at(31, FIB[0] - 0.6, FIB[1] + 1.2)], 14), 0.7)) });

    return items.sort((a, b) => a.key - b.key).map((item) => item.svg).join("");
  }

  const skinThigh = (() => {
    const F = G.frameOf([6, 0, M.H + 1], [-1, 0, 0], Y, [0, 0, 1]);
    return S(G.solidOf([[0, 15, 1], [8, 21, 1], [30, 24, 1], [60, 25.5, 1], [76, 26]], F, P), { tone: "hi", crease: "none" });
  })();
  function skin(deg) {
    const { d, n } = M.axisOf(deg);
    const F = G.frameOf(M.tibiaPoint(deg, 0, -2), d, n, Y);
    const leg = S(G.solidOf([[-2, 16, 1], [12, 20, 1], [36, 22.5, 1], [62, 20, 1], [80, 18]], F, P), { tone: "hi", crease: "none" });
    const front = depth(M.tibiaPoint(deg, 40)) > depth([-36, 0, M.H]);
    return `<g class="tissue-skin">${front ? skinThigh + leg : leg + skinThigh}</g>`;
  }

  return { knee, skin };
}
