import * as core from '@core/core.js';
import { getBlockedUsrById, getUserById, getUserByName, getUserStats } from '@modules/users/user.js';
import { WebSocket } from '@fastify/websocket';
import * as utils from 'utils.js';
import { FastifyRequest } from 'fastify';
import { GameServer } from 'modules/game/GameServer.js';
import { GameInstance } from 'modules/game/GameInstance.js'

//TODO: if a user block someone everyone is blocked ?
export const connections = new Map<WebSocket, number>(); // websocket => user login
var matchQueue: number[] = [];

function serverMsg(str: string): string
{
	const val = Array.from(connections.values());
	return JSON.stringify({ username: "<SERVER>", message: str, connections: val });
}

// TODO: use flag in chat (e.g: if flag == DM them msg is underlined)
// TODO: move to front
async function handleCommand(str: string) : Promise<string>
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

function sendTo(userId: number, msg: string)
{
	connections.forEach((id: number, ws: WebSocket) => {
		if (userId == id)
		{
			ws.send(msg);
		}
	});
}

async function getPlayerName(id: number) : Promise<string>
{
	const res = await getUserById(id, core.db);
	if (res.code == 200)
		return res.data.name;
	return "undifined";
}

async function notifyMatch(id: number, opponentId: number, gameId: string, playerSide: number)
{
		const res = JSON.stringify({ username: "SERVER", message: "START", opponentId: opponentId, gameId: gameId, playerSide: playerSide});
		sendTo(id, res)
		sendTo(id, serverMsg(`you will play against: ${await getPlayerName(opponentId)}`));
}

export function removePlayerFromQueue(playerId: number)
{
	matchQueue = matchQueue.filter(num => num != Number(playerId));
	console.log(playerId, "has been removed from matchQueue");
}

export async function addPlayerToQueue(playerId: number, server: GameServer): Promise<string | null>
{
	if (matchQueue.length + 1 >= 2) // run match
	{
		const player1: number = playerId;
		const player2 = matchQueue.shift();
		if (!player2)
			return null;

		console.log(`${player1} will play against ${player2}`);
		const gameId = crypto.randomUUID();
		await notifyMatch(player1, player2, gameId, 1);
		await notifyMatch(player2, player1, gameId, 2);

		server.activeGames.set(gameId, new GameInstance('online', player1, player2));
		return gameId;
	}

	matchQueue.push(playerId);
	return null;
}

async function onMessage(message: any, connection: WebSocket)
{
	try
	{
		const msg = message.toString();
		const json = JSON.parse(message);
		if (json.isCmd === true)
		{
			const result = await handleCommand(json.message);
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
			const conn = connections.get(ws);
			if (!conn)
				return ;
			removePlayerFromQueue(conn);
			connections.delete(ws);
			broadcast(serverMsg(`${login} has left the room`), ws);
			console.log(`${login}: disconnected - Code: ${code}, Reason: ${reason?.toString() || 'none'}`);
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

async function broadcast(message: any, sender: WebSocket)
{
	const conn = connections.get(sender);
	if (!conn)
		return ;

	const blockedUsrSender = await getBlockUsr(conn);
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
