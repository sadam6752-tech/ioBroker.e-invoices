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
var tls_exports = {};
__export(tls_exports, {
  createWebServer: () => createWebServer,
  decideTls: () => decideTls
});
module.exports = __toCommonJS(tls_exports);
var import_node_http = require("node:http");
var import_node_https = require("node:https");
async function decideTls(config, load) {
  var _a, _b, _c;
  if (config.secure !== true) {
    return { mode: "http" };
  }
  const publicName = (_a = config.certPublic) == null ? void 0 : _a.trim();
  const privateName = (_b = config.certPrivate) == null ? void 0 : _b.trim();
  if (!publicName || !privateName) {
    return {
      mode: "unavailable",
      reason: "HTTPS is switched on, but no public certificate and private key are chosen in the instance settings"
    };
  }
  try {
    const [certificates] = await load(publicName, privateName, ((_c = config.certChained) == null ? void 0 : _c.trim()) || void 0);
    if (!(certificates == null ? void 0 : certificates.key) || !certificates.cert) {
      return {
        mode: "unavailable",
        reason: `HTTPS is switched on, but the certificate "${publicName}" / "${privateName}" is not in the certificate collection of ioBroker (Admin > Settings > Certificates)`
      };
    }
    return { mode: "https", tls: { key: certificates.key, cert: certificates.cert, ca: certificates.ca } };
  } catch (error) {
    return { mode: "unavailable", reason: `the certificate could not be loaded: ${error.message}` };
  }
}
function createWebServer(listener, tls) {
  return tls ? (0, import_node_https.createServer)({ key: tls.key, cert: tls.cert, ca: tls.ca }, listener) : (0, import_node_http.createServer)(listener);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createWebServer,
  decideTls
});
//# sourceMappingURL=tls.js.map
