export class GameClient
{
	private HTMLelements: Map<string, HTMLDivElement> = new Map();
	private keysPressed: Set<string> = new Set();
	private countdownInterval: any | null = null;
	private pollingInterval: any | null = null;
	private playerName = Math.random().toString(36).substring(2, 10);
	private static readonly PADDLE_HEIGHT: number = 15;
	private static readonly PADDLE_WIDTH: number = 2;
	private static readonly PADDLE_PADDING: number = 2;
	private static readonly BALL_SIZE: number = 2;
	private static readonly BACKGROUND_OPACITY: string = '0.4';
	private static readonly PLAY_AGAIN_KEY: string = 'Enter';
	private static readonly PLAY_AGAIN_MSG: string = `Press ${GameClient.PLAY_AGAIN_KEY} to play again`;
	private static readonly FPS: number = 60;
	private static readonly COLOR: string = '255, 255, 255';
	private static readonly COUNTDOWN_START: number = 3;

	constructor(mode: string)
	{
		if (!mode)
		{
			return ;
		}

		this.initHTMLelements();
		this.hideElements();
		this.createGame(mode).then(() =>
		{
			this.setColor('1');
			this.showElements();
			this.launchCountdown();
		});
	}

	private initHTMLelements(): void
	{
		const section = document.querySelector('.game');
		this.HTMLelements.set('game', section as HTMLDivElement);
		Array.from(section.children).forEach((child) =>
		{
			this.HTMLelements.set(child.classList[0], child as HTMLDivElement);
		});
	}

	private hideElements(): void
	{
		this.HTMLelements.get('net')!.style.display = 'none';
		this.HTMLelements.get('ball')!.style.display = 'none';
		this.HTMLelements.get('paddle-left')!.style.display = 'none';
		this.HTMLelements.get('paddle-right')!.style.display = 'none';
		this.HTMLelements.get('score-left')!.style.display = 'none';
		this.HTMLelements.get('score-right')!.style.display = 'none';
		this.HTMLelements.get('pause-msg')!.style.display = 'none';
		this.HTMLelements.get('continue-msg')!.style.display = 'none';
		this.HTMLelements.get('winner-msg')!.style.display = 'none';
		this.HTMLelements.get('play-again-msg')!.style.display = 'none';
		this.HTMLelements.get('player1')!.textContent = this.playerName;
		this.HTMLelements.get('player1')!.style.display = 'block';
		this.HTMLelements.get('searching-msg')!.textContent = 'Searching for opponent...';
		this.HTMLelements.get('searching-msg')!.style.display = 'block';
	}

