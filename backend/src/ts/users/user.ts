import { FastifyReply, FastifyRequest } from 'fastify';
import { Database } from 'sqlite'

export async function getUserByNameAsync(username: string)
{
	const query = { profile_name: username };
	const queryString = new URLSearchParams(query).toString();
	var response = await fetch(`http://localhost:3000/api/get_profile_name?${queryString}`);
	var data = await response.json();
	return data;
}

export async function getUserHistoryByName(request: FastifyRequest, reply: FastifyReply, db: Database)
{
	const { username } = request.params as { username: string };
	const data = await getUserByNameAsync(username);
	const id = data.id;
	const sql = "SELECT * FROM games WHERE user1_id = ? OR user2_id = ?";
	//
	// const rows = await new Promise<any[]>((resolve, reject) => {
	// 	db.all(sql, [id, id], (err, rows) => {
	// 		if (err) reject(err);
	// 			else resolve(rows);
	// 	});
	// });
	//
	// if (!rows || rows.length === 0) {
	// 	console.log('no games found');
	// 	return reply.code(404).send({ message: 'no games :(' });
	// }
	//
	// console.log(rows);
	// return reply.code(200).send(rows);
}

export async function getFriends(request: any, reply: any, db: Database)
{
	const { user_id } = request.query;
	const sql = "select * FROM friends where user1_id = ? or user2_id = ?;";

	try {
		const rows = await db.all(sql, [user_id, user_id]);
		if (!rows)
			return reply.code(404).send({ message: `no friend found :(` });
		return reply.code(200).send(rows);
	}
	catch (err) {
		console.error(`database err: ${err}`);
		return reply.code(500).send({ message: `database error ${err}` });
	}
}

export async function getUserById(request: any, reply: any, db: Database)
{
	const { user_id }  = request.query;
	const sql = 'SELECT id, name, profile_picture, elo, status, is_login FROM users WHERE id = ?';

	try {
		const row = await db.get(sql, [user_id])
		if (!row)
			return reply.code(404).send({ message: "profile not found" });
		return reply.code(200).send(row);
	}
	catch (err) {
		console.error(`database err: ${err}`);
		return reply.code(500).send({ message: `database error ${err}` });
	}
}

export async function getUserByName(request: any, reply: any, db: Database)
{
	const { profile_name }  = request.query;
	const sql = 'SELECT id, name, profile_picture, elo, status, is_login FROM users WHERE name = ?';

	try {
		const row = await db.get(sql, [profile_name])
		if (!row)
			return reply.code(404).send({ message: "profile not found" });
		return reply.code(200).send(row);
	}
	catch(err) {
		console.error(`database err: ${err}`);
		return reply.code(500).send({ message: `database error ${err}` });
	}
}
