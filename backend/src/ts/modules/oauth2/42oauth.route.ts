import { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify';
import { createUser, createUserOAuth2, loginOAuth2 } from '@modules/users/userManagment.js';
import { getDB } from '@core/server.js';
import OAuth2, { OAuth2Namespace } from '@fastify/oauth2';

export enum AuthSource {
	INTERNAL = 0,
	GOOGLE,
};

export function fortyTwoOAuth2Routes (
	fastify: FastifyInstance,
	options: FastifyPluginOptions,
	done: () => void,
)
{

	fastify.get('/api/login/forty_two/login', function(request, reply) {
		fastify.FortyTwoOAuth2.getAccessTokenFromAuthorizationCodeFlow(request, async (err, result) => {
			if (err)
			{
				reply.send(err);
				console.log(err);
				return
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
			const { id, email, login, image } = data as {
				email: string,
				login: string,
				id: string,
				image: any
			};
			console.log(id, email, login);
			console.log(image);
			// var res = await createUserOAuth2(email, name, id, AuthSource.GOOGLE, picture, getDB());
			// if (res.code == 200 || res.code == 500)
			// {
			// 	res = await loginOAuth2(id, email, AuthSource.GOOGLE, getDB());
			// 	console.log(res.code);
			// 	console.log(res.data);
			// 	return reply.code(res.code).send(res.data);
			// }
			// return reply.code(res.code).send(res.data);
		})
	})
	done();
}
