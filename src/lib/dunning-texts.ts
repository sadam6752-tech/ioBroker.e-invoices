/**
 * The built-in dunning texts in the eleven languages of ioBroker (R6.4).
 *
 * The adapter takes the language of the ioBroker system (English when it is not one of the eleven). The user can
 * change every level in the web app; a changed text is kept as typed, whatever the language.
 *
 * Placeholders: {number} {customer} {issueDate} {dueDate} {amount} {days} {deadline} {seller}. No fees and no
 * default interest: that is a legal decision for the sender and does not belong in a default text.
 */
import type { OutputLanguage } from './output-i18n';

/** Subject and body of one level. */
interface LevelText {
	/** Subject line. */
	subject: string;
	/** Letter body. */
	body: string;
}

/** Reminder, first and second dunning letter. */
export const DUNNING_DEFAULT_TEXTS: Record<OutputLanguage, [LevelText, LevelText, LevelText]> = {
	en: [
		{
			subject: 'Payment reminder for invoice {number}',
			body:
				'Dear Sir or Madam,\n\n' +
				'we have not yet received payment for our invoice {number} of {issueDate} for {amount}. It was due on {dueDate}.\n\n' +
				'Please transfer the amount by {deadline}. If your payment has crossed with this letter, please disregard it.\n\n' +
				'Kind regards\n{seller}',
		},
		{
			subject: 'First dunning notice for invoice {number}',
			body:
				'Dear Sir or Madam,\n\n' +
				'despite our payment reminder, invoice {number} of {issueDate} for {amount} is still unpaid. ' +
				'It has been overdue for {days} days (due on {dueDate}).\n\n' +
				'Please transfer the amount by {deadline}.\n\n' +
				'Kind regards\n{seller}',
		},
		{
			subject: 'Second dunning notice for invoice {number}',
			body:
				'Dear Sir or Madam,\n\n' +
				'invoice {number} of {issueDate} for {amount} is still unpaid despite our reminder and dunning notice ' +
				'({days} days overdue, due on {dueDate}).\n\n' +
				'We request that you transfer the amount by {deadline} at the latest. Otherwise we reserve the right to take further steps.\n\n' +
				'Kind regards\n{seller}',
		},
	],
	de: [
		{
			subject: 'Zahlungserinnerung zur Rechnung {number}',
			body:
				'Sehr geehrte Damen und Herren,\n\n' +
				'zu unserer Rechnung {number} vom {issueDate} über {amount} konnten wir bis heute keinen Zahlungseingang feststellen. ' +
				'Sie war am {dueDate} fällig.\n\n' +
				'Bitte überweisen Sie den Betrag bis zum {deadline}. Sollte sich Ihre Zahlung mit diesem Schreiben überschnitten haben, ' +
				'betrachten Sie es bitte als gegenstandslos.\n\n' +
				'Mit freundlichen Grüßen\n{seller}',
		},
		{
			subject: '1. Mahnung zur Rechnung {number}',
			body:
				'Sehr geehrte Damen und Herren,\n\n' +
				'trotz unserer Zahlungserinnerung ist die Rechnung {number} vom {issueDate} über {amount} weiterhin offen. ' +
				'Sie ist seit {days} Tagen überfällig (fällig am {dueDate}).\n\n' +
				'Wir bitten Sie, den Betrag bis zum {deadline} zu überweisen.\n\n' +
				'Mit freundlichen Grüßen\n{seller}',
		},
		{
			subject: '2. Mahnung zur Rechnung {number}',
			body:
				'Sehr geehrte Damen und Herren,\n\n' +
				'die Rechnung {number} vom {issueDate} über {amount} ist trotz Erinnerung und Mahnung noch immer nicht bezahlt ' +
				'(seit {days} Tagen überfällig, fällig am {dueDate}).\n\n' +
				'Wir fordern Sie auf, den Betrag bis spätestens {deadline} zu überweisen. ' +
				'Andernfalls behalten wir uns weitere Schritte vor.\n\n' +
				'Mit freundlichen Grüßen\n{seller}',
		},
	],
	ru: [
		{
			subject: 'Напоминание об оплате счёта {number}',
			body:
				'Уважаемые дамы и господа,\n\n' +
				'по нашему счёту {number} от {issueDate} на сумму {amount} оплата до сих пор не поступила. Срок оплаты истёк {dueDate}.\n\n' +
				'Пожалуйста, переведите сумму до {deadline}. Если ваш платёж разминулся с этим письмом, просим считать его недействительным.\n\n' +
				'С уважением\n{seller}',
		},
		{
			subject: 'Первая претензия по счёту {number}',
			body:
				'Уважаемые дамы и господа,\n\n' +
				'несмотря на наше напоминание, счёт {number} от {issueDate} на сумму {amount} по-прежнему не оплачен. ' +
				'Просрочка составляет {days} дней (срок оплаты {dueDate}).\n\n' +
				'Просим перевести сумму до {deadline}.\n\n' +
				'С уважением\n{seller}',
		},
		{
			subject: 'Вторая претензия по счёту {number}',
			body:
				'Уважаемые дамы и господа,\n\n' +
				'счёт {number} от {issueDate} на сумму {amount} всё ещё не оплачен, несмотря на напоминание и претензию ' +
				'(просрочка {days} дней, срок оплаты {dueDate}).\n\n' +
				'Требуем перевести сумму не позднее {deadline}. В противном случае мы оставляем за собой право на дальнейшие шаги.\n\n' +
				'С уважением\n{seller}',
		},
	],
	pt: [
		{
			subject: 'Lembrete de pagamento da fatura {number}',
			body:
				'Exmos. Senhores,\n\n' +
				'até hoje não registámos o pagamento da nossa fatura {number} de {issueDate} no valor de {amount}. O vencimento foi a {dueDate}.\n\n' +
				'Solicitamos a transferência do valor até {deadline}. Caso o pagamento se tenha cruzado com esta carta, queiram ignorá-la.\n\n' +
				'Com os melhores cumprimentos\n{seller}',
		},
		{
			subject: 'Primeiro aviso de cobrança da fatura {number}',
			body:
				'Exmos. Senhores,\n\n' +
				'apesar do nosso lembrete, a fatura {number} de {issueDate} no valor de {amount} continua por pagar. ' +
				'Está em atraso há {days} dias (vencimento a {dueDate}).\n\n' +
				'Solicitamos a transferência do valor até {deadline}.\n\n' +
				'Com os melhores cumprimentos\n{seller}',
		},
		{
			subject: 'Segundo aviso de cobrança da fatura {number}',
			body:
				'Exmos. Senhores,\n\n' +
				'a fatura {number} de {issueDate} no valor de {amount} continua por pagar apesar do lembrete e do aviso de cobrança ' +
				'({days} dias em atraso, vencimento a {dueDate}).\n\n' +
				'Exigimos a transferência do valor até {deadline}, o mais tardar. Caso contrário, reservamo-nos o direito de tomar outras medidas.\n\n' +
				'Com os melhores cumprimentos\n{seller}',
		},
	],
	nl: [
		{
			subject: 'Betalingsherinnering voor factuur {number}',
			body:
				'Geachte dames en heren,\n\n' +
				'voor onze factuur {number} van {issueDate} over {amount} hebben wij tot op heden geen betaling ontvangen. De vervaldatum was {dueDate}.\n\n' +
				'Wij verzoeken u het bedrag uiterlijk {deadline} over te maken. Mocht uw betaling deze brief hebben gekruist, dan kunt u deze als niet verzonden beschouwen.\n\n' +
				'Met vriendelijke groet\n{seller}',
		},
		{
			subject: 'Eerste aanmaning voor factuur {number}',
			body:
				'Geachte dames en heren,\n\n' +
				'ondanks onze betalingsherinnering staat factuur {number} van {issueDate} over {amount} nog altijd open. ' +
				'De betaling is {days} dagen te laat (vervaldatum {dueDate}).\n\n' +
				'Wij verzoeken u het bedrag uiterlijk {deadline} over te maken.\n\n' +
				'Met vriendelijke groet\n{seller}',
		},
		{
			subject: 'Tweede aanmaning voor factuur {number}',
			body:
				'Geachte dames en heren,\n\n' +
				'factuur {number} van {issueDate} over {amount} is ondanks herinnering en aanmaning nog steeds niet betaald ' +
				'({days} dagen te laat, vervaldatum {dueDate}).\n\n' +
				'Wij sommeren u het bedrag uiterlijk {deadline} over te maken. Anders behouden wij ons verdere stappen voor.\n\n' +
				'Met vriendelijke groet\n{seller}',
		},
	],
	fr: [
		{
			subject: 'Rappel de paiement pour la facture {number}',
			body:
				'Madame, Monsieur,\n\n' +
				"nous n'avons pas encore reçu le paiement de notre facture {number} du {issueDate} d'un montant de {amount}. Elle était échue le {dueDate}.\n\n" +
				"Nous vous prions de virer le montant d'ici le {deadline}. Si votre paiement a croisé ce courrier, veuillez ne pas en tenir compte.\n\n" +
				'Veuillez agréer nos salutations distinguées.\n{seller}',
		},
		{
			subject: 'Première relance pour la facture {number}',
			body:
				'Madame, Monsieur,\n\n' +
				"malgré notre rappel de paiement, la facture {number} du {issueDate} d'un montant de {amount} reste impayée. " +
				'Elle est en retard de {days} jours (échéance le {dueDate}).\n\n' +
				"Nous vous prions de virer le montant d'ici le {deadline}.\n\n" +
				'Veuillez agréer nos salutations distinguées.\n{seller}',
		},
		{
			subject: 'Deuxième relance pour la facture {number}',
			body:
				'Madame, Monsieur,\n\n' +
				"la facture {number} du {issueDate} d'un montant de {amount} reste impayée malgré notre rappel et notre relance " +
				'({days} jours de retard, échéance le {dueDate}).\n\n' +
				"Nous vous mettons en demeure de virer le montant au plus tard le {deadline}. À défaut, nous nous réservons le droit d'engager d'autres démarches.\n\n" +
				'Veuillez agréer nos salutations distinguées.\n{seller}',
		},
	],
	it: [
		{
			subject: 'Promemoria di pagamento per la fattura {number}',
			body:
				'Gentili Signore e Signori,\n\n' +
				'non abbiamo ancora ricevuto il pagamento della nostra fattura {number} del {issueDate} per un importo di {amount}. Era in scadenza il {dueDate}.\n\n' +
				"Vi preghiamo di bonificare l'importo entro il {deadline}. Se il vostro pagamento si è incrociato con questa lettera, vi preghiamo di non tenerne conto.\n\n" +
				'Cordiali saluti\n{seller}',
		},
		{
			subject: 'Primo sollecito per la fattura {number}',
			body:
				'Gentili Signore e Signori,\n\n' +
				'nonostante il nostro promemoria, la fattura {number} del {issueDate} per un importo di {amount} risulta ancora aperta. ' +
				'È scaduta da {days} giorni (scadenza il {dueDate}).\n\n' +
				"Vi preghiamo di bonificare l'importo entro il {deadline}.\n\n" +
				'Cordiali saluti\n{seller}',
		},
		{
			subject: 'Secondo sollecito per la fattura {number}',
			body:
				'Gentili Signore e Signori,\n\n' +
				'la fattura {number} del {issueDate} per un importo di {amount} non è ancora stata pagata nonostante promemoria e sollecito ' +
				'(scaduta da {days} giorni, scadenza il {dueDate}).\n\n' +
				"Vi intimiamo di bonificare l'importo entro e non oltre il {deadline}. In caso contrario ci riserviamo di intraprendere ulteriori azioni.\n\n" +
				'Cordiali saluti\n{seller}',
		},
	],
	es: [
		{
			subject: 'Recordatorio de pago de la factura {number}',
			body:
				'Estimados señores:\n\n' +
				'hasta hoy no hemos recibido el pago de nuestra factura {number} del {issueDate} por importe de {amount}. Vencía el {dueDate}.\n\n' +
				'Les rogamos que transfieran el importe antes del {deadline}. Si su pago se ha cruzado con esta carta, no la tengan en cuenta.\n\n' +
				'Atentamente\n{seller}',
		},
		{
			subject: 'Primera reclamación de la factura {number}',
			body:
				'Estimados señores:\n\n' +
				'a pesar de nuestro recordatorio, la factura {number} del {issueDate} por importe de {amount} sigue pendiente. ' +
				'Lleva {days} días de retraso (vencimiento el {dueDate}).\n\n' +
				'Les rogamos que transfieran el importe antes del {deadline}.\n\n' +
				'Atentamente\n{seller}',
		},
		{
			subject: 'Segunda reclamación de la factura {number}',
			body:
				'Estimados señores:\n\n' +
				'la factura {number} del {issueDate} por importe de {amount} sigue sin pagarse pese al recordatorio y la reclamación ' +
				'({days} días de retraso, vencimiento el {dueDate}).\n\n' +
				'Les requerimos que transfieran el importe a más tardar el {deadline}. De lo contrario, nos reservamos el derecho de tomar otras medidas.\n\n' +
				'Atentamente\n{seller}',
		},
	],
	pl: [
		{
			subject: 'Przypomnienie o płatności za fakturę {number}',
			body:
				'Szanowni Państwo,\n\n' +
				'do dziś nie odnotowaliśmy wpłaty za naszą fakturę {number} z dnia {issueDate} na kwotę {amount}. Termin płatności upłynął {dueDate}.\n\n' +
				'Prosimy o przelew kwoty do {deadline}. Jeśli Państwa płatność minęła się z tym pismem, prosimy uznać je za bezprzedmiotowe.\n\n' +
				'Z poważaniem\n{seller}',
		},
		{
			subject: 'Pierwsze wezwanie do zapłaty faktury {number}',
			body:
				'Szanowni Państwo,\n\n' +
				'mimo naszego przypomnienia faktura {number} z dnia {issueDate} na kwotę {amount} nadal pozostaje nieopłacona. ' +
				'Zaległość wynosi {days} dni (termin płatności {dueDate}).\n\n' +
				'Prosimy o przelew kwoty do {deadline}.\n\n' +
				'Z poważaniem\n{seller}',
		},
		{
			subject: 'Drugie wezwanie do zapłaty faktury {number}',
			body:
				'Szanowni Państwo,\n\n' +
				'faktura {number} z dnia {issueDate} na kwotę {amount} mimo przypomnienia i wezwania nadal nie została opłacona ' +
				'({days} dni zaległości, termin płatności {dueDate}).\n\n' +
				'Wzywamy do przelania kwoty najpóźniej do {deadline}. W przeciwnym razie zastrzegamy sobie prawo do podjęcia dalszych kroków.\n\n' +
				'Z poważaniem\n{seller}',
		},
	],
	uk: [
		{
			subject: 'Нагадування про оплату рахунку {number}',
			body:
				'Шановні пані та панове,\n\n' +
				'оплата за нашим рахунком {number} від {issueDate} на суму {amount} досі не надійшла. Строк оплати минув {dueDate}.\n\n' +
				'Просимо перерахувати суму до {deadline}. Якщо ваш платіж розминувся з цим листом, просимо вважати його недійсним.\n\n' +
				'З повагою\n{seller}',
		},
		{
			subject: 'Перша претензія щодо рахунку {number}',
			body:
				'Шановні пані та панове,\n\n' +
				'попри наше нагадування, рахунок {number} від {issueDate} на суму {amount} досі не оплачено. ' +
				'Прострочення становить {days} днів (строк оплати {dueDate}).\n\n' +
				'Просимо перерахувати суму до {deadline}.\n\n' +
				'З повагою\n{seller}',
		},
		{
			subject: 'Друга претензія щодо рахунку {number}',
			body:
				'Шановні пані та панове,\n\n' +
				'рахунок {number} від {issueDate} на суму {amount} досі не оплачено, попри нагадування та претензію ' +
				'(прострочення {days} днів, строк оплати {dueDate}).\n\n' +
				'Вимагаємо перерахувати суму не пізніше {deadline}. Інакше ми залишаємо за собою право на подальші кроки.\n\n' +
				'З повагою\n{seller}',
		},
	],
	'zh-cn': [
		{
			subject: '关于发票 {number} 的付款提醒',
			body:
				'尊敬的女士/先生：\n\n' +
				'我们至今尚未收到 {issueDate} 开具、金额为 {amount} 的发票 {number} 的付款。该发票已于 {dueDate} 到期。\n\n' +
				'请于 {deadline} 前转账支付该款项。如您的付款与本函错过，请忽略本函。\n\n' +
				'此致敬礼\n{seller}',
		},
		{
			subject: '关于发票 {number} 的第一次催款函',
			body:
				'尊敬的女士/先生：\n\n' +
				'尽管我们已发出付款提醒，{issueDate} 开具、金额为 {amount} 的发票 {number} 仍未付款。' +
				'该款项已逾期 {days} 天（到期日 {dueDate}）。\n\n' +
				'请于 {deadline} 前转账支付该款项。\n\n' +
				'此致敬礼\n{seller}',
		},
		{
			subject: '关于发票 {number} 的第二次催款函',
			body:
				'尊敬的女士/先生：\n\n' +
				'尽管已发出提醒和催款函，{issueDate} 开具、金额为 {amount} 的发票 {number} 仍未付款' +
				'（逾期 {days} 天，到期日 {dueDate}）。\n\n' +
				'我们要求您最迟于 {deadline} 前转账支付该款项。否则我们保留采取进一步措施的权利。\n\n' +
				'此致敬礼\n{seller}',
		},
	],
};
