import { Database } from "sqlite";
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';
import path from 'path';
import { FastifyRequest, FastifyReply } from 'fastify';
import { DbResponse } from "../server.js";

import { uploadDir } from "../server.js";

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

export async function login_user(request: any, reply: any, db: Database)
{
	const { email, passw } = request.body;
	var sql = 'UPDATE users SET is_login = 1 WHERE email = ? AND passw = ? RETURNING *';

	try {
		const row = await db.get(sql, [email, passw]);
		if (!row)
			reply.code(404).send({ message: "email or password invalid" });
		reply.code(200).send(row);
	}
	catch (err) {
		console.error(`database err: ${err}`);
		return reply.code(500).send({ message: `database error ${err}` });
	}
}

export async function create_user(request: any, reply: any, db: Database)
{
	const { email, passw, username } = request.body;
	const sql = 'INSERT INTO users (name, email, passw, profile_picture, status, is_login) VALUES (?, ?, ?, ?, ?, ?)';

	if (!validate_email(email))
		return reply.code(403).send({ message: "error: email not valid" });

	try {
		const result = await db.run(sql, [username, email, passw, "", 0, 0]);
		console.log(`Inserted row with id ${result.lastID}`);
		return reply.code(200).send({ message: `Success`});;
	}
	catch (err) {
		console.error(`database err: ${err}`);
		return reply.code(500).send({ message: `database error ${err}` });
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

export async function logout_user(request: any, reply:any, db: Database)
{
	const { user_id } = request.body;
	const sql = "UPDATE users SET is_login = 0 WHERE id = ?";

	try {
		const result = await db.run(sql, [user_id]);
		console.log(`Inserted row with id ${result.changes}`);
		return reply.code(200).send({ message: "Success" });
	}
	catch (err) {
		console.error(`database err: ${err}`);
		return reply.code(500).send({ message: `database error ${err}` });
	}
}

export async function set_user_status(request: any, reply: any, db: Database)
{
	const { user_id, newStatus } = request.body;

	const sql = "UPDATE users SET status = ? WHERE id = ?;";
	try {
		const result = await db.run(sql, [newStatus, user_id]);
		console.log(`Inserted row with id ${result.changes}`);
		return reply.code(200).send({ message: "Success" });
	}
	catch (err) {
		console.error(`database err: ${err}`);
		return reply.code(500).send({ message: `database error ${err}` });
	}
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

		const sql = "UPDATE users SET profile_picture = ? WHERE id = ?";
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
