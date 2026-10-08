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
var datev_exports = {};
__export(datev_exports, {
  DATEV_COLUMNS: () => DATEV_COLUMNS,
  datevDocumentField: () => datevDocumentField,
  renderDatevExport: () => renderDatevExport,
  resolveDatevConfig: () => resolveDatevConfig,
  toWindows1252: () => toWindows1252
});
module.exports = __toCommonJS(datev_exports);
var import_invoice_model = require("./invoice-model");
const DEFAULT_REVENUE = {
  SKR03: { 19: "8400", 7: "8300", 0: "8100" },
  SKR04: { 19: "4400", 7: "4300", 0: "4100" }
};
function resolveDatevConfig(config) {
  var _a, _b, _c, _d, _e;
  const problems = [];
  const consultantText = String((_a = config.consultant) != null ? _a : "").trim();
  const clientText = String((_b = config.client) != null ? _b : "").trim();
  const consultant = Number(consultantText);
  const client = Number(clientText);
  if (!/^\d+$/.test(consultantText) || consultant < 1001 || consultant > 9999999) {
    problems.push("advisor number (Beraternummer, 1001\u20139999999)");
  }
  if (!/^\d+$/.test(clientText) || client < 1 || client > 99999) {
    problems.push("client number (Mandantennummer, 1\u201399999)");
  }
  const chartText = String((_c = config.chart) != null ? _c : "").trim() || "SKR03";
  const chart = chartText === "SKR03" || chartText === "SKR04" ? chartText : void 0;
  if (!chart) {
    problems.push("chart of accounts (SKR03 or SKR04)");
  }
  const accountLength = Number((_d = config.accountLength) != null ? _d : 4) || 4;
  if (!Number.isInteger(accountLength) || accountLength < 4 || accountLength > 8) {
    problems.push("account length (4\u20138)");
  }
  const fiscalYearStartMonth = Number((_e = config.fiscalYearStartMonth) != null ? _e : 1) || 1;
  if (!Number.isInteger(fiscalYearStartMonth) || fiscalYearStartMonth < 1 || fiscalYearStartMonth > 12) {
    problems.push("first month of the fiscal year (1\u201312)");
  }
  const pad = (account2) => account2.padEnd(accountLength, "0");
  const account = (value, fallback, length, label) => {
    const text2 = String(value != null ? value : "").trim() || fallback;
    if (!/^\d+$/.test(text2) || text2.length !== length) {
      problems.push(`${label} (${length} digits)`);
    }
    return text2;
  };
  const defaults = DEFAULT_REVENUE[chart != null ? chart : "SKR03"];
  const revenue = {
    19: account(config.revenue19, pad(defaults[19]), accountLength, "revenue account 19 %"),
    7: account(config.revenue7, pad(defaults[7]), accountLength, "revenue account 7 %"),
    0: account(config.revenue0, pad(defaults[0]), accountLength, "revenue account 0 %")
  };
  const debtor = account(config.debtor, "1".padEnd(accountLength + 1, "0"), accountLength + 1, "debtor account");
  if (problems.length > 0 || !chart) {
    return { problems };
  }
  return { config: { consultant, client, chart, accountLength, fiscalYearStartMonth, debtor, revenue } };
}
function text(value, max) {
  const clean = value.replace(/[\r\n;]+/g, " ").trim().slice(0, max);
  return `"${clean.replace(/"/g, '""')}"`;
}
function amount(value) {
  return Math.abs(value).toFixed(2).replace(".", ",");
}
function compact(iso) {
  return iso.replace(/-/g, "");
}
function datevDocumentField(number) {
  return number.toUpperCase().replace(/[^A-Z0-9$&%*+\-/]/g, "-").slice(0, 36);
}
function fiscalYearStart(iso, startMonth) {
  const year = Number(iso.slice(0, 4));
  const month = Number(iso.slice(5, 7));
  const startYear = month >= startMonth ? year : year - 1;
  return `${startYear}-${String(startMonth).padStart(2, "0")}-01`;
}
const DATEV_COLUMNS = [
  "Umsatz (ohne Soll/Haben-Kz)",
  "Soll/Haben-Kennzeichen",
  "WKZ Umsatz",
  "Kurs",
  "Basis-Umsatz",
  "WKZ Basis-Umsatz",
  "Konto",
  "Gegenkonto (ohne BU-Schl\xFCssel)",
  "BU-Schl\xFCssel",
  "Belegdatum",
  "Belegfeld 1",
  "Belegfeld 2",
  "Skonto",
  "Buchungstext"
];
function renderDatevExport(invoices, config, now = /* @__PURE__ */ new Date()) {
  var _a, _b, _c, _d;
  const bookable = invoices.filter(
    (invoice) => !(0, import_invoice_model.isQuote)(invoice.docType) && invoice.status !== "draft" && invoice.number
  );
  if (bookable.length === 0) {
    throw new Error("No issued invoices in the chosen period \u2014 nothing to export to DATEV");
  }
  const dates = bookable.map((invoice) => invoice.issueDate).sort();
  const fiscalYears = new Set(dates.map((date) => fiscalYearStart(date, config.fiscalYearStartMonth)));
  if (fiscalYears.size > 1) {
    throw new Error(
      `The invoices span ${fiscalYears.size} fiscal years (${[...fiscalYears].map((d) => d.slice(0, 4)).join(", ")}); DATEV takes one fiscal year per file \u2014 narrow the period`
    );
  }
  const two = (value) => String(value).padStart(2, "0");
  const created = `${now.getFullYear()}${two(now.getMonth() + 1)}${two(now.getDate())}${two(now.getHours())}${two(now.getMinutes())}${two(now.getSeconds())}000`;
  const header = [
    '"EXTF"',
    "700",
    "21",
    '"Buchungsstapel"',
    "13",
    created,
    "",
    '"RE"',
    '""',
    '""',
    String(config.consultant),
    String(config.client),
    compact([...fiscalYears][0]),
    String(config.accountLength),
    compact(dates[0]),
    compact(dates[dates.length - 1]),
    '"Rechnungsausgang"',
    '""',
    "1",
    "0",
    "0",
    '"EUR"',
    "",
    '""',
    "",
    "",
    `"${config.chart.slice(3)}"`,
    "",
    "",
    '""',
    '""'
  ].join(";");
  const lines = [header, DATEV_COLUMNS.join(";")];
  for (const invoice of bookable) {
    const credit = (0, import_invoice_model.isCreditNoteTitle)(invoice.documentTitle);
    const day = `${invoice.issueDate.slice(8, 10)}${invoice.issueDate.slice(5, 7)}`;
    const label = `${invoice.documentTitle} ${(_a = invoice.number) != null ? _a : ""} ${invoice.buyer.name}`;
    for (const entry of invoice.totals.breakdown) {
      const gross = (_b = entry.gross) != null ? _b : entry.net + entry.tax;
      if (gross === 0) {
        continue;
      }
      const revenue = (_c = config.revenue[entry.vatRate]) != null ? _c : config.revenue[19];
      lines.push(
        [
          amount(gross),
          // an invoice debits the debtor, a credit note credits it
          credit ? '"H"' : '"S"',
          '"EUR"',
          "",
          "",
          '""',
          config.debtor,
          revenue,
          '""',
          day,
          text(datevDocumentField((_d = invoice.number) != null ? _d : ""), 36),
          '""',
          "",
          text(label, 60)
        ].join(";")
      );
    }
  }
  return `${lines.join("\r\n")}\r
`;
}
const CP1252 = {
  "\u20AC": 128,
  "\u201A": 130,
  "\u201E": 132,
  "\u2026": 133,
  "\u2018": 145,
  "\u2019": 146,
  "\u201C": 147,
  "\u201D": 148,
  "\u2013": 150,
  "\u2014": 151
};
function toWindows1252(value) {
  var _a, _b;
  const bytes = [];
  for (const char of value) {
    const code = (_a = char.codePointAt(0)) != null ? _a : 63;
    if (code < 128 || code >= 160 && code <= 255) {
      bytes.push(code);
    } else {
      bytes.push((_b = CP1252[char]) != null ? _b : 63);
    }
  }
  return Buffer.from(bytes);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  DATEV_COLUMNS,
  datevDocumentField,
  renderDatevExport,
  resolveDatevConfig,
  toWindows1252
});
//# sourceMappingURL=datev.js.map
