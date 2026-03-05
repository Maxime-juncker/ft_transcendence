import { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify'
import { core, tokenHeader, getToken } from 'core/server.js';
import * as friends from 'modules/users/friends.js'
import { jwtVerif } from 'modules/jwt/jwt.js';

export async function friendsRoutes(fastify: FastifyInstance, options: FastifyPluginOptions)
{

	fastify.delete('/remove', {
		schema: {
			headers: tokenHeader,
			body: {
				type: 'object',
				properties: {
					friend_id: { type: 'number' }
				},
				required: ['friend_id']
			}
		}
	}, async (request: FastifyRequest, reply: FastifyReply) => {
		const token = getToken(request.headers.authorization as string);
		if (!token)
			return reply.status(400).send({ error: 'missing authorization header' });

		const { friend_id } = request.body as { friend_id: number }
		const data: any = await jwtVerif(token, core.sessionKey);
		if (!data)
			return reply.code(400).send('token is invalid');

		const res = await friends.removeFriend(data.id, friend_id, core.db);
		return reply.code(res.code).send(res.data);
	})

	fastify.post('/accept', {
		schema: {
			headers: tokenHeader,
			body: {
				type: 'object',
				properties: {
					friend_id: { type: 'number' }
				},
				required: ['friend_id']
			}
		}
	}, async (request: FastifyRequest, reply: FastifyReply) => {
		const token = getToken(request.headers.authorization as string);
		if (!token)
			return reply.status(400).send({ error: 'missing authorization header' });
		const { friend_id } = request.body as { friend_id: number }
		const data: any = await jwtVerif(token, core.sessionKey);
		if (!data)
			return reply.code(400).send('token is invalid');

		const res = await friends.acceptFriend(data.id, friend_id, core.db);
		return reply.code(res.code).send(res.data);
	})

	fastify.post('/send_request', {
		schema: {
			headers: tokenHeader,
			body: {
				type: 'object',
				properties: {
					friend_id: { type: 'number' }
				},
				required: ['friend_id']
			}
		}
	}, async (request: FastifyRequest, reply: FastifyReply) => {
		const token = getToken(request.headers.authorization as string);
		if (!token)
			return reply.status(400).send({ error: 'missing authorization header' });
		const { friend_id } = request.body as { friend_id: number }
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
