import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import * as G from "../../kit/lathe.mjs";
import * as T from "../../kit/tissue.mjs";
import * as TB from "../../kit/tube.mjs";
import { kitScript } from "../../scripts/inline-kit.mjs";
import * as M from "./model.mjs";
import { makeBody } from "./body.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 600;
const HEIGHT = 620;
const AZIMUTH = 42;
const RATE = 0.42;
const SHADOW = { x: -22, y: -34, w: 70, d: 68, r: 26 };

const peakRise = (M.TAKEOFF_AT + M.HEIGHT) / M.UNIT;
const probe = makeBody(k, G, k.fitProjection([[0, 0, 0], [1, 1, 1]], WIDTH, HEIGHT, { pad: 0, azimuth: AZIMUTH }), M, T, TB);
const P = k.fitProjection(
  [[-24, -30, 0], [44, 30, 0], [-24, 30, 0], [44, -30, 0], [-3, 0, probe.hip0 + peakRise + 84], [-24, -18, probe.hip0 + peakRise + 70], [18, 18, probe.hip0 + peakRise + 70], [-24, 18, probe.hip0 + peakRise + 70], [18, -18, probe.hip0 + peakRise + 70]],
  WIDTH,
  HEIGHT,
  { pad: 14, azimuth: AZIMUTH },
);
const body = makeBody(k, G, P, M, T, TB);

const pose0 = body.poseAt(0, true);
const fig0 = body.figureAt(pose0, M.activationAt(0));

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "A countermovement jump drawn as an anatomical model of the lower body inside a faint translucent skin: lumbar spine and sacrum, pelvis with iliac wings, femurs with heads, trochanters and condyles, patellae, tibiae, fibulae and the bones of both feet. Gluteus maximus, quadriceps, hamstrings, calf muscles and tibialis anterior run on tendons to their real attachments and deepen from pink to red as they contract. The body dips, drives up, leaves the floor, flies about 34 centimetres and lands.",
  body: [
    `<g data-part="shadow"><path class="iso-halo cmj-shadow" d="${k.haloOf(SHADOW, 0, 0.1, P)}"/></g>`,
    `<g data-part="far">${fig0.far}</g>`,
    `<g data-part="trunk">${fig0.trunk}</g>`,
    `<g data-part="near">${fig0.near}</g>`,
  ],
});

const DATA = { P, RATE, SHADOW_ORIGIN: k.iso([SHADOW.x + SHADOW.w / 2, 0, 0], P) };
const strip = (source) => source.replace(/^import .*$/gm, "").replace(/^export /gm, "");
const local = (file) => strip(readFileSync(join(HERE, file), "utf8"));
const kitFile = (file) => strip(readFileSync(join(HERE, "..", "..", "kit", file), "utf8"));
const latheScript = `const G = (() => {${kitFile("lathe.mjs")}\nreturn { viewOf, scaleOf, frameAlong, frameOf, pointOf, disc, ringBand, sphereOf, prismOf, solidOf, dot3, add3, sub3, mul3, unit3, cross3, len3, lerp3, cut, fadeOf, pathLength, pointAlong, resample, tangentAlong };})();\nconst TB = (() => {${kitFile("tube.mjs")}\nreturn { tubePieces, tubeSvg };})();\n`;
const tissueScript = `const T = (() => {${kitFile("tissue.mjs")}\nreturn { tissueSvg, activationAttrs };})();\n`;
const modelScript = `const M = (() => {${local("model.mjs")}\nreturn { MASS, WEIGHT, UNIT, CYCLE, TAKEOFF, TAKEOFF_AT, TAKEOFF_V, FLIGHT, HEIGHT, LAND, stateAt, activationAt };})();\n`;
const live = readFileSync(join(HERE, "live.js"), "utf8").replace("__DATA__", JSON.stringify(DATA));
const css = `<style>.cmj-skin{opacity:.5}.cmj-shadow{filter:blur(7px)}.iso-stage:focus{outline:none}.iso-stage:focus-visible{outline:1px solid var(--anatomy-muted);outline-offset:6px}</style>`;

const summary = M.summary();
const page = k.plateHtml({
  fig: "Fig 1",
  title: "Countermovement jump",
  hint: "Hover to scrub · click or space to jump",
  readout: "quiet stance · 1.00 BW · +0.00 m/s · knee 10°",
  keys: [
    { mark: "red", label: "Muscle bellies: pink at rest, deepening to red as they contract" },
    { mark: "raised", label: "Bone, with articular cartilage at the hip, knee, ankle and spine" },
    { mark: "edge", label: "Tendons and ligaments: patellar, Achilles, tibialis anterior, collaterals" },
    { mark: "dim", label: "Translucent skin of the lower body" },
  ],
  caption: `A ${M.MASS} kg countermovement jump, played at ${RATE}× speed. In unweighting the muscles relax and the ground force drops to ${summary.minBw.toFixed(2)} BW as the centre of mass sinks ${Math.round(-summary.deepest * 100)} cm. Braking loads the quadriceps and gluteus maximus eccentrically; propulsion fires them concentrically, hip and knee extensors first and the calf last, to a ${summary.peak.toFixed(2)} BW peak. The net impulse gives a takeoff velocity of ${M.TAKEOFF_V.toFixed(2)} m/s, so the centre of mass rises v²/2g = ${(M.HEIGHT * 100).toFixed(1)} cm in ${Math.round(M.FLIGHT * 1000)} ms of flight. The muscles fall quiet in the air, pre-activate before touchdown, and brake the ${summary.landPeak.toFixed(1)} BW landing.`,
  body: `${T.tissueStyle()}${css}<div class="iso-stage" tabindex="0" role="slider" aria-label="Countermovement jump: move the pointer across to scrub through the jump; Space or Enter jumps; arrow keys step through the phases" aria-valuemin="0" aria-valuemax="${M.CYCLE}" aria-valuenow="0" aria-valuetext="quiet stance" style="touch-action:pan-y">${svg}</div>`,
});

const name = theme === "light" ? "countermovement-jump-light.html" : "countermovement-jump.html";
writeFileSync(join(HERE, name), k.pageHtml({ title: "Countermovement jump", theme, body: page, script: kitScript() + latheScript + tissueScript + modelScript + local("body.mjs") + live }));
console.log("wrote", name, "· scale", P.scale?.toFixed?.(3), "· peak", summary.peak.toFixed(2), "BW · h", (M.HEIGHT * 100).toFixed(1), "cm");
