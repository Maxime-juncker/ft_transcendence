import Fastify from 'fastify';
import { ServerSideRendering } from './ServerSideRendering.js';
import { GameServer } from './GameServer.js';

const server = Fastify();
new ServerSideRendering(server);
const gameServer = new GameServer(server);
await gameServer.init();

const PORT: any = process.env.PORT || 3000;

try
{
	server.listen({ port: PORT, host: '0.0.0.0' });
}
catch (error)
{
	console.error('Error starting server:', error);
	process.exit(1);
}
