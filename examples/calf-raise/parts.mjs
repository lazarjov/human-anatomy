export function makeParts(k, G, P, M) {
  const V = G.viewOf(P);
  const T = (paths, tissue, style = {}) => k.solidSvg(paths, { crease: "none", ...style, className: "tissue-" + tissue });
  const depth = (p) => G.dot3(p, V);
  const SOLE = M.SOLE;

  const along = (from, to) => {
    const a = G.sub3(to, from);
    return { F: G.frameAlong(from, a), length: G.len3(a) };
  };

  const closed = (profile) => [[0, 0], ...profile, [profile[profile.length - 1][0], 0]];

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

  const bone = (from, to, profile, steps = 40) => {
    const { F } = along(from, to);
    return T(G.lathe(closed(profile), F, P, { steps, smooth: { rows: 3 } }), "bone");
  };

  const band = (from, to, r0, r1, tissue, steps = 24) => {
    const { F, length } = along(from, to);
    return T(G.lathe([[0, 0], [0, r0, 1], [length * 0.5, (r0 + r1) * 0.42, 1], [length, r1, 1], [length, 0]], F, P, { steps, smooth: { rows: 2 } }), tissue);
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
    { from: [-80, 0, 27], to: [12, -8, 36], profile: ellipsoid(92, 18, { front: 0.25 }) },
    { from: [-86, 0, 30], to: [-62, 0, 24], profile: ellipsoid(24, 13, { front: 0.5 }) },
    { from: [-26, 13, 52], to: [-6, 15, 50], profile: ellipsoid(20, 6.4, { front: 0.5 }) },
    { from: [-38, 1, 74], to: [24, 3, 58], profile: [[0, 0.01], [3, 11, 1], [10, 17.5, 1], [17, 19, 1], [26, 16, 1], [38, 10, 1], [46, 9, 1], [54, 10.5, 1], [60, 7, 1], [62, 0.01]], cap: [8, 30] },
    { from: [22, 6, 59], to: [38, 6, 54], profile: ellipsoid(16, 12, { front: 0.5 }) },
    { from: [10, -20, 40], to: [36, -22, 38], profile: ellipsoid(26, 11, { front: 0.55 }) },
    { from: [38, 17, 56], to: [58, 18, 52], profile: ellipsoid(20, 9.5, { front: 0.55 }) },
    { from: [40, 5, 53], to: [58, 6, 50], profile: ellipsoid(18, 8, { front: 0.55 }) },
    { from: [38, -8, 48], to: [56, -6, 45], profile: ellipsoid(18, 8, { front: 0.55 }) },
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

  const oval = (from, to, wide, low) => {
    const { F, length } = along(from, to);
    return { F: G.frameOf(F.o, F.a, G.mul3(F.u, wide), G.mul3(F.v, low)), length };
  };

  function skinFoot(theta) {
    const roll = M.rollOf(theta);
    const { F, length } = oval(roll([-96, 0, 34]), roll([146, 2, 22]), 1.35, 0.8);
    const profile = [[0, 0.01], [4, 16, 1], [18, 30, 1], [60, 40, 1], [120, 42, 1], [180, 36, 1], [length - 14, 30, 1], [length, 24, 1]];
    return T(G.lathe([...profile, [length, 0]], F, P, { steps: 64, smooth: { rows: 3 } }), "skin");
  }

  function skinToes() {
    const { F, length } = oval([130, 2, 21], [200, -2, 12], 1.6, 0.55);
    return T(G.lathe([[0, 0], [0, 24, 1], [20, 22, 1], [46, 17, 1], [62, 10, 1], [length, 0.01, 1], [length, 0]], F, P, { steps: 48, smooth: { rows: 3 } }), "skin");
  }

  function footItems(theta) {
    const roll = M.rollOf(theta);
    const items = [];
    for (const part of FOOT) {
      const from = roll(part.from);
      const to = roll(part.to);
      const { F } = along(from, to);
      const mid = G.lerp3(from, to, 0.5);
      let svg = T(G.lathe(closed(part.profile), F, P, { steps: 40, smooth: { rows: 3 } }), "bone");
      if (part.cap) {
        const [s0, s1] = part.cap;
        const knots = part.profile.filter(([s]) => s >= s0 && s <= s1).map(([s, r]) => [s, r + 0.9, 1]);
        svg += T(G.lathe([[s0, 0], [s0, knots[0][1] - 1.4, 1], ...knots, [s1, knots[knots.length - 1][1] - 1.4, 1], [s1, 0]], F, P, { steps: 40, smooth: { rows: 3 } }), "cartilage");
      }
      items.push({ key: depth(mid), svg });
    }
    RAYS.forEach((ray, index) => {
      const base = roll(ray.base);
      const centre = roll(ray.centre);
      const { F, length } = along(base, centre);
      const mid = G.lerp3(base, centre, 0.5);
      items.push({ key: depth(mid) + (index === 0 ? 2 : 0), svg: T(G.lathe(closed(shaftProfile(length, ray.rBase, ray.rShaft, ray.head * 0.62)), F, P, { steps: 32, smooth: { rows: 3 } }), "bone") });
      items.push({ key: depth(centre) + 6, svg: T(G.sphereOf(centre, ray.head, P, { steps: 36 }), "bone") });
    });
    const a0 = roll([-56, 19, 30]);
    const a1 = roll([98, 27, 22]);
    const { F: AF, length: AL } = along(a0, a1);
    items.push({ key: depth(G.lerp3(a0, a1, 0.5)) + 12, svg: T(G.lathe([[0, 0], [0, 3, 1], [AL * 0.18, 7.6, 1], [AL * 0.45, 8.4, 1], [AL * 0.75, 5, 1], [AL, 2.4, 1], [AL, 0]], AF, P, { steps: 32, smooth: { rows: 3 } }), "muscle") });
    items.sort((a, b) => a.key - b.key);
    return skinFoot(theta) + items.map((item) => item.svg).join("");
  }

  function fasciaOf(theta) {
    const roll = M.rollOf(theta);
    const from = roll([-64, 2, SOLE + 7]);
    const mid = roll([22, 8, SOLE + 7]);
    const to = [RAYS[0].x + 2, 12, SOLE + 3];
    return band(from, mid, 3.4, 2.4, "ligament") + band(mid, to, 2.4, 2.8, "ligament");
  }

  function toes() {
    const items = [];
    TOES.forEach((bones) => bones.forEach((part) => {
      const { F, length } = along(part.from, part.to);
      const r = part.radius;
      const profile = part.last ? [[0, r * 0.9, 1], [length * 0.3, r * 0.72, 1], [length * 0.75, r * 0.7, 1], [length, r * 0.25, 1]] : [[0, r, 1], [length * 0.25, r * 0.7, 1], [length * 0.75, r * 0.68, 1], [length, r * 0.86, 1]];
      items.push({ key: depth(G.lerp3(part.from, part.to, 0.5)), svg: T(G.lathe(closed(profile), F, P, { steps: 28, smooth: { rows: 3 } }), "bone") });
    }));
    items.sort((a, b) => a.key - b.key);
    return items.map((item) => item.svg).join("");
  }

  function tendonOf(pose) {
    const { F, length } = along(pose.insertion, pose.junction);
    return T(G.lathe([[0, 0], [0, 6.4, 1], [5, 7.4, 1], [length * 0.22, 4.8, 1], [length * 0.6, 4.6, 1], [length - 10, 6.8, 1], [length, 9, 1], [length, 0]], F, P, { steps: 32, smooth: { rows: 3 } }), "tendon");
  }

  const MALLEOLUS = [-17, 17, 70];

  function crossings(pose) {
    const roll = pose.roll;
    const tip = G.add3(MALLEOLUS, pose.shift);
    const out = [];
    for (const [target, r] of [[[-30, 12, 58], 1.8], [[-18, 16, 52], 2], [[22, 14, 58], 1.7]]) out.push(band(tip, roll(target), 2.4, r, "ligament", 20));
    const retinaculum = G.add3([14, 4, 98], pose.shift);
    out.push(band(retinaculum, roll([46, 20, 54]), 2.8, 3.4, "tendon"));
    return out.join("");
  }

  const CORD = [[-62, 15, 238], [-52, 18, 180], [-42, 20, 120], [-36, 22, 94], [-30, 23, 76]];
  const SOLE_CORD = [[-22, 21, 58], [-8, 19, 42], [14, 15, 32]];

  function cordsOf(pose) {
    const path = (offset) => {
      const points = [...CORD.map((p) => G.add3(G.add3(p, offset), pose.shift)), ...SOLE_CORD.map((p) => pose.roll(G.add3(p, offset)))];
      return points.map((p, i) => (i ? "L" : "M") + k.iso(p, P).map((v) => v.toFixed(2)).join(" ")).join("");
    };
    const nerve = path([-5, -1, 0]);
    const artery = path([1, 1, 0]);
    return `<g class="tissue-nerve"><path class="cord-edge" d="${nerve}"/><path class="cord-core" d="${nerve}"/></g><g class="tissue-vessel"><path class="cord-edge" d="${artery}"/><path class="cord-core" d="${artery}"/></g>`;
  }

  return { footItems, fasciaOf, toes, skinToes, tendonOf, crossings, cordsOf, bone, band, along, ellipsoid, closed, T, RAYS, depth, MALLEOLUS };
}
