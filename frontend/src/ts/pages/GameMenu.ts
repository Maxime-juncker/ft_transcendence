import { GameRouter } from '../router';

export class GameMenu
{
	private static readonly BUTTON_1: string = 'local';
	private static readonly BUTTON_2: string = 'online';
	private static readonly BUTTON_3: string = 'bot';

	private router: GameRouter;
	private button1Element;
	private button2Element;
	private button3Element;

	constructor(router: GameRouter)
	{
		router.view.querySelector
		this.router = router;

		this.button1Element = this.router.view.querySelector('#local-game') as HTMLButtonElement;
		this.button2Element = this.router.view.querySelector('#online-game') as HTMLButtonElement;
		this.button3Element = this.router.view.querySelector('#bot-game') as HTMLButtonElement;

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
		console.log("navi to online");
		this.router.navigateTo('game', 'online');
	}

	private botGameClickHandler = () =>
	{
		this.router.navigateTo('game', 'bot');
	}

	private setUpDocumentEventListeners(): void
	{
		this.router.view.querySelector('#local-game')?.addEventListener('click', this.localGameClickHandler);
		this.router.view.querySelector('#online-game')?.addEventListener('click', this.onlineGameClickHandler);
		this.router.view.querySelector('#bot-game')?.addEventListener('click', this.botGameClickHandler);
	}

	public destroy(): void
	{
		this.router.view.querySelector('#local-game')?.removeEventListener('click', this.localGameClickHandler);
		this.router.view.querySelector('#online-game')?.removeEventListener('click', this.onlineGameClickHandler);
		this.router.view.querySelector('#bot-game')?.removeEventListener('click', this.botGameClickHandler);
	}
}
