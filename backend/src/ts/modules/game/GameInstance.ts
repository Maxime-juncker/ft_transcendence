import { addGameToHist, GameRes } from 'modules/users/user.js';
import { GameState } from './GameState.js';
import { Logger } from 'modules/logger.js';
import { getUserName } from 'modules/users/user.js';
import { core } from 'core/server.js';

enum Keys
{
	PLAYER1_UP = '1U',
	PLAYER1_DOWN = '1D',
	PLAYER2_UP = '2U',
	PLAYER2_DOWN = '2D',
}

class Parameters
{
	static PADDLE_SPEED: number = 1.5;
	static PADDLE_HEIGHT: number = 15;
	static PADDLE_WIDTH: number = 2;
	static PADDLE_PADDING: number = 2;
	static BALL_SIZE: number = 2;
	static MAX_ANGLE: number = 1.5;
	static SPEED: number = 1.0;
	static SPEED_INCREMENT: number = 0.1;
	static POINTS_TO_WIN: number = 3;
	static FPS: number = 60;

	static MIN_Y_PADDLE: number = Parameters.PADDLE_HEIGHT / 2;
	static MAX_Y_PADDLE: number = 100 - Parameters.MIN_Y_PADDLE;
	static MIN_Y_BALL: number = Parameters.BALL_SIZE / 2;
	static MAX_Y_BALL: number = 100 - Parameters.MIN_Y_BALL;
	static MIN_X_BALL: number = Parameters.PADDLE_PADDING + Parameters.PADDLE_WIDTH + Parameters.MIN_Y_BALL;
	static MAX_X_BALL: number = 100 - Parameters.MIN_X_BALL;
	static FRAME_TIME: number = 1000 / Parameters.FPS;

	static async load(): Promise<void>
	{
		try
		{
			const row = await core.db.get("SELECT * FROM game_parameters LIMIT 1");
			if (row)
			{
				Parameters.PADDLE_SPEED = row.paddle_speed;
				Parameters.PADDLE_HEIGHT = row.paddle_height;
				Parameters.PADDLE_WIDTH = row.paddle_width;
				Parameters.PADDLE_PADDING = row.paddle_padding;
				Parameters.BALL_SIZE = row.ball_size;
				Parameters.MAX_ANGLE = row.max_angle;
				Parameters.SPEED = row.speed;
				Parameters.SPEED_INCREMENT = row.speed_increment;
				Parameters.POINTS_TO_WIN = row.points_to_win;
				Parameters.FPS = row.fps;

				Parameters.MIN_Y_PADDLE = Parameters.PADDLE_HEIGHT / 2;
				Parameters.MAX_Y_PADDLE = 100 - Parameters.MIN_Y_PADDLE;
				Parameters.MIN_Y_BALL = Parameters.BALL_SIZE / 2;
				Parameters.MAX_Y_BALL = 100 - Parameters.MIN_Y_BALL;
				Parameters.MIN_X_BALL = Parameters.PADDLE_PADDING + Parameters.PADDLE_WIDTH + Parameters.MIN_Y_BALL;
				Parameters.MAX_X_BALL = 100 - Parameters.MIN_X_BALL;
				Parameters.FRAME_TIME = 1000 / Parameters.FPS;
			}
		}
		catch (err)
		{
			Logger.log("Failed to load game parameters from DB, using defaults");
		}
	}
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
	public p1Ready: boolean = false;
	public p2Ready: boolean = false;

	constructor(gameMode: string, player1Id: number, player2Id: number)
	{
		this._gameMode = gameMode;
		this._Player1Id = player1Id;
		this._Player2Id = player2Id;
		this.initAndStart();
	}

	private async initAndStart(): Promise<void>
	{
		await Parameters.load();
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
			this.bounce(this._gameState.leftPaddleY, Parameters.MIN_X_BALL);
		}
		else if (this.collidePaddleRight())
		{
			this.bounce(this._gameState.rightPaddleY, Parameters.MAX_X_BALL);
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

	private async getWinner(score: number, player: number | null): Promise<void>
	{
		if (score >= Parameters.POINTS_TO_WIN)
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
		this._speed = Parameters.SPEED;
		this._gameState.speedY = (Math.random() - 0.5);
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
		return (this._gameState.ballX <= Parameters.MIN_X_BALL - Parameters.BALL_SIZE
			&& this._gameState.ballY >= this._gameState.leftPaddleY - Parameters.MIN_Y_PADDLE
			&& this._gameState.ballY <= this._gameState.leftPaddleY + Parameters.MIN_Y_PADDLE);
	}

	private collidePaddleRight(): boolean
	{
		return (this._gameState.ballX >= Parameters.MAX_X_BALL
			&& this._gameState.ballY >= this._gameState.rightPaddleY - Parameters.MIN_Y_PADDLE
			&& this._gameState.ballY <= this._gameState.rightPaddleY + Parameters.MIN_Y_PADDLE);
	}

	private bounce(paddleY: number, newX: number): void
	{
		this._speed += Parameters.SPEED_INCREMENT;
		this._gameState.speedX = -this._gameState.speedX;
		this._gameState.speedY = (this._gameState.ballY - paddleY) / Parameters.MIN_Y_PADDLE * Parameters.MAX_ANGLE;
		this._gameState.ballX = newX;
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

	get state(): Buffer | null					{ return (this._gameState ? Buffer.from(this._gameState.stateBuffer) : null); }
	get reversedState(): Buffer | null			{ return (this._gameState ? Buffer.from(this._gameState.reversedStateBuffer) : null); }
	get reversedBuffer(): ArrayBuffer | null	{ return (this._gameState ? this._gameState.reversedStateBuffer : null); }
	get mode(): string | null					{ return (this._gameMode); }
	get ballY(): number							{ return (this._gameState.ballY); }
	get leftPaddleY(): number					{ return (this._gameState.leftPaddleY); }
	get ballSpeedX(): number					{ return (this._gameState.speedX); }
	get keysPressed(): Set<string>				{ return (this._keysPressed); }
	get winnerName(): number | null				{ return (this._winner); }
	get winner(): number | null					{ return (this._winner); }
	get scoreUpdated(): boolean					{ return (this._scoreUpdated); }
	get player1Id(): number						{ return (this._Player1Id!); }
	get player2Id(): number						{ return (this._Player2Id!); }

	get p1Score(): number						{ return (this._gameState.player1Score); }
	get p2Score(): number						{ return (this._gameState.player2Score); }
	
	set keysPressed(keys: Set<string>)			{ this._keysPressed = keys; }
	set running(isRunning: boolean)				{ this._isRunning = isRunning; }
	set state(value: GameState)					{ this._gameState = value; }
	set winnerName(name: number | null)			{ this._winner = name; }
	set scoreUpdated(value: boolean)			{ this._scoreUpdated = value; }
	set winner(value: number | null)			{ this._winner = value; }

	public destroy(): void
	{
		clearInterval(this._interval);
		this._keysPressed.clear();
	}
}
