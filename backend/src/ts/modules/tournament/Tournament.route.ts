import { core, chat, tournamentManager, rateLimitMed } from 'core/server.js';
import { FastifyRequest, FastifyReply, FastifyInstance, FastifyPluginOptions } from 'fastify';
import { jwtVerif } from 'modules/jwt/jwt.js';
import { Logger } from 'modules/logger.js';
import type WebSocket from 'ws'; // comes from @types/ws

export async function tournamentRoutes(fastify: FastifyInstance)
{

	fastify.register(async function (fastify) {
		fastify.get('/create', {
			websocket: true,
		}, async (socket: WebSocket, request: FastifyRequest) => {
			const { token } = request.query as { token: string };
			if (!token)
			{
				socket.send(JSON.stringify({ error: 'missing token param' }));
				socket.close(1008, 'missing token param');
				Logger.error("missing token");
				return;
			}
			const data = await jwtVerif(token, core.sessionKey);
			if (!data)
			{
				socket.send(JSON.stringify({ error: 'bad token' }));
				socket.close(1008, 'bad token');
				Logger.error("bad token");
				return;
			}

			const res = await tournamentManager.createLobby(data.id, socket);
		});
	});
}
