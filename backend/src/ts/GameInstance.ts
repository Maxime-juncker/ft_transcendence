import { GameState } from './GameState.js';

export class GameInstance
{
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
	private static readonly PLAYER1_UP_KEY: string = 'w';
	private static readonly PLAYER1_DOWN_KEY: string = 's';
	private static readonly PLAYER2_UP_KEY: string = 'ArrowUp';
	private static readonly PLAYER2_DOWN_KEY: string = 'ArrowDown';
	private static readonly FPS: number = 60;
	private static readonly FRAME_TIME: number = 1000 / GameInstance.FPS;

	private interval: any | null = null;
	private keysPressed: Set<string> = new Set();
	private speed: number = GameInstance.SPEED;
	private ballSpeedX: number = (Math.random() < 0.5) ? 0.5 : -0.5;
	private ballSpeedY: number = (Math.random() - 0.5) * 2;
	private isRunning: boolean = false;
	private gameState: GameState | null = new GameState();
	private namePlayer1: string | null = null;
	private namePlayer2: string | null = null;
	private winner: string | null = null;
	private gameMode: string | null = null;

	constructor(gameMode: string, namePlayer1: string, namePlayer2: string)
	{
		this.gameMode = gameMode;
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
		this.keysPressed.clear();
	}

	get state(): Buffer
	{
		return (this.gameState ? Buffer.from(this.gameState.stateBuffer) : Buffer.alloc(18));
	}

	get reversedState(): Buffer
	{
		return (this.gameState ? Buffer.from(this.gameState.reversedStateBuffer) : Buffer.alloc(18));
	}

	get mode(): string | null
	{
		return (this.gameMode);
	}

	public handleKeyPress(keysPressed: Set<string>): void
	{
		keysPressed.forEach(key => { this.keysPressed.add(this.getKey(key)); });
	}

	private getKey(key: string): string
	{
		switch (key)
		{
			case '1U':
				return (GameInstance.PLAYER1_UP_KEY);
			case '1D':
				return (GameInstance.PLAYER1_DOWN_KEY);
			case '2U':
				return (GameInstance.PLAYER2_UP_KEY);
			case '2D':
				return (GameInstance.PLAYER2_DOWN_KEY);
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
		this.gameState = null;
	}
}
