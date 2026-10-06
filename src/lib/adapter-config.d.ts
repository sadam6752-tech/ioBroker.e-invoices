// This file extends the AdapterConfig type from "@iobroker/types"

// Augment the globally declared type ioBroker.AdapterConfig
declare global {
	namespace ioBroker {
		interface AdapterConfig {
			port: number;
			bind: string;
			authToken: string;
			/** Start language of the web app: `auto` (browser), `de` or `en`. */
			pwaLanguage?: string;
			/** ioBroker file mount for the artifacts, empty = own data directory. */
			storageMount?: string;
			/** Automatic backup interval in minutes, 0 = off. */
			backupIntervalMinutes?: number;
			/** Automatic backups kept, older ones are deleted; 0 = keep all. Manual backups are never deleted. */
			backupKeep?: number;
			/** Dunning check interval in hours, 0 = off. Never sends mails. */
			reminderCheckHours?: number;
			companyName?: string;
			companyStreet?: string;
			companyZip?: string;
			companyCity?: string;
			companyCountry?: string;
			vatId?: string;
			taxNumber?: string;
			companyEmail?: string;
			iban?: string;
			bic?: string;
			website?: string;
			numberFormat?: string;
			/** Quotation number format; separate number circle (R8). */
			quoteNumberFormat?: string;
			defaultVatRate?: number;
			/** Format a new invoice starts with: `EN16931` (ZUGFeRD) or `XRECHNUNG` (R6.1). */
			defaultProfile?: string;
			defaultPaymentTerms?: string;
		}
	}
}

// this is required so the above AdapterConfig is found by TypeScript / type checking
export {};
