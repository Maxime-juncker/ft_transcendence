import { Router } from '../router.js';

export class TournamentMenu
{
	private static readonly BUTTON_1: string = 'create a tournament';
	private static readonly BUTTON_2: string = 'join a tournament';

	private router: Router;
	private button1Element = document.getElementById('tournament-create') as HTMLButtonElement;
	private button2Element = document.getElementById('tournament-join') as HTMLButtonElement;

	constructor(router: Router)
	{
		this.router = router;
		this.hydrateButtons();
		this.setUpDocumentEventListeners();
	}

	private hydrateButtons(): void
	{
		this.button1Element.textContent = TournamentMenu.BUTTON_1;
		this.button2Element.textContent = TournamentMenu.BUTTON_2;
	}

	private createTournamentClickHandler = () =>
	{
		this.router.navigateTo('tournament-create', '');
	}

	private joinTournamentClickHandler = () =>
	{
		this.router.navigateTo('tournament-join', '');
	}

	private setUpDocumentEventListeners(): void
	{
		document.getElementById('tournament-create')?.addEventListener('click', this.createTournamentClickHandler);
		document.getElementById('tournament-join')?.addEventListener('click', this.joinTournamentClickHandler);
	}

	public destroy(): void
	{
		document.getElementById('tournament-create')?.removeEventListener('click', this.createTournamentClickHandler);
		document.getElementById('tournament-join')?.removeEventListener('click', this.joinTournamentClickHandler);
	}
}
