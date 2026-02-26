import { core, DbResponse } from 'core/server.js';
import { getUserById, getBlockUser, getUserName } from 'modules/users/user.js';
import { WebSocket } from '@fastify/websocket';
import * as utils from 'utils.js';
import { FastifyRequest } from 'fastify';
import { GameServer } from 'modules/game/GameServer.js';
import { GameInstance } from 'modules/game/GameInstance.js'
import { Logger } from 'modules/logger.js';
import { logoutUser } from 'modules/users/userManagment.js';
import { clearDuel } from 'modules/users/duel.js';
import { jwtVerif } from 'modules/jwt/jwt.js';

export type LobbyInvite = {
	senderId:	number,
	userId:		number,
	lobbyId:	string
}

export class Chat
{
	private m_connections: Map<WebSocket, number>; // websocket <=> user login

	private m_healthQueue: number[];
	private m_matchQueue: number[];
	private m_timerId: NodeJS.Timeout | null;

	private m_lobbyInvites: Array<LobbyInvite>
	get connections(): Map<WebSocket, number> { return this.m_connections; }

	constructor()
	{
		this.m_connections = new Map<WebSocket, number>();
		this.m_lobbyInvites = [];
		this.m_healthQueue = [];
		this.m_matchQueue = [];
		this.m_timerId = null;
	}


	public serverMsg(str: string, flag?: string, data_i18n?: string): string
	{
		const val = Array.from(this.m_connections.values());
		return JSON.stringify({ username: "<SERVER>", message: str, connections: val, flag: flag, data_i18n: data_i18n});
	}

	/**
	 * send a health check call to every client, if they don't responde before next check
	 * they are consider afk
	 */
	private checkHealth()
	{
		this.m_connections.forEach(async (id: number, ws: WebSocket) => {
			const idx = this.m_healthQueue.indexOf(id); 
			if (idx == -1)
			{
				this.m_healthQueue.push(id);
				this.sendTo(id, this.serverMsg("check health", "health"));
			}
			else
			{
				Logger.warn(await getUserName(id), "has failed health check");
				this.disconnectClient(ws);
			}
		});
	}

	public async HealthCallback(id: number)
	{
		for (var i = 0; i < this.m_healthQueue.length; i++)
		{
			if (this.m_healthQueue[i] == id)
				break
		}
		
		if (i == this.m_healthQueue.length)
			return;

		this.m_healthQueue = this.m_healthQueue.filter(num => num != Number(id));
	}

	public disconnectClientById(user_id: number)
	{
		this.m_connections.forEach(async (id: number, ws: WebSocket) => {
			if (user_id == id)
			{
				this.disconnectClient(ws);
			}
		});
	}

	/**
	 * disconnect client, remove all duels / invites send by him
	 */
	public async disconnectClient(ws: WebSocket)
	{
		if (!this.m_connections.has(ws))
		{
			Logger.log("client to disconnect not found");
			return ;
		}

		const id = this.m_connections.get(ws);
		if (!id || id == -1)
			return ;
		clearDuel(id);
		this.clearInviteUser(id);
		this.m_connections.delete(ws);
		logoutUser(id, core.db);
		ws.close();

		Logger.log(await getUserName(id), "was disconnected");
		if (this.m_connections.size == 0 && this.m_timerId != null)
		{
			Logger.log("no more connection stopping health check");
			clearInterval(this.m_timerId);
			this.m_timerId = null;
		}
	}

	public sendTo(userId: number, msg: string)
	{
		this.m_connections.forEach(async (id: number, ws: WebSocket) => {
			if (userId == id)
				ws.send(msg);
		});
	}

	public async getPlayerName(id: number) : Promise<string>
	{
		const res = await getUserById(id, core.db);
		if (res.code == 200)
			return res.data.name;
		return "undefined";
	}

	/**
	 * send dm to id for starting match
	 */
	public async notifyMatch(id: number, opponentId: number, gameId: string, playerSide: number, mode: string = "online")
	{
		const res = JSON.stringify({ username: "SERVER", message: "START", opponentId: opponentId, gameId: gameId, playerSide: playerSide, mode: mode});
		this.sendTo(id, res)
		this.sendTo(id, this.serverMsg(`you will play against: ${await this.getPlayerName(opponentId)}`));
	}

