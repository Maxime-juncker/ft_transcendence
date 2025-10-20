class GameClient
{
	/* GAME CONSTANTS */
	private static readonly PADDLE_HEIGHT: number = 15;
	private static readonly PADDLE_WIDTH: number = 2;
	private static readonly PADDLE_PADDING: number = 2;
	private static readonly BALL_SIZE: number = 2;
	private static readonly BACKGROUND_OPACITY: string = '0.2';
	private static readonly COUNTDOWN_TIME: number = 3;
	private static readonly COUNTDOWN_INTERVAL: number = 1000;
	private static readonly COLOR: string = '255, 255, 255';
	private static readonly PAUSE_KEY: string = ' ';
	private static readonly PAUSE_MSG: string = `GAME PAUSED`;
	private static readonly RESUME_MSG: string = `Press ${GameClient.PAUSE_KEY} to continue`;
	private static readonly PLAY_AGAIN_KEY: string = 'Enter';
	private static readonly PLAY_AGAIN_MSG: string = `Press ${GameClient.PLAY_AGAIN_KEY} to play again`;

	/* GAME HTML ELEMENTS */
	private elements: { [key: string]: HTMLDivElement };

	/* GAME STATE */
	private keysPressed: Set<string> = new Set();
	private leftPaddleY: number = 50;
	private rightPaddleY: number = 50;
	private pauseGame: boolean = false;
	private end: boolean = false;
	private spacePressed: boolean = false;

	private socket: WebSocket;
	private gameState: any;

	constructor()
	{
		this.init();
		this.launchCountdown();
		this.connectToServer();
	}

	private init(): void
	{
		this.initElements();
		this.setStyles();
		this.setOpacity('1');
	}

	private initElements(): void
	{
		this.elements =
		{
			game: document.querySelector('.game') as HTMLDivElement,
			leftPaddle: document.querySelector('.paddle-left') as HTMLDivElement,
			rightPaddle: document.querySelector('.paddle-right') as HTMLDivElement,
			net: document.querySelector('.net') as HTMLDivElement,
			ball: document.querySelector('.ball') as HTMLDivElement,
			scoreLeft: document.querySelector('.score-left') as HTMLDivElement,
			scoreRight: document.querySelector('.score-right') as HTMLDivElement,
			countdownElement: document.querySelector('.countdown') as HTMLDivElement,
			pauseMessage: document.querySelector('.pause-msg') as HTMLDivElement,
			continueMessage: document.querySelector('.continue-msg') as HTMLDivElement,
			winner: document.querySelector('.winner-msg') as HTMLDivElement,
			playAgain: document.querySelector('.play-again-msg') as HTMLDivElement,
		};
	}

	private setStyles(): void
	{
		this.elements.leftPaddle.style.height = GameClient.PADDLE_HEIGHT + '%';
		this.elements.rightPaddle.style.height = GameClient.PADDLE_HEIGHT + '%';
		this.elements.leftPaddle.style.width = GameClient.PADDLE_WIDTH + '%';
		this.elements.rightPaddle.style.width = GameClient.PADDLE_WIDTH + '%';
		this.elements.leftPaddle.style.left = GameClient.PADDLE_PADDING + '%';
		this.elements.rightPaddle.style.right = GameClient.PADDLE_PADDING + '%';
		this.elements.leftPaddle.style.top = this.leftPaddleY + '%';
		this.elements.rightPaddle.style.top = this.rightPaddleY + '%';
		this.elements.ball.style.width = GameClient.BALL_SIZE + '%';
		this.elements.net.style.display = 'none';
		this.elements.ball.style.display = 'none';
		this.elements.scoreLeft.textContent = '0';
		this.elements.scoreRight.textContent = '0';
		this.elements.pauseMessage.style.display = 'none';
		this.elements.continueMessage.style.display = 'none';
		this.elements.winner.style.display = 'none';
		this.elements.playAgain.style.display = 'none';
	}

	private setOpacity(opacity: string): void
	{
		this.elements.leftPaddle.style.opacity = opacity;
		this.elements.rightPaddle.style.opacity = opacity;
		this.elements.net.style.opacity = opacity;
		this.elements.ball.style.opacity = opacity;
		this.elements.scoreLeft.style.opacity = opacity;
		this.elements.scoreRight.style.opacity = opacity;
		this.elements.game.style.borderColor = `rgba(${GameClient.COLOR}, ${opacity})`;
	}

	private launchCountdown(): void
	{
		let count = GameClient.COUNTDOWN_TIME;
		this.elements.countdownElement.style.display = 'block';
		this.elements.countdownElement.textContent = count.toString();

		const countdownInterval = setInterval(() =>
		{
			count--;
			if (count > 0)
			{
				this.elements.countdownElement.textContent = count.toString();
			}
			else
			{
				this.elements.net.style.display = 'block';
				this.elements.ball.style.display = 'block';
				clearInterval(countdownInterval);
				this.elements.countdownElement.style.display = 'none';
				this.setupEventListeners();
				this.gameLoop();
			}
		}, GameClient.COUNTDOWN_INTERVAL);
	}

	private setupEventListeners(): void
	{
		document.addEventListener('keydown', this.keydownHandler);
		document.addEventListener('keyup', this.keyupHandler);
	}

	private keydownHandler = (event: KeyboardEvent): void =>
	{
		if (!this.end)
		{
			this.keysPressed.add(event.key);
			if (event.key === GameClient.PAUSE_KEY && !this.spacePressed)
			{
				this.spacePressed = true;
				this.pauseGame = !this.pauseGame;
				this.setOpacity(this.pauseGame ? GameClient.BACKGROUND_OPACITY : '1');
				this.elements.pauseMessage.textContent = GameClient.PAUSE_MSG;
				this.elements.pauseMessage.style.display = this.pauseGame ? 'block' : 'none';
				this.elements.continueMessage.textContent = GameClient.RESUME_MSG;
				this.elements.continueMessage.style.display = this.pauseGame ? 'block' : 'none';
			}
			else
			{
				this.socket.send(JSON.stringify({ key: event.key, type: 'keydown' }));
			}
		}
		else if (event.key === GameClient.PLAY_AGAIN_KEY)
		{
			this.destroy();
			new GameClient();
		}
	}

	private keyupHandler = (event: KeyboardEvent): void =>
	{
		if (!this.end)
		{
			if (event.key === GameClient.PAUSE_KEY)
			{
				this.spacePressed = false;
			}

			this.keysPressed.delete(event.key);
		}
	}

	public destroy(): void
	{
		this.end = true;
		document.removeEventListener('keydown', this.keydownHandler);
		document.removeEventListener('keyup', this.keyupHandler);
		this.keysPressed.clear();
	}

	private gameLoop = (): void =>
	{
		if (!this.end)
		{
			if (!this.pauseGame)
			{
			}

			requestAnimationFrame(this.gameLoop);
		}
	}

	private connectToServer(): void
	{
		this.socket = new WebSocket('ws://localhost:8080/game');

		this.socket.onmessage = (event: MessageEvent) =>
		{
			this.gameState = JSON.parse(event.data);
			this.updateGameState();
		};
	}

	private updateGameState(): void
	{
		this.leftPaddleY = this.gameState.leftPaddleY;
		this.rightPaddleY = this.gameState.rightPaddleY;
		this.elements.leftPaddle.style.top = this.leftPaddleY + '%';
		this.elements.rightPaddle.style.top = this.rightPaddleY + '%';
	}

	private showWinner(winner: number): void
	{
		this.setOpacity(GameClient.BACKGROUND_OPACITY);
		this.elements.net.style.display = 'none';
		this.elements.ball.style.display = 'none';
		this.elements.winner.textContent = `Player ${winner} wins !`;
		this.elements.winner.style.display = 'block';
		this.elements.playAgain.textContent = GameClient.PLAY_AGAIN_MSG;
		this.elements.playAgain.style.display = 'block';
	}
};
