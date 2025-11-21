import { FastifyInstance } from 'fastify';
import * as fs from 'fs/promises';
import * as path from 'path';

export class ServerSideRendering
{
	private static readonly homePage: string = path.join(__dirname, 'index.html');

	constructor(server: FastifyInstance)
	{
		this.setupRoutes(server);
	}

	private setupRoutes(server: FastifyInstance): void
	{
		server.get('/', (request, reply) =>
		{
			reply.type('text/html').send(this.readFile(ServerSideRendering.homePage));
		});
	}

	private async readFile(filePath: string): Promise<string>
	{
		try
		{
			const data = await fs.readFile(filePath, 'utf-8');
			return (data);
		}
		catch (error)
		{
			console.error(`Error reading file at ${filePath}:`, error);
		}
	}
}
