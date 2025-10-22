import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';

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
	private static readonly MIN_Y_BALL: number = GameInstance.BALL_SIZE;
	private static readonly MAX_Y_BALL: number = 100 - GameInstance.MIN_Y_BALL;
	private static readonly MIN_X_BALL: number = GameInstance.PADDLE_PADDING + GameInstance.PADDLE_WIDTH + GameInstance.MIN_Y_BALL;
	private static readonly MAX_X_BALL: number = 100 - GameInstance.MIN_X_BALL;
	private static readonly MAX_ANGLE: number = 0.75;
	private static readonly SPEED: number = 0.5;
	private static readonly SPEED_INCREMENT: number = 0.0;
	private static readonly POINTS_TO_WIN: number = 2;
	private static readonly PLAYER1_UP_KEY: string = 'z';
	private static readonly PLAYER1_DOWN_KEY: string = 's';
	private static readonly PLAYER2_UP_KEY: string = 'ArrowUp';
	private static readonly PLAYER2_DOWN_KEY: string = 'ArrowDown';
	private static readonly FPS: number = 60;
	private static readonly FRAME_TIME: number = 1000 / GameInstance.FPS;

	/* GAME STATE */
	private keysPressed: Set<string> = new Set();
	private speed: number = GameInstance.SPEED;
	private ballSpeedX: number = (Math.random() < 0.5) ? 0.5 : -0.5;
	private ballSpeedY: number = (Math.random() - 0.5) * 2;

	gameState: any =
	{
		leftPaddleY: 50,
		rightPaddleY: 50,
		ballX: 50,
		ballY: 50,
		player1Score: 0,
		player2Score: 0,
		pause: false,
		end: false,
	};

	constructor()
	{
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
		setInterval(() =>
		{
			if (!this.gameState.end)
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
			this.ballSpeedX = 0.5;
		}
		else
		{
			this.gameState.player2Score = newScore;
			this.ballSpeedX = -0.5;
		}

		if (newScore >= GameInstance.POINTS_TO_WIN)
		{
			this.gameState.end = true;
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

	private bounce(paddleY: number, mult: number): void
	{
		this.speed += GameInstance.SPEED_INCREMENT;
		this.ballSpeedX = mult * Math.abs(this.ballSpeedX);
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

	public getCurrentGameState(): any
	{
		return {
			type: 'gameState',
			state: this.gameState,
		};
	}

	public handleKeyPress(body: any): void
	{
		if (body.type === 'keydown')
		{
			this.keysPressed.add(body.key);
		}
		else if (body.type === 'keyup')
		{
			this.keysPressed.delete(body.key);
		}
	}
}

export class GameServer
{
	private activeGames: Map<string, GameInstance> = new Map();
	private server!: FastifyInstance;

	constructor()
	{
		this.start();
	}

	private async start(): Promise<void>
	{
		this.server = Fastify();

		try
		{
			await this.launchServer();
		}
		catch (error)
		{
			console.error('❌ Error starting server:', error);
		}
	}

	private async launchServer(): Promise<void>
	{
		await this.server.register(cors, { origin: true });

		// this.server.post('/game-start/:gameId', (request, reply) =>
		// {
		// 	const { gameId } = request.params as any;
		// 	const game = this.activeGames.get(gameId);

		// 	if (game)
		// 	{
		// 		reply.send( { success: true } );
		// 	}
		// });

		// this.server.get('/game-state/:gameId', (request, reply) =>
		// {
		// 	const { gameId } = request.params as any;
		// 	const game = this.activeGames.get(gameId);

		// 	if (game)
		// 	{
		// 		reply.send(game.getCurrentGameState());
		// 	}
		// 	else
		// 	{
		// 		reply.status(404).send( { error: 'Game not found' } );
		// 	}
		// });

		this.server.post('/create-game', (request, reply) =>
		{
			const gameId = this.generateGameId();
			this.activeGames.set(gameId, new GameInstance());
			reply.send( { gameId: gameId } );
		});

		this.server.get('/game-state/:gameId', (request, reply) =>
		{
			const { gameId } = request.params as any;
			const game = this.activeGames.get(gameId);

			if (game)
			{
				reply.send(game.getCurrentGameState());
			}
			else
			{
				reply.status(404).send( { error: 'Game not found' } );
			}
		});

		this.server.post('/game-action/:gameId', (request, reply) =>
		{
			const { gameId } = request.params as any;
			const body = request.body as any;
			const game = this.activeGames.get(gameId);

			if (game)
			{
				game.handleKeyPress(body);
				reply.send( { success: true } );
			}
			else
			{
				reply.status(404).send( { error: 'Game not found' } );
			}
		});

		this.server.get('/active-games', (request, reply) =>
		{
			const games = Array.from(this.activeGames.keys());
			reply.send( { games: games } );
		});

		await this.server.listen( { port: 3000, host: '0.0.0.0' } );
	}

	private generateGameId(): string
	{
		return Math.random().toString(36).substring(2, 8);
	}
}
