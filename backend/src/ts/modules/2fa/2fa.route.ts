import { new_totp as newTotp, del_totp as delTotp, validate_totp as validateTotp } from '@modules/2fa/totp.js'
import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import * as core from '@core/core.js'

export async function totpRoutes(fastify: FastifyInstance, options: FastifyPluginOptions)
{
	fastify.post('/api/totp/reset', async (request:any, reply:any) => {
		const res = await newTotp(request, reply, core.db);
		return reply.code(res.code).send(res.data);
	})

	fastify.post('/api/totp/remove', async (request:any, reply:any) => {
		return delTotp(request, reply, core.db);
	})

	fastify.post('/api/totp/validate', async (request:any, reply:any) => {
		return validateTotp(request, reply, core.db);
	})
}
