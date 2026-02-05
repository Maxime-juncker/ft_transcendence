import { initFastify } from 'core/init.js';
import * as core from 'core/core.js';
import { ServerSideRendering } from 'modules/ssr/ServerSideRendering.js';
import { GameServer } from 'modules/game/GameServer.js';
import { TournamentServer } from 'modules/tournament/TournamentServer.js';
import { initVault } from 'modules/vault/vault.js';
import { Logger } from 'modules/logger.js';

await initVault();
await core.createServer();
await initFastify();

const routes = [
	"/start.html",
	"/login.html",
	"/lobby.html",
	"/settings.html",
	"/profile.html",
	"/search.html",
	"/about.html",
	"/404.html",
]

new ServerSideRendering(core.fastify, routes);
const gameServer = new GameServer(core.fastify);
await gameServer.init();
const tournamentServer = new TournamentServer(core.fastify);
tournamentServer.setActiveGamesMap(gameServer.activeGames);
await tournamentServer.init();

const signals = ['SIGINT', 'SIGTERM'] as const;
signals.forEach(signal => {
	process.on(signal, async () => {
		Logger.log(`Received ${signal}, shuting down...`);
		core.shutdown();
	});
});

await core.start();

