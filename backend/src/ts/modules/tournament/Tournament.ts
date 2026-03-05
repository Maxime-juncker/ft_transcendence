import { DbResponse } from "core/server.js";
import { Logger } from "modules/logger.js";
import { WebSocket } from '@fastify/websocket';
import { PublicLobby } from "./PublicLobby.js";
import { Lobby, LobbyState } from 'modules/tournament/Lobby.js';
import { log } from "console";
import { BlockchainContract } from "modules/blockchain/blockChainTournament.js";


export class TournamentManager
{
	private m_lobbies:	Lobby[] = [];
	private contractAddress: BlockchainContract = new BlockchainContract();

	constructor()
	{
		this.m_lobbies = [];
		this.m_lobbies.push(new PublicLobby()); // default lobby for online games
		this.contractAddress.init();
	}

	public getContractAddress(): BlockchainContract
	{
		return (this.contractAddress);
	}

	/**
	* create a new lobby
	* @param ownerId the owner id of the lobby
	*/
	public async createLobby(ownerId: number, ownerWs: WebSocket): Promise<DbResponse>
	{
		this.cleanupFinishedLobbies();

		if (this.findPlayerInLobbies(ownerId))
		{
			return { code: 409, data: { message: "you can't create a lobby while in another one" }};
		}

		if (ownerWs.readyState != ownerWs.OPEN)
			return { code: 400, data: { message: "invalid websocket" }};

		let blockchainTournamentId;
		try
		{
			blockchainTournamentId = await this.contractAddress.createTournament();
		}
		catch (err)
		{
			Logger.error("Error creating lobby:", err);
			return { code: 500, data: { message: "internal server error" }};
		}

		const id = crypto.randomUUID();
		const lobby = new Lobby(id, ownerWs, blockchainTournamentId, this.contractAddress);
		await lobby.init(ownerId);
		this.m_lobbies.push(lobby);

		const initialState = lobby.getLobbyState();
		ownerWs.send(JSON.stringify({ ...initialState, message: "created", lobbyId: id}));
		Logger.success(lobby.owner.name, "created tournament, id:", lobby.id);
		return { code: 200, data: { message: "lobby created", id: id }};
	}

	private findPlayerInLobbies(id: number): boolean
	{
		for (const lobby of this.m_lobbies)
		{
			if (lobby.state === LobbyState.FINISHED)
			{
				continue;
			}
			
			for (const player of lobby.players)
			{
				if (player.id === id)
				{
					return (true);
				}
			}
		}

		return (false);
	}

	public async leaveLobby(userId: number, lobbyId: string): Promise<DbResponse>
	{
		for (let i = 0; i < this.m_lobbies.length; i++)
		{
			const lobby = this.m_lobbies[i];
			if (lobby.id == lobbyId)
			{
				const result = await this.m_lobbies[i].leave(userId);

				if (lobby.players.size == 0 && !(lobby instanceof PublicLobby))
				{
					Logger.log("Deleting lobby with id:", lobby.id);
					this.m_lobbies.splice(i, 1);
				}
				else if (userId == lobby.owner.id && !(lobby instanceof PublicLobby))
				{
					Logger.log("Owner left lobby with id:", lobby.id, "assigning new owner");
					const newOwner = Array.from(lobby.players)[0];
					this.m_lobbies[i].owner = newOwner;
					this.m_lobbies[i].broadcast(this.m_lobbies[i].getLobbyState());
				}

				return (result);
			}
		}

		return { code: 404, data: { message: "[leaveLobby] lobby not found" }};
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

	public getActiveTournaments()
	{
		this.cleanupFinishedLobbies();
		
		const tournaments = [];

		for (let i = 0; i < this.m_lobbies.length; i++)
		{
			const lobby = this.m_lobbies[i];
			if (lobby.id === "0" || lobby.id === "" || lobby.state !== 0)
			{
				continue ;
			}

			tournaments.push
			({
				id: lobby.id,
				ownerName: lobby.owner.name,
				playerCount: lobby.players.size,
				type: "tournament"
			});
		}

		return { code: 200, data: tournaments };
	}

	private cleanupFinishedLobbies()
	{
		for (let i = this.m_lobbies.length - 1; i >= 0; i--)
		{
			const lobby = this.m_lobbies[i];
			if (lobby.state === LobbyState.FINISHED && !(lobby instanceof PublicLobby))
			{
				Logger.log("Cleaning up finished lobby:", lobby.id);
				this.m_lobbies.splice(i, 1);
			}
		}
	}

	public async addPlayerToLobby(id: number, ws: WebSocket | null, lobbyId: string): Promise<DbResponse>
	{
		this.cleanupFinishedLobbies();
		
		if (this.findPlayerInLobbies(id))
		{
			return { code: 409, data: { message: "you are already in a lobby" }};
		}

		for (let i = 0; i < this.m_lobbies.length; i++)
		{
			if (this.m_lobbies[i].id == lobbyId)
			{
				return (this.m_lobbies[i].addPlayer(id, ws));
			}
		}

		return { code: 404, data: { message: "[addPlayerToLobby] lobby not found" }};
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

		return { code: 404, data: { message: "[startLobby] lobby not found" }};
	}
}

