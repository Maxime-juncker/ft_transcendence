import { Database } from "sqlite";
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
import { updateAvatarPath } from "./avatars.js";

/**
* check if passw is valid
* pass policy:
*	- at least 3 characters
*	- at least 1 upper char
*	- at least 1 lower char
*	- at least 1 number
*/
function validatePassw(passw: string): DbResponse
{
	if (passw.length > 75)
		return { code: 403, data: { message: "password too long" }};

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
	var retval = validatePassw(passw);
	if (retval.code != 200)
		return retval;

	retval = await validateName(name);
	if (retval.code != 200)
		return retval;

	retval = await validateEmail(email);
	if (retval.code != 200)
		return retval;

	return { code: 200, data: { message: "ok" }};
}

async function isEmailTaken(email: string): Promise<number>
{
	var res = await getUserByEmail(email);
	return res.code == 404 ? -1 : res.data.id;
}

async function isUsernameTaken(name: string): Promise<number>
{
	const res = await getUserByName(name, core.db);	
	return res.code == 404 ? -1 : res.data.id;
}

async function validateEmail(email: string): Promise<DbResponse>
{
	if (email.length <= 0)
		return { code: 403, data: { message: "email empty" }};

	if (email.length > 75)
		return { code: 403, data: { message: "email too long" }};

	if (!String(email).toLowerCase().match(
		/^[^\s@]+@[^\s@]+\.[^\s@]+$/))
		return { code: 403, data: { message: "email is invalid" }};

	const id = await isEmailTaken(email);
	if (id != -1)
	{
		Logger.warn(`${email} is already associated to an account`);
		return { code: 403, data: { message: `this email is already taken`, id: id }};
	}

	return { code: 200, data: "ok" };
}

async function validateName(name: string): Promise<DbResponse>
{
	const regex = /[\W]/g;
	const match = name.match(regex)

	if (match)
		return { code: 403, data: { message: "name has invalid characters" }};
	if (name.length <= 0)
		return { code: 403, data: { message: "name too short" }};
	if (name.length > 35)
		return { code: 403, data: { message: "name too long" }};
	const id = await isUsernameTaken(name);
	if (id != -1)
	{
		Logger.warn(`${name} is already in database`);
		return { code: 403, data: { message: `this username is already taken`, id: id }};
	}

	return { code: 200, data: "ok" };
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

export async function setIsLogin(id: number, isLogin: number)
{
	var sql = 'UPDATE users SET is_login = ? WHERE id = ?';
	try
	{
		await core.db.run(sql, [isLogin, id]);
	}
	catch (err)
	{
		Logger.error(`database err: ${err}`);
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
	const retval = await isUsernameTaken(name);
	if (retval != -1)
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

	const hash = await hashString(passw);

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
	try
	{
		// reset games stats
		var sql = "UPDATE users SET elo = 500, wins = 0, games_played = 0 WHERE id = ?";
		await core.db.run(sql, user_id);

		// reset friends
		sql = "DELETE FROM friends WHERE user1_id = ? OR user2_id = ?";
		await core.db.run(sql, [user_id, user_id]);

		// reset blocked users
		sql = "DELETE FROM blocked_usr WHERE user1_id = ? OR user2_id = ?";
		await core.db.run(sql, [user_id, user_id]);

		// reset history
		sql = "DELETE FROM matches WHERE player1_id = ? OR player2_id = ?";
		await core.db.run(sql, [user_id, user_id]);

		// reset avatar
		await updateAvatarPath(user_id, 'default.webp');

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
	Logger.debug(oldPass, newPass);
	const retval = validatePassw(newPass);
	if (retval.code != 200)
		return retval;
	
	const oldHash = await hashString(oldPass);
	const newHash = await hashString(newPass);
	const sql = "UPDATE users SET passw = ? WHERE id = ? AND passw = ? RETURNING id";
	try
	{
		const row = await core.db.get(sql, [newHash, user_id, oldHash]);
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
	const retval = await validateName(name);
	if (retval.code != 200)
	{
		// changing user name by same name of same user
		if (retval.data.id == user_id)
		{
			return { code: 200, data: { message: "name unchanged" }};
		}

		return retval;
	}
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
	const retval = await validateEmail(email);
	if (retval.code != 200)
	{
		// changing user email by same email of same user
		if (retval.data.id == user_id)
		{
			return { code: 200, data: { message: "email unchanged" }};
		}

		return retval;
	}

	const sql = "UPDATE users SET email = ? WHERE id = ?";
	try
	{
		await core.db.run(sql, [email, user_id]);
		return { code: 200, data: { message: "email updated" }};
	}
	catch (err: any)
	{
		Logger.error(`Database error: ${err}`);
		if (err.code === "SQLITE_CONSTRAINT")
			return { code: 500, data: { message: "email already taken" }};
		return { code: 500, data: { message: "Database Error" }};
	}
}

export async function getBot(): Promise<number>
{
    try
    {
        const sql = 'SELECT id FROM users WHERE source = ?';
        const row = await core.db.get(sql, AuthSource.BOT);
        if (!row)
            return -1;
        return row.id;

    }
    catch (err)
    {
        Logger.error(`database err: ${err}`);
        return -1;
    }
}
