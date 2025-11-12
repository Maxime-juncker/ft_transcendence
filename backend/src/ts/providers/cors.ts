import { FastifyInstance } from 'fastify';
import Cors from '@fastify/cors'

const corsOptions = {
	origin: "*"
};

export function registerCorsProvider(app: FastifyInstance)
{
	app.register(Cors, corsOptions);
}
