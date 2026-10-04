/**
 * Quick choices for the date range of the invoice list and its exports.
 *
 * All dates are ISO `YYYY-MM-DD` in the calendar of the user (no time zone shift: the day is
 * taken apart and put together again, never converted through UTC).
 */

/** The ready-made ranges the dashboard offers. */
export type RangePreset = 'thisMonth' | 'lastMonth' | 'thisQuarter' | 'lastQuarter' | 'thisYear' | 'lastYear';

/** An inclusive range of days. */
export interface DayRange {
	/** First day. */
	from: string;
	/** Last day. */
	to: string;
}

/**
 * Two-digit number.
 *
 * @param value - Number below 100.
 */
function two(value: number): string {
	return String(value).padStart(2, '0');
}

/**
 * Whole months as a range.
 *
 * @param year - Year of the first month.
 * @param month - First month, 1 to 12 (may be 0 or negative to reach into the year before).
 * @param count - Number of months.
 */
function months(year: number, month: number, count: number): DayRange {
	const start = new Date(Date.UTC(year, month - 1, 1));
	const end = new Date(Date.UTC(year, month - 1 + count, 0));
	return {
		from: `${start.getUTCFullYear()}-${two(start.getUTCMonth() + 1)}-01`,
		to: `${end.getUTCFullYear()}-${two(end.getUTCMonth() + 1)}-${two(end.getUTCDate())}`,
	};
}

/**
 * The range a quick choice stands for.
 *
 * @param preset - The choice.
 * @param today - ISO date of today.
 */
export function presetRange(preset: RangePreset, today: string): DayRange {
	const year = Number(today.slice(0, 4));
	const month = Number(today.slice(5, 7));
	const quarterStart = Math.floor((month - 1) / 3) * 3 + 1;
	switch (preset) {
		case 'thisMonth':
			return months(year, month, 1);
		case 'lastMonth':
			return months(year, month - 1, 1);
		case 'thisQuarter':
			return months(year, quarterStart, 3);
		case 'lastQuarter':
			return months(year, quarterStart - 3, 3);
		case 'thisYear':
			return { from: `${year}-01-01`, to: `${year}-12-31` };
		default:
			return { from: `${year - 1}-01-01`, to: `${year - 1}-12-31` };
	}
}

/**
 * Today as a local ISO date.
 *
 * @param now - Moment to read, default now.
 */
export function localToday(now: Date = new Date()): string {
	return `${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(now.getDate())}`;
}
