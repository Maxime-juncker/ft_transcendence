import { FastifyReply, FastifyRequest } from 'fastify';
import { Database } from 'sqlite'
import { DbResponse } from '@core/core.js';

export interface GameRes {
	user1_name:		string;
	user2_name:		string;
	user1_score:	number;
	user2_score:	number;
}

export async function updateUserStats(user: any, win: boolean, db: Database)
{
	const sql = "UPDATE users SET games_played = games_played + 1 WHERE id = ?";
	const winSql = "UPDATE users SET wins = wins + 1 WHERE id = ?";
	try {
		await db.run(sql, [user.id]);
		if (win)
			await db.run(winSql, [user.id]);
	}
	catch (err) {
		console.error(`database err: ${err}`);
		return 500;
	}
}

export async function getUserByName(username: string, db: Database) : Promise<DbResponse>
{
	const sql = 'SELECT id, name, avatar, elo, status, is_login FROM users WHERE name = ?';
	try {
		const row = await db.get(sql, [username])
		if (!row)
			return { code: 404, data: { message: "profile not found" } };
		return { code: 200, data: row };
	}
	catch (err) {
		console.error(`database err: ${err}`);
		return { code: 500, data: { message: `database error ${err}` }};
	}
}

export async function addGameToHist(game: GameRes, db: Database) : Promise<DbResponse>
{
	var res1 = await getUserByName(game.user1_name, db);
	var res2 = await getUserByName(game.user2_name, db);
	if (res1.code != 200 || res2.code != 200)
		return { code: 404, data: { message: "user not found" }};
	if (res1.data.id > res2.data.id)
	{
		[res1, res2] = [res2, res1];
		[game.user1_score, game.user2_score] = [game.user2_score, game.user1_score];
	}
	const sql = "INSERT INTO games (user1_id, user2_id, user1_score, user2_score, created_at) VALUES(?, ?, ?, ?, ?);";
	const date = new Date(new Date().toLocaleString("en-US", {timeZone: "Europe/Paris"})).toISOString().slice(0, 19).replace('T', ' ');
	try {
		const response = await db.run(sql, [res1.data.id, res2.data.id, game.user1_score, game.user2_score, date]);
		console.log(`added game to history. id: ${response.lastID}`);
		await updateUserStats(res1.data, game.user1_score > game.user2_score, db);
		await updateUserStats(res2.data, game.user2_score > game.user1_score, db);

		return { code: 200, data: { message: "Success" }};
	}
	catch (err) {
		console.error(`database err: ${err}`);
		return { code: 500, data: { message: "Database Error" }};
	}
}

export async function getUserStats(username: string, db: Database) : Promise<[ number, any ]>
{
	const sql = "SELECT elo, wins, games_played FROM users WHERE name = ?";
	try {
		const row = await db.get(sql, [username]);
		if (!row)
			return [404, { message: "user not found" }];
		return [ 200, row ];
	}
	catch (err) {
		console.error(`database err: ${err}`)
		return [500, { message: "database error" }];
	}
}

export async function getUserHistByName(request: FastifyRequest, reply: FastifyReply, db: Database)
{
	const { username } = request.params as { username: string };
	const res = await getUserByName(username, db);
	const id = res.data.id;
	const sql = "SELECT * FROM games WHERE user1_id = ? OR user2_id = ?";
	try {
		const rows = await db.all(sql, [id, id]);
		if (!rows || rows.length === 0) {
			console.log('no games found');
			return reply.code(404).send({ message: 'no games :(' });
		}

		console.log(rows);
		return reply.code(200).send(rows);

	}
	catch (err) {
		console.error(`database err: ${err}`);
		return reply.code(500).send({ message: `database error ${err}` });
	}
}

export async function getUserById(user_id: number, db: Database) : Promise<DbResponse>
{
	const sql = 'SELECT id, name, avatar, status, is_login, source, rank FROM users WHERE id = ?';

	try {
		const row = await db.get(sql, [user_id])
		if (!row)
			return { code: 404, data: { message: "profile not found" }};
		return { code: 200, data: row};
	}
	catch (err) {
		console.error(`database err: ${err}`);
		return { code: 500, data: { message: "Database Error" }};
	}
}

export async function getUserByNameReq(request: FastifyRequest, reply: FastifyReply, db: Database)
{
	const { profile_name }  = request.query as { profile_name: string };
	const response = await getUserByName(profile_name, db);
	return reply.code(response.code).send(response.data);
}

export async function getBlockedUsrById(id: number, db: Database) : Promise<DbResponse>
{
	const sql = "SELECT user2_id FROM blocked_usr WHERE user1_id = ?";
	try {
		const rows = await db.all(sql, [id]);
		if (!rows || rows.length == 0)
			return { code: 404, data: { message: "no blocked users" }};
		return { code: 200, data: rows };
	}
	catch (err) {
		console.log(`Database error: ${err}`);
		return { code: 500, data: { message: "Database Error" }};
	}

}
