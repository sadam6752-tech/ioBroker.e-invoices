// This file extends the AdapterConfig type from "@iobroker/types"

// Augment the globally declared type ioBroker.AdapterConfig
declare global {
	namespace ioBroker {
		interface AdapterConfig {
			port: number;
			bind: string;
			authToken: string;
			/** ioBroker file mount for the artifacts, empty = own data directory. */
			storageMount?: string;
			/** Automatic backup interval in minutes, 0 = off. */
			backupIntervalMinutes?: number;
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
			defaultVatRate?: number;
			defaultPaymentTerms?: string;
		}
	}
}

// this is required so the above AdapterConfig is found by TypeScript / type checking
export {};
