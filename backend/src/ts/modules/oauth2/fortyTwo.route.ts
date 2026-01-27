import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { createUserOAuth2, loginOAuth2 } from 'modules/users/userManagment.js';
import * as core from 'core/core.js';
import * as jwt from 'modules/jwt/jwt.js';
import { AuthSource } from 'modules/oauth2/routes.js'
import { Logger } from 'modules/logger.js';

export function fortyTwoOAuth2Routes (
	fastify: FastifyInstance,
	options: FastifyPluginOptions,
	done: () => void,
)
{
	void options;

	fastify.get('/forty_two/callback', function(request: any, reply) {

		fastify.FortyTwoOAuth2.getAccessTokenFromAuthorizationCodeFlow(request, async (err, result) => {
			if (err)
			{
				Logger.log('OAuth Error:', err);
				return reply.send(err);
			}

			const fetchResult = await fetch('https://api.intra.42.fr/v2/me', {
				headers: {
					Authorization: 'Bearer ' + result.token.access_token
				}
			});

			if (!fetchResult.ok)
			{
				Logger.log("failed to fetch user infos");
				reply.send(new Error('Failed to fetch user info'));
				return;
			}

			const data = await fetchResult.json();
			const id = data.id;
			const name = data.login;
			const email = data.email;
			const avatar = data.image.link;

			var res = await createUserOAuth2(email, name, id, AuthSource.FORTY_TWO, avatar, core.db);
			if (res.code != 200)
				return reply.redirect(`https://${process.env.HOST}:8081/login?error=${encodeURIComponent(res.data.message)}`);
			res = await loginOAuth2(id, AuthSource.FORTY_TWO, core.db);
			if (res.code != 200)
				return reply.redirect(`https://${process.env.HOST}:8081/login?error=${encodeURIComponent(res.data.message)}`);

			const token = await jwt.jwtCreate({ id: res.data.id }, core.sessionKey);
			const url = `https://${process.env.HOST}:8081/login?oauth_token=${token}`;
			return reply.redirect(url);
		})
	})
	done();
}
