import * as core from '@core/core.js';
import { FastifyRequest, FastifyReply, FastifyInstance, FastifyPluginOptions } from 'fastify';
import * as chat from '@modules/chat/chat.js';
import { getUserByName } from '@modules/users/user.js';

export async function chatRoutes(fastify: FastifyInstance, options: FastifyPluginOptions)
{

	fastify.register(async function (fastify) {
		fastify.get('/api/chat', { websocket: true }, (connection, request) => {
			chat.chatSocket(connection, request);
		});
	});

	fastify.post('/api/chat/dm', async (request: FastifyRequest, reply: FastifyReply) => {
		const { login, username, msg } = request.body as {
			login: string,
			username: string,
			msg: string
		};

		const res = await getUserByName(username, core.db);
		if (res.code != 200)
			return reply.code(404).send({ message: "user does not exist" });

		console.log(res.data);

		for (var [key, value] of chat.connections)
		{
			if (value == res.data.id)
			{
				const result = JSON.stringify({ username: login, message: `[dm] -> ${msg}` });
				key.send(result);
				return reply.code(200).send({ message: "Success" });
			}
		}

		return reply.code(200).send({ message: "user is offline" });
	})

}
