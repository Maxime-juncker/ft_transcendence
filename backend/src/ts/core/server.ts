import fastifyStatic from '@fastify/static';
import Fastify, { FastifyRequest, FastifyReply } from "fastify";
import sqlite3 from 'sqlite3';
import { open } from 'sqlite'

import { login_user as loginUser, createUserReq, logout_user, set_user_status as setUserStatus, uploadAvatar, updateUserReq, loginOAuth2Req } from '@modules/users/userManagment.js';
import { addGameToHistReq, getFriends, getUserById, getUserByNameReq, getUserHistByName } from 'modules/users/user.js';
import { addFriend, removeFriend, acceptFriend } from '@modules/users/friends.js';
import { chatSocket } from '@modules/chat/chat.js';
import { registerCorsProvider } from 'providers/cors.js';
import { registerOAuth2Providers } from 'providers/oauth2.js';
import { fortyTwoOAuth2Routes } from '@modules/oauth2/fortyTwo.route.js';
import { githubOAuth2Routes } from '@modules/oauth2/github.route.js';

export interface DbResponse {
	code:	number;
	data:	any; // will be an error string if code != 200
}

/* directory of avatars */
export const uploadDir : string = "/var/www/avatars/"

//
// setup dependencies
//
const fastify = Fastify({ logger: false })
await fastify.register(import('@fastify/multipart'));
await fastify.register(import('@fastify/websocket'));

await registerOAuth2Providers(fastify); // oauth2 for google
await fastify.register(fortyTwoOAuth2Routes);
await fastify.register(githubOAuth2Routes);

registerCorsProvider(fastify);

/* setup sqlite3 */
const db = await open({
	filename: '/var/lib/sqlite/app.sqlite',
	driver: sqlite3.Database
});

/* root to access avatars */
fastify.register(fastifyStatic, {
  root: uploadDir,
  prefix: '/api/images/',
});

//
// Friends
//
fastify.delete('/api/remove_friend/:user1/:user2', (request, reply) => {
	return removeFriend(request, reply, db);
})

fastify.post('/api/accept_friend/:user1/:user2', (request: any, reply: any) => {
	return acceptFriend(request, reply, db);
})

fastify.post('/api/add_friend', (request:any, reply:any) => {
	return addFriend(request, reply, db);
})

//
// Users
//
fastify.get('/api/get_history_name/:username', async (request: FastifyRequest, reply: FastifyReply) => {
	return await getUserHistByName(request, reply, db);
})

fastify.post('/api/add_game_history', async (request: FastifyRequest, reply: FastifyReply) => {
	return await addGameToHistReq(request, reply, db);
})

fastify.post('/api/update_user', async (request: FastifyRequest, reply: FastifyReply) => {
	return await updateUserReq(request, reply, db);
})

fastify.get<{ Querystring: { user_id: string } }>
(
	'/api/get_friends',
	{
		schema: {
			querystring: {
				type: 'object',
				properties: {
					user_id: { type: 'string' }
				},
				required: ['user_id']
			}
		},
	handler: (request, reply) => {
		return getFriends(request, reply, db);
	}
})

fastify.get<{ Querystring: { user_id: string } }>
(
	'/api/get_profile_id',
		{
			schema: {
				querystring: {
				type: 'object',
				properties: {
					user_id: { type: 'string' }
				},
				required: ['user_id']
			}
	},
	handler: (request, reply) => {
		return getUserById(request, reply, db);
	}
})

fastify.get<{ Querystring: { profile_name: string } }>
(
	'/api/get_profile_name',
		{
			schema: {
				querystring: {
				type: 'object',
				properties: {
					profile_name: { type: 'string' }
				},
				required: ['profile_name']
			}
	},
	handler: (request, reply) => {
		getUserByNameReq(request, reply, db);
	}
})

//
// User managment
//
fastify.post('/api/create_user', (request: any, reply: any) => {
	return createUserReq(request, reply, db);
})

fastify.post('/api/oauth2/login', (request: any, reply: any) => {
	return loginOAuth2Req(request, reply, db);
})

fastify.post('/api/login', (request:any, reply:any) => {
	return loginUser(request, reply, db);
})

fastify.post('/api/logout_user', (request: any, reply: any) => {
	return logout_user(request, reply, db);
})

fastify.post('/api/set_status', (request:any, reply:any) => {
	return setUserStatus(request, reply, db);
})

fastify.post('/api/upload/avatar', async (request, reply) => {
	return uploadAvatar(request, reply, db);
})

//
// Chat
//
fastify.register(async function (fastify) {
    fastify.get('/api/chat', { websocket: true }, (connection, request) => {
		chatSocket(connection, request);
    });
});

//
// fastify
//
const start = async () => {
	try {
		await fastify.listen({ port: 3000, host: '0.0.0.0' });
		console.log("server ready!")
	} catch (err) {
		fastify.log.error(err);
		process.exit(1)
	}
}

export function getDB() { return db; }

function shutdownDb()
{
	const sql = "UPDATE users SET is_login = 0";
	db.run(sql, function(err: any) {
		if (err)
			console.error(`error on shutdown: ${err}`);
		db.close();
		console.log('shutdown complete, bye.');
		process.exit(0);
	})
}

const signals = ['SIGINT', 'SIGTERM'] as const;
signals.forEach(signal => {
	process.on(signal, async () => {
		console.log(`Received ${signal}, shuting down...`);
		await fastify.close();
		shutdownDb();
	});
});

start()

console.log("Fastify routes:")
console.log(fastify.printRoutes());
