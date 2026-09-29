"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var api_server_exports = {};
__export(api_server_exports, {
  attachStatic: () => attachStatic,
  createApiServer: () => createApiServer,
  previewInvoice: () => previewInvoice,
  routeParam: () => routeParam,
  storedToDraft: () => storedToDraft
});
module.exports = __toCommonJS(api_server_exports);
var import_express = __toESM(require("express"));
var import_node_fs = require("node:fs");
var import_invoice_model = require("./invoice-model");
var import_issue_service = require("./issue-service");
var import_backup = require("./backup");
var import_csv = require("./csv");
var import_excel = require("./excel");
var import_invoice_model2 = require("./invoice-model");
var import_pdf = require("./pdf");
var import_templates = require("./templates");
var import_validation = require("./validation");
var import_zugferd = require("./zugferd");
function filteredInvoices(db, query) {
  const status = typeof query.status === "string" ? query.status : void 0;
  const year = typeof query.year === "string" ? Number(query.year) : void 0;
  const text = typeof query.q === "string" ? query.q : void 0;
  return db.listInvoices({
    status: status && ["draft", "issued", "cancelled"].includes(status) ? status : void 0,
    year: Number.isInteger(year) ? year : void 0,
    query: text,
    limit: 500
  });
}
function previewInvoice(draft) {
  var _a, _b, _c, _d, _e, _f;
  const stamp = (/* @__PURE__ */ new Date()).toISOString();
  return {
    id: "preview",
    number: "PREVIEW",
    issueDate: draft.issueDate,
    deliveryDate: draft.deliveryDate,
    dueDate: (_a = draft.dueDate) != null ? _a : null,
    seller: draft.seller,
    buyer: draft.buyer,
    lines: draft.lines,
    totals: (0, import_invoice_model.calcTotals)(draft.lines.length > 0 ? draft.lines : []),
    profile: "EN16931",
    status: "draft",
    templateId: null,
    documentTitle: (_b = draft.documentTitle) != null ? _b : "Rechnung",
    notes: (_c = draft.notes) != null ? _c : null,
    paymentTerms: (_d = draft.paymentTerms) != null ? _d : null,
    employeeCode: (_e = draft.employeeCode) != null ? _e : null,
    skontoPercent: Number(draft.skontoPercent) || 0,
    skontoDueDate: (_f = draft.skontoDueDate) != null ? _f : null,
    sentAt: null,
    sendChannel: null,
    paymentCheck: null,
    paymentCheckedAt: null,
    remindedAt: null,
    reminderLevel: 0,
    retainUntil: null,
    paid: false,
    paidAt: null,
    stornoOfId: null,
    xml: null,
    pdfPath: null,
    xlsxPath: null,
    createdAt: stamp,
    updatedAt: stamp
  };
}
function storedToDraft(invoice) {
  var _a, _b, _c;
  return {
    seller: invoice.seller,
    buyer: invoice.buyer,
    lines: invoice.lines,
    issueDate: invoice.issueDate,
    deliveryDate: invoice.deliveryDate,
    dueDate: (_a = invoice.dueDate) != null ? _a : void 0,
    currency: "EUR",
    documentTitle: invoice.documentTitle,
    notes: (_b = invoice.notes) != null ? _b : void 0,
    paymentTerms: (_c = invoice.paymentTerms) != null ? _c : void 0
  };
}
function isMissingError(error) {
  return /not found/i.test(error.message);
}
function isContainedRelPath(relPath) {
  if (relPath.includes("\\") || relPath.startsWith("/") || /^[A-Za-z]:/.test(relPath)) {
    return false;
  }
  return !relPath.split("/").some((segment) => segment === ".." || segment === "");
}
function findShapeError(body, rules) {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return "Body must be a JSON object";
  }
  for (const [field, kind] of Object.entries(rules)) {
    const value = body[field];
    if (value === void 0) {
      continue;
    }
    if (kind === "array" && !Array.isArray(value)) {
      return `Field ${field} must be an array`;
    }
    if (kind === "object" && (typeof value !== "object" || value === null || Array.isArray(value))) {
      return `Field ${field} must be an object`;
    }
  }
  return void 0;
}
function routeParam(req, name) {
  var _a;
  const value = req.params[name];
  return Array.isArray(value) ? (_a = value[0]) != null ? _a : "" : value != null ? value : "";
}
function createApiServer(deps) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k;
  const { db, storage, log, version, authToken } = deps;
  const settings = {
    defaultVatRate: import_invoice_model.ALLOWED_VAT_RATES.includes(Number((_a = deps.settings) == null ? void 0 : _a.defaultVatRate)) ? Number((_b = deps.settings) == null ? void 0 : _b.defaultVatRate) : 19,
    defaultPaymentTerms: (_e = (_d = (_c = deps.settings) == null ? void 0 : _c.defaultPaymentTerms) == null ? void 0 : _d.trim()) != null ? _e : "",
    numberFormat: ((_g = (_f = deps.settings) == null ? void 0 : _f.numberFormat) == null ? void 0 : _g.trim()) || import_invoice_model.DEFAULT_NUMBER_FORMAT,
    storageMount: (_j = (_i = (_h = deps.settings) == null ? void 0 : _h.storageMount) == null ? void 0 : _i.trim()) != null ? _j : "",
    backupIntervalMinutes: Math.max(0, Math.round(Number((_k = deps.settings) == null ? void 0 : _k.backupIntervalMinutes) || 0))
  };
  const app = (0, import_express.default)();
  app.disable("x-powered-by");
  app.use(import_express.default.json({ limit: "25mb" }));
  app.use("/api", (_req, res, next) => {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate");
    res.set("Pragma", "no-cache");
    next();
  });
  if (authToken) {
    app.use("/api", (req, res, next) => {
      if (req.path === "/health") {
        next();
        return;
      }
      if (req.headers.authorization === `Bearer ${authToken}`) {
        next();
        return;
      }
      res.status(401).json({ error: "Unauthorized" });
    });
  }
  const route = (handler) => (req, res, next) => {
    try {
      const result = handler(req, res);
      if (result instanceof Promise) {
        result.catch(next);
      }
    } catch (error) {
      next(error);
    }
  };
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", version, schemaVersion: db.currentVersion(), counts: db.countByStatus() });
  });
  app.get("/api/settings", (_req, res) => {
    res.json(settings);
  });
  app.get(
    "/api/invoices",
    route((req, res) => {
      const status = typeof req.query.status === "string" ? req.query.status : void 0;
      const year = typeof req.query.year === "string" ? Number(req.query.year) : void 0;
      const query = typeof req.query.q === "string" ? req.query.q : void 0;
      const limit = typeof req.query.limit === "string" ? Number(req.query.limit) : void 0;
      const offset = typeof req.query.offset === "string" ? Number(req.query.offset) : void 0;
      res.json(db.listInvoices({ status, year, query, limit, offset }));
    })
  );
  app.post(
    "/api/invoices",
    route((req, res) => {
      var _a2;
      const input = (_a2 = req.body) != null ? _a2 : {};
      if (!input.seller || !input.buyer || !Array.isArray(input.lines)) {
        res.status(400).json({ error: "Body needs seller, buyer and lines[]" });
        return;
      }
      if (findShapeError(input, { seller: "object", buyer: "object", lines: "array" })) {
        res.status(400).json({ error: "Body needs seller, buyer and lines[]" });
        return;
      }
      try {
        const created = db.createDraft({ ...(0, import_invoice_model.blankDraft)(), ...input });
        log.info(`API draft created: ${created.id}`);
        res.status(201).json(created);
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    })
  );
  app.get("/api/invoices/export.xlsx", (req, res) => {
    const invoices = filteredInvoices(db, req.query);
    const stamp = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    void (0, import_excel.renderInvoiceListWorkbook)(invoices, `Rechnungs\xFCbersicht ${stamp}`).then(
      (buffer) => {
        res.type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.set("Content-Disposition", `attachment; filename="export-${stamp}.xlsx"`);
        res.send(buffer);
      },
      (error) => {
        res.status(500).json({ error: `Export failed: ${error.message}` });
      }
    );
  });
  app.get(
    "/api/invoices/:id.xml",
    route((req, res) => {
      var _a2;
      const invoice = db.getInvoice(routeParam(req, "id"));
      if (!(invoice == null ? void 0 : invoice.xml)) {
        res.status(404).json({ error: "No XML for this invoice (not issued yet?)" });
        return;
      }
      res.type("application/xml");
      res.set("Content-Disposition", `attachment; filename="${(_a2 = invoice.number) != null ? _a2 : invoice.id}.xml"`);
      res.send(invoice.xml);
    })
  );
  app.get(
    "/api/invoices/:id.pdf",
    route(async (req, res) => {
      var _a2;
      const invoice = db.getInvoice(routeParam(req, "id"));
      if (!(invoice == null ? void 0 : invoice.pdfPath)) {
        res.status(404).json({ error: "No PDF for this invoice (not issued yet?)" });
        return;
      }
      try {
        const data = await storage.read(invoice.pdfPath);
        res.type("application/pdf");
        res.set("Content-Disposition", `inline; filename="${(_a2 = invoice.number) != null ? _a2 : invoice.id}.pdf"`);
        res.send(data);
      } catch {
        res.status(404).json({ error: `Artifact file missing: ${invoice.pdfPath}` });
      }
    })
  );
  app.get(
    "/api/invoices/:id.xlsx",
    route(async (req, res) => {
      var _a2;
      const invoice = db.getInvoice(routeParam(req, "id"));
      if (!(invoice == null ? void 0 : invoice.xlsxPath)) {
        res.status(404).json({ error: "No Excel copy for this invoice (not issued yet?)" });
        return;
      }
      try {
        const data = await storage.read(invoice.xlsxPath);
        res.type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.set("Content-Disposition", `attachment; filename="${(_a2 = invoice.number) != null ? _a2 : invoice.id}.xlsx"`);
        res.send(data);
      } catch {
        res.status(404).json({ error: `Artifact file missing: ${invoice.xlsxPath}` });
      }
    })
  );
  app.get(
    "/api/invoices/:id",
    route((req, res) => {
      const invoice = db.getInvoice(routeParam(req, "id"));
      if (!invoice) {
        res.status(404).json({ error: "Invoice not found" });
        return;
      }
      res.json(invoice);
    })
  );
  app.post(
    "/api/invoices/:id/paid",
    route((req, res) => {
      var _a2;
      const body = (_a2 = req.body) != null ? _a2 : {};
      if (typeof body.paid !== "boolean") {
        res.status(400).json({ error: "Body needs { paid: true|false }" });
        return;
      }
      if (body.paidAt !== void 0 && typeof body.paidAt !== "string") {
        res.status(400).json({ error: "paidAt must be an ISO date" });
        return;
      }
      try {
        res.json(db.setPaid(routeParam(req, "id"), body.paid, body.paidAt));
      } catch (error) {
        res.status(isMissingError(error) ? 404 : 400).json({ error: error.message });
      }
    })
  );
  app.post(
    "/api/invoices/:id/storno",
    route((req, res) => {
      var _a2;
      const body = (_a2 = req.body) != null ? _a2 : {};
      if (body.reason !== void 0 && typeof body.reason !== "string") {
        res.status(400).json({ error: "reason must be a string" });
        return;
      }
      try {
        const result = db.reverseInvoice(routeParam(req, "id"), body.reason);
        log.info(`Storno created for ${result.original.number}: draft ${result.reversal.id}`);
        res.status(201).json(result);
      } catch (error) {
        res.status(isMissingError(error) ? 404 : 400).json({ error: error.message });
      }
    })
  );
  app.patch(
    "/api/invoices/:id",
    route((req, res) => {
      var _a2;
      const patch = (_a2 = req.body) != null ? _a2 : {};
      const bad = findShapeError(patch, { seller: "object", buyer: "object", lines: "array" });
      if (bad) {
        res.status(400).json({ error: bad });
        return;
      }
      try {
        res.json(db.updateDraft(routeParam(req, "id"), patch));
      } catch (error) {
        res.status(isMissingError(error) ? 404 : 400).json({ error: error.message });
      }
    })
  );
  app.post(
    "/api/invoices/:id/issue",
    route(async (req, res) => {
      try {
        const outcome = await (0, import_issue_service.issueInvoiceWithArtifacts)(db, log, routeParam(req, "id"), storage);
        res.json(outcome.invoice);
      } catch (error) {
        res.status(isMissingError(error) ? 404 : 400).json({ error: error.message });
      }
    })
  );
  app.delete(
    "/api/invoices/:id",
    route((req, res) => {
      const id = routeParam(req, "id");
      try {
        db.deleteDraft(id);
        res.status(204).end();
      } catch (error) {
        res.status(isMissingError(error) ? 404 : 400).json({ error: error.message });
      }
    })
  );
  app.post(
    "/api/invoices/issue-batch",
    route(async (req, res) => {
      var _a2;
      const body = (_a2 = req.body) != null ? _a2 : {};
      const ids = Array.isArray(body.ids) ? body.ids.filter((v) => typeof v === "string") : [];
      if (ids.length === 0) {
        res.status(400).json({ error: "ids must be a non-empty array" });
        return;
      }
      if (ids.length > 200) {
        res.status(400).json({ error: "At most 200 drafts per run" });
        return;
      }
      try {
        const outcome = await (0, import_issue_service.issueInvoiceBatch)(db, log, ids, storage);
        res.json(outcome);
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    })
  );
  app.post(
    "/api/invoices/:id/sent",
    route((req, res) => {
      var _a2;
      const body = (_a2 = req.body) != null ? _a2 : {};
      const channel = typeof body.channel === "string" && body.channel.trim() ? body.channel.trim() : "E-Mail";
      const sentAt = typeof body.sentAt === "string" && /^\d{4}-\d{2}-\d{2}T[\d:.]+Z?$/.test(body.sentAt) ? new Date(body.sentAt).toISOString() : (/* @__PURE__ */ new Date()).toISOString();
      try {
        res.json(db.markSent(routeParam(req, "id"), sentAt, channel));
      } catch (error) {
        res.status(isMissingError(error) ? 404 : 400).json({ error: error.message });
      }
    })
  );
  app.post(
    "/api/invoices/:id/payment-check",
    route((req, res) => {
      var _a2;
      const id = routeParam(req, "id");
      const invoice = db.getInvoice(id);
      if (!invoice) {
        res.status(404).json({ error: "Invoice not found" });
        return;
      }
      const duty = (0, import_invoice_model2.paymentCheckDuty)(invoice.dueDate, invoice.totals.grossTotal);
      const body = (_a2 = req.body) != null ? _a2 : {};
      if (typeof body.outcome === "string" && body.outcome.trim()) {
        res.json({
          invoice: db.setPaymentCheck(id, body.outcome.trim()),
          duty,
          checked: true
        });
        return;
      }
      res.json({ invoice, duty, checked: Boolean(invoice.paymentCheckedAt) });
    })
  );
  app.get(
    "/api/reminders",
    route((_req, res) => {
      res.json((0, import_issue_service.collectReminderCandidates)(db));
    })
  );
  app.post(
    "/api/invoices/:id/reminded",
    route((req, res) => {
      try {
        res.json(db.registerReminder(routeParam(req, "id")));
      } catch (error) {
        res.status(isMissingError(error) ? 404 : 400).json({ error: error.message });
      }
    })
  );
  app.get(
    "/api/invoice-templates",
    route((_req, res) => {
      res.json(db.listInvoiceTemplates());
    })
  );
  app.post(
    "/api/invoice-templates",
    route((req, res) => {
      var _a2;
      const body = (_a2 = req.body) != null ? _a2 : {};
      if (typeof body.name !== "string" || !body.name.trim()) {
        res.status(400).json({ error: "name is required" });
        return;
      }
      if (typeof body.body !== "object" || body.body === null) {
        res.status(400).json({ error: "body is required" });
        return;
      }
      try {
        res.status(201).json(db.createInvoiceTemplate(body.name, body.body));
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    })
  );
  app.delete(
    "/api/invoice-templates/:id",
    route((req, res) => {
      try {
        db.deleteInvoiceTemplate(routeParam(req, "id"));
        res.status(204).end();
      } catch (error) {
        res.status(isMissingError(error) ? 404 : 400).json({ error: error.message });
      }
    })
  );
  app.get(
    "/api/invoices/export.csv",
    route((req, res) => {
      const invoices = filteredInvoices(db, req.query);
      res.type("text/csv; charset=utf-8");
      res.set("Content-Disposition", 'attachment; filename="rechnungen.csv"');
      res.send((0, import_csv.renderInvoiceListCsv)(invoices));
    })
  );
  app.get(
    "/api/invoices/export.datev",
    route((req, res) => {
      var _a2, _b2, _c2;
      const invoices = filteredInvoices(db, req.query);
      const company = (_a2 = db.getDefaultCompanyProfile()) == null ? void 0 : _a2.profile;
      const head = (0, import_csv.renderDatevHead)((_b2 = company == null ? void 0 : company.name) != null ? _b2 : "Firma", (_c2 = company == null ? void 0 : company.taxNumber) != null ? _c2 : "");
      res.type("text/plain; charset=iso-8859-1");
      res.set("Content-Disposition", 'attachment; filename="rechnungen.datev"');
      res.send(`${head}
${(0, import_csv.renderDatevRows)(invoices)}`);
    })
  );
  app.post(
    "/api/invoices/:id/rerender",
    route(async (req, res) => {
      var _a2;
      const body = (_a2 = req.body) != null ? _a2 : {};
      const reason = typeof body.reason === "string" && body.reason.trim() ? body.reason.trim() : null;
      try {
        const outcome = await (0, import_issue_service.rerenderInvoicePdf)(db, log, routeParam(req, "id"), storage, reason);
        res.json({ invoice: outcome.invoice, archivedPath: outcome.archivedPath });
      } catch (error) {
        res.status(isMissingError(error) ? 404 : 400).json({ error: error.message });
      }
    })
  );
  app.get(
    "/api/invoices/:id/renders",
    route((req, res) => {
      const id = routeParam(req, "id");
      if (!db.getInvoice(id)) {
        res.status(404).json({ error: "Invoice not found" });
        return;
      }
      res.json(db.listRenderHistory(id));
    })
  );
  app.post(
    "/api/invoices/:id/validate",
    route(async (req, res) => {
      const invoice = db.getInvoice(routeParam(req, "id"));
      if (!invoice) {
        res.status(404).json({ error: "Invoice not found" });
        return;
      }
      const draft = storedToDraft(invoice);
      const businessErrors = (0, import_invoice_model.validateInvoiceForIssue)(draft);
      if (businessErrors.length > 0) {
        res.json({ formatErrors: [], businessErrors });
        return;
      }
      try {
        const preview = previewInvoice(draft);
        const { xml } = await (0, import_zugferd.generateInvoiceXml)(preview);
        res.json(await (0, import_validation.validateArtifacts)(preview, xml));
      } catch (error) {
        res.json({ formatErrors: [error.message], businessErrors });
      }
    })
  );
  app.get("/api/templates", (_req, res) => {
    res.json(db.listTemplates());
  });
  app.post(
    "/api/templates",
    route((req, res) => {
      var _a2;
      const body = (_a2 = req.body) != null ? _a2 : {};
      if (typeof body.name !== "string") {
        res.status(400).json({ error: "Body needs name and definition" });
        return;
      }
      try {
        res.status(201).json(db.createTemplate(body.name, body.definition));
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    })
  );
  app.post(
    "/api/templates/preview",
    route(async (req, res) => {
      var _a2, _b2, _c2;
      const body = (_a2 = req.body) != null ? _a2 : {};
      const errors = (0, import_templates.validateTemplate)(body.definition);
      if (errors.length > 0) {
        res.status(400).json({ error: errors.join(" | ") });
        return;
      }
      const definition = body.definition;
      const companyId = typeof body.companyId === "string" ? body.companyId : definition.companyId;
      let seller = {
        name: "Muster GmbH",
        street: "Beispielstr. 1",
        zip: "10115",
        city: "Berlin",
        country: "DE",
        vatId: "DE123456789",
        iban: "DE02120300000000202051",
        email: "rechnung@muster.example"
      };
      if (companyId) {
        const company = (_b2 = db.getCompanyProfile(companyId)) != null ? _b2 : db.getDefaultCompanyProfile();
        if (company == null ? void 0 : company.profile.name.trim()) {
          seller = { ...seller, ...company.profile };
        }
      }
      const sample = previewInvoice({
        seller,
        buyer: {
          name: "Kunde AG",
          street: "Kundenweg 5",
          zip: "80331",
          city: "M\xFCnchen",
          country: "DE",
          customerNumber: "K-42"
        },
        lines: [
          { description: "Beratung", quantity: 2, unit: "Std", unitPriceNet: 100, vatRate: 19 },
          { description: "Anfahrt", quantity: 1, unit: "Stk", unitPriceNet: 50, vatRate: 19 }
        ],
        issueDate: "2026-09-28",
        deliveryDate: "2026-09-27",
        dueDate: "2026-10-12",
        currency: "EUR",
        documentTitle: "Rechnung",
        notes: "Dies ist eine Layout-Vorschau.",
        paymentTerms: "Zahlbar innerhalb von 14 Tagen ohne Abzug."
      });
      let logo;
      if (((_c2 = definition.logo) == null ? void 0 : _c2.path) && isContainedRelPath(definition.logo.path)) {
        try {
          logo = { data: await storage.read(definition.logo.path) };
        } catch {
          logo = void 0;
        }
      }
      const pdf = await (0, import_pdf.renderInvoicePdf)(sample, definition, logo);
      res.type("application/pdf").send(pdf);
    })
  );
  app.get(
    "/api/templates/:tid",
    route((req, res) => {
      const template = db.getTemplate(routeParam(req, "tid"));
      if (!template) {
        res.status(404).json({ error: "Template not found" });
        return;
      }
      res.json(template);
    })
  );
  app.put(
    "/api/templates/:tid",
    route((req, res) => {
      var _a2;
      const body = (_a2 = req.body) != null ? _a2 : {};
      try {
        res.json(db.updateTemplate(routeParam(req, "tid"), body));
      } catch (error) {
        res.status(isMissingError(error) ? 404 : 400).json({ error: error.message });
      }
    })
  );
  app.delete(
    "/api/templates/:tid",
    route((req, res) => {
      try {
        db.deleteTemplate(routeParam(req, "tid"));
        res.json({ ok: true });
      } catch (error) {
        res.status(isMissingError(error) ? 404 : 400).json({ error: error.message });
      }
    })
  );
  app.post(
    "/api/templates/:tid/default",
    route((req, res) => {
      try {
        res.json(db.setDefaultTemplate(routeParam(req, "tid")));
      } catch (error) {
        res.status(isMissingError(error) ? 404 : 400).json({ error: error.message });
      }
    })
  );
  app.post(
    "/api/templates/:tid/logo",
    route(async (req, res) => {
      var _a2, _b2, _c2, _d2, _e2, _f2;
      const template = db.getTemplate(routeParam(req, "tid"));
      if (!template) {
        res.status(404).json({ error: "Template not found" });
        return;
      }
      const body = (_a2 = req.body) != null ? _a2 : {};
      if (typeof body.filename !== "string" || typeof body.mime !== "string" || typeof body.dataBase64 !== "string") {
        res.status(400).json({ error: "Body needs filename, mime and dataBase64" });
        return;
      }
      const ext = (_b2 = body.filename.split(".").pop()) == null ? void 0 : _b2.toLowerCase();
      if (ext !== "png" && ext !== "jpg" && ext !== "jpeg" || !body.mime.startsWith("image/")) {
        res.status(400).json({ error: "Only PNG/JPEG logos are supported" });
        return;
      }
      let data;
      try {
        data = Buffer.from(body.dataBase64, "base64");
      } catch {
        res.status(400).json({ error: "dataBase64 is not valid base64" });
        return;
      }
      if (data.length === 0 || data.length > 2 * 1024 * 1024) {
        res.status(400).json({ error: "Logo must be 1 byte \u2013 2 MB" });
        return;
      }
      const isPng = data.length > 4 && data.readUInt32BE(0) === 2303741511;
      const isJpeg = data.length > 2 && data[0] === 255 && data[1] === 216;
      if (!isPng && !isJpeg) {
        res.status(400).json({ error: "File content is no PNG/JPEG image" });
        return;
      }
      const logoPath = `logos/${template.id}.${ext === "jpeg" ? "jpg" : ext}`;
      try {
        await storage.write(logoPath, data);
      } catch (error) {
        res.status(500).json({ error: `Cannot store logo: ${error.message}` });
        return;
      }
      try {
        res.json(
          db.updateTemplate(template.id, {
            definition: {
              ...template.definition,
              logo: {
                path: logoPath,
                position: (_d2 = (_c2 = template.definition.logo) == null ? void 0 : _c2.position) != null ? _d2 : "right",
                widthMm: (_f2 = (_e2 = template.definition.logo) == null ? void 0 : _e2.widthMm) != null ? _f2 : 30
              }
            }
          })
        );
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    })
  );
  app.post(
    "/api/backups",
    route(async (_req, res) => {
      try {
        const backup = await (0, import_backup.createBackup)(db, storage, log, version);
        try {
          await storage.write(backup.filename, backup.data);
        } catch (error) {
          res.status(500).json({ error: `Cannot store backup: ${error.message}` });
          return;
        }
        const logged = db.logBackup({
          filename: backup.filename,
          size: backup.size,
          sha256: backup.sha256,
          manifestJson: JSON.stringify(backup.manifest)
        });
        log.info(`Backup created: ${backup.filename} (${backup.size} bytes)`);
        res.status(201).json(logged);
      } catch (error) {
        res.status(500).json({ error: `Backup failed: ${error.message}` });
      }
    })
  );
  app.get("/api/backups", (_req, res) => {
    res.json(db.listBackups());
  });
  app.get(
    "/api/backups/file/:name",
    route(async (req, res) => {
      const name = routeParam(req, "name").replace(/[^A-Za-z0-9_.-]/g, "");
      try {
        const data = await storage.read(`backups/${name}`);
        res.type("application/zip");
        res.set("Content-Disposition", `attachment; filename="${name}"`);
        res.send(data);
      } catch {
        res.status(404).json({ error: "Backup file not found" });
      }
    })
  );
  app.post(
    "/api/restore/preview",
    route(async (req, res) => {
      var _a2, _b2;
      const body = (_a2 = req.body) != null ? _a2 : {};
      let data;
      if (typeof body.dataBase64 === "string" && body.dataBase64.length > 0) {
        try {
          data = Buffer.from(body.dataBase64, "base64");
        } catch {
          res.status(400).json({ error: "dataBase64 is not valid base64" });
          return;
        }
      } else if (typeof body.filename === "string" && body.filename.length > 0) {
        try {
          data = await storage.read(`backups/${(_b2 = body.filename.split("/").pop()) != null ? _b2 : ""}`);
        } catch {
          res.status(404).json({ error: "Backup file not found" });
          return;
        }
      } else {
        res.status(400).json({ error: "filename or dataBase64 is required" });
        return;
      }
      res.json(await (0, import_backup.previewRestore)(db, data));
    })
  );
  app.post(
    "/api/restore",
    route(async (req, res) => {
      var _a2, _b2;
      const body = (_a2 = req.body) != null ? _a2 : {};
      let data;
      if (typeof body.dataBase64 === "string" && body.dataBase64.length > 0) {
        try {
          data = Buffer.from(body.dataBase64, "base64");
        } catch {
          res.status(400).json({ error: "dataBase64 is not valid base64" });
          return;
        }
      } else if (typeof body.filename === "string" && body.filename.length > 0) {
        const name = (_b2 = body.filename.split("/").pop()) != null ? _b2 : "";
        try {
          data = await storage.read(`backups/${name.replace(/[^A-Za-z0-9_.-]/g, "")}`);
        } catch {
          res.status(404).json({ error: "Backup file not found" });
          return;
        }
      } else {
        res.status(400).json({ error: "Body needs filename or dataBase64" });
        return;
      }
      try {
        res.json(await (0, import_backup.restoreBackup)(db, storage, data, log));
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    })
  );
  app.get("/api/company-profiles", (_req, res) => {
    res.json(db.listCompanyProfiles());
  });
  app.get("/api/company-profiles/default", (_req, res) => {
    res.json(db.getDefaultCompanyProfile());
  });
  app.post(
    "/api/company-profiles",
    route((req, res) => {
      var _a2;
      const body = (_a2 = req.body) != null ? _a2 : {};
      if (typeof body.name !== "string" || typeof body.profile !== "object" || !body.profile || Array.isArray(body.profile)) {
        res.status(400).json({ error: "Body needs name and profile" });
        return;
      }
      try {
        res.status(201).json(
          db.createCompanyProfile(body.name, body.profile)
        );
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    })
  );
  app.get(
    "/api/company-profiles/:cid",
    route((req, res) => {
      const profile = db.getCompanyProfile(routeParam(req, "cid"));
      if (!profile) {
        res.status(404).json({ error: "Company profile not found" });
        return;
      }
      res.json(profile);
    })
  );
  app.put(
    "/api/company-profiles/:cid",
    route((req, res) => {
      var _a2;
      const body = (_a2 = req.body) != null ? _a2 : {};
      try {
        res.json(db.updateCompanyProfile(routeParam(req, "cid"), body));
      } catch (error) {
        res.status(isMissingError(error) ? 404 : 400).json({ error: error.message });
      }
    })
  );
  app.delete(
    "/api/company-profiles/:cid",
    route((req, res) => {
      try {
        db.deleteCompanyProfile(routeParam(req, "cid"));
        res.json({ ok: true });
      } catch (error) {
        res.status(isMissingError(error) ? 404 : 400).json({ error: error.message });
      }
    })
  );
  app.post(
    "/api/company-profiles/:cid/default",
    route((req, res) => {
      try {
        res.json(db.setDefaultCompanyProfile(routeParam(req, "cid")));
      } catch (error) {
        res.status(isMissingError(error) ? 404 : 400).json({ error: error.message });
      }
    })
  );
  app.get("/api/customers", (req, res) => {
    const query = typeof req.query.q === "string" ? req.query.q : void 0;
    res.json(db.listCustomers(query));
  });
  app.post(
    "/api/customers/number-assign",
    route((_req, res) => {
      try {
        const updated = db.assignMissingCustomerNumbers();
        log.info(`Assigned customer numbers to ${updated.length} customers`);
        res.json({ updated: updated.length, customers: updated });
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    })
  );
  app.post(
    "/api/customers",
    route((req, res) => {
      var _a2;
      const body = (_a2 = req.body) != null ? _a2 : {};
      if (typeof body.name !== "string" || typeof body.profile !== "object" || !body.profile || Array.isArray(body.profile)) {
        res.status(400).json({ error: "Body needs name and profile" });
        return;
      }
      try {
        res.status(201).json(db.createCustomer(body.name, body.profile));
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    })
  );
  app.get(
    "/api/customers/:cid",
    route((req, res) => {
      const customer = db.getCustomer(routeParam(req, "cid"));
      if (!customer) {
        res.status(404).json({ error: "Customer not found" });
        return;
      }
      res.json(customer);
    })
  );
  app.put(
    "/api/customers/:cid",
    route((req, res) => {
      var _a2;
      const body = (_a2 = req.body) != null ? _a2 : {};
      try {
        res.json(db.updateCustomer(routeParam(req, "cid"), body));
      } catch (error) {
        res.status(isMissingError(error) ? 404 : 400).json({ error: error.message });
      }
    })
  );
  app.delete(
    "/api/customers/:cid",
    route((req, res) => {
      try {
        db.deleteCustomer(routeParam(req, "cid"));
        res.json({ ok: true });
      } catch (error) {
        res.status(isMissingError(error) ? 404 : 400).json({ error: error.message });
      }
    })
  );
  app.get("/api/products", (_req, res) => {
    res.json(db.listProducts());
  });
  app.post(
    "/api/products",
    route((req, res) => {
      var _a2;
      try {
        res.status(201).json(db.createProduct((_a2 = req.body) != null ? _a2 : {}));
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    })
  );
  app.get(
    "/api/products/:pid",
    route((req, res) => {
      const product = db.getProduct(routeParam(req, "pid"));
      if (!product) {
        res.status(404).json({ error: "Product not found" });
        return;
      }
      res.json(product);
    })
  );
  app.put(
    "/api/products/:pid",
    route((req, res) => {
      var _a2;
      try {
        res.json(db.updateProduct(routeParam(req, "pid"), (_a2 = req.body) != null ? _a2 : {}));
      } catch (error) {
        res.status(isMissingError(error) ? 404 : 400).json({ error: error.message });
      }
    })
  );
  app.delete(
    "/api/products/:pid",
    route((req, res) => {
      try {
        db.deleteProduct(routeParam(req, "pid"));
        res.json({ ok: true });
      } catch (error) {
        res.status(isMissingError(error) ? 404 : 400).json({ error: error.message });
      }
    })
  );
  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Unknown API route" });
  });
  app.use((error, _req, res, _next) => {
    var _a2, _b2, _c2, _d2;
    const err = error;
    const status = (_b2 = (_a2 = err == null ? void 0 : err.status) != null ? _a2 : err == null ? void 0 : err.statusCode) != null ? _b2 : 500;
    const message = status < 500 ? String((_c2 = err == null ? void 0 : err.message) != null ? _c2 : "Request failed") : "Internal server error";
    log.error(`API error (${status}): ${String((_d2 = err == null ? void 0 : err.message) != null ? _d2 : error)}`);
    res.status(status).json({ error: message });
  });
  return app;
}
function attachStatic(app, dir) {
  try {
    if (!(0, import_node_fs.existsSync)(dir) || !(0, import_node_fs.statSync)(dir).isDirectory()) {
      return false;
    }
    app.use(import_express.default.static(dir));
    return true;
  } catch {
    return false;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  attachStatic,
  createApiServer,
  previewInvoice,
  routeParam,
  storedToDraft
});
//# sourceMappingURL=api-server.js.map
