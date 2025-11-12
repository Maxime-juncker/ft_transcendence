import { GameInstance } from './GameInstance.js';
import Fastify, { FastifyInstance } from 'fastify';
import { FastifyReply } from 'fastify/types/reply';

export class GameServer
{
	private static readonly FPS: number = 60;
	private static readonly FPS_INTERVAL: number = 1000 / GameServer.FPS;

	private server!: FastifyInstance;
	private activeGames: Map<string, GameInstance> = new Map();
	private playerPending: { reply: FastifyReply, name: string } | null = null;

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

				if (mode === '1player')
				{
					if (this.playerPending)
					{
						const gameId = crypto.randomUUID();
						this.playerPending.reply.status(201).send({ gameId, opponentName: name, playerId: 1 });
						reply.status(201).send({ gameId, opponentName: this.playerPending.name, playerId: 2 });
						this.activeGames.set(gameId, new GameInstance(mode, this.playerPending.name, name));
						this.playerPending = null;
					}
					else
					{
						this.playerPending = { reply, name };
					}
				}
				else if (mode === '2player')
				{
					const gameId = crypto.randomUUID();
					const opponentName = 'Guest';
					const game = new GameInstance(mode, name, opponentName);
					this.activeGames.set(gameId, game);
					reply.status(201).send({ gameId, opponentName, playerId: '1' });
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

				const interval = setInterval(send, GameServer.FPS_INTERVAL);

				connection.on('message', (message) =>
				{
					let keysPressed: Set<string>;
					const msg = message.toString();

					switch (game.mode)
					{
						case '1player':
							keysPressed = new Set(Array.from(msg).map(key => playerId + key));
							break ;
						case '2player':
							keysPressed = new Set(msg.match(/../g));
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
