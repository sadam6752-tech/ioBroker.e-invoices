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
import { DUNNING_DEFAULT_TEXTS } from './dunning-texts';
import { formatOutputAmount, formatOutputDate, tr, type OutputLanguage } from './output-i18n';

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

/** Overdue days and payment deadline of the three built-in levels. */
const DEFAULT_SCHEDULE = [
	{ days: 5, deadlineDays: 7 },
	{ days: 19, deadlineDays: 7 },
	{ days: 33, deadlineDays: 5 },
] as const;

/**
 * Built-in texts, used until the user changes a level, in the language of the ioBroker system.
 *
 * @param language - Language of the texts (`outputLanguage` picks English for an unknown one).
 */
export function defaultDunningTexts(language: OutputLanguage): DunningText[] {
	return DUNNING_DEFAULT_TEXTS[language].map((text, index) => ({
		level: index + 1,
		subject: text.subject,
		body: text.body,
		days: DEFAULT_SCHEDULE[index].days,
		deadlineDays: DEFAULT_SCHEDULE[index].deadlineDays,
		isDefault: true,
	}));
}

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
 * @param language - Language of the dates, the amounts and the cash discount sentence (that of the texts).
 * @returns Suggestions, the longest overdue first.
 */
export function buildDunningSuggestions(
	candidates: ReminderCandidate[],
	texts: readonly DunningText[],
	today: string,
	language: OutputLanguage,
): DunningSuggestion[] {
	const date = (iso: string): string => formatOutputDate(iso, language);
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
			issueDate: date(invoice.issueDate),
			dueDate: date(invoice.dueDate ?? today),
			amount: formatOutputAmount(invoice.totals.grossTotal, language),
			days: String(candidate.overdueDays),
			deadline: date(deadline),
			seller: invoice.seller.name,
		};
		let body = fillPlaceholders(text.body, values);
		if (candidate.skontoActive && level === 1) {
			// the cash discount sentence goes before the closing paragraph, in any language and any own text
			const sentence = tr(
				language,
				'If you pay by {date}, you can still deduct a cash discount of {percent} %.',
				{
					date: date(invoice.skontoDueDate ?? today),
					percent: invoice.skontoPercent ?? 0,
				},
			);
			const paragraphs = body.split('\n\n');
			paragraphs.splice(Math.max(paragraphs.length - 1, 1), 0, sentence);
			body = paragraphs.join('\n\n');
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
