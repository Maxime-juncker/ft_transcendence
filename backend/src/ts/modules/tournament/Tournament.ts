import { core, chat, DbResponse } from "core/server.js";
import { Logger } from "modules/logger.js";
import { GameInstance } from "modules/game/GameInstance.js";
import { getUserById, getUserName } from "modules/users/user.js";
import { getBot } from 'modules/users/userManagment.js';
import shuffle from 'lodash/shuffle.js';
import { WebSocket } from '@fastify/websocket';
import { GameServer } from "modules/game/GameServer.js";

class Player
{
	private m_ws:	WebSocket | null;
	private m_name:	string = "";
	private m_id:	number = -1;
	private m_elo:	number = -1; // use to match player with same skill level

	get ws(): WebSocket | null	{ return this.m_ws; }
	get name(): string			{ return this.m_name; }
	get id(): number			{ return this.m_id; }

	constructor(ws: WebSocket | null)
	{
		this.m_ws = ws;
	}

	public async init(id: number)
	{
		this.m_id = id;
		
		const res = await getUserById(id, core.db);
		if (res.code != 200)
		{
			Logger.error(res);
			return;
		}
		
		this.m_name = res.data.name;
		this.m_elo = res.data.elo;
	}
}

export class TournamentManager
{
	private m_lobbies:	Lobby[] = [];

