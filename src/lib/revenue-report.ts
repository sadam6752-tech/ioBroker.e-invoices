/**
 * Revenue per company (R6.3).
 *
 * A document is bound to the company profile it was written for (`company_id`, migration
 * v14). This module adds the documents up per company. It is pure — no database, no
 * server — so the JSON view, the CSV and the Excel list share one calculation.
 *
 * What counts: an **issued invoice** that is no Storno document, minus an **issued credit note** of its
 * own (a "Gutschrift" without Storno link, e.g. for a short delivery): it reduces the revenue of its company
 * (decision of 08.10.2026). A cancelled original is not issued any more and drops out by its status, and its
 * Storno document is left out too, so an invoice and its Storno cancel each other out. Offers and drafts are
 * no revenue.
 *
 * Documents from before the binding exist (`company_id` is NULL): they form their own row
 * "without company", so the grand total always matches the individual documents.
 */
import type { StoredInvoice } from './db';
import { isCreditNoteTitle, isQuote } from './invoice-model';

/** Label of the row that collects documents without a company. */
export const NO_COMPANY_LABEL = 'ohne Firmenzuordnung';

/** Revenue of one company. */
export interface CompanyRevenue {
	/** Company profile id, null for documents without a company. */
	companyId: string | null;
	/** Company name (current profile name, else the seller of the newest document). */
	company: string;
	/** Number of invoices (credit notes are not counted, their amounts are subtracted). */
	count: number;
	/** Sum of the net totals in EUR. */
	net: number;
	/** Sum of the VAT in EUR. */
	tax: number;
	/** Sum of the gross totals in EUR. */
	gross: number;
}

/** Result of the revenue evaluation. */
export interface RevenueReport {
	/** Year the report is limited to, null = all years. */
	year: number | null;
	/** One row per company, largest gross first; the "without company" row last. */
	rows: CompanyRevenue[];
	/** Sum over all rows. */
	total: { count: number; net: number; tax: number; gross: number };
}

/**
 * Rounds to cents so sums of many documents do not drift.
 *
 * @param value - Amount in EUR.
 */
function cents(value: number): number {
	return Math.round(value * 100) / 100;
}

/**
 * True for an invoice that counts as revenue.
 *
 * @param invoice - Stored document.
 */
export function countsAsRevenue(invoice: StoredInvoice): boolean {
	return (
		!isQuote(invoice.docType) &&
		invoice.status === 'issued' &&
		invoice.stornoOfId == null &&
		!isCreditNoteTitle(invoice.documentTitle)
	);
}

/**
 * True for a credit note of its own that reduces the revenue: issued, no Storno document.
 *
 * @param invoice - Stored document.
 */
export function reducesRevenue(invoice: StoredInvoice): boolean {
	return (
		!isQuote(invoice.docType) &&
		invoice.status === 'issued' &&
		invoice.stornoOfId == null &&
		isCreditNoteTitle(invoice.documentTitle)
	);
}

/** A group while it is being added up. */
interface Group extends CompanyRevenue {
	/** Issue date of the newest document, to pick the seller name from. */
	latest: string;
}

/**
 * Adds the revenue up per company.
 *
 * @param invoices - All stored documents.
 * @param names - Current names of the company profiles by id.
 * @param year - Only documents issued in this year, undefined = all.
 */
export function evaluateRevenueByCompany(
	invoices: StoredInvoice[],
	names: ReadonlyMap<string, string>,
	year?: number,
): RevenueReport {
	const groups = new Map<string, Group>();
	for (const invoice of invoices) {
		const credit = reducesRevenue(invoice);
		if (!credit && !countsAsRevenue(invoice)) {
			continue;
		}
		const sign = credit ? -1 : 1;
		if (year !== undefined && invoice.issueDate.slice(0, 4) !== String(year)) {
			continue;
		}
		const key = invoice.companyId ?? '';
		let group = groups.get(key);
		if (!group) {
			group = { companyId: invoice.companyId, company: '', count: 0, net: 0, tax: 0, gross: 0, latest: '' };
			groups.set(key, group);
		}
		group.count += credit ? 0 : 1;
		group.net += sign * invoice.totals.netTotal;
		group.tax += sign * invoice.totals.taxTotal;
		group.gross += sign * invoice.totals.grossTotal;
		if (invoice.issueDate >= group.latest) {
			group.latest = invoice.issueDate;
			group.company = invoice.seller.name;
		}
	}
	const rows: CompanyRevenue[] = [...groups.values()].map(group => ({
		companyId: group.companyId,
		company:
			group.companyId == null
				? NO_COMPANY_LABEL
				: (names.get(group.companyId) ?? (group.company || group.companyId)),
		count: group.count,
		net: cents(group.net),
		tax: cents(group.tax),
		gross: cents(group.gross),
	}));
	rows.sort((a, b) => {
		if ((a.companyId == null) !== (b.companyId == null)) {
			return a.companyId == null ? 1 : -1;
		}
		return b.gross - a.gross || a.company.localeCompare(b.company, 'de');
	});
	const total = { count: 0, net: 0, tax: 0, gross: 0 };
	for (const row of rows) {
		total.count += row.count;
		total.net += row.net;
		total.tax += row.tax;
		total.gross += row.gross;
	}
	return {
		year: year ?? null,
		rows,
		total: { count: total.count, net: cents(total.net), tax: cents(total.tax), gross: cents(total.gross) },
	};
}
