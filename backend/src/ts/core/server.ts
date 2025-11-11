import { initFastify } from '@core/init.js';
import * as core from '@core/core.js';

await core.createServer();
await initFastify();

const signals = ['SIGINT', 'SIGTERM'] as const;
signals.forEach(signal => {
	process.on(signal, async () => {
		console.log(`Received ${signal}, shuting down...`);
		core.shutdown();
	});
});

await core.start()

