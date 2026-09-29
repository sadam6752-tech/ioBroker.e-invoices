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
var import_excel = require("./excel");
var import_pdf = require("./pdf");
var import_templates = require("./templates");
var import_validation = require("./validation");
var import_zugferd = require("./zugferd");
function previewInvoice(draft) {
  var _a, _b, _c, _d, _e;
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
  const { db, storage, log, version, authToken } = deps;
  const app = (0, import_express.default)();
  app.disable("x-powered-by");
  app.use(import_express.default.json({ limit: "25mb" }));
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
      var _a;
      const input = (_a = req.body) != null ? _a : {};
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
    const status = typeof req.query.status === "string" ? req.query.status : void 0;
    const year = typeof req.query.year === "string" ? Number(req.query.year) : void 0;
    const query = typeof req.query.q === "string" ? req.query.q : void 0;
    const invoices = db.listInvoices({ status, year, query, limit: 500 });
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
      var _a;
      const invoice = db.getInvoice(routeParam(req, "id"));
      if (!(invoice == null ? void 0 : invoice.xml)) {
        res.status(404).json({ error: "No XML for this invoice (not issued yet?)" });
        return;
      }
      res.type("application/xml");
      res.set("Content-Disposition", `attachment; filename="${(_a = invoice.number) != null ? _a : invoice.id}.xml"`);
      res.send(invoice.xml);
    })
  );
  app.get(
    "/api/invoices/:id.pdf",
    route(async (req, res) => {
      var _a;
      const invoice = db.getInvoice(routeParam(req, "id"));
      if (!(invoice == null ? void 0 : invoice.pdfPath)) {
        res.status(404).json({ error: "No PDF for this invoice (not issued yet?)" });
        return;
      }
      try {
        const data = await storage.read(invoice.pdfPath);
        res.type("application/pdf");
        res.set("Content-Disposition", `inline; filename="${(_a = invoice.number) != null ? _a : invoice.id}.pdf"`);
        res.send(data);
      } catch {
        res.status(404).json({ error: `Artifact file missing: ${invoice.pdfPath}` });
      }
    })
  );
  app.get(
    "/api/invoices/:id.xlsx",
    route(async (req, res) => {
      var _a;
      const invoice = db.getInvoice(routeParam(req, "id"));
      if (!(invoice == null ? void 0 : invoice.xlsxPath)) {
        res.status(404).json({ error: "No Excel copy for this invoice (not issued yet?)" });
        return;
      }
      try {
        const data = await storage.read(invoice.xlsxPath);
        res.type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.set("Content-Disposition", `attachment; filename="${(_a = invoice.number) != null ? _a : invoice.id}.xlsx"`);
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
  app.patch(
    "/api/invoices/:id",
    route((req, res) => {
      var _a;
      const patch = (_a = req.body) != null ? _a : {};
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
      var _a;
      const body = (_a = req.body) != null ? _a : {};
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
      var _a, _b, _c;
      const body = (_a = req.body) != null ? _a : {};
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
        const company = (_b = db.getCompanyProfile(companyId)) != null ? _b : db.getDefaultCompanyProfile();
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
      if (((_c = definition.logo) == null ? void 0 : _c.path) && isContainedRelPath(definition.logo.path)) {
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
      var _a;
      const body = (_a = req.body) != null ? _a : {};
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
      var _a, _b, _c, _d, _e, _f;
      const template = db.getTemplate(routeParam(req, "tid"));
      if (!template) {
        res.status(404).json({ error: "Template not found" });
        return;
      }
      const body = (_a = req.body) != null ? _a : {};
      if (typeof body.filename !== "string" || typeof body.mime !== "string" || typeof body.dataBase64 !== "string") {
        res.status(400).json({ error: "Body needs filename, mime and dataBase64" });
        return;
      }
      const ext = (_b = body.filename.split(".").pop()) == null ? void 0 : _b.toLowerCase();
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
                position: (_d = (_c = template.definition.logo) == null ? void 0 : _c.position) != null ? _d : "right",
                widthMm: (_f = (_e = template.definition.logo) == null ? void 0 : _e.widthMm) != null ? _f : 30
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
    "/api/restore",
    route(async (req, res) => {
      var _a, _b;
      const body = (_a = req.body) != null ? _a : {};
      let data;
      if (typeof body.dataBase64 === "string" && body.dataBase64.length > 0) {
        try {
          data = Buffer.from(body.dataBase64, "base64");
        } catch {
          res.status(400).json({ error: "dataBase64 is not valid base64" });
          return;
        }
      } else if (typeof body.filename === "string" && body.filename.length > 0) {
        const name = (_b = body.filename.split("/").pop()) != null ? _b : "";
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
      var _a;
      const body = (_a = req.body) != null ? _a : {};
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
      var _a;
      const body = (_a = req.body) != null ? _a : {};
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
  app.get("/api/customers", (_req, res) => {
    res.json(db.listCustomers());
  });
  app.post(
    "/api/customers",
    route((req, res) => {
      var _a;
      const body = (_a = req.body) != null ? _a : {};
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
      var _a;
      const body = (_a = req.body) != null ? _a : {};
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
      var _a;
      try {
        res.status(201).json(db.createProduct((_a = req.body) != null ? _a : {}));
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
      var _a;
      try {
        res.json(db.updateProduct(routeParam(req, "pid"), (_a = req.body) != null ? _a : {}));
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
    var _a, _b, _c, _d;
    const err = error;
    const status = (_b = (_a = err == null ? void 0 : err.status) != null ? _a : err == null ? void 0 : err.statusCode) != null ? _b : 500;
    const message = status < 500 ? String((_c = err == null ? void 0 : err.message) != null ? _c : "Request failed") : "Internal server error";
    log.error(`API error (${status}): ${String((_d = err == null ? void 0 : err.message) != null ? _d : error)}`);
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
