import { core, chat, tournamentManager, rateLimitMed, rateLimitHard } from 'core/server.js';
import { FastifyRequest, FastifyReply, FastifyInstance, FastifyPluginOptions } from 'fastify';
import { jwtVerif } from 'modules/jwt/jwt.js';
import { Logger } from 'modules/logger.js';
import type WebSocket from 'ws'; // comes from @types/ws

export async function tournamentRoutes(fastify: FastifyInstance)
{
	fastify.register(async function (fastify)
	{
		fastify.get('/create',
		{
			websocket: true,
			schema:
			{
				headers:
				{
					type: "object",
					properties:
					{
						authorization: { type: "string" }
					},
					required: ["authorization"]
				},
			},
			config:
			{
				rateLimit: rateLimitHard
			}
		},
		async (socket: WebSocket, request: FastifyRequest) =>
		{
			const { token } = request.headers as { token: string };
			if (!token)
			{
				socket.send(JSON.stringify({ error: 'missing token param' }));
				socket.close(1008, 'missing token param');
				Logger.error("missing token");
				return ;
			}

			const data = await jwtVerif(token, core.sessionKey);
			if (!data)
			{
				socket.send(JSON.stringify({ error: 'bad token' }));
				socket.close(1008, 'bad token');
				Logger.error("bad token");
				return ;
			}

			const res = await tournamentManager.createLobby(data.id, socket);
		});
	});

	fastify.register(async function (fastify)
	{
		fastify.get('/join',
		{
			websocket: true,
			schema:
			{
				headers:
				{
					type: "object",
					properties:
					{
						authorization: { type: "string" }
					},
					required: ["authorization"]
				},
				querystring:
				{
					type: "object",
					properties:
					{
						lobbyId: { type: "string" },
					},
					required: ["lobbyId"]
				}
			},
			config:
			{
				rateLimit: rateLimitMed
			}
		},
		async (socket: WebSocket, request: FastifyRequest) =>
		{
			const { token } = request.headers as { token: string };
			if (!token)
			{
				socket.send(JSON.stringify({ error: 'missing token param' }));
				socket.close(1008, 'missing token param');
				Logger.error("missing token");
				return ;
			}

			const data = await jwtVerif(token, core.sessionKey);
			if (!data)
			{
				socket.send(JSON.stringify({ error: 'bad token' }));
				socket.close(1008, 'bad token');
				Logger.error("bad token");
				return ;
			}

			const { lobbyId } = request.query as { lobbyId: string };

			const res = await tournamentManager.addPlayerToLobby(data.id, socket, lobbyId);
		});
	});

	fastify.register(async function (fastify)
	{
		fastify.post('/start',
		{
			schema:
			{
				headers:
				{
					type: "object",
					properties:
					{
						authorization: { type: "string" }
					},
					required: ["authorization"]
				},
				body:
				{
					type: "object",
					properties:
					{
						lobbyId: { type: "string" },
					},
					required: ["lobbyId"]
				}
			},
			config:
			{
				rateLimit: rateLimitHard
			},
		},
		async (request: FastifyRequest, reply: FastifyReply) =>
		{
			const { token } = request.headers as { token: string };
			if (!token)
			{
				reply.status(400).send({ error: 'missing token param' });
				Logger.error("missing token");
				return ;
			}

			const data = await jwtVerif(token, core.sessionKey);
			if (!data)
			{
				reply.status(401).send({ error: 'bad token' });
				Logger.error("bad token");
				return ;
			}

			const { lobbyId } = request.body as { lobbyId: string };
			const res = await tournamentManager.startLobby(data.id, lobbyId);
		});
	});
}
