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
  formatEurDe: () => formatEurDe,
  renderInvoicePdf: () => renderInvoicePdf
});
module.exports = __toCommonJS(pdf_exports);
var import_pdfkit = __toESM(require("pdfkit"));
var import_invoice_model = require("./invoice-model");
var import_templates = require("./templates");
function formatEur(value) {
  return `${value.toFixed(2)} EUR`;
}
function formatEurDe(value) {
  return `${value.toFixed(2).replace(".", ",")} \u20AC`;
}
const HEADER_GRAY = "#D9D9D9";
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
    var _a2, _b2, _c2, _d2, _e, _f, _g, _h;
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
      const height = 17;
      doc.save();
      doc.rect(left - 2, rowY - 3, colX.qty - 2 - (left - 2), height).fill(colors.primary);
      doc.rect(colX.qty - 2, rowY - 3, right + 2 - (colX.qty - 2), height).fill(HEADER_GRAY);
      doc.restore();
      doc.font("Helvetica-Bold").fontSize(9);
      doc.fillColor("#FFFFFF");
      doc.text("Pos.", colX.pos, rowY);
      doc.text("Art.Nr.", colX.sku, rowY);
      doc.text("Bezeichnung", colX.name, rowY);
      doc.fillColor(colors.text);
      doc.text("Menge", colX.qty, rowY);
      doc.text("Einheit", colX.unit, rowY);
      doc.text("E-Preis", colX.price, rowY);
      doc.text("Gesamt", colX.total, rowY, { width: totalW, align: "right" });
      doc.font("Helvetica").fontSize(10);
      rowY += 19;
    };
    if (template.blocks.positions) {
      headerRow();
      invoice.lines.forEach((line, index) => {
        var _a3, _b3, _c3, _d3;
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
        doc.text(((_c3 = line.sku) == null ? void 0 : _c3.trim()) || "\u2013", colX.sku, rowY, { width: colX.name - colX.sku - 4 });
        doc.font("Helvetica-Bold").text(line.description, colX.name, rowY, { width: 172 });
        doc.font("Helvetica");
        doc.text(`${line.quantity}`, colX.qty, rowY);
        doc.text(line.unit, colX.unit, rowY, { width: 40 });
        doc.text(formatEurDe(netUnit), colX.price, rowY, { width: 66 });
        doc.text(formatEurDe(amount), colX.total, rowY, { width: totalW, align: "right" });
        rowY += 13;
        if ((_d3 = line.details) == null ? void 0 : _d3.trim()) {
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
    if (template.blocks.positions && invoice.lines.length > 0) {
      if (rowY > 740) {
        newPage();
      }
      doc.save();
      doc.moveTo(left, rowY).lineTo(right, rowY).strokeColor(colors.text).lineWidth(0.75).stroke();
      doc.restore();
      rowY += 10;
    }
    if (template.blocks.totals) {
      if (rowY > 700) {
        newPage();
      }
      doc.text("Zwischensumme netto", colX.price - 60, rowY, { width: 130, align: "right" });
      doc.text(formatEurDe(totals.netTotal), colX.total, rowY, { width: totalW, align: "right" });
      rowY += 14;
      for (const entry of totals.breakdown) {
        doc.text(`zzgl. ${entry.vatRate} % MwSt.`, colX.price - 60, rowY, { width: 130, align: "right" });
        doc.text(formatEurDe(entry.tax), colX.total, rowY, { width: totalW, align: "right" });
        rowY += 14;
      }
      doc.save();
      doc.rect(colX.price - 64, rowY - 3, right + 2 - (colX.price - 64), 18).fill(HEADER_GRAY);
      doc.restore();
      doc.font("Helvetica-Bold");
      doc.text("Gesamtbetrag brutto", colX.price - 60, rowY, { width: 130, align: "right" });
      doc.text(formatEurDe(totals.grossTotal), colX.total, rowY, { width: totalW, align: "right" });
      doc.font("Helvetica");
      rowY += 24;
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
    if ((_c2 = template.showFooterBoxes) != null ? _c2 : true) {
      const rawBoxes = invoice.seller.footerBoxes;
      const customBoxes = Array.isArray(rawBoxes) && rawBoxes.length === 4 && rawBoxes.some((box) => typeof box === "string" && box.trim() !== "") ? rawBoxes.filter((box) => typeof box === "string") : null;
      const boxes = customBoxes ? customBoxes.map(
        (box) => box.split("\n").map((line) => line.trim()).slice(0, 4)
      ) : [
        [invoice.seller.name, invoice.seller.street, `${invoice.seller.zip} ${invoice.seller.city}`],
        [
          (_d2 = invoice.seller.phone) != null ? _d2 : "",
          (_e = invoice.seller.website) != null ? _e : "",
          template.showEmail ? (_f = invoice.seller.email) != null ? _f : "" : ""
        ],
        [
          (_g = invoice.seller.bankName) != null ? _g : "",
          (_h = invoice.seller.iban) != null ? _h : "",
          invoice.seller.bic ? `BIC: ${invoice.seller.bic}` : ""
        ],
        [
          invoice.seller.vatId ? `USt. ID: ${invoice.seller.vatId}` : "",
          invoice.seller.taxNumber ? `Steuernr.: ${invoice.seller.taxNumber}` : "",
          ...template.headerExtra ? template.headerExtra.split("\n").slice(0, 3) : []
        ]
      ].map((lines) => lines.filter((line) => line.trim() !== ""));
      const maxLines = Math.max(1, ...boxes.map((lines) => lines.length));
      const need = 8 + maxLines * 10 + 6;
      const footBottom = doc.page.height - 36;
      let footTop = Math.max(rowY + 6, footBottom - need);
      if (footTop + need > footBottom + 2) {
        newPage();
        footTop = doc.page.height - 36 - need;
      }
      doc.save();
      doc.moveTo(left, footTop).lineTo(right, footTop).strokeColor(colors.muted).lineWidth(0.5).stroke();
      doc.restore();
      footTop += 8;
      const colW = pageWidth / 4;
      const rawAlign = invoice.seller.footerAlign;
      const aligns = [0, 1, 2, 3].map((i) => {
        const value = Array.isArray(rawAlign) ? rawAlign[i] : void 0;
        return value === "center" || value === "right" ? value : "left";
      });
      doc.fontSize(8);
      boxes.forEach((lines, index) => {
        var _a3;
        const align = (_a3 = aligns[index]) != null ? _a3 : "left";
        const width = index === boxes.length - 1 ? colW : colW - 8;
        lines.forEach((line, lineIndex) => {
          doc.text(line, left + index * colW, footTop + lineIndex * 10, { width, align });
        });
      });
      doc.fontSize(10);
      rowY = footTop + maxLines * 10 + 8;
    }
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
  formatEurDe,
  renderInvoicePdf
});
//# sourceMappingURL=pdf.js.map
