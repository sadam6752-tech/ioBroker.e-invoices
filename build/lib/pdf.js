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
async function renderInvoicePdf(invoice, template = import_templates.DEFAULT_TEMPLATE, logo) {
  if (!invoice.number) {
    throw new Error("Invoice has no number yet \u2014 issue it before rendering");
  }
  const totals = (0, import_invoice_model.calcTotals)(invoice.lines);
  const colors = template.colors;
  return new Promise((resolve, reject) => {
    var _a, _b;
    const doc = new import_pdfkit.default({
      size: "A4",
      margin: 50,
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
    doc.fillColor(colors.text);
    let titleX = left;
    if (logo && template.logo) {
      const widthPt = Math.min(200, Math.max(28, template.logo.widthMm * 72 / 25.4 * 0.6));
      try {
        if (template.logo.position === "left") {
          doc.image(logo.data, left, 38, { width: widthPt });
          titleX = left + widthPt + 16;
        } else if (template.logo.position === "center") {
          doc.image(logo.data, left + (pageWidth - widthPt) / 2, 36, { width: widthPt });
        } else {
          doc.image(logo.data, left + pageWidth - widthPt, 38, { width: widthPt });
        }
      } catch {
      }
    }
    if (template.blocks.title) {
      doc.fillColor(colors.primary).fontSize(20).font("Helvetica-Bold");
      if (((_a = template.logo) == null ? void 0 : _a.position) === "center" && logo) {
        doc.text(invoice.documentTitle, left, 108, { width: pageWidth, align: "center" });
      } else {
        doc.text(invoice.documentTitle, titleX, 50);
      }
      doc.fillColor(colors.text);
    }
    doc.fontSize(9).font("Helvetica").fillColor(colors.muted);
    doc.text("E-Rechnung (ZUGFeRD) \u2014 maschinenlesbares XML eingebettet, XML ist f\xFChrend.", left, 76, {
      width: pageWidth
    });
    doc.fillColor(colors.text);
    const partyTop = logo ? 140 : 110;
    let metaTop;
    if (template.blocks.parties) {
      const sellerLines = [
        invoice.seller.name,
        invoice.seller.street,
        `${invoice.seller.zip} ${invoice.seller.city}`,
        invoice.seller.country,
        invoice.seller.vatId ? `USt-IdNr.: ${invoice.seller.vatId}` : "",
        invoice.seller.taxNumber ? `Steuernr.: ${invoice.seller.taxNumber}` : "",
        template.showEmail && invoice.seller.email ? invoice.seller.email : ""
      ].filter((line) => line !== "");
      const buyerLines = [
        "Rechnungsempf\xE4nger:",
        invoice.buyer.name,
        invoice.buyer.street,
        `${invoice.buyer.zip} ${invoice.buyer.city}`,
        invoice.buyer.country,
        template.showCustomerNumber && invoice.buyer.customerNumber ? `Kundennr.: ${invoice.buyer.customerNumber}` : ""
      ].filter((line) => line !== "");
      doc.fontSize(10).font("Helvetica-Bold").text("Rechnungssteller:", left, partyTop);
      doc.font("Helvetica").fontSize(10);
      let y = partyTop + 14;
      for (const line of sellerLines) {
        doc.text(line, left, y);
        y += 13;
      }
      let by = partyTop;
      doc.font("Helvetica-Bold").text(buyerLines[0], left + 280, by);
      doc.font("Helvetica");
      for (const line of buyerLines.slice(1)) {
        by += 13;
        doc.text(line, left + 280, by);
      }
      metaTop = Math.max(y, by) + 18;
    } else {
      metaTop = partyTop;
    }
    if (template.blocks.meta) {
      doc.fontSize(10);
      doc.text(`Rechnungsnummer: ${invoice.number}`, left, metaTop);
      doc.text(`Ausstellungsdatum: ${invoice.issueDate}`, left, metaTop + 14);
      doc.text(`Liefer-/Leistungsdatum: ${invoice.deliveryDate}`, left, metaTop + 28);
      if (invoice.dueDate) {
        doc.text(`F\xE4llig am: ${invoice.dueDate}`, left + 280, metaTop);
      }
    }
    let rowY = metaTop + 52;
    if (template.blocks.positions) {
      doc.font("Helvetica-Bold");
      doc.text("Pos", left, rowY);
      doc.text("Beschreibung", left + 35, rowY);
      doc.text("Menge", left + 280, rowY);
      doc.text("Einzel (netto)", left + 340, rowY);
      doc.text("USt", left + 430, rowY);
      doc.text("Betrag (netto)", left + 465, rowY, { width: 80, align: "right" });
      doc.font("Helvetica");
      rowY += 16;
      invoice.lines.forEach((line, index) => {
        var _a2;
        const discount = (_a2 = line.discountPercent) != null ? _a2 : 0;
        const netUnit = Math.round(line.unitPriceNet * (1 - discount / 100) * 100) / 100;
        const amount = Math.round(line.quantity * netUnit * 100) / 100;
        doc.text(String(index + 1), left, rowY);
        doc.text(line.description + (discount > 0 ? ` (\u2212${discount} %)` : ""), left + 35, rowY, { width: 240 });
        doc.text(`${line.quantity} ${line.unit}`, left + 280, rowY);
        doc.text(formatEur(netUnit), left + 340, rowY);
        doc.text(`${line.vatRate} %`, left + 430, rowY);
        doc.text(formatEur(amount), left + 465, rowY, { width: 80, align: "right" });
        rowY += 16;
        if (rowY > 700) {
          doc.addPage();
          rowY = 60;
        }
      });
      rowY += 10;
    }
    if (template.blocks.totals) {
      doc.font("Helvetica-Bold").text("Summen", left, rowY);
      doc.font("Helvetica");
      for (const entry of totals.breakdown) {
        rowY += 14;
        doc.text(
          `Netto ${entry.vatRate} %: ${formatEur(entry.net)}   USt: ${formatEur(entry.tax)}`,
          left,
          rowY
        );
      }
      rowY += 18;
      doc.font("Helvetica-Bold");
      doc.text(`Gesamt netto: ${formatEur(totals.netTotal)}`, left, rowY);
      doc.text(`USt gesamt: ${formatEur(totals.taxTotal)}`, left, rowY + 14);
      doc.text(`Rechnungsbetrag: ${formatEur(totals.grossTotal)}`, left, rowY + 28);
      doc.font("Helvetica");
      rowY += 28;
    }
    let footY = rowY + 24;
    const exempt = invoice.lines.find((line) => {
      var _a2;
      return line.vatRate === 0 && ((_a2 = line.exemptionReason) == null ? void 0 : _a2.trim());
    });
    if (exempt == null ? void 0 : exempt.exemptionReason) {
      doc.text(`Steuerbefreiung: ${exempt.exemptionReason}`, left, footY, { width: pageWidth });
      footY += 14;
    }
    if (template.blocks.payment && invoice.seller.iban) {
      doc.text(
        `Zahlung an IBAN ${invoice.seller.iban}${invoice.seller.bic ? `, BIC ${invoice.seller.bic}` : ""}`,
        left,
        footY,
        {
          width: pageWidth
        }
      );
      footY += 14;
    }
    if (template.showPaymentTerms && invoice.paymentTerms) {
      doc.text(`Zahlungsbedingungen: ${invoice.paymentTerms}`, left, footY, { width: pageWidth });
      footY += 14;
    }
    if (template.blocks.notes && ((_b = invoice.notes) == null ? void 0 : _b.trim())) {
      doc.text(`Hinweis: ${invoice.notes.trim()}`, left, footY, { width: pageWidth });
      footY += 14;
    }
    if (template.showArchiveHint) {
      doc.fontSize(9).fillColor(colors.muted).text(import_templates.ARCHIVE_HINT, left, footY, { width: pageWidth });
      doc.fontSize(10).fillColor(colors.text);
      footY += 24;
    }
    if (template.footerText.trim()) {
      doc.fontSize(9).fillColor(colors.muted).text(template.footerText.trim(), left, footY, { width: pageWidth });
      doc.fontSize(10).fillColor(colors.text);
    }
    doc.end();
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  formatEur,
  renderInvoicePdf
});
//# sourceMappingURL=pdf.js.map
