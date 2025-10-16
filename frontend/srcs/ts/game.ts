class Game
{
	private static readonly PADDLE_SPEED: number = 1.5;
	private static readonly MIN_Y: number = 10;
	private static readonly MAX_Y: number = 90;
	private static readonly PADDLE_HEIGHT: number = 20;
	private static readonly MAX_ANGLE: number = 0.75;
	private static readonly BASE_SPEED: number = 1.0;
	private static readonly SPEED_INCREMENT: number = 0.0;
	private static readonly OPACITY: string = '0.2';

	private readonly leftPaddle = document.querySelector('.paddle-left') as HTMLElement;
	private readonly rightPaddle = document.querySelector('.paddle-right') as HTMLElement;
	private readonly ball = document.querySelector('.ball') as HTMLElement;
	private readonly scoreLeft = document.querySelector('.score-left') as HTMLElement;
	private readonly scoreRight = document.querySelector('.score-right') as HTMLElement;
	private readonly pauseMessage = document.querySelector('.pause-msg') as HTMLElement;
	private readonly continueMessage = document.querySelector('.continue-msg') as HTMLElement;
	private readonly gameContainer = document.querySelector('.game-container') as HTMLElement;
	private readonly net = document.querySelector('.net') as HTMLElement;
	private readonly keysPressed: Set<string> = new Set();

	private leftPaddleY: number = 50;
	private rightPaddleY: number = 50;
	private ballX: number = 50;
	private ballY: number = 50;
	private ballSpeedX: number = Math.random() < 0.5 ? 0.5 : -0.5;
	private ballSpeedY: number = (Math.random() - 0.5) * 2;
	private speed: number = Game.BASE_SPEED;
	private pauseGame: boolean = false;
	private isDestroyed: boolean = false;
	private player1Score: number = 0;
	private player2Score: number = 0;

	public winner: number = 0;

	constructor()
	{
		this.init();
		this.normalizeSpeed();
		this.setupEventListeners();
		this.gameLoop();
	}

	private init(): void
	{
		this.setStyles('1');
		this.scoreLeft.textContent = '0';
		this.scoreRight.textContent = '0';
		this.leftPaddle.style.top = this.leftPaddleY + '%';
		this.rightPaddle.style.top = this.rightPaddleY + '%';
	}

	private setStyles(opacity: string): void
	{
		this.leftPaddle.style.opacity = opacity;
		this.rightPaddle.style.opacity = opacity;
		this.ball.style.opacity = opacity;
		this.scoreLeft.style.opacity = opacity;
		this.scoreRight.style.opacity = opacity;
		this.net.style.display = opacity === '1' ? 'block' : 'none';
		this.gameContainer.style.borderColor = 'rgba(255, 255, 255, ' + opacity + ')';
		this.pauseMessage.style.display = opacity === '1' ? 'none' : 'block';
		this.continueMessage.style.display = opacity === '1' ? 'none' : 'block';
	}

	private normalizeAngle(paddleY: number, mult: number): void
	{
		let relativeIntersectY = (this.ballY - paddleY) / (Game.PADDLE_HEIGHT / 2);
		let newAngleY = relativeIntersectY * Game.MAX_ANGLE;

		this.ballSpeedX = mult * Math.abs(this.ballSpeedX);
		this.ballSpeedY = newAngleY;

		let currentSpeed = Math.sqrt(this.ballSpeedX * this.ballSpeedX + this.ballSpeedY * this.ballSpeedY);
		this.ballSpeedX = (this.ballSpeedX / currentSpeed) * this.speed;
		this.ballSpeedY = (this.ballSpeedY / currentSpeed) * this.speed;
	}

	private normalizeSpeed(): void
	{
		let currentSpeed = Math.sqrt(this.ballSpeedX * this.ballSpeedX + this.ballSpeedY * this.ballSpeedY);
		if (currentSpeed > 0)
		{
			this.ballSpeedX = (this.ballSpeedX / currentSpeed) * this.speed;
			this.ballSpeedY = (this.ballSpeedY / currentSpeed) * this.speed;
		}
	}

	private moveBall(): void
	{
		this.ballX += this.ballSpeedX;
		this.ballY += this.ballSpeedY;

		// wall collision
		if (this.ballY <= 2 || this.ballY >= 98)
		{
			this.ballSpeedY = -this.ballSpeedY;
		}

		// paddle collision
		if (this.ballX <= 5 && this.ballY >= this.leftPaddleY - (Game.PADDLE_HEIGHT / 2) && this.ballY <= this.leftPaddleY + (Game.PADDLE_HEIGHT / 2))
		{
			this.speed += Game.SPEED_INCREMENT;
			this.normalizeAngle(this.leftPaddleY, 1);
		}
		else if (this.ballX >= 95 && this.ballY >= this.rightPaddleY - (Game.PADDLE_HEIGHT / 2) && this.ballY <= this.rightPaddleY + (Game.PADDLE_HEIGHT / 2))
		{
			this.speed += Game.SPEED_INCREMENT;
			this.normalizeAngle(this.rightPaddleY, -1);
		}

		// goal !!
		if (this.ballX < 0 || this.ballX > 100)
		{
			if (this.ballX > 100)
			{
				this.player1Score++;
				this.scoreLeft.textContent = this.player1Score.toString();
				if (this.player1Score >= 5)
				{
					this.winner = 1;
					this.destroy();
				}
			}
			else
			{
				this.player2Score++;
				this.scoreRight.textContent = this.player2Score.toString();
				if (this.player2Score >= 5)
				{
					this.winner = 2;
					this.destroy();
				}
			}

			this.speed = Game.BASE_SPEED;
			this.ballSpeedX = Math.random() < 0.5 ? 0.5 : -0.5;
			this.ballSpeedY = (Math.random() - 0.5) * 2;
			this.normalizeSpeed();
			this.ballX = 50;
			this.ballY = 50;
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
		if (!this.isDestroyed)
		{
			if (!this.pauseGame)
			{
				this.moveBall();
				this.movePaddle();
			}
			requestAnimationFrame(this.gameLoop);
		}
	}

	private setupEventListeners(): void
	{
		document.addEventListener('keydown', (event: KeyboardEvent): void =>
		{
			this.keysPressed.add(event.key);
			if (event.key === ' ')
			{
				this.pauseGame = !this.pauseGame;
				this.setStyles(this.pauseGame ? Game.OPACITY : '1');
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