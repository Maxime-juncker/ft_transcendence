import { core, chat, rateLimitMed } from 'core/server.js';
import { FastifyRequest, FastifyReply, FastifyInstance, FastifyPluginOptions } from 'fastify';
import { getUserById, getUserByName, getBlockUser } from 'modules/users/user.js';
import { jwtVerif } from 'modules/jwt/jwt.js';
import { Logger } from 'modules/logger.js';

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
		}, (connection, request) => {
			chat.chatSocket(connection, request);
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
			body: {
				type: "object",
				properties: {
					token: { type: "string" }
				},
				required: ["token"]
			}
		}
	},
	async (request: FastifyRequest, reply: FastifyReply) => {
		const { token } = request.body as { token: string };

		const data: any = await jwtVerif(token, core.sessionKey);
		if (!data)
			return reply.code(400).send({ message: "invalid token" });
		
		chat.HealthCallback(data.id);

		return reply.code(200).send({ message: "Success" });
	});

	fastify.delete('/api/chat/removeQueue', {
		config: { 
			rateLimit: rateLimitMed
		},
		schema: {
			body: {
				type: "object",
				properties: {
					token: { type: "string" }
				},
				required: ["token"],
			}
		}
	}, async (request: FastifyRequest, reply: FastifyReply) => {
		const { token } = request.body as { token: string };

		const data: any = await jwtVerif(token, core.sessionKey);
		if (!data)
			return reply.code(400).send({ message: "invalid token" });

		chat.removePlayerFromQueue(data.id);
		return reply.code(200).send({ message: "removed" });
	});

	fastify.post('/api/chat/dm', {
		config: { 
			rateLimit: rateLimitMed
		},
		schema: {
			body: {
				type: "object",
				properties: {
					token: { type: "string" },
					username: { type: "string" },
					msg: { type: "string" }
				},
				required: ["token", "username", "msg"],
			}
		}
	}, async (request: FastifyRequest, reply: FastifyReply) => {
		const { token, username, msg } = request.body as {
			token: string,
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
			body: {
				type: 'object',
				properties: {
					token: { type: 'string' },
				},
				required: [ 'token' ]
			}
		}
	},
	async (request: FastifyRequest, reply: FastifyReply) => {
			const { token } = request.body as { token: string }
			const data: any = await jwtVerif(token, core.sessionKey);
			if (!data)
				return reply.code(400).send({ message: "invalid token"});

			const invites = chat.listInvites(data.id);
			return reply.code(200).send(invites);
		})

	fastify.post('/api/chat/invite', {
		schema: {
			body: {
				type: 'object',
				properties: {
					token:		{ type: 'string' },
					lobbyId:	{ type: 'string' },
					userId:		{ type: 'number' }
				},
				required: [ 'token', 'lobbyId', 'userId' ]
			}
		}
	},
	async (request: FastifyRequest, reply: FastifyReply) => {
			const { token, lobbyId, userId } = request.body as { token: string, lobbyId: string, userId: number };
			const data: any = await jwtVerif(token, core.sessionKey);
			if (!data)
				return reply.code(400).send({ message: "invalid token"});

			const res = await chat.invite(data.id, userId, lobbyId);
			return reply.code(res.code).send(res.data);
		})

	fastify.post('/api/chat/accept', {
		schema: {
			body: {
				type: 'object',
				properties: {
					token:	{ type: 'string' },
					userId:	{ type: 'number' },
				},
				required: [ 'token', 'userId' ]
			}
		}
	},
	async (request: FastifyRequest, reply: FastifyReply) => {
			const { token, userId } = request.body as { token: string, userId: number };
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
			body: {
				type: 'object',
				properties: {
					token:	{ type: 'string' },
					userId:	{ type: 'number' },
				},
				required: [ 'token', 'userId' ]
			}
		}
	},
	async (request: FastifyRequest, reply: FastifyReply) => {
			const { token, userId } = request.body as { token: string, userId: number };
			const data: any = await jwtVerif(token, core.sessionKey);
			if (!data)
				return reply.code(400).send({ message: "invalid token"});

			const success = await chat.declineInvite(data.id, userId);
			if (success == false)
				return reply.code(404).send({ message: "invite not found" });
			return reply.code(200).send({ message: "Success" });
		})

}
