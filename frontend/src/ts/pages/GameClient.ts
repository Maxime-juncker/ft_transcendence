import { Utils } from './Utils.js';
import { GameState } from './GameState.js';

enum Params
{
	PADDLE_HEIGHT = 15,
	PADDLE_WIDTH = 2,
	PADDLE_PADDING = 2,
	BALL_SIZE = 2,
	BACKGROUND_OPACITY = '0.4',
	COLOR = '255, 255, 255',
	COUNTDOWN_START = 3,
	IPS = 60,
}

enum Keys
{
	PLAY_AGAIN = 'Enter',
	DEFAULT_UP = 'ArrowUp',
	DEFAULT_DOWN = 'ArrowDown',
	PLAYER1_UP = 'w',
	PLAYER1_DOWN = 's',
	PLAYER2_UP = 'ArrowUp',
	PLAYER2_DOWN = 'ArrowDown',
}

enum Msgs
{
	SEARCHING = 'Searching for opponent...',
	WIN = 'wins !',
	PLAY_AGAIN = `Press ${Keys.PLAY_AGAIN} to play again`,
}

export class GameClient extends Utils
{
	private static readonly IPS_INTERVAL: number = 1000 / Params.IPS;

	private keysPressed: Set<string> = new Set();
	private countdownInterval: any | null = null;
	private playerName = Math.random().toString(36).substring(2, 10); // NEEDS TO GET THE USERNAME FROM AUTH
	private opponentName: string | null = null;
	private gameId: string | null = null;
	private socket : WebSocket | null = null;
	private interval: any | null = null;
	private end: boolean = false;
	private playerId: string | null = null;
	private keysToSend: string = '';

	constructor(private mode: string)
	{
		super();

		if (this.isModeValid())
		{
			this.init();
			this.createGame();
		}
	}

	private isModeValid(): boolean
	{
		return (this.mode === 'local'
			|| this.mode === 'online'
			|| this.mode === 'bot');
	}

	private init(): void
	{
		const section = document.querySelector('.game') as HTMLDivElement;
		this.HTMLelements.set('game', section);
		Array.from(section.children).forEach((child) =>
		{
			const element = child as HTMLDivElement;
			this.HTMLelements.set(element.id, element);
			element.style.display = 'none';
		});

		this.setContent('player1', this.playerName, true);
		this.setContent('searching-msg', Msgs.SEARCHING, true);
		this.setColors('1');
	}

	private setColors(opacity: string): void
	{
		// TODO NEEDS A REWORK

		// this.HTMLelements.get('game')!.style.borderBlockColor = `rgba(${Params.COLOR}, ${opacity})`;
		// for (const element of this.HTMLelements.values())
		// {
		// 	if (element.tagName === 'DIV')
		// 	{
		// 		element.style.backgroundColor = `rgba(${Params.COLOR}, ${opacity})`;
		// 	}
		// 	else if (element)
		// 	{
		// 		element.style.color = `rgba(${Params.COLOR}, ${opacity})`;
		// 	}
		// }
	}

