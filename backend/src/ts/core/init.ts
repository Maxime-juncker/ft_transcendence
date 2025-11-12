import { promises as fs } from 'fs'
import { createUser } from '@modules/users/userManagment.js';
import { Database } from 'sqlite';
import { hashString } from '@modules/sha256.js';
import fastifyStatic from '@fastify/static';

import { registerCorsProvider } from 'providers/cors.js';
import { registerOAuth2Providers } from 'providers/oauth2.js';
import { userManagmentRoutes } from '@modules/users/userManagment.route.js';
import { OAuthRoutes } from '@modules/oauth2/routes.js';
import { friendsRoutes } from '@modules/users/friends.route.js';
import { userRoutes } from '@modules/users/user.route.js';
import { chatRoutes } from '@modules/chat/chat.route.js';

import * as core from '@core/core.js';

async function loadConfig(path: string, db: Database)
{
	const data = await fs.readFile(path, 'utf-8');
	const json = JSON.parse(data);

	const users = json.default_users;
	users.forEach(async (user: any) => {
		const hash = await hashString(user.passw);
		await createUser(user.email, hash, user.name, user.avatar, db);
	});
}

export async function initFastify()
{
	await loadConfig("/config.json", core.db); // create default_users
		
	// setup dependencies
	await core.fastify.register(import('@fastify/multipart'));
	await core.fastify.register(import('@fastify/websocket'));
	await core.fastify.register(import('@fastify/cookie'));

	// register session
	await core.fastify.register(import('@fastify/session'), {
		secret: core.sessionKey,
		cookieName: "sessionId",
		cookie: {
			secure: false,
			maxAge: 24 * 60 * 60 * 1000 // 1 day
		},
		saveUninitialized: false
	})

	await registerOAuth2Providers(core.fastify); // oauth2 for google

	await core.fastify.register(OAuthRoutes, { prefix: '/api/oauth2'});
	await core.fastify.register(userManagmentRoutes, { prefix: '/api/user'});
	await core.fastify.register(friendsRoutes, { prefix: '/api/friends'});
	await core.fastify.register(userRoutes, { prefix: '/api/user'});
	await core.fastify.register(chatRoutes);

	registerCorsProvider(core.fastify);

	/* root to access avatars */
	core.fastify.register(fastifyStatic, {
		root: core.uploadDir,
		prefix: '/api/images/',
	});

}

