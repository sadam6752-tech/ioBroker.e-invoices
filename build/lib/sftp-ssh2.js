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
var sftp_ssh2_exports = {};
__export(sftp_ssh2_exports, {
  connectSsh2: () => connectSsh2
});
module.exports = __toCommonJS(sftp_ssh2_exports);
var import_ssh2 = require("ssh2");
var import_remote_backup = require("./remote-backup");
const READY_TIMEOUT_MS = 2e4;
function call(run) {
  return new Promise((resolve, reject) => {
    run((error, value) => error ? reject(error) : resolve(value));
  });
}
function sessionOf(client, sftp) {
  return {
    async makeDirectories(directory) {
      const absolute = directory.startsWith("/");
      let current = absolute ? "" : ".";
      for (const part of directory.split("/").filter(Boolean)) {
        current = current === "." ? part : `${current}/${part}`;
        const path = absolute && !current.startsWith("/") ? `/${current}` : current;
        try {
          await call((done) => sftp.stat(path, done));
        } catch {
          await call((done) => sftp.mkdir(path, done));
        }
      }
    },
    writeFile: (path, data) => call((done) => sftp.writeFile(path, data, done)),
    size: async (path) => (await call((done) => sftp.stat(path, done))).size,
    rename: (from, to) => call((done) => sftp.rename(from, to, done)),
    list: async (directory) => (await call((done) => sftp.readdir(directory, done))).map((entry) => entry.filename),
    remove: (path) => call((done) => sftp.unlink(path, done)),
    close: () => {
      client.end();
    }
  };
}
const connectSsh2 = (settings) => new Promise((resolve, reject) => {
  const client = new import_ssh2.Client();
  let refused;
  client.on("ready", () => {
    client.sftp((error, sftp) => {
      if (error) {
        client.end();
        reject(error);
        return;
      }
      resolve(sessionOf(client, sftp));
    });
  });
  client.on("error", (error) => {
    reject(refused != null ? refused : error);
  });
  client.on("close", () => {
    reject(refused != null ? refused : new Error("the server closed the connection"));
  });
  client.connect({
    host: settings.host,
    port: settings.port,
    username: settings.username,
    password: settings.password,
    readyTimeout: READY_TIMEOUT_MS,
    keepaliveInterval: 15e3,
    hostHash: "sha256",
    hostVerifier: (hash) => {
      settings.onHostKey((0, import_remote_backup.hexToFingerprint)(hash));
      if ((0, import_remote_backup.hostKeyMatches)(settings.hostKey, hash)) {
        return true;
      }
      refused = new Error(
        `the host key of the server does not match the fingerprint in the settings (the server shows ${(0, import_remote_backup.hexToFingerprint)(hash)})`
      );
      return false;
    }
  });
});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  connectSsh2
});
//# sourceMappingURL=sftp-ssh2.js.map
