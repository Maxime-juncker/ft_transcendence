import Fastify, { FastifyInstance } from 'fastify';
import websocket from '@fastify/websocket';

class GameState
{
	private buffer: ArrayBuffer;
	private floatView: Float32Array;
	private intView: Uint8Array;

	constructor()
	{
		this.buffer = new ArrayBuffer(24);
		this.floatView = new Float32Array(this.buffer, 0, 4);
		this.intView = new Uint8Array(this.buffer, 16, 2);
		this.floatView[0] = 50;
		this.floatView[1] = 50;
		this.floatView[2] = 50;
		this.floatView[3] = 50;
		this.intView[0] = 0;
		this.intView[1] = 0;
	}

	get stateBuffer(): Buffer		{ return Buffer.from(this.buffer); }

	get leftPaddleY(): number		{ return this.floatView[0]; }
	get rightPaddleY(): number		{ return this.floatView[1]; }
	get ballX(): number				{ return this.floatView[2]; }
	get ballY(): number				{ return this.floatView[3]; }
	get player1Score(): number		{ return this.intView[0]; }
	get player2Score(): number		{ return this.intView[1]; }

	set leftPaddleY(value: number)	{ this.floatView[0] = value; }
	set rightPaddleY(value: number)	{ this.floatView[1] = value; }
	set ballX(value: number)		{ this.floatView[2] = value; }
	set ballY(value: number)		{ this.floatView[3] = value; }
	set player1Score(value: number)	{ this.intView[0] = value; }
	set player2Score(value: number)	{ this.intView[1] = value; }
}

class GameInstance
{
	/* GAME CONSTANTS */
	private static readonly PADDLE_SPEED: number = 1.2;
	private static readonly PADDLE_HEIGHT: number = 15;
	private static readonly PADDLE_WIDTH: number = 2;
	private static readonly PADDLE_PADDING: number = 2;
	private static readonly MIN_Y_PADDLE: number = GameInstance.PADDLE_HEIGHT / 2;
	private static readonly MAX_Y_PADDLE: number = 100 - GameInstance.MIN_Y_PADDLE;
	private static readonly BALL_SIZE: number = 2;
	private static readonly MIN_Y_BALL: number = GameInstance.BALL_SIZE / 2;
	private static readonly MAX_Y_BALL: number = 100 - GameInstance.MIN_Y_BALL;
	private static readonly MIN_X_BALL: number = GameInstance.PADDLE_PADDING + GameInstance.PADDLE_WIDTH + GameInstance.MIN_Y_BALL;
	private static readonly MAX_X_BALL: number = 100 - GameInstance.MIN_X_BALL;
	private static readonly MAX_ANGLE: number = 0.5;
	private static readonly SPEED: number = 0.8;
	private static readonly SPEED_INCREMENT: number = 0.0;
	private static readonly POINTS_TO_WIN: number = 2;
	private static readonly PLAYER1_UP_KEY: string = 'z';
	private static readonly PLAYER1_DOWN_KEY: string = 's';
	private static readonly PLAYER2_UP_KEY: string = 'ArrowUp';
	private static readonly PLAYER2_DOWN_KEY: string = 'ArrowDown';
	private static readonly FPS: number = 60;
	private static readonly FRAME_TIME: number = 1000 / GameInstance.FPS;

	/* GAME STATE */
	private interval: any;
	private keysPressed: Set<string> = new Set();
	private speed: number = GameInstance.SPEED;
	private ballSpeedX: number = (Math.random() < 0.5) ? 0.5 : -0.5;
	private ballSpeedY: number = (Math.random() - 0.5) * 2;
	private isRunning: boolean = false;
	private gameState: GameState = new GameState();
	private namePlayer1: string | null = null;
	private namePlayer2: string | null = null;
	private winner: string | null = null;
	private mode: string | null = null;

	constructor(mode: string, namePlayer1: string, namePlayer2: string)
	{
		this.mode = mode;
		this.namePlayer1 = namePlayer1;
		this.namePlayer2 = namePlayer2;
		this.normalizeSpeed();
		this.gameLoop();
	}

	private normalizeSpeed(): void
	{
		let currentSpeed = Math.sqrt(this.ballSpeedX * this.ballSpeedX + this.ballSpeedY * this.ballSpeedY);
		this.ballSpeedX = (this.ballSpeedX / currentSpeed) * this.speed;
		this.ballSpeedY = (this.ballSpeedY / currentSpeed) * this.speed;
	}

