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
var open_items_exports = {};
__export(open_items_exports, {
  AGE_BUCKETS: () => AGE_BUCKETS,
  AGE_BUCKET_LABELS: () => AGE_BUCKET_LABELS,
  bucketOf: () => bucketOf,
  evaluateOpenItems: () => evaluateOpenItems,
  isOpenItem: () => isOpenItem
});
module.exports = __toCommonJS(open_items_exports);
var import_invoice_model = require("./invoice-model");
const AGE_BUCKETS = ["notDue", "d1to30", "d31to60", "d61to90", "over90"];
const AGE_BUCKET_LABELS = {
  notDue: "nicht f\xE4llig",
  d1to30: "1\u201330 Tage \xFCberf\xE4llig",
  d31to60: "31\u201360 Tage \xFCberf\xE4llig",
  d61to90: "61\u201390 Tage \xFCberf\xE4llig",
  over90: "\xFCber 90 Tage \xFCberf\xE4llig"
};
function cents(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
function bucketOf(overdueDays) {
  if (overdueDays <= 0) {
    return "notDue";
  }
  if (overdueDays <= 30) {
    return "d1to30";
  }
  if (overdueDays <= 60) {
    return "d31to60";
  }
  if (overdueDays <= 90) {
    return "d61to90";
  }
  return "over90";
}
function isOpenItem(invoice) {
  return invoice.status === "issued" && !invoice.paid && !(0, import_invoice_model.isQuote)(invoice.docType) && invoice.stornoOfId == null && invoice.documentTitle !== "Gutschrift";
}
function evaluateOpenItems(invoices, options = {}) {
  var _a, _b;
  const asOf = (_a = options.asOf) != null ? _a : (0, import_invoice_model.todayIso)();
  const onlyOverdue = options.onlyOverdue === true;
  const all = invoices.filter(isOpenItem).map((invoice) => {
    var _a2, _b2, _c, _d;
    const overdueDays = invoice.dueDate ? Math.max(0, (0, import_invoice_model.daysBetween)(invoice.dueDate, asOf)) : 0;
    return {
      id: invoice.id,
      number: (_a2 = invoice.number) != null ? _a2 : "",
      customer: invoice.buyer.name,
      customerNumber: (_b2 = invoice.buyer.customerNumber) != null ? _b2 : "",
      issueDate: invoice.issueDate,
      dueDate: (_c = invoice.dueDate) != null ? _c : "",
      amount: invoice.totals.grossTotal,
      overdueDays,
      bucket: bucketOf(overdueDays),
      skontoPercent: Number(invoice.skontoPercent) || 0,
      reminderLevel: (_d = invoice.reminderLevel) != null ? _d : 0,
      sent: Boolean(invoice.sentAt)
    };
  });
  const items = all.filter((item) => !onlyOverdue || item.overdueDays > 0).sort(
    (a, b) => b.overdueDays - a.overdueDays || a.dueDate.localeCompare(b.dueDate) || a.number.localeCompare(b.number)
  );
  const buckets = Object.fromEntries(AGE_BUCKETS.map((bucket) => [bucket, { count: 0, amount: 0 }]));
  const total = { count: 0, amount: 0 };
  const overdue = { count: 0, amount: 0 };
  const perCustomer = /* @__PURE__ */ new Map();
  for (const item of items) {
    buckets[item.bucket].count += 1;
    buckets[item.bucket].amount += item.amount;
    total.count += 1;
    total.amount += item.amount;
    if (item.overdueDays > 0) {
      overdue.count += 1;
      overdue.amount += item.amount;
    }
    const key = `${item.customerNumber}\0${item.customer}`;
    const entry = (_b = perCustomer.get(key)) != null ? _b : {
      customer: item.customer,
      customerNumber: item.customerNumber,
      count: 0,
      amount: 0
    };
    entry.count += 1;
    entry.amount += item.amount;
    perCustomer.set(key, entry);
  }
  for (const bucket of AGE_BUCKETS) {
    buckets[bucket].amount = cents(buckets[bucket].amount);
  }
  total.amount = cents(total.amount);
  overdue.amount = cents(overdue.amount);
  const customers = [...perCustomer.values()].map((entry) => ({ ...entry, amount: cents(entry.amount) })).sort((a, b) => b.amount - a.amount || a.customer.localeCompare(b.customer));
  return { asOf, onlyOverdue, items, buckets, total, overdue, customers };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AGE_BUCKETS,
  AGE_BUCKET_LABELS,
  bucketOf,
  evaluateOpenItems,
  isOpenItem
});
//# sourceMappingURL=open-items.js.map
