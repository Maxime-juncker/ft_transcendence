import { DbResponse } from "core/server.js";
import { Logger } from "modules/logger.js";
import { GameInstance } from "modules/game/GameInstance";
import { getUserName } from "modules/users/user.js";
import { WebSocket } from '@fastify/websocket';

class Player
{
	private m_ws:	WebSocket;
	private m_name:	string = "";
	private m_id:	number = -1;

	get ws(): WebSocket	{ return this.m_ws; }
	get name(): string	{ return this.m_name; }
	get id(): number	{ return this.m_id; }

	constructor(ws: WebSocket)
	{
		this.m_ws = ws;
	}

	public async init(id: number)
	{
		this.m_id = id;
		this.m_name = await getUserName(id);
	}
}

export class TournamentManager
{
	private m_lobbies: Lobby[] = [];

	constructor()
	{
		this.m_lobbies = [];
	}

	/**
	* create a new lobby
	* @param ownerId the owner id of the lobby
	*/
	public async createLobby(ownerId: number, ownerWs: WebSocket): Promise<DbResponse>
	{
		if (ownerWs.readyState != ownerWs.OPEN)
			return { code: 400, data: { message: "invalid websocket" }};

		const id = crypto.randomUUID();
		const lobby = new Lobby(id, ownerWs);
		await lobby.init(ownerId);
		this.m_lobbies.push(lobby);

		ownerWs.send(JSON.stringify({ message: "created", lobbyId: id}));
		Logger.success(lobby.owner.name, "created tournament, id:", lobby.id);
		return { code: 200, data: { message: "lobby created", id: id }};
	}

	public getAllLobbyIds()
	{
		var ids: string[] = [];

		for (let i = 0; i < this.m_lobbies.length; i++)
		{
			ids.push(this.m_lobbies[i].id);
		}
		return { code: 200, data: { message: "Success", ids: ids }};
	}

	public async addPlayerToLobby(ownerId: number, ownerWs: WebSocket, lobbyId: string): Promise<DbResponse>
	{
		for (let i = 0; i < this.m_lobbies.length; i++)
		{
			if (this.m_lobbies[i].id == lobbyId)
				return this.m_lobbies[i].addPlayer(ownerId, ownerWs); //! COULD NEED AWAIT HERE
		}

		return { code: 404, data: { message: "lobby not found" }};
	}


	/**
	* create a new lobby
	* @param ownerId the owner id of the lobby
	*/
	public startLobby(id: number, lobbyId: string)
	{
		for (let i = 0; i < this.m_lobbies.length; i++)
		{
			if (this.m_lobbies[i].id == lobbyId)
				return this.m_lobbies[i].start(id); //! COULD NEED AWAIT HERE
		}

		return { code: 404, data: { message: "lobby not found" }};
	}
}

enum LobbyState
{
	WAITING = 0,
	STARTED,
	FINISHED,
}

export class Lobby
{
	private m_id:			string = "";
	private m_owner:		Player;
	private m_players:		Player[] = [];
	private m_playersLeft:	Player[] = [];
	private m_instances:	GameInstance[] = [];
	private m_state:		LobbyState = LobbyState.WAITING;

	public get id(): string			{ return this.m_id; }
	public get owner(): Player		{ return this.m_owner; }
	public get players(): Player[]	{ return this.m_players; }

	constructor(id: string, ownerWs: WebSocket)
	{
		this.m_id = id;

		this.m_owner = new Player(ownerWs);

		this.m_players = [];
		this.m_instances = [];
		this.m_state = LobbyState.WAITING;
	}

	public async init(ownerId: number)
	{
		await this.m_owner.init(ownerId)
		await this.addPlayer(this.m_owner.id, this.m_owner.ws);
	}

	public async addPlayer(id: number, ws: WebSocket): Promise<DbResponse>
	{
		if (this.m_state != LobbyState.WAITING)
			return { code: 403, data: { message: "cannot add to lobby" }};

		const player = new Player(ws);
		await player.init(id);
		this.registerWs(player);

		this.m_players.push(player);

		Logger.success(player.name, "was added to", this.m_owner.name, "lobby");
		return { code: 200, data: { message: "Success" }};
	}

	public async registerWs(player: Player)
	{
		try
		{
			player.ws.on('error', (error: any) => {
				Logger.error(`${player.name}: websocket error: ${error}`);
			})

			player.ws.on('close', async (code: any, reason: any) =>
			{
				void reason;

				Logger.log(`${player.name} has left the lobby (code: ${code})`);
			});
		}
		catch (err)
		{
			Logger.error("Websocket error: ", err);
		}
	}

	/**
	* called once at the very start of the tournament
	* if id != owner id then not starting
	*/
	public async start(id: number): Promise<DbResponse>
	{
		if (this.m_owner.id != id)
			return { code: 403, data: { message: "you are not the owner of the lobby" }};
		if (this.m_state == LobbyState.FINISHED)
			return { code: 403, data: { message: "this tournament is ended" }};
		if (this.m_state == LobbyState.STARTED)
			return { code: 403, data: { message: "this tournament is already started" }};

		this.m_playersLeft = this.m_players;
		this.m_state = LobbyState.STARTED;
		Logger.log(`${this.m_owner.name} tournament: STARTING`);

		this.nextRound();
		return { code: 200, data: { message: "Success" }};
	}

	public async nextRound()
	{
		Logger.log(`${this.m_owner.name} tournament: NEW ROUND (${this.m_playersLeft.length} players left)`);
	}

	public async tournamentEnd()
	{
		Logger.log(`${this.m_owner.name} tournament: TOURNAMENT END`);
	}
}
