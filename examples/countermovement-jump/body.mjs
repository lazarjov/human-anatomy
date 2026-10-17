export const BODY = {
  thigh: 86,
  shank: 86,
  hipX: 8,
  sitBack: 0.42,
  hipY: 20,
  ankleZ: 16,
  stand: 0.9962,
  reach: 0.9985,
  ball: [27, -16],
  lean: 0.5,
  leanDip: 62,
};

export function makeBody(k, G, P, M, T, TB) {
  const B = BODY;
  const L1 = B.thigh;
  const L2 = B.shank;
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
    const lean = 0.04 + B.lean * Math.min(1.2, Math.max(0, -rise / B.leanDip));
    return { shift: hx - B.hipX, hip: [hx, base.hz], knee, ankle: [ax, az], theta: base.theta, lift: base.lift, flex, lean };
  }

  const V = G.viewOf(P);
  const at = (p) => k.iso(p, P);
  const zero = at([0, 0, 0]);
  const f2 = (v) => v.toFixed(2);
  const cache = new Map();
  const memo = (key, make) => {
    let svg = cache.get(key);
    if (svg === undefined) {
      svg = make();
      cache.set(key, svg);
    }
    return svg;
  };
  const place = (svg, o) => {
    const p = at(o);
    return `<g transform="translate(${f2(p[0] - zero[0])} ${f2(p[1] - zero[1])})">${svg}</g>`;
  };
  const depth = (p) => G.dot3(p, V);
  const TS = (paths, tissue, options = {}) => T.tissueSvg(k.solidSvg, paths, tissue, { crease: "none", ...options });
  const quant = (v, step) => Math.round(v / step) * step;
  const dirOf = (from, to) => {
    const d = G.sub3(to, from);
    const length = G.len3(d);
    const u = G.unit3(d);
    const qu = G.unit3(u.map((c) => quant(c, 0.004)));
    return { dir: qu, length: quant(length, 0.5), key: qu.map((c) => Math.round(c / 0.004)).join(",") + ":" + Math.round(length * 2) };
  };
  const ballSvg = (tissue, r) => memo(`ball:${tissue}:${r}`, () => TS(G.sphereOf([0, 0, 0], r, P, { steps: 36 }), tissue));
  const ballAt = (tissue, c, r) => place(ballSvg(tissue, r), c);
  const rod = (tissue, from, to, shape, tag) => {
    const { dir, length, key } = dirOf(from, to);
    const svg = memo(`rod:${tissue}:${tag}:${key}`, () => TS(G.solidOf(shape(length), G.frameAlong([0, 0, 0], dir), P), tissue));
    return place(svg, from);
  };
  const cord = (r) => (length) => [[0, r * 0.55, 1], [Math.min(0.8, length / 3), r, 1], [Math.max(length - 0.8, length * 2 / 3), r, 1], [length, r * 0.55]];

  const FIBERS = [-1.05, -0.55, 0, 0.55, 1.05];
  const KNOTS = 14;
  function bellyRadius(u, R, peak) {
    const w = u < peak ? (0.5 * u) / peak : 0.5 + (0.5 * (u - peak)) / (1 - peak);
    return R * Math.pow(Math.max(0, Math.sin(Math.PI * w)), 0.8);
  }
  function muscleSvg(from, to, spec) {
    const { dir, length, key } = dirOf(from, to);
    return memo(`muscle:${spec.name}:${key}`, () => {
      const F = G.frameAlong([0, 0, 0], dir);
      const s0 = spec.belly[0] * length;
      const s1 = spec.belly[1] * length;
      const span = s1 - s0;
      const knots = [];
      for (let i = 1; i < KNOTS; i++) {
        const u = i / KNOTS;
        knots.push([s0 + u * span, bellyRadius(u, spec.R, spec.peak ?? 0.45), 1]);
      }
      const facing = Math.atan2(G.dot3(F.v, V), G.dot3(F.u, V));
      const fibers = FIBERS.map((phi) => {
        const pts = [];
        for (let i = 0; i <= KNOTS; i++) {
          const u = i / KNOTS;
          pts.push(at(G.pointOf(F, s0 + u * span, bellyRadius(u, spec.R, spec.peak ?? 0.45) * 0.97, facing + phi * (0.85 + 0.15 * Math.sin(Math.PI * u)))));
        }
        return "M" + pts.map((p) => p.map((v) => v.toFixed(1)).join(" ")).join("L");
      });
      const fiberSvg = k.lineSvg(fibers.join(""), { tone: "lo", className: "tissue-fiber" });
      const parts = [];
      const r = spec.tendon ?? 1.3;
      if (s0 > 0.5) parts.push(TS(G.solidOf(cord(r)(s0 + 2), F, P), "tendon"));
      if (s1 < length - 0.5) parts.push(TS(G.solidOf(cord(r)(length - s1 + 2), G.frameAlong(G.mul3(dir, s1 - 2), dir), P), "tendon"));
      parts.push(TS(G.solidOf(knots, F, P, { smooth: { rows: 3 } }), "muscle", { inner: fiberSvg }));
      return parts.join("");
    });
  }

  const p3 = ([x, z], y) => [x, y, z];
  const smoothLoop = (points, per = 4) => {
    const n = points.length;
    const out = [];
    for (let i = 0; i < n; i++) {
      const p0 = points[(i - 1 + n) % n], p1 = points[i], p2 = points[(i + 1) % n], p3_ = points[(i + 2) % n];
      for (let j = 0; j < per; j++) {
        const t = j / per, t2 = t * t, t3 = t2 * t;
        out.push([0, 1].map((c) => 0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3_[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3_[c]) * t3)));
      }
    }
    return out;
  };
  const shrink = (loop, k0, [cx, cz]) => loop.map(([x, z]) => [cx + (x - cx) * k0, cz + (z - cz) * k0]);
  const LAYER = { bone: 0 };

  function footSvg(theta, tilt, side) {
    const key = `foot:${side}:${Math.round(theta / 0.01)}:${Math.round(tilt / 0.01)}`;
    return memo(key, () => {
      const lat = side;
      const toFoot = ([x, z], l) => {
        const r = rotXZ([x - B.ball[0], z - B.ball[1]], -Math.round(theta / 0.01) * 0.01);
        return [B.ball[0] + r[0], lat * l, B.ball[1] + r[1] + B.ankleZ];
      };
      const toToe = ([x, z], l) => {
        const r = rotXZ([x - B.ball[0], z - B.ball[1]], Math.round(tilt / 0.01) * 0.01);
        return [B.ball[0] + r[0], lat * l, B.ball[1] + r[1] + B.ankleZ];
      };
      const items = [];
      const add = (c, svg, bias = 0) => items.push({ key: depth(c) + bias, svg });
      const fascia = [toFoot([-9, -14.6], 0), toFoot([25, -15.4], 0)];
      add(G.lerp3(fascia[0], fascia[1], 0.5), rod("ligament", fascia[0], fascia[1], cord(0.9), "fascia"), -6);
      const heelA = toFoot([2, -6.5], 1), heelB = toFoot([-13.6, -10.2], 1);
      add(G.lerp3(heelA, heelB, 0.5), rod("bone", heelA, heelB, (L) => [[0, 3.4, 1], [L * 0.2, 4.8, 1], [L * 0.6, 5, 1], [L * 0.85, 4.6, 1], [L, 2.4]], "calc"), -1);
      add(toFoot([1, -2.5], 0), ballAt("bone", toFoot([1, -2.5], 0), 4.6), 1);
      add(toFoot([1, 1], 0), ballAt("cartilage", toFoot([0.6, 0.4], 0), 3.2), 1.5);
      add(toFoot([7, -5], -2), ballAt("bone", toFoot([7, -5], -2), 3), 0);
      add(toFoot([8, -11], 3.2), ballAt("bone", toFoot([8.4, -11.2], 3.2), 3), 0);
      for (const [x, z, l] of [[11.6, -6.6, -3.6], [11.9, -7.8, -1.2], [11.6, -9.2, 1]]) add(toFoot([x, z], l), ballAt("bone", toFoot([x, z], l), 2.2), 0.5);
      const baseL = [-4.2, -1.8, 0.4, 2.6, 4.4];
      const headL = [-5.2, -2.6, -0.2, 2.2, 4.4];
      const headR = [2.6, 1.9, 1.8, 1.7, 1.7];
      const tipX = [41, 38.4, 37, 35.4, 33.4];
      for (let i = 0; i < 5; i++) {
        const base = toFoot([13.2, -8.2 - i * 0.8], baseL[i]);
        const head = toFoot([27, -14.6 + (i === 0 ? 0.6 : 0)], headL[i]);
        const r = i === 0 ? 1.9 : 1.35;
        add(G.lerp3(base, head, 0.5), rod("bone", base, head, (L) => [[0, r * 1.25, 1], [L * 0.2, r, 1], [L * 0.8, r * 0.9, 1], [L, r * 1.1]], `mt${i}`), 0.6);
        add(head, ballAt("bone", head, headR[i]), 0.8);
        const joints = i === 0 ? [27, 34, tipX[0]] : [27, 27 + (tipX[i] - 27) * 0.45, 27 + (tipX[i] - 27) * 0.75, tipX[i]];
        for (let j = 0; j < joints.length - 1; j++) {
          const a = toToe([joints[j] + (j === 0 ? headR[i] * 0.6 : 0.4), -14.9 + (i === 0 ? 0.3 : 0)], headL[i]);
          const b = toToe([joints[j + 1] - 0.3, -15.2], headL[i]);
          const pr = (i === 0 ? 1.6 : 1.05) * (1 - j * 0.12);
          add(G.lerp3(a, b, 0.5), rod("bone", a, b, (L) => [[0, pr * 1.2, 1], [L * 0.3, pr * 0.85, 1], [L * 0.8, pr * 0.9, 1], [L, pr * 1.15]], `ph${i}${j}`), 0.9);
        }
      }
      return items.sort((a, b) => a.key - b.key).map((item) => item.svg).join("");
    });
  }

  const FEMUR = (L) => [[0, 4.6, 1], [5, 4, 1], [20, 3.6, 1], [L * 0.6, 3.5, 1], [L - 12, 4.4, 1], [L - 5, 6.2, 1], [L, 6.6]];
  const TIBIA = (L) => [[0, 8.6, 1], [2.5, 8.2, 1], [9, 6, 1], [20, 4.4, 1], [L * 0.62, 3.6, 1], [L - 7, 4, 1], [L - 2, 5, 1], [L, 5.2]];
  const FIBULA = (L) => [[0, 2.6, 1], [4, 1.8, 1], [L * 0.5, 1.6, 1], [L - 5, 1.9, 1], [L, 2.4]];
  const SKIN_THIGH = (L) => [[0, 6, 1], [3, 15, 1], [L * 0.25, 17, 1], [L * 0.6, 14.5, 1], [L - 8, 11.4, 1], [L - 2, 10.6, 1], [L, 6]];
  const SKIN_SHANK = (L) => [[0, 6, 1], [3, 10.4, 1], [L * 0.3, 12.2, 1], [L * 0.62, 9, 1], [L - 6, 5.8, 1], [L - 1.5, 5.4, 1], [L, 3]];

  const MUSCLES = {
    glute: { name: "glute", R: 8.2, belly: [0.04, 0.9], peak: 0.4, tendon: 1.8 },
    rectus: { name: "rectus", R: 4.8, belly: [0.1, 0.86], peak: 0.5 },
    vastusL: { name: "vastusL", R: 6, belly: [0.04, 0.88], peak: 0.55 },
    vastusM: { name: "vastusM", R: 5.4, belly: [0.18, 0.92], peak: 0.7 },
    biceps: { name: "biceps", R: 4.8, belly: [0.14, 0.82], peak: 0.5 },
    semi: { name: "semi", R: 4, belly: [0.1, 0.62], peak: 0.5, tendon: 1 },
    gastroL: { name: "gastroL", R: 5.6, belly: [0.06, 0.94], peak: 0.32 },
    gastroM: { name: "gastroM", R: 6.2, belly: [0.06, 0.94], peak: 0.34 },
    soleus: { name: "soleus", R: 4.6, belly: [0.12, 0.92], peak: 0.5 },
    tibialis: { name: "tibialis", R: 3.6, belly: [0.04, 0.9], peak: 0.4 },
  };
  const GROUP = { glute: "glute", rectus: "quad", vastusL: "quad", vastusM: "quad", biceps: "ham", semi: "ham", gastroL: "gastro", gastroM: "gastro", soleus: "soleus", tibialis: "tibialis" };
  const BIAS = { glute: 5, rectus: 2, vastusL: 4, vastusM: -4, biceps: 4, semi: -3, gastroL: 3, gastroM: -2, soleus: 2, tibialis: 2 };

  const pelvisPoint = (pose, x, z, y) => {
    const [rx, rz] = rotXZ([x, z], -pose.lean);
    return [pose.hip[0] + rx, y, pose.hip[1] + rz];
  };

  function legSvg(pose, side, act) {
    const y0 = side * B.hipY;
    const lat = [0, side, 0];
    const H = p3(pose.hip, y0);
    const K = p3(pose.knee, y0);
    const A = p3(pose.ankle, y0);
    const at3 = G.unit3(G.sub3(K, H));
    const as3 = G.unit3(G.sub3(A, K));
    const nt = [-at3[2], 0, at3[0]];
    const ns = [-as3[2], 0, as3[0]];
    const onT = (s, n, l) => G.add3(H, G.add3(G.mul3(at3, s), G.add3(G.mul3(nt, n), G.mul3(lat, l))));
    const onS = (s, n, l) => G.add3(K, G.add3(G.mul3(as3, s), G.add3(G.mul3(ns, n), G.mul3(lat, l))));
    const pel = (x, z, l) => pelvisPoint(pose, x, z, y0 + side * l);
    const toeTilt = pose.lift > 0 ? -0.4 * pose.theta * Math.min(1, pose.lift / 12) : 0;
    const footPoint = ([x, z], l) => {
      const r = rotXZ([x - B.ball[0], z - B.ball[1]], -Math.round(pose.theta / 0.01) * 0.01);
      return [B.ball[0] + r[0], y0 + side * l, B.ball[1] + r[1] + B.ankleZ + pose.lift];
    };
    const bisect = G.unit3([-(at3[2] + as3[2]), 0, at3[0] + as3[0]]);
    const forward = bisect[0] < 0 ? G.mul3(bisect, -1) : bisect;
    const patella = G.add3(K, G.mul3(forward, 9.4));
    const patellaTop = G.add3(patella, G.mul3(at3, -3.6));
    const items = [];
    const add = (c, svg, bias = 0) => items.push({ key: depth(c) + side * bias * V[1], svg });
    const level = (name) => Math.round((act ? act[GROUP[name]] : 0) * 50) / 50;
    const muscle = (name, from, to) => add(G.lerp3(from, to, 0.5), `<g ${T.activationAttrs(level(name))}>${place(muscleSvg(from, to, MUSCLES[name]), from)}</g>`, BIAS[name]);

    const skin = [rod("skin", G.add3(H, G.mul3(at3, -8)), G.add3(K, G.mul3(at3, 5)), SKIN_THIGH, "thigh"), rod("skin", G.add3(K, G.mul3(as3, -5)), G.add3(A, G.mul3(as3, 3)), SKIN_SHANK, "shank")];

    const neckEnd = onT(7, -0.6, 6.4);
    add(onT(4, 0, 3), rod("bone", H, neckEnd, (L) => [[0, 3.4, 1], [L * 0.5, 2.9, 1], [L, 3.6]], "neck"), 0.5);
    add(H, ballAt("cartilage", H, 5.2), -0.5);
    add(onT(6, -0.4, 6.6), ballAt("bone", onT(6, -0.8, 6.6), 4.2), 1);
    add(onT(14, -2.6, -1.4), ballAt("bone", onT(14, -2.6, -1.6), 2), -1);
    const shaft0 = onT(8, -0.4, 4.4);
    const shaft1 = onT(L1 - 4, -0.6, 0);
    add(G.lerp3(shaft0, shaft1, 0.5), rod("bone", shaft0, shaft1, FEMUR, "femur"), 0);
    for (const l of [-3.8, 3.8]) add(onT(L1 - 1.6, -1.6, l), ballAt("bone", onT(L1 - 1.4, -1.8, l), 5), l * 0.4);
    add(onT(L1 - 2, -1, 6.4), ballAt("bone", onT(L1 - 2.6, -0.6, 5.2), 2.2), 1.5);
    const plate0 = onS(3.6, -0.4, 0);
    add(plate0, rod("cartilage", onS(3.2, -0.4, 0), onS(4.6, -0.4, 0), (L) => [[0, 7.8, 1], [L, 8.2]], "plateau"), 0);
    add(onS(40, 0, 0), rod("bone", onS(4.6, -0.4, 0), onS(L2 - 2.6, 0, -0.4), TIBIA, "tibia"), 0);
    add(onS(13, 5.2, 0), ballAt("bone", onS(13, 4.6, 0.4), 2.4), 0.5);
    add(onS(L2 - 2, 0, -5.4), ballAt("bone", onS(L2 - 1.6, 0.4, -5.2), 2.8), -1.5);
    const fib0 = onS(8, -2.2, 6);
    const fib1 = onS(L2 - 2.4, -1.2, 6.4);
    add(G.lerp3(fib0, fib1, 0.5), rod("bone", fib0, fib1, FIBULA, "fibula"), 2);
    add(fib0, ballAt("bone", fib0, 2.8), 2.2);
    add(fib1, ballAt("bone", onS(L2 - 1.2, -1.2, 6.2), 2.8), 2.6);
    add(patella, ballAt("bone", patella, 4.3), 1);
    add(G.lerp3(patella, onS(13, 4.6, 0.4), 0.5), rod("tendon", patella, onS(12.4, 4.6, 0.4), cord(1.9), "patellar"), 1.2);
    add(onT(L1 - 2, -1, 6.3), rod("ligament", onT(L1 - 2.4, -0.8, 6.6), onS(8, -2, 6.4), cord(1.1), "lcl"), 3);
    add(onT(L1 - 2, 0, -5.6), rod("ligament", onT(L1 - 2.4, -0.6, -5.8), onS(17, 0.4, -5.2), cord(1.3), "mcl"), -3);

    const foot = footSvg(pose.theta, toeTilt, side);
    add(footPoint([6, -8], 0), place(foot, [0, y0, pose.lift]), -1);

    const heel = footPoint([-13.8, -8.8], 1);
    muscle("glute", pel(-17, 14, -4), onT(24, -5.4, 5));
    muscle("rectus", pel(7.4, 9, 0.4), patellaTop);
    muscle("vastusL", onT(9, 0, 6.6), G.add3(patellaTop, G.mul3(lat, 2.4)));
    muscle("vastusM", onT(30, 1.4, -4.2), G.add3(patellaTop, G.mul3(lat, -2.6)));
    muscle("biceps", pel(-6.4, -9, 1.6), onS(7.6, -3.4, 6.6));
    muscle("semi", pel(-6.4, -9, -1.4), onS(12, 0.4, -5.4));
    muscle("soleus", onS(9, -4.2, 3), onS(66, -4.6, 0.4));
    muscle("gastroL", onT(L1 - 6, -5.2, 3.8), onS(48, -6.6, 1));
    muscle("gastroM", onT(L1 - 6, -5.2, -3.8), onS(50, -6.6, -1));
    add(onS(68, -5.6, 0), rod("tendon", onS(49, -6.4, 0), heel, (L) => [[0, 2.4, 1], [L * 0.4, 1.6, 1], [L * 0.85, 1.4, 1], [L, 2]], "achilles"), 2.4);
    muscle("tibialis", onS(12, 5, 3), onS(60, 4.4, 0.6));
    const taFront = onS(L2 - 4, 5.4, -1.2);
    const taEnd = footPoint([11.6, -5.4], -3.6);
    add(onS(L2 - 8, 5, 0), rod("tendon", onS(59, 4.4, 0.6), taFront, cord(1), "ta1"), 2);
    add(G.lerp3(taFront, taEnd, 0.5), rod("tendon", taFront, taEnd, cord(1), "ta2"), 1.2);

    return { skin: skin.join(""), body: items.sort((a, b) => a.key - b.key).map((item) => item.svg).join("") };
  }

  const LUMBAR = [[-13.6, 35], [-12.6, 43], [-12.4, 51], [-13, 59], [-14.2, 67]];
  function trunkSvg(lean) {
    const lq = Math.round(lean / 0.005) * 0.005;
    return memo(`trunk:${Math.round(lean / 0.005)}`, () => {
      const pose = { hip: [0, 0], lean: lq };
      const pt = (x, z, y) => pelvisPoint(pose, x, z, y);
      const up = G.unit3(G.sub3(pt(0, 1, 0), pt(0, 0, 0)));
      const fwd = G.unit3(G.sub3(pt(1, 0, 0), pt(0, 0, 0)));
      const items = [];
      const add = (c, svg, bias = 0) => items.push({ key: depth(c) + bias, svg });
      for (const s of [-1, 1]) {
        const y = s * (B.hipY + 2.6);
        const back = pt(-16, 0, s * 8.2);
        const front = pt(12, 0, s * 26);
        const along = G.unit3(G.sub3(front, back));
        const normal = G.unit3(G.cross3(along, up));
        const WF = G.frameOf(back, s > 0 ? normal : G.mul3(normal, -1), along, up);
        const onWing = (u, z) => G.add3(G.add3(back, G.mul3(along, u)), G.mul3(up, z));
        const wing = smoothLoop([[0, 14], [1, 24], [6.6, 31], [16, 34.4], [25, 32.6], [31.4, 26.4], [33.2, 20.4], [30.4, 15.6], [26, 9.6], [23.6, 2.6], [18, 1.6], [12.4, 5.6], [5.6, 8.6]], 3);
        const face = G.dot3(WF.a, V) > 0 ? 1.45 : -1.45;
        const fossa = shrink(wing, 0.6, [17, 21]).map(([u, z]) => at(G.add3(G.add3(back, G.add3(G.mul3(along, u), G.mul3(up, z))), G.mul3(WF.a, face))));
        const fossaLine = k.lineSvg("M" + fossa.map((p) => p.map((v) => v.toFixed(1)).join(" ")).join("L") + "Z", { tone: "faint" });
        add(onWing(16, 17), TS(G.prismOf(WF, wing, -1.4, 1.4, P), "bone", { crease: "faint", inner: fossaLine }), s * 0.8);
        const crest = [[0.4, 22], [2.6, 28.2], [8, 32.4], [16, 34], [24.4, 32.2], [30.2, 26.8], [32.6, 20.4]].map(([u, z]) => onWing(u, z));
        const crestSvg = TB.tubePieces(crest, (t) => 1.9 + 0.8 * Math.sin(Math.PI * t), P, { maxLength: 400 }).map((piece) => TB.tubeSvg(piece, { tone: "hi" })).join("");
        add(onWing(16, 34), `<g class="tissue-bone">${crestSvg}</g>`, s * 1.6);
        for (const [u, z, r] of [[32.8, 19.6, 2.5], [29.6, 11.6, 2.1], [0.6, 15, 2.3]]) add(onWing(u, z), ballAt("bone", onWing(u, z), r), s * 1.7);
        const joint = [[0.2, 22], [0.2, 9], [-2.4, 9], [-2.4, 22]];
        add(onWing(-1, 15), TS(G.prismOf(WF, joint, -1.2, 1.2, P), "cartilage"), s * 0.9 - 0.2);
        add(pt(0, 0, s * B.hipY), TS(G.ringBand(s > 0 ? 1 : -3.2, s > 0 ? 3.2 : -1, 5.4, 7.6, G.frameOf(pt(0, 0, s * B.hipY), [0, 1, 0], fwd, up), P), "bone"), s * 1);
        const isch0 = pt(-3, -5.6, s * (B.hipY - 1));
        const isch1 = pt(-6.4, -10.6, s * (B.hipY - 2));
        add(G.lerp3(isch0, isch1, 0.5), rod("bone", isch0, isch1, cord(3), `isch${s}`), s * 0.6);
        add(isch1, ballAt("bone", isch1, 3), s * 0.6);
        const pub0 = pt(5.4, -4, s * (B.hipY - 3));
        const pub1 = pt(8.6, -6.4, s * 2.4);
        add(G.lerp3(pub0, pub1, 0.5), rod("bone", pub0, pub1, cord(1.9), `pub${s}`), s * 0.4);
        const ram0 = pt(-6, -10.4, s * (B.hipY - 3));
        const ram1 = pt(7.6, -8.6, s * 3);
        add(G.lerp3(ram0, ram1, 0.5), rod("bone", ram0, ram1, cord(1.2), `ram${s}`), s * 0.2 - 0.5);
      }
      add(pt(8.8, -6.8, 0), ballAt("cartilage", pt(8.8, -6.8, 0), 2.6), 0);
      const SF = G.frameOf([0, 0, 0], [0, 1, 0], fwd, up);
      const sacrumTilt = G.unit3(G.add3(G.mul3(fwd, 0.32), up));
      const AF = G.frameOf(pt(-18.6, 0, 0), fwd, [0, 1, 0], sacrumTilt);
      const ala = smoothLoop([[-10.4, 29], [0, 30.6], [10.4, 29], [9.6, 22], [6.4, 13], [3.2, 5], [0, 1.6], [-3.2, 5], [-6.4, 13], [-9.6, 22]], 3);
      const alaFace = G.dot3(AF.a, V) > 0 ? 5.6 : 0;
      const holes = [];
      for (const [z, w] of [[24, 4.6], [18, 3.9], [12, 3.1], [7, 2.2]]) for (const sy of [-1, 1]) holes.push(at(G.add3(G.add3(G.add3(AF.o, G.mul3(AF.a, alaFace + 0.05)), G.mul3(AF.u, sy * w)), G.mul3(AF.v, z))));
      add(pt(-14, 16, 0), TS(G.prismOf(AF, ala, 0, 5.6, P), "bone", { inner: k.dotsSvg(holes, { size: 0.7, tone: "mid" }) }), 0);
      for (const [x, z, r] of [[-16.6, -1.6, 1.7], [-15.4, -4.4, 1.4], [-13.8, -6.8, 1.1]]) add(pt(x, z, 0), ballAt("bone", pt(x, z, 0), r), 0);
      LUMBAR.forEach(([x, z], i) => {
        const c = pt(x, z, 0);
        const F = G.frameOf(G.add3(c, G.mul3(up, -2.8)), up, fwd, [0, 1, 0]);
        add(c, TS(G.disc(0, 5.6, 5.8, F, P, { steps: 40 }), "bone"), 0.2);
        add(G.add3(c, G.mul3(up, -3.9)), TS(G.disc(-2.2, 0, 5.4, F, P, { steps: 40 }), "cartilage"), 0.1);
        const spine0 = G.add3(c, G.mul3(fwd, -5.6));
        const spine1 = G.add3(G.add3(c, G.mul3(fwd, -13)), G.mul3(up, -1.6 - i * 0.1));
        add(G.lerp3(spine0, spine1, 0.5), rod("bone", spine0, spine1, (L) => [[0, 2.4, 1], [L * 0.5, 1.6, 1], [L, 2.2]], "spinous"), -0.4);
        for (const s of [-1, 1]) {
          const t0 = G.add3(G.add3(c, G.mul3(fwd, -4.4)), [0, s * 3, 0]);
          const t1 = G.add3(G.add3(c, G.mul3(fwd, -5.4)), [0, s * (9.4 - Math.abs(i - 2) * 0.6), 0]);
          add(G.lerp3(t0, t1, 0.5), rod("bone", t0, t1, (L) => [[0, 1.6, 1], [L * 0.6, 1.1, 1], [L, 1.3]], `tp${s}`), s * 0.3);
        }
      });
      const skinTorso = rod("skin", pt(-3, -18, 0), pt(-3, 82, 0), (L) => [[0, 6, 1], [5, 21, 1], [16, 29.5, 1], [32, 31, 1], [50, 27.5, 1], [66, 24.6, 1], [80, 22.6, 1], [92, 17, 1], [L, 0]], "torso");
      return { skin: skinTorso, body: items.sort((a, b) => a.key - b.key).map((item) => item.svg).join("") };
    });
  }

  function figureAt(pose, act) {
    const far = legSvg(pose, -1, act);
    const near = legSvg(pose, 1, act);
    const trunk = trunkSvg(pose.lean);
    const hipAt = [pose.hip[0], 0, pose.hip[1]];
    return {
      far: `<g class="cmj-skin">${far.skin}</g>${far.body}`,
      trunk: `<g class="cmj-skin">${place(trunk.skin, hipAt)}</g>${place(trunk.body, hipAt)}`,
      near: `<g class="cmj-skin">${near.skin}</g>${near.body}`,
    };
  }

  return { hip0, poseAt, figureAt, takeoff };
}
