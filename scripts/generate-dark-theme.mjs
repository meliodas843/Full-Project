// Generates src/theme/dark-auto.css: a dark-mode counterpart for every rule in
// src/index.css that hard-codes a light-theme color.
//
// Each generated selector is wrapped as `:where(:root[data-theme="dark"]) sel`,
// which keeps the original selector's specificity. Because the file is loaded
// after index.css it beats the light rule it mirrors, while any hand-written
// dark override (`[data-user-theme="dark"] .x`, `:root[data-theme="dark"] .x`)
// is more specific and still wins.
//
// Usage: node scripts/generate-dark-theme.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postcss from "postcss";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCES = ["src/index.css"];
const OUT = "src/theme/dark-auto.css";
const DARK = ':where(:root[data-theme="dark"])';

const NAMED = {
  white: [255, 255, 255],
  black: [0, 0, 0],
  whitesmoke: [245, 245, 245],
  gainsboro: [220, 220, 220],
  lightgray: [211, 211, 211],
  lightgrey: [211, 211, 211],
  silver: [192, 192, 192],
  gray: [128, 128, 128],
  grey: [128, 128, 128],
  ghostwhite: [248, 248, 255],
  aliceblue: [240, 248, 255],
  snow: [255, 250, 250],
};

const COLOR_RE = new RegExp(
  "#[0-9a-fA-F]{3,8}\\b|rgba?\\([^)]*\\)|hsla?\\([^)]*\\)|\\b(" +
    Object.keys(NAMED).join("|") +
    ")\\b",
  "g",
);

/* ---------- color math ---------- */

function parseColor(str) {
  const s = str.trim().toLowerCase();
  if (NAMED[s]) return [...NAMED[s], 1];
  if (s[0] === "#") {
    let h = s.slice(1);
    if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join("");
    if (h.length !== 6 && h.length !== 8) return null;
    const n = (i) => parseInt(h.slice(i, i + 2), 16);
    return [n(0), n(2), n(4), h.length === 8 ? n(6) / 255 : 1];
  }
  const m = s.match(/^(rgba?|hsla?)\((.*)\)$/);
  if (!m) return null;
  const parts = m[2].split(/[\s,/]+/).filter(Boolean);
  if (parts.length < 3 || parts.some((p) => p.includes("var("))) return null;
  const num = (p, scale) =>
    p.endsWith("%") ? (parseFloat(p) / 100) * scale : parseFloat(p);
  const a = parts[3] !== undefined ? num(parts[3], 1) : 1;
  if (m[1].startsWith("rgb")) {
    return [num(parts[0], 255), num(parts[1], 255), num(parts[2], 255), a];
  }
  const [r, g, b] = hslToRgb(
    parseFloat(parts[0]) / 360,
    num(parts[1], 1),
    num(parts[2], 1),
  );
  return [r, g, b, a];
}

function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h / 6, s, l];
}

function hslToRgb(h, s, l) {
  if (s === 0) return [l * 255, l * 255, l * 255];
  const hue = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [hue(p, q, h + 1 / 3) * 255, hue(p, q, h) * 255, hue(p, q, h - 1 / 3) * 255];
}

function format([r, g, b, a]) {
  const c = (v) => Math.round(Math.min(255, Math.max(0, v)));
  if (a >= 1) {
    return "#" + [r, g, b].map((v) => c(v).toString(16).padStart(2, "0")).join("");
  }
  return `rgba(${c(r)}, ${c(g)}, ${c(b)}, ${+a.toFixed(3)})`;
}

// Neutral tones lean toward the app's dark navy (#0d1124 / #171c36).
const NAVY_HUE = 232 / 360;

function tone(h, s, l, a, neutralSat = 0.4) {
  const neutral = s < 0.25;
  const hue = neutral ? NAVY_HUE : h;
  const sat = neutral ? neutralSat : Math.min(s, 0.55);
  return [...hslToRgb(hue, sat, l), a];
}

// Background: light surfaces become dark ones. Pure white is a card, so it
// maps to the raised surface; off-white page backgrounds sit below it; light
// tints (hover, chips, badges) end up lighter than the card so they stay
// visible.
function mapBackground(rgba) {
  const [h, s, l] = rgbToHsl(...rgba);
  const a = rgba[3];
  if (l < (a < 1 ? 0.65 : 0.72)) return null;
  if (l >= 0.995) return tone(h, 0, 0.155, a);
  if (l >= 0.955 && s < 0.6) return tone(h, s, 0.115, a);
  return tone(h, s, Math.min(0.3, 0.19 + (0.955 - l) * 0.5), a);
}

// Text / icons: dark ink becomes light ink; saturated colors are lightened
// enough to read on a dark surface. White text stays (it sits on brand fills).
function mapForeground(rgba) {
  const [h, s, l] = rgbToHsl(...rgba);
  const a = rgba[3];
  if (s < 0.3 || (l < 0.25 && s < 0.6)) {
    if (l >= 0.8) return null;
    return tone(NAVY_HUE, 0, Math.min(0.96, 0.99 - l * 0.52), a, 0.22);
  }
  if (l >= 0.62) return null;
  return [...hslToRgb(h, Math.min(1, s), 0.72 + (0.62 - l) * 0.15), a];
}

function mapBorder(rgba) {
  const [h, s, l] = rgbToHsl(...rgba);
  const a = rgba[3];
  if (l < 0.7) return null;
  return tone(h, s, 0.24 + (1 - l) * 0.35, a, 0.3);
}

