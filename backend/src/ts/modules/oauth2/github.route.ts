import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { createUserOAuth2, loginOAuth2 } from '@modules/users/userManagment.js';
import * as core from '@core/core.js';
import { AuthSource } from '@modules/oauth2/routes.js'

export function githubOAuth2Routes (
	fastify: FastifyInstance,
	options: FastifyPluginOptions,
	done: () => void,
)
{
	fastify.get('/github/callback', function(request: any, reply) {
		
		fastify.GithubOAuth2.getAccessTokenFromAuthorizationCodeFlow(request, async (err, result) => {
			if (err)
			{
				reply.send(err);
				console.log(err);
				return
			}

			const fetchResult = await fetch('https://api.github.com/user', {
				headers: {
					Authorization: 'Bearer ' + result.token.access_token
				}
			});

			if (!fetchResult.ok)
			{
				console.log("failed to fetch user infos");
				reply.send(new Error('Failed to fetch user info'));
				return;
			}
			const data = await fetchResult.json();
			const id = data.id;
			const name = data.login;
			const email = data.email;
			const avatar = data.avatar_url;

			await createUserOAuth2(email, name, id, AuthSource.GITHUB, avatar, core.db);
			const res = await loginOAuth2(id, AuthSource.GITHUB, core.db);
			if (res.code == 200)
				request.session.user = res.data.id;
			const url = `https://${process.env.HOST}:8081/login.html`;
			return reply.redirect(url);
		})
	})
	done();
}