	private async createGame(): Promise<void>
	{
		try
		{
			window.addEventListener('beforeunload', this.beforeUnloadHandler);

			const response = await fetch(`https://${window.location.host}/api/create-game`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ mode: this.mode, playerName: this.playerName }),
			});

			const data = await response.json();
			this.gameId = data.gameId;
			this.opponentName = data.opponentName;
			this.playerId = data.playerId;

			this.launchCountdown();
		}
		catch (error)
		{
			console.error('Failed to create game:', error);
		}
	}

	private launchCountdown(): void
	{
		let count: number = Params.COUNTDOWN_START;
		const countdownIntervalTime =  (count > 0) ? 1000 : 0;
		this.hide('searching-msg');
		this.setContent('countdown', count.toString(), true);

		this.countdownInterval = setInterval(() =>
		{
			if (--count > 0)
			{
				this.setContent('countdown', count.toString());
			}
			else
			{
				clearInterval(this.countdownInterval);
				this.showElements();
				this.startGame();
			}
		}, countdownIntervalTime);
	}

	private showElements(): void
	{
		this.hide('countdown');
		this.setHeight('paddle-left', Params.PADDLE_HEIGHT + '%');
		this.setHeight('paddle-right', Params.PADDLE_HEIGHT + '%');
		this.setWidth('paddle-left', Params.PADDLE_WIDTH + '%');
		this.setWidth('paddle-right', Params.PADDLE_WIDTH + '%');
		this.setLeft('paddle-left', Params.PADDLE_PADDING + '%', true);
		this.setRight('paddle-right', Params.PADDLE_PADDING + '%', true);
		console.log('Paddle left display: ', this.HTMLelements.get('paddle-left')!.style.display);
		console.log('Paddle right display: ', this.HTMLelements.get('paddle-right')!.style.display);
		this.setWidth('ball', Params.BALL_SIZE + '%', true);
		this.setContent('score-left', '0', true);
		this.setContent('score-right', '0', true);
		this.setContent('player2', this.opponentName, true);
		this.show('net');
	}

	async startGame(): Promise<void>
	{
		await fetch(`https://${window.location.host}/api/start-game/${this.gameId}`,
		{
			method: 'POST',
		});

		this.socket = new WebSocket(`wss://${window.location.host}/api/game/${this.gameId}/${this.playerId}`);
		this.socket.binaryType = 'arraybuffer';

		this.socket.onopen = () =>
		{
			this.setupEventListeners();
			this.interval = setInterval(() => { this.send(); }, GameClient.IPS_INTERVAL);
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

	private setupEventListeners(): void
	{
		document.addEventListener('keydown', this.keydownHandler);
		document.addEventListener('keyup', this.keyupHandler);
	}

	private beforeUnloadHandler = (): void =>
	{
		this.destroy();
	}

	private keydownHandler = (event: KeyboardEvent): void =>
	{
		this.keysPressed.add(event.key);

		if (event.key === Keys.PLAY_AGAIN && this.end)
		{
			this.destroy();
			new GameClient(this.mode);
		}
	}

	private keyupHandler = (event: KeyboardEvent): void =>
	{
		this.keysPressed.delete(event.key);
	}

	private send(): void
	{
		this.keysToSend = '';

		if (this.mode === 'online' || this.mode === 'bot')
		{
			this.keysPressed.forEach((key) => { this.getKeyToSend1Player(key); });
		}
		else
		{
			this.keysPressed.forEach((key) => { this.getKeyToSend2Player(key); });
		}

		this.socket.send(this.keysToSend);
	}

	private getKeyToSend1Player(key: string): void
	{
		switch (key)
		{
			case Keys.DEFAULT_UP:
				this.keysToSend += 'U';
				break ;
			case Keys.DEFAULT_DOWN:
				this.keysToSend += 'D';
				break ;
		}
	}

	private getKeyToSend2Player(key: string): void
	{
		switch (key)
		{
			case Keys.PLAYER1_UP:
				this.keysToSend += '1U';
				break ;
			case Keys.PLAYER1_DOWN:
				this.keysToSend += '1D';
				break ;
			case Keys.PLAYER2_UP:
				this.keysToSend += '2U';
				break ;
			case Keys.PLAYER2_DOWN:
				this.keysToSend += '2D';
				break ;
		}
	}

	private updateGameState(data: string | ArrayBuffer): void
	{
		if (typeof data === 'string')
		{
			const message = JSON.parse(data);
			if (message.type === 'winner')
			{
				this.end = true;
				this.showWinner(message.winner);
			}
		}
		else
		{
			this.updateDisplay(new GameState(data));
		}
	}

	private updateDisplay(gameState: any): void
	{
		this.HTMLelements.get('paddle-left')!.style.top = gameState.leftPaddleY + '%';
		this.setTop('paddle-left', gameState.leftPaddleY + '%');
		this.setTop('paddle-right', gameState.rightPaddleY + '%');
		this.setLeft('ball', gameState.ballX + '%');
		this.setTop('ball', gameState.ballY + '%');
		this.setContent('score-left', gameState.player1Score.toString());
		this.setContent('score-right', gameState.player2Score.toString());
	}

	private stopGameLoop(): void
	{
		if (this.interval)
		{
			clearInterval(this.interval);
		}
	}

	private showWinner(winner: string): void
	{
		this.setColors(Params.BACKGROUND_OPACITY);
		this.hide('net');
		this.hide('ball');
		this.hide('paddle-left');
		this.hide('paddle-right');
		this.setInnerHTML('winner-msg', `${winner}<br>${Msgs.WIN}`);
		this.setColor('winner-msg', Params.COLOR, undefined, true);
		this.setContent('play-again-msg', Msgs.PLAY_AGAIN);
		this.setColor('play-again-msg', Params.COLOR, undefined, true);
	}

	public destroy(): void
	{
		if (this.countdownInterval)
		{
			clearInterval(this.countdownInterval);
		}

		this.socket?.close();
		this.stopGameLoop();
		window.removeEventListener('beforeunload', this.beforeUnloadHandler);
		document.removeEventListener('keydown', this.keydownHandler);
		document.removeEventListener('keyup', this.keyupHandler);
		this.keysPressed.clear();
	}
}
