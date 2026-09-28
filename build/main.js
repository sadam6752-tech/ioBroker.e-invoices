"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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
var utils = __toESM(require("@iobroker/adapter-core"));
var import_node_path = require("node:path");
var import_node_http = require("node:http");
var import_package = require("../package.json");
var import_api_server = require("./lib/api-server");
var import_backup = require("./lib/backup");
var import_db = require("./lib/db");
var import_invoice_model = require("./lib/invoice-model");
var import_issue_service = require("./lib/issue-service");
const MOUNT_POINT = "storage";
const STATUS_FILE = "status.json";
const DEFAULT_API_PORT = 8093;
const DEFAULT_API_BIND = "0.0.0.0";
class EInvoices extends utils.Adapter {
  db = null;
  mountId = "";
  filesAvailable = false;
  server = null;
  constructor(options = {}) {
    super({
      ...options,
      name: "e-invoices"
    });
    this.on("ready", this.onReady.bind(this));
    this.on("stateChange", this.onStateChange.bind(this));
    this.on("unload", this.onUnload.bind(this));
  }
  /**
   * Is called when databases are connected and adapter received configuration.
   */
  async onReady() {
    this.mountId = `${this.namespace}.${MOUNT_POINT}`;
    await this.setState("info.connection", false, true);
    try {
      const dbPath = (0, import_node_path.join)(utils.getAbsoluteInstanceDataDir(this), "invoices.db");
      this.db = new import_db.InvoiceDatabase(dbPath);
      this.db.migrate();
      this.log.info(`Database ready (schema v${this.db.currentVersion()}): ${dbPath}`);
      const defaultTemplate = this.db.ensureDefaultTemplate();
      this.log.info(`Layout template: ${defaultTemplate.name} v${defaultTemplate.version}`);
      await this.ensureObjects();
      await this.ensureMountPoint();
      await this.publishStatusFile();
      await this.refreshStats();
      this.subscribeStates("control.*");
      this.startApiServer();
      await this.setState("info.connection", true, true);
      this.log.info("e-invoices started: drafts, issue flow and status file are ready.");
    } catch (error) {
      this.log.error(`Startup failed: ${error.message}`);
      await this.setState("info.connection", false, true);
    }
  }
  /**
   * Creates the info/control states (idempotent, also heals older installs).
   */
  async ensureObjects() {
    await this.setObjectNotExistsAsync("control", {
      type: "channel",
      common: { name: "Control commands" },
      native: {}
    });
    const states = [
      {
        id: "info.invoiceCount",
        common: { name: "Total invoices", type: "number", role: "value", read: true, write: false, def: 0 },
        native: {}
      },
      {
        id: "info.draftCount",
        common: { name: "Draft invoices", type: "number", role: "value", read: true, write: false, def: 0 },
        native: {}
      },
      {
        id: "info.issuedCount",
        common: { name: "Issued invoices", type: "number", role: "value", read: true, write: false, def: 0 },
        native: {}
      },
      {
        id: "info.lastNumber",
        common: { name: "Last issued number", type: "string", role: "text", read: true, write: false },
        native: {}
      },
      {
        id: "info.lastIssuedAt",
        common: { name: "Last issue timestamp", type: "string", role: "text", read: true, write: false },
        native: {}
      },
      {
        id: "info.dbVersion",
        common: {
          name: "Database schema version",
          type: "number",
          role: "value",
          read: true,
          write: false,
          def: 0
        },
        native: {}
      },
      {
        id: "info.lastBackup",
        common: { name: "Last backup filename", type: "string", role: "text", read: true, write: false },
        native: {}
      },
      {
        id: "control.createDraft",
        common: {
          name: "Create empty draft",
          type: "boolean",
          role: "button",
          read: false,
          write: true,
          def: false
        },
        native: {}
      },
      {
        id: "control.lastDraftId",
        common: { name: "Last created draft id", type: "string", role: "text", read: true, write: false },
        native: {}
      },
      {
        id: "control.issueId",
        common: { name: "Draft id to issue", type: "string", role: "text", read: true, write: true },
        native: {}
      },
      {
        id: "control.issue",
        common: {
          name: "Issue draft from issueId",
          type: "boolean",
          role: "button",
          read: false,
          write: true,
          def: false
        },
        native: {}
      },
      {
        id: "control.refresh",
        common: {
          name: "Refresh stats and status file",
          type: "boolean",
          role: "button",
          read: false,
          write: true,
          def: false
        },
        native: {}
      },
      {
        id: "control.backup",
        common: {
          name: "Create backup now",
          type: "boolean",
          role: "button",
          read: false,
          write: true,
          def: false
        },
        native: {}
      },
      {
        id: "control.restoreId",
        common: { name: "Backup filename to restore", type: "string", role: "text", read: true, write: true },
        native: {}
      },
      {
        id: "control.restore",
        common: {
          name: "Restore backup from restoreId",
          type: "boolean",
          role: "button",
          read: false,
          write: true,
          def: false
        },
        native: {}
      }
    ];
    for (const state of states) {
      await this.setObjectNotExistsAsync(state.id, {
        type: "state",
        common: state.common,
        native: state.native
      });
    }
  }
  /**
   * Files are user data (invoices, logos, backups) and must survive
   * ioBroker backups — hence `meta.user`, never below the namespace.
   */
  async ensureMountPoint() {
    try {
      await this.setObjectNotExistsAsync(this.mountId, {
        type: "meta",
        common: { name: "File storage", type: "meta.user" },
        native: {}
      });
      this.filesAvailable = true;
    } catch (error) {
      this.filesAvailable = false;
      this.log.error(`Cannot create file mount point ${this.mountId}: ${error.message}`);
    }
  }
  /**
   * Publishes adapter/DB stats as JSON into the file mountpoint.
   * Own try/catch so file errors never look like state errors.
   */
  async publishStatusFile() {
    var _a, _b;
    if (!this.db || !this.filesAvailable) {
      return;
    }
    const counts = this.db.countByStatus();
    const last = this.db.listInvoices({ status: "issued", limit: 1 });
    const payload = {
      adapter: "e-invoices",
      instance: this.namespace,
      time: (/* @__PURE__ */ new Date()).toISOString(),
      schemaVersion: this.db.currentVersion(),
      counts,
      lastNumber: (_b = (_a = last[0]) == null ? void 0 : _a.number) != null ? _b : null
    };
    try {
      await this.writeFileAsync(this.mountId, STATUS_FILE, JSON.stringify(payload, null, 2));
      this.log.info(`Status file published: ${this.mountId}/${STATUS_FILE}`);
    } catch (error) {
      this.log.error(`Cannot write status file ${STATUS_FILE}: ${error.message}`);
    }
  }
  /**
   * Refreshes the info.* states from the database.
   */
  async refreshStats() {
    var _a, _b, _c, _d;
    if (!this.db) {
      return;
    }
    const counts = this.db.countByStatus();
    await this.setState("info.invoiceCount", counts.draft + counts.issued + counts.cancelled, true);
    await this.setState("info.draftCount", counts.draft, true);
    await this.setState("info.issuedCount", counts.issued, true);
    await this.setState("info.dbVersion", this.db.currentVersion(), true);
    const last = this.db.listInvoices({ status: "issued", limit: 1 });
    await this.setState("info.lastNumber", (_b = (_a = last[0]) == null ? void 0 : _a.number) != null ? _b : "", true);
    await this.setState("info.lastIssuedAt", (_d = (_c = last[0]) == null ? void 0 : _c.updatedAt) != null ? _d : "", true);
  }
  /**
   * Handles control.* button commands (each ack:false write triggers once).
   *
   * @param id - Full state id of the pressed button.
   */
  async handleCommand(id) {
    var _a, _b, _c;
    try {
      if (!this.db) {
        throw new Error("Database is not ready");
      }
      if (id === `${this.namespace}.control.createDraft`) {
        const created = this.db.createDraft((0, import_invoice_model.blankDraft)());
        await this.setState("control.lastDraftId", created.id, true);
        this.log.info(`Draft created: ${created.id}`);
        await this.refreshStats();
      } else if (id === `${this.namespace}.control.issue`) {
        const idState = await this.getStateAsync("control.issueId");
        const targetId = String((_a = idState == null ? void 0 : idState.val) != null ? _a : "").trim();
        if (!targetId) {
          throw new Error("control.issueId is empty \u2014 set a draft id first");
        }
        const outcome = await (0, import_issue_service.issueInvoiceWithArtifacts)(this.db, this.log, targetId, {
          write: this.storageWriter,
          read: this.storageReader
        });
        await this.setState("control.lastDraftId", outcome.invoice.id, true);
        await this.refreshStats();
        await this.publishStatusFile();
      } else if (id === `${this.namespace}.control.refresh`) {
        await this.refreshStats();
        await this.publishStatusFile();
      } else if (id === `${this.namespace}.control.backup`) {
        const backup = await (0, import_backup.createBackup)(this.db, { read: this.storageReader }, this.log, import_package.version);
        await this.writeFileAsync(this.mountId, backup.filename, backup.data);
        this.db.logBackup({
          filename: backup.filename,
          size: backup.size,
          sha256: backup.sha256,
          manifestJson: JSON.stringify(backup.manifest)
        });
        await this.setState("info.lastBackup", backup.filename, true);
        this.log.info(`Backup finished: ${backup.filename}`);
        await this.publishStatusFile();
      } else if (id === `${this.namespace}.control.restore`) {
        const idState = await this.getStateAsync("control.restoreId");
        const name = (_c = String((_b = idState == null ? void 0 : idState.val) != null ? _b : "").split("/").pop()) != null ? _c : "";
        if (!name) {
          throw new Error("control.restoreId is empty \u2014 set a backup filename first");
        }
        const data = await this.storageReader(`backups/${name.replace(/[^A-Za-z0-9_.-]/g, "")}`);
        const summary = await (0, import_backup.restoreBackup)(
          this.db,
          { write: this.storageWriter, read: this.storageReader },
          data,
          this.log
        );
        this.log.info(`Restore finished: ${summary.invoices} invoices, ${summary.filesWritten.length} files`);
        await this.refreshStats();
        await this.publishStatusFile();
      }
      await this.setState(id, { val: true, ack: true });
    } catch (error) {
      this.log.error(`Command ${id} failed: ${error.message}`);
      await this.setState(id, { val: true, ack: true });
    }
  }
  /**
   * Mountpoint file writer (bound for the issue flow and API).
   *
   * @param relPath - Path below the storage mountpoint.
   * @param data - File content.
   */
  storageWriter = async (relPath, data) => {
    await this.writeFileAsync(this.mountId, relPath, data);
  };
  /**
   * Mountpoint file reader (bound for the issue flow and API).
   *
   * @param relPath - Path below the storage mountpoint.
   */
  storageReader = async (relPath) => {
    const result = await this.readFileAsync(this.mountId, relPath);
    const content = typeof result === "object" && result !== null && "file" in result && !Buffer.isBuffer(result) ? result.file : result;
    return Buffer.isBuffer(content) ? content : Buffer.from(content);
  };
  /**
   * Starts the PWA/API HTTP server on its own port (compact:false, own
   * socket for the PWA — see README for the W5049 reason).
   */
  startApiServer() {
    if (!this.db) {
      return;
    }
    try {
      const app = (0, import_api_server.createApiServer)({
        db: this.db,
        storage: { write: this.storageWriter, read: this.storageReader },
        log: this.log,
        version: import_package.version,
        authToken: this.config.authToken || void 0
      });
      const wwwDir = (0, import_node_path.join)(__dirname, "../../www");
      if ((0, import_api_server.attachStatic)(app, wwwDir)) {
        this.log.info(`PWA bundle served from ${wwwDir}`);
      } else {
        this.log.info("No PWA bundle yet (www/ missing) \u2014 API only");
      }
      const port = this.config.port || DEFAULT_API_PORT;
      const bind = this.config.bind || DEFAULT_API_BIND;
      this.server = (0, import_node_http.createServer)(app);
      this.server.on("error", (error) => {
        this.log.error(`API server error (port ${port}): ${error.message}`);
      });
      this.server.listen(port, bind, () => {
        this.log.info(`API+PWA listening on ${bind}:${port}`);
      });
    } catch (error) {
      this.log.error(`Cannot start API server: ${error.message}`);
    }
  }
  /**
   * Is called when adapter shuts down - callback has to be called under any circumstances!
   *
   * @param callback - Callback function
   */
  onUnload(callback) {
    var _a, _b;
    try {
      try {
        (_a = this.server) == null ? void 0 : _a.close();
      } catch (error) {
        this.log.error(`Error stopping API server: ${error.message}`);
      }
      this.server = null;
      try {
        (_b = this.db) == null ? void 0 : _b.close();
      } catch (error) {
        this.log.error(`Error closing database: ${error.message}`);
      }
      this.db = null;
      void this.setState("info.connection", false, true);
      callback();
    } catch (error) {
      this.log.error(`Error during unloading: ${error.message}`);
      callback();
    }
  }
  // If you need to react to object changes, uncomment the following block and the corresponding line in the constructor.
  // You also need to subscribe to the objects with `this.subscribeObjects`, similar to `this.subscribeStates`.
  // /**
  //  * Is called if a subscribed object changes
  //  */
  // private onObjectChange(id: string, obj: ioBroker.Object | null | undefined): void {
  // 	if (obj) {
  // 		// The object was changed
  // 		this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
  // 	} else {
  // 		// The object was deleted
  // 		this.log.info(`object ${id} deleted`);
  // 	}
  // }
  /**
   * Is called if a subscribed state changes
   *
   * @param id - State ID
   * @param state - State object
   */
  onStateChange(id, state) {
    if (state && state.ack === false && id.startsWith(`${this.namespace}.control.`)) {
      void this.handleCommand(id);
    }
  }
  // If you need to accept messages in your adapter, uncomment the following block and the corresponding line in the constructor.
  // /**
  //  * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
  //  * Using this method requires "common.messagebox" property to be set to true in io-package.json
  //  */
  //
  // private onMessage(obj: ioBroker.Message): void {
  // 	if (typeof obj === 'object' && obj.message) {
  // 		if (obj.command === 'send') {
  // 			// e.g. send email or pushover or whatever
  // 			this.log.info('send command');
  // 			// Send response in callback if required
  // 			if (obj.callback) this.sendTo(obj.from, obj.command, 'Message received', obj.callback);
  // 		}
  // 	}
  // }
}
if (require.main !== module) {
  module.exports = (options) => new EInvoices(options);
} else {
  (() => new EInvoices())();
}
//# sourceMappingURL=main.js.map
