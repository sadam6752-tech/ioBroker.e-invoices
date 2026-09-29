"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var excel_exports = {};
__export(excel_exports, {
  EXCEL_COPY_NOTICE: () => EXCEL_COPY_NOTICE,
  renderInvoiceListWorkbook: () => renderInvoiceListWorkbook,
  renderInvoiceWorkbook: () => renderInvoiceWorkbook
});
module.exports = __toCommonJS(excel_exports);
var import_exceljs = __toESM(require("exceljs"));
var import_invoice_model = require("./invoice-model");
const EXCEL_COPY_NOTICE = "KOPIE \u2013 kein Steuerdokument. Ma\xDFgeblich ist das eingebettete XML der ZUGFeRD-Rechnung.";
function safeCellText(value) {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}
function headRow(sheet, row, values) {
  const r = sheet.getRow(row);
  values.forEach((value, index) => {
    const cell = r.getCell(index + 1);
    cell.value = value;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A56DB" } };
  });
  r.commit();
}
function partyBlock(sheet, startRow, title, lines) {
  sheet.getCell(`A${startRow}`).value = title;
  sheet.getCell(`A${startRow}`).font = { bold: true };
  lines.forEach((line, index) => {
    sheet.getCell(`A${startRow + 1 + index}`).value = safeCellText(line);
  });
  return startRow + 1 + lines.length;
}
async function renderInvoiceWorkbook(invoice) {
  if (!invoice.number) {
    throw new Error("Invoice has no number yet \u2014 issue it before exporting");
  }
  const totals = (0, import_invoice_model.calcTotals)(invoice.lines);
  const book = new import_exceljs.default.Workbook();
  book.creator = "ioBroker.e-invoices";
  book.created = /* @__PURE__ */ new Date();
  const sheet = book.addWorksheet("Rechnung");
  sheet.columns = [{ width: 38 }, { width: 22 }, { width: 22 }, { width: 22 }, { width: 22 }];
  sheet.getCell("A1").value = safeCellText(`${invoice.documentTitle} ${invoice.number}`);
  sheet.getCell("A1").font = { bold: true, size: 16 };
  sheet.getCell("A2").value = EXCEL_COPY_NOTICE;
  sheet.getCell("A2").font = { italic: true, color: { argb: "FFB91C1C" } };
  let row = partyBlock(sheet, 4, "Rechnungssteller", [
    invoice.seller.name,
    invoice.seller.street,
    `${invoice.seller.zip} ${invoice.seller.city}`,
    [
      invoice.seller.vatId ? `USt-IdNr.: ${invoice.seller.vatId}` : "",
      invoice.seller.taxNumber ? `Steuernr.: ${invoice.seller.taxNumber}` : ""
    ].filter((part) => part !== "").join(" \xB7 ")
  ]);
  row = partyBlock(
    sheet,
    row + 1,
    "Rechnungsempf\xE4nger",
    [
      invoice.buyer.name,
      invoice.buyer.street,
      `${invoice.buyer.zip} ${invoice.buyer.city}`,
      invoice.buyer.customerNumber ? `Kundennr.: ${invoice.buyer.customerNumber}` : ""
    ].filter((line) => line !== "")
  );
  row += 1;
  sheet.getCell(`A${row}`).value = `Ausstellungsdatum: ${invoice.issueDate}`;
  sheet.getCell(`A${row + 1}`).value = `Liefer-/Leistungsdatum: ${(0, import_invoice_model.formatDeliveryDateDe)(invoice.deliveryDate)}`;
  if (invoice.dueDate) {
    sheet.getCell(`A${row + 2}`).value = `F\xE4llig am: ${invoice.dueDate}`;
    row += 1;
  }
  row += 2;
  headRow(sheet, row, ["Beschreibung", "Menge", "Einzel (netto)", "USt-Satz", "Betrag (netto)"]);
  invoice.lines.forEach((line, index) => {
    const amount = (0, import_invoice_model.lineNetAmount)(line);
    const netUnit = (0, import_invoice_model.lineNetUnitPrice)(line);
    const r = sheet.getRow(row + 1 + index);
    r.getCell(1).value = safeCellText(line.description);
    r.getCell(2).value = safeCellText(`${line.quantity} ${line.unit}`);
    r.getCell(3).value = netUnit;
    r.getCell(3).numFmt = '#,##0.00 "EUR"';
    r.getCell(4).value = line.vatRate / 100;
    r.getCell(4).numFmt = "0%";
    r.getCell(5).value = amount;
    r.getCell(5).numFmt = '#,##0.00 "EUR"';
    r.commit();
  });
  row += invoice.lines.length + 1;
  for (const entry of totals.breakdown) {
    sheet.getCell(`A${row}`).value = `Netto ${entry.vatRate} % / USt`;
    sheet.getCell(`E${row}`).value = entry.tax;
    sheet.getCell(`E${row}`).numFmt = '#,##0.00 "EUR"';
    row += 1;
  }
  sheet.getCell(`A${row}`).value = "Gesamt netto";
  sheet.getCell(`A${row}`).font = { bold: true };
  sheet.getCell(`E${row}`).value = totals.netTotal;
  sheet.getCell(`E${row}`).numFmt = '#,##0.00 "EUR"';
  sheet.getCell(`E${row}`).font = { bold: true };
  sheet.getCell(`A${row + 1}`).value = "Rechnungsbetrag";
  sheet.getCell(`A${row + 1}`).font = { bold: true };
  sheet.getCell(`E${row + 1}`).value = totals.grossTotal;
  sheet.getCell(`E${row + 1}`).numFmt = '#,##0.00 "EUR"';
  sheet.getCell(`E${row + 1}`).font = { bold: true };
  const buffer = await book.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
async function renderInvoiceListWorkbook(invoices, title) {
  const book = new import_exceljs.default.Workbook();
  book.creator = "ioBroker.e-invoices";
  book.created = /* @__PURE__ */ new Date();
  const sheet = book.addWorksheet("\xDCbersicht");
  sheet.columns = [
    { width: 16 },
    { width: 14 },
    { width: 30 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
    { width: 12 }
  ];
  sheet.getCell("A1").value = title;
  sheet.getCell("A1").font = { bold: true, size: 14 };
  sheet.getCell("A2").value = EXCEL_COPY_NOTICE;
  sheet.getCell("A2").font = { italic: true, color: { argb: "FFB91C1C" } };
  headRow(sheet, 4, ["Nummer", "Datum", "K\xE4ufer", "Netto", "USt", "Brutto", "Status"]);
  invoices.forEach((invoice, index) => {
    var _a;
    const r = sheet.getRow(5 + index);
    r.getCell(1).value = safeCellText((_a = invoice.number) != null ? _a : "(Entwurf)");
    r.getCell(2).value = invoice.issueDate;
    r.getCell(3).value = safeCellText(invoice.buyer.name);
    r.getCell(4).value = invoice.totals.netTotal;
    r.getCell(4).numFmt = '#,##0.00 "EUR"';
    r.getCell(5).value = invoice.totals.taxTotal;
    r.getCell(5).numFmt = '#,##0.00 "EUR"';
    r.getCell(6).value = invoice.totals.grossTotal;
    r.getCell(6).numFmt = '#,##0.00 "EUR"';
    r.getCell(7).value = safeCellText(invoice.status);
    r.commit();
  });
  const buffer = await book.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  EXCEL_COPY_NOTICE,
  renderInvoiceListWorkbook,
  renderInvoiceWorkbook
});
//# sourceMappingURL=excel.js.map
