import { FastifyInstance, FastifyPluginOptions } from "fastify";
import * as core from '@core/core.js';
import { loginOAuth2 } from "@modules/users/userManagment.js";

import { fortyTwoOAuth2Routes } from "./fortyTwo.route.js";
import { githubOAuth2Routes } from "./github.route.js";

export enum AuthSource {
	INTERNAL = 0,
	GOOGLE,
	GITHUB,
	FORTY_TWO
}

export async function OAuthRoutes(fastify: FastifyInstance, options: FastifyPluginOptions)
{
	fastify.post('/login', async (request: any, reply: any) => {
		const { id, source } = request.body as {
			id: string,
			source: number,
		}
		console.log(request.body, id, source);
		const res = await loginOAuth2(id, source, core.db);
		return reply.code(res.code).send(res.data);
	});

	await fastify.register(fortyTwoOAuth2Routes);
	await fastify.register(githubOAuth2Routes);
}

