import { GameInstance } from 'modules/game/GameInstance.js';
import { Bot } from 'modules/game/Bot.js';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { core, chat } from 'core/server.js';
import { Tournament } from '../tournament/Tournament.js';
import { Logger } from 'modules/logger.js';
import { BlockchainContract } from 'modules/blockchain/blockChainTournament.js';
import { jwtVerif } from 'modules/jwt/jwt.js';

export class TournamentServer
{
	private static m_instance: TournamentServer | null = null;
	public static get Instance(): TournamentServer | null { return TournamentServer.m_instance; }

	private lobbies: Map<string, any> = new Map(); 
	private activeTournaments: Map<string, Tournament> = new Map();
	private activeGamesMap: Map<string, GameInstance> | null = null;

	private tournamentData: Map<string,
	{
		players: Map<number, string>,
		matchGames: Map<any, string>,
		matchDbIds: Map<any, number>,
		savingMatches: Set<any>,
		rounds: Array<Array<any>>,
		initialParticipants: Array<{ id: string, name: string }>
	}> = new Map();

	private contractAddress: BlockchainContract = new BlockchainContract();
	private botId: number = 0;
	private activeBots: Map<string, Bot> = new Map();

	constructor(private server: FastifyInstance) { TournamentServer.m_instance = this; }

	public setActiveGamesMap(map: Map<string, GameInstance>): void
	{
		this.activeGamesMap = map;
	}

	public async init(): Promise<void>
	{
		try
		{
			const botRow = await core.db.get("SELECT id FROM users WHERE name = ?", ["bot"]);
			if (botRow)
			{
				this.botId = botRow.id;
				Logger.log(`Bot user ID: ${this.botId}`);
			}
			else
			{
				Logger.error('Bot user not found in database');
			}
		}
		catch (error)
		{
			Logger.error('Error getting bot ID:', error);
		}

		try
		{
			this.contractAddress.init();
			Logger.log('smart contract deployyyyyed');
		}
		catch (error)
		{
			Logger.error('Error deploying smart contract: ', error);
		}

		try
		{
			this.createTournament();
			this.getTournament();
			this.listTournaments();
			this.joinTournament();
			this.leaveTournament();
			this.startTournament();
		}
		catch (error)
		{
			Logger.error('Error starting tournament server:', error);
		}
	}

	private listTournaments(): void
	{
		this.server.get('/api/tournaments', async (request, reply) =>
		{
			const list = Array.from(this.lobbies.values()).map(l => (
			{
				id: l.id,
				ownerName: l.ownerName,
				name: l.ownerName + "'s Tournament",
				count: l.players.length,
				type: l.type,
				playerCount: l.players.length,
				status: l.status
			}));

			reply.send(list);
		});
	}

	private getTournament(): void
	{
		this.server.get('/api/tournament/:id', async (request, reply) =>
		{
			try
			{
				const params = request.params as { id: string };
				const tournamentId = params.id;

				const lobby = this.lobbies.get(tournamentId);
				if (lobby)
				{
					reply.send
					({
						id: lobby.id,
						ownerId: lobby.ownerId,
						ownerName: lobby.ownerName,
						type: lobby.type,
						players: lobby.players,
						status: lobby.status
					});

					return ;
				}

				const tournament = this.activeTournaments.get(tournamentId);
				if (tournament)
				{
					const data = this.tournamentData.get(tournamentId);
					if (data)
					{
						reply.send
						({
							id: tournamentId,
							status: 'started',
							players: data.initialParticipants,
							matches: tournament.matches.map(m => ({
								player1: m._player1,
								player2: m._player2,
								winner: m.winner
							}))
						});

						return ;
					}
				}

				reply.status(404).send({ error: 'Tournament not found' });
			}
			catch (error)
			{
				Logger.error('Error getting tournament:', error);
				reply.status(500).send({ error });
			}
		});
	}

