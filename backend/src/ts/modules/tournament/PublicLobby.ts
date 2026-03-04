import { Lobby, LobbyState, Player } from 'modules/tournament/Lobby.js';
import { Logger } from 'modules/logger.js';
import { DbResponse, chat } from 'core/server.js';
import { GameServer } from 'modules/game/GameServer.js'
import { GameInstance } from "modules/game/GameInstance.js";
import { WebSocket } from '@fastify/websocket';
import { getBlockUser } from 'modules/users/user.js';
import { BlockchainContract } from 'modules/blockchain/blockChainTournament.js';

export class PublicLobby extends Lobby
{
	public static readonly maxEloDiff		= process.env.MAX_ELO_DIFF ? Number(process.env.MAX_ELO_DIFF) : -1;
	public static readonly checkMatchTimer	= 5 * 1000; // matchming every 5sec
	public static readonly retryEloBoost	= 10;

	private m_timerId: NodeJS.Timeout | null; // used to launch match every 10sec

	constructor()
	{
		super("0", null, 0, new BlockchainContract());
		this.m_timerId = null;
		this.owner.name = "public";

		Logger.log("creating public lobby:");
		Logger.log("\tmax elo diff:", PublicLobby.maxEloDiff);
		Logger.log("\trunning matchmaking every", PublicLobby.checkMatchTimer / 1000, "sec");
		Logger.log("\tretry elo boost:", PublicLobby.retryEloBoost);
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

	public async leave(id: number): Promise<DbResponse>
	{
		const res = await super.leave(id);
		if (this.players.size < 2 && this.m_timerId)
		{
			Logger.log(`${this.players.size} in ${this.owner.name} ${this.id}, stopping matchmaking`);
			clearInterval(this.m_timerId);
			this.m_timerId = null;
		}

		return res;
	}

	public async addPlayer(id: number, ws: WebSocket | null): Promise<DbResponse>
	{
		if (!chat.isUserConnected(id))
		{
			Logger.warn(`user (id: ${id}) tried to connected to public lobby ${this.id} without connecting to chat`);
			return { code: 403, data: { message: "To access public lobby, please connect to chat" }};
		}

		const p = new Player(null);
		await p.init(id);
		this.players.add(p);

		if (this.players.size >= 2 && this.m_timerId == null)
		{
			Logger.success(`${this.players.size} in ${this.owner.name} ${this.id}, starting matchmaking`);
			this.m_timerId = setInterval(() => this.nextRound(), PublicLobby.checkMatchTimer);
			this.nextRound();
		}

		Logger.log(`adding ${p.name} to public lobby`);
		return { code: 200, data: { message: "Success" }};
	}


	private getClosestEloTo(player: Player): Player | null
	{
		if (this.players.size <= 1)
			return null;

		var closest: Player | null = null;
		for (const p of this.players)
		{
			if (p.id == player.id)
				continue;

			if (closest == null)
			{
				closest = p;
				continue;
			}

			if (Math.abs(player.elo - p.elo) < Math.abs(player.elo - closest.elo))
			{
				closest = p;
			}
		}

		return closest;
	}

	private async findPlayer(p: Player): Promise<number>
	{
		if (this.m_players.size <= 1)
		{
			Logger.log("not enought player to start public game");
			return -2;
		}

		const gameId = crypto.randomUUID();

		var p2: Player | null = this.getClosestEloTo(p);
		if (!p2)
		{
			Logger.error("undefined player in queue:\n\tp1:", p, "\n\tp2:", p2);
			return -1;
		}

		const res = await getBlockUser(p.id, p2.id);
		if (res.code == 200)
		{
			Logger.debug(p.name, "block or is blocked by", p2.name);
			return 0;
		}

		var diff = Math.abs(p.elo - p2.elo);
		// matchmaking become more lenient the more time player wait
		diff = Math.max(0, diff - (PublicLobby.retryEloBoost * p.matchmakingRetry));

		if (diff > PublicLobby.maxEloDiff && PublicLobby.maxEloDiff > 0)
		{
			Logger.warn(`can't start match for ${p.name}, min elo diff too big (${diff})`);
			p.matchmakingRetry++;
			return 0;
		}

		this.leave(p.id);
		this.leave(p2.id);

		chat.notifyMatch(p.id, p2.id, gameId, 1);
		chat.notifyMatch(p2.id, p.id, gameId, 2);

		GameServer.Instance?.activeGames.set(gameId, new GameInstance('online', p.id, p2.id, gameId));
		Logger.log(`PUB LOBBY (${this.id}): NEW ROUND (${p.name} vs ${p2.name})`);
		return 1;
	}

	public async nextRound()
	{
		for (const player of this.players)
		{
			const retval = await this.findPlayer(player);
			if (retval == 1)
			{
				if (this.players.size < 2 && this.m_timerId)
				{
					Logger.log(`${this.players.size} in ${this.owner.name} ${this.id}, stopping matchmaking`);
					clearInterval(this.m_timerId);
					this.m_timerId = null;
					return;
				}
				this.nextRound();
				return;
			}
			else if (retval < 0)
			{
				Logger.error(`error when starting matchmaking for ${player.name}, code: ${retval}`);
				return;
			}
		}
	}
}
