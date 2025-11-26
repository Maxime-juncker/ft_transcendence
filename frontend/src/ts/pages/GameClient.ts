import { Utils } from './Utils.js';
import { GameState } from './GameState.js';
import { getUserFromId, User } from 'User.js';
import { UserElement, UserElementType } from 'UserElement.js';

enum Params
{
	PADDLE_HEIGHT = 15,
	PADDLE_WIDTH = 1,
	PADDLE_PADDING = 2,
	BALL_SIZE = 2,
	BACKGROUND_OPACITY = '0.4',
	COLOR = '255, 255, 255',
	COUNTDOWN_START = 3,
	IPS = 60,
}

const scoreAnimationParams = {
	duration: 150,
	iterations: 2
};

const scoreAnimation = [
	{
		opacity: '0.25',
		transform: "scale(1)"
	},
	{
		opacity: '0.1',
		transform: "scale(1.01)"
	},
	{
		opacity: '0.25',
		transform: "scale(1)"
	}
];

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
	private gameId:			string | null = null;
	private socket :		WebSocket | null = null;
	private interval:		any | null = null;
	private end:			boolean = false;
	private playerId:		string | null = null;
	private keysToSend:		string = '';

	private m_user:				User | null;
	private m_user2:			User;
	private m_player1:			UserElement;
	private m_player2:			UserElement;
	private m_playerContainer:	HTMLElement;
	private	m_prevP1Score:		number;
	private	m_prevP2Score:		number;

	constructor(private mode: string, user: User = null)
	{
		super();

		this.m_playerContainer = document.getElementById("player-container");
		if (!this.m_playerContainer)
		{
			console.error("no player-container found");
			return ;
		}

		this.m_user = user;
		this.createPlayerHtml();

		if (this.isModeValid())
		{
			this.init();
			this.createGame();
		}
	}

	private createPlayerHtml()
	{
		this.m_playerContainer.innerHTML = "";
		this.m_player1 = new UserElement(this.m_user, this.m_playerContainer, UserElementType.STANDARD, "user-game-template");
		this.m_player2 = new UserElement(this.m_user2, this.m_playerContainer, UserElementType.STANDARD, "user-game-template");
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
		this.HTMLelements.set('GAME', section);
		Array.from(section.children).forEach((child) =>
		{
			const element = child as HTMLDivElement;
			this.HTMLelements.set(element.id, element);
			element.style.display = 'none';
		});

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
				body: JSON.stringify({ mode: this.mode, playerName: this.m_user.getId() }),
			});

			const data = await response.json();
			console.log(data);
			this.gameId = data.gameId;
			this.playerId = data.playerId;
			
			this.m_user2 = await getUserFromId(data.opponentId);
			this.createPlayerHtml();
			this.m_player2.updateHtml(this.m_user2);

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
		this.show('net');

		this.m_player2.updateHtml(this.m_user2);
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

		if (gameState.player1Score != this.m_prevP1Score)
		{
			let score = document.querySelector("#score-left");
			score.animate(scoreAnimation, scoreAnimationParams);
		}

		if (gameState.player2Score != this.m_prevP2Score)
		{
			let score = document.querySelector("#score-right");
			score.animate(scoreAnimation, scoreAnimationParams);
		}

		this.m_prevP1Score = gameState.player1Score;
		this.m_prevP2Score = gameState.player2Score;
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
