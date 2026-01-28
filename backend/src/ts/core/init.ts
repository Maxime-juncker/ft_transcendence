import { promises as fs } from 'fs'
import { createUser } from 'modules/users/userManagment.js';
import { Database } from 'sqlite';
import { hashString } from 'modules/sha256.js';
import fastifyStatic from '@fastify/static';
import { FastifyRequest } from 'fastify';

import { registerCorsProvider } from 'providers/cors.js';
import { registerOAuth2Providers } from 'providers/oauth2.js';
import { userManagmentRoutes } from 'modules/users/userManagment.route.js';
import { AuthSource, OAuthRoutes } from 'modules/oauth2/routes.js';
import { friendsRoutes } from 'modules/users/friends.route.js';
import { userRoutes } from 'modules/users/user.route.js';
import { chatRoutes } from 'modules/chat/chat.route.js';
import { totpRoutes } from 'modules/2fa/2fa.route.js';
import { duelRoutes } from 'modules/users/duel.route.js';

import * as core from 'core/core.js';
import { Logger } from 'modules/logger.js';

async function loadConfig(path: string, db: Database)
{
	const data = await fs.readFile(path, 'utf-8');
	const json = JSON.parse(data);

	const users = json.default_users;
	for (let i = 0; i < users.length; i++)
	{
		const user = users[i];
		const hash = await hashString(user.passw);
		await createUser(user.email, hash, user.name, AuthSource.INTERNAL, db);
	}
}

function onExceeded(req: FastifyRequest, key: string)
{
	Logger.error("client has exceeded request!", key);
}

export async function initFastify()
{
	// setup dependencies
	await core.fastify.register(import('@fastify/multipart'), {
		limits: {
			fileSize: 10 * 1024 * 1024, // 10mb
			files: 1
		}
	});

	await core.fastify.register(import('@fastify/websocket'));
	await core.fastify.register(import('@fastify/cookie'));
	await core.fastify.register(import('@fastify/rate-limit'), {
		global: true,
		max: 100,
		timeWindow: 1 * 100, // max 100 req / sec
		onExceeded: onExceeded,
	});

	await registerOAuth2Providers(core.fastify); // oauth2 for google

	await core.fastify.register(OAuthRoutes, { prefix: '/api/oauth2'});
	await core.fastify.register(userManagmentRoutes, { prefix: '/api/user'});
	await core.fastify.register(friendsRoutes, { prefix: '/api/friends'});
	await core.fastify.register(userRoutes, { prefix: '/api/user'});
	await core.fastify.register(chatRoutes);
	await core.fastify.register(totpRoutes);
	await core.fastify.register(duelRoutes, { prefix: '/api/duel' });

	registerCorsProvider(core.fastify);

	/* root to access avatars */
	core.fastify.register(fastifyStatic, {
		root: core.publicDir,
		prefix: '/public/',
	});

	// create account for bot
	await createUser("", "", "bot", AuthSource.BOT, core.db);
	await loadConfig("/config.json", core.db); // create default_users
}

