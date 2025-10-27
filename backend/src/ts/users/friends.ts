import sqlite3 from 'sqlite3'

export function removeFriend(request: any, reply: any, db: sqlite3.Database)
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
	db.run(sql, [user1.toString(), user2.toString()], function(err) {
		if (err)
			return reply.code(500).send({ message: `database error: ${err}` });
		else
			return reply.code(200).send({ message: `friend removed` });
	})
}

export function addFriend(request: any, reply: any, db: sqlite3.Database)
{
	var { user_id, friend_name } = request.body;
	const sender_id = user_id;

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
			sql = 'INSERT INTO friends (user1_id, user2_id, pending, sender_id) VALUES (?, ?, ?, ?)';

			db.run(sql, [user_id, friend_id, true, sender_id], function (err:any) {
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
}

export function acceptFriend(request: any, reply: any, db: sqlite3.Database)
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
	db.get(sql, [user1, user2, sender_id], function(err: any, row: any) {
		if (err)
			return reply.code(500).send({ message: "database error" });
		if (!row)
			return reply.code(500).send({ message: "could not find request" });
		return reply.code(200).send({ message: "Success" });
	})
}
