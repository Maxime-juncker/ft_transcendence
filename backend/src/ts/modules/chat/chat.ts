import { core } from 'core/server.js';
import { getUserById, getBlockUser, getUserName } from 'modules/users/user.js';
import { WebSocket } from '@fastify/websocket';
import * as utils from 'utils.js';
import { FastifyRequest } from 'fastify';
import { GameServer } from 'modules/game/GameServer.js';
import { GameInstance } from 'modules/game/GameInstance.js'
import { Logger } from 'modules/logger.js';
import { logoutUser } from 'modules/users/userManagment.js';
import { clearDuel } from 'modules/users/duel.js';

export const connections = new Map<WebSocket, number>(); // websocket => user login

var healthQueue: number[] = [];
var matchQueue: number[] = [];
var timerId: NodeJS.Timeout | null = null;

export function serverMsg(str: string, flag?: string, data_i18n?: string): string
{
	const val = Array.from(connections.values());
	return JSON.stringify({ username: "<SERVER>", message: str, connections: val, flag: flag, data_i18n: data_i18n});
}

/**
 * send a health check call to every client, if they don't responde before next check
 * they are consider afk
 */
export function checkHealth()
{
	connections.forEach(async (id: number, ws: WebSocket) => {
		Logger.log("checking health for:", await getUserName(id));
		const idx = healthQueue.indexOf(id); 
		if (idx == -1)
		{
			healthQueue.push(id);
			sendTo(id, serverMsg("check health", "health"));
		}
		else
		{
			Logger.warn(await getUserName(id), "has failed health check");
			disconnectClient(ws);
		}
	});
}

export async function HealthCallback(id: number)
{
	for (var i = 0; i < healthQueue.length; i++)
	{
		if (healthQueue[i] == id)
			break
	}
	
	if (i == healthQueue.length)
		return;

	Logger.success(await getUserName(id), "has confirm health check");
	healthQueue = healthQueue.filter(num => num != Number(id));
}

export async function disconnectClientById(user_id: number)
{
	connections.forEach(async (id: number, ws: WebSocket) => {
		if (user_id == id)
			disconnectClient(ws);
	});
}

export async function disconnectClient(ws: WebSocket)
{
	if (!connections.has(ws))
	{
		Logger.log("client to disconnect not found");
		return ;
	}

	const id = connections.get(ws);
	if (!id)
		return ;
	logoutUser(id, core.db);
	ws.close();
	connections.delete(ws);
	clearDuel(id);
	Logger.success(await getUserName(id), "was disconnected");

	if (connections.size == 0 && timerId != null)
	{
		Logger.log("no more connection stopping health check");
		clearInterval(timerId);
		timerId = null;
	}
}

export async function sendTo(userId: number, msg: string)
{
	connections.forEach(async (id: number, ws: WebSocket) => {
		if (userId == id)
			ws.send(msg);
	});
}

async function getPlayerName(id: number) : Promise<string>
{
	const res = await getUserById(id, core.db);
	if (res.code == 200)
		return res.data.name;
	return "undefined";
}

/**
 * send dm to id for starting match
 */
export async function notifyMatch(id: number, opponentId: number, gameId: string, playerSide: number)
{
	const res = JSON.stringify({ username: "SERVER", message: "START", opponentId: opponentId, gameId: gameId, playerSide: playerSide});
	sendTo(id, res)
	sendTo(id, serverMsg(`you will play against: ${await getPlayerName(opponentId)}`));
}

export async function removePlayerFromQueue(playerId: number)
{
	matchQueue = matchQueue.filter(num => num != Number(playerId));
}

export async function addPlayerToQueue(playerId: number, server: GameServer): Promise<string | null>
{
	if (matchQueue.length + 1 >= 2) // run match
	{
		const player1: number = playerId;
		const player2 = matchQueue.shift();
		if (!player2)
			return null;

		const gameId = crypto.randomUUID();

		await notifyMatch(player1, player2, gameId, 1);
		await notifyMatch(player2, player1, gameId, 2);

		server.activeGames.set(gameId, new GameInstance('online', player1, player2));


		Logger.log(`${await getUserName(player1)} will play against ${await getUserName(player2)}`);
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
		await broadcast(msg, connection);
	}
	catch (err)
	{
		Logger.log(`failed to process message: ${err}`);
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

		Logger.log(`${login} as connected to lobby`);
		connections.set(ws, id);

		if (connections.size == 1)
		{
			Logger.log("starting health checker");
			const timer: number = process.env.HEALTH_CHECK_TIMER ? Number(process.env.HEALTH_CHECK_TIMER) : 60; // if env var missing then 60s
			timerId = setInterval(() => checkHealth(), timer * 1000);
		}
		ws.on('message', async (message: any) => onMessage(message, ws));

		ws.on('error', (error: any) => {
			Logger.error(`${login}: websocket error: ${error}`);
		})

		ws.on('close', async (code: any, reason: any) =>
		{
			void reason;

			const conn = connections.get(ws);
			if (!conn)
				return ;

			removePlayerFromQueue(conn);
			Logger.log(`${login} has left the room (code: ${code})`);
			broadcast(serverMsg(`${login} has left the room`), ws);

			await disconnectClient(ws);
		});

		broadcast(serverMsg(`${login} has join the room`), ws);
	}
	catch (err)
	{
		Logger.log(`${err}`);
	}
}

async function broadcast(message: any, sender: WebSocket)
{
	const senderId = connections.get(sender);
	if (!senderId)
		return ;

	connections.forEach(async (id: number, conn: WebSocket) =>
	{
		if (conn === sender || conn.readyState !== conn.OPEN)
		{
			return ;
		}
		try
		{
			const data = await getBlockUser(id, senderId);
			if (data.code == 200) // user is blocked
			{
				Logger.log(`${await getUserName(senderId)} has block ${await getUserName(id)}`);
				return;
			}
			conn.send(message);
		}
		catch (err: any)
		{
			Logger.error(`Broadcast error: ${err}`);
			connections.delete(conn);
		}
	})
}
