import { Database } from "sqlite";
import sqlite3 from 'sqlite3';
import { open } from 'sqlite'
import Fastify, { FastifyInstance } from "fastify";
import '@fastify/session';
import { getJwtSecret } from 'modules/vault/secrets.js';
import { Logger } from "modules/logger.js";

export class Core
{
	public readonly publicDir: string = "/var/www/server/public/"

	private m_db!:			Database;
	private m_fastify!:		FastifyInstance;
	private m_sessionKey!:	string;

	private m_userCount:	number = 0;
	private m_gameCount:	number = 0;

	public get db():			Database { return this.m_db; }
	public get fastify():		FastifyInstance { return this.m_fastify; }
	public get sessionKey():	string { return this.m_sessionKey; }

	public get userCount():		number	{ return this.m_userCount; }
	public set userCount(count: number) { this.m_userCount = count; }

	public get gameCount():		number	{ return this.m_gameCount; }
	public set gameCount(count: number) { this.m_gameCount = count; }

	constructor()
	{
	}

	public async createServer()
	{
		this.m_db = await open({
			filename: '/var/lib/sqlite/app.sqlite',
			driver: sqlite3.Database
		});

		this.m_fastify = Fastify({ logger: false });
		this.m_sessionKey = await getJwtSecret();
	}

	public async start()
	{
		try
		{
			await this.m_fastify.listen({ port: 3000, host: '0.0.0.0' });
			Logger.success("server ready!")
			Logger.log(`pong access at: https://${process.env.HOST}:8081`);
			Logger.log(`grafana access at: https://${process.env.HOST}:8081/admin/grafana/`);
			Logger.log(`kibana access at: https://${process.env.HOST}:8081/admin/kibana/`);
		}
		catch (err)
		{
			this.m_fastify.log.error(err);
			process.exit(1)
		}
	}

	public async shutdown()
	{
		await this.m_fastify.close();

		const sql = "UPDATE users SET is_login = 0";
		try {
			await this.m_db.run(sql); 
		}
		catch (err)
		{
			Logger.error(`error on shutdown: ${err}`);
		}
		this.m_db.close();
		Logger.log('shutdown complete, bye.');
		process.exit(0);
	}
}
