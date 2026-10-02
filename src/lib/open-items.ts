/**
 * Open items (OPOS) for ioBroker.e-invoices (R6.2).
 *
 * The data was always there (`paid`, `due_date`, `skonto_*`, the reminder
 * columns); what was missing is the evaluation: which invoices are still unpaid,
 * how old is the claim, who owes how much. This module is pure — no database,
 * no server — so the JSON view, the CSV and the Excel export share **one**
 * calculation and cannot disagree.
 *
 * What counts as an open item:
 * - an **issued invoice** (offers are no claims, drafts are not booked),
 * - that is **not paid**,
 * - and is **no credit note**: a Storno credit note (`stornoOfId`) and a document
 *   titled "Gutschrift" reduce a claim but the record has no allocation to the
 *   invoice they settle, so they are left out instead of guessed. A cancelled
 *   original is not issued any more and drops out by its status.
 *
 * There are no part payments in the record (`paid` is a flag), so the open
 * amount of an invoice is its gross total.
 */
import type { StoredInvoice } from './db';
import { daysBetween, isQuote, todayIso } from './invoice-model';

/** Age buckets of the aging list, in the order they are shown. */
export const AGE_BUCKETS = ['notDue', 'd1to30', 'd31to60', 'd61to90', 'over90'] as const;

/** One age bucket. */
export type AgeBucket = (typeof AGE_BUCKETS)[number];

/** German labels of the buckets (CSV and Excel); the web app translates its own. */
export const AGE_BUCKET_LABELS: Record<AgeBucket, string> = {
	notDue: 'nicht fällig',
	d1to30: '1–30 Tage überfällig',
	d31to60: '31–60 Tage überfällig',
	d61to90: '61–90 Tage überfällig',
	over90: 'über 90 Tage überfällig',
};

/** One unpaid invoice with its age. */
export interface OpenItem {
	/** Invoice UUID. */
	id: string;
	/** Invoice number. */
	number: string;
	/** Customer name. */
	customer: string;
	/** Customer number (BT-10), empty when none. */
	customerNumber: string;
	/** ISO issue date. */
	issueDate: string;
	/** ISO due date, empty when the invoice has none. */
	dueDate: string;
	/** Open amount in EUR (gross total). */
	amount: number;
	/** Whole days past the due date, 0 when not yet due or without due date. */
	overdueDays: number;
	/** Age bucket. */
	bucket: AgeBucket;
	/** Cash discount in percent, 0 when none. */
	skontoPercent: number;
	/** Reminders already sent (0 = none). */
	reminderLevel: number;
	/** True when the invoice was handed to the customer. */
	sent: boolean;
}

/** Count and sum of a group. */
export interface Subtotal {
	/** Number of items. */
	count: number;
	/** Sum of the open amounts in EUR. */
	amount: number;
}

/** The customers who owe the most, with their share. */
export interface CustomerSubtotal extends Subtotal {
	/** Customer name. */
	customer: string;
	/** Customer number, empty when none. */
	customerNumber: string;
}

/** The whole evaluation. */
export interface OpenItemsReport {
	/** Reference day (ISO). */
	asOf: string;
	/** True when only overdue items are included. */
	onlyOverdue: boolean;
	/** The items, oldest claim first. */
	items: OpenItem[];
	/** Count and sum per age bucket (every bucket is present, empty ones with 0). */
	buckets: Record<AgeBucket, Subtotal>;
	/** Count and sum of everything listed. */
	total: Subtotal;
	/** Count and sum of the overdue part. */
	overdue: Subtotal;
	/** Per customer, the biggest debt first. */
	customers: CustomerSubtotal[];
}

/** Options of the evaluation. */
export interface OpenItemsOptions {
	/** Reference day (ISO), defaults to today. */
	asOf?: string;
	/** Only items past their due date. */
	onlyOverdue?: boolean;
}

/**
 * Rounds a sum of cents without float drift.
 *
 * @param value - Amount in EUR.
 */
