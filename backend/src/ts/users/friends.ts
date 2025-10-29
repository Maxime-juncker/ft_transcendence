import sqlite3 from 'sqlite3'
import { Database } from 'sqlite';

export async function removeFriend(request: any, reply: any, db: Database)
{
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
	const result = await db.run(sql, [user1.toString(), user2.toString()]);

	return reply.code(200).send({ message: `friend removed` });
}

export async function addFriend(request: any, reply: any, db: Database)
{
	var { user_id, friend_name } = request.body;
	const sender_id = user_id;

	var sql = 'SELECT id FROM users WHERE name = ?';
	try {
		var row = await db.get(sql, [friend_name])
		if (!row)
			return reply.code(404).send({ message: `profile not found` });

		var friend_id = row.id;
		if (user_id > friend_id)
		{
			const tmp = user_id;
			user_id = friend_id;
			friend_id = tmp;
		}

		sql = 'INSERT INTO friends (user1_id, user2_id, pending, sender_id) VALUES (?, ?, ?, ?)';
		var result = await db.run(sql, [user_id, friend_id, true, sender_id]);
		console.log(`Inserted row with id ${result.changes}`);
		return reply.code(200).send({ message: "success" });
	}
	catch (err) {
		console.log(`database error: ${err}`);
		return reply.code(500).send({ error: `database error` });
	}
	
}

export async function acceptFriend(request: any, reply: any, db: Database)
{
	var { user1, user2 } = request.params as {
		user1: number,
		user2: number
	};

	const sender_id = user1;

	if (user1 > user2)
	{
		const tmp = user1;
		user1 = user2;
		user2 = tmp;
	}
	var sql = 'UPDATE friends SET pending = 0 WHERE user1_id = ? AND user2_id = ? AND sender_id != ? RETURNING *';
	try {
		const row = await db.get(sql, [user1, user2, sender_id]);
		if (!row)
			return reply.code(500).send({ message: "could not find request" });
		return reply.code(200).send({ message: "Success" });
	}
	catch (err) {
		console.log(`database err: ${err}`);
		return reply.code(500).send({ message: "database error" });
	}
}
