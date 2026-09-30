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
var pdf_attachments_exports = {};
__export(pdf_attachments_exports, {
  ATTACHMENT_AF_RELATIONSHIP: () => ATTACHMENT_AF_RELATIONSHIP,
  ATTACHMENT_EMBED_HINT: () => ATTACHMENT_EMBED_HINT,
  attachmentDescription: () => attachmentDescription,
  attachmentTypeLabel: () => attachmentTypeLabel,
  embedPdfAttachments: () => embedPdfAttachments,
  formatFileSize: () => formatFileSize
});
module.exports = __toCommonJS(pdf_attachments_exports);
var import_pdf_lib = require("pdf-lib");
const ATTACHMENT_AF_RELATIONSHIP = import_pdf_lib.AFRelationship.Data;
const ATTACHMENT_EMBED_HINT = "Die Anlagen sind in dieser Datei eingebettet (PDF/A-3) und kein externer Link.";
const ATTACHMENT_TYPE_LABELS = {
  "application/pdf": "PDF",
  "image/png": "PNG",
  "image/jpeg": "JPEG"
};
function attachmentTypeLabel(mime) {
  var _a;
  return (_a = ATTACHMENT_TYPE_LABELS[mime]) != null ? _a : mime;
}
function formatFileSize(bytes) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} kB`;
}
function attachmentDescription(filename) {
  return `Anlage zur Rechnung: ${filename}`;
}
async function embedPdfAttachments(pdfBytes, attachments) {
  if (attachments.length === 0) {
    return pdfBytes instanceof Uint8Array ? pdfBytes : new Uint8Array(pdfBytes);
  }
  const doc = await import_pdf_lib.PDFDocument.load(pdfBytes, { updateMetadata: false });
  for (const attachment of attachments) {
    await doc.attach(attachment.data, attachment.filename, {
      mimeType: attachment.mime,
      description: attachmentDescription(attachment.filename),
      afRelationship: ATTACHMENT_AF_RELATIONSHIP
    });
  }
  return doc.save();
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ATTACHMENT_AF_RELATIONSHIP,
  ATTACHMENT_EMBED_HINT,
  attachmentDescription,
  attachmentTypeLabel,
  embedPdfAttachments,
  formatFileSize
});
//# sourceMappingURL=pdf-attachments.js.map
