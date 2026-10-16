export function makeParts(k, G, P, M) {
  const V = G.viewOf(P);
  const S = (paths, style) => k.solidSvg(paths, style);
  const L = (d, style) => k.lineSvg(d, style);
  const depth = (p) => G.dot3(p, V);
  const SOLE = M.SOLE;

  const along = (from, to) => {
    const a = G.sub3(to, from);
    return { F: G.frameAlong(from, a), length: G.len3(a) };
  };

  const ellipsoid = (length, radius, { front = 0.5, flat = 1 } = {}) => {
    const out = [];
    const n = 16;
    for (let i = 1; i < n; i++) {
      const t = 0.5 - 0.5 * Math.cos((Math.PI * i) / n);
      const lean = 1 + (front - 0.5) * 1.8 * (t - 0.5);
      out.push([length * t, radius * flat * Math.sqrt(1 - (2 * t - 1) ** 2) * lean, 1]);
    }
    return [[0, 0.01], ...out, [length, 0.01]];
  };

  const shaftProfile = (length, rBase, rShaft, rNeck) => [
    [0, rBase * 0.7, 1],
    [length * 0.08, rBase, 1],
    [length * 0.24, rShaft * 1.15, 1],
    [length * 0.55, rShaft, 1],
    [length * 0.86, rNeck, 1],
    [length, rNeck * 1.05, 1],
  ];

  const FOOT = [
    { name: "calcaneus", from: [-80, 0, 27], to: [12, -8, 36], profile: ellipsoid(92, 18, { front: 0.25 }), tone: "hi" },
    { name: "talus", from: [-38, 1, 74], to: [24, 3, 58], profile: [[0, 0.01], [3, 11, 1], [10, 17.5, 1], [17, 19, 1], [26, 16, 1], [38, 10, 1], [46, 9, 1], [54, 10.5, 1], [60, 7, 1], [62, 0.01]], tone: "hi" },
    { name: "navicular", from: [22, 6, 59], to: [38, 6, 54], profile: ellipsoid(16, 12, { front: 0.5 }), tone: "hi" },
    { name: "cuboid", from: [10, -20, 40], to: [36, -22, 38], profile: ellipsoid(26, 11, { front: 0.55 }), tone: "mid" },
    { name: "cuneiform-1", from: [38, 17, 56], to: [58, 18, 52], profile: ellipsoid(20, 9.5, { front: 0.55 }), tone: "hi" },
    { name: "cuneiform-2", from: [40, 5, 53], to: [58, 6, 50], profile: ellipsoid(18, 8, { front: 0.55 }), tone: "hi" },
    { name: "cuneiform-3", from: [38, -8, 48], to: [56, -6, 45], profile: ellipsoid(18, 8, { front: 0.55 }), tone: "mid" },
  ];

  const RAYS = [
    { base: [58, 18, 52], x: 120, y: 26, head: 10, rBase: 8, rShaft: 5.2 },
    { base: [60, 6, 50], x: 123, y: 12, head: 8, rBase: 6.4, rShaft: 3.8 },
    { base: [57, -5, 45], x: 120, y: 0, head: 7.8, rBase: 6, rShaft: 3.6 },
    { base: [54, -14, 40], x: 116, y: -12, head: 7.4, rBase: 6, rShaft: 3.5 },
    { base: [38, -23, 36], x: 110, y: -24, head: 7.4, rBase: 7, rShaft: 3.6 },
  ].map((ray) => ({ ...ray, centre: [ray.x, ray.y, SOLE + ray.head] }));

  const TOES = RAYS.map((ray, index) => {
    const big = index === 0;
    const r = big ? 5.6 : 3.8 - index * 0.2;
    const lengths = big ? [27, 21] : [22 - index * 1.6, 11 - index * 0.6, 8 - index * 0.4];
    let x = ray.x + ray.head * 0.82;
    const bones = [];
    lengths.forEach((length, step) => {
      const radius = r * (1 - step * 0.12);
      const from = [x, ray.y + (big ? 1 : -index * 0.6) * step, SOLE + radius];
      const to = [x + length, ray.y + (big ? 1 : -index * 0.6) * (step + 1), SOLE + radius * 0.92];
      bones.push({ from, to, radius, last: step === lengths.length - 1 });
      x += length + 1.2;
    });
    return bones;
  });

  function footItems(theta) {
    const roll = M.rollOf(theta);
    const items = [];
    for (const bone of FOOT) {
      const from = roll(bone.from);
      const to = roll(bone.to);
      const { F } = along(from, to);
      const mid = G.lerp3(from, to, 0.5);
      items.push({ key: depth(mid), svg: S(G.lathe([[0, 0], ...bone.profile, [bone.profile[bone.profile.length - 1][0], 0]], F, P, { steps: 40, smooth: { rows: 3 } }), { tone: bone.tone, crease: "none" }) });
    }
    RAYS.forEach((ray, index) => {
      const base = roll(ray.base);
      const centre = roll(ray.centre);
      const { F, length } = along(base, centre);
      const mid = G.lerp3(base, centre, 0.5);
      items.push({ key: depth(mid) + (index === 0 ? 2 : 0), svg: S(G.lathe([[0, 0], ...shaftProfile(length, ray.rBase, ray.rShaft, ray.head * 0.62), [length, 0]], F, P, { steps: 32, smooth: { rows: 3 } }), { tone: index > 2 ? "mid" : "hi", crease: "none" }) });
      items.push({ key: depth(centre) + 6, svg: S(G.sphereOf(centre, ray.head, P, { steps: 36 }), { tone: index > 2 ? "mid" : "hi" }) });
    });
    items.sort((a, b) => a.key - b.key);
    return items.map((item) => item.svg).join("");
  }

  function fasciaOf(theta) {
    const roll = M.rollOf(theta);
    const from = roll([-58, 2, SOLE + 4]);
    const to = [RAYS[0].x + 4, 8, SOLE + 1.8];
    const middle = G.lerp3(from, to, 0.5);
    middle[2] -= 2 * Math.cos((theta * Math.PI) / 180);
    return k.wireSvg(k.iso(from, P), k.iso(to, P), { via: [k.iso(middle, P)], tone: "mid", size: 0.9 });
  }

  function toes() {
    const items = [];
    TOES.forEach((bones) => bones.forEach((bone) => {
      const { F, length } = along(bone.from, bone.to);
      const r = bone.radius;
      const profile = bone.last ? [[0, r * 0.9, 1], [length * 0.3, r * 0.72, 1], [length * 0.75, r * 0.7, 1], [length, r * 0.25, 1]] : [[0, r, 1], [length * 0.25, r * 0.7, 1], [length * 0.75, r * 0.68, 1], [length, r * 0.86, 1]];
      items.push({ key: depth(G.lerp3(bone.from, bone.to, 0.5)), svg: S(G.lathe([[0, 0], ...profile, [length, 0]], F, P, { steps: 28, smooth: { rows: 3 } }), { tone: "hi", crease: "none" }) });
    }));
    items.sort((a, b) => a.key - b.key);
    return items.map((item) => item.svg).join("");
  }

  const CELL = { from: 64, to: 94 };

  function tendonOf(pose) {
    const { F, length } = along(pose.insertion, pose.junction);
    const s0 = length - CELL.to;
    const s1 = length - CELL.from;
    const out = [];
    out.push(S(G.lathe([[0, 0], [0, 3.6], [6, 3.6, 1], [s0 - 3, 3.2, 1], [s0 - 3, 0]], F, P, { steps: 28, smooth: { rows: 3 } }), { tone: "hi", lit: true, crease: "none" }));
    out.push(S(G.lathe([[s1 + 3, 0], [s1 + 3, 3.2], [length - 8, 3.6, 1], [length, 4.6, 1], [length, 0]], F, P, { steps: 28, smooth: { rows: 3 } }), { tone: "hi", lit: true, crease: "none" }));
    out.push(S(G.disc(s0 - 3.4, s0 + 1.6, 6.2, F, P, { steps: 36 }), { tone: "mid" }));
    out.push(S(G.disc(s1 - 1.6, s1 + 3.4, 6.2, F, P, { steps: 36 }), { tone: "mid" }));
    const body = G.lathe([[s0 + 1.6, 0], [s0 + 1.6, 9], [s0 + 2.6, 10], [s1 - 2.6, 10], [s1 - 1.6, 9], [s1 - 1.6, 0]], F, P, { steps: 48 });
    const seams = [s0 + 7, s1 - 7].map((s) => G.arcOf(F, s, 10, P)).join("");
    out.push(S(body, { tone: "mid", inner: L(seams, { tone: "faint" }) }));
    const mid = (s0 + s1) / 2;
    const port = G.pointOf(F, mid, 10, G.angleToward(F, [0, 1, 0]));
    const out1 = G.add3(port, [0, 4.2, 0]);
    const B = G.frameOf(port, [0, 1, 0], [1, 0, 0], [0, 0, 1]);
    out.push(S(G.disc(-0.6, 4.2, 2.6, B, P, { steps: 24 }), { tone: "mid" }));
    out.push(L(G.circleOf(B, 4.2, 1.2, P, 16), { tone: "lo" }));
    return { svg: out.join(""), port: out1 };
  }

  return { footItems, fasciaOf, toes, tendonOf, RAYS, depth };
}
