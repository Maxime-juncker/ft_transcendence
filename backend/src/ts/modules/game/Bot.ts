import { GameState } from './GameState.js';
import { GameInstance } from './GameInstance.js';
import WebSocket from 'ws';
import { getUserByName } from 'modules/users/user.js';
import * as core from 'core/core.js';
import { Logger } from 'modules/logger.js';

enum Keys
{
	UP = 'U',
	DOWN = 'D',
}

export class Bot
{
	private static readonly IPS: number = 100;
	private static readonly INTERVAL_TIME: number = 1000 / Bot.IPS;

	private socket: WebSocket | null = null;
	private interval: NodeJS.Timeout | null = null;
	private gameInstance: GameInstance | null = null;
	private keysPressed: Set<string> = new Set();
	private playerSide: string;

	constructor (gameId: string, gameState: ArrayBuffer, playerSide: number = 2)
	{
		this.playerSide = String(playerSide);
		this.init(gameState);
		this.start(gameId);
	}

	private async init(gameState: ArrayBuffer)
	{
		const res = await getUserByName("bot", core.db);

		this.gameInstance = new GameInstance('dev', res.data.id, -1);
		this.gameInstance.state = new GameState(gameState);
		this.gameInstance.p1Ready = true;
		this.gameInstance.p2Ready = true;
		this.gameInstance.running = true;
	}

	private async start(gameId: string): Promise<void>
	{
		await new Promise(r => setTimeout(r, 500));

		this.socket = new WebSocket(`ws://localhost:3000/api/game/${gameId}/${this.playerSide}`);
		this.socket.binaryType = 'arraybuffer';
		
		this.socket.onopen = () =>
		{
			this.interval = setInterval(() => { this.send(); }, Bot.INTERVAL_TIME);
		};

		this.socket.onmessage = (event: any) =>
		{
			this.updateGameState(event.data);
		};

		this.socket.onclose = () =>
		{
			this.stopGameLoop();
		};

		this.socket.onerror = (error) =>
		{
			Logger.error(`WebSocket error: ${error}`);
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
				if (this.gameInstance)
					this.gameInstance.state = new GameState(data);
			}
			catch (error)
			{
				Logger.error(`Error updating game state: ${error}`);
			}
		}
	}

	private send(): void
	{
		if (this.gameInstance)
		{
			this.keysPressed.clear();
			this.calculateOutput();
			this.socket?.send(Array.from(this.keysPressed).join(''));
			this.keysPressed = new Set(Array.from(this.keysPressed).map(key => '1' + key));
			this.gameInstance.keysPressed = new Set([...this.gameInstance.keysPressed, ...this.keysPressed]);
		}
	}

	private calculateOutput(): void
	{
		if (!this.gameInstance)
			return ;

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
		if (!this.gameInstance)
		{
			return ;
		}

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
		if (!this.gameInstance)
		{
			return ;
		}

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