// Shadows: dark low-alpha shadows are almost invisible on navy, deepen them.
// Opaque light "shadows" are inset fills (autofill masks), treat as backgrounds.
function mapShadow(rgba) {
  const [, , l] = rgbToHsl(...rgba);
  if (rgba[3] >= 1) return l > 0.4 ? mapBackground(rgba) : null;
  if (l > 0.4) return null;
  return [0, 0, 0, Math.min(0.6, rgba[3] * 2.5 + 0.08)];
}

const ROLE_MAPPERS = {
  bg: mapBackground,
  fg: mapForeground,
  border: mapBorder,
  shadow: mapShadow,
};

function roleForProp(prop) {
  const p = prop.toLowerCase();
  if (p.startsWith("--")) {
    if (/shadow/.test(p)) return "shadow";
    if (/border|line|divider|stroke|outline|ring/.test(p)) return "border";
    if (/text|ink|muted|heading|title|label|fg|foreground/.test(p)) return "fg";
    if (/bg|background|surface|panel|card|soft|field|input|hover|page|body|fill/.test(p)) {
      return "bg";
    }
    return null;
  }
  if (p === "background" || p === "background-color" || p === "background-image") return "bg";
  if (p === "color" || p === "fill" || p === "caret-color" || p === "-webkit-text-fill-color") {
    return "fg";
  }
  if (p === "stroke") return "fg";
  if (p.startsWith("border") || p.startsWith("outline") || p === "column-rule-color") {
    return "border";
  }
  if (p === "box-shadow" || p === "-webkit-box-shadow") return "shadow";
  return null;
}

function mapValue(value, role) {
  if (/url\(/i.test(value)) return null;
  const mapper = ROLE_MAPPERS[role];
  let changed = false;
  const next = value.replace(COLOR_RE, (match) => {
    const rgba = parseColor(match);
    if (!rgba) return match;
    const mapped = mapper(rgba);
    if (!mapped) return match;
    const out = format(mapped);
    if (out.toLowerCase() !== match.toLowerCase()) changed = true;
    return out;
  });
  return changed ? next : null;
}

/* ---------- selectors ---------- */

const THEMED = /data-(user-|public-)?theme|rgTheme-|\.dark\b/;

function darkSelector(sel) {
  const s = sel.trim();
  if (/^(:root|html)\b/.test(s)) {
    // `:root`, `html body .x` → attach the condition to the root compound,
    // still without adding specificity.
    const m = s.match(/^(:root|html)([^\s>+~]*)(.*)$/);
    return `${m[1]}${m[2]}:where([data-theme="dark"])${m[3]}`;
  }
  return `${DARK} ${s}`;
}

function insideKeyframes(node) {
  for (let p = node.parent; p; p = p.parent) {
    if (p.type === "atrule" && /keyframes$/i.test(p.name)) return true;
  }
  return false;
}

function wrapInAtRules(rule, outRoot) {
  const chain = [];
  for (let p = rule.parent; p && p.type !== "root"; p = p.parent) chain.unshift(p);
  let target = outRoot;
  for (const at of chain) {
    if (at.type !== "atrule") return null;
    const clone = postcss.atRule({ name: at.name, params: at.params });
    target.append(clone);
    target = clone;
  }
  return target;
}

/* ---------- main ---------- */

const out = postcss.root();
let ruleCount = 0;

for (const file of SOURCES) {
  const abs = path.join(root, file);
  if (!fs.existsSync(abs)) continue;
  const css = postcss.parse(fs.readFileSync(abs, "utf8"), { from: abs });

  css.walkRules((rule) => {
    if (insideKeyframes(rule)) return;

    const plain = rule.selectors.filter((s) => !THEMED.test(s));
    if (!plain.length) return;
    // A rule listing both `.x` and `[data-*-theme="dark"] .x` pins the light
    // value in dark mode too; re-emit those dark selectors as-is so the
    // mapped value (same specificity, later in the cascade) takes over.
    const pinnedDark = rule.selectors.filter((s) =>
      /data-(user-|public-)?theme="dark"/.test(s),
    );

    const decls = rule.nodes.filter((n) => n.type === "decl");
    const bgDecl = decls.find((d) => /^background(-color)?$/i.test(d.prop));
    const bgStaysSaturated =
      bgDecl &&
      !/var\(/.test(bgDecl.value) &&
      (bgDecl.value.match(COLOR_RE) || []).some(
        (c) => (parseColor(c)?.[3] ?? 0) >= 0.5,
      ) &&
      !mapValue(bgDecl.value, "bg");

    const mapped = [];
    for (const decl of decls) {
      const role = roleForProp(decl.prop);
      if (!role) continue;
      // Text sitting on a fill we keep (brand buttons, colored badges) keeps
      // its color so contrast with that fill is preserved.
      if (role === "fg" && bgStaysSaturated) continue;
      const value = mapValue(decl.value, role);
      if (!value) continue;
      mapped.push(
        postcss.decl({ prop: decl.prop, value, important: decl.important }),
      );
    }
    if (!mapped.length) return;

    const target = wrapInAtRules(rule, out);
    if (!target) return;
    const darkRule = postcss.rule({
      selectors: [...plain.map(darkSelector), ...pinnedDark],
    });
    mapped.forEach((d) => darkRule.append(d));
    target.append(darkRule);
    ruleCount++;
  });
}

const header =
  "/* AUTO-GENERATED by scripts/generate-dark-theme.mjs — do not edit by hand.\n" +
  "   Re-run `npm run theme:dark` after changing colors in src/index.css. */\n\n";

fs.writeFileSync(path.join(root, OUT), header + out.toString() + "\n");
console.log(`Wrote ${OUT} (${ruleCount} rules)`);
