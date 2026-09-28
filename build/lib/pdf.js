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
var pdf_exports = {};
__export(pdf_exports, {
  formatDeDate: () => formatDeDate,
  formatEur: () => formatEur,
  renderInvoicePdf: () => renderInvoicePdf
});
module.exports = __toCommonJS(pdf_exports);
var import_pdfkit = __toESM(require("pdfkit"));
var import_invoice_model = require("./invoice-model");
var import_templates = require("./templates");
function formatEur(value) {
  return `${value.toFixed(2)} EUR`;
}
function formatDeDate(iso) {
  const date = iso.split("..")[0];
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) {
    return iso;
  }
  return `${match[3]}.${match[2]}.${match[1]}`;
}
async function renderInvoicePdf(invoice, template = import_templates.DEFAULT_TEMPLATE, logo) {
  var _a, _b, _c, _d;
  if (!invoice.number) {
    throw new Error("Invoice has no number yet \u2014 issue it before rendering");
  }
  const invoiceNumber = invoice.number;
  const totals = (0, import_invoice_model.calcTotals)(invoice.lines);
  const colors = template.colors;
  const intro = (_a = template.introText) != null ? _a : import_templates.DEFAULT_TEMPLATE.introText;
  const closing = (_b = template.closingText) != null ? _b : import_templates.DEFAULT_TEMPLATE.closingText;
  const signature = ((_c = template.signatureName) == null ? void 0 : _c.trim()) || invoice.seller.name;
  const showTagline = (_d = template.showTagline) != null ? _d : true;
  return new Promise((resolve, reject) => {
    var _a2, _b2;
    const doc = new import_pdfkit.default({
      size: "A4",
      margin: 50,
      bufferPages: template.showPageNumbers === true,
      info: {
        Title: `${invoice.documentTitle} ${invoice.number}`,
        Author: invoice.seller.name,
        Subject: "E-Rechnung Sichtkomponente (ZUGFeRD)",
        Creator: "ioBroker.e-invoices"
      }
    });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", (error) => reject(error));
    const pageWidth = doc.page.width - 100;
    const left = 50;
    const right = left + pageWidth;
    let pageCount = 1;
    doc.fillColor(colors.text);
    if (logo && template.logo) {
      const widthPt = Math.min(200, Math.max(28, template.logo.widthMm * 72 / 25.4 * 0.6));
      try {
        if (template.logo.position === "left") {
          doc.image(logo.data, left, 36, { width: widthPt });
        } else if (template.logo.position === "center") {
          doc.image(logo.data, left + (pageWidth - widthPt) / 2, 34, { width: widthPt });
        } else {
          doc.image(logo.data, right - widthPt, 36, { width: widthPt });
        }
      } catch {
      }
    }
    const headerTop = 40;
    doc.fillColor(colors.primary).fontSize(15).font("Helvetica-Bold");
    doc.text(invoice.seller.name, left, headerTop, { width: 280 });
    doc.fillColor(colors.text).fontSize(9).font("Helvetica");
    const headLeft = [
      invoice.seller.street,
      `${invoice.seller.zip} ${invoice.seller.city}`,
      invoice.seller.phone ? `Tel. ${invoice.seller.phone}` : "",
      (_a2 = invoice.seller.website) != null ? _a2 : "",
      template.showEmail && invoice.seller.email ? invoice.seller.email : ""
    ].filter((line) => line !== "");
    let hy = headerTop + 20;
    for (const line of headLeft) {
      doc.text(line, left, hy, { width: 280 });
      hy += 11;
    }
    const headRight = [
      invoice.seller.iban ? `IBAN ${invoice.seller.iban}` : "",
      invoice.seller.bic ? `BIC ${invoice.seller.bic}` : "",
      invoice.seller.vatId ? `USt-IdNr.: ${invoice.seller.vatId}` : "",
      invoice.seller.taxNumber ? `Steuernr.: ${invoice.seller.taxNumber}` : "",
      ...template.headerExtra ? template.headerExtra.split("\n").slice(0, 3) : []
    ].filter((line) => line !== "");
    let hry = headerTop;
    doc.fontSize(9);
    for (const line of headRight) {
      doc.text(line, left + 300, hry, { width: pageWidth - 300, align: "right" });
      hry += 11;
    }
    let cursor = Math.max(hy, hry) + 8;
    if (showTagline) {
      doc.fillColor(colors.muted).fontSize(8);
      doc.text(
        `${invoice.seller.name} \u2013 ${invoice.seller.street} \u2013 ${invoice.seller.zip} ${invoice.seller.city}`,
        left,
        cursor,
        { width: pageWidth, align: "center" }
      );
      doc.fillColor(colors.text).fontSize(10);
      cursor += 14;
    }
    const buyerLines = [
      invoice.buyer.name,
      invoice.buyer.street,
      `${invoice.buyer.zip} ${invoice.buyer.city}`,
      invoice.buyer.country && invoice.buyer.country !== "DE" ? invoice.buyer.country : "",
      invoice.buyer.contactName ? `Ansprechpartner: ${invoice.buyer.contactName}` : ""
    ].filter((line) => line !== "");
    let by = cursor + 4;
    for (const line of buyerLines) {
      doc.fontSize(10).font(by === cursor + 4 ? "Helvetica-Bold" : "Helvetica");
      doc.text(line, left, by, { width: 270 });
      by += 13;
    }
    doc.font("Helvetica").fontSize(10);
    const meta = [
      ["Rechnungsnr.:", invoiceNumber],
      ["Rechnungsdatum:", formatDeDate(invoice.issueDate)],
      ["Lieferdatum:", formatDeDate(invoice.deliveryDate)],
      ...template.showCustomerNumber && invoice.buyer.customerNumber ? [["Kundennr.:", invoice.buyer.customerNumber]] : [],
      ...invoice.dueDate ? [["F\xE4llig am:", formatDeDate(invoice.dueDate)]] : []
    ];
    let my = cursor + 4;
    for (const [label, value] of meta) {
      doc.font("Helvetica-Bold").text(label, left + 300, my, { width: 90 });
      doc.font("Helvetica").text(value, left + 395, my, { width: pageWidth - 395 });
      my += 14;
    }
    cursor = Math.max(by, my) + 14;
    if (template.blocks.title) {
      doc.fillColor(colors.primary).fontSize(17).font("Helvetica-Bold");
      doc.text(`${invoice.documentTitle} Nr. ${invoice.number}`, left, cursor, { width: pageWidth });
      doc.fillColor(colors.text).fontSize(10).font("Helvetica");
      cursor += 24;
    }
    if (intro.trim()) {
      doc.text(intro.trim(), left, cursor, { width: pageWidth });
      cursor += 22;
    }
    const colX = {
      pos: left,
      sku: left + 28,
      name: left + 88,
      qty: left + 268,
      unit: left + 318,
      price: left + 362,
      total: left + 432
    };
    const totalW = right - colX.total;
    let rowY = cursor;
    const newPage = () => {
      doc.addPage();
      pageCount += 1;
      rowY = 60;
    };
    const headerRow = () => {
      doc.font("Helvetica-Bold").fontSize(9);
      doc.text("Pos.", colX.pos, rowY);
      doc.text("Art.Nr.", colX.sku, rowY);
      doc.text("Bezeichnung", colX.name, rowY);
      doc.text("Menge", colX.qty, rowY);
      doc.text("Einheit", colX.unit, rowY);
      doc.text("E-Preis", colX.price, rowY);
      doc.text("Gesamt", colX.total, rowY, { width: totalW, align: "right" });
      doc.font("Helvetica").fontSize(10);
      rowY += 15;
    };
    if (template.blocks.positions) {
      headerRow();
      invoice.lines.forEach((line, index) => {
        var _a3, _b3, _c2, _d2;
        const discount = (_a3 = line.discountPercent) != null ? _a3 : 0;
        const netUnit = Math.round(line.unitPriceNet * (1 - discount / 100) * 100) / 100;
        const amount = Math.round(line.quantity * netUnit * 100) / 100;
        const needs = ((_b3 = line.details) == null ? void 0 : _b3.trim()) ? 26 : 14;
        if (rowY + needs > 730) {
          newPage();
          headerRow();
        }
        doc.fontSize(10);
        doc.text(String(index + 1), colX.pos, rowY);
        doc.text(((_c2 = line.sku) == null ? void 0 : _c2.trim()) || "\u2013", colX.sku, rowY, { width: colX.name - colX.sku - 4 });
        doc.font("Helvetica-Bold").text(line.description, colX.name, rowY, { width: 172 });
        doc.font("Helvetica");
        doc.text(`${line.quantity}`, colX.qty, rowY);
        doc.text(line.unit, colX.unit, rowY, { width: 40 });
        doc.text(formatEur(netUnit), colX.price, rowY, { width: 66 });
        doc.text(formatEur(amount), colX.total, rowY, { width: totalW, align: "right" });
        rowY += 13;
        if ((_d2 = line.details) == null ? void 0 : _d2.trim()) {
          doc.fontSize(8).fillColor(colors.muted);
          doc.text(line.details.trim(), colX.name, rowY, { width: 260 });
          doc.fontSize(10).fillColor(colors.text);
          rowY += 12;
        } else {
          rowY += 2;
        }
        if (discount > 0) {
          doc.fontSize(8).fillColor(colors.muted);
          doc.text(`inkl. ${discount} % Nachlass`, colX.name, rowY, { width: 260 });
          doc.fontSize(10).fillColor(colors.text);
          rowY += 12;
        }
      });
      rowY += 8;
    }
    if (template.blocks.totals) {
      if (rowY > 700) {
        newPage();
      }
      doc.text("Zwischensumme netto", colX.price - 60, rowY, { width: 130, align: "right" });
      doc.text(formatEur(totals.netTotal), colX.total, rowY, { width: totalW, align: "right" });
      rowY += 14;
      for (const entry of totals.breakdown) {
        doc.text(`zzgl. ${entry.vatRate} % MwSt.`, colX.price - 60, rowY, { width: 130, align: "right" });
        doc.text(formatEur(entry.tax), colX.total, rowY, { width: totalW, align: "right" });
        rowY += 14;
      }
      doc.font("Helvetica-Bold");
      doc.text("Gesamtbetrag brutto", colX.price - 60, rowY, { width: 130, align: "right" });
      doc.text(formatEur(totals.grossTotal), colX.total, rowY, { width: totalW, align: "right" });
      doc.font("Helvetica");
      rowY += 22;
    }
    const exempt = invoice.lines.find((line) => {
      var _a3;
      return line.vatRate === 0 && ((_a3 = line.exemptionReason) == null ? void 0 : _a3.trim());
    });
    if (exempt == null ? void 0 : exempt.exemptionReason) {
      doc.text(`Steuerbefreiung: ${exempt.exemptionReason}`, left, rowY, { width: pageWidth });
      rowY += 14;
    }
    if (template.blocks.payment && invoice.seller.iban) {
      doc.text(
        `Zahlung an IBAN ${invoice.seller.iban}${invoice.seller.bic ? `, BIC ${invoice.seller.bic}` : ""}`,
        left,
        rowY,
        { width: pageWidth }
      );
      rowY += 14;
    }
    if (template.showPaymentTerms && invoice.paymentTerms) {
      doc.text(`Zahlungsbedingungen: ${invoice.paymentTerms}`, left, rowY, { width: pageWidth });
      rowY += 14;
    }
    if (template.blocks.notes && ((_b2 = invoice.notes) == null ? void 0 : _b2.trim())) {
      doc.text(`Hinweis: ${invoice.notes.trim()}`, left, rowY, { width: pageWidth });
      rowY += 14;
    }
    if (closing.trim()) {
      rowY += 6;
      doc.text(closing.trim(), left, rowY, { width: pageWidth });
      rowY += 26;
    } else {
      rowY += 10;
    }
    doc.text("Mit freundlichen Gr\xFC\xDFen", left, rowY, { width: pageWidth });
    rowY += 26;
    doc.font("Helvetica-Bold").text(signature, left, rowY, { width: pageWidth });
    doc.font("Helvetica");
    rowY += 20;
    if (template.showArchiveHint) {
      doc.fontSize(9).fillColor(colors.muted).text(import_templates.ARCHIVE_HINT, left, rowY, { width: pageWidth });
      doc.fontSize(10).fillColor(colors.text);
      rowY += 24;
    }
    if (template.footerText.trim()) {
      doc.fontSize(9).fillColor(colors.muted).text(template.footerText.trim(), left, rowY, { width: pageWidth });
      doc.fontSize(10).fillColor(colors.text);
    }
    if (template.showPageNumbers && pageCount > 1) {
      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i++) {
        doc.switchToPage(i);
        doc.fontSize(8).fillColor(colors.muted);
        doc.text(`Seite ${i + 1} von ${range.count}`, left, doc.page.height - 30, {
          width: pageWidth,
          align: "center"
        });
      }
      doc.flushPages();
    }
    doc.end();
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  formatDeDate,
  formatEur,
  renderInvoicePdf
});
//# sourceMappingURL=pdf.js.map
