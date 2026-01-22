import * as core from 'core/core.js';
import { FastifyRequest, FastifyReply, FastifyInstance, FastifyPluginOptions } from 'fastify';
import * as chat from 'modules/chat/chat.js';
import { getUserById, getUserByName } from 'modules/users/user.js';
import { jwtVerif } from 'modules/jwt/jwt.js';
import { Logger } from 'modules/logger.js';

export async function chatRoutes(fastify: FastifyInstance)
{

	fastify.register(async function (fastify) {
		fastify.get('/api/chat', {
			websocket: true,
			config: { 
				rateLimit: core.rateLimitMed
			},
		}, (connection, request) => {
			chat.chatSocket(connection, request);
		});
	});

	fastify.get('/api/chat/ping', {
		config: { 
			rateLimit: core.rateLimitMed
		},
	}, (request: FastifyRequest, reply: FastifyReply) => {
		void request;
		return reply.code(200).send({ message: "pong" });
	});

	fastify.post('/api/chat/healthCallback', {
		config: { 
			rateLimit: core.rateLimitMed
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
			rateLimit: core.rateLimitMed
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
			rateLimit: core.rateLimitMed
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

		Logger.log(res.data);

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
}
