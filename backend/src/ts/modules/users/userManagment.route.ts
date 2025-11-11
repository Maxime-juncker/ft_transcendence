import { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify'
import * as core from '@core/core.js';
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
		const res = await mgmt.createUser(email, passw, username, 0, core.db);
		return reply.code(res.code).send(res.data);
	})

	// TODO: store session in login
	fastify.post('/login', async (request: FastifyRequest, reply: FastifyReply) => {
		const { email, passw } = request.body as { email: string, passw: string };
		var sql = 'UPDATE users SET is_login = 1 WHERE email = ? AND passw = ? RETURNING *';

		try {
			const row = await core.db.get(sql, [email, passw]);
			if (!row)
				return reply.code(404).send({ message: "email or password invalid" });
			console.log(row);
			// request.session.user = { row.name };
			return reply.code(200).send(row);
		}
		catch (err) {
			console.error(`database err: ${err}`);
			return reply.code(500).send({ message: `database error ${err}` });
		}
	})

	fastify.post('/logout', async (request: any, reply: any) => {
		const { user_id } = request.body;

		const res = await mgmt.logoutUser(user_id, core.db);
		return reply.code(res.code).send(res.data);
	})

	fastify.post('/set_status', async (request:any, reply:any) => {
		const { user_id, newStatus } = request.body;

		const res = await mgmt.setUserStatus(user_id, newStatus, core.db);
		return reply.code(res.code).send(res.data);
	})

	fastify.post('/upload/avatar', async (request, reply) => {
		return mgmt.uploadAvatar(request, reply, core.db);
	})

	fastify.post('/update', async (request: FastifyRequest, reply: FastifyReply) => {
		return await mgmt.updateUserReq(request, reply, core.db);
	})

	fastify.post('/block/:id/:username', async (request: FastifyRequest, reply: FastifyReply) => {
		const { id, username } = request.params as { id: number, username: string };

		const res = await mgmt.blockUser(id, username, core.db);
		return reply.code(res.code).send(res.data);
	})

	fastify.delete('/unblock/:id/:username', async (request: FastifyRequest, reply: FastifyReply) => {
		const { id, username } = request.params as { id: number, username: string };

		const res = await mgmt.unBlockUser(id, username, core.db);
		return reply.code(res.code).send(res.data);
	})
}
