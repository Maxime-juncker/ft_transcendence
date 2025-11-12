import { FastifyInstance } from 'fastify';
import OAuth2, { OAuth2Namespace } from '@fastify/oauth2';

declare module 'fastify' {
	interface FastifyInstance {
		GoogleOAuth2: OAuth2Namespace;
	}
}
declare module 'fastify' {
	interface FastifyInstance {
		FortyTwoOAuth2: OAuth2Namespace;
	}
}
declare module 'fastify' {
	interface FastifyInstance {
		GithubOAuth2: OAuth2Namespace;
	}
}

const googleOAuth2Options : any = {
	name: 'GoogleOAuth2',
	scope: [ "profile", "email" ],
	credentials: {
		client: {
			id: "1037879128761-jrqfe4ealp6ovtorl6hgo67r8qfscuk2.apps.googleusercontent.com",
			secret: "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"
		},
		auth: OAuth2.GOOGLE_CONFIGURATION
	},
	startRedirectPath: '/api/oauth2/google',
	callbackUri: `https://${process.env.HOST}:8081/login.html`
};

const githubOAuth2Options : any = {
	name: 'GithubOAuth2',
	credentials: {
		client: {
			id: "Ov23liAV1lK69SZX4VDR",
			secret: "18af33ba955ee9b17748529fcffd3842b78da187"
		},
		auth: OAuth2.GITHUB_CONFIGURATION
	},
	startRedirectPath: '/api/oauth2/github',
	callbackUri: `https://${process.env.HOST}:8081/api/oauth2/github/callback`
};

const fortyTwoOAuth2Options : any = {
	name: 'FortyTwoOAuth2',
	credentials: {
		client: {
			id: "u-s4t2ud-83623a8ef9db816d5033a1574026445eaf9882a3adbed46ceaae2955c5a6b156",
			secret: "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"
		},
		auth: {
			authorizeHost: 'https://api.intra.42.fr',
			authorizePath: '/oauth/authorize',
			tokenHost: 'https://api.intra.42.fr',
			tokenPath: '/oauth/token'
		}
	},
	startRedirectPath: '/api/oauth2/forty_two',
	callbackUri: `https://${process.env.HOST}:8081/api/oauth2/forty_two/callback`,
	scope: 'public'
};

export async function registerOAuth2Providers(fastify: FastifyInstance) {
	await fastify.register(OAuth2, fortyTwoOAuth2Options);
	await fastify.register(OAuth2, googleOAuth2Options);
	await fastify.register(OAuth2, githubOAuth2Options);
}