	public async removePlayerFromQueue(playerId: number)
	{
		this.m_matchQueue = this.m_matchQueue.filter(num => num != Number(playerId));
	}

	private async startGameMatchQueue(playerId: number, server: GameServer)
	{
		const player1: number = playerId;
		const player2 = this.m_matchQueue.shift();
		if (!player2)
			return null;

		const gameId = crypto.randomUUID();

		await this.notifyMatch(player1, player2, gameId, 1);
		await this.notifyMatch(player2, player1, gameId, 2);

		server.activeGames.set(gameId, new GameInstance('online', player1, player2, gameId));


		Logger.log(`${await getUserName(player1)} will play against ${await getUserName(player2)}`);
		return gameId;
	}

	/**
	 * add player to matchmaking queue and start game if enougth player
	 * @param playerId player to add
	 * @param server gameserver
	 * @returns id of started match, null of no match started
	 */
	public async addPlayerToQueue(playerId: number, server: GameServer): Promise<string | null>
	{
		// check if player is already in queue
		for (let i = 0; i < this.m_matchQueue.length; i++)
		{
			if (this.m_matchQueue[i] == playerId)
				return null;
		}

		if (this.m_matchQueue.length + 1 >= 2) // run match
		{
			const id = await this.startGameMatchQueue(playerId, server);
			return id;
		}

		this.m_matchQueue.push(playerId);
		return null;
	}

	private async validateMessage(json: any): Promise<DbResponse>
	{
		if (!json.token || !json.message)
			return { code: 400, data: { message: "bad message, should be: { token: <token>, message: <message> }"}};

		if (json.message.length > core.maxChatMsgLen)
			return { code: 403, data: { message: `message too long (max: ${core.maxChatMsgLen})`}};
		if (json.message.length == 0)
			return { code: 403, data: { message: `cannot send empty message`}};

		const data: any = await jwtVerif(json.token, core.sessionKey);
		if (!data)
			return { code: 400, data: { message: "bad token" }};

		return { code: 200, data: { id: data.id }};
	}

	private async onMessage(message: any, connection: WebSocket)
	{
		try
		{
			const json = JSON.parse(message.toString());
			const res = await this.validateMessage(json);
			if (res.code != 200)
			{
				connection.send(this.serverMsg(res.data.message));
				return;
			}

			const msg = JSON.stringify({
				username: await getUserName(res.data.id),
				message: json.message,
				connections: this.m_connections.size
			});
			await this.broadcast(msg, connection);
		}
		catch (err)
		{
			Logger.log(`failed to process message: ${err}`);
			connection.send(this.serverMsg(`failed to process message: ${err}`));
		}
	}

	/**
	 * connect user to chat
	 * @param ws websocket of user
	 */
	public async chatSocket(ws: WebSocket, request: FastifyRequest)
	{
		try {
			ws.send(this.serverMsg("welcome to room chat!"));

			const token = utils.getUrlVar(request.url)["userid"];
			const data: any = await jwtVerif(token, core.sessionKey);
			if (!data)
				throw new Error("invalid token");

			var res = await getUserById(data.id, core.db);
			var login = "Guest"; // will stay at -1 if user is not login
			if (res.code === 200)
				login = res.data.name;

			Logger.log(`${login} as connected to lobby`);
			this.m_connections.set(ws, data.id);

			if (this.m_connections.size == 1)
			{
				Logger.log("starting health checker");
				const timer: number = process.env.HEALTH_CHECK_TIMER ? Number(process.env.HEALTH_CHECK_TIMER) : 60; // if env var missing then 60s
				this.m_timerId = setInterval(() => this.checkHealth(), timer * 1000);
			}
			ws.on('message', async (message: any) => this.onMessage(message, ws));

			ws.on('error', (error: any) => {
				Logger.error(`${login}: websocket error: ${error}`);
			})

			ws.on('close', async (code: any, reason: any) =>
			{
				void reason;

				const conn = this.m_connections.get(ws);
				if (!conn)
					return ;

				this.removePlayerFromQueue(conn);
				Logger.log(`${login} has left the room (code: ${code})`);
				this.broadcast(this.serverMsg(`${login} has left the room`), ws);

				await this.disconnectClient(ws);
			});

			this.broadcast(this.serverMsg(`${login} has joined the room`), ws);
		}
		catch (err)
		{
			Logger.log(`${err}`);
		}
	}

