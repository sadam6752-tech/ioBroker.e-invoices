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
var zugferd_exports = {};
__export(zugferd_exports, {
  embedHybridPdf: () => embedHybridPdf,
  generateInvoiceXml: () => generateInvoiceXml,
  mapDocumentTypeCode: () => mapDocumentTypeCode,
  mapUnitCode: () => mapUnitCode,
  mapVatCategory: () => mapVatCategory,
  resolveProfile: () => resolveProfile,
  toFacturXInput: () => toFacturXInput
});
module.exports = __toCommonJS(zugferd_exports);
var import_factur_x = require("@stackforge-eu/factur-x");
var import_invoice_model = require("./invoice-model");
function resolveProfile(profile) {
  if (profile === "BASIC") {
    return import_factur_x.Profile.BASIC;
  }
  if (profile === "EN16931") {
    return import_factur_x.Profile.EN16931;
  }
  throw new Error(`Profile not supported in v1 (need BASIC or EN16931): ${profile}`);
}
function mapUnitCode(unit) {
  const u = unit.trim().toLowerCase();
  if (u === "std" || u === "h" || u === "hour" || u === "std." || u === "stunden") {
    return import_factur_x.UnitCode.HOUR;
  }
  if (u === "kg" || u === "kilo" || u === "kilogramm") {
    return import_factur_x.UnitCode.KILOGRAM;
  }
  if (u === "l" || u === "ltr" || u === "liter") {
    return import_factur_x.UnitCode.LITRE;
  }
  if (u === "m" || u === "meter") {
    return import_factur_x.UnitCode.METRE;
  }
  if (u === "tag" || u === "tage" || u === "day") {
    return import_factur_x.UnitCode.DAY;
  }
  return import_factur_x.UnitCode.UNIT;
}
function mapVatCategory(vatRate) {
  if (vatRate === 0) {
    return import_factur_x.VatCategoryCode.EXEMPT;
  }
  return import_factur_x.VatCategoryCode.STANDARD_RATE;
}
function mapDocumentTypeCode(documentTitle) {
  const title = (documentTitle != null ? documentTitle : "").toLowerCase();
  if (title.includes("gutschrift") || title.includes("credit")) {
    return import_factur_x.DocumentTypeCode.CREDIT_NOTE;
  }
  if (title.includes("abschlag") || title.includes("zwischenrechnung")) {
    return import_factur_x.DocumentTypeCode.PARTIAL_INVOICE;
  }
  if (title.includes("schlussrechnung") || title.includes("final")) {
    return import_factur_x.DocumentTypeCode.FINAL_PAYMENT_REQUEST;
  }
  if (title.includes("korrektur")) {
    return import_factur_x.DocumentTypeCode.CORRECTED_INVOICE;
  }
  return import_factur_x.DocumentTypeCode.COMMERCIAL_INVOICE;
}
function toFacturXInput(invoice) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r, _s;
  if (!invoice.number) {
    throw new Error("Invoice has no number yet \u2014 issue it before generating XML");
  }
  const totals = (0, import_invoice_model.calcTotals)(invoice.lines);
  const sellerTax = [];
  if ((_a = invoice.seller.vatId) == null ? void 0 : _a.trim()) {
    sellerTax.push({ id: invoice.seller.vatId.trim(), schemeId: "VA" });
  }
  if ((_b = invoice.seller.taxNumber) == null ? void 0 : _b.trim()) {
    sellerTax.push({ id: invoice.seller.taxNumber.trim(), schemeId: "FC" });
  }
  return {
    document: {
      id: invoice.number,
      issueDate: invoice.issueDate,
      typeCode: mapDocumentTypeCode(invoice.documentTitle),
      dueDate: (_c = invoice.dueDate) != null ? _c : void 0,
      buyerReference: ((_d = invoice.buyer.customerNumber) == null ? void 0 : _d.trim()) || void 0,
      notes: ((_e = invoice.notes) == null ? void 0 : _e.trim()) ? [{ content: invoice.notes.trim() }] : void 0
    },
    seller: {
      name: invoice.seller.name,
      address: {
        line1: invoice.seller.street,
        city: invoice.seller.city,
        postalCode: invoice.seller.zip,
        country: invoice.seller.country || "DE"
      },
      taxRegistrations: sellerTax.length > 0 ? sellerTax : void 0,
      electronicAddress: ((_f = invoice.seller.email) == null ? void 0 : _f.trim()) ? { value: invoice.seller.email.trim(), schemeID: "EM" } : void 0,
      contact: ((_g = invoice.seller.email) == null ? void 0 : _g.trim()) || ((_h = invoice.seller.phone) == null ? void 0 : _h.trim()) ? {
        email: ((_i = invoice.seller.email) == null ? void 0 : _i.trim()) || void 0,
        phone: ((_j = invoice.seller.phone) == null ? void 0 : _j.trim()) || void 0
      } : void 0
    },
    buyer: {
      name: invoice.buyer.name,
      address: {
        line1: invoice.buyer.street,
        city: invoice.buyer.city,
        postalCode: invoice.buyer.zip,
        country: invoice.buyer.country || "DE"
      },
      electronicAddress: ((_k = invoice.buyer.email) == null ? void 0 : _k.trim()) ? { value: invoice.buyer.email.trim(), schemeID: "EM" } : void 0,
      contact: ((_l = invoice.buyer.email) == null ? void 0 : _l.trim()) || ((_m = invoice.buyer.phone) == null ? void 0 : _m.trim()) ? {
        email: ((_n = invoice.buyer.email) == null ? void 0 : _n.trim()) || void 0,
        phone: ((_o = invoice.buyer.phone) == null ? void 0 : _o.trim()) || void 0
      } : void 0
    },
    lines: invoice.lines.map((line, index) => {
      var _a2, _b2, _c2;
      const discount = (_a2 = line.discountPercent) != null ? _a2 : 0;
      const netUnit = (0, import_invoice_model.lineNetUnitPrice)(line);
      return {
        id: String(index + 1),
        name: line.description,
        description: ((_b2 = line.details) == null ? void 0 : _b2.trim()) || void 0,
        sellerAssignedId: ((_c2 = line.sku) == null ? void 0 : _c2.trim()) || void 0,
        quantity: line.quantity,
        unitCode: mapUnitCode(line.unit || "Stk"),
        unitPrice: netUnit,
        grossUnitPrice: discount > 0 ? line.unitPriceNet : void 0,
        priceDiscount: discount > 0 ? (0, import_invoice_model.roundCents)(line.unitPriceNet - netUnit) : void 0,
        vatCategoryCode: mapVatCategory(line.vatRate),
        vatRatePercent: line.vatRate
      };
    }),
    totals: {
      lineTotal: totals.netTotal,
      taxBasisTotal: totals.netTotal,
      taxTotal: totals.taxTotal,
      grandTotal: totals.grossTotal,
      duePayableAmount: totals.grossTotal,
      currency: "EUR"
    },
    vatBreakdown: totals.breakdown.map((entry) => {
      var _a2;
      return {
        categoryCode: entry.vatRate === 0 ? import_factur_x.VatCategoryCode.EXEMPT : import_factur_x.VatCategoryCode.STANDARD_RATE,
        ratePercent: entry.vatRate,
        taxableAmount: entry.net,
        taxAmount: entry.tax,
        exemptionReason: entry.vatRate === 0 ? (_a2 = invoice.lines.find((line) => {
          var _a3;
          return line.vatRate === 0 && ((_a3 = line.exemptionReason) == null ? void 0 : _a3.trim());
        })) == null ? void 0 : _a2.exemptionReason : void 0
      };
    }),
    payment: {
      meansCode: "58",
      iban: ((_p = invoice.seller.iban) == null ? void 0 : _p.trim()) || void 0,
      bic: ((_q = invoice.seller.bic) == null ? void 0 : _q.trim()) || void 0,
      paymentReference: invoice.number,
      dueDate: (_r = invoice.dueDate) != null ? _r : void 0,
      termsDescription: (_s = invoice.paymentTerms) != null ? _s : void 0
    },
    delivery: {
      // validated as a plain ISO date at issue time, no period support
      date: invoice.deliveryDate
    }
  };
}
async function generateInvoiceXml(invoice) {
  const profile = resolveProfile(invoice.profile);
  const input = toFacturXInput(invoice);
  const inputCheck = (0, import_factur_x.validateInput)(input, profile, import_factur_x.Flavor.ZUGFERD);
  if (!inputCheck.valid) {
    throw new Error(
      `Factur-X input invalid: ${inputCheck.errors.map((e) => `${e.field}: ${e.message}`).join(" | ")}`
    );
  }
  const xml = (0, import_factur_x.buildXml)(input, profile, import_factur_x.Flavor.ZUGFERD);
  const xsd = await (0, import_factur_x.validateXsd)(xml, profile);
  if (!xsd.valid) {
    throw new Error(`Factur-X XSD invalid: ${xsd.errors.map((e) => e.message).join(" | ")}`);
  }
  return { xml, profile };
}
async function embedHybridPdf(pdfBytes, xml, profileName, title) {
  const profile = resolveProfile(profileName);
  const result = await (0, import_factur_x.embedFacturX)({
    pdf: pdfBytes,
    xml,
    profile,
    flavor: import_factur_x.Flavor.ZUGFERD,
    validateBeforeEmbed: false,
    validateXsd: false,
    addPdfA3Metadata: true,
    unembeddedFonts: "warn",
    meta: { title, creator: "ioBroker.e-invoices" }
  });
  return result.pdf;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  embedHybridPdf,
  generateInvoiceXml,
  mapDocumentTypeCode,
  mapUnitCode,
  mapVatCategory,
  resolveProfile,
  toFacturXInput
});
//# sourceMappingURL=zugferd.js.map
