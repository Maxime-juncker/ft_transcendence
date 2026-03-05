import { new_totp as newTotp, del_totp as delTotp, validate_totp as validateTotp } from 'modules/2fa/totp.js'
import { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify';
import { jwtVerif } from 'modules/jwt/jwt.js';
import { core, rateLimitMed, tokenHeader, getToken } from 'core/server.js';

export async function totpRoutes(fastify: FastifyInstance)
{
	fastify.post('/api/totp/reset', {
		config: { 
			rateLimit: rateLimitMed
		},
		schema:
		{
			headers: tokenHeader,
			body:
			{
				type: 'object',
				required: ['email'],
				properties:
				{
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
		schema:
		{
			headers: tokenHeader
		}
	}, async (request: FastifyRequest, reply: FastifyReply) => {

		const token = getToken(request.headers.authorization as string);
		if (!token)
		{
			return reply.status(400).send({ error: 'missing authorization header' });
		}

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
			headers: tokenHeader,
			body: {
				type: 'object',
				required: ['totp'],
				properties: {
					totp: { type: 'string' }
				}
			}
		}
	}, async (request: FastifyRequest, reply: FastifyReply) => {
		const { totp } = request.body as { totp: string };
		const token = getToken(request.headers.authorization as string);
		if (!token)
		{
			return reply.status(400).send({ error: 'missing authorization header' });
		}

		const data: any = await jwtVerif(token, core.sessionKey);
		if (!data)
			return reply.code(400).send({ message: "token is invalid" });
		const res = await validateTotp(data.id, totp);
		return reply.code(res.code).send(res.data);
	})
}
