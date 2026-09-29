"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var fonts_exports = {};
__export(fonts_exports, {
  FONT_BOLD: () => FONT_BOLD,
  FONT_ITALIC: () => FONT_ITALIC,
  FONT_REGULAR: () => FONT_REGULAR,
  fontsAvailable: () => fontsAvailable,
  loadFont: () => loadFont,
  loadIccProfile: () => loadIccProfile,
  registerFonts: () => registerFonts
});
module.exports = __toCommonJS(fonts_exports);
var import_node_fs = require("node:fs");
var import_node_module = require("node:module");
var import_node_path = require("node:path");
const FONT_REGULAR = "LibSans";
const FONT_BOLD = "LibSans-Bold";
const FONT_ITALIC = "LibSans-Italic";
const cache = /* @__PURE__ */ new Map();
function locateFont(file) {
  const here = (0, import_node_path.dirname)(__filename);
  const candidates = [
    (0, import_node_path.resolve)(here, "..", "..", "assets", "fonts", file),
    (0, import_node_path.resolve)(here, "..", "..", "..", "assets", "fonts", file),
    (0, import_node_path.resolve)(process.cwd(), "assets", "fonts", file)
  ];
  for (const path of candidates) {
    try {
      (0, import_node_fs.readFileSync)(path);
      return path;
    } catch {
    }
  }
  throw new Error(
    `Bundled font missing: ${file}. Expected it in assets/fonts (tried ${candidates.join(", ")}). Run "npm run build" and make sure assets/fonts is part of the package.`
  );
}
function loadFont(file) {
  const hit = cache.get(file);
  if (hit) {
    return hit;
  }
  const data = (0, import_node_fs.readFileSync)(locateFont(file));
  cache.set(file, data);
  return data;
}
function fontsAvailable() {
  try {
    loadFont("LiberationSans-Regular.ttf");
    loadFont("LiberationSans-Bold.ttf");
    return true;
  } catch {
    return false;
  }
}
function registerFonts(doc) {
  try {
    doc.registerFont(FONT_REGULAR, loadFont("LiberationSans-Regular.ttf"));
    doc.registerFont(FONT_BOLD, loadFont("LiberationSans-Bold.ttf"));
    doc.font(FONT_REGULAR);
    return true;
  } catch {
    doc.font("Helvetica");
    return false;
  }
}
let iccProfile = null;
function loadIccProfile() {
  if (iccProfile) {
    return iccProfile;
  }
  try {
    const require2 = (0, import_node_module.createRequire)((0, import_node_path.resolve)(__dirname, "..", "..", "package.json"));
    const data = (0, import_node_fs.readFileSync)((0, import_node_path.resolve)((0, import_node_path.dirname)(require2.resolve("pdfkit")), "data", "sRGB_IEC61966_2_1.icc"));
    if (data.length > 132 && data.subarray(36, 40).toString("latin1") === "acsp") {
      iccProfile = data;
      return iccProfile;
    }
  } catch {
  }
  return void 0;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  FONT_BOLD,
  FONT_ITALIC,
  FONT_REGULAR,
  fontsAvailable,
  loadFont,
  loadIccProfile,
  registerFonts
});
//# sourceMappingURL=fonts.js.map
