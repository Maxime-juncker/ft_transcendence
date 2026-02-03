import { Database } from "sqlite";
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';
import path from 'path';
import { FastifyRequest } from 'fastify';
import { randomBytes } from "crypto";

import { core, DbResponse } from 'core/server.js';
import { getUserById, getUserByName, getUserByEmail } from "./user.js";
import { hashString } from "modules/sha256.js";
import { check_totp } from "modules/2fa/totp.js";
import { AuthSource } from "modules/oauth2/routes.js";
import { getSqlDate } from "utils.js";
import { jwtVerif } from "modules/jwt/jwt.js";
import { Logger } from "modules/logger.js";
import { getUserName } from "./user.js";

/**
* check if passw is valid
* pass policy:
*	- at least 3 characters
*	- at least 1 upper char
*	- at least 1 lower char
*	- at least 1 number
*/
function checkPasswPolicy(passw: string): DbResponse
{
	if (passw.length < 3)
		return { code: 403, data: { message: "password must be at least 3 character" }};

	if (!passw.match(/[A-Z]/g))
		return { code: 403, data: { message: "at least 1 upper character is needed" }};

	if (!passw.match(/[a-z]/g))
		return { code: 403, data: { message: "at least 1 lower character is needed" }};

	if (!passw.match(/[0-9]/g))
		return { code: 403, data: { message: "at least 1 number is needed" }};

	return { code: 200, data: { message: "ok" }};
}

async function validateCreationInput(email: string, name: string, passw: string): Promise<DbResponse>
{
	const retval = checkPasswPolicy(passw);
	if (retval.code != 200)
		return retval;

	if (!validate_email(email))
		return { code: 403, data: { message: "email is invalid" }};
	if (!validate_name(name))
		return { code: 403, data: { message: "name is invalid" }};

	if (name.length <= 0)
		return { code: 403, data: { message: `name is too short` }};
	if (name.length > 35)
		return { code: 403, data: { message: `name is too long` }};

	if (await isUsernameTaken(name))
	{
		Logger.warn(`${name} is already in database`);
		return { code: 403, data: { message: `this username is already taken` }};
	}

	if (await isEmailTaken(email))
	{
		Logger.warn(`${email} is already associated to an account`);
		return { code: 403, data: { message: `this email is already taken` }};
	}

	return { code: 200, data: { message: "ok" }};
}

async function isEmailTaken(email: string): Promise<boolean>
{
	var res = await getUserByEmail(email);
	return res.code != 404;
}

async function isUsernameTaken(name: string): Promise<boolean>
{
	const res = await getUserByName(name, core.db);	
	return res.code != 404;
}

function validate_email(email: string)
{
	return String(email)
	.toLowerCase()
	.match(
		/^[^\s@]+@[^\s@]+\.[^\s@]+$/
	);
}

function validate_name(name: string): boolean
{
	const regex = /[\W]/g;
	const match = name.match(regex)

	return match ? false : true;
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
		await updateAvatarPath(data.id, 'default.webp');
		return { code: 200, data: data};
	}
	catch (err)
	{
		Logger.error(`database err: ${err}`);
		return { code: 500, data: { message: "Database Error" }};
	}

}

export async function loginSession(token: string) : Promise<DbResponse>
{
	const data: any = await jwtVerif(token, core.sessionKey);
	if (!data)
	{
		Logger.error(`invalid token ${data}`);
		return { code: 400, data: { message: "jwt token invalid" }};
	}

	var id = data.id
	var sql = 'UPDATE users SET is_login = 1 WHERE id = ? RETURNING *';

	try {
		const row = await core.db.get(sql, [id]);
		if (!row)
			return { code: 404, data: { message: "user not found"}};
		return { code: 200, data: row};
	}
	catch (err) {
		Logger.error(`database err: ${err}`);
		return { code: 500, data: { message: "Database Error" }};
	}
}

