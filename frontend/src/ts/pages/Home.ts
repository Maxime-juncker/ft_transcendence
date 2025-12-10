import { GameRouter } from '../router';

export class Home
{
	private static readonly BUTTON_1: string = 'game';
	private static readonly BUTTON_2: string = 'tournament';

	private router: GameRouter;
	private button1Element = document.getElementById('game') as HTMLButtonElement;
	private button2Element = document.getElementById('tournament') as HTMLButtonElement;

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
		document.getElementById('game')?.addEventListener('click', this.menuGameClickHandler);
		document.getElementById('tournament')?.addEventListener('click', this.menuTournamentClickHandler);
	}

	public destroy(): void
	{
		document.getElementById('game')?.removeEventListener('click', this.menuGameClickHandler);
		document.getElementById('tournament')?.removeEventListener('click', this.menuTournamentClickHandler);
	}
}
