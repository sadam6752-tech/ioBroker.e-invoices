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
var preview_samples_exports = {};
__export(preview_samples_exports, {
  PREVIEW_SAMPLES: () => PREVIEW_SAMPLES,
  isPreviewSample: () => isPreviewSample,
  previewSampleDraft: () => previewSampleDraft
});
module.exports = __toCommonJS(preview_samples_exports);
const PREVIEW_SAMPLES = ["full", "small", "credit"];
function isPreviewSample(value) {
  return typeof value === "string" && PREVIEW_SAMPLES.includes(value);
}
function previewSampleDraft(sample, seller) {
  const buyer = {
    name: "Kunde AG",
    street: "Kundenweg 5",
    zip: "80331",
    city: "M\xFCnchen",
    country: "DE",
    customerNumber: "K-42"
  };
  const base = {
    seller,
    buyer,
    issueDate: "2026-09-28",
    deliveryDate: "2026-09-27",
    dueDate: "2026-10-12",
    currency: "EUR"
  };
  if (sample === "small") {
    return {
      ...base,
      lines: [
        {
          description: "Beratung",
          quantity: 3,
          unit: "Std",
          unitPriceNet: 45,
          vatRate: 0,
          exemptionReason: "Gem\xE4\xDF \xA7 19 UStG wird keine Umsatzsteuer berechnet."
        }
      ],
      documentTitle: "Rechnung",
      notes: "Dies ist eine Layout-Vorschau (Kleinunternehmer).",
      paymentTerms: "Zahlbar innerhalb von 14 Tagen ohne Abzug."
    };
  }
  if (sample === "credit") {
    return {
      ...base,
      lines: [{ description: "Beratung", quantity: 2, unit: "Std", unitPriceNet: 100, vatRate: 19 }],
      documentTitle: "Gutschrift",
      notes: "Storno zu Rechnung 2026-00-001 \u2013 Dies ist eine Layout-Vorschau."
    };
  }
  return {
    ...base,
    lines: [
      { description: "Beratung", quantity: 2, unit: "Std", unitPriceNet: 100, vatRate: 19 },
      { description: "Anfahrt", quantity: 1, unit: "Stk", unitPriceNet: 50, vatRate: 19 },
      { description: "Fachbuch", quantity: 2, unit: "Stk", unitPriceNet: 24.9, vatRate: 7, discountPercent: 10 }
    ],
    documentTitle: "Rechnung",
    notes: "Dies ist eine Layout-Vorschau.",
    paymentTerms: "Zahlbar innerhalb von 14 Tagen ohne Abzug.",
    skontoPercent: 2,
    skontoDueDate: "2026-10-05"
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  PREVIEW_SAMPLES,
  isPreviewSample,
  previewSampleDraft
});
//# sourceMappingURL=preview-samples.js.map
