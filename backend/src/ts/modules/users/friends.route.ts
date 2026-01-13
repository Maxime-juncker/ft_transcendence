import { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify'
import * as core from '@core/core.js';
import * as friends from '@modules/users/friends.js'
import { jwtVerif } from '@modules/jwt/jwt.js';

export async function friendsRoutes(fastify: FastifyInstance, options: FastifyPluginOptions)
{

	fastify.delete('/remove', {
		schema: {
			body: {
				type: 'object',
				properties: {
					token: { type: 'string' },
					friend_id: { type: 'number' }
				},
				required: ['token', 'friend_id']
			}
		}
	}, async (request: FastifyRequest, reply: FastifyReply) => {
		const { token, friend_id } = request.body as { token: string, friend_id: number }
		const data: any = await jwtVerif(token, core.sessionKey);
		if (!data)
			return reply.code(400).send('token is invalid');

		const res = await friends.removeFriend(data.id, friend_id, core.db);
		return reply.code(res.code).send(res.data);
	})

	fastify.post('/accept', {
		schema: {
			body: {
				type: 'object',
				properties: {
					token: { type: 'string' },
					friend_id: { type: 'number' }
				},
				required: ['token', 'friend_id']
			}
		}
	}, async (request: FastifyRequest, reply: FastifyReply) => {
		const { token, friend_id } = request.body as { token: string, friend_id: number }
		const data: any = await jwtVerif(token, core.sessionKey);
		if (!data)
			return reply.code(400).send('token is invalid');

		const res = await friends.acceptFriend(data.id, friend_id, core.db);
		return reply.code(res.code).send(res.data);
	})

	fastify.post('/send_request', {
		schema: {
			body: {
				type: 'object',
				properties: {
					token: { type: 'string' },
					friend_id: { type: 'number' }
				},
				required: ['token', 'friend_id']
			}
		}
	}, async (request:any, reply:any) => {
		const { token, friend_id } = request.body as { token: string, friend_id: number }
		const data: any = await jwtVerif(token, core.sessionKey);
		if (!data)
			return reply.code(400).send('token is invalid');

		const res = await friends.addFriend(data.id, friend_id, core.db);
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
