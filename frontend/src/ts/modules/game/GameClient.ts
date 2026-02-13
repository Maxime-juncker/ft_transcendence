import { Utils } from './Utils.js';
import { GameState } from './GameState.js';
import { MainUser, User, getUserFromId } from 'modules/user/User.js';
import { Chat } from 'modules/chat/chat.js';
import { UserElement, UserElementType } from 'modules/user/UserElement.js';
import { GameRouter } from 'modules/game/GameRouter.js';

enum Params
{
	PADDLE_HEIGHT = 15,
	PADDLE_WIDTH = 1,
	PADDLE_PADDING = 2,
	BALL_SIZE = 2,
	BACKGROUND_OPACITY = '0.4',
	COLOR = 'var(--color-white)',
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
	private playerSide:		string | null = null;
	private keysToSend:		string = '';

	private m_user:				User | null = null;
	private m_user2:			User | null = null;
	private m_player1:			UserElement | null = null;
	private m_player2:			UserElement | null = null;
	private m_playerContainer:	HTMLElement | null = null;
	private	m_prevP1Score:		number | null = null;
	private	m_prevP2Score:		number | null = null;
	private m_router:			GameRouter;
	private m_endTimeout:		any | null = null;

	constructor(router: GameRouter, private mode: string, user?: User, chat?: Chat)
	{
		super();

		this.m_router = router;
		const root = this.m_router.view || document;
		this.m_playerContainer = root.querySelector("#player-container") as HTMLElement;
		if (!this.m_playerContainer)
		{
			console.error("no player-container found");
			return ;
		}

		if (user)
			this.m_user = user;
		this.createPlayerHtml();
		if (chat)
		{
			chat.onGameCreated((json) => this.createGameFeedback(json));
		}

		if (this.isModeValid() && this.m_user)
		{
			this.init();
			this.createGame();
		}
	}

	private initPlayerHtml(player: User): UserElement | null
	{
		if (!this.m_playerContainer)
			return null;
		const elt = new UserElement(player, this.m_playerContainer, UserElementType.STANDARD, "user-game-template");
		const winrate = elt.getElement("#winrate");
		if (winrate)
			winrate.innerText = `${player.stats.gamePlayed > 0 ? player.winrate + "%" : "n/a" }`;
		const elo = elt.getElement("#elo");
		if (elo)
			elo.innerText = `${player.elo}p`;
		return elt;
	}

	private createPlayerHtml()
	{
		if (!this.m_playerContainer || !this.m_user || !this.m_user2)
		{
			console.warn("missing html in createPlayerHtml()");
			return ;
		}
		this.m_playerContainer.innerHTML = "";
		this.m_player1 = this.initPlayerHtml(this.m_user);
		this.m_player2 = this.initPlayerHtml(this.m_user2);
	}

	private isModeValid(): boolean
	{
		return (this.mode === 'local'
			|| this.mode === 'online'
			|| this.mode === 'bot'
			|| this.mode === 'duel');
	}

	private init(): void
	{
		const root = this.m_router.view || document;
		const section = root.querySelector('.game') as HTMLDivElement;
		if (!section)
		{
			console.error('GameClient: .game section not found!');
			return;
		}
		this.HTMLelements.set('GAME', section);
		Array.from(section.children).forEach((child) =>
		{
			const element = child as HTMLDivElement;
			this.HTMLelements.set(element.id, element);
			element.setAttribute('hidden', '');
		});

		this.setContent('searching-msg', Msgs.SEARCHING, true);
	}

	private async createGameFeedback(json: any)
	{
		if (this.m_endTimeout)
		{
			clearTimeout(this.m_endTimeout);
			this.m_endTimeout = null;
		}

		this.hide('winner-msg');
		this.setContent('searching-msg', 'Next match starting...', true);
		this.gameId = json.gameId.toString();

		if (json.opponentId === 0)
		{
			this.m_user2 = new User();
			const name = this.mode === 'bot' ? 'Bot' : 'Player 2';
			this.m_user2.setUser(0, name, '', '/public/avatars/default.webp', 0);
		}
		else
		{
			this.m_user2 = await getUserFromId(json.opponentId.toString());
		}
		
		this.playerSide = json.playerSide;
		this.createPlayerHtml();
		this.m_player2?.updateHtml(this.m_user2);

		this.launchCountdown();
	}

