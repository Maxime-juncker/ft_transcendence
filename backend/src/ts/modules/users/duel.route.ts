import { core, rateLimitMed, tokenHeader, getToken } from 'core/server.js';
import * as duel from 'modules/users/duel.js';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { jwtVerif } from 'modules/jwt/jwt.js';

export async function duelRoutes(fastify: FastifyInstance)
{
	const duelSchema = {
		headers: tokenHeader,
		body: {
			type: 'object',
			properties: {
				id: { type: "number" }
			},
			required: ["id"]
		}
	}

	fastify.post('/list', {
		config: {
			rateLimit: rateLimitMed
		},
		schema:
		{
			headers: tokenHeader
		}
	},
		async (request: FastifyRequest, reply: FastifyReply) => {
			const token = getToken(request.headers.authorization as string);
			if (!token)
				return reply.status(400).send({ error: 'missing authorization header' });
			const data: any = await jwtVerif(token, core.sessionKey);
			if (!data)
				return reply.code(400).send({ message: "invalid token" });
			const res = await duel.listPendings(data.id);
			return reply.code(res.code).send(res.data);
		});

	fastify.post('/invite', {
		config: { 
			rateLimit: rateLimitMed
		},
		schema: duelSchema
	},
		async (request: FastifyRequest, reply: FastifyReply) => {
			const token = getToken(request.headers.authorization as string);
			if (!token)
				return reply.status(400).send({ error: 'missing authorization header' });
			const { id } = request.body as { id: number };
			const data: any = await jwtVerif(token, core.sessionKey);
			if (!data)
				return reply.code(400).send({ message: "invalid token" });
			const res = await duel.inviteDuel(data.id, id);
			return reply.code(res.code).send(res.data);
		});

	fastify.post('/accept', {
		config: { 
			rateLimit: rateLimitMed
		},
		schema: duelSchema
	},
		async (request: FastifyRequest, reply: FastifyReply) => {
			const token = getToken(request.headers.authorization as string);
			if (!token)
				return reply.status(400).send({ error: 'missing authorization header' });
			const { id } = request.body as { id: number };
			const data: any = await jwtVerif(token, core.sessionKey);
			if (!data)
				return reply.code(400).send({ message: "invalid token" });
			const res = await duel.acceptDuel(data.id, id);
			return reply.code(res.code).send(res.data);
		});

	fastify.post('/decline', {
		config: { 
			rateLimit: rateLimitMed
		},
		schema: duelSchema
	},
		async (request: FastifyRequest, reply: FastifyReply) => {
			const token = getToken(request.headers.authorization as string);
			if (!token)
				return reply.status(400).send({ error: 'missing authorization header' });
			const { id } = request.body as { id: number };
			const data: any = await jwtVerif(token, core.sessionKey);
			if (!data)
				return reply.code(400).send({ message: "invalid token" });

			const res = await duel.declineDuel(data.id, id);
			return reply.code(res.code).send(res.data);
		});
}
