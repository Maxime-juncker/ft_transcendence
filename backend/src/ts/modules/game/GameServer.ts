import { GameInstance } from './GameInstance.js';
import { Bot } from './Bot.js';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { getUserByName, getUserName } from 'modules/users/user.js';
import { core, chat } from 'core/server.js';
import { Logger } from 'modules/logger.js';
import { jwtVerif } from 'modules/jwt/jwt.js';

export class GameServer
{
	private static m_instance: GameServer | null = null;

	private static readonly FPS: number = 60;
	private static readonly FPS_INTERVAL: number = 1000 / GameServer.FPS;
	private static readonly BOT_FPS: number = 1;
	private static readonly BOT_FPS_INTERVAL: number = 1000 / GameServer.BOT_FPS;

	public activeGames: Map<string, GameInstance> = new Map();
	private bots: Map<string, Bot> = new Map();
	private botId: number = 0;

	constructor(private server: FastifyInstance)
	{
		if (!GameServer.Instance)
			GameServer.m_instance = this;
	}

	static get Instance(): GameServer | null { return GameServer.m_instance; }

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
		}
		catch (error)
		{
			Logger.error('Error starting server:', error);
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
		const name1 = await getUserName(player1);
		const name2 = await getUserName(player2);

		const gameId = crypto.randomUUID();

		await chat.notifyMatch(player1, player2, gameId, 1);
		await chat.notifyMatch(player2, player1, gameId, 2);

		this.activeGames.set(gameId, new GameInstance('online', player1, player2));

		Logger.log(`starting duel between: ${name1} and ${name2}`);
		return gameId;
	}

	private createGame(): void
	{
		this.server.post('/api/create-game',
		{
			schema:
			{
				body:
				{
					type: "object",
					properties:
					{
						mode:		{ type: "string" },
						playerName:	{ type: "number" },
					},
					required: ["mode", "playerName"]
				}
			}
		},
		async (request: FastifyRequest, reply: FastifyReply) =>
		{
			try
			{
				const body = request.body as { mode: string; playerName: number};
				const mode = body.mode;
				const name = Number(body.playerName);

				if (mode === 'local')
				{
					const gameId = crypto.randomUUID();
					const opponentId = 0;
					const game = new GameInstance(mode, name, opponentId);
					this.activeGames.set(gameId, game);
					Logger.log(`starting local game for: ${await getUserName(body.playerName)}`);
					reply.status(201).send({ gameId, opponentId: opponentId, playerSide: '1' });
				}
				else if (mode === 'online')
				{
					for (const [id, game] of this.activeGames)
					{
						if (game.mode === 'online')
						{
							if ((game.player1Id == name || game.player2Id == name) && game.winner === null)
							{
								const opponentId = (game.player1Id == name) ? game.player2Id : game.player1Id;
								const playerSide = (game.player1Id == name) ? '1' : '2';
								reply.status(200).send({ gameId: id, opponentId: opponentId, playerSide: playerSide });
								return ;
							}
						}
					}

					await chat.addPlayerToQueue(Number(name), this);
					reply.status(202).send({ message: "added to queue" });
				}
				else if (mode === 'duel')
				{
					return (reply.status(202).send({ message: "waiting for opponent" }));
				}
				else if (mode === 'bot')
				{
					const gameId = crypto.randomUUID();
					const data = await getUserByName("bot", core.db);
					const opponentId = data.data.id;
					const game = new GameInstance(mode, name, opponentId);
					this.activeGames.set(gameId, game);
					Logger.log(`starting bot game for: ${await getUserName(body.playerName)}`);
					reply.status(201).send({ gameId, opponentId: opponentId, playerSide: '1' });
				}
				else
				{
					reply.status(400).send({ error: 'Invalid game mode' });
				}
			}
			catch (error)
			{
				Logger.error('Error creating game:', error);
				reply.status(500).send({ error });
			}
		});
	}

	private startGame(): void
	{
		this.server.post('/api/start-game/:gameId',
		{
			schema:
			{
				body:
				{
					type: "object",
					properties:
					{
						token: { type: "string" },
					},
					required: ["token"]
				},
				params:
				{
					type: "object",
					properties:
					{
						gameId: { type: "string" },
					},
					required: ["gameId"]
				}
			}
		},
		async (request: FastifyRequest, reply: FastifyReply) =>
		{
			try
			{
				const { gameId } = request.params as { gameId: string };
				const body = request.body as { token: string };
				const token = body.token;
				const data: any = await jwtVerif(token, core.sessionKey);
				if (!data)
					return reply.status(400).send({ error: 'Invalid token' });

				const userId = data.id;
				const game = this.activeGames.get(gameId);

				if (game)
				{
					let playerIdentified = false;
					
					if (game.mode === 'online' || game.mode === 'bot')
					{
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

						Logger.log(`Game ${gameId} Ready Status: P1=${game.p1Ready}, P2=${game.p2Ready}`);
						if (game.p1Ready && game.p2Ready)
						{
							Logger.log(`Game ${gameId} is now RUNNING`);
							game.running = true;
						}
					}
					else
					{
						game.p1Ready = true;
						game.p2Ready = true;
						game.running = true;
					}
					
					reply.status(200).send(game.state);

					if (game.mode === 'bot' && game.reversedBuffer)
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
				Logger.error('Error starting game:', error);
				reply.status(500).send({ error });
			}
		});
	}

	private sendGameState(): void
	{
		const gameConnections = new Map<string, Map<string, any>>();

		this.server.get('/api/game/:gameId/:playerId', { websocket: true }, (connection: any, request: FastifyRequest) =>
		{
			try
			{
				const { gameId, playerId } = request.params as { gameId: string; playerId: string };
				const game = this.activeGames.get(gameId);

				if (!game)
				{
					throw new Error(`Game ${gameId} not found`);
				}

				if (!gameConnections.has(gameId))
				{
					gameConnections.set(gameId, new Map());
				}
				gameConnections.get(gameId)!.set(playerId, connection);

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

					const winner = game?.winner;
					if (winner !== null)
					{
						connection.send(JSON.stringify({ type: 'winner', winner }));
						clearInterval(interval);
					}
				};

				const intervalTime = GameServer.FPS_INTERVAL;
				const interval = setInterval(send, intervalTime);

				connection.on('message', (message: BinaryType) =>
				{
					if (!message)
					{
						return ;
					}

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

					if (game.mode === 'online' || game.mode === 'duel')
					{
						const connections = gameConnections.get(gameId);
						if (connections && game.winner === null)
						{
							const otherPlayerId = playerId === '1' ? '2' : '1';
							const otherConnection = connections.get(otherPlayerId);

							if (otherConnection)
							{
								const winnerId = playerId === '1' ? game.player2Id : game.player1Id;
								game.winner = winnerId;

								Logger.log(`Player ${playerId} disconnected from game ${gameId}, declaring player ${otherPlayerId} (id: ${winnerId}) as winner`);

								try
								{
									otherConnection.send(JSON.stringify({ type: 'winner', winner: winnerId }));
								}
								catch (err)
								{
									Logger.error('Failed to send winner notification:', err);
								}
							}
						}
					}

					gameConnections.get(gameId)?.delete(playerId);
					if (gameConnections.get(gameId)?.size === 0)
					{
						gameConnections.delete(gameId);
						game.destroy();
						this.activeGames.delete(gameId);

						if (game.mode === 'bot')
						{
							const bot = this.bots.get(gameId);
							if (!bot)
							{
								Logger.error(`Bot not found for game ${gameId}`);
							}

							bot?.destroy();
							this.bots.delete(gameId);
						}
					}
				};
				connection.on('close', () =>
				{
					closeConnection();
				});

				connection.on('error', () =>
				{
					Logger.error(`Connection error for game ${gameId}`);
					closeConnection();
				});
			}
			catch (error)
			{
				Logger.error('Error in websocket connection:', error);
				connection.close();
			}
		});
	}
}
