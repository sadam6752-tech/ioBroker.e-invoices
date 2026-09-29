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
var validation_exports = {};
__export(validation_exports, {
  validateArtifacts: () => validateArtifacts
});
module.exports = __toCommonJS(validation_exports);
var import_factur_x = require("@stackforge-eu/factur-x");
var import_invoice_model = require("./invoice-model");
var import_zugferd = require("./zugferd");
function xmlText(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
function elementValue(xml, tag) {
  const match = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`).exec(xml);
  if (!match) {
    return void 0;
  }
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : void 0;
}
async function validateArtifacts(invoice, xml) {
  const formatErrors = [];
  const businessErrors = [];
  if (!/<[A-Za-z0-9]*:?CrossIndustryInvoice[\s>]/.test(xml)) {
    formatErrors.push("Missing CII root element CrossIndustryInvoice");
  }
  try {
    const profile = (0, import_zugferd.resolveProfile)(invoice.profile);
    const xsd = await (0, import_factur_x.validateXsd)(xml, profile);
    for (const error of xsd.errors) {
      formatErrors.push(error.line ? `Line ${error.line}: ${error.message}` : error.message);
    }
  } catch (error) {
    formatErrors.push(`XSD validation crashed: ${error.message}`);
  }
  if (invoice.number && !xml.includes(xmlText(invoice.number))) {
    businessErrors.push("Invoice number missing in XML");
  }
  const typeCode = (invoice.documentTitle || "").toLowerCase().includes("gutschrift") ? "381" : "380";
  if (!xml.includes(`<ram:TypeCode>${typeCode}</ram:TypeCode>`)) {
    businessErrors.push(`Document type code ${typeCode} missing in XML`);
  }
  if (!xml.includes(xmlText(invoice.seller.name)) || !xml.includes(xmlText(invoice.buyer.name))) {
    businessErrors.push("Seller or buyer name missing in XML");
  }
  if (!xml.includes("<ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>")) {
    businessErrors.push("Currency EUR missing in XML");
  }
  try {
    const fresh = (0, import_invoice_model.calcTotals)(invoice.lines);
    if (Math.abs(fresh.grossTotal - invoice.totals.grossTotal) > 5e-3) {
      businessErrors.push("Stored totals differ from recalculated line totals");
    }
    const lineTotals = [...xml.matchAll(/<ram:LineTotalAmount>([^<]*)</g)].map((m) => Number(m[1]));
    const sumOfLines = lineTotals.slice(0, -1).reduce((sum, value) => (0, import_invoice_model.roundCents)(sum + value), 0);
    if (lineTotals.length > 1 && Math.abs((0, import_invoice_model.roundCents)(sumOfLines - lineTotals[lineTotals.length - 1])) > 5e-3) {
      businessErrors.push(`Line sum ${sumOfLines.toFixed(2)} differs from header line total`);
    }
    const basis = elementValue(xml, "ram:TaxBasisTotalAmount");
    if (basis !== void 0 && Math.abs(basis - fresh.netTotal) > 5e-3) {
      businessErrors.push(`Tax basis ${basis.toFixed(2)} differs from net total ${fresh.netTotal.toFixed(2)}`);
    }
    const grand = elementValue(xml, "ram:GrandTotalAmount");
    if (grand !== void 0 && Math.abs(grand - fresh.grossTotal) > 5e-3) {
      businessErrors.push(`Grand total ${grand.toFixed(2)} differs from ${fresh.grossTotal.toFixed(2)}`);
    }
    for (const entry of fresh.breakdown) {
      const expected = (0, import_invoice_model.roundCents)(entry.net * entry.vatRate / 100);
      if (Math.abs(expected - entry.tax) > 5e-3) {
        businessErrors.push(
          `Tax ${entry.tax.toFixed(2)} at ${entry.vatRate}% != expected ${expected.toFixed(2)}`
        );
      }
    }
  } catch (error) {
    businessErrors.push(`Totals check crashed: ${error.message}`);
  }
  return { formatErrors, businessErrors };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  validateArtifacts
});
//# sourceMappingURL=validation.js.map
