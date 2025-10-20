import { fastify, FastifyInstance } from 'fastify';
import websocket from '@fastify/websocket';

class GameServer
{
	/* GAME CONSTANTS */
	private static readonly PADDLE_SPEED: number = 1.2;
	private static readonly PADDLE_HEIGHT: number = 15;
	private static readonly PADDLE_WIDTH: number = 2;
	private static readonly PADDLE_PADDING: number = 2;
	private static readonly MIN_Y_PADDLE: number = GameServer.PADDLE_HEIGHT / 2;
	private static readonly MAX_Y_PADDLE: number = 100 - GameServer.MIN_Y_PADDLE;
	private static readonly BALL_SIZE: number = 2;
	private static readonly MIN_Y_BALL: number = GameServer.BALL_SIZE;
	private static readonly MAX_Y_BALL: number = 100 - GameServer.MIN_Y_BALL;
	private static readonly MIN_X_BALL: number = GameServer.PADDLE_PADDING + GameServer.PADDLE_WIDTH + GameServer.MIN_Y_BALL;
	private static readonly MAX_X_BALL: number = 100 - GameServer.MIN_X_BALL;
	private static readonly MAX_ANGLE: number = 0.75;
	private static readonly SPEED: number = 1.0;
	private static readonly SPEED_INCREMENT: number = 0.0;
	private static readonly POINTS_TO_WIN: number = 2;
	private static readonly PLAYER1_UP_KEY: string = 'w';
	private static readonly PLAYER1_DOWN_KEY: string = 's';
	private static readonly PLAYER2_UP_KEY: string = 'ArrowUp';
	private static readonly PLAYER2_DOWN_KEY: string = 'ArrowDown';
	private static readonly FPS: number = 60;
	private static readonly FRAME_TIME: number = 1000 / GameServer.FPS;

	/* GAME STATE */
	private players: Map<any, string> = new Map();
	private keysPressed: Set<string> = new Set();

	private gameState: any = 
	{
		leftPaddleY: 50,
		rightPaddleY: 50,
		ballX: 50,
		ballY: 50,
		player1Score: 0,
		player2Score: 0,
		speed: GameServer.SPEED,
		end: false,
		ballSpeedX: (Math.random() < 0.5) ? 0.5 : -0.5,
		ballSpeedY: (Math.random() - 0.5) * 2,
	};

	constructor()
	{
		this.setupServer();
		this.gameLoop();
	}

	private setupServer(): void
	{
		const server = fastify();
		server.register(websocket);

		server.register(async (fastify) =>
		{
			fastify.get('/game', { websocket: true } as any, (connection: any, req: any) =>
			{
				this.players.set(connection.socket, `player`);

				connection.socket.on('message', (message: Buffer) =>
				{
					const data = JSON.parse(message.toString());
					this.handleClientInput(connection.socket, data);
				});

				connection.socket.on('close', () =>
				{
					this.players.delete(connection.socket);
				});
			});
		});
	}

	private handleClientInput(socket: any, data: any): void
	{
		if (data.type === 'keydown')
		{
			this.keysPressed.add(data.key);
		}
		else if (data.type === 'keyup')
		{
			this.keysPressed.delete(data.key);
		}
	}

	private gameLoop = (): void =>
	{
		setInterval(() =>
		{
			if (!this.gameState.end && this.players.size === 2)
			{
				this.movePaddle();
				this.moveBall();
				this.broadcastGameState();
			}
		}, GameServer.FRAME_TIME);
	}

	private broadcastGameState(): void
	{
		const message = JSON.stringify(
		{
			type: 'gameState',
			state: this.gameState,
		});

		this.players.forEach((_, socket) =>
		{
			if (socket.readyState === 1)
			{
				socket.send(message);
			}
		});
	}

	private normalizeSpeed(): void
	{
		let currentSpeed = Math.sqrt(this.gameState.ballSpeedX * this.gameState.ballSpeedX + this.gameState.ballSpeedY * this.gameState.ballSpeedY);
		this.gameState.ballSpeedX = (this.gameState.ballSpeedX / currentSpeed) * this.gameState.speed;
		this.gameState.ballSpeedY = (this.gameState.ballSpeedY / currentSpeed) * this.gameState.speed;
	}

