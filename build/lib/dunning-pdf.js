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
var dunning_pdf_exports = {};
__export(dunning_pdf_exports, {
  renderDunningPdf: () => renderDunningPdf
});
module.exports = __toCommonJS(dunning_pdf_exports);
var import_pdfkit = __toESM(require("pdfkit"));
var import_fonts = require("./fonts");
function de(iso) {
  const [year, month, day] = iso.slice(0, 10).split("-");
  return `${day}.${month}.${year}`;
}
function renderDunningPdf(suggestions, today) {
  return new Promise((resolve, reject) => {
    const doc = new import_pdfkit.default({
      size: "A4",
      margins: { top: 60, bottom: 50, left: 60, right: 60 },
      autoFirstPage: false,
      info: { Title: "Zahlungserinnerungen und Mahnungen", Creator: "ioBroker.e-invoices" }
    });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", (error) => reject(error));
    const fonts = (0, import_fonts.registerFonts)(doc);
    const regular = fonts ? import_fonts.FONT_REGULAR : "Helvetica";
    const bold = fonts ? import_fonts.FONT_BOLD : "Helvetica-Bold";
    for (const item of suggestions) {
      doc.addPage();
      const width = doc.page.width - 120;
      doc.fillColor("#111827");
      doc.font(regular).fontSize(7.5).fillColor("#555555").text(item.sender, 60, 100, { width, lineBreak: false });
      doc.fillColor("#111827").fontSize(11);
      doc.text(item.recipient.join("\n"), 60, 118, { width: 260 });
      doc.text(`Datum: ${de(today)}`, 60, 118, { width, align: "right" });
      doc.font(bold).fontSize(13).text(item.subject, 60, 230, { width });
      doc.moveDown(1);
      doc.font(regular).fontSize(11).text(item.text, { width, lineGap: 2 });
    }
    if (suggestions.length === 0) {
      doc.addPage();
      doc.font(regular).fontSize(11).text("Keine Mahnvorschl\xE4ge.", 60, 100);
    }
    doc.end();
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  renderDunningPdf
});
//# sourceMappingURL=dunning-pdf.js.map
