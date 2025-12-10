import { GameRouter } from '../router';

export class GameMenu
{
	private static readonly BUTTON_1: string = 'local';
	private static readonly BUTTON_2: string = 'online';
	private static readonly BUTTON_3: string = 'bot';

	private router: GameRouter;
	private button1Element = document.getElementById('local-game') as HTMLButtonElement;
	private button2Element = document.getElementById('online-game') as HTMLButtonElement;
	private button3Element = document.getElementById('bot-game') as HTMLButtonElement;

	constructor(router: GameRouter)
	{
		this.router = router;
		this.hydrateButtons();
		this.setUpDocumentEventListeners();
	}

	private hydrateButtons(): void
	{
		this.button1Element.textContent = GameMenu.BUTTON_1;
		this.button2Element.textContent = GameMenu.BUTTON_2;
		this.button3Element.textContent = GameMenu.BUTTON_3;
	}

	private localGameClickHandler = () =>
	{
		this.router.navigateTo('game', 'local');
	}

	private onlineGameClickHandler = () =>
	{
		this.router.navigateTo('game', 'online');
	}

	private botGameClickHandler = () =>
	{
		this.router.navigateTo('game', 'bot');
	}

	private setUpDocumentEventListeners(): void
	{
		document.getElementById('local-game')?.addEventListener('click', this.localGameClickHandler);
		document.getElementById('online-game')?.addEventListener('click', this.onlineGameClickHandler);
		document.getElementById('bot-game')?.addEventListener('click', this.botGameClickHandler);
	}

	public destroy(): void
	{
		document.getElementById('local-game')?.removeEventListener('click', this.localGameClickHandler);
		document.getElementById('online-game')?.removeEventListener('click', this.onlineGameClickHandler);
		document.getElementById('bot-game')?.removeEventListener('click', this.botGameClickHandler);
	}
}
