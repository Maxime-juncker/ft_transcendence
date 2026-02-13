import { new_totp as newTotp, del_totp as delTotp, validate_totp as validateTotp } from 'modules/2fa/totp.js'
import { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify';
import { jwtVerif } from 'modules/jwt/jwt.js';
import { core, rateLimitMed } from 'core/server.js';

export async function totpRoutes(fastify: FastifyInstance)
{
	fastify.post('/api/totp/reset', {
		config: { 
			rateLimit: rateLimitMed
		},
		schema: {
			body: {
				type: 'object',
				required: ['email', 'token'],
				properties: {
					token: { type: 'string' },
					email: { type: 'string' },
				}
			}
		}
	}, async (request: FastifyRequest, reply: FastifyReply) => {

		const { email, token } = request.body as { email: string, token: string };

		const data: any = await jwtVerif(token, core.sessionKey);
		if (!data)
			return reply.code(400).send({ message: "token is invalid" });
		const res = await newTotp(data.id, email);
		return reply.code(res.code).send(res.data);
	})

	fastify.post('/api/totp/remove', {
		config: { 
			rateLimit: rateLimitMed
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

		const { token } = request.body as { email: string, token: string };

		const data: any = await jwtVerif(token, core.sessionKey);
		if (!data)
			return reply.code(400).send({ message: "token is invalid" });
		const res = await delTotp(data.id);
		return reply.code(res.code).send(res.data);
	})

	fastify.post('/api/totp/validate', {
		config: { 
			rateLimit: rateLimitMed
		},
		schema: {
			body: {
				type: 'object',
				required: ['token', 'totp'],
				properties: {
					token: { type: 'string' },
					totp: { type: 'string' }
				}
			}
		}
	}, async (request: FastifyRequest, reply: FastifyReply) => {
		const { totp, token } = request.body as { totp: string, token: string };

		const data: any = await jwtVerif(token, core.sessionKey);
		if (!data)
			return reply.code(400).send({ message: "token is invalid" });
		return validateTotp(data.id, totp);
	})
}
