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
  imageHeightForWidth: () => imageHeightForWidth,
  renderInvoicePdf: () => renderInvoicePdf
});
module.exports = __toCommonJS(pdf_exports);
var import_pdfkit = __toESM(require("pdfkit"));
var import_fonts = require("./fonts");
var import_invoice_model = require("./invoice-model");
var import_templates = require("./templates");
function formatEur(value) {
  return `${value.toFixed(2)} EUR`;
}
function formatEurDe(value) {
  return `${value.toFixed(2).replace(".", ",")} \u20AC`;
}
const BOTTOM_MARGIN = 36;
const HEADER_GRAY = "#D9D9D9";
function formatDeDate(iso) {
  return (0, import_invoice_model.formatDeliveryDateDe)(iso);
}
function imageHeightForWidth(data, widthPt) {
  try {
    if (data.length > 24 && data.readUInt32BE(0) === 2303741511) {
      const width = data.readUInt32BE(16);
      const height = data.readUInt32BE(20);
      if (width > 0 && height > 0) {
        return widthPt * (height / width);
      }
    }
  } catch {
  }
  return widthPt;
}
const LOGO_MAX_HEIGHT_PT = 220;
const LOGO_CONTINUATION_HEIGHT_PT = 80;
async function renderInvoicePdf(invoice, template = import_templates.DEFAULT_TEMPLATE, logo, context = {}) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j;
  if (!invoice.number) {
    throw new Error("Invoice has no number yet - issue it before rendering");
  }
  const invoiceNumber = invoice.number;
  const originalNumber = (_a = context.stornoOfNumber) != null ? _a : null;
  const totals = (0, import_invoice_model.calcTotals)(invoice.lines);
  const skonto = (0, import_invoice_model.calcSkonto)(
    totals.grossTotal,
    invoice.skontoPercent,
    (_b = invoice.skontoDueDate) != null ? _b : void 0,
    (_c = invoice.dueDate) != null ? _c : void 0
  );
  const colors = template.colors;
  const usePrimary = (_d = template.usePrimaryColor) != null ? _d : import_templates.DEFAULT_TEMPLATE.usePrimaryColor;
  const accentFill = usePrimary ? colors.primary : HEADER_GRAY;
  const titleAccent = usePrimary && ((_e = template.titleAccent) != null ? _e : import_templates.DEFAULT_TEMPLATE.titleAccent);
  const headerAccent = usePrimary && ((_f = template.tableHeaderAccent) != null ? _f : import_templates.DEFAULT_TEMPLATE.tableHeaderAccent);
  const intro = (_g = template.introText) != null ? _g : import_templates.DEFAULT_TEMPLATE.introText;
  const closing = (_h = template.closingText) != null ? _h : import_templates.DEFAULT_TEMPLATE.closingText;
  const signature = ((_i = template.signatureName) == null ? void 0 : _i.trim()) || "";
  const showTagline = (_j = template.showTagline) != null ? _j : true;
  return new Promise((resolve, reject) => {
    var _a2, _b2, _c2, _d2, _e2, _f2, _g2, _h2, _i2;
    const doc = new import_pdfkit.default({
      size: "A4",
      margins: { top: 50, bottom: 36, left: 50, right: 50 },
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
    if (!(0, import_fonts.registerFonts)(doc)) {
      console.warn(
        "[e-invoices] Liberation Sans not found, fell back to Helvetica. The PDF renders correctly but is not PDF/A-3b conformant. Check that assets/fonts ships with the adapter."
      );
    }
    const pageWidth = doc.page.width - 100;
    const left = 50;
    const right = left + pageWidth;
    let pageCount = 1;
    doc.fillColor(colors.text);
    const drawLogo = (maxHeight) => {
      if (!logo || !template.logo) {
        return 0;
      }
      const widthPt = Math.min(300, Math.max(28, template.logo.widthMm * 72 / 25.4 * 0.6));
      const naturalHeight = imageHeightForWidth(logo.data, widthPt);
      const drawHeight = Math.min(naturalHeight, maxHeight);
      const drawWidth = naturalHeight > maxHeight ? widthPt * maxHeight / naturalHeight : widthPt;
      const lx = template.logo.position === "left" ? left : template.logo.position === "center" ? left + (pageWidth - drawWidth) / 2 : left + pageWidth - drawWidth;
      try {
        doc.image(logo.data, lx, 36, { width: drawWidth, height: drawHeight });
        return 36 + drawHeight;
      } catch {
        return 0;
      }
    };
    const logoBottom = drawLogo(LOGO_MAX_HEIGHT_PT);
    let cursor = logoBottom > 0 ? logoBottom + 10 : 50;
    if (showTagline) {
      doc.fillColor(colors.muted).fontSize(7);
      doc.text(
        `${invoice.seller.name} \u2013 ${invoice.seller.street} \u2013 ${invoice.seller.zip} ${invoice.seller.city}`,
        left,
        cursor,
        { width: pageWidth, align: "left" }
      );
      doc.fillColor(colors.text).fontSize(10);
      cursor += 12;
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
      doc.fontSize(10).font(by === cursor + 4 ? import_fonts.FONT_BOLD : import_fonts.FONT_REGULAR);
      doc.text(line, left, by, { width: 270 });
      by += 13;
    }
    doc.font(import_fonts.FONT_REGULAR).fontSize(10);
    const meta = [
      ["Rechnungsnr.:", invoiceNumber],
      ["Rechnungsdatum:", formatDeDate(invoice.issueDate)],
      ["Lieferdatum:", formatDeDate(invoice.deliveryDate)],
      ...template.showCustomerNumber && invoice.buyer.customerNumber ? [["Kundennr.:", invoice.buyer.customerNumber]] : [],
      ...invoice.dueDate ? [["F\xE4llig am:", formatDeDate(invoice.dueDate)]] : []
    ];
    let my = cursor + 4;
    for (const [label, value] of meta) {
      doc.font(import_fonts.FONT_BOLD).text(label, left + 300, my, { width: 100 });
      doc.font(import_fonts.FONT_REGULAR).text(value, left + 300, my, { width: pageWidth - 300, align: "right" });
      my += 14;
    }
    cursor = Math.max(by, my) + 14;
    if (template.blocks.title) {
      doc.fillColor(titleAccent ? colors.primary : colors.text).fontSize(17).font(import_fonts.FONT_BOLD);
      doc.text(`${invoice.documentTitle} Nr. ${invoice.number}`, left, cursor, { width: pageWidth });
      doc.fillColor(colors.text).fontSize(10).font(import_fonts.FONT_REGULAR);
      cursor += 24;
    }
    if (invoice.stornoOfId) {
      const original = originalNumber;
      doc.fillColor(colors.muted).fontSize(9);
      doc.text(
        original ? `Stornorechnung \u2014 storniert Rechnung ${original}.` : "Stornorechnung \u2014 storniert die oben genannte Rechnung.",
        left,
        cursor,
        { width: pageWidth }
      );
      doc.fillColor(colors.text).fontSize(10);
      cursor += 14;
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
      var _a3;
      doc.addPage();
      pageCount += 1;
      doc.fillColor(colors.text);
      rowY = ((_a3 = template.logo) == null ? void 0 : _a3.allPages) ? Math.max(60, drawLogo(LOGO_CONTINUATION_HEIGHT_PT) + 10) : 60;
    };
    const maxY = () => doc.page.height - BOTTOM_MARGIN;
    const ensureSpace = (points) => {
      if (rowY + points > maxY()) {
        newPage();
      }
    };
    const headerRow = () => {
      const height = 17;
      doc.save();
      if (headerAccent) {
        doc.rect(left - 2, rowY - 3, right + 2 - (left - 2), height).fill(colors.primary);
      } else {
        doc.rect(left - 2, rowY - 3, colX.qty - 2 - (left - 2), height).fill(accentFill);
        doc.rect(colX.qty - 2, rowY - 3, right + 2 - (colX.qty - 2), height).fill(HEADER_GRAY);
      }
      doc.restore();
      doc.font(import_fonts.FONT_BOLD).fontSize(9);
      doc.fillColor(headerAccent ? "#FFFFFF" : usePrimary ? "#FFFFFF" : colors.text);
      doc.text("Pos.", colX.pos, rowY);
      doc.text("Art.Nr.", colX.sku, rowY);
      doc.text("Bezeichnung", colX.name, rowY);
      doc.fillColor(headerAccent || usePrimary ? "#FFFFFF" : colors.text);
      doc.text("Menge", colX.qty, rowY);
      doc.text("Einheit", colX.unit, rowY);
      doc.text("E-Preis", colX.price, rowY);
      doc.text("Gesamt", colX.total, rowY, { width: totalW, align: "right" });
      doc.font(import_fonts.FONT_REGULAR).fontSize(10);
      rowY += 19;
    };
    if (template.blocks.positions) {
      headerRow();
      invoice.lines.forEach((line, index) => {
        var _a3, _b3, _c3, _d3;
        const amount = (0, import_invoice_model.lineNetAmount)(line);
        const netUnit = (0, import_invoice_model.lineNetUnitPrice)(line);
        const discount = (_a3 = line.discountPercent) != null ? _a3 : 0;
        const needs = ((_b3 = line.details) == null ? void 0 : _b3.trim()) ? 26 : 14;
        if (rowY + needs > 730) {
          newPage();
          headerRow();
        }
        doc.fillColor(colors.text).fontSize(10);
        doc.text(String(index + 1), colX.pos, rowY);
        doc.text(((_c3 = line.sku) == null ? void 0 : _c3.trim()) || "\u2013", colX.sku, rowY, { width: colX.name - colX.sku - 4 });
        doc.font(import_fonts.FONT_BOLD).text(line.description, colX.name, rowY, { width: 172 });
        doc.font(import_fonts.FONT_REGULAR);
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
      doc.fillColor(colors.text);
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
      doc.fillColor(colors.text).font(import_fonts.FONT_BOLD);
      doc.text("Gesamtbetrag brutto", colX.price - 60, rowY, { width: 130, align: "right" });
      doc.text(formatEurDe(totals.grossTotal), colX.total, rowY, { width: totalW, align: "right" });
      doc.font(import_fonts.FONT_REGULAR);
      rowY += 24;
    }
    const exempt = invoice.lines.find((line) => {
      var _a3;
      return line.vatRate === 0 && ((_a3 = line.exemptionReason) == null ? void 0 : _a3.trim());
    });
    if (exempt == null ? void 0 : exempt.exemptionReason) {
      ensureSpace(28);
      doc.text(`Steuerbefreiung: ${exempt.exemptionReason}`, left, rowY, { width: pageWidth });
      rowY += 14;
    }
    if (invoice.paid) {
      ensureSpace(16);
      doc.fillColor(colors.muted).fontSize(9);
      doc.text(
        `Ausgeglichen am ${formatDeDate(((_a2 = invoice.paidAt) != null ? _a2 : "").slice(0, 10)) || "\u2014"}${skonto.percent > 0 ? " (Skonto ber\xFCcksichtigt)" : ""}.`,
        left,
        rowY,
        { width: pageWidth }
      );
      doc.fillColor(colors.text).fontSize(10);
      rowY += 14;
    } else if (skonto.percent > 0) {
      ensureSpace(30);
      doc.fillColor(colors.muted).fontSize(9);
      doc.text(
        `Bei Zahlung bis ${formatDeDate((_b2 = skonto.dueDate) != null ? _b2 : "")} ${formatEurDe(skonto.payableNow)} je Rechnung (${skonto.percent} % Skonto = ${formatEurDe(skonto.amount)}).`,
        left,
        rowY,
        { width: pageWidth }
      );
      doc.fillColor(colors.text).fontSize(10);
      rowY += 14;
    }
    rowY += 14;
    doc.fillColor(colors.text).font(import_fonts.FONT_REGULAR).fontSize(10);
    if (template.blocks.payment && invoice.seller.iban) {
      ensureSpace(16);
      doc.text(
        `Zahlung an IBAN ${invoice.seller.iban}${invoice.seller.bic ? `, BIC ${invoice.seller.bic}` : ""}`,
        left,
        rowY,
        { width: pageWidth }
      );
      rowY += 14;
    }
    if (template.showPaymentTerms && invoice.paymentTerms) {
      ensureSpace(28);
      doc.text(`Zahlungsbedingungen: ${invoice.paymentTerms}`, left, rowY, { width: pageWidth });
      rowY += 14;
    }
    if (template.blocks.notes && ((_c2 = invoice.notes) == null ? void 0 : _c2.trim())) {
      ensureSpace(40);
      doc.text(`Hinweis: ${invoice.notes.trim()}`, left, rowY, { width: pageWidth });
      rowY += 14;
    }
    ensureSpace(closing.trim() || signature ? 60 : 10);
    if (closing.trim()) {
      rowY += 6;
      doc.text(closing.trim(), left, rowY, { width: pageWidth });
      rowY += 26;
    } else {
      rowY += 10;
    }
    if (signature) {
      doc.font(import_fonts.FONT_BOLD).text(signature, left, rowY, { width: pageWidth });
      doc.font(import_fonts.FONT_REGULAR);
      rowY += 20;
    }
    if ((_d2 = template.showFooterBoxes) != null ? _d2 : true) {
      const rawBoxes = invoice.seller.footerBoxes;
      const customBoxes = Array.isArray(rawBoxes) && rawBoxes.length === 4 && rawBoxes.some((box) => typeof box === "string" && box.trim() !== "") ? rawBoxes.filter((box) => typeof box === "string") : null;
      const boxes = customBoxes ? customBoxes.map(
        (box) => box.split("\n").map((line) => line.trim()).slice(0, 4)
      ) : [
        [invoice.seller.name, invoice.seller.street, `${invoice.seller.zip} ${invoice.seller.city}`],
        [
          (_e2 = invoice.seller.phone) != null ? _e2 : "",
          (_f2 = invoice.seller.website) != null ? _f2 : "",
          template.showEmail ? (_g2 = invoice.seller.email) != null ? _g2 : "" : ""
        ],
        [
          (_h2 = invoice.seller.bankName) != null ? _h2 : "",
          (_i2 = invoice.seller.iban) != null ? _i2 : "",
          invoice.seller.bic ? `BIC: ${invoice.seller.bic}` : ""
        ],
        [
          invoice.seller.vatId ? `USt. ID: ${invoice.seller.vatId}` : "",
          invoice.seller.taxNumber ? `Steuernr.: ${invoice.seller.taxNumber}` : "",
          ...template.headerExtra ? template.headerExtra.split("\n").slice(0, 3) : []
        ]
      ].map((lines) => lines.filter((line) => line.trim() !== ""));
      const colW = pageWidth / 4;
      doc.fontSize(8);
      const lineHeight = doc.heightOfString("Xg", { width: colW - 8 });
      const maxLines = Math.max(1, ...boxes.map((lines) => lines.length));
      const numberReserve = template.showPageNumbers === true ? lineHeight + 4 : 0;
      const need = 8 + maxLines * lineHeight + 6 + numberReserve;
      let footTop = Math.max(rowY + 6, maxY() - need);
      if (footTop + need > maxY() + 2) {
        newPage();
        footTop = maxY() - need;
      }
      doc.save();
      doc.moveTo(left, footTop).lineTo(right, footTop).strokeColor(colors.muted).lineWidth(0.5).stroke();
      doc.restore();
      footTop += 8;
      const rawAlign = invoice.seller.footerAlign;
      const aligns = [0, 1, 2, 3].map((i) => {
        const value = Array.isArray(rawAlign) ? rawAlign[i] : void 0;
        return value === "center" || value === "right" ? value : "left";
      });
      doc.fillColor(colors.text);
      boxes.forEach((lines, index) => {
        var _a3;
        const align = (_a3 = aligns[index]) != null ? _a3 : "left";
        const width = index === boxes.length - 1 ? colW : colW - 8;
        lines.forEach((line, lineIndex) => {
          doc.text(line, left + index * colW, footTop + lineIndex * lineHeight, { width, align });
        });
      });
      doc.fontSize(10);
      rowY = footTop + maxLines * lineHeight + 8;
    }
    if (template.showArchiveHint) {
      ensureSpace(36);
      doc.fontSize(9).fillColor(colors.muted).text(import_templates.ARCHIVE_HINT, left, rowY, { width: pageWidth });
      doc.fontSize(10).fillColor(colors.text);
      rowY += 24;
    }
    if (template.footerText.trim()) {
      ensureSpace(30);
      doc.fontSize(9).fillColor(colors.muted).text(template.footerText.trim(), left, rowY, { width: pageWidth });
      doc.fontSize(10).fillColor(colors.text);
    }
    if (template.showPageNumbers && pageCount > 1) {
      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i++) {
        doc.switchToPage(i);
        doc.fontSize(8).fillColor(colors.muted);
        doc.text(`Seite ${i + 1} von ${range.count}`, left, maxY() - 11, {
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
  imageHeightForWidth,
  renderInvoicePdf
});
//# sourceMappingURL=pdf.js.map
