export function makeKnee(k, G, T, P, M) {
  const S = (paths, style) => k.solidSvg(paths, style);
  const Ln = (d, style) => k.lineSvg(d, style);
  const Y = [0, 1, 0];
  const O = [0, 0, M.H];
  const V = G.viewOf(P);
  const tube = (points, radius, style, options = {}) =>
    T.tubePieces(points, radius, P, { maxLength: 400, ...options })
      .map((piece) => T.tubeSvg(piece, style))
      .join("");

  const femurFrame = G.frameOf(O, [-1, 0, 0], Y, [0, 0, 1]);
  const condyleFrame = G.frameOf(O, Y, [1, 0, 0], [0, 0, -1]);
  const sector = (r, a0, a1, steps = 28) => [
    [0, 0],
    ...Array.from({ length: steps + 1 }, (_, i) => {
      const phi = ((a0 + ((a1 - a0) * i) / steps) * Math.PI) / 180;
      return [r * Math.sin(phi), -r * Math.cos(phi)];
    }),
  ];
  const ellipse = (a, b, steps = 40, shift = 0) => Array.from({ length: steps }, (_, i) => [shift + a * Math.cos((i / steps) * Math.PI * 2), b * Math.sin((i / steps) * Math.PI * 2)]);
  const condyleProfile = (s0, s1) => [
    [s0, 8.2, 1],
    [s0 + 0.9, 10.2, 1],
    [s0 + 2.4, 11, 1],
    [s1 - 2.4, 11, 1],
    [s1 - 0.9, 10.2, 1],
    [s1, 8.2, 1],
  ];
  const femurProfile = [
    [1.2, 5.4, 1],
    [2.6, 8.6, 1],
    [5.5, 10.1, 1],
    [10, 9.6, 1],
    [17, 8.1, 1],
    [27, 6.7, 1],
    [42, 5.9, 1],
    [60, 5.6],
    [128, 5.6],
  ];
  const arcAt = (F, curve, s) => G.arcOf(F, s, curve.radius(s), P, { slope: curve.slope(s) });
  const femurCurve = G.profileCurve(femurProfile);
  const condyleCurve = G.profileCurve(condyleProfile(5, 16));
  const EPI_L = [-1.5, 17.4, M.H + 1.5];
  const EPI_M = [-1.5, -17.4, M.H + 1.5];
  const EPI_R = 2.6;

  const femur = {
    shaft: (() => {
      const paths = G.solidOf(
        femurProfile,
        femurFrame,
        P,
      );
      const seams = [70, 112].map((s) => G.arcOf(femurFrame, s, 5.6, P)).join("") + arcAt(femurFrame, femurCurve, 15);
      return S(paths, { tone: "hi", crease: "none", inner: Ln(seams, { tone: "faint" }) });
    })(),
    medial: S(G.solidOf(condyleProfile(-16, -5), condyleFrame, P), { tone: "hi", crease: "none" }),
    lateral: S(G.solidOf(condyleProfile(5, 16), condyleFrame, P), { tone: "hi", crease: "none", inner: Ln(arcAt(condyleFrame, condyleCurve, 14.9) + G.circleOf(condyleFrame, 16, 5.2, P), { tone: "faint" }) }),
    trochlea: S(G.prismOf(condyleFrame, sector(10.4, -42, 100), -5.2, 5.2, P), { tone: "mid", crease: "none" }),
    epiL: S(G.sphereOf(EPI_L, EPI_R, P), { tone: "hi" }),
    epiM: S(G.sphereOf(EPI_M, EPI_R, P), { tone: "hi" }),
  };

  const tibiaShaft = [
    [19, 8.8, 1],
    [25, 7.1, 1],
    [33, 5.8, 1],
    [46, 5, 1],
    [70, 4.6, 1],
    [112, 4.5, 1],
    [130, 5, 1],
    [140, 6.1, 1],
    [146, 6.3],
  ];
  const fibulaShaft = [
    [24, 2.5, 1],
    [32, 1.9, 1],
    [118, 1.9, 1],
    [132, 2.5, 1],
    [140, 2.9, 1],
    [145, 2.2],
  ];
  const FIB = [-4.6, 13.2];

  const tibiaCurve = G.profileCurve(tibiaShaft);

  function knee(deg) {
    const { d, n } = M.axisOf(deg);
    const F = G.frameOf(O, d, n, Y);
    const seen = Math.abs(G.dot3(d, V)) > 0.07;
    const at = (s, along = 0, side = 0) => M.tibiaPoint(deg, s, along, side);
    const fibF = G.frameOf(at(0, FIB[0], FIB[1]), d, n, Y);
    const head1 = S(G.prismOf(F, ellipse(10.4, 16.8, 48, -0.6), M.PLATEAU, 19.4, P), { tone: "hi", crease: "faint" });
    const shaft = S(G.solidOf(tibiaShaft, F, P), { tone: "hi", crease: "none", inner: seen ? Ln(arcAt(F, tibiaCurve, 96) + arcAt(F, tibiaCurve, 24) + arcAt(F, tibiaCurve, 138), { tone: "faint" }) : "" });
    const tub = S(G.sphereOf(at(M.TUBEROSITY[0], M.TUBEROSITY[1] - 1.6), 2.5, P), { tone: "hi" });
    const menisci = [-10.2, 10.2]
      .map((y) => {
        const MF = G.frameOf([0, y, M.H], d, n, Y);
        return S(G.ringBand(10, M.PLATEAU, 5.2, 7, MF, P), { tone: "mid", crease: "faint" });
      });
    const fibHead = S(G.sphereOf(at(22, FIB[0], FIB[1]), 3.4, P), { tone: "hi" });
    const fibula = S(G.solidOf(fibulaShaft, fibF, P), { tone: "hi", crease: "none" });
    const acl = tube([[-3.4, 3.2, M.H - 6.4], at(M.PLATEAU, 3.2, 1.6)], 1.25, { tone: "mid" });
    const pcl = tube([[2.6, -3.2, M.H - 6.8], at(M.PLATEAU + 0.6, -6.2, -1.6)], 1.35, { tone: "mid" });
    const lcl = tube([[EPI_L[0], EPI_L[1] + EPI_R - 0.4, EPI_L[2] - 0.6], at(22, FIB[0], FIB[1] + 3.0)], 1.15, { tone: "hi" });
    const mcl = tube([[EPI_M[0], EPI_M[1] - EPI_R + 0.4, EPI_M[2] - 0.6], at(23, -1, -17.4), at(44, 0.4, -5.2)], 1.2, { tone: "mid" }, { caps: true });
    const { centre, out, down } = M.patellaFrame(deg);
    const PF = G.frameOf(centre, out, down, Y);
    const tri = G.hullOf([
      ...ellipse(2.8, 2.8, 20, 0).map(([x, y]) => [x - 5.8, y - 5]),
      ...ellipse(2.8, 2.8, 20, 0).map(([x, y]) => [x - 5.8, y + 5]),
      ...ellipse(2, 2, 16, 0).map(([x, y]) => [x + 6.2, y]),
    ]);
    const facet = G.hullOf(tri.map(([x, y]) => [x * 0.66 - 0.6, y * 0.66]));
    const face = G.add3(centre, G.mul3(out, 2.6));
    const facetLine = Ln(k.pathOf(facet.map(([x, y]) => k.iso([face[0] + down[0] * x, y, face[2] + down[2] * x], P)), true), { tone: "lo" });
    const patella = S(G.prismOf(PF, tri, -2.8, 2.6, P), { tone: "hi", lit: true, crease: "lo", inner: G.dot3(out, V) > 0 ? facetLine : "" });
    const { top, bottom } = M.poles(deg);
    const quad = tube([top, [M.CLEVIS[0] + 8, 0, M.CLEVIS[2]]], (t) => 2.7 - 0.9 * t, { tone: "lit" });
    const patellar = tube([bottom, at(M.TUBEROSITY[0], M.TUBEROSITY[1] + 0.6)], 2.0, { tone: "lit" });
    const CF = G.frameOf(O, d, n, Y);
    const cuffBand = S(G.ringBand(M.CUFF - 4.5, M.CUFF + 4.5, 4.6, 6.4, CF, P), {
      tone: "mid",
      crease: "none",
      inner: seen ? Ln([M.CUFF - 1.6, M.CUFF + 1.6].map((s) => G.arcOf(CF, s, 6.4, P)).join(""), { tone: "lo" }) : "",
    });
    const tab = S(G.solidOf([[145.6, 5.4], [147.4, 5.4, 1], [148.4, 4.4, 1], [148.8, 2.6]], CF, P), { tone: "mid", crease: "none" }) + S(G.disc(148.8, M.EYE - 1.2, 0.9, CF, P), { tone: "mid" });
    const eye = S(G.sphereOf(M.eyeOf(deg), 1.6, P), { tone: "mid" });
    const plateauUp = -G.dot3(d, V) > 0;
    const tibiaSet = [shaft, tub, head1];
    const femurCore = [femur.medial, femur.trochlea, acl, pcl, femur.lateral];
    const order = plateauUp
      ? [femur.epiM, mcl, femur.shaft, fibula, fibHead, ...tibiaSet, ...menisci, ...femurCore]
      : [femur.epiM, mcl, femur.shaft, ...menisci, ...femurCore, ...tibiaSet, fibula, fibHead];
    return [...order, femur.epiL, lcl, cuffBand, tab, eye, patellar, quad, patella].join("");
  }

  const GF = G.frameOf([0, 24, M.H], Y, [1, 0, 0], [0, 0, -1]);
  const pin = S(G.disc(-4.6, 0, 1.5, GF, P), { tone: "mid" });
  const armPoly = (from, to, w) => G.hullOf([...ellipse(w, w, 16).map(([x, y]) => [x + from, y]), ...ellipse(w, w, 16).map(([x, y]) => [x + to, y])]);
  const femArm = (() => {
    const AF = G.frameOf([0, 24, M.H], Y, [-1, 0, 0], [0, 0, 1]);
    const paths = G.prismOf(AF, armPoly(4, 40, 1.5), -1.2, 0, P);
    return S(paths, { tone: "mid", crease: "faint" }) + k.dotsSvg([k.iso([-36, 24, M.H], P), k.iso([-24, 24, M.H], P)], { size: 0.45, tone: "lo" });
  })();
  const dialFace = (() => {
    const disc = G.disc(0, 1.2, 7.6, GF, P);
    const minor = G.spokesOf(GF, 1.2, 6.2, 7, 19, P, { from: 0, to: (Math.PI / 2) * (19 / 18) });
    const major = G.spokesOf(GF, 1.2, 5.2, 7, 4, P, { from: 0, to: (Math.PI / 2) * (4 / 3) });
    return S(disc, { tone: "mid", crease: "none", inner: Ln(G.circleOf(GF, 1.2, 7, P), { tone: "faint" }) }) + Ln(minor, { tone: "lo" }) + Ln(major, { tone: "mid" });
  })();
  function goniometer(deg) {
    const { d } = M.axisOf(deg);
    const AF = G.frameOf([0, 24, M.H], Y, d, G.cross3(Y, d));
    const arm = G.prismOf(AF, armPoly(-2.5, 40, 1.4), 1.2, 2.4, P);
    const tip = G.add3([0, 25.4, M.H], G.mul3(d, 7));
    const base = G.add3([0, 25.4, M.H], G.mul3(d, 4.6));
    const index = Ln(k.pathOf([k.iso(base, P), k.iso(tip, P)]), { tone: "lit" });
    const screws = k.dotsSvg([k.iso(G.add3([0, 25.4, M.H], G.mul3(d, 36)), P), k.iso(G.add3([0, 25.4, M.H], G.mul3(d, 24)), P)], { size: 0.45, tone: "lo" });
    const hub = S(G.disc(2.4, 3.2, 1.8, GF, P), { tone: "mid" });
    return pin + femArm + dialFace + S(arm, { tone: "mid", crease: "faint" }) + index + screws + hub;
  }

  return { knee, goniometer };
}