	private async createGame(mode: string): Promise<void>
	{
		try
		{
			const response = await fetch('/api/create-game',
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(
				{
					mode: mode, playerName: this.playerName,
				}),
			});
			const data = await response.json();
		}
		catch (error)
		{
			console.error('Failed to create game:', error);
		}
	}

	private setColor(opacity: string): void
	{
		this.HTMLelements.get('game')!.style.borderBlockColor = `rgba(${GameClient.COLOR}, ${opacity})`;
		for (const element of this.HTMLelements.values())
		{
			if (element.tagName === 'DIV')
			{
				element.style.backgroundColor = `rgba(${GameClient.COLOR}, ${opacity})`;
			}
			else if (element)
			{
				element.style.color = `rgba(${GameClient.COLOR}, ${opacity})`;
			}
		}
	}

	private showElements(): void
	{
		this.HTMLelements.get('paddle-left')!.style.height = GameClient.PADDLE_HEIGHT + '%';
		this.HTMLelements.get('paddle-right')!.style.height = GameClient.PADDLE_HEIGHT + '%';
		this.HTMLelements.get('paddle-left')!.style.width = GameClient.PADDLE_WIDTH + '%';
		this.HTMLelements.get('paddle-right')!.style.width = GameClient.PADDLE_WIDTH + '%';
		this.HTMLelements.get('paddle-left')!.style.left = GameClient.PADDLE_PADDING + '%';
		this.HTMLelements.get('paddle-right')!.style.right = GameClient.PADDLE_PADDING + '%';
		this.HTMLelements.get('ball')!.style.width = GameClient.BALL_SIZE + '%';
		this.HTMLelements.get('score-left')!.textContent = '0';
		this.HTMLelements.get('score-right')!.textContent = '0';
		this.HTMLelements.get('paddle-left')!.style.display = 'block';
		this.HTMLelements.get('paddle-right')!.style.display = 'block';
		this.HTMLelements.get('score-left')!.style.display = 'block';
		this.HTMLelements.get('score-right')!.style.display = 'block';
		// this.HTMLelements.get('player2')!.textContent = this.parameters.opponentName;
		this.HTMLelements.get('searching-msg')!.style.display = 'none';
	}

	private launchCountdown(): void
	{
		let count = GameClient.COUNTDOWN_START;
		const countdownIntervalTime =  (count > 0) ? 1000 : 0;
		this.HTMLelements.get('countdown')!.style.display = 'block';
		this.HTMLelements.get('countdown')!.textContent = count.toString();

		this.countdownInterval = setInterval(() =>
		{
			if (--count > 0)
			{
				this.HTMLelements.get('countdown')!.textContent = count.toString();
			}
			else
			{
				clearInterval(this.countdownInterval);
				// this.startGame();
			}
		}, countdownIntervalTime);
	}

	// private async startGame(): Promise<void>
	// {
	// 	this.HTMLelements.get('countdown')!.style.display = 'none';
	// 	this.HTMLelements.get('net')!.style.display = 'block';
	// 	this.HTMLelements.get('ball')!.style.display = 'block';
	// 	this.setupEventListeners();
	// 	this.startPolling();

	// 	try
	// 	{
	// 		await fetch(`/api/ready/${this.parameters.gameId}`,
	// 		{
	// 			method: 'POST',
	// 		});
	// 	}
	// 	catch (error)
	// 	{
	// 		console.error('Failed to send start action:', error);
	// 	}
	// }

	// private async fetchGameState(): Promise<void>
	// {
	// 	if (this.parameters)
	// 	{
	// 		try
	// 		{
	// 			const response = await fetch(`/api/game-state/${this.parameters.gameId}`);
	// 			const gameState = await response.json();
	// 			this.updateDisplay(gameState.state);
	// 		}
	// 		catch (error)
	// 		{
	// 			console.error('Failed to fetch game state:', error);
	// 		}
	// 	}
	// }

	// private async sendAction(type: string, key: string): Promise<void>
	// {
	// 	try
	// 	{
	// 		await fetch(`/api/game-action/${this.parameters.gameId}`,
	// 		{
	// 			method: 'POST',
	// 			headers: { 'Content-Type': 'application/json', },
	// 			body: JSON.stringify({ type: type, key: key, player: this.playerName })
	// 		});
	// 	}
	// 	catch (error)
	// 	{
	// 		console.error('Failed to send action:', error);
	// 	}
	// }

	private updateDisplay(gameState: any): void
	{
		this.HTMLelements.get('paddle-left')!.style.top = gameState.leftPaddleY + '%';
		this.HTMLelements.get('paddle-right')!.style.top = gameState.rightPaddleY + '%';
		this.HTMLelements.get('ball')!.style.left = gameState.ballX + '%';
		this.HTMLelements.get('ball')!.style.top = gameState.ballY + '%';
		this.HTMLelements.get('score-left')!.textContent = gameState.player1Score.toString();
		this.HTMLelements.get('score-right')!.textContent = gameState.player2Score.toString();

		if (gameState.winner)
		{
			this.showWinner(gameState.winner);
			// this.stopPolling();
		}
	}

	// private startPolling(): void
	// {
	// 	this.pollingInterval = setInterval(() =>
	// 		{ this.fetchGameState() }, 1000 / this.parameters.fps);
	// }

	// private stopPolling(): void
	// {
	// 	if (this.pollingInterval)
	// 	{
	// 		clearInterval(this.pollingInterval);
	// 	}
	// }

	private setupEventListeners(): void
	{
		document.addEventListener('keydown', this.keydownHandler);
		document.addEventListener('keyup', this.keyupHandler);
	}

	private keydownHandler = (event: KeyboardEvent): void =>
	{
		this.keysPressed.add(event.key);
		// this.sendAction('keydown', event.key);
	}

	private keyupHandler = (event: KeyboardEvent): void =>
	{
		this.keysPressed.delete(event.key);
		// this.sendAction('keyup', event.key);
	}

	private showWinner(winner: string): void
	{
		this.setColor(GameClient.BACKGROUND_OPACITY);
		this.HTMLelements.get('net')!.style.display = 'none';
		this.HTMLelements.get('ball')!.style.display = 'none';
		this.HTMLelements.get('winner-msg')!.textContent = `${winner}\nwins !`;
		this.HTMLelements.get('winner-msg')!.style.display = 'block';
		this.HTMLelements.get('play-again-msg')!.textContent = GameClient.PLAY_AGAIN_MSG;
		this.HTMLelements.get('play-again-msg')!.style.display = 'block';
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
}
