import { Database } from "sqlite";
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';
import path from 'path';
import { FastifyRequest, FastifyReply } from 'fastify';
import { randomBytes } from "crypto";

import * as core from '@core/core.js';
import { DbResponse, uploadDir } from "@core/core.js";
import { getUserById, getUserByName } from "./user.js";
import { hashString } from "@modules/sha256.js";
import { check_totp } from "@modules/2fa/totp.js";
import { AuthSource } from "@modules/oauth2/routes.js";
import { getSqlDate } from "utils.js";


function validate_email(email:string)
{
	return String(email)
	.toLowerCase()
	.match(
		/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
	);
}

export async function createGuest(): Promise<DbResponse>
{
	const sql = "INSERT INTO users (name, source, created_at) VALUES (?, ?, ?) RETURNING id";
	try
	{

		const date = getSqlDate();
		const highest = await core.db.get("SELECT MAX(id) FROM users;");
		const rBytes = randomBytes(8).toString('hex');
		const name = `guest${highest["MAX(id)"]}${rBytes}`;
		const data = await core.db.get(sql, [name, AuthSource.GUEST, date]);
		await updateAvatarPath(data.id, 'default.png');
		return { code: 200, data: data};
	}
	catch (err)
	{
		console.error(`database err: ${err}`);
		return { code: 500, data: { message: "Database Error" }};
	}

}

export async function loginSession(id: string, db: Database) : Promise<DbResponse>
{
	var sql = 'UPDATE users SET is_login = 1 WHERE id = ? RETURNING *';

	try {
		const row = await core.db.get(sql, [id]);
		if (!row)
			return { code: 404, data: { message: "user not found"}};
		return { code: 200, data: row};
	}
	catch (err) {
		console.error(`database err: ${err}`);
		return { code: 500, data: { message: "Database Error" }};
	}
}

export async function login(email: string, passw: string, totp: string, db: Database) : Promise<DbResponse>
{
	var sql = 'UPDATE users SET is_login = 1 WHERE email = ? AND passw = ? RETURNING *';

	try {
		const row = await core.db.get(sql, [email, passw]);
		if (!row)
			return { code: 404, data: { message: "email or password invalid"}};
		else if (row.totp_enable == 1 && !check_totp(row.totp_seed, totp))
			return { code: 404, data: { message: "totp invalid"}};
		if (row.source == AuthSource.GUEST)
			return { code: 404, data: { message: "cannot login as guest profile"}};

		return { code: 200, data: row};
	}
	catch (err) {
		console.error(`database err: ${err}`);
		return { code: 500, data: { message: "Database Error" }};
	}
}

export async function loginOAuth2(id: string, source: number, db: Database) : Promise<DbResponse>
{
	var sql = 'UPDATE users SET is_login = 1 WHERE oauth_id = ? AND source = ? RETURNING *';
	try {
		const row = await db.get(sql, [id, source]);
		if (!row)
			return { code: 404, data: { message: "user not found" }};
		return { code: 200, data: row}
	}
	catch (err) {
		console.error(`database err: ${err}`);
		return { code: 500, data: { message: `database error: ${err}` }};
	}
}

export async function createUserOAuth2(email: string, name: string, id: string, source: number, avatar: string, db: Database) : Promise<DbResponse>
{
	const sql = 'INSERT INTO users (name, email, oauth_id, source, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?)';

	try {
		const result = await db.run(sql, [name, email, id, source, avatar, getSqlDate()]);
		console.log(`Inserted row with id ${result.lastID}`);
		return { code: 200, data: { message: "Success" }};
	}
	catch (err) {
		console.error(`database err: ${err}`);
		return { code: 500, data: { message: `database error: ${err}` }};
	}
}

export async function updateUserRank(userId: number, newRank: number, login: string) : Promise<DbResponse>
{
	const res = await getUserById(userId, core.db);
	if (res.code != 200) return res;

	if (res.data.rank < newRank)
		return { code: 403, data: { message: "permission denied" }}
}

export async function createUser(email: string, passw: string, username: string, source: AuthSource, db: Database) : Promise<DbResponse>
{
	const sql = 'INSERT INTO users (name, email, passw, source, created_at) VALUES (?, ?, ?, ?, ?)';
	console.log("creating", username);

	if (!validate_email(email) && source == AuthSource.INTERNAL)
		return { code: 403, data: { message: "error: email not valid" }};
	const res = await getUserByName(username, core.db);	
	if (res.code != 404)
		return { code: 409, data: { message: "alias already taken" }};

	try {
		const result = await db.run(sql, [username, email, passw, source, getSqlDate()]);
		console.log(`Inserted row with id ${result.lastID}`);
		await updateAvatarPath(result.lastID, 'default.png');
		return { code: 200, data: { message: "Success", id: result.lastID }};
	}
	catch (err) {
		console.error(`database err: ${err}`);
		return { code: 500, data: { message: `database error: ${err}` }};
	}
}

export async function resetUser(user_id: number)
{
	var sql = "UPDATE users SET elo = 1000, wins = 0, games_played = 0 WHERE id = ?";
	try
	{
		await core.db.run(sql, user_id);
		sql = "DELETE FROM friends WHERE user1_id = ? OR user2_id = ?";
		await core.db.run(sql, user_id);
		sql = "DELETE FROM games WHERE user1_id = ? OR user2_id = ?";
		await core.db.run(sql, user_id);
		console.log(`user: ${user_id} has reseted his account`);
	}
	catch (err)
	{
		console.log(`Database Error: ${err}`);
		return { code: 500, data: { message: "Database Error" }};
	}
}

