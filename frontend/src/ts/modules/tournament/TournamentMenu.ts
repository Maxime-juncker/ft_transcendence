import { GameRouter } from 'modules/game/GameRouter.js';
import { LobbyView } from 'modules/pages/lobby.js';
import { Router } from 'modules/router/Router.js';
import { MainUser } from 'modules/user/User.js';
import { setPlaceHolderText } from 'modules/utils/utils.js';

export class TournamentMenu
{
	private router: GameRouter;
	private listContainer: HTMLDivElement | null = null;
	private createBtn: HTMLButtonElement | null = null;

	constructor(router: GameRouter)
	{
		this.router = router;
		const context = this.router.view || document;
		this.listContainer = context.querySelector('#tournament-list') as HTMLDivElement;
		this.createBtn = context.querySelector('#tournament-create-btn') as HTMLButtonElement;
		this.loadTournaments();
		this.setUpDocumentEventListeners();
	}

	private async loadTournaments()
	{
		if (!this.listContainer)
		{
			return ;
		}

		const loadingMsg = document.createElement('div');
		loadingMsg.className = 'text-center text-gray-400';
		loadingMsg.textContent = 'Loading...';
		this.listContainer.innerHTML = '';
		this.listContainer.appendChild(loadingMsg);

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
			const errorMsg = document.createElement('div');
			errorMsg.className = 'text-center text-red-500';
			errorMsg.textContent = 'Error loading tournaments';
			this.listContainer.innerHTML = '';
			this.listContainer.appendChild(errorMsg);
		}
	}

	private renderList(tournaments: any[])
	{
		if (!this.listContainer)
		{
			return ;
		}
		
		this.listContainer.innerHTML = '';
		if (!tournaments || tournaments.length === 0)
		{
			const emptyMsg = document.createElement('div');
			emptyMsg.className = 'text-center text-gray-500';
			emptyMsg.textContent = 'No active tournaments';
			emptyMsg.setAttribute('data-i18n', 'No_tournaments');
			this.listContainer.appendChild(emptyMsg);
			window.dispatchEvent(new CustomEvent('pageChanged'));
			return ;
		}

		const template = document.getElementById('tournament-item-template') as HTMLTemplateElement;
		if (!template)
		{
			console.error('tournament-item-template not found');
			return ;
		}

		tournaments.forEach(t =>
		{
			const clone = template.content.cloneNode(true) as DocumentFragment;
			const ownerName = clone.querySelector('.tournament-owner-name') as HTMLElement;
			const info = clone.querySelector('.tournament-info') as HTMLElement;
			const joinBtn = clone.querySelector('.join-btn') as HTMLButtonElement;

			if (ownerName)
			{
				ownerName.textContent = `${t.ownerName}'s Tournament`;
			}

			if (info)
			{
				info.textContent = `${t.type} • ${t.playerCount} players`;
			}

			if (joinBtn)
			{
				joinBtn.textContent = t.type === 'public' ? 'Join' : 'Request';
				joinBtn.dataset.id = t.id;
				joinBtn.dataset.type = t.type;

				joinBtn.addEventListener('click', (e) =>
				{
					const target = e.currentTarget as HTMLElement;
					const id = target.dataset.id;
					if (id)
					{
						this.joinTournament(id);
					}
				});
			}
			
			if (this.listContainer)
			{
				this.listContainer.appendChild(clone);
			}
		});
	}

	public async joinTournament(id: string)
	{
		if (!this.router.m_user || this.router.m_user.id <= 0)
		{
			console.error("joinTournament: User not logged in or invalid ID", this.router.m_user?.id);
			return ;
		}

		try
		{
			const res = await fetch('/api/join-tournament',
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ tournamentId: id, token: MainUser.Instance?.token })
			});

			if (res.ok)
			{
				const data = await res.json();
				this.router.navigateTo('tournament-lobby', data.tournamentId);
			}
			else
			{
				const err = await res.json().catch(() => ({ error: 'Unknown error' }));
				console.error('Failed to join tournament:', res.status, err);
			}
		}
		catch (e)
		{
			console.error(e);
		}
	} 

	private createTournamentClickHandler = async () =>
	{
		if (!this.createBtn)
		{
			return;
		}

		this.createBtn.classList.add("btn-disable");
		this.createBtn.disabled = true;

		try
		{
			// show loading indicator
			const lobbyView = Router.Instance?.activeView as LobbyView;
			lobbyView.StartLoading();
			const res = await fetch('/api/create-tournament',
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json', },
				body: JSON.stringify({ token: MainUser.Instance?.token, type: 'public' }),
			});
			lobbyView.stopLoading();

			this.createBtn.classList.remove("btn-disable");
			this.createBtn.disabled = false;

			const data = await res.json();
			if (res.ok)
			{
				this.router.navigateTo('tournament-lobby', data.tournamentId);
			}
			else
			{
				setPlaceHolderText(data.message);
				console.error('Failed to create tournament');
			}
		}
		catch (e)
		{
			console.error(e);
			setPlaceHolderText("failed to create tournament");
		}
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
