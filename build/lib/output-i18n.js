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
var output_i18n_exports = {};
__export(output_i18n_exports, {
  COPY_NOTICE: () => COPY_NOTICE,
  OUTPUT_LANGUAGES: () => OUTPUT_LANGUAGES,
  OUTPUT_TEXTS: () => OUTPUT_TEXTS,
  formatOutputAmount: () => formatOutputAmount,
  formatOutputDate: () => formatOutputDate,
  outputLanguage: () => outputLanguage,
  tr: () => tr
});
module.exports = __toCommonJS(output_i18n_exports);
const OUTPUT_LANGUAGES = ["en", "de", "ru", "pt", "nl", "fr", "it", "es", "pl", "uk", "zh-cn"];
function outputLanguage(...values) {
  for (const value of values) {
    const text = typeof value === "string" ? value.trim().toLowerCase() : "";
    if (OUTPUT_LANGUAGES.includes(text)) {
      return text;
    }
    const base = text.split(/[-_]/)[0];
    if (base === "zh") {
      return "zh-cn";
    }
    if (OUTPUT_LANGUAGES.includes(base)) {
      return base;
    }
  }
  return "en";
}
const COPY_NOTICE = "COPY \u2013 not a tax document. The embedded XML of the ZUGFeRD invoice is authoritative.";
const OUTPUT_TEXTS = {
  // --- notices and titles ---
  "COPY \u2013 not a tax document. The embedded XML of the ZUGFeRD invoice is authoritative.": {
    de: "KOPIE \u2013 kein Steuerdokument. Ma\xDFgeblich ist das eingebettete XML der ZUGFeRD-Rechnung.",
    ru: "\u041A\u041E\u041F\u0418\u042F \u2013 \u043D\u0435 \u043D\u0430\u043B\u043E\u0433\u043E\u0432\u044B\u0439 \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442. \u041E\u043F\u0440\u0435\u0434\u0435\u043B\u044F\u044E\u0449\u0438\u043C \u044F\u0432\u043B\u044F\u0435\u0442\u0441\u044F \u0432\u0441\u0442\u0440\u043E\u0435\u043D\u043D\u044B\u0439 XML \u0441\u0447\u0451\u0442\u0430 ZUGFeRD.",
    pt: "C\xD3PIA \u2013 n\xE3o \xE9 um documento fiscal. Prevalece o XML incorporado da fatura ZUGFeRD.",
    nl: "KOPIE \u2013 geen fiscaal document. De ingebedde XML van de ZUGFeRD-factuur is bepalend.",
    fr: "COPIE \u2013 pas un document fiscal. Le XML int\xE9gr\xE9 de la facture ZUGFeRD fait foi.",
    it: "COPIA \u2013 non \xE8 un documento fiscale. Fa fede l\u2019XML incorporato della fattura ZUGFeRD.",
    es: "COPIA \u2013 no es un documento fiscal. Prevalece el XML incrustado de la factura ZUGFeRD.",
    pl: "KOPIA \u2013 nie jest dokumentem podatkowym. Rozstrzygaj\u0105cy jest osadzony XML faktury ZUGFeRD.",
    uk: "\u041A\u041E\u041F\u0406\u042F \u2013 \u043D\u0435 \u043F\u043E\u0434\u0430\u0442\u043A\u043E\u0432\u0438\u0439 \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442. \u0412\u0438\u0437\u043D\u0430\u0447\u0430\u043B\u044C\u043D\u0438\u043C \u0454 \u0432\u0431\u0443\u0434\u043E\u0432\u0430\u043D\u0438\u0439 XML \u0440\u0430\u0445\u0443\u043D\u043A\u0443 ZUGFeRD.",
    "zh-cn": "\u526F\u672C\u2014\u2014\u975E\u7A0E\u52A1\u51ED\u8BC1\u3002\u4EE5 ZUGFeRD \u53D1\u7968\u4E2D\u5D4C\u5165\u7684 XML \u4E3A\u51C6\u3002"
  },
  "Invoice overview {date}": {
    de: "Rechnungs\xFCbersicht {date}",
    ru: "\u041E\u0431\u0437\u043E\u0440 \u0441\u0447\u0435\u0442\u043E\u0432 {date}",
    pt: "Resumo de faturas {date}",
    nl: "Factuuroverzicht {date}",
    fr: "Aper\xE7u des factures {date}",
    it: "Riepilogo fatture {date}",
    es: "Resumen de facturas {date}",
    pl: "Zestawienie faktur {date}",
    uk: "\u041E\u0433\u043B\u044F\u0434 \u0440\u0430\u0445\u0443\u043D\u043A\u0456\u0432 {date}",
    "zh-cn": "\u53D1\u7968\u6982\u89C8 {date}"
  },
  Overview: {
    de: "\xDCbersicht",
    ru: "\u041E\u0431\u0437\u043E\u0440",
    pt: "Resumo",
    nl: "Overzicht",
    fr: "Aper\xE7u",
    it: "Riepilogo",
    es: "Resumen",
    pl: "Zestawienie",
    uk: "\u041E\u0433\u043B\u044F\u0434",
    "zh-cn": "\u6982\u89C8"
  },
  "from {date}": {
    de: "ab {date}",
    ru: "\u0441 {date}",
    pt: "a partir de {date}",
    nl: "vanaf {date}",
    fr: "\xE0 partir du {date}",
    it: "dal {date}",
    es: "desde el {date}",
    pl: "od {date}",
    uk: "\u0437 {date}",
    "zh-cn": "\u81EA {date} \u8D77"
  },
  "until {date}": {
    de: "bis {date}",
    ru: "\u043F\u043E {date}",
    pt: "at\xE9 {date}",
    nl: "tot en met {date}",
    fr: "jusqu'au {date}",
    it: "fino al {date}",
    es: "hasta el {date}",
    pl: "do {date}",
    uk: "\u043F\u043E {date}",
    "zh-cn": "\u622A\u81F3 {date}"
  },
  "Open items as of {date}": {
    de: "Offene Posten zum {date}",
    ru: "\u041E\u0442\u043A\u0440\u044B\u0442\u044B\u0435 \u043F\u043E\u0437\u0438\u0446\u0438\u0438 \u043D\u0430 {date}",
    pt: "Itens em aberto em {date}",
    nl: "Openstaande posten per {date}",
    fr: "Postes ouverts au {date}",
    it: "Partite aperte al {date}",
    es: "Partidas pendientes a {date}",
    pl: "Pozycje otwarte na dzie\u0144 {date}",
    uk: "\u0412\u0456\u0434\u043A\u0440\u0438\u0442\u0456 \u043F\u043E\u0437\u0438\u0446\u0456\u0457 \u043D\u0430 {date}",
    "zh-cn": "\u622A\u81F3 {date} \u7684\u672A\u7ED3\u9879\u76EE"
  },
  "(overdue only)": {
    de: "(nur \xFCberf\xE4llige)",
    ru: "(\u0442\u043E\u043B\u044C\u043A\u043E \u043F\u0440\u043E\u0441\u0440\u043E\u0447\u0435\u043D\u043D\u044B\u0435)",
    pt: "(s\xF3 em atraso)",
    nl: "(alleen achterstallige)",
    fr: "(en retard uniquement)",
    it: "(solo scadute)",
    es: "(solo vencidas)",
    pl: "(tylko zaleg\u0142e)",
    uk: "(\u043B\u0438\u0448\u0435 \u043F\u0440\u043E\u0441\u0442\u0440\u043E\u0447\u0435\u043D\u0456)",
    "zh-cn": "\uFF08\u4EC5\u903E\u671F\uFF09"
  },
  "Open items": {
    de: "Offene Posten",
    ru: "\u041E\u0442\u043A\u0440\u044B\u0442\u044B\u0435 \u043F\u043E\u0437\u0438\u0446\u0438\u0438",
    pt: "Itens em aberto",
    nl: "Openstaande posten",
    fr: "Postes ouverts",
    it: "Partite aperte",
    es: "Partidas pendientes",
    pl: "Pozycje otwarte",
    uk: "\u0412\u0456\u0434\u043A\u0440\u0438\u0442\u0456 \u043F\u043E\u0437\u0438\u0446\u0456\u0457",
    "zh-cn": "\u672A\u7ED3\u9879\u76EE"
  },
  "Revenue by company": {
    de: "Umsatz je Firma",
    ru: "\u0412\u044B\u0440\u0443\u0447\u043A\u0430 \u043F\u043E \u0444\u0438\u0440\u043C\u0430\u043C",
    pt: "Receita por empresa",
    nl: "Omzet per bedrijf",
    fr: "Chiffre d\u2019affaires par soci\xE9t\xE9",
    it: "Fatturato per azienda",
    es: "Ingresos por empresa",
    pl: "Przych\xF3d wed\u0142ug firm",
    uk: "\u0412\u0438\u0440\u0443\u0447\u043A\u0430 \u0437\u0430 \u0444\u0456\u0440\u043C\u0430\u043C\u0438",
    "zh-cn": "\u6309\u516C\u53F8\u7EDF\u8BA1\u6536\u5165"
  },
  "without company assignment": {
    de: "ohne Firmenzuordnung",
    ru: "\u0431\u0435\u0437 \u043F\u0440\u0438\u0432\u044F\u0437\u043A\u0438 \u043A \u0444\u0438\u0440\u043C\u0435",
    pt: "sem empresa atribu\xEDda",
    nl: "zonder bedrijfstoewijzing",
    fr: "sans soci\xE9t\xE9 attribu\xE9e",
    it: "senza azienda assegnata",
    es: "sin empresa asignada",
    pl: "bez przypisanej firmy",
    uk: "\u0431\u0435\u0437 \u043F\u0440\u0438\u0432\u2019\u044F\u0437\u043A\u0438 \u0434\u043E \u0444\u0456\u0440\u043C\u0438",
    "zh-cn": "\u672A\u5173\u8054\u516C\u53F8"
  },
  "Dunning suggestions as of {date}": {
    de: "Mahnvorschl\xE4ge zum {date}",
    ru: "\u041F\u0440\u0435\u0434\u043B\u043E\u0436\u0435\u043D\u0438\u044F \u043D\u0430\u043F\u043E\u043C\u0438\u043D\u0430\u043D\u0438\u0439 \u043D\u0430 {date}",
    pt: "Sugest\xF5es de lembretes em {date}",
    nl: "Aanmaningsvoorstellen per {date}",
    fr: "Propositions de relance au {date}",
    it: "Proposte di sollecito al {date}",
    es: "Propuestas de reclamaci\xF3n a {date}",
    pl: "Propozycje monit\xF3w na dzie\u0144 {date}",
    uk: "\u041F\u0440\u043E\u043F\u043E\u0437\u0438\u0446\u0456\u0457 \u043D\u0430\u0433\u0430\u0434\u0443\u0432\u0430\u043D\u044C \u043D\u0430 {date}",
    "zh-cn": "\u622A\u81F3 {date} \u7684\u50AC\u6B3E\u5EFA\u8BAE"
  },
  // --- column headers ---
  "Invoice number": {
    de: "Rechnungsnummer",
    ru: "\u041D\u043E\u043C\u0435\u0440 \u0441\u0447\u0451\u0442\u0430",
    pt: "N\xFAmero da fatura",
    nl: "Factuurnummer",
    fr: "Num\xE9ro de facture",
    it: "Numero fattura",
    es: "N\xFAmero de factura",
    pl: "Numer faktury",
    uk: "\u041D\u043E\u043C\u0435\u0440 \u0440\u0430\u0445\u0443\u043D\u043A\u0443",
    "zh-cn": "\u53D1\u7968\u53F7"
  },
  "Invoice date": {
    de: "Rechnungsdatum",
    ru: "\u0414\u0430\u0442\u0430 \u0441\u0447\u0451\u0442\u0430",
    pt: "Data da fatura",
    nl: "Factuurdatum",
    fr: "Date de facture",
    it: "Data fattura",
    es: "Fecha de factura",
    pl: "Data faktury",
    uk: "\u0414\u0430\u0442\u0430 \u0440\u0430\u0445\u0443\u043D\u043A\u0443",
    "zh-cn": "\u53D1\u7968\u65E5\u671F"
  },
  "Document type": {
    de: "Belegart",
    ru: "\u0422\u0438\u043F \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u0430",
    pt: "Tipo de documento",
    nl: "Documenttype",
    fr: "Type de document",
    it: "Tipo di documento",
    es: "Tipo de documento",
    pl: "Rodzaj dokumentu",
    uk: "\u0422\u0438\u043F \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u0430",
    "zh-cn": "\u5355\u636E\u7C7B\u578B"
  },
  State: {
    de: "Zustand",
    ru: "\u0421\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435",
    pt: "Estado",
    nl: "Toestand",
    fr: "\xC9tat",
    it: "Stato",
    es: "Estado",
    pl: "Stan",
    uk: "\u0421\u0442\u0430\u043D",
    "zh-cn": "\u72B6\u6001"
  },
  "Due date": {
    de: "F\xE4lligkeit",
    ru: "\u0421\u0440\u043E\u043A \u043E\u043F\u043B\u0430\u0442\u044B",
    pt: "Data de vencimento",
    nl: "Vervaldatum",
    fr: "Date d'\xE9ch\xE9ance",
    it: "Scadenza",
    es: "Fecha de vencimiento",
    pl: "Termin p\u0142atno\u015Bci",
    uk: "\u0421\u0442\u0440\u043E\u043A \u043E\u043F\u043B\u0430\u0442\u0438",
    "zh-cn": "\u5230\u671F\u65E5"
  },
  "Sent on": {
    de: "Versendet am",
    ru: "\u041E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D",
    pt: "Enviada em",
    nl: "Verzonden op",
    fr: "Envoy\xE9e le",
    it: "Inviata il",
    es: "Enviada el",
    pl: "Wys\u0142ano dnia",
    uk: "\u041D\u0430\u0434\u0456\u0441\u043B\u0430\u043D\u043E",
    "zh-cn": "\u53D1\u9001\u65E5\u671F"
  },
  "Paid on": {
    de: "Bezahlt am",
    ru: "\u041E\u043F\u043B\u0430\u0447\u0435\u043D",
    pt: "Paga em",
    nl: "Betaald op",
    fr: "Pay\xE9e le",
    it: "Pagata il",
    es: "Pagada el",
    pl: "Zap\u0142acono dnia",
    uk: "\u041E\u043F\u043B\u0430\u0447\u0435\u043D\u043E",
    "zh-cn": "\u4ED8\u6B3E\u65E5\u671F"
  },
  "Created on": {
    de: "Erstellt am",
    ru: "\u0421\u043E\u0437\u0434\u0430\u043D",
    pt: "Criada em",
    nl: "Aangemaakt op",
    fr: "Cr\xE9\xE9e le",
    it: "Creata il",
    es: "Creada el",
    pl: "Utworzono dnia",
    uk: "\u0421\u0442\u0432\u043E\u0440\u0435\u043D\u043E",
    "zh-cn": "\u521B\u5EFA\u65E5\u671F"
  },
  "Customer number": {
    de: "Kundennummer",
    ru: "\u041D\u043E\u043C\u0435\u0440 \u043A\u043B\u0438\u0435\u043D\u0442\u0430",
    pt: "N\xFAmero de cliente",
    nl: "Klantnummer",
    fr: "Num\xE9ro client",
    it: "Numero cliente",
    es: "N\xFAmero de cliente",
    pl: "Numer klienta",
    uk: "\u041D\u043E\u043C\u0435\u0440 \u043A\u043B\u0456\u0454\u043D\u0442\u0430",
    "zh-cn": "\u5BA2\u6237\u7F16\u53F7"
  },
  Customer: {
    de: "Kunde",
    ru: "\u041A\u043B\u0438\u0435\u043D\u0442",
    pt: "Cliente",
    nl: "Klant",
    fr: "Client",
    it: "Cliente",
    es: "Cliente",
    pl: "Klient",
    uk: "\u041A\u043B\u0456\u0454\u043D\u0442",
    "zh-cn": "\u5BA2\u6237"
  },
  City: {
    de: "Ort",
    ru: "\u0413\u043E\u0440\u043E\u0434",
    pt: "Localidade",
    nl: "Plaats",
    fr: "Ville",
    it: "Citt\xE0",
    es: "Ciudad",
    pl: "Miejscowo\u015B\u0107",
    uk: "\u041C\u0456\u0441\u0442\u043E",
    "zh-cn": "\u57CE\u5E02"
  },
  "VAT ID": {
    de: "USt-IdNr",
    ru: "\u041D\u043E\u043C\u0435\u0440 \u043F\u043B\u0430\u0442\u0435\u043B\u044C\u0449\u0438\u043A\u0430 \u041D\u0414\u0421",
    pt: "NIF IVA",
    nl: "Btw-nummer",
    fr: "Num\xE9ro de TVA",
    it: "Partita IVA",
    es: "NIF-IVA",
    pl: "NIP UE",
    uk: "\u041D\u043E\u043C\u0435\u0440 \u043F\u043B\u0430\u0442\u043D\u0438\u043A\u0430 \u041F\u0414\u0412",
    "zh-cn": "\u589E\u503C\u7A0E\u53F7"
  },
  "Net EUR": {
    de: "Netto EUR",
    ru: "\u041D\u0435\u0442\u0442\u043E EUR",
    pt: "L\xEDquido EUR",
    nl: "Netto in EUR",
    fr: "HT EUR",
    it: "Imponibile EUR",
    es: "Neto EUR",
    pl: "Netto w EUR",
    uk: "\u041D\u0435\u0442\u0442\u043E EUR",
    "zh-cn": "\u4E0D\u542B\u7A0E EUR"
  },
  "VAT EUR": {
    de: "USt EUR",
    ru: "\u041D\u0414\u0421 EUR",
    pt: "IVA EUR",
    nl: "Btw EUR",
    fr: "TVA EUR",
    it: "IVA EUR",
    es: "IVA EUR",
    pl: "VAT w EUR",
    uk: "\u041F\u0414\u0412 EUR",
    "zh-cn": "\u589E\u503C\u7A0E EUR"
  },
  "Gross EUR": {
    de: "Brutto EUR",
    ru: "\u0411\u0440\u0443\u0442\u0442\u043E EUR",
    pt: "Bruto EUR",
    nl: "Bruto EUR",
    fr: "TTC EUR",
    it: "Totale EUR",
    es: "Bruto EUR",
    pl: "Brutto w EUR",
    uk: "\u0411\u0440\u0443\u0442\u0442\u043E EUR",
    "zh-cn": "\u542B\u7A0E EUR"
  },
  "Cash discount percent": {
    de: "Skonto Prozent",
    ru: "\u0421\u043A\u0438\u0434\u043A\u0430 \u0437\u0430 \u043E\u043F\u043B\u0430\u0442\u0443, %",
    pt: "Desconto de pronto pagamento %",
    nl: "Betalingskorting %",
    fr: "Escompte en %",
    it: "Sconto cassa %",
    es: "Descuento por pronto pago %",
    pl: "Skonto w procentach",
    uk: "\u0417\u043D\u0438\u0436\u043A\u0430 \u0437\u0430 \u043E\u043F\u043B\u0430\u0442\u0443, %",
    "zh-cn": "\u73B0\u91D1\u6298\u6263\u767E\u5206\u6BD4"
  },
  "Keep until": {
    de: "Aufbewahren bis",
    ru: "\u0425\u0440\u0430\u043D\u0438\u0442\u044C \u0434\u043E",
    pt: "Guardar at\xE9",
    nl: "Bewaren tot",
    fr: "Conserver jusqu'au",
    it: "Conservare fino al",
    es: "Conservar hasta",
    pl: "Przechowywa\u0107 do",
    uk: "\u0417\u0431\u0435\u0440\u0456\u0433\u0430\u0442\u0438 \u0434\u043E",
    "zh-cn": "\u4FDD\u5B58\u81F3"
  },
  "PDF file": {
    de: "PDF-Datei",
    ru: "\u0424\u0430\u0439\u043B PDF",
    pt: "Ficheiro PDF",
    nl: "PDF-bestand",
    fr: "Fichier PDF",
    it: "File PDF",
    es: "Archivo PDF",
    pl: "Plik PDF",
    uk: "\u0424\u0430\u0439\u043B PDF",
    "zh-cn": "PDF \u6587\u4EF6"
  },
  "Due on": {
    de: "F\xE4llig am",
    ru: "\u0421\u0440\u043E\u043A \u043E\u043F\u043B\u0430\u0442\u044B",
    pt: "Vence em",
    nl: "Vervalt op",
    fr: "\xC9ch\xE9ance le",
    it: "Scade il",
    es: "Vence el",
    pl: "Termin",
    uk: "\u0421\u0442\u0440\u043E\u043A \u043E\u043F\u043B\u0430\u0442\u0438",
    "zh-cn": "\u5230\u671F\u65E5"
  },
  "Days overdue": {
    de: "Tage \xFCberf\xE4llig",
    ru: "\u0414\u043D\u0435\u0439 \u043F\u0440\u043E\u0441\u0440\u043E\u0447\u043A\u0438",
    pt: "Dias em atraso",
    nl: "Dagen achterstallig",
    fr: "Jours de retard",
    it: "Giorni di ritardo",
    es: "D\xEDas de retraso",
    pl: "Dni zaleg\u0142o\u015Bci",
    uk: "\u0414\u043D\u0456\u0432 \u043F\u0440\u043E\u0441\u0442\u0440\u043E\u0447\u0435\u043D\u043D\u044F",
    "zh-cn": "\u903E\u671F\u5929\u6570"
  },
  Age: {
    de: "Alterung",
    ru: "\u0412\u043E\u0437\u0440\u0430\u0441\u0442",
    pt: "Antiguidade",
    nl: "Ouderdom",
    fr: "Anciennet\xE9",
    it: "Anzianit\xE0",
    es: "Antig\xFCedad",
    pl: "Wiekowanie",
    uk: "\u0412\u0456\u043A",
    "zh-cn": "\u8D26\u9F84"
  },
  "Open amount EUR": {
    de: "Offener Betrag EUR",
    ru: "\u041E\u0442\u043A\u0440\u044B\u0442\u0430\u044F \u0441\u0443\u043C\u043C\u0430 EUR",
    pt: "Valor em aberto EUR",
    nl: "Openstaand bedrag EUR",
    fr: "Montant ouvert EUR",
    it: "Importo aperto EUR",
    es: "Importe pendiente EUR",
    pl: "Kwota otwarta w EUR",
    uk: "\u0412\u0456\u0434\u043A\u0440\u0438\u0442\u0430 \u0441\u0443\u043C\u0430 EUR",
    "zh-cn": "\u672A\u7ED3\u91D1\u989D EUR"
  },
  "Open amount": {
    de: "Offener Betrag",
    ru: "\u041E\u0442\u043A\u0440\u044B\u0442\u0430\u044F \u0441\u0443\u043C\u043C\u0430",
    pt: "Valor em aberto",
    nl: "Openstaand bedrag",
    fr: "Montant ouvert",
    it: "Importo aperto",
    es: "Importe pendiente",
    pl: "Kwota otwarta",
    uk: "\u0412\u0456\u0434\u043A\u0440\u0438\u0442\u0430 \u0441\u0443\u043C\u0430",
    "zh-cn": "\u672A\u7ED3\u91D1\u989D"
  },
  "Dunning level": {
    de: "Mahnstufe",
    ru: "\u0423\u0440\u043E\u0432\u0435\u043D\u044C \u043D\u0430\u043F\u043E\u043C\u0438\u043D\u0430\u043D\u0438\u044F",
    pt: "N\xEDvel de lembrete",
    nl: "Aanmaningsniveau",
    fr: "Niveau de relance",
    it: "Livello di sollecito",
    es: "Nivel de reclamaci\xF3n",
    pl: "Poziom monitu",
    uk: "\u0420\u0456\u0432\u0435\u043D\u044C \u043D\u0430\u0433\u0430\u0434\u0443\u0432\u0430\u043D\u043D\u044F",
    "zh-cn": "\u50AC\u6B3E\u7EA7\u522B"
  },
  Total: {
    de: "Summe",
    ru: "\u0418\u0442\u043E\u0433\u043E",
    pt: "Soma",
    nl: "Som",
    fr: "Somme",
    it: "Somma",
    es: "Suma",
    pl: "Suma",
    uk: "\u0420\u0430\u0437\u043E\u043C",
    "zh-cn": "\u5408\u8BA1"
  },
  all: {
    de: "gesamt",
    ru: "\u0432\u0441\u0435\u0433\u043E",
    pt: "tudo",
    nl: "totaal",
    fr: "ensemble",
    it: "complessivo",
    es: "en conjunto",
    pl: "\u0142\u0105cznie",
    uk: "\u0443\u0441\u044C\u043E\u0433\u043E",
    "zh-cn": "\u5168\u90E8"
  },
  "of which overdue": {
    de: "davon \xFCberf\xE4llig",
    ru: "\u0438\u0437 \u043D\u0438\u0445 \u043F\u0440\u043E\u0441\u0440\u043E\u0447\u0435\u043D\u043E",
    pt: "dos quais em atraso",
    nl: "waarvan achterstallig",
    fr: "dont en retard",
    it: "di cui scaduti",
    es: "de ellos vencidos",
    pl: "w tym zaleg\u0142e",
    uk: "\u0437 \u043D\u0438\u0445 \u043F\u0440\u043E\u0441\u0442\u0440\u043E\u0447\u0435\u043D\u043E",
    "zh-cn": "\u5176\u4E2D\u903E\u671F"
  },
  Count: {
    de: "Anzahl",
    ru: "\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E",
    pt: "Quantidade",
    nl: "Aantal",
    fr: "Nombre",
    it: "Quantit\xE0",
    es: "Cantidad",
    pl: "Liczba",
    uk: "\u041A\u0456\u043B\u044C\u043A\u0456\u0441\u0442\u044C",
    "zh-cn": "\u6570\u91CF"
  },
  Amount: {
    de: "Betrag",
    ru: "\u0421\u0443\u043C\u043C\u0430",
    pt: "Valor",
    nl: "Bedrag",
    fr: "Montant",
    it: "Importo",
    es: "Importe",
    pl: "Kwota",
    uk: "\u0421\u0443\u043C\u0430",
    "zh-cn": "\u91D1\u989D"
  },
  Company: {
    de: "Firma",
    ru: "\u0424\u0438\u0440\u043C\u0430",
    pt: "Empresa",
    nl: "Bedrijf",
    fr: "Soci\xE9t\xE9",
    it: "Azienda",
    es: "Empresa",
    pl: "Firma",
    uk: "\u0424\u0456\u0440\u043C\u0430",
    "zh-cn": "\u516C\u53F8"
  },
  "Number of invoices": {
    de: "Anzahl Rechnungen",
    ru: "\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E \u0441\u0447\u0435\u0442\u043E\u0432",
    pt: "N\xFAmero de faturas",
    nl: "Aantal facturen",
    fr: "Nombre de factures",
    it: "Numero di fatture",
    es: "N\xFAmero de facturas",
    pl: "Liczba faktur",
    uk: "\u041A\u0456\u043B\u044C\u043A\u0456\u0441\u0442\u044C \u0440\u0430\u0445\u0443\u043D\u043A\u0456\u0432",
    "zh-cn": "\u53D1\u7968\u6570\u91CF"
  },
  "E-mail": {
    de: "E-Mail",
    ru: "\u042D\u043B. \u043F\u043E\u0447\u0442\u0430",
    pt: "Correio eletr\xF3nico",
    nl: "E-mailadres",
    fr: "Courriel",
    it: "Posta elettronica",
    es: "Correo electr\xF3nico",
    pl: "Adres e-mail",
    uk: "\u0415\u043B. \u043F\u043E\u0448\u0442\u0430",
    "zh-cn": "\u7535\u5B50\u90AE\u4EF6"
  },
  Level: {
    de: "Stufe",
    ru: "\u0423\u0440\u043E\u0432\u0435\u043D\u044C",
    pt: "N\xEDvel",
    nl: "Niveau",
    fr: "Niveau",
    it: "Livello",
    es: "Nivel",
    pl: "Poziom",
    uk: "\u0420\u0456\u0432\u0435\u043D\u044C",
    "zh-cn": "\u7EA7\u522B"
  },
  "Payment deadline": {
    de: "Zahlungsziel",
    ru: "\u0421\u0440\u043E\u043A \u043F\u043B\u0430\u0442\u0435\u0436\u0430",
    pt: "Prazo de pagamento",
    nl: "Betalingstermijn",
    fr: "D\xE9lai de paiement",
    it: "Termine di pagamento",
    es: "Plazo de pago",
    pl: "Termin zap\u0142aty",
    uk: "\u0421\u0442\u0440\u043E\u043A \u043F\u043B\u0430\u0442\u0435\u0436\u0443",
    "zh-cn": "\u4ED8\u6B3E\u671F\u9650"
  },
  Number: {
    de: "Nummer",
    ru: "\u041D\u043E\u043C\u0435\u0440",
    pt: "N\xFAmero",
    nl: "Nummer",
    fr: "Num\xE9ro",
    it: "Numero",
    es: "N\xFAmero",
    pl: "Numer",
    uk: "\u041D\u043E\u043C\u0435\u0440",
    "zh-cn": "\u7F16\u53F7"
  },
  Buyer: {
    de: "K\xE4ufer",
    ru: "\u041F\u043E\u043A\u0443\u043F\u0430\u0442\u0435\u043B\u044C",
    pt: "Comprador",
    nl: "Koper",
    fr: "Acheteur",
    it: "Acquirente",
    es: "Comprador",
    pl: "Nabywca",
    uk: "\u041F\u043E\u043A\u0443\u043F\u0435\u0446\u044C",
    "zh-cn": "\u4E70\u65B9"
  },
  Net: {
    de: "Netto",
    ru: "\u041D\u0435\u0442\u0442\u043E",
    pt: "L\xEDquido",
    nl: "Netto",
    fr: "HT",
    it: "Imponibile",
    es: "Neto",
    pl: "Netto",
    uk: "\u041D\u0435\u0442\u0442\u043E",
    "zh-cn": "\u4E0D\u542B\u7A0E"
  },
  VAT: {
    de: "USt",
    ru: "\u041D\u0414\u0421",
    pt: "IVA",
    nl: "Btw",
    fr: "TVA",
    it: "IVA",
    es: "IVA",
    pl: "Podatek VAT",
    uk: "\u041F\u0414\u0412",
    "zh-cn": "\u589E\u503C\u7A0E"
  },
  Gross: {
    de: "Brutto",
    ru: "\u0411\u0440\u0443\u0442\u0442\u043E",
    pt: "Bruto",
    nl: "Bruto",
    fr: "TTC",
    it: "Totale",
    es: "Bruto",
    pl: "Brutto",
    uk: "\u0411\u0440\u0443\u0442\u0442\u043E",
    "zh-cn": "\u542B\u7A0E"
  },
  "(draft)": {
    de: "(Entwurf)",
    ru: "(\u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A)",
    pt: "(rascunho)",
    nl: "(concept)",
    fr: "(brouillon)",
    it: "(bozza)",
    es: "(borrador)",
    pl: "(szkic)",
    uk: "(\u0447\u0435\u0440\u043D\u0435\u0442\u043A\u0430)",
    "zh-cn": "\uFF08\u8349\u7A3F\uFF09"
  },
  "Cash discount %": {
    de: "Skonto %",
    ru: "\u0421\u043A\u0438\u0434\u043A\u0430, %",
    pt: "Desconto %",
    nl: "Korting %",
    fr: "Escompte %",
    it: "Sconto %",
    es: "Descuento %",
    pl: "Skonto %",
    uk: "\u0417\u043D\u0438\u0436\u043A\u0430, %",
    "zh-cn": "\u73B0\u91D1\u6298\u6263 %"
  },
  // --- age buckets ---
  "not due": {
    de: "nicht f\xE4llig",
    ru: "\u0441\u0440\u043E\u043A \u043D\u0435 \u043D\u0430\u0441\u0442\u0443\u043F\u0438\u043B",
    pt: "n\xE3o vencido",
    nl: "niet vervallen",
    fr: "non \xE9chu",
    it: "non scaduto",
    es: "no vencido",
    pl: "niewymagalne",
    uk: "\u0441\u0442\u0440\u043E\u043A \u043D\u0435 \u043D\u0430\u0441\u0442\u0430\u0432",
    "zh-cn": "\u672A\u5230\u671F"
  },
  "1\u201330 days overdue": {
    de: "1\u201330 Tage \xFCberf\xE4llig",
    ru: "\u043F\u0440\u043E\u0441\u0440\u043E\u0447\u0435\u043D\u043E \u043D\u0430 1\u201330 \u0434\u043D\u0435\u0439",
    pt: "1\u201330 dias em atraso",
    nl: "1\u201330 dagen achterstallig",
    fr: "1\u201330 jours de retard",
    it: "1\u201330 giorni di ritardo",
    es: "1\u201330 d\xEDas de retraso",
    pl: "1\u201330 dni zaleg\u0142o\u015Bci",
    uk: "\u043F\u0440\u043E\u0441\u0442\u0440\u043E\u0447\u0435\u043D\u043E \u043D\u0430 1\u201330 \u0434\u043D\u0456\u0432",
    "zh-cn": "\u903E\u671F 1\u201330 \u5929"
  },
  "31\u201360 days overdue": {
    de: "31\u201360 Tage \xFCberf\xE4llig",
    ru: "\u043F\u0440\u043E\u0441\u0440\u043E\u0447\u0435\u043D\u043E \u043D\u0430 31\u201360 \u0434\u043D\u0435\u0439",
    pt: "31\u201360 dias em atraso",
    nl: "31\u201360 dagen achterstallig",
    fr: "31\u201360 jours de retard",
    it: "31\u201360 giorni di ritardo",
    es: "31\u201360 d\xEDas de retraso",
    pl: "31\u201360 dni zaleg\u0142o\u015Bci",
    uk: "\u043F\u0440\u043E\u0441\u0442\u0440\u043E\u0447\u0435\u043D\u043E \u043D\u0430 31\u201360 \u0434\u043D\u0456\u0432",
    "zh-cn": "\u903E\u671F 31\u201360 \u5929"
  },
  "61\u201390 days overdue": {
    de: "61\u201390 Tage \xFCberf\xE4llig",
    ru: "\u043F\u0440\u043E\u0441\u0440\u043E\u0447\u0435\u043D\u043E \u043D\u0430 61\u201390 \u0434\u043D\u0435\u0439",
    pt: "61\u201390 dias em atraso",
    nl: "61\u201390 dagen achterstallig",
    fr: "61\u201390 jours de retard",
    it: "61\u201390 giorni di ritardo",
    es: "61\u201390 d\xEDas de retraso",
    pl: "61\u201390 dni zaleg\u0142o\u015Bci",
    uk: "\u043F\u0440\u043E\u0441\u0442\u0440\u043E\u0447\u0435\u043D\u043E \u043D\u0430 61\u201390 \u0434\u043D\u0456\u0432",
    "zh-cn": "\u903E\u671F 61\u201390 \u5929"
  },
  "over 90 days overdue": {
    de: "\xFCber 90 Tage \xFCberf\xE4llig",
    ru: "\u043F\u0440\u043E\u0441\u0440\u043E\u0447\u0435\u043D\u043E \u0431\u043E\u043B\u0435\u0435 90 \u0434\u043D\u0435\u0439",
    pt: "mais de 90 dias em atraso",
    nl: "meer dan 90 dagen achterstallig",
    fr: "plus de 90 jours de retard",
    it: "oltre 90 giorni di ritardo",
    es: "m\xE1s de 90 d\xEDas de retraso",
    pl: "ponad 90 dni zaleg\u0142o\u015Bci",
    uk: "\u043F\u0440\u043E\u0441\u0442\u0440\u043E\u0447\u0435\u043D\u043E \u043F\u043E\u043D\u0430\u0434 90 \u0434\u043D\u0456\u0432",
    "zh-cn": "\u903E\u671F\u8D85\u8FC7 90 \u5929"
  },
  // --- dunning letters ---
  "Payment reminders and dunning notices": {
    de: "Zahlungserinnerungen und Mahnungen",
    ru: "\u041D\u0430\u043F\u043E\u043C\u0438\u043D\u0430\u043D\u0438\u044F \u043E\u0431 \u043E\u043F\u043B\u0430\u0442\u0435 \u0438 \u043F\u0440\u0435\u0442\u0435\u043D\u0437\u0438\u0438",
    pt: "Lembretes de pagamento e avisos de cobran\xE7a",
    nl: "Betalingsherinneringen en aanmaningen",
    fr: "Rappels de paiement et lettres de relance",
    it: "Promemoria di pagamento e solleciti",
    es: "Recordatorios de pago y reclamaciones",
    pl: "Przypomnienia o p\u0142atno\u015Bci i monity",
    uk: "\u041D\u0430\u0433\u0430\u0434\u0443\u0432\u0430\u043D\u043D\u044F \u043F\u0440\u043E \u043E\u043F\u043B\u0430\u0442\u0443 \u0442\u0430 \u043F\u0440\u0435\u0442\u0435\u043D\u0437\u0456\u0457",
    "zh-cn": "\u4ED8\u6B3E\u63D0\u9192\u4E0E\u50AC\u6B3E\u51FD"
  },
  "Date: {date}": {
    de: "Datum: {date}",
    ru: "\u0414\u0430\u0442\u0430: {date}",
    pt: "Data: {date}",
    nl: "Datum: {date}",
    fr: "Date : {date}",
    it: "Data: {date}",
    es: "Fecha: {date}",
    pl: "Data: {date}",
    uk: "\u0414\u0430\u0442\u0430: {date}",
    "zh-cn": "\u65E5\u671F\uFF1A{date}"
  },
  "No dunning suggestions.": {
    de: "Keine Mahnvorschl\xE4ge.",
    ru: "\u041F\u0440\u0435\u0434\u043B\u043E\u0436\u0435\u043D\u0438\u0439 \u043D\u0430\u043F\u043E\u043C\u0438\u043D\u0430\u043D\u0438\u0439 \u043D\u0435\u0442.",
    pt: "N\xE3o h\xE1 sugest\xF5es de lembretes.",
    nl: "Geen aanmaningsvoorstellen.",
    fr: "Aucune proposition de relance.",
    it: "Nessuna proposta di sollecito.",
    es: "No hay propuestas de reclamaci\xF3n.",
    pl: "Brak propozycji monit\xF3w.",
    uk: "\u041F\u0440\u043E\u043F\u043E\u0437\u0438\u0446\u0456\u0439 \u043D\u0430\u0433\u0430\u0434\u0443\u0432\u0430\u043D\u044C \u043D\u0435\u043C\u0430\u0454.",
    "zh-cn": "\u6CA1\u6709\u50AC\u6B3E\u5EFA\u8BAE\u3002"
  },
  "If you pay by {date}, you can still deduct a cash discount of {percent} %.": {
    de: "Bei Zahlung bis zum {date} k\xF6nnen Sie noch {percent} % Skonto abziehen.",
    ru: "\u041F\u0440\u0438 \u043E\u043F\u043B\u0430\u0442\u0435 \u0434\u043E {date} \u0432\u044B \u0435\u0449\u0451 \u043C\u043E\u0436\u0435\u0442\u0435 \u0432\u044B\u0447\u0435\u0441\u0442\u044C \u0441\u043A\u0438\u0434\u043A\u0443 {percent} %.",
    pt: "Se pagar at\xE9 {date}, ainda pode deduzir um desconto de {percent} %.",
    nl: "Bij betaling uiterlijk {date} mag u nog {percent} % betalingskorting aftrekken.",
    fr: "En payant d'ici le {date}, vous pouvez encore d\xE9duire un escompte de {percent} %.",
    it: "Pagando entro il {date} potete ancora detrarre uno sconto cassa del {percent} %.",
    es: "Si paga antes del {date}, a\xFAn puede deducir un descuento del {percent} %.",
    pl: "Przy zap\u0142acie do {date} mo\u017Cna jeszcze odliczy\u0107 {percent} % skonta.",
    uk: "\u0423 \u0440\u0430\u0437\u0456 \u043E\u043F\u043B\u0430\u0442\u0438 \u0434\u043E {date} \u0432\u0438 \u0449\u0435 \u043C\u043E\u0436\u0435\u0442\u0435 \u0432\u0456\u0434\u0440\u0430\u0445\u0443\u0432\u0430\u0442\u0438 \u0437\u043D\u0438\u0436\u043A\u0443 {percent} %.",
    "zh-cn": "\u5982\u5728 {date} \u524D\u4ED8\u6B3E\uFF0C\u4ECD\u53EF\u6263\u9664 {percent} % \u7684\u73B0\u91D1\u6298\u6263\u3002"
  }
};
function tr(language, key, vars) {
  var _a, _b;
  const text = language === "en" ? key : (_b = (_a = OUTPUT_TEXTS[key]) == null ? void 0 : _a[language]) != null ? _b : key;
  return vars ? text.replace(/\{(\w+)\}/g, (slot, name) => name in vars ? String(vars[name]) : slot) : text;
}
const LOCALES = {
  en: "en-GB",
  de: "de-DE",
  ru: "ru-RU",
  pt: "pt-PT",
  nl: "nl-NL",
  fr: "fr-FR",
  it: "it-IT",
  es: "es-ES",
  pl: "pl-PL",
  uk: "uk-UA",
  "zh-cn": "zh-CN"
};
function formatOutputDate(iso, language) {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) {
    return iso;
  }
  if (language === "de") {
    return `${String(day).padStart(2, "0")}.${String(month).padStart(2, "0")}.${year}`;
  }
  return new Intl.DateTimeFormat(LOCALES[language], {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "UTC"
  }).format(new Date(Date.UTC(year, month - 1, day)));
}
function formatOutputAmount(amount, language) {
  if (language === "de") {
    return `${amount.toFixed(2).replace(".", ",")} \u20AC`;
  }
  return new Intl.NumberFormat(LOCALES[language], { style: "currency", currency: "EUR" }).format(amount);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  COPY_NOTICE,
  OUTPUT_LANGUAGES,
  OUTPUT_TEXTS,
  formatOutputAmount,
  formatOutputDate,
  outputLanguage,
  tr
});
//# sourceMappingURL=output-i18n.js.map
