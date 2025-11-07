import { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify'
import { getDB } from '@core/server.js';
import * as mgmt from '@modules/users/userManagment.js'

//
// User managment
//
export async function userManagmentRoutes(fastify: FastifyInstance, options: FastifyPluginOptions)
{
	fastify.post('/create', async (request: any, reply: any) => {
		const { email, passw, username } = request.body as {
			email: string,
			passw: string,
			username: string
		};
		const res = await mgmt.createUser(email, passw, username, 0, getDB());
		return reply.code(res.code).send(res.data);
	})

	fastify.post('/login', async (request:any, reply:any) => {
		const { email, passw } = request.body;
		var sql = 'UPDATE users SET is_login = 1 WHERE email = ? AND passw = ? RETURNING *';

		try {
			const row = await getDB().get(sql, [email, passw]);
			if (!row)
				return reply.code(404).send({ message: "email or password invalid" });
			console.log(row);
			return reply.code(200).send(row);
		}
		catch (err) {
			console.error(`database err: ${err}`);
			return reply.code(500).send({ message: `database error ${err}` });
		}
	})

	fastify.post('/logout', async (request: any, reply: any) => {
		const { user_id } = request.body;

		const res = await mgmt.logoutUser(user_id, getDB());
		return reply.code(res.code).send(res.data);
	})

	fastify.post('/set_status', async (request:any, reply:any) => {
		const { user_id, newStatus } = request.body;

		const res = await mgmt.setUserStatus(user_id, newStatus, getDB());
		return reply.code(res.code).send(res.data);
	})

	fastify.post('/upload/avatar', async (request, reply) => {
		return mgmt.uploadAvatar(request, reply, getDB());
	})

	fastify.post('/update', async (request: FastifyRequest, reply: FastifyReply) => {
		return await mgmt.updateUserReq(request, reply, getDB());
	})

	fastify.post('/block/:id/:username', async (request: FastifyRequest, reply: FastifyReply) => {
		const { id, username } = request.params as { id: number, username: string };
		console.log(request.params, id, username);

		const res = await mgmt.blockUser(id, username, getDB());
		return reply.code(res.code).send(res.data);
	})

	fastify.delete('/unblock/:id/:username', async (request: FastifyRequest, reply: FastifyReply) => {
		const { id, username } = request.params as { id: number, username: string };

		const res = await mgmt.unBlockUser(id, username, getDB());
		return reply.code(res.code).send(res.data);
	})
}
