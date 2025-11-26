import { GameInstance } from './GameInstance.js';
import { Bot } from './Bot.js';
import { FastifyInstance } from 'fastify';
import { FastifyReply } from 'fastify/types/reply';

export class GameServer
{
	private static readonly FPS: number = 60;
	private static readonly FPS_INTERVAL: number = 1000 / GameServer.FPS;
	private static readonly BOT_FPS: number = 1;
	private static readonly BOT_FPS_INTERVAL: number = 1000 / GameServer.BOT_FPS;

	private server!: FastifyInstance;
	private activeGames: Map<string, GameInstance> = new Map();
	private playerPending: { reply: FastifyReply, name: string } | null = null;
	private bots: Map<string, Bot> = new Map();

	constructor(server: FastifyInstance)
	{
		this.server = server;
	}

	public async init(): Promise<void>
	{
		try
		{
			this.createGame();
			this.startGame();
			this.sendGameState();
		}
		catch (error)
		{
			console.error('Error starting server:', error);
		}
	}

	private createGame(): void
	{
		this.server.post('/api/create-game', (request, reply) =>
		{
			try
			{
				const body = request.body as { mode: string; playerName: string };
				const mode = body.mode;
				const name = body.playerName;

				if (mode === 'local')
				{
					const gameId = crypto.randomUUID();
					const opponentId = 'Guest';
					const game = new GameInstance(mode, name, opponentId);
					this.activeGames.set(gameId, game);
					reply.status(201).send({ gameId, opponentId: opponentId, playerId: '1' });
				}
				else if (mode === 'online')
				{
					if (this.playerPending)
					{
						const gameId = crypto.randomUUID();
						this.playerPending.reply.status(201).send({ gameId, opponentId: name, playerId: 1 });
						reply.status(201).send({ gameId, opponentId: this.playerPending.name, playerId: 2 });
						this.activeGames.set(gameId, new GameInstance(mode, this.playerPending.name, name));
						this.playerPending = null;
					}
					else
					{
						this.playerPending = { reply, name };
					}
				}
				else if (mode === 'bot')
				{
					const gameId = crypto.randomUUID();
					const opponentId = 'Bot';
					const game = new GameInstance(mode, name, opponentId);
					this.activeGames.set(gameId, game);
					reply.status(201).send({ gameId, opponentId: opponentId, playerId: '1' });
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
					reply.status(200).send({ message: 'Game started' });

					if (game.mode === 'bot')
					{
						this.bots.set(gameId, new Bot(gameId));
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

				const send = () =>
				{
					switch (playerId)
					{
						case '1':
							connection.send(game.state);
							break ;
						case '2':
							connection.send(game.reversedState);
							break ;
						default:
							throw new Error('Invalid player ID');
					}

					const winner = game?.winnerName;
					if (winner)
					{
						connection.send(JSON.stringify({ type: 'winner', winner }));
					}
				};

				const intervalTime = (game.mode === 'bot' && playerId === '2') ? GameServer.BOT_FPS_INTERVAL : GameServer.FPS_INTERVAL;
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

					game.handleKeyPress(keysPressed);
				});

				const closeConnection = (): void =>
				{
					clearInterval(interval);
					game.destroy();
					this.activeGames.delete(gameId);

					if (game.mode === 'bot')
					{
						const bot = this.bots.get(gameId);
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
}
