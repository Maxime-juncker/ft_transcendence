import { Database } from "sqlite";
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';
import path from 'path';
import { FastifyRequest, FastifyReply } from 'fastify';

import * as core from '@core/core.js';
import { DbResponse, uploadDir } from "@core/core.js";
import { getUserById, getUserByName } from "./user.js";

function validate_email(email:string)
{
	return String(email)
    .toLowerCase()
    .match(
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    );
}

export interface UserUpdate {
	oldName:	string;
	oldPassw:	string;
	name:		string;
	passw:		string;
	email:		string;
}

function hash_string(name: string)
{
	let hash = 0;

	for	(let i = 0; i < name.length; i++)
	{
		let c = name.charCodeAt(i);
		hash = ((hash << 5) - hash) + c;
		hash = hash & hash;
	}
	return hash;
}

export async function loginOAuth2(id: string, source: number, db: Database) : Promise<DbResponse>
{
	var sql = 'UPDATE users SET is_login = 1 WHERE oauth_id = ? AND source = ? RETURNING *';
	try {
		const row = await db.get(sql, [id, source]);
		if (!row)
			return { code: 404, data: { message: "user not found" }};
		console.log(row);
		return { code: 200, data: row}
	}
	catch (err) {
		console.error(`database err: ${err}`);
		return { code: 500, data: { message: `database error: ${err}` }};
	}
}

export async function createUserOAuth2(email: string, name: string, id: string, source: number, avatar: string, db: Database) : Promise<DbResponse>
{
	const sql = 'INSERT INTO users (name, email, oauth_id, source, avatar) VALUES (?, ?, ?, ?, ?)';

	try {
		const result = await db.run(sql, [name, email, id, source, avatar]);
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

export async function createUser(email: string, passw: string, username: string, source: number, db: Database) : Promise<DbResponse>
{
	const sql = 'INSERT INTO users (name, email, passw, source) VALUES (?, ?, ?, ?)';

	if (!validate_email(email))
		return { code: 403, data: { message: "error: email not valid" }};

	try {
		const result = await db.run(sql, [username, email, passw, source]);
		console.log(`Inserted row with id ${result.lastID}`);
		return { code: 200, data: { message: "Success" }};
	}
	catch (err) {
		console.error(`database err: ${err}`);
		return { code: 500, data: { message: `database error: ${err}` }};
	}
}

export async function updateUser(update: UserUpdate, db: Database) : Promise<DbResponse>
{
	console.log(update);

	const sql = "UPDATE users SET name = ?, email = ?, passw = ? WHERE name = ? AND passw = ? RETURNING id";
	try {
		const row = await db.get(sql, [update.name, update.email, update.passw, update.oldName, update.oldPassw]);
		if (!row)
			return { code: 404, data: { message: "user not found" }};
		return { code: 200, data: { message: "Success" }};
	}
	catch (err) {
		console.error(`database err: ${err}`);
		return { code: 500, data: { message: "database error" }};
	}
}

export async function logoutUser(user_id: string, db: Database) : Promise<DbResponse>
{
	const sql = "UPDATE users SET is_login = 0 WHERE id = ?";

	try {
		const result = await db.run(sql, [user_id]);
		console.log(`Inserted row with id ${result.changes}`);
		return { code: 200, data: { message: "Success" }};
	}
	catch (err) {
		console.error(`database err: ${err}`);
		return { code: 500, data: { message: `database error ${err}` }};
	}
}

export async function setUserStatus(user_id: string, newStatus: string, db: Database) : Promise<DbResponse>
{
	const sql = "UPDATE users SET status = ? WHERE id = ?;";
	try {
		const result = await db.run(sql, [newStatus, user_id]);
		console.log(`Inserted row with id ${result.changes}`);
		return { code: 200, data: { message: "Success" }};
	}
	catch (err) {
		console.error(`database err: ${err}`);
		return { code: 500, data: { message: `database error ${err}` }};
	}
}

export async function updateUserReq(request: FastifyRequest, reply: FastifyReply, db: Database)
{
	const { oldName, oldPassw, name, email, passw } = request.body as {
		oldName:	string,
		oldPassw:	string,
		name:		string,
		email:		string,
		passw:		string
	};
	const update: UserUpdate = { oldName, oldPassw, name, email, passw };
	console.log(update);
	const result = await updateUser(update, db);
	return reply.code(result.code).send(result.data);
}

export async function uploadAvatar(request: any, reply: any, db: Database)
{
	const data = await request.file();
	if (!data)
		return reply.code(400).send({ error: "no file uploaded" });

    const email = request.headers['email'] as string;
	const filename = hash_string(email).toString();
	const filepath = path.join(uploadDir, filename);
    const id = request.headers['id'] as string;

	try
	{
		await pipeline(data.file, createWriteStream(filepath));

		const sql = "UPDATE users SET avatar = ? WHERE id = ?";
		await db.run(sql, ["/api/images/" + filename , id]);

		console.log(`${email} has changed is avatar. location=${filepath}`);

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
