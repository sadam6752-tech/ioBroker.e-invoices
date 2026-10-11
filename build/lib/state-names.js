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
var state_names_exports = {};
__export(state_names_exports, {
  STATE_NAMES: () => STATE_NAMES
});
module.exports = __toCommonJS(state_names_exports);
const STATE_NAMES = {
  info: {
    en: "Information",
    de: "Information",
    ru: "\u0418\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u044F",
    pt: "Informa\xE7\xE3o",
    nl: "Informatie",
    fr: "Informations",
    it: "Informazioni",
    es: "Informaci\xF3n",
    pl: "Informacje",
    uk: "\u0406\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0456\u044F",
    "zh-cn": "\u4FE1\u606F"
  },
  "info.connection": {
    en: "Device or service connected",
    de: "Ger\xE4t oder Dienst verbunden",
    ru: "\u0423\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u043E \u0438\u043B\u0438 \u0441\u043B\u0443\u0436\u0431\u0430 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u044B",
    pt: "Dispositivo ou servi\xE7o ligado",
    nl: "Apparaat of dienst verbonden",
    fr: "Appareil ou service connect\xE9",
    it: "Dispositivo o servizio connesso",
    es: "Dispositivo o servicio conectado",
    pl: "Urz\u0105dzenie lub us\u0142uga po\u0142\u0105czone",
    uk: "\u041F\u0440\u0438\u0441\u0442\u0440\u0456\u0439 \u0430\u0431\u043E \u0441\u043B\u0443\u0436\u0431\u0430 \u043F\u0456\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0456",
    "zh-cn": "\u8BBE\u5907\u6216\u670D\u52A1\u5DF2\u8FDE\u63A5"
  },
  "info.invoiceCount": {
    en: "Total invoices",
    de: "Rechnungen insgesamt",
    ru: "\u0412\u0441\u0435\u0433\u043E \u0441\u0447\u0435\u0442\u043E\u0432",
    pt: "Total de faturas",
    nl: "Totaal aantal facturen",
    fr: "Total des factures",
    it: "Totale fatture",
    es: "Total de facturas",
    pl: "Liczba faktur",
    uk: "\u0423\u0441\u044C\u043E\u0433\u043E \u0440\u0430\u0445\u0443\u043D\u043A\u0456\u0432",
    "zh-cn": "\u53D1\u7968\u603B\u6570"
  },
  "info.draftCount": {
    en: "Draft invoices",
    de: "Rechnungsentw\xFCrfe",
    ru: "\u0427\u0435\u0440\u043D\u043E\u0432\u0438\u043A\u0438 \u0441\u0447\u0435\u0442\u043E\u0432",
    pt: "Rascunhos de faturas",
    nl: "Conceptfacturen",
    fr: "Brouillons de factures",
    it: "Bozze di fatture",
    es: "Borradores de facturas",
    pl: "Szkice faktur",
    uk: "\u0427\u0435\u0440\u043D\u0435\u0442\u043A\u0438 \u0440\u0430\u0445\u0443\u043D\u043A\u0456\u0432",
    "zh-cn": "\u53D1\u7968\u8349\u7A3F"
  },
  "info.issuedCount": {
    en: "Issued invoices",
    de: "Ausgestellte Rechnungen",
    ru: "\u0412\u044B\u0441\u0442\u0430\u0432\u043B\u0435\u043D\u043D\u044B\u0435 \u0441\u0447\u0435\u0442\u0430",
    pt: "Faturas emitidas",
    nl: "Uitgegeven facturen",
    fr: "Factures \xE9mises",
    it: "Fatture emesse",
    es: "Facturas emitidas",
    pl: "Wystawione faktury",
    uk: "\u0412\u0438\u0441\u0442\u0430\u0432\u043B\u0435\u043D\u0456 \u0440\u0430\u0445\u0443\u043D\u043A\u0438",
    "zh-cn": "\u5DF2\u5F00\u5177\u53D1\u7968"
  },
  "info.lastNumber": {
    en: "Last issued number",
    de: "Zuletzt vergebene Nummer",
    ru: "\u041F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0439 \u0432\u044B\u0434\u0430\u043D\u043D\u044B\u0439 \u043D\u043E\u043C\u0435\u0440",
    pt: "\xDAltimo n\xFAmero atribu\xEDdo",
    nl: "Laatst toegekende nummer",
    fr: "Dernier num\xE9ro attribu\xE9",
    it: "Ultimo numero assegnato",
    es: "\xDAltimo n\xFAmero asignado",
    pl: "Ostatnio nadany numer",
    uk: "\u041E\u0441\u0442\u0430\u043D\u043D\u0456\u0439 \u0432\u0438\u0434\u0430\u043D\u0438\u0439 \u043D\u043E\u043C\u0435\u0440",
    "zh-cn": "\u6700\u8FD1\u5206\u914D\u7684\u7F16\u53F7"
  },
  "info.lastIssuedAt": {
    en: "Last issue timestamp",
    de: "Zeitpunkt der letzten Ausstellung",
    ru: "\u0412\u0440\u0435\u043C\u044F \u043F\u043E\u0441\u043B\u0435\u0434\u043D\u0435\u0433\u043E \u0432\u044B\u0441\u0442\u0430\u0432\u043B\u0435\u043D\u0438\u044F",
    pt: "Momento da \xFAltima emiss\xE3o",
    nl: "Tijdstip van de laatste uitgifte",
    fr: "Date de la derni\xE8re \xE9mission",
    it: "Momento dell'ultima emissione",
    es: "Momento de la \xFAltima emisi\xF3n",
    pl: "Czas ostatniego wystawienia",
    uk: "\u0427\u0430\u0441 \u043E\u0441\u0442\u0430\u043D\u043D\u044C\u043E\u0433\u043E \u0432\u0438\u0441\u0442\u0430\u0432\u043B\u0435\u043D\u043D\u044F",
    "zh-cn": "\u6700\u8FD1\u5F00\u5177\u65F6\u95F4"
  },
  "info.dbVersion": {
    en: "Database schema version",
    de: "Version des Datenbankschemas",
    ru: "\u0412\u0435\u0440\u0441\u0438\u044F \u0441\u0445\u0435\u043C\u044B \u0431\u0430\u0437\u044B \u0434\u0430\u043D\u043D\u044B\u0445",
    pt: "Vers\xE3o do esquema da base de dados",
    nl: "Versie van het databaseschema",
    fr: "Version du sch\xE9ma de base de donn\xE9es",
    it: "Versione dello schema del database",
    es: "Versi\xF3n del esquema de la base de datos",
    pl: "Wersja schematu bazy danych",
    uk: "\u0412\u0435\u0440\u0441\u0456\u044F \u0441\u0445\u0435\u043C\u0438 \u0431\u0430\u0437\u0438 \u0434\u0430\u043D\u0438\u0445",
    "zh-cn": "\u6570\u636E\u5E93\u67B6\u6784\u7248\u672C"
  },
  "info.lastBackup": {
    en: "Last backup filename",
    de: "Dateiname des letzten Backups",
    ru: "\u0418\u043C\u044F \u0444\u0430\u0439\u043B\u0430 \u043F\u043E\u0441\u043B\u0435\u0434\u043D\u0435\u0439 \u0440\u0435\u0437\u0435\u0440\u0432\u043D\u043E\u0439 \u043A\u043E\u043F\u0438\u0438",
    pt: "Nome do ficheiro da \xFAltima c\xF3pia de seguran\xE7a",
    nl: "Bestandsnaam van de laatste back-up",
    fr: "Nom du dernier fichier de sauvegarde",
    it: "Nome del file dell'ultimo backup",
    es: "Nombre del archivo de la \xFAltima copia de seguridad",
    pl: "Nazwa pliku ostatniej kopii zapasowej",
    uk: "\u0406\u043C'\u044F \u0444\u0430\u0439\u043B\u0443 \u043E\u0441\u0442\u0430\u043D\u043D\u044C\u043E\u0457 \u0440\u0435\u0437\u0435\u0440\u0432\u043D\u043E\u0457 \u043A\u043E\u043F\u0456\u0457",
    "zh-cn": "\u6700\u8FD1\u5907\u4EFD\u7684\u6587\u4EF6\u540D"
  },
  "info.overdueCount": {
    en: "Overdue unpaid invoices",
    de: "\xDCberf\xE4llige unbezahlte Rechnungen",
    ru: "\u041F\u0440\u043E\u0441\u0440\u043E\u0447\u0435\u043D\u043D\u044B\u0435 \u043D\u0435\u043E\u043F\u043B\u0430\u0447\u0435\u043D\u043D\u044B\u0435 \u0441\u0447\u0435\u0442\u0430",
    pt: "Faturas vencidas por pagar",
    nl: "Achterstallige onbetaalde facturen",
    fr: "Factures impay\xE9es en retard",
    it: "Fatture scadute non pagate",
    es: "Facturas vencidas sin pagar",
    pl: "Zaleg\u0142e nieop\u0142acone faktury",
    uk: "\u041F\u0440\u043E\u0441\u0442\u0440\u043E\u0447\u0435\u043D\u0456 \u043D\u0435\u043E\u043F\u043B\u0430\u0447\u0435\u043D\u0456 \u0440\u0430\u0445\u0443\u043D\u043A\u0438",
    "zh-cn": "\u903E\u671F\u672A\u4ED8\u53D1\u7968"
  },
  "info.overdueList": {
    en: "Overdue invoices as JSON (number, customer, days, level)",
    de: "\xDCberf\xE4llige Rechnungen als JSON (Nummer, Kunde, Tage, Stufe)",
    ru: "\u041F\u0440\u043E\u0441\u0440\u043E\u0447\u0435\u043D\u043D\u044B\u0435 \u0441\u0447\u0435\u0442\u0430 \u0432 JSON (\u043D\u043E\u043C\u0435\u0440, \u043A\u043B\u0438\u0435\u043D\u0442, \u0434\u043D\u0438, \u0443\u0440\u043E\u0432\u0435\u043D\u044C)",
    pt: "Faturas vencidas em JSON (n\xFAmero, cliente, dias, n\xEDvel)",
    nl: "Achterstallige facturen als JSON (nummer, klant, dagen, niveau)",
    fr: "Factures en retard en JSON (num\xE9ro, client, jours, niveau)",
    it: "Fatture scadute in JSON (numero, cliente, giorni, livello)",
    es: "Facturas vencidas en JSON (n\xFAmero, cliente, d\xEDas, nivel)",
    pl: "Zaleg\u0142e faktury jako JSON (numer, klient, dni, poziom)",
    uk: "\u041F\u0440\u043E\u0441\u0442\u0440\u043E\u0447\u0435\u043D\u0456 \u0440\u0430\u0445\u0443\u043D\u043A\u0438 \u0432 JSON (\u043D\u043E\u043C\u0435\u0440, \u043A\u043B\u0456\u0454\u043D\u0442, \u0434\u043D\u0456, \u0440\u0456\u0432\u0435\u043D\u044C)",
    "zh-cn": "\u903E\u671F\u53D1\u7968\uFF08JSON\uFF1A\u7F16\u53F7\u3001\u5BA2\u6237\u3001\u5929\u6570\u3001\u7EA7\u522B\uFF09"
  },
  "info.reminderSuggestions": {
    en: "Dunning suggestions as JSON (id, number, level, days, subject, text)",
    de: "Mahnvorschl\xE4ge als JSON (ID, Nummer, Stufe, Tage, Betreff, Text)",
    ru: "\u041F\u0440\u0435\u0434\u043B\u043E\u0436\u0435\u043D\u0438\u044F \u043F\u043E \u043D\u0430\u043F\u043E\u043C\u0438\u043D\u0430\u043D\u0438\u044F\u043C \u0432 JSON (ID, \u043D\u043E\u043C\u0435\u0440, \u0443\u0440\u043E\u0432\u0435\u043D\u044C, \u0434\u043D\u0438, \u0442\u0435\u043C\u0430, \u0442\u0435\u043A\u0441\u0442)",
    pt: "Sugest\xF5es de lembretes em JSON (ID, n\xFAmero, n\xEDvel, dias, assunto, texto)",
    nl: "Aanmaningsvoorstellen als JSON (ID, nummer, niveau, dagen, onderwerp, tekst)",
    fr: "Suggestions de relance en JSON (ID, num\xE9ro, niveau, jours, objet, texte)",
    it: "Suggerimenti di sollecito in JSON (ID, numero, livello, giorni, oggetto, testo)",
    es: "Sugerencias de reclamaci\xF3n en JSON (ID, n\xFAmero, nivel, d\xEDas, asunto, texto)",
    pl: "Propozycje monit\xF3w jako JSON (ID, numer, poziom, dni, temat, tekst)",
    uk: "\u041F\u0440\u043E\u043F\u043E\u0437\u0438\u0446\u0456\u0457 \u043D\u0430\u0433\u0430\u0434\u0443\u0432\u0430\u043D\u044C \u0443 JSON (ID, \u043D\u043E\u043C\u0435\u0440, \u0440\u0456\u0432\u0435\u043D\u044C, \u0434\u043D\u0456, \u0442\u0435\u043C\u0430, \u0442\u0435\u043A\u0441\u0442)",
    "zh-cn": "\u50AC\u6B3E\u5EFA\u8BAE\uFF08JSON\uFF1AID\u3001\u7F16\u53F7\u3001\u7EA7\u522B\u3001\u5929\u6570\u3001\u4E3B\u9898\u3001\u6587\u672C\uFF09"
  },
  "info.backupWarning": {
    en: "Backup warning (empty = backup is current)",
    de: "Backup-Warnung (leer = Backup ist aktuell)",
    ru: "\u041F\u0440\u0435\u0434\u0443\u043F\u0440\u0435\u0436\u0434\u0435\u043D\u0438\u0435 \u043E \u043A\u043E\u043F\u0438\u0438 (\u043F\u0443\u0441\u0442\u043E = \u043A\u043E\u043F\u0438\u044F \u0430\u043A\u0442\u0443\u0430\u043B\u044C\u043D\u0430)",
    pt: "Aviso de c\xF3pia de seguran\xE7a (vazio = c\xF3pia atual)",
    nl: "Back-upwaarschuwing (leeg = back-up is actueel)",
    fr: "Avertissement de sauvegarde (vide = sauvegarde \xE0 jour)",
    it: "Avviso di backup (vuoto = backup aggiornato)",
    es: "Aviso de copia de seguridad (vac\xEDo = copia actualizada)",
    pl: "Ostrze\u017Cenie o kopii zapasowej (puste = kopia aktualna)",
    uk: "\u041F\u043E\u043F\u0435\u0440\u0435\u0434\u0436\u0435\u043D\u043D\u044F \u043F\u0440\u043E \u043A\u043E\u043F\u0456\u044E (\u043F\u043E\u0440\u043E\u0436\u043D\u044C\u043E = \u043A\u043E\u043F\u0456\u044F \u0430\u043A\u0442\u0443\u0430\u043B\u044C\u043D\u0430)",
    "zh-cn": "\u5907\u4EFD\u8B66\u544A\uFF08\u7A7A = \u5907\u4EFD\u662F\u6700\u65B0\u7684\uFF09"
  },
  "info.lastReminderCheck": {
    en: "Last dunning check",
    de: "Letzte Mahnpr\xFCfung",
    ru: "\u041F\u043E\u0441\u043B\u0435\u0434\u043D\u044F\u044F \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u043D\u0430\u043F\u043E\u043C\u0438\u043D\u0430\u043D\u0438\u0439",
    pt: "\xDAltima verifica\xE7\xE3o de lembretes",
    nl: "Laatste aanmaningscontrole",
    fr: "Derni\xE8re v\xE9rification des relances",
    it: "Ultimo controllo dei solleciti",
    es: "\xDAltima comprobaci\xF3n de reclamaciones",
    pl: "Ostatnie sprawdzenie monit\xF3w",
    uk: "\u041E\u0441\u0442\u0430\u043D\u043D\u044F \u043F\u0435\u0440\u0435\u0432\u0456\u0440\u043A\u0430 \u043D\u0430\u0433\u0430\u0434\u0443\u0432\u0430\u043D\u044C",
    "zh-cn": "\u6700\u8FD1\u4E00\u6B21\u50AC\u6B3E\u68C0\u67E5"
  },
  control: {
    en: "Control commands",
    de: "Steuerbefehle",
    ru: "\u041A\u043E\u043C\u0430\u043D\u0434\u044B \u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u044F",
    pt: "Comandos de controlo",
    nl: "Besturingsopdrachten",
    fr: "Commandes de contr\xF4le",
    it: "Comandi di controllo",
    es: "Comandos de control",
    pl: "Polecenia steruj\u0105ce",
    uk: "\u041A\u043E\u043C\u0430\u043D\u0434\u0438 \u043A\u0435\u0440\u0443\u0432\u0430\u043D\u043D\u044F",
    "zh-cn": "\u63A7\u5236\u547D\u4EE4"
  },
  "control.createDraft": {
    en: "Create empty draft",
    de: "Leeren Entwurf anlegen",
    ru: "\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u043F\u0443\u0441\u0442\u043E\u0439 \u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A",
    pt: "Criar rascunho vazio",
    nl: "Leeg concept aanmaken",
    fr: "Cr\xE9er un brouillon vide",
    it: "Crea bozza vuota",
    es: "Crear borrador vac\xEDo",
    pl: "Utw\xF3rz pusty szkic",
    uk: "\u0421\u0442\u0432\u043E\u0440\u0438\u0442\u0438 \u043F\u043E\u0440\u043E\u0436\u043D\u044E \u0447\u0435\u0440\u043D\u0435\u0442\u043A\u0443",
    "zh-cn": "\u521B\u5EFA\u7A7A\u8349\u7A3F"
  },
  "control.lastDraftId": {
    en: "Last created draft id",
    de: "ID des zuletzt angelegten Entwurfs",
    ru: "ID \u043F\u043E\u0441\u043B\u0435\u0434\u043D\u0435\u0433\u043E \u0441\u043E\u0437\u0434\u0430\u043D\u043D\u043E\u0433\u043E \u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A\u0430",
    pt: "ID do \xFAltimo rascunho criado",
    nl: "ID van het laatst aangemaakte concept",
    fr: "ID du dernier brouillon cr\xE9\xE9",
    it: "ID dell'ultima bozza creata",
    es: "ID del \xFAltimo borrador creado",
    pl: "ID ostatnio utworzonego szkicu",
    uk: "ID \u043E\u0441\u0442\u0430\u043D\u043D\u044C\u043E\u0457 \u0441\u0442\u0432\u043E\u0440\u0435\u043D\u043E\u0457 \u0447\u0435\u0440\u043D\u0435\u0442\u043A\u0438",
    "zh-cn": "\u6700\u8FD1\u521B\u5EFA\u7684\u8349\u7A3F ID"
  },
  "control.issueId": {
    en: "Draft id to issue",
    de: "ID des auszustellenden Entwurfs",
    ru: "ID \u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A\u0430 \u0434\u043B\u044F \u0432\u044B\u0441\u0442\u0430\u0432\u043B\u0435\u043D\u0438\u044F",
    pt: "ID do rascunho a emitir",
    nl: "ID van het uit te geven concept",
    fr: "ID du brouillon \xE0 \xE9mettre",
    it: "ID della bozza da emettere",
    es: "ID del borrador a emitir",
    pl: "ID szkicu do wystawienia",
    uk: "ID \u0447\u0435\u0440\u043D\u0435\u0442\u043A\u0438 \u0434\u043B\u044F \u0432\u0438\u0441\u0442\u0430\u0432\u043B\u0435\u043D\u043D\u044F",
    "zh-cn": "\u5F85\u5F00\u5177\u8349\u7A3F\u7684 ID"
  },
  "control.issue": {
    en: "Issue draft from issueId",
    de: "Entwurf aus issueId ausstellen",
    ru: "\u0412\u044B\u0441\u0442\u0430\u0432\u0438\u0442\u044C \u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A \u0438\u0437 issueId",
    pt: "Emitir o rascunho de issueId",
    nl: "Concept uit issueId uitgeven",
    fr: "\xC9mettre le brouillon de issueId",
    it: "Emetti la bozza da issueId",
    es: "Emitir el borrador de issueId",
    pl: "Wystaw szkic z issueId",
    uk: "\u0412\u0438\u0441\u0442\u0430\u0432\u0438\u0442\u0438 \u0447\u0435\u0440\u043D\u0435\u0442\u043A\u0443 \u0437 issueId",
    "zh-cn": "\u5F00\u5177 issueId \u4E2D\u7684\u8349\u7A3F"
  },
  "control.refresh": {
    en: "Refresh stats and status file",
    de: "Statistik und Statusdatei aktualisieren",
    ru: "\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u0441\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0443 \u0438 \u0444\u0430\u0439\u043B \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u044F",
    pt: "Atualizar estat\xEDsticas e ficheiro de estado",
    nl: "Statistieken en statusbestand vernieuwen",
    fr: "Actualiser les statistiques et le fichier d'\xE9tat",
    it: "Aggiorna statistiche e file di stato",
    es: "Actualizar estad\xEDsticas y archivo de estado",
    pl: "Od\u015Bwie\u017C statystyki i plik stanu",
    uk: "\u041E\u043D\u043E\u0432\u0438\u0442\u0438 \u0441\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0443 \u0442\u0430 \u0444\u0430\u0439\u043B \u0441\u0442\u0430\u043D\u0443",
    "zh-cn": "\u5237\u65B0\u7EDF\u8BA1\u548C\u72B6\u6001\u6587\u4EF6"
  },
  "control.backup": {
    en: "Create backup now",
    de: "Backup jetzt erstellen",
    ru: "\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u0440\u0435\u0437\u0435\u0440\u0432\u043D\u0443\u044E \u043A\u043E\u043F\u0438\u044E \u0441\u0435\u0439\u0447\u0430\u0441",
    pt: "Criar c\xF3pia de seguran\xE7a agora",
    nl: "Nu een back-up maken",
    fr: "Cr\xE9er une sauvegarde maintenant",
    it: "Crea un backup ora",
    es: "Crear una copia de seguridad ahora",
    pl: "Utw\xF3rz kopi\u0119 zapasow\u0105 teraz",
    uk: "\u0421\u0442\u0432\u043E\u0440\u0438\u0442\u0438 \u0440\u0435\u0437\u0435\u0440\u0432\u043D\u0443 \u043A\u043E\u043F\u0456\u044E \u0437\u0430\u0440\u0430\u0437",
    "zh-cn": "\u7ACB\u5373\u521B\u5EFA\u5907\u4EFD"
  },
  "control.restoreId": {
    en: "Backup filename to restore",
    de: "Dateiname des wiederherzustellenden Backups",
    ru: "\u0418\u043C\u044F \u0444\u0430\u0439\u043B\u0430 \u0440\u0435\u0437\u0435\u0440\u0432\u043D\u043E\u0439 \u043A\u043E\u043F\u0438\u0438 \u0434\u043B\u044F \u0432\u043E\u0441\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u044F",
    pt: "Nome do ficheiro da c\xF3pia de seguran\xE7a a restaurar",
    nl: "Bestandsnaam van de te herstellen back-up",
    fr: "Nom du fichier de sauvegarde \xE0 restaurer",
    it: "Nome del file di backup da ripristinare",
    es: "Nombre del archivo de copia de seguridad a restaurar",
    pl: "Nazwa pliku kopii zapasowej do przywr\xF3cenia",
    uk: "\u0406\u043C'\u044F \u0444\u0430\u0439\u043B\u0443 \u0440\u0435\u0437\u0435\u0440\u0432\u043D\u043E\u0457 \u043A\u043E\u043F\u0456\u0457 \u0434\u043B\u044F \u0432\u0456\u0434\u043D\u043E\u0432\u043B\u0435\u043D\u043D\u044F",
    "zh-cn": "\u8981\u6062\u590D\u7684\u5907\u4EFD\u6587\u4EF6\u540D"
  },
  "control.restore": {
    en: "Restore backup from restoreId",
    de: "Backup aus restoreId wiederherstellen",
    ru: "\u0412\u043E\u0441\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u044C \u043A\u043E\u043F\u0438\u044E \u0438\u0437 restoreId",
    pt: "Restaurar a c\xF3pia de seguran\xE7a de restoreId",
    nl: "Back-up uit restoreId herstellen",
    fr: "Restaurer la sauvegarde de restoreId",
    it: "Ripristina il backup da restoreId",
    es: "Restaurar la copia de seguridad de restoreId",
    pl: "Przywr\xF3\u0107 kopi\u0119 zapasow\u0105 z restoreId",
    uk: "\u0412\u0456\u0434\u043D\u043E\u0432\u0438\u0442\u0438 \u043A\u043E\u043F\u0456\u044E \u0437 restoreId",
    "zh-cn": "\u4ECE restoreId \u6062\u590D\u5907\u4EFD"
  },
  storage: {
    en: "File storage",
    de: "Dateiablage",
    ru: "\u0425\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0435 \u0444\u0430\u0439\u043B\u043E\u0432",
    pt: "Armazenamento de ficheiros",
    nl: "Bestandsopslag",
    fr: "Stockage de fichiers",
    it: "Archivio file",
    es: "Almacenamiento de archivos",
    pl: "Magazyn plik\xF3w",
    uk: "\u0421\u0445\u043E\u0432\u0438\u0449\u0435 \u0444\u0430\u0439\u043B\u0456\u0432",
    "zh-cn": "\u6587\u4EF6\u5B58\u50A8"
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  STATE_NAMES
});
//# sourceMappingURL=state-names.js.map
