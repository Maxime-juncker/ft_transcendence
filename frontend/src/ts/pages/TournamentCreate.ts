import { User } from 'modules/user/User.js';

export class TournamentCreate
{
	private static readonly BUTTON_1: string = 'start a tournament';

	private button1Element = document.getElementById('tournament-start') as HTMLButtonElement;

	constructor(private user: User)
	{
		this.init();
		this.hydrateButtons();
		this.setUpDocumentEventListeners();
	}

	private async init(): Promise<void>
	{
		await fetch('/api/create-tournament',
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json', },
			body: JSON.stringify({ userId: this.user.id, type: 'public' }),
		});
	}

	private hydrateButtons(): void
	{
		this.button1Element.textContent = TournamentCreate.BUTTON_1;
	}

	private startTournamentClickHandler = async () =>
	{
		await fetch('/api/start-tournament',
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json', },
			body: JSON.stringify({ userId: this.user.id }),
		});
	}

	private setUpDocumentEventListeners(): void
	{
		document.getElementById('tournament-start')?.addEventListener('click', this.startTournamentClickHandler);
	}

	public destroy(): void
	{
		document.getElementById('tournament-start')?.removeEventListener('click', this.startTournamentClickHandler);
	}
}
