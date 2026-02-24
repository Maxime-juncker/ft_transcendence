import { FastifyInstance } from 'fastify';
import OAuth2, { OAuth2Namespace } from '@fastify/oauth2';
import { getSecrets } from 'modules/vault/secrets.js';

declare module 'fastify' {
	interface FastifyInstance {
		FortyTwoOAuth2: OAuth2Namespace;
	}
};
declare module 'fastify' {
	interface FastifyInstance {
		GithubOAuth2: OAuth2Namespace;
	}
};

export async function registerOAuth2Providers(fastify: FastifyInstance) {
	const secrets = await getSecrets();

	const githubOAuth2Options : any = {
		name: 'GithubOAuth2',
		credentials: {
			client: {
				id: secrets.github.id,
				secret: secrets.github.secret
			},
			auth: OAuth2.GITHUB_CONFIGURATION
		},
		startRedirectPath: '/api/oauth2/github',
		callbackUri: `https://${process.env.HOST}:${process.env.PORT}/api/oauth2/github/callback`
	};

	const fortyTwoOAuth2Options : any = {
		name: 'FortyTwoOAuth2',
		credentials: {
			client: {
				id: secrets.ft.id,
				secret: secrets.ft.secret
			},
			auth: {
				authorizeHost: 'https://api.intra.42.fr',
				authorizePath: '/oauth/authorize',
				tokenHost: 'https://api.intra.42.fr',
				tokenPath: '/oauth/token'
			}
		},
		startRedirectPath: '/api/oauth2/forty_two',
		callbackUri: `https://${process.env.HOST}:${process.env.PORT}/api/oauth2/forty_two/callback`,
		scope: 'public'
	};


	await fastify.register(OAuth2, fortyTwoOAuth2Options);
	await fastify.register(OAuth2, githubOAuth2Options);
};
