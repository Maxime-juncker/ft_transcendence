import { GameInstance } from './GameInstance.js';
import { Bot } from './Bot.js';
import { FastifyInstance } from 'fastify';
import { getUserByName } from '@modules/users/user.js';
import * as core from 'core/core.js';
import { addPlayerToQueue, notifyMatch } from '@modules/chat/chat.js';
import { Tournament } from './Tournament.js';
import { BlockchainContract } from '../blockchain/blockchainTournament.js';

export class GameServer
{
	private static readonly FPS: number = 60;
	private static readonly FPS_INTERVAL: number = 1000 / GameServer.FPS;
	private static readonly BOT_FPS: number = 1;
	private static readonly BOT_FPS_INTERVAL: number = 1000 / GameServer.BOT_FPS;

	public activeGames: Map<string, GameInstance> = new Map();
	private bots: Map<string, Bot> = new Map();

	private lobbies: Map<string, any> = new Map(); 
	private activeTournaments: Map<string, Tournament> = new Map();

	private tournamentData: Map<string,
	{
		players: Map<number, string>,
		matchGames: Map<any, string>,
		matchDbIds: Map<any, number>,
		savingMatches: Set<any>,
		rounds: Array<Array<any>>,
		initialParticipants: Array<{ id: string, name: string }>
	}> = new Map();

	private contractAdress: BlockchainContract = new BlockchainContract();

	private botId: number = 0;

	constructor(private server: FastifyInstance) {}

	public async init(): Promise<void>
	{
		try
		{
			const botUser = await getUserByName("bot", core.db);
			if (botUser.code === 200)
			{
				this.botId = botUser.data.id;
			}

			this.createGame();
			this.startGame();
			this.sendGameState();
			this.contractAdress.deployFactory();
			this.listTournaments();
			this.createTournament();
			this.getTournamentInfo();
			this.joinTournament();
			this.handleTournamentRequest();
			this.leaveTournament();
			this.startTournament();

			setInterval(() => this.processTournaments(), 1000);
		}
		catch (error)
		{
			console.error('Error starting server:', error);
		}
	}



	private async handleGameCompletion(gameId: string, game: GameInstance)
	{
		for (const [tId, data] of this.tournamentData)
		{
			for (const [match, matchedGameId] of data.matchGames.entries())
			{
				if (matchedGameId === gameId && !match.winner)
				{
					const winId = game.winner;
					let winStr = String(winId);

					const p1 = match._player1;
					const p2 = match._player2;
					
					let p1Id: number = p1.startsWith('Bot') ? this.botId : Number(p1);
					let p2Id: number = p2.startsWith('Bot') ? this.botId : Number(p2);

					if (winId === p1Id)
					{
						winStr = p1;
					}
					else if (winId === p2Id)
					{
						winStr = p2;
					}

					match.winner = winStr;
					match._score1 = game.p1Score;
					match._score2 = game.p2Score;

					const matchId = data.matchDbIds.get(match);
					if (matchId)
					{
						await core.db.run
						(
							"UPDATE tournament_matches SET winner_id = ?, score1 = ?, score2 = ?, played_at = ? WHERE id = ?",
							[winId, game.p1Score, game.p2Score, new Date().toISOString(), matchId]
						).catch((e: any) => console.error("Error updating match score:", e));
					}
					
					const tournament = this.activeTournaments.get(tId);
					if (tournament)
					{
						const end = tournament.matches.every(m => m.winner !== null);
						if (end)
						{
							const winners = new Set<string>();
							tournament.matches.forEach(m =>
							{
								if (m.winner)
								{
									winners.add(m.winner);
								}
							});

							if (winners.size === 1)
							{
								data.rounds.push(tournament.matches);
								const winner = winners.values().next().value;
								if (winner === undefined)
								{
									console.error("Tournament winner is undefined!");
									return ;
								}

								let tournamentWinnerId = winner.startsWith('Bot') ? this.botId : Number(winner);

								tournament.isFinished = true;
								core.db.run
								(
									"UPDATE tournaments SET status = 'finished', winner_id = ? WHERE id = ?",
									[tournamentWinnerId, tId]
								).catch(e => console.error("Error finishing tournament", e));
							}
							else
							{
								data.rounds.push(tournament.matches);
								const nextRound = new Tournament(winners, tournament._depth + 1);
								tournament.next = nextRound;
								this.activeTournaments.set(tId, nextRound);
							}
						}
					}
					return;
				}
			}
		}
	}

