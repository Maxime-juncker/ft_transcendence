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
			config:
			{
				rateLimit: rateLimitMed // Need to change to hard
			}
		},
		async (socket: WebSocket, request: FastifyRequest) =>
		{
			const token = request.cookies.jwt_session;
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

			const lobbyId = res.data?.id as string | undefined;
			if (lobbyId)
			{
				socket.on('close', async () =>
				{
					Logger.log(`[tournament/create] socket closed for owner ${data.id}, leaving lobby ${lobbyId}`);
					await tournamentManager.leaveLobby(data.id, lobbyId);
				});
			}
		});
	});

	fastify.register(async function (fastify)
	{
		fastify.get('/join',
		{
			websocket: true,
			schema:
			{
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
			const token = request.cookies.jwt_session;
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

			socket.on('close', async () =>
			{
				Logger.log(`[tournament/join] socket closed for user ${data.id}, leaving lobby ${lobbyId}`);
				await tournamentManager.leaveLobby(data.id, lobbyId);
			});
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
			const authorization = request.headers.authorization as string | undefined;
			if (!authorization || !authorization.startsWith('Bearer '))
			{
				reply.status(400).send({ error: 'missing authorization header' });
				Logger.error("missing authorization header");
				return ;
			}

			const token = authorization.replace('Bearer ', '');
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

	fastify.post('/leave', {
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
	}, async (request: FastifyRequest, reply: FastifyReply) => {
		const authorization = request.headers.authorization as string | undefined;
		if (!authorization || !authorization.startsWith('Bearer '))
			return reply.code(400).send({ message: "missing authorization header" });
		
		const token = authorization.replace('Bearer ', '');
		const { lobbyId } = request.body as { lobbyId: string };
		const data = await jwtVerif(token, core.sessionKey);
		if (!data)
			return reply.code(400).send({ message: "bad token" });

		const res = await tournamentManager.leaveLobby(data.id, lobbyId);
		return reply.code(res.code).send(res.data);
	});

	fastify.get('/list',
	{
		config:
		{
			rateLimit: rateLimitMed
		}
	},
	async (request: FastifyRequest, reply: FastifyReply) =>
	{
		const res = tournamentManager.getActiveTournaments();
		return (reply.code(res.code).send(res.data));
	});
}
