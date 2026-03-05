import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { core, chat, rateLimitMed, rateLimitHard, tokenHeader, getToken } from 'core/server.js';
import * as mgmt from 'modules/users/userManagment.js';
import * as jwt from 'modules/jwt/jwt.js';
import { Logger } from 'modules/logger.js';
import { uploadAvatar } from './avatars.js';

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
		schema: { headers: tokenHeader }
	}, async (request: FastifyRequest, reply: FastifyReply) => {
		const token = getToken(request.headers.authorization as string);
		if (!token)
			return reply.status(400).send({ error: 'missing authorization header' });

		const data: any = await jwt.jwtVerif(token, core.sessionKey);
		if (!data)
			return reply.code(400).send({ message: "invalid token" });

		chat.disconnectClientById(data.id);
		return reply.code(200).send({ message: "Success"});
	})

	fastify.delete('/reset', {
		config: { 
			rateLimit: rateLimitMed
		},
		schema: { 
			headers: tokenHeader
		}
	}, async (request: FastifyRequest, reply: FastifyReply) => {
			const token = getToken(request.headers.authorization as string);
			if (!token)
				return reply.status(400).send({ error: 'missing authorization header' });

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
		schema: { headers: tokenHeader }
	},
		async (request: FastifyRequest, reply: FastifyReply) => {
			const token = getToken(request.headers.authorization as string);
			if (!token)
				return reply.status(400).send({ error: 'missing authorization header' });

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
			headers: tokenHeader,
			body: {
				type: "object",
				properties: {
					new_status: { type: "number" }
				},
				required: [ "new_status" ]
			}
		}
	}, async (request: FastifyRequest, reply: FastifyReply) => {
		const token = getToken(request.headers.authorization as string);
		if (!token)
			return reply.status(400).send({ error: 'missing authorization header' });
		const { new_status} = request.body as { new_status: number };
		const data: any = await jwt.jwtVerif(token, core.sessionKey);
		if (!data)
			return reply.code(400).send({ message: "invalid token" });

		const res = await mgmt.setUserStatus(data.id, new_status, core.db);
		return reply.code(res.code).send(res.data);
	})

	// TODO: CHECK FRONT FOR AVATAR
	fastify.post('/upload/avatar', {
		config: { 
			rateLimit: rateLimitHard
		},
		schema: {
			headers: tokenHeader
		}
	}, async (request: FastifyRequest, reply: FastifyReply) => {
			const token = getToken(request.headers.authorization as string);
			if (!token)
				return reply.status(400).send({ error: 'missing authorization header' });

			const data: any = await jwt.jwtVerif(token, core.sessionKey);
			if (!data)
				return reply.code(400).send({ message: "token is invalid" });

			const file = await request.file();
			if (!file)
				return reply.code(400).send({ message: "no file uploaded" });

			const res = await uploadAvatar(file, data.id);
			return reply.code(res.code).send(res.data);
		})

	fastify.post('/update/passw', {
		config: { 
			rateLimit: rateLimitMed
		},
		schema: {
			headers: tokenHeader,
			body: {
				type: 'object',
				required: ['oldPass', 'newPass' ],
				properties: {
					oldPass:	{ type: 'string' },
					newPass:	{ type: 'string' },
				}
			}
		}
	}, async (request: FastifyRequest, reply: FastifyReply) => {
			const token = getToken(request.headers.authorization as string);
			if (!token)
				return reply.status(400).send({ error: 'missing authorization header' });
			const { oldPass, newPass } = request.body as { oldPass: string, newPass: string };

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
			headers: tokenHeader,
			body: {
				type: 'object',
				required: ['name'],
				properties: {
					name: { type: 'string' },
				}
			}
		}
	}, async (request: FastifyRequest, reply: FastifyReply) => {
			const token = getToken(request.headers.authorization as string);
			if (!token)
			{
				return reply.status(400).send({ error: 'missing authorization header' });
			}

			const { name } = request.body as { name: string };

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
			headers: tokenHeader,
			body: {
				type: 'object',
				required: ['email'],
				properties: {
					email: { type: 'string' },
				}
			}
		}
	}, async (request: FastifyRequest, reply: FastifyReply) => {
			const token = getToken(request.headers.authorization as string);
			if (!token)
			{
				return reply.status(400).send({ error: 'missing authorization header' });
			}

			const { email } = request.body as { email: string };

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
				required: ['id'],
				properties: {
					id: { type: 'number' },
				}
			}
		}
	}, async (request: FastifyRequest, reply: FastifyReply) => {
			const token = getToken(request.headers.authorization as string);
			if (!token)
			{
				return reply.status(400).send({ error: 'missing authorization header' });
			}

			const { id } = request.body as { id: number };

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
				required: ['id'],
				properties: {
					id: { type: 'number' },
				}
			}
		}
	}, async (request: FastifyRequest, reply: FastifyReply) => {
			const token = getToken(request.headers.authorization as string);
			if (!token)
			{
				return reply.status(400).send({ error: 'missing authorization header' });
			}

			const { id } = request.body as { id: number };
			const data: any = await jwt.jwtVerif(token, core.sessionKey);
			if (!data)
				return reply.code(400).send({ message: "token is invalid" })

			const res = await mgmt.unBlockUser(data.id, id, core.db);
			return reply.code(res.code).send(res.data);
		})
}
