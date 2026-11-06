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
var dunning_texts_exports = {};
__export(dunning_texts_exports, {
  DUNNING_DEFAULT_TEXTS: () => DUNNING_DEFAULT_TEXTS
});
module.exports = __toCommonJS(dunning_texts_exports);
const DUNNING_DEFAULT_TEXTS = {
  en: [
    {
      subject: "Payment reminder for invoice {number}",
      body: "Dear Sir or Madam,\n\nwe have not yet received payment for our invoice {number} of {issueDate} for {amount}. It was due on {dueDate}.\n\nPlease transfer the amount by {deadline}. If your payment has crossed with this letter, please disregard it.\n\nKind regards\n{seller}"
    },
    {
      subject: "First dunning notice for invoice {number}",
      body: "Dear Sir or Madam,\n\ndespite our payment reminder, invoice {number} of {issueDate} for {amount} is still unpaid. It has been overdue for {days} days (due on {dueDate}).\n\nPlease transfer the amount by {deadline}.\n\nKind regards\n{seller}"
    },
    {
      subject: "Second dunning notice for invoice {number}",
      body: "Dear Sir or Madam,\n\ninvoice {number} of {issueDate} for {amount} is still unpaid despite our reminder and dunning notice ({days} days overdue, due on {dueDate}).\n\nWe request that you transfer the amount by {deadline} at the latest. Otherwise we reserve the right to take further steps.\n\nKind regards\n{seller}"
    }
  ],
  de: [
    {
      subject: "Zahlungserinnerung zur Rechnung {number}",
      body: "Sehr geehrte Damen und Herren,\n\nzu unserer Rechnung {number} vom {issueDate} \xFCber {amount} konnten wir bis heute keinen Zahlungseingang feststellen. Sie war am {dueDate} f\xE4llig.\n\nBitte \xFCberweisen Sie den Betrag bis zum {deadline}. Sollte sich Ihre Zahlung mit diesem Schreiben \xFCberschnitten haben, betrachten Sie es bitte als gegenstandslos.\n\nMit freundlichen Gr\xFC\xDFen\n{seller}"
    },
    {
      subject: "1. Mahnung zur Rechnung {number}",
      body: "Sehr geehrte Damen und Herren,\n\ntrotz unserer Zahlungserinnerung ist die Rechnung {number} vom {issueDate} \xFCber {amount} weiterhin offen. Sie ist seit {days} Tagen \xFCberf\xE4llig (f\xE4llig am {dueDate}).\n\nWir bitten Sie, den Betrag bis zum {deadline} zu \xFCberweisen.\n\nMit freundlichen Gr\xFC\xDFen\n{seller}"
    },
    {
      subject: "2. Mahnung zur Rechnung {number}",
      body: "Sehr geehrte Damen und Herren,\n\ndie Rechnung {number} vom {issueDate} \xFCber {amount} ist trotz Erinnerung und Mahnung noch immer nicht bezahlt (seit {days} Tagen \xFCberf\xE4llig, f\xE4llig am {dueDate}).\n\nWir fordern Sie auf, den Betrag bis sp\xE4testens {deadline} zu \xFCberweisen. Andernfalls behalten wir uns weitere Schritte vor.\n\nMit freundlichen Gr\xFC\xDFen\n{seller}"
    }
  ],
  ru: [
    {
      subject: "\u041D\u0430\u043F\u043E\u043C\u0438\u043D\u0430\u043D\u0438\u0435 \u043E\u0431 \u043E\u043F\u043B\u0430\u0442\u0435 \u0441\u0447\u0451\u0442\u0430 {number}",
      body: "\u0423\u0432\u0430\u0436\u0430\u0435\u043C\u044B\u0435 \u0434\u0430\u043C\u044B \u0438 \u0433\u043E\u0441\u043F\u043E\u0434\u0430,\n\n\u043F\u043E \u043D\u0430\u0448\u0435\u043C\u0443 \u0441\u0447\u0451\u0442\u0443 {number} \u043E\u0442 {issueDate} \u043D\u0430 \u0441\u0443\u043C\u043C\u0443 {amount} \u043E\u043F\u043B\u0430\u0442\u0430 \u0434\u043E \u0441\u0438\u0445 \u043F\u043E\u0440 \u043D\u0435 \u043F\u043E\u0441\u0442\u0443\u043F\u0438\u043B\u0430. \u0421\u0440\u043E\u043A \u043E\u043F\u043B\u0430\u0442\u044B \u0438\u0441\u0442\u0451\u043A {dueDate}.\n\n\u041F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430, \u043F\u0435\u0440\u0435\u0432\u0435\u0434\u0438\u0442\u0435 \u0441\u0443\u043C\u043C\u0443 \u0434\u043E {deadline}. \u0415\u0441\u043B\u0438 \u0432\u0430\u0448 \u043F\u043B\u0430\u0442\u0451\u0436 \u0440\u0430\u0437\u043C\u0438\u043D\u0443\u043B\u0441\u044F \u0441 \u044D\u0442\u0438\u043C \u043F\u0438\u0441\u044C\u043C\u043E\u043C, \u043F\u0440\u043E\u0441\u0438\u043C \u0441\u0447\u0438\u0442\u0430\u0442\u044C \u0435\u0433\u043E \u043D\u0435\u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u043C.\n\n\u0421 \u0443\u0432\u0430\u0436\u0435\u043D\u0438\u0435\u043C\n{seller}"
    },
    {
      subject: "\u041F\u0435\u0440\u0432\u0430\u044F \u043F\u0440\u0435\u0442\u0435\u043D\u0437\u0438\u044F \u043F\u043E \u0441\u0447\u0451\u0442\u0443 {number}",
      body: "\u0423\u0432\u0430\u0436\u0430\u0435\u043C\u044B\u0435 \u0434\u0430\u043C\u044B \u0438 \u0433\u043E\u0441\u043F\u043E\u0434\u0430,\n\n\u043D\u0435\u0441\u043C\u043E\u0442\u0440\u044F \u043D\u0430 \u043D\u0430\u0448\u0435 \u043D\u0430\u043F\u043E\u043C\u0438\u043D\u0430\u043D\u0438\u0435, \u0441\u0447\u0451\u0442 {number} \u043E\u0442 {issueDate} \u043D\u0430 \u0441\u0443\u043C\u043C\u0443 {amount} \u043F\u043E-\u043F\u0440\u0435\u0436\u043D\u0435\u043C\u0443 \u043D\u0435 \u043E\u043F\u043B\u0430\u0447\u0435\u043D. \u041F\u0440\u043E\u0441\u0440\u043E\u0447\u043A\u0430 \u0441\u043E\u0441\u0442\u0430\u0432\u043B\u044F\u0435\u0442 {days} \u0434\u043D\u0435\u0439 (\u0441\u0440\u043E\u043A \u043E\u043F\u043B\u0430\u0442\u044B {dueDate}).\n\n\u041F\u0440\u043E\u0441\u0438\u043C \u043F\u0435\u0440\u0435\u0432\u0435\u0441\u0442\u0438 \u0441\u0443\u043C\u043C\u0443 \u0434\u043E {deadline}.\n\n\u0421 \u0443\u0432\u0430\u0436\u0435\u043D\u0438\u0435\u043C\n{seller}"
    },
    {
      subject: "\u0412\u0442\u043E\u0440\u0430\u044F \u043F\u0440\u0435\u0442\u0435\u043D\u0437\u0438\u044F \u043F\u043E \u0441\u0447\u0451\u0442\u0443 {number}",
      body: "\u0423\u0432\u0430\u0436\u0430\u0435\u043C\u044B\u0435 \u0434\u0430\u043C\u044B \u0438 \u0433\u043E\u0441\u043F\u043E\u0434\u0430,\n\n\u0441\u0447\u0451\u0442 {number} \u043E\u0442 {issueDate} \u043D\u0430 \u0441\u0443\u043C\u043C\u0443 {amount} \u0432\u0441\u0451 \u0435\u0449\u0451 \u043D\u0435 \u043E\u043F\u043B\u0430\u0447\u0435\u043D, \u043D\u0435\u0441\u043C\u043E\u0442\u0440\u044F \u043D\u0430 \u043D\u0430\u043F\u043E\u043C\u0438\u043D\u0430\u043D\u0438\u0435 \u0438 \u043F\u0440\u0435\u0442\u0435\u043D\u0437\u0438\u044E (\u043F\u0440\u043E\u0441\u0440\u043E\u0447\u043A\u0430 {days} \u0434\u043D\u0435\u0439, \u0441\u0440\u043E\u043A \u043E\u043F\u043B\u0430\u0442\u044B {dueDate}).\n\n\u0422\u0440\u0435\u0431\u0443\u0435\u043C \u043F\u0435\u0440\u0435\u0432\u0435\u0441\u0442\u0438 \u0441\u0443\u043C\u043C\u0443 \u043D\u0435 \u043F\u043E\u0437\u0434\u043D\u0435\u0435 {deadline}. \u0412 \u043F\u0440\u043E\u0442\u0438\u0432\u043D\u043E\u043C \u0441\u043B\u0443\u0447\u0430\u0435 \u043C\u044B \u043E\u0441\u0442\u0430\u0432\u043B\u044F\u0435\u043C \u0437\u0430 \u0441\u043E\u0431\u043E\u0439 \u043F\u0440\u0430\u0432\u043E \u043D\u0430 \u0434\u0430\u043B\u044C\u043D\u0435\u0439\u0448\u0438\u0435 \u0448\u0430\u0433\u0438.\n\n\u0421 \u0443\u0432\u0430\u0436\u0435\u043D\u0438\u0435\u043C\n{seller}"
    }
  ],
  pt: [
    {
      subject: "Lembrete de pagamento da fatura {number}",
      body: "Exmos. Senhores,\n\nat\xE9 hoje n\xE3o regist\xE1mos o pagamento da nossa fatura {number} de {issueDate} no valor de {amount}. O vencimento foi a {dueDate}.\n\nSolicitamos a transfer\xEAncia do valor at\xE9 {deadline}. Caso o pagamento se tenha cruzado com esta carta, queiram ignor\xE1-la.\n\nCom os melhores cumprimentos\n{seller}"
    },
    {
      subject: "Primeiro aviso de cobran\xE7a da fatura {number}",
      body: "Exmos. Senhores,\n\napesar do nosso lembrete, a fatura {number} de {issueDate} no valor de {amount} continua por pagar. Est\xE1 em atraso h\xE1 {days} dias (vencimento a {dueDate}).\n\nSolicitamos a transfer\xEAncia do valor at\xE9 {deadline}.\n\nCom os melhores cumprimentos\n{seller}"
    },
    {
      subject: "Segundo aviso de cobran\xE7a da fatura {number}",
      body: "Exmos. Senhores,\n\na fatura {number} de {issueDate} no valor de {amount} continua por pagar apesar do lembrete e do aviso de cobran\xE7a ({days} dias em atraso, vencimento a {dueDate}).\n\nExigimos a transfer\xEAncia do valor at\xE9 {deadline}, o mais tardar. Caso contr\xE1rio, reservamo-nos o direito de tomar outras medidas.\n\nCom os melhores cumprimentos\n{seller}"
    }
  ],
  nl: [
    {
      subject: "Betalingsherinnering voor factuur {number}",
      body: "Geachte dames en heren,\n\nvoor onze factuur {number} van {issueDate} over {amount} hebben wij tot op heden geen betaling ontvangen. De vervaldatum was {dueDate}.\n\nWij verzoeken u het bedrag uiterlijk {deadline} over te maken. Mocht uw betaling deze brief hebben gekruist, dan kunt u deze als niet verzonden beschouwen.\n\nMet vriendelijke groet\n{seller}"
    },
    {
      subject: "Eerste aanmaning voor factuur {number}",
      body: "Geachte dames en heren,\n\nondanks onze betalingsherinnering staat factuur {number} van {issueDate} over {amount} nog altijd open. De betaling is {days} dagen te laat (vervaldatum {dueDate}).\n\nWij verzoeken u het bedrag uiterlijk {deadline} over te maken.\n\nMet vriendelijke groet\n{seller}"
    },
    {
      subject: "Tweede aanmaning voor factuur {number}",
      body: "Geachte dames en heren,\n\nfactuur {number} van {issueDate} over {amount} is ondanks herinnering en aanmaning nog steeds niet betaald ({days} dagen te laat, vervaldatum {dueDate}).\n\nWij sommeren u het bedrag uiterlijk {deadline} over te maken. Anders behouden wij ons verdere stappen voor.\n\nMet vriendelijke groet\n{seller}"
    }
  ],
  fr: [
    {
      subject: "Rappel de paiement pour la facture {number}",
      body: "Madame, Monsieur,\n\nnous n'avons pas encore re\xE7u le paiement de notre facture {number} du {issueDate} d'un montant de {amount}. Elle \xE9tait \xE9chue le {dueDate}.\n\nNous vous prions de virer le montant d'ici le {deadline}. Si votre paiement a crois\xE9 ce courrier, veuillez ne pas en tenir compte.\n\nVeuillez agr\xE9er nos salutations distingu\xE9es.\n{seller}"
    },
    {
      subject: "Premi\xE8re relance pour la facture {number}",
      body: "Madame, Monsieur,\n\nmalgr\xE9 notre rappel de paiement, la facture {number} du {issueDate} d'un montant de {amount} reste impay\xE9e. Elle est en retard de {days} jours (\xE9ch\xE9ance le {dueDate}).\n\nNous vous prions de virer le montant d'ici le {deadline}.\n\nVeuillez agr\xE9er nos salutations distingu\xE9es.\n{seller}"
    },
    {
      subject: "Deuxi\xE8me relance pour la facture {number}",
      body: "Madame, Monsieur,\n\nla facture {number} du {issueDate} d'un montant de {amount} reste impay\xE9e malgr\xE9 notre rappel et notre relance ({days} jours de retard, \xE9ch\xE9ance le {dueDate}).\n\nNous vous mettons en demeure de virer le montant au plus tard le {deadline}. \xC0 d\xE9faut, nous nous r\xE9servons le droit d'engager d'autres d\xE9marches.\n\nVeuillez agr\xE9er nos salutations distingu\xE9es.\n{seller}"
    }
  ],
  it: [
    {
      subject: "Promemoria di pagamento per la fattura {number}",
      body: "Gentili Signore e Signori,\n\nnon abbiamo ancora ricevuto il pagamento della nostra fattura {number} del {issueDate} per un importo di {amount}. Era in scadenza il {dueDate}.\n\nVi preghiamo di bonificare l'importo entro il {deadline}. Se il vostro pagamento si \xE8 incrociato con questa lettera, vi preghiamo di non tenerne conto.\n\nCordiali saluti\n{seller}"
    },
    {
      subject: "Primo sollecito per la fattura {number}",
      body: "Gentili Signore e Signori,\n\nnonostante il nostro promemoria, la fattura {number} del {issueDate} per un importo di {amount} risulta ancora aperta. \xC8 scaduta da {days} giorni (scadenza il {dueDate}).\n\nVi preghiamo di bonificare l'importo entro il {deadline}.\n\nCordiali saluti\n{seller}"
    },
    {
      subject: "Secondo sollecito per la fattura {number}",
      body: "Gentili Signore e Signori,\n\nla fattura {number} del {issueDate} per un importo di {amount} non \xE8 ancora stata pagata nonostante promemoria e sollecito (scaduta da {days} giorni, scadenza il {dueDate}).\n\nVi intimiamo di bonificare l'importo entro e non oltre il {deadline}. In caso contrario ci riserviamo di intraprendere ulteriori azioni.\n\nCordiali saluti\n{seller}"
    }
  ],
  es: [
    {
      subject: "Recordatorio de pago de la factura {number}",
      body: "Estimados se\xF1ores:\n\nhasta hoy no hemos recibido el pago de nuestra factura {number} del {issueDate} por importe de {amount}. Venc\xEDa el {dueDate}.\n\nLes rogamos que transfieran el importe antes del {deadline}. Si su pago se ha cruzado con esta carta, no la tengan en cuenta.\n\nAtentamente\n{seller}"
    },
    {
      subject: "Primera reclamaci\xF3n de la factura {number}",
      body: "Estimados se\xF1ores:\n\na pesar de nuestro recordatorio, la factura {number} del {issueDate} por importe de {amount} sigue pendiente. Lleva {days} d\xEDas de retraso (vencimiento el {dueDate}).\n\nLes rogamos que transfieran el importe antes del {deadline}.\n\nAtentamente\n{seller}"
    },
    {
      subject: "Segunda reclamaci\xF3n de la factura {number}",
      body: "Estimados se\xF1ores:\n\nla factura {number} del {issueDate} por importe de {amount} sigue sin pagarse pese al recordatorio y la reclamaci\xF3n ({days} d\xEDas de retraso, vencimiento el {dueDate}).\n\nLes requerimos que transfieran el importe a m\xE1s tardar el {deadline}. De lo contrario, nos reservamos el derecho de tomar otras medidas.\n\nAtentamente\n{seller}"
    }
  ],
  pl: [
    {
      subject: "Przypomnienie o p\u0142atno\u015Bci za faktur\u0119 {number}",
      body: "Szanowni Pa\u0144stwo,\n\ndo dzi\u015B nie odnotowali\u015Bmy wp\u0142aty za nasz\u0105 faktur\u0119 {number} z dnia {issueDate} na kwot\u0119 {amount}. Termin p\u0142atno\u015Bci up\u0142yn\u0105\u0142 {dueDate}.\n\nProsimy o przelew kwoty do {deadline}. Je\u015Bli Pa\u0144stwa p\u0142atno\u015B\u0107 min\u0119\u0142a si\u0119 z tym pismem, prosimy uzna\u0107 je za bezprzedmiotowe.\n\nZ powa\u017Caniem\n{seller}"
    },
    {
      subject: "Pierwsze wezwanie do zap\u0142aty faktury {number}",
      body: "Szanowni Pa\u0144stwo,\n\nmimo naszego przypomnienia faktura {number} z dnia {issueDate} na kwot\u0119 {amount} nadal pozostaje nieop\u0142acona. Zaleg\u0142o\u015B\u0107 wynosi {days} dni (termin p\u0142atno\u015Bci {dueDate}).\n\nProsimy o przelew kwoty do {deadline}.\n\nZ powa\u017Caniem\n{seller}"
    },
    {
      subject: "Drugie wezwanie do zap\u0142aty faktury {number}",
      body: "Szanowni Pa\u0144stwo,\n\nfaktura {number} z dnia {issueDate} na kwot\u0119 {amount} mimo przypomnienia i wezwania nadal nie zosta\u0142a op\u0142acona ({days} dni zaleg\u0142o\u015Bci, termin p\u0142atno\u015Bci {dueDate}).\n\nWzywamy do przelania kwoty najp\xF3\u017Aniej do {deadline}. W przeciwnym razie zastrzegamy sobie prawo do podj\u0119cia dalszych krok\xF3w.\n\nZ powa\u017Caniem\n{seller}"
    }
  ],
  uk: [
    {
      subject: "\u041D\u0430\u0433\u0430\u0434\u0443\u0432\u0430\u043D\u043D\u044F \u043F\u0440\u043E \u043E\u043F\u043B\u0430\u0442\u0443 \u0440\u0430\u0445\u0443\u043D\u043A\u0443 {number}",
      body: "\u0428\u0430\u043D\u043E\u0432\u043D\u0456 \u043F\u0430\u043D\u0456 \u0442\u0430 \u043F\u0430\u043D\u043E\u0432\u0435,\n\n\u043E\u043F\u043B\u0430\u0442\u0430 \u0437\u0430 \u043D\u0430\u0448\u0438\u043C \u0440\u0430\u0445\u0443\u043D\u043A\u043E\u043C {number} \u0432\u0456\u0434 {issueDate} \u043D\u0430 \u0441\u0443\u043C\u0443 {amount} \u0434\u043E\u0441\u0456 \u043D\u0435 \u043D\u0430\u0434\u0456\u0439\u0448\u043B\u0430. \u0421\u0442\u0440\u043E\u043A \u043E\u043F\u043B\u0430\u0442\u0438 \u043C\u0438\u043D\u0443\u0432 {dueDate}.\n\n\u041F\u0440\u043E\u0441\u0438\u043C\u043E \u043F\u0435\u0440\u0435\u0440\u0430\u0445\u0443\u0432\u0430\u0442\u0438 \u0441\u0443\u043C\u0443 \u0434\u043E {deadline}. \u042F\u043A\u0449\u043E \u0432\u0430\u0448 \u043F\u043B\u0430\u0442\u0456\u0436 \u0440\u043E\u0437\u043C\u0438\u043D\u0443\u0432\u0441\u044F \u0437 \u0446\u0438\u043C \u043B\u0438\u0441\u0442\u043E\u043C, \u043F\u0440\u043E\u0441\u0438\u043C\u043E \u0432\u0432\u0430\u0436\u0430\u0442\u0438 \u0439\u043E\u0433\u043E \u043D\u0435\u0434\u0456\u0439\u0441\u043D\u0438\u043C.\n\n\u0417 \u043F\u043E\u0432\u0430\u0433\u043E\u044E\n{seller}"
    },
    {
      subject: "\u041F\u0435\u0440\u0448\u0430 \u043F\u0440\u0435\u0442\u0435\u043D\u0437\u0456\u044F \u0449\u043E\u0434\u043E \u0440\u0430\u0445\u0443\u043D\u043A\u0443 {number}",
      body: "\u0428\u0430\u043D\u043E\u0432\u043D\u0456 \u043F\u0430\u043D\u0456 \u0442\u0430 \u043F\u0430\u043D\u043E\u0432\u0435,\n\n\u043F\u043E\u043F\u0440\u0438 \u043D\u0430\u0448\u0435 \u043D\u0430\u0433\u0430\u0434\u0443\u0432\u0430\u043D\u043D\u044F, \u0440\u0430\u0445\u0443\u043D\u043E\u043A {number} \u0432\u0456\u0434 {issueDate} \u043D\u0430 \u0441\u0443\u043C\u0443 {amount} \u0434\u043E\u0441\u0456 \u043D\u0435 \u043E\u043F\u043B\u0430\u0447\u0435\u043D\u043E. \u041F\u0440\u043E\u0441\u0442\u0440\u043E\u0447\u0435\u043D\u043D\u044F \u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u044C {days} \u0434\u043D\u0456\u0432 (\u0441\u0442\u0440\u043E\u043A \u043E\u043F\u043B\u0430\u0442\u0438 {dueDate}).\n\n\u041F\u0440\u043E\u0441\u0438\u043C\u043E \u043F\u0435\u0440\u0435\u0440\u0430\u0445\u0443\u0432\u0430\u0442\u0438 \u0441\u0443\u043C\u0443 \u0434\u043E {deadline}.\n\n\u0417 \u043F\u043E\u0432\u0430\u0433\u043E\u044E\n{seller}"
    },
    {
      subject: "\u0414\u0440\u0443\u0433\u0430 \u043F\u0440\u0435\u0442\u0435\u043D\u0437\u0456\u044F \u0449\u043E\u0434\u043E \u0440\u0430\u0445\u0443\u043D\u043A\u0443 {number}",
      body: "\u0428\u0430\u043D\u043E\u0432\u043D\u0456 \u043F\u0430\u043D\u0456 \u0442\u0430 \u043F\u0430\u043D\u043E\u0432\u0435,\n\n\u0440\u0430\u0445\u0443\u043D\u043E\u043A {number} \u0432\u0456\u0434 {issueDate} \u043D\u0430 \u0441\u0443\u043C\u0443 {amount} \u0434\u043E\u0441\u0456 \u043D\u0435 \u043E\u043F\u043B\u0430\u0447\u0435\u043D\u043E, \u043F\u043E\u043F\u0440\u0438 \u043D\u0430\u0433\u0430\u0434\u0443\u0432\u0430\u043D\u043D\u044F \u0442\u0430 \u043F\u0440\u0435\u0442\u0435\u043D\u0437\u0456\u044E (\u043F\u0440\u043E\u0441\u0442\u0440\u043E\u0447\u0435\u043D\u043D\u044F {days} \u0434\u043D\u0456\u0432, \u0441\u0442\u0440\u043E\u043A \u043E\u043F\u043B\u0430\u0442\u0438 {dueDate}).\n\n\u0412\u0438\u043C\u0430\u0433\u0430\u0454\u043C\u043E \u043F\u0435\u0440\u0435\u0440\u0430\u0445\u0443\u0432\u0430\u0442\u0438 \u0441\u0443\u043C\u0443 \u043D\u0435 \u043F\u0456\u0437\u043D\u0456\u0448\u0435 {deadline}. \u0406\u043D\u0430\u043A\u0448\u0435 \u043C\u0438 \u0437\u0430\u043B\u0438\u0448\u0430\u0454\u043C\u043E \u0437\u0430 \u0441\u043E\u0431\u043E\u044E \u043F\u0440\u0430\u0432\u043E \u043D\u0430 \u043F\u043E\u0434\u0430\u043B\u044C\u0448\u0456 \u043A\u0440\u043E\u043A\u0438.\n\n\u0417 \u043F\u043E\u0432\u0430\u0433\u043E\u044E\n{seller}"
    }
  ],
  "zh-cn": [
    {
      subject: "\u5173\u4E8E\u53D1\u7968 {number} \u7684\u4ED8\u6B3E\u63D0\u9192",
      body: "\u5C0A\u656C\u7684\u5973\u58EB/\u5148\u751F\uFF1A\n\n\u6211\u4EEC\u81F3\u4ECA\u5C1A\u672A\u6536\u5230 {issueDate} \u5F00\u5177\u3001\u91D1\u989D\u4E3A {amount} \u7684\u53D1\u7968 {number} \u7684\u4ED8\u6B3E\u3002\u8BE5\u53D1\u7968\u5DF2\u4E8E {dueDate} \u5230\u671F\u3002\n\n\u8BF7\u4E8E {deadline} \u524D\u8F6C\u8D26\u652F\u4ED8\u8BE5\u6B3E\u9879\u3002\u5982\u60A8\u7684\u4ED8\u6B3E\u4E0E\u672C\u51FD\u9519\u8FC7\uFF0C\u8BF7\u5FFD\u7565\u672C\u51FD\u3002\n\n\u6B64\u81F4\u656C\u793C\n{seller}"
    },
    {
      subject: "\u5173\u4E8E\u53D1\u7968 {number} \u7684\u7B2C\u4E00\u6B21\u50AC\u6B3E\u51FD",
      body: "\u5C0A\u656C\u7684\u5973\u58EB/\u5148\u751F\uFF1A\n\n\u5C3D\u7BA1\u6211\u4EEC\u5DF2\u53D1\u51FA\u4ED8\u6B3E\u63D0\u9192\uFF0C{issueDate} \u5F00\u5177\u3001\u91D1\u989D\u4E3A {amount} \u7684\u53D1\u7968 {number} \u4ECD\u672A\u4ED8\u6B3E\u3002\u8BE5\u6B3E\u9879\u5DF2\u903E\u671F {days} \u5929\uFF08\u5230\u671F\u65E5 {dueDate}\uFF09\u3002\n\n\u8BF7\u4E8E {deadline} \u524D\u8F6C\u8D26\u652F\u4ED8\u8BE5\u6B3E\u9879\u3002\n\n\u6B64\u81F4\u656C\u793C\n{seller}"
    },
    {
      subject: "\u5173\u4E8E\u53D1\u7968 {number} \u7684\u7B2C\u4E8C\u6B21\u50AC\u6B3E\u51FD",
      body: "\u5C0A\u656C\u7684\u5973\u58EB/\u5148\u751F\uFF1A\n\n\u5C3D\u7BA1\u5DF2\u53D1\u51FA\u63D0\u9192\u548C\u50AC\u6B3E\u51FD\uFF0C{issueDate} \u5F00\u5177\u3001\u91D1\u989D\u4E3A {amount} \u7684\u53D1\u7968 {number} \u4ECD\u672A\u4ED8\u6B3E\uFF08\u903E\u671F {days} \u5929\uFF0C\u5230\u671F\u65E5 {dueDate}\uFF09\u3002\n\n\u6211\u4EEC\u8981\u6C42\u60A8\u6700\u8FDF\u4E8E {deadline} \u524D\u8F6C\u8D26\u652F\u4ED8\u8BE5\u6B3E\u9879\u3002\u5426\u5219\u6211\u4EEC\u4FDD\u7559\u91C7\u53D6\u8FDB\u4E00\u6B65\u63AA\u65BD\u7684\u6743\u5229\u3002\n\n\u6B64\u81F4\u656C\u793C\n{seller}"
    }
  ]
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  DUNNING_DEFAULT_TEXTS
});
//# sourceMappingURL=dunning-texts.js.map
