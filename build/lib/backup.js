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
function stampName(date = /* @__PURE__ */ new Date()) {
  return date.toISOString().replace(/[:.]/g, "-").slice(0, 19);
}
function collectArtifactPaths(dump) {
  var _a;
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
  }
  for (const template of dump.templates) {
    if ((_a = template.definition.logo) == null ? void 0 : _a.path) {
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
async function previewRestore(db, zipData) {
  var _a;
  const { manifest, dump } = await readAndVerifyBackup(zipData);
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
    filesWritten: ((_a = manifest.files) != null ? _a : []).length
  };
}
async function readAndVerifyBackup(zipData) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j;
  let zip;
  try {
    zip = await import_jszip.default.loadAsync(zipData);
  } catch {
    throw new Error("File is no valid backup ZIP");
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
  for (const file of (_a = manifest.files) != null ? _a : []) {
    assertSafeEntryPath(file.path);
    const entry = zip.file(`files/${file.path}`);
    if (!entry) {
      throw new Error(`Backup misses file: files/${file.path}`);
    }
    const data = Buffer.from(await entry.async("nodebuffer"));
    if (sha256Hex(data) !== file.sha256 || data.length !== file.size) {
      throw new Error(`Checksum mismatch: files/${file.path}`);
    }
    files.push({ path: file.path, data });
  }
  const dumpJsonText = await dumpFile.async("string");
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
  return { manifest, dump, files };
}
async function restoreBackup(db, storage, zipData, log) {
  const { manifest, dump, files } = await readAndVerifyBackup(zipData);
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
  return { manifest, invoices: dump.invoices.length, templates: dump.templates.length, filesWritten, fileErrors };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BACKUP_APP_ID,
  BACKUP_FORMAT_VERSION,
  collectArtifactPaths,
  createBackup,
  previewRestore,
  restoreBackup
});
//# sourceMappingURL=backup.js.map