	private createTournament(): void
	{
		this.server.post('/api/create-tournament',
		{
			schema:
			{
				body:
				{
					type: "object",
					properties:
					{
						token:	{ type: "string" },
						type:	{ type: "string" },
					},
					required: ["token", "type"]
				}
			}
		},
		async (request: FastifyRequest, reply: FastifyReply) =>
		{
			try
			{
				const body = request.body as { token: string, type: string };
				const { token, type } = body;

				const data: any = await jwtVerif(token, core.sessionKey);
				if (!data)
				{
					Logger.error(`invalid token ${data}`);
					return { code: 400, data: { message: "jwt token invalid" }};
				}

				const userId = data.id;
				const name = await this.getUserName(userId);

				if (name === "Unknown")
				{
					reply.status(404).send({ error: 'User not found' });
					return ;
				}

				if (type !== 'public')
				{
					reply.status(400).send({ error: 'Invalid tournament type' });
					return ;
				}

				let blockchainTournamentId: number = 18;
				try
				{
					Logger.log('BlockchainId before: ', blockchainTournamentId);
					blockchainTournamentId = await this.contractAddress.createTournament();
					Logger.log('BlockchainId after: ', blockchainTournamentId);
				}
				catch (error)
				{
					Logger.log('error creating tournament', error); 
				}

				const tournamentId = crypto.randomUUID();
				const lobby =
				{
					id: tournamentId,
					blockchainId: blockchainTournamentId,
					ownerId: userId,
					ownerName: name,
					type: type,
					players: [{ id: userId, name: name }],
					requests: [],
					status: 'pending'
				};
	
				Logger.log('lobby blockchainId: ', lobby.blockchainId);
				this.lobbies.set(tournamentId, lobby);
				Logger.log(`Tournament ${tournamentId} created by ${name}`);

				reply.status(201).send({ tournamentId });
			}
			catch (error)
			{
				Logger.error('Error creating tournament:', error);
				reply.status(500).send({ error });
			}
		});
	}

	private async getUserName(id: number): Promise<string>
	{
		try
		{
			const numId = Number(id);
			if (isNaN(numId))
			{
				console.error(`Invalid User ID in getUserName: ${id}`);
				return ("Unknown");
			}

			const row = await core.db.get("SELECT name FROM users WHERE id = ?", [numId]);
			return (row ? row.name : "Unknown");
		}
		catch (e)
		{
			console.error('Error getting username:', e);
			return ("Unknown");
		}
	}

	private joinTournament(): void
	{
		this.server.post('/api/join-tournament',
		{
			schema:
			{
				body:
				{
					type: "object",
					properties:
					{
						tournamentId:	{ type: "string" },
						token:			{ type: "string" },
					},
					required: ["tournamentId", "token"]
				}
			}
		},
		async (request: FastifyRequest, reply: FastifyReply) =>
		{
			try
			{
				const body = request.body as { tournamentId: string; token: string };
				const { tournamentId, token } = body;

				const data: any = await jwtVerif(token, core.sessionKey);
				if (!data)
				{
					Logger.error(`invalid token ${data}`);
					return { code: 400, data: { message: "jwt token invalid" }};
				}

				const userId = data.id;
				const name = await this.getUserName(userId);

				if (name === "Unknown")
				{
					console.error(`joinTournament: User ${userId} not found`);
					reply.status(404).send({ error: 'User not found' });
					return ;
				}

				const lobby = this.lobbies.get(tournamentId);
				if (!lobby)
				{
					console.error(`joinTournament: Tournament ${tournamentId} not found`);
					reply.status(404).send({ error: 'Tournament not found' });
					return ;
				}
				
				if (lobby.players.find((p: any) => p.id === userId))
				{
					reply.send({ tournamentId, message: "You are already at this tournament" });
					return ;
				}

				lobby.players.push({ id: userId, name });
				console.log(`User ${userId} (${name}) joined tournament ${tournamentId}. Total players: ${lobby.players.length}`);
				reply.status(200).send({ tournamentId });
			}
			catch (error)
			{
				Logger.error('Error joining tournament:', error);
				reply.status(500).send({ error });
			}
		});
	}

	private leaveTournament(): void
	{
		this.server.post('/api/leave-tournament',
		{
			schema:
			{
				body:
				{
					type: "object",
					properties:
					{
						tournamentId:	{ type: "string" },
						token:			{ type: "number" },
					},
					required: ["tournamentId", "userId"]
				}
			}
		},
		async (request: FastifyRequest, reply: FastifyReply) =>
		{
			const body = request.body as { tournamentId: string, token: string };
			const { tournamentId, token } = body;

			const data: any = await jwtVerif(token, core.sessionKey);
			if (!data)
			{
				Logger.error(`invalid token ${data}`);
				return { code: 400, data: { message: "jwt token invalid" }};
			}

			const userId = data.id;
			const lobby = this.lobbies.get(tournamentId);

			if (lobby)
			{
				if (lobby.ownerId == userId)
				{
					this.lobbies.delete(tournamentId);
				}
				else
				{
					lobby.players = lobby.players.filter((p: any) => p.id != userId);
					lobby.requests = lobby.requests.filter((r: any) => r.id != userId);
				}
			}
			reply.send({ success: true });
		});
	}

