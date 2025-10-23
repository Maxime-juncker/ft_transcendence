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

fastify.delete('/api/remove_friend/:user1/:user2', (request, reply) => {
	var { user1, user2 } = request.params as {
		user1: number,
		user2: number
	};

	if (user1 > user2)
	{
		const tmp = user1;
		user1 = user2;
		user2 = tmp;
	}

	const sql = "DELETE from friends WHERE user1_id = ? and user2_id = ?";
	db.run(sql, [user1.toString(), user2.toString()], function(err) {
		if (err)
			return reply.code(500).send({ message: `database error: ${err}` });
		else
			return reply.code(200).send({ message: `friend removed` });
	})
})

fastify.post('/api/add_friend', (request:any, reply:any) => {

	var { user_id, friend_name } = request.body;

	var sql = 'SELECT id FROM users WHERE name = ?';
	db.get(sql, [friend_name], function(err:any, row:any)
	{
		if (err)
		{
			console.log(`database error: ${err}`);
			return reply.code(500).send({ error: `database error` });
		}
		if (!row)
			return reply.code(404).send({ message: `profile not found` });
		else
		{
			var friend_id = row.id;
			if (user_id > friend_id)
			{
				const tmp = user_id;
				user_id = friend_id;
				friend_id = tmp;
			}

			console.log(user_id);
			console.log(friend_id);
			sql = 'INSERT INTO friends (user1_id, user2_id, is_accepted) VALUES (?, ?, ?)';

			db.run(sql, [user_id, friend_id, false], function (err:any) {
				if (err)
				{
					console.error('Insert error:', err);
					return reply.code(500).send({ message: "database error" });
				}
				else
				{
					console.log(`Inserted row with id ${this.lastID}`);
					return reply.code(200).send({ message: "success" });
				}
			})
		}
	});

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

fastify.get<{ Querystring: { user_id: string } }>
(
	'/api/get_friends',
	{
		schema: {
			querystring: {
				type: 'object',
				properties: {
					user_id: { type: 'string' }
				},
				required: ['user_id']
			}
		},
	handler: (request, reply) =>
	{
		const { user_id } = request.query;
		const sql = "select * FROM friends where user1_id = ? or user2_id = ?;";
		
		db.all(sql, [user_id, user_id], function(err, rows) {
			if (err)
				return reply.code(500).send({ message: `database error ${err}` });
			if (!rows)
				return reply.code(404).send({ message: `no friend found :(` });
			console.log(rows);
			return reply.code(200).send(rows);
		})
	}
})

fastify.get<{ Querystring: { user_id: string } }>
(
	'/api/get_profile_id',
		{
			schema: {
				querystring: {
				type: 'object',
				properties: {
					user_id: { type: 'string' }
				},
				required: ['user_id']
			}
	},
	handler: (request, reply) => {
		const { user_id }  = request.query;
		const sql = 'SELECT id, name, profile_picture FROM users WHERE id = ?';
		db.get(sql, [user_id], function (err: any, row: any) {
			if (err)
				return reply.code(500).send({ message: `database error: ${err.message}` });
			else if (!row)
				return reply.code(404).send({ message: "profile not found" });
			else
				return reply.code(200).send(row);
		})
	}
})

fastify.get<{ Querystring: { profile_name: string } }>
(
	'/api/get_profile_name',
		{
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
		return reply.code(403).send({ message: "error: email not valid" });

	db.run(sql, [username, email, passw, ""], function (err:any) {
		if (err)
		{
			console.error('Insert error:', err);
			return reply.code(500).send({ message: `database error ${err}`});;
		}
		else
		{
			console.log(`Inserted row with id ${this.lastID}`);
			return reply.code(500).send({ message: `Success`});;
		}
	})
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
