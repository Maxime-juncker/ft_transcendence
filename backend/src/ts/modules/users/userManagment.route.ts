import { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify'
import * as core from '@core/core.js';
import * as mgmt from '@modules/users/userManagment.js';
import * as jwt from 'modules/jwt/jwt.js';

//
// User managment
//
export async function userManagmentRoutes(fastify: FastifyInstance, options: FastifyPluginOptions)
{
	fastify.get('/get_session', async (request: FastifyRequest, reply) => {
		const token = request.cookies.jwt_session;
		if (token)
		{
			const res = await mgmt.loginSession(token, core.db);
			if (res.code != 200)
				return reply.code(res.code).send(res.data);
			console.log("user is login has:", res.data.name);
			return reply.code(res.code).send(res.data);
		}
		else
		{
			return reply.code(404).send({ message: "user need to login" });
		}
	})

	fastify.post('/create_guest', async (request: any, reply: FastifyReply) => {
		const res = await mgmt.createGuest();
		if (res.code == 200)
		{
			const token = await jwt.jwtCreate({ id: res.data.id }, core.sessionKey);
			return reply.code(200).send({ token: token });
		}

		return reply.code(res.code).send(res.data);
	})

	/**
	 * @deprecated
	 */
	fastify.post('/guest_cli', async (request: any, reply: FastifyReply) => {
		const res = await mgmt.createGuest();
		return reply.code(res.code).send(res);
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
		const res = await mgmt.login(email, passw, totp, core.db);
		if (res.code == 200)
		{
			const token = await jwt.jwtCreate({ id: res.data.id }, core.sessionKey);
			console.log("creating new token:", token);
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

		const res = await mgmt.logoutUser(data.id, core.db);
		return reply.code(res.code).send(res.data);
	})

	fastify.delete('/reset', {
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
		schema: {
			body: {
				type: "object",
				properties: {
					token: { type: "string" },
					new_status: { type: "string" }
				},
				required: ["token", "new_status"]
			}
		}
	}, async (request: FastifyRequest, reply: FastifyReply) => {
		const { token, new_status} = request.body as { token: string, new_status: string };
		const data: any = await jwt.jwtVerif(token, core.sessionKey);
		if (!data)
			return reply.code(400).send({ message: "invalid token" });

		const res = await mgmt.setUserStatus(data.id, new_status, core.db);
		return reply.code(res.code).send(res.data);
	})

	fastify.post('/upload/avatar', {
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
