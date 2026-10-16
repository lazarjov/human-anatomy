export const BODY = {
  thigh: 86,
  shank: 86,
  hipX: 8,
  sitBack: 0.42,
  hipY: 20,
  ankleZ: 16,
  stand: 0.9962,
  reach: 0.9985,
  foot: [[-8, -16], [27, -16], [29, -13], [27, -10], [6, 0], [-3, 4], [-10, 1], [-13, -6], [-12, -12]],
  toe: [[27, -16], [40, -16], [41.4, -14.6], [40, -12.6], [28.5, -11.2]],
  ball: [27, -16],
  footHalf: 7,
};

export function makeBody(k, G, P, M) {
  const B = BODY;
  const L1 = B.thigh;
  const L2 = B.shank;
  const S = (paths, style) => k.solidSvg(paths, style);
  const Ln = (d, style) => k.lineSvg(d, style);
  const at = (p) => k.iso(p, P);
  const rotXZ = ([x, z], angle) => [x * Math.cos(angle) - z * Math.sin(angle), x * Math.sin(angle) + z * Math.cos(angle)];
  const d0 = 2 * L1 * B.stand;
  const dTop = 2 * L1 * B.reach;
  const hip0 = B.ankleZ + Math.sqrt(d0 * d0 - B.hipX * B.hipX);
  const ankleAt = (theta) => {
    const r = rotXZ([-B.ball[0], -B.ball[1]], -theta);
    return [B.ball[0] + r[0], B.ball[1] + r[1] + B.ankleZ];
  };
  const hipXOf = (rise) => B.hipX + B.sitBack * Math.min(0, rise);
  const reachOf = (theta, hz) => {
    const [ax, az] = ankleAt(theta);
    return Math.hypot(B.hipX - ax, hz - az);
  };
  function contactPose(rise) {
    const hz = hip0 + rise;
    const want = rise <= 0 ? null : d0 + (dTop - d0) * Math.min(1, rise / (M.TAKEOFF_AT / M.UNIT));
    let theta = 0;
    if (want !== null) {
      let lo = 0, hi = 1.1;
      for (let i = 0; i < 40; i++) {
        const mid = (lo + hi) / 2;
        if (reachOf(mid, hz) > want) lo = mid;
        else hi = mid;
      }
      theta = (lo + hi) / 2;
    }
    return { hz, theta, lift: 0 };
  }
  const takeoff = contactPose(M.TAKEOFF_AT / M.UNIT);
  function poseAt(s, contact) {
    const rise = s / M.UNIT;
    const base = contact ? contactPose(Math.min(rise, M.TAKEOFF_AT / M.UNIT)) : { ...takeoff, hz: hip0 + rise, lift: rise - M.TAKEOFF_AT / M.UNIT };
    const [ax, az0] = ankleAt(base.theta);
    const az = az0 + base.lift;
    const hx = hipXOf(rise);
    const dx = hx - ax;
    const dz = base.hz - az;
    const d = Math.min(Math.hypot(dx, dz), L1 + L2 - 0.01);
    const along = [dx / d, dz / d];
    const half = d / 2;
    const out = Math.sqrt(Math.max(0, L1 * L1 - half * half));
    const knee = [ax + along[0] * half + along[1] * out, az + along[1] * half - along[0] * out];
    const flex = 180 - (2 * Math.asin(Math.min(1, half / L1)) * 180) / Math.PI;
    return { shift: hx - B.hipX, hip: [hx, base.hz], knee, ankle: [ax, az], theta: base.theta, lift: base.lift, flex };
  }
  const p3 = ([x, z], y) => [x, y, z];
  const FEMUR = [[-6.5, 6], [-2.6, 8.4, 1], [4, 7.6, 1], [12, 5.4, 1], [44, 4.6, 1], [71, 5.4, 1], [80, 8.2, 1], [85, 9.2, 1], [91, 6.8]];
  const TIBIA = [[-6, 8.2], [-1.4, 9.4, 1], [6, 8.4, 1], [18, 5.4, 1], [58, 4.1, 1], [79, 4.7, 1], [85, 6, 1], [89, 5]];
  const FIBULA = [[7, 2.4], [10, 3.1, 1], [40, 2, 1], [80, 2.7, 1], [86, 3.6, 1], [89.5, 2.6]];
  const STEP = 0.0025;
  const cache = new Map();
  const zero = at([0, 0, 0]);
  const bone = (name, profile, o, axis, tone) => {
    const turn = Math.round(Math.atan2(axis[0], -axis[2]) / STEP);
    const key = name + turn;
    let svg = cache.get(key);
    if (!svg) {
      const a = turn * STEP;
      svg = S(G.solidOf(profile, G.frameAlong([0, 0, 0], [Math.sin(a), 0, -Math.cos(a)]), P), { tone, crease: "none" });
      cache.set(key, svg);
    }
    const p = at(o);
    return `<g transform="translate(${(p[0] - zero[0]).toFixed(2)} ${(p[1] - zero[1]).toFixed(2)})">${svg}</g>`;
  };
  const pinOf = (c, y0, y1, r) => S(G.disc(y0, y1, r, G.frameOf(c, [0, 1, 0], [1, 0, 0], [0, 0, 1]), P, { steps: 20 }), { tone: "mid", crease: "none" });
  const capDot = (c) => k.dotsSvg([at(c)], { size: 0.5, tone: "lo" });
  function legSvg(pose, side) {
    const y = side * B.hipY;
    const near = side > 0;
    const hip = p3(pose.hip, y);
    const knee = p3(pose.knee, y);
    const ankle = p3(pose.ankle, y);
    const thighAxis = G.unit3(G.sub3(knee, hip));
    const shankAxis = G.unit3(G.sub3(ankle, knee));
    const out = [];
    const footF = G.frameOf([0, y, 0], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
    const toFoot = ([x, z]) => {
      const r = rotXZ([x - B.ball[0], z - B.ball[1]], -pose.theta);
      return [B.ball[0] + r[0], B.ball[1] + r[1] + B.ankleZ + pose.lift];
    };
    const toeTilt = pose.lift > 0 ? -0.4 * pose.theta * Math.min(1, pose.lift / 12) : 0;
    const toToe = ([x, z]) => {
      const r = rotXZ([x - B.ball[0], z - B.ball[1]], toeTilt);
      return [B.ball[0] + r[0], B.ball[1] + r[1] + B.ankleZ + pose.lift];
    };
    const far = (c, r, w) => pinOf(G.add3(c, [0, -w - 2.2, 0]), 0, 2.2, r);
    const nearCap = (c, r, w) => pinOf(G.add3(c, [0, w, 0]), 0, 2.2, r) + capDot(G.add3(c, [0, w + 2.2, 0]));
    out.push(far(hip, 4.4, 9.4), far(knee, 4.2, 9.8), far(ankle, 3.6, 7.4));
    const fib = (thick) => bone("f", FIBULA, G.add3(knee, [-2.2, side * 6.4, 0]), shankAxis, thick);
    if (!near) out.push(fib("mid"));
    out.push(S(G.prismOf(footF, B.toe.map(toToe), -B.footHalf + 0.6, B.footHalf - 0.6, P), { tone: "hi", crease: "lo" }));
    out.push(S(G.prismOf(footF, B.foot.map(toFoot), -B.footHalf, B.footHalf, P), { tone: "hi", crease: "lo" }));
    out.push(bone("t", TIBIA, knee, shankAxis, "hi"));
    if (near) out.push(fib("mid"));
    out.push(bone("m", FEMUR, hip, thighAxis, "hi"));
    const bisect = G.unit3([-(thighAxis[2] + shankAxis[2]), 0, thighAxis[0] + shankAxis[0]]);
    const forward = bisect[0] < 0 ? G.mul3(bisect, -1) : bisect;
    const patella = G.add3(knee, G.mul3(forward, 10.6));
    const sideOf = (a) => (a[2] > 0 ? [a[2], 0, -a[0]] : [-a[2], 0, a[0]]);
    const tf = sideOf(thighAxis);
    const sf = sideOf(shankAxis);
    const on = (o, a, s, n, f) => G.add3(o, G.add3(G.mul3(a, s), G.mul3(n, f)));
    const tuber = on(knee, shankAxis, 15, sf, 6.6);
    const heel = toFoot([-12.6, -8]);
    const heelPt = [heel[0], y, heel[1]];
    const curve = (points) => {
      const flat = points.map(at);
      let d = "M" + flat[0].map((v) => v.toFixed(1)).join(" ");
      for (let i = 1; i < flat.length - 1; i++) {
        const m = [(flat[i][0] + flat[i + 1][0]) / 2, (flat[i][1] + flat[i + 1][1]) / 2];
        d += "Q" + flat[i].map((v) => v.toFixed(1)).join(" ") + " " + (i === flat.length - 2 ? flat[i + 1] : m).map((v) => v.toFixed(1)).join(" ");
      }
      if (flat.length === 2) d += "L" + flat[1].map((v) => v.toFixed(1)).join(" ");
      return d;
    };
    const muscle = (points, end) => Ln(curve(points), { tone: "mid", className: "cmj-muscle" }) + k.dotsSvg([at(points[0]), at(points[points.length - 1])], { size: end, tone: "mid" });
    const hipPt = (dx, dz) => [hip[0] + dx, side * 12, hip[2] + dz];
    out.push(muscle([hipPt(-15, 16), on(hip, thighAxis, 10, tf, -9), on(hip, thighAxis, 20, tf, -6.4)], 0.9));
    out.push(muscle([hipPt(-12, -7), on(hip, thighAxis, 44, tf, -8.6), on(knee, shankAxis, 12, sf, -6.8)], 0.9));
    out.push(muscle([on(knee, thighAxis, -8, tf, -7.6), on(knee, shankAxis, 30, sf, -10.4), on(knee, shankAxis, 56, sf, -5.4)], 0.9));
    out.push(Ln(curve([on(knee, shankAxis, 56, sf, -5.4), heelPt]), { tone: "lo" }) + k.dotsSvg([at(heelPt)], { size: 0.7, tone: "lo" }));
    out.push(muscle([hipPt(11, 13), on(hip, thighAxis, 44, tf, 9.2), on(knee, thighAxis, -4, tf, 9.6)], 0.9));
    out.push(S(G.sphereOf(patella, 4.4, P, { steps: 28 }), { tone: "hi" }));
    out.push(Ln(curve([patella, tuber]), { tone: "lo" }) + k.dotsSvg([at(tuber)], { size: 0.7, tone: "lo" }));
    out.push(nearCap(hip, 4.4, 9.4), nearCap(knee, 4.2, 9.8), nearCap(ankle, 3.6, 7.4));
    return out.join("");
  }
  return { hip0, poseAt, legSvg, takeoff };
}
