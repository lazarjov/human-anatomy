import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import * as G from "../../kit/lathe.mjs";
import * as T from "../../kit/tube.mjs";
import { tissueStyle } from "../../kit/tissue.mjs";
import { kitScript } from "../../scripts/inline-kit.mjs";
import * as M from "./model.mjs";
import { makeKnee } from "./parts.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const KIT = join(HERE, "..", "..", "kit");
const theme = process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 600;
const HEIGHT = 420;
const REST = 38;
const H = M.H;

const extremes = [
  [-70, 0, H + 27],
  [-70, 0, H - 26],
  [-70, 26, H],
  [-70, -26, H],
  [8, 0, H + 22],
  [0, 26, H],
  ...[0, 45, 90].flatMap((deg) => [M.tibiaPoint(deg, 80, 14), M.tibiaPoint(deg, 80, -22), M.tibiaPoint(deg, 80, 0, 18)]),
];
const P = k.fitProjection(extremes, WIDTH, HEIGHT, { pad: 14, azimuth: 70 });

const knee = makeKnee(k, G, T, P, M);
const shadow = { x: -64, y: -20, w: 100, d: 40, r: 20 };
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "An anatomical model of a left knee seen from the lateral side, the thigh held level and the leg hanging. The femur ends in two cartilage-covered condyles and the trochlear groove; the tibial plateau carries the menisci, with the fibular head beside it. The cruciate and collateral ligaments bind the joint. The quadriceps (rectus femoris, vastus lateralis and vastus medialis) gathers into the quadriceps tendon over the patella, and the patellar tendon runs on to the tibial tuberosity. The hamstring tendons, the two heads of gastrocnemius, the popliteal artery and the tibial and common fibular nerves pass behind the knee, all inside a faint outline of the skin. The quadriceps reddens as it pulls harder.",
  body: [
    `<path class="iso-halo" style="filter:blur(14px)" d="${k.haloOf(shadow, H - 92, 0.1, P)}"/>`,
    `<g data-part="skin">${knee.skin(REST)}</g>`,
    `<g data-part="knee">${knee.knee(REST)}</g>`,
  ],
});

const strip = (file) => readFileSync(file, "utf8").replace(/^import .*$/gm, "").replace(/^export /gm, "");
const namesOf = (file) => [...readFileSync(file, "utf8").matchAll(/^export (?:function|const) (\w+)/gm)].map((m) => m[1]);
const wrap = (name, file, prelude = "") => `const ${name} = (() => {${prelude}\n${strip(file)}\nreturn { ${namesOf(file).join(", ")} };})();\n`;
const modules =
  wrap("GL", join(KIT, "lathe.mjs")) +
  wrap("TB", join(KIT, "tube.mjs"), "const G = GL;") +
  wrap("MD", join(HERE, "model.mjs")) +
  strip(join(HERE, "parts.mjs"));

const first = M.loads(REST);
const say = (l) => `${Math.round(l.angle)}° flexion · quad ${Math.round(l.quad)} N · PF ${Math.round(l.pf)} N`;
const live = readFileSync(join(HERE, "live.js"), "utf8").replace("__DATA__", JSON.stringify({ P, REST, MAX: M.MAX }));

const body =
  tissueStyle() +
  k.plateHtml({
    fig: "Fig 1",
    title: "Knee extensor mechanism",
    hint: "Hover or ← → to flex the knee",
    readout: say(first),
    keys: [
      { mark: "red", label: "Quadriceps: rectus femoris and vasti, redder the harder they pull" },
      { mark: "raised", label: "Bone and cartilage: femur, patella, tibia, fibula, menisci" },
      { mark: "edge", label: "Tendons and ligaments: quadriceps and patellar tendons, cruciates, collaterals" },
    ],
    caption:
      "A seated knee extension with a 10 kg ankle weight, 37.8 cm from the knee axis. The weight's moment is largest with the leg straight and vanishes when it hangs at 90°. The quadriceps balances it through the patellar tendon, whose moment arm follows a typical published curve: about 4.3 cm straight, 4.75 cm near 25° and 3.5 cm at 90°, so quadriceps force = moment ÷ arm, and its colour shows that force as a share of its peak (859 N at full extension). The patella is a pulley: with equal tension in both tendons, the patellofemoral force is the quadriceps force times the vector sum of the two tendon directions, so it peaks near 45°, where the tendons wrap most sharply over the trochlea while the load is still large; the cartilage on the back of the patella flushes red with it. The hamstrings and gastrocnemius stay nearly silent. The tibia turns about a fixed axis through the condyles, a simplification of the real roll and glide.",
    body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Knee flexion: arrow keys bend and straighten the knee" aria-valuemin="0" aria-valuemax="90" aria-valuenow="${REST}" aria-valuetext="${say(first)}">${svg}</div>`,
  });

const name = theme === "light" ? "knee-joint-light.html" : "knee-joint.html";
const page = k.pageHtml({ title: "Knee extensor mechanism", theme, body, script: kitScript() + modules + live });
writeFileSync(join(HERE, name), page);
console.log("wrote", name, `${(page.length / 1024).toFixed(0)} KB`);
