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
  DEFAULT_NUMBER_FORMAT: () => DEFAULT_NUMBER_FORMAT,
  DEFAULT_QUOTE_NUMBER_FORMAT: () => DEFAULT_QUOTE_NUMBER_FORMAT,
  DOCUMENT_TYPES: () => DOCUMENT_TYPES,
  EXEMPTION_CATEGORIES: () => EXEMPTION_CATEGORIES,
  INVOICE_TITLES: () => INVOICE_TITLES,
  QUOTE_TITLES: () => QUOTE_TITLES,
  QUOTE_VALIDITY_DAYS: () => QUOTE_VALIDITY_DAYS,
  addDaysIso: () => addDaysIso,
  blankDraft: () => blankDraft,
  calcSkonto: () => calcSkonto,
  calcTotals: () => calcTotals,
  daysBetween: () => daysBetween,
  defaultDocumentTitle: () => defaultDocumentTitle,
  defaultValidUntil: () => defaultValidUntil,
  documentLabels: () => documentLabels,
  formatCustomerNumber: () => formatCustomerNumber,
  formatDeliveryDateDe: () => formatDeliveryDateDe,
  formatInvoiceNumber: () => formatInvoiceNumber,
  isIsoDate: () => isIsoDate,
  isQuote: () => isQuote,
  lineNetAmount: () => lineNetAmount,
  lineNetUnitPrice: () => lineNetUnitPrice,
  normalizeDocumentType: () => normalizeDocumentType,
  normalizeEmployeeCode: () => normalizeEmployeeCode,
  normalizeNumberFormat: () => normalizeNumberFormat,
  parseDeliveryPeriod: () => parseDeliveryPeriod,
  paymentCheckDuty: () => paymentCheckDuty,
  quoteState: () => quoteState,
  quoteStateLabel: () => quoteStateLabel,
  renderInvoiceNumber: () => renderInvoiceNumber,
  roundCents: () => roundCents,
  todayIso: () => todayIso,
  validateInvoiceForIssue: () => validateInvoiceForIssue
});
module.exports = __toCommonJS(invoice_model_exports);
const EXEMPTION_CATEGORIES = ["E", "AE", "K", "G", "O"];
const DOCUMENT_TYPES = ["invoice", "quote"];
function normalizeDocumentType(value) {
  const raw = (value != null ? value : "").trim().toLowerCase();
  return raw === "quote" ? "quote" : "invoice";
}
function isQuote(docType) {
  return normalizeDocumentType(docType) === "quote";
}
function defaultDocumentTitle(docType) {
  return isQuote(docType) ? "Angebot" : "Rechnung";
}
const QUOTE_TITLES = ["Angebot", "Kostenvoranschlag"];
const INVOICE_TITLES = ["Rechnung", "Abschlagsrechnung", "Schlussrechnung", "Gutschrift"];
const QUOTE_VALIDITY_DAYS = 30;
function addDaysIso(iso, days) {
  if (!isIsoDate(iso)) {
    return iso;
  }
  const base = Date.parse(`${iso}T00:00:00Z`);
  return new Date(base + days * 864e5).toISOString().slice(0, 10);
}
function defaultValidUntil(issueDate) {
  return addDaysIso(issueDate, QUOTE_VALIDITY_DAYS);
}
function quoteState(quote, today = todayIso()) {
  if (quote.acceptedAt) {
    return "accepted";
  }
  if (quote.rejectedAt || quote.status === "cancelled") {
    return "rejected";
  }
  if (quote.status === "draft") {
    return "draft";
  }
  if (quote.validUntil && isIsoDate(quote.validUntil) && quote.validUntil < today) {
    return "expired";
  }
  return "open";
}
function quoteStateLabel(state) {
  switch (state) {
    case "draft":
      return "Entwurf";
    case "open":
      return "Offen";
    case "accepted":
      return "Angenommen";
    case "rejected":
      return "Abgelehnt";
    default:
      return "Verfallen";
  }
}
function documentLabels(docType) {
  if (isQuote(docType)) {
    return {
      number: "Angebotsnr.:",
      date: "Angebotsdatum:",
      delivery: "Leistungszeitraum:",
      due: "Zahlungsziel:",
      validUntil: "G\xFCltig bis:",
      perDocument: "je Angebot",
      subject: "Angebot (Sichtkomponente, ohne E-Rechnungs-XML)"
    };
  }
  return {
    number: "Rechnungsnr.:",
    date: "Rechnungsdatum:",
    delivery: "Lieferdatum:",
    due: "F\xE4llig am:",
    validUntil: "G\xFCltig bis:",
    perDocument: "je Rechnung",
    subject: "E-Rechnung Sichtkomponente (ZUGFeRD)"
  };
}
const ALLOWED_VAT_RATES = [0, 7, 19];
function roundCents(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
const DEFAULT_NUMBER_FORMAT = "{YYYY}-{EMPLOYEE}-{SEQ}";
const DEFAULT_QUOTE_NUMBER_FORMAT = "A-{YYYY}-{EMPLOYEE}-{SEQ}";
const NUMBER_FORMAT_TOKENS = ["YYYY", "EMPLOYEE", "SEQ"];
function normalizeNumberFormat(format) {
  const raw = (format != null ? format : "").trim();
  if (raw === "" || raw.length > 40) {
    return null;
  }
  if (raw.split("{SEQ}").length - 1 !== 1) {
    return null;
  }
  let rest = raw;
  for (const token of NUMBER_FORMAT_TOKENS) {
    rest = rest.split(`{${token}}`).join("");
  }
  if (rest.length > 0 && !/^[A-Za-z0-9.\-_]+$/.test(rest)) {
    return null;
  }
  return raw;
}
function renderInvoiceNumber(format, parts) {
  const width = Math.max(3, String(parts.seq).length);
  return format.replace("{YYYY}", String(parts.year)).replace("{EMPLOYEE}", normalizeEmployeeCode(parts.employee)).replace("{SEQ}", String(parts.seq).padStart(width, "0"));
}
function formatInvoiceNumber(year, employee, seq, width = 3) {
  if (!Number.isInteger(year) || year < 2e3 || year > 2100) {
    throw new Error(`Invalid year for invoice number: ${year}`);
  }
  const code = normalizeEmployeeCode(employee);
  if (!Number.isInteger(seq) || seq < 1) {
    throw new Error(`Invalid sequence for invoice number: ${seq}`);
  }
  return `${year}-${code}-${String(seq).padStart(width, "0")}`;
}
function normalizeEmployeeCode(code) {
  const normalized = (code != null ? code : "").trim().toUpperCase() || "00";
  if (!/^[A-Z0-9]{1,8}$/.test(normalized)) {
    throw new Error(`Invalid employee code (1-8 letters/digits): ${code}`);
  }
  return /^\d+$/.test(normalized) ? normalized.padStart(2, "0") : normalized;
}
function lineNetAmount(line) {
  var _a;
  const discount = (_a = line.discountPercent) != null ? _a : 0;
  return roundCents(line.quantity * line.unitPriceNet * (1 - discount / 100));
}
function lineNetUnitPrice(line) {
  if (!(line.quantity > 0)) {
    return 0;
  }
  return lineNetAmount(line) / line.quantity;
}
function calcTotals(lines) {
  var _a, _b;
  const netByRate = /* @__PURE__ */ new Map();
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
    if (!(discount >= 0) || discount > 100) {
      throw new Error(`Discount must be 0-100: ${line.description}`);
    }
    const net = lineNetAmount(line);
    netByRate.set(line.vatRate, roundCents(((_b = netByRate.get(line.vatRate)) != null ? _b : 0) + net));
  }
  const breakdown = [...netByRate.entries()].sort(([a], [b]) => a - b).map(([vatRate, net]) => {
    const tax = roundCents(net * vatRate / 100);
    return { vatRate, net, tax, gross: roundCents(net + tax) };
  });
  const netTotal = roundCents(breakdown.reduce((sum, item) => sum + item.net, 0));
  const taxTotal = roundCents(breakdown.reduce((sum, item) => sum + item.tax, 0));
  return { netTotal, taxTotal, grossTotal: roundCents(netTotal + taxTotal), breakdown };
}
function isIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}
function parseDeliveryPeriod(value) {
  const raw = (value != null ? value : "").trim();
  if (raw.includes("..")) {
    const [start, end] = raw.split("..").map((part) => part.trim());
    if (!isIsoDate(start != null ? start : "") || !isIsoDate(end != null ? end : "") || (end != null ? end : "") < (start != null ? start : "")) {
      return null;
    }
    return { start, end };
  }
  return isIsoDate(raw) ? { start: raw, end: null } : null;
}
function formatDeliveryDateDe(value) {
  const period = parseDeliveryPeriod(value);
  if (!period) {
    return value;
  }
  const de = (iso) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}`;
  return period.end ? `${de(period.start)} \u2013 ${de(period.end)}` : de(period.start);
}
function calcSkonto(grossTotal, skontoPercent, skontoDueDate, dueDate) {
  const percent = Number(skontoPercent) || 0;
  if (!(percent > 0)) {
    return { percent: 0, amount: 0, payableNow: grossTotal, dueDate: (skontoDueDate == null ? void 0 : skontoDueDate.trim()) || dueDate || null };
  }
  const amount = roundCents(grossTotal * percent / 100);
  return {
    percent,
    amount,
    payableNow: roundCents(grossTotal - amount),
    dueDate: (skontoDueDate == null ? void 0 : skontoDueDate.trim()) || dueDate || null
  };
}
function formatCustomerNumber(seq) {
  if (!Number.isInteger(seq) || seq < 1) {
    throw new Error(`Invalid customer number sequence: ${seq}`);
  }
  return `K-${String(seq).padStart(5, "0")}`;
}
function todayIso(date = /* @__PURE__ */ new Date()) {
  return date.toISOString().slice(0, 10);
}
function daysBetween(from, to) {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) {
    return 0;
  }
  return Math.floor((b - a) / 864e5);
}
function paymentCheckDuty(dueDate, grossTotal, today = todayIso()) {
  const overdueDays = dueDate ? Math.max(0, daysBetween(dueDate, today)) : 0;
  if (Number(grossTotal) > 1e4) {
    return {
      required: true,
      reason: `Betrag \xFCber 10.000 EUR (${Number(grossTotal).toFixed(2)} EUR) \u2013 Zahlungsweise nach \xA7 16 Abs. 2 Nr. 2 UStG pr\xFCfen.`,
      overdueDays
    };
  }
  if (overdueDays > 40) {
    return {
      required: true,
      reason: `Mehr als 40 Tage \xFCberf\xE4llig (${overdueDays} Tage) \u2013 Zahlungsweise nach \xA7 16 Abs. 2 Nr. 2 UStG pr\xFCfen.`,
      overdueDays
    };
  }
  return { required: false, reason: "", overdueDays };
}
function blankDraft(date = todayIso(), docType = "invoice") {
  const emptyParty = { name: "", street: "", zip: "", city: "", country: "DE" };
  const kind = normalizeDocumentType(docType);
  return {
    seller: { ...emptyParty },
    buyer: { ...emptyParty },
    lines: [],
    issueDate: date,
    deliveryDate: date,
    currency: "EUR",
    // a new document starts as an invoice unless the caller asks for a
    // quotation; the PWA switches the type in the wizard, too (R8)
    docType: kind,
    documentTitle: defaultDocumentTitle(kind),
    // a quotation carries a validity date from the start (R8)
    validUntil: isQuote(kind) ? defaultValidUntil(date) : void 0
  };
}
function isBlank(value) {
  return value === void 0 || value.trim().length === 0;
}
function validateInvoiceForIssue(input) {
  var _a;
  const errors = [];
  const { seller, buyer, lines } = input;
  const quote = isQuote(input.docType);
  if (isBlank(seller.name) || isBlank(seller.street) || isBlank(seller.zip) || isBlank(seller.city)) {
    errors.push("Seller needs full name and address (name, street, zip, city).");
  }
  if (isBlank(seller.vatId) && isBlank(seller.taxNumber)) {
    errors.push("Seller needs Steuernummer or USt-IdNr.");
  }
  if (isBlank(buyer.name) || isBlank(buyer.street) || isBlank(buyer.zip) || isBlank(buyer.city)) {
    errors.push("Buyer needs full name and address (name, street, zip, city).");
  }
  if (!quote && isBlank(buyer.customerNumber)) {
    errors.push("Buyer needs a customer number (Kundennummer, BT-10) for the German e-invoice.");
  }
  if (isBlank(input.issueDate) || !isIsoDate(input.issueDate)) {
    errors.push("Issue date must be a real calendar date in ISO format (YYYY-MM-DD).");
  }
  if (isBlank(input.deliveryDate)) {
    errors.push("Delivery/service date is required.");
  } else if (!parseDeliveryPeriod(input.deliveryDate)) {
    errors.push(
      "Delivery/service date must be a real calendar date (YYYY-MM-DD) or a period (YYYY-MM-DD..YYYY-MM-DD)."
    );
  }
  if (isQuote(input.docType) && !isBlank(input.validUntil)) {
    if (!isIsoDate(input.validUntil)) {
      errors.push("Valid-until date must be a real calendar date (YYYY-MM-DD).");
    } else if (isIsoDate(input.issueDate) && input.validUntil < input.issueDate) {
      errors.push("Valid-until date must not be before the issue date.");
    }
  }
  if (!quote && input.skontoPercent !== void 0) {
    const skonto = Number(input.skontoPercent);
    if (!(skonto >= 0) || skonto > 100) {
      errors.push("Skonto must be between 0 and 100 percent.");
    } else if (skonto > 0) {
      const deadline = ((_a = input.skontoDueDate) == null ? void 0 : _a.trim()) || input.dueDate;
      if (!deadline || !isIsoDate(deadline)) {
        errors.push("Skonto needs a discount deadline (Skonto bis, ISO YYYY-MM-DD).");
      } else if (isIsoDate(input.issueDate) && deadline < input.issueDate) {
        errors.push("Skonto deadline must not be before the issue date.");
      } else if (input.dueDate && isIsoDate(input.dueDate) && deadline > input.dueDate) {
        errors.push("Skonto deadline must not be later than the due date.");
      }
    }
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
    if (line.vatRate === 0 && line.exemptionCategory && !EXEMPTION_CATEGORIES.includes(line.exemptionCategory)) {
      errors.push(`Line ${pos}: exemption category must be one of ${EXEMPTION_CATEGORIES.join(", ")}.`);
    }
  });
  if (input.currency !== void 0 && input.currency !== "EUR") {
    errors.push("Only EUR is supported in v1.");
  }
  if (input.employeeCode !== void 0) {
    try {
      normalizeEmployeeCode(input.employeeCode);
    } catch (error) {
      errors.push(error.message);
    }
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
  DEFAULT_NUMBER_FORMAT,
  DEFAULT_QUOTE_NUMBER_FORMAT,
  DOCUMENT_TYPES,
  EXEMPTION_CATEGORIES,
  INVOICE_TITLES,
  QUOTE_TITLES,
  QUOTE_VALIDITY_DAYS,
  addDaysIso,
  blankDraft,
  calcSkonto,
  calcTotals,
  daysBetween,
  defaultDocumentTitle,
  defaultValidUntil,
  documentLabels,
  formatCustomerNumber,
  formatDeliveryDateDe,
  formatInvoiceNumber,
  isIsoDate,
  isQuote,
  lineNetAmount,
  lineNetUnitPrice,
  normalizeDocumentType,
  normalizeEmployeeCode,
  normalizeNumberFormat,
  parseDeliveryPeriod,
  paymentCheckDuty,
  quoteState,
  quoteStateLabel,
  renderInvoiceNumber,
  roundCents,
  todayIso,
  validateInvoiceForIssue
});
//# sourceMappingURL=invoice-model.js.map