	private gameLoop = (): void =>
	{
		this.interval = setInterval(() =>
		{
			if (this.isRunning)
			{
				this.moveBall();
				this.movePaddle();
			}
		}, GameInstance.FRAME_TIME);
	}

	private moveBall(): void
	{
		this.gameState.ballX += this.ballSpeedX;
		this.gameState.ballY += this.ballSpeedY;

		if (this.goal())
		{
			this.score((this.gameState.ballX > 100) ? 1 : 2);
			this.resetBall();
		}
		else if (this.collideWall())
		{
			this.ballSpeedY = -this.ballSpeedY;
			this.normalizeSpeed();
		}
		else if (this.collidePaddleLeft())
		{
			this.bounce(this.gameState.leftPaddleY);
		}
		else if (this.collidePaddleRight())
		{
			this.bounce(this.gameState.rightPaddleY);
		}
	}

	private goal(): boolean
	{
		return (this.gameState.ballX < 0 || this.gameState.ballX > 100);
	}

	private score(player: number): void
	{
		if (player === 1)
		{
			this.ballSpeedX = 0.5;
			this.gameState.player1Score = this.gameState.player1Score + 1;
			this.getWinner(this.gameState.player1Score, this.namePlayer1);
		}
		else
		{
			this.ballSpeedX = -0.5;
			this.gameState.player2Score = this.gameState.player2Score + 1;
			this.getWinner(this.gameState.player2Score, this.namePlayer2);
		}
	}

	private getWinner(score: number, player: string | null): void
	{
		if (score >= GameInstance.POINTS_TO_WIN)
		{
			this.winner = player;
			this.isRunning = false;
		}
	}

	private resetBall(): void
	{
		this.speed = GameInstance.SPEED;
		this.ballSpeedY = (Math.random() - 0.5) * 2;
		this.normalizeSpeed();
		this.gameState.ballX = 50;
		this.gameState.ballY = 50;
	}

	private collideWall(): boolean
	{
		return (this.gameState.ballY <= GameInstance.MIN_Y_BALL || this.gameState.ballY >= GameInstance.MAX_Y_BALL);
	}

	private collidePaddleLeft(): boolean
	{
		return (this.gameState.ballX <= GameInstance.MIN_X_BALL
			&& this.gameState.ballY >= this.gameState.leftPaddleY - GameInstance.MIN_Y_PADDLE
			&& this.gameState.ballY <= this.gameState.leftPaddleY + GameInstance.MIN_Y_PADDLE);
	}

	private collidePaddleRight(): boolean
	{
		return (this.gameState.ballX >= GameInstance.MAX_X_BALL
			&& this.gameState.ballY >= this.gameState.rightPaddleY - GameInstance.MIN_Y_PADDLE
			&& this.gameState.ballY <= this.gameState.rightPaddleY + GameInstance.MIN_Y_PADDLE);
	}

	private bounce(paddleY: number): void
	{
		this.speed += GameInstance.SPEED_INCREMENT;
		this.ballSpeedX = -this.ballSpeedX;
		this.ballSpeedY = (this.gameState.ballY - paddleY) / GameInstance.MIN_Y_PADDLE * GameInstance.MAX_ANGLE;
		this.normalizeSpeed();
	}

	private movePaddle(): void
	{
		if (this.keysPressed.has(GameInstance.PLAYER1_UP_KEY))
		{
			this.gameState.leftPaddleY = Math.max(GameInstance.MIN_Y_PADDLE, this.gameState.leftPaddleY - GameInstance.PADDLE_SPEED);
		}
		if (this.keysPressed.has(GameInstance.PLAYER1_DOWN_KEY))
		{
			this.gameState.leftPaddleY = Math.min(GameInstance.MAX_Y_PADDLE, this.gameState.leftPaddleY + GameInstance.PADDLE_SPEED);
		}
		if (this.keysPressed.has(GameInstance.PLAYER2_UP_KEY))
		{
			this.gameState.rightPaddleY = Math.max(GameInstance.MIN_Y_PADDLE, this.gameState.rightPaddleY - GameInstance.PADDLE_SPEED);
		}
		if (this.keysPressed.has(GameInstance.PLAYER2_DOWN_KEY))
		{
			this.gameState.rightPaddleY = Math.min(GameInstance.MAX_Y_PADDLE, this.gameState.rightPaddleY + GameInstance.PADDLE_SPEED);
		}
	}

	get state(): Buffer
	{
		return (this.gameState.stateBuffer);
	}

