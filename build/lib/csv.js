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
var import_output_i18n = require("./output-i18n");
const CSV_COPY_NOTICE = import_output_i18n.COPY_NOTICE;
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
  ["number", "Invoice number"],
  ["issueDate", "Invoice date"],
  ["documentTitle", "Document type"],
  ["status", "State"],
  ["dueDate", "Due date"],
  ["sentAt", "Sent on"],
  ["paidAt", "Paid on"],
  ["createdAt", "Created on"],
  ["customerNumber", "Customer number"],
  ["customerName", "Customer"],
  ["customerCity", "City"],
  ["vatId", "VAT ID"],
  ["net", "Net EUR"],
  ["tax", "VAT EUR"],
  ["gross", "Gross EUR"],
  ["skontoPercent", "Cash discount percent"],
  ["retainUntil", "Keep until"],
  ["pdfPath", "PDF file"]
];
function renderInvoiceListCsv(invoices, language = "en") {
  const lines = [];
  lines.push(csvField((0, import_output_i18n.tr)(language, CSV_COPY_NOTICE)));
  lines.push(HEADERS.map(([, label]) => csvField((0, import_output_i18n.tr)(language, label))).join(";"));
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
function renderOpenItemsCsv(report, language = "en") {
  const lines = [];
  lines.push(csvField((0, import_output_i18n.tr)(language, CSV_COPY_NOTICE)));
  lines.push(
    csvField(
      `${(0, import_output_i18n.tr)(language, "Open items as of {date}", { date: (0, import_output_i18n.formatOutputDate)(report.asOf, language) })}${report.onlyOverdue ? ` ${(0, import_output_i18n.tr)(language, "(overdue only)")}` : ""}`
    )
  );
  lines.push(
    [
      "Invoice number",
      "Customer",
      "Customer number",
      "Invoice date",
      "Due on",
      "Days overdue",
      "Age",
      "Open amount EUR",
      "Cash discount percent",
      "Dunning level"
    ].map((label) => csvField((0, import_output_i18n.tr)(language, label))).join(";")
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
        (0, import_output_i18n.tr)(language, import_open_items.AGE_BUCKET_LABELS[item.bucket]),
        de(item.amount),
        de(item.skontoPercent),
        String(item.reminderLevel)
      ].map(csvField).join(";")
    );
  }
  lines.push("");
  const total = (0, import_output_i18n.tr)(language, "Total");
  for (const bucket of import_open_items.AGE_BUCKETS) {
    const sub = report.buckets[bucket];
    lines.push(
      [total, (0, import_output_i18n.tr)(language, import_open_items.AGE_BUCKET_LABELS[bucket]), String(sub.count), de(sub.amount)].map(csvField).join(";")
    );
  }
  lines.push(
    [total, (0, import_output_i18n.tr)(language, "all"), String(report.total.count), de(report.total.amount)].map(csvField).join(";")
  );
  lines.push(
    [total, (0, import_output_i18n.tr)(language, "of which overdue"), String(report.overdue.count), de(report.overdue.amount)].map(csvField).join(";")
  );
  return `${UTF8_BOM}${lines.join("\r\n")}\r
`;
}
function renderRevenueCsv(report, language = "en") {
  const lines = [];
  lines.push(csvField((0, import_output_i18n.tr)(language, CSV_COPY_NOTICE)));
  lines.push(csvField(`${(0, import_output_i18n.tr)(language, "Revenue by company")}${report.year === null ? "" : ` ${report.year}`}`));
  lines.push(
    ["Company", "Number of invoices", "Net EUR", "VAT EUR", "Gross EUR"].map((label) => csvField((0, import_output_i18n.tr)(language, label))).join(";")
  );
  for (const row of report.rows) {
    const company = row.companyId == null ? (0, import_output_i18n.tr)(language, "without company assignment") : row.company;
    lines.push([company, String(row.count), de(row.net), de(row.tax), de(row.gross)].map(csvField).join(";"));
  }
  const total = report.total;
  lines.push(
    [(0, import_output_i18n.tr)(language, "Total"), String(total.count), de(total.net), de(total.tax), de(total.gross)].map(csvField).join(";")
  );
  return `${UTF8_BOM}${lines.join("\r\n")}\r
`;
}
function renderDunningCsv(suggestions, today, language = "en") {
  const lines = [];
  lines.push(csvField((0, import_output_i18n.tr)(language, CSV_COPY_NOTICE)));
  lines.push(csvField((0, import_output_i18n.tr)(language, "Dunning suggestions as of {date}", { date: (0, import_output_i18n.formatOutputDate)(today, language) })));
  lines.push(
    [
      "Invoice number",
      "Customer",
      "E-mail",
      "Level",
      "Days overdue",
      "Due on",
      "Payment deadline",
      "Open amount EUR"
    ].map((label) => csvField((0, import_output_i18n.tr)(language, label))).join(";")
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
  lines.push(
    [(0, import_output_i18n.tr)(language, "Total"), String(suggestions.length), de(Math.round(sum * 100) / 100)].map(csvField).join(";")
  );
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
