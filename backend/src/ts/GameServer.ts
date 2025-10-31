import Fastify, { FastifyInstance } from 'fastify';

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
	private static readonly POINTS_TO_WIN: number = 11;
	private static readonly PLAYER1_UP_KEY: string = 'z';
	private static readonly PLAYER1_DOWN_KEY: string = 's';
	private static readonly PLAYER2_UP_KEY: string = 'ArrowUp';
	private static readonly PLAYER2_DOWN_KEY: string = 'ArrowDown';
	private static readonly FPS: number = 60;
	private static readonly FRAME_TIME: number = 1000 / GameInstance.FPS;
	private static readonly NAME_PLAYER1: string = 'player1';
	private static readonly NAME_PLAYER2: string = 'player2';

	/* GAME STATE */
	private keysPressed: Set<string> = new Set();
	private speed: number = GameInstance.SPEED;
	private ballSpeedX: number = (Math.random() < 0.5) ? 0.5 : -0.5;
	private ballSpeedY: number = (Math.random() - 0.5) * 2;
	private isReady: boolean = false;
	private mode: string;

	gameState: any =
	{
		leftPaddleY: 50,
		rightPaddleY: 50,
		ballX: 50,
		ballY: 50,
		player1Score: 0,
		player2Score: 0,
		pause: false,
		winner: null,
	};

	constructor(mode: string)
	{
		this.mode = mode;
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
			if (this.isReady && !this.gameState.winner)
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
			this.gameState.winner = (player === 1) ? GameInstance.NAME_PLAYER1 : GameInstance.NAME_PLAYER2;
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

	public getCurrentGameState(): any
	{
		return { state: this.gameState };
	}

	public getReversedGameState(): any
	{
		const reversedState = this.gameState;
		reversedState.leftPaddleY = this.gameState.rightPaddleY;
		reversedState.rightPaddleY = this.gameState.leftPaddleY;
		reversedState.player1Score = this.gameState.player2Score;
		reversedState.player2Score = this.gameState.player1Score;

		return { state: reversedState };
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

	public setReady(isReady: boolean): void
	{
		this.isReady = isReady;
	}
}

export class GameServer
{

	private activeGames: Map<string, [string, string, GameInstance]> = new Map();
	private playerWaiting: { reply: any, playerName: string } | null = null;
	private server!: FastifyInstance;

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

	}

	// private createGame(): void
	// {
	// 	this.server.post('/api/create-game', (request, reply) =>
	// 	{
	// 		try
	// 		{
	// 			const body = request.body as any;

	// 			if (body.mode === '1player')
	// 			{
	// 				if (this.playerWaiting)
	// 				{
	// 					const gameId = crypto.randomUUID();
	// 					this.activeGames.set(gameId, [this.playerWaiting.playerName, body.playerName, new GameInstance(body.mode)]);
	// 					this.playerWaiting.reply.status(201).send(this.getParameters(this.playerWaiting.playerName, gameId, body.playerName));
	// 					reply.status(201).send(this.getParameters(body.playerName, gameId, this.playerWaiting.playerName));
	// 					this.playerWaiting = null;
	// 				}
	// 				else
	// 				{
	// 					this.playerWaiting = { reply, playerName: body.playerName };
	// 				}
	// 			}
	// 			else
	// 			{
	// 				const gameId = crypto.randomUUID();
	// 				this.activeGames.set(gameId, [body.playerName, null, new GameInstance(body.mode)]);
	// 				reply.status(201).send(this.getParameters(body.playerName, gameId, null));
	// 			}
	// 		}
	// 		catch (error)
	// 		{
	// 			reply.status(500).send();
	// 		}
	// 	});
	// }

	// private ready(): void
	// {
	// 	this.server.post('/api/ready/:gameId', (request, reply) =>
	// 	{
	// 		const { gameId } = request.params as any;
	// 		const gameData = this.activeGames.get(gameId);

	// 		if (gameData)
	// 		{
	// 			gameData[2].setReady(true);
	// 			reply.status(200).send();
	// 		}
	// 		else
	// 		{
	// 			reply.status(404).send();
	// 		}
	// 	});
	// }

	// private sendGameState(): void
	// {
	// 	this.server.get('/api/game-state/:gameId', (request, reply) =>
	// 	{
	// 		const { gameId } = request.params as any;
	// 		const gameData = this.activeGames.get(gameId);

	// 		if (gameData)
	// 		{
	// 			const gameInstance = gameData[2];
	// 			reply.status(200).send(gameInstance.getCurrentGameState());

	// 			if (gameInstance.getCurrentGameState().isGameOver)
	// 			{
	// 				this.activeGames.delete(gameId);
	// 			}
	// 		}
	// 		else
	// 		{
	// 			reply.status(404).send();
	// 		}
	// 	});
	// }

	// private getAction(): void
	// {
	// 	this.server.post('/api/game-action/:gameId', (request, reply) =>
	// 	{
	// 		const { gameId } = request.params as any;
	// 		const body = request.body as any;
	// 		const gameData = this.activeGames.get(gameId);

	// 		if (gameData)
	// 		{
	// 			const [player1Name, player2Name, gameInstance] = gameData;
	// 			if (gameInstance.getMode() === '2player')
	// 			{
	// 				gameInstance.handleKeyPress(body);
	// 				reply.status(200).send();
	// 			}
	// 			else if (body.player === player1Name)
	// 			{
	// 				gameInstance.handleKeyPressPlayer1(body);
	// 				reply.status(200).send();
	// 			}
	// 			else if (body.player === player2Name)
	// 			{
	// 				gameInstance.handleKeyPressPlayer2(body);
	// 				reply.status(200).send();
	// 			}
	// 		}
	// 		else
	// 		{
	// 			reply.status(404).send();
	// 		}
	// 	});
	// }
}