	private moveBall(): void
	{
		this.gameState.ballX += this.gameState.ballSpeedX;
		this.gameState.ballY += this.gameState.ballSpeedY;

		if (this.goal())
		{
			this.score((this.gameState.ballX > 100) ? 1 : 2);
			this.resetBall();
		}
		else if (this.collideWall())
		{
			this.gameState.ballSpeedY = -this.gameState.ballSpeedY;
			this.normalizeSpeed();
		}
		else if (this.collidePaddleLeft())
		{
			this.bounce(this.gameState.leftPaddleY, 1);
		}
		else if (this.collidePaddleRight())
		{
			this.bounce(this.gameState.rightPaddleY, -1);
		}
	}

	private goal(): boolean
	{
		return (this.gameState.ballX < 0 || this.gameState.ballX > 100);
	}

	private score(player: number): void
	{
		const newScore = (player === 1 ? this.gameState.player1Score : this.gameState.player2Score) + 1;
		if (player === 1)
		{
			this.gameState.player1Score = newScore;
			this.gameState.ballSpeedX = 0.5;
		}
		else
		{
			this.gameState.player2Score = newScore;
			this.gameState.ballSpeedX = -0.5;
		}

		if (newScore >= GameServer.POINTS_TO_WIN)
		{
			this.gameState.end = true;
		}
	}

	private resetBall(): void
	{
		this.gameState.speed = GameServer.SPEED;
		this.gameState.ballSpeedY = (Math.random() - 0.5) * 2;
		this.normalizeSpeed();
		this.gameState.ballX = 50;
		this.gameState.ballY = 50;
	}

	private collidePaddleLeft(): boolean
	{
		return (this.gameState.ballX <= GameServer.MIN_X_BALL
			&& this.gameState.ballY >= this.gameState.leftPaddleY - GameServer.MIN_Y_PADDLE
			&& this.gameState.ballY <= this.gameState.leftPaddleY + GameServer.MIN_Y_PADDLE);
	}

	private collidePaddleRight(): boolean
	{
		return (this.gameState.ballX >= GameServer.MAX_X_BALL
			&& this.gameState.ballY >= this.gameState.rightPaddleY - GameServer.MIN_Y_PADDLE
			&& this.gameState.ballY <= this.gameState.rightPaddleY + GameServer.MIN_Y_PADDLE);
	}

	private bounce(paddleY: number, mult: number): void
	{
		this.gameState.speed += GameServer.SPEED_INCREMENT;
		this.gameState.ballSpeedX = mult * Math.abs(this.gameState.ballSpeedX);
		this.gameState.ballSpeedY = (this.gameState.ballY - paddleY) / GameServer.MIN_Y_PADDLE * GameServer.MAX_ANGLE;
		this.normalizeSpeed();
	}

	private collideWall(): boolean
	{
		return (this.gameState.ballY <= GameServer.MIN_Y_BALL || this.gameState.ballY >= GameServer.MAX_Y_BALL);
	}

	private movePaddle(): void
	{
		if (this.keysPressed.has(GameServer.PLAYER1_UP_KEY))
		{
			this.gameState.leftPaddleY = Math.max(GameServer.MIN_Y_PADDLE, this.gameState.leftPaddleY - GameServer.PADDLE_SPEED);
		}
		if (this.keysPressed.has(GameServer.PLAYER1_DOWN_KEY))
		{
			this.gameState.leftPaddleY = Math.min(GameServer.MAX_Y_PADDLE, this.gameState.leftPaddleY + GameServer.PADDLE_SPEED);
		}
		if (this.keysPressed.has(GameServer.PLAYER2_UP_KEY))
		{
			this.gameState.rightPaddleY = Math.max(GameServer.MIN_Y_PADDLE, this.gameState.rightPaddleY - GameServer.PADDLE_SPEED);
		}
		if (this.keysPressed.has(GameServer.PLAYER2_DOWN_KEY))
		{
			this.gameState.rightPaddleY = Math.min(GameServer.MAX_Y_PADDLE, this.gameState.rightPaddleY + GameServer.PADDLE_SPEED);
		}
	}
}