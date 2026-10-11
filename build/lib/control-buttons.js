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
var control_buttons_exports = {};
__export(control_buttons_exports, {
  BUTTON_STATES: () => BUTTON_STATES,
  isButtonPress: () => isButtonPress
});
module.exports = __toCommonJS(control_buttons_exports);
const BUTTON_STATES = /* @__PURE__ */ new Set(["createDraft", "issue", "refresh", "backup", "restore"]);
function isButtonPress(namespace, id, state) {
  const prefix = `${namespace}.control.`;
  return Boolean(state) && (state == null ? void 0 : state.ack) === false && state.val === true && id.startsWith(prefix) && BUTTON_STATES.has(id.slice(prefix.length));
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BUTTON_STATES,
  isButtonPress
});
//# sourceMappingURL=control-buttons.js.map
