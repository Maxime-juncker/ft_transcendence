export class GameClient
{
	private HTMLelements: { [key: string]: HTMLDivElement };
	private keysPressed: Set<string> = new Set();
	private countdownInterval: any;
	private gameId: string | null = null;
	private pollingInterval: any;

	constructor()
	{
		this.initElements();
		this.setStyles();
		this.setOpacity('1');
		this.createGame();
		this.launchCountdown();
	}

	private async createGame(): Promise<void>
	{
		try
		{
			const response = await fetch('http://localhost:3000/create-game', { method: 'POST' });
			const data = await response.json();
			this.gameId = data.gameId;
		}
		catch (error)
		{
			console.error('Failed to create game:', error);
		}
	}

	private async fetchGameState(): Promise<void>
	{
		if (this.gameId)
		{
			try
			{
				const response = await fetch(`http://localhost:3000/game-state/${this.gameId}`);
				const gameState = await response.json();
				this.updateDisplay(gameState.state);
			}
			catch (error)
			{
				console.error('Failed to fetch game state:', error);
			}
		}
	}

	private async sendAction(type: string, key: string): Promise<void>
	{
		try
		{
			await fetch(`http://localhost:3000/game-action/${this.gameId}`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json', },
				body: JSON.stringify({ type: type, key: key })
			});
		}
		catch (error)
		{
			console.error('Failed to send action:', error);
		}
	}

	private updateDisplay(gameState: any): void
	{
		this.HTMLelements.leftPaddle.style.top = gameState.leftPaddleY + '%';
		this.HTMLelements.rightPaddle.style.top = gameState.rightPaddleY + '%';
		this.HTMLelements.ball.style.left = gameState.ballX + '%';
		this.HTMLelements.ball.style.top = gameState.ballY + '%';
		this.HTMLelements.scoreLeft.textContent = gameState.player1Score.toString();
		this.HTMLelements.scoreRight.textContent = gameState.player2Score.toString();

		if (gameState.end)
		{
			this.showWinner(gameState.player1Score > gameState.player2Score ? 1 : 2);
			this.stopPolling();
		}
	}

	private keydownHandler = (event: KeyboardEvent): void =>
	{
		this.keysPressed.add(event.key);
		this.sendAction('keydown', event.key);
	}

	private keyupHandler = (event: KeyboardEvent): void =>
	{
		this.keysPressed.delete(event.key);
		this.sendAction('keyup', event.key);
	}

	private startPolling(): void
	{
		this.pollingInterval = setInterval(() => { this.fetchGameState(); }, 16);
	}

	private stopPolling(): void
	{
		if (this.pollingInterval)
		{
			clearInterval(this.pollingInterval);
		}
	}

	private launchCountdown(): void
	{
		let count = 3;
		this.HTMLelements.countdownElement.style.display = 'block';
		this.HTMLelements.countdownElement.textContent = count.toString();

		this.countdownInterval = setInterval(() =>
		{
			count--;
			if (count > 0)
			{
				this.HTMLelements.countdownElement.textContent = count.toString();
			}
			else
			{
				this.HTMLelements.net.style.display = 'block';
				this.HTMLelements.ball.style.display = 'block';
				clearInterval(this.countdownInterval);
				this.HTMLelements.countdownElement.style.display = 'none';
				this.setupEventListeners();
				this.startPolling();
			}
		}, 1000);
	}

	private setupEventListeners(): void
	{
		document.addEventListener('keydown', this.keydownHandler);
		document.addEventListener('keyup', this.keyupHandler);
	}

	public destroy(): void
	{
		if (this.countdownInterval)
		{
			clearInterval(this.countdownInterval);
		}
		if (this.pollingInterval)
		{
			clearInterval(this.pollingInterval);
		}

		document.removeEventListener('keydown', this.keydownHandler);
		document.removeEventListener('keyup', this.keyupHandler);
		this.keysPressed.clear();
	}

	private initElements(): void
	{
		this.HTMLelements =
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
		this.HTMLelements.net.style.display = 'none';
		this.HTMLelements.ball.style.display = 'none';
		this.HTMLelements.scoreLeft.textContent = '0';
		this.HTMLelements.scoreRight.textContent = '0';
		this.HTMLelements.pauseMessage.style.display = 'none';
		this.HTMLelements.continueMessage.style.display = 'none';
		this.HTMLelements.winner.style.display = 'none';
		this.HTMLelements.playAgain.style.display = 'none';

		this.HTMLelements.leftPaddle.style.width = '2%';
		this.HTMLelements.leftPaddle.style.height = '15%';
		this.HTMLelements.leftPaddle.style.background = 'white';
		this.HTMLelements.leftPaddle.style.position = 'absolute';
		this.HTMLelements.leftPaddle.style.left = '2%';
		this.HTMLelements.leftPaddle.style.top = '50%';
		this.HTMLelements.leftPaddle.style.transform = 'translateY(-50%)';

		this.HTMLelements.rightPaddle.style.width = '2%';
		this.HTMLelements.rightPaddle.style.height = '15%';
		this.HTMLelements.rightPaddle.style.background = 'white';
		this.HTMLelements.rightPaddle.style.position = 'absolute';
		this.HTMLelements.rightPaddle.style.right = '2%';
		this.HTMLelements.rightPaddle.style.top = '50%';
		this.HTMLelements.rightPaddle.style.transform = 'translateY(-50%)';

		this.HTMLelements.ball.style.width = '2%';
		this.HTMLelements.ball.style.height = '2%';
		this.HTMLelements.ball.style.background = 'white';
		this.HTMLelements.ball.style.position = 'absolute';
		this.HTMLelements.ball.style.left = '50%';
		this.HTMLelements.ball.style.top = '50%';
		this.HTMLelements.ball.style.transform = 'translate(-50%, -50%)';
		this.HTMLelements.ball.style.borderRadius = '50%';
		this.HTMLelements.ball.style.setProperty('aspect-ratio', '1 / 1');
	}

	private setOpacity(opacity: string): void
	{
		this.HTMLelements.leftPaddle.style.opacity = opacity;
		this.HTMLelements.rightPaddle.style.opacity = opacity;
		this.HTMLelements.net.style.opacity = opacity;
		this.HTMLelements.ball.style.opacity = opacity;
		this.HTMLelements.scoreLeft.style.opacity = opacity;
		this.HTMLelements.scoreRight.style.opacity = opacity;
		this.HTMLelements.game.style.borderColor = `rgba(255, 255, 255, ${opacity})`;
	}

	private showWinner(winner: number): void
	{
		// this.setOpacity(GameClient.BACKGROUND_OPACITY);
		this.HTMLelements.net.style.display = 'none';
		this.HTMLelements.ball.style.display = 'none';
		this.HTMLelements.winner.textContent = `Player ${winner} wins !`;
		this.HTMLelements.winner.style.display = 'block';
		// this.HTMLelements.playAgain.textContent = GameClient.PLAY_AGAIN_MSG;
		this.HTMLelements.playAgain.style.display = 'block';
	}
}
