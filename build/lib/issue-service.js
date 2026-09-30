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
var issue_service_exports = {};
__export(issue_service_exports, {
  collectReminderCandidates: () => collectReminderCandidates,
  issueInvoiceBatch: () => issueInvoiceBatch,
  issueInvoiceWithArtifacts: () => issueInvoiceWithArtifacts,
  loadRenderTemplate: () => loadRenderTemplate,
  rerenderInvoicePdf: () => rerenderInvoicePdf
});
module.exports = __toCommonJS(issue_service_exports);
var import_excel = require("./excel");
var import_invoice_model = require("./invoice-model");
var import_pdf = require("./pdf");
var import_pdf_attachments = require("./pdf-attachments");
var import_templates = require("./templates");
var import_zugferd = require("./zugferd");
async function issueInvoiceWithArtifacts(db, log, invoiceId, storage) {
  var _a, _b;
  const current = db.getInvoice(invoiceId);
  if (!current) {
    throw new Error(`Invoice not found: ${invoiceId}`);
  }
  if (current.status !== "draft") {
    throw new Error("Only drafts can be issued");
  }
  const issued = db.issueDraft(invoiceId);
  log.info(`Invoice issued: ${issued.number} (${issued.id})`);
  const { template, templateId, logo } = await loadRenderTemplate(db, log, storage);
  const attachments = db.listAttachments(invoiceId);
  const { xml, attachmentDocuments } = await (0, import_zugferd.generateInvoiceXml)(issued, attachments);
  const sight = await (0, import_pdf.renderInvoicePdf)(issued, template, logo, {
    stornoOfNumber: issued.stornoOfId ? (_b = (_a = db.getInvoice(issued.stornoOfId)) == null ? void 0 : _a.number) != null ? _b : null : null,
    attachments
  });
  const hybrid = await (0, import_zugferd.embedHybridPdf)(
    await (0, import_pdf_attachments.embedPdfAttachments)(sight, attachments),
    xml,
    issued.profile,
    `${issued.documentTitle} ${issued.number}`
  );
  const xlsx = await (0, import_excel.renderInvoiceWorkbook)(issued);
  const base = `invoices/${issued.issueDate.slice(0, 4)}/${issued.number}`;
  if (attachments.length > 0) {
    log.info(
      `Attachments: ${attachments.length} embedded in the PDF, ${attachmentDocuments} written into the XML (BG-24)`
    );
  }
  const written = /* @__PURE__ */ new Set();
  try {
    await storage.write(`${base}.xml`, xml);
    written.add(`${base}.xml`);
    log.info(`XML stored: ${base}.xml`);
  } catch (error) {
    log.error(`Cannot write XML file ${base}.xml: ${error.message}`);
  }
  try {
    await storage.write(`${base}.pdf`, Buffer.from(hybrid));
    written.add(`${base}.pdf`);
    log.info(`Hybrid PDF stored: ${base}.pdf`);
  } catch (error) {
    log.error(`Cannot write PDF file ${base}.pdf: ${error.message}`);
  }
  try {
    await storage.write(`${base}.xlsx`, xlsx);
    written.add(`${base}.xlsx`);
    log.info(`Excel copy stored: ${base}.xlsx`);
  } catch (error) {
    log.error(`Cannot write Excel file ${base}.xlsx: ${error.message}`);
  }
  if (written.size === 0) {
    throw new Error(
      `Invoice ${issued.number} was numbered but no artifact could be stored (${base}.*) \u2014 check the adapter write permissions`
    );
  }
  const withArtifacts = db.attachIssueArtifacts(issued.id, {
    xml,
    pdfPath: written.has(`${base}.pdf`) ? `${base}.pdf` : null,
    xlsxPath: written.has(`${base}.xlsx`) ? `${base}.xlsx` : void 0,
    templateId
  });
  return { invoice: withArtifacts, pdfPath: `${base}.pdf`, xmlPath: `${base}.xml` };
}
async function issueInvoiceBatch(db, log, invoiceIds, storage) {
  const issued = [];
  const failed = [];
  for (const id of invoiceIds) {
    try {
      const outcome = await issueInvoiceWithArtifacts(db, log, id, storage);
      issued.push(outcome.invoice);
    } catch (error) {
      failed.push({ id, error: error.message });
      log.error(`Batch issue failed for ${id}: ${error.message}`);
    }
  }
  return { issued, failed };
}
const REMINDER_GRACE_DAYS = 5;
function collectReminderCandidates(db, today = (0, import_invoice_model.todayIso)()) {
  var _a, _b;
  const out = [];
  for (const invoice of db.allInvoices()) {
    if (invoice.status !== "issued" || invoice.paid || !invoice.dueDate) {
      continue;
    }
    if (db.listInvoices({ status: "cancelled" }).some((c) => c.stornoOfId === invoice.id)) {
      continue;
    }
    const overdueDays = (0, import_invoice_model.daysBetween)(invoice.dueDate, today);
    if (overdueDays < REMINDER_GRACE_DAYS) {
      continue;
    }
    if (((_a = invoice.remindedAt) == null ? void 0 : _a.slice(0, 10)) === today) {
      continue;
    }
    const skontoActive = ((_b = invoice.skontoPercent) != null ? _b : 0) > 0 && !!invoice.skontoDueDate && invoice.skontoDueDate >= today;
    out.push({
      invoice,
      overdueDays,
      level: invoice.reminderLevel,
      skontoActive
    });
  }
  return out.sort((a, b) => b.overdueDays - a.overdueDays);
}
async function rerenderInvoicePdf(db, log, invoiceId, storage, reason) {
  var _a, _b, _c;
  const invoice = db.getInvoice(invoiceId);
  if (!invoice) {
    throw new Error(`Invoice not found: ${invoiceId}`);
  }
  if (invoice.status === "draft") {
    throw new Error("Only issued invoices can be re-rendered. Issue the draft first.");
  }
  if (!invoice.number) {
    throw new Error("Invoice has no number yet - issue it before re-rendering");
  }
  const { template, templateId, logo } = await loadRenderTemplate(db, log, storage);
  const attachments = db.listAttachments(invoiceId);
  const { xml, attachmentDocuments } = await (0, import_zugferd.generateInvoiceXml)(invoice, attachments);
  const sight = await (0, import_pdf.renderInvoicePdf)(invoice, template, logo, {
    stornoOfNumber: invoice.stornoOfId ? (_b = (_a = db.getInvoice(invoice.stornoOfId)) == null ? void 0 : _a.number) != null ? _b : null : null,
    attachments
  });
  const hybrid = await (0, import_zugferd.embedHybridPdf)(
    await (0, import_pdf_attachments.embedPdfAttachments)(sight, attachments),
    xml,
    invoice.profile,
    `${invoice.documentTitle} ${invoice.number}`
  );
  if (attachments.length > 0) {
    log.info(
      `Attachments re-embedded: ${attachments.length} in the PDF, ${attachmentDocuments} in the XML (BG-24)`
    );
  }
  const base = `invoices/${invoice.issueDate.slice(0, 4)}/${invoice.number}`;
  const newPath = `${base}.pdf`;
  let archivedPath = null;
  if (invoice.pdfPath) {
    archivedPath = `${base}.orig-1.pdf`;
    try {
      const original = await storage.read(invoice.pdfPath);
      await storage.write(archivedPath, original);
      log.info(`Original PDF archived: ${archivedPath}`);
    } catch (error) {
      log.error(`Cannot archive ${invoice.pdfPath}: ${error.message}`);
      archivedPath = null;
    }
  }
  await storage.write(newPath, Buffer.from(hybrid));
  log.info(`PDF re-rendered: ${newPath} (${invoice.number})`);
  const updated = db.attachIssueArtifacts(invoiceId, {
    xml,
    pdfPath: newPath,
    xlsxPath: (_c = invoice.xlsxPath) != null ? _c : void 0,
    templateId: templateId != null ? templateId : invoice.templateId
  });
  db.logRender(invoiceId, "pdf", archivedPath, newPath, reason);
  return { invoice: updated, pdfPath: newPath, archivedPath };
}
async function loadRenderTemplate(db, log, storage) {
  var _a;
  let template = import_templates.DEFAULT_TEMPLATE;
  let templateId = null;
  try {
    const stored = db.getDefaultTemplate();
    if (stored) {
      template = stored.definition;
      templateId = stored.id;
    }
  } catch (error) {
    log.error(`Cannot load default template, using Standard: ${error.message}`);
  }
  let logo;
  if ((_a = template.logo) == null ? void 0 : _a.path) {
    try {
      logo = { data: await storage.read(template.logo.path) };
    } catch (error) {
      log.error(`Cannot read logo ${template.logo.path}, rendering without: ${error.message}`);
    }
  }
  return { template, templateId, logo };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  collectReminderCandidates,
  issueInvoiceBatch,
  issueInvoiceWithArtifacts,
  loadRenderTemplate,
  rerenderInvoicePdf
});
//# sourceMappingURL=issue-service.js.map
