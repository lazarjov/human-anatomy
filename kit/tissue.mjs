const mix = (rest, active, amount = "var(--act,0)") => `color-mix(in oklab,${rest} calc(100% - ${amount} * 100%),${active})`;

const tissueVars = (t) => `--anatomy-paper:${t.paper};--anatomy-face:${t.paper};--anatomy-top:${t.top};--anatomy-lit-top:${t.top};--anatomy-shade-0:${t.s0};--anatomy-shade-1:${t.s1};--anatomy-shade-2:${t.s2};--anatomy-shade-3:${t.s3};--anatomy-lit-shade:${t.s2};--anatomy-hi:${t.edge};--anatomy-mid:${t.mid};--anatomy-lo:${t.lo};--anatomy-faint:${t.faint};--anatomy-lit:${t.edge}`;

const MUSCLE_ON = { light: { paper: "#d9465f", top: "#e9677c", s0: "#9e2338", s1: "#b02c43", s2: "#c3384f", s3: "#cf4259", edge: "#6e1022", mid: "#8e1d31", lo: "#b9364c", faint: "#cf5a6d" }, dark: { paper: "#c2324c", top: "#d9506a", s0: "#6b1022", s1: "#7e152a", s2: "#931c33", s3: "#a8243d", edge: "#ffb3c0", mid: "#f07b90", lo: "#d25570", faint: "#b23a52" } };

const TISSUES = {
  light: {
    bone: { paper: "#fbf1ea", top: "#fffaf6", s0: "#e2cbbf", s1: "#ead7cd", s2: "#f1e2da", s3: "#f7ece6", edge: "#7d5a52", mid: "#b3918a", lo: "#d6bcb3", faint: "#e8d6cf" },
    muscle: { paper: "#f0a3b0", top: "#f8c0c9", s0: "#d2707f", s1: "#dc808f", s2: "#e5919f", s3: "#eca0ad", edge: "#8f3448", mid: "#bd5f70", lo: "#d9848f", faint: "#e7a3ae" },
    tendon: { paper: "#f8ebe8", top: "#fff7f5", s0: "#dccac9", s1: "#e5d6d4", s2: "#ede1df", s3: "#f4eae8", edge: "#8d6f74", mid: "#b49ba0", lo: "#d3c0c2", faint: "#e6d9d9" },
    cartilage: { paper: "#eef0f7", top: "#f9faff", s0: "#cdd1e2", s1: "#d7dbea", s2: "#e1e4f0", s3: "#e9ebf4", edge: "#6f7392", mid: "#9a9db8", lo: "#c1c4d6", faint: "#dcdeea" },
    ligament: { paper: "#f3ddd2", top: "#fbece5", s0: "#d9b9ab", s1: "#e1c4b7", s2: "#e9cfc3", s3: "#efd8cd", edge: "#86594c", mid: "#b08578", lo: "#cfaa9c", faint: "#e3c8bc" },
    skin: { paper: "#fde4e7", top: "#fff1f3", s0: "#f3c6cd", s1: "#f6d0d6", s2: "#f9dadf", s3: "#fbe1e5", edge: "#d99aa6", mid: "#e6b4bd", lo: "#efc8ce", faint: "#f6dade" },
    vessel: { paper: "#e2506a", top: "#ee7389", s0: "#a92a42", s1: "#bb344d", s2: "#cc3f58", s3: "#d84962", edge: "#701526", mid: "#952237", lo: "#c0435a", faint: "#d86b7e" },
    nerve: { paper: "#fbf0c9", top: "#fff8de", s0: "#e2cf91", s1: "#e9d9a2", s2: "#f0e2b3", s3: "#f5e9c1", edge: "#8c7535", mid: "#b39d5c", lo: "#d3c086", faint: "#e8daa8" },
  },
  dark: {
    bone: { paper: "#e9dcd3", top: "#f6ece6", s0: "#a8948a", s1: "#baa69c", s2: "#cab8ae", s3: "#d9c9c0", edge: "#4b3530", mid: "#7c645d", lo: "#a28a82", faint: "#c2aea6" },
    muscle: { paper: "#b9566a", top: "#cc6d80", s0: "#6e2a39", s1: "#813343", s2: "#953e4f", s3: "#a74a5c", edge: "#ffc2cc", mid: "#e0899a", lo: "#b46072", faint: "#8f4252" },
    tendon: { paper: "#d9cacb", top: "#e8dcdc", s0: "#8d7b7e", s1: "#9f8d90", s2: "#b1a0a2", s3: "#c3b3b5", edge: "#3e2e32", mid: "#6e5c60", lo: "#968488", faint: "#b3a3a6" },
    cartilage: { paper: "#c9cde0", top: "#dcdfee", s0: "#7f84a0", s1: "#9095b0", s2: "#a2a6bf", s3: "#b4b8cf", edge: "#2f3350", mid: "#5d6282", lo: "#8a8ea8", faint: "#a9adc3" },
    ligament: { paper: "#d6b9ac", top: "#e6ccc0", s0: "#8e6e62", s1: "#a07f72", s2: "#b29083", s3: "#c3a194", edge: "#3f2720", mid: "#6e5047", lo: "#94766b", faint: "#b19488" },
    skin: { paper: "#3a2329", top: "#462b32", s0: "#271519", s1: "#2d191e", s2: "#331d23", s3: "#382127", edge: "#a86b79", mid: "#7f4f5b", lo: "#5f3a43", faint: "#4b2e35" },
    vessel: { paper: "#c03650", top: "#d6516a", s0: "#6d1424", s1: "#821a2d", s2: "#982237", s3: "#ab2b42", edge: "#ffb9c5", mid: "#ec8094", lo: "#c04e64", faint: "#9a3448" },
    nerve: { paper: "#e3d39a", top: "#efe2b2", s0: "#94844e", s1: "#a6965e", s2: "#b8a86f", s3: "#c9b981", edge: "#3d3212", mid: "#6e602f", lo: "#978852", faint: "#b5a670" },
  },
};

