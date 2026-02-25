import { addGameToHist, GameRes } from 'modules/users/user.js';
import { GameState } from './GameState.js';
import { Logger } from 'modules/logger.js';
import { getUserName } from 'modules/users/user.js';
import { core } from 'core/server.js';
import { clearInterval } from 'timers';
import dotenv from 'dotenv';

enum Keys
{
	PLAYER1_UP = '1U',
	PLAYER1_DOWN = '1D',
	PLAYER2_UP = '2U',
	PLAYER2_DOWN = '2D',
}

export class Parameters
{
	public FPS: number = 200;
	public PADDLE_SPEED: number = 0.7 / (this.FPS / 100);
	public PADDLE_HEIGHT: number = 15;
	public PADDLE_WIDTH: number = 2;
	public PADDLE_PADDING: number = 2;
	public BALL_SIZE: number = 1.5;
	public BALL_SPEED: number = 0.7 / (this.FPS / 100);
	public BALL_SPEED_INCREMENT: number = 0.05 / (this.FPS / 100);
	public POINTS_TO_WIN: number = 11;
	public MAX_ANGLE: number = 1.0;

	public MIN_Y_PADDLE: number = this.PADDLE_HEIGHT / 2;
	public MAX_Y_PADDLE: number = 100 - this.MIN_Y_PADDLE;
	public MIN_Y_BALL: number = this.BALL_SIZE / 2;
	public MAX_Y_BALL: number = 100 - this.MIN_Y_BALL;
	public MIN_X_BALL: number = this.PADDLE_PADDING + this.PADDLE_WIDTH + this.MIN_Y_BALL;
	public MAX_X_BALL: number = 100 - this.MIN_X_BALL;
	public FRAME_TIME: number = 1000 / this.FPS;

	constructor()
	{
		this.reload();
	}

	public reload(): void
	{
		dotenv.config({ path: '/var/www/server/.env', override: true, quiet: true });

		this.FPS = 200;
		this.PADDLE_SPEED = (process.env.PADDLE_SPEED ? parseFloat(process.env.PADDLE_SPEED) : 0.7) / (this.FPS / 100);
		this.PADDLE_HEIGHT = process.env.PADDLE_HEIGHT ? parseFloat(process.env.PADDLE_HEIGHT) : 15;
		this.PADDLE_WIDTH = process.env.PADDLE_WIDTH ? parseFloat(process.env.PADDLE_WIDTH) : 2;
		this.PADDLE_PADDING = process.env.PADDLE_PADDING ? parseFloat(process.env.PADDLE_PADDING) : 2;
		this.BALL_SIZE = process.env.BALL_SIZE ? parseFloat(process.env.BALL_SIZE) : 1.5;
		this.BALL_SPEED = (process.env.BALL_SPEED ? parseFloat(process.env.BALL_SPEED) : 1.0) / (this.FPS / 100);
		this.BALL_SPEED_INCREMENT = (process.env.BALL_SPEED_INCREMENT ? parseFloat(process.env.BALL_SPEED_INCREMENT) : 0.05) / (this.FPS / 100);
		this.POINTS_TO_WIN = process.env.POINTS_TO_WIN ? parseFloat(process.env.POINTS_TO_WIN) : 11;
		this.MAX_ANGLE = process.env.MAX_ANGLE ? parseFloat(process.env.MAX_ANGLE) : 1.0;

		this.MIN_Y_PADDLE = this.PADDLE_HEIGHT / 2;
		this.MAX_Y_PADDLE = 100 - this.MIN_Y_PADDLE;
		this.MIN_Y_BALL = this.BALL_SIZE / 2;
		this.MAX_Y_BALL = 100 - this.MIN_Y_BALL;
		this.MIN_X_BALL = this.PADDLE_PADDING + this.PADDLE_WIDTH + this.MIN_Y_BALL;
		this.MAX_X_BALL = 100 - this.MIN_X_BALL;
		this.FRAME_TIME = 1000 / this.FPS;
	}
}

export class GameInstance
{
	private _interval: any | null = null;
	private _keysPressed: Set<string> = new Set();
	private _speed: number = 0;
	private _isRunning: boolean = false;
	private _gameState: GameState = new GameState();
	private _Player1Id: number | null = null;
	private _Player2Id: number | null = null;
	private _winner:	number | null = null;
	private _gameMode:	string | null = null;
	private _scoreUpdated: boolean = false;
	public p1Ready: boolean = false;
	public p2Ready: boolean = false;
	private params: Parameters;

	constructor(gameMode: string, player1Id: number, player2Id: number)
	{
		this.params = new Parameters();
		this.params.reload();
		this._gameMode = gameMode;
		this._Player1Id = player1Id;
		this._Player2Id = player2Id;
		this.initAndStart();
	}

