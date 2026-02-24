import { FastifyReply, FastifyRequest } from 'fastify';
import { Database } from 'sqlite'
import { core, DbResponse, getDateFormated } from 'core/server.js';
import { Logger } from 'modules/logger.js';
import { AuthSource } from 'modules/oauth2/routes.js';
import { Parameters } from 'modules/game/GameInstance.js'

export interface GameRes {
	user1_id:		number;
	user2_id:		number;
	user1_score:	number;
	user2_score:	number;
}

export async function getUserName(id: number): Promise<string>
{
	const sql = "SELECT name FROM users WHERE id = ?";
	try
	{
		const row = await core.db.get(sql, id);
		if (!row)
			return "";
		return row.name;
	}
	catch (err)
	{
		Logger.error(`database error: ${err}`);
		return "";
	}
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
		Logger.error(`database err: ${err}`);
		return 500;
	}
}

export async function getUserByEmail(email: string)
{
	const sql = 'SELECT id, name, avatar, status, is_login, source, created_at, elo, games_played, wins, rank FROM users WHERE email = ? AND source = ?';

	try {
		const row = await core.db.get(sql, [email, AuthSource.INTERNAL])
		if (!row)
			return { code: 404, data: { message: "profile not found" } };
		return { code: 200, data: row };
	}
	catch (err) {
		Logger.error(`database err: ${err}`);
		return { code: 500, data: { message: `database error ${err}` }};
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
		Logger.error(`database err: ${err}`);
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

	var oldElo1, oldElo2;
	try
	{
		const oldEloSql = "SELECT elo FROM users WHERE id = ?";
		oldElo1 = await db.get(oldEloSql, [id1]);
		oldElo2 = await db.get(oldEloSql, [id2]);
		if (!oldElo2 || !oldElo1)
			return { code: 404, data: { message: "profile not found" } };

	}
	catch (err)
	{
		Logger.error('could not retrieve old elo for users', id1, id2);
		Logger.error(`database err: ${err}`);
		return { code: 500, data: { message: "Database Error" }};
	}

	const elo = await calculateElo(oldElo1.elo, oldElo2.elo, game.user1_score, game.user2_score);
	const newElo1 = Math.max(oldElo1.elo + elo, 0);
	const newElo2 = Math.max(oldElo2.elo - elo, 0);

	const sql_elo = "UPDATE users SET elo = ? WHERE id = ? RETURNING elo";
	try {
		const user1Elo = await db.get(sql_elo, [newElo1, id1]);
		const user2Elo = await db.get(sql_elo, [newElo2, id2]);

		const sql = "INSERT INTO matches (tournament_id, player1_id, player2_id, played_at, user1_elo, user2_elo, score1, score2, winner_id) VALUES (-1, ?, ?, ?, ?, ?, ?, ?, ?)"
		const winnerId = game.user1_score > game.user2_score ? id1 : id2;
		const response = await db.run(sql, [id1, id2, getDateFormated(), user1Elo.elo, user2Elo.elo, game.user1_score, game.user2_score, winnerId]);

		Logger.log(`added game to history. id: ${response.lastID} (${id1} <=> ${id2})`, user1Elo.elo, user2Elo.elo);
		await updateUserStats(id1, game.user1_score > game.user2_score, db);
		await updateUserStats(id2, game.user2_score > game.user1_score, db);
		core.gameCount++;

		return { code: 200, data: { message: "Success" }};
	}
	catch (err) {
		Logger.error(`database err: ${err}`);
		return { code: 500, data: { message: "Database Error" }};
	}
}

async function calculateElo(elo1: number, elo2: number, score1: number, score2: number): Promise<number>
{
	let maxPoint = new Parameters().POINTS_TO_WIN || 11;

	const K = 20;
	const scaleFactor = 420;
	const expectedScore = 1.0 / (1.0 + Math.pow(10, (elo2 - elo1) / scaleFactor));
	const diffScore = Math.abs(score1 - score2);
	const gap = 0.5 + (diffScore - 1) * (1.0 / (Math.max(1, maxPoint - 1)));
	const S1 = (score1 > score2) ? 1 : 0;
	return (K * gap * (S1 - expectedScore));
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
		Logger.error(`database err: ${err}`);
		return [500, { message: "database error" }];
	}
}

