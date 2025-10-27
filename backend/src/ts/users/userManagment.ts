import sqlite3 from "sqlite3";
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';
import path from 'path';

import { uploadDir } from "../server.js";
import { check_totp } from "./totp.js";

function validate_email(email:string)
{
	return String(email)
    .toLowerCase()
    .match(
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    );
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

export function login_user(request: any, reply: any, db: sqlite3.Database)
{
	const { email, passw, totp } = request.body;
	var sql = 'UPDATE users SET is_login = 1 WHERE email = ? AND passw = ? RETURNING *';

	db.get(sql, [email, passw], function (err:any, row:any)
	{
		if (err)
			reply.code(500).send({ message: `database error: ${err.message}` });
		if (!row)
			reply.code(404).send({ message: "email or password invalid" });
		else if (row.totp_enable == 1 && !check_totp(row.totp_seed, totp))
			reply.code(404).send({ message: "totp invalid" });
		else
			reply.code(200).send(row);
	})
}

export function create_user(request: any, reply: any, db: sqlite3.Database)
{
	const { email, passw, username } = request.body;
	const sql = 'INSERT INTO users (name, email, passw, totp_enable, totp_seed, profile_picture, elo, status, is_login) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';

	if (!validate_email(email))
		return reply.code(403).send({ message: "error: email not valid" });

	db.run(sql, [username, email, passw, false, "", "", 100, 0, 0], function (err:any) {
		if (err)
		{
			console.error('Insert error:', err);
			return reply.code(500).send({ message: `database error ${err}`});;
		}
		else
		{
			console.log(`Inserted row with id ${this.lastID}`);
			return reply.code(200).send({ message: `Success`});;
		}
	})
}

export function logout_user(request: any, reply:any, db: sqlite3.Database)
{
	const { user_id } = request.body;
	const sql = "UPDATE users SET is_login = 0 WHERE id = ?";

	db.run(sql, [user_id], function(err) {
		if (err)
		{
			console.error(`update failed on table users: ${err}`);
			return reply.code(500).send({ message: "Database error" });
		}
		return reply.code(200).send({ message: "Success" });
	})
}

export function set_user_status(request: any, reply: any, db: sqlite3.Database)
{
	const { user_id, newStatus } = request.body;

	const sql = "UPDATE users SET status = ? WHERE id = ?;";
	db.run(sql, [newStatus, user_id], function (err) {
		if (err)
			return reply.code(500).send({ message: "Database error" });
		return reply.code(200).send({ message: "Success" });
	})
}

export async function uploadAvatar(request: any, reply: any, db: sqlite3.Database)
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

		db.run("UPDATE users SET profile_picture = ? WHERE id = ?", ["/api/images/" + filename , id], function() {
			console.log(`${email} has changed is avatar. location=${filepath}`);
		});

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
