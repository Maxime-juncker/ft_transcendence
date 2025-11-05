import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { createUserOAuth2, loginOAuth2 } from '@modules/users/userManagment.js';
import { getDB } from '@core/server.js';
import { AuthSource } from '@modules/oauth2/routes.js'

export function fortyTwoOAuth2Routes (
	fastify: FastifyInstance,
	options: FastifyPluginOptions,
	done: () => void,
)
{
	fastify.get('/api/oauth2/forty_two/callback', function(request, reply) {

		fastify.FortyTwoOAuth2.getAccessTokenFromAuthorizationCodeFlow(request, async (err, result) => {
			if (err) {
				console.log('OAuth Error:', err);
				reply.send(err);
				return;
			}
			const fetchResult = await fetch('https://api.intra.42.fr/v2/me', {
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
			const avatar = data.image.link;

			var res = await createUserOAuth2(email, name, id, AuthSource.FORTY_TWO, avatar, getDB());
			if (res.code == 200 || res.code == 500)
				res = await loginOAuth2(id, AuthSource.FORTY_TWO, getDB());
			const url = `https://${process.env.HOST}:8081/login.html?event=oauth_redir&id=${id}&source=${AuthSource.FORTY_TWO}`;
			return reply.redirect(url);
		})
	})
	done();
}
