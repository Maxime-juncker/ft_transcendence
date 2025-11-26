import { GameState } from './GameState.js';

enum Keys
{
	PLAYER1_UP = 'a',
	PLAYER1_DOWN = 'b',
	PLAYER2_UP = 'c',
	PLAYER2_DOWN = 'd',
}

enum Parameters
{
	PADDLE_SPEED = 1.2,
	PADDLE_HEIGHT = 15,
	PADDLE_WIDTH = 2,
	PADDLE_PADDING = 2,
	MIN_Y_PADDLE = PADDLE_HEIGHT / 2,
	MAX_Y_PADDLE = 100 - MIN_Y_PADDLE,
	BALL_SIZE = 2,
	MIN_Y_BALL = BALL_SIZE / 2,
	MAX_Y_BALL = 100 - MIN_Y_BALL,
	MIN_X_BALL = PADDLE_PADDING + PADDLE_WIDTH + MIN_Y_BALL,
	MAX_X_BALL = 100 - MIN_X_BALL,
	MAX_ANGLE = 0.5,
	SPEED = 0.8,
	SPEED_INCREMENT = 0.0,
	POINTS_TO_WIN = 1,
	FPS = 60,
	FRAME_TIME = 1000 / FPS,
}

export class GameInstance
{
	private interval: any | null = null;
	private keysPressed: Set<string> = new Set();
	private speed: number = Parameters.SPEED;
	private isRunning: boolean = false;
	private gameState: GameState = new GameState();
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
		let currentSpeed = Math.sqrt(this.gameState.speedX * this.gameState.speedX + this.gameState.speedY * this.gameState.speedY);
		this.gameState.speedX = (this.gameState.speedX / currentSpeed) * this.speed;
		this.gameState.speedY = (this.gameState.speedY / currentSpeed) * this.speed;
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
		}, Parameters.FRAME_TIME);
	}

	private moveBall(): void
	{
		this.gameState.ballX += this.gameState.speedX;
		this.gameState.ballY += this.gameState.speedY;

		if (this.goal())
		{
			this.score((this.gameState.ballX > 100) ? 1 : 2);
			this.resetBall();
		}
		else if (this.collideWall())
		{
			this.gameState.speedY = -this.gameState.speedY;
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
			this.gameState.speedX = 0.5;
			this.gameState.player1Score = this.gameState.player1Score + 1;
			this.getWinner(this.gameState.player1Score, this.namePlayer1);
		}
		else
		{
			this.gameState.speedX = -0.5;
			this.gameState.player2Score = this.gameState.player2Score + 1;
			this.getWinner(this.gameState.player2Score, this.namePlayer2);
		}
	}

	private getWinner(score: number, player: string | null): void
	{
		if (score >= Parameters.POINTS_TO_WIN)
		{
			this.winner = player;
			this.isRunning = false;
		}
	}

	private resetBall(): void
	{
		this.speed = Parameters.SPEED;
		this.gameState.speedY = (Math.random() - 0.5) * 2;
		this.normalizeSpeed();
		this.gameState.ballX = 50;
		this.gameState.ballY = 50;
	}

	private collideWall(): boolean
	{
		return (this.gameState.ballY <= Parameters.MIN_Y_BALL
			|| this.gameState.ballY >= Parameters.MAX_Y_BALL);
	}

	private collidePaddleLeft(): boolean
	{
		return (this.gameState.ballX <= Parameters.MIN_X_BALL
			&& this.gameState.ballY >= this.gameState.leftPaddleY - Parameters.MIN_Y_PADDLE
			&& this.gameState.ballY <= this.gameState.leftPaddleY + Parameters.MIN_Y_PADDLE);
	}

	private collidePaddleRight(): boolean
	{
		return (this.gameState.ballX >= Parameters.MAX_X_BALL
			&& this.gameState.ballY >= this.gameState.rightPaddleY - Parameters.MIN_Y_PADDLE
			&& this.gameState.ballY <= this.gameState.rightPaddleY + Parameters.MIN_Y_PADDLE);
	}

	private bounce(paddleY: number): void
	{
		this.speed += Parameters.SPEED_INCREMENT;
		this.gameState.speedX = -this.gameState.speedX;
		this.gameState.speedY = (this.gameState.ballY - paddleY) / Parameters.MIN_Y_PADDLE * Parameters.MAX_ANGLE;
		this.normalizeSpeed();
	}

	private movePaddle(): void
	{
		if (this.keysPressed.has(Keys.PLAYER1_UP))
		{
			this.gameState.leftPaddleY = Math.max(Parameters.MIN_Y_PADDLE,
				this.gameState.leftPaddleY - Parameters.PADDLE_SPEED);
		}
		if (this.keysPressed.has(Keys.PLAYER1_DOWN))
		{
			this.gameState.leftPaddleY = Math.min(Parameters.MAX_Y_PADDLE,
				this.gameState.leftPaddleY + Parameters.PADDLE_SPEED);
		}
		if (this.keysPressed.has(Keys.PLAYER2_UP))
		{
			this.gameState.rightPaddleY = Math.max(Parameters.MIN_Y_PADDLE,
				this.gameState.rightPaddleY - Parameters.PADDLE_SPEED);
		}
		if (this.keysPressed.has(Keys.PLAYER2_DOWN))
		{
			this.gameState.rightPaddleY = Math.min(Parameters.MAX_Y_PADDLE,
				this.gameState.rightPaddleY + Parameters.PADDLE_SPEED);
		}
		this.keysPressed.clear();
	}

	get state(): Buffer
	{
		return (this.gameState ? Buffer.from(this.gameState.stateBuffer) : null);
	}

	get reversedState(): Buffer
	{
		return (this.gameState ? Buffer.from(this.gameState.reversedStateBuffer) : null);
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
				return (Keys.PLAYER1_UP);
			case '1D':
				return (Keys.PLAYER1_DOWN);
			case '2U':
				return (Keys.PLAYER2_UP);
			case '2D':
				return (Keys.PLAYER2_DOWN);
			default:
				return ('');
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
