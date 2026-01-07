import { FastifyInstance, FastifyPluginOptions } from "fastify";
import * as core from '@core/core.js';
import { loginOAuth2 } from "@modules/users/userManagment.js";

import { fortyTwoOAuth2Routes } from "./fortyTwo.route.js";
import { githubOAuth2Routes } from "./github.route.js";

export enum AuthSource {
	BOT = -2,	// for bot account
	GUEST = -1, // guest profile are deleted on logout
	INTERNAL = 0,
	GOOGLE, // not used anymore
	GITHUB,
	FORTY_TWO
}

export async function OAuthRoutes(fastify: FastifyInstance, options: FastifyPluginOptions)
{
	await fastify.register(fortyTwoOAuth2Routes);
	await fastify.register(githubOAuth2Routes);
}

