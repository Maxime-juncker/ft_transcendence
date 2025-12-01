import { addGameToHist, GameRes } from '@modules/users/user.js';
import { GameState } from './GameState.js';
import * as core from 'core/core.js';

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
	SPEED = 1.0,
	SPEED_INCREMENT = 0.05,
	POINTS_TO_WIN = 1,
	FPS = 60,
	FRAME_TIME = 1000 / FPS,
}

export class GameInstance
{
	private _interval: any | null = null;
	private _keysPressed: Set<string> = new Set();
	private _speed: number = Parameters.SPEED;
	private _isRunning: boolean = false;
	private _gameState: GameState = new GameState();
	private _Player1Id: number | null = null;
	private _Player2Id: number | null = null;
	private _winner:	number | null = null;
	private _gameMode:	string | null = null;
	private _scoreUpdated: boolean = false;

	constructor(gameMode: string, player1Id: number, player2Id: number)
	{
		this._gameMode = gameMode;
		this._Player1Id = player1Id;
		this._Player2Id = player2Id;
		console.log(this._Player1Id, this._Player2Id);
		this.normalizeSpeed();
		this.gameLoop();
	}

	private normalizeSpeed(): void
	{
		let currentSpeed = Math.sqrt(this._gameState.speedX * this._gameState.speedX + this._gameState.speedY * this._gameState.speedY);
		this._gameState.speedX = (this._gameState.speedX / currentSpeed) * this._speed;
		this._gameState.speedY = (this._gameState.speedY / currentSpeed) * this._speed;
	}

	private gameLoop = (): void =>
	{
		this._interval = setInterval(() =>
		{
			if (this._isRunning)
			{
				this.moveBall();
				this.movePaddle();
			}
		}, Parameters.FRAME_TIME);
	}

	private moveBall(): void
	{
		this._gameState.ballX += this._gameState.speedX;
		this._gameState.ballY += this._gameState.speedY;

		if (this.goal())
		{
			if (this._gameMode === 'dev')
			{
				this._gameState.speedX = 0;
				this._gameState.speedY = 0;
				this._gameState.ballX = 50;
				this._gameState.ballY = 50;
			}
			else
			{
				this.score((this._gameState.ballX > 100) ? 1 : 2);
				this.resetBall();
				this.scoreUpdated = true;
			}
		}
		else if (this.collideWall())
		{
			this._gameState.speedY = -this._gameState.speedY;
			this.normalizeSpeed();
		}
		else if (this.collidePaddleLeft())
		{
			this.bounce(this._gameState.leftPaddleY);
		}
		else if (this.collidePaddleRight())
		{
			this.bounce(this._gameState.rightPaddleY);
		}
	}

	private goal(): boolean
	{
		return (this._gameState.ballX < 0 || this._gameState.ballX > 100);
	}

	private score(player: number): void
	{
		if (player === 1)
		{
			this._gameState.speedX = 0.5;
			this._gameState.player1Score = this._gameState.player1Score + 1;
			this.getWinner(this._gameState.player1Score, this._Player1Id);
		}
		else
		{
			this._gameState.speedX = -0.5;
			this._gameState.player2Score = this._gameState.player2Score + 1;
			this.getWinner(this._gameState.player2Score, this._Player2Id);
		}
	}

	private getWinner(score: number, player: number | null): void
	{
		if (score >= Parameters.POINTS_TO_WIN)
		{
			this._winner = player;
			this._isRunning = false;
			console.log(`${this._winner} won the game (mode: ${this.mode})`);
			if (this.mode == 'online')
			{
				var res: GameRes = { user1_id: this._Player1Id, user2_id: this._Player2Id, user1_score: this._gameState.player1Score, user2_score: this._gameState.player2Score};
				addGameToHist(res, core.db);
			}
		}
	}

	private resetBall(): void
	{
		this._speed = Parameters.SPEED;
		this._gameState.speedY = (Math.random() - 0.5) * 2;
		this.normalizeSpeed();
		this._gameState.ballX = 50;
		this._gameState.ballY = 50;
	}

