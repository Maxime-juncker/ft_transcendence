import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import * as core from 'core/core.js';
import * as user from 'modules/users/user.js'
import { GameRes } from 'modules/users/user.js';
import { jwtVerif } from 'modules/jwt/jwt.js';
import * as mgmt from 'modules/users/userManagment.js';

export async function userRoutes(fastify: FastifyInstance)
{
	fastify.get('/get_history_name/:username', {
		config: {
			rateLimit: core.rateLimitMed,
		}
	}, async (request: FastifyRequest, reply: FastifyReply) => {
		return await user.getUserHistByName(request, reply, core.db);
	})

	fastify.post('/blocked_users', {
		schema: {
			body: {
				type: 'object',
				required: ['token'],
				properties: {
					token: { type: 'string' },
				}
			}
		}
	}, async (request: FastifyRequest, reply: FastifyReply) => {
			const { token } = request.body as { token: string };
			const data: any = await jwtVerif(token, core.sessionKey);
			if (!data)
				return reply.code(400).send({ message: "token is invalid" });

			const res = await user.getBlockedUsrById(data.id, core.db);
			return reply.code(res.code).send(res.data);
		})

	fastify.post('/add_game', {
		schema: {
			body: {
				type: "object",
				properties: {
					user1_id: { type: "number" },
					user2_id: { type: "number" },
					user1_score: { type: "number" },
					user2_score: { type: "number" },
				},
				required: ["user1_id", "user2_id", "user1_score", "user2_score"]
			}
		}
	}, async (request: FastifyRequest, reply: FastifyReply) => {
			const { user1_id, user2_id, user1_score, user2_score } = request.body as {
				user1_id:		number,
				user2_id:		number,
				user1_score:	number,
				user2_score:	number,
			};

			var game: GameRes = { user1_id, user2_id, user1_score, user2_score };
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

		fastify.post('/get_profile_token', {
			config: { 
				rateLimit: core.rateLimitMed
			},
			schema: {
				body: {
					type: 'object',
					required: ['token'],
					properties: {
						token: { type: 'string' },
					}
				}
			}
		}, async (request: FastifyRequest, reply: FastifyReply) => {
			const { token } = request.body as { token: string};

			const res = await mgmt.loginSession(token);
			if (res.code != 200)
				return reply.code(res.code).send(res.data);
			return reply.code(res.code).send(res.data);
		})

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

	fastify.get('/get_all', {
			schema: {
				querystring: {
					type: 'object',
					properties: {
						page_size: { type: 'number' }
					}
				}
		}
	}, async (request: FastifyRequest, reply: FastifyReply) => {
			const { page_size } = request.query as { page_size: number };

			const res = await user.getAllUsers(page_size);
			return reply.code(res.code).send(res.data);
		});

	fastify.get('/get_all_id', {
			schema: {
				querystring: {
					type: 'object',
					properties: {
						page_size: { type: 'number' }
					}
				}
		}
	}, async (request: FastifyRequest, reply: FastifyReply) => {
			const { page_size } = request.query as { page_size: number };

			const res = await user.getAllUsers(page_size);
			return reply.code(res.code).send(res.data);
		});

	fastify.get('/search', {
			schema: {
				querystring: {
					type: 'object',
					properties: {
						name: { type: 'string' },
						page_size: { type: 'number' }
					},
					required: ["name"]
				}
		}
	}, async (request: FastifyRequest, reply: FastifyReply) => {
			const { name, page_size } = request.query as { name: string, page_size: number };

			const res = await user.searchUser(name, page_size);
			return reply.code(res.code).send(res.data);
		});

	fastify.get('/get_best_elo', {
			schema: {
				querystring: {
					type: 'object',
					properties: {
						page_size: { type: 'number' }
					}
				}
		}
	}, async (request: FastifyRequest, reply: FastifyReply) => {
			const { page_size } = request.query as { page_size: number };

			const res = await user.getHighestEloUsers(page_size);
			return reply.code(res.code).send(res.data);
		});

	fastify.post('/complete_tutorial', {
		schema: {
			body: {
				type: "object",
				properties: {
					token: { type: "string" }
				},
				required: ["token"]
			}
		}
	}, async (request: FastifyRequest, reply: FastifyReply) => {
			const { token } = request.body as { token: string };
			const data: any = await jwtVerif(token, core.sessionKey);
			if (!data)
				return reply.code(400).send({ message: "invalid token" });
			const res = await user.completeTutorial(data.id);
			return reply.code(res.code).send(res.data);
		})
}
