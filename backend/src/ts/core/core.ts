import { Database } from "sqlite";
import sqlite3 from 'sqlite3';
import { open } from 'sqlite'
import Fastify, { FastifyInstance } from "fastify";
import '@fastify/session';
import { randomBytes } from "crypto";

export interface DbResponse {
	code:	number;
	data:	any;
}

// directory of avatars
export const uploadDir : string = "/var/www/server/public/"

export var db:		Database;
export var fastify:	FastifyInstance;
export var sessionKey: string;
 
declare module '@fastify/session' {
	interface FastifySessionObject {
		user?: number;
	}
}

export async function createServer()
{
	db = await open({
		filename: '/var/lib/sqlite/app.sqlite',
		driver: sqlite3.Database
	});

	fastify = Fastify({ logger: false });
	// sessionKey = randomBytes(64).toString('hex');
	if (process.env.JWT_SECRET)
		sessionKey = process.env.JWT_SECRET;
	else
	{
		console.error("CRITICAL: no jwt secret in env, aborting now");
		shutdown();	
	}
	console.log("server created");
}

export async function start() {
	try {
		await fastify.listen({ port: 3000, host: '0.0.0.0' });
		console.log("server ready!")
		console.log(`access at: https://${process.env.HOST}:8081`)
	} catch (err) {
		fastify.log.error(err);
		process.exit(1)
	}
}

export async function shutdown()
{
	await fastify.close();

	const sql = "UPDATE users SET is_login = 0";
	try {
		await db.run(sql); 
	}
	catch (err)
	{
		console.error(`error on shutdown: ${err}`);
	}
	db.close();
	console.log('shutdown complete, bye.');
	process.exit(0);
}
