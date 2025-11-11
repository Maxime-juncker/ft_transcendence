import { Database } from "sqlite";
import sqlite3 from 'sqlite3';
import { open } from 'sqlite'
import Fastify, { FastifyInstance } from "fastify";
import { randomBytes } from "crypto";

export interface DbResponse {
	code:	number;
	data:	any;
}

// directory of avatars
export const uploadDir : string = "/var/www/avatars/"

export var db:		Database		= null;
export var fastify:	FastifyInstance = null;
export var sessionKey: string;

export async function createServer()
{
	db = await open({
		filename: '/var/lib/sqlite/app.sqlite',
		driver: sqlite3.Database
	});

	fastify = Fastify({ logger: false });
	sessionKey = randomBytes(64).toString('hex');
	console.log("server created");
}

export async function start() {
	try {
		await fastify.listen({ port: 3000, host: '0.0.0.0' });
		console.log("server ready!")
	} catch (err) {
		fastify.log.error(err);
		process.exit(1)
	}
}

export async function shutdown()
{
	await fastify.close();

	const sql = "UPDATE users SET is_login = 0";
	db.run(sql, function(err: any) {
		if (err)
			console.error(`error on shutdown: ${err}`);
		db.close();
		console.log('shutdown complete, bye.');
		process.exit(0);
	})
}