function cents(value: number): number {
	return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Bucket of a number of days overdue.
 *
 * @param overdueDays - Whole days past the due date (≤ 0 = not yet due).
 */
export function bucketOf(overdueDays: number): AgeBucket {
	if (overdueDays <= 0) {
		return 'notDue';
	}
	if (overdueDays <= 30) {
		return 'd1to30';
	}
	if (overdueDays <= 60) {
		return 'd31to60';
	}
	if (overdueDays <= 90) {
		return 'd61to90';
	}
	return 'over90';
}

/**
 * True when a stored invoice is an open item (see the module comment).
 *
 * @param invoice - Stored document.
 */
export function isOpenItem(invoice: StoredInvoice): boolean {
	return (
		invoice.status === 'issued' &&
		!invoice.paid &&
		!isQuote(invoice.docType) &&
		invoice.stornoOfId == null &&
		invoice.documentTitle !== 'Gutschrift'
	);
}

/**
 * Evaluates the open items.
 *
 * @param invoices - Stored documents (anything; the rules pick the open invoices).
 * @param options - Reference day and the overdue filter.
 */
export function evaluateOpenItems(invoices: StoredInvoice[], options: OpenItemsOptions = {}): OpenItemsReport {
	const asOf = options.asOf ?? todayIso();
	const onlyOverdue = options.onlyOverdue === true;

	const all: OpenItem[] = invoices.filter(isOpenItem).map(invoice => {
		const overdueDays = invoice.dueDate ? Math.max(0, daysBetween(invoice.dueDate, asOf)) : 0;
		return {
			id: invoice.id,
			number: invoice.number ?? '',
			customer: invoice.buyer.name,
			customerNumber: invoice.buyer.customerNumber ?? '',
			issueDate: invoice.issueDate,
			dueDate: invoice.dueDate ?? '',
			amount: invoice.totals.grossTotal,
			overdueDays,
			bucket: bucketOf(overdueDays),
			skontoPercent: Number(invoice.skontoPercent) || 0,
			reminderLevel: invoice.reminderLevel ?? 0,
			sent: Boolean(invoice.sentAt),
		};
	});
	const items = all
		.filter(item => !onlyOverdue || item.overdueDays > 0)
		// oldest claim first, then by due date and number so the order is stable
		.sort(
			(a, b) =>
				b.overdueDays - a.overdueDays || a.dueDate.localeCompare(b.dueDate) || a.number.localeCompare(b.number),
		);

	const buckets = Object.fromEntries(AGE_BUCKETS.map(bucket => [bucket, { count: 0, amount: 0 }])) as Record<
		AgeBucket,
		Subtotal
	>;
	const total: Subtotal = { count: 0, amount: 0 };
	const overdue: Subtotal = { count: 0, amount: 0 };
	const perCustomer = new Map<string, CustomerSubtotal>();
	for (const item of items) {
		buckets[item.bucket].count += 1;
		buckets[item.bucket].amount += item.amount;
		total.count += 1;
		total.amount += item.amount;
		if (item.overdueDays > 0) {
			overdue.count += 1;
			overdue.amount += item.amount;
		}
		const key = `${item.customerNumber}\u0000${item.customer}`;
		const entry = perCustomer.get(key) ?? {
			customer: item.customer,
			customerNumber: item.customerNumber,
			count: 0,
			amount: 0,
		};
		entry.count += 1;
		entry.amount += item.amount;
		perCustomer.set(key, entry);
	}
	for (const bucket of AGE_BUCKETS) {
		buckets[bucket].amount = cents(buckets[bucket].amount);
	}
	total.amount = cents(total.amount);
	overdue.amount = cents(overdue.amount);
	const customers = [...perCustomer.values()]
		.map(entry => ({ ...entry, amount: cents(entry.amount) }))
		.sort((a, b) => b.amount - a.amount || a.customer.localeCompare(b.customer));

	return { asOf, onlyOverdue, items, buckets, total, overdue, customers };
}
