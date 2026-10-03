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
  freezeTemplate: () => freezeTemplate,
  issueInvoiceBatch: () => issueInvoiceBatch,
  issueInvoiceWithArtifacts: () => issueInvoiceWithArtifacts,
  loadRenderTemplate: () => loadRenderTemplate,
  rerenderInvoicePdf: () => rerenderInvoicePdf
});
module.exports = __toCommonJS(issue_service_exports);
var import_node_crypto = require("node:crypto");
var import_excel = require("./excel");
var import_invoice_model = require("./invoice-model");
var import_pdf = require("./pdf");
var import_pdf_attachments = require("./pdf-attachments");
var import_templates = require("./templates");
var import_zugferd = require("./zugferd");
function quoteDecisionNote(invoice) {
  var _a;
  if (!(0, import_invoice_model.isQuote)(invoice.docType)) {
    return null;
  }
  const state = (0, import_invoice_model.quoteState)(invoice);
  if (state === "accepted" && invoice.acceptedAt) {
    return `Das Angebot wurde am ${(0, import_pdf.formatDeDate)(invoice.acceptedAt.slice(0, 10))} angenommen.`;
  }
  if (state === "rejected") {
    const when = invoice.rejectedAt ? ` am ${(0, import_pdf.formatDeDate)(invoice.rejectedAt.slice(0, 10))}` : "";
    const why = ((_a = invoice.rejectionReason) == null ? void 0 : _a.trim()) ? ` (${invoice.rejectionReason.trim()})` : "";
    return `Das Angebot wurde${when} abgelehnt${why}.`;
  }
  if (state === "expired" && invoice.validUntil) {
    return `Das Angebot ist am ${(0, import_pdf.formatDeDate)(invoice.validUntil)} verfallen.`;
  }
  return null;
}
function buildRenderContext(db, invoice, attachments) {
  var _a, _b, _c;
  const source = invoice.sourceDocumentId ? db.getInvoice(invoice.sourceDocumentId) : null;
  return {
    stornoOfNumber: invoice.stornoOfId ? (_b = (_a = db.getInvoice(invoice.stornoOfId)) == null ? void 0 : _a.number) != null ? _b : null : null,
    attachments,
    sourceDocumentNumber: (_c = source == null ? void 0 : source.number) != null ? _c : null,
    relatedNumbers: (0, import_invoice_model.isQuote)(invoice.docType) ? db.listInvoices({ sourceDocumentId: invoice.id, limit: 50 }).map((child) => {
      var _a2;
      return (_a2 = child.number) != null ? _a2 : "";
    }) : [],
    decisionNote: quoteDecisionNote(invoice)
  };
}
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
  const quote = (0, import_invoice_model.isQuote)(issued.docType);
  log.info(`${quote ? "Quotation" : "Invoice"} issued: ${issued.number} (${issued.id})`);
  const loaded = await loadRenderTemplate(db, log, storage);
  const { template, templateId, logo } = loaded;
  const templateSnapshot = await freezeTemplate(storage, log, loaded);
  const attachments = db.listAttachments(invoiceId);
  const generated = quote ? null : await (0, import_zugferd.generateInvoiceXml)(issued, attachments);
  const xml = (_a = generated == null ? void 0 : generated.xml) != null ? _a : null;
  const attachmentDocuments = (_b = generated == null ? void 0 : generated.attachmentDocuments) != null ? _b : 0;
  const sight = await (0, import_pdf.renderInvoicePdf)(issued, template, logo, buildRenderContext(db, issued, attachments));
  const hybrid = xml ? await (0, import_zugferd.embedHybridPdf)(
    await (0, import_pdf_attachments.embedPdfAttachments)(sight, attachments),
    xml,
    issued.profile,
    `${issued.documentTitle} ${issued.number}`
  ) : sight;
  const xlsx = await (0, import_excel.renderInvoiceWorkbook)(issued);
  const base = `invoices/${issued.issueDate.slice(0, 4)}/${issued.number}`;
  if (attachments.length > 0) {
    log.info(
      quote ? `Attachments: ${attachments.length} listed in the quotation PDF (not embedded, R8)` : `Attachments: ${attachments.length} embedded in the PDF, ${attachmentDocuments} written into the XML (BG-24)`
    );
  }
  const written = /* @__PURE__ */ new Set();
  if (xml) {
    try {
      await storage.write(`${base}.xml`, xml);
      written.add(`${base}.xml`);
      log.info(`XML stored: ${base}.xml`);
    } catch (error) {
      log.error(`Cannot write XML file ${base}.xml: ${error.message}`);
    }
  }
  try {
    await storage.write(`${base}.pdf`, Buffer.from(hybrid));
    written.add(`${base}.pdf`);
    log.info(`${quote ? "PDF" : "Hybrid PDF"} stored: ${base}.pdf`);
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
    xml: xml != null ? xml : void 0,
    pdfPath: written.has(`${base}.pdf`) ? `${base}.pdf` : null,
    xlsxPath: written.has(`${base}.xlsx`) ? `${base}.xlsx` : void 0,
    templateId,
    templateSnapshot
  });
  return {
    invoice: withArtifacts,
    pdfPath: `${base}.pdf`,
    xmlPath: written.has(`${base}.xml`) ? `${base}.xml` : null
  };
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
    if ((0, import_invoice_model.isQuote)(invoice.docType)) {
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
async function nextArchivePath(storage, base, start) {
  for (let n = Math.max(1, start); n < start + 1e3; n++) {
    const candidate = `${base}.orig-${n}.pdf`;
    try {
      await storage.read(candidate);
    } catch {
      return candidate;
    }
  }
  throw new Error(`No free archive slot for ${base}`);
}
async function rerenderInvoicePdf(db, log, invoiceId, storage, reason, options = {}) {
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
  const wanted = (_a = options.layout) != null ? _a : "current";
  if (wanted !== "issued" && wanted !== "current") {
    throw new Error(`Unknown layout: ${String(wanted)}`);
  }
  let template;
  let templateId;
  let logo;
  let newSnapshot;
  let layout;
  if (wanted === "issued") {
    const frozen = invoice.templateSnapshot;
    if (!frozen) {
      throw new Error(
        "This document has no frozen layout (issued before R7.8) - re-render with the current layout"
      );
    }
    template = frozen.definition;
    templateId = frozen.templateId;
    if ((_b = template.logo) == null ? void 0 : _b.path) {
      try {
        logo = { data: await storage.read(template.logo.path) };
      } catch (error) {
        log.error(
          `Cannot read frozen logo ${template.logo.path}, rendering without: ${error.message}`
        );
      }
    }
    layout = "issued";
  } else {
    const loaded = await loadRenderTemplate(db, log, storage);
    ({ template, templateId, logo } = loaded);
    newSnapshot = await freezeTemplate(storage, log, loaded);
    layout = invoice.templateSnapshot ? "current" : "current-unfrozen";
  }
  const attachments = db.listAttachments(invoiceId);
  const quote = (0, import_invoice_model.isQuote)(invoice.docType);
  let xml = null;
  let xmlRegenerated = false;
  if (!quote) {
    if (invoice.xml) {
      xml = invoice.xml;
    } else {
      const generated = await (0, import_zugferd.generateInvoiceXml)(invoice, attachments);
      xml = generated.xml;
      xmlRegenerated = true;
    }
  }
  const sight = await (0, import_pdf.renderInvoicePdf)(invoice, template, logo, buildRenderContext(db, invoice, attachments));
  const hybrid = xml ? await (0, import_zugferd.embedHybridPdf)(
    await (0, import_pdf_attachments.embedPdfAttachments)(sight, attachments),
    xml,
    invoice.profile,
    `${invoice.documentTitle} ${invoice.number}`
  ) : sight;
  if (attachments.length > 0) {
    log.info(
      quote ? `Attachments re-listed: ${attachments.length} in the quotation PDF (R8)` : `Attachments re-embedded: ${attachments.length} in the PDF, XML (BG-24) kept as issued`
    );
  }
  const base = `invoices/${invoice.issueDate.slice(0, 4)}/${invoice.number}`;
  const newPath = `${base}.pdf`;
  let archivedPath = null;
  if (invoice.pdfPath) {
    archivedPath = await nextArchivePath(storage, base, db.listRenderHistory(invoiceId).length + 1);
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
  if (xmlRegenerated && xml) {
    await storage.write(`${base}.xml`, xml);
    log.info(`XML was missing and has been created: ${base}.xml`);
  }
  const updated = db.attachIssueArtifacts(invoiceId, {
    xml: xml != null ? xml : void 0,
    pdfPath: newPath,
    xlsxPath: (_c = invoice.xlsxPath) != null ? _c : void 0,
    templateId: templateId != null ? templateId : invoice.templateId,
    templateSnapshot: newSnapshot
  });
  db.logRender(invoiceId, "pdf", archivedPath, newPath, reason, layout);
  return { invoice: updated, pdfPath: newPath, archivedPath, layout };
}
async function loadRenderTemplate(db, log, storage) {
  var _a;
  let template = import_templates.DEFAULT_TEMPLATE;
  let templateId = null;
  let templateName = import_templates.DEFAULT_TEMPLATE.name;
  let templateVersion = null;
  try {
    const stored = db.getDefaultTemplate();
    if (stored) {
      template = stored.definition;
      templateId = stored.id;
      templateName = stored.name;
      templateVersion = stored.version;
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
  return { template, templateId, templateName, templateVersion, logo };
}
async function freezeTemplate(storage, log, loaded) {
  var _a, _b, _c, _d;
  const definition = JSON.parse(JSON.stringify(loaded.template));
  if ((_a = definition.logo) == null ? void 0 : _a.path) {
    if (loaded.logo) {
      const ext = (_d = (_c = (_b = /\.(png|jpe?g)$/i.exec(definition.logo.path)) == null ? void 0 : _b[1]) == null ? void 0 : _c.toLowerCase().replace("jpeg", "jpg")) != null ? _d : "png";
      const frozenPath = `logos/frozen/${(0, import_node_crypto.createHash)("sha256").update(loaded.logo.data).digest("hex")}.${ext}`;
      try {
        let exists = false;
        try {
          exists = (await storage.read(frozenPath)).equals(loaded.logo.data);
        } catch {
        }
        if (!exists) {
          await storage.write(frozenPath, loaded.logo.data);
        }
        definition.logo.path = frozenPath;
      } catch (error) {
        log.error(`Cannot freeze logo, snapshot without logo: ${error.message}`);
        delete definition.logo;
      }
    } else {
      delete definition.logo;
    }
  }
  return {
    templateId: loaded.templateId,
    templateName: loaded.templateName,
    templateVersion: loaded.templateVersion,
    definition,
    frozenAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  collectReminderCandidates,
  freezeTemplate,
  issueInvoiceBatch,
  issueInvoiceWithArtifacts,
  loadRenderTemplate,
  rerenderInvoicePdf
});
//# sourceMappingURL=issue-service.js.map
