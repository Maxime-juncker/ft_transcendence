import { Database } from 'sqlite';
import { DbResponse } from 'core/core.js'
import { Logger } from 'modules/logger.js';
import { getUserName } from 'modules/users/user.js'

export async function removeFriend(user1: number, user2: number, db: Database) : Promise<DbResponse>
{
	if (Number(user1) > Number(user2))
		[user1, user2] = [user2, user1];

	try
	{
		Logger.log(`removing friend link: ${await getUserName(user1)} <=> ${await getUserName(user1)}`)
		const sql = "DELETE from friends WHERE user1_id = ? and user2_id = ?";
		await db.run(sql, [user1.toString(), user2.toString()]);
		return { code: 200, data: { message: 'Success' }};
	}
	catch (err) {
		Logger.log(`database error: ${err}`);
		return { code: 500, data: { message: 'Database Error' }};
	}
}

export async function addFriend(user_id: number, friend_id: number, db: Database)
{
	const sender_id = user_id;

	var sql = 'SELECT id FROM users WHERE name = ?';
	try {
		if (Number(user_id) > Number(friend_id))
			[user_id, friend_id] = [friend_id, user_id];

		sql = 'INSERT INTO friends (user1_id, user2_id, pending, sender_id) VALUES (?, ?, ?, ?)';
		var result = await db.run(sql, [user_id, friend_id, true, sender_id]);
		Logger.log(`sending friend request: ${await getUserName(user_id)} <=> ${await getUserName(friend_id)}, id: ${result.lastID}`)
		return { code: 200, data: { message: 'Success' }};
	}
	catch (err) {
		Logger.log(`database error: ${err}`);
		return { code: 500, data: { message: 'Database Error' }};
	}
	
}

export async function acceptFriend(user1: number, user2: number, db: Database)
{
	const request_userId = user1;

	if (Number(user1) > Number(user2))
		[user1, user2] = [user2, user1];
	var sql = 'UPDATE friends SET pending = 0 WHERE user1_id = ? AND user2_id = ? AND sender_id != ? RETURNING *';
	try {
		Logger.log(`confirming friend request: ${await getUserName(user1)} <=> ${await getUserName(user1)}`)
		const row = await db.get(sql, [user1, user2, request_userId]);
		if (!row)
			return { code: 404, data: { message: 'Request not found' }};
		return { code: 200, data: { message: 'Success' }};
	}
	catch (err) {
		Logger.log(`database err: ${err}`);
		return { code: 500, data: { message: 'Database Error' }};
	}
}

export async function getFriends(request: any, reply: any, db: Database)
{
	const { user_id } = request.query;
	const sql = "select * FROM friends where user1_id = ? or user2_id = ?;";

	try {
		const rows = await db.all(sql, [user_id, user_id]);
		if (!rows)
			return reply.code(404).send({ message: `no friend found :(` });
		return reply.code(200).send(rows);
	}
	catch (err) {
		Logger.error(`database err: ${err}`);
		return reply.code(500).send({ message: `database error ${err}` });
	}
}
