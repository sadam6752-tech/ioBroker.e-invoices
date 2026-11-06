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
var dunning_exports = {};
__export(dunning_exports, {
  DUNNING_LIMITS: () => DUNNING_LIMITS,
  DUNNING_PLACEHOLDERS: () => DUNNING_PLACEHOLDERS,
  MAX_DUNNING_LEVEL: () => MAX_DUNNING_LEVEL,
  buildDunningSuggestions: () => buildDunningSuggestions,
  defaultDunningTexts: () => defaultDunningTexts,
  fillPlaceholders: () => fillPlaceholders,
  validateDunningPatch: () => validateDunningPatch
});
module.exports = __toCommonJS(dunning_exports);
var import_invoice_model = require("./invoice-model");
var import_dunning_texts = require("./dunning-texts");
var import_output_i18n = require("./output-i18n");
const MAX_DUNNING_LEVEL = 3;
const DUNNING_PLACEHOLDERS = [
  "number",
  "customer",
  "issueDate",
  "dueDate",
  "amount",
  "days",
  "deadline",
  "seller"
];
const DEFAULT_SCHEDULE = [
  { days: 5, deadlineDays: 7 },
  { days: 19, deadlineDays: 7 },
  { days: 33, deadlineDays: 5 }
];
function defaultDunningTexts(language) {
  return import_dunning_texts.DUNNING_DEFAULT_TEXTS[language].map((text, index) => ({
    level: index + 1,
    subject: text.subject,
    body: text.body,
    days: DEFAULT_SCHEDULE[index].days,
    deadlineDays: DEFAULT_SCHEDULE[index].deadlineDays,
    isDefault: true
  }));
}
const DUNNING_LIMITS = { subject: 200, body: 4e3, days: 365, deadlineDays: 90 };
function validateDunningPatch(level, patch) {
  const errors = [];
  if (!Number.isInteger(level) || level < 1 || level > MAX_DUNNING_LEVEL) {
    errors.push(`Level must be 1 to ${MAX_DUNNING_LEVEL}`);
  }
  for (const key of ["subject", "body"]) {
    const value = patch[key];
    if (value !== void 0 && (typeof value !== "string" || value.trim() === "" || value.length > DUNNING_LIMITS[key])) {
      errors.push(`${key} must be a text of 1 to ${DUNNING_LIMITS[key]} characters`);
    }
  }
  for (const key of ["days", "deadlineDays"]) {
    const value = patch[key];
    if (value !== void 0 && (!Number.isInteger(value) || value < 1 || value > DUNNING_LIMITS[key])) {
      errors.push(`${key} must be a whole number from 1 to ${DUNNING_LIMITS[key]}`);
    }
  }
  return errors;
}
function fillPlaceholders(template, values) {
  return template.replace(/\{(\w+)\}/g, (whole, key) => {
    var _a;
    return (_a = values[key]) != null ? _a : whole;
  });
}
function buildDunningSuggestions(candidates, texts, today, language) {
  var _a, _b, _c, _d, _e, _f, _g;
  const date = (iso) => (0, import_output_i18n.formatOutputDate)(iso, language);
  const out = [];
  for (const candidate of candidates) {
    const level = candidate.level + 1;
    const text = texts.find((entry) => entry.level === level);
    if (!text || candidate.overdueDays < text.days) {
      continue;
    }
    const invoice = candidate.invoice;
    const deadline = (0, import_invoice_model.addDaysIso)(today, text.deadlineDays);
    const values = {
      number: (_a = invoice.number) != null ? _a : "",
      customer: invoice.buyer.name,
      issueDate: date(invoice.issueDate),
      dueDate: date((_b = invoice.dueDate) != null ? _b : today),
      amount: (0, import_output_i18n.formatOutputAmount)(invoice.totals.grossTotal, language),
      days: String(candidate.overdueDays),
      deadline: date(deadline),
      seller: invoice.seller.name
    };
    let body = fillPlaceholders(text.body, values);
    if (candidate.skontoActive && level === 1) {
      const sentence = (0, import_output_i18n.tr)(
        language,
        "If you pay by {date}, you can still deduct a cash discount of {percent} %.",
        {
          date: date((_c = invoice.skontoDueDate) != null ? _c : today),
          percent: (_d = invoice.skontoPercent) != null ? _d : 0
        }
      );
      const paragraphs = body.split("\n\n");
      paragraphs.splice(Math.max(paragraphs.length - 1, 1), 0, sentence);
      body = paragraphs.join("\n\n");
    }
    out.push({
      invoiceId: invoice.id,
      number: (_e = invoice.number) != null ? _e : "",
      customer: invoice.buyer.name,
      email: (_f = invoice.buyer.email) != null ? _f : "",
      level,
      overdueDays: candidate.overdueDays,
      amount: invoice.totals.grossTotal,
      dueDate: (_g = invoice.dueDate) != null ? _g : "",
      deadline,
      skontoActive: candidate.skontoActive,
      sender: [invoice.seller.name, invoice.seller.street, `${invoice.seller.zip} ${invoice.seller.city}`].filter((part) => part.trim() !== "").join(" \xB7 "),
      recipient: [invoice.buyer.name, invoice.buyer.street, `${invoice.buyer.zip} ${invoice.buyer.city}`].filter(
        (part) => part.trim() !== ""
      ),
      subject: fillPlaceholders(text.subject, values),
      text: body
    });
  }
  return out.sort((a, b) => b.overdueDays - a.overdueDays || a.number.localeCompare(b.number));
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  DUNNING_LIMITS,
  DUNNING_PLACEHOLDERS,
  MAX_DUNNING_LEVEL,
  buildDunningSuggestions,
  defaultDunningTexts,
  fillPlaceholders,
  validateDunningPatch
});
//# sourceMappingURL=dunning.js.map
