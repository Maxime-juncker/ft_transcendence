import { GameRouter } from "../router";
import { Router } from "app.js";

export class TournamentMenu
{
	private static readonly TITLE: string = "Select the number of players";
	private static readonly BUTTON_1: string = '4';
	private static readonly BUTTON_2: string = '8';
	private static readonly BUTTON_3: string = '16';
	private static readonly BUTTON_4: string = '32';

	private router: GameRouter;
	private titleElement = Router.getElementById('title') as HTMLHeadingElement;
	private button1Element = Router.getElementById('four') as HTMLButtonElement;
	private button2Element = Router.getElementById('eight') as HTMLButtonElement;
	private button3Element = Router.getElementById('sixteen') as HTMLButtonElement;
	private button4Element = Router.getElementById('thirty-two') as HTMLButtonElement;

	constructor(router: GameRouter)
	{
		this.router = router;
		this.hydrate();
		this.setUpDocumentEventListeners();
	}

	private hydrate(): void
	{
		this.titleElement.textContent = TournamentMenu.TITLE;
		this.button1Element.textContent = TournamentMenu.BUTTON_1;
		this.button2Element.textContent = TournamentMenu.BUTTON_2;
		this.button3Element.textContent = TournamentMenu.BUTTON_3;
		this.button4Element.textContent = TournamentMenu.BUTTON_4;
	}

	private move(content: string): void
	{
		this.router.navigateTo('tournament', content);
	}

	private fourPlayersClickHandler = () =>
	{
		this.move(this.button1Element.textContent);
	}

	private eightPlayersClickHandler = () =>
	{
		this.move(this.button2Element.textContent);
	}

	private sixteenPlayersClickHandler = () =>
	{
		this.move(this.button3Element.textContent);
	}

	private thirtyTwoPlayersClickHandler = () =>
	{
		this.move(this.button4Element.textContent);
	}

	private setUpDocumentEventListeners(): void
	{
		Router.getElementById('four')?.addEventListener('click', this.fourPlayersClickHandler);
		Router.getElementById('eight')?.addEventListener('click', this.eightPlayersClickHandler);
		Router.getElementById('sixteen')?.addEventListener('click', this.sixteenPlayersClickHandler);
		Router.getElementById('thirty-two')?.addEventListener('click', this.thirtyTwoPlayersClickHandler);
	}

	public destroy(): void
	{
		Router.getElementById('four')?.removeEventListener('click', this.fourPlayersClickHandler);
		Router.getElementById('eight')?.removeEventListener('click', this.eightPlayersClickHandler);
		Router.getElementById('sixteen')?.removeEventListener('click', this.sixteenPlayersClickHandler);
		Router.getElementById('thirty-two')?.removeEventListener('click', this.thirtyTwoPlayersClickHandler);
	}
}