	private startTournament(): void
	{
		this.server.post('/api/start-tournament',
		{
			schema:
			{
				body:
				{
					type: "object",
					properties:
					{
						tournamentId:	{ type: "string" },
					},
					required: ["tournamentId"]
				}
			}
		},
		async (request: FastifyRequest, reply: FastifyReply) =>
		{
			try
			{
				const body = request.body as { tournamentId: string };
				const { tournamentId } = body;
				const lobby = this.lobbies.get(tournamentId);

				if (!lobby)
				{
					reply.status(404).send({ error: 'Tournament not found' });
					return ;
				}
				
				const playerMap = new Map<number, string>();
				lobby.players.forEach((p: any) => playerMap.set(p.id, p.name));

				const playerIdsSet: Set<string> = new Set(lobby.players.map((p: any) => String(p.id)));
				const tournament = new Tournament(playerIdsSet);
				
				this.activeTournaments.set(tournamentId, tournament);

				const now = new Date().toISOString();
				try
				{
					await core.db.run
					(
						"INSERT INTO tournaments (id, name, owner_id, status, created_at) VALUES (?, ?, ?, ?, ?)", 
						[tournamentId, "Tournament " + tournamentId.substring(0, 8), lobby.ownerId, 'started', now]
					);

					for (const p of lobby.players)
					{
						await core.db.run
						(
							"INSERT INTO tournament_participants (tournament_id, user_id) VALUES (?, ?)",
							[tournamentId, p.id]
						);
					}
				}
				catch (e: any)
				{ 
					if (e.code === 'SQLITE_CONSTRAINT')
					{
						console.error("Tournament already exists or constraint failed:", e.message);
					}
					else
					{
						console.error("Error saving tournament info:", e);
					}
				}

				const matchDbIds = new Map<any, number>();
				for (const m of tournament.matches)
				{
					let p1 = m._player1.startsWith('Bot') ? this.botId : Number(m._player1);
					let p2 = m._player2.startsWith('Bot') ? this.botId : Number(m._player2);

					try
					{
						const res = await core.db.run
						(
							"INSERT INTO tournament_matches (tournament_id, player1_id, player2_id, played_at) VALUES (?, ?, ?, ?)",
							[tournamentId, p1, p2, now]
						);

						if (res && res.lastID)
						{
							matchDbIds.set(m, res.lastID);
						}
					}
					catch(e)
					{
						console.error("Error saving match:", e);
					}
				}

				const initialParticipants = tournament.players.map(pId =>
				{
					if (pId.startsWith('Bot'))
					{
						return { id: pId, name: pId };
					}

					return { id: pId, name: playerMap.get(Number(pId)) || 'Unknown' };
				});

				this.tournamentData.set(tournamentId,
				{
					players: playerMap,
					matchGames: new Map(),
					matchDbIds: matchDbIds,
					savingMatches: new Set(),
					rounds: [],
					initialParticipants: initialParticipants
				});

				this.lobbies.delete(tournamentId);
				this.startTournamentRound(tournamentId, tournament);
				reply.status(200).send({ message: 'Tournament started successfully' });
			}
			catch (error)
			{
				console.error('Error starting tournament:', error);
				reply.status(500).send({ error });
			}
		});
	}

	private startTournamentRound(tournamentId: string, tournament: Tournament): void
	{
		for (const match of tournament.matches)
		{
			this.createTournamentMatch(tournamentId, tournament, match);
		}
	}

