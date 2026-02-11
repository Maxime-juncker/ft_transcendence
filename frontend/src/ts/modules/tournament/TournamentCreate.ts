import { MainUser, User } from 'modules/user/User.js';
import { GameRouter } from 'modules/game/GameRouter.js';
import { Router } from 'modules/router/Router.js';

export class TournamentCreate
{
	private createBtn = document.getElementById('tournament-confirm-create') as HTMLButtonElement;

	constructor(private router: GameRouter, private user: User)
	{
		this.setUpDocumentEventListeners();
	}

	private createTournament = async () =>
	{
		const typeInput = document.querySelector('input[name="tournament-type"]:checked') as HTMLInputElement;
		const type = typeInput ? typeInput.value : 'public';
		this.destroy();

		try
		{
			const res = await fetch('/api/create-tournament',
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json', },
				body: JSON.stringify({ token: MainUser.Instance?.token, type: type }),
			});

			if (res.ok)
			{
				const data = await res.json();
				this.router.navigateTo('tournament-lobby', data.tournamentId);
			}
			else
			{
				console.error('Failed to create tournament');
			}
		}
		catch (e)
		{
			console.error(e);
		}
	}

	private setUpDocumentEventListeners(): void
	{
		Router.addEventListener(this.createBtn, 'click', this.createTournament);
	}

	public destroy(): void
	{
		Router.removeEventListener(this.createBtn, 'click', this.createTournament);
	}
}
