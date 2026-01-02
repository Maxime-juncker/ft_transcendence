import { initFastify } from '@core/init.js';
import * as core from '@core/core.js';
import { ServerSideRendering } from '@modules/ssr/ServerSideRendering.js';
import { GameServer } from '@modules/game/GameServer.js';

await core.createServer();
await initFastify();

const routes = [
	"/start.html",
	"/login.html",
	"/lobby.html",
	"/settings.html",
	"/profile.html",
]

new ServerSideRendering(core.fastify, routes);
const gameServer = new GameServer(core.fastify);
await gameServer.init();

// console.log("Fastify routes:")
// console.log(core.fastify.printRoutes());

const signals = ['SIGINT', 'SIGTERM'] as const;
signals.forEach(signal => {
	process.on(signal, async () => {
		console.log(`Received ${signal}, shuting down...`);
		core.shutdown();
	});
});

await core.start()

