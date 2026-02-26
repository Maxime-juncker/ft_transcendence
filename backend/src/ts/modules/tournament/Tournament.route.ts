import { core, chat, rateLimitMed } from 'core/server.js';
import { FastifyRequest, FastifyReply, FastifyInstance, FastifyPluginOptions } from 'fastify';
import { getUserById, getUserByName, getBlockUser } from 'modules/users/user.js';
import { jwtVerif } from 'modules/jwt/jwt.js';
import { Logger } from 'modules/logger.js';

export async function chatRoutes(fastify: FastifyInstance)
{
	fastify.register(async function (fastify) {
		fastify.get('/tournament', {
			websocket: true,
		}, (connection, request) => {
			
		});
	});
}
