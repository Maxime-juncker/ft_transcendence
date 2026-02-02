import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { core, chat, rateLimitMed, rateLimitHard } from 'core/server.js';
import * as mgmt from 'modules/users/userManagment.js';
import * as jwt from 'modules/jwt/jwt.js';
import { Logger } from 'modules/logger.js';

//
// User managment
//
export async function userManagmentRoutes(fastify: FastifyInstance)
{
	fastify.get('/get_session', { config: { rateLimit: rateLimitMed } }, async (request: FastifyRequest, reply) => {
		const token = request.cookies.jwt_session;
		if (token)
		{
			const res = await mgmt.loginSession(token);
			if (res.code != 200)
				return reply.code(res.code).send(res.data);
			return reply.code(res.code).send(res.data);
		}
		else
		{
			return reply.code(404).send({ message: "user need to login" });
		}
	})

	fastify.post('/create_guest', {
		config: { 
			rateLimit: rateLimitMed
		},
	},
	async (request: any, reply: FastifyReply) => {
		void request;

		const res = await mgmt.createGuest();
		if (res.code == 200)
		{
			const token = await jwt.jwtCreate({ id: res.data.id }, core.sessionKey);
			return reply.code(200).send({ token: token });
		}

		return reply.code(res.code).send(res.data);
	})

	fastify.post('/create', {
		schema: {
			body: {
				type: "object",
				properties: {
					email: { type: "string" },
					passw: { type: "string" },
					username: { type: "string" },
				},
				required: ["email", "passw", "username"]
			}
		}

	}, async (request: any, reply: any) => {
		const { email, passw, username } = request.body as {
			email: string,
			passw: string,
			username: string
		};
		const res = await mgmt.createUser(email, passw, username, 0, core.db);
		if (res.code != 200)
			return reply.code(res.code).send(res.data);

		const token = await jwt.jwtCreate({ id: res.data.id }, core.sessionKey);
		return reply.code(res.code).send({ token: token });
	})

	fastify.post('/login', {
		schema: {
			body: {
				type: "object",
				properties: {
					email: { type: "string" },
					passw: { type: "string" },
					totp: { type: "string" },
				}
			}
		}
	}, async (request: any, reply: FastifyReply) => {
		const { email, passw, totp } = request.body as { email: string, passw: string, totp: string };
		const res = await mgmt.login(email, passw, totp);
		if (res.code == 200)
		{
			const token = await jwt.jwtCreate({ id: res.data.id }, core.sessionKey);
			Logger.log("creating new token:", token);
			return reply.code(200).send({ token: token });
		}
		return reply.code(res.code).send(res.data);
	})

	fastify.post('/logout', {
		schema: {
			body: {
				type: "object",
				properties: {
					token: { type: "string" },
				},
				required: ["token"]
			}
		}
	}, async (request: FastifyRequest, reply: FastifyReply) => {
		const { token } = request.body as { token: string };
		const data: any = await jwt.jwtVerif(token, core.sessionKey);
		if (!data)
			return reply.code(400).send({ message: "invalid token" });

		chat.disconnectClientById(data.id);
		// const res = await mgmt.logoutUser(data.id, core.db);
		return reply.code(200).send("Success");
	})

	fastify.delete('/reset', {
		config: { 
			rateLimit: rateLimitMed
		},
		schema: { 
			body: {
				type: 'object',
				properties: {
					token: { type: 'string' }
				},
				required: ["token"],
			}
		}
	}, async (request: FastifyRequest, reply: FastifyReply) => {
			const { token } = request.body as { token: string };

			const data: any = await jwt.jwtVerif(token, core.sessionKey);
			if (!data)
				return reply.code(400).send({ message: "token is invalid" });
			const res = await mgmt.resetUser(data.id);
			return reply.code(res.code).send(res.data);
		})

	fastify.delete('/delete', {
		config: { 
			rateLimit: rateLimitMed
		},
		schema: {
			body: {
				type: 'object',
				required: ["token"],
				properties: {
					token: { type: 'string' }
				}
			}
		}
	},
		async (request: FastifyRequest, reply: FastifyReply) => {
			const { token } = request.body as { token: string };

			const data: any = await jwt.jwtVerif(token, core.sessionKey);
			if (!data)
				return reply.code(400).send({ message: "token is invalid" });
			const res = await mgmt.deleteUser(data.id, core.db);
			return reply.code(res.code).send(res.data);
		})

	fastify.post('/set_status', {
		config: { 
			rateLimit: rateLimitMed
		},
		schema: {
			body: {
				type: "object",
				properties: {
					token: { type: "string" },
					new_status: { type: "number" }
				},
				required: ["token", "new_status"]
			}
		}
	}, async (request: FastifyRequest, reply: FastifyReply) => {
		const { token, new_status} = request.body as { token: string, new_status: number };
		const data: any = await jwt.jwtVerif(token, core.sessionKey);
		if (!data)
			return reply.code(400).send({ message: "invalid token" });

		const res = await mgmt.setUserStatus(data.id, new_status, core.db);
		return reply.code(res.code).send(res.data);
	})

	fastify.post('/upload/avatar', {
		config: rateLimitHard,
		schema: {
			headers: {
				type: 'object',
				properties: {
					token: { type: 'string' }
				},
				required: ['token']
			}
		}
	}, async (request, reply) => {
			const { token } = request.headers as { token: string };
			const data: any = await jwt.jwtVerif(token, core.sessionKey);
			if (!data)
				return reply.code(400).send({ message: "token is invalid" });

			return mgmt.uploadAvatar(request, reply, data.id);
		})

	fastify.post('/update/passw', {
		config: { 
			rateLimit: rateLimitMed
		},
		schema: {
			body: {
				type: 'object',
				required: ['oldPass', 'newPass', 'token'],
				properties: {
					token:		{ type: 'string' },
					oldPass:	{ type: 'string' },
					newPass:	{ type: 'string' },
				}
			}
		}
	}, async (request: FastifyRequest, reply: FastifyReply) => {
			const { token, oldPass, newPass } = request.body as { token: string, oldPass: string, newPass: string };

			const data: any = await jwt.jwtVerif(token, core.sessionKey);
			if (!data)
				return reply.code(400).send({ message: "token is invalid" });
			const res = await mgmt.updatePassw(data.id, oldPass, newPass);
			return reply.code(res.code).send(res.data);
		})

	fastify.post('/update/name', {
		config: { 
			rateLimit: rateLimitMed
		},
		schema: {
			body: {
				type: 'object',
				required: ['name', 'token'],
				properties: {
					name: { type: 'string' },
					token: { type: 'string' }
				}
			}
		}
	}, async (request: FastifyRequest, reply: FastifyReply) => {
			const { name, token } = request.body as { name: string, token: string };

			const data: any = await jwt.jwtVerif(token, core.sessionKey);
			if (!data)
				return reply.code(400).send({ message: "token is invalid" });
			const res = await mgmt.updateName(data.id, name);
			return reply.code(res.code).send(res.data);
		})

	fastify.post('/update/email', {
		config: { 
			rateLimit: rateLimitMed
		},
		schema: {
			body: {
				type: 'object',
				required: ['email', 'token'],
				properties: {
					email: { type: 'string' },
					token: { type: 'string' }
				}
			}
		}
	}, async (request: FastifyRequest, reply: FastifyReply) => {
			const { email, token } = request.body as { email: string, token: string };

			const data: any = await jwt.jwtVerif(token, core.sessionKey);
			if (!data)
				return reply.code(400).send({ message: "token is invalid" });
			const res = await mgmt.updateEmail(data.id, email);
			return reply.code(res.code).send(res.data);
		})

	fastify.post('/block', {
		config: { 
			rateLimit: rateLimitMed
		},
		schema: {
			body: {
				type: 'object',
				required: ['id', 'token'],
				properties: {
					id: { type: 'number' },
					token: { type: 'string' }
				}
			}
		}
	}, async (request: FastifyRequest, reply: FastifyReply) => {
			const { id, token } = request.body as { id: number, token: string };

			const data: any = await jwt.jwtVerif(token, core.sessionKey);
			if (!data)
				return reply.code(400).send({ message: "token is invalid" });
			const res = await mgmt.blockUser(data.id, id, core.db);
			return reply.code(res.code).send(res.data);
		})

	fastify.post('/unblock', {
		config: { 
			rateLimit: rateLimitMed
		},
		schema: {
			body: {
				type: 'object',
				required: ['id', 'token'],
				properties: {
					id: { type: 'number' },
					token: { type: 'string' }
				}
			}
		}
	}, async (request: FastifyRequest, reply: FastifyReply) => {
			const { id, token } = request.body as { id: number, token: string };
			const data: any = await jwt.jwtVerif(token, core.sessionKey);
			if (!data)
				return reply.code(400).send({ message: "token is invalid" })

			const res = await mgmt.unBlockUser(data.id, id, core.db);
			return reply.code(res.code).send(res.data);
		})
}
