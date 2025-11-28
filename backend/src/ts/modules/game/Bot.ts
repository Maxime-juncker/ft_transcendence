import { GameState } from './GameState.js';
import { GameInstance } from './GameInstance.js';
import WebSocket from 'ws';

enum Keys
{
	UP = 'U',
	DOWN = 'D',
}

export class Bot
{
	private static readonly PLAYER_ID: string = '2';
	private static readonly IPS: number = 100;
	private static readonly INTERVAL_TIME: number = 1000 / Bot.IPS;

	private socket: WebSocket;
	private interval: NodeJS.Timeout | null = null;
	private gameInstance: GameInstance | null = null;
	private keysPressed: Set<string> = new Set();

	constructor (gameId: string, gameState: ArrayBuffer)
	{
		this.init(gameState);
		this.start(gameId);
	}

	private init(gameState: ArrayBuffer)
	{
		try
		{
			this.gameInstance = new GameInstance('dev', 'Bot', 'Player');
			this.gameInstance.state = new GameState(gameState);
			this.gameInstance.running = true;
		}
		catch (error)
		{
			console.error('Error initializing game state:', error);
		}
	}

	private async start(gameId: string): Promise<void>
	{
		this.socket = new WebSocket(`ws://localhost:3000/api/game/${gameId}/${Bot.PLAYER_ID}`);
		this.socket.binaryType = 'arraybuffer';

		this.socket.onopen = () =>
		{
			this.interval = setInterval(() => { this.send(); }, Bot.INTERVAL_TIME);
		};

		this.socket.onmessage = (event: WebSocket.MessageEvent) =>
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

	private updateGameState(data: string | ArrayBuffer): void
	{
		if (typeof data === 'string')
		{
			const message = JSON.parse(data);
			if (message.type === 'winner')
			{
				this.destroy();
			}
		}
		else
		{
			try
			{
				this.gameInstance.state = new GameState(data);
			}
			catch (error)
			{
				console.error('Error updating game state:', error);
			}
		}
	}

	private send(): void
	{
		if (this.gameInstance)
		{
			this.keysPressed.clear();
			this.calculateOutput();
			this.socket.send(Array.from(this.keysPressed).join(''));
			this.keysPressed = new Set(Array.from(this.keysPressed).map(key => '1' + key));
			this.gameInstance.handleKeyPress(this.keysPressed);
		}
	}

	private calculateOutput(): void
	{
		if (this.gameInstance.ballSpeedX > 0)
		{
			this.goToCenter();
		}
		else
		{
			this.goToBall();
		}
	}

	private goToCenter(): void
	{
		const centerY = 50;
		if (this.gameInstance.leftPaddleY > centerY)
		{
			this.keysPressed.add(Keys.UP);
		}
		else if (this.gameInstance.leftPaddleY < centerY)
		{
			this.keysPressed.add(Keys.DOWN);
		}
	}

	private goToBall(): void
	{
		if (this.gameInstance.ballY < this.gameInstance.leftPaddleY)
		{
			this.keysPressed.add(Keys.UP);
		}
		else if (this.gameInstance.ballY > this.gameInstance.leftPaddleY)
		{
			this.keysPressed.add(Keys.DOWN);
		}
	}

	private stopGameLoop(): void
	{
		if (this.interval)
		{
			clearInterval(this.interval);
		}
	}

	public destroy(): void
	{
		this.socket?.close();
		this.stopGameLoop();
		this.keysPressed.clear();
	}
};