	private createTournamentMatch(tournamentId: string, tournament: Tournament, match: any): void
	{
		const data = this.tournamentData.get(tournamentId);
		if (!data)
		{
			console.error(`No tournament data found`);
			return ;
		}

		if (match.isBotVsBot())
		{
			this.simulateBotMatch(tournamentId, tournament, match);
			return ;
		}

		const gameId = crypto.randomUUID();
		data.matchGames.set(match, gameId);

		if (match.isHumanVsBot())
		{
			const humanPlayer = match.getHumanPlayer();
			const botPlayer = match.getBotPlayer();
			const humanId = Number(humanPlayer);
			
			const p1Id = match._player1 === humanPlayer ? humanId : this.botId;
			const p2Id = match._player2 === humanPlayer ? humanId : this.botId;
			const botIsPlayer2 = match._player2 === botPlayer;
			
			const game = new GameInstance('online', p1Id, p2Id);
			
			if (botIsPlayer2)
			{
				game.p2Ready = true;
			}
			else
			{
				game.p1Ready = true;
			}
			
			if (this.activeGamesMap)
			{
				this.activeGamesMap.set(gameId, game);
			}
			else
			{
				Logger.error(`[Tournament ${tournamentId}] activeGamesMap not set!`);
				return;
			}
			
			const botPlayerSide = botIsPlayer2 ? 2 : 1;
			setTimeout(() =>
			{
				if (game.reversedBuffer)
				{
					const bot = new Bot(gameId, game.reversedBuffer, botPlayerSide);
					this.activeBots.set(gameId, bot);
					Logger.log(`[Tournament ${tournamentId}] Bot created for game ${gameId} as player ${botPlayerSide}`);
				}
				else
				{
					Logger.error(`[Tournament ${tournamentId}] Cannot create bot: game state not ready`);
				}
			}, 500);
			
			this.monitorMatchEnd(tournamentId, tournament, match, gameId, game);
			
			const playerNum = botIsPlayer2 ? 1 : 2;
			chat.notifyMatch(humanId, this.botId, gameId, playerNum);
			return ;
		}

		const p1Id = match._player1;
		const p2Id = match._player2;
		const game = new GameInstance('online', Number(p1Id), Number(p2Id));
		if (this.activeGamesMap)
		{
			this.activeGamesMap.set(gameId, game);
		}
		else
		{
			Logger.error(`[Tournament ${tournamentId}] activeGamesMap not set!`);
			return ;
		}

		this.monitorMatchEnd(tournamentId, tournament, match, gameId, game);
		
		chat.notifyMatch(Number(p1Id), Number(p2Id), gameId, 1);
		chat.notifyMatch(Number(p2Id), Number(p1Id), gameId, 2);
	}

	private monitorMatchEnd(tournamentId: string, tournament: Tournament, match: any, gameId: string, game: GameInstance): void
	{
		const checkInterval = setInterval(() =>
		{
			if (game.winnerName !== null)
			{
				clearInterval(checkInterval);
				
				if (this.activeBots.has(gameId))
				{
					const bot = this.activeBots.get(gameId);
					if (bot)
					{
						bot.destroy();
						this.activeBots.delete(gameId);
						Logger.log(`[Tournament ${tournamentId}] Bot cleaned up for game ${gameId}`);
					}
				}
				
				let winnerPlayerString: string;
				const winnerId = Number(game.winnerName);
				
				if (match.isHumanVsBot())
				{
					if (winnerId === this.botId)
					{
						winnerPlayerString = match.getBotPlayer()!;
					}
					else
					{
						winnerPlayerString = match.getHumanPlayer()!;
					}
				}
				else
				{
					winnerPlayerString = String(winnerId);
				}
				
				this.onTournamentMatchEnd(tournamentId, tournament, match, winnerPlayerString);
			}
		}, 1000);
	}

	private simulateBotMatch(tournamentId: string, tournament: Tournament, match: any): void
	{
		let winner = Math.random() < 0.5 ? match._player1 : match._player2;
		let score1;
		let score2;

		if (winner === match._player1)
		{
			score1 = 3;
			score2 = 0;
		}
		else if (winner === match._player2)
		{
			score2 = 3;
			score1 = 0;
		}
		
		match._score1 = score1;
		match._score2 = score2;
		
		setTimeout(() =>
		{
			this.onTournamentMatchEnd(tournamentId, tournament, match, winner);
		}, 2000);
	}

	private onTournamentMatchEnd(tournamentId: string, tournament: Tournament, match: any, winnerPlayerString: string): void
	{
		const data = this.tournamentData.get(tournamentId);
		if (!data)
		{
			console.error(`No tournament data found on match end`);
			return ;
		}

		try
		{
			match.winner = winnerPlayerString;
		}
		catch (e)
		{
			console.error(`Error setting match winner:`, e);
			return ;
		}

		const allMatchesFinished = tournament.matches.every(m => m.winner !== null);
		if (allMatchesFinished)
		{
			const winners = new Set<string>();
			for (const m of tournament.matches)
			{
				if (m.winner)
				{
					winners.add(m.winner);
				}
			}

			if (winners.size === 1)
			{
				tournament.isFinished = true;
				return ;
			}

			const nextTournament = new Tournament(winners, tournament._depth + 1);
			tournament.next = nextTournament;
			this.startTournamentRound(tournamentId, nextTournament);
		}
	}
}
