/**
 * Dunning suggestions for ioBroker.e-invoices (R6.4).
 *
 * The adapter has always known which invoices are overdue and how many reminders were
 * marked (`reminder_level`). What was missing is the next step: which level comes next,
 * from which day, with which words. This module is pure — no database, no server — so the
 * JSON view, the CSV and the PDF share **one** calculation and the texts one place.
 *
 * Nothing is sent and no XML is created: a reminder is a letter about an invoice that
 * exists, not a new tax document. The user reads the suggestion, sends it and marks the
 * invoice as reminded; only that moves the level on.
 *
 * Three levels, each with its own text, the day (overdue days) from which it is suggested
 * and the payment deadline the letter sets. No fees and no default interest are added:
 * that is a legal decision for the sender and does not belong in a default text.
 */
import type { ReminderCandidate } from './issue-service';
import { addDaysIso } from './invoice-model';

/** Highest dunning level. */
export const MAX_DUNNING_LEVEL = 3;

/** One level of the dunning process. */
export interface DunningText {
	/** 1 = reminder, 2 = first dunning letter, 3 = second dunning letter. */
	level: number;
	/** Subject line, may use the placeholders. */
	subject: string;
	/** Letter body, may use the placeholders. */
	body: string;
	/** Overdue days from which this level is suggested. */
	days: number;
	/** Payment deadline the letter sets, in days from the day it is written. */
	deadlineDays: number;
	/** True when the text is the built-in one, false when it was changed. */
	isDefault: boolean;
}

/** Placeholders a text may use; unknown ones are left as typed. */
export const DUNNING_PLACEHOLDERS = [
	'number',
	'customer',
	'issueDate',
	'dueDate',
	'amount',
	'days',
	'deadline',
	'seller',
] as const;

/** Built-in texts, used until the user changes a level. */
export const DEFAULT_DUNNING_TEXTS: readonly DunningText[] = [
	{
		level: 1,
		subject: 'Zahlungserinnerung zur Rechnung {number}',
		body:
			'Sehr geehrte Damen und Herren,\n\n' +
			'zu unserer Rechnung {number} vom {issueDate} über {amount} konnten wir bis heute keinen Zahlungseingang feststellen. ' +
			'Sie war am {dueDate} fällig.\n\n' +
			'Bitte überweisen Sie den Betrag bis zum {deadline}. Sollte sich Ihre Zahlung mit diesem Schreiben überschnitten haben, ' +
			'betrachten Sie es bitte als gegenstandslos.\n\n' +
			'Mit freundlichen Grüßen\n{seller}',
		days: 5,
		deadlineDays: 7,
		isDefault: true,
	},
	{
		level: 2,
		subject: '1. Mahnung zur Rechnung {number}',
		body:
			'Sehr geehrte Damen und Herren,\n\n' +
			'trotz unserer Zahlungserinnerung ist die Rechnung {number} vom {issueDate} über {amount} weiterhin offen. ' +
			'Sie ist seit {days} Tagen überfällig (fällig am {dueDate}).\n\n' +
			'Wir bitten Sie, den Betrag bis zum {deadline} zu überweisen.\n\n' +
			'Mit freundlichen Grüßen\n{seller}',
		days: 19,
		deadlineDays: 7,
		isDefault: true,
	},
	{
		level: 3,
		subject: '2. Mahnung zur Rechnung {number}',
		body:
			'Sehr geehrte Damen und Herren,\n\n' +
			'die Rechnung {number} vom {issueDate} über {amount} ist trotz Erinnerung und Mahnung noch immer nicht bezahlt ' +
			'(seit {days} Tagen überfällig, fällig am {dueDate}).\n\n' +
			'Wir fordern Sie auf, den Betrag bis spätestens {deadline} zu überweisen. ' +
			'Andernfalls behalten wir uns weitere Schritte vor.\n\n' +
			'Mit freundlichen Grüßen\n{seller}',
		days: 33,
		deadlineDays: 5,
		isDefault: true,
	},
];

/** Limits of the editable fields. */
export const DUNNING_LIMITS = { subject: 200, body: 4000, days: 365, deadlineDays: 90 } as const;

/** What the user may change on one level. */
export interface DunningTextPatch {
	/** New subject line. */
	subject?: unknown;
	/** New body. */
	body?: unknown;
	/** New overdue days. */
	days?: unknown;
	/** New payment deadline in days. */
	deadlineDays?: unknown;
}

/**
 * Checks the editable fields of a level.
 *
 * @param level - Level the patch is for.
 * @param patch - Fields to change.
 * @returns Error messages, empty when everything is fine.
 */
