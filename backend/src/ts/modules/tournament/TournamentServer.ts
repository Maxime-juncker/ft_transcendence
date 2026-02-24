import { GameInstance } from 'modules/game/GameInstance.js';
import { Bot } from 'modules/game/Bot.js';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { core, chat, rateLimitHard } from 'core/server.js';
import { Tournament } from '../tournament/Tournament.js';
import { Logger } from 'modules/logger.js';
import { BlockchainContract } from 'modules/blockchain/blockChainTournament.js';
import { jwtVerif } from 'modules/jwt/jwt.js';
import { getBot } from 'modules/users/userManagment.js';
import { getUserName } from 'modules/users/user.js';

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
		savingMatches: Set<any>,
		rounds: Array<Array<any>>,
		initialParticipants: Array<{ id: number, name: string }>,
		blockchainId?: number
	}> = new Map();

	private contractAddress: BlockchainContract = new BlockchainContract();
	private botId: number = 1;
	private activeBots: Map<string, Bot> = new Map();

	constructor(private server: FastifyInstance) { TournamentServer.m_instance = this; }

	public setActiveGamesMap(map: Map<string, GameInstance>): void
	{
		this.activeGamesMap = map;
	}

	public async init(): Promise<void>
	{
		this.botId = await getBot();

		try
		{
			this.contractAddress.init();
			Logger.log('smart contract deployed');
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
			this.getTournamentOnChain();
		}
		catch (error)
		{
			Logger.error('Error starting tournament server:', error);
		}
	}

	private getTournamentOnChain() {
		this.server.get('/api/blockchain/tournaments', async (request: FastifyRequest, reply: FastifyReply) =>
		{
			let tournaments = await this.contractAddress.getTournaments();
			let array = Array.from(tournaments, ([address, winner ]) => ({address, winner}));

			Logger.log("fetching finished tournaments from blockchain", array);
			return reply.send(array);
		})
	}

	private listTournaments(): void
	{
		this.server.get('/api/tournaments', async (request: FastifyRequest, reply: FastifyReply) =>
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
							matches: tournament.matches.map(m =>
							({
								player1: m._player1Id,
								player2: m._player2Id,
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
			},
			config:
			{
				rateLimit: rateLimitHard
			},
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
					return { code: 400, data: { error: "jwt token invalid" }};
				}

				const userId = data.id;
				const name = await getUserName(userId);

				if (!name)
				{
					reply.status(404).send({ error: 'User not found' });
					return ;
				}

				if (type !== 'public')
				{
					reply.status(422).send({ error: 'Invalid tournament type' });
					return ;
				}

				let blockchainTournamentId = -1;
				try
				{
					blockchainTournamentId = await this.contractAddress.createTournament();
				}
				catch (error)
				{
					Logger.error('error creating tournament', error); 
					return ;
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
	
				this.lobbies.set(tournamentId, lobby);
				reply.status(201).send({ tournamentId });
			}
			catch (error)
			{
				Logger.error('Error creating tournament:', error);
				reply.status(500).send({ error });
			}
		});
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
					return { code: 400, data: { error: "jwt token invalid" }};
				}

				const userId = data.id;
				const name = await getUserName(userId) || "Unknown";
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
				Logger.log(`User ${userId} (${name}) joined tournament ${tournamentId}. Total players: ${lobby.players.length}`);
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
				const body = request.body as { tournamentId: string, token: string };
				const { tournamentId, token } = body;

				const data: any = await jwtVerif(token, core.sessionKey);
				if (!data)
				{
					Logger.error(`invalid token ${data}`);
					return { code: 400, data: { error: "jwt token invalid" }};
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
					reply.status(200).send({ success: true });
				}
				else
				{
					reply.status(404).send({ error: 'Tournament not found' });
				}
			}
			catch (error)
			{
				Logger.error('Error leaving tournament:', error);
				reply.status(500).send({ error });
			}
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
					return { code: 400, data: { error: "jwt token invalid" }};
				}

				const userId = data.id;
				if (userId != this.lobbies.get(tournamentId)?.ownerId)
				{
					reply.status(403).send({ error: 'You are not the owner of this tournament' });
					return ;
				}

				if (this.activeTournaments.has(tournamentId))
				{
					reply.status(409).send({ message: 'Tournament already started' });
					return ;
				}

				const lobby = this.lobbies.get(tournamentId);
				if (!lobby)
				{
					reply.status(404).send({ error: 'Tournament not found' });
					return ;
				}

				if (lobby.status === 'starting')
				{
					reply.status(200).send({ message: 'Tournament is starting' });
					return ;
				}

				lobby.status = 'starting';

				const playerMap = new Map<number, string>();
				lobby.players.forEach((p: any) => playerMap.set(p.id, p.name));

				const playerIdsSet: Set<number> = new Set(lobby.players.map((p: any) => p.id));
				const tournament = await Tournament.create(playerIdsSet);
				
				this.activeTournaments.set(tournamentId, tournament);
				const initialParticipants = tournament.players.map(pId =>
				{
					if (pId === this.botId)
					{
						return { id: pId, name: 'Bot' };
					}

					return { id: pId, name: playerMap.get(pId) || 'Unknown' };
				});

				this.tournamentData.set(tournamentId,
				{
					players: playerMap,
					matchGames: new Map(),
					savingMatches: new Set(),
					rounds: [],
					initialParticipants: initialParticipants,
					blockchainId: lobby.blockchainId
				});

				this.lobbies.delete(tournamentId);
				this.startTournamentRound(tournamentId, tournament);
				reply.status(200).send({ message: 'Tournament started' });
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
			const humanId = humanPlayer;

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
		const game = new GameInstance('online', p1Id, p2Id);
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
		
		chat.notifyMatch(p1Id, p2Id, gameId, 1);
		chat.notifyMatch(p2Id, p1Id, gameId, 2);
	}

	private monitorMatchEnd(tournamentId: string, tournament: Tournament, match: any, gameId: string, game: GameInstance): void
	{
		const checkInterval = setInterval(() =>
		{
			if (game.winner !== null)
			{
				clearInterval(checkInterval);

				if (this.activeBots.has(gameId))
				{
					const bot = this.activeBots.get(gameId);
					if (bot)
					{
						bot.destroy();
						this.activeBots.delete(gameId);
					}
				}

				match.score1 = game.p1Score;
				match.score2 = game.p2Score;

				let winnerPlayerId: number;

				if (match.isHumanVsBot())
				{
					if (game.winner === this.botId)
					{
						winnerPlayerId = match.getBotPlayer()!;
					}
					else
					{
						winnerPlayerId = match.getHumanPlayer()!;
					}
				}
				else
				{
					winnerPlayerId = game.winner;
				}

				this.onTournamentMatchEnd(tournamentId, tournament, match, winnerPlayerId);
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

	private async onTournamentMatchEnd(tournamentId: string, tournament: Tournament, match: any, winnerPlayerId: number): Promise<void>
	{
		const data = this.tournamentData.get(tournamentId);
		if (!data)
		{
			console.error(`No tournament data found on match end`);
			return ;
		}

		try
		{
			match.winner = winnerPlayerId;
		}
		catch (e)
		{
			console.error(`Error setting match winner:`, e);
			return ;
		}

		const allMatchesFinished = tournament.matches.every(m => m.winner);
		if (allMatchesFinished)
		{
			const winners = new Set<number>();
			for (const matches of tournament.matches)
			{
				if (matches.winner)
				{
					if (data.blockchainId !== -1)
					{
						try
						{
							Logger.log(`Adding match result to blockchain: ${data.blockchainId} ${matches._player1Id} ${matches._player2Id} ${matches._score1} ${matches._score2}`);
							await this.contractAddress.addMatchResult(data.blockchainId!, matches._player1Id, matches._player2Id, matches._score1, matches._score2);
						}
						catch (error)
						{
							Logger.error('Error adding match result to blockchain:', error);
						}
					}

					winners.add(matches.winner);
				}
			}

			if (winners.size === 1)
			{
				tournament.isFinished = true;

				const winnerId = Array.from(winners)[0];
				const blockchainId = data.blockchainId;

				if (typeof blockchainId === 'number' && winnerId && blockchainId != -1)
				{
					try
					{
						await this.contractAddress.finishTournament(blockchainId, winnerId);
					}
					catch (error)
					{
						Logger.error(`[Tournament ${tournamentId}] Error finishing tournament on blockchain:`, error);
					}
				}

				this.activeTournaments.delete(tournamentId);
				this.tournamentData.delete(tournamentId);
				return ;
			}

			const nextTournament = await Tournament.create(winners, tournament._depth + 1);
			tournament.next = nextTournament;
			this.activeTournaments.set(tournamentId, nextTournament);
			this.startTournamentRound(tournamentId, nextTournament);
		}
	}
}
