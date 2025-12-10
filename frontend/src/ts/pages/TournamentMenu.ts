import { GameRouter } from "../router";

export class TournamentMenu
{
	private static readonly TITLE: string = "Select the number of players";
	private static readonly BUTTON_1: string = '4';
	private static readonly BUTTON_2: string = '8';
	private static readonly BUTTON_3: string = '16';
	private static readonly BUTTON_4: string = '32';

	private router: GameRouter;
	private titleElement = document.getElementById('title') as HTMLHeadingElement;
	private button1Element = document.getElementById('four') as HTMLButtonElement;
	private button2Element = document.getElementById('eight') as HTMLButtonElement;
	private button3Element = document.getElementById('sixteen') as HTMLButtonElement;
	private button4Element = document.getElementById('thirty-two') as HTMLButtonElement;

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
		document.getElementById('four')?.addEventListener('click', this.fourPlayersClickHandler);
		document.getElementById('eight')?.addEventListener('click', this.eightPlayersClickHandler);
		document.getElementById('sixteen')?.addEventListener('click', this.sixteenPlayersClickHandler);
		document.getElementById('thirty-two')?.addEventListener('click', this.thirtyTwoPlayersClickHandler);
	}

	public destroy(): void
	{
		document.getElementById('four')?.removeEventListener('click', this.fourPlayersClickHandler);
		document.getElementById('eight')?.removeEventListener('click', this.eightPlayersClickHandler);
		document.getElementById('sixteen')?.removeEventListener('click', this.sixteenPlayersClickHandler);
		document.getElementById('thirty-two')?.removeEventListener('click', this.thirtyTwoPlayersClickHandler);
	}
}
