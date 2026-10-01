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
var templates_exports = {};
__export(templates_exports, {
  ARCHIVE_HINT: () => ARCHIVE_HINT,
  DEFAULT_QUOTE_INTRO: () => DEFAULT_QUOTE_INTRO,
  DEFAULT_TEMPLATE: () => DEFAULT_TEMPLATE,
  validateTemplate: () => validateTemplate
});
module.exports = __toCommonJS(templates_exports);
const DEFAULT_TEMPLATE = {
  version: 1,
  name: "Standard",
  colors: { primary: "#1a56db", text: "#111827", muted: "#555555" },
  usePrimaryColor: true,
  titleAccent: true,
  tableHeaderAccent: false,
  showEmail: true,
  showCustomerNumber: true,
  showPaymentTerms: true,
  footerText: "",
  showArchiveHint: false,
  showPageNumbers: false,
  showFooterBoxes: true,
  showTagline: true,
  introText: "Hiermit stelle ich Ihnen folgende Positionen in Rechnung.",
  closingText: "Bei R\xFCckfragen stehe ich selbstverst\xE4ndlich jederzeit gerne zur Verf\xFCgung.",
  signatureName: "",
  headerExtra: "",
  blocks: { title: true, meta: true, parties: true, positions: true, totals: true, payment: true, notes: true }
};
const ARCHIVE_HINT = "Hinweis: Diese Rechnung ist vom Leistungsempf\xE4nger zwei Jahre aufzubewahren (\xA7 14b Abs. 1 Satz 5 UStG).";
const DEFAULT_QUOTE_INTRO = "Gerne unterbreiten wir Ihnen das folgende Angebot.";
function isHexColor(value) {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}
function validateTemplate(template) {
  const errors = [];
  if (typeof template !== "object" || template === null) {
    return ["Template muss ein Objekt sein"];
  }
  const t = template;
  if (t.version !== 1) {
    errors.push("Template version muss 1 sein");
  }
  if (typeof t.name !== "string" || t.name.trim().length === 0 || t.name.trim().length > 80) {
    errors.push("Name muss 1\u201380 Zeichen lang sein");
  }
  const colors = t.colors;
  if (!colors || !isHexColor(colors.primary) || !isHexColor(colors.text) || !isHexColor(colors.muted)) {
    errors.push("Farben primary/text/muted m\xFCssen Hex (#rrggbb) sein");
  }
  for (const key of [
    "showEmail",
    "showCustomerNumber",
    "showPaymentTerms",
    "showArchiveHint",
    "showPageNumbers"
  ]) {
    if (typeof t[key] !== "boolean") {
      errors.push(`${key} muss true/false sein`);
    }
  }
  if (t.showTagline !== void 0 && typeof t.showTagline !== "boolean") {
    errors.push("showTagline muss true/false sein");
  }
  if (t.showFooterBoxes !== void 0 && typeof t.showFooterBoxes !== "boolean") {
    errors.push("showFooterBoxes muss true/false sein");
  }
  for (const key of ["usePrimaryColor", "titleAccent", "tableHeaderAccent"]) {
    if (t[key] !== void 0 && typeof t[key] !== "boolean") {
      errors.push(`${key} muss true/false sein`);
    }
  }
  if (typeof t.footerText !== "string" || t.footerText.length > 500) {
    errors.push("Fu\xDFzeile muss Text mit max. 500 Zeichen sein");
  }
  for (const [key, max] of [
    ["introText", 300],
    ["closingText", 300],
    ["headerExtra", 200]
  ]) {
    const value = t[key];
    if (value !== void 0 && (typeof value !== "string" || value.length > max)) {
      errors.push(`${key} muss Text mit max. ${max} Zeichen sein`);
    }
  }
  const signature = t.signatureName;
  if (signature !== void 0 && (typeof signature !== "string" || signature.length > 80)) {
    errors.push("signatureName muss Text mit max. 80 Zeichen sein");
  }
  const companyId = t.companyId;
  if (companyId !== void 0 && (typeof companyId !== "string" || companyId.length > 80)) {
    errors.push("companyId muss Text mit max. 80 Zeichen sein");
  }
  const blocks = t.blocks;
  if (!blocks) {
    errors.push("blocks-Objekt fehlt");
  } else {
    for (const key of ["title", "meta", "parties", "positions", "totals"]) {
      if (blocks[key] !== true) {
        errors.push(`Block ${key} enth\xE4lt Pflichtangaben und darf nicht deaktiviert werden`);
      }
    }
    for (const key of ["payment", "notes"]) {
      if (typeof blocks[key] !== "boolean") {
        errors.push(`Block ${key} muss true/false sein`);
      }
    }
  }
  const logo = t.logo;
  if (logo !== void 0) {
    if (typeof logo.path !== "string" || logo.path.trim().length === 0) {
      errors.push("Logo braucht einen Dateipfad");
    }
    if (logo.position !== "left" && logo.position !== "right" && logo.position !== "center") {
      errors.push("Logo-Position muss left/right/center sein");
    }
    if (typeof logo.widthMm !== "number" || logo.widthMm < 10 || logo.widthMm > 500) {
      errors.push("Logo-Breite muss 10\u2013500 mm sein");
    }
    if (logo.allPages !== void 0 && typeof logo.allPages !== "boolean") {
      errors.push("Logo-Seitenoption muss wahr oder falsch sein");
    }
  }
  return errors;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ARCHIVE_HINT,
  DEFAULT_QUOTE_INTRO,
  DEFAULT_TEMPLATE,
  validateTemplate
});
//# sourceMappingURL=templates.js.map