export async function login(email: string, passw: string, totp: string) : Promise<DbResponse>
{
	var sql = 'UPDATE users SET is_login = 1 WHERE email = ? AND passw = ? RETURNING *';

	const hash = await hashString(passw);

	try {
		const row = await core.db.get(sql, [email, hash]);
		if (!row)
			return { code: 404, data: { message: "email or password invalid"}};
		else if (row.totp_enable == 1 && !check_totp(row.totp_seed, totp))
			return { code: 404, data: { message: "totp invalid"}};
		if (row.source == AuthSource.GUEST)
			return { code: 404, data: { message: "cannot login as guest profile"}};

		return { code: 200, data: row};
	}
	catch (err) {
		Logger.error(`database err: ${err}`);
		return { code: 500, data: { message: "Database Error" }};
	}
}

export async function findOAuth2User(id: string, source: number)
{
	var sql = 'SELECT * from users WHERE oauth_id = ? AND source = ?';
	try {
		const row = await core.db.get(sql, [id, source]);
		if (!row)
			return { code: 404, data: { message: "user not found" }};
		return { code: 200, data: row}
	}
	catch (err) {
		Logger.error(`database err: ${err}`);
		return { code: 500, data: { message: `database error: ${err}` }};
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
		Logger.error(`database err: ${err}`);
		return { code: 500, data: { message: `database error: ${err}` }};
	}
}

export async function createUserOAuth2(email: string, name: string, id: string, source: number, avatar: string, db: Database) : Promise<DbResponse>
{
	if (await isUsernameTaken(name))
	{
		const rBytes = randomBytes(4).toString('hex');
		name = `${name}${rBytes}`;
	}

	const res = await loginOAuth2(id, source, db);
	if (res.code == 200)
		return { code: 200, data: { message: "User already in db" }};

	const sql = 'INSERT INTO users (name, email, oauth_id, source, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?)';
	try {
		const result = await db.run(sql, [name, email, id, source, avatar, getSqlDate()]);
		Logger.log(`Inserted row with id ${result.lastID}`);
		core.userCount++;
		return { code: 200, data: { message: "Success" }};
	}
	catch (err) {
		Logger.error(`database err: ${err}`);
		return { code: 500, data: { message: `database error: ${err}` }};
	}
}

export async function createUser(email: string, passw: string, username: string, source: AuthSource, db: Database) : Promise<DbResponse>
{
	if (source == AuthSource.INTERNAL)
	{
		const validation = await validateCreationInput(email, username, passw);
		if (validation.code != 200)
			return validation;
	}

	const sql = 'INSERT INTO users (name, email, passw, source, created_at) VALUES (?, ?, ?, ?, ?)';
	const res = await getUserByName(username, core.db);	
	if (res.code != 404)
	{
		Logger.warn(`${username} is already in database`);
		return { code: 409, data: { message: "user is already in database" }};
	}

	const hash = await hashString(passw)

	try
	{
		const result = await db.run(sql, [username, email, hash, source, getSqlDate()]);
		if (!result.lastID)
			throw new Error("failed to create user");

		Logger.success(`${username} has been register with id: ${result.lastID}`);
		core.userCount++;
		await updateAvatarPath(result.lastID, 'default.webp');
		return { code: 200, data: { message: "Success", id: result.lastID }};
	}
	catch (err)
	{
		Logger.error(`database err: ${err}`);
		return { code: 500, data: { message: `database error: ${err}` }};
	}
}

export async function resetUser(user_id: number)
{
	var sql = "UPDATE users SET elo = 1000, wins = 0, games_played = 0 WHERE id = ?";
	try
	{
		Logger.debug("deleting", await getUserName(user_id));
		await core.db.run(sql, user_id);
		sql = "DELETE FROM friends WHERE user1_id = ? OR user2_id = ?";
		await core.db.run(sql, [user_id, user_id]);
		sql = "DELETE FROM games WHERE user1_id = ? OR user2_id = ?";
		await core.db.run(sql, [user_id, user_id]);
		Logger.success(`user: ${await getUserName(user_id)} has reseted his account`);
		return { code: 200, data: { message: "Success" }};
	}
	catch (err)
	{
		Logger.error(`Database Error: ${err}`);
		return { code: 500, data: { message: "Database Error" }};
	}
}

