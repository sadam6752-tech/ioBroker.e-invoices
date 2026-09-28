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
async function validateArtifacts(invoice, xml) {
  const formatErrors = [];
  const businessErrors = [];
  if (!xml.includes("CrossIndustryInvoice")) {
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
  if (invoice.number && !xml.includes(invoice.number)) {
    businessErrors.push("Invoice number missing in XML");
  }
  const typeCode = (invoice.documentTitle || "").toLowerCase().includes("gutschrift") ? "381" : "380";
  if (!xml.includes(`<ram:TypeCode>${typeCode}</ram:TypeCode>`)) {
    businessErrors.push(`Document type code ${typeCode} missing in XML`);
  }
  if (!xml.includes(invoice.seller.name) || !xml.includes(invoice.buyer.name)) {
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
    if (!xml.includes(fresh.grossTotal.toFixed(2))) {
      businessErrors.push("Grand total amount missing in XML");
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
