import { ViewComponent } from 'ViewComponent.js';
import { GameRouter } from '../router';
import { Router } from 'app.js';

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
		this.router = router;

		this.button1Element = this.router.view?.querySelector('#local-game') as HTMLButtonElement;
		this.button2Element = this.router.view?.querySelector('#online-game') as HTMLButtonElement;
		this.button3Element = this.router.view?.querySelector('#bot-game') as HTMLButtonElement;

		this.hydrateButtons();
		this.setUpDocumentEventListeners();
	}

	private hydrateButtons(): void
	{
		this.button1Element.textContent = GameMenu.BUTTON_1;
		this.button2Element.textContent = GameMenu.BUTTON_2;
		this.button3Element.textContent = GameMenu.BUTTON_3;
	}

	private menuGameClickHandler = () =>
	{
		this.router.navigateTo('game-menu', '');
	}

	private menuTournamentClickHandler = () =>
	{
		this.router.navigateTo('tournament-menu', '');
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
		// console.log("hello");
		// const view: ViewComponent = this.router.view;
		// view.addTrackListener(view.querySelector('#local-game'), "click", this.localGameClickHandler);
		// view.addTrackListener(view.querySelector('#online-game'), "click", this.onlineGameClickHandler);
		// view.addTrackListener(view.querySelector('#bot-game'), "click", this.botGameClickHandler);
		// view.addTrackListener(view.querySelector('#game'), "click", this.menuGameClickHandler);
		// view.addTrackListener(view.querySelector('#tournament'), "click", this.menuTournamentClickHandler);
	}

	public destroy(): void
	{
		// const view: ViewComponent = this.router.view;
		// view.removeTrackListener(view.querySelector('#local-game'), "click", this.localGameClickHandler);
		// view.removeTrackListener(view.querySelector('#online-game'), "click", this.onlineGameClickHandler);
		// view.removeTrackListener(view.querySelector('#bot-game'), "click", this.botGameClickHandler);
		// this.router.view.querySelector('#local-game')?.removeEventListener('click', this.localGameClickHandler);
		// this.router.view.querySelector('#online-game')?.removeEventListener('click', this.onlineGameClickHandler);
		// this.router.view.querySelector('#bot-game')?.removeEventListener('click', this.botGameClickHandler);
	}
}
