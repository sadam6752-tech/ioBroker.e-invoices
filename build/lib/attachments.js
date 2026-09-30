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
var attachments_exports = {};
__export(attachments_exports, {
  ATTACHMENT_MAX_BYTES: () => ATTACHMENT_MAX_BYTES,
  ATTACHMENT_MAX_COUNT: () => ATTACHMENT_MAX_COUNT,
  ATTACHMENT_TYPES: () => ATTACHMENT_TYPES,
  attachmentDisposition: () => attachmentDisposition,
  attachmentExtension: () => attachmentExtension,
  checkAttachment: () => checkAttachment,
  sanitizeAttachmentFilename: () => sanitizeAttachmentFilename,
  sniffAttachmentType: () => sniffAttachmentType
});
module.exports = __toCommonJS(attachments_exports);
const ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024;
const ATTACHMENT_MAX_COUNT = 10;
const ATTACHMENT_TYPES = [
  {
    mime: "application/pdf",
    extensions: ["pdf"],
    sniff: (data) => data.length >= 5 && data.subarray(0, 5).toString("latin1") === "%PDF-"
  },
  {
    mime: "image/png",
    extensions: ["png"],
    sniff: (data) => data.length >= 8 && data.readUInt32BE(0) === 2303741511 && data.readUInt32BE(4) === 218765834
  },
  {
    mime: "image/jpeg",
    extensions: ["jpg", "jpeg"],
    sniff: (data) => data.length >= 3 && data[0] === 255 && data[1] === 216 && data[2] === 255
  }
];
function sniffAttachmentType(data) {
  return ATTACHMENT_TYPES.find((type) => type.sniff(data));
}
function attachmentExtension(filename) {
  const dot = filename.lastIndexOf(".");
  return dot > 0 ? filename.slice(dot + 1).toLowerCase() : "";
}
function sanitizeAttachmentFilename(filename) {
  var _a, _b;
  const base = (_b = (_a = filename.split("\\").pop()) == null ? void 0 : _a.split("/").pop()) != null ? _b : "";
  const cleaned = [...base].filter((char) => {
    var _a2;
    const code = (_a2 = char.codePointAt(0)) != null ? _a2 : 0;
    return code > 31 && code !== 127;
  }).join("").replace(/["<>|:*?]/g, "").replace(/\s+/g, " ").trim();
  const dot = cleaned.lastIndexOf(".");
  const stem = dot > 0 ? cleaned.slice(0, dot) : cleaned;
  const extension = dot > 0 ? cleaned.slice(dot, dot + 11) : "";
  return `${stem.trim().slice(0, 100).trim()}${extension}`;
}
function checkAttachment(input) {
  var _a;
  const filename = sanitizeAttachmentFilename(input.filename);
  if (filename.length === 0) {
    return { ok: false, error: "Attachment needs a filename" };
  }
  if (input.data.length === 0) {
    return { ok: false, error: "Attachment needs content" };
  }
  if (input.data.length > ATTACHMENT_MAX_BYTES) {
    return { ok: false, error: `Attachment exceeds ${ATTACHMENT_MAX_BYTES / (1024 * 1024)} MB` };
  }
  const type = sniffAttachmentType(input.data);
  if (!type) {
    return { ok: false, error: "Only PDF, PNG and JPEG attachments are supported" };
  }
  const extension = attachmentExtension(filename);
  if (extension.length === 0) {
    return { ok: false, error: "Attachment filename needs an extension (.pdf, .png, .jpg or .jpeg)" };
  }
  if (!type.extensions.includes(extension)) {
    return { ok: false, error: `File extension .${extension} does not match the content (${type.mime})` };
  }
  const declared = ((_a = input.mime) != null ? _a : "").trim().toLowerCase();
  if (declared.length > 0 && declared !== "application/octet-stream" && declared !== type.mime) {
    return { ok: false, error: `Declared type ${declared} does not match the content (${type.mime})` };
  }
  return { ok: true, filename, mime: type.mime };
}
function attachmentDisposition(filename, disposition = "attachment") {
  const ascii = filename.replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/Ä/g, "Ae").replace(/Ö/g, "Oe").replace(/Ü/g, "Ue").replace(/ß/g, "ss").replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return `${disposition}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ATTACHMENT_MAX_BYTES,
  ATTACHMENT_MAX_COUNT,
  ATTACHMENT_TYPES,
  attachmentDisposition,
  attachmentExtension,
  checkAttachment,
  sanitizeAttachmentFilename,
  sniffAttachmentType
});
//# sourceMappingURL=attachments.js.map
