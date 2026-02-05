import { GameRouter } from '../router.js';
import { Router } from 'modules/router/Router.js';

export class TournamentMenu
{
	private router: GameRouter;
	private listContainer = document.getElementById('tournament-list') as HTMLDivElement;
	private createBtn = document.getElementById('tournament-create-btn') as HTMLButtonElement;

	constructor(router: GameRouter)
	{
		this.router = router;
		this.loadTournaments();
		this.setUpDocumentEventListeners();
	}

	private async loadTournaments()
	{
		this.listContainer.innerHTML = '<div class="text-center text-dark">Loading...</div>';

		try
		{
			const res = await fetch('/api/tournaments');
			if (!res.ok)
			{
				throw new Error('Failed to fetch');
			}

			const data = await res.json();
			this.renderList(data);
		}
		catch (e)
		{
			this.listContainer.innerHTML = '<div class="text-center text-red">Error loading tournaments</div>';
		}
	}

	private renderList(tournaments: any[])
	{
		this.listContainer.innerHTML = '';
		if (!tournaments || tournaments.length === 0)
		{
			this.listContainer.innerHTML = '<div class="text-center text-gray">No active tournaments</div>';
			return ;
		}

		tournaments.forEach(t =>
		{
			const item = document.createElement('div');
			item.className = 'flex justify-between items-center bg-darker p-3 rounded border border-gray-700 hover:border-blue-500 transition-colors';
			item.innerHTML = `
				<div class="flex flex-col">
					<span class="font-bold text-white text-lg">${t.ownerName}'s Tournament</span>
					<span class="text-sm text-dark capitalize">${t.type} • ${t.playerCount} players</span>
				</div>
				<button class="join-btn btn bg-green hover:bg-green text-white font-bold py-1 px-4 text-sm" data-id="${t.id}" data-type="${t.type}">
					${t.type === 'public' ? 'Join' : 'Request'}
				</button>
			`;
			item.querySelector('.join-btn')?.addEventListener('click', (e) => {
				const target = e.currentTarget as HTMLElement;
				const id = target.getAttribute('data-id');
				if (id) this.joinTournament(id);
			});
			this.listContainer.appendChild(item);
		});
	}

	public async joinTournament(id: string)
	{
		if (!this.router.m_user || this.router.m_user.id <= 0)
		{
			console.error("joinTournament: User not logged in or invalid ID", this.router.m_user?.id);
			alert("You seem to be logged out. Please refresh the page.");
			return ;
		}

		console.log(`Joining tournament ${id} as user ${this.router.m_user.id} (${this.router.m_user.name})`);

		try
		{
			const res = await fetch('/api/join-tournament',
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ tournamentId: id, userId: this.router.m_user!.id })
			});

			if (res.ok)
			{
				const data = await res.json();
				if (data.message === "You are already at this tournament")
					alert("You are already joined to this tournament!");
				this.router.navigateTo('tournament-lobby', data.tournamentId);
			}
			else
			{
				const err = await res.json().catch(() => ({ error: 'Unknown error' }));
				console.error('Failed to join tournament:', res.status, err);
				alert('Failed to join: ' + (err.error || 'Unknown error'));
			}
		}
		catch (e)
		{
			console.error(e);
		}
	}

	private createTournamentClickHandler = () =>
	{
		this.router.navigateTo('tournament-create', '');
	}

	private refreshClickHandler = () =>
	{
		this.loadTournaments();
	}

	private setUpDocumentEventListeners(): void
	{
		if (this.createBtn)
		{
			Router.addEventListener(this.createBtn, "click", this.createTournamentClickHandler);
		}
		const refreshBtn = document.getElementById('tournament-refresh-btn');
		if (refreshBtn)
		{
			Router.addEventListener(refreshBtn, "click", this.refreshClickHandler);
		}
	}

	public destroy(): void
	{
		if (this.createBtn)
		{
			Router.removeEventListener(this.createBtn, "click", this.createTournamentClickHandler);
		}
		const refreshBtn = document.getElementById('tournament-refresh-btn');
		if (refreshBtn)
		{
			Router.removeEventListener(refreshBtn, "click", this.refreshClickHandler);
		}
	}
}
