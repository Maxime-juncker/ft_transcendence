import { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify';
import * as core from '@core/core.js';
import * as user from '@modules/users/user.js'

export async function userRoutes(fastify: FastifyInstance, options: FastifyPluginOptions)
{

	fastify.get('/get_history_name/:username', async (request: FastifyRequest, reply: FastifyReply) => {
		return await user.getUserHistByName(request, reply, core.db);
	})

	fastify.get('/get_blocked_users/:userid', async (request: FastifyRequest, reply: FastifyReply) => {
		const { userid } = request.params as { userid: number };

		const res = await user.getBlockedUsrById(userid, core.db);
		return reply.code(res.code).send(res.data);
	})

	fastify.post('/add_game_history', async (request: FastifyRequest, reply: FastifyReply) => {
		const { user1_name, user2_name, user1_score, user2_score } = request.body as {
			user1_name:		string,
			user2_name:		string,
			user1_score:	number,
			user2_score:	number,
		};
		var game = { user1_name, user2_name, user1_score, user2_score };

		const res = await user.addGameToHist(game, core.db);
		return reply.code(res.code).send(res.data);
	})

	fastify.get<{ Querystring: { user_id: number } }>
		(
			'/get_profile_id',
			{
				schema: {
					querystring: {
						type: 'object',
						properties: {
							user_id: { type: 'number' }
						},
						required: ['user_id']
					}
				},
				handler: async (request, reply) => {
					const { user_id } = request.query as { user_id: number };
					const res = await user.getUserById(user_id, core.db);
					return reply.code(res.code).send(res.data);
				}
			}
		)

	fastify.get<{ Querystring: { profile_name: string } }>
		(
			'/get_profile_name',
			{
				schema: {
					querystring: {
						type: 'object',
						properties: {
							profile_name: { type: 'string' }
						},
						required: ['profile_name']
					}
				},
				handler: async (request, reply) => {
					const { profile_name }  = request.query as { profile_name: string };
					const response = await user.getUserByName(profile_name, core.db);
					return reply.code(response.code).send(response.data);
				}
			}
		)
}
