/**
 * R9 tests: HTTPS for the web app. The decision (HTTP, HTTPS, unavailable) is made from the instance settings and
 * the ioBroker certificate collection; an unusable certificate never falls back to plain HTTP. A real HTTPS
 * server answers the API with the certificate below.
 *
 * The key pair is a throw-away fixture for these tests only (CN=localhost, self-signed, no other use).
 */
import { expect } from 'chai';
import { get } from 'node:https';
import type { AddressInfo } from 'node:net';
import type { TLSSocket } from 'node:tls';
import { createApiServer } from './api-server';
import { InvoiceDatabase } from './db';
import { createWebServer, decideTls, type CertificateLoader } from './tls';

const KEY = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDEARJ1lmg5B8aN
5P2q+A25qhGpT7dNFi/FUKFyjPj/Br6e8Of9m/OTJeo0/LUVtzVYIww0QqIRz6m8
YOHskS6mpRlgfX2zbZ3JYbIAR1NH6xmUQ2UpamZFbZCHuE0QjBs9dIwz657y/tfc
v4HQc6BQ5t/8DuaL4U3ZCZmhdefyfqg2a4CtN75i9eL7zYJqH0kHXtHqhFCNlksQ
Ww0kPyfX4o2JxEY7kzZ1FC8JqRbEQwy1YOuoxxCYB9znBsafd3tCF4ozPZqbIGb+
TiTRvDPFfCFJWb3X4chGI9I3hEfIQ6ORG5LZk5Pch2EJzJd4wENKBNzaUSJTG0Fz
4IXV/EQBAgMBAAECggEAAf018jvrwsZN0FonGm0C5FjNFFutuz/zuns1PAhBY6+r
JhbOAoGtyuP13/JCvKW3w+INRVEmvuFNg/utxHi4j8QBr8KVELnThQpoKLojxqLu
Kklo9Kut8UvBlxICjk3FfgxUrhDb8HP8zdjpVnVOids+jmRnK2GQUiwUWz2BXe46
h1O4FhTb1miXidx8U2y3l/IPcxx3yvEW6LjkO+O3IboTmGtcUC7Nx7vi8th5y6aV
9nMF9BtQq0JBz42IAPixlE/Prv56371owv8lST1Ye4OYLuS6q4Vi2AWbCAGYN6XM
yEe4zS1+p+fdyOBM6dOMsfo9xDMMffgJHmk2QB2c0QKBgQD4SN2siMu3qeAuinCa
DMeUW4jR8DpWA4bdXc37adX6rwFcfRECqRa+RayNuYoMMx7HnTJMXkvtwuzr+T5S
NWSwbXi33u2eBwYwZr/x/51JMWnDFP5bQUL4WE4+X4sK+fN6+1VKgNi9pt70MNRr
ejs4yUlOgs9q3om3WPadpdHcMQKBgQDKGE8Y7juvA6F/DegnigJtJRnT+VbUEYW5
23x2dkla8qvYCRgeFtJqTd+uYzpAziXUFJpgjtuzVp42aoCYDl6BD2PyQrKQsc4H
azcyI2+DXYse5V+FxOsHVYF0LhtcSPkYKWuV0KfFTB+WgyZCaiVJMc6O/rTer3uo
PEOcb7+A0QKBgQDCvBPxoRF3KiwFFNwgV2mp+OklEDARCo8azNokGOyVw/FjY0yW
M5z8+5TNS/r0epvnoGm08DjJcRt2MXUp8WrZ3eLTBGyGh6fZCp395qisoa78LVka
peMq+cfUsAdUQpsvmDVbTBezGFDCYhIZgjM05Ns0UvDwNz74qTQ0jbw94QKBgCJm
yPAhfZ9pKtCJ+X7hi1AxBJiE1Tb8VJsytZkkwY/txzrbMXPNxru5zd3Nnljxvpa/
exf8uYFpuTziHEnGCGhHymeu2t6upbe1lIvAZHckMU5tFTmcL7Xr5EF2p8mp0l0+
j8XM4wI+1xGz+YtMrlQrWlIVIYzWqmIVAB1dGGhBAoGBALvW9rbwbPBBPwgXaLXk
9wQIoNpv4mrI330jAS9ChiwORrT9od9xl7J19zST7H66Axc26RsNcG0TiaHQKN08
TRUTk3I4dwQnkaXuQUieqAA0wbX8q6WI1XOGoxneJ33mXM9skz4Sy39o//hFw4pV
OVtPU5wQFW7fNmTWZttrJNGD
-----END PRIVATE KEY-----
`;

const CERT = `-----BEGIN CERTIFICATE-----
MIIDJzCCAg+gAwIBAgIUdKVjljrh+HmhgRdvzX8LwEWeoHYwDQYJKoZIhvcNAQEL
BQAwFDESMBAGA1UEAwwJbG9jYWxob3N0MCAXDTI2MTAwNjE0MzMzM1oYDzIxMjYw
OTEyMTQzMzMzWjAUMRIwEAYDVQQDDAlsb2NhbGhvc3QwggEiMA0GCSqGSIb3DQEB
AQUAA4IBDwAwggEKAoIBAQDEARJ1lmg5B8aN5P2q+A25qhGpT7dNFi/FUKFyjPj/
Br6e8Of9m/OTJeo0/LUVtzVYIww0QqIRz6m8YOHskS6mpRlgfX2zbZ3JYbIAR1NH
6xmUQ2UpamZFbZCHuE0QjBs9dIwz657y/tfcv4HQc6BQ5t/8DuaL4U3ZCZmhdefy
fqg2a4CtN75i9eL7zYJqH0kHXtHqhFCNlksQWw0kPyfX4o2JxEY7kzZ1FC8JqRbE
Qwy1YOuoxxCYB9znBsafd3tCF4ozPZqbIGb+TiTRvDPFfCFJWb3X4chGI9I3hEfI
Q6ORG5LZk5Pch2EJzJd4wENKBNzaUSJTG0Fz4IXV/EQBAgMBAAGjbzBtMB0GA1Ud
DgQWBBTcK/E6axoihT8pVM+6uqUcM2xdyTAfBgNVHSMEGDAWgBTcK/E6axoihT8p
VM+6uqUcM2xdyTAPBgNVHRMBAf8EBTADAQH/MBoGA1UdEQQTMBGCCWxvY2FsaG9z
dIcEfwAAATANBgkqhkiG9w0BAQsFAAOCAQEAesOE3S1rOfmXP6lZKQu4RGp12UaF
CswuHeH3zWK1xdoxcNpKkF7eZRjqTkf8FxEuESkHzPGlR2QPcQMOCG08uhALK3e0
yQOfA/9alfLKCBJC6jKPsVBxNjUQdinxWoTm4BW+kzD260gvpZTXJ76L6lM0ibew
iofGbrnYG3jQliCQxYbem+RJLM/rP8cImlDXJDb/skak2/BpNWU6mRgNm/3iDriq
zKN4YceTO8xxg84ZQaEAEkKQ87yjfGjzjYv+s36FskjRShlKs3AePWKfuFXsy/r7
B6rIQaHevgEm8iGNzJ8dLhDBOA5eO+cREPkWvdwP8yWXFqgYyYq62ZWwBw==
-----END CERTIFICATE-----
`;

/**
 * A certificate collection that hands back the given pair for every name.
 *
 * @param found - The key material of the pair, or nothing when the collection does not know it.
 */
function collection(found: { key?: string; cert?: string; ca?: string } | undefined): CertificateLoader {
	return () => Promise.resolve([found]);
}

describe('tls => decision', () => {
	it('serves plain HTTP unless HTTPS is switched on', async () => {
		const loader: CertificateLoader = () => Promise.reject(new Error('must not be asked'));
		expect(await decideTls({}, loader)).to.deep.equal({ mode: 'http' });
		expect(await decideTls({ secure: false, certPublic: 'a', certPrivate: 'b' }, loader)).to.deep.equal({
			mode: 'http',
		});
	});

	it('takes the certificate named in the settings from the collection', async () => {
		const asked: unknown[] = [];
		const decision = await decideTls(
			{ secure: true, certPublic: 'defaultPublic', certPrivate: 'defaultPrivate', certChained: 'chain' },
			(...args) => {
				asked.push(args);
				return Promise.resolve([{ key: KEY, cert: CERT, ca: 'CHAIN' }]);
			},
		);
		expect(decision).to.deep.equal({ mode: 'https', tls: { key: KEY, cert: CERT, ca: 'CHAIN' } });
		expect(asked).to.deep.equal([['defaultPublic', 'defaultPrivate', 'chain']]);
	});

	it('passes no chain when none is chosen', async () => {
		let chain: string | undefined = 'unset';
		await decideTls({ secure: true, certPublic: 'a', certPrivate: 'b', certChained: '  ' }, (_a, _b, c) => {
			chain = c;
			return Promise.resolve([{ key: KEY, cert: CERT }]);
		});
		expect(chain).to.equal(undefined);
	});

	it('keeps the server off — no fallback to HTTP — when the certificate is unusable', async () => {
		const unusable: [string, Parameters<typeof decideTls>[0], CertificateLoader][] = [
			['no names', { secure: true }, collection({ key: KEY, cert: CERT })],
			['only the public name', { secure: true, certPublic: 'a' }, collection({ key: KEY, cert: CERT })],
			['not in the collection', { secure: true, certPublic: 'a', certPrivate: 'b' }, collection(undefined)],
			['without a key', { secure: true, certPublic: 'a', certPrivate: 'b' }, collection({ cert: CERT })],
			['without a certificate', { secure: true, certPublic: 'a', certPrivate: 'b' }, collection({ key: KEY })],
			[
				'the collection fails',
				{ secure: true, certPublic: 'a', certPrivate: 'b' },
				() => Promise.reject(new Error('boom')),
			],
		];
		for (const [label, config, loader] of unusable) {
			const decision = await decideTls(config, loader);
			expect(decision.mode, label).to.equal('unavailable');
		}
		const failed = await decideTls({ secure: true, certPublic: 'a', certPrivate: 'b' }, () =>
			Promise.reject(new Error('boom')),
		);
		expect(failed).to.deep.equal({ mode: 'unavailable', reason: 'the certificate could not be loaded: boom' });
	});
});

describe('tls => HTTPS server', function () {
	this.timeout(30000);

	it('answers the API over HTTPS with the certificate and without HSTS', async () => {
		const db = new InvoiceDatabase(':memory:');
		db.migrate();
		const app = createApiServer({
			db,
			storage: { write: () => Promise.resolve(), read: () => Promise.reject(new Error('empty')) },
			log: { info: (): void => undefined, error: (): void => undefined },
			version: 'x',
		});
		const server = createWebServer(app, { key: KEY, cert: CERT });
		await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
		try {
			const port = (server.address() as AddressInfo).port;
			// the fixture is self-signed: trusting it by name is the part of the test that stands for "the phone
			// trusts the certificate"
			const answer = await new Promise<{ status: number; body: string; hsts: string | undefined; peer: string }>(
				(resolve, reject) => {
					const req = get(
						{ host: '127.0.0.1', port, path: '/api/health', ca: CERT, servername: 'localhost' },
						res => {
							// read the peer while the socket is still there; it is gone after 'end'
							const peer = String((res.socket as TLSSocket).getPeerCertificate().subject.CN);
							let body = '';
							res.on('data', chunk => (body += chunk));
							res.on('end', () =>
								resolve({
									status: res.statusCode ?? 0,
									body,
									hsts: res.headers['strict-transport-security'],
									peer,
								}),
							);
						},
					);
					req.on('error', reject);
				},
			);
			expect(answer.status).to.equal(200);
			expect(JSON.parse(answer.body).ok ?? true).to.not.equal(false);
			expect(answer.peer).to.equal('localhost');
			expect(answer.hsts).to.equal(undefined);
		} finally {
			server.close();
			db.close();
		}
	});

	it('speaks plain HTTP without a certificate', async () => {
		const server = createWebServer((_req, res) => res.end('x'));
		await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
		try {
			const port = (server.address() as AddressInfo).port;
			const body = await fetch(`http://127.0.0.1:${port}/`).then(r => r.text());
			expect(body).to.equal('x');
		} finally {
			server.close();
		}
	});
});
