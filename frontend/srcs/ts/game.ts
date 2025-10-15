class Game
{
	private static readonly PADDLE_SPEED: number = 1.5;
	private static readonly MIN_Y: number = 10;
	private static readonly MAX_Y: number = 90;
	private static readonly PADDLE_HEIGHT: number = 20;
	private static readonly MAX_ANGLE: number = 0.75;
	private static readonly BASE_SPEED: number = 1.0;

	private readonly leftPaddle = document.querySelector('.paddle-left') as HTMLElement;
	private readonly rightPaddle = document.querySelector('.paddle-right') as HTMLElement;
	private readonly ball = document.querySelector('.ball') as HTMLElement;
	private readonly scoreLeft = document.querySelector('.score-left') as HTMLElement;
	private readonly scoreRight = document.querySelector('.score-right') as HTMLElement;
	private readonly pauseMessage = document.querySelector('.pause-message') as HTMLElement;
	private readonly keysPressed: Set<string> = new Set();

	private keydownHandler: (event: KeyboardEvent) => void;
	private keyupHandler: (event: KeyboardEvent) => void;
	private leftPaddleY: number;
	private rightPaddleY: number;
	private ballX: number;
	private ballY: number;
	private ballSpeedX: number;
	private ballSpeedY: number;
	private totalScore: number;
	private speed: number;
	private pauseGame: boolean;
	private isDestroyed: boolean;

	constructor()
	{
		this.init();
		this.setupEventListeners();
		this.gameLoop();
	}

	private init(): void
	{
		this.keydownHandler = this.onKeyDown.bind(this);
		this.keyupHandler = this.onKeyUp.bind(this);
		this.pauseMessage.style.display = 'none';
		this.leftPaddleY = 50;
		this.rightPaddleY = 50;
		this.ballX = 50;
		this.ballY = 50;
		this.ballSpeedX = 0.5;
		this.ballSpeedY = 0.5;
		this.totalScore = 0;
		this.speed = Game.BASE_SPEED;
		this.pauseGame = false;
		this.isDestroyed = false;
		this.scoreLeft.textContent = '0';
		this.scoreRight.textContent = '0';
	}

	private moveBall(): void
	{
		this.ballX += this.ballSpeedX;
		this.ballY += this.ballSpeedY;

		// wall collision
		if (this.ballY <= 0 || this.ballY >= 100)
		{
			this.ballSpeedY = -this.ballSpeedY;
		}

		// paddle collision
		if (this.ballX <= 5 && this.ballY >= this.leftPaddleY - (Game.PADDLE_HEIGHT / 2) && this.ballY <= this.leftPaddleY + (Game.PADDLE_HEIGHT / 2))
		{
			this.speed += 0.08;
			let relativeIntersectY = (this.ballY - this.leftPaddleY) / (Game.PADDLE_HEIGHT / 2);
			let newAngleY = relativeIntersectY * Game.MAX_ANGLE;

			this.ballSpeedX = Math.abs(this.ballSpeedX);
			this.ballSpeedY = newAngleY;

			let currentSpeed = Math.sqrt(this.ballSpeedX * this.ballSpeedX + this.ballSpeedY * this.ballSpeedY);
			this.ballSpeedX = (this.ballSpeedX / currentSpeed) * this.speed;
			this.ballSpeedY = (this.ballSpeedY / currentSpeed) * this.speed;
		}
		else if (this.ballX >= 95 && this.ballY >= this.rightPaddleY - (Game.PADDLE_HEIGHT / 2) && this.ballY <= this.rightPaddleY + (Game.PADDLE_HEIGHT / 2))
		{
			this.speed += 0.08;
			let relativeIntersectY = (this.ballY - this.rightPaddleY) / (Game.PADDLE_HEIGHT / 2);
			let newAngleY = relativeIntersectY * Game.MAX_ANGLE;
			
			this.ballSpeedX = -Math.abs(this.ballSpeedX);
			this.ballSpeedY = newAngleY;
			
			let currentSpeed = Math.sqrt(this.ballSpeedX * this.ballSpeedX + this.ballSpeedY * this.ballSpeedY);
			this.ballSpeedX = (this.ballSpeedX / currentSpeed) * this.speed;
			this.ballSpeedY = (this.ballSpeedY / currentSpeed) * this.speed;
		}

		// goal !!
		if (this.ballX < 0 || this.ballX > 100)
		{
			if (this.ballX < 0)
			{
				this.scoreRight.textContent = (parseInt(this.scoreRight.textContent || '0') + 1).toString();
			}
			else
			{
				this.scoreLeft.textContent = (parseInt(this.scoreLeft.textContent || '0') + 1).toString();
			}
			this.speed = Game.BASE_SPEED;
			this.totalScore++;
			this.ballSpeedX = (this.totalScore % 2 === 0) ? 0.5 : -0.5;
			this.ballX = 50;
			this.ballY = Math.random() * 100;
		}

		this.ball.style.left = this.ballX + '%';
		this.ball.style.top = this.ballY + '%';
	}

	private movePaddle(): void
	{
		if (this.keysPressed.has('w') || this.keysPressed.has('W'))
		{
			this.leftPaddleY = Math.max(Game.MIN_Y, this.leftPaddleY - Game.PADDLE_SPEED);
			this.leftPaddle.style.top = this.leftPaddleY + '%';
		}
		if (this.keysPressed.has('s') || this.keysPressed.has('S'))
		{
			this.leftPaddleY = Math.min(Game.MAX_Y, this.leftPaddleY + Game.PADDLE_SPEED);
			this.leftPaddle.style.top = this.leftPaddleY + '%';
		}
		if (this.keysPressed.has('ArrowUp'))
		{
			this.rightPaddleY = Math.max(Game.MIN_Y, this.rightPaddleY - Game.PADDLE_SPEED);
			this.rightPaddle.style.top = this.rightPaddleY + '%';
		}
		if (this.keysPressed.has('ArrowDown'))
		{
			this.rightPaddleY = Math.min(Game.MAX_Y, this.rightPaddleY + Game.PADDLE_SPEED);
			this.rightPaddle.style.top = this.rightPaddleY + '%';
		}
	}

	private gameLoop = (): void =>
	{
		if (this.isDestroyed)
		{
			return ;
		}
		else if (!this.pauseGame)
		{
			this.moveBall();
			this.movePaddle();
		}
		requestAnimationFrame(this.gameLoop);
	}

	private onKeyDown(event: KeyboardEvent): void
	{
		this.keysPressed.add(event.key);
		if (event.key === 'p' || event.key === 'P' || event.key === ' ')
		{
			this.pauseGame = !this.pauseGame;
			if (this.pauseGame)
			{
				this.pauseMessage.style.display = 'block';
			}
			else
			{
				this.pauseMessage.style.display = 'none';
			}
		}
	}

	private onKeyUp(event: KeyboardEvent): void
	{
		this.keysPressed.delete(event.key);
	}

	private setupEventListeners(): void
	{
		document.addEventListener('keydown', (event: KeyboardEvent): void =>
		{
			this.keysPressed.add(event.key);
			if (event.key === 'p' || event.key === 'P' || event.key === ' ')
			{
				this.pauseGame = !this.pauseGame;
				if (this.pauseGame)
				{
					this.pauseMessage.style.display = 'block';
				}
				else
				{
					this.pauseMessage.style.display = 'none';
				}
			}
		});

		document.addEventListener('keyup', (event: KeyboardEvent): void =>
		{
			this.keysPressed.delete(event.key);
		});
	}

	public destroy(): void
	{
		this.isDestroyed = true;
		document.removeEventListener('keydown', () => {});
		document.removeEventListener('keyup', () => {});
		this.keysPressed.clear();
	}
};