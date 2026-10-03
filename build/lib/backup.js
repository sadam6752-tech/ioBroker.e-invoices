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
var backup_exports = {};
__export(backup_exports, {
  BACKUP_APP_ID: () => BACKUP_APP_ID,
  BACKUP_FORMAT_VERSION: () => BACKUP_FORMAT_VERSION,
  DEFAULT_BACKUP_LIMITS: () => DEFAULT_BACKUP_LIMITS,
  collectArtifactPaths: () => collectArtifactPaths,
  createBackup: () => createBackup,
  previewRestore: () => previewRestore,
  restoreBackup: () => restoreBackup
});
module.exports = __toCommonJS(backup_exports);
var import_jszip = __toESM(require("jszip"));
var import_node_crypto = require("node:crypto");
var import_migrations = require("./migrations");
const BACKUP_APP_ID = "ioBroker.e-invoices";
const BACKUP_FORMAT_VERSION = 1;
function sha256Hex(data) {
  return (0, import_node_crypto.createHash)("sha256").update(data).digest("hex");
}
function assertSafeEntryPath(relPath) {
  if (typeof relPath !== "string" || relPath.trim() === "") {
    throw new Error("Backup manifest contains an invalid file path");
  }
  if (relPath.includes("\\") || relPath.startsWith("/") || /^[A-Za-z]:/.test(relPath)) {
    throw new Error(`Backup manifest contains an unsafe file path: ${relPath}`);
  }
  for (const segment of relPath.split("/")) {
    if (segment === ".." || segment === "" || segment === ".") {
      throw new Error(`Backup manifest contains an unsafe file path: ${relPath}`);
    }
  }
}
const SAFE_NUMBER = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
function assertSafeRecords(dump) {
  var _a, _b, _c, _d, _e;
  for (const invoice of dump.invoices) {
    if (invoice.number != null && !SAFE_NUMBER.test(invoice.number)) {
      throw new Error(`Backup contains an unsafe document number: ${String(invoice.number).slice(0, 40)}`);
    }
    for (const stored of [invoice.pdfPath, invoice.xlsxPath]) {
      if (stored != null) {
        assertSafeEntryPath(stored);
        if (!stored.startsWith("invoices/")) {
          throw new Error(`Backup contains an artifact path outside invoices/: ${stored}`);
        }
      }
    }
    const frozenLogo = (_c = (_b = (_a = invoice.templateSnapshot) == null ? void 0 : _a.definition) == null ? void 0 : _b.logo) == null ? void 0 : _c.path;
    if (frozenLogo != null) {
      assertSafeEntryPath(frozenLogo);
      if (!frozenLogo.startsWith("logos/")) {
        throw new Error(`Backup contains a logo path outside logos/: ${frozenLogo}`);
      }
    }
  }
  for (const template of dump.templates) {
    const logo = (_e = (_d = template.definition) == null ? void 0 : _d.logo) == null ? void 0 : _e.path;
    if (logo != null) {
      assertSafeEntryPath(logo);
      if (!logo.startsWith("logos/")) {
        throw new Error(`Backup contains a logo path outside logos/: ${logo}`);
      }
    }
  }
}
const DEFAULT_BACKUP_LIMITS = {
  zipBytes: 512 * 1024 * 1024,
  unpackedBytes: 1024 * 1024 * 1024,
  entries: 2e4,
  dumpBytes: 256 * 1024 * 1024
};
function resolveLimits(limits) {
  return { ...DEFAULT_BACKUP_LIMITS, ...limits != null ? limits : {} };
}
function declaredSize(entry) {
  const data = entry == null ? void 0 : entry._data;
  return typeof (data == null ? void 0 : data.uncompressedSize) === "number" ? data.uncompressedSize : void 0;
}
function stampName(date = /* @__PURE__ */ new Date()) {
  return date.toISOString().replace(/[:.]/g, "-").slice(0, 19);
}
function collectArtifactPaths(dump) {
  var _a, _b, _c, _d;
  const paths = /* @__PURE__ */ new Set();
  for (const invoice of dump.invoices) {
    if (invoice.pdfPath) {
      paths.add(invoice.pdfPath);
    }
    if (invoice.xlsxPath) {
      paths.add(invoice.xlsxPath);
    }
    if (invoice.number) {
      paths.add(`invoices/${invoice.issueDate.slice(0, 4)}/${invoice.number}.xml`);
    }
    if ((_c = (_b = (_a = invoice.templateSnapshot) == null ? void 0 : _a.definition) == null ? void 0 : _b.logo) == null ? void 0 : _c.path) {
      paths.add(invoice.templateSnapshot.definition.logo.path);
    }
  }
  for (const template of dump.templates) {
    if ((_d = template.definition.logo) == null ? void 0 : _d.path) {
      paths.add(template.definition.logo.path);
    }
  }
  return [...paths];
}
async function createBackup(db, storage, log, adapterVersion) {
  const dump = db.exportData();
  const dumpJson = {
    ...dump,
    attachments: dump.attachments.map((attachment) => ({
      id: attachment.id,
      invoiceId: attachment.invoiceId,
      filename: attachment.filename,
      mime: attachment.mime,
      size: attachment.size,
      dataBase64: attachment.data.toString("base64"),
      createdAt: attachment.createdAt
    }))
  };
  const zip = new import_jszip.default();
  const files = [];
  for (const path of collectArtifactPaths(dump)) {
    try {
      const data2 = await storage.read(path);
      zip.file(`files/${path}`, data2);
      files.push({ path, size: data2.length, sha256: sha256Hex(data2) });
    } catch (error) {
      log.error(`Backup skips unreadable file ${path}: ${error.message}`);
    }
  }
  const dumpJsonText = JSON.stringify(dumpJson, null, 2);
  zip.file("dump.json", dumpJsonText);
  const manifest = {
    app: BACKUP_APP_ID,
    formatVersion: BACKUP_FORMAT_VERSION,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    adapterVersion,
    schemaVersion: dump.schemaVersion,
    counts: {
      invoices: dump.invoices.length,
      templates: dump.templates.length,
      attachments: dump.attachments.length,
      customers: dump.customers.length,
      files: files.length
    },
    files,
    dumpSha256: sha256Hex(dumpJsonText)
  };
  zip.file("manifest.json", JSON.stringify(manifest, null, 2));
  const data = Buffer.from(await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
  const filename = `backups/e-invoices-backup-${stampName()}.zip`;
  return { filename, size: data.length, sha256: sha256Hex(data), manifest, data };
}
async function previewRestore(db, zipData, limits) {
  var _a;
  const { manifest, dump } = await readAndVerifyBackup(zipData, limits);
  const numbers = dump.invoices.map((i) => i.number).filter((n) => Boolean(n));
  const currentNumbers = new Set(
    db.allInvoices().map((i) => i.number).filter(Boolean)
  );
  return {
    manifest,
    invoices: dump.invoices.length,
    issued: dump.invoices.filter((i) => i.status === "issued").length,
    numbers,
    templates: dump.templates.length,
    customers: dump.customers.length,
    products: dump.products.length,
    companies: dump.companies.length,
    currentInvoices: db.allInvoices().length,
    overwritten: numbers.filter((n) => currentNumbers.has(n)),
    added: numbers.filter((n) => !currentNumbers.has(n)),
    filesWritten: ((_a = manifest.files) != null ? _a : []).length,
    onlyHere: [...currentNumbers].filter((n) => !numbers.includes(n)),
    counterAhead: mergeCounters(dump.counters, db.exportData().counters).raised
  };
}
function mergeCounters(fromBackup, current) {
  var _a;
  const key = (c) => {
    var _a2, _b;
    return `${c.year}/${(_a2 = c.employee) != null ? _a2 : "00"}/${(_b = c.doc_type) != null ? _b : "invoice"}`;
  };
  const merged = /* @__PURE__ */ new Map();
  for (const counter of fromBackup != null ? fromBackup : []) {
    merged.set(key(counter), counter);
  }
  const raised = [];
  for (const counter of current) {
    const existing = merged.get(key(counter));
    if (!existing || existing.last_seq < counter.last_seq) {
      merged.set(key(counter), counter);
      raised.push(`${key(counter)} (backup ${(_a = existing == null ? void 0 : existing.last_seq) != null ? _a : 0}, kept ${counter.last_seq})`);
    }
  }
  return { counters: [...merged.values()], raised };
}
async function readAndVerifyBackup(zipData, limits) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j;
  const caps = resolveLimits(limits);
  if (zipData.length > caps.zipBytes) {
    throw new Error(`Backup ZIP is too large (${zipData.length} bytes, limit ${caps.zipBytes})`);
  }
  let zip;
  try {
    zip = await import_jszip.default.loadAsync(zipData);
  } catch {
    throw new Error("File is no valid backup ZIP");
  }
  const names = Object.keys(zip.files);
  if (names.length > caps.entries) {
    throw new Error(`Backup ZIP has too many entries (${names.length}, limit ${caps.entries})`);
  }
  let declared = 0;
  for (const name of names) {
    const size = declaredSize(zip.files[name]);
    if (size === void 0) {
      continue;
    }
    declared += size;
    if (declared > caps.unpackedBytes) {
      throw new Error(`Backup ZIP would expand to at least ${declared} bytes (limit ${caps.unpackedBytes})`);
    }
  }
  const manifestFile = zip.file("manifest.json");
  const dumpFile = zip.file("dump.json");
  if (!manifestFile || !dumpFile) {
    throw new Error("Backup ZIP misses manifest.json or dump.json");
  }
  const manifest = JSON.parse(await manifestFile.async("string"));
  if (manifest.app !== BACKUP_APP_ID || manifest.formatVersion !== BACKUP_FORMAT_VERSION) {
    throw new Error(`Unsupported backup (app=${String(manifest.app)}, format=${String(manifest.formatVersion)})`);
  }
  if (manifest.schemaVersion > import_migrations.LATEST_SCHEMA_VERSION) {
    throw new Error(`Backup needs schema v${manifest.schemaVersion}, adapter knows v${import_migrations.LATEST_SCHEMA_VERSION}`);
  }
  const files = [];
  let unpacked = 0;
  for (const file of (_a = manifest.files) != null ? _a : []) {
    assertSafeEntryPath(file.path);
    const entry = zip.file(`files/${file.path}`);
    if (!entry) {
      throw new Error(`Backup misses file: files/${file.path}`);
    }
    const data = Buffer.from(await entry.async("nodebuffer"));
    unpacked += data.length;
    if (unpacked > caps.unpackedBytes) {
      throw new Error(`Backup expands to more than ${caps.unpackedBytes} bytes`);
    }
    if (sha256Hex(data) !== file.sha256 || data.length !== file.size) {
      throw new Error(`Checksum mismatch: files/${file.path}`);
    }
    files.push({ path: file.path, data });
  }
  const declaredDump = declaredSize(dumpFile);
  if (declaredDump !== void 0 && declaredDump > caps.dumpBytes) {
    throw new Error(`Backup dump.json is too large (${declaredDump} bytes, limit ${caps.dumpBytes})`);
  }
  const dumpJsonText = await dumpFile.async("string");
  if (Buffer.byteLength(dumpJsonText, "utf8") > caps.dumpBytes) {
    throw new Error(`Backup dump.json is too large (limit ${caps.dumpBytes})`);
  }
  if (manifest.dumpSha256 && sha256Hex(dumpJsonText) !== manifest.dumpSha256) {
    throw new Error("Checksum mismatch: dump.json");
  }
  let dumpJson;
  try {
    dumpJson = JSON.parse(dumpJsonText);
  } catch {
    throw new Error("Backup ZIP is corrupt: dump.json is not readable JSON");
  }
  const dump = {
    formatVersion: 1,
    exportedAt: String((_b = dumpJson.exportedAt) != null ? _b : (/* @__PURE__ */ new Date()).toISOString()),
    schemaVersion: Number((_c = dumpJson.schemaVersion) != null ? _c : 0),
    invoices: (_d = dumpJson.invoices) != null ? _d : [],
    counters: (_e = dumpJson.counters) != null ? _e : [],
    templates: (_f = dumpJson.templates) != null ? _f : [],
    companies: (_g = dumpJson.companies) != null ? _g : [],
    customers: (_h = dumpJson.customers) != null ? _h : [],
    products: (_i = dumpJson.products) != null ? _i : [],
    attachments: ((_j = dumpJson.attachments) != null ? _j : []).map((attachment) => {
      var _a2;
      return {
        id: attachment.id,
        invoiceId: attachment.invoiceId,
        filename: attachment.filename,
        mime: attachment.mime,
        size: attachment.size,
        data: Buffer.from((_a2 = attachment.dataBase64) != null ? _a2 : "", "base64"),
        createdAt: attachment.createdAt
      };
    })
  };
  assertSafeRecords(dump);
  return { manifest, dump, files };
}
async function restoreBackup(db, storage, zipData, log, limits, options = {}) {
  var _a, _b;
  const { manifest, dump, files } = await readAndVerifyBackup(zipData, limits);
  let safetyBackup = null;
  try {
    const safety = await createBackup(db, storage, log, (_a = options.adapterVersion) != null ? _a : "unknown");
    safetyBackup = safety.filename.replace("-backup-", "-prerestore-");
    await storage.write(safetyBackup, safety.data);
    db.logBackup({
      filename: safetyBackup,
      size: safety.size,
      sha256: safety.sha256,
      manifestJson: JSON.stringify(safety.manifest)
    });
    log.info(`Safety backup before restore: ${safetyBackup}`);
  } catch (error) {
    throw new Error(`Restore aborted: the safety backup of the current state failed (${error.message})`);
  }
  const { counters, raised } = mergeCounters(dump.counters, db.exportData().counters);
  dump.counters = counters;
  if (raised.length > 0) {
    log.info(`Restore keeps ${raised.length} counter(s) ahead of the backup: ${raised.join("; ")}`);
  }
  db.importData(dump);
  if (!db.getDefaultTemplate()) {
    db.ensureDefaultTemplate();
  }
  log.info(`Database restored: ${dump.invoices.length} invoices, ${dump.templates.length} templates`);
  const filesWritten = [];
  const fileErrors = [];
  for (const file of files) {
    try {
      await storage.write(file.path, file.data);
      filesWritten.push(file.path);
    } catch (error) {
      const message = `${file.path}: ${error.message}`;
      fileErrors.push(message);
      log.error(`Restore cannot write ${message}`);
    }
  }
  try {
    let previous = "";
    try {
      previous = (await storage.read("backups/restore-log.jsonl")).toString("utf8");
    } catch {
    }
    const entry = JSON.stringify({
      at: (/* @__PURE__ */ new Date()).toISOString(),
      source: (_b = options.source) != null ? _b : "api",
      backupCreatedAt: manifest.createdAt,
      invoices: dump.invoices.length,
      safetyBackup,
      countersKept: raised
    });
    await storage.write("backups/restore-log.jsonl", `${previous}${entry}
`);
  } catch (error) {
    log.error(`Cannot write the restore log: ${error.message}`);
  }
  return {
    manifest,
    invoices: dump.invoices.length,
    templates: dump.templates.length,
    filesWritten,
    fileErrors,
    safetyBackup,
    countersKept: raised
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BACKUP_APP_ID,
  BACKUP_FORMAT_VERSION,
  DEFAULT_BACKUP_LIMITS,
  collectArtifactPaths,
  createBackup,
  previewRestore,
  restoreBackup
});
//# sourceMappingURL=backup.js.map
