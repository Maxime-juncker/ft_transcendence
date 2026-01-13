import { FastifyReply, FastifyRequest } from 'fastify';
import { Database } from 'sqlite'
import { DbResponse } from '@core/core.js';
import * as core from '@core/core.js';

export interface GameRes {
	user1_id:		number;
	user2_id:		number;
	user1_score:	number;
	user2_score:	number;
}

export async function updateUserStats(id: number, win: boolean, db: Database)
{
	const sql = "UPDATE users SET games_played = games_played + 1 WHERE id = ?";
	const winSql = "UPDATE users SET wins = wins + 1 WHERE id = ?";
	try {
		await db.run(sql, [id]);
		if (win)
			await db.run(winSql, [id]);
	}
	catch (err) {
		console.error(`database err: ${err}`);
		return 500;
	}
}

export async function getUserByName(username: string, db: Database) : Promise<DbResponse>
{
	const sql = 'SELECT id, name, avatar, status, is_login, source, created_at, elo, games_played, wins, rank FROM users WHERE name = ?';

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
	var id1 = game.user1_id;
	var id2 = game.user2_id;

	if (id1 > id2)
	{
		[id1, id2] = [id2, id1];
		[game.user1_score, game.user2_score] = [game.user2_score, game.user1_score];
	}
	var sql = "INSERT INTO games (user1_id, user2_id, user1_score, user2_score, created_at, user1_elo, user2_elo) VALUES(?, ?, ?, ?, ?, ?, ?);";
	var sql_elo = "UPDATE users SET elo = elo + ? WHERE id = ? RETURNING elo";
	const date = new Date(new Date().toLocaleString("en-US", {timeZone: "Europe/Paris"})).toISOString().slice(0, 19).replace('T', ' ');
	try {
		var user1Elo;
		var user2Elo;
		if (game.user1_score > game.user2_score) // user1 has won
		{
			user1Elo = await db.get(sql_elo, [10, id1]);
			user2Elo = await db.get(sql_elo, [-10, id2]);
		}
		else
		{
			user1Elo = await db.get(sql_elo, [-10, id1]);
			user2Elo = await db.get(sql_elo, [10, id2]);
		}
		
		if (!user1Elo || !user2Elo) {
			console.log(`One or both users not found (id1: ${id1}, id2: ${id2}), skipping history save.`);
			return { code: 404, data: { message: "One or both users not found." } };
		}

		console.log(user1Elo, user2Elo)

		const response = await db.run(sql, [id1, id2, game.user1_score, game.user2_score, date, user1Elo.elo, user2Elo.elo]);
		console.log(`added game to history. id: ${response.lastID}`);
		await updateUserStats(id1, game.user1_score > game.user2_score, db);
		await updateUserStats(id2, game.user2_score > game.user1_score, db);

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
	const sql = 'SELECT id, name, avatar, status, is_login, source, created_at, elo, games_played, wins, rank FROM users WHERE id = ?';

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
	const sql = "SELECT * FROM blocked_usr WHERE blocked_by = ?";
	try {
		const rows = await db.all(sql, [id]);
		if (!rows || rows.length == 0)
			return { code: 200, data: [] };
		return { code: 200, data: rows };
	}
	catch (err) {
		console.log(`Database error: ${err}`);
		return { code: 500, data: { message: "Database Error" }};
	}
}

export async function getUserStatus(id: number): Promise<DbResponse>
{
	const sql = "SELECT status from users WHERE id = ?";
	try
	{
		const row = await core.db.get(sql, [id]);
		if (!row)
			return { code: 404, data: { message: "profile not found" }};
		return { code: 200, data: row };

	}
	catch (err)
	{
		console.log(`Database Error: ${err}`)
		return { code: 500, data: { message: "Database Error" }};
	}
}

export async function getBlockUser(user1: number, user2: number): Promise<DbResponse>
{
	if (Number(user1) > Number(user2))
		[user1, user2] = [user2, user1];
	const sql = "SELECT * from blocked_usr WHERE user1_id = ? AND user2_id = ?";
	try
	{
		const row = await core.db.get(sql, [user1, user2]);
		if (!row)
			return { code: 404, data: "user not blocked" };
		return { code: 200, data: row };
	}
	catch (err)
	{
		console.log(`Database error: ${err}`);
		return { code: 500, data: { message: "Database Error" }};
	}
}

export async function getAllUsers(): Promise<DbResponse>
{
	const sql = 'SELECT id, name, elo, wins, games_played, created_at, avatar, status FROM users;';
	try
	{
		const rows = await core.db.all(sql);
		if (!rows || rows.length == 0)
			return { code: 200, data: [] };
		return { code: 200, data: rows };
	}
	catch (err) {
		console.log(`Database error: ${err}`);
		return { code: 500, data: { message: "Database Error" }};
	}
}

export async function getAllUserIds(): Promise<DbResponse>
{
	const sql = 'SELECT id FROM users;';
	try
	{
		const rows = await core.db.all(sql);
		if (!rows || rows.length == 0)
			return { code: 200, data: [] };
		return { code: 200, data: rows };
	}
	catch (err) {
		console.log(`Database error: ${err}`);
		return { code: 500, data: { message: "Database Error" }};
	}
}