	private async broadcast(message: any, sender: WebSocket)
	{
		const senderId = this.m_connections.get(sender);
		if (!senderId)
			return ;

		this.m_connections.forEach(async (id: number, conn: WebSocket) =>
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
					return;
				}
				conn.send(message);
			}
			catch (err: any)
			{
				Logger.error(`Broadcast error: ${err}`);
				this.m_connections.delete(conn);
			}
		})
	}

	/**
	 * send invite to user
	 * @param senderId id of sender
	 * @param userId id of receiver
	 * @param lobbyId id of tournament lobby
	 * @return 400 if user invite self, 409 if receiver is already invited, 200 if ok
	 */
	public async invite(senderId: number, userId: number, lobbyId: string): Promise<DbResponse>
	{
		if (senderId === userId)
			return { code: 400, data: { message: "you can't invite yourself" }};
	
		const isBlock = await getBlockUser(userId, senderId);
		if (isBlock.code == 200) // user is blocked
		{
			return { code: 200, data: { message: "invite sent" }};
		}
		
		for (let i = 0; i < this.m_lobbyInvites.length; i++)
		{
			const invite = this.m_lobbyInvites[i];
			if (invite.userId == userId && invite.lobbyId == lobbyId)
				return { code: 409, data: { message: "user is already invited to this tournament" }};
		}

		this.sendTo(userId, this.serverMsg(`${await this.getPlayerName(senderId)} is inviting you to his lobby`));
		this.m_lobbyInvites.push({ senderId: senderId, userId: userId, lobbyId: lobbyId })

		return { code: 200, data: { message: "invite sent" }};
	}

	/**
	 * get add invite sent or received by userId
	 * @param userId userId
	 * @returns array of LobbyInvite
	 */
	public listInvites(userId: number): LobbyInvite[]
	{
		const invites: LobbyInvite[] = [];
		for (let i = 0; i < this.m_lobbyInvites.length; i++)
		{
			const invite = this.m_lobbyInvites[i];
			if (invite.userId == userId || invite.senderId == userId)
			{
				invites.push(invite);
			}
		}
		return invites;
	}

	/**
	 * find match and return lobby id
	 * @param userId userId
	 * @param senderId senderid
	 * @returns the lobby id or empty string if invite not found
	*/
	public async acceptInvite(userId: number, senderId: number): Promise<string>
	{
		for (let i = 0; i < this.m_lobbyInvites.length; i++)
		{
			const invite = this.m_lobbyInvites[i];
			if (invite.userId == userId && invite.senderId == senderId)
			{
				this.sendTo(senderId, this.serverMsg(`${await this.getPlayerName(userId)} has accepted your invite`));
				this.removeInvite(invite);
				return invite.lobbyId;
			}
		}
		return "";
	}

	/**
	 * decline invite
	 * @param userId userId
	 * @param senderId senderid
	 * @returns true if invite declined, false if not found
	*/
	public async declineInvite(userId: number, senderId: number): Promise<boolean>
	{
		for (let i = 0; i < this.m_lobbyInvites.length; i++)
		{
			const invite = this.m_lobbyInvites[i];
			if (invite.userId == userId && invite.senderId == senderId)
			{
				this.sendTo(senderId, this.serverMsg(`${await this.getPlayerName(userId)} has decline your invite`));
				this.removeInvite(invite);
				return true;
			}
		}
		return false;
	}

	private clearInviteUser(senderId: number)
	{
		for (let i = 0; i < this.m_lobbyInvites.length; i++)
		{
			const invite = this.m_lobbyInvites[i];
			if (invite.senderId == senderId)
			{
				this.removeInvite(invite);
			}
		}
	}

	private removeInvite(invite: LobbyInvite)
	{
		const idx = this.m_lobbyInvites.indexOf(invite);
		this.m_lobbyInvites.splice(idx, 1);
	}

}
