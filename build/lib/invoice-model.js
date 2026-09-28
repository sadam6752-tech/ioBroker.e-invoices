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
var invoice_model_exports = {};
__export(invoice_model_exports, {
  ALLOWED_VAT_RATES: () => ALLOWED_VAT_RATES,
  blankDraft: () => blankDraft,
  calcTotals: () => calcTotals,
  formatInvoiceNumber: () => formatInvoiceNumber,
  isIsoDate: () => isIsoDate,
  roundCents: () => roundCents,
  todayIso: () => todayIso,
  validateInvoiceForIssue: () => validateInvoiceForIssue
});
module.exports = __toCommonJS(invoice_model_exports);
const ALLOWED_VAT_RATES = [0, 7, 19];
function roundCents(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
function formatInvoiceNumber(year, seq, width = 4) {
  if (!Number.isInteger(year) || year < 2e3 || year > 2100) {
    throw new Error(`Invalid year for invoice number: ${year}`);
  }
  if (!Number.isInteger(seq) || seq < 1) {
    throw new Error(`Invalid sequence for invoice number: ${seq}`);
  }
  return `${year}-${String(seq).padStart(width, "0")}`;
}
function calcTotals(lines) {
  var _a, _b;
  const byRate = /* @__PURE__ */ new Map();
  for (const line of lines) {
    if (!ALLOWED_VAT_RATES.includes(line.vatRate)) {
      throw new Error(`Unsupported VAT rate: ${line.vatRate}`);
    }
    if (!(line.quantity > 0)) {
      throw new Error(`Quantity must be > 0: ${line.description}`);
    }
    if (!(line.unitPriceNet >= 0)) {
      throw new Error(`Unit price must be >= 0: ${line.description}`);
    }
    const discount = (_a = line.discountPercent) != null ? _a : 0;
    if (discount < 0 || discount > 100) {
      throw new Error(`Discount must be 0-100: ${line.description}`);
    }
    const net = roundCents(line.quantity * line.unitPriceNet * (1 - discount / 100));
    const tax = roundCents(net * line.vatRate / 100);
    const entry = (_b = byRate.get(line.vatRate)) != null ? _b : { net: 0, tax: 0 };
    entry.net = roundCents(entry.net + net);
    entry.tax = roundCents(entry.tax + tax);
    byRate.set(line.vatRate, entry);
  }
  const breakdown = [...byRate.entries()].sort(([a], [b]) => a - b).map(([vatRate, sums]) => ({
    vatRate,
    net: sums.net,
    tax: sums.tax,
    gross: roundCents(sums.net + sums.tax)
  }));
  const netTotal = roundCents(breakdown.reduce((sum, item) => sum + item.net, 0));
  const taxTotal = roundCents(breakdown.reduce((sum, item) => sum + item.tax, 0));
  return { netTotal, taxTotal, grossTotal: roundCents(netTotal + taxTotal), breakdown };
}
function isIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}
function todayIso(date = /* @__PURE__ */ new Date()) {
  return date.toISOString().slice(0, 10);
}
function blankDraft(date = todayIso()) {
  const emptyParty = { name: "", street: "", zip: "", city: "", country: "DE" };
  return {
    seller: { ...emptyParty },
    buyer: { ...emptyParty },
    lines: [],
    issueDate: date,
    deliveryDate: date,
    currency: "EUR",
    documentTitle: "Rechnung"
  };
}
function isBlank(value) {
  return value === void 0 || value.trim().length === 0;
}
function validateInvoiceForIssue(input) {
  const errors = [];
  const { seller, buyer, lines } = input;
  if (isBlank(seller.name) || isBlank(seller.street) || isBlank(seller.zip) || isBlank(seller.city)) {
    errors.push("Seller needs full name and address (name, street, zip, city).");
  }
  if (isBlank(seller.vatId) && isBlank(seller.taxNumber)) {
    errors.push("Seller needs Steuernummer or USt-IdNr.");
  }
  if (isBlank(buyer.name) || isBlank(buyer.street) || isBlank(buyer.zip) || isBlank(buyer.city)) {
    errors.push("Buyer needs full name and address (name, street, zip, city).");
  }
  if (isBlank(input.issueDate) || !isIsoDate(input.issueDate)) {
    errors.push("Issue date must be ISO YYYY-MM-DD.");
  }
  if (isBlank(input.deliveryDate)) {
    errors.push("Delivery/service date is required.");
  }
  if (lines.length === 0) {
    errors.push("At least one line item is required.");
  }
  lines.forEach((line, index) => {
    const pos = index + 1;
    if (isBlank(line.description)) {
      errors.push(`Line ${pos}: description is required.`);
    }
    if (!(line.quantity > 0)) {
      errors.push(`Line ${pos}: quantity must be > 0.`);
    }
    if (!(line.unitPriceNet >= 0)) {
      errors.push(`Line ${pos}: unit price must be >= 0.`);
    }
    if (!ALLOWED_VAT_RATES.includes(line.vatRate)) {
      errors.push(`Line ${pos}: VAT rate must be one of ${ALLOWED_VAT_RATES.join(", ")}.`);
    }
    if (line.vatRate === 0 && isBlank(line.exemptionReason)) {
      errors.push(`Line ${pos}: exemption reason required for 0% VAT (or use a taxable rate).`);
    }
  });
  if (input.currency !== void 0 && input.currency !== "EUR") {
    errors.push("Only EUR is supported in v1.");
  }
  try {
    calcTotals(lines);
  } catch (error) {
    errors.push(`Totals error: ${error.message}`);
  }
  return errors;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ALLOWED_VAT_RATES,
  blankDraft,
  calcTotals,
  formatInvoiceNumber,
  isIsoDate,
  roundCents,
  todayIso,
  validateInvoiceForIssue
});
//# sourceMappingURL=invoice-model.js.map