export async function getUserHistByName(request: FastifyRequest, reply: FastifyReply, db: Database)
{
	const { username } = request.params as { username: string };
	const res = await getUserByName(username, db);
	const id = res.data.id;
	const sql = "SELECT * FROM matches WHERE player1_id = ? OR player2_id = ?"
	try {
		const rows = await db.all(sql, [id, id]);
		if (!rows || rows.length === 0) {
			Logger.log('no games found');
			return reply.code(404).send({ message: 'no games :(' });
		}

		return reply.code(200).send(rows);

	}
	catch (err) {
		Logger.error(`database err: ${err}`);
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
		Logger.error(`database err: ${err}`);
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
		Logger.error(`Database error: ${err}`);
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
		Logger.error(`Database Error: ${err}`)
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
		Logger.error(`Database error: ${err}`);
		return { code: 500, data: { message: "Database Error" }};
	}
}

export async function getAllUsers(pageSize?: number): Promise<DbResponse>
{
	if (!pageSize)
		pageSize = 15;

	const sql = 'SELECT id, name, elo, wins, games_played, created_at, avatar, status FROM users LIMIT ?;';
	try
	{
		const rows = await core.db.all(sql, pageSize);
		if (!rows || rows.length == 0)
			return { code: 200, data: [] };
		return { code: 200, data: rows };
	}
	catch (err) {
		Logger.error(`Database error: ${err}`);
		return { code: 500, data: { message: "Database Error" }};
	}
}

export async function getAllUserIds(pageSize?: number): Promise<DbResponse>
{
	if (!pageSize)
		pageSize = 15;

	const sql = 'SELECT id FROM users LIMIT ?;';
	try
	{
		const rows = await core.db.all(sql, pageSize);
		if (!rows || rows.length == 0)
			return { code: 200, data: [] };
		return { code: 200, data: rows };
	}
	catch (err) {
		Logger.error(`Database error: ${err}`);
		return { code: 500, data: { message: "Database Error" }};
	}
}

export async function getHighestEloUsers(pageSize?: number): Promise<DbResponse>
{
	if (!pageSize)
		pageSize = 5;

	const sql = 'SELECT id FROM users ORDER BY elo DESC LIMIT ?;';
	try
	{
		const rows = await core.db.all(sql, pageSize);
		if (!rows || rows.length == 0)
			return { code: 200, data: [] };
		return { code: 200, data: rows };
	}
	catch (err)
	{
		Logger.error(`Database error: ${err}`);
		return { code: 500, data: { message: "Database Error" }};
	}
}

export async function searchUser(name: string, pageSize?: number): Promise<DbResponse>
{
	if (!pageSize)
		pageSize = 50;

	const sql = "SELECT id FROM users WHERE name LIKE ? LIMIT ?";
	try
	{
		const rows = await core.db.all(sql, [`%${name}%`, pageSize]);
		if (!rows || rows.length == 0)
			return { code: 200, data: [] };
		return { code: 200, data: rows };
	}
	catch (err)
	{
		Logger.error(`Database error: ${err}`);
		return { code: 500, data: { message: "Database Error" }};
	}
}

export async function completeTutorial(id: number): Promise<DbResponse>
{
	var sql = 'UPDATE users SET show_tutorial = 0 WHERE id = ?';
	try
	{
		await core.db.run(sql, id);
		Logger.success(await getUserName(id), "has completed the tutorial")
		return { code: 200, data: { message: "Success" }};
	}
	catch (err)
	{
		Logger.error(`Database error: ${err}`);
		return { code: 500, data: { message: "Database Error" }};
	}
}

export async function getUserCount(): Promise<DbResponse>
{
	const sql = "SELECT COUNT(*) FROM users";
	try
	{
		const row = await core.db.get(sql);
		return { code: 200, data: { message: row }};
	}
	catch (err)
	{
		Logger.error(`Database error: ${err}`);
		return { code: 500, data: { message: "Database Error" }};
	}

}

export async function getGameCount(): Promise<DbResponse>
{
	const sql = "SELECT COUNT(*) FROM matches";
	try
	{
		const row = await core.db.get(sql);
		return { code: 200, data: { message: row }};
	}
	catch (err)
	{
		Logger.error(`Database error: ${err}`);
		return { code: 500, data: { message: "Database Error" }};
	}

}
