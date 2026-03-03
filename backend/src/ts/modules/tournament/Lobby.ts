import { core, chat, DbResponse } from 'core/server.js'
import { Logger } from 'modules/logger.js';
import { GameInstance } from "modules/game/GameInstance.js";
import { getUserById, getUserName } from "modules/users/user.js";
import { getBotId } from 'modules/users/userManagment.js';
import { GameServer } from "modules/game/GameServer.js";
import shuffle from 'lodash/shuffle.js';
import { WebSocket } from '@fastify/websocket';
import { get } from 'lodash';

export enum LobbyState
{
	WAITING = 0,
	STARTED,
	FINISHED,
}

export class Player
{
	private m_ws:	WebSocket | null;
	private m_name:	string = "";
	private m_id:	number = -1;
	private m_elo:	number = -1; // use to match player with same skill level

	get ws(): WebSocket | null	{ return this.m_ws; }
	get name(): string			{ return this.m_name; }
	get id(): number			{ return this.m_id; }
	get elo(): number			{ return this.m_elo; }

	set name(value: string) { this.m_name = value; }

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

	set owner(value: Player) { this.m_owner = value; }

	constructor(id: string, ownerWs: WebSocket | null)
	{
		this.m_id = id;
		this.m_owner = new Player(ownerWs);
		this.m_state = LobbyState.WAITING;
	}

	public async init(ownerId: number)
	{
		await this.m_owner.init(ownerId);
		this.registerWs(this.m_owner);
		this.m_players.add(this.m_owner);
	}

	public async addPlayer(id: number, ws: WebSocket | null): Promise<DbResponse>
	{
		if (this.m_state != LobbyState.WAITING)
			return { code: 403, data: { message: "cannot add to lobby" }};

		const player = new Player(ws);
		await player.init(id);
		this.registerWs(player);

		this.m_players.add(player);
		Logger.success(player.name, "was added to", this.m_owner.name, "lobby");

		this.broadcast(this.getLobbyState());
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

	public getLobbyState(): any
	{
		const players = Array.from(this.m_players).map(p => (
		{
			id: p.id,
			name: p.name,
			elo: p.elo
		}));

		return (
		{
			message: "UPDATE",
			ownerId: this.m_owner.id,
			ownerName: this.m_owner.name,
			players: players,
			state: this.m_state
		});
	}

	public async leave(id: number): Promise<DbResponse>
	{
		const player = this.findPlayerById(id);
		if (!player)
		{
			return { code: 200, data: { message: "You are not part of the tournament" }};
		}

		if (player.ws)
		{
			player.ws.removeAllListeners();
			if (player.ws.readyState === player.ws.OPEN)
			{
				player.ws.close();
			}
		}
		
		this.m_players.delete(player);
		this.broadcast(this.getLobbyState());

		Logger.success(player.name, "was removed from", this.m_owner.name, "lobby");
		return { code: 200, data: { message: "Success" }};
	}

	public broadcast(json: any)
	{
		for (const p of this.m_players)
		{
			if (p.ws && p.ws.readyState == p.ws.OPEN)
			{
				p.ws.send(JSON.stringify(json));
			}
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
		const bot = await getBotId();
		for (let i = 0; i < nbBot; i++)
		{
			await this.addPlayer(bot, null);
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
			const botId = await getBotId();
			const p1 = this.m_playersLeft[i].id;
			const p2 = this.m_playersLeft[i + 1].id;

			if (p1 == botId && p2 == botId)
			{
				this.botVsBot(p1, p2);
			}
			else if (p1 == botId || p2 == botId)
			{
				this.humanVsBot(p1 != botId ? p1 : p2, botId);
			}
			else
			{
				this.humanVsHuman(p1, p2);
			}
		}

		Logger.log(`${this.m_owner.name} tournament: NEW ROUND (${this.m_playersLeft.length} players left)`);
	}

	private botVsBot(p1: number, p2: number)
	{
		const loser = Math.random() < 0.5 ? p1 : p2;
		this.m_playersLeft = this.m_playersLeft.filter(p => p.id != loser);
	}

	private humanVsBot(playerId: number, botId: number)
	{
		const gameId = crypto.randomUUID();
		const gameInstance = new GameInstance("bot", playerId, botId, gameId);
		this.m_matches.add(gameInstance);
		GameServer.Instance?.activeGames.set(gameId, gameInstance);

		chat.notifyMatch(playerId, botId, gameId, 1, "bot");
	}

	private humanVsHuman(player1Id: number, player2Id: number)
	{
		const gameId = crypto.randomUUID();
		const gameInstance = new GameInstance("online", player1Id, player2Id, gameId);
		this.m_matches.add(gameInstance);
		GameServer.Instance?.activeGames.set(gameId, gameInstance);

		chat.notifyMatch(player1Id, player2Id, gameId, 1);
		chat.notifyMatch(player2Id, player1Id, gameId, 2);
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

