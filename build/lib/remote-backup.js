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
var remote_backup_exports = {};
__export(remote_backup_exports, {
  REMOTE_COPY_TIMEOUT_MS: () => REMOTE_COPY_TIMEOUT_MS,
  copyBackupToRemote: () => copyBackupToRemote,
  hexToFingerprint: () => hexToFingerprint,
  hostKeyMatches: () => hostKeyMatches,
  normalizeRemoteDirectory: () => normalizeRemoteDirectory,
  remoteSettingsProblems: () => remoteSettingsProblems,
  selectRemoteCopiesToPrune: () => selectRemoteCopiesToPrune,
  settingsForConnectionTest: () => settingsForConnectionTest,
  testRemoteConnection: () => testRemoteConnection
});
module.exports = __toCommonJS(remote_backup_exports);
var import_backup = require("./backup");
const DEFAULT_PORT = 22;
const REMOTE_COPY_TIMEOUT_MS = 10 * 6e4;
const AUTO_BASE_PREFIX = import_backup.AUTO_BACKUP_PREFIX.slice(import_backup.AUTO_BACKUP_PREFIX.lastIndexOf("/") + 1);
function normalizeRemoteDirectory(directory) {
  const text = (directory != null ? directory : "").trim().replace(/\\/g, "/");
  const absolute = text.startsWith("/");
  const parts = [];
  for (const part of text.split("/")) {
    if (part === "" || part === ".") {
      continue;
    }
    if (part === "..") {
      return null;
    }
    parts.push(part);
  }
  const joined = parts.join("/");
  return absolute ? `/${joined}` : joined;
}
function remoteSettingsProblems(settings) {
  var _a, _b;
  const problems = [];
  if (!((_a = settings.host) == null ? void 0 : _a.trim())) {
    problems.push("the host is missing");
  }
  if (!((_b = settings.username) == null ? void 0 : _b.trim())) {
    problems.push("the user name is missing");
  }
  if (!settings.password) {
    problems.push("the password is missing");
  }
  const port = settings.port === void 0 || settings.port === 0 ? DEFAULT_PORT : Number(settings.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    problems.push("the port must be between 1 and 65535");
  }
  if (normalizeRemoteDirectory(settings.directory) === null) {
    problems.push('the directory must not contain ".."');
  }
  return problems;
}
function hostKeyMatches(expected, hexHash) {
  const wanted = expected.trim();
  if (!wanted) {
    return true;
  }
  const hex = hexHash.toLowerCase();
  const asHex = wanted.replace(/^sha256:/i, "").replace(/:/g, "");
  if (/^[0-9a-f]{64}$/i.test(asHex)) {
    return asHex.toLowerCase() === hex;
  }
  return wanted.replace(/^sha256:/i, "").replace(/=+$/, "") === hexToFingerprint(hex).replace(/^SHA256:/, "");
}
function hexToFingerprint(hexHash) {
  return `SHA256:${Buffer.from(hexHash, "hex").toString("base64").replace(/=+$/, "")}`;
}
async function withTimeout(timers, work, ms, what, onTimeout) {
  let timer;
  const limit = new Promise((_resolve, reject) => {
    timer = timers.start(() => {
      onTimeout();
      reject(new Error(`${what} took longer than ${Math.round(ms / 1e3)} s`));
    }, ms);
  });
  try {
    return await Promise.race([work, limit]);
  } finally {
    timers.stop(timer);
  }
}
function selectRemoteCopiesToPrune(names, keep) {
  if (!Number.isFinite(keep) || keep <= 0) {
    return [];
  }
  const automatic = names.filter((name) => name.startsWith(AUTO_BASE_PREFIX) && name.endsWith(".zip")).sort().reverse();
  return automatic.slice(Math.floor(keep));
}
async function copyBackupToRemote(connect, settings, backup, log, timers, limitMs = REMOTE_COPY_TIMEOUT_MS) {
  var _a;
  const problems = remoteSettingsProblems(settings);
  if (problems.length > 0) {
    return { ok: false, message: `settings incomplete: ${problems.join(", ")}`, deleted: [] };
  }
  const directory = (_a = normalizeRemoteDirectory(settings.directory)) != null ? _a : "";
  const name = backup.filename.slice(backup.filename.lastIndexOf("/") + 1);
  const target = directory === "/" ? `/${name}` : directory ? `${directory}/${name}` : name;
  let session;
  let expired = false;
  const deleted = [];
  try {
    const work = (async () => {
      var _a2, _b, _c;
      const opened = await connect({
        host: settings.host.trim(),
        port: settings.port ? Number(settings.port) : DEFAULT_PORT,
        username: settings.username.trim(),
        password: settings.password,
        hostKey: (_b = (_a2 = settings.hostKey) == null ? void 0 : _a2.trim()) != null ? _b : "",
        onHostKey: (fingerprint) => {
          var _a3;
          if (!((_a3 = settings.hostKey) == null ? void 0 : _a3.trim())) {
            log.warn(
              `The host key of the external server is not verified. To trust only this server, enter its fingerprint in the settings: ${fingerprint}`
            );
          }
        }
      });
      session = opened;
      if (expired) {
        opened.close();
        return;
      }
      if (directory) {
        await session.makeDirectories(directory);
      }
      const partial = `${target}.part`;
      await session.writeFile(partial, backup.data);
      const written = await session.size(partial);
      if (written !== backup.data.length) {
        throw new Error(`the upload is incomplete (${written} of ${backup.data.length} bytes)`);
      }
      await session.rename(partial, target);
      if (name.startsWith(AUTO_BASE_PREFIX)) {
        for (const old of selectRemoteCopiesToPrune(await session.list(directory || "."), (_c = settings.keep) != null ? _c : 0)) {
          try {
            await session.remove(directory === "/" ? `/${old}` : directory ? `${directory}/${old}` : old);
            deleted.push(old);
          } catch (error) {
            log.warn(
              `Cannot delete the old copy ${old} on the external server: ${error.message}`
            );
          }
        }
      }
    })();
    await withTimeout(timers, work, limitMs, "The copy to the external server", () => {
      expired = true;
      session == null ? void 0 : session.close();
    });
    return { ok: true, message: `copied ${name}`, remoteFile: target, deleted };
  } catch (error) {
    return { ok: false, message: error.message, deleted };
  } finally {
    session == null ? void 0 : session.close();
  }
}
function settingsForConnectionTest(form, saved) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i;
  const text = (value) => typeof value === "string" ? value : void 0;
  const host = (_b = (_a = text(form.remoteHost)) != null ? _a : saved.host) != null ? _b : "";
  const username = (_d = (_c = text(form.remoteUser)) != null ? _c : saved.username) != null ? _d : "";
  const port = Number((_e = form.remotePort) != null ? _e : saved.port) || DEFAULT_PORT;
  const sameServer = host.trim() === ((_f = saved.host) != null ? _f : "").trim() && username.trim() === ((_g = saved.username) != null ? _g : "").trim() && port === (Number(saved.port) || DEFAULT_PORT);
  return {
    enabled: true,
    host,
    port,
    username,
    password: text(form.remotePassword) || (sameServer ? saved.password : void 0),
    directory: (_h = text(form.remoteDirectory)) != null ? _h : saved.directory,
    hostKey: (_i = text(form.remoteHostKey)) != null ? _i : saved.hostKey
  };
}
async function testRemoteConnection(connect, settings, timers, limitMs = 6e4) {
  var _a;
  const problems = remoteSettingsProblems(settings);
  if (problems.length > 0) {
    return { ok: false, message: `settings incomplete: ${problems.join(", ")}` };
  }
  const directory = (_a = normalizeRemoteDirectory(settings.directory)) != null ? _a : "";
  let session;
  let expired = false;
  let fingerprint;
  try {
    const work = (async () => {
      var _a2, _b;
      const opened = await connect({
        host: settings.host.trim(),
        port: settings.port ? Number(settings.port) : DEFAULT_PORT,
        username: settings.username.trim(),
        password: settings.password,
        hostKey: (_b = (_a2 = settings.hostKey) == null ? void 0 : _a2.trim()) != null ? _b : "",
        onHostKey: (found) => {
          fingerprint = found;
        }
      });
      session = opened;
      if (expired) {
        opened.close();
        return;
      }
      if (directory) {
        await session.makeDirectories(directory);
      }
      const probe = `${directory === "/" ? "" : directory ? `${directory}/` : ""}.e-invoices-connection-test`;
      await session.writeFile(probe, Buffer.from("ok"));
      await session.remove(probe);
    })();
    await withTimeout(timers, work, limitMs, "The connection test", () => {
      expired = true;
      session == null ? void 0 : session.close();
    });
    return { ok: true, message: "connected, the directory is writable", fingerprint };
  } catch (error) {
    return { ok: false, message: error.message, fingerprint };
  } finally {
    session == null ? void 0 : session.close();
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  REMOTE_COPY_TIMEOUT_MS,
  copyBackupToRemote,
  hexToFingerprint,
  hostKeyMatches,
  normalizeRemoteDirectory,
  remoteSettingsProblems,
  selectRemoteCopiesToPrune,
  settingsForConnectionTest,
  testRemoteConnection
});
//# sourceMappingURL=remote-backup.js.map
