import { GameRouter } from '../router';
import { Router } from 'modules/router/Router.js';

export class Home
{

	private router: GameRouter;
	private button1Element = Router.getElementById('game') as HTMLButtonElement;
	private button2Element = Router.getElementById('tournament') as HTMLButtonElement;

	constructor(router: GameRouter)
	{
		this.router = router;
		this.setUpDocumentEventListeners();
	}

	private hydrateButtons(): void
	{
	}


	private setUpDocumentEventListeners(): void
	{
	}

	public destroy(): void
	{
		// Router.removeEventListener(Router.getElementById('game'), "click", this.menuGameClickHandler);
		// Router.removeEventListener(Router.getElementById('tournament'), "click", this.menuTournamentClickHandler);
	}
}