	public async createGame(): Promise<void>
	{
		try
		{
			const response = await fetch(`https://${window.location.host}/api/create-game`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ mode: this.mode, playerName: this.m_user!.id, token: MainUser.Instance?.token }),
			});

			if (response.status == 202)
			{
				return ;
			}

			const data = await response.json();
			if (!response.ok)
			{
				console.error('Failed to create game:', response.status, data);
				return ;
			}
			this.gameId = data.gameId;
			this.playerSide = data.playerSide;

			if (data.opponentId === 0)
			{
				this.m_user2 = new User();
				const name = this.mode === 'bot' ? 'Bot' : 'Player 2';
				this.m_user2.setUser(0, name, '', '/public/avatars/default.webp', 0);
			}
			else
			{
				this.m_user2 = await getUserFromId(data.opponentId);
			}
			
			this.createPlayerHtml();
			this.m_player2?.updateHtml(this.m_user2);

			this.launchCountdown();
		}
		catch (error)
		{
			console.error('Failed to create game:', error);
		}
	}

	public launchCountdown(gameId?: string): void
	{
		if (gameId)
		{
			this.gameId = gameId;
		}

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
				this.startGame(gameId);
			}
		}, countdownIntervalTime);
	}

	private showElements(): void
	{
		this.hide('countdown');
		this.setHeight('paddle-left', Params.PADDLE_HEIGHT + '%', true);
		this.setHeight('paddle-right', Params.PADDLE_HEIGHT + '%', true);
		this.setWidth('paddle-left', Params.PADDLE_WIDTH + '%');
		this.setWidth('paddle-right', Params.PADDLE_WIDTH + '%');
		this.setLeft('paddle-left', Params.PADDLE_PADDING + '%');
		this.setRight('paddle-right', Params.PADDLE_PADDING + '%');
		this.setWidth('ball', Params.BALL_SIZE + '%', true);
		this.setHeight('ball', Params.BALL_SIZE + '%');
		this.setContent('score-left', '0', true);
		this.setContent('score-right', '0', true);
		this.show('net');

		if (this.m_player2)
		{
			this.m_player2.updateHtml(this.m_user2);
		}
	}

	public async startGame(gameId? : string): Promise<void>
	{
		if (!gameId)
		{
			if (!this.m_user) return;

			const response = await fetch(`https://${window.location.host}/api/start-game/${this.gameId}`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ token: MainUser.Instance?.token })
			});

			if (!response.ok)
			{
				console.error('Failed to start game:', response.status, response.statusText);
				return ;
			}

			const buffer = await response.arrayBuffer();
			if (buffer.byteLength > 0)
			{
				this.updateGameState(buffer);
			}
		}

		const wsUrl = `wss://${window.location.host}/api/game/${this.gameId}/${this.playerSide}`;
		this.socket = new WebSocket(wsUrl);
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
			console.error('[GameClient] WebSocket error:', error);
			this.stopGameLoop();
		};
	}

	private setupEventListeners(): void
	{
		document.addEventListener('keydown', this.keydownHandler);
		document.addEventListener('keyup', this.keyupHandler);
	}

	private keydownHandler = (event: KeyboardEvent): void =>
	{
		this.keysPressed.add(event.key);

		if (event.key === Keys.PLAY_AGAIN && this.end)
		{
			const targetElement = event.target as HTMLElement;
			if (targetElement)
			{
				const tagName = targetElement.tagName.toLowerCase();
				if (tagName && tagName !== 'input' && tagName !== 'textarea')
				{
					this.m_router.navigateTo('game', this.mode);
				}
			}
		}
	}

	private keyupHandler = (event: KeyboardEvent): void =>
	{
		this.keysPressed.delete(event.key);
	}

	private send(): void
	{
		if (!this.socket || this.socket.readyState !== WebSocket.OPEN)
		{
			return ;
		}

		this.keysToSend = '';
		if (this.mode === 'online' || this.mode === 'bot' || this.mode === 'duel')
		{
			this.keysPressed.forEach((key) => { this.getKeyToSend1Player(key); });
		}
		else
		{
			this.keysPressed.forEach((key) => { this.getKeyToSend2Player(key); });
		}

		this.socket!.send(this.keysToSend);
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
			try
			{
				const gameState = new GameState(data);
				this.updateDisplay(gameState);
			}
			catch (error)
			{
				console.error('Error updating game state:', error, '. Exiting game loop');
				this.destroy();
			}
		}
	}

	private updateDisplay(gameState: any): void
	{
		this.setTop('paddle-left', gameState.leftPaddleY + '%');
		this.setTop('paddle-right', gameState.rightPaddleY + '%');
		this.setLeft('ball', gameState.ballX + '%');
		this.setTop('ball', gameState.ballY + '%');
		this.setContent('score-left', gameState.player1Score.toString());
		this.setContent('score-right', gameState.player2Score.toString());

		if (gameState.player1Score != this.m_prevP1Score)
		{
			let score = document.querySelector("#score-left");
			score?.animate(scoreAnimation, scoreAnimationParams);
		}

		if (gameState.player2Score != this.m_prevP2Score)
		{
			let score = document.querySelector("#score-right");
			score?.animate(scoreAnimation, scoreAnimationParams);
		}

		this.m_prevP1Score = gameState.player1Score;
		this.m_prevP2Score = gameState.player2Score;
	}

	private stopGameLoop(): void
	{
		if (this.interval)
		{
			clearInterval(this.interval);
			this.interval = null;
		}
	}

	private async showWinner(winner: number)
	{
		var winnerName = "Player2";
		if (winner >= 1)
		{
			const usr = await getUserFromId(winner);
			if (usr)
			{
				winnerName = usr.name;
			}
		}
		await this.m_user?.updateSelf();
		await this.m_user2?.updateSelf();
		this.createPlayerHtml();
		this.m_player2?.updateHtml(this.m_user2);

		this.hide('net');
		this.hide('ball');
		this.hide('paddle-left');
		this.hide('paddle-right');

		this.setInnerHTML('winner-msg', `${winnerName}<br>${Msgs.WIN}`);
		this.setColor('winner-msg', Params.COLOR, undefined, true);

		if (this.mode === 'online')
		{
			const isWinner = this.m_user && winner === this.m_user.id;
			if (isWinner)
			{
				this.m_endTimeout = setTimeout(() =>
				{
					this.setInnerHTML('winner-msg', `${winnerName}<br>wins the tournament!`);
					this.setColor('winner-msg', Params.COLOR, undefined, true);
					
					setTimeout(() =>
					{
						this.m_router.navigateTo('tournament-menu', '');
					}, 5000);

				}, 5000);
			}
			else
			{
				this.m_endTimeout = setTimeout(() =>
				{
					this.m_router.navigateTo('tournament-menu', '');
				}, 3000);
			}
		}
	}

	private async removeQueue(): Promise<void>
	{
		if (!this.m_user)
		{
			return ;
		}

		await fetch("/api/chat/removeQueue",
		{
			method: "DELETE",
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ token: this.m_user.token })
		});
	}

	public async destroy(): Promise<void>
	{
		if (this.countdownInterval)
		{
			clearInterval(this.countdownInterval);
		}

		if (this.m_endTimeout)
		{
			clearTimeout(this.m_endTimeout);
		}

		await this.removeQueue();
		this.socket?.close();
		this.stopGameLoop();
		window.removeEventListener('beforeunload', this.destroy);
		document.removeEventListener('keydown', this.keydownHandler);
		document.removeEventListener('keyup', this.keyupHandler);
		this.keysPressed.clear();
	}
}
