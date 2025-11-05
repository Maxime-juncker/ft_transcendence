export class GameClient
{
	private HTMLelements: Map<string, HTMLDivElement> = new Map();
	private keysPressed: Set<string> = new Set();
	private countdownInterval: any | null = null;
	private playerName = Math.random().toString(36).substring(2, 10);
	private static readonly PADDLE_HEIGHT: number = 15;
	private static readonly PADDLE_WIDTH: number = 2;
	private static readonly PADDLE_PADDING: number = 2;
	private static readonly BALL_SIZE: number = 2;
	private static readonly BACKGROUND_OPACITY: string = '0.4';
	private static readonly PLAY_AGAIN_KEY: string = 'Enter';
	private static readonly PLAY_AGAIN_MSG: string = `Press ${GameClient.PLAY_AGAIN_KEY} to play again`;
	private static readonly COLOR: string = '255, 255, 255';
	private static readonly COUNTDOWN_START: number = 3;

	private gameId: string | null = null;
	private socket : WebSocket | null = null;
	private interval: any;
	private opponentName: string | null = null;
	private mode: string | null = null;
	private end: boolean = false;
	private playerId: string | null = null;

	constructor(mode: string)
	{
		if (mode)
		{
			this.mode = mode;
			this.init();
			this.setColor('1');
			this.createGame().then(() =>
			{
				this.showElements();
				this.launchCountdown();
			});
		}
	}

	private init(): void
	{
		const section = document.querySelector('.game') as HTMLDivElement;
		this.HTMLelements.set('game', section);
		Array.from(section.children).forEach((child) =>
		{
			const element = child as HTMLDivElement;
			this.HTMLelements.set(element.classList[0], element);
			element.style.display = 'none';
		});

		this.HTMLelements.get('player1')!.textContent = this.playerName;
		this.HTMLelements.get('player1')!.style.display = 'block';
		this.HTMLelements.get('searching-msg')!.textContent = 'Searching for opponent...';
		this.HTMLelements.get('searching-msg')!.style.display = 'block';
	}

	private async createGame(): Promise<void>
	{
		try
		{
			const response = await fetch(`https://${window.location.host}/api/create-game`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(
				{
					mode: this.mode, playerName: this.playerName
				}),
			});

			const data = await response.json();
			this.gameId = data.gameId;
			this.opponentName = data.opponentName;
			this.playerId = data.playerId;
		}
		catch (error)
		{
			console.error('Failed to create game:', error);
		}
	}

	async connect(): Promise<void>
	{
		await fetch(`https://${window.location.host}/api/start-game/${this.gameId}`,
		{
			method: 'POST',
		});

		this.socket = new WebSocket(`wss://${window.location.host}/api/game/${this.gameId}/${this.playerId}`);
		this.socket.binaryType = 'arraybuffer';

		this.socket.onopen = () =>
		{
			this.startGameLoop();
		};

		this.socket.onmessage = (event) =>
		{
			this.updateGameState(event.data);
		};

		this.socket.onclose = () =>
		{
			this.stopGameLoop();
		};

		this.socket.onerror = (error) =>
		{
			console.error('WebSocket error:', error);
			this.stopGameLoop();
		};
	}

	private updateGameState(data: any): void
	{
		if (typeof data === 'string')
		{
			const message = JSON.parse(data);
			if (message.type === 'winner')
			{
				this.showWinner(message.winner);
			}

			this.stopGameLoop();
			this.socket?.close();
			this.end = true;
		}
		else
		{
			const dataView = new DataView(data);
			const gameState =
			{
				leftPaddleY: dataView.getFloat32(0, true),
				rightPaddleY: dataView.getFloat32(4, true),
				ballX: dataView.getFloat32(8, true),
				ballY: dataView.getFloat32(12, true),
				player1Score: dataView.getUint8(16),
				player2Score: dataView.getUint8(17),
			};

			this.updateDisplay(gameState);
		}

	}

	private startGameLoop(): void
	{
		this.setupEventListeners();
		this.interval = setInterval(() =>
		{
			this.send();
		}, 1000 / 60);
	}

	private send(): void
	{
		this.socket.send(JSON.stringify({ keysPressed: Array.from(this.keysPressed) }));
	}

	private stopGameLoop(): void
	{
		if (this.interval)
		{
			clearInterval(this.interval);
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
		this.HTMLelements.get('player2')!.textContent = this.opponentName;
		this.HTMLelements.get('score-left')!.style.display = 'block';
		this.HTMLelements.get('score-right')!.style.display = 'block';
		this.HTMLelements.get('paddle-left')!.style.display = 'block';
		this.HTMLelements.get('paddle-right')!.style.display = 'block';
		this.HTMLelements.get('player2')!.style.display = 'block';
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
				this.HTMLelements.get('countdown')!.style.display = 'none';
				this.HTMLelements.get('ball')!.style.display = 'block';
				this.HTMLelements.get('net')!.style.display = 'block';
				this.connect();
			}
		}, countdownIntervalTime);
	}

	private updateDisplay(gameState: any): void
	{
		this.HTMLelements.get('paddle-left')!.style.top = gameState.leftPaddleY + '%';
		this.HTMLelements.get('paddle-right')!.style.top = gameState.rightPaddleY + '%';
		this.HTMLelements.get('ball')!.style.left = gameState.ballX + '%';
		this.HTMLelements.get('ball')!.style.top = gameState.ballY + '%';
		this.HTMLelements.get('score-left')!.textContent = gameState.player1Score.toString();
		this.HTMLelements.get('score-right')!.textContent = gameState.player2Score.toString();
	}

	private setupEventListeners(): void
	{
		document.addEventListener('keydown', this.keydownHandler);
		document.addEventListener('keyup', this.keyupHandler);
	}

	private keydownHandler = (event: KeyboardEvent): void =>
	{
		this.keysPressed.add(event.key);

		if (event.key === GameClient.PLAY_AGAIN_KEY && this.end)
		{
			this.destroy();
			new GameClient(this.mode);
		}
	}

	private keyupHandler = (event: KeyboardEvent): void =>
	{
		this.keysPressed.delete(event.key);
	}

	private showWinner(winner: string): void
	{
		this.setColor(GameClient.BACKGROUND_OPACITY);
		this.HTMLelements.get('net')!.style.display = 'none';
		this.HTMLelements.get('ball')!.style.display = 'none';
		this.HTMLelements.get('winner-msg')!.innerHTML = `${winner}<br>wins !`;
		this.HTMLelements.get('winner-msg')!.style.color = `rgba(${GameClient.COLOR}, 1)`;
		this.HTMLelements.get('winner-msg')!.style.display = 'block';
		this.HTMLelements.get('play-again-msg')!.textContent = GameClient.PLAY_AGAIN_MSG;
		this.HTMLelements.get('play-again-msg')!.style.color = `rgba(${GameClient.COLOR}, 1)`;
		this.HTMLelements.get('play-again-msg')!.style.display = 'block';
	}

	public destroy(): void
	{
		if (this.countdownInterval)
		{
			clearInterval(this.countdownInterval);
		}

		this.socket?.close();
		this.stopGameLoop();
		document.removeEventListener('keydown', this.keydownHandler);
		document.removeEventListener('keyup', this.keyupHandler);
		this.keysPressed.clear();
	}
}
