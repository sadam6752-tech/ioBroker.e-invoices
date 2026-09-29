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
var db_exports = {};
__export(db_exports, {
  InvoiceDatabase: () => InvoiceDatabase
});
module.exports = __toCommonJS(db_exports);
var import_better_sqlite3 = __toESM(require("better-sqlite3"));
var import_node_crypto = require("node:crypto");
var import_node_fs = require("node:fs");
var import_node_path = require("node:path");
var import_invoice_model = require("./invoice-model");
var import_migrations = require("./migrations");
var import_templates = require("./templates");
function nowIso() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
function parseJson(value, label) {
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`Corrupt ${label} JSON in database`);
  }
}
function mapRow(row) {
  var _a, _b, _c;
  return {
    id: row.id,
    number: row.number,
    issueDate: row.issue_date,
    deliveryDate: row.delivery_date,
    dueDate: row.due_date,
    seller: parseJson(row.seller_json, "seller"),
    buyer: parseJson(row.buyer_json, "buyer"),
    lines: parseJson(row.lines_json, "lines"),
    totals: parseJson(row.totals_json, "totals"),
    profile: row.profile,
    status: row.status,
    templateId: row.template_id,
    documentTitle: row.document_title,
    notes: row.notes,
    employeeCode: (_a = row.employee_code) != null ? _a : null,
    paymentTerms: (_b = row.payment_terms) != null ? _b : null,
    xml: row.xml,
    pdfPath: row.pdf_path,
    xlsxPath: row.xlsx_path,
    paid: row.paid === 1,
    paidAt: row.paid_at,
    stornoOfId: row.storno_of_id,
    skontoPercent: (_c = row.skonto_percent) != null ? _c : 0,
    skontoDueDate: row.skonto_due_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
function mapTemplateRow(row) {
  return {
    id: row.id,
    name: row.name,
    version: row.version,
    definition: parseJson(row.definition_json, "template"),
    isDefault: row.is_default === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
function mapCompanyRow(row) {
  return {
    id: row.id,
    name: row.name,
    profile: parseJson(row.profile_json, "company"),
    isDefault: row.is_default === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
function mapCustomerRow(row) {
  return {
    id: row.id,
    name: row.name,
    profile: parseJson(row.profile_json, "customer"),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
function mapProductRow(row) {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    details: row.details,
    unit: row.unit,
    unitPriceNet: row.unit_price_net,
    vatRate: row.vat_rate,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
class InvoiceDatabase {
  db;
  /** Invoice number format from the instance config. */
  numberFormat = import_invoice_model.DEFAULT_NUMBER_FORMAT;
  /**
   * Opens (and creates) the SQLite file.
   *
   * @param dbPath - Absolute path to `invoices.db`.
   */
  constructor(dbPath) {
    (0, import_node_fs.mkdirSync)((0, import_node_path.dirname)(dbPath), { recursive: true });
    this.db = new import_better_sqlite3.default(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    this.db.pragma("busy_timeout = 5000");
  }
  /**
   * Applies the instance configuration that influences numbering.
   * An invalid format is rejected here so the adapter can warn once.
   *
   * @param options - Adapter options from the instance config.
   * @param options.numberFormat - Desired invoice number pattern.
   */
  applyOptions(options) {
    var _a;
    this.numberFormat = (_a = options.numberFormat) != null ? _a : import_invoice_model.DEFAULT_NUMBER_FORMAT;
  }
  /**
   * The number format actually in use (falls back to the default when the
   * configured one was rejected).
   *
   * @returns A validated format string.
   */
  effectiveNumberFormat() {
    var _a;
    return (_a = (0, import_invoice_model.normalizeNumberFormat)(this.numberFormat)) != null ? _a : import_invoice_model.DEFAULT_NUMBER_FORMAT;
  }
  /** Closes the database handle. */
  close() {
    this.db.close();
  }
  /**
   * Lists column names of a table (schema introspection for tests/migrations).
   *
   * @param table - Table name.
   */
  tableColumns(table) {
    const rows = this.db.prepare(`PRAGMA table_info(${table})`).all();
    return rows.map((row) => row.name);
  }
  /** Current applied schema version (0 when fresh). */
  currentVersion() {
    var _a;
    const row = this.db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migrations'`).get();
    if (!row) {
      return 0;
    }
    const max = this.db.prepare(`SELECT MAX(version) AS v FROM schema_migrations`).get();
    return (_a = max.v) != null ? _a : 0;
  }
  /**
   * Applies all pending migrations in order, each in its own transaction.
   */
  migrate() {
    const current = this.currentVersion();
    for (const migration of import_migrations.MIGRATIONS) {
      if (migration.version <= current) {
        continue;
      }
      const apply = this.db.transaction(() => {
        for (const statement of migration.sql) {
          this.db.exec(statement);
        }
        this.db.prepare(`INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)`).run(migration.version, migration.name, nowIso());
      });
      apply();
    }
    if (this.currentVersion() !== import_migrations.LATEST_SCHEMA_VERSION) {
      throw new Error("Migration did not reach latest schema version");
    }
  }
  /**
   * Reserves the next invoice number for a year+employee atomically
   * (`YYYY-EE-NNN`).
   *
   * @param year - Calendar year, e.g. 2026.
   * @param employee - Employee code, defaults to `00`.
   */
  nextInvoiceNumber(year, employee) {
    var _a;
    if (!Number.isInteger(year) || year < 2e3 || year > 2100) {
      throw new Error(`Invalid year: ${year}`);
    }
    const code = (0, import_invoice_model.normalizeEmployeeCode)(employee);
    const format = (_a = (0, import_invoice_model.normalizeNumberFormat)(this.numberFormat)) != null ? _a : import_invoice_model.DEFAULT_NUMBER_FORMAT;
    const run = this.db.transaction(() => {
      var _a2;
      const row = this.db.prepare(`SELECT last_seq AS seq FROM counters WHERE year = ? AND employee = ?`).get(year, code);
      const next = ((_a2 = row == null ? void 0 : row.seq) != null ? _a2 : 0) + 1;
      this.db.prepare(
        `INSERT INTO counters (year, employee, last_seq) VALUES (?, ?, ?)
					ON CONFLICT(year, employee) DO UPDATE SET last_seq = excluded.last_seq`
      ).run(year, code, next);
      return format === import_invoice_model.DEFAULT_NUMBER_FORMAT ? (0, import_invoice_model.formatInvoiceNumber)(year, code, next) : (0, import_invoice_model.renderInvoiceNumber)(format, { year, employee: code, seq: next });
    });
    return run();
  }
  /**
   * Creates a new draft (may be incomplete; validation happens at issue).
   *
   * @param input - Draft content.
   */
  createDraft(input) {
    var _a, _b, _c, _d, _e, _f;
    const id = (0, import_node_crypto.randomUUID)();
    const stamp = nowIso();
    const totals = (0, import_invoice_model.calcTotals)(input.lines.length > 0 ? input.lines : []);
    this.db.prepare(
      `INSERT INTO invoices
				(id, number, issue_date, delivery_date, due_date, seller_json, buyer_json, lines_json, totals_json, profile, status, template_id, document_title, notes, payment_terms, employee_code, skonto_percent, skonto_due_date, created_at, updated_at)
				VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, 'EN16931', 'draft', NULL, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      input.issueDate,
      input.deliveryDate,
      (_a = input.dueDate) != null ? _a : null,
      JSON.stringify(input.seller),
      JSON.stringify(input.buyer),
      JSON.stringify(input.lines),
      JSON.stringify(totals),
      (_b = input.documentTitle) != null ? _b : "Rechnung",
      (_c = input.notes) != null ? _c : null,
      (_d = input.paymentTerms) != null ? _d : null,
      ((_e = input.employeeCode) == null ? void 0 : _e.trim()) ? (0, import_invoice_model.normalizeEmployeeCode)(input.employeeCode) : null,
      Number(input.skontoPercent) || 0,
      ((_f = input.skontoDueDate) == null ? void 0 : _f.trim()) || null,
      stamp,
      stamp
    );
    const created = this.getInvoice(id);
    if (!created) {
      throw new Error("Draft was not stored");
    }
    return created;
  }
  /**
   * Loads one invoice by id.
   *
   * @param id - Invoice UUID.
   */
  getInvoice(id) {
    const row = this.db.prepare(`SELECT * FROM invoices WHERE id = ?`).get(id);
    return row ? mapRow(row) : null;
  }
  /**
   * Lists invoices newest first with optional filters.
   *
   * @param filter - Status/year/search/pagination filter.
   */
  listInvoices(filter = {}) {
    const where = [];
    const params = [];
    if (filter.status) {
      where.push(`status = ?`);
      params.push(filter.status);
    }
    if (filter.year) {
      where.push(`substr(issue_date, 1, 4) = ?`);
      params.push(String(filter.year));
    }
    if (filter.query) {
      where.push(`(number LIKE ? OR buyer_json LIKE ? OR seller_json LIKE ?)`);
      const like = `%${filter.query}%`;
      params.push(like, like, like);
    }
    const rawLimit = Number(filter.limit);
    const rawOffset = Number(filter.offset);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(Math.trunc(rawLimit), 1), 500) : 50;
    const offset = Number.isFinite(rawOffset) ? Math.max(Math.trunc(rawOffset), 0) : 0;
    const rows = this.db.prepare(
      `SELECT * FROM invoices ${where.length > 0 ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`
    ).all(...params, limit, offset);
    return rows.map(mapRow);
  }
  /**
   * All invoices, newest first, without the list page limit.
   * Used by the backup so a restore can never silently drop records.
   *
   * @returns - Every stored invoice.
   */
  allInvoices() {
    const rows = this.db.prepare(`SELECT * FROM invoices ORDER BY created_at DESC, id DESC`).all();
    return rows.map(mapRow);
  }
  /**
   * Updates a draft; issued/cancelled invoices are immutable.
   *
   * @param id - Invoice UUID.
   * @param patch - Partial draft content.
   */
  updateDraft(id, patch) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m;
    const current = this.getInvoice(id);
    if (!current) {
      throw new Error(`Invoice not found: ${id}`);
    }
    if (current.status !== "draft") {
      throw new Error("Only drafts can be edited; issued invoices need a correction invoice.");
    }
    const pick = (next, fallback) => {
      var _a2;
      return next === null || next === "" ? void 0 : (_a2 = next != null ? next : fallback) != null ? _a2 : void 0;
    };
    const merged = {
      seller: (_a = patch.seller) != null ? _a : current.seller,
      buyer: (_b = patch.buyer) != null ? _b : current.buyer,
      lines: (_c = patch.lines) != null ? _c : current.lines,
      issueDate: (_d = patch.issueDate) != null ? _d : current.issueDate,
      deliveryDate: (_e = patch.deliveryDate) != null ? _e : current.deliveryDate,
      dueDate: pick(patch.dueDate, current.dueDate),
      currency: "EUR",
      employeeCode: pick(patch.employeeCode, current.employeeCode),
      paymentTerms: pick(patch.paymentTerms, current.paymentTerms),
      documentTitle: (_f = patch.documentTitle) != null ? _f : current.documentTitle,
      notes: pick(patch.notes, current.notes),
      skontoPercent: (_g = patch.skontoPercent) != null ? _g : current.skontoPercent,
      skontoDueDate: pick(patch.skontoDueDate, current.skontoDueDate)
    };
    const totals = (0, import_invoice_model.calcTotals)(merged.lines.length > 0 ? merged.lines : []);
    this.db.prepare(
      `UPDATE invoices SET issue_date = ?, delivery_date = ?, due_date = ?, seller_json = ?, buyer_json = ?,
				lines_json = ?, totals_json = ?, document_title = ?, notes = ?, payment_terms = ?, employee_code = ?,
				skonto_percent = ?, skonto_due_date = ?, updated_at = ? WHERE id = ?`
    ).run(
      merged.issueDate,
      merged.deliveryDate,
      (_h = merged.dueDate) != null ? _h : null,
      JSON.stringify(merged.seller),
      JSON.stringify(merged.buyer),
      JSON.stringify(merged.lines),
      JSON.stringify(totals),
      (_i = merged.documentTitle) != null ? _i : "Rechnung",
      (_j = merged.notes) != null ? _j : null,
      (_k = merged.paymentTerms) != null ? _k : null,
      ((_l = merged.employeeCode) == null ? void 0 : _l.trim()) ? (0, import_invoice_model.normalizeEmployeeCode)(merged.employeeCode) : null,
      Number(merged.skontoPercent) || 0,
      ((_m = merged.skontoDueDate) == null ? void 0 : _m.trim()) || null,
      nowIso(),
      id
    );
    const updated = this.getInvoice(id);
    if (!updated) {
      throw new Error("Draft update failed");
    }
    return updated;
  }
  /**
   * Issues a draft: validates Pflichtangaben, assigns the next number
   * (`YYYY-EE-NNN` from issue year + employee code) atomically and
   * freezes the record. File paths are attached later
   * by the P2/P3 generation step via attachIssueArtifacts().
   *
   * @param id - Draft UUID.
   */
  issueDraft(id) {
    var _a, _b, _c;
    const current = this.getInvoice(id);
    if (!current) {
      throw new Error(`Invoice not found: ${id}`);
    }
    if (current.status !== "draft") {
      throw new Error("Only drafts can be issued.");
    }
    const year = Number(current.issueDate.slice(0, 4));
    if (!Number.isInteger(year)) {
      throw new Error(`Invalid issue year in ${current.issueDate}`);
    }
    const errors = (0, import_invoice_model.validateInvoiceForIssue)({
      seller: current.seller,
      buyer: current.buyer,
      lines: current.lines,
      issueDate: current.issueDate,
      deliveryDate: current.deliveryDate,
      dueDate: (_a = current.dueDate) != null ? _a : void 0,
      currency: "EUR",
      employeeCode: (_b = current.employeeCode) != null ? _b : void 0,
      documentTitle: current.documentTitle,
      notes: (_c = current.notes) != null ? _c : void 0
    });
    if (errors.length > 0) {
      throw new Error(`Invoice not issuable: ${errors.join(" | ")}`);
    }
    const run = this.db.transaction(() => {
      var _a2;
      const number = this.nextInvoiceNumber(year, (_a2 = current.employeeCode) != null ? _a2 : void 0);
      this.db.prepare(
        `UPDATE invoices SET number = ?, status = 'issued', totals_json = ?, updated_at = ? WHERE id = ? AND status = 'draft'`
      ).run(number, JSON.stringify((0, import_invoice_model.calcTotals)(current.lines)), nowIso(), id);
      const issued = this.getInvoice(id);
      if (!issued || issued.number !== number) {
        throw new Error("Issue transaction failed");
      }
      return issued;
    });
    return run();
  }
  /**
   * Attaches generated artifacts (XML string + file paths) to an issued invoice.
   *
   * @param id - Issued invoice UUID.
   * @param artifacts - Generated output (XML plus file paths).
   */
  attachIssueArtifacts(id, artifacts) {
    var _a, _b;
    const current = this.getInvoice(id);
    if (!current) {
      throw new Error(`Invoice not found: ${id}`);
    }
    if (current.status !== "issued") {
      throw new Error("Artifacts can only be attached to issued invoices.");
    }
    this.db.prepare(
      `UPDATE invoices SET xml = ?, pdf_path = ?, xlsx_path = ?, template_id = ?, updated_at = ? WHERE id = ?`
    ).run(
      artifacts.xml,
      artifacts.pdfPath,
      (_a = artifacts.xlsxPath) != null ? _a : null,
      (_b = artifacts.templateId) != null ? _b : null,
      nowIso(),
      id
    );
    const updated = this.getInvoice(id);
    if (!updated) {
      throw new Error("Artifact update failed");
    }
    return updated;
  }
  /**
   * Marks an issued invoice as paid or unpaid. Payment state is bookkeeping
   * only — it never changes the frozen XML artifact (GoBD).
   *
   * @param id - Invoice UUID.
   * @param paid - New payment state.
   * @param paidAt - ISO date of the payment, defaults to now.
   */
  setPaid(id, paid, paidAt) {
    const current = this.getInvoice(id);
    if (!current) {
      throw new Error(`Invoice not found: ${id}`);
    }
    if (current.status === "draft") {
      throw new Error("Only issued invoices can be marked as paid.");
    }
    this.db.prepare(`UPDATE invoices SET paid = ?, paid_at = ?, updated_at = ? WHERE id = ?`).run(paid ? 1 : 0, paid ? (paidAt == null ? void 0 : paidAt.trim()) || nowIso() : null, nowIso(), id);
    const updated = this.getInvoice(id);
    if (!updated) {
      throw new Error("Payment update failed");
    }
    return updated;
  }
  /**
   * Reverses an issued invoice the GoBD way: a real credit note (Gutschrift)
   * with its own number is created as a draft, the original is marked
   * cancelled and both are linked. The original is never deleted or edited.
   *
   * @param id - Issed invoice UUID to reverse.
   * @param reason - Reason printed on the credit note.
   * @returns The linked credit-note draft and the cancelled original.
   */
  reverseInvoice(id, reason) {
    var _a, _b, _c, _d;
    const original = this.getInvoice(id);
    if (!original) {
      throw new Error(`Invoice not found: ${id}`);
    }
    if (original.status !== "issued") {
      throw new Error("Only issued invoices can be reversed (Storno).");
    }
    const existing = this.listInvoices({ status: "draft" }).find((draft) => draft.stornoOfId === id);
    if (existing) {
      throw new Error(`A Storno draft for ${original.number} already exists (${existing.id}).`);
    }
    const reversal = this.createDraft({
      seller: original.seller,
      buyer: original.buyer,
      lines: original.lines,
      issueDate: (0, import_invoice_model.todayIso)(),
      deliveryDate: original.deliveryDate,
      dueDate: (_a = original.dueDate) != null ? _a : void 0,
      currency: "EUR",
      employeeCode: (_b = original.employeeCode) != null ? _b : void 0,
      paymentTerms: (_c = original.paymentTerms) != null ? _c : void 0,
      skontoPercent: original.skontoPercent,
      skontoDueDate: (_d = original.skontoDueDate) != null ? _d : void 0,
      documentTitle: "Gutschrift",
      notes: `Storno zu Rechnung ${original.number}${(reason == null ? void 0 : reason.trim()) ? ` \u2013 ${reason.trim()}` : ""}`
    });
    const run = this.db.transaction(() => {
      this.db.prepare(`UPDATE invoices SET status = 'cancelled', updated_at = ? WHERE id = ? AND status = 'issued'`).run(nowIso(), id);
      this.db.prepare(`UPDATE invoices SET storno_of_id = ?, updated_at = ? WHERE id = ?`).run(id, nowIso(), reversal.id);
      const cancelled = this.getInvoice(id);
      if (!cancelled || cancelled.status !== "cancelled") {
        throw new Error("Storno transaction failed");
      }
      const linked = this.getInvoice(reversal.id);
      if (!linked || linked.stornoOfId !== id) {
        throw new Error("Storno link failed");
      }
      return { reversal: linked, original: cancelled };
    });
    return run();
  }
  /**
   * Cancels an issued invoice (placeholder for Storno; credit notes in P2).
   *
   * @param id - Issued invoice UUID.
   */
  cancelInvoice(id) {
    const current = this.getInvoice(id);
    if (!current) {
      throw new Error(`Invoice not found: ${id}`);
    }
    if (current.status !== "issued") {
      throw new Error("Only issued invoices can be cancelled.");
    }
    this.db.prepare(`UPDATE invoices SET status = 'cancelled', updated_at = ? WHERE id = ?`).run(nowIso(), id);
    const updated = this.getInvoice(id);
    if (!updated) {
      throw new Error("Cancel failed");
    }
    return updated;
  }
  /**
   * Counts invoices per status (dashboard).
   */
  countByStatus() {
    const rows = this.db.prepare(`SELECT status, COUNT(*) AS n FROM invoices GROUP BY status`).all();
    const result = { draft: 0, issued: 0, cancelled: 0 };
    for (const row of rows) {
      if (row.status === "draft" || row.status === "issued" || row.status === "cancelled") {
        result[row.status] = row.n;
      }
    }
    return result;
  }
  /**
   * Creates a layout template (validated by the Pflichtfeld-Wächter).
   *
   * @param name - Display name.
   * @param definition - Layout definition.
   */
  createTemplate(name, definition) {
    const errors = (0, import_templates.validateTemplate)({ ...definition, name });
    if (errors.length > 0) {
      throw new Error(`Invalid template: ${errors.join(" | ")}`);
    }
    const id = (0, import_node_crypto.randomUUID)();
    const stamp = nowIso();
    const hasAny = this.db.prepare(`SELECT COUNT(*) AS n FROM templates`).get().n > 0;
    this.db.prepare(
      `INSERT INTO templates (id, name, version, definition_json, is_default, created_at, updated_at)
				VALUES (?, ?, 1, ?, ?, ?, ?)`
    ).run(id, name.trim(), JSON.stringify({ ...definition, name: name.trim() }), hasAny ? 0 : 1, stamp, stamp);
    const created = this.getTemplate(id);
    if (!created) {
      throw new Error("Template was not stored");
    }
    return created;
  }
  /**
   * Loads one template by id.
   *
   * @param id - Template UUID.
   */
  getTemplate(id) {
    const row = this.db.prepare(`SELECT * FROM templates WHERE id = ?`).get(id);
    return row ? mapTemplateRow(row) : null;
  }
  /**
   * Lists templates, default first, then by name.
   */
  listTemplates() {
    const rows = this.db.prepare(`SELECT * FROM templates ORDER BY is_default DESC, name ASC`).all();
    return rows.map(mapTemplateRow);
  }
  /**
   * Returns the default template, if any.
   */
  getDefaultTemplate() {
    const row = this.db.prepare(`SELECT * FROM templates WHERE is_default = 1 LIMIT 1`).get();
    return row ? mapTemplateRow(row) : null;
  }
  /**
   * Creates the default template on first start (idempotent).
   */
  ensureDefaultTemplate() {
    const existing = this.getDefaultTemplate();
    if (existing) {
      return existing;
    }
    if (this.listTemplates().length === 0) {
      return this.createTemplate(import_templates.DEFAULT_TEMPLATE.name, import_templates.DEFAULT_TEMPLATE);
    }
    const first = this.listTemplates()[0];
    this.setDefaultTemplate(first.id);
    const updated = this.getDefaultTemplate();
    if (!updated) {
      throw new Error("Default template setup failed");
    }
    return updated;
  }
  /**
   * Updates name/definition (bumps version, revalidates).
   *
   * @param id - Template UUID.
   * @param patch - Partial update.
   */
  updateTemplate(id, patch) {
    var _a, _b, _c, _d, _e;
    const current = this.getTemplate(id);
    if (!current) {
      throw new Error(`Template not found: ${id}`);
    }
    const nextName = ((_a = patch.name) == null ? void 0 : _a.trim()) || current.name;
    const patchDef = (_b = patch.definition) != null ? _b : {};
    const next = {
      ...current.definition,
      ...patchDef,
      blocks: { ...current.definition.blocks, ...(_c = patchDef.blocks) != null ? _c : {} },
      colors: { ...current.definition.colors, ...(_d = patchDef.colors) != null ? _d : {} },
      name: ((_e = patchDef.name) == null ? void 0 : _e.trim()) || nextName
    };
    const errors = (0, import_templates.validateTemplate)(next);
    if (errors.length > 0) {
      throw new Error(`Invalid template: ${errors.join(" | ")}`);
    }
    this.db.prepare(
      `UPDATE templates SET name = ?, definition_json = ?, version = version + 1, updated_at = ? WHERE id = ?`
    ).run(nextName, JSON.stringify(next), nowIso(), id);
    const updated = this.getTemplate(id);
    if (!updated) {
      throw new Error("Template update failed");
    }
    return updated;
  }
  /**
   * Marks one template as default (atomic switch).
   *
   * @param id - Template UUID.
   */
  setDefaultTemplate(id) {
    const current = this.getTemplate(id);
    if (!current) {
      throw new Error(`Template not found: ${id}`);
    }
    const run = this.db.transaction(() => {
      this.db.prepare(`UPDATE templates SET is_default = 0`).run();
      this.db.prepare(`UPDATE templates SET is_default = 1, updated_at = ? WHERE id = ?`).run(nowIso(), id);
    });
    run();
    const updated = this.getTemplate(id);
    if (!updated) {
      throw new Error("Default switch failed");
    }
    return updated;
  }
  /**
   * Deletes a template (never the default, never when referenced).
   *
   * @param id - Template UUID.
   */
  deleteTemplate(id) {
    const current = this.getTemplate(id);
    if (!current) {
      throw new Error(`Template not found: ${id}`);
    }
    if (current.isDefault) {
      throw new Error("The default template cannot be deleted");
    }
    const refs = this.db.prepare(`SELECT COUNT(*) AS n FROM invoices WHERE template_id = ?`).get(id);
    if (refs.n > 0) {
      throw new Error("Template is referenced by issued invoices and cannot be deleted");
    }
    this.db.prepare(`DELETE FROM templates WHERE id = ?`).run(id);
  }
  /**
   * Adds a file attachment to an invoice (max 5 MB).
   *
   * @param invoiceId - Owning invoice UUID.
   * @param attachment - Filename, MIME type and content.
   */
  addAttachment(invoiceId, attachment) {
    if (!this.getInvoice(invoiceId)) {
      throw new Error(`Invoice not found: ${invoiceId}`);
    }
    if (attachment.filename.trim().length === 0 || attachment.data.length === 0) {
      throw new Error("Attachment needs a filename and content");
    }
    if (attachment.data.length > 5 * 1024 * 1024) {
      throw new Error("Attachment exceeds 5 MB");
    }
    const result = this.db.prepare(
      `INSERT INTO attachments (invoice_id, filename, mime, size, data, created_at)
				VALUES (?, ?, ?, ?, ?, ?)`
    ).run(invoiceId, attachment.filename, attachment.mime, attachment.data.length, attachment.data, nowIso());
    const row = this.db.prepare(`SELECT * FROM attachments WHERE id = ?`).get(result.lastInsertRowid);
    return {
      id: row.id,
      invoiceId: row.invoice_id,
      filename: row.filename,
      mime: row.mime,
      size: row.size,
      data: row.data,
      createdAt: row.created_at
    };
  }
  /**
   * Lists attachments of one invoice.
   *
   * @param invoiceId - Owning invoice UUID.
   */
  listAttachments(invoiceId) {
    const rows = this.db.prepare(`SELECT * FROM attachments WHERE invoice_id = ? ORDER BY id ASC`).all(invoiceId);
    return rows.map((row) => ({
      id: row.id,
      invoiceId: row.invoice_id,
      filename: row.filename,
      mime: row.mime,
      size: row.size,
      data: row.data,
      createdAt: row.created_at
    }));
  }
  /**
   * Exports the full database content for backups.
   */
  exportData() {
    const counters = this.db.prepare(`SELECT year, employee, last_seq FROM counters ORDER BY year ASC, employee ASC`).all();
    const attachments = this.db.prepare(`SELECT * FROM attachments ORDER BY id ASC`).all();
    return {
      formatVersion: 1,
      exportedAt: nowIso(),
      schemaVersion: this.currentVersion(),
      invoices: this.allInvoices(),
      counters,
      templates: this.listTemplates(),
      companies: this.listCompanyProfiles(),
      customers: this.listCustomers(),
      products: this.listProducts(),
      attachments: attachments.map((row) => ({
        id: row.id,
        invoiceId: row.invoice_id,
        filename: row.filename,
        mime: row.mime,
        size: row.size,
        data: row.data,
        createdAt: row.created_at
      }))
    };
  }
  /**
   * Replaces the full database content (restore path, transactional).
   * Validates the shape first so bad dumps fail before touching data.
   * A collection missing from the dump is kept as-is instead of being
   * wiped, so a partial/older backup can never destroy records silently.
   *
   * @param dump - Database content from a backup.
   */
  importData(dump) {
    if (!dump || dump.formatVersion !== 1 || !Array.isArray(dump.invoices) || !Array.isArray(dump.templates)) {
      throw new Error("Unsupported dump format");
    }
    for (const invoice of dump.invoices) {
      if (!invoice.id || !["draft", "issued", "cancelled"].includes(invoice.status) || !invoice.totals) {
        throw new Error(`Corrupt invoice in dump: ${String(invoice.id)}`);
      }
    }
    const has = (key) => Array.isArray(dump[key]);
    const run = this.db.transaction(() => {
      var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k;
      this.db.prepare(`DELETE FROM attachments`).run();
      this.db.prepare(`DELETE FROM invoices`).run();
      this.db.prepare(`DELETE FROM counters`).run();
      this.db.prepare(`DELETE FROM templates`).run();
      if (has("companies")) {
        this.db.prepare(`DELETE FROM company_profiles`).run();
      }
      if (has("customers")) {
        this.db.prepare(`DELETE FROM customers`).run();
      }
      if (has("products")) {
        this.db.prepare(`DELETE FROM products`).run();
      }
      for (const counter of (_a = dump.counters) != null ? _a : []) {
        const employee = (0, import_invoice_model.normalizeEmployeeCode)((_b = counter.employee) != null ? _b : "00");
        this.db.prepare(`INSERT INTO counters (year, employee, last_seq) VALUES (?, ?, ?)`).run(counter.year, employee, counter.last_seq);
      }
      for (const template of dump.templates) {
        this.db.prepare(
          `INSERT INTO templates (id, name, version, definition_json, is_default, created_at, updated_at)
						VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).run(
          template.id,
          template.name,
          template.version,
          JSON.stringify(template.definition),
          template.isDefault ? 1 : 0,
          template.createdAt,
          template.updatedAt
        );
      }
      for (const invoice of dump.invoices) {
        this.db.prepare(
          `INSERT INTO invoices
					(id, number, issue_date, delivery_date, due_date, seller_json, buyer_json, lines_json, totals_json,
					 profile, status, template_id, document_title, notes, payment_terms, employee_code, xml, pdf_path, xlsx_path,
					 paid, paid_at, storno_of_id, skonto_percent, skonto_due_date, created_at, updated_at)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          invoice.id,
          invoice.number,
          invoice.issueDate,
          invoice.deliveryDate,
          invoice.dueDate,
          JSON.stringify(invoice.seller),
          JSON.stringify(invoice.buyer),
          JSON.stringify(invoice.lines),
          JSON.stringify(invoice.totals),
          invoice.profile,
          invoice.status,
          invoice.templateId,
          invoice.documentTitle,
          invoice.notes,
          (_c = invoice.paymentTerms) != null ? _c : null,
          (_d = invoice.employeeCode) != null ? _d : null,
          invoice.xml,
          invoice.pdfPath,
          invoice.xlsxPath,
          invoice.paid ? 1 : 0,
          (_e = invoice.paidAt) != null ? _e : null,
          (_f = invoice.stornoOfId) != null ? _f : null,
          Number(invoice.skontoPercent) || 0,
          (_g = invoice.skontoDueDate) != null ? _g : null,
          invoice.createdAt,
          invoice.updatedAt
        );
      }
      for (const company of (_h = dump.companies) != null ? _h : []) {
        this.db.prepare(
          `INSERT INTO company_profiles (id, name, profile_json, is_default, created_at, updated_at)
						VALUES (?, ?, ?, ?, ?, ?)`
        ).run(
          company.id,
          company.name,
          JSON.stringify(company.profile),
          company.isDefault ? 1 : 0,
          company.createdAt,
          company.updatedAt
        );
      }
      for (const customer of (_i = dump.customers) != null ? _i : []) {
        this.db.prepare(
          `INSERT INTO customers (id, name, profile_json, created_at, updated_at)
						VALUES (?, ?, ?, ?, ?)`
        ).run(
          customer.id,
          customer.name,
          JSON.stringify(customer.profile),
          customer.createdAt,
          customer.updatedAt
        );
      }
      for (const product of (_j = dump.products) != null ? _j : []) {
        this.db.prepare(
          `INSERT INTO products (id, sku, name, details, unit, unit_price_net, vat_rate, created_at, updated_at)
						VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          product.id,
          product.sku,
          product.name,
          product.details,
          product.unit,
          product.unitPriceNet,
          product.vatRate,
          product.createdAt,
          product.updatedAt
        );
      }
      for (const attachment of (_k = dump.attachments) != null ? _k : []) {
        this.db.prepare(
          `INSERT INTO attachments (invoice_id, filename, mime, size, data, created_at)
						VALUES (?, ?, ?, ?, ?, ?)`
        ).run(
          attachment.invoiceId,
          attachment.filename,
          attachment.mime,
          attachment.size,
          attachment.data,
          attachment.createdAt
        );
      }
    });
    run();
  }
  /**
   * Logs a backup in the database.
   *
   * @param entry - Filename, size, hash and manifest.
   */
  logBackup(entry) {
    const id = (0, import_node_crypto.randomUUID)();
    const stamp = nowIso();
    this.db.prepare(
      `INSERT INTO backups (id, created_at, filename, size, sha256, manifest_json) VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, stamp, entry.filename, entry.size, entry.sha256, entry.manifestJson);
    return { id, createdAt: stamp, ...entry };
  }
  /**
   * Lists logged backups, newest first.
   */
  listBackups() {
    const rows = this.db.prepare(`SELECT * FROM backups ORDER BY created_at DESC`).all();
    return rows.map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      filename: row.filename,
      size: row.size,
      sha256: row.sha256,
      manifestJson: row.manifest_json
    }));
  }
  /**
   * Records that an issued invoice's artifacts were re-rendered. The original
   * file is archived rather than overwritten, so the delivered document stays
   * reproducible (GoBD) while a corrected rendering becomes available.
   *
   * @param invoiceId - Issued invoice UUID.
   * @param artifact - Which file was regenerated, e.g. `pdf`.
   * @param previousPath - Path of the archived original, if any.
   * @param newPath - Path of the freshly rendered file.
   * @param reason - Free text, stored for the audit trail.
   */
  logRender(invoiceId, artifact, previousPath, newPath, reason) {
    this.db.prepare(
      `INSERT INTO render_history (invoice_id, artifact, previous_path, new_path, reason, created_at) VALUES (?, ?, ?, ?, ?, ?)`
    ).run(invoiceId, artifact, previousPath, newPath, reason, nowIso());
  }
  /**
   * Lists the re-render history of an invoice, newest first.
   *
   * @param invoiceId - Issued invoice UUID.
   */
  listRenderHistory(invoiceId) {
    const rows = this.db.prepare(`SELECT * FROM render_history WHERE invoice_id = ? ORDER BY created_at DESC, id DESC`).all(invoiceId);
    return rows.map((row) => ({
      artifact: row.artifact,
      previousPath: row.previous_path,
      newPath: row.new_path,
      reason: row.reason,
      createdAt: row.created_at
    }));
  }
  /**
   * Creates a company (seller) profile; the first one becomes default.
   *
   * @param name - Display name.
   * @param profile - Seller party data.
   */
  createCompanyProfile(name, profile) {
    if (name.trim().length === 0) {
      throw new Error("Company profile needs a name");
    }
    const id = (0, import_node_crypto.randomUUID)();
    const stamp = nowIso();
    const hasAny = this.db.prepare(`SELECT COUNT(*) AS n FROM company_profiles`).get().n > 0;
    this.db.prepare(
      `INSERT INTO company_profiles (id, name, profile_json, is_default, created_at, updated_at)
				VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, name.trim(), JSON.stringify(profile), hasAny ? 0 : 1, stamp, stamp);
    const created = this.getCompanyProfile(id);
    if (!created) {
      throw new Error("Company profile was not stored");
    }
    return created;
  }
  /**
   * Loads one company profile by id.
   *
   * @param id - Profile UUID.
   */
  getCompanyProfile(id) {
    const row = this.db.prepare(`SELECT * FROM company_profiles WHERE id = ?`).get(id);
    return row ? mapCompanyRow(row) : null;
  }
  /**
   * Lists company profiles, default first.
   */
  listCompanyProfiles() {
    const rows = this.db.prepare(`SELECT * FROM company_profiles ORDER BY is_default DESC, name ASC`).all();
    return rows.map(mapCompanyRow);
  }
  /**
   * Returns the default company profile, if any.
   */
  getDefaultCompanyProfile() {
    const row = this.db.prepare(`SELECT * FROM company_profiles WHERE is_default = 1 LIMIT 1`).get();
    return row ? mapCompanyRow(row) : null;
  }
  /**
   * Creates the default company shell on first start (idempotent).
   * The user fills in their data once on the PWA Firma page.
   */
  ensureDefaultCompanyProfile() {
    const existing = this.getDefaultCompanyProfile();
    if (existing) {
      return existing;
    }
    const all = this.listCompanyProfiles();
    if (all.length === 0) {
      return this.createCompanyProfile("Meine Firma", {
        name: "",
        street: "",
        zip: "",
        city: "",
        country: "DE"
      });
    }
    return this.setDefaultCompanyProfile(all[0].id);
  }
  /**
   * Updates name/party data of a company profile.
   *
   * @param id - Profile UUID.
   * @param patch - Partial update.
   */
  updateCompanyProfile(id, patch) {
    var _a, _b;
    const current = this.getCompanyProfile(id);
    if (!current) {
      throw new Error(`Company profile not found: ${id}`);
    }
    const name = ((_a = patch.name) == null ? void 0 : _a.trim()) || current.name;
    const profile = (_b = patch.profile) != null ? _b : current.profile;
    this.db.prepare(`UPDATE company_profiles SET name = ?, profile_json = ?, updated_at = ? WHERE id = ?`).run(name, JSON.stringify(profile), nowIso(), id);
    const updated = this.getCompanyProfile(id);
    if (!updated) {
      throw new Error("Company profile update failed");
    }
    return updated;
  }
  /**
   * Marks one company profile as default (atomic switch).
   *
   * @param id - Profile UUID.
   */
  setDefaultCompanyProfile(id) {
    if (!this.getCompanyProfile(id)) {
      throw new Error(`Company profile not found: ${id}`);
    }
    const run = this.db.transaction(() => {
      this.db.prepare(`UPDATE company_profiles SET is_default = 0`).run();
      this.db.prepare(`UPDATE company_profiles SET is_default = 1, updated_at = ? WHERE id = ?`).run(nowIso(), id);
    });
    run();
    const updated = this.getCompanyProfile(id);
    if (!updated) {
      throw new Error("Default switch failed");
    }
    return updated;
  }
  /**
   * Deletes a company profile (never the default).
   *
   * @param id - Profile UUID.
   */
  deleteCompanyProfile(id) {
    const current = this.getCompanyProfile(id);
    if (!current) {
      throw new Error(`Company profile not found: ${id}`);
    }
    if (current.isDefault) {
      throw new Error("The default company profile cannot be deleted");
    }
    this.db.prepare(`DELETE FROM company_profiles WHERE id = ?`).run(id);
  }
  /**
   * Creates a customer (buyer master data).
   *
   * @param name - Display name.
   * @param profile - Buyer party data.
   */
  createCustomer(name, profile) {
    var _a;
    if (name.trim().length === 0) {
      throw new Error("Customer needs a name");
    }
    const id = (0, import_node_crypto.randomUUID)();
    const stamp = nowIso();
    const withNumber = {
      ...profile,
      customerNumber: ((_a = profile.customerNumber) == null ? void 0 : _a.trim()) || this.nextCustomerNumber()
    };
    this.db.prepare(`INSERT INTO customers (id, name, profile_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`).run(id, name.trim(), JSON.stringify(withNumber), stamp, stamp);
    const created = this.getCustomer(id);
    if (!created) {
      throw new Error("Customer was not stored");
    }
    return created;
  }
  /**
   * Reserves the next automatic customer number. Kept in sync with the
   * numbers already in use, so a restore or a hand-edited number cannot
   * cause a collision.
   *
   * @returns The new number.
   */
  nextCustomerNumber() {
    var _a;
    const used = new Set(
      this.listCustomers().map((customer) => {
        var _a2;
        return (_a2 = customer.profile.customerNumber) == null ? void 0 : _a2.trim();
      }).filter((value) => !!value)
    );
    const row = this.db.prepare(`SELECT last_seq FROM customer_counters WHERE name = 'default'`).get();
    let seq = (_a = row == null ? void 0 : row.last_seq) != null ? _a : 0;
    let candidate = (0, import_invoice_model.formatCustomerNumber)(seq + 1);
    while (used.has(candidate)) {
      seq += 1;
      candidate = (0, import_invoice_model.formatCustomerNumber)(seq + 1);
    }
    this.db.prepare(
      `INSERT INTO customer_counters (name, last_seq) VALUES ('default', ?)
				 ON CONFLICT(name) DO UPDATE SET last_seq = excluded.last_seq`
    ).run(seq + 1);
    return candidate;
  }
  /**
   * Assigns numbers to customers that predate the automatic numbering
   * (existing records, restored backups). Numbers already present are kept.
   *
   * @returns The customers that received a new number.
   */
  assignMissingCustomerNumbers() {
    var _a;
    const changed = [];
    for (const customer of this.listCustomers()) {
      if ((_a = customer.profile.customerNumber) == null ? void 0 : _a.trim()) {
        continue;
      }
      const updated = this.updateCustomer(customer.id, {
        name: customer.name,
        profile: { ...customer.profile, customerNumber: this.nextCustomerNumber() }
      });
      changed.push(updated);
    }
    return changed;
  }
  /**
   * Loads one customer by id.
   *
   * @param id - Customer UUID.
   */
  getCustomer(id) {
    const row = this.db.prepare(`SELECT * FROM customers WHERE id = ?`).get(id);
    return row ? mapCustomerRow(row) : null;
  }
  /**
   * Lists customers by name.
   */
  listCustomers() {
    const rows = this.db.prepare(`SELECT * FROM customers ORDER BY name ASC`).all();
    return rows.map(mapCustomerRow);
  }
  /**
   * Updates name/party data of a customer.
   *
   * @param id - Customer UUID.
   * @param patch - Partial update.
   */
  updateCustomer(id, patch) {
    var _a, _b;
    const current = this.getCustomer(id);
    if (!current) {
      throw new Error(`Customer not found: ${id}`);
    }
    const name = ((_a = patch.name) == null ? void 0 : _a.trim()) || current.name;
    const profile = (_b = patch.profile) != null ? _b : current.profile;
    this.db.prepare(`UPDATE customers SET name = ?, profile_json = ?, updated_at = ? WHERE id = ?`).run(name, JSON.stringify(profile), nowIso(), id);
    const updated = this.getCustomer(id);
    if (!updated) {
      throw new Error("Customer update failed");
    }
    return updated;
  }
  /**
   * Deletes a customer.
   *
   * @param id - Customer UUID.
   */
  deleteCustomer(id) {
    if (!this.getCustomer(id)) {
      throw new Error(`Customer not found: ${id}`);
    }
    this.db.prepare(`DELETE FROM customers WHERE id = ?`).run(id);
  }
  /**
   * Creates a catalog product/service.
   *
   * @param item - Catalog content.
   */
  createProduct(item) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i;
    if (!((_a = item.name) == null ? void 0 : _a.trim())) {
      throw new Error("Product needs a name");
    }
    if (item.vatRate !== void 0 && ![0, 7, 19].includes(item.vatRate)) {
      throw new Error("VAT rate must be 0, 7 or 19");
    }
    if (((_b = item.unitPriceNet) != null ? _b : 0) < 0) {
      throw new Error("Unit price must be >= 0");
    }
    const id = (0, import_node_crypto.randomUUID)();
    const stamp = nowIso();
    this.db.prepare(
      `INSERT INTO products (id, sku, name, details, unit, unit_price_net, vat_rate, created_at, updated_at)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      (_d = (_c = item.sku) == null ? void 0 : _c.trim()) != null ? _d : "",
      item.name.trim(),
      (_f = (_e = item.details) == null ? void 0 : _e.trim()) != null ? _f : "",
      ((_g = item.unit) == null ? void 0 : _g.trim()) || "Stk",
      (_h = item.unitPriceNet) != null ? _h : 0,
      (_i = item.vatRate) != null ? _i : 19,
      stamp,
      stamp
    );
    const created = this.getProduct(id);
    if (!created) {
      throw new Error("Product was not stored");
    }
    return created;
  }
  /**
   * Loads one catalog product by id.
   *
   * @param id - Product UUID.
   */
  getProduct(id) {
    const row = this.db.prepare(`SELECT * FROM products WHERE id = ?`).get(id);
    return row ? mapProductRow(row) : null;
  }
  /**
   * Lists catalog products by name.
   */
  listProducts() {
    const rows = this.db.prepare(`SELECT * FROM products ORDER BY name ASC`).all();
    return rows.map(mapProductRow);
  }
  /**
   * Updates a catalog product.
   *
   * @param id - Product UUID.
   * @param patch - Partial update.
   */
  updateProduct(id, patch) {
    var _a, _b, _c, _d;
    const current = this.getProduct(id);
    if (!current) {
      throw new Error(`Product not found: ${id}`);
    }
    const next = {
      sku: patch.sku !== void 0 ? patch.sku.trim() : current.sku,
      name: ((_a = patch.name) == null ? void 0 : _a.trim()) || current.name,
      details: patch.details !== void 0 ? patch.details : current.details,
      unit: ((_b = patch.unit) == null ? void 0 : _b.trim()) || current.unit,
      unitPriceNet: (_c = patch.unitPriceNet) != null ? _c : current.unitPriceNet,
      vatRate: (_d = patch.vatRate) != null ? _d : current.vatRate
    };
    if (![0, 7, 19].includes(next.vatRate)) {
      throw new Error("VAT rate must be 0, 7 or 19");
    }
    if (next.unitPriceNet < 0) {
      throw new Error("Unit price must be >= 0");
    }
    this.db.prepare(
      `UPDATE products SET sku = ?, name = ?, details = ?, unit = ?, unit_price_net = ?, vat_rate = ?, updated_at = ? WHERE id = ?`
    ).run(next.sku, next.name, next.details, next.unit, next.unitPriceNet, next.vatRate, nowIso(), id);
    const updated = this.getProduct(id);
    if (!updated) {
      throw new Error("Product update failed");
    }
    return updated;
  }
  /**
   * Deletes a catalog product.
   *
   * @param id - Product UUID.
   */
  deleteProduct(id) {
    if (!this.getProduct(id)) {
      throw new Error(`Product not found: ${id}`);
    }
    this.db.prepare(`DELETE FROM products WHERE id = ?`).run(id);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  InvoiceDatabase
});
//# sourceMappingURL=db.js.map