	public handleKeyPress(keysPressed: string[]): void
	{
		this.keysPressed.clear();
		keysPressed.forEach(key =>this.keysPressed.add(key));
		if (this.keysPressed.has(' ') && this.mode === '2player')
		{
			this.running = !this.isRunning;
		}
	}

	set running(isRunning: boolean)
	{
		this.isRunning = isRunning;
	}

	get winnerName(): string | null
	{
		return (this.winner);
	}

	set winnerName(name: string | null)
	{
		this.winner = name;
	}

	public destroy(): void
	{
		clearInterval(this.interval);
		this.keysPressed.clear();
		this.gameState = null as any;
	}
}

export class GameServer
{
	private server!: FastifyInstance;
	private activeGames: Map<string, GameInstance> = new Map();
	private gameWebSockets: Map<string, any> = new Map();
	private playerPending: { reply: any, name: string } | null = null;

	constructor()
	{
		this.start();
	}

	private async start(): Promise<void>
	{
		try
		{
			this.server = Fastify()
			await this.launchServer();
			await this.server.listen({ port: 3000, host: '0.0.0.0' });
		}
		catch (error)
		{
			console.error('❌ Error starting server:', error);
		}
	}

	private async launchServer(): Promise<void>
	{
		await this.server.register(websocket);

		this.server.post('/api/create-game', (request, reply) =>
		{
			try
			{
				const body = request.body as any;
				if (body.mode === '1player')
				{
					if (this.playerPending)
					{
						const gameId = crypto.randomUUID();
						const game = new GameInstance(body.mode, this.playerPending.name, body.playerName);
						this.activeGames.set(gameId, game);
						this.playerPending.reply.status(201).send({ gameId: gameId, opponentName: body.playerName, playerId: 1 });
						reply.status(201).send({ gameId: gameId, opponentName: this.playerPending.name, playerId: 2 });
						this.playerPending = null;
					}
					else
					{
						this.playerPending = { reply: reply, name: body.playerName };
					}
				}
				else if (body.mode === '2player')
				{
					const gameId = crypto.randomUUID();
					const game = new GameInstance(body.mode, body.playerName, 'Guest');
					this.activeGames.set(gameId, game);
					reply.status(201).send({ gameId: gameId, opponentName: 'Guest', playerId: 1 });
				}
				else
				{
					reply.status(400).send({ error: 'Invalid game mode' });
				}
			}
			catch (error)
			{
				console.error('Error creating game:', error);
				reply.status(500).send();
			}
		});

		this.server.post('/api/start-game/:gameId', (request, reply) =>
		{
			try
			{
				const { gameId } = request.params as { gameId: string };
				const game = this.activeGames.get(gameId);

				if (!game)
				{
					reply.status(404).send({ error: 'Game not found' });
					return ;
				}

				game.running = true;
				reply.status(200).send({ message: 'Game started' });
			}
			catch (error)
			{
				console.error('Error creating game:', error);
				reply.status(500).send();
			}
		});

		this.server.get('/api/game/:gameId/:playerId', { websocket: true }, (connection, request) =>
		{
			const { gameId } = request.params as { gameId: string };
			const { playerId } = request.params as { playerId: string };
			const game = this.activeGames.get(gameId);

			if (!game)
			{
				console.error(`Game ${gameId} not found`);
				connection.close();
				return ;
			}

			this.gameWebSockets.set(gameId, connection);
			const send = () =>
			{
				if (game.winnerName)
				{
					connection.send(JSON.stringify({ type: 'winner', winner: game.winnerName }));
				}
				else
				{
					connection.send(game.state);
				}
			};

			const interval = setInterval(send, 1000 / 60);

			connection.on('message', (message) =>
			{
				try
				{
					const data = JSON.parse(message.toString());
					if (data.keysPressed)
					{
						game.handleKeyPress(data.keysPressed);
					}
				}
				catch (error)
				{
					console.error('Error parsing message:', error);
				}
			});

			connection.on('close', () =>
			{
				if (!game.winnerName)
				{
					game.winnerName = playerId === '1' ? game['namePlayer2'] : game['namePlayer1'];
				}

				clearInterval(interval);
				game.destroy();
				this.activeGames.delete(gameId);
				this.gameWebSockets.delete(gameId);
			});

			connection.on('error', () =>
			{
				console.error(`Connection error for game ${gameId}`);
				clearInterval(interval);
				game.destroy();
				this.activeGames.delete(gameId);
				this.gameWebSockets.delete(gameId);
			});
		});
	}
}
