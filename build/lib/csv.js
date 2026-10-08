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
var csv_exports = {};
__export(csv_exports, {
  CSV_COPY_NOTICE: () => CSV_COPY_NOTICE,
  renderDunningCsv: () => renderDunningCsv,
  renderInvoiceListCsv: () => renderInvoiceListCsv,
  renderOpenItemsCsv: () => renderOpenItemsCsv,
  renderRevenueCsv: () => renderRevenueCsv,
  toCsvRow: () => toCsvRow
});
module.exports = __toCommonJS(csv_exports);
var import_open_items = require("./open-items");
const CSV_COPY_NOTICE = "KOPIE \u2013 kein Steuerdokument. Ma\xDFgeblich ist das eingebettete XML der ZUGFeRD-Rechnung.";
const UTF8_BOM = String.fromCharCode(65279);
function csvField(value) {
  let text = value === null || value === void 0 ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`;
  }
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
function de(value) {
  return (Number(value) || 0).toFixed(2).replace(".", ",");
}
function toCsvRow(invoice) {
  var _a, _b, _c, _d, _e, _f, _g;
  return {
    number: (_a = invoice.number) != null ? _a : "",
    issueDate: invoice.issueDate,
    documentTitle: invoice.documentTitle,
    status: invoice.status,
    dueDate: (_b = invoice.dueDate) != null ? _b : "",
    sentAt: invoice.sentAt ? invoice.sentAt.slice(0, 10) : "",
    paidAt: invoice.paidAt ? invoice.paidAt.slice(0, 10) : "",
    createdAt: invoice.createdAt,
    customerNumber: (_c = invoice.buyer.customerNumber) != null ? _c : "",
    customerName: invoice.buyer.name,
    customerCity: invoice.buyer.city,
    vatId: (_e = (_d = invoice.seller.vatId) != null ? _d : invoice.seller.taxNumber) != null ? _e : "",
    net: invoice.totals.netTotal,
    tax: invoice.totals.taxTotal,
    gross: invoice.totals.grossTotal,
    skontoPercent: Number(invoice.skontoPercent) || 0,
    retainUntil: (_f = invoice.retainUntil) != null ? _f : "",
    pdfPath: (_g = invoice.pdfPath) != null ? _g : ""
  };
}
const HEADERS = [
  ["number", "Rechnungsnummer"],
  ["issueDate", "Rechnungsdatum"],
  ["documentTitle", "Belegart"],
  ["status", "Status"],
  ["dueDate", "Faelligkeit"],
  ["sentAt", "Versendet am"],
  ["paidAt", "Bezahlt am"],
  ["createdAt", "Erstellt am"],
  ["customerNumber", "Kundennummer"],
  ["customerName", "Kunde"],
  ["customerCity", "Ort"],
  ["vatId", "USt-IdNr"],
  ["net", "Netto EUR"],
  ["tax", "USt EUR"],
  ["gross", "Brutto EUR"],
  ["skontoPercent", "Skonto Prozent"],
  ["retainUntil", "Aufbewahren bis"],
  ["pdfPath", "PDF-Datei"]
];
function renderInvoiceListCsv(invoices) {
  const lines = [];
  lines.push(csvField(CSV_COPY_NOTICE));
  lines.push(HEADERS.map(([, label]) => csvField(label)).join(";"));
  for (const invoice of invoices) {
    const row = toCsvRow(invoice);
    lines.push(
      HEADERS.map(([key]) => {
        const value = row[key];
        return csvField(typeof value === "number" ? de(value) : value);
      }).join(";")
    );
  }
  return `${UTF8_BOM}${lines.join("\r\n")}\r
`;
}
function renderOpenItemsCsv(report) {
  const lines = [];
  lines.push(csvField(CSV_COPY_NOTICE));
  lines.push(csvField(`Offene Posten zum ${report.asOf}${report.onlyOverdue ? " (nur \xFCberf\xE4llige)" : ""}`));
  lines.push(
    [
      "Rechnungsnummer",
      "Kunde",
      "Kundennummer",
      "Rechnungsdatum",
      "Faellig am",
      "Tage ueberfaellig",
      "Alterung",
      "Offener Betrag EUR",
      "Skonto Prozent",
      "Mahnstufe"
    ].map(csvField).join(";")
  );
  for (const item of report.items) {
    lines.push(
      [
        item.number,
        item.customer,
        item.customerNumber,
        item.issueDate,
        item.dueDate,
        String(item.overdueDays),
        import_open_items.AGE_BUCKET_LABELS[item.bucket],
        de(item.amount),
        de(item.skontoPercent),
        String(item.reminderLevel)
      ].map(csvField).join(";")
    );
  }
  lines.push("");
  for (const bucket of import_open_items.AGE_BUCKETS) {
    const sub = report.buckets[bucket];
    lines.push(["Summe", import_open_items.AGE_BUCKET_LABELS[bucket], String(sub.count), de(sub.amount)].map(csvField).join(";"));
  }
  lines.push(["Summe", "gesamt", String(report.total.count), de(report.total.amount)].map(csvField).join(";"));
  lines.push(
    ["Summe", "davon \xFCberf\xE4llig", String(report.overdue.count), de(report.overdue.amount)].map(csvField).join(";")
  );
  return `${UTF8_BOM}${lines.join("\r\n")}\r
`;
}
function renderRevenueCsv(report) {
  const lines = [];
  lines.push(csvField(CSV_COPY_NOTICE));
  lines.push(csvField(`Umsatz je Firma${report.year === null ? "" : ` ${report.year}`}`));
  lines.push(["Firma", "Anzahl Rechnungen", "Netto EUR", "USt EUR", "Brutto EUR"].map(csvField).join(";"));
  for (const row of report.rows) {
    lines.push([row.company, String(row.count), de(row.net), de(row.tax), de(row.gross)].map(csvField).join(";"));
  }
  const total = report.total;
  lines.push(["Summe", String(total.count), de(total.net), de(total.tax), de(total.gross)].map(csvField).join(";"));
  return `${UTF8_BOM}${lines.join("\r\n")}\r
`;
}
function renderDunningCsv(suggestions, today) {
  const lines = [];
  lines.push(csvField(CSV_COPY_NOTICE));
  lines.push(csvField(`Mahnvorschl\xE4ge zum ${today}`));
  lines.push(
    [
      "Rechnungsnummer",
      "Kunde",
      "E-Mail",
      "Stufe",
      "Tage ueberfaellig",
      "Faellig am",
      "Zahlungsziel",
      "Offener Betrag EUR"
    ].map(csvField).join(";")
  );
  let sum = 0;
  for (const item of suggestions) {
    sum += item.amount;
    lines.push(
      [
        item.number,
        item.customer,
        item.email,
        String(item.level),
        String(item.overdueDays),
        item.dueDate,
        item.deadline,
        de(item.amount)
      ].map(csvField).join(";")
    );
  }
  lines.push("");
  lines.push(["Summe", String(suggestions.length), de(Math.round(sum * 100) / 100)].map(csvField).join(";"));
  return `${UTF8_BOM}${lines.join("\r\n")}\r
`;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  CSV_COPY_NOTICE,
  renderDunningCsv,
  renderInvoiceListCsv,
  renderOpenItemsCsv,
  renderRevenueCsv,
  toCsvRow
});
//# sourceMappingURL=csv.js.map
