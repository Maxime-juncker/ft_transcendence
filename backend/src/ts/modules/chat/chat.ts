import * as core from '@core/core.js';
import { getBlockedUsrById, getUserById, getUserByName, getUserStats } from '@modules/users/user.js';
import { WebSocket } from '@fastify/websocket';
import * as utils from 'utils.js';
import { FastifyRequest } from 'fastify';

//TODO: if a user block someone everyone is blocked ?
export const connections = new Map<WebSocket, number>(); // websocket => user login

function serverMsg(str: string): string
{
	return JSON.stringify({ username: "<SERVER>", message: str });
}

async function getUserLoginByWs(ws: WebSocket): Promise<string>
{
	if (!connections.has(ws))
		return "";
	const res = await getUserById(connections.get(ws), core.db);
	if (res.code != 200)
		return res.data;
	return res.data.name;
}

// TODO: use flag in chat (e.g: if flag == DM them msg is underlined)
// TODO: move to front
async function handleCommand(str: string, connection) : Promise<string>
{
	const args: string[] = str.split(/\s+/);
	var response: any;
	switch (args[0])
	{
		case "/inspect":
			response = await getUserByName(args[1], core.db);
			return JSON.stringify(response.data);
		case "/stats":
			response = await getUserStats(args[1], core.db);
			return JSON.stringify(response[1]);
		case "/ping":
			return "pong";
		default:
			return "Command not found"
	}
}

async function onMessage(message: any, connection: WebSocket)
{
	try
	{
		const msg = message.toString();
		const json = JSON.parse(message);
		if (json.isCmd === true)
		{
			const result = await handleCommand(json.message, connection);
			if (result == "") // no server feedback
				return ;
			const str = serverMsg(result);
			console.log(str);
			connection.send(str);
			return ;
		}
		await broadcast(msg, connection);
	}
	catch (err)
	{
		console.log(`failed to process message: ${err}`);
	}
}

export async function chatSocket(ws: WebSocket, request: FastifyRequest)
{
	try {
		ws.send(serverMsg("welcome to room chat!"));

		const id = utils.getUrlVar(request.url)["userid"];
		var res = await getUserById(id, core.db);
		var login = "Guest"; // will stay at -1 if user is not login
		if (res.code === 200)
			login = res.data.name;
		
		connections.set(ws, id);
		ws.on('message', async (message: any) => onMessage(message, ws));

		ws.on('error', (error: any) => {
			console.error(`${login}: websocket error: ${error}`);
		})

		ws.on('close', (code: any, reason: any) => {
			connections.delete(ws);
			broadcast(serverMsg(`${login} has left the room`), ws);
			// console.log(`${login}: disconnected - Code: ${code}, Reason: ${reason?.toString() || 'none'}`);
		});

		broadcast(serverMsg(`${login} has join the room`), ws);
	}
	catch (err)
	{
		console.log(err);
	}
}

async function getBlockUsr(userid: number)
{
	var blockedUsr = [];
	var res = await getBlockedUsrById(userid, core.db);
	if (res.code == 200)
		blockedUsr = res.data;
	return blockedUsr;
}

async function isBlocked(blockedUsr: any, key: WebSocket, sender: WebSocket): Promise<number>
{
	for (let i = 0; i  < blockedUsr.length; i ++)
	{
 		if (connections.get(key) == blockedUsr[i].user2_id)
		{
			console.log(connections.get(key), "is blocked by", connections.get(sender));
			return 1;
		}
	}
	return 0;
}

async function broadcast(message: any, sender: WebSocket = null)
{

	// console.log("broadcasting: ", message);
	const blockedUsrSender = await getBlockUsr(connections.get(sender));
	connections.forEach(async (id: number, conn: WebSocket) => {

		if (conn === sender || conn.readyState !== conn.OPEN)
			return ;
		try
		{
			const blockedUsr = await getBlockUsr(id);
			if (await isBlocked(blockedUsrSender, conn, sender) ||
				await isBlocked(blockedUsr, sender, conn))
			{
				console.log("msg will be blocked");
				const val = await JSON.parse(message);
				val.message = "[REDACTED]";
				message = JSON.stringify(val);
			}
			conn.send(message);
		}
		catch (err: any)
		{
			console.error(`Broadcast error: ${err}`);
			connections.delete(conn);
		}
	})
}
