import { GameInstance } from './GameInstance.js';
import { Bot } from './Bot.js';
import { FastifyInstance } from 'fastify';
import { getUserByName, getUserName } from 'modules/users/user.js';
import * as core from 'core/core.js';
import { addPlayerToQueue } from 'modules/chat/chat.js';
import { Tournament } from './Tournament.js';
import { notifyMatch } from 'modules/chat/chat.js';

export class GameServer
{
	private static m_instance: GameServer | null = null;

	private static readonly FPS: number = 60;
	private static readonly FPS_INTERVAL: number = 1000 / GameServer.FPS;
	private static readonly BOT_FPS: number = 1;
	private static readonly BOT_FPS_INTERVAL: number = 1000 / GameServer.BOT_FPS;

	private server!: FastifyInstance;
	public activeGames: Map<string, GameInstance> = new Map();
	private bots: Map<string, Bot> = new Map();
	private pendingTournaments: Map<string, Set<[string, string]> > = new Map();
	private activeTournaments: Map<string, Tournament> = new Map();


	constructor(server: FastifyInstance)
	{
		if (GameServer.m_instance == null)
			GameServer.m_instance = this;

		this.server = server;
	}

	static get Instance(): GameServer | null { return GameServer.m_instance; }

	public async init(): Promise<void>
	{
		try
		{
			this.createGame();
			this.startGame();
			this.sendGameState();
			this.createTournament();
			this.joinTournament();
			this.getTournamentInfo();
			this.startTournament();
		}
		catch (error)
		{
			console.error('Error starting server:', error);
		}
	}

	/**
	 * start a duel between two player
	 * @param player1 first player
	 * @param player2 second player
	 * @returns the id of the created game
	*/
	public async startDuel(player1: number, player2: number): Promise<string>
	{
		console.log(`starting duel between: ${await getUserName(player1)} and ${await getUserName(player2)}`);
		const gameId = crypto.randomUUID();
		await notifyMatch(player1, player2, gameId, 1);
		await notifyMatch(player2, player1, gameId, 2);

		this.activeGames.set(gameId, new GameInstance('online', player1, player2));
		return gameId;
	}

	private createGame(): void
	{
		this.server.post('/api/create-game', async (request, reply) =>
		{
			try
			{
				const body = request.body as { mode: string; playerName: number};
				const mode = body.mode;
				const name = body.playerName;

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
				else if (mode === 'duel')
						return reply.status(202).send({ message: "waiting for opponent" });
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

	private createTournament(): void
	{
		this.server.post('/api/create-tournament', async (request, reply) =>
		{
			try
			{
				const body = request.body as { playerName: string, type: string };
				const type = body.type;

				if (type !== 'public' && type !== 'private' && type !== 'invitation')
				{
					reply.status(400).send({ error: 'Invalid tournament type' });
					return ;
				}

				const playerName = body.playerName;
				const tournamentId = type + '-' + crypto.randomUUID();
				const participants: Set<[string, string]> = new Set();
				participants.add([playerName, "president"]);
				this.pendingTournaments.set(tournamentId, participants);

				console.log(`Tournament ${tournamentId} created by ${playerName}`);
				reply.status(201).send({ tournamentId });
			}
			catch (error)
			{
				console.error('Error creating tournament:', error);
				reply.status(500).send({ error });
			}
		});
	}

	private joinTournament(): void
	{
		this.server.post('/api/join-tournament', async (request, reply) =>
		{
			try
			{
				const body = request.body as { tournamentId: string; playerName: string };
				const tournamentId = body.tournamentId;
				const participants = this.pendingTournaments.get(tournamentId);
				const playerName = body.playerName;

				if (!participants)
				{
					reply.status(404).send({ error: 'Tournament not found' });
					return ;
				}

				if (tournamentId.startsWith('public-'))
				{
					participants.add([playerName, "member"]);
					reply.status(200).send({ message: 'Tournament joined successfully' });
				}
				else if (tournamentId.startsWith('invitation-'))
				{
					reply.status(501).send({ error: 'Sorry working on it, coming soon..' });
				}
				else if (tournamentId.startsWith('private-'))
				{
					reply.status(403).send({ error: 'You are not allowed to join this tournament. How did you even get the id?' });
				}
				else
				{
					throw new Error('wtf its impossible');
				}
			}
			catch (error)
			{
				console.error('Error joining tournament:', error);
				reply.status(500).send({ error });
			}
		});
	}

	private getTournamentInfo(): void
	{
		this.server.get('/api/info-tournament', async (request, reply) =>
		{
			try
			{
				const body = request.body as { tournamentId: string; playerName: string };
				const tournamentId = body.tournamentId;
				const participants = this.pendingTournaments.get(tournamentId);

				if (!participants)
				{
					reply.status(404).send({ error: 'Tournament not found' });
					return ;
				}

				if (tournamentId.startsWith('public-'))
				{
					reply.status(200).send({ participants: Array.from(participants) });
				}
				else if (tournamentId.startsWith('invitation-'))
				{
					reply.status(200).send({ participants: Array.from(participants) });
				}
				else if (tournamentId.startsWith('private-'))
				{
					reply.status(403).send({ error: 'You are not allowed to get info about this tournament. How did you even get the id?' });
				}
				else
				{
					throw new Error('wtf its impossible');
				}
			}
			catch (error)
			{
				console.error('Error joining tournament:', error);
				reply.status(500).send({ error });
			}
		});
	}

	private startTournament(): void
	{
		this.server.post('/api/start-tournament', async (request, reply) =>
		{
			try
			{
				const body = request.body as { tournamentId: string; playerName: string };
				const tournamentId = body.tournamentId;
				const participants = this.pendingTournaments.get(tournamentId);
				const playerName = body.playerName;

				if (!participants)
				{
					reply.status(404).send({ error: 'Tournament not found' });
					return ;
				}

				if (!Array.from(participants).some(([name, role]) => name === playerName && role === "president"))
				{
					reply.status(403).send({ error: 'Only the tournament creator can start the tournament' });
					return ;
				}

				const playerNamesSet: Set<string> = new Set();
				participants.forEach(([name, _role]) => { playerNamesSet.add(name); });

				const tournament = new Tournament(playerNamesSet);
				this.activeTournaments.set(tournamentId, tournament);
				this.pendingTournaments.delete(tournamentId);

				reply.status(200).send({ message: 'Tournament started successfully' });
			}
			catch (error)
			{
				console.error('Error joining tournament:', error);
				reply.status(500).send({ error });
			}
		});
	}
}
