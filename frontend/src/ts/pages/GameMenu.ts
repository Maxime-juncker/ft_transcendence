import { GameRouter } from '../router.js';

export class GameMenu
{
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
