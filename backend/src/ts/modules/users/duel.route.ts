import * as core from 'core/core.js';
import * as duel from 'modules/users/duel.js';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { jwtVerif } from 'modules/jwt/jwt.js';

const duelSchema = {
	body: {
		type: 'object',
		properties: {
			token: { type: "string" },
			id: { type: "number" }
		},
		required: ["token", "id"]
	}
}

export async function duelRoutes(fastify: FastifyInstance)
{

	fastify.post('/list', {
		config: { 
			rateLimit: core.rateLimitMed
		},
		schema: core.tokenSchema
	},
		async (request: FastifyRequest, reply: FastifyReply) => {
			const { token } = request.body as { token: string };
			const data: any = await jwtVerif(token, core.sessionKey);
			if (!data)
				return reply.code(400).send({ message: "invalid token" });
			const res = await duel.listPendings(data.id);
			return reply.code(res.code).send(res.data);
		});

	fastify.post('/invite', {
		config: { 
			rateLimit: core.rateLimitMed
		},
		schema: duelSchema
	},
		async (request: FastifyRequest, reply: FastifyReply) => {
			const { token, id } = request.body as { token: string, id: number };
			const data: any = await jwtVerif(token, core.sessionKey);
			if (!data)
				return reply.code(400).send({ message: "invalid token" });
			const res = await duel.inviteDuel(data.id, id);
			return reply.code(res.code).send(res.data);
		});

	fastify.post('/accept', {
		config: { 
			rateLimit: core.rateLimitMed
		},
		schema: duelSchema
	},
		async (request: FastifyRequest, reply: FastifyReply) => {
			const { token, id } = request.body as { token: string, id: number };
			const data: any = await jwtVerif(token, core.sessionKey);
			if (!data)
				return reply.code(400).send({ message: "invalid token" });
			const res = await duel.acceptDuel(data.id, id);
			return reply.code(res.code).send(res.data);
		});

	fastify.post('/decline', {
		config: { 
			rateLimit: core.rateLimitMed
		},
		schema: duelSchema
	},
		async (request: FastifyRequest, reply: FastifyReply) => {
			const { token, id } = request.body as { token: string, id: number };
			const data: any = await jwtVerif(token, core.sessionKey);
			if (!data)
				return reply.code(400).send({ message: "invalid token" });

			const res = await duel.declineDuel(data.id, id);
			return reply.code(res.code).send(res.data);
		});
}