export async function deleteUser(user_id: number, db: Database) : Promise<DbResponse>
{
	var res = await getUserById(user_id, db);
	if (res.code != 200)
	{
		console.error("login out none existing user in logoutUser? id:", user_id);
		return res; // should not happen
	}

	const rBytes = randomBytes(64).toString('hex');
	const name = `DELETED_USER${user_id}${randomBytes(2).toString('hex')}`
	const sql = "UPDATE users SET name = ?, email = ?, passw = ?, oauth_id = ? WHERE id = ?";
	try
	{
		await updateAvatarPath(user_id, 'default.png');
		await db.run(sql, [name, rBytes, rBytes, rBytes, user_id]);
		console.log(`user has been deleted`)
		return { code: 200, data: { message: "Success" }};
	}
	catch (err)
	{
		console.log(`Database Error: ${err}`);
		return { code: 500, data: { message: "Database Error" }};
	}
}

export async function logoutUser(user_id: number, db: Database) : Promise<DbResponse>
{
	const res = await getUserById(user_id, db);
	if (res.code != 200)
	{
		console.error("login out none existing user in logoutUser? id:", user_id);
		return res; // should not happen
	}

	const sql = "UPDATE users SET is_login = 0 WHERE id = ?";

	try {
		await db.run(sql, [user_id]);
		return { code: 200, data: { message: "Success" }};
	}
	catch (err) {
		console.error(`database err: ${err}`);
		return { code: 500, data: { message: `database error ${err}` }};
	}
}

export async function setUserStatus(user_id: number, newStatus: string, db: Database) : Promise<DbResponse>
{
	const sql = "UPDATE users SET status = ? WHERE id = ?;";
	try {
		const result = await db.run(sql, [newStatus, user_id]);
		return { code: 200, data: { message: "Success" }};
	}
	catch (err) {
		console.error(`database err: ${err}`);
		return { code: 500, data: { message: `database error ${err}` }};
	}
}

export async function updateAvatarPath(id: number, filename: string)
{
	const sql = "UPDATE users SET avatar = ? WHERE id = ?";
	await core.db.run(sql, ["/public/avatars/" + filename , id]);
}

export async function uploadAvatar(request: FastifyRequest, reply: any, db: Database)
{
	const data = await request.file();
	if (!data)
		return reply.code(400).send({ error: "no file uploaded" });

	const res = await getUserById(request.session.user, db);
	if (res.code != 200)
		return reply.code(res.code).send(res.data);

	const filename = await hashString(res.data.email) + await hashString(data.filename);
	const filepath = path.join("/var/www/server/public/avatars/", filename);

	try
	{
		await pipeline(data.file, createWriteStream(filepath));
		await updateAvatarPath(Number(res.data.id), filename);

		console.log(`${res.data.name} has changed is avatar. location=${filepath}`);

		return {
			Success:	true,
			filename:	filename,
			mimetype:	data.mimetype,
			encoding:	data.encoding,
			path:		filepath
		};
	}
	catch (error)
	{
		console.error(error);
		return reply.code(500).send({ error: "failed to upload file" });
	}
}

export async function blockUser(user_id: number, loginToBlock: string, db: Database) : Promise<DbResponse>
{
	const res = await getUserByName(loginToBlock, db);
	if (res.code != 200)
		return res;

	const sql = "INSERT INTO blocked_usr (user1_id, user2_id) VALUES(?, ?)";
	try {
		await db.run(sql, [user_id, res.data.id]);
		return { code: 200, data: { message: "Success" }};
	}
	catch (err) {
		console.log(`Database error: ${err}`);
		if (err.code === "SQLITE_CONSTRAINT")
			return { code: 500, data: { message: "user already blocked" }};

		return { code: 500, data: { message: "Database Error" }};
	}
}

export async function unBlockUser(user_id: number, loginToUnBlock: string, db: Database) : Promise<DbResponse>
{
	const res = await getUserByName(loginToUnBlock, db);
	if (res.code != 200)
		return res;

	const sql = "DELETE from blocked_usr WHERE user1_id = ? AND user2_id = ?";
	try {
		await db.run(sql, [user_id, res.data.id]);
		return { code: 200, data: { message: "Success" }};
	}
	catch (err) {
		console.log(`Database error: ${err}`);
		return { code: 500, data: { message: "Database Error" }};
	}
}

export async function updatePassw(user_id: number, oldPass: string, newPass: string): Promise<DbResponse>
{
	const sql = "UPDATE users SET passw = ? WHERE id = ? AND passw = ? RETURNING id";
	try
	{
		const row = await core.db.get(sql, [newPass, user_id, oldPass]);
		if (!row)
			return { code: 404, data: { message: "password is incorect" }};
		return { code: 200, data: { message: "password updated" }};
	}
	catch (err)
	{
		console.log(`Database error: ${err}`);
		return { code: 500, data: { message: "Database Error" }};
	}
}

export async function updateName(user_id: number, name: string): Promise<DbResponse>
{
	const sql = "UPDATE users SET name = ? WHERE id = ?";
	try
	{
		await core.db.run(sql, [name, user_id]);
		return { code: 200, data: { message: "name updated" }};
	}
	catch (err)
	{
		console.log(`Database error: ${err}`);
		if (err.code === "SQLITE_CONSTRAINT")
			return { code: 500, data: { message: "username already taken" }};
		return { code: 500, data: { message: "Database Error" }};
	}
}

export async function updateEmail(user_id: number, email: string): Promise<DbResponse>
{
	const sql = "UPDATE users SET email = ? WHERE id = ?";
	try
	{
		await core.db.run(sql, [email, user_id]);
		return { code: 200, data: { message: "name updated" }};
	}
	catch (err)
	{
		console.log(`Database error: ${err}`);
		if (err.code === "SQLITE_CONSTRAINT")
			return { code: 500, data: { message: "email already taken" }};
		return { code: 500, data: { message: "Database Error" }};
	}
}
