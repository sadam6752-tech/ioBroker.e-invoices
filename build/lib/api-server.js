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
var import_node_crypto = require("node:crypto");
var import_node_net = require("node:net");
var import_express = __toESM(require("express"));
var import_node_fs = require("node:fs");
var import_node_path = require("node:path");
var import_helmet = __toESM(require("helmet"));
var import_express_rate_limit = require("express-rate-limit");
var import_invoice_model = require("./invoice-model");
var import_issue_service = require("./issue-service");
var import_backup = require("./backup");
var import_attachments = require("./attachments");
var import_csv = require("./csv");
var import_excel = require("./excel");
var import_open_items = require("./open-items");
var import_revenue_report = require("./revenue-report");
var import_dunning = require("./dunning");
var import_dunning_pdf = require("./dunning-pdf");
var import_invoice_model2 = require("./invoice-model");
var import_pdf = require("./pdf");
var import_templates = require("./templates");
var import_validation = require("./validation");
var import_zugferd = require("./zugferd");
function docTypeFilter(query, fallback) {
  const raw = (typeof query.docType === "string" ? query.docType : "").trim().toLowerCase();
  if (raw === "all") {
    return void 0;
  }
  return raw ? (0, import_invoice_model.normalizeDocumentType)(raw) : fallback;
}
function filteredInvoices(db, query, fallbackDocType) {
  const status = typeof query.status === "string" ? query.status : void 0;
  const year = typeof query.year === "string" ? Number(query.year) : void 0;
  const text = typeof query.q === "string" ? query.q : void 0;
  const companyId = typeof query.companyId === "string" && query.companyId ? query.companyId : void 0;
  const docType = docTypeFilter(query, fallbackDocType);
  return db.listInvoices({
    status: status && ["draft", "issued", "cancelled"].includes(status) ? status : void 0,
    year: Number.isInteger(year) ? year : void 0,
    docType,
    companyId,
    query: text,
    limit: 500
  });
}
function openItemsOptions(query) {
  const options = {
    onlyOverdue: query.onlyOverdue === "1" || query.onlyOverdue === "true"
  };
  if (query.asOf !== void 0) {
    if (typeof query.asOf !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(query.asOf)) {
      return "asOf must be an ISO date (YYYY-MM-DD)";
    }
    options.asOf = query.asOf;
  }
  return options;
}
function previewInvoice(draft) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i;
  const stamp = (/* @__PURE__ */ new Date()).toISOString();
  const docType = (0, import_invoice_model.normalizeDocumentType)(draft.docType);
  return {
    id: "preview",
    templateSnapshot: null,
    companyId: null,
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
    docType,
    documentTitle: (_b = draft.documentTitle) != null ? _b : (0, import_invoice_model.defaultDocumentTitle)(docType),
    notes: (_c = draft.notes) != null ? _c : null,
    paymentTerms: (_d = draft.paymentTerms) != null ? _d : null,
    employeeCode: (_e = draft.employeeCode) != null ? _e : null,
    skontoPercent: Number(draft.skontoPercent) || 0,
    skontoDueDate: (_f = draft.skontoDueDate) != null ? _f : null,
    validUntil: docType === "quote" ? ((_g = draft.validUntil) == null ? void 0 : _g.trim()) || (0, import_invoice_model.defaultValidUntil)(draft.issueDate) : (_h = draft.validUntil) != null ? _h : null,
    sourceDocumentId: (_i = draft.sourceDocumentId) != null ? _i : null,
    acceptedAt: null,
    rejectedAt: null,
    rejectionReason: null,
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
  var _a, _b, _c, _d, _e, _f;
  return {
    seller: invoice.seller,
    buyer: invoice.buyer,
    lines: invoice.lines,
    issueDate: invoice.issueDate,
    deliveryDate: invoice.deliveryDate,
    dueDate: (_a = invoice.dueDate) != null ? _a : void 0,
    currency: "EUR",
    // R8: without the type the re-validation would test invoice rules
    // against a quotation (and vice versa).
    docType: invoice.docType,
    validUntil: (_b = invoice.validUntil) != null ? _b : void 0,
    employeeCode: (_c = invoice.employeeCode) != null ? _c : void 0,
    skontoPercent: invoice.skontoPercent,
    skontoDueDate: (_d = invoice.skontoDueDate) != null ? _d : void 0,
    documentTitle: invoice.documentTitle,
    notes: (_e = invoice.notes) != null ? _e : void 0,
    paymentTerms: (_f = invoice.paymentTerms) != null ? _f : void 0
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
function routeIdParam(req, name) {
  const value = Number(routeParam(req, name));
  return Number.isInteger(value) && value > 0 ? value : void 0;
}
async function storeValidationReport(db, storage, log, invoice, result) {
  var _a;
  const seq = db.nextValidationSeq(invoice.id);
  const createdAt = (/* @__PURE__ */ new Date()).toISOString();
  const name = (_a = invoice.number) != null ? _a : invoice.id;
  const path = `invoices/${invoice.issueDate.slice(0, 4)}/${name}.validation-${seq}.json`;
  const payload = {
    invoiceId: invoice.id,
    invoiceNumber: invoice.number,
    documentTitle: invoice.documentTitle,
    profile: invoice.profile,
    seq,
    createdAt,
    validator: "e-invoices internal check (CII XSD offline + EN 16931 plausibility)",
    ok: result.formatErrors.length === 0 && result.businessErrors.length === 0,
    formatErrors: result.formatErrors,
    businessErrors: result.businessErrors
  };
  try {
    await storage.write(path, JSON.stringify(payload, null, 2));
    db.logValidationReport(invoice.id, path, result.formatErrors.length, result.businessErrors.length);
    log.info(`Validation report stored: ${path}`);
    return { seq, path, createdAt };
  } catch (error) {
    log.error(`Cannot store validation report ${path}: ${error.message}`);
    return null;
  }
}
function hostNameOf(host) {
  const trimmed = host.trim().toLowerCase();
  if (trimmed.startsWith("[")) {
    return trimmed.slice(1, trimmed.indexOf("]"));
  }
  return trimmed.split(":")[0];
}
function untrustedRequestReason(req) {
  var _a;
  const host = (_a = req.headers.host) != null ? _a : "";
  const name = hostNameOf(host);
  if (!name || (0, import_node_net.isIP)(name) === 0 && name !== "localhost" && !name.endsWith(".localhost")) {
    return "Host name not allowed without an API token - open the PWA by IP address or set an API token";
  }
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    const origin = req.headers.origin;
    if (origin !== void 0) {
      let originHost = "";
      try {
        originHost = new URL(origin).host.toLowerCase();
      } catch {
      }
      if (originHost !== host.trim().toLowerCase()) {
        return "Cross-origin request refused";
      }
    }
    if (req.headers["sec-fetch-site"] === "cross-site") {
      return "Cross-site request refused";
    }
  }
  return void 0;
}
function secretEquals(provided, expected) {
  const a = (0, import_node_crypto.createHash)("sha256").update(provided, "utf8").digest();
  const b = (0, import_node_crypto.createHash)("sha256").update(expected, "utf8").digest();
  return (0, import_node_crypto.timingSafeEqual)(a, b);
}
function createApiServer(deps) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r, _s;
  const { db, storage, log, version, authToken } = deps;
  const settings = {
    defaultVatRate: import_invoice_model.ALLOWED_VAT_RATES.includes(Number((_a = deps.settings) == null ? void 0 : _a.defaultVatRate)) ? Number((_b = deps.settings) == null ? void 0 : _b.defaultVatRate) : 19,
    defaultPaymentTerms: (_e = (_d = (_c = deps.settings) == null ? void 0 : _c.defaultPaymentTerms) == null ? void 0 : _d.trim()) != null ? _e : "",
    // only languages the web app really ships; anything else means "decide in the browser"
    pwaLanguage: ["de", "en"].includes(String((_f = deps.settings) == null ? void 0 : _f.pwaLanguage)) ? String((_g = deps.settings) == null ? void 0 : _g.pwaLanguage) : "auto",
    numberFormat: ((_i = (_h = deps.settings) == null ? void 0 : _h.numberFormat) == null ? void 0 : _i.trim()) || import_invoice_model.DEFAULT_NUMBER_FORMAT,
    // R8: quotations number in their own circle, so the PWA shows the
    // matching format next to the invoice one.
    quoteNumberFormat: ((_k = (_j = deps.settings) == null ? void 0 : _j.quoteNumberFormat) == null ? void 0 : _k.trim()) || import_invoice_model.DEFAULT_QUOTE_NUMBER_FORMAT,
    storageMount: (_n = (_m = (_l = deps.settings) == null ? void 0 : _l.storageMount) == null ? void 0 : _m.trim()) != null ? _n : "",
    backupIntervalMinutes: Math.max(0, Math.round(Number((_o = deps.settings) == null ? void 0 : _o.backupIntervalMinutes) || 0))
  };
  const limits = {
    api: Math.max(1, Math.round((_q = (_p = deps.limits) == null ? void 0 : _p.api) != null ? _q : 600)),
    restore: Math.max(1, Math.round((_s = (_r = deps.limits) == null ? void 0 : _r.restore) != null ? _s : 10))
  };
  const app = (0, import_express.default)();
  app.disable("x-powered-by");
  app.set("trust proxy", false);
  app.use(
    (0, import_helmet.default)({
      // The PWA is served from the same origin as the API: everything else
      // (scripts, styles, connections, frames) stays blocked.
      contentSecurityPolicy: {
        directives: {
          // helmet merges its own defaults into this list. One of them,
          // `upgrade-insecure-requests`, has to go: the adapter speaks plain
          // HTTP, and that directive makes the browser rewrite every asset
          // URL to https:// on any origin that is not "trustworthy"
          // (localhost/127.0.0.1 only). A client on the LAN
          // (http://192.168.x.y:8093) therefore requested the JS/CSS over
          // https, got a CORS error and showed a blank start page (0.0.4).
          "upgrade-insecure-requests": null,
          "default-src": ["'self'"],
          "script-src": ["'self'"],
          // the views set inline style attributes (badges, status colors)
          "style-src": ["'self'", "'unsafe-inline'"],
          "img-src": ["'self'", "data:", "blob:"],
          "connect-src": ["'self'"],
          "worker-src": ["'self'", "blob:"],
          "manifest-src": ["'self'"],
          "object-src": ["'none'"],
          "base-uri": ["'self'"],
          "form-action": ["'self'"],
          "frame-ancestors": ["'none'"]
        }
      },
      crossOriginEmbedderPolicy: false
    })
  );
  app.use(import_express.default.json({ limit: "25mb" }));
  const limiter = (limit, scope) => (0, import_express_rate_limit.rateLimit)({
    windowMs: 6e4,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: (req, res) => {
      var _a2;
      (_a2 = log.warn) == null ? void 0 : _a2.call(log, `Rate limit hit (${scope}): ${req.method} ${req.path}`);
      res.status(429).json({ error: "Too many requests" });
    }
  });
  app.use("/api", limiter(limits.api, "api"));
  app.use("/api/restore", limiter(limits.restore, "restore"));
  if (deps.onChange) {
    const notify = deps.onChange;
    app.use("/api", (req, res, next) => {
      res.on("finish", () => {
        var _a2;
        if (!["GET", "HEAD", "OPTIONS"].includes(req.method) && res.statusCode < 400) {
          try {
            notify();
          } catch (error) {
            (_a2 = log.warn) == null ? void 0 : _a2.call(log, `onChange failed: ${error.message}`);
          }
        }
      });
      next();
    });
  }
  app.use("/api", (_req, res, next) => {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate");
    res.set("Pragma", "no-cache");
    next();
  });
  if (!authToken) {
    app.use("/api", (req, res, next) => {
      var _a2;
      const reason = untrustedRequestReason(req);
      if (reason) {
        (_a2 = log.warn) == null ? void 0 : _a2.call(log, `Request refused: ${req.method} ${req.path} (${reason})`);
        res.status(403).json({ error: reason });
        return;
      }
      next();
    });
  }
  if (authToken) {
    app.use("/api", (req, res, next) => {
      if (req.path === "/health") {
        next();
        return;
      }
      if (req.headers.authorization && secretEquals(req.headers.authorization, `Bearer ${authToken}`)) {
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
    res.json({
      status: "ok",
      version,
      schemaVersion: db.currentVersion(),
      counts: db.countByStatus(),
      pwaLanguage: settings.pwaLanguage
    });
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
      const docType = docTypeFilter(req.query);
      const sourceDocumentId = typeof req.query.sourceDocumentId === "string" ? req.query.sourceDocumentId : void 0;
      const companyId = typeof req.query.companyId === "string" && req.query.companyId ? req.query.companyId : void 0;
      res.json(db.listInvoices({ status, year, docType, sourceDocumentId, companyId, query, limit, offset }));
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
        const docType = (0, import_invoice_model.normalizeDocumentType)(typeof input.docType === "string" ? input.docType : void 0);
        const created = db.createDraft({ ...(0, import_invoice_model.blankDraft)((0, import_invoice_model.todayIso)(), docType), ...input, docType });
        log.info(`API draft created: ${created.id}`);
        res.status(201).json(created);
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    })
  );
  app.get("/api/invoices/export.csv", (req, res) => {
    res.type("text/csv; charset=utf-8");
    res.set("Content-Disposition", (0, import_attachments.attachmentDisposition)("rechnungen.csv"));
    res.send((0, import_csv.renderInvoiceListCsv)(filteredInvoices(db, req.query, "invoice")));
  });
  app.get("/api/invoices/export.datev", (req, res) => {
    var _a2, _b2, _c2;
    const company = (_a2 = db.getDefaultCompanyProfile()) == null ? void 0 : _a2.profile;
    const head = (0, import_csv.renderDatevHead)((_b2 = company == null ? void 0 : company.name) != null ? _b2 : "Firma", (_c2 = company == null ? void 0 : company.taxNumber) != null ? _c2 : "");
    res.type("text/plain; charset=iso-8859-1");
    res.set("Content-Disposition", (0, import_attachments.attachmentDisposition)("rechnungen.datev"));
    res.send(`${head}
${(0, import_csv.renderDatevRows)(filteredInvoices(db, req.query, "invoice"))}`);
  });
  app.get("/api/invoices/export.xlsx", (req, res) => {
    const invoices = filteredInvoices(db, req.query, "invoice");
    const stamp = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    void (0, import_excel.renderInvoiceListWorkbook)(invoices, `Rechnungs\xFCbersicht ${stamp}`).then(
      (buffer) => {
        res.type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.set("Content-Disposition", (0, import_attachments.attachmentDisposition)(`export-${stamp}.xlsx`));
        res.send(buffer);
      },
      (error) => {
        res.status(500).json({ error: `Export failed: ${error.message}` });
      }
    );
  });
  const revenueReport = (query) => {
    let year;
    if (typeof query.year === "string" && query.year !== "") {
      year = Number(query.year);
      if (!Number.isInteger(year) || year < 1990 || year > 2200) {
        return "year must be a four-digit year";
      }
    }
    const names = new Map(db.listCompanyProfiles().map((company) => [company.id, company.name]));
    return (0, import_revenue_report.evaluateRevenueByCompany)(db.allInvoices(), names, year);
  };
  app.get(
    "/api/reports/revenue-by-company",
    route((req, res) => {
      const report = revenueReport(req.query);
      if (typeof report === "string") {
        res.status(400).json({ error: report });
        return;
      }
      res.json(report);
    })
  );
  app.get(
    "/api/reports/revenue-by-company.csv",
    route((req, res) => {
      const report = revenueReport(req.query);
      if (typeof report === "string") {
        res.status(400).json({ error: report });
        return;
      }
      res.type("text/csv; charset=utf-8");
      res.set("Content-Disposition", (0, import_attachments.attachmentDisposition)("umsatz-je-firma.csv"));
      res.send((0, import_csv.renderRevenueCsv)(report));
    })
  );
  app.get(
    "/api/reports/revenue-by-company.xlsx",
    route(async (req, res) => {
      const report = revenueReport(req.query);
      if (typeof report === "string") {
        res.status(400).json({ error: report });
        return;
      }
      const buffer = await (0, import_excel.renderRevenueWorkbook)(report);
      res.type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.set("Content-Disposition", (0, import_attachments.attachmentDisposition)("umsatz-je-firma.xlsx"));
      res.send(buffer);
    })
  );
  app.get(
    "/api/open-items",
    route((req, res) => {
      const options = openItemsOptions(req.query);
      if (typeof options === "string") {
        res.status(400).json({ error: options });
        return;
      }
      res.json((0, import_open_items.evaluateOpenItems)(db.allInvoices(), options));
    })
  );
  app.get(
    "/api/open-items.csv",
    route((req, res) => {
      const options = openItemsOptions(req.query);
      if (typeof options === "string") {
        res.status(400).json({ error: options });
        return;
      }
      res.type("text/csv; charset=utf-8");
      res.set("Content-Disposition", (0, import_attachments.attachmentDisposition)("offene-posten.csv"));
      res.send((0, import_csv.renderOpenItemsCsv)((0, import_open_items.evaluateOpenItems)(db.allInvoices(), options)));
    })
  );
  app.get(
    "/api/open-items.xlsx",
    route(async (req, res) => {
      const options = openItemsOptions(req.query);
      if (typeof options === "string") {
        res.status(400).json({ error: options });
        return;
      }
      const buffer = await (0, import_excel.renderOpenItemsWorkbook)((0, import_open_items.evaluateOpenItems)(db.allInvoices(), options));
      res.type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.set("Content-Disposition", (0, import_attachments.attachmentDisposition)("offene-posten.xlsx"));
      res.send(buffer);
    })
  );
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
      res.set("Content-Disposition", (0, import_attachments.attachmentDisposition)(`${(_a2 = invoice.number) != null ? _a2 : invoice.id}.xml`));
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
      if (!isContainedRelPath(invoice.pdfPath)) {
        res.status(404).json({ error: "Stored PDF path is invalid" });
        return;
      }
      try {
        const data = await storage.read(invoice.pdfPath);
        res.type("application/pdf");
        res.set("Content-Disposition", (0, import_attachments.attachmentDisposition)(`${(_a2 = invoice.number) != null ? _a2 : invoice.id}.pdf`, "inline"));
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
      if (!isContainedRelPath(invoice.xlsxPath)) {
        res.status(404).json({ error: "Stored Excel path is invalid" });
        return;
      }
      try {
        const data = await storage.read(invoice.xlsxPath);
        res.type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.set("Content-Disposition", (0, import_attachments.attachmentDisposition)(`${(_a2 = invoice.number) != null ? _a2 : invoice.id}.xlsx`));
        res.send(data);
      } catch {
        res.status(404).json({ error: `Artifact file missing: ${invoice.xlsxPath}` });
      }
    })
  );
  app.get(
    "/api/invoices/:id/validation",
    route((req, res) => {
      const id = routeParam(req, "id");
      if (!db.getInvoice(id)) {
        res.status(404).json({ error: "Invoice not found" });
        return;
      }
      res.json(db.listValidationReports(id));
    })
  );
  app.get(
    "/api/invoices/:id/validation/:seq.json",
    route(async (req, res) => {
      const id = routeParam(req, "id");
      const seq = Number(routeParam(req, "seq"));
      const report = db.listValidationReports(id).find((entry) => entry.seq === seq);
      if (!report) {
        res.status(404).json({ error: "Validation report not found" });
        return;
      }
      if (!isContainedRelPath(report.reportPath)) {
        res.status(500).json({ error: "Stored report path is invalid" });
        return;
      }
      try {
        const data = await storage.read(report.reportPath);
        res.type("application/json");
        res.set("Content-Disposition", (0, import_attachments.attachmentDisposition)(`validation-${seq}.json`));
        res.send(data);
      } catch {
        res.status(404).json({ error: `Artifact file missing: ${report.reportPath}` });
      }
    })
  );
  app.get(
    "/api/invoices/:id/attachments",
    route((req, res) => {
      const id = routeParam(req, "id");
      if (!db.getInvoice(id)) {
        res.status(404).json({ error: "Invoice not found" });
        return;
      }
      res.json(db.listAttachmentMeta(id));
    })
  );
  app.post(
    "/api/invoices/:id/attachments",
    route((req, res) => {
      var _a2;
      const id = routeParam(req, "id");
      const body = (_a2 = req.body) != null ? _a2 : {};
      if (typeof body.filename !== "string" || typeof body.dataBase64 !== "string") {
        res.status(400).json({ error: "Body needs filename and dataBase64 (mime is optional)" });
        return;
      }
      try {
        const stored = db.addAttachment(id, {
          filename: body.filename,
          mime: typeof body.mime === "string" ? body.mime : "",
          data: Buffer.from(body.dataBase64, "base64")
        });
        log.info(`Attachment stored for ${id}: ${stored.filename} (${stored.size} bytes)`);
        res.status(201).json({
          id: stored.id,
          invoiceId: stored.invoiceId,
          filename: stored.filename,
          mime: stored.mime,
          size: stored.size,
          createdAt: stored.createdAt
        });
      } catch (error) {
        res.status(isMissingError(error) ? 404 : 400).json({ error: error.message });
      }
    })
  );
  app.get(
    "/api/invoices/:id/attachments/:aid",
    route((req, res) => {
      const attachmentId = routeIdParam(req, "aid");
      if (attachmentId === void 0) {
        res.status(400).json({ error: "Attachment id must be a positive integer" });
        return;
      }
      const attachment = db.getAttachment(routeParam(req, "id"), attachmentId);
      if (!attachment) {
        res.status(404).json({ error: "Attachment not found" });
        return;
      }
      res.type(attachment.mime);
      res.set("Content-Disposition", (0, import_attachments.attachmentDisposition)(attachment.filename));
      res.send(attachment.data);
    })
  );
  app.delete(
    "/api/invoices/:id/attachments/:aid",
    route((req, res) => {
      const attachmentId = routeIdParam(req, "aid");
      if (attachmentId === void 0) {
        res.status(400).json({ error: "Attachment id must be a positive integer" });
        return;
      }
      try {
        db.deleteAttachment(routeParam(req, "id"), attachmentId);
        res.status(204).end();
      } catch (error) {
        res.status(isMissingError(error) ? 404 : 400).json({ error: error.message });
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
  app.post(
    "/api/invoices/:id/quote-accept",
    route((req, res) => {
      var _a2;
      const body = (_a2 = req.body) != null ? _a2 : {};
      if (body.at !== void 0 && typeof body.at !== "string") {
        res.status(400).json({ error: "at must be an ISO timestamp" });
        return;
      }
      try {
        const updated = db.setQuoteDecision(routeParam(req, "id"), "accepted", {
          at: typeof body.at === "string" ? body.at : void 0
        });
        log.info(`Quotation accepted: ${updated.number} (${updated.id})`);
        res.json(updated);
      } catch (error) {
        res.status(isMissingError(error) ? 404 : 400).json({ error: error.message });
      }
    })
  );
  app.post(
    "/api/invoices/:id/quote-reject",
    route((req, res) => {
      var _a2;
      const body = (_a2 = req.body) != null ? _a2 : {};
      if (body.at !== void 0 && typeof body.at !== "string") {
        res.status(400).json({ error: "at must be an ISO timestamp" });
        return;
      }
      if (body.reason !== void 0 && typeof body.reason !== "string") {
        res.status(400).json({ error: "reason must be a string" });
        return;
      }
      try {
        const updated = db.setQuoteDecision(routeParam(req, "id"), "rejected", {
          at: typeof body.at === "string" ? body.at : void 0,
          reason: typeof body.reason === "string" ? body.reason : void 0
        });
        log.info(`Quotation rejected: ${updated.number} (${updated.id})`);
        res.json(updated);
      } catch (error) {
        res.status(isMissingError(error) ? 404 : 400).json({ error: error.message });
      }
    })
  );
  app.post(
    "/api/invoices/:id/convert",
    route((req, res) => {
      var _a2;
      const body = (_a2 = req.body) != null ? _a2 : {};
      if (body.requireAccepted !== void 0 && typeof body.requireAccepted !== "boolean") {
        res.status(400).json({ error: "requireAccepted must be a boolean" });
        return;
      }
      const bad = findShapeError(body, { seller: "object", buyer: "object", lines: "array" });
      if (bad) {
        res.status(400).json({ error: bad });
        return;
      }
      const { requireAccepted, ...patch } = body;
      try {
        const created = db.convertQuoteToInvoice(routeParam(req, "id"), patch, {
          requireAccepted: requireAccepted !== false
        });
        log.info(`Quotation ${routeParam(req, "id")} converted to draft ${created.id}`);
        res.status(201).json(created);
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
  app.get(
    "/api/dunning/texts",
    route((_req, res) => {
      res.json(db.listDunningTexts());
    })
  );
  app.put(
    "/api/dunning/texts/:level",
    route((req, res) => {
      var _a2;
      try {
        res.json(
          db.saveDunningText(Number(routeParam(req, "level")), (_a2 = req.body) != null ? _a2 : {})
        );
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    })
  );
  app.delete(
    "/api/dunning/texts/:level",
    route((req, res) => {
      try {
        res.json(db.resetDunningText(Number(routeParam(req, "level"))));
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    })
  );
  const dunningSuggestions = () => {
    return (0, import_dunning.buildDunningSuggestions)((0, import_issue_service.collectReminderCandidates)(db), db.listDunningTexts(), (0, import_invoice_model.todayIso)());
  };
  app.get(
    "/api/dunning/suggestions",
    route((_req, res) => {
      res.json(dunningSuggestions());
    })
  );
  app.get(
    "/api/dunning/suggestions.csv",
    route((_req, res) => {
      res.type("text/csv; charset=utf-8");
      res.set("Content-Disposition", (0, import_attachments.attachmentDisposition)("mahnvorschlaege.csv"));
      res.send((0, import_csv.renderDunningCsv)(dunningSuggestions(), (0, import_invoice_model.todayIso)()));
    })
  );
  app.get(
    "/api/dunning/suggestions.pdf",
    route(async (_req, res) => {
      const buffer = await (0, import_dunning_pdf.renderDunningPdf)(dunningSuggestions(), (0, import_invoice_model.todayIso)());
      res.type("application/pdf");
      res.set("Content-Disposition", (0, import_attachments.attachmentDisposition)("mahnungen.pdf"));
      res.send(buffer);
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
  app.put(
    "/api/invoice-templates/:id",
    route((req, res) => {
      var _a2, _b2;
      const body = (_a2 = req.body) != null ? _a2 : {};
      try {
        res.json(
          db.updateInvoiceTemplate(routeParam(req, "id"), {
            name: typeof body.name === "string" ? body.name : void 0,
            body: (_b2 = body.body) != null ? _b2 : void 0
          })
        );
      } catch (error) {
        res.status(isMissingError(error) ? 404 : 400).json({ error: error.message });
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
  app.post(
    "/api/invoices/:id/as-template",
    route((req, res) => {
      var _a2, _b2, _c2, _d2, _e2, _f2;
      const invoice = db.getInvoice(routeParam(req, "id"));
      if (!invoice) {
        res.status(404).json({ error: "Invoice not found" });
        return;
      }
      const body = (_a2 = req.body) != null ? _a2 : {};
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (!name) {
        res.status(400).json({ error: "name is required" });
        return;
      }
      try {
        res.status(201).json(
          db.createInvoiceTemplate(name, {
            seller: invoice.seller,
            // a placeholder the user replaces per invoice (BT-10 is mandatory)
            buyer: invoice.buyer,
            lines: invoice.lines,
            issueDate: invoice.issueDate,
            deliveryDate: invoice.deliveryDate,
            dueDate: (_b2 = invoice.dueDate) != null ? _b2 : void 0,
            currency: "EUR",
            documentTitle: invoice.documentTitle,
            notes: (_c2 = invoice.notes) != null ? _c2 : void 0,
            paymentTerms: (_d2 = invoice.paymentTerms) != null ? _d2 : void 0,
            skontoPercent: Number(invoice.skontoPercent) || 0,
            skontoDueDate: (_e2 = invoice.skontoDueDate) != null ? _e2 : void 0,
            employeeCode: (_f2 = invoice.employeeCode) != null ? _f2 : void 0
          })
        );
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    })
  );
  app.post(
    "/api/invoices/:id/rerender",
    route(async (req, res) => {
      var _a2;
      const body = (_a2 = req.body) != null ? _a2 : {};
      const reason = typeof body.reason === "string" && body.reason.trim() ? body.reason.trim() : null;
      if (body.layout !== void 0 && body.layout !== "issued" && body.layout !== "current") {
        res.status(400).json({ error: 'layout must be "issued" or "current"' });
        return;
      }
      try {
        const outcome = await (0, import_issue_service.rerenderInvoicePdf)(db, log, routeParam(req, "id"), storage, reason, {
          layout: body.layout
        });
        res.json({ invoice: outcome.invoice, archivedPath: outcome.archivedPath, layout: outcome.layout });
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
      let result;
      if (businessErrors.length > 0) {
        result = { formatErrors: [], businessErrors };
      } else if ((0, import_invoice_model.isQuote)(invoice.docType)) {
        result = { formatErrors: [], businessErrors: [] };
      } else {
        try {
          const preview = previewInvoice(draft);
          const { xml } = await (0, import_zugferd.generateInvoiceXml)(preview);
          result = await (0, import_validation.validateArtifacts)(preview, xml);
        } catch (error) {
          result = { formatErrors: [error.message], businessErrors };
        }
      }
      const report = await storeValidationReport(db, storage, log, invoice, result);
      res.json({ ...result, report });
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
        res.set("Content-Disposition", (0, import_attachments.attachmentDisposition)(name));
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
        res.json(
          await (0, import_backup.restoreBackup)(db, storage, data, log, void 0, { adapterVersion: version, source: "api" })
        );
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
    app.get("/favicon.ico", (_req, res) => {
      const ico = (0, import_node_path.join)(dir, "favicon.ico");
      const png = (0, import_node_path.join)(dir, "icons", "icon-192.png");
      if ((0, import_node_fs.existsSync)(ico)) {
        res.type("image/x-icon").sendFile(ico);
        return;
      }
      if ((0, import_node_fs.existsSync)(png)) {
        res.type("image/png").sendFile(png);
        return;
      }
      res.status(404).end();
    });
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