const PAGES = {
  light: "--anatomy-page:#fbeef0;--anatomy-card:#fff8f9;--anatomy-text:#6e4b54;--anatomy-strong:#3b1d26;--anatomy-muted:#a9858f;--anatomy-paper:#fff8f9;--anatomy-face:#ffffff;--anatomy-top:#fffbfc;--anatomy-shade-0:#efd4da;--anatomy-shade-1:#f4dee3;--anatomy-shade-2:#f8e7eb;--anatomy-shade-3:#fbf0f2;--anatomy-lit-top:#ffffff;--anatomy-lit-shade:#f8e7eb;--anatomy-hi:#5b2633;--anatomy-mid:#b67e8b;--anatomy-lo:#dcadb7;--anatomy-faint:#f0d2d9;--anatomy-lit:#b0163b;--anatomy-halo:#c97f8e;--anatomy-halo-opacity:.3;--anatomy-dot:#6e3442;--anatomy-red:#c8233f",
  dark: "--anatomy-page:#150c0f;--anatomy-card:#1d1115;--anatomy-text:#c9a3ad;--anatomy-strong:#f6dfe4;--anatomy-muted:#8a6670;--anatomy-paper:#1d1115;--anatomy-face:#26161b;--anatomy-top:#2a191e;--anatomy-shade-0:#160b0e;--anatomy-shade-1:#1a0e12;--anatomy-shade-2:#1f1216;--anatomy-shade-3:#24151a;--anatomy-lit-top:#33202a;--anatomy-lit-shade:#26161b;--anatomy-hi:#f1c6cf;--anatomy-mid:#9c6874;--anatomy-lo:#6a404a;--anatomy-faint:#43272e;--anatomy-lit:#ff7a93;--anatomy-halo:#050203;--anatomy-halo-opacity:.85;--anatomy-dot:#f1c6cf;--anatomy-red:#ff6b85",
};

const scope = (theme) => (theme === "light" ? '.iso[data-theme="light"]' : ".iso");

function themeCss(theme) {
  const root = scope(theme);
  const rules = [`${root}{${PAGES[theme]}}`];
  for (const [name, t] of Object.entries(TISSUES[theme])) rules.push(`${root} .tissue-${name}{${tissueVars(t)}}`);
  const rest = TISSUES[theme].muscle;
  const on = MUSCLE_ON[theme];
  const active = Object.fromEntries(Object.keys(rest).map((key) => [key, mix(rest[key], on[key])]));
  rules.push(`${root} .tissue-muscle[data-active],${root} [data-active] .tissue-muscle{${tissueVars(active)}}`);
  return rules.join("\n");
}

export const TISSUE_CSS = `
${themeCss("dark")}
${themeCss("light")}
.iso .tissue-skin>.iso-fill,.iso .tissue-skin>.iso-shade,.iso .tissue-skin>.iso-top{opacity:.55}
.iso .tissue-skin>.iso-edge{stroke-dasharray:none}
.iso .tissue-fiber{fill:none;stroke-width:.45;stroke-linecap:round}
.iso .iso-plate{box-shadow:0 0 0 1px var(--anatomy-faint)}
`;

export const tissueStyle = () => `<style>${TISSUE_CSS}</style>`;

export const TISSUE_NAMES = Object.keys(TISSUES.light);

export function tissueClass(name) {
  if (!TISSUE_NAMES.includes(name)) throw new Error(`unknown tissue ${name}`);
  return `tissue-${name}`;
}

export function tissueSvg(solidSvg, paths, name, options = {}) {
  return solidSvg(paths, { ...options, className: options.className ? `${tissueClass(name)} ${options.className}` : tissueClass(name) });
}

export function activationAttrs(level) {
  const a = Math.max(0, Math.min(1, level));
  return `data-active="" style="--act:${a.toFixed(3)}"`;
}

export function setActivation(element, level) {
  const a = Math.max(0, Math.min(1, level));
  element.setAttribute("data-active", "");
  element.style.setProperty("--act", a.toFixed(3));
}
