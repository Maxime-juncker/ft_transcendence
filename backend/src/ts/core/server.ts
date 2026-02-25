import { initFastify } from 'core/init.js';
import { Core } from './core.js';
import { ServerSideRendering } from 'modules/ssr/ServerSideRendering.js';
import { GameServer } from 'modules/game/GameServer.js';
import { TournamentServer } from 'modules/tournament/TournamentServer.js';
import { initVault } from 'modules/vault/vault.js';
import { Logger } from 'modules/logger.js';
import { Chat } from 'modules/chat/chat.js';

export interface DbResponse {
	code:	number;
	data:	any;
}

export const rateLimitHard = {
	max: 10,
	timeWindow: '1 minute'
}

export const rateLimitMed = {
	max: 500,
	timeWindow: '1 minute'
}

export const tokenSchema = {
	body: {
		type: "object",
		properties: {
			token: { type: "string" },
		},
		required: [ "token" ]
	}
}

export function getDateFormated()
{
	return new Date(new Date().toLocaleString("en-US", {timeZone: "Europe/Paris"})).toISOString().slice(0, 19).replace('T', ' ');
}

export const core = new Core();
export const chat = new Chat();

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

