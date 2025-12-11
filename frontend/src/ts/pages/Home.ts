import { GameRouter } from '../router';
import { Router } from 'app.js';

export class Home
{
	private static readonly BUTTON_1: string = 'game';
	private static readonly BUTTON_2: string = 'tournament';

	private router: GameRouter;
	private button1Element = Router.getElementById('game') as HTMLButtonElement;
	private button2Element = Router.getElementById('tournament') as HTMLButtonElement;

	constructor(router: GameRouter)
	{
		this.router = router;
		this.hydrateButtons();
		this.setUpDocumentEventListeners();
	}

	private hydrateButtons(): void
	{
		this.button1Element.textContent = Home.BUTTON_1;
		this.button2Element.textContent = Home.BUTTON_2;
	}

	private menuGameClickHandler = () =>
	{
		this.router.navigateTo('game-menu', '');
	}

	private menuTournamentClickHandler = () =>
	{
		this.router.navigateTo('tournament-menu', '');
	}

	private setUpDocumentEventListeners(): void
	{
		Router.getElementById('game')?.addEventListener('click', this.menuGameClickHandler);
		Router.getElementById('tournament')?.addEventListener('click', this.menuTournamentClickHandler);
	}

	public destroy(): void
	{
		Router.getElementById('game')?.removeEventListener('click', this.menuGameClickHandler);
		Router.getElementById('tournament')?.removeEventListener('click', this.menuTournamentClickHandler);
	}
}
