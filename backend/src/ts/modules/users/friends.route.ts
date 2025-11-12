import { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify'
import * as core from '@core/core.js';
import * as friends from '@modules/users/friends.js'

export async function friendsRoutes(fastify: FastifyInstance, options: FastifyPluginOptions)
{

	fastify.delete('/remove/:user1/:user2', async (request: FastifyRequest, reply: FastifyReply) => {
		var { user1, user2 } = request.params as {
			user1: number,
			user2: number
		};

		const res = await friends.removeFriend(user1, user2, core.db);
		return reply.code(res.code).send(res.data);
	})

	fastify.post('/accept/:user1/:user2', async (request: FastifyRequest, reply: FastifyReply) => {
		var { user1, user2 } = request.params as {
			user1: number,
			user2: number
		};

		const res = await friends.acceptFriend(user1, user2, core.db);
		return reply.code(res.code).send(res.data);
	})

	fastify.post('/send_request', async (request:any, reply:any) => {
		var { user_id, friend_name } = request.body as {
			user_id: string,
			friend_name: string
		};

		const res = await friends.addFriend(user_id, friend_name, core.db);
		return reply.code(res.code).send(res.data);
	})

	fastify.get<{ Querystring: { user_id: string } }>
	(
			'/get',
			{
				schema: {
					querystring: {
						type: 'object',
						properties: {
							user_id: { type: 'string' }
						},
						required: ['user_id']
					}
				},
				handler: (request, reply) => {
					return friends.getFriends(request, reply, core.db);
				}
			})
}