export async function deleteUser(user_id: number, db: Database) : Promise<DbResponse>
{
	var res = await getUserById(user_id, db);
	if (res.code != 200)
	{
		Logger.error(`deleting none existing user in deleteUser? id: ${user_id}`);
		return res; // should not happen
	}

	const rBytes = randomBytes(64).toString('hex');
	const name = `DELETED_USER${user_id}${randomBytes(2).toString('hex')}`
	const sql = "UPDATE users SET name = ?, email = ?, passw = ?, oauth_id = ?, source = ? WHERE id = ?";
	try
	{
		await updateAvatarPath(user_id, 'default.webp');
		await db.run(sql, [name, rBytes, rBytes, rBytes, AuthSource.DELETED, user_id]);
		Logger.success(`user has been deleted`)
		return { code: 200, data: { message: "Success" }};
	}
	catch (err)
	{
		Logger.error(`Database Error: ${err}`);
		return { code: 500, data: { message: "Database Error" }};
	}
}

export async function logoutUser(user_id: number, db: Database) : Promise<DbResponse>
{
	Logger.log(await getUserName(user_id), "is login out");
	const res = await getUserById(user_id, db);
	if (res.code != 200)
	{
		Logger.error(`login out none existing user in logoutUser? id: ${user_id}`);
		return res; // should not happen
	}

	const sql = "UPDATE users SET is_login = 0 WHERE id = ?";

	try {
		await db.run(sql, [user_id]);
		return { code: 200, data: { message: "Success" }};
	}
	catch (err) {
		Logger.error(`database err: ${err}`);
		return { code: 500, data: { message: `database error ${err}` }};
	}
}

export async function setUserStatus(user_id: number, newStatus: number, db: Database) : Promise<DbResponse>
{
	const sql = "UPDATE users SET status = ? WHERE id = ?;";
	try {
		await db.run(sql, [newStatus, user_id]);
		return { code: 200, data: { message: "Success" }};
	}
	catch (err) {
		Logger.error(`database err: ${err}`);
		return { code: 500, data: { message: `database error ${err}` }};
	}
}

export async function updateAvatarPath(id: number, filename: string)
{
	const sql = "UPDATE users SET avatar = ? WHERE id = ?";
	await core.db.run(sql, ["/public/avatars/" + filename , id]);
}

export async function uploadAvatar(request: FastifyRequest, reply: any, id: number)
{
	const data = await request.file();
	if (!data)
		return reply.code(400).send({ message: "no file uploaded" });

	const res = await getUserById(id, core.db);
	if (res.code != 200)
		return reply.code(res.code).send(res.data);

	const filename = await hashString(res.data.email) + await hashString(data.filename);
	const filepath = path.join("/var/www/server/public/avatars/", filename);

	try
	{
		await pipeline(data.file, createWriteStream(filepath));
		await updateAvatarPath(Number(res.data.id), filename);

		Logger.log(`${res.data.name} has changed is avatar. location=${filepath}`);

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
		Logger.error(`${error}`);
		return reply.code(500).send({ error: "failed to upload file" });
	}
}

export async function blockUser(userId: number, target: number, db: Database) : Promise<DbResponse>
{

	const sender = userId;
	if (Number(userId) > Number(target))
		[userId, target] = [target, userId];
	const sql = "INSERT INTO blocked_usr (user1_id, user2_id, blocked_by) VALUES(?, ?, ?)";
	try
	{
		await db.run(sql, [userId, target, sender]);
		return { code: 200, data: { message: "Success" }};
	}
	catch (err: any)
	{
		Logger.error(`Database error: ${err}`);
		if (err.code === "SQLITE_CONSTRAINT")
			return { code: 500, data: { message: "user already blocked" }};

		return { code: 500, data: { message: "Database Error" }};
	}
}

export async function unBlockUser(userId: number, target: number, db: Database) : Promise<DbResponse>
{
	if (Number(userId) > Number(target))
		[userId, target] = [target, userId];
	const sql = "DELETE from blocked_usr WHERE user1_id = ? AND user2_id = ?";
	try
	{
		await db.run(sql, [userId, target]);
		return { code: 200, data: { message: "Success" }};
	}
	catch (err: any)
	{
		Logger.error(`Database error: ${err}`);
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
		Logger.error(`Database error: ${err}`);
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
	catch (err: any)
	{
		Logger.error(`Database error: ${err}`);
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
	catch (err: any)
	{
		Logger.error(`Database error: ${err}`);
		if (err.code === "SQLITE_CONSTRAINT")
			return { code: 500, data: { message: "email already taken" }};
		return { code: 500, data: { message: "Database Error" }};
	}
}
