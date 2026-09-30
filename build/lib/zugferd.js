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
  applyBillingPeriod: () => applyBillingPeriod,
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
var import_fonts = require("./fonts");
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
function mapVatCategory(vatRate, exemptionCategory) {
  if (vatRate !== 0) {
    return import_factur_x.VatCategoryCode.STANDARD_RATE;
  }
  switch (exemptionCategory) {
    case "AE":
      return import_factur_x.VatCategoryCode.REVERSE_CHARGE;
    case "K":
      return import_factur_x.VatCategoryCode.INTRA_COMMUNITY_SUPPLY;
    case "G":
      return import_factur_x.VatCategoryCode.FREE_EXPORT;
    case "O":
      return import_factur_x.VatCategoryCode.OUTSIDE_SCOPE;
    default:
      return import_factur_x.VatCategoryCode.EXEMPT;
  }
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
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r, _s, _t, _u, _v, _w;
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
  const skonto = (0, import_invoice_model.calcSkonto)(
    totals.grossTotal,
    invoice.skontoPercent,
    (_c = invoice.skontoDueDate) != null ? _c : void 0,
    (_d = invoice.dueDate) != null ? _d : void 0
  );
  const notes = [];
  if ((_e = invoice.notes) == null ? void 0 : _e.trim()) {
    notes.push({ content: invoice.notes.trim() });
  }
  if (skonto.percent > 0 && !invoice.paid) {
    notes.push({
      subjectCode: "AAK",
      content: `${skonto.percent} % Skonto bei Zahlung bis ${(0, import_invoice_model.formatDeliveryDateDe)((_f = skonto.dueDate) != null ? _f : "")} = ${skonto.amount.toFixed(2)} EUR; Zahlbetrag dann ${skonto.payableNow.toFixed(2)} EUR.`
    });
  }
  return {
    document: {
      id: invoice.number,
      issueDate: invoice.issueDate,
      typeCode: mapDocumentTypeCode(invoice.documentTitle),
      dueDate: (_g = invoice.dueDate) != null ? _g : void 0,
      buyerReference: ((_h = invoice.buyer.customerNumber) == null ? void 0 : _h.trim()) || void 0,
      notes: notes.length > 0 ? notes : void 0
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
      electronicAddress: ((_i = invoice.seller.email) == null ? void 0 : _i.trim()) ? { value: invoice.seller.email.trim(), schemeID: "EM" } : void 0,
      contact: ((_j = invoice.seller.email) == null ? void 0 : _j.trim()) || ((_k = invoice.seller.phone) == null ? void 0 : _k.trim()) ? {
        email: ((_l = invoice.seller.email) == null ? void 0 : _l.trim()) || void 0,
        phone: ((_m = invoice.seller.phone) == null ? void 0 : _m.trim()) || void 0
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
      electronicAddress: ((_n = invoice.buyer.email) == null ? void 0 : _n.trim()) ? { value: invoice.buyer.email.trim(), schemeID: "EM" } : void 0,
      contact: ((_o = invoice.buyer.email) == null ? void 0 : _o.trim()) || ((_p = invoice.buyer.phone) == null ? void 0 : _p.trim()) ? {
        email: ((_q = invoice.buyer.email) == null ? void 0 : _q.trim()) || void 0,
        phone: ((_r = invoice.buyer.phone) == null ? void 0 : _r.trim()) || void 0
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
        vatCategoryCode: mapVatCategory(line.vatRate, line.exemptionCategory),
        vatRatePercent: line.vatRate
      };
    }),
    totals: {
      lineTotal: totals.netTotal,
      taxBasisTotal: totals.netTotal,
      taxTotal: totals.taxTotal,
      grandTotal: totals.grossTotal,
      // BT-9 may only deviate from the grand total through a prepayment
      // (BR-CO-16). A cash discount is conditional, not a prepayment, so
      // it travels as a note and BT-9 stays at the gross total. A paid
      // invoice is fully prepaid instead.
      prepaidAmount: invoice.paid ? totals.grossTotal : void 0,
      duePayableAmount: invoice.paid ? 0 : totals.grossTotal,
      currency: "EUR"
    },
    vatBreakdown: totals.breakdown.map((entry) => {
      const zeroLines = entry.vatRate === 0 ? invoice.lines.filter((line) => line.vatRate === 0) : [];
      const categories = new Set(zeroLines.map((line) => {
        var _a2;
        return (_a2 = line.exemptionCategory) != null ? _a2 : "E";
      }));
      const reasons = [...new Set(zeroLines.map((line) => {
        var _a2;
        return (_a2 = line.exemptionReason) == null ? void 0 : _a2.trim();
      }).filter(Boolean))];
      if (categories.size > 1 || reasons.length > 1) {
        throw new Error(
          `0% lines use different exemption categories (${[...categories].join("/")}) or reasons \u2014 split them into separate invoices or make them identical`
        );
      }
      return {
        categoryCode: mapVatCategory(entry.vatRate, [...categories][0]),
        ratePercent: entry.vatRate,
        taxableAmount: entry.net,
        taxAmount: entry.tax,
        exemptionReason: entry.vatRate === 0 ? reasons[0] : void 0
      };
    }),
    payment: {
      meansCode: "58",
      iban: ((_s = invoice.seller.iban) == null ? void 0 : _s.trim()) || void 0,
      bic: ((_t = invoice.seller.bic) == null ? void 0 : _t.trim()) || void 0,
      paymentReference: invoice.number,
      dueDate: (_u = invoice.dueDate) != null ? _u : void 0,
      termsDescription: (_v = invoice.paymentTerms) != null ? _v : void 0
    },
    delivery: {
      // validated at issue time; for a period only BT-72 goes through the
      // library, BT-74 is added by applyDeliveryPeriodEnd()
      date: (_w = (0, import_invoice_model.parseDeliveryPeriod)(invoice.deliveryDate)) == null ? void 0 : _w.start
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
  const withPeriod = applyBillingPeriod(xml, (0, import_invoice_model.parseDeliveryPeriod)(invoice.deliveryDate));
  const xsd = await (0, import_factur_x.validateXsd)(withPeriod, profile);
  if (!xsd.valid) {
    throw new Error(`Factur-X XSD invalid: ${xsd.errors.map((e) => e.message).join(" | ")}`);
  }
  return { xml: withPeriod, profile };
}
function applyBillingPeriod(xml, period) {
  if (!(period == null ? void 0 : period.end)) {
    return xml;
  }
  const day = (iso) => `<udt:DateTimeString format="102">${iso.replace(/-/g, "")}</udt:DateTimeString>`;
  const node = `<ram:BillingSpecifiedPeriod><ram:StartDateTime>${day(period.start)}</ram:StartDateTime><ram:EndDateTime>${day(period.end)}</ram:EndDateTime></ram:BillingSpecifiedPeriod>`;
  const anchor = "<ram:SpecifiedTradeSettlementHeaderMonetarySummation>";
  const at = xml.indexOf(anchor);
  if (at < 0) {
    throw new Error("Cannot place the billing period: settlement summation not found");
  }
  const taxEnd = xml.lastIndexOf("</ram:ApplicableTradeTax>", at);
  const insertAt = taxEnd > 0 ? taxEnd + "</ram:ApplicableTradeTax>".length : at;
  return `${xml.slice(0, insertAt)}${node}${xml.slice(insertAt)}`;
}
async function embedHybridPdf(pdfBytes, xml, profileName, title) {
  const profile = resolveProfile(profileName);
  const iccProfile = (0, import_fonts.loadIccProfile)();
  if (!iccProfile) {
    console.warn(
      "[e-invoices] sRGB profile for /OutputIntents not found in the installed pdfkit \u2014 the hybrid PDF gets no output intent and is therefore not PDF/A-3b conformant. Reinstall dependencies so pdfkit ships data/sRGB_IEC61966_2_1.icc again."
    );
  }
  const result = await (0, import_factur_x.embedFacturX)({
    pdf: pdfBytes,
    xml,
    profile,
    flavor: import_factur_x.Flavor.ZUGFERD,
    validateBeforeEmbed: false,
    validateXsd: false,
    addPdfA3Metadata: true,
    rgbIccProfile: iccProfile,
    unembeddedFonts: "warn",
    meta: { title, creator: "ioBroker.e-invoices" }
  });
  return result.pdf;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  applyBillingPeriod,
  embedHybridPdf,
  generateInvoiceXml,
  mapDocumentTypeCode,
  mapUnitCode,
  mapVatCategory,
  resolveProfile,
  toFacturXInput
});
//# sourceMappingURL=zugferd.js.map
