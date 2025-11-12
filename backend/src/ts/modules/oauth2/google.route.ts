import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { createUserOAuth2, loginOAuth2 } from '@modules/users/userManagment.js';
import * as core from '@core/core.js';
import { AuthSource } from '@modules/oauth2/routes.js'

export function googleOAuth2Routes (
	fastify: FastifyInstance,
	options: FastifyPluginOptions,
	done: () => void,
)
{

	fastify.get('/api/login/google/login', function(request: any, reply) {
		fastify.GoogleOAuth2.getAccessTokenFromAuthorizationCodeFlow(request, async (err, result) => {
			if (err)
			{
				reply.send(err)
				console.log(err);
				return
			}

			const fetchResult = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
				headers: {
					Authorization: 'Bearer ' + result.token.access_token
				}
			})

			if (!fetchResult.ok)
			{
				reply.send(new Error('Failed to fetch user info'))
				return
			}

			const data = await fetchResult.json()
			const { id, email, name, picture } = data as {
				email: string,
				name: string,
				id: string,
				picture: string,
			};

			var res = await createUserOAuth2(email, name, id, AuthSource.GOOGLE, picture, core.db);
			if (res.code == 200 || res.code == 500) // TODO: 500 ?
			{
				res = await loginOAuth2(id, AuthSource.GOOGLE, core.db);
				console.log(res.code);
				console.log(res.data);
				request.session.user = data.id;
				return reply.code(res.code).send({ message: "Success"});
			}
			return reply.code(res.code).send(res.data);
		})
	})
	done();
}