	private async processTournaments()
	{
		for (const [tournamentId, tournament] of this.activeTournaments)
		{
			const data = this.tournamentData.get(tournamentId);
			if (!data)
				continue;

			if (tournament.isFinished)
				continue;

			for (const match of tournament.matches)
			{
				if (!data.matchDbIds.has(match) && !data.savingMatches.has(match))
				{
					data.savingMatches.add(match);
					let p1 = match._player1.startsWith('Bot') ? this.botId : Number(match._player1);
					let p2 = match._player2.startsWith('Bot') ? this.botId : Number(match._player2);

					try
					{
						const res = await core.db.run
						(
							"INSERT INTO tournament_matches (tournament_id, player1_id, player2_id, played_at) VALUES (?, ?, ?, ?)",
							[tournamentId, p1, p2, new Date().toISOString()]
						);

						if (res && res.lastID)
						{
							data.matchDbIds.set(match, res.lastID);
						}
					}
					catch(e)
					{
						console.error("Error saving new round match:", e); 
					}
					finally
					{
						data.savingMatches.delete(match);
					}
				}

				if (match.winner)
				{
					continue ;
				}

				if (data.matchGames.has(match))
				{
					const gameId = data.matchGames.get(match)!;
					const game = this.activeGames.get(gameId);
					
					if (!game)
					{
						data.matchGames.delete(match);
						continue ;
					}

					if (game && game.winner)
					{
						const winId = game.winner;
						let winStr = String(winId);

						const p1 = match._player1;
						const p2 = match._player2;
						
						let p1Id: number = p1.startsWith('Bot') ? this.botId : Number(p1);
						let p2Id: number = p2.startsWith('Bot') ? this.botId : Number(p2);

						if (winId === p1Id)
							winStr = p1;
						else if (winId === p2Id)
							winStr = p2;

						try { match.winner = winStr; } catch (e) {}

						const matchId = data.matchDbIds.get(match);
						if (matchId)
						{
							core.db.run(
								"UPDATE tournament_matches SET winner_id = ?, score1 = ?, score2 = ?, played_at = ? WHERE id = ?",
								[winId, game.p1Score, game.p2Score, new Date().toISOString(), matchId]
							).catch((e: any) => console.error("Error updating match score:", e));
						}

						const allFinished = tournament.matches.every(m => m.winner !== null);
						if (allFinished)
						{
							const winners = new Set<string>();
							tournament.matches.forEach(m =>
							{
								if (m.winner)
								{
									winners.add(m.winner);
								}
							});

							if (winners.size === 1)
							{
								data.rounds.push(tournament.matches);
								const winner = winners.values().next().value;
								if (winner === undefined)
								{
									console.error("Tournament winner is undefined!");
									return ;
								}

								let tournamentWinnerId = winner.startsWith('Bot') ? this.botId : Number(winner);

								tournament.isFinished = true;
								core.db.run(
									"UPDATE tournaments SET status = 'finished', winner_id = ? WHERE id = ?",
									[tournamentWinnerId, tournamentId]
								).catch(e => console.error("Error finishing tournament", e));
							}
							else
							{
								data.rounds.push(tournament.matches);
								const nextRound = new Tournament(winners, tournament._depth + 1);
								tournament.next = nextRound;
								this.activeTournaments.set(tournamentId, nextRound);
							}
						}
					}
					continue ;
				}

				const p1IdStr = match._player1;
				const p2IdStr = match._player2;
				const p1Id = p1IdStr.startsWith('Bot') ? this.botId : Number(p1IdStr);
				const p2Id = p2IdStr.startsWith('Bot') ? this.botId : Number(p2IdStr);

				if (!p1Id || !p2Id || isNaN(p1Id) || isNaN(p2Id))
				{
					continue ;
				}

				const gameId = crypto.randomUUID();
				let mode = 'online';
				if (p1Id === this.botId || p2Id === this.botId)
				{
					mode = 'bot';
				}

				const game = new GameInstance(mode, p1Id, p2Id);
				this.activeGames.set(gameId, game);
				data.matchGames.set(match, gameId);
				
				notifyMatch(p1Id, p2Id, gameId, 1);
				notifyMatch(p2Id, p1Id, gameId, 2);
				
				const originalDestroy = game.destroy.bind(game);
				game.destroy = () =>
				{
					originalDestroy();
				};
			}
		}
	}

