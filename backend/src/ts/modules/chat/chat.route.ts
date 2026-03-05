import { core, chat, rateLimitMed, tournamentManager, getToken, tokenHeader } from 'core/server.js';
import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { getUserById, getUserByName, getBlockUser } from 'modules/users/user.js';
import { jwtVerif } from 'modules/jwt/jwt.js';
import { Logger } from 'modules/logger.js';
import type WebSocket from 'ws';

export const InviteSchema = {
	body: {
		type: "object",
		properties: {
			token: { type: "string" },

		},
		required: [ "token" ]
	}
}

export async function chatRoutes(fastify: FastifyInstance)
{

	fastify.register(async function (fastify) {
		fastify.get('/api/chat', {
			websocket: true,
			config: { 
				rateLimit: rateLimitMed
			},
		}, (socket: WebSocket, request: FastifyRequest) => {
			const token = request.cookies.jwt_session;
			if (!token)
			{
				socket.send(JSON.stringify({ error: 'missing token bearer' }));
				socket.close(1008, 'missing token bearer');
				return;
			}
			chat.chatSocket(socket, token);
		});
	});

	fastify.get('/api/chat/ping', {
		config: { 
			rateLimit: rateLimitMed
		},
	}, (request: FastifyRequest, reply: FastifyReply) => {
		void request;
		return reply.code(200).send({ message: "pong" });
	});

	fastify.post('/api/chat/healthCallback', {
		config: { 
			rateLimit: rateLimitMed
		},
		schema: {
			headers: tokenHeader
		}
	},
	async (request: FastifyRequest, reply: FastifyReply) => {
		const token = getToken(request.headers.authorization as string);
		if (!token)
			return reply.status(400).send({ error: 'missing authorization header' });

		const data: any = await jwtVerif(token, core.sessionKey);
		if (!data)
			return reply.code(400).send({ message: "invalid token" });
		
		chat.HealthCallback(data.id);

		return reply.code(200).send({ message: "Success" });
	});

	fastify.delete('/api/chat/removeQueue', {
		schema: {
			headers: tokenHeader
		}
	}, async (request: FastifyRequest, reply: FastifyReply) => {
		const token = getToken(request.headers.authorization as string);
		if (!token)
			return reply.status(400).send({ error: 'missing authorization header' });

		const data: any = await jwtVerif(token, core.sessionKey);
		if (!data)
			return reply.code(400).send({ message: "invalid token" });

		tournamentManager.leaveLobby(data.id, "0");
		return reply.code(200).send({ message: "removed" });
	});

	fastify.post('/api/chat/dm', {
		config: { 
			rateLimit: rateLimitMed
		},
		schema: {
			headers: tokenHeader,
			body: {
				type: "object",
				properties: {
					username: { type: "string" },
					msg: { type: "string" }
				},
				required: [ "username", "msg"],
			}
		}
	}, async (request: FastifyRequest, reply: FastifyReply) => {
		const token = getToken(request.headers.authorization as string);
		if (!token)
			return reply.status(400).send({ error: 'missing authorization header' });

		const { username, msg } = request.body as {
			username: string,
			msg: string
		};

		const data: any = await jwtVerif(token, core.sessionKey);
		if (!data)
			return reply.code(400).send({ message: "invalid token" });

		const senderRes = await getUserById(data.id, core.db);
		if (senderRes.code != 200)
			return reply.code(senderRes.code).send(senderRes.data);

		const res = await getUserByName(username, core.db);
		if (res.code != 200)
			return reply.code(404).send({ message: "user does not exist" });

		const isBlock = await getBlockUser(data.id, res.data.id);
		if (isBlock.code == 200) // user is blocked
		{
			return reply.code(200).send({ message: "Success" });
		}

		var success = false;
		for (var [key, value] of chat.connections)
		{
			if (value == res.data.id)
			{
				const result = JSON.stringify({ username: senderRes.data.name, message: `[dm] -> ${msg}` });
				key.send(result);
				success = true;
			}
		}

		if (success)
			return reply.code(200).send({ message: "Success" });
		return reply.code(200).send({ message: "user is offline" });
	});

	fastify.post('/api/chat/list', {
		schema: {
			headers: tokenHeader
		}
	},
	async (request: FastifyRequest, reply: FastifyReply) => {
			const token = getToken(request.headers.authorization as string);
			if (!token)
				return reply.status(400).send({ error: 'missing authorization header' });

			const data: any = await jwtVerif(token, core.sessionKey);
			if (!data)
				return reply.code(400).send({ message: "invalid token"});

			const invites = chat.listInvites(data.id);
			return reply.code(200).send(invites);
		})

	fastify.post('/api/chat/invite', {
		schema: {
			headers: tokenHeader,
			body: {
				type: 'object',
				properties: {
					lobbyId:	{ type: 'string' },
					userId:		{ type: 'number' }
				},
				required: [ 'lobbyId', 'userId' ]
			}
		}
	},
	async (request: FastifyRequest, reply: FastifyReply) => {
			const token = getToken(request.headers.authorization as string);
			if (!token)
				return reply.status(400).send({ error: 'missing authorization header' });

			const { lobbyId, userId } = request.body as { lobbyId: string, userId: number };
			const data: any = await jwtVerif(token, core.sessionKey);
			if (!data)
				return reply.code(400).send({ message: "invalid token"});

			const res = await chat.invite(data.id, userId, lobbyId);
			return reply.code(res.code).send(res.data);
		})

	fastify.post('/api/chat/accept', {
		schema: {
			headers: tokenHeader,
			body: {
				type: 'object',
				properties: {
					userId:	{ type: 'number' },
				},
				required: [ 'userId' ]
			}
		}
	},
	async (request: FastifyRequest, reply: FastifyReply) => {
			const token = getToken(request.headers.authorization as string);
			if (!token)
				return reply.status(400).send({ error: 'missing authorization header' });

			const { userId } = request.body as { userId: number };
			const data: any = await jwtVerif(token, core.sessionKey);
			if (!data)
				return reply.code(400).send({ message: "invalid token"});

			const id = await chat.acceptInvite(data.id, userId);
			if (id == "")
				return reply.code(404).send({ message: "invite not found" });
			return reply.code(200).send({ lobbyId: id });
		})

	fastify.post('/api/chat/decline', {
		schema: {
			header: tokenHeader,
			body: {
				type: 'object',
				properties: {
					userId:	{ type: 'number' },
				},
				required: [ 'userId' ]
			}
		}
	},
	async (request: FastifyRequest, reply: FastifyReply) => {
			const token = getToken(request.headers.authorization as string);
			if (!token)
				return reply.status(400).send({ error: 'missing authorization header' });
			const { userId } = request.body as { userId: number };
			const data: any = await jwtVerif(token, core.sessionKey);
			if (!data)
				return reply.code(400).send({ message: "invalid token"});

			const success = await chat.declineInvite(data.id, userId);
			if (success == false)
				return reply.code(404).send({ message: "invite not found" });
			return reply.code(200).send({ message: "Success" });
		})

}
