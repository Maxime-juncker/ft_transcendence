import { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify';
import { createUser, createUserOAuth2, loginOAuth2 } from '@modules/users/userManagment.js';
import { getDB } from '@core/server.js';

export enum AuthSource {
	INTERNAL = 0,
	GOOGLE,
};

export function googleOAuth2Routes (
	fastify: FastifyInstance,
	options: FastifyPluginOptions,
	done: () => void,
)
{

	fastify.get('/api/login/google/login', function(request, reply) {
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

			console.log(id, email, name, picture);
			var res = await createUserOAuth2(email, name, id, AuthSource.GOOGLE, picture, getDB());
			if (res.code == 200 || res.code == 500)
			{
				res = await loginOAuth2(id, email, AuthSource.GOOGLE, getDB());
				console.log(res.code);
				console.log(res.data);
				return reply.code(res.code).send(res.data);
			}
			return reply.code(res.code).send(res.data);
		})
	})
	done();
}