	private async initAndStart(): Promise<void>
	{
		this._speed = this.params.BALL_SPEED;
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
			if (this._isRunning && this.p1Ready && this.p2Ready)
			{
				this.moveBall();
				this.movePaddle();
			}
		}, this.params.FRAME_TIME);
	}

	private moveBall(): void
	{
		this._gameState.ballX += this._gameState.speedX;
		this._gameState.ballY += this._gameState.speedY;

		if (this.goal())
		{
			this.handleGoal();
		}
		else if (this.collidePaddleLeft())
		{
			this.bounce(this._gameState.leftPaddleY, this.params.MIN_X_BALL);
		}
		else if (this.collidePaddleRight())
		{
			this.bounce(this._gameState.rightPaddleY, this.params.MAX_X_BALL);
		}
		else if (this.collideWall())
		{
			this._gameState.speedY = -this._gameState.speedY;
			this.normalizeSpeed();
		}
	}

	private goal(): boolean
	{
		return (this._gameState.ballX < 0 || this._gameState.ballX > 100);
	}

	private handleGoal(): void
	{
		if (this._gameMode === 'dev')
		{
			this._gameState.speedX = 0;
			this._gameState.speedY = 0;
		}
		else
		{
			this.score((this._gameState.ballX > 100) ? 1 : 2);
			this.resetBall();
			this.scoreUpdated = true;
		}
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

	private async getWinner(score: number, player: number | null): Promise<void>
	{
		if (score >= this.params.POINTS_TO_WIN)
		{
			this._winner = player ? player : 0;
			this._isRunning = false;
			Logger.log(`${await getUserName(this._winner)} won the game (mode: ${this.mode})`);
			if (this.mode == 'duel' || this.mode == 'online' || this.mode == 'bot')
			{
				if (!this._Player1Id || !this._Player2Id)
					return ;

				var res: GameRes =
				{
					user1_id: this._Player1Id,
					user2_id: this._Player2Id,
					user1_score: this._gameState.player1Score,
					user2_score: this._gameState.player2Score
				};
				addGameToHist(res, core.db);
			}
		}
	}

	private resetBall(): void
	{
		this._speed = this.params.BALL_SPEED;
		this._gameState.speedY = (Math.random() - 0.5) * 0.4;
		this.normalizeSpeed();
		this._gameState.ballX = 50;
		this._gameState.ballY = 50;
	}

	private collideWall(): boolean
	{
		return (this._gameState.ballY <= this.params.MIN_Y_BALL
			|| this._gameState.ballY >= this.params.MAX_Y_BALL);
	}

	private collidePaddleLeft(): boolean
	{
		return (this._gameState.ballX <= this.params.MIN_X_BALL - this.params.BALL_SIZE
			&& this._gameState.ballY >= this._gameState.leftPaddleY - this.params.MIN_Y_PADDLE
			&& this._gameState.ballY <= this._gameState.leftPaddleY + this.params.MIN_Y_PADDLE);
	}

	private collidePaddleRight(): boolean
	{
		return (this._gameState.ballX >= this.params.MAX_X_BALL
			&& this._gameState.ballY >= this._gameState.rightPaddleY - this.params.MIN_Y_PADDLE
			&& this._gameState.ballY <= this._gameState.rightPaddleY + this.params.MIN_Y_PADDLE);
	}

	private bounce(paddleY: number, newX: number): void
	{
		this._speed += this.params.BALL_SPEED_INCREMENT;
		this._gameState.speedY = (this._gameState.ballY - paddleY) / this.params.MIN_Y_PADDLE * this.params.MAX_ANGLE;
		if (this._gameState.ballX < 50)
			this._gameState.speedX = Math.abs(this._gameState.speedX);
		else 
			this._gameState.speedX = Math.abs(this._gameState.speedX) * -1;
		this._gameState.ballX = newX;
		this.normalizeSpeed();
	}

	private movePaddle(): void
	{
		if (this._keysPressed.has(Keys.PLAYER1_UP))
		{
			this._gameState.leftPaddleY = Math.max(this.params.MIN_Y_PADDLE,
				this._gameState.leftPaddleY - this.params.PADDLE_SPEED);
		}
		if (this._keysPressed.has(Keys.PLAYER1_DOWN))
		{
			this._gameState.leftPaddleY = Math.min(this.params.MAX_Y_PADDLE,
				this._gameState.leftPaddleY + this.params.PADDLE_SPEED);
		}
		if (this._keysPressed.has(Keys.PLAYER2_UP))
		{
			this._gameState.rightPaddleY = Math.max(this.params.MIN_Y_PADDLE,
				this._gameState.rightPaddleY - this.params.PADDLE_SPEED);
		}
		if (this._keysPressed.has(Keys.PLAYER2_DOWN))
		{
			this._gameState.rightPaddleY = Math.min(this.params.MAX_Y_PADDLE,
				this._gameState.rightPaddleY + this.params.PADDLE_SPEED);
		}
		this._keysPressed.clear();
	}

	get state(): Buffer | null					{ return (this._gameState ? Buffer.from(this._gameState.stateBuffer) : null); }
	get reversedState(): Buffer | null			{ return (this._gameState ? Buffer.from(this._gameState.reversedStateBuffer) : null); }
	get reversedBuffer(): ArrayBuffer | null	{ return (this._gameState ? this._gameState.reversedStateBuffer : null); }
	get mode(): string | null					{ return (this._gameMode); }
	get ballX(): number							{ return (this._gameState.ballX); }
	get ballY(): number							{ return (this._gameState.ballY); }
	get leftPaddleY(): number					{ return (this._gameState.leftPaddleY); }
	get rightPaddleY(): number					{ return (this._gameState.rightPaddleY); }
	get ballSpeedX(): number					{ return (this._gameState.speedX); }
	get keysPressed(): Set<string>				{ return (this._keysPressed); }
	get winner(): number | null					{ return (this._winner); }
	get scoreUpdated(): boolean					{ return (this._scoreUpdated); }
	get player1Id(): number						{ return (this._Player1Id!); }
	get player2Id(): number						{ return (this._Player2Id!); }

	get p1Score(): number						{ return (this._gameState.player1Score); }
	get p2Score(): number						{ return (this._gameState.player2Score); }
	
	set keysPressed(keys: Set<string>)			{ this._keysPressed = keys; }
	set running(isRunning: boolean)				{ this._isRunning = isRunning; }
	set state(value: GameState)					{ this._gameState = value; }
	set scoreUpdated(value: boolean)			{ this._scoreUpdated = value; }
	set winner(value: number | null)			{ this._winner = value; }

	public destroy(): void
	{
		clearInterval(this._interval);
		this._keysPressed.clear();
	}
}