	private collideWall(): boolean
	{
		return (this._gameState.ballY <= Parameters.MIN_Y_BALL
			|| this._gameState.ballY >= Parameters.MAX_Y_BALL);
	}

	private collidePaddleLeft(): boolean
	{
		return (this._gameState.ballX <= Parameters.MIN_X_BALL
			&& this._gameState.ballY >= this._gameState.leftPaddleY - Parameters.MIN_Y_PADDLE
			&& this._gameState.ballY <= this._gameState.leftPaddleY + Parameters.MIN_Y_PADDLE);
	}

	private collidePaddleRight(): boolean
	{
		return (this._gameState.ballX >= Parameters.MAX_X_BALL
			&& this._gameState.ballY >= this._gameState.rightPaddleY - Parameters.MIN_Y_PADDLE
			&& this._gameState.ballY <= this._gameState.rightPaddleY + Parameters.MIN_Y_PADDLE);
	}

	private bounce(paddleY: number): void
	{
		this._speed += Parameters.SPEED_INCREMENT;
		this._gameState.speedX = -this._gameState.speedX;
		this._gameState.speedY = (this._gameState.ballY - paddleY) / Parameters.MIN_Y_PADDLE * Parameters.MAX_ANGLE;
		this.normalizeSpeed();
	}

	private movePaddle(): void
	{
		if (this._keysPressed.has(Keys.PLAYER1_UP))
		{
			this._gameState.leftPaddleY = Math.max(Parameters.MIN_Y_PADDLE,
				this._gameState.leftPaddleY - Parameters.PADDLE_SPEED);
		}
		if (this._keysPressed.has(Keys.PLAYER1_DOWN))
		{
			this._gameState.leftPaddleY = Math.min(Parameters.MAX_Y_PADDLE,
				this._gameState.leftPaddleY + Parameters.PADDLE_SPEED);
		}
		if (this._keysPressed.has(Keys.PLAYER2_UP))
		{
			this._gameState.rightPaddleY = Math.max(Parameters.MIN_Y_PADDLE,
				this._gameState.rightPaddleY - Parameters.PADDLE_SPEED);
		}
		if (this._keysPressed.has(Keys.PLAYER2_DOWN))
		{
			this._gameState.rightPaddleY = Math.min(Parameters.MAX_Y_PADDLE,
				this._gameState.rightPaddleY + Parameters.PADDLE_SPEED);
		}
		this._keysPressed.clear();
	}

	get state(): Buffer
	{
		return (this._gameState ? Buffer.from(this._gameState.stateBuffer) : null);
	}

	get reversedState(): Buffer
	{
		return (this._gameState ? Buffer.from(this._gameState.reversedStateBuffer) : null);
	}

	get reversedBuffer(): ArrayBuffer
	{
		return (this._gameState ? this._gameState.reversedStateBuffer : null);
	}

	set state(value: GameState)
	{
		this._gameState = value;
	}

	get mode(): string | null
	{
		return (this._gameMode);
	}

	get ballY(): number
	{
		return (this._gameState.ballY);
	}

	get leftPaddleY(): number
	{
		return (this._gameState.leftPaddleY);
	}

	get ballSpeedX(): number
	{
		return (this._gameState.speedX);
	}

	public handleKeyPress(keysPressed: Set<string>): void
	{
		keysPressed.forEach(key => { this._keysPressed.add(this.getKey(key)); });
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
		this._isRunning = isRunning;
	}

	get winnerName(): number | null
	{
		return (this._winner);
	}

	set winnerName(name: number | null)
	{
		this._winner = name;
	}

	get scoreUpdated(): boolean
	{
		return (this._scoreUpdated);
	}

	set scoreUpdated(value: boolean)
	{
		this._scoreUpdated = value;
	}

	set winner(value: number | null)
	{
		this._winner = value;
	}

	get player1Name(): number | null
	{
		return (this._Player1Id);
	}

	get player2Name(): number | null
	{
		return (this._Player2Id);
	}

	public destroy(): void
	{
		clearInterval(this._interval);
		this._keysPressed.clear();
		this._gameState = null;
	}
}
