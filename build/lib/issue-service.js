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
  issueInvoiceWithArtifacts: () => issueInvoiceWithArtifacts,
  loadRenderTemplate: () => loadRenderTemplate
});
module.exports = __toCommonJS(issue_service_exports);
var import_excel = require("./excel");
var import_pdf = require("./pdf");
var import_templates = require("./templates");
var import_zugferd = require("./zugferd");
async function issueInvoiceWithArtifacts(db, log, invoiceId, storage) {
  const current = db.getInvoice(invoiceId);
  if (!current) {
    throw new Error(`Invoice not found: ${invoiceId}`);
  }
  if (current.status !== "draft") {
    throw new Error("Only drafts can be issued");
  }
  const year = Number(current.issueDate.slice(0, 4));
  if (!Number.isInteger(year)) {
    throw new Error(`Invalid issue year in ${current.issueDate}`);
  }
  const issued = db.issueDraft(invoiceId, year);
  log.info(`Invoice issued: ${issued.number} (${issued.id})`);
  const { template, templateId, logo } = await loadRenderTemplate(db, log, storage);
  const { xml } = await (0, import_zugferd.generateInvoiceXml)(issued);
  const sight = await (0, import_pdf.renderInvoicePdf)(issued, template, logo);
  const hybrid = await (0, import_zugferd.embedHybridPdf)(sight, xml, issued.profile, `${issued.documentTitle} ${issued.number}`);
  const xlsx = await (0, import_excel.renderInvoiceWorkbook)(issued);
  const base = `invoices/${issued.issueDate.slice(0, 4)}/${issued.number}`;
  try {
    await storage.write(`${base}.xml`, xml);
    log.info(`XML stored: ${base}.xml`);
  } catch (error) {
    log.error(`Cannot write XML file ${base}.xml: ${error.message}`);
  }
  try {
    await storage.write(`${base}.pdf`, Buffer.from(hybrid));
    log.info(`Hybrid PDF stored: ${base}.pdf`);
  } catch (error) {
    log.error(`Cannot write PDF file ${base}.pdf: ${error.message}`);
  }
  try {
    await storage.write(`${base}.xlsx`, xlsx);
    log.info(`Excel copy stored: ${base}.xlsx`);
  } catch (error) {
    log.error(`Cannot write Excel file ${base}.xlsx: ${error.message}`);
  }
  const withArtifacts = db.attachIssueArtifacts(issued.id, {
    xml,
    pdfPath: `${base}.pdf`,
    xlsxPath: `${base}.xlsx`,
    templateId
  });
  return { invoice: withArtifacts, pdfPath: `${base}.pdf`, xmlPath: `${base}.xml` };
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
  issueInvoiceWithArtifacts,
  loadRenderTemplate
});
//# sourceMappingURL=issue-service.js.map
