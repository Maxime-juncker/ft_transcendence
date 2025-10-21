import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';
import path from 'path';

import fastifyStatic from '@fastify/static';
import Fastify from "fastify";

import sqlite3 from 'sqlite3';

// directory of avatars
const uploadDir : string = "/var/www/avatars/"

// setup fastify
const fastify = Fastify({ logger: true })
await fastify.register(import('@fastify/multipart'));

// setup db
const db = new sqlite3.Database('/var/lib/sqlite/app.sqlite', sqlite3.OPEN_READWRITE, (err) => {
	if (err) {
		return console.error('Failed to connect:', err.message);
	}
});

// static image
fastify.register(fastifyStatic, {
  root: uploadDir,
  prefix: '/api/images/',
});

function validate_email(email:string)
{
	return String(email)
    .toLowerCase()
    .match(
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    );
}

function dbPost(sql:string, arg:any) : number
{
	db.run(sql, arg, function (err:any) {
		if (err)
		{
			console.error('Insert error:', err);
			return 500;
		}
		else
		{
			console.log(`Inserted row with id ${this.lastID}`);
			return 200;
		}
	})
	return 200;
}


fastify.post('/api/add_friend', (request:any, reply:any) => {

	const { user_id, friend_name } = request.body;


	var friend_id;


	const sql = 'INSERT INTO friends (user_id, friend_id, is_accepted) VALUES (?, ?, ?)';
	
	const code = dbPost(sql, [user_id, friend_id, "0"]);
	if (code == 500)
		return reply.code(500).send({ message: `database error` })
	else
		return reply.code(200).send({ message: `Success`});
})

fastify.post('/api/login', (request:any, reply:any) => {
	const { email, passw } = request.body;
	const sql = 'SELECT * FROM users WHERE email = ? AND passw = ?';

	db.get(sql, [email, passw], function (err:any, row:any)
	{
		if (err)
		{
			reply.code(500).send({ message: `database error: ${err.message}` });
		}
		if (!row)
		{
			reply.code(404).send({ message: "email or password invalid" });
		}
		else
		{
			reply.code(200).send(row);
		}
	})
})

interface GetProfileQuerystring {
	profile_name: string;
}

fastify.route<{
	Querystring: GetProfileQuerystring
}>({
	method: 'GET',
	url: '/api/get_profile',
	schema: {
		querystring: {
			type: 'object',
			properties: {
				profile_name: { type: 'string' }
			},
			required: ['profile_name']
		}
	},
	handler: (request, reply) => {
		const { profile_name }  = request.query;
		const sql = 'SELECT id, name, profile_picture FROM users WHERE name = ?';
		db.get(sql, [profile_name], function (err: any, row: any) {
			if (err)
				return reply.code(500).send({ message: `database error: ${err.message}` });
			else if (!row)
				return reply.code(404).send({ message: "profile not found" });
			else
				return reply.code(200).send(row);
		})
	}
})
fastify.post('/api/create_user', (request:any, reply:any) => {
	const { email, passw, username } = request.body;
	const sql = 'INSERT INTO users (name, email, passw, profile_picture) VALUES (?, ?, ?, ?)';

	if (!validate_email(email))
	{
		reply.code(403).send({ message: "error: email not valid" });
		return ;
	}

	const code = dbPost(sql, [username, email, passw, ""]);
	if (code == 500)
		return reply.code(500).send({ message: `database error`});
	else
		reply.code(200).send({ message: `Success`});
})

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

// avatar uploading
fastify.post('/api/upload/avatar', async (request, reply) => {

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

		db.run("UPDATE users SET profile_picture = ? WHERE id = ?", ["/api/images/" + filename , id], function(err) {

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
		fastify.log.error(error);
		return reply.code(500).send({ error: "failed to upload file" });

	}
})


const start = async () => {
	try {
		await fastify.listen({ port: 3000, host: '0.0.0.0' });
	} catch (err) {
		fastify.log.error(err);
		process.exit(1)
	}
}
start()
