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
  DEFAULT_DUNNING_TEXTS: () => DEFAULT_DUNNING_TEXTS,
  DUNNING_LIMITS: () => DUNNING_LIMITS,
  DUNNING_PLACEHOLDERS: () => DUNNING_PLACEHOLDERS,
  MAX_DUNNING_LEVEL: () => MAX_DUNNING_LEVEL,
  buildDunningSuggestions: () => buildDunningSuggestions,
  fillPlaceholders: () => fillPlaceholders,
  validateDunningPatch: () => validateDunningPatch
});
module.exports = __toCommonJS(dunning_exports);
var import_invoice_model = require("./invoice-model");
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
const DEFAULT_DUNNING_TEXTS = [
  {
    level: 1,
    subject: "Zahlungserinnerung zur Rechnung {number}",
    body: "Sehr geehrte Damen und Herren,\n\nzu unserer Rechnung {number} vom {issueDate} \xFCber {amount} konnten wir bis heute keinen Zahlungseingang feststellen. Sie war am {dueDate} f\xE4llig.\n\nBitte \xFCberweisen Sie den Betrag bis zum {deadline}. Sollte sich Ihre Zahlung mit diesem Schreiben \xFCberschnitten haben, betrachten Sie es bitte als gegenstandslos.\n\nMit freundlichen Gr\xFC\xDFen\n{seller}",
    days: 5,
    deadlineDays: 7,
    isDefault: true
  },
  {
    level: 2,
    subject: "1. Mahnung zur Rechnung {number}",
    body: "Sehr geehrte Damen und Herren,\n\ntrotz unserer Zahlungserinnerung ist die Rechnung {number} vom {issueDate} \xFCber {amount} weiterhin offen. Sie ist seit {days} Tagen \xFCberf\xE4llig (f\xE4llig am {dueDate}).\n\nWir bitten Sie, den Betrag bis zum {deadline} zu \xFCberweisen.\n\nMit freundlichen Gr\xFC\xDFen\n{seller}",
    days: 19,
    deadlineDays: 7,
    isDefault: true
  },
  {
    level: 3,
    subject: "2. Mahnung zur Rechnung {number}",
    body: "Sehr geehrte Damen und Herren,\n\ndie Rechnung {number} vom {issueDate} \xFCber {amount} ist trotz Erinnerung und Mahnung noch immer nicht bezahlt (seit {days} Tagen \xFCberf\xE4llig, f\xE4llig am {dueDate}).\n\nWir fordern Sie auf, den Betrag bis sp\xE4testens {deadline} zu \xFCberweisen. Andernfalls behalten wir uns weitere Schritte vor.\n\nMit freundlichen Gr\xFC\xDFen\n{seller}",
    days: 33,
    deadlineDays: 5,
    isDefault: true
  }
];
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
function de(iso) {
  const [year, month, day] = iso.slice(0, 10).split("-");
  return `${day}.${month}.${year}`;
}
function fillPlaceholders(template, values) {
  return template.replace(/\{(\w+)\}/g, (whole, key) => {
    var _a;
    return (_a = values[key]) != null ? _a : whole;
  });
}
function buildDunningSuggestions(candidates, texts, today) {
  var _a, _b, _c, _d, _e, _f;
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
      issueDate: de(invoice.issueDate),
      dueDate: de((_b = invoice.dueDate) != null ? _b : today),
      amount: `${invoice.totals.grossTotal.toFixed(2).replace(".", ",")} \u20AC`,
      days: String(candidate.overdueDays),
      deadline: de(deadline),
      seller: invoice.seller.name
    };
    let body = fillPlaceholders(text.body, values);
    if (candidate.skontoActive && level === 1) {
      body = body.replace(
        /\n\nMit freundlichen/,
        `

Bei Zahlung bis zum ${de((_c = invoice.skontoDueDate) != null ? _c : today)} k\xF6nnen Sie noch ${invoice.skontoPercent} % Skonto abziehen.

Mit freundlichen`
      );
    }
    out.push({
      invoiceId: invoice.id,
      number: (_d = invoice.number) != null ? _d : "",
      customer: invoice.buyer.name,
      email: (_e = invoice.buyer.email) != null ? _e : "",
      level,
      overdueDays: candidate.overdueDays,
      amount: invoice.totals.grossTotal,
      dueDate: (_f = invoice.dueDate) != null ? _f : "",
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
  DEFAULT_DUNNING_TEXTS,
  DUNNING_LIMITS,
  DUNNING_PLACEHOLDERS,
  MAX_DUNNING_LEVEL,
  buildDunningSuggestions,
  fillPlaceholders,
  validateDunningPatch
});
//# sourceMappingURL=dunning.js.map
