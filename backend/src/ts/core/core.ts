import { Database } from "sqlite";
import sqlite3 from 'sqlite3';
import { open } from 'sqlite'
import Fastify, { FastifyInstance } from "fastify";
import '@fastify/session';
import { getJwtSecret } from 'modules/vault/secrets.js';
import { Logger } from "modules/logger.js";

export interface DbResponse {
	code:	number;
	data:	any;
}

export const rateLimitHard = {
	max: 3,
	timeWindow: '1 minute'
}

export const rateLimitMed = {
	max: 500,
	timeWindow: '1 minute'
}

export const tokenSchema = {
	body: {
		type: "object",
		properties: {
			token: { type: "string" },
		},
		required: [ "token" ]
	}
}

export function getDateFormated()
{
	return new Date(new Date().toLocaleString("en-US", {timeZone: "Europe/Paris"})).toISOString().slice(0, 19).replace('T', ' ');
}
 

export const publicDir : string = "/var/www/server/public/"

export var db:		Database;
export var fastify:	FastifyInstance;
export var sessionKey: string;

export async function createServer()
{
	db = await open({
		filename: '/var/lib/sqlite/app.sqlite',
		driver: sqlite3.Database
	});

	fastify = Fastify({ logger: false });
	sessionKey = await getJwtSecret();
}

export async function start() {
	try
	{
		await fastify.listen({ port: 3000, host: '0.0.0.0' });
		Logger.success("server ready!")
		Logger.log(`pong access at: https://${process.env.HOST}:8081`);
		Logger.log(`grafana access at: https://${process.env.HOST}:8081/admin/grafana/`);
		Logger.log(`kibana access at: https://${process.env.HOST}:8081/admin/kibana/`);
	}
	catch (err)
	{
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
		Logger.error(`error on shutdown: ${err}`);
	}
	db.close();
	Logger.log('shutdown complete, bye.');
	process.exit(0);
}
