import { GameInstance } from './GameInstance.js';
import { Bot } from './Bot.js';
import { FastifyInstance } from 'fastify';
import { getUserByName } from '@modules/users/user.js';
import * as core from 'core/core.js';
import { addPlayerToQueue, notifyMatch } from '@modules/chat/chat.js';
import { Tournament } from './Tournament.js';

export class GameServer
{
	private static readonly FPS: number = 60;
	private static readonly FPS_INTERVAL: number = 1000 / GameServer.FPS;
	private static readonly BOT_FPS: number = 1;
	private static readonly BOT_FPS_INTERVAL: number = 1000 / GameServer.BOT_FPS;

	private server!: FastifyInstance;
	public activeGames: Map<string, GameInstance> = new Map();
	private bots: Map<string, Bot> = new Map();
	
	private lobbies: Map<string, any> = new Map(); 
	private activeTournaments: Map<string, Tournament> = new Map();
	private tournamentData: Map<string, { 
		players: Map<number, string>, // ID -> Name
		matchGames: Map<any, string>,  // Match -> GameId
		matchDbIds: Map<any, number>, // Match -> DB ID
		savingMatches: Set<any>
	}> = new Map();
    private botId: number = 0;

	constructor(server: FastifyInstance)
	{
		this.server = server;
	}

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

	private async processTournaments()
	{
		for (const [tournamentId, tournament] of this.activeTournaments)
		{
			const data = this.tournamentData.get(tournamentId);
			if (!data)
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
						const res = await core.db.run(
							"INSERT INTO tournament_matches (tournament_id, player1_id, player2_id, played_at) VALUES (?, ?, ?, ?)",
							[tournamentId, p1, p2, new Date().toISOString()]
						);
						if (res && res.lastID)
							data.matchDbIds.set(match, res.lastID);
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
					continue;

				if (data.matchGames.has(match))
				{
					const gameId = data.matchGames.get(match)!;
					const game = this.activeGames.get(gameId);
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
							core.db.run(
								"UPDATE tournaments SET status = 'finished', winner_id = ? WHERE id = ?",
								[winId, tournamentId]
							).catch(e => console.error("Error finishing tournament", e));
						}
					}
					continue ;
				}

				const p1IdStr = match._player1;
				const p2IdStr = match._player2;
				
				let p1Id: number;
				let p2Id: number;
				
				if (p1IdStr.startsWith('Bot'))
				{
					p1Id = this.botId;
				}
				else
				{
					p1Id = Number(p1IdStr);
				}

				if (p2IdStr.startsWith('Bot'))
				{
					p2Id = this.botId;
				}
				else
				{
					p2Id = Number(p2IdStr);
				}

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
				const game = this.activeGames.get(gameId);

				if (game)
				{
					game.running = true;
					reply.status(200).send(game.state);

					if (game.mode === 'bot')
					{
						if (game.reversedBuffer)
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
			const list = Array.from(this.lobbies.values()).map(l => ({
				id: l.id,
				ownerName: l.ownerName,
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

				if (type !== 'public' && type !== 'private')
				{
					reply.status(400).send({ error: 'Invalid tournament type' });
					return ;
				}

				const tournamentId = crypto.randomUUID();
				const lobby = {
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
					
					const matches = t ? await Promise.all(t.matches.map(async m =>
					{
						const p1Name = data?.players.get(Number(m._player1)) || await this.getUserName(Number(m._player1));
						const p2Name = data?.players.get(Number(m._player2)) || await this.getUserName(Number(m._player2));
						const winnerName = m.winner ? (data?.players.get(Number(m.winner)) || await this.getUserName(Number(m.winner))) : null;
						const gameId = data?.matchGames.get(m);
						
						return {
							_player1: p1Name,
							_player2: p2Name,
							_winner: winnerName,
							_p1Id: m._player1,
							_p2Id: m._player2,
							gameId: gameId
						};
					})) : [];

					reply.send({ 
						status: 'started', 
						players: t?.players,
						matches: matches
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

				const lobby = this.lobbies.get(tournamentId);

				if (!lobby)
				{
					reply.status(404).send({ error: 'Tournament not found' });
					return ;
				}
				
				if (lobby.players.find((p: any) => p.id === userId))
				{
					reply.send({ tournamentId });
					return;
				}

				if (lobby.type === 'public')
				{
					lobby.players.push({ id: userId, name });
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
				return reply.status(404).send();
			
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
				catch (e) { console.error("Error saving tournament info:", e); }

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

				this.tournamentData.set(tournamentId, {
					players: playerMap,
					matchGames: new Map(),
					matchDbIds: matchDbIds,
					savingMatches: new Set()
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