	private createGame(): void
	{
		this.server.post('/api/create-game', async (request, reply) =>
		{
			try
			{
				const body = request.body as { mode: string; playerName: number};
				const mode = body.mode;
				const name = Number(body.playerName);
				
				if (mode === 'online')
				{
					for (const [id, game] of this.activeGames)
					{
						if (game.mode === 'online')
						{
							if ((game.player1Id == name || game.player2Id == name) && !game.winnerName)
							{
								const opponentId = (game.player1Id == name) ? game.player2Id : game.player1Id;
								const playerSide = (game.player1Id == name) ? '1' : '2';
								reply.status(200).send({ gameId: id, opponentId: opponentId, playerSide: playerSide });
								return ;
							}
						}
					}
				}

				if (mode === 'local')
				{
					const gameId = crypto.randomUUID();
					const opponentId = 0;
					const game = new GameInstance(mode, name, opponentId);
					this.activeGames.set(gameId, game);
					reply.status(201).send({ gameId, opponentId: opponentId, playerSide: '1' });
				}
				else if (mode === 'online')
				{
					await addPlayerToQueue(Number(name), this);
					reply.status(202).send({ message: "added to queue" });
				}
				else if (mode === 'bot')
				{
					const gameId = crypto.randomUUID();
					const data = await getUserByName("bot", core.db);
					const opponentId = data.data.id;
					const game = new GameInstance(mode, name, opponentId);
					this.activeGames.set(gameId, game);
					reply.status(201).send({ gameId, opponentId: opponentId, playerSide: '1' });
				}
				else
				{
					reply.status(400).send({ error: 'Invalid game mode' });
				}
			}
			catch (error)
			{
				console.error('Error creating game:', error);
				reply.status(500).send({ error });
			}
		});
	}

	private startGame(): void
	{
		this.server.post('/api/start-game/:gameId', (request, reply) =>
		{
			try
			{
				const { gameId } = request.params as { gameId: string };
				const body = request.body as { userId: number };
				const userId = body ? Number(body.userId) : null;
				
				const game = this.activeGames.get(gameId);

				if (game)
				{
					let playerIdentified = false;
					
					if (game.mode === 'online' || game.mode === 'bot') {
						
						if (userId)
						{
							if (userId == game.player1Id)
							{
								game.p1Ready = true;
								playerIdentified = true;
							}
							else if (userId == game.player2Id)
							{
								game.p2Ready = true;
								playerIdentified = true;
							}
						}

						if (!playerIdentified)
						{
							if (game.mode !== 'online') 
							{
								if (!game.p1Ready)
								{
									game.p1Ready = true;
								}
								else if (!game.p2Ready)
								{
									game.p2Ready = true;
								}
							}
						}
						
						if (game.mode === 'bot')
						{
							if (game.player1Id === this.botId) game.p1Ready = true;
							if (game.player2Id === this.botId) game.p2Ready = true;
						}

						console.log(`Game ${gameId} Ready Status: P1=${game.p1Ready}, P2=${game.p2Ready}`);
						if (game.p1Ready && game.p2Ready)
						{
							console.log(`Game ${gameId} is now RUNNING`);
							game.running = true;
						}
					}
					else
					{
						game.running = true;
					}
					
					reply.status(200).send(game.state);

					if (game.mode === 'bot' && game.reversedBuffer)
					{
						this.bots.set(gameId, new Bot(gameId, game.reversedBuffer));
					}
				}
				else
				{
					reply.status(404).send({ error: 'Game not found' });
				}
			}
			catch (error)
			{
				console.error('Error starting game:', error);
				reply.status(500).send({ error });
			}
		});
	}

