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
var revenue_report_exports = {};
__export(revenue_report_exports, {
  NO_COMPANY_LABEL: () => NO_COMPANY_LABEL,
  countsAsRevenue: () => countsAsRevenue,
  evaluateRevenueByCompany: () => evaluateRevenueByCompany
});
module.exports = __toCommonJS(revenue_report_exports);
var import_invoice_model = require("./invoice-model");
const NO_COMPANY_LABEL = "ohne Firmenzuordnung";
function cents(value) {
  return Math.round(value * 100) / 100;
}
function countsAsRevenue(invoice) {
  return !(0, import_invoice_model.isQuote)(invoice.docType) && invoice.status === "issued" && invoice.stornoOfId == null && invoice.documentTitle !== "Gutschrift";
}
function evaluateRevenueByCompany(invoices, names, year) {
  var _a;
  const groups = /* @__PURE__ */ new Map();
  for (const invoice of invoices) {
    if (!countsAsRevenue(invoice)) {
      continue;
    }
    if (year !== void 0 && invoice.issueDate.slice(0, 4) !== String(year)) {
      continue;
    }
    const key = (_a = invoice.companyId) != null ? _a : "";
    let group = groups.get(key);
    if (!group) {
      group = { companyId: invoice.companyId, company: "", count: 0, net: 0, tax: 0, gross: 0, latest: "" };
      groups.set(key, group);
    }
    group.count += 1;
    group.net += invoice.totals.netTotal;
    group.tax += invoice.totals.taxTotal;
    group.gross += invoice.totals.grossTotal;
    if (invoice.issueDate >= group.latest) {
      group.latest = invoice.issueDate;
      group.company = invoice.seller.name;
    }
  }
  const rows = [...groups.values()].map((group) => {
    var _a2;
    return {
      companyId: group.companyId,
      company: group.companyId == null ? NO_COMPANY_LABEL : (_a2 = names.get(group.companyId)) != null ? _a2 : group.company || group.companyId,
      count: group.count,
      net: cents(group.net),
      tax: cents(group.tax),
      gross: cents(group.gross)
    };
  });
  rows.sort((a, b) => {
    if (a.companyId == null !== (b.companyId == null)) {
      return a.companyId == null ? 1 : -1;
    }
    return b.gross - a.gross || a.company.localeCompare(b.company, "de");
  });
  const total = { count: 0, net: 0, tax: 0, gross: 0 };
  for (const row of rows) {
    total.count += row.count;
    total.net += row.net;
    total.tax += row.tax;
    total.gross += row.gross;
  }
  return {
    year: year != null ? year : null,
    rows,
    total: { count: total.count, net: cents(total.net), tax: cents(total.tax), gross: cents(total.gross) }
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  NO_COMPANY_LABEL,
  countsAsRevenue,
  evaluateRevenueByCompany
});
//# sourceMappingURL=revenue-report.js.map
