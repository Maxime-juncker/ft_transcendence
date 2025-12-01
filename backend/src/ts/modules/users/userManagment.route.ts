import { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify'
import * as core from '@core/core.js';
import * as mgmt from '@modules/users/userManagment.js'

//
// User managment
//
export async function userManagmentRoutes(fastify: FastifyInstance, options: FastifyPluginOptions)
{
	fastify.get('/get_session', async (request: any, reply) => {
		if (request.session.user) {
			const res = await mgmt.loginSession(request.session.user, core.db);
			console.log("user is already auth as:", res.data.name);
			return reply.code(res.code).send(res.data);
		}
		else {
			console.log("user not login");
			return reply.code(404).send({ message: "user need to login" });
		}
	})

	fastify.post('/create_guest', async (request: any, reply: FastifyReply) => {
		const res = await mgmt.createGuest();
		if (res.code == 200)
		{
			request.session.user = res.data.id;
			return reply.code(res.code).send({ message: "Success" });
		}

		return reply.code(res.code).send(res.data);
	})

	fastify.post('/guest_cli', async (request: any, reply: FastifyReply) => {
		const res = await mgmt.createGuest();
		return reply.code(res.code).send(res);
	})


	fastify.post('/create', async (request: any, reply: any) => {
		const { email, passw, username } = request.body as {
			email: string,
			passw: string,
			username: string
		};
		const res = await mgmt.createUser(email, passw, username, 0, core.db);
		return reply.code(res.code).send(res.data);
	})

	fastify.post('/login', async (request: any, reply: FastifyReply) => {
		const { email, passw, totp } = request.body as { email: string, passw: string, totp: string };
		const res = await mgmt.login(email, passw, totp, core.db);
		if (res.code == 200)
		{
			request.session.user = res.data.id;
			return reply.code(200).send({ message: "Success" });
		}
		return reply.code(res.code).send(res.data);
	})

	fastify.post('/logout', async (request: any, reply: any) => {
		const { user_id } = request.body;

		const res = await mgmt.logoutUser(user_id, core.db);
		if (res.code == 200)
			request.session.destroy(); // destroy session or user will be reconnected
		return reply.code(res.code).send(res.data);
	})

	fastify.delete('/delete', async (request: FastifyRequest, reply: FastifyReply) => {
		const { user_id } = request.body as { user_id: number }

		const res = await mgmt.deleteUser(user_id, core.db);
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
		if (res.code == 200)
			request.session.destroy(); // destroy session or user will be reconnected
		return reply.code(res.code).send(res.data);
	})
}
