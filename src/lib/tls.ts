/**
 * HTTPS for the web app (R9): the adapter answers over HTTPS itself with a certificate of the certificate
 * collection of ioBroker (Admin > Settings > Certificates) — the same pair the web adapter uses, so no reverse
 * proxy is needed for the app on a phone. iOS only installs a web app from a secure origin.
 *
 * The decision is the operator's: when HTTPS is switched on and the certificate cannot be loaded, the server does
 * NOT fall back to plain HTTP, because an API token over an unencrypted line is exactly what was to be avoided.
 */
import { createServer as createHttpServer, type RequestListener, type Server as HttpServer } from 'node:http';
import { createServer as createHttpsServer, type Server as HttpsServer } from 'node:https';

/** Certificate material of an HTTPS server (PEM text). */
export interface TlsOptions {
	/** Private key. */
	key: string;
	/** Public certificate. */
	cert: string;
	/** Chain (intermediate certificates), optional. */
	ca?: string;
}

/** The HTTPS part of the instance settings. */
export interface TlsConfig {
	/** HTTPS switched on. */
	secure?: boolean;
	/** Name of the public certificate in the collection. */
	certPublic?: string;
	/** Name of the private key in the collection. */
	certPrivate?: string;
	/** Name of the certificate chain in the collection, optional. */
	certChained?: string;
}

/** What `adapter.getCertificatesAsync` hands back. */
export type CertificateLoader = (
	publicName: string,
	privateName: string,
	chainedName?: string,
) => Promise<[{ key?: string; cert?: string; ca?: string } | undefined, ...unknown[]]>;

/** Outcome of the certificate decision. */
export type TlsDecision =
	/** HTTP: HTTPS is not switched on. */
	| { mode: 'http' }
	/** HTTPS with the loaded certificate. */
	| { mode: 'https'; tls: TlsOptions }
	/** HTTPS is switched on but unusable: the server must stay off. */
	| { mode: 'unavailable'; reason: string };

/**
 * Decides how the web app is served and loads the certificate for HTTPS.
 *
 * @param config - HTTPS part of the instance settings.
 * @param load - Reads certificates from the ioBroker collection.
 */
export async function decideTls(config: TlsConfig, load: CertificateLoader): Promise<TlsDecision> {
	if (config.secure !== true) {
		return { mode: 'http' };
	}
	const publicName = config.certPublic?.trim();
	const privateName = config.certPrivate?.trim();
	if (!publicName || !privateName) {
		return {
			mode: 'unavailable',
			reason: 'HTTPS is switched on, but no public certificate and private key are chosen in the instance settings',
		};
	}
	try {
		const [certificates] = await load(publicName, privateName, config.certChained?.trim() || undefined);
		if (!certificates?.key || !certificates.cert) {
			return {
				mode: 'unavailable',
				reason: `HTTPS is switched on, but the certificate "${publicName}" / "${privateName}" is not in the certificate collection of ioBroker (Admin > Settings > Certificates)`,
			};
		}
		return { mode: 'https', tls: { key: certificates.key, cert: certificates.cert, ca: certificates.ca } };
	} catch (error) {
		return { mode: 'unavailable', reason: `the certificate could not be loaded: ${(error as Error).message}` };
	}
}

/**
 * Creates the HTTP or HTTPS server around the request listener.
 *
 * @param listener - The express app.
 * @param tls - Certificate material; without it the server speaks plain HTTP.
 */
export function createWebServer(listener: RequestListener, tls?: TlsOptions): HttpServer | HttpsServer {
	return tls ? createHttpsServer({ key: tls.key, cert: tls.cert, ca: tls.ca }, listener) : createHttpServer(listener);
}