	constructor()
	{
		this.m_lobbies = [];
		this.m_lobbies.push(new PublicLobby()); // default lobby for online games
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

	public async leaveLobby(userId: number, lobbyId: string): Promise<DbResponse>
	{
		for (let i = 0; i < this.m_lobbies.length; i++)
		{
			if (this.m_lobbies[i].id == lobbyId)
				return this.m_lobbies[i].leave(userId); //! COULD NEED AWAIT HERE
		}

		return { code: 404, data: { message: "lobby not found" }};
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

	public async addPlayerToLobby(id: number, ws: WebSocket | null, lobbyId: string): Promise<DbResponse>
	{
		for (let i = 0; i < this.m_lobbies.length; i++)
		{
			if (this.m_lobbies[i].id == lobbyId)
			{
				return (this.m_lobbies[i].addPlayer(id, ws));
			}
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
			const lobby = this.m_lobbies[i];
			if (lobby.id == lobbyId)
			{
				if (lobby.state != LobbyState.WAITING)
				{
					return { code: 409, data: { message: "lobby has already started" }};
				}

				if (lobby.owner.id != id)
				{
					return { code: 403, data: { message: "you are not the owner of the tournament" }};
				}
				
				return (lobby.start(id)); //! COULD NEED AWAIT HERE
			}
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

	protected m_players:		Set<Player> = new Set();
	protected m_playersLeft:	Array<Player> = new Array();
	protected m_state:			LobbyState = LobbyState.WAITING;
	protected m_matches:		Set<GameInstance> = new Set();

	get id(): string			{ return this.m_id; }
	get owner(): Player			{ return this.m_owner; }
	get players(): Set<Player>	{ return this.m_players; }
	get state(): LobbyState		{ return this.m_state; }

	constructor(id: string, ownerWs: WebSocket | null)
	{
		this.m_id = id;
		this.m_owner = new Player(ownerWs);
		this.m_state = LobbyState.WAITING;
	}

	public async init(ownerId: number)
	{
		await this.m_owner.init(ownerId)
		await this.addPlayer(this.m_owner.id, this.m_owner.ws);
	}

	public async addPlayer(id: number, ws: WebSocket | null): Promise<DbResponse>
	{
		Logger.debug("called from private lobby");
		if (this.m_state != LobbyState.WAITING)
			return { code: 403, data: { message: "cannot add to lobby" }};

		const player = new Player(ws);
		await player.init(id);
		this.registerWs(player);

		this.m_players.add(player);
		Logger.success(player.name, "was added to", this.m_owner.name, "lobby");

		const ids = this.getAllPlayerIds();
		this.broadcast({ message: "UPDATE", ids: ids });
		return { code: 200, data: { message: "Success" }};
	}

	public findPlayerById(id: number): Player | null
	{
		for (const p of this.m_players)
		{
			if (p.id == id)
				return p;
		}
		return null;
	}

	public getAllPlayerIds(): number[]
	{
		var ids: number[] = [];

		for (const p of this.m_players)
		{
			ids.push(p.id);
		}
		return ids;
	}

	public getAllPlayerLeftIds(): number[]
	{
		var ids: number[] = [];

		for (const p of this.m_playersLeft)
		{
			ids.push(p.id);
		}
		return ids;
	}

	public async leave(id: number): Promise<DbResponse>
	{
		// find player
		const player = this.findPlayerById(id);
		if (!player)
			return { code: 200, data: { message: "You are not part of the tournament" }};

		player.ws?.close();
		this.m_players.delete(player);

		// notify other players
		this.broadcast({ message: "UPDATE", ids: this.getAllPlayerIds() });

		Logger.success(player.name, "was removed from", this.m_owner.name, "lobby");
		return { code: 200, data: { message: "Success" }};
	}

	public broadcast(json: any)
	{
		for (const p of this.m_players)
		{
			if (!p.ws)
				continue;

			if (p.ws.readyState == p.ws.OPEN)
				p.ws.send(JSON.stringify(json));
		}
	}

	public broadcastChat(msg: string)
	{
		for (const p of this.m_players)
		{
			chat.sendTo(p.id, chat.serverMsg(msg));
		}
	}

	public async registerWs(player: Player)
	{
		if (!player.ws)
			return;

		try
		{
			player.ws.on('error', (error: any) => {
				this.leave(player.id);
				Logger.error(`${player.name}: websocket error: ${error}`);
			})

			player.ws.on('close', async (code: any, reason: any) =>
			{
				void reason;
				this.leave(player.id);
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

		const nbBot = this.calculateNbBot(this.m_players.size);
		const bot = await getBot();
		for (let i = 0; i < nbBot; i++)
		{
			this.addPlayer(bot, null);
		}

		this.m_playersLeft = shuffle([...this.m_players]);
		this.m_state = LobbyState.STARTED;
		Logger.log(`${this.m_owner.name} tournament: STARTING`);

		this.broadcastChat("The tournament is starting! Get ready to fight!");
		this.nextRound();

		return { code: 200, data: { message: "Success" }};
	}

	private calculateNbBot(size: number): number
	{
		return (size === 1) ? 1 : Math.pow(2, Math.ceil(Math.log2(size))) - size;
	}

	public async nextRound()
	{
		if (this.m_playersLeft.length == 1)
		{
			this.tournamentEnd();
			return ;
		}

		this.broadcastChat("The next round is starting! Get ready to fight!");

		for (let i = 0; i < this.m_playersLeft.length; i += 2)
		{
			const gameId = crypto.randomUUID();
			const p1 = this.m_playersLeft[i].id;
			const p2 = this.m_playersLeft[i + 1].id;

			chat.notifyMatch(p1, p2, gameId, 1);
			chat.notifyMatch(p2, p1, gameId, 2);
			this.m_matches.add(new GameInstance("online", p1, p2, gameId));
		}

		Logger.log(`${this.m_owner.name} tournament: NEW ROUND (${this.m_playersLeft.length} players left)`);
	}

	private async tournamentEnd()
	{
		this.m_state = LobbyState.FINISHED;
		Logger.log(`${this.m_owner.name} tournament: TOURNAMENT END`);

		const ids = this.getAllPlayerIds();
		const winner = await getUserName(ids[0]);
		this.broadcastChat(`The tournament is over! The winner is ${winner}! Congratulations!`);
	}
}

class PublicLobby extends Lobby
{
	constructor()
	{
		super("0", null);
	}

	public async start(id: number): Promise<DbResponse>
	{
		if (this.m_state == LobbyState.FINISHED)
			return { code: 403, data: { message: "this tournament is ended" }};
		if (this.m_state == LobbyState.STARTED)
			return { code: 403, data: { message: "this tournament is already started" }};

		this.m_state = LobbyState.STARTED;
		Logger.log(`public lobby ${this.id}: STARTING`);
		return { code: 200, data: { message: "Success" }};
	}

	public async addPlayer(id: number, ws: WebSocket | null): Promise<DbResponse>
	{

		const p = new Player(null);
		await p.init(id);
		this.players.add(p);

		Logger.log(`adding ${p.name} to public lobby`);
		this.nextRound();
		return { code: 200, data: { message: "Success" }};
	}

	public async nextRound()
	{
		if (this.m_players.size <= 1)
		{
			Logger.log("not enought player to start public game");
			return ;
		}

		const gameId = crypto.randomUUID();
		var p1: Player | null = null;
		var p2: Player | null = null;

		for (const p of this.m_players)
		{
			if (p1 == null)
			{
				p1 = p;
				continue;
			}
			p2 = p;
			break;
		}
		if (!p1 || !p2)
		{
			Logger.error("undefined player in queue:\n\tp1:", p1, "\n\tp2:", p2);
			return;
		}
		this.m_players.delete(p1);
		this.m_players.delete(p2);

		chat.notifyMatch(p1.id, p2.id, gameId, 1);
		chat.notifyMatch(p2.id, p1.id, gameId, 2);
		GameServer.Instance?.activeGames.set(gameId, new GameInstance('online', p1.id, p2.id, gameId));
		// this.m_matches.add(new GameInstance("online", p1.id, p2.id, gameId));

		Logger.log(`PUB LOBBY (${this.id}): NEW ROUND (${p1.name} vs ${p2.name})`);
	}
}
