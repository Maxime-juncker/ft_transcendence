import { FastifyInstance } from 'fastify';
import { startPage } from 'pages/start.html.js';
import { lobbyPage } from 'pages/lobby.html.js';
import { loginPage } from 'pages/login.html.js';
import { gameviewPage } from 'pages/gameview.html.js';

export class ServerSideRendering
{
	private server: FastifyInstance;

	constructor(server: FastifyInstance)
	{
		this.server = server;
		this.setupRoutes();
	}

	private setupRoutes(): void
	{
		this.server.get('/login', (request, reply) =>
		{
			reply.type('text/html').send(loginPage);
		});

		this.server.get('/lobby', (request, reply) =>
		{
			reply.type('text/html').send(lobbyPage);
		});

		this.server.get('/', (request, reply) =>
		{
			reply.type('text/html').send(startPage);
		});

		this.server.get('/game', (request, reply) =>
		{
			reply.type('text/html').send(gameviewPage);
		});
	}

}