	private sendGameState(): void
	{
		this.server.get('/api/game/:gameId/:playerId', { websocket: true }, (connection, request) =>
		{
			try
			{
				const { gameId, playerId } = request.params as { gameId: string; playerId: string };
				const game = this.activeGames.get(gameId);

				if (!game)
				{
					throw new Error(`Game ${gameId} not found`);
				}

				let time = Date.now();
				const send = () =>
				{
					if (game.mode === 'bot' && playerId === '2')
					{
						if (game.scoreUpdated || Date.now() - time > GameServer.BOT_FPS_INTERVAL)
						{
							time = Date.now();
							game.scoreUpdated = false;
						}
						else
						{
							return ;
						}
					}

					switch (playerId)
					{
						case '1':
							if (game.state)
								connection.send(game.state);
							break ;
						case '2':
							if (game.reversedState)
								connection.send(game.reversedState);
							break ;
						default:
							throw new Error('Invalid player ID');
					}

					const winner = game?.winnerName;
					if (winner !== null)
					{
						this.handleGameCompletion(gameId, game);
						connection.send(JSON.stringify({ type: 'winner', winner }));
						clearInterval(interval);
					}
				};

				const intervalTime = GameServer.FPS_INTERVAL;
				const interval = setInterval(send, intervalTime);

				connection.on('message', (message) =>
				{
					let keysPressed: Set<string>;
					const msg = message.toString();

					switch (game.mode)
					{
						case 'local':
							keysPressed = new Set(msg.match(/../g));
							break ;
						case 'online':
						case 'bot':
							keysPressed = new Set(Array.from(msg).map(key => playerId + key));
							break ;
						default:
							throw new Error('Invalid game mode');
					}

					game.keysPressed = new Set([...game.keysPressed, ...keysPressed]);
				});

				const closeConnection = (): void =>
				{
					clearInterval(interval);
					game.destroy();
					this.activeGames.delete(gameId);

					if (game.mode === 'bot')
					{
						const bot = this.bots.get(gameId);
						if (!bot)
						{
							console.error(`Bot not found for game ${gameId}`);
						}

						bot?.destroy();
						this.bots.delete(gameId);
					}
				};

				connection.on('close', () =>
				{
					closeConnection();
				});

				connection.on('error', () =>
				{
					console.error(`Connection error for game ${gameId}`);
					closeConnection();
				});
			}
			catch (error)
			{
				console.error('Error in websocket connection:', error);
				connection.close();
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
			return "Unknown";
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

	private createTournament(): void
	{
		this.server.post('/api/create-tournament', async (request, reply) =>
		{
			try
			{
				const body = request.body as { userId: number, type: string };
				const { userId, type } = body;
				const name = await this.getUserName(userId);

				if (name === "Unknown")
				{
					reply.status(404).send({ error: 'User not found' });
					return ;
				}

				if (type !== 'public' && type !== 'private')
				{
					reply.status(400).send({ error: 'Invalid tournament type' });
					return ;
				}

				const tournamentId = crypto.randomUUID();
				const lobby =
				{
					id: tournamentId,
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
				console.error('Error creating tournament:', error);
				reply.status(500).send({ error });
			}
		});
	}

	private getTournamentInfo(): void
	{
		this.server.get('/api/tournament/:id', async (request, reply) =>
		{
			const { id } = request.params as { id: string };
			const lobby = this.lobbies.get(id);
			if (lobby)
			{
				reply.send(lobby);
			}
			else
			{
				if (this.activeTournaments.has(id))
				{
					const t = this.activeTournaments.get(id);
					const data = this.tournamentData.get(id);

					const allRoundsRaw = [...(data?.rounds || [])];
					if (t && !t.isFinished)
					{
						allRoundsRaw.push(t.matches);
					}

					const rounds = [];
					for (const roundMatches of allRoundsRaw)
					{
						const processedMatches = await Promise.all(roundMatches.map(async m =>
						{
							let p1Name = m._player1;
							if (!p1Name.startsWith('Bot'))
							{
								p1Name = data?.players.get(Number(m._player1)) || await this.getUserName(Number(m._player1));
							}

							let p2Name = m._player2;
							if (!p2Name.startsWith('Bot'))
							{
								p2Name = data?.players.get(Number(m._player2)) || await this.getUserName(Number(m._player2));
							}

							let winnerName = null;
							if (m.winner)
							{
								if (m.winner.startsWith('Bot'))
								{
									winnerName = m.winner;
								}
								else
								{
									winnerName = data?.players.get(Number(m.winner)) || await this.getUserName(Number(m.winner));
								}
							}

							const gameId = data?.matchGames.get(m);

							return {
								_player1: p1Name,
								_player2: p2Name,
								_score1: m._score1,
								_score2: m._score2,
								_winner: winnerName,
								_p1Id: m._player1,
								_p2Id: m._player2,
								gameId: gameId
							};
						}));
						rounds.push(processedMatches);
					}
					
					let status = 'started';
					let winner = null;
					
					if (t && t.isFinished)
					{
						status = 'finished';
						const lastRound = rounds[rounds.length - 1];
						if (lastRound && lastRound.length === 1)
						{
							winner = lastRound[0]._winner;
						}
					}

					reply.send({ 
						status: status, 
						winner: winner,
						players: data?.initialParticipants || [],
						rounds: rounds
					});
				}
				else
				{
					reply.status(404).send({ error: 'Not found' });
				}
			}
		});
	}

	private joinTournament(): void
	{
		this.server.post('/api/join-tournament', async (request, reply) =>
		{
			try
			{
				const body = request.body as { tournamentId: string; userId: number };
				const { tournamentId, userId } = body;
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
					return;
				}

				if (lobby.type === 'public')
				{
					lobby.players.push({ id: userId, name });
					console.log(`User ${userId} (${name}) joined tournament ${tournamentId}. Total players: ${lobby.players.length}`);
					reply.status(200).send({ tournamentId });
				}
				else
				{
					if (!lobby.requests.find((r: any) => r.id === userId))
					{
						lobby.requests.push({ id: userId, name });
					}

					reply.status(200).send({ tournamentId, message: 'Request sent' });
				}
			}
			catch (error)
			{
				console.error(error);
				reply.status(500).send({ error });
			}
		});
	}

	private handleTournamentRequest(): void
	{
		this.server.post('/api/tournament-request', async (request, reply) =>
		{
			const body = request.body as { tournamentId: string, userId: string, accept: boolean };
			const lobby = this.lobbies.get(body.tournamentId);

			if (!lobby)
			{
				return (reply.status(404).send());
			}

			const idx = lobby.requests.findIndex((r: any) => r.id == body.userId);
			if (idx !== -1)
			{
				const req = lobby.requests[idx];
				lobby.requests.splice(idx, 1);

				if (body.accept)
				{
					lobby.players.push(req);
				}
			}
			reply.send({ success: true });
		});
	}

	private leaveTournament(): void
	{
		this.server.post('/api/leave-tournament', async (request, reply) =>
		{
			const body = request.body as { tournamentId: string, userId: number };
			const { tournamentId, userId } = body;
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
		this.server.post('/api/start-tournament', async (request, reply) =>
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
					await core.db.run(
						"INSERT INTO tournaments (id, name, owner_id, status, created_at) VALUES (?, ?, ?, ?, ?)", 
						[tournamentId, "Tournament " + tournamentId.substring(0, 8), lobby.ownerId, 'started', now]
					);

					for (const p of lobby.players)
					{
						await core.db.run(
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
						const res = await core.db.run(
							"INSERT INTO tournament_matches (tournament_id, player1_id, player2_id, played_at) VALUES (?, ?, ?, ?)",
							[tournamentId, p1, p2, now]
						);
						if (res && res.lastID)
							matchDbIds.set(m, res.lastID);
					}
					catch(e) { console.error("Error saving match:", e); }
				}

				const initialParticipants = tournament.players.map(pId =>
				{
					if (pId.startsWith('Bot'))
					{
						return { id: pId, name: pId };
					}

					const numId = Number(pId);
					return { id: pId, name: playerMap.get(numId) || 'Unknown' };
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
				reply.status(200).send({ message: 'Tournament started successfully' });
			}
			catch (error)
			{
				reply.status(500).send({ error });
			}
		});
	}
}
