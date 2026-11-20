/**
 * Compact mode: several adapters share one process, so a stopped instance must leave nothing running —
 * no open connection that still answers, no interval of the rate limiters.
 */
import { expect } from 'chai';
import { MemoryStore } from 'express-rate-limit';
import { request as httpRequest, Agent } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createApiServer, releaseApiServer } from './api-server';
import { InvoiceDatabase } from './db';
import { createWebServer, stopWebServer } from './tls';

const quiet = { info: (): void => undefined, error: (): void => undefined };
const storage = {
	write: (): Promise<void> => Promise.resolve(),
	read: (): Promise<Buffer> => Promise.reject(new Error('missing')),
};

describe('compact mode => stopping leaves nothing behind', () => {
	let db: InvoiceDatabase;
	beforeEach(() => {
		db = new InvoiceDatabase(':memory:');
		db.migrate();
	});
	afterEach(() => db.close());

	it('closes the connections the web app keeps alive, not only the listener', async () => {
		const server = createWebServer(createApiServer({ db, storage, log: quiet, version: 'test' }));
		await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
		const port = (server.address() as AddressInfo).port;
		const agent = new Agent({ keepAlive: true });
		let socketClosed = false;
		await new Promise<void>((resolve, reject) => {
			const req = httpRequest({ host: '127.0.0.1', port, path: '/api/health', agent }, res => {
				res.resume();
				res.on('end', resolve);
			});
			req.on('socket', socket => socket.on('close', () => (socketClosed = true)));
			req.on('error', reject);
			req.end();
		});
		// the request is done, the connection stays open for the next one
		expect(socketClosed).to.equal(false);

		stopWebServer(server);
		await new Promise(resolve => setImmediate(resolve));
		await new Promise(resolve => globalThis.setTimeout(resolve, 50));
		expect(socketClosed).to.equal(true);
		expect(server.listening).to.equal(false);
		agent.destroy();
	});

	it('stops the clean-up intervals of the rate limiters', () => {
		const original = MemoryStore.prototype.shutdown;
		let stopped = 0;
		MemoryStore.prototype.shutdown = function (this: MemoryStore): void {
			stopped++;
			original.call(this);
		};
		try {
			const app = createApiServer({ db, storage, log: quiet, version: 'test' });
			releaseApiServer(app);
			// two limiters: the whole API and the restore route
			expect(stopped).to.equal(2);
			// a second release does nothing
			releaseApiServer(app);
			expect(stopped).to.equal(2);
		} finally {
			MemoryStore.prototype.shutdown = original;
		}
	});
});