export function validateDunningPatch(level: number, patch: DunningTextPatch): string[] {
	const errors: string[] = [];
	if (!Number.isInteger(level) || level < 1 || level > MAX_DUNNING_LEVEL) {
		errors.push(`Level must be 1 to ${MAX_DUNNING_LEVEL}`);
	}
	for (const key of ['subject', 'body'] as const) {
		const value = patch[key];
		if (
			value !== undefined &&
			(typeof value !== 'string' || value.trim() === '' || value.length > DUNNING_LIMITS[key])
		) {
			errors.push(`${key} must be a text of 1 to ${DUNNING_LIMITS[key]} characters`);
		}
	}
	for (const key of ['days', 'deadlineDays'] as const) {
		const value = patch[key];
		if (
			value !== undefined &&
			(!Number.isInteger(value) || (value as number) < 1 || (value as number) > DUNNING_LIMITS[key])
		) {
			errors.push(`${key} must be a whole number from 1 to ${DUNNING_LIMITS[key]}`);
		}
	}
	return errors;
}

/** One invoice for which the next dunning step is due. */
export interface DunningSuggestion {
	/** Invoice UUID. */
	invoiceId: string;
	/** Invoice number. */
	number: string;
	/** Customer name. */
	customer: string;
	/** Customer e-mail, empty when unknown (for the `mailto:` link of the web app). */
	email: string;
	/** Level this step would be (reminders already marked + 1). */
	level: number;
	/** Whole days past the due date. */
	overdueDays: number;
	/** Open gross amount in EUR. */
	amount: number;
	/** ISO due date. */
	dueDate: string;
	/** ISO payment deadline the letter sets. */
	deadline: string;
	/** Skonto is still possible, so the letter mentions it. */
	skontoActive: boolean;
	/** Sender in one line (name, street, zip and city), for the letter's address line. */
	sender: string;
	/** Recipient address lines, for the letter. */
	recipient: string[];
	/** Subject with the placeholders filled in. */
	subject: string;
	/** Body with the placeholders filled in. */
	text: string;
}

/**
 * Formats an ISO date German style.
 *
 * @param iso - `YYYY-MM-DD`.
 */
function de(iso: string): string {
	const [year, month, day] = iso.slice(0, 10).split('-');
	return `${day}.${month}.${year}`;
}

/**
 * Fills the placeholders of a text; unknown placeholders stay as they are.
 *
 * @param template - Text with `{name}` placeholders.
 * @param values - Values by placeholder name.
 */
export function fillPlaceholders(template: string, values: Record<string, string>): string {
	return template.replace(/\{(\w+)\}/g, (whole, key: string) => values[key] ?? whole);
}

/**
 * Builds the suggestions: for each overdue invoice the next level, when its day has come.
 *
 * @param candidates - Overdue, unpaid invoices (`collectReminderCandidates`).
 * @param texts - The three levels (`listDunningTexts`).
 * @param today - ISO reference day.
 * @returns Suggestions, the longest overdue first.
 */
export function buildDunningSuggestions(
	candidates: ReminderCandidate[],
	texts: readonly DunningText[],
	today: string,
): DunningSuggestion[] {
	const out: DunningSuggestion[] = [];
	for (const candidate of candidates) {
		const level = candidate.level + 1;
		const text = texts.find(entry => entry.level === level);
		// after the last level there is nothing left to suggest — the next step is the
		// sender's own decision (collection, lawyer), not a template
		if (!text || candidate.overdueDays < text.days) {
			continue;
		}
		const invoice = candidate.invoice;
		const deadline = addDaysIso(today, text.deadlineDays);
		const values: Record<string, string> = {
			number: invoice.number ?? '',
			customer: invoice.buyer.name,
			issueDate: de(invoice.issueDate),
			dueDate: de(invoice.dueDate ?? today),
			amount: `${invoice.totals.grossTotal.toFixed(2).replace('.', ',')} €`,
			days: String(candidate.overdueDays),
			deadline: de(deadline),
			seller: invoice.seller.name,
		};
		let body = fillPlaceholders(text.body, values);
		if (candidate.skontoActive && level === 1) {
			body = body.replace(
				/\n\nMit freundlichen/,
				`\n\nBei Zahlung bis zum ${de(invoice.skontoDueDate ?? today)} können Sie noch ${invoice.skontoPercent} % Skonto abziehen.\n\nMit freundlichen`,
			);
		}
		out.push({
			invoiceId: invoice.id,
			number: invoice.number ?? '',
			customer: invoice.buyer.name,
			email: invoice.buyer.email ?? '',
			level,
			overdueDays: candidate.overdueDays,
			amount: invoice.totals.grossTotal,
			dueDate: invoice.dueDate ?? '',
			deadline,
			skontoActive: candidate.skontoActive,
			sender: [invoice.seller.name, invoice.seller.street, `${invoice.seller.zip} ${invoice.seller.city}`]
				.filter(part => part.trim() !== '')
				.join(' · '),
			recipient: [invoice.buyer.name, invoice.buyer.street, `${invoice.buyer.zip} ${invoice.buyer.city}`].filter(
				part => part.trim() !== '',
			),
			subject: fillPlaceholders(text.subject, values),
			text: body,
		});
	}
	return out.sort((a, b) => b.overdueDays - a.overdueDays || a.number.localeCompare(b.number));
}
